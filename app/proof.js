(() => {
  'use strict';
  let words=new Set(),lengths=new Map();
  const ready=JSZip.loadAsync(SceneLexicon,{base64:true}).then(z=>z.file('words.txt').async('string')).then(s=>{
    words=new Set(s.split('\n'));
  });
  const rules=[
    ['repeated',/\b([A-Za-z]+)([ \t]+)\1\b/gi,m=>'Repeated word',m=>m[1]],
    ['modal',/\b(could|would|should|must|might) of\b/gi,()=> 'Use “have” after this verb.',m=>m[1]+' have'],
    ['lot',/\balot\b/gi,()=> 'Write “a lot” as two words.',()=> 'a lot'],
    ['welcome',/\byour welcome\b/gi,()=> 'For the expression of thanks, use “you’re welcome.”',()=> 'you’re welcome'],
    ['possessive',/\b(it[’']s) (own)\b/gi,()=> 'The possessive form is “its.”',()=> 'its own'],
    ['agreement',/\b(they|we|you) (is|was)\b/gi,()=> 'Check subject–verb agreement.',m=>m[1]+(m[2].toLowerCase()==='is'?' are':' were')],
    ['agreement-he',/\b(he|she|it) (are|were)\b/gi,()=> 'Check subject–verb agreement.',m=>m[1]+(m[2].toLowerCase()==='are'?' is':' was')],
    ['article',/\ba (apple|orange|egg|elephant|umbrella|hour|honest|idea|answer|actor)\b/gi,()=> 'Use “an” before this vowel sound.',m=>'an '+m[1]],
    ['article-an',/\ban (car|dog|book|university|user|one-time|house)\b/gi,()=> 'Use “a” before this consonant sound.',m=>'a '+m[1]],
    ['space',/[^\s\d][,;!?](?=[a-z])/g,()=> 'Consider a space after the punctuation.',m=>m[0]+' ']
  ];
  const norm=w=>w.toLowerCase().replace(/’/g,"'");
  function check(p,d){
    const added=new Set(p.dictionary.map(norm)),ignored=new Set(p.ignored),out=[];
    const known=new Set(d.blocks.filter(b=>b.type==='name').flatMap(b=>b.text.split(/\s+/).map(norm)));
    for(const b of d.blocks)for(const field of (b.type==='av'?['text','audio']:['text'])){
      const text=b[field],occurrences={};
      const record=(kind,rule,index,value,message,replacement)=>{
        const base=b.id+'|'+field+'|'+rule+'|'+norm(value);
        const ordinal=occurrences[base]||0;occurrences[base]=ordinal+1;
        const key=base+'|'+ordinal;
        if(!ignored.has(key))out.push({kind,rule,id:b.id,field,index,value,message,replacement,key});
      };
      for(const [name,rx,why,fix] of rules){
        for(const m of text.matchAll(rx)){
          let replacement=fix(m);
          if(/^[A-Z]/.test(m[0]))replacement=replacement[0].toUpperCase()+replacement.slice(1);
          record('Grammar',name,m.index,m[0],why(m),replacement);
        }
      }
      for(const m of text.matchAll(/\b[A-Za-z]+(?:[’'][A-Za-z]+)*\b/g)){
        const w=norm(m[0]);
        if(w.length<2||w.length>100||words.has(w)||added.has(w)||known.has(w)||['int','ext','vo','sfx','vfx','os','cont','broll'].includes(w))continue;
        record('Spelling','spell',m.index,m[0],'Check the spelling.',null);
      }
    }
    return out;
  }
  function distance(a,b){
    let prev=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){
      const row=[i];
      for(let j=1;j<=b.length;j++)row[j]=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+Number(a[i-1]!==b[j-1]));
      prev=row;
    }
    return prev[b.length];
  }
  function suggest(value){
    const key=norm(value);
    if(!lengths.size)for(const w of words){
      const k=w.slice(0,1)+w.length;if(!lengths.has(k))lengths.set(k,[]);lengths.get(k).push(w);
    }
    const candidates=[key.length,key.length-1,key.length+1].flatMap(n=>lengths.get(key[0]+n)||[]);
    return candidates.map(w=>[w,distance(key,w)]).filter(([,d])=>d<3).sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0])).slice(0,3).map(([w])=>w);
  }
  globalThis.SceneProof={ready,check,suggest};
})();
