(() => {
  'use strict';
  const {templates,blocks}=SceneCatalog;
  const uid=()=>crypto.randomUUID();
  const copy=v=>JSON.parse(JSON.stringify(v));
  const allTemplates=p=>({...templates,...Object.fromEntries((p?.templates || []).map(t=>[t.id,t]))});
  const fromSeed=(seed)=>{
    const items=seed.map(([type,text='',audio=''])=>({id:uid(),type,text,audio,target:''}));
    seed.forEach((row,i)=>{if(row[3]) items[i].target=items.find(b=>b.type==='node' && b.text===row[3])?.id || '';});
    return items;
  };
  function documentFor(t,title,useSample=false) {
    return {id:uid(),title:title.trim() || 'Untitled script',template:t.id,cover:false,blocks:fromSeed(useSample ? (t.sample || t.seed) : t.seed)};
  }
  function projectFor(t,title,example=false) {
    const doc=documentFor(t,title,example);
    return {format:'SceneTemple',version:1,id:uid(),title:doc.title,author:'',contact:'',active:doc.id,
      documents:[doc],templates:[],components:[],dictionary:[],ignored:[]};
  }
  function style(t,type) {
    const b={...blocks[type],...(t.overrides?.[type] || {})};
    if(['av','design','branch','stage'].includes(t.profile) && !t.overrides?.[type]?.line) b.line=Math.max(b.size+2,14);
    if(!t.types.includes(b.next)) b.next=t.types.includes('body') ? 'body' : t.types.includes('av')?'av':t.types.includes('stage')?'stage':t.types[0];
    return b;
  }
  function validate(raw) {
    const fail=()=>{throw Error('This file contains invalid SceneTemple project data.');};
    if(!raw || raw.format!=='SceneTemple') throw Error('Choose a .scenetemple project created by SceneTemple.');
    if(raw.version!==1) throw Error('This project uses an unsupported file version. Open it with the SceneTemple version that saved it.');
    const str=(value,max=1000000)=>typeof value==='string' && value.length<=max;
    const ident=v=>str(v,128) && /^[A-Za-z0-9_-]+$/.test(v) && !['constructor','prototype','__proto__'].includes(v);
    const list=(arr,max)=>Array.isArray(arr) && arr.length<=max;
    const unique=arr=>new Set(arr.map(x=>x.id)).size===arr.length;
    if(!ident(raw.id)||!str(raw.title,500)||!str(raw.author,2000)||!str(raw.contact,4000)
      ||!list(raw.documents,2000)||!raw.documents.length||!list(raw.templates,1000)||!list(raw.components,20000)
      ||!list(raw.dictionary,50000)||!list(raw.ignored,100000)) fail();
    for(const t of raw.templates){
      if(!ident(t.id)||Object.hasOwn(templates,t.id)||!Object.hasOwn(templates,t.base)||!str(t.name,150)||!list(t.types,100)||!t.types.length||
        !t.types.every(x=>Object.hasOwn(blocks,x))||t.types.includes('av')!==templates[t.base].types.includes('av')||!list(t.seed,15000)||!t.seed.length||
        !t.seed.every(r=>Array.isArray(r)&&t.types.includes(r[0])&&r.slice(1).every(x=>str(x)))||typeof t.overrides!=='object'||!t.overrides)fail();
      if(t.profile!==templates[t.base].profile||t.family!==templates[t.base].family||!['Letter','A4',undefined].includes(t.paper))fail();
      for(const [type,vals] of Object.entries(t.overrides)){
        if(!Object.hasOwn(blocks,type)||!vals||typeof vals!=='object')fail();
        for(const [k,v] of Object.entries(vals)){
          if(['left','right','before','line','size'].includes(k)){
            const bounds={left:[0,360],right:[0,360],before:[0,72],size:[8,24],line:[8,48]}[k];
            if(!Number.isFinite(v)||v<bounds[0]||v>bounds[1])fail();
          }else if(['bold','italic','underline','caps'].includes(k)){if(typeof v!=='boolean')fail();}
          else if(k==='next'){if(!Object.hasOwn(blocks,v))fail();}
          else if(k==='align'){if(!['left','center','right'].includes(v))fail();}
          else fail();
        }
      }
    }
    if(!unique(raw.templates)||!unique(raw.documents)||!unique(raw.components))fail();
    const ts=allTemplates(raw);
    for(const d of raw.documents){
      if(!ident(d.id)||!str(d.title,500)||!Object.hasOwn(ts,d.template)||!list(d.blocks,100000)||!d.blocks.length||typeof d.cover!=='boolean')fail();
      const t=ts[d.template];
      for(const b of d.blocks)if(!ident(b.id)||!t.types.includes(b.type)||!str(b.text)||!str(b.audio)||!str(b.target,128))fail();
      if(!unique(d.blocks))fail();
    }
    if(!raw.documents.some(d=>d.id===raw.active))fail();
    for(const c of raw.components)if(!ident(c.id)||!str(c.name,150)||!Object.hasOwn(blocks,c.type)||!str(c.text)||!str(c.audio))fail();
    if(!raw.dictionary.every(w=>str(w,180))||!raw.ignored.every(w=>str(w,450)))fail();
    return raw;
  }
  function outline(doc,t) {
    const chain=[];
    return doc.blocks.flatMap(b=>{
      const s=style(t,b.type);
      if(!s.level)return [];
      while(chain.length && chain[chain.length-1]>=s.level)chain.pop();
      const item={id:b.id,label:b.text.trim().split('\n')[0]||s.label,type:b.type,depth:chain.length};
      chain.push(s.level);
      return [item];
    });
  }
  function detect(value,t) {
    if(t.types.includes('scene') && /^(INT\.?[ /-]+EXT\.?|I\/E\.|INT\.|EXT\.|EST\.)\s/i.test(value))return 'scene';
    if(t.types.includes('transition') && /^(FADE (IN|OUT)|FADE TO BLACK|(?:SMASH |MATCH )?CUT TO|DISSOLVE TO)[:.]?$/i.test(value.trim()))return 'transition';
    return null;
  }
  globalThis.SceneModel={uid,copy,allTemplates,fromSeed,documentFor,projectFor,style,validate,outline,detect};
})();
