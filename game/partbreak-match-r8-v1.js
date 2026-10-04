(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory();else root.AwaiPartbreakMatchR8=factory();})(globalThis,function(){'use strict';
const RULE='partbreak-core-1',EPS=1e-7,PHASES=['telegraph','strike','await-contact','return','done'];
const clone=v=>JSON.parse(JSON.stringify(v)),validId=v=>typeof v==='string'&&v.length>0&&v.length<=160,positive=v=>Number.isFinite(v)&&v>0;
function error(text){throw Error('partbreak match: '+text)}
function actor(s,id){const a=s.actors.find(a=>a.id===id);if(!a)error('unknown actor');return a}
function group(a,id){const g=a.groups.find(g=>g.id===id);if(!g)error('unknown battle group');return g}
function action(s,id){const a=s.actions.find(a=>a.id===id);if(!a)error('unknown action');return a}
function emit(s,type,data={}){const e={id:++s.sequence,type,clock:s.clock,...data};s.events.push(e);s.events=s.events.slice(-256);return e}
function liveDefenders(a){return a.groups.filter(g=>g.condition!=='broken'&&g.functions.defend).sort((a,b)=>a.defenseOrder-b.defenseOrder)}
function liveAttackers(a){return a.groups.filter(g=>g.condition!=='broken'&&g.functions.attack)}
function validateTiming(t){if(!t||!['windup','strike','return'].every(k=>positive(t[k])))error('explicit proposed action timing required')}
function create(config){
 if(!config||!validId(config.id)||config.ruleVersion!==RULE||!Array.isArray(config.actors)||config.actors.length!==2)error('named duel and explicit new ruleVersion required');
 if(!positive(config.endAnimationSeconds))error('explicit end-animation timing required');
 const actors=config.actors.map(input=>{
  if(!validId(input.id)||!Array.isArray(input.groups)||!input.groups.length)error('actor/group definition');
  const groups=input.groups.map((g,index)=>{if(!validId(g.id)||!positive(g.durability)||!Array.isArray(g.structuralLayers)||!g.structuralLayers.length)error('group durability/structure definition');return {id:g.id,maxDurability:g.durability,durability:g.durability,condition:'intact',functions:{attack:g.functions?.attack===true,defend:g.functions?.defend===true},defenseOrder:Number.isFinite(g.defenseOrder)?g.defenseOrder:index,structuralLayers:g.structuralLayers.filter(validId),cosmeticLayers:Array.isArray(g.cosmeticLayers)?g.cosmeticLayers.filter(validId):[],inventoryRefs:Array.isArray(g.inventoryRefs)?g.inventoryRefs.filter(validId):[]}});
  if(new Set(groups.map(g=>g.id)).size!==groups.length)error('duplicate group id');
  const a={id:input.id,coreState:'intact',groups,defensePose:null,policy:input.policy==='core-first'?'core-first':'break-first',turns:0};if(!liveDefenders(a).length||!liveAttackers(a).length)error('new duel requires intact attacking/defending structures');return a;
 });if(actors[0].id===actors[1].id)error('duplicate actor');
 return {ruleVersion:RULE,id:config.id,sourceSnapshotId:validId(config.sourceSnapshotId)?config.sourceSnapshotId:null,preview:config.preview!==false,clock:0,paused:true,actors,actions:[],projectiles:[],contactKeys:[],sequence:0,events:[],finaleReservations:[],outcome:null,endAnimationSeconds:config.endAnimationSeconds,endElapsed:0,resultReady:false,rewardId:validId(config.rewardId)?config.rewardId:null};
}
function pause(s,value=true){s.paused=!!value}
function cues(s){return s.actions.filter(a=>!a.finaleComplete&&!['return','done'].includes(a.phase)).map(a=>({matchId:s.id,attackId:a.id,attacker:a.attacker,target:a.target,aim:clone(a.aim),coreTarget:a.aim.kind==='core',finale:a.finale,phase:a.phase,elapsed:a.elapsed,windup:a.timing.windup,defenseChoices:liveDefenders(actor(s,a.target)).map(g=>g.id)}))}
function startAttack(s,input){
 if(s.outcome)return {accepted:false,reason:'duel-ended'};
 if(!input||!validId(input.id)||s.actions.some(a=>a.id===input.id))return {accepted:false,reason:'duplicate-or-invalid-action'};
 const source=actor(s,input.attacker),target=actor(s,input.target);if(source.id===target.id)error('self attack');
 if(!['part','core'].includes(input.aim?.kind))error('part/core aim must be visible');if(input.aim.kind==='part')group(target,input.aim.groupId);
 const reservation=s.finaleReservations.find(r=>r.target===target.id&&!r.fulfilled);
 if(s.finaleReservations.some(r=>!r.fulfilled)&&(!reservation||input.aim.kind!=='core'||input.finale!==true))return {accepted:false,reason:'short-core-finale-reserved'};
 const sourceGroup=group(source,input.weaponGroupId);if(sourceGroup.condition==='broken'||!sourceGroup.functions.attack)return {accepted:false,reason:'weapon-unavailable'};
 if(s.actions.some(a=>a.attacker===source.id&&a.phase!=='done'))return {accepted:false,reason:'current-weapon-action-must-return'};
 validateTiming(input.timing);if(!positive(input.damageBudget)||!Number.isInteger(input.contactCount)||input.contactCount<1||input.contactCount>32)error('explicit attack budget/contact count required');
 const a={id:input.id,attacker:source.id,target:target.id,aim:clone(input.aim),weaponGroupId:sourceGroup.id,weaponSnapshot:clone(input.weaponSnapshot||{layers:sourceGroup.structuralLayers}),timing:clone(input.timing),damageBudget:input.damageBudget,damageClaimed:0,contactCount:input.contactCount,contactNumbers:[],elapsed:0,phase:'telegraph',returnElapsed:0,finale:!!input.finale,finaleComplete:false};s.actions.push(a);source.turns++;target.defensePose=null;
 if(a.aim.kind==='core'){target.coreState='targeted';emit(s,'CoreTargeted',{attackId:a.id,actorId:target.id,finale:a.finale});}
 emit(s,'AttackTelegraph',{attackId:a.id,attacker:a.attacker,target:a.target,aim:clone(a.aim),weaponSnapshot:clone(a.weaponSnapshot),finale:a.finale});return {accepted:true,action:clone(a)};
}
function placeDefense(s,input){
 if(s.outcome)return {accepted:false,reason:'duel-ended'};const threat=action(s,input.attackId),target=actor(s,input.actorId);if(threat.target!==target.id||threat.aim.kind!=='core'||['return','done'].includes(threat.phase))return {accepted:false,reason:'not-current-core-threat'};
 const g=group(target,input.groupId);if(g.condition==='broken'||!g.functions.defend)return {accepted:false,reason:'defense-unavailable'};target.defensePose={attackId:threat.id,groupId:g.id,startedAt:s.clock,phase:input.phase==='late'?'late':'intercept',transform:input.transform?clone(input.transform):null};emit(s,'DefenseMoved',{actorId:target.id,groupId:g.id,attackId:threat.id,phase:target.defensePose.phase});return {accepted:true};
}
function launchProjectile(s,input){
 if(s.paused||s.outcome)return {accepted:false,reason:s.outcome?'duel-ended':'paused'};const a=action(s,input.attackId),source=actor(s,a.attacker),g=group(source,a.weaponGroupId);
 if(g.condition==='broken'||!g.functions.attack)return {accepted:false,reason:'unfired-weapon-broken'};
 if(!['strike','await-contact'].includes(a.phase)||!validId(input.id)||s.projectiles.some(p=>p.id===input.id)||!Number.isInteger(input.contactNumber)||input.contactNumber<1||input.contactNumber>a.contactCount)return {accepted:false,reason:'invalid-launch'};
 s.projectiles.push({id:input.id,attackId:a.id,contactNumber:input.contactNumber,startedAt:s.clock,trajectory:clone(input.trajectory),resolved:false});emit(s,'ProjectileLaunched',{id:input.id,attackId:a.id,contactNumber:input.contactNumber});return {accepted:true};
}
function reserveFinale(s,target,attackerId,attackId){
 if(liveDefenders(target).length||s.finaleReservations.some(r=>r.target===target.id))return;
 const reservation={target:target.id,attacker:attackerId,triggerAttackId:attackId,at:s.clock,fulfilled:false};s.finaleReservations.push(reservation);target.coreState='targeted';target.defensePose=null;emit(s,'FinaleReserved',clone(reservation));
}
function hitGroup(s,a,target,g,damage,kind,point){
 g.durability=Math.max(0,g.durability-damage);if(g.durability<EPS)g.durability=0;g.condition=g.durability===0?'broken':g.durability<g.maxDurability?'damaged':'intact';
 emit(s,kind,{attackId:a.id,actorId:target.id,groupId:g.id,damage,point,condition:g.condition,durability:g.durability});
 emit(s,g.condition==='broken'?'PartBroken':'PartDamaged',{attackId:a.id,actorId:target.id,groupId:g.id,point,structuralLayers:[...g.structuralLayers],cosmeticLayers:[...g.cosmeticLayers]});
 if(g.condition==='broken'){if(target.defensePose?.groupId===g.id)target.defensePose=null;emit(s,'FunctionsStopped',{actorId:target.id,groupId:g.id,attackId:a.id,attack:g.functions.attack,defend:g.functions.defend});reserveFinale(s,target,a.attacker,a.id);}
}
function validateObservation(s,input,workingKeys){
 if(!input||input.matchId!==s.id||!validId(input.attackId))return {reason:'wrong-match'};const a=action(s,input.attackId);
 if(!['strike','await-contact'].includes(a.phase))return {reason:'before-strike-or-returned'};
 if(!Number.isInteger(input.contactNumber)||input.contactNumber<1||input.contactNumber>a.contactCount)return {reason:'contact-number'};
 const key=s.id+'|'+a.id+'|'+input.contactNumber;if(s.contactKeys.includes(key)||workingKeys.has(key))return {reason:'duplicate-contact'};
 if(!['part','guard','core','miss'].includes(input.kind))error('source contact type required');
 if(input.kind!=='miss'&&(!positive(input.overlapPixels)||!input.point||!Number.isFinite(input.point.x)||!Number.isFinite(input.point.y)))return {reason:'no-source-alpha-contact'};
 const target=actor(s,a.target),source=actor(s,a.attacker),sourceGroup=group(source,a.weaponGroupId);let projectile;
 if(input.projectileId){projectile=s.projectiles.find(p=>p.id===input.projectileId&&p.attackId===a.id&&p.contactNumber===input.contactNumber&&!p.resolved);if(!projectile)return {reason:'projectile-not-launched'};}
 else if(sourceGroup.condition==='broken')return {reason:'weapon-broken-before-unfired-contact'};
 let g;if(['part','guard'].includes(input.kind)){g=group(target,input.groupId);if(g.condition==='broken')return {reason:'group-already-broken'};if(input.kind==='part'&&(a.aim.kind!=='part'||a.aim.groupId!==g.id))return {reason:'wrong-part-target'};if(input.kind==='guard'&&(a.aim.kind!=='core'||!g.functions.defend||!Number.isFinite(input.defenseDistance)||!positive(input.coreDistance)||input.defenseDistance<0||input.defenseDistance>=input.coreDistance))return {reason:'defense-not-before-core'};}
 if(input.kind==='core'){if(a.aim.kind!=='core')return {reason:'core-not-telegraphed'};if(input.firstSurface&&input.firstSurface.kind==='live-defense')return {reason:'visible-defense-intercepts-first'};}
 const damage=input.kind==='core'||input.kind==='miss'?0:input.damageShare;if(['part','guard'].includes(input.kind)&&(!positive(damage)||a.damageClaimed+damage>a.damageBudget+EPS))return {reason:'total-damage-budget'};
 workingKeys.add(key);return {input,a,target,g,projectile,key,damage};
}
function finishCoreBatch(s){
 const extracted=s.actors.filter(a=>a.coreState==='extracted');if(!extracted.length)return;
 s.outcome=extracted.length===2?{kind:'draw',matchId:s.id,winner:null,losers:extracted.map(a=>a.id),at:s.clock,rewardEligible:false}:{kind:'win',matchId:s.id,winner:s.actors.find(a=>a.coreState!=='extracted').id,losers:[extracted[0].id],at:s.clock,rewardEligible:!s.preview};
 s.endElapsed=0;s.resultReady=false;for(const a of s.actions)if(a.phase!=='done'){a.phase='return';a.finaleComplete=true;}emit(s,'DuelEnded',clone(s.outcome));
}
function resolveContacts(s,observations){
 if(s.paused||s.outcome)return {accepted:[],rejected:[{reason:s.outcome?'duel-ended':'paused'}],outcome:s.outcome?clone(s.outcome):null};if(!Array.isArray(observations))error('one render-frame contact batch required');
 const workingKeys=new Set(),valid=[],rejected=[];for(const input of observations){const v=validateObservation(s,input,workingKeys);if(v.reason)rejected.push({attackId:input?.attackId,contactNumber:input?.contactNumber,reason:v.reason});else valid.push(v);}
 const spent=new Map();for(const v of valid){const total=(spent.get(v.a.id)||v.a.damageClaimed)+v.damage;if(total>v.a.damageBudget+EPS)error('same-frame attack budget exceeded');spent.set(v.a.id,total);}
 const accepted=[];for(const v of valid){const {input,a,target,g,projectile,key,damage}=v;s.contactKeys.push(key);a.contactNumbers.push(input.contactNumber);a.damageClaimed+=damage;if(projectile)projectile.resolved=true;
  if(input.kind==='core'){target.coreState='extracted';target.defensePose=null;for(const r of s.finaleReservations)if(r.target===target.id)r.fulfilled=true;emit(s,'CoreExtract',{attackId:a.id,contactNumber:input.contactNumber,actorId:target.id,point:clone(input.point),at:s.clock});}
  else if(input.kind==='part'||input.kind==='guard'){hitGroup(s,a,target,g,damage,input.kind==='guard'?'GuardHit':'PartHit',clone(input.point));if(input.kind==='guard'&&target.coreState!=='extracted'&&!s.finaleReservations.some(r=>r.target===target.id&&!r.fulfilled))target.coreState='intact';}
  else emit(s,'AttackMiss',{attackId:a.id,contactNumber:input.contactNumber});
  if(a.contactNumbers.length>=a.contactCount){a.phase='return';a.returnElapsed=0;if(target.defensePose?.attackId===a.id)target.defensePose=null;}
  accepted.push({key,attackId:a.id,contactNumber:input.contactNumber,kind:input.kind,damage,point:input.point?clone(input.point):null});
 }finishCoreBatch(s);return {accepted,rejected,outcome:s.outcome?clone(s.outcome):null};
}
function advance(s,dt){
 if(!Number.isFinite(dt)||dt<0)error('seconds required');if(s.paused||dt===0)return cues(s);s.clock+=dt;
 if(s.outcome){s.endElapsed=Math.min(s.endAnimationSeconds,s.endElapsed+dt);s.resultReady=s.endElapsed>=s.endAnimationSeconds;return [];}
 for(const a of s.actions){if(a.phase==='done')continue;if(a.phase==='return'){a.returnElapsed+=dt;if(a.returnElapsed>=a.timing.return){a.phase='done';emit(s,'ActionReturned',{attackId:a.id});}continue;}a.elapsed+=dt;const phase=a.elapsed<a.timing.windup?'telegraph':a.elapsed<a.timing.windup+a.timing.strike?'strike':'await-contact';if(a.phase!==phase){a.phase=phase;emit(s,'ActionPhase',{attackId:a.id,phase});}}
 return cues(s);
}
function snapshot(s){return clone(s)}
function hydrate(raw){try{
 if(!raw||raw.ruleVersion!==RULE||!validId(raw.id)||!Number.isFinite(raw.clock)||raw.clock<0||!Array.isArray(raw.actors)||raw.actors.length!==2||!positive(raw.endAnimationSeconds))return null;
 const s=clone(raw);if(new Set(s.actors.map(a=>a.id)).size!==2||!s.actors.every(a=>validId(a.id)&&['intact','targeted','extracted'].includes(a.coreState)&&Array.isArray(a.groups)&&a.groups.length))return null;
 for(const a of s.actors){if(new Set(a.groups.map(g=>g.id)).size!==a.groups.length)return null;for(const g of a.groups){if(!validId(g.id)||!positive(g.maxDurability)||!Number.isFinite(g.durability)||g.durability<0||g.durability>g.maxDurability||!['intact','damaged','broken'].includes(g.condition)||!Array.isArray(g.structuralLayers)||!Array.isArray(g.cosmeticLayers)||!Array.isArray(g.inventoryRefs))return null;const expected=g.durability===0?'broken':g.durability<g.maxDurability?'damaged':'intact';if(g.condition!==expected)return null;}if(a.defensePose){const g=group(a,a.defensePose.groupId);if(g.condition==='broken'||!g.functions.defend)return null;}}
 if(!Array.isArray(s.actions)||new Set(s.actions.map(a=>a.id)).size!==s.actions.length||!Array.isArray(s.projectiles)||!Array.isArray(s.contactKeys)||new Set(s.contactKeys).size!==s.contactKeys.length||!Array.isArray(s.finaleReservations)||!Number.isInteger(s.sequence)||!Array.isArray(s.events))return null;
 for(const a of s.actions){if(!validId(a.id)||!PHASES.includes(a.phase)||!['part','core'].includes(a.aim?.kind)||!positive(a.damageBudget)||!Number.isFinite(a.damageClaimed)||a.damageClaimed<0||a.damageClaimed>a.damageBudget+EPS||!Number.isInteger(a.contactCount)||!Array.isArray(a.contactNumbers)||new Set(a.contactNumbers).size!==a.contactNumbers.length)return null;actor(s,a.attacker);actor(s,a.target);if(a.attacker===a.target)return null;validateTiming(a.timing);for(const n of a.contactNumbers)if(n<1||n>a.contactCount||!s.contactKeys.includes(s.id+'|'+a.id+'|'+n))return null;}
 const extracted=s.actors.filter(a=>a.coreState==='extracted');if(extracted.length&&!s.outcome||s.outcome&&!extracted.length)return null;if(s.outcome){if(s.outcome.matchId!==s.id||s.outcome.kind!==(extracted.length===2?'draw':'win')||s.outcome.kind==='draw'&&(s.outcome.winner!==null||s.outcome.rewardEligible))return null;}
 for(const r of s.finaleReservations){const target=actor(s,r.target);actor(s,r.attacker);if(liveDefenders(target).length||r.fulfilled!== (target.coreState==='extracted'))return null;}
 s.paused=true;return s;
 }catch{return null;}}
return Object.freeze({RULE,create,pause,cues,startAttack,placeDefense,launchProjectile,resolveContacts,advance,snapshot,hydrate,liveDefenders,liveAttackers});
});
