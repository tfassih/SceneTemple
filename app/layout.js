(() => {
  'use strict';
  const {style}=SceneModel;
  const widths=new Map();
  let ctx;
  function glyphWidth(ch,size) {
    if(ch==='\t')return size*1228/2048*4;
    if(ch.codePointAt(0)<256)return size*1228/2048;
    if(!widths.has(ch)){
      ctx ||= typeof document!=='undefined' ? document.createElement('canvas').getContext('2d') : null;
      if(ctx)ctx.font='12pt "Courier Prime", monospace';
      widths.set(ch,ctx?ctx.measureText(ch).width*0.75/12:0.6);
    }
    return widths.get(ch)*size;
  }
  function wrap(text,width,st){
    const lines=[];
    let offset=0;
    for(const para of text.split('\n')){
      const startOffset=offset;
      if(!para.length)lines.push({text:'',start:offset,end:offset});
      let from=0;
      while(from<para.length){
        let end=from, advance=0,lastBreak=from;
        while(end<para.length){
          const ch=String.fromCodePoint(para.codePointAt(end));
          const display=st.caps?ch.toUpperCase():ch;
          const delta=Array.from(display).reduce((n,c)=>n+glyphWidth(c,st.size),0);
          if(advance+delta>width+0.01 && end>from)break;
          end+=ch.length; advance+=delta;
          if(/\s/.test(ch))lastBreak=end;
        }
        if(end<para.length){
          if(/\s/.test(para[end]))while(end<para.length && /\s/.test(para[end]))end++;
          else if(lastBreak>from)end=lastBreak;
        }
        let line=para.slice(from,end).replace(/\s+$/u,'');
        if(st.caps)line=line.toUpperCase();
        lines.push({text:line,start:startOffset+from,end:startOffset+end});
        from=end;
      }
      offset+=para.length+1;
    }
    return lines;
  }
  function layout(project,doc,t){
    const w=t.paper==='A4'?595.28:612, h=t.paper==='A4'?841.89:792;
    const isScreen=['screen','tv','multi','shooting'].includes(t.profile);
    const left=(isScreen||t.profile==='stage')?108:72, right=72, top=72, bottom=h-72;
    const width=w-left-right;
    const pages=[];
    let pg,y,scriptNo=0,sceneNo=0,lastSpeaker='';
    function page(cover=false){
      pg={groups:[],number:cover?null:++scriptNo}; pages.push(pg);y=top;
      if(!cover && t.profile==='av'){
        const st={size:10,line:14,bold:true,align:'left'};
        const parts=['VISUAL','AUDIO'].map((v,i)=>staticPart(left+i*(width+18)/2,(width-18)/2,st,[v]));
        group(parts,14,'av-head'); y+=6;
      }
    }
    function staticPart(x,wide,s,texts){return {x,width:wide,style:s,lines:texts.map(text=>({text})),field:null};}
    function group(parts,height,role=''){
      pg.groups.push({y,height,parts,role});y+=height;
    }
    function place(text,yy,s){
      y=yy;const lines=wrap(text,width,s);group([{x:left,width,style:s,lines,field:null}],lines.length*s.line);
    }
    if(doc.cover){
      page(true);
      const s={size:12,line:14,align:'center'};
      place(doc.title.toUpperCase(),h*.34,{...s,bold:true});
      if(project.author.trim())place('Written by\n'+project.author,y+28,s);
      if(project.contact.trim()){const contact=wrap(project.contact,width,{...s,align:'left'});place(project.contact,Math.max(y+20,bottom-contact.length*14),{...s,align:'left'});}
    }
    page();
    function geometry(st){const x=left+(st.left||0);return {x,width:Math.max(48,width-(st.left||0)-(st.right||0))};}
    function nextPage(){page();}
    function minNext(index){
      const nxt=doc.blocks[index+1];
      if(!nxt||nxt.type==='page')return 0;
      const s=style(t,nxt.type);
      return s.before+Math.min(2,wrap(nxt.text,geometry(s).width,s).length)*s.line;
    }
    const nodes=new Map(doc.blocks.filter(b=>b.type==='node').map(b=>[b.id,b.text]));
    doc.blocks.forEach((b,index)=>{
      if(b.type==='page'){
        pg.breakId=b.id; if(index<doc.blocks.length-1)nextPage();
        return;
      }
      const actStart=['tv','multi','stage'].includes(t.profile) && ['act','teaser','tag'].includes(b.type);
      if(actStart && pg.groups.length)nextPage();
      const st=style(t,b.type), geo=geometry(st);
      if(b.type==='name')lastSpeaker=b.text.trim();
      if(b.type==='scene'||b.type==='location'){sceneNo++;lastSpeaker='';}
      const pair=!!st.pair;
      const ww=pair?(width-18)/2:geo.width;
      const columns=(pair?['text','audio']:['text']).map((field,i)=>({
        field,x:pair?left+i*(ww+18):geo.x,width:ww,lines:wrap(b[field],ww,st),style:st
      }));
      const total=Math.max(...columns.map(c=>c.lines.length));
      const reserve=(st.level || b.type==='name' || b.type==='parenthetical')?minNext(index):0;
      const space=()=> pg.groups.some(g=>g.role!=='av-head')?st.before:0;
      if(y+space()+Math.min(2,total)*st.line+reserve>bottom && y>top+(pair?24:0))nextPage();
      y+=space();
      let pos=0;
      while(pos<total){
        let room=Math.floor((bottom-y+0.01)/st.line);
        if(room<1){nextPage();room=Math.floor((bottom-y)/st.line);}
        const cont=isScreen&&b.type==='dialogue'&&!!lastSpeaker;
        if(cont && total-pos>room && room<3){nextPage();room=Math.floor((bottom-y)/st.line);}
        let count=Math.min(total-pos,room);
        if(cont&&count<total-pos)count--;
        if(total-pos-count===1 && count>=3)count--;
        const parts=columns.flatMap(c=>{
          const lines=c.lines.slice(pos,pos+count);
          if(!lines.length)return [];
          const next=c.lines[pos+count];
          return [{...c,lines,id:b.id,type:b.type,start:lines[0].start,end:next?next.start:b[c.field].length}];
        });
        const gRole=pair?'av-row':'';
        group(parts,count*st.line,gRole);
        if(t.profile==='shooting' && ['scene','location'].includes(b.type)&&pos===0)pg.groups.at(-1).sceneNo=sceneNo;
        pos+=count;
        if(pos<total){
          if(cont){
            const c=style(t,'name'), cg=geometry(c);
            group([staticPart(cg.x,cg.width,c,['(MORE)'])],c.line);
            nextPage();
            const lines=wrap(lastSpeaker.toUpperCase()+" (CONT'D)",cg.width,c);
            group([{...cg,style:c,lines,field:null}],lines.length*c.line);
          }else nextPage();
        }
      }
      if(b.type==='choice' && b.target){
        const s={...st,italic:true,size:10,line:12};
        const lines=wrap('→ '+(nodes.get(b.target)||'Missing target'),geo.width,s);
        for(const line of lines){
          if(y+12>bottom)nextPage();
          group([{...geo,style:s,lines:[line],field:null}],12);
        }
      }
    });
    return {w,h,left,right,top,bottom,pages,profile:t.profile};
  }
  globalThis.SceneLayout={wrap,layout};
})();
