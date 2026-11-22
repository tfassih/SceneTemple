(() => {
  'use strict';
  const {families,templates,blocks}=SceneCatalog;
  const {uid,copy,allTemplates,projectFor,documentFor,style,validate,detect,outline}=SceneModel;
  const {$,el,btn,icon,select,sheet,modal,close,toast}=SceneView;
  const native=window.sceneDesktop;
  const S={p:null,d:null,t:null,layout:null,active:null,field:'text',family:'film',tab:'library',dirty:false,
    history:[],future:[],lastGroup:'',lastEdit:0,revision:0,zoom:'fit',focus:false,composition:false,busy:false,handle:null,hasPath:false};
  let draftTimer,inspectorTimer,previewTimer,recovery=null,epoch=0,drag=null;
  const actions={};
  function sync(){S.d=S.p.documents.find(d=>d.id===S.p.active);S.t=allTemplates(S.p)[S.d.template];}
  function activeBlock(){return S.d?.blocks.find(b=>b.id===S.active);}
  function loc(){const a=document.activeElement;if(a?.matches('#pages textarea'))return {id:a.dataset.id,field:a.dataset.field,pos:+a.dataset.start+a.selectionStart,end:+a.dataset.start+a.selectionEnd};return null;}
  function restore(at,scroll=false){
    if(!at)return;
    const boxes=Array.from($('pages').querySelectorAll('textarea')).filter(x=>x.dataset.id===at.id && x.dataset.field===(at.field||'text'));
    if(!boxes.length)return;
    const a=boxes.findLast(x=>+x.dataset.start<=(at.pos||0))||boxes[0];
    a.focus({preventScroll:true});const start=+a.dataset.start;
    a.setSelectionRange(Math.max(0,(at.pos||0)-start),Math.max(0,(at.end??at.pos??0)-start));
    if(scroll){const r=a.getBoundingClientRect(),v=$('paper-scroll').getBoundingClientRect();if(r.bottom>v.bottom||r.top<v.top)a.scrollIntoView({block:'nearest',inline:'nearest'});}
  }
  function selectBlock(id,field='text',jump=true,pos=0,end=pos){
    if(!S.d.blocks.some(b=>b.id===id))return;
    S.active=id;S.field=field;
    if(activeBlock().type==='page'){
      const target=$('pages').querySelector('[data-break="'+id+'"]');if(jump)target?.scrollIntoView({block:'center'});target?.focus();
    }else restore({id,field,pos,end},jump);
    selection();
  }
  function selection(){
    if(!S.d)return;
    const active=activeBlock();if(active)$('element-select').value=active.type;
    const current=document.activeElement;
    $('pages').querySelectorAll('.field-box.current').forEach(b=>b.classList.remove('current'));
    if(current?.matches('#pages textarea'))current.parentElement.classList.add('current');
    else $('pages').querySelector('textarea[data-id="'+S.active+'"]')?.parentElement.classList.add('current');
    let anchor=null;
    for(const b of S.d.blocks){if(style(S.t,b.type).level)anchor=b.id;if(b.id===S.active)break;}
    for(const o of $('outline').children)o.classList.toggle('active',o.dataset.id===anchor);
    ScenePanels.selection();
  }
  function refreshOutline(){
    const frag=document.createDocumentFragment();
    for(const o of outline(S.d,S.t)){const button=btn('',()=>selectBlock(o.id),'outline-item');button.dataset.id=o.id;button.style.setProperty('--depth',o.depth);button.append(el('span','',o.label));button.title=o.label;frag.append(button);}
    if(!frag.childNodes.length)frag.append(el('p','empty','Headings appear here as you write.'));
    $('outline').replaceChildren(frag);
  }
  function navigation(){
    $('documents').replaceChildren(...S.p.documents.map(d=>{
      const b=btn('',()=>{if(S.p.active===d.id)return;S.p.active=d.id;sync();S.active=S.d.blocks[0].id;changed();renderAll();$('paper-scroll').scrollTop=0;},'doc-button'+(d===S.d?' active':''),'file');
      b.append(el('span','',d.title));b.title=d.title;return b;
    }));
    refreshOutline();$('project-label').textContent=S.p.title;
    const list=select(S.t.types.map(k=>[k,blocks[k].label]));$('element-select').replaceChildren(...list.options);
  }
  function renderPages(at=loc(),scroll=false,all=false){
    S.layout=SceneLayout.layout(S.p,S.d,S.t);
    const container=$('pages'), lookup=new Map(S.d.blocks.map(b=>[b.id,b]));
    const paper=Object.assign({blocksById:lookup},S.d);
    S.layout.pages.forEach((page,i)=>{
      const key=JSON.stringify(page);let wrapper=container.children[i];
      if(!wrapper){wrapper=el('div','sheet-shell');container.append(wrapper);}
      if(all||wrapper._pageKey!==key){
        wrapper._pageKey=key;wrapper.replaceChildren(sheet(S.layout,page,'edit',paper,S.t));
      }
    });
    while(container.children.length>S.layout.pages.length)container.lastChild.remove();
    zoom();if(at)restore(at,scroll);
    const n=S.d.blocks.reduce((a,b)=>a+(b.text+' '+b.audio).trim().split(/\s+/u).filter(Boolean).length,0);
    const p=S.layout.pages.length;$('doc-status').textContent=p+' page'+(p===1?'':'s')+' · '+n+' word'+(n===1?'':'s');
    selection();
  }
  function zoom(){
    if(!S.layout||!S.p)return;
    const w=S.layout.w*4/3,h=S.layout.h*4/3;
    const scale=S.zoom==='fit'?Math.min(1.15,Math.max(.25,($('paper-scroll').clientWidth-38)/w)):Number(S.zoom);
    for(const wrap of $('pages').children){wrap.style.width=w*scale+'px';wrap.style.height=h*scale+'px';wrap.firstChild.style.transform='scale('+scale+')';}
  }
  function stateLabel(status){
    $('save-state').textContent=status||(!S.dirty&&S.hasPath?'Saved':S.dirty?'Unsaved changes':'New project');
    document.title=S.p?S.d.title+' — SceneTemple':'SceneTemple';
    native?.dirty(S.dirty);
  }
  function renderAll(at=null){navigation();renderPages(at,false,true);ScenePanels.render();stateLabel();}
  function remember(group=''){
    const now=Date.now();
    if(!group||group!==S.lastGroup||now-S.lastEdit>1100){
      const json=JSON.stringify(S.p);S.history.push({json,at:loc()||{id:S.active,field:S.field,pos:0}});
      let bytes=0;for(let i=S.history.length-1;i>=0;i--){bytes+=S.history[i].json.length;if((bytes>18000000||S.history.length-i>90)&&i<S.history.length-1){S.history.splice(0,i+1);break;}}
    }
    S.lastGroup=group;S.lastEdit=now;S.future=[];
  }
  const recoveryKey='SceneTemple.recovery.v1';
  function storeDraft(){
    if(!S.p||!S.dirty)return;
    const raw=JSON.stringify(S.p);
    try{localStorage.setItem(recoveryKey,raw);}catch{if(!native)stateLabel('Recovery storage full · save project');}
    if(native)native.recoverWrite(raw).catch(()=>stateLabel('Recovery unavailable · save project'));
  }
  function changed(){S.revision++;S.dirty=true;stateLabel();clearTimeout(draftTimer);draftTimer=setTimeout(storeDraft,450);}
  function mutate(fn,at=null){
    remember();fn();sync();changed();renderAll(at);
  }
  function history(back){
    const src=back?S.history:S.future,dst=back?S.future:S.history;
    if(!src.length)return;dst.push({json:JSON.stringify(S.p),at:loc()||{id:S.active,field:S.field,pos:0}});
    const old=src.pop();S.p=JSON.parse(old.json);sync();S.active=S.d.blocks.some(b=>b.id===old.at.id)?old.at.id:S.d.blocks[0].id;
    S.lastGroup='';changed();renderAll({...old.at,id:S.active});
  }
  function start(project,dirty=false,hasPath=false){
    clearTimeout(draftTimer);clearTimeout(inspectorTimer);epoch++;S.p=validate(project);sync();S.active=S.d.blocks[0].id;S.field='text';S.dirty=dirty;S.hasPath=hasPath;S.history=[];S.future=[];S.lastGroup='';S.revision=0;
    $('home').hidden=true;$('studio').hidden=false;$('pages').replaceChildren();document.body.classList.toggle('nav-hidden',innerWidth<900);document.body.classList.toggle('tools-hidden',innerWidth<950);renderAll();
    $('paper-scroll').scrollTop=0;if(dirty)changed();
  }
  function delayedTools(){
    if(S.tab==='proof'){clearTimeout(inspectorTimer);inspectorTimer=setTimeout(()=>ScenePanels.render(),400);}
  }
  function inputEvent(a){
    if(!a.isConnected||!a.matches('#pages textarea'))return;
    const b=S.d.blocks.find(b=>b.id===a.dataset.id);if(!b)return;
    const field=a.dataset.field,start=+a.dataset.start,span=+a.dataset.span;
    const next=b[field].slice(0,start)+a.value+b[field].slice(start+span);
    if(next===b[field])return;
    remember('type-'+b.id+'-'+field);b[field]=next;
    if(field==='text'&&b.type==='action'){const k=detect(b.text,S.t);if(k)b.type=k;}
    S.active=b.id;S.field=field;changed();
    const at={id:b.id,field,pos:start+a.selectionStart,end:start+a.selectionEnd};
    // Whitespace edits can leave wrapped display text unchanged, so invalidate the input page.
    a.closest('.sheet-shell')._pageKey=null;
    if(style(S.t,b.type).level)refreshOutline();
    renderPages(at,true);delayedTools();
  }
  function insert(type,body='',audio='',relative=S.active,before=false){
    if(!S.t.types.includes(type))return toast('This element belongs to another script format.');
    const block={id:uid(),type,text:body,audio,target:''};
    const i=S.d.blocks.findIndex(b=>b.id===relative);
    mutate(()=>{S.d.blocks.splice(i<0?S.d.blocks.length:i+Number(!before),0,block);S.active=block.id;},{id:block.id,field:'text',pos:body.length});
    selectBlock(block.id,'text',true,body.length);
  }
  function retype(type){
    const b=activeBlock();if(!b||type===b.type||!S.t.types.includes(type))return;
    if(b.type==='av'&&b.audio.trim()&&type!=='av')return toast('Move the audio text before changing this A/V row.');
    if(type==='page'&&(b.text.trim()||b.audio.trim()))return toast('Insert a page break beside this element.');
    const point=loc()?.pos||0;mutate(()=>{b.type=type;},{id:b.id,field:'text',pos:point});
  }
  function remove(){
    const b=activeBlock(),i=S.d.blocks.indexOf(b);if(i<0)return;
    mutate(()=>{S.d.blocks.splice(i,1);if(!S.d.blocks.length)S.d.blocks.push({id:uid(),type:S.t.types[0],text:'',audio:'',target:''});
      for(const other of S.d.blocks)if(other.target===b.id)other.target='';S.active=S.d.blocks[Math.min(i,S.d.blocks.length-1)].id;});
    selectBlock(S.active);
  }
  function enter(a){
    const b=activeBlock();if(!b)return;
    if(b.type==='av'&&a.dataset.field==='text'){selectBlock(b.id,'audio');return;}
    const field=a.dataset.field,from=+a.dataset.start+a.selectionStart,to=+a.dataset.start+a.selectionEnd;
    const type=style(S.t,b.type).next, rest=b[field].slice(to);
    const blank={id:uid(),type,text:rest,audio:'',target:''};
    if(b.type==='av'){blank.audio=rest;blank.text='';}
    mutate(()=>{b[field]=b[field].slice(0,from);S.d.blocks.splice(S.d.blocks.indexOf(b)+1,0,blank);S.active=blank.id;},{id:blank.id,field:'text',pos:0});selectBlock(blank.id);
  }
  function keyEditor(e){
    const a=e.target;if(!a.matches('textarea')||e.isComposing||e.keyCode===229)return;
    const b=activeBlock();if(!b)return;
    if(e.key==='Enter' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey){e.preventDefault();enter(a);}
    if(e.key==='Tab'&&!e.ctrlKey){
      e.preventDefault();
      if(b.type==='av'){selectBlock(b.id,a.dataset.field==='text'?'audio':'text');return;}
      const order=[...new Set(['action','name','parenthetical','dialogue','scene','transition',...S.t.types])].filter(x=>S.t.types.includes(x)&&x!=='page');
      const i=order.indexOf(b.type);retype(order[(i+(e.shiftKey?-1:1)+order.length)%order.length]);
    }
    const pos=+a.dataset.start+a.selectionStart, end=+a.dataset.start+a.selectionEnd, idx=S.d.blocks.indexOf(b);
    if(e.key==='Backspace' && pos===0 && end===0 && idx>0){
      if(!b.text&&!b.audio){e.preventDefault();const prev=S.d.blocks[idx-1];remove();selectBlock(prev.id,'text',true,prev.text.length);}
      else if(!e.metaKey&&!e.ctrlKey){e.preventDefault();const prev=S.d.blocks[idx-1];selectBlock(prev.id,'text',true,prev.text.length);}
    }
    const field=a.dataset.field,fragmentEnd=+a.dataset.start+a.value.length;
    if(!e.shiftKey && pos===end && (e.key==='ArrowRight'||e.key==='ArrowDown') && end===fragmentEnd && end<b[field].length){
      const next=Array.from($('pages').querySelectorAll('textarea')).find(x=>x.dataset.id===b.id&&x.dataset.field===field&&+x.dataset.start>+a.dataset.start);
      if(next){e.preventDefault();next.focus();next.setSelectionRange(0,0);next.scrollIntoView({block:'nearest'});return;}
    }
    if(!e.shiftKey && pos===end && (e.key==='ArrowLeft'||e.key==='ArrowUp') && a.selectionStart===0 && +a.dataset.start>0){
      const prev=Array.from($('pages').querySelectorAll('textarea')).findLast(x=>x.dataset.id===b.id&&x.dataset.field===field&&+x.dataset.start<+a.dataset.start);
      if(prev){e.preventDefault();prev.focus();prev.setSelectionRange(prev.value.length,prev.value.length);prev.scrollIntoView({block:'nearest'});return;}
    }
    if(e.key==='ArrowDown'&&end===b[a.dataset.field].length && idx+1<S.d.blocks.length){e.preventDefault();selectBlock(S.d.blocks[idx+1].id);}
    if(e.key==='ArrowUp'&&pos===0 && idx>0){e.preventDefault();const prev=S.d.blocks[idx-1];selectBlock(prev.id,'text',true,prev.text.length);}
  }
  function download(name,data,type){
    const u=URL.createObjectURL(new Blob([data],{type}));const a=el('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);
  }
  const safeName=s=>(s.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').slice(0,150)||'Untitled');
  async function guard(){if(!S.p||!S.dirty)return true;
    return new Promise(resolve=>{
      const d=$('dialog');let answer=false;
      modal('Save this project?',[el('p','','Your current project has unsaved changes.')],[
        ['Cancel',close],['Discard changes',()=>{answer=true;close();}],['Save project',async()=>{if(await save()){answer=true;close();}},true]]);
      const onClose=()=>{if(d.open)return;d.removeEventListener('close',onClose);resolve(answer);};
      d.addEventListener('close',onClose);
    });
  }
  async function save(as=false){
    if(!S.p||S.busy)return false;S.busy=true;
    const rev=S.revision,oldEpoch=epoch,raw=JSON.stringify(S.p,null,2),name=safeName(S.p.title)+'.scenetemple';
    try{
      if(native){const result=await native.save({raw,name,as});if(!result)return false;}
      else if(window.showSaveFilePicker){
        if(as||!S.handle){const h=await showSaveFilePicker({suggestedName:name,types:[{description:'SceneTemple project',accept:{'application/json':['.scenetemple']}}]});S.handle=h;}
        const file=await S.handle.createWritable();await file.write(raw);await file.close();
      }else download(name,raw,'application/json');
      if(epoch===oldEpoch){S.hasPath=true;if(S.revision===rev){S.dirty=false;clearTimeout(draftTimer);clearRecovery();}stateLabel();}
      toast('Project saved');return true;
    }catch(e){if(e.name!=='AbortError')toast(e.message);return false;}finally{S.busy=false;}
  }
  function clearRecovery(){try{localStorage.removeItem(recoveryKey);}catch{}native?.recoverClear().catch(()=>{});recovery=null;$('recover').hidden=true;}
  async function openProject(){
    if(S.busy||!(await guard()))return;
    try{
      if(native){const f=await native.open();if(!f)return;const p=validate(JSON.parse(f.raw));await native.acceptOpen(f.token);start(p,false,true);clearRecovery();}
      else{
        const pick=el('input');pick.type='file';pick.accept='.scenetemple,.json';
        pick.onchange=async()=>{try{if(!pick.files[0])return;const p=validate(JSON.parse(await pick.files[0].text()));S.handle=null;start(p,false,false);clearRecovery();}catch(e){toast(e.message);}};pick.click();
      }
    }catch(e){toast(e.message);}
  }
  async function home(){
    if(!(await guard()))return;clearTimeout(draftTimer);clearRecovery();await native?.resetPath();S.handle=null;S.p=null;S.d=null;epoch++;S.dirty=false;native?.dirty(false);
    focus(false);$('studio').hidden=true;$('home').hidden=false;document.title='SceneTemple';$('launch-title').value='';renderLaunch();
  }
  function focus(value=!S.focus){S.focus=!!value;document.body.classList.toggle('focused',S.focus);native?.focusMode(S.focus);requestAnimationFrame(zoom);if(S.focus)selectBlock(S.active,S.field);}
  async function exportFile(type){
    if(S.busy)return;close();S.busy=true;
    const name=safeName(S.d.title)+'.'+type;
    try{
      const l=SceneLayout.layout(S.p,S.d,S.t);
      if(type==='docx'){
        const data=await SceneExport.docx(S.p,S.d,l);
        if(native){if(!await native.exportDocx({name,data}))return;}
        else download(name,data,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      }else{
        printPages(l);await document.fonts.ready;await new Promise(requestAnimationFrame);
        if(native){if(!await native.exportPDF(name))return;}
        else{window.print();return;}
      }
      toast(type.toUpperCase()+' exported');
    }catch(e){toast(e.message);}finally{S.busy=false;}
  }
  function printPages(l=S.layout){
    $('print-root').replaceChildren(...l.pages.map(p=>sheet(l,p,'print',S.d,S.t)));
    let css=$('page-setup');if(!css){css=el('style');css.id='page-setup';document.head.append(css);}
    css.textContent='@page { size: '+l.w+'pt '+l.h+'pt; margin: 0; }';
  }
  function renderLaunch(){
    $('families').replaceChildren(...Object.values(families).map(f=>{
      const b=btn(f.name,()=>{S.family=f.id;renderLaunch();},'family-card',f.icon);b.setAttribute('aria-pressed',String(f.id===S.family));if(f.id===S.family)b.append(el('span','chosen-mark','✓'));return b;
    }));
    const ts=Object.values(templates).filter(t=>t.family===S.family),sel=$('launch-template'),old=sel.value;
    sel.replaceChildren(...Array.from(select(ts.map(t=>[t.id,t.name])).options));
    if(ts.some(t=>t.id===old))sel.value=old;renderPreview();
  }
  function renderPreview(){
    const t=templates[$('launch-template').value];if(!t)return;
    const p=projectFor(t,'The Last Showing',true),d=p.documents[0],l=SceneLayout.layout(p,d,t),page=sheet(l,l.pages[0],'preview',d,t);
    // Keep the composition legible in the small sample by cropping to its text area.
    const w=document.querySelector('.preview-stage').clientWidth||400;
    const sample=$('preview-sheet');sample.style.width=l.w+'pt';sample.style.transform='translateX(-50%) scale('+((w-48)/(l.w*4/3))+')';
    sample.replaceChildren(page);$('preview-title').textContent=t.name;$('preview-description').textContent=t.description;
  }
  function moveDrop(ev){
    ev.preventDefault();const data=drag;if(!data)return;
    const box=ev.target.closest('.field-box'), a=box?.querySelector('textarea');const ref=a?.dataset.id||S.d.blocks.at(-1).id;
    const before=!!box&&ev.clientY<box.getBoundingClientRect().top+box.getBoundingClientRect().height/2;
    if(data.move && data.move!==ref){mutate(()=>{const list=S.d.blocks;const from=list.findIndex(b=>b.id===data.move);if(from<0)return;const [b]=list.splice(from,1);const target=list.findIndex(x=>x.id===ref);list.splice(target+Number(!before),0,b);S.active=b.id;});selectBlock(data.move);}
    else if(data.type)insert(data.type,data.text||'',data.audio||'',ref,before);
    clearDrag();
  }
  function clearDrag(){drag=null;document.querySelectorAll('.drag-before,.drag-after').forEach(e=>e.classList.remove('drag-before','drag-after'));}
  function draggable(e,data){e.draggable=true;e.addEventListener('dragstart',ev=>{drag=data;ev.dataTransfer.effectAllowed=data.move?'move':'copy';ev.dataTransfer.setData('text/plain',data.name||data.type||'Script element');});e.addEventListener('dragend',clearDrag);}
  Object.assign(actions,{open:openProject,save:()=>save(),saveas:()=>save(true),home,undo:()=>history(true),redo:()=>history(false),
    add:()=>ScenePanels.addElement(),focus:()=>focus(),'toggle-nav':()=>{document.body.classList.toggle('nav-hidden');zoom();},
    'toggle-tools':()=>{document.body.classList.toggle('tools-hidden');zoom();},export:()=>ScenePanels.exportMenu(),'new-document':()=>ScenePanels.newDocument()});
  document.addEventListener('click',e=>{const a=e.target.closest('[data-action]');if(a&&actions[a.dataset.action])actions[a.dataset.action]();});
  $('launch-template').onchange=renderPreview;
  async function launchProject(){
    const t=templates[$('launch-template').value];await native?.resetPath();S.handle=null;
    start(projectFor(t,$('launch-title').value||'Untitled project',$('sample').checked),true);
  }
  $('create').onclick=()=>{
    if(!recovery)return launchProject();
    modal('Replace the recovery draft?',[el('p','','Creating a project will replace the unsaved recovery copy on this device.')],[
      ['Cancel',close],['Recover draft',()=>{close();$('recover').click();}],['Create project',()=>{close();clearRecovery();launchProject();},true]]);
  };
  $('recover').onclick=async()=>{if(!recovery)return;await native?.resetPath();S.handle=null;start(validate(JSON.parse(recovery)),true);};
  $('project-menu').onclick=()=>ScenePanels.projectMenu();$('element-select').onchange=e=>retype(e.target.value);
  $('zoom').onchange=e=>{S.zoom=e.target.value;zoom();};
  $('pages').addEventListener('focusin',e=>{if(!e.target.matches('textarea'))return;const a=e.target;S.active=a.dataset.id;S.field=a.dataset.field;selection();});
  $('pages').addEventListener('input',e=>{if(!S.composition&&!e.isComposing)inputEvent(e.target);});
  $('pages').addEventListener('compositionstart',()=>S.composition=true);$('pages').addEventListener('compositionend',e=>{S.composition=false;inputEvent(e.target);});
  $('pages').addEventListener('keydown',keyEditor);$('pages').addEventListener('click',e=>{const b=e.target.closest('[data-break]');if(b)selectBlock(b.dataset.break);});
  $('pages').addEventListener('dragover',e=>{if(!drag)return;e.preventDefault();const box=e.target.closest('.field-box');document.querySelectorAll('.drag-before,.drag-after').forEach(b=>b.classList.remove('drag-before','drag-after'));if(box){const r=box.getBoundingClientRect();box.classList.add(e.clientY<r.top+r.height/2?'drag-before':'drag-after');}});
  $('pages').addEventListener('drop',moveDrop);
  document.addEventListener('keydown',e=>{
    if($('dialog').open||e.isComposing)return;const k=e.key.toLowerCase(),mod=e.metaKey||e.ctrlKey;
    if(mod&&k==='o'){e.preventDefault();openProject();return;}
    if(!S.p)return;
    if(k==='escape'&&S.focus){e.preventDefault();focus(false);return;}
    if(k==='f8'){e.preventDefault();focus();return;}
    if(!mod)return;
    const map={s:()=>save(e.shiftKey),z:()=>history(!e.shiftKey),y:()=>history(false),p:()=>exportFile('pdf'),n:()=>ScenePanels.newDocument()};
    if(map[k]){e.preventDefault();map[k]();}
  });
  window.addEventListener('beforeprint',()=>{if(S.p)printPages();});
  window.addEventListener('pagehide',storeDraft);
  window.addEventListener('resize',()=>{zoom();clearTimeout(previewTimer);previewTimer=setTimeout(()=>{if(!S.p)renderPreview();},80);});
  $('tab-library').onclick=()=>{S.tab='library';ScenePanels.render();};$('tab-proof').onclick=()=>{S.tab='proof';ScenePanels.render();};
  window.SceneApp={S,actions,sync,activeBlock,selectBlock,renderAll,renderPages,selection,remember,changed,mutate,insert,retype,remove,save,openProject,home,guard,exportFile,focus,draggable,start,printPages,close,storeDraft};
  async function init(){
    renderLaunch();await document.fonts.ready;renderPreview();
    try{recovery=(native?await native.recoverRead():null)||localStorage.getItem(recoveryKey);if(recovery){validate(JSON.parse(recovery));$('recover').hidden=false;}}catch{recovery=null;}
    native?.onMenu(key=>{if(key==='focus-off'){if(S.focus)focus(false);return;}if($('dialog').open)return;if(key==='open'||S.p)actions[key]?.();});
    native?.onFile(async()=>{if(!await guard())return;try{const f=await native.pending();if(f){const data=validate(JSON.parse(f.raw));await native.acceptOpen(f.token);start(data,false,true);clearRecovery();}}catch(e){toast(e.message);}});
    native?.ready();
  }
  window.addEventListener('DOMContentLoaded',init);
})();
