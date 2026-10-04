(function(root){'use strict';
const copy=v=>JSON.parse(JSON.stringify(v));
// Existing bullet-particle style, rasterized once so drawing and collisions share RGBA.
// This is a particle, not newly accepted character/gun/magic artwork.
function bulletParticle(){const c=document.createElement('canvas');c.width=18;c.height=6;const x=c.getContext('2d');x.fillStyle='#efd5a4';x.fillRect(1,2,15,2);x.fillStyle='#fff1cd';x.fillRect(14,2,3,2);return {key:'existing-code-bullet-particle-r8',image:c,width:18,height:6,bodyBounds:[1,2,17,4],pivot:[17,3]};}
function create({model,geometry,asset,speed,gap,lifetime,impactHold}){
 if(!model||!geometry||!asset||![speed,gap,lifetime,impactHold].every(v=>Number.isFinite(v)&&v>0))throw Error('explicit projectile proposal and shared RGBA required');
 function emit(state,frame,presentation){
  presentation.projectileDraws||={};
  if(state.paused||state.outcome)return;
  for(const a of state.actions){
   if(a.weaponSnapshot.kind!=='machinegun'||!['strike','await-contact'].includes(a.phase))continue;
   const emitter=frame.emitters?.find(e=>e.attackId===a.id);if(!emitter)throw Error('actual held muzzle position is missing');
   for(let n=1;n<=a.contactCount;n++){
    if(a.elapsed<a.timing.windup+(n-1)*gap||a.contactNumbers.includes(n)||state.projectiles.some(p=>p.attackId===a.id&&p.contactNumber===n))continue;
    const source=emitter.muzzles?.[(n-1)%emitter.muzzles.length]||emitter.source;const dx=emitter.target.x-source.x,dy=emitter.target.y-source.y,length=Math.hypot(dx,dy);if(!length)throw Error('projectile direction missing');
    const id=a.id+'/shot/'+n,trajectory={from:copy(source),velocity:{x:dx/length*speed,y:dy/length*speed},lifetime};
    const launched=model.launchProjectile(state,{id,attackId:a.id,contactNumber:n,trajectory});
    if(!launched.accepted){if(launched.reason==='unfired-weapon-broken')continue;throw Error('projectile launch rejected '+launched.reason);}
    presentation.projectileDraws[id]={position:copy(trajectory.from),lastClock:state.clock,angle:Math.atan2(dy,dx),visibleUntil:null};
   }
  }
 }
 function parts(state,presentation){const out=[];for(const p of state.projectiles){const draw=presentation.projectileDraws?.[p.id];if(!draw||p.resolved&&state.clock>draw.visibleUntil)continue;out.push({id:p.id,asset,matrix:geometry.matrix(draw.position,asset.pivot,draw.angle),role:'projectile'});}return out;}
 function advance(state,frame,presentation){
  const observations=[];
  if(state.paused||state.outcome)return observations;
  for(const p of state.projectiles){
   if(p.resolved)continue;const draw=presentation.projectileDraws?.[p.id];if(!draw)throw Error('projectile draw state missing on reload');
   const a=state.actions.find(a=>a.id===p.attackId),target=frame.cores[a.target],surfaces=frame.surfaces.filter(s=>s.actorId===a.target&&(a.aim.kind==='core'||s.groupId===a.aim.groupId));
   const age=Math.max(0,state.clock-p.startedAt),end={x:p.trajectory.from.x+p.trajectory.velocity.x*Math.min(age,p.trajectory.lifetime),y:p.trajectory.from.y+p.trajectory.velocity.y*Math.min(age,p.trajectory.lifetime)},start=copy(draw.position),length=Math.hypot(end.x-start.x,end.y-start.y),steps=Math.max(1,Math.ceil(length));let found=null;
   // Inspect the actual raster every <=1 scene pixel. On contact, draw that position,
   // rather than showing a bullet beyond a surface that has already broken.
   for(let i=0;i<=steps;i++){
    const q=i/steps,position={x:start.x+(end.x-start.x)*q,y:start.y+(end.y-start.y)*q},weapon={id:p.id,parts:[{asset,matrix:geometry.matrix(position,asset.pivot,draw.angle)}]},hit=geometry.firstOverlap(weapon,surfaces,start,target);if(!hit)continue;
    const first=a.aim.kind==='core'?geometry.ray({origin:start,target,surfaces}):null;
    if(hit.kind==='core'&&first?.kind==='live-defense')throw Error('bullet crossed a live defense without contact');
    found={position,hit,first};break;
   }
   draw.lastClock=state.clock;
   if(found){draw.position=found.position;draw.visibleUntil=state.clock+impactHold;const {hit,first}=found;observations.push({matchId:state.id,attackId:a.id,contactNumber:p.contactNumber,projectileId:p.id,kind:hit.kind==='core'?'core':a.aim.kind==='core'?'guard':'part',groupId:hit.groupId,overlapPixels:hit.pixels,point:hit.point,damageShare:a.damageBudget/a.contactCount,defenseDistance:hit.distance,coreDistance:Math.hypot(target.x-start.x,target.y-start.y),firstSurface:first?{kind:first.kind,groupId:first.groupId}:null});}
   else{draw.position=end;if(age>=p.trajectory.lifetime){draw.visibleUntil=state.clock;observations.push({matchId:state.id,attackId:a.id,contactNumber:p.contactNumber,projectileId:p.id,kind:'miss'});}}
  }
  return observations;
 }
 return {emit,parts,advance,asset};
}
root.AwaiPartbreakProjectilesR8=Object.freeze({create,bulletParticle});
})(globalThis);
