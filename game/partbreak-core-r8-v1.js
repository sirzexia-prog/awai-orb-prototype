(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory();else root.AwaiPartbreakCoreR8=factory();})(globalThis,function(){'use strict';
const VERSION=1,CONDITIONS=['intact','damaged','broken'],KINDS=['weapon','shield','armor','body'],PHASES=['telegraph','strike','await-contact','return','done'];
const clone=x=>JSON.parse(JSON.stringify(x)),finite=x=>Number.isFinite(x)&&x>=0,id=x=>typeof x==='string'&&x.length>0&&x.length<=120;
function fail(message){throw new Error('partbreak: '+message)}
function actor(s,actorId){const a=s.actors.find(a=>a.id===actorId);if(!a)fail('unknown actor');return a}
function part(a,partId){const p=a.parts.find(p=>p.id===partId);if(!p)fail('unknown part');return p}
function canDefend(p){return ['weapon','shield'].includes(p.kind)&&p.condition!=='broken'}
function defenders(a){return a.parts.filter(canDefend).map(p=>p.id)}
function emit(s,kind,data){const e={id:++s.sequence,kind,at:s.clock,...data};s.events.push(e);s.events=s.events.slice(-256);return e}
function create(config){
 if(!config||!id(config.id)||!Array.isArray(config.actors)||config.actors.length!==2)fail('one duel requires two named actors');
 if(!['expose','lose'].includes(config.rules?.guardExhaustion))fail('guard-exhaustion rule must be supplied by the approved duel specification');
 const actors=config.actors.map(a=>{if(!id(a.id)||!Array.isArray(a.parts)||!a.parts.length)fail('actor requires named parts');const parts=a.parts.map(p=>{if(!id(p.id)||!KINDS.includes(p.kind))fail('part id/kind');const condition=p.condition||'intact';if(!CONDITIONS.includes(condition))fail('part condition');return {id:p.id,kind:p.kind,condition,layers:Array.isArray(p.layers)?p.layers.filter(id):[]}});if(new Set(parts.map(p=>p.id)).size!==parts.length)fail('duplicate part id');return {id:a.id,parts,core:{status:'protected'},guard:null}});
 if(actors[0].id===actors[1].id)fail('duplicate actor id');
 const s={version:VERSION,id:config.id,clock:0,paused:true,actors,rules:{guardExhaustion:config.rules.guardExhaustion},attack:null,seenAttacks:[],resolvedAttacks:[],sequence:0,events:[],outcome:null};
 for(const a of actors)if(!defenders(a).length)a.core.status='exposed';return s;
}
function pause(s,value=true){s.paused=!!value;return s.paused}
function cue(s){const a=s.attack;if(!a||a.phase==='done'||s.outcome)return null;return {attackId:a.id,attacker:a.attacker,target:a.target,aim:clone(a.aim),phase:a.phase,coreTarget:a.aim.kind==='core',windupSeconds:a.timing.windup,elapsed:a.elapsed,guardOptions:defenders(actor(s,a.target))}}
function startAttack(s,input){
 if(s.outcome)return {accepted:false,reason:'duel-ended'};
 if(s.attack&&s.attack.phase!=='done')return {accepted:false,reason:'action-pending'};
 if(!input||!id(input.id)||s.seenAttacks.includes(input.id))return {accepted:false,reason:'duplicate-attack'};
 const a=actor(s,input.attacker),target=actor(s,input.target);if(a.id===target.id)fail('self attack');
 if(!['part','core'].includes(input.aim?.kind))fail('visible part or core aim required');
 if(input.aim.kind==='part')part(target,input.aim.partId);
 const timing=input.timing;if(!timing||!finite(timing.windup)||timing.windup<=0||!finite(timing.strike)||timing.strike<=0||!finite(timing.return)||timing.return<=0)fail('approved action timings required; no production defaults');
 s.attack={id:input.id,attacker:a.id,target:target.id,aim:clone(input.aim),timing:clone(timing),elapsed:0,phase:'telegraph',resolved:false,contact:null,returnElapsed:0};s.seenAttacks.push(input.id);target.guard=null;
 emit(s,'attack-telegraph',{attackId:input.id,attacker:a.id,target:target.id,aim:clone(input.aim),coreTarget:input.aim.kind==='core'});return {accepted:true,cue:cue(s)};
}
function guard(s,input){
 const attack=s.attack;if(s.outcome||!attack||attack.resolved||!['telegraph','strike','await-contact'].includes(attack.phase))return {accepted:false,reason:'no-live-threat'};
 if(input?.attackId!==attack.id||input?.actorId!==attack.target)return {accepted:false,reason:'wrong-threat'};
 const target=actor(s,input.actorId),p=part(target,input.partId);if(!canDefend(p))return {accepted:false,reason:'part-cannot-defend'};
 target.guard={attackId:attack.id,partId:p.id};emit(s,'guard-committed',{actorId:target.id,partId:p.id,attackId:attack.id});return {accepted:true};
}
function changePart(s,a,p,condition,attackId,point){
 if(!CONDITIONS.includes(condition))fail('part outcome required');
 if(CONDITIONS.indexOf(condition)<CONDITIONS.indexOf(p.condition))fail('combat cannot heal or restore a broken part');
 if(condition===p.condition)return false;
 p.condition=condition;emit(s,condition==='broken'?'part-broken':'part-damaged',{actorId:a.id,partId:p.id,attackId,point:point||null,layers:[...p.layers]});
 if(condition==='broken'&&a.guard?.partId===p.id)a.guard=null;
 if(!defenders(a).length&&a.core.status!=='extracted'){a.core.status='exposed';emit(s,'core-exposed',{actorId:a.id,attackId});if(s.rules.guardExhaustion==='lose')end(s,a.id,'defense-exhausted',attackId,point);}
 return true;
}
function end(s,loserId,cause,attackId,point){
 if(s.outcome)return false;const loser=actor(s,loserId),winner=s.actors.find(a=>a.id!==loserId);if(cause==='core-extracted')loser.core.status='extracted';
 s.outcome={matchId:s.id,winner:winner.id,loser:loserId,cause,attackId,at:s.clock};emit(s,cause==='core-extracted'?'core-extracted':'defense-exhausted',{actorId:loserId,attackId,point:point||null});emit(s,'duel-ended',{...s.outcome});s.paused=true;return true;
}
function resolveContact(s,observation){
 const a=s.attack;if(s.outcome)return {accepted:false,reason:'duel-ended'};
 if(!a||observation?.attackId!==a.id||a.resolved||s.resolvedAttacks.includes(a.id))return {accepted:false,reason:'stale-or-duplicate-contact'};
 if(!['strike','await-contact'].includes(a.phase))return {accepted:false,reason:'before-strike'};
 if(!['part','core','guard','miss'].includes(observation.kind))fail('actual contact classification required');
 if(observation.kind!=='miss'&&(!finite(observation.overlapPixels)||observation.overlapPixels<=0))return {accepted:false,reason:'no-actual-overlap'};
 const target=actor(s,a.target);let p;
 if(observation.kind==='guard'){
  if(target.guard?.attackId!==a.id||target.guard?.partId!==observation.partId)return {accepted:false,reason:'no-matching-guard'};
  p=part(target,observation.partId);if(!canDefend(p))return {accepted:false,reason:'broken-defender'};
  if(!CONDITIONS.includes(observation.conditionAfter))fail('approved guard damage outcome required');
 }else if(observation.kind==='part'){
  if(a.aim.kind!=='part'||a.aim.partId!==observation.partId)return {accepted:false,reason:'wrong-part'};
  p=part(target,observation.partId);if(!CONDITIONS.includes(observation.conditionAfter))fail('approved part damage outcome required');
 }else if(observation.kind==='core'&&a.aim.kind!=='core')return {accepted:false,reason:'core-was-not-telegraphed'};
 a.resolved=true;a.phase='return';a.returnElapsed=0;a.contact={kind:observation.kind,partId:observation.partId||null,overlapPixels:observation.overlapPixels||0,point:observation.point||null,at:s.clock};s.resolvedAttacks.push(a.id);
 if(observation.kind==='core'){emit(s,'core-contact',{attackId:a.id,actorId:target.id,point:a.contact.point});end(s,target.id,'core-extracted',a.id,a.contact.point);}
 else if(observation.kind==='guard'){emit(s,'core-attack-blocked',{attackId:a.id,actorId:target.id,partId:p.id,point:a.contact.point});changePart(s,target,p,observation.conditionAfter,a.id,a.contact.point);}
 else if(observation.kind==='part'){emit(s,'part-contact',{attackId:a.id,actorId:target.id,partId:p.id,point:a.contact.point});changePart(s,target,p,observation.conditionAfter,a.id,a.contact.point);}
 else emit(s,'attack-missed',{attackId:a.id});target.guard=null;return {accepted:true,contact:clone(a.contact),outcome:s.outcome?clone(s.outcome):null};
}
function advance(s,dt){
 if(!finite(dt))fail('seconds required');if(s.paused||s.outcome||dt===0)return cue(s);s.clock+=dt;const a=s.attack;if(!a)return null;
 if(a.phase==='return'){a.returnElapsed+=dt;if(a.returnElapsed>=a.timing.return){a.phase='done';emit(s,'attack-returned',{attackId:a.id});}return cue(s);}
 if(a.phase==='done')return null;a.elapsed+=dt;const phase=a.elapsed<a.timing.windup?'telegraph':a.elapsed<a.timing.windup+a.timing.strike?'strike':'await-contact';if(phase!==a.phase){a.phase=phase;emit(s,'attack-phase',{attackId:a.id,phase});}return cue(s);
}
function snapshot(s){return clone(s)}
function hydrate(raw){try{
  if(!raw||raw.version!==VERSION||!finite(raw.clock)||!Number.isInteger(raw.sequence)||raw.sequence<0)return null;
  const s=create({id:raw.id,actors:raw.actors,rules:raw.rules});s.clock=raw.clock;s.paused=true;s.sequence=raw.sequence;s.events=Array.isArray(raw.events)?clone(raw.events).slice(-256):[];
  if(!Array.isArray(raw.seenAttacks)||!raw.seenAttacks.every(id)||!Array.isArray(raw.resolvedAttacks)||!raw.resolvedAttacks.every(id))return null;s.seenAttacks=[...raw.seenAttacks];s.resolvedAttacks=[...raw.resolvedAttacks];
  for(const a of s.actors){const source=raw.actors.find(v=>v.id===a.id);if(!['protected','exposed','extracted'].includes(source.core?.status))return null;a.core=clone(source.core);a.guard=source.guard?clone(source.guard):null;if(a.guard&&!canDefend(part(a,a.guard.partId)))return null;}
  if(raw.attack){const a=raw.attack;if(!id(a.id)||!PHASES.includes(a.phase)||!finite(a.elapsed)||!finite(a.returnElapsed)||!s.seenAttacks.includes(a.id))return null;actor(s,a.attacker);actor(s,a.target);if(a.attacker===a.target||!['part','core'].includes(a.aim?.kind))return null;if(a.aim.kind==='part')part(actor(s,a.target),a.aim.partId);for(const k of ['windup','strike','return'])if(!finite(a.timing?.[k])||a.timing[k]<=0)return null;if(a.resolved!==s.resolvedAttacks.includes(a.id))return null;s.attack=clone(a);for(const target of s.actors)if(target.guard&&(target.guard.attackId!==a.id||a.target!==target.id))return null;}
  if(raw.outcome){const o=raw.outcome;actor(s,o.winner);actor(s,o.loser);if(o.matchId!==s.id||o.winner===o.loser||!['core-extracted','defense-exhausted'].includes(o.cause)||!s.resolvedAttacks.includes(o.attackId))return null;if(o.cause==='core-extracted'&&actor(s,o.loser).core.status!=='extracted')return null;s.outcome=clone(o);}
  return s;
 }catch{return null;}}
return Object.freeze({VERSION,create,pause,cue,startAttack,guard,resolveContact,advance,snapshot,hydrate,defenders,canDefend});
});
