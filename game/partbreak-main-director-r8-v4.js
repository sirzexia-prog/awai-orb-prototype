(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory();else root.AwaiPartbreakDirectorR8=factory();})(globalThis,function(){'use strict';
const copy=v=>JSON.parse(JSON.stringify(v));
// The world adapter supplies the drawn RGBA surfaces. The director never invents a hit.
function create({model,state,proposal,world,presentation=null,choices={}}){
 if(!model||!world||typeof world.frame!=='function'||typeof world.contacts!=='function')throw Error('draw/alpha world adapter required');
 for(const k of ['impactStopSeconds','automaticGuardLeadSeconds','attackBudget'])if(!Number.isFinite(proposal[k])||proposal[k]<0)throw Error('explicit proposal '+k);
 const d=presentation?copy(presentation):{version:1,turn:0,nextActor:state.actors[0].id,seen:state.sequence,stopRemaining:0,contacts:[],world:{},choices:copy(choices),guardFault:null};
 if(d.version!==1||!Array.isArray(d.contacts)||!Number.isFinite(d.stopRemaining))throw Error('invalid saved presentation');
 d.world.selectedWeapon=d.choices.player?.kind||'sword';let rendered=null;
 const actor=id=>state.actors.find(a=>a.id===id),enemy=id=>state.actors.find(a=>a.id!==id);
 function active(id){return state.actions.find(a=>a.attacker===id&&a.phase!=='done');}
 function schedule(){
  if(state.paused||state.outcome||state.actions.some(a=>a.phase!=='done'))return;
  const finale=state.finaleReservations.find(r=>!r.fulfilled);
  let source=actor(finale?finale.attacker:d.nextActor);if(!model.liveAttackers(source).length&&!finale)source=enemy(source.id);const target=enemy(source.id),weapons=model.liveAttackers(source);
  if(!weapons.length)throw Error('neither actor has a live attack source; scene/rule needs review');
  const defenders=model.liveDefenders(target),front=defenders[0];
  let core=!!finale||!front||source.policy==='core-first'||front.condition==='damaged';
  const selected=copy(d.choices[source.id]||{});if(source.id==='player'&&selected.kind==='sword'){const plan=selected.swordPlan||'technical';if(!finale&&front){if(plan==='bold')core=source.turns%2===0;else if(plan==='guard')core=!model.liveAttackers(target).length&&front.condition==='damaged';}selected.swordMode=core?'ultimate':'break';}const timing=finale?proposal.finaleTiming:core?proposal.coreTiming:proposal.normalTiming;
  const result=model.startAttack(state,{id:state.id+'-attack-'+(++d.turn),attacker:source.id,target:target.id,weaponGroupId:weapons[0].id,weaponSnapshot:{...selected,layers:[...weapons[0].structuralLayers]},aim:core?{kind:'core'}:{kind:'part',groupId:front.id},damageBudget:Number.isFinite(selected.attackBudget)&&selected.attackBudget>0?selected.attackBudget:proposal.attackBudget,contactCount:selected.kind==='machinegun'?3:1,timing,finale:!!finale});
  if(!result.accepted)throw Error('auto action rejected: '+result.reason);
  d.nextActor=target.id;
 }
 function guards(){
  for(const cue of model.cues(state)){
   if(!cue.coreTarget||cue.phase!=='telegraph')continue;
   const target=actor(cue.target),group=model.liveDefenders(target)[0];if(!group)continue;
   const chosen=d.choices[target.id],style=chosen?.kind==='sword'?chosen.swordPlan:null;const lead=style==='guard'?.30:style==='bold'?.12:proposal.automaticGuardLeadSeconds;
   if(cue.elapsed<Math.max(0,cue.windup-lead)||target.defensePose?.attackId===cue.attackId)continue;
   // Fault mode is a developer observation condition, not a manual defense requirement.
   const late=d.guardFault===target.id;
   model.placeDefense(state,{actorId:target.id,attackId:cue.attackId,groupId:group.id,phase:late?'late':'intercept',transform:world.defensePose({state,cue,group,late,presentation:d.world})});
  }
 }
 function events(){
  const fresh=state.events.filter(e=>e.id>d.seen);d.seen=state.sequence;
  if(fresh.length)world.events?.(fresh,state,d.world);
  if(fresh.some(e=>['GuardHit','PartHit','CoreExtract'].includes(e.type)))d.stopRemaining=proposal.impactStopSeconds;
 }
 function redraw(){rendered=world.frame(state,d.world);return rendered;}
 function tick(seconds){
  if(!Number.isFinite(seconds)||seconds<0)throw Error('wall seconds required');
  if(state.paused)return redraw();
  // Carry the remainder; a 60 ms stop must not become 100 ms at a low frame rate.
  const used=Math.min(seconds,d.stopRemaining);d.stopRemaining-=used;seconds-=used;
  if(seconds===0)return redraw();
  d.renderStep=(d.renderStep||0)+1;d.world.renderStep=d.renderStep;schedule();model.advance(state,seconds);guards();
  for(const a of state.actions)model.cancelUnfired(state,a.id);
  rendered=world.frame(state,d.world);
  const observations=state.outcome?[]:world.contacts(state,rendered,d.world).map(o=>({...o,renderStep:d.renderStep}));
  if(observations.length){if(typeof globalThis.PartbreakMainContactObserveR8==='function'){const contactFrame=world.drawContactFrame?.(state,rendered,d.world)||rendered;globalThis.PartbreakMainContactObserveR8({state:copy(state),observations:copy(observations),frame:contactFrame,renderStep:d.renderStep});}const resolved=model.resolveContacts(state,observations);if(resolved.rejected.length)throw Error('rendered contact rejected: '+JSON.stringify(resolved.rejected));d.contacts.push(...resolved.accepted.map(c=>({...c,clock:state.clock})));}
  events();
  // Rebuild after damage/removal/extraction in the very same rendered frame.
  return redraw();
 }
 return {tick,redraw,pause(value=true){model.pause(state,value);return redraw();},setChoices(id,value){actor(id);d.choices[id]=copy(value);if(id==='player')d.world.selectedWeapon=value.kind;},setGuardFault(id=null){if(id!==null)actor(id);d.guardFault=id;},snapshot(){return {state:model.snapshot(state),presentation:copy(d)};},current:()=>state,presentation:()=>copy(d),frame:()=>rendered};
}
return Object.freeze({create});
});
