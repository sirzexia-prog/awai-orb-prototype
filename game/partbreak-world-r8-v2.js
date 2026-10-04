(function(root){'use strict';
const copy=v=>JSON.parse(JSON.stringify(v));
// Each rig evaluation is the source of both presentation and collision.
// It must use registered art; this module does not synthesize missing artwork.
function create({geometry,rig,assets,canvas,projectiles=null}){
 if(!geometry||!rig||typeof rig.evaluate!=='function'||!assets||!canvas)throw Error('registered material rig and canvas required');
 const ctx=canvas.getContext('2d');let latest=null;
 const asset=id=>{const a=assets[id];if(!a)throw Error('未受領の構造素材: '+id);return a;};
 function frame(state,presentation){
  geometry.beginFrame();const evaluated=rig.evaluate(state,presentation),parts=[],surfaces=[],attacks=[],cores={},emitters=[];
  for(const a of state.actors){
   const pose=evaluated.actors[a.id];if(!pose)throw Error('actor rig missing '+a.id);
   const groups=new Map(a.groups.map(g=>[g.id,g]));const layerOwner=new Map();
   for(const g of a.groups)for(const id of [...g.structuralLayers,...g.cosmeticLayers])layerOwner.set(id,g.id);
   const byLayer=new Map();
   for(const l of pose.layers){
    const owner=layerOwner.get(l.id),g=owner?groups.get(owner):null;
    if(g?.condition==='broken')continue;
    if(l.role==='core'&&a.coreState==='extracted')continue;
    if(l.role==='inner-surface'&&groups.get(l.revealedBy)?.condition!=='broken')continue;
    if(l.role==='empty-socket'&&a.coreState!=='extracted')continue;
    const id=g?.condition==='damaged'?l.damagedAsset:l.asset;
    if(!id)throw Error('欠け・亀裂を示す素材未受領: '+l.id);
    if(!Array.isArray(l.matrix)||l.matrix.length!==6||!l.matrix.every(Number.isFinite))throw Error('same draw matrix required');
    const part={id:l.id,asset:asset(id),matrix:l.matrix,actorId:a.id,groupId:owner||null,role:l.role};parts.push(part);byLayer.set(l.id,part);
   }
   for(const g of a.groups){
    if(g.condition==='broken')continue;
    const structural=g.structuralLayers.map(id=>byLayer.get(id));
    if(structural.some(p=>!p))throw Error('visible structural group incomplete '+a.id+'/'+g.id);
    surfaces.push({id:a.id+'/'+g.id,actorId:a.id,groupId:g.id,kind:'live-defense',active:g.functions.defend,parts:structural});
   }
   const coreParts=parts.filter(p=>p.actorId===a.id&&p.role==='core');
   if(a.coreState!=='extracted'&&!coreParts.length)throw Error('independent visible core missing');
   if(coreParts.length)surfaces.push({id:a.id+'/core',actorId:a.id,kind:'core',parts:coreParts});
   cores[a.id]=copy(pose.corePosition);if(pose.emitter)emitters.push(copy(pose.emitter));
   for(const attack of pose.attacks||[]){const sourceParts=attack.layerIds.map(id=>byLayer.get(id)).filter(Boolean);if(sourceParts.length)attacks.push({...copy(attack),surface:{id:attack.attackId+'/contact/'+attack.contactNumber,parts:sourceParts}});}
  }
  // Detached pieces and an extracted core are visual, not hidden defenders.
  for(const l of evaluated.detached||[])parts.push({id:l.id,asset:asset(l.asset),matrix:l.matrix,role:'detached'});
  if(projectiles)parts.push(...projectiles.parts(state,presentation));
  latest={parts,surfaces,attacks,cores,emitters,cues:evaluated.cues||[],events:state.events.slice(-8),clock:state.clock,outcome:copy(state.outcome),resultReady:state.resultReady};draw(latest);return latest;
 }
 function draw(f){
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
  rig.background?.(ctx,f);geometry.drawParts(ctx,f.parts);
  // Thin convergence guides are targeting cues, never substitute spell sprites.
  for(const cue of f.cues){ctx.save();ctx.strokeStyle='#9edbea';ctx.lineWidth=1;ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(cue.source.x,cue.source.y);ctx.lineTo(cue.target.x,cue.target.y);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(cue.target.x,cue.target.y,cue.radius||17,0,Math.PI*2);ctx.stroke();ctx.restore();}
  rig.foreground?.(ctx,f);
 }
 function contacts(state,f,presentation){
  const observations=[];if(projectiles){projectiles.emit(state,f,presentation);observations.push(...projectiles.advance(state,f,presentation));}
  for(const attack of f.attacks){
   const action=state.actions.find(a=>a.id===attack.attackId);if(!action||!['strike','await-contact'].includes(action.phase)||action.contactNumbers.includes(attack.contactNumber))continue;
   const target=f.cores[action.target],all=f.surfaces.filter(s=>s.actorId===action.target);
   const surfaces=action.aim.kind==='part'?all.filter(s=>s.groupId===action.aim.groupId):all;
   const hit=geometry.firstOverlap(attack.surface,surfaces,attack.source,target);
   if(!hit)continue;
   const coreDistance=Math.hypot(target.x-attack.source.x,target.y-attack.source.y);
   const first=action.aim.kind==='core'?geometry.ray({origin:attack.source,target,surfaces:all}):null;
   if(action.aim.kind==='core'&&hit.kind==='core'&&first?.kind==='live-defense')throw Error('描画上の防御面を通過したコア接触。軌道修正が必要です。');
   const kind=hit.kind==='core'?'core':action.aim.kind==='core'?'guard':'part';
   observations.push({matchId:state.id,attackId:action.id,contactNumber:attack.contactNumber,kind,groupId:hit.groupId,overlapPixels:hit.pixels,point:hit.point,damageShare:action.damageBudget/action.contactCount,defenseDistance:hit.distance,coreDistance,firstSurface:first?{kind:first.kind,groupId:first.groupId}:null,...(attack.projectileId?{projectileId:attack.projectileId}:{})});
  }
  return observations;
 }
 return {frame,contacts,defensePose(input){return rig.defensePose(input);},events(events,state,presentation){rig.events?.(events,state,presentation);},inspect:()=>latest};
}
root.AwaiPartbreakWorldR8=Object.freeze({create});
})(globalThis);
