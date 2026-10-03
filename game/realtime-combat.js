(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AwaiRealtime=factory();})(globalThis,function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a)),copy=v=>JSON.parse(JSON.stringify(v));
  const home={x:.12,y:.74},targets={melee:{x:.40,y:.68},magic:{x:.20,y:.72}};
  function create(stats={power:2,guard:2,focus:2},id='water-'+Date.now(),policy){
    const s={power:clamp(stats.power,-1,11),guard:clamp(stats.guard,0,10),focus:clamp(stats.focus,0,12)},hp=62+s.guard*3;
    policy=Object.hasOwn(targets,policy)?policy:s.focus>s.power+2?'magic':'melee';
    return {version:2,id,policy,decision:'近づく',stats:s,time:0,hp,maxHp:hp,bossHp:240,bossMaxHp:240,energy:60,player:{...home},destination:{...targets[policy]},attackCd:.2,dodgeCd:0,hold:0,shield:0,opening:0,phase:{kind:'wait',left:2.6},cycle:0,paused:false,pauseReason:'',outcome:null,effects:[],history:[],sequence:0,metrics:{attacks:0,casts:0,bursts:0,blocks:0,dodges:0,interrupts:0,taken:0,orders:0}};
  }
  function event(s,kind,data={}){s.effects.push({id:++s.sequence,kind,start:s.time,duration:['burst','cleave'].includes(kind)?1.1:kind==='impact'?.9:.65,...data});s.effects=s.effects.slice(-12);}
  function finish(s){if(s.bossHp<=0){s.bossHp=0;s.outcome='win';}else if(s.hp<=0||s.time>=90){s.hp=Math.max(0,s.hp);s.outcome='loss';}if(s.outcome)s.paused=true;}
  const moves={bite:{duration:2.4,rx:.12,ry:.10,damage:22},tail:{duration:3,rx:.24,ry:.12,damage:18},charge:{duration:2.8,rx:.18,ry:.14,damage:24}};
  function warn(s){const kind=['bite','tail','charge'][s.cycle%3],m=moves[kind];s.phase={kind,left:m.duration,full:m.duration,zone:{x:s.player.x,y:s.player.y,rx:m.rx,ry:m.ry}};event(s,'warning',{attack:kind});}
  function inside(s){const z=s.phase.zone;if(!z)return false;return ((s.player.x-z.x)/z.rx)**2+((s.player.y-z.y)/z.ry)**2<=1;}
  function impact(s){const blocked=s.shield>0,hit=inside(s);let damage=0;if(hit){damage=Math.max(10,moves[s.phase.kind].damage-s.stats.guard*.8);if(blocked){damage=Math.ceil(damage*.25);s.opening=3;s.energy=Math.min(100,s.energy+12);s.metrics.blocks++;}s.hp-=damage;s.metrics.taken+=damage;}event(s,'impact',{x:s.phase.zone.x,y:s.phase.zone.y,attack:s.phase.kind,damage,blocked,miss:!hit});s.cycle++;s.phase={kind:'recover',left:2.8};}
  function shieldCost(s){return Math.max(20,35-s.stats.guard*1.5);}
  function allowed(s,action){return !s.paused&&!s.outcome&&(action==='burst'?s.energy>=60:action==='shield'?s.energy>=shieldCost(s)&&s.shield<=0:action==='dodge'?s.dodgeCd<=0:false);}
  function setPolicy(s,policy){if(!Object.hasOwn(targets,policy)||s.policy===policy||s.outcome)return false;s.policy=policy;s.metrics.orders++;if(s.hold<=0)s.destination={...targets[policy]};return true;}
  function act(s,action){if(!allowed(s,action))return false;
    if(action==='burst'){const spent=s.energy,damage=Math.round(s.policy==='magic'?38+s.stats.focus*5+spent*.30+(s.opening>0?12:0):44+s.stats.power*4.8+s.stats.guard*1.5+spent*.22+(s.opening>0?18:0)),interrupted=!!s.phase.zone&&spent>=90;s.energy=0;s.bossHp-=damage;s.metrics.bursts++;if(interrupted){s.opening=3.5;s.phase={kind:'recover',left:3.5};s.cycle++;s.metrics.interrupts++;}event(s,s.policy==='magic'?'burst':'cleave',{damage,hits:3,spent,interrupted,from:copy(s.player)});}
    if(action==='shield'){s.energy-=shieldCost(s);s.shield=3.4;event(s,'shield');}
    if(action==='dodge'){s.dodgeCd=6;s.hold=3.3;s.destination={x:clamp(s.player.x-.23,.10,.76),y:clamp(s.player.y+.17,.34,.84)};s.metrics.dodges++;event(s,'dodge',{from:copy(s.player)});}
    s.history.push({time:Math.round(s.time*10)/10,action});s.history=s.history.slice(-24);finish(s);return true;
  }
  function choose(s){
    const zone=s.phase.zone,reaction=1.25+Math.min(.45,s.stats.focus*.045);
    if(zone&&inside(s)&&s.phase.left<reaction){
      if(s.hold>0&&s.phase.left>.25){s.decision='予兆の外へ離れる';return;}
      if(s.policy==='magic'&&s.energy>=90&&allowed(s,'burst')){act(s,'burst');s.decision='魔法で大技を崩す';return;}
      if(s.shield>s.phase.left){s.decision='受け止めて返す';return;}
      if(s.policy==='melee'&&s.stats.guard>=2&&allowed(s,'shield')){act(s,'shield');s.decision='受け止めて返す';return;}
      if(allowed(s,'dodge')){act(s,'dodge');s.decision='予兆の外へ離れる';return;}
      if(allowed(s,'shield')){act(s,'shield');s.decision='守りの光';return;}
    }
    if(s.opening>0&&s.energy>=60&&allowed(s,'burst')||!zone&&s.energy>=95&&allowed(s,'burst')){act(s,'burst');s.decision=s.policy==='magic'?'術を放つ':'踏み込んで斬る';return;}
    s.decision=s.hold>0?'安全な距離へ':s.shield>0?'守りの光':s.policy==='magic'?'距離を取り、術で攻める':'詰めて、打ち返す';
  }
  function advance(s,dt){if(s.paused||s.outcome)return;dt=clamp(dt,0,.08);s.time+=dt;s.energy=Math.min(100,s.energy+dt*(s.policy==='magic'?5:3.8));for(const k of ['attackCd','dodgeCd','hold','shield','opening'])s[k]=Math.max(0,s[k]-dt);choose(s);if(s.outcome)return;
    const target=targets[s.policy];if(s.hold<=0)s.destination={...target};
    const dx=s.destination.x-s.player.x,dy=s.destination.y-s.player.y,d=Math.hypot(dx,dy),speed=s.hold>0?.34:.16,k=Math.min(1,speed*dt/(d||1));s.player.x+=dx*k;s.player.y+=dy*k;
    if((s.policy==='magic'&&s.player.x<.55||s.hold<=0&&Math.hypot(s.player.x-target.x,s.player.y-target.y)<.025)&&s.attackCd<=0){const magic=s.policy==='magic',damage=Math.round((magic?10+s.stats.focus*1.8:18+s.stats.power*2.6)+(s.opening>0?6:0));s.bossHp-=damage;s.energy=Math.min(100,s.energy+(magic?4:3));s.attackCd=magic?1.25:1.05;s.metrics.attacks++;if(magic)s.metrics.casts++;event(s,magic?'cast':'strike',{damage,hits:magic?1:2,from:copy(s.player)});}
    s.phase.left-=dt;if(s.phase.left<=0){if(s.phase.zone)impact(s);else if(s.phase.kind==='recover')s.phase={kind:'wait',left:1.5};else warn(s);}
    s.effects=s.effects.filter(e=>s.time-e.start<e.duration);finish(s);
  }
  function hydrate(raw){if(!raw||![1,2].includes(raw.version)||typeof raw.id!=='string'||raw.id.length>80||!raw.stats||!['wait','slam','sweep','bite','tail','charge','recover'].includes(raw.phase?.kind))return null;
    const s=create(raw.stats,raw.id,raw.policy);s.bossMaxHp=raw.bossMaxHp===240?240:300;s.time=clamp(raw.time,0,90);s.hp=clamp(raw.hp,0,s.maxHp);s.bossHp=clamp(raw.bossHp,0,s.bossMaxHp);s.energy=clamp(raw.energy,0,100);for(const k of ['attackCd','dodgeCd','hold','shield','opening'])s[k]=clamp(raw[k],0,10);for(const k of ['player','destination'])s[k]={x:clamp(raw[k]?.x,.1,.84),y:clamp(raw[k]?.y,.25,.84)};s.cycle=clamp(raw.cycle,0,100);s.phase={kind:raw.phase.kind,left:clamp(raw.phase.left,.05,4)};
    s.phase.kind=s.phase.kind==='slam'?'bite':s.phase.kind==='sweep'?'tail':s.phase.kind;
    if(moves[s.phase.kind]){const z=raw.phase.zone,m=moves[s.phase.kind];if(!z||!Number.isFinite(z.x)||!Number.isFinite(z.y))return null;s.phase.full=m.duration;s.phase.left=Math.min(s.phase.left,m.duration);s.phase.zone={x:clamp(z.x,.1,.84),y:clamp(z.y,.25,.84),rx:m.rx,ry:m.ry};}
    for(const k of Object.keys(s.metrics))s.metrics[k]=clamp(raw.metrics?.[k],0,10000);s.history=Array.isArray(raw.history)?raw.history.filter(x=>x&&['burst','shield','dodge'].includes(x.action)).slice(-24).map(x=>({time:clamp(x.time,0,90),action:x.action})):[];s.sequence=clamp(raw.sequence,0,10000);s.paused=true;s.pauseReason='続きから';finish(s);return s;
  }
  return {create,hydrate,advance,act,allowed,inside,setPolicy,shieldCost};
});
