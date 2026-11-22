(() => {
  'use strict';
  const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const PKG='http://schemas.openxmlformats.org/package/2006/relationships';
  const esc=v=>String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const tw=n=>Math.round(n*20);
  const xml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const para=(inner,props='')=>'<w:p><w:pPr>'+props+'</w:pPr>'+inner+'</w:p>';
  const lineProps=height=>'<w:spacing w:before="0" w:after="0" w:line="'+Math.max(1,tw(height))+'" w:lineRule="exact"/><w:widowControl w:val="0"/>';
  const spacer=h=>h>0.045?para('',lineProps(h)):'';
  function rProps(s){
    return '<w:rPr><w:rFonts w:ascii="Courier Prime" w:hAnsi="Courier Prime" w:eastAsia="Courier Prime" w:cs="Courier Prime"/>'+
      (s.bold?'<w:b/>':'')+(s.italic?'<w:i/>':'')+(s.underline?'<w:u w:val="single"/>':'')+
      '<w:sz w:val="'+Math.round(s.size*2)+'"/><w:szCs w:val="'+Math.round(s.size*2)+'"/><w:color w:val="151515"/></w:rPr>';
  }
  const text=v=>'<w:t xml:space="preserve">'+esc(v)+'</w:t>';
  function paragraph(part,indLeft=0,indRight=0,extra='',decoration=''){
    const s=part.style;
    const body=part.lines.map(l=>text(l.text)).join('<w:br/>');
    return para(decoration+'<w:r>'+rProps(s)+body+'</w:r>',extra+
      '<w:ind w:left="'+tw(indLeft)+'" w:right="'+tw(indRight)+'"/><w:jc w:val="'+(s.align||'left')+'"/>'+lineProps(s.line));
  }
  function avTable(g,layout){
    const width=layout.w-layout.left-layout.right, cw=(width-18)/2;
    const widths=[cw,9,9,cw];
    const cells=widths.map((v,i)=>{
      const x=i===0?layout.left:i===3?layout.left+cw+18:null;
      const part=x===null?null:g.parts.find(p=>Math.abs(p.x-x)<0.2);
      const divider=i===1&&g.role==='av-row'?'<w:tcBorders><w:right w:val="single" w:sz="4" w:color="D9DDD5"/></w:tcBorders>':'';
      return '<w:tc><w:tcPr><w:tcW w:w="'+tw(v)+'" w:type="dxa"/>'+divider+'<w:vAlign w:val="top"/></w:tcPr>'+
        (part?paragraph(part):para('',lineProps(1)))+'</w:tc>';
    });
    return '<w:tbl><w:tblPr><w:tblW w:w="'+tw(width)+'" w:type="dxa"/><w:tblInd w:w="0" w:type="dxa"/><w:tblLayout w:type="fixed"/>'+
      (g.role==='av-head'?'<w:tblBorders><w:bottom w:val="single" w:sz="4" w:color="BEC3B9"/></w:tblBorders>':'')+
      '<w:tblCellMar>'+['top','left','bottom','right'].map(k=>'<w:'+k+' w:w="0" w:type="dxa"/>').join('')+'</w:tblCellMar></w:tblPr>'+
      '<w:tblGrid>'+widths.map(v=>'<w:gridCol w:w="'+tw(v)+'"/>').join('')+'</w:tblGrid><w:tr><w:trPr><w:trHeight w:val="'+tw(g.height)+'" w:hRule="exact"/><w:cantSplit/></w:trPr>'+
      cells.join('')+'</w:tr></w:tbl>';
  }
  function marginal(number,x,y) {
    const style='position:absolute;margin-left:'+x+'pt;margin-top:'+y+'pt;width:35pt;height:14pt;mso-position-horizontal-relative:page;mso-position-vertical-relative:page';
    return '<w:r><w:pict><v:rect stroked="f" filled="f" style="'+style+'"><v:textbox inset="0,0,0,0"><w:txbxContent>'+
      paragraph({style:{size:12,line:12},lines:[{text:String(number)}]})+'</w:txbxContent></v:textbox></v:rect></w:pict></w:r>';
  }
  async function docx(project,doc,layout){
    const z=new JSZip(), types=[
      ['/word/document.xml','document.main'],['/word/styles.xml','styles'],['/word/fontTable.xml','fontTable'],['/word/settings.xml','settings'],['/word/header1.xml','header']
    ];
    z.file('[Content_Types].xml',xml+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/>'+
      types.map(([path,key])=>'<Override PartName="'+path+'" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.'+key+'+xml"/>').join('')+'</Types>');
    const rels=items=>xml+'<Relationships xmlns="'+PKG+'">'+items.map(([id,type,path])=>'<Relationship Id="'+id+'" Type="'+R+'/'+type+'" Target="'+path+'"/>').join('')+'</Relationships>';
    z.file('_rels/.rels',rels([['rDoc','officeDocument','word/document.xml']]));
    z.file('word/_rels/document.xml.rels',rels([['rStyle','styles','styles.xml'],['rFonts','fontTable','fontTable.xml'],['rSettings','settings','settings.xml'],['rHead','header','header1.xml']]));
    const embeds=[],fontRels=[];
    for(const [face,data] of Object.entries(SceneFonts)){
      const key=crypto.randomUUID().toUpperCase(), parts=key.replace(/-/g,'').match(/../g).map(s=>parseInt(s,16)).reverse();
      const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
      for(let i=0;i<32;i++)bytes[i]^=parts[i%16];
      z.file('word/fonts/'+face+'.odttf',bytes);
      fontRels.push(['r'+face,'font','fonts/'+face+'.odttf']);
      embeds.push('<w:embed'+face+' r:id="r'+face+'" w:fontKey="{'+key+'}"/>');
    }
    z.file('word/_rels/fontTable.xml.rels',rels(fontRels));
    z.file('word/fontTable.xml',xml+'<w:fonts xmlns:w="'+W+'" xmlns:r="'+R+'"><w:font w:name="Courier Prime"><w:altName w:val="Courier New"/><w:family w:val="modern"/><w:pitch w:val="fixed"/>'+embeds.join('')+'</w:font></w:fonts>');
    z.file('word/styles.xml',xml+'<w:styles xmlns:w="'+W+'"><w:docDefaults><w:rPrDefault>'+rProps({size:12})+'</w:rPrDefault><w:pPrDefault><w:pPr>'+lineProps(12)+'</w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>');
    z.file('word/settings.xml',xml+'<w:settings xmlns:w="'+W+'"><w:embedTrueTypeFonts/><w:doNotAutoCompressPictures/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>');
    z.file('word/header1.xml',xml+'<w:hdr xmlns:w="'+W+'">'+para('<w:fldSimple w:instr="PAGE"><w:r>'+rProps({size:12})+text('2')+'</w:r></w:fldSimple><w:r>'+text('.')+'</w:r>','<w:jc w:val="right"/>'+lineProps(12))+'</w:hdr>');
    function section(body=true){
      return '<w:sectPr>'+(body?'<w:headerReference w:type="default" r:id="rHead"/>':'')+
        '<w:type w:val="nextPage"/><w:pgSz w:w="'+tw(layout.w)+'" w:h="'+tw(layout.h)+'"/><w:pgMar w:top="'+tw(layout.top)+'" w:right="'+tw(layout.right)+'" w:bottom="900" w:left="'+tw(layout.left)+'" w:header="720" w:footer="360" w:gutter="0"/><w:pgNumType w:start="1"/><w:titlePg/></w:sectPr>';
    }
    let contents='';
    for(const [idx,page] of layout.pages.entries()){
      let cursor=layout.top;
      if(idx && layout.pages[idx-1].number===null)contents+=para('',lineProps(0.05)+section(false));
      else if(idx){contents+=para('','<w:pageBreakBefore/>'+lineProps(0.05));cursor+=0.05;}
      for(const g of page.groups){
        contents+=spacer(g.y-cursor);
        if(g.role.startsWith('av-'))contents+=avTable(g,layout);
        else{
          const p=g.parts[0];
          let numbers='';
          if(g.sceneNo)numbers=marginal(g.sceneNo,layout.left-40,g.y)+marginal(g.sceneNo,layout.w-layout.right+12,g.y);
          // Explicit hard wraps fix line endings. A two-point right allowance accommodates
          // italic ink overhang in Word and LibreOffice without changing left alignment.
          const allowance=p.style.align==='left'?2:0;
          contents+=paragraph(p,p.x-layout.left,layout.w-layout.right-p.x-p.width-allowance,'',numbers);
        }
        cursor=g.y+g.height;
      }
    }
    z.file('word/document.xml',xml+'<w:document xmlns:w="'+W+'" xmlns:r="'+R+'" xmlns:v="urn:schemas-microsoft-com:vml"><w:body>'+contents+section()+'</w:body></w:document>');
    return z.generateAsync({type:'uint8array',compression:'DEFLATE'});
  }
  globalThis.SceneExport={docx};
})();
