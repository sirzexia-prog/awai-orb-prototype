(function(root){'use strict';
const copy=v=>JSON.parse(JSON.stringify(v)),clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
function create({families,scene,geometry}){
 const rest={};
 for(const id of ['player','machine']){
  const family=families[id];if(!family?.rig?.joints||!family.rig.attackKeys||!family.rig.guardKeys)throw Error('registered rigid joint keys missing '+id);
  const joints=family.rig.joints;const ids=new Set(joints.map(j=>j.id));if(ids.size!==joints.length||!Array.isArray(scene[id]?.core)||scene[id].core.length!==2)throw Error('unique rig/scene required');
  for(const j of joints)if(!Array.isArray(j.position)||j.position.length!==2||!j.position.every(Number.isFinite)||!Number.isFinite(j.angle)||j.parent&&!ids.has(j.parent))throw Error('rig rest position/parent required');
  for(const l of family.layers)if(!ids.has(l.joint))throw Error('material joint missing '+l.id);
  for(const keys of [family.rig.attackKeys,...family.groups.map(g=>family.rig.guardKeys[g.id])]){if(!Array.isArray(keys)||keys.length<2||keys[0].at!==0||keys.at(-1).at!==1)throw Error('complete motion keys required');for(let i=0;i<keys.length;i++){if(!Number.isFinite(keys[i].at)||i&&keys[i].at<=keys[i-1].at)throw Error('ordered motion keys required');for(const [id,p]of Object.entries(keys[i].joints||{}))if(!ids.has(id)||!Array.isArray(p.position)||p.position.length!==2||!p.position.every(Number.isFinite)||!Number.isFinite(p.angle))throw Error('motion joint invalid');}}
  rest[id]=joints;
 }
 function interpolate(keys,t){const upper=keys.findIndex(k=>k.at>=t),b=keys[upper<0?keys.length-1:upper],a=keys[Math.max(0,upper-1)],q=b.at===a.at?0:smooth((t-a.at)/(b.at-a.at)),out={};for(const id of new Set([...Object.keys(a.joints||{}),...Object.keys(b.joints||{})])){const aa=a.joints?.[id]||b.joints[id],bb=b.joints?.[id]||aa;let delta=bb.angle-aa.angle;while(delta>Math.PI)delta-=Math.PI*2;while(delta< -Math.PI)delta+=Math.PI*2;out[id]={position:aa.position.map((v,i)=>v+(bb.position[i]-v)*q),angle:aa.angle+delta*q};}return out;}
 function transforms(id,changes,core){const base=rest[id],result={},visiting=new Set();function solve(name){if(result[name])return result[name];if(visiting.has(name))throw Error('rig parent cycle');visiting.add(name);const j=base.find(j=>j.id===name),v=changes[name]||j;if(!j)throw Error('rig joint absent');let x=v.position[0],y=v.position[1],angle=v.angle;if(j.parent){const p=solve(j.parent),c=Math.cos(p.angle),s=Math.sin(p.angle);const dx=c*x-s*y,dy=s*x+c*y;x=p.x+dx;y=p.y+dy;angle+=p.angle;}else{x+=core.x;y+=core.y;}visiting.delete(name);return result[name]={x,y,angle};}for(const j of base)solve(j.id);return result;}
 function phase(action){if(!action)return 0;const {windup,strike,return:back}=action.timing;if(action.phase==='return')return .75+.25*clamp(action.returnElapsed/back);return action.elapsed<windup?.3*clamp(action.elapsed/windup):.3+.45*clamp((action.elapsed-windup)/strike);}
 function evaluate(state,presentation){
  presentation.detached||=[];const actors={},detached=[],cues=[];
  for(const a of state.actors){
   const f=families[a.id],home=scene[a.id].core,action=state.actions.find(x=>x.attacker===a.id&&x.phase!=='done'&&!x.finaleComplete),changes=action?interpolate(f.rig.attackKeys,phase(action)):{};
   const threat=state.actions.find(x=>x.target===a.id&&x.aim.kind==='core'&&!['return','done'].includes(x.phase));
   if(a.defensePose&&threat){const late=a.defensePose.phase==='late',t=late?0:clamp((state.clock-a.defensePose.startedAt)/Math.max(.001,threat.timing.windup-(a.defensePose.startedAt-(state.clock-threat.elapsed))));Object.assign(changes,interpolate(f.rig.guardKeys[a.defensePose.groupId],t));}
   // Root offsets are authored on the same scene grid, never fit to a bounding box.
   const root=action&&f.rig.rootKeys?interpolate(f.rig.rootKeys,phase(action)).root:null;
   const core={x:home[0]+(root?.position[0]||0),y:home[1]+(root?.position[1]||0)},joints=transforms(a.id,changes,core),layers=[];
   for(const l of f.layers){const joint=joints[l.joint];layers.push({id:l.id,role:l.role,revealedBy:l.revealedBy,asset:a.id+'/'+l.id+'/'+Object.keys(l.variants)[0],damagedAsset:l.variants.damaged?a.id+'/'+l.id+'/damaged':null,matrix:geometry.matrix(joint,l.pivot,joint.angle)});if(l.variants.intact)layers.at(-1).asset=a.id+'/'+l.id+'/intact';}
   const attacks=[];
   if(action&&['strike','await-contact'].includes(action.phase)){
    const weaponJoint=joints[f.rig.attackSourceJoint];if(!weaponJoint)throw Error('weapon source joint missing');
    if(action.contactCount!==1)throw Error('連射は独立した発射物の素材・軌道接続が未完了です');for(let n=1;n<=action.contactCount;n++)if(!action.contactNumbers.includes(n))attacks.push({attackId:action.id,contactNumber:n,layerIds:f.rig.contactLayers,source:{x:weaponJoint.x,y:weaponJoint.y}});
   }
   actors[a.id]={layers,corePosition:core,attacks};
  }
  for(const action of state.actions){if(action.aim.kind==='core'&&!['return','done'].includes(action.phase)){const source=actors[action.attacker].corePosition,target=actors[action.target].corePosition;cues.push({source,target,radius:17});}}
  for(const item of presentation.detached){const age=Math.max(0,state.clock-item.at);if(age>1.25)continue;const point={x:item.position.x+item.velocity.x*age,y:item.position.y+item.velocity.y*age+150*age*age};detached.push({id:item.id,asset:item.asset,matrix:geometry.matrix(point,item.pivot,item.angle+item.spin*age)});}
  for(const a of state.actors)if(a.coreState==='extracted'){
   const extraction=presentation.extracted?.[a.id];if(!extraction)throw Error('extraction draw state missing');const q=smooth(state.endElapsed/state.endAnimationSeconds);for(const l of families[a.id].layers.filter(l=>l.role==='core'))detached.push({id:a.id+'/pulled-core/'+l.id,asset:a.id+'/'+l.id+'/intact',matrix:geometry.matrix({x:extraction.from.x+(extraction.to.x-extraction.from.x)*q,y:extraction.from.y+(extraction.to.y-extraction.from.y)*q},l.pivot,0)});
  }
  presentation.latest=copy(actors);return {actors,detached,cues};
 }
 function events(events,state,presentation){
  for(const e of events){
   if(e.type==='PartBroken'){
    const layers=presentation.latest?.[e.actorId]?.layers||[];for(const l of layers.filter(l=>[...e.structuralLayers,...e.cosmeticLayers].includes(l.id))){const source=families[e.actorId].layers.find(s=>s.id===l.id),pivot=source.pivot,m=l.matrix,position={x:m[0]*pivot[0]+m[2]*pivot[1]+m[4],y:m[1]*pivot[0]+m[3]*pivot[1]+m[5]};presentation.detached.push({id:e.id+'/'+l.id,asset:l.damagedAsset||l.asset,at:state.clock,pivot,position,angle:Math.atan2(m[1],m[0]),velocity:{x:e.actorId==='player'?-85:85,y:-45},spin:e.actorId==='player'?-1.8:1.8});}
   }
   if(e.type==='CoreExtract'){presentation.extracted||={};const from=presentation.latest[e.actorId].corePosition,attacker=state.actors.find(a=>a.id!==e.actorId).id,toward=presentation.latest[attacker].corePosition;presentation.extracted[e.actorId]={from:copy(from),to:{x:from.x+(toward.x-from.x)*.35,y:from.y-45}};}
  }
 }
 return {evaluate,events,defensePose({cue,group,late}){return {groupId:group.id,target:cue.target,late,rig:'registered-guard-keys'};},background(ctx){ctx.fillStyle='#102932';ctx.fillRect(0,0,800,520);ctx.fillStyle='#385762';ctx.fillRect(0,432,800,2);}};
}
root.AwaiPartbreakRigR8=Object.freeze({create});
})(globalThis);
