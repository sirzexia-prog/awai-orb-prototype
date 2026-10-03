(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AwaiThunderRitual=factory();})(globalThis,function(){
 'use strict';const TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>x*x*(3-2*x);
 function frame(action,scene,reduced=false){if(!action||action.kind==='impact')return null;const strong=['burst','cleave'].includes(action.kind),windup=Math.max(.1,action.windup),age=action.elapsed,after=Math.max(0,age-action.lastContact-action.hitstop),fade=1-smooth(clamp((after-.03)/(strong?.22:.26))),p=age/windup;
  const clearance=Number.isFinite(scene.heroRight)?scene.ground.x-scene.heroRight-16:Infinity,rx=Math.max(0,Math.min(scene.boss*.22,clearance,scene.ground.x-8,scene.width-scene.ground.x-8)),fullHeight=Math.min(scene.bossHeight*(strong?1.32:.94),scene.ground.y-scene.height*.12),stage=reduced?'contact':p<.23?'appear':p<.46?'rotate':p<.65?'gather':p<1?'rise':after<.12?'contact':'afterglow',rise=reduced?1:smooth(clamp((p-.65)/.35));
  const beat=action.beat||.175,centres=[windup*.84,...Array.from({length:action.hitCount||3},(_,i)=>windup+i*beat+.018)],nearest=centres.reduce((a,b)=>Math.abs(age-b)<Math.abs(age-a)?b:a),distance=Math.abs(age-nearest),pulse=reduced?.35:distance<.048?1-smooth(distance/.048):0,pulseIndex=centres.indexOf(nearest);
  return {id:action.id,stage,age,strong,reduced,x:scene.ground.x,y:scene.ground.y,rx,ry:rx*.23,heroRight:scene.heroRight,rotation:reduced?0:age*5.2,growth:reduced?1:smooth(clamp(p/.23)),gather:reduced?.55:clamp((p-.46)/.19),rise,columnHeight:fullHeight*rise,fullHeight,columnWidth:Math.min(scene.boss*.23,scene.hero*(strong?.38:.25)),pulse,pulseIndex,beamFillArea:0,alpha:reduced?.46:fade,reflectionY:scene.ground.y+Math.max(rx*.31,scene.height*.075),width:scene.width,height:scene.height,scale:scene.hero};
 }
 function point(f,r,angle){return {x:f.x+Math.cos(angle)*r,y:f.y+Math.sin(angle)*r*.23};}
 function line(c,a,b){c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
 function ground(c,f){if(!f||f.alpha<=0||f.rx<1)return;c.save();c.globalAlpha=f.alpha*f.growth;const r=f.rx*f.growth;
  // A dark floor disc gives the luminous engraving contrast without whitening the enemy.
  c.beginPath();c.ellipse(f.x,f.y,r,r*.23,0,0,TAU);c.fillStyle='#071f55d4';c.fill();c.shadowColor='#159cff';c.shadowBlur=f.reduced?3:8;
  for(const [k,color,width]of [[1,'#155bd2',4.5],[.94,'#8ae5ff',2.7],[.76,'#258aff',2.8],[.56,'#77caff',1.6],[.35,'#176dd9',1.8]]){c.beginPath();c.ellipse(f.x,f.y,r*k,r*k*.23,0,0,TAU);c.strokeStyle=color;c.lineWidth=width;c.stroke();}c.shadowBlur=0;
  c.strokeStyle='#d1f5ff';c.lineWidth=1.6;for(let i=0;i<24;i++){const a=i*TAU/24+f.rotation,outer=point(f,r*.98,a),inner=point(f,r*.93,a);line(c,outer,inner);const k=i%3,mid=point(f,r*.835,a),next=point(f,r*.86,a+.04),back=point(f,r*.80,a-.04);line(c,mid,next);line(c,mid,back);if(k===0)line(c,next,point(f,r*.79,a+.04));}
  // Three long rotating breaks and counter-rotating inner spokes remain legible on phones.
  c.shadowColor='#27bcff';c.shadowBlur=f.reduced?0:4;c.strokeStyle='#a7e9ff';c.lineWidth=1.4;
  for(let i=0;i<3;i++){const a=f.rotation+i*TAU/3;c.beginPath();c.ellipse(f.x,f.y,r*.92,r*.92*.23,0,a,a+.56);c.stroke();line(c,point(f,r*.42,-f.rotation+i*TAU/3),point(f,r*.66,-f.rotation+i*TAU/3));}c.shadowBlur=0;
  for(let layer=0;layer<2;layer++){const rot=(layer?-.7:1)*f.rotation,n=layer?6:8,rad=r*(layer?.38:.65);c.strokeStyle=layer?'#62b8fa':'#478cd9';c.lineWidth=1.2;c.beginPath();for(let i=0;i<=n;i++){const p=point(f,rad,i*TAU/n+rot),j=point(f,rad,((i+3)%n)*TAU/n+rot);c.moveTo(p.x,p.y);c.lineTo(j.x,j.y);}c.stroke();}
  c.strokeStyle='#ffd369';c.lineWidth=2.8;for(let i=0;i<3;i++){const a=i*TAU/3+f.rotation;c.beginPath();c.ellipse(f.x,f.y,r*.76,r*.76*.23,0,a,a+.36);c.stroke();}const marker=point(f,r*.88,f.rotation-.8);c.save();c.translate(marker.x,marker.y);c.rotate(f.rotation-.8);c.fillStyle='#ffe184';c.strokeStyle='#2362ba';c.lineWidth=1.5;c.beginPath();c.moveTo(6,0);c.lineTo(-4,-4);c.lineTo(-1,0);c.lineTo(-4,4);c.closePath();c.fill();c.stroke();c.restore();
  if(f.gather>0){const k=r*(.09+.20*f.gather),g=c.createRadialGradient(f.x,f.y,0,f.x,f.y,k);g.addColorStop(0,'#f8ffffb0');g.addColorStop(.24,'#aee9ff75');g.addColorStop(1,'#71beff00');c.fillStyle=g;c.fillRect(f.x-k,f.y-k*.6,k*2,k*1.2);}
  if(f.rise>0&&f.pulse>0){c.save();c.globalAlpha*=.10*f.pulse;c.strokeStyle='#b3e6ff';c.lineWidth=1.1;for(let i=0;i<3;i++){const y=f.reflectionY+12+i*22;c.beginPath();c.ellipse(f.x,y,r*(.34+i*.13),3+i*2,0,0,TAU);c.stroke();}c.restore();}
  c.restore();
 }
 function bolt(f){const seed=f.id*19+(f.reduced?0:f.pulseIndex)*31,noise=n=>{const q=Math.sin((seed+n)*127.1)*43758.5453;return q-Math.floor(q);},spread=Math.min(f.columnWidth*.66,f.columnHeight*.15),trunk=[{x:f.x,y:f.y}];for(let i=1;i<=10;i++){const z=i/10;trunk.push({x:f.x+(i===10?.18:(i%2?1:-1))*(.55+noise(i)*.45)*spread,y:f.y-f.columnHeight*(z+(i===10?0:(noise(i+20)-.5)*.065))});}const branches=[];for(const i of [1,2,3,5,6,8]){const start=trunk[i],sign=i%2?1:-1,reach=spread*(1.10+noise(i+60)*1.05),rise=f.columnHeight*(.08+noise(i+80)*.13),branch=[start,{x:start.x+sign*reach*.48,y:start.y-rise*.24},{x:start.x+sign*reach*.31,y:start.y-rise*.59},{x:start.x+sign*reach,y:start.y-rise}];branches.push(branch);branches.push([branch[1],{x:branch[1].x-sign*reach*.18,y:branch[1].y-rise*.52},{x:branch[1].x+sign*reach*.48,y:branch[1].y-rise*.92}]);}return {trunk,branches,spread};}
 function pillar(c,f,origin){if(!f||f.alpha<=0)return;c.save();c.globalAlpha=f.alpha;
  if(f.stage==='rotate'||f.stage==='gather'){const k=f.scale*(.04+.055*f.gather);c.strokeStyle='#c3edff';c.lineWidth=2;c.beginPath();c.arc(origin.x,origin.y,k,0,TAU);c.stroke();}
  if(f.rise>0&&(f.pulse>0||!f.reduced&&f.stage==='afterglow')){const b=bolt(f),tail=!f.reduced&&f.stage==='afterglow'&&f.pulse===0;c.globalAlpha=f.alpha*(tail?.24:f.pulse);c.lineJoin='miter';c.lineCap='butt';const draw=(points,width,color)=>{c.beginPath();c.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))c.lineTo(p.x,p.y);c.strokeStyle=color;c.lineWidth=width;c.stroke();};
   // Local bloom follows the broken paths; there is no filled beam or continuous trunk in the tail.
   c.shadowColor='#259dff';c.shadowBlur=f.reduced?0:10;
   if(!tail){draw(b.trunk,f.reduced?2.8:4.8,'#167bff');c.shadowBlur=0;draw(b.trunk,f.reduced?1.3:1.6,'#f0ffff');}
   if(!f.reduced)for(const [i,branch]of b.branches.entries()){if(tail&&i%3!==0)continue;c.shadowBlur=tail?3:7;draw(branch,tail?1.2:2.6,'#218eff');c.shadowBlur=0;draw(branch,tail?.55:.85,'#e2fcff');}c.shadowBlur=0;
   c.fillStyle='#dcffff90';c.beginPath();c.ellipse(f.x,f.y,Math.min(13,f.columnWidth*.22),3,0,0,TAU);c.fill();
  }c.restore();
 }
 function feedback(action,reduced=false){if(reduced||!action||action.kind==='impact'||!action.hitIndex)return {flash:0,shakeX:0,shakeY:0};const q=action.elapsed-(action.windup+(action.hitIndex-1)*action.beat),pulse=1-smooth(clamp(q/.14)),amp=action.hitCount===3?2:1.1;if(!pulse)return {flash:0,shakeX:0,shakeY:0};return {flash:pulse*.78,shakeX:Math.sin(q*92)*amp*pulse,shakeY:Math.cos(q*81)*amp*.45*pulse};}
 return {frame,point,ground,pillar,bolt,feedback};
});
