const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../app/catalog.js');require('../app/model.js');require('../app/layout.js');
const M=SceneModel,L=SceneLayout;
test('All core documents and examples round-trip and render with their own elements',()=>{
  for(const t of Object.values(SceneCatalog.templates))for(const sample of [false,true]){
    const p=M.projectFor(t,'A test script',sample),d=p.documents[0];
    assert.deepEqual(M.validate(JSON.parse(JSON.stringify(p))),p);
    assert.ok(L.layout(p,d,t).pages.length);assert.ok(d.blocks.every(b=>t.types.includes(b.type)));
  }
});
test('Long dialogue is continued, keeps the cue with its speech, and preserves every character',()=>{
  const t=SceneCatalog.templates.feature,p=M.projectFor(t,'Boundary'),d=p.documents[0];
  const dialogue='An unbroken conversation across several pages. '.repeat(170);
  d.blocks=M.fromSeed([['scene','INT. LOBBY – NIGHT'],['name','RIVER'],['dialogue',dialogue]]);
  const l=L.layout(p,d,t),parts=l.pages.flatMap(page=>page.groups.flatMap(g=>g.parts));
  assert.ok(l.pages.length>2);
  assert.ok(parts.some(f=>f.lines.some(a=>a.text==='(MORE)')));
  assert.ok(parts.some(f=>f.lines.some(a=>a.text==="RIVER (CONT'D)")));
  assert.equal(parts.filter(f=>f.id===d.blocks[2].id).map(f=>dialogue.slice(f.start,f.end)).join(''),dialogue);
  for(const page of l.pages)for(const g of page.groups)assert.ok(g.y+g.height<=l.bottom+0.1);
});
test('Paired AV fields remain aligned over page breaks, including after a short left column ends',()=>{
  const t=SceneCatalog.templates['ad-av'],p=M.projectFor(t,'AV'),d=p.documents[0];
  d.blocks=M.fromSeed([['av','Short visual','Longer narration. '.repeat(400)]]);
  const l=L.layout(p,d,t);assert.ok(l.pages.length>1);
  assert.ok(l.pages.every(page=>page.groups[0].role==='av-head'));
  const parts=l.pages.flatMap(p=>p.groups.flatMap(g=>g.parts)).filter(a=>a.field==='audio');
  assert.equal(parts.map(q=>d.blocks[0].audio.slice(q.start,q.end)).join(''),d.blocks[0].audio);
});
test('Structure, stable choice destinations and custom project libraries survive reopening',()=>{
  const base=SceneCatalog.templates['game-branch'],p=M.projectFor(base,'Game',true),d=p.documents[0];
  const choice=d.blocks.find(b=>b.type==='choice');assert.ok(d.blocks.some(b=>b.id===choice.target));
  p.templates.push({id:'my-branch',base:base.id,name:'My branch',family:base.family,profile:base.profile,types:base.types,overrides:{name:{left:18}},seed:[['node','Start']]});
  p.components.push({id:'venue',name:'Lobby',type:'node',text:'Lobby',audio:''});p.dictionary.push('Orpheum');d.template='my-branch';
  assert.deepEqual(M.validate(JSON.parse(JSON.stringify(p))),p);
  assert.ok(M.outline(d,base).some(o=>o.id===choice.target));
  p.version=2;assert.throws(()=>M.validate(p),/version/);
});
test('Wrap retains raw ranges through whitespace, blank lines, and long unbroken words',()=>{
  const s=M.style(SceneCatalog.templates.feature,'dialogue');
  for(const data of ['','\n','one\n\nthree','a'.repeat(9000),'Text, with   spaces. '.repeat(500),'Résumé — café…']){
    const lines=L.wrap(data,120,s);
    assert.equal(lines.map((q,i)=>data.slice(q.start,lines[i+1]?.start??data.length)).join(''),data);
  }
});
