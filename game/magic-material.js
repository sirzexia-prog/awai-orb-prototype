(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AwaiMagicMaterial=factory();})(globalThis,function(){
 'use strict';const SIZE=256,FPS=24,FRAMES=48,COLS=6,ANCHOR={x:128,y:215};
 function frame(action,reduced=false){if(!action||!action.material||!['cast','burst'].includes(action.kind))return null;const hits=action.hitCount||1,windup=action.windup||.30,beat=action.beat||.17,last=windup+(hits-1)*beat;let position=action.elapsed<windup?7*action.elapsed/windup:action.elapsed<last?7+3*(action.elapsed-windup)/beat:7+3*(hits-1)+(47-7-3*(hits-1))*(action.elapsed-last)/Math.max(.001,2-last);const index=reduced?7:Math.max(0,Math.min(47,Math.floor(position+1e-6)));return {index,actionId:action.id,phase:index<3?'appear':index<5?'rotate-gather':index<7?'rise':index<14?'contact':'afterglow',contact:index>=7&&index<=13,reduced};}
 function draw(c,atlas,f,ground,size){if(!atlas||!f)return;c.save();c.imageSmoothingEnabled=true;c.drawImage(atlas,(f.index%COLS)*SIZE,Math.floor(f.index/COLS)*SIZE,SIZE,SIZE,ground.x-ANCHOR.x/SIZE*size,ground.y-ANCHOR.y/SIZE*size,size,size);c.restore();}
 return {SIZE,FPS,FRAMES,COLS,ANCHOR,frame,draw};
});
