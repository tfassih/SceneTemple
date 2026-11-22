'use strict';
const {app,BrowserWindow,dialog,ipcMain,Menu,session}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {randomUUID,createHash}=require('node:crypto');
const appFile=path.resolve(__dirname,'../app/index.html'), appURL=pathToFileURL(appFile).href;
const limit=32*1024*1024;
const smoke=process.argv.includes('--scenetemple-test') && process.env.SCENETEMPLE_TEST_DIR;
if(smoke)app.setPath('userData',path.join(smoke,'profile'));
app.setName('SceneTemple');
let windowRef,dirty=false,closing=false,ready=false,bound=null,pendingFile=null,pendingDialog=null,fullBeforeFocus=false;
let recoverQueue=Promise.resolve(), writeQueue=Promise.resolve();
const filters={project:[{name:'SceneTemple project',extensions:['scenetemple']}],pdf:[{name:'PDF document',extensions:['pdf']}],docx:[{name:'Word document',extensions:['docx']}]};
const recovery=()=>path.join(app.getPath('userData'),'draft-recovery.scenetemple');
const hash=buf=>createHash('sha256').update(buf).digest('hex');
const filename=(name,ext)=>path.basename(String(name)).replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').slice(0,175).replace(new RegExp('\\.'+ext+'$','i'),'')+'.'+ext;
function verify(e){
  if(!windowRef||e.sender!==windowRef.webContents||e.senderFrame!==e.sender.mainFrame||e.senderFrame?.url!==appURL)throw Error('Invalid editor window.');
}
function handle(name,fn){ipcMain.handle('scene:'+name,(e,arg)=>{verify(e);return fn(arg);});}
async function atomic(dest,data){
  const tmp=path.join(path.dirname(dest),'.'+path.basename(dest)+'.'+randomUUID()+'.tmp');
  let handle;try{handle=await fs.open(tmp,'wx',0o600);await handle.writeFile(data);await handle.sync();await handle.close();handle=null;await fs.rename(tmp,dest);}
  finally{await handle?.close();await fs.unlink(tmp).catch(()=>{});}
}
async function loadFile(file){
  if(typeof file!=='string'||path.extname(file).toLowerCase()!=='.scenetemple')throw Error('Choose a .scenetemple project file.');
  const st=await fs.stat(file);if(!st.isFile()||st.size>limit)throw Error('Project files must be smaller than 32 MiB.');
  const bytes=await fs.readFile(file);const token=randomUUID();
  pendingDialog={file:path.resolve(file),hash:hash(bytes),token};return {token,raw:bytes.toString('utf8')};
}
function validRaw(raw){if(typeof raw!=='string'||Buffer.byteLength(raw)>limit)throw Error('Project exceeds the 32 MiB file limit.');const p=JSON.parse(raw);if(p.format!=='SceneTemple'||p.version!==1||!Array.isArray(p.documents))throw Error('Invalid project.');}
async function chooseSave(name,kind){
  const ext=kind==='project'?'scenetemple':kind;
  if(smoke)return path.join(smoke,filename(name,ext));
  const {canceled,filePath}=await dialog.showSaveDialog(windowRef,{defaultPath:bound?path.join(path.dirname(bound.file),filename(name,ext)):filename(name,ext),filters:filters[kind],properties:['showOverwriteConfirmation','createDirectory']});
  if(canceled||!filePath)return null;
  return path.extname(filePath).toLowerCase()==='.'+ext?filePath:filePath+'.'+ext;
}
handle('open',async()=>{
  if(smoke)return loadFile(path.join(smoke,'Test manuscript.scenetemple'));
  const opts=await dialog.showOpenDialog(windowRef,{properties:['openFile'],filters:filters.project});
  return opts.canceled?null:loadFile(opts.filePaths[0]);
});
handle('pending',()=>{const f=pendingFile;pendingFile=null;return f?loadFile(f):null;});
handle('accept',token=>{if(!pendingDialog||pendingDialog.token!==token)throw Error('The open request has expired.');bound=pendingDialog;pendingDialog=null;return true;});
handle('reset',()=>{bound=null;pendingDialog=null;return true;});
handle('save',arg=>{
  const write=async()=>{
    validRaw(arg.raw);let target=arg.as?null:bound?.file;
    if(target){
      let current=null;try{current=hash(await fs.readFile(target));}catch(e){if(e.code!=='ENOENT')throw e;}
      if(current!==bound.hash){
        const r=await dialog.showMessageBox(windowRef,{type:'warning',message:'This project changed on disk.',detail:'Save a copy to preserve both versions, or replace the version on disk.',buttons:['Cancel','Save a copy','Replace on disk'],defaultId:1,cancelId:0});
        if(r.response===0)return false;if(r.response===1)target=null;
      }
    }
    target ||= await chooseSave(arg.name,'project');if(!target)return false;
    await atomic(target,arg.raw);bound={file:target,hash:hash(arg.raw)};return true;
  };
  const result=writeQueue.then(write);writeQueue=result.catch(()=>{});return result;
});
handle('docx',async arg=>{
  if(!(arg.data instanceof Uint8Array)||arg.data.byteLength>150*1024*1024)throw Error('Invalid Word export.');
  const target=await chooseSave(arg.name,'docx');if(!target)return false;await atomic(target,Buffer.from(arg.data));return true;
});
handle('pdf',async name=>{
  const target=await chooseSave(name,'pdf');if(!target)return false;
  const bytes=await windowRef.webContents.printToPDF({printBackground:true,displayHeaderFooter:false,preferCSSPageSize:true,margins:{top:0,bottom:0,left:0,right:0}});
  await atomic(target,bytes);return true;
});
function queueRecovery(fn){const r=recoverQueue.then(fn);recoverQueue=r.catch(()=>{});return r;}
handle('recover-write',raw=>{validRaw(raw);return queueRecovery(()=>atomic(recovery(),raw));});
handle('recover-read',()=>queueRecovery(async()=>{try{return await fs.readFile(recovery(),'utf8');}catch(e){if(e.code==='ENOENT')return null;throw e;}}));
handle('recover-clear',()=>queueRecovery(()=>fs.rm(recovery(),{force:true})));
ipcMain.on('scene:dirty',(e,value)=>{verify(e);dirty=value===true;windowRef.setDocumentEdited(dirty);});
ipcMain.on('scene:focus',(e,value)=>{verify(e);if(value){fullBeforeFocus=windowRef.isFullScreen();if(!fullBeforeFocus)windowRef.setFullScreen(true);}else if(!fullBeforeFocus&&windowRef.isFullScreen())windowRef.setFullScreen(false);});
ipcMain.on('scene:ready',e=>{verify(e);ready=true;if(pendingFile)windowRef.webContents.send('scene:file');if(smoke)runSmoke();});
function deliver(file){if(!file||path.extname(file).toLowerCase()!=='.scenetemple')return;pendingFile=file;if(ready)windowRef.webContents.send('scene:file');}
const cliFile=args=>args.find(a=>!a.startsWith('-')&&path.extname(a).toLowerCase()==='.scenetemple');
app.on('open-file',(e,f)=>{e.preventDefault();deliver(f);});
function menus(){
  const item=(label,key)=>({label,click:()=>windowRef?.webContents.send('scene:menu',key)});
  const menu=[{label:'File',submenu:[item('New project','home'),item('Add script','new-document'),item('Open project…','open'),item('Save project','save'),item('Save project as…','saveas'),item('Export…','export'),{type:'separator'},{role:process.platform==='darwin'?'close':'quit'}]},
    {label:'Edit',submenu:[item('Undo','undo'),item('Redo','redo'),{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},
    {label:'View',submenu:[item('Focus mode','focus'),item('Project outline','toggle-nav'),item('Writing tools','toggle-tools')]}];
  if(process.platform==='darwin')menu.unshift({label:'SceneTemple',submenu:[{role:'about'},{role:'hide'},{role:'quit'}]});
  Menu.setApplicationMenu(Menu.buildFromTemplate(menu));
}
function createWindow(){
  ready=false;dirty=false;closing=false;bound=null;
  windowRef=new BrowserWindow({title:'SceneTemple',width:1340,height:900,minWidth:740,minHeight:540,backgroundColor:'#f7f7f1',show:false,autoHideMenuBar:true,
    icon:path.join(__dirname,'../app/assets/icon.png'),
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,webviewTag:false,spellcheck:false}});
  windowRef.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  windowRef.webContents.on('will-navigate',(e,url)=>{if(url!==appURL)e.preventDefault();});
  windowRef.on('ready-to-show',()=>windowRef?.show());
  windowRef.on('leave-full-screen',()=>windowRef?.webContents.send('scene:menu','focus-off'));
  windowRef.on('close',e=>{
    if(closing||!dirty||smoke)return;e.preventDefault();
    const r=dialog.showMessageBoxSync(windowRef,{type:'question',message:'Save your project before closing?',buttons:['Keep writing','Save…','Close with recovery copy'],defaultId:1,cancelId:0});
    if(r===0)return;
    (async()=>{if(r===1 && !await windowRef.webContents.executeJavaScript('SceneApp.save()'))return;
      if(r===2){const raw=await windowRef.webContents.executeJavaScript('JSON.stringify(SceneApp.S.p)');validRaw(raw);await queueRecovery(()=>atomic(recovery(),raw));}
      closing=true;windowRef.close();})().catch(err=>dialog.showErrorBox('SceneTemple',err.message));
  });
  windowRef.on('closed',()=>{windowRef=null;ready=false;});menus();windowRef.loadFile(appFile);
}
async function runSmoke(){
  try{
    const scenario=require('../tests/native-smoke.cjs');
    await scenario({win:windowRef,folder:smoke,appURL});
    await fs.writeFile(path.join(smoke,'success.json'),JSON.stringify({platform:process.platform,arch:process.arch,electron:process.versions.electron}));
    app.exit(0);
  }catch(e){await fs.writeFile(path.join(smoke,'failure.txt'),String(e.stack||e));app.exit(1);}
}
if(!app.requestSingleInstanceLock())app.quit();
else{
  deliver(cliFile(process.argv.slice(1)));
  app.on('second-instance',(_e,argv)=>{if(!windowRef)createWindow();if(windowRef.isMinimized())windowRef.restore();windowRef.focus();deliver(cliFile(argv));});
  app.whenReady().then(()=>{
    session.defaultSession.setPermissionRequestHandler((_wc,_perm,cb)=>cb(false));
    session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*']},(_d,cb)=>cb({cancel:true}));
    createWindow();app.on('activate',()=>{if(!windowRef)createWindow();});
  });
  app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
}
