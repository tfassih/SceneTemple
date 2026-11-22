const {contextBridge,ipcRenderer}=require('electron');
const invoke=(name,arg)=>ipcRenderer.invoke('scene:'+name,arg);
contextBridge.exposeInMainWorld('sceneDesktop',{
  open:()=>invoke('open'),pending:()=>invoke('pending'),acceptOpen:token=>invoke('accept',token),resetPath:()=>invoke('reset'),
  save:arg=>invoke('save',arg),exportDocx:arg=>invoke('docx',arg),exportPDF:name=>invoke('pdf',name),
  recoverWrite:raw=>invoke('recover-write',raw),recoverRead:()=>invoke('recover-read'),recoverClear:()=>invoke('recover-clear'),
  dirty:value=>ipcRenderer.send('scene:dirty',value),focusMode:value=>ipcRenderer.send('scene:focus',value),
  onMenu:cb=>ipcRenderer.on('scene:menu',(_e,key)=>cb(key)),onFile:cb=>ipcRenderer.on('scene:file',()=>cb()),
  ready:()=>ipcRenderer.send('scene:ready')
});
