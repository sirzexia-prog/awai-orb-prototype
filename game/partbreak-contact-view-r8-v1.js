(function(root){'use strict';
function draw({canvas,context,state,frame}){
 const detail=document.getElementById('contact-detail'),title=document.getElementById('contact-detail-title');if(!detail||!title)return;
 const cue=frame.cues[0],label=id=>id==='player'?'相棒':'巨機',event=[...state.events].reverse().find(e=>['GuardHit','CoreExtract','PartBroken'].includes(e.type)&&state.clock-e.clock<=.65&&e.point),action=cue?state.actions.find(a=>a.aim.kind==='core'&&!['return','done'].includes(a.phase)):null;
 let focus=event?.point||cue?.target||frame.cores.machine,kind=event?.type||(cue?'CoreTargeted':'overview');
 if(event){context.save();context.strokeStyle=event.type==='CoreExtract'?'#ffda76':event.type==='GuardHit'?'#baffdf':'#ffe0a4';context.lineWidth=3/Math.max(.3,Math.min(1,(canvas.getBoundingClientRect?.().width||800)/800));const r=18;context.beginPath();for(const [x,y]of [[-1,-1],[1,-1],[-1,1],[1,1]]){context.moveTo(focus.x+x*r,focus.y+y*(r-7));context.lineTo(focus.x+x*r,focus.y+y*r);context.lineTo(focus.x+x*(r-7),focus.y+y*r);}context.stroke();context.restore();}
 title.textContent=event?.type==='GuardHit'?'防御が命中を受け止めた':event?.type==='CoreExtract'?'核へ命中 · 核が抜かれた':event?.type==='PartBroken'?label(event.actorId)+'の腕が分離した':action?label(action.target)+'の核が狙われている':'核と守り腕 · 実際の戦場を拡大';
 const sw=170,sh=85,sx=Math.max(0,Math.min(800-sw,focus.x-sw/2)),sy=Math.max(0,Math.min(520-sh,focus.y-sh/2)),c=detail.getContext('2d');c.clearRect(0,0,detail.width,detail.height);c.imageSmoothingEnabled=true;c.drawImage(canvas,sx,sy,sw,sh,0,0,detail.width,detail.height);
 detail.dataset.kind=kind;detail.dataset.sourceRect=JSON.stringify([sx,sy,sw,sh]);detail.dataset.focus=JSON.stringify(focus);
}
root.AwaiPartbreakContactViewR8=Object.freeze({draw});
})(globalThis);
