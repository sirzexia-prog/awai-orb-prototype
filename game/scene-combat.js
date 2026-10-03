(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AwaiSceneCombat=factory();})(globalThis,function(){
  'use strict';
  const MOVES={jab:{name:'踏み込み',damage:8},charge:{name:'力を集める',damage:0},slam:{name:'叩きつけ',damage:18},shell:{name:'殻を固める',damage:0},recover:{name:'体勢が崩れた',damage:0}};
  const ACTIONS={strike:{name:'打撃',cost:1},magic:{name:'魔法',cost:2},guard:{name:'守る',cost:0},focus:{name:'蓄える',cost:0}};
  const clamp=(x,min,max)=>Math.max(min,Math.min(max,Number.isFinite(x)?Math.floor(x):min));
  function create(stats={power:2,guard:2,focus:2},id='scene-'+Date.now()){
    const s={power:clamp(stats.power,-1,11),guard:clamp(stats.guard,0,10),focus:clamp(stats.focus,0,12)},hp=44+s.guard*2;
    return {version:1,id,turn:1,stats:s,hp,maxHp:hp,enemyHp:78,enemyMaxHp:78,breath:3,cracks:0,opening:0,returnPower:0,intent:'jab',outcome:null,logs:[],history:[]};
  }
  function hydrate(raw){if(!raw||raw.version!==1||typeof raw.id!=='string'||!raw.id||raw.id.length>80||!MOVES[raw.intent]||!raw.stats)return null;const s=create(raw.stats,raw.id);s.turn=clamp(raw.turn,1,30);s.hp=clamp(raw.hp,0,s.maxHp);s.enemyHp=clamp(raw.enemyHp,0,78);s.breath=clamp(raw.breath,0,4);s.cracks=clamp(raw.cracks,0,2);s.opening=clamp(raw.opening,0,2);s.returnPower=clamp(raw.returnPower,0,4);s.intent=raw.intent;s.outcome=s.enemyHp===0?'win':s.hp===0||s.turn>14?'loss':null;s.logs=Array.isArray(raw.logs)?raw.logs.slice(-8).filter(x=>typeof x==='string').map(x=>x.slice(0,120)):[];s.history=Array.isArray(raw.history)?raw.history.slice(-24).filter(x=>x&&typeof x==='object').map(x=>({turn:clamp(x.turn,1,30),action:Object.hasOwn(ACTIONS,x.action)?x.action:'guard',damage:clamp(x.damage,0,100),taken:clamp(x.taken,0,100)})):[];return s;}
  function allowed(s,a){return !!ACTIONS[a]&&!s.outcome&&(a!=='strike'||s.breath>=1)&&(a!=='magic'||s.breath>=2)&&(a!=='focus'||s.breath<4);}
  function resolve(s,action,turnToken){
    if(!allowed(s,action)||turnToken!==s.id+':'+s.turn)return {ok:false};
    const before=JSON.parse(JSON.stringify(s)),intent=s.intent,events=[],spent=action==='magic'?s.breath:action==='strike'?1:0;
    let damage=0,taken=0,breakGain=0,broken=false;
    if(action==='strike'){s.breath--;damage=9+s.stats.power+s.returnPower+(s.opening?4:0);if(intent==='shell')damage=Math.max(3,damage-3);s.returnPower=0;breakGain=1;events.push({kind:'strike',actor:'player',damage});}
    if(action==='magic'){s.breath=0;damage=8+s.stats.focus+spent*6+(s.opening?4:0);if(intent==='shell'&&spent<3)damage-=3;breakGain=spent>=3?2:1;events.push({kind:'magic',actor:'player',damage,spent});}
    if(action==='guard'){s.breath=Math.min(4,s.breath+2);s.returnPower=4;events.push({kind:'guard',actor:'player'});}
    if(action==='focus'){s.breath=Math.min(4,s.breath+3);events.push({kind:'focus',actor:'player',gained:s.breath-before.breath});}
    s.enemyHp=Math.max(0,s.enemyHp-damage);s.cracks+=breakGain;
    if(s.cracks>=3){s.cracks=0;s.opening=2;broken=true;events.push({kind:'break',actor:'enemy'});}
    const incoming=MOVES[intent].damage+(s.turn>=10&&MOVES[intent].damage?4:0);
    if(!broken&&s.enemyHp>0&&incoming){taken=action==='guard'?Math.max(1,Math.ceil(incoming*Math.max(.1,.28-s.stats.guard*.02))):incoming;s.hp=Math.max(0,s.hp-taken);events.push({kind:intent,actor:'enemy',damage:taken,blocked:action==='guard'});if(action==='guard'&&intent==='slam'){s.cracks++;if(s.cracks>=3){s.cracks=0;s.opening=2;broken=true;events.push({kind:'break',actor:'enemy'});}}}
    if(s.enemyHp===0)s.outcome='win';else if(s.hp===0||s.turn>=14)s.outcome='loss';
    if(!s.outcome){if(broken)s.intent='recover';else if(s.opening>0){s.opening--;s.intent=s.opening?'recover':'jab';}else if(intent==='charge')s.intent='slam';else if(intent==='slam')s.intent='shell';else if(intent==='shell'||intent==='recover')s.intent='jab';else if(action==='focus'||action==='guard')s.intent='charge';else if(s.cracks>=2)s.intent='shell';else s.intent='jab';}
    const line=ACTIONS[action].name+' · '+(damage?'与え '+damage+' / ':'')+'受け '+taken+(broken?' · 殻が崩れた':'');s.logs.push(line);s.logs=s.logs.slice(-8);s.history.push({turn:s.turn,action,damage,taken});s.history=s.history.slice(-24);s.turn++;
    return {ok:true,before,after:JSON.parse(JSON.stringify(s)),events,damage,taken,broken,spent,line};
  }
  return {create,hydrate,resolve,allowed,ACTIONS,MOVES};
});
