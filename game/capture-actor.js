(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AwaiCaptureActor=factory();})(globalThis,function(){
 'use strict';let cached;
 // A new, generic everyday human. Rectangles use a48x48pixel grid; feet anchor at44/48.
 const blocks=[
  [17,4,13,5,'#493c36'],[15,7,16,5,'#493c36'],[17,8,13,7,'#e8b698'],[29,9,3,4,'#e8b698'],[16,7,12,3,'#574138'],[16,9,3,5,'#493c36'],[27,10,2,2,'#343743'],[29,13,2,1,'#b57368'],
  [22,15,5,3,'#d69d81'],[16,17,14,12,'#356883'],[17,18,4,10,'#5793a4'],[22,18,4,11,'#dfdfce'],[26,17,5,11,'#37637b'],[14,18,4,8,'#457d92'],[13,25,4,4,'#e8b698'],
  [30,18,4,6,'#4b8194'],[33,21,4,4,'#4b8194'],[34,23,5,3,'#e8b698'],[16,28,15,3,'#34465a'],[18,31,5,9,'#334154'],[25,31,5,9,'#334154'],[19,32,2,7,'#495b6d'],[26,32,2,7,'#495b6d'],
  [16,40,7,4,'#303740'],[25,40,8,4,'#303740'],[17,42,6,1,'#687482'],[26,42,6,1,'#687482']
 ];
 function imageUrl(){if(cached)return cached;const raw=document.createElement('canvas');raw.width=raw.height=48;const c=raw.getContext('2d');for(const [x,y,w,h,color]of blocks){c.fillStyle=color;c.fillRect(x,y,w,h);}const out=document.createElement('canvas');out.width=out.height=192;const ctx=out.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(raw,0,0,192,192);return cached=out.toDataURL('image/png');}
 return {imageUrl,blocks:()=>blocks.map(b=>[...b]),label:'開発中・キャラクターは仮表示'};
});
