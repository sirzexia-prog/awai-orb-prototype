(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AwaiFittingDraft=factory();})(globalThis,function(){
 'use strict';const parts=['armor','crown','magic','dress','arms','trail'],clone=x=>JSON.parse(JSON.stringify(x));
 function encode(draft){return encodeURIComponent(JSON.stringify({version:1,appearance:clone(draft.appearance),parts:[...draft.parts],locomotion:draft.locomotion,weapon:draft.weapon}));}
 function decode(hash){try{const d=JSON.parse(decodeURIComponent(hash.replace(/^#/,'')));if(d.version!==1||!d.appearance||!Array.isArray(d.parts))return null;return {appearance:{...d.appearance,hue:Math.max(0,Math.min(359,Number(d.appearance.hue)||0))},parts:[...new Set(d.parts.filter(p=>parts.includes(p)))],locomotion:d.locomotion==='legs'?'legs':'hover',weapon:['sword','machinegun','thunder','none'].includes(d.weapon)?d.weapon:'sword'};}catch{return null;}}
 function url(page,draft,query=''){return page+(query?'?'+query:'')+'#'+encode(draft);}
 return {encode,decode,url};
});
