'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
module.exports=async({win,folder})=>{
  const run=script=>win.webContents.executeJavaScript(script,true);
  await run('document.fonts.ready');await win.webContents.setZoomFactor(1);
  await fs.writeFile(path.join(folder,'launch.png'),(await win.webContents.capturePage()).toPNG());
  assert.equal(await run("document.querySelectorAll('.family-card').length"),6);
  await run(`document.getElementById('launch-title').value='Test manuscript';document.getElementById('sample').checked=true;document.getElementById('create').click()`);
  for(let i=0;i<100&&!await run('!!SceneApp.S.p');i++)await new Promise(r=>setTimeout(r,80));
  assert.equal(await run('SceneApp.S.t.id'),'feature');
  await run(`SceneApp.selectBlock(SceneApp.S.d.blocks[1].id); const a=document.activeElement;a.value='The the projector flickers.';a.dispatchEvent(new Event('input',{bubbles:true}));`);
  assert.equal(await run('SceneApp.S.d.blocks[1].text'),'The the projector flickers.');
  await run(`ScenePanels.component();const fields=document.querySelectorAll('#modal-body input');fields[0].value='Projector';document.querySelector('#modal-actions .primary').click();`);
  assert.equal(await run('SceneApp.S.p.components.length'),1);
  await run(`ScenePanels.templateEditor();document.querySelector('#modal-body input').value='Projection draft';document.querySelector('#modal-actions .primary').click();`);
  assert.equal(await run('SceneApp.S.p.templates.length'),1);
  await run(`document.getElementById('tab-proof').click();`);await run('SceneProof.ready');
  assert.ok(await run(`SceneProof.check(SceneApp.S.p,SceneApp.S.d).some(i=>i.rule==='repeated')`));
  await run(`document.getElementById('tab-library').click();SceneApp.focus(true);SceneApp.focus(false);`);
  assert.ok(await run('SceneApp.save()'));
  await run("SceneApp.exportFile('docx')");await run("SceneApp.exportFile('pdf')");
  await fs.writeFile(path.join(folder,'editor.png'),(await win.webContents.capturePage()).toPNG());
  await run('SceneApp.openProject()');assert.equal(await run('SceneApp.S.p.templates[0].name'),'Projection draft');
  assert.equal(await run('SceneApp.S.p.components[0].name'),'Projector');
  assert.ok((await fs.readFile(path.join(folder,'Test manuscript.pdf'))).subarray(0,5).equals(Buffer.from('%PDF-')));
  assert.ok((await fs.stat(path.join(folder,'Test manuscript.docx'))).size>30000);
  // Export independently paginated fixtures for document-engine verification.
  for(const [id,name] of [['ad-av','AV fixture'],['feature','Dialogue fixture']]){
    await run(`(() => {const t=SceneCatalog.templates[${JSON.stringify(id)}],p=SceneModel.projectFor(t,${JSON.stringify(name)},true),d=p.documents[0];
      if(t.profile==='av'){d.blocks[2].audio='Listen to the projector. '.repeat(200);}
      else{d.cover=true;p.author='Mara Vale';d.blocks.find(b=>b.type==='dialogue').text='One more reel. '.repeat(220);}
      SceneApp.start(p,false);})()`);
    await run("SceneApp.exportFile('docx')");await run("SceneApp.exportFile('pdf')");
    const n=await run('SceneApp.S.layout.pages.length');assert.ok(n>1);
    await fs.writeFile(path.join(folder,name+'.pages'),String(n));
  }
};
