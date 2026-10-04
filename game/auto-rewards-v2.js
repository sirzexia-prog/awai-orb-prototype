(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./engine.js'),require('./combat.js'),require('./save-guard.js'));else root.AwaiAutoRewards=factory(root.AwaiEngine,root.AwaiCombat,root.AwaiSaveGuard);})(globalThis,function(E,C,G){
 'use strict';const rewards={rex:[['armor','crown'],['magic','dress']],robot:[['arms'],['trail']]};
 const issuedKey=id=>'awai.reward.issued.v2:'+id;
 function issue(storage,sourceId,scope,battleId){let serial=Number(storage.getItem(issuedKey(sourceId)))||0;if(!Number.isSafeInteger(serial)||serial<0||serial>=Number.MAX_SAFE_INTEGER)throw Error('invalid reward serial');serial++;storage.setItem(issuedKey(sourceId),String(serial));return {sourceId,scope,battleId,serial,mode:'normal'};}
 function paid(p,serial){return p.paid.some(([from,to])=>serial>=from&&serial<=to);}
 function record(p,serial){const ranges=[...p.paid,[serial,serial]].sort((a,b)=>a[0]-b[0]),out=[];for(const r of ranges){const last=out.at(-1);if(last&&r[0]<=last[1]+1)last[1]=Math.max(last[1],r[1]);else out.push([...r]);}p.paid=out;}
 function claim(source,battle,scope,now=Date.now()){
  const ticket=battle?.rewardTicket;
  if(!battle||battle.outcome!=='win'||battle.rewardEligible!==true||!Object.hasOwn(rewards,battle.enemy)||typeof battle.id!=='string'||battle.id.length>80)return {ok:false,reason:'ineligible'};
  if(!ticket||ticket.mode!=='normal'||ticket.sourceId!==source.id||ticket.scope!==scope||ticket.battleId!==battle.id||!Number.isSafeInteger(ticket.serial)||ticket.serial<1)return {ok:false,reason:'target-mismatch'};
  C.ensure(source);const g=source.gameplay,p=g.autoProgress;if(g.battle)return {ok:false,reason:'legacy-battle'};
  if(paid(p,ticket.serial)||p.claims.includes(battle.id))return {ok:false,reason:'already-claimed'};
  const earned=rewards[battle.enemy][Math.min(1,p.wins[battle.enemy])].filter(id=>!g.parts.includes(id));
  const pending=source.pendingEvent;source.pendingEvent=null;const act=E.act(source,battle.policy==='magic'?'calm':'explore','auto-'+battle.id,now);source.pendingEvent=pending;if(!act.ok)return {ok:false,reason:'already-claimed'};
  record(p,ticket.serial);p.wins[battle.enemy]++;p.parts=[...new Set([...p.parts,...earned])];const xp=battle.policy==='magic'?'focus':'power';g.xp[xp]=Math.min(12,g.xp[xp]+1);g.xp.guard=Math.min(12,g.xp.guard+1);g.slots=3;
  act.memory.title=(battle.enemy==='robot'?'水庭の巨機':'水庭の大牙')+'に勝った';act.memory.text=earned.length?'勝利して、'+earned.map(id=>C.PARTS[id].name).join('・')+'を獲得した。':'勝利して、戦いの経験を重ねた。';source.chats.at(-1).text=act.memory.text;
  p.last={id:battle.id,enemy:battle.enemy,parts:earned,xp,time:now};C.ensure(source);return {ok:true,...p.last};
 }
 function settle(storage,battle,scope,now=Date.now(),locks){return G.lock(scope,async()=>{const loaded=await G.latest(storage,scope);if(!loaded.restored)return {ok:false,reason:'no-source'};const out=claim(loaded.state,battle,scope,now);if(!out.ok)return out;const saved=await G.writeDurable(storage,scope,loaded.state,loaded.stamp);return saved.ok?out:{ok:false,reason:saved.reason};},locks);}
 return {issue,claim,settle,paid,record};
});
