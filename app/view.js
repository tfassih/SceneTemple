(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const ns='http://www.w3.org/2000/svg';
  const paths={
    clapper:'M3 10h18v10H3z M3 10l-1-5 17-3 1 5z M6 5l3 3 M12 4l3 3',
    tv:'M3 6h18v13H3z M7 22h10 M9 2l3 3 3-3',
    curtain:'M3 3h18v18 M3 3v18 M3 4q0 8 6 9l-5 7 M21 4q0 8-6 9l5 7 M9 4v4 M15 4v4',
    game:'M7 7h10q3 0 4 4l1 5q0 5-4 2l-3-3H9l-3 3q-4 3-4-2l1-5q1-4 4-4z M6 11h4 M8 9v4 M16 10h.01 M18 12h.01',
    play:'M3 4h18v16H3z M10 8l6 4-6 4z',
    speaker:'M3 10v5h5l10 4V5L8 10z M7 15l2 6h3l-2-5 M21 9v5',
    file:'M5 2h9l5 5v15H5z M14 2v6h5 M8 12h8 M8 16h6',
    folder:'M2 7V4h7l2 3h10v2 M2 9h21l-3 11H3z',
    arrow:'M4 12h15 M13 6l6 6-6 6', down:'M6 9l6 6 6-6',save:'M3 3h15l3 3v15H3z M7 3v7h9V3 M7 21v-7h10v7',
    export:'M12 16V3 M7 8l5-5 5 5 M4 14v6h16v-6',plus:'M12 5v14 M5 12h14',list:'M4 6h3 M10 6h11 M4 12h3 M10 12h11 M4 18h3 M10 18h11',
    sidebar:'M3 4h18v16H3z M9 4v16',tools:'M3 4h18v16H3z M15 4v16',undo:'M4 10h9a6 6 0 0 1 0 12 M4 10l5-5 M4 10l5 5',
    redo:'M20 10h-9a6 6 0 0 0 0 12 M20 10l-5-5 M20 10l-5 5',focus:'M3 9V3h6 M15 3h6v6 M21 15v6h-6 M9 21H3v-6',
    close:'M6 6l12 12 M18 6L6 18',edit:'M4 16l-1 5 5-1L20 8l-4-4z M13 7l4 4',copy:'M8 8h13v13H8z M3 16V3h13',settings:'M3 7h9 M17 7h4 M3 17h3 M11 17h10 M12 5v4h5V5z M6 15v4h5v-4z',
    magic:'M3 20L16 7l3 3L6 23z M4 3v4 M2 5h4 M17 1v4 M15 3h4',book:'M3 4q5-2 9 1 4-3 9-1v15q-5-2-9 1-4-3-9-1z M12 5v15',keyboard:'M2 6h20v13H2z M5 10h1 M9 10h1 M13 10h1 M17 10h1 M7 15h10'
  };
  function icon(name){const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','icon');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(ns,'path');path.setAttribute('d',paths[name]||paths.file);svg.append(path);return svg;}
  function icons(root=document){root.querySelectorAll('i[data-icon]').forEach(e=>e.replaceWith(icon(e.dataset.icon)));}
  function el(tag,cls='',txt=''){const e=document.createElement(tag);if(cls)e.className=cls;if(txt)e.textContent=txt;return e;}
  function btn(txt,fn,cls='',symbol=''){const b=el('button',cls);b.type='button';if(symbol)b.append(icon(symbol));b.append(document.createTextNode(txt));b.addEventListener('click',fn);return b;}
  function select(items,selected){const s=el('select');for(const [value,label] of items){const o=el('option','',label);o.value=value;s.append(o);}if(selected!=null)s.value=selected;return s;}
  function input(value='',max=500){const i=el('input');i.value=value;i.maxLength=max;return i;}
  function label(txt,control){const l=el('label','',txt);l.append(control);return l;}
  function check(txt,value=false){const l=el('label','check'),i=el('input');i.type='checkbox';i.checked=value;l.append(i,document.createTextNode(txt));return l;}
  function matchesBox(p,box){return box.dataset.id===p.id && box.dataset.field===p.field;}
  function font(e,s){
    Object.assign(e.style,{fontSize:s.size+'pt',lineHeight:s.line+'pt',fontWeight:s.bold?'700':'400',fontStyle:s.italic?'italic':'normal',textAlign:s.align||'left',textDecoration:s.underline?'underline':'none'});
  }
  function positioned(e,x,y,w,h){
    Object.assign(e.style,{left:x+'pt',top:y+'pt',width:w+'pt',height:h+'pt'});return e;
  }
  function sheet(l,p,mode,doc,t){
    const e=el('div','sheet');e.style.width=l.w+'pt';e.style.height=l.h+'pt';
    if(p.number>1){const num=el('div','folio',p.number+'.');num.style.top='36pt';num.style.right=l.right+'pt';e.append(num);}
    for(const g of p.groups){
      if(g.role==='av-head'){const line=positioned(el('div','page-rule'),l.left,g.y+g.height,l.w-l.left-l.right,0);e.append(line);}
      if(g.role==='av-row')e.append(positioned(el('div','av-divider'),l.left+(l.w-l.left-l.right)/2,g.y,0.5,g.height));
      if(g.sceneNo)for(const x of [l.left-40,l.w-l.right+12])e.append(positioned(el('div','scene-mark',String(g.sceneNo)),x,g.y,35,12));
      for(const p of g.parts){
        if(mode==='edit' && p.field){
          const b=doc.blocksById.get(p.id),outer=positioned(el('div','field-box'),p.x,g.y,p.width,p.lines.length*p.style.line);
          const area=el('textarea');area.setAttribute('aria-label',p.field==='audio'?'Audio':p.type==='av'?'Visual':SceneCatalog.blocks[p.type].label);
          area.spellcheck=false;area.autocapitalize='off';area.setAttribute('autocomplete','off');
          area.dataset.id=p.id;area.dataset.field=p.field;area.dataset.start=p.start;area.dataset.end=p.end;
          area.value=b[p.field].slice(p.start,p.end).replace(/\n$/,'');
          // A terminal hard break belongs to the next page only when the fragment is split.
          if(p.end===b[p.field].length)area.value=b[p.field].slice(p.start,p.end);
          area.dataset.span=area.value.length;area.placeholder=p.field==='audio'?'Audio, dialogue or voiceover':SceneCatalog.blocks[p.type].hint;
          font(area,p.style);area.style.textTransform=p.style.caps?'uppercase':'none';outer.append(area);e.append(outer);
        }else{
          const text=positioned(el('div','ink-block'),p.x,g.y,p.width,p.lines.length*p.style.line);
          font(text,p.style);text.textContent=p.lines.map(line=>line.text).join('\n');e.append(text);
        }
      }
    }
    if(mode==='edit' && p.breakId){const b=el('button','pagebreak-hint','Page break · select');b.dataset.break=p.breakId;e.append(b);}
    return e;
  }
  let submitTask=null;
  function modal(title,content,actions=[]){
    if($('dialog').open)$('dialog').close();
    $('modal-title').textContent=title;$('modal-body').replaceChildren(...content);$('modal-actions').replaceChildren();
    submitTask=null;
    for(const [title,fn,primary] of actions){
      const b=btn(title,async()=>{await fn();},primary?'primary':'quiet');$('modal-actions').append(b);if(primary)submitTask=fn;
    }
    $('dialog').showModal();
    const first=$('modal-body').querySelector('input:not([type=checkbox]),select,textarea');
    if(first)first.focus();
  }
  function close(){if($('dialog').open)$('dialog').close();}
  let timer;
  function toast(msg){$('toast').textContent=msg;$('toast').hidden=false;clearTimeout(timer);timer=setTimeout(()=>$('toast').hidden=true,3200);}
  $('modal-close').onclick=close;$('modal-form').onsubmit=e=>{e.preventDefault();if(submitTask)submitTask();};
  icons();
  globalThis.SceneView={$,el,btn,icon,select,input,label,check,matchesBox,font,sheet,modal,close,toast};
})();
