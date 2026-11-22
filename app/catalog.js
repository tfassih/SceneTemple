(() => {
  'use strict';
  const families = [
    ['film','Film','clapper'], ['tv','Television','tv'], ['stage','Stage play','curtain'],
    ['game','Video game','game'], ['social','YouTube & social','play'], ['ad','Advertising','speaker']
  ];
  // Distances are points from the edges of the template's text area.
  const styles = {
    act: ['Act','ACT ONE',{align:'center',caps:true,bold:true,before:24,level:1,next:'scene'}],
    scene: ['Scene heading','INT. LOCATION – DAY',{caps:true,before:12,level:2,next:'action'}],
    action: ['Action','Describe what we see or hear.',{before:12,next:'action'}],
    name: ['Character','CHARACTER',{left:158,before:12,caps:true,next:'dialogue'}],
    dialogue: ['Dialogue','Write dialogue.',{left:72,right:106,before:0,next:'action'}],
    parenthetical: ['Parenthetical','(quietly)',{left:115,right:136,before:0,next:'dialogue'}],
    transition: ['Transition','CUT TO:',{align:'right',caps:true,before:12,next:'scene'}],
    shot: ['Shot','CLOSE ON',{caps:true,before:12,level:3,next:'action'}],
    location: ['Location','INT. NEW LOCATION – NIGHT',{caps:true,before:12,level:2,next:'action'}],
    setting: ['Setting','Describe the setting.',{before:12,next:'action'}],
    sound: ['Sound cue','SOUND CUE',{caps:true,before:12,next:'action'}],
    teaser: ['Teaser','TEASER',{align:'center',caps:true,bold:true,before:12,level:1,next:'scene'}],
    tag: ['Tag','TAG',{align:'center',caps:true,bold:true,before:12,level:1,next:'scene'}],
    actout: ['Act ending','END OF ACT ONE',{align:'center',caps:true,bold:true,before:18,next:'act'}],
    cast: ['Cast','Characters',{bold:true,before:12,level:1,next:'bio'}],
    bio: ['Cast entry','Character and description.',{before:6,next:'bio'}],
    stage: ['Stage direction','Describe movement onstage.',{left:180,italic:true,before:12,next:'name'}],
    light: ['Lighting cue','LIGHTS UP.',{caps:true,before:12,next:'stage'}],
    curtain: ['Curtain','BLACKOUT.',{caps:true,align:'right',before:12,next:'act'}],
    section: ['Section','Section heading',{bold:true,size:14,before:20,level:1,next:'body'}],
    subhead: ['Subheading','Subheading',{bold:true,before:12,level:2,next:'body'}],
    body: ['Description','Write a description.',{before:8,next:'body'}],
    node: ['Dialogue node','Node name',{bold:true,before:16,level:2,next:'name'}],
    choice: ['Player choice','Player response',{left:20,before:6,next:'outcome'}],
    condition: ['Condition','When this is available',{left:20,italic:true,before:6,next:'choice'}],
    outcome: ['Outcome','What changes?',{left:20,before:6,next:'node'}],
    variable: ['State variable','Variable and possible values',{before:8,next:'body'}],
    objective: ['Objective','Player objective',{bold:true,before:12,level:2,next:'body'}],
    trigger: ['Trigger','Trigger or prerequisite',{before:8,next:'outcome'}],
    lineid: ['Voice line ID','VO_001',{bold:true,before:12,level:2,next:'name'}],
    delivery: ['Delivery note','Performance direction',{italic:true,before:6,next:'dialogue'}],
    segment: ['Segment','Segment title',{bold:true,before:12,level:1,next:'av'}],
    hook: ['Hook','Opening hook',{bold:true,before:12,level:2,next:'av'}],
    beat: ['Beat / timecode','00:00–00:05',{bold:true,before:10,level:2,next:'av'}],
    av: ['A/V row','Visual or on-screen action',{pair:true,before:8,next:'av'}],
    graphic: ['On-screen text','Text or graphics',{before:8,next:'av'}],
    cta: ['Call to action','Call to action',{bold:true,before:12,level:2,next:'av'}],
    supers: ['Supers / legal copy','Required on-screen copy',{before:8,next:'av'}],
    page: ['Page break','Page break',{before:0,next:'action'}]
  };
  const familyInfo = Object.fromEntries(families.map(([id,name,icon])=>[id,{id,name,icon}]));
  const blocks = Object.fromEntries(Object.entries(styles).map(([id,[label,hint,props]])=>[id,{
    id,label,hint,size:12,line:12,left:0,right:0,before:0,align:'left',next:'body',...props
  }]));
  const screen = 'scene action name dialogue parenthetical transition act setting location shot sound page';
  const television = 'teaser act scene action name dialogue parenthetical transition shot location setting sound actout tag page';
  const av = 'segment beat av hook graphic sound cta supers page';
  const design = 'section subhead body objective variable trigger outcome location setting bio page';
  const example = [
    ['scene','INT. PROJECTION BOOTH – NIGHT'],
    ['action','A projector spins in an empty booth. On the wall, a handwritten note curls in the heat.'],
    ['name','MARA'],['parenthetical','(to the empty room)'],['dialogue','One more reel.'],
    ['action','She threads the film. Light falls across the seats.']
  ];
  const exchange=[['node','At the booth'],['name','MARA'],['dialogue','Are you here for the last showing?'],
    ['choice','Ask about the missing reel.','', 'The missing reel'],['condition','The player has found the ticket stub.'],
    ['node','The missing reel'],['name','MARA'],['dialogue','Check the canister by the door.']];
  const defs=[];
  function add(id,family,name,description,profile,types,seed,sample,overrides={}) {
    defs.push({id,family,name,description,profile,types:types.split(' '),seed,sample,overrides});
  }
  add('feature','film','Feature screenplay','A master-scene script with action, character cues, and dialogue.','screen',screen,[['scene','']],example);
  add('shooting','film','Shooting script','Numbered scenes with camera shots and production cues.','shooting',screen,[['scene','']],[
    example[0],['shot','CLOSE ON THE PROJECTOR'],example[1],example[2],example[4]]);
  add('tv-drama','tv','Single-camera teleplay','Teaser, acts, and tag in a single-camera format.','tv',television,
    [['teaser','TEASER'],['scene','']], [['teaser','TEASER'],...example.slice(0,5),['actout','END OF TEASER']]);
  add('tv-comedy','tv','Multi-camera sitcom','Underlined scenes, capitalized action, and double-spaced dialogue.','multi',television,
    [['act','ACT ONE'],['scene','']], [['act','ACT ONE'],...example],{scene:{underline:true},action:{caps:true},dialogue:{line:24}});
  add('stage-modern','stage','Modern stage play','Cast, acts, scenes, spoken lines, and stage directions.','stage',
    'act scene cast bio setting location stage name dialogue parenthetical sound light curtain page',
    [['act','ACT I'],['scene','Scene 1'],['setting','']], [
    ['act','ACT I'],['scene','Scene 1'],['setting','A projection booth above a silent theatre.'],
    ['stage','Mara rests a hand on the projector.'],['name','MARA'],['dialogue','I used to know every face in this room.'],['light','LIGHTS FADE.']],
    {scene:{caps:false,align:'center',bold:true,next:'setting'},name:{left:0,align:'center'},dialogue:{left:0,right:0,next:'stage'},setting:{left:144,next:'stage'},parenthetical:{left:108,right:72},location:{next:'stage'}});
  add('social-long','social','YouTube production script','Plan host narration, B-roll, graphics, and calls to action side by side.','av',av,
    [['segment','Opening'],['av','','']], [['segment','Opening'],['av','Wide shot of the empty theatre.','HOST: Listen to the room before the music starts.'],['beat','00:08–00:24'],['av','Cut to the projector wheel.','The click you hear is one frame catching the next.'],['cta','End card']]);
  add('social-short','social','Short-form video','A timed hook, visual beats, and a closing call to action.','av',av,
    [['hook','Hook'],['av','',''],['beat','00:03–00:12'],['av','',''],['cta','Call to action'],['av','','']],
    [['hook','First three seconds'],['av','A film canister rolls into frame.','What hides inside the last reel?'],['beat','00:03–00:12'],['av','Hands open the canister.','Listen closely.'],['cta','Closing frame']]);
  add('ad-av','ad','Commercial A/V script','Timed picture and sound columns for a broadcast or digital spot.','av',av,
    [['segment','30-second spot'],['beat','00:00–00:05'],['av','','']],
    [['segment','30-second spot'],['beat','00:00–00:05'],['av','Close on a theatre ticket.','SFX: A single bell.'],['beat','00:05–00:20'],['av','The doors open to a full house.','VO: There is a seat for every story.'],['cta','End card'],['av','Logo and booking details.','VO: Book your seat.']]);
  add('game-cinematic','game','Cinematic screenplay','Write cutscenes with camera, performance, and gameplay handoffs.','screen',screen+' trigger outcome',
    [['scene','']], [...example.slice(0,5),['trigger','Return control to the player.']]);
  add('game-bible','game','Story bible','Define the premise, world, characters, factions, and continuity.','design',design,
    [['section','Premise'],['body',''],['section','World and setting'],['body',''],['section','Characters and factions'],['body',''],['section','Timeline and continuity'],['body','']],
    [['section','Premise'],['body','A projectionist preserves the last memories of a disappearing city.'],['section','World and setting'],['subhead','The Orpheum'],['body','Every seat holds a different year.'],['section','Characters and factions'],['bio','Mara keeps the midnight reel running.']]);
  add('game-design','game','Narrative design document','Map narrative goals, player agency, state, and implementation.','design',design,
    [['section','Narrative goals'],['body',''],['section','Player agency'],['body',''],['section','Progression and state'],['variable',''],['section','Implementation and failure states'],['body','']],
    [['section','Narrative goals'],['body','Let the player discover why the theatre closed.'],['section','Player agency'],['objective','Choose which reel to restore.'],['section','Progression and state'],['variable','reel_found = false'],['trigger','The player opens the projection booth.']]);
  add('game-branch','game','Branching dialogue','Link player choices to dialogue nodes and record state changes.','branch',
    'section node name dialogue choice condition outcome variable trigger body page',[['node','Start'],['name',''],['dialogue','']],exchange,
    {name:{left:0,bold:true},dialogue:{left:20,right:0,next:'choice'}});
  add('game-quest','game','Quest / mission script','Track objectives, prerequisites, triggers, and alternate outcomes.','design',design+' node choice',
    [['section','Quest overview'],['body',''],['objective','Objective'],['trigger',''],['outcome','']],
    [['section','The lost reel'],['objective','Recover the film canister.'],['trigger','Speak to the projectionist.'],['outcome','The midnight screening becomes available.']]);
  add('game-vo','game','Voiceover and barks','Prepare line IDs, speakers, performance notes, and trigger conditions.','branch',
    'section lineid name delivery dialogue trigger condition body page',
    [['section','Voice session'],['lineid','VO_001'],['name',''],['dialogue','']],
    [['section','Booth encounter'],['lineid','MARA_IDLE_001'],['name','MARA'],['delivery','Quiet, as if speaking to an old friend.'],['dialogue','Still turning.'],['trigger','Player idles near the projector.']],
    {name:{left:0,bold:true},dialogue:{left:20,right:0,next:'lineid'}});
  const templates=Object.fromEntries(defs.map(d=>[d.id,d]));
  globalThis.SceneCatalog={families:familyInfo,blocks,templates};
})();
