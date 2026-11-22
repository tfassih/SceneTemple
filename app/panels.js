(() => {
  'use strict';
  const A=SceneApp,S=A.S;
  const {$,el,btn,select,input,label,check,icon,modal,close,toast}=SceneView;
  const {uid,copy,allTemplates,style,documentFor}=SceneModel;
  const {templates,blocks,families}=SceneCatalog;
  const tool=()=>$('tools-content');
  const options=t=>t.types.map(k=>[k,blocks[k].label]);
  const section=(parent,title)=>{
    const s=el('section','tool-section');if(title)s.append(el('h3','tool-heading',title));parent.append(s);return s;
  };
  function elementButton(kind,label,fn,drag){
    const e=btn('',fn,'element');const symbol={act:'I',scene:'INT',name:'Aa',dialogue:'“ ”',parenthetical:'( )',av:'A/V',transition:'→',choice:'↳',page:'¶'};
    e.append(el('span','grip','⠿'),el('span','type-symbol',symbol[kind]||'·'),el('span','',label));A.draggable(e,drag);return e;
  }
  function selection(){
    const b=A.activeBlock(),target=$('chosen-element-tools');
    if(!target||!b||!S.p)return;
    if(target.dataset.id===b.id&&target.dataset.kind===b.type)return;
    target.dataset.id=b.id;target.dataset.kind=b.type;target.replaceChildren(el('h3','tool-heading','Selected element'));
    const buttons=el('div','mini-actions');
    const move=btn('Drag to move',()=>toast('Drag this handle to another element on the page.'),'small');
    A.draggable(move,{move:b.id});buttons.append(move,btn('Duplicate',()=>A.insert(b.type,b.text,b.audio),'small'),btn('Remove',()=>A.remove(),'small'));
    target.append(buttons);
    if(b.type==='choice'){
      const nodes=S.d.blocks.filter(n=>n.type==='node');
      const links=select([['','Choose destination…'],...nodes.map(n=>[n.id,n.text||'Untitled node'])],b.target);
      links.onchange=()=>A.mutate(()=>b.target=links.value);
      target.append(label('Branch destination',links));
      if(b.target)target.append(btn('Jump to destination',()=>A.selectBlock(b.target),'tool-link','arrow'));
    }
    if(b.type==='name'){
      const names=[...new Set([...S.d.blocks.filter(x=>x.type==='name').map(x=>x.text.trim()),...S.p.components.filter(x=>x.type==='name').map(x=>x.text.trim())].filter(Boolean))];
      if(names.length){const reuse=select([['','Choose a character…'],...names.map(n=>[n,n])]);reuse.onchange=()=>{if(reuse.value)A.mutate(()=>b.text=reuse.value,{id:b.id,field:'text',pos:reuse.value.length});};target.append(label('Cast',reuse));}
    }
  }
  function render(){
    if(!S.p)return;
    const dest=tool();dest.replaceChildren();
    $('tab-library').setAttribute('aria-selected',String(S.tab==='library'));$('tab-proof').setAttribute('aria-selected',String(S.tab==='proof'));
    if(S.tab==='proof'){proof();return;}
    dest.append(el('h3','tool-heading','Core elements'));
    for(const type of S.t.types)dest.append(elementButton(type,blocks[type].label,()=>A.insert(type),{type}));
    const lib=section(dest,'Project components');
    for(const c of S.p.components.filter(c=>S.t.types.includes(c.type))){
      const row=el('div','lib-row'),edit=btn('',()=>component(c),'icon-button','edit');edit.title='Edit '+c.name;edit.setAttribute('aria-label',edit.title);
      row.append(elementButton(c.type,c.name,()=>A.insert(c.type,c.text,c.audio),c),edit);lib.append(row);
    }
    lib.append(btn('Save component',()=>component(),'tool-link','plus'));
    const chosen=section(dest);chosen.id='chosen-element-tools';selection();
  }
  function component(existing=null){
    const b=existing||A.activeBlock(),name=input(existing?.name||'',150),kind=select(options(S.t),b.type),val=el('textarea','form-text'),audio=el('textarea','form-text');
    val.value=b.text;audio.value=b.audio||'';const second=label('Audio',audio);
    kind.onchange=()=>second.hidden=kind.value!=='av';kind.onchange();
    const apply=()=>{
      if(!name.value.trim()){name.focus();return;}
      const entry={id:existing?.id||uid(),name:name.value.trim(),type:kind.value,text:val.value,audio:kind.value==='av'?audio.value:''};
      close();A.mutate(()=>{if(existing)S.p.components.splice(S.p.components.indexOf(existing),1,entry);else S.p.components.push(entry);});toast('Component saved to this project');
    };
    const acts=[['Cancel',close],['Save component',apply,true]];
    if(existing)acts.unshift(['Remove',()=>{close();A.mutate(()=>S.p.components.splice(S.p.components.indexOf(existing),1));}]);
    modal(existing?'Edit component':'Save project component',[label('Library name',name),label('Element type',kind),label('Reusable text',val),second],acts);
  }
  let proofRender=0;
  async function proof(){
    const id=++proofRender;tool().append(el('p','tool-note','Checking English spelling and usage…'));
    await SceneProof.ready;if(id!==proofRender||S.tab!=='proof'||!S.p)return;
    const issues=SceneProof.check(S.p,S.d);tool().replaceChildren(el('h3','tool-heading',issues.length+' suggestion'+(issues.length===1?'':'s')));
    if(!issues.length)tool().append(el('p','tool-note','No spelling or usage issues found in this script.'));
    for(const item of issues.slice(0,80)){
      const box=el('div','issue'),jump=()=>A.selectBlock(item.id,item.field,true,item.index,item.index+item.value.length);
      box.append(el('div','caps-label',item.kind),btn(item.value,jump,'issue-word'),el('p','',item.message));
      const controls=el('div','mini-actions');
      const replace=word=>{
        const b=S.d.blocks.find(x=>x.id===item.id);
        if(!b||b[item.field].slice(item.index,item.index+item.value.length)!==item.value){render();return;}
        A.mutate(()=>b[item.field]=b[item.field].slice(0,item.index)+word+b[item.field].slice(item.index+item.value.length),{id:b.id,field:item.field,pos:item.index+word.length});
      };
      if(item.replacement)controls.append(btn('Use “'+item.replacement+'”',()=>replace(item.replacement),'small'));
      if(item.kind==='Spelling'){
        controls.append(btn('Suggestions',()=>{
          const sug=SceneProof.suggest(item.value),newVal=input(item.value),choose=el('div','mini-actions');
          for(const w of sug)choose.append(btn(w,()=>{newVal.value=w;},'small'));
          modal('Spelling suggestions',[label('Replacement',newVal),choose],[['Cancel',close],['Replace',()=>{close();replace(newVal.value);},true]]);
        },'small'),btn('Add to dictionary',()=>A.mutate(()=>S.p.dictionary.push(item.value.toLowerCase())),'small'));
      }
      controls.append(btn('Ignore',()=>A.mutate(()=>S.p.ignored.push(item.key)),'small'));box.append(controls);tool().append(box);
    }
    if(issues.length>80)tool().append(el('p','tool-note','Showing the first 80 suggestions. More appear as you review.'));
    if(S.p.ignored.length)tool().append(btn('Review ignored suggestions',()=>A.mutate(()=>S.p.ignored=[]),'tool-link'));
  }
  function newDocument(){
    const all=allTemplates(S.p),list=Object.values(all),kind=select(Object.values(families).map(f=>[f.id,f.name]),S.t.family),title=input(''),template=select([]),withText=check('Use example text'),message=el('p');
    function filter(){const available=list.filter(t=>t.family===kind.value);template.replaceChildren(...Array.from(select(available.map(t=>[t.id,t.name+(templates[t.id]?'':' · project template')])).options));template.value=available[0].id;template.onchange();}
    template.onchange=()=>{const t=all[template.value];message.textContent=t.description;withText.hidden=!templates[t.id];};kind.onchange=filter;filter();
    modal('Add a script',[label('Script title',title),label('Script type',kind),label('Template',template),message,withText],[
      ['Cancel',close],['Add script',()=>{const d=documentFor(all[template.value],title.value||'Untitled script',!withText.hidden&&withText.firstChild.checked);close();A.mutate(()=>{S.p.documents.push(d);S.p.active=d.id;S.active=d.blocks[0].id;});$('paper-scroll').scrollTop=0;},true]]);
  }
  function templateEditor(){
    const original=S.t,base=original.base||original.id,name=input(original.name+' — custom',150);
    const overrides=copy(original.overrides||{}),kind=select(options(original)),kept=check('Include the current script text in the template'),use=check('Apply this template to the current script',true);
    const paper=select([['Letter','US Letter'],['A4','A4']],original.paper||'Letter');
    const panel=el('div','template-edit');let current;
    function read(){if(!current)return;const item={...(overrides[current]||{})};
      for(const field of panel.querySelectorAll('[data-setting]')){
        const k=field.dataset.setting;item[k]=field.type==='checkbox'?field.checked:field.type==='number'?Number(field.value):field.value;
      }
      overrides[current]=item;
    }
    function show(){
      read();current=kind.value;const s={...style(original,current),...overrides[current]};panel.replaceChildren();
      const nums=el('div','two-fields');
      for(const [k,title,min,max] of [['left','Left indent (pt)',0,300],['right','Right indent (pt)',0,300],['before','Space before (pt)',0,72],['line','Line height (pt)',8,48]]){
        const f=input(String(s[k]||0));f.type='number';f.min=min;f.max=max;f.dataset.setting=k;nums.append(label(title,f));
      }
      const align=select(['left','center','right'].map(x=>[x,x]),s.align),next=select(options(original),s.next);
      align.dataset.setting='align';next.dataset.setting='next';const checks=el('div','check-row');
      for(const [k,title] of [['caps','Uppercase'],['bold','Bold'],['italic','Italic']]){const c=check(title,!!s[k]);c.firstChild.dataset.setting=k;checks.append(c);}
      panel.append(nums,label('Alignment',align),label('Enter creates',next),checks);
    }
    kind.onchange=show;show();
    modal('Customize template',[label('Template name',name),label('Paper',paper),label('Element to customize',kind),panel,kept,use],[
      ['Cancel',close],['Save template',()=>{
        if(!name.value.trim()){name.focus();return;}read();
        for(const [k,st] of Object.entries(overrides)){
          if((st.left||0)+(st.right||0)>320 || (st.line||style(original,k).line)<(st.size||style(original,k).size)){
            toast('Leave room for text and use a line height at least as large as the type.');return;}
        }
        if(!$('modal-form').reportValidity())return;
        const include=kept.firstChild.checked;
        const seed=S.d.blocks.map(b=>{const row=[b.type,include?b.text:'',include?b.audio:''];if(include&&b.target)row.push(S.d.blocks.find(x=>x.id===b.target)?.text||'');return row;});
        const t={id:uid(),base,family:original.family,name:name.value.trim(),description:'Project template based on '+templates[base].name+'.',profile:original.profile,types:[...original.types],overrides,paper:paper.value,seed};
        close();A.mutate(()=>{S.p.templates.push(t);if(use.firstChild.checked)S.d.template=t.id;});toast('Template saved to this project');
      },true]]);
  }
  function settings(){
    const project=input(S.p.title),title=input(S.d.title),author=input(S.p.author,2000),contact=el('textarea','form-text');contact.value=S.p.contact;contact.maxLength=4000;
    const cover=check('Include a title page in this script',S.d.cover);
    modal('Project and script details',[label('Project name',project),label('Script title',title),label('Written by',author),label('Title-page contact details',contact),cover],[
      ['Cancel',close],['Save details',()=>{if(!project.value.trim()||!title.value.trim())return;close();A.mutate(()=>{S.p.title=project.value.trim();S.d.title=title.value.trim();S.p.author=author.value.trim();S.p.contact=contact.value.trim();S.d.cover=cover.firstChild.checked;});},true]]);
  }
  function projectMenu(){
    const menu=el('div','menu-list');
    const items=[
      ['Add script',newDocument,'plus'],['Project and script details',settings,'settings'],['Customize template',templateEditor,'magic'],
      ['Save project as…',()=>A.save(true),'save'],['Open project…',A.openProject,'folder'],['New project',A.home,'file'],['Writing shortcuts',help,'keyboard']
    ];
    for(const [name,fn,symbol] of items)menu.append(btn(name,()=>{close();fn();},'',symbol));
    modal(S.p.title,[menu]);
  }
  function help(){
    const tbl=el('table','help-table');
    for(const [k,v] of [['Enter','Start the next element'],['Shift + Enter','Insert a line break'],['Tab / Shift + Tab','Cycle element types'],['Ctrl/Cmd + S','Save project'],['Ctrl/Cmd + Shift + S','Save as'],['Ctrl/Cmd + O','Open project'],['Ctrl/Cmd + N','Add script to project'],['Ctrl/Cmd + Z','Undo'],['Ctrl/Cmd + Shift + Z','Redo'],['F8 / Escape','Enter / exit focus mode']]){
      const row=el('tr');row.append(el('td','kbd',k),el('td','',v));tbl.append(row);}
    modal('Writing shortcuts',[tbl],[['Done',close,true]]);
  }
  function exportMenu(){
    const menu=el('div','menu-list');menu.append(btn('PDF document',()=>A.exportFile('pdf'),'','file'),btn('Editable Word document (.docx)',()=>A.exportFile('docx'),'','file'));
    modal('Export “'+S.d.title+'”',[el('p','','Export the active script with its current template, title page, and page breaks.'),menu]);
  }
  function addElement(){
    const kind=select(options(S.t),A.activeBlock()?.type);modal('Insert element',[label('Element type',kind)],[['Cancel',close],['Insert',()=>{close();A.insert(kind.value);},true]]);
  }
  window.ScenePanels={render,selection,newDocument,projectMenu,templateEditor,component,settings,exportMenu,addElement};
})();
