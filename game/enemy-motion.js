(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AwaiEnemyMotion=factory();})(globalThis,function(){
 'use strict';const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>x*x*(3-2*x);
 function pose(s,action,reduced=false){
  const attack=action?.kind==='impact'?action.attack:s.phase.zone?s.phase.kind:null;
  if(!attack)return {stage:'idle',attack:null,x:0,y:0,rotation:0,jaw:0,stretch:1};
  let stage,k;
  if(action?.kind==='impact'){k=clamp(action.elapsed/Math.max(.001,action.total));stage=k<.2?'contact':k<.6?'return':'settle';}
  else {k=clamp(1-s.phase.left/s.phase.full);stage=k<.70?'windup':'attack';}
  if(reduced)return {stage,attack,x:0,y:0,rotation:0,jaw:stage==='windup'?.15:.35,stretch:1};
  let x=0,y=0,rotation=0,jaw=0,stretch=1;
  if(stage==='windup'){const q=ease(k/.70);x=.08*q;rotation=.045*q;jaw=attack==='bite'?.85*q:.1;stretch=1-.055*q;}
  else if(stage==='attack'){const q=ease((k-.70)/.30);x=.08-(attack==='charge'?.50:.19)*q;rotation=-(attack==='tail'?.10:.06)*q;jaw=attack==='bite'?.85-.60*q:.1;stretch=1-.04*(1-q);}
  else {const q=1-ease(clamp(k/.65));x=-(attack==='charge'?.42:.11)*q;rotation=-.06*q;jaw=attack==='bite'?.25*q:0;stretch=1;}
  if(s.enemy==='robot'){const stroke=stage==='windup'?-ease(clamp(k/.70))*.35:stage==='attack'?-.35+1.15*ease(clamp((k-.70)/.30)):.80*(1-ease(Math.min(1,k/.65)));return {stage,attack,x:attack==='charge'?x*.55:x*.2,y:attack==='tail'?0:y,rotation:rotation*.6,jaw:0,stretch:1,arm:attack==='charge'?stroke:stroke*.35,core:attack==='tail'?(stage==='windup'?.25+.75*k:1-ease(k)):0};}return {stage,attack,x,y,rotation,jaw,stretch};
 }
 return {pose};
});
