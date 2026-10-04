(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory();else root.AwaiPartbreakGuardImpactR8=factory();})(globalThis,function(){'use strict';
const KEY='machine-D-fore-fist-damaged-reference',LIFE=.24;
// Small outer-metal texture fragments from existing received D-arm RGBA, not new inner-face artwork.
const TILES=Object.freeze([[390,240,4,4],[374,272,4,4],[400,267,3,4],[386,286,3,3]].map(Object.freeze));
function fragments(state,reduced=false){if(reduced)return [];const event=[...state.events].reverse().find(e=>e.type==='GuardHit'&&e.actorId==='machine'&&e.groupId==='D'&&e.point&&state.clock-e.clock>=0&&state.clock-e.clock<LIFE);if(!event)return [];const age=state.clock-event.clock,q=age/LIFE;return TILES.map((tile,i)=>({eventId:event.id,actorId:event.actorId,groupId:event.groupId,point:{...event.point},age,tile,assetKey:KEY,x:event.point.x+[-26,-12,13,27][i]*q,y:event.point.y-[9,25,20,11][i]*Math.sin(q*Math.PI/2)+8*q*q,angle:[-.3,.4,-.5,.2][i]+[3,-4,5,-3][i]*age,alpha:.85*(1-q),width:[7,6,5,4][i],height:[4,5,4,3][i]}));}
function draw({context,state,assets,reduced=false}){const bits=fragments(state,reduced),asset=assets[KEY];if(!asset?.image)return [];for(const bit of bits){context.save();context.globalAlpha=bit.alpha;context.translate(bit.x,bit.y);context.rotate(bit.angle);context.drawImage(asset.image,...bit.tile,-bit.width/2,-bit.height/2,bit.width,bit.height);context.restore();}return bits;}
return Object.freeze({KEY,LIFE,TILES,fragments,draw});
});
