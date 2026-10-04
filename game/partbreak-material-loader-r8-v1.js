(function(root){'use strict';
const STATES=['intact','damaged','broken-separated-with-inner-surface','core-interception','core-pull-empty-socket'];
async function load(url){
 const response=await fetch(url);if(!response.ok)throw Error('素材マニフェストが未受領です');const m=await response.json();
 if(m.version!=='partbreak-materials-r8-1'||m.status!=='ready-for-scene-check')throw Error('部位破壊・コア抜き用の透過素材が未受領です');
 if(!STATES.every(s=>m.sceneStates?.includes(s)))throw Error('同一場面の5状態が揃っていません');
 const assets={},families={};
 for(const actor of ['player','machine']){
  const family=m.actors?.[actor];if(!family||family.canvas?.[0]!==512||family.canvas?.[1]!==512||!Array.isArray(family.layers))throw Error('共通512 RGBA family missing');
  if(!Array.isArray(family.groups)||family.groups.length!==2)throw Error('two visible structural groups required');
  const ownership=new Map(),ids=new Set();
  for(const g of family.groups){if(!Array.isArray(g.structuralLayers)||!g.structuralLayers.length)throw Error('empty structural group');for(const id of [...g.structuralLayers,...(g.cosmeticLayers||[])]){if(ownership.has(id))throw Error('duplicate layer ownership');ownership.set(id,g.id);}}
  for(const l of family.layers){
   if(!l.id||ids.has(l.id))throw Error('duplicate layer');ids.add(l.id);
   if(!Array.isArray(l.pivot)||l.pivot.length!==2||!l.pivot.every(Number.isFinite))throw Error('common registered pivot missing');
   if(l.role==='structure'&&!ownership.has(l.id))throw Error('unmapped defensive structure');
   if(l.role==='structure'&&(!l.variants?.intact||!l.variants?.damaged))throw Error('damaged surface missing');
   if(['inner-surface','empty-socket'].includes(l.role)&&!l.revealedBy&&!l.coreDependent)throw Error('explicit reveal relation required');
   for(const [condition,v]of Object.entries(l.variants||{})){
    if(!v.sourceDriveId||!(/^[0-9a-f]{64}$/i.test(v.sourceSha256||''))||!(/^[0-9a-f]{64}$/i.test(v.sha256||'')))throw Error('original/provenance hashes required');
    const resolved=new URL(v.url,new URL(url,location.href));if(resolved.origin!==location.origin)throw Error('same-origin supplied material required');
    const raw=await fetch(resolved);if(!raw.ok)throw Error('missing material '+l.id);const bytes=await raw.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');if(hash!==v.sha256.toLowerCase())throw Error('material hash differs '+l.id);
    const loaded=await AwaiPartbreakGeometryR8.loadImage(resolved.href,{expectedSize:family.canvas,transparent:true});assets[actor+'/'+l.id+'/'+condition]=loaded;
   }
  }
  for(const id of ownership.keys())if(!ids.has(id))throw Error('owned layer missing '+id);
  for(const role of ['core','inner-surface','empty-socket'])if(!family.layers.some(l=>l.role===role))throw Error(role+' independent surface missing');
  if(family.wholeBodyIncludesDetachableStructure===true)throw Error('whole body reappears behind broken group');
  if(actor==='player'&&(family.defaultCosmetics||[]).some(id=>['red-hat','red-cloth'].includes(id)))throw Error('automatic red ornament not accepted');
  families[actor]=family;
 }
 return {manifest:m,assets,families,status:'ready-for-scene-check'};
}
root.AwaiPartbreakMaterialLoaderR8=Object.freeze({load});
})(globalThis);
