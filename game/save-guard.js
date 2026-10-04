(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./engine.js'));else root.AwaiSaveGuard=factory(root.AwaiEngine);})(globalThis,function(E){
 'use strict';
 function stamp(raw){let x;try{x=JSON.parse(raw);}catch{}return {raw,id:x?.id||null,revision:Number.isSafeInteger(x?.saveRevision)&&x.saveRevision>=0?x.saveRevision:0};}
 function load(storage){let raw;try{raw=storage.getItem(E.STORAGE_KEY);}catch{return {...E.load(storage),stamp:null};}return {...E.load({getItem:()=>raw}),stamp:stamp(raw)};}
 function lock(scope,work,locks=globalThis.navigator?.locks){return locks?.request?locks.request('awai.save:'+scope,{mode:'exclusive'},work):Promise.reject(Error('save-lock-unavailable'));}
 let database;
 function db(){if(!database)database=new Promise((resolve,reject)=>{const request=indexedDB.open('awai.persistence.v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('sources');request.onsuccess=()=>resolve(request.result);request.onerror=()=>{database=null;reject(request.error);};request.onblocked=()=>reject(Error('canonical-storage-blocked'));});return database;}
 async function record(scope,value){const connection=await db();return new Promise((resolve,reject)=>{const tx=connection.transaction('sources',value===undefined?'readonly':'readwrite'),store=tx.objectStore('sources'),request=value===undefined?store.get(scope):store.put(value,scope);let result;request.onsuccess=()=>result=request.result;tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(tx.error||Error('canonical-storage-failed'));});}
 function memoryHost(){return typeof indexedDB==='undefined'&&typeof document==='undefined';}
 async function latest(storage,scope){
  if(memoryHost())return load(storage);
  if(typeof indexedDB==='undefined')throw Error('canonical-storage-unavailable');
  let saved=await record(scope);
  if(saved?.pending){
   // The durable full pending record is the accepted intent. Roll it forward under the
   // scope lock even if the process stopped before writing the legacy mirror.
   const pending=E.load({getItem:()=>saved.pending.raw});
   if(!pending.restored||pending.warning||stamp(saved.pending.raw).revision!==stamp(saved.raw).revision+1)throw Error('canonical-pending-invalid');
   if(storage.getItem(E.STORAGE_KEY)!==saved.pending.raw)storage.setItem(E.STORAGE_KEY,saved.pending.raw);
   saved={raw:saved.pending.raw};await record(scope,saved);
  }
  if(!saved)return load(storage);
  if(saved.raw!==null)try{if(storage.getItem(E.STORAGE_KEY)!==saved.raw)storage.setItem(E.STORAGE_KEY,saved.raw);}catch{}
  const loaded=E.load({getItem:()=>saved.raw});return {...loaded,stamp:stamp(saved.raw)};
 }
 function compare(current,expected,draft,replace){if(!expected||!current)return 'read-failed';if(current.id!==expected.id||current.revision!==expected.revision||current.raw!==expected.raw)return 'stale-source';if(!replace&&current.id&&draft.id!==current.id)return 'target-mismatch';if(current.revision>=Number.MAX_SAFE_INTEGER)return 'revision-limit';}
 async function writeDurable(storage,scope,draft,expected,{replace=false}={}){
  if(memoryHost())return write(storage,draft,expected,{replace});
  let current;try{current=await latest(storage,scope);}catch{return {ok:false,reason:'read-failed'};}
  const error=compare(current.stamp,expected,draft,replace);
  if(error){
   // Repair a renderer's stale mirror using the canonical full state, never the rejected draft.
   if(current.stamp?.raw!==null)try{storage.setItem(E.STORAGE_KEY,current.stamp.raw);}catch{}
   return {ok:false,reason:error,latest:current};
  }
  const next={...draft,saveRevision:current.stamp.revision+1},raw=JSON.stringify(next),previous=current.stamp.raw;
  try{
   // Reserve the full pending record before touching the legacy mirror. This also reserves quota.
   await record(scope,{raw:previous,pending:{raw}});
   if(!E.save(storage,next)){await record(scope,{raw:previous});return {ok:false,reason:'save-failed'};}
   await record(scope,{raw});return {ok:true,state:next,stamp:stamp(raw)};
  }catch{return {ok:false,reason:'save-failed'};}
 }
 function write(storage,draft,expected,{replace=false}={}){
  const latest=load(storage);if(!expected||!latest.stamp)return {ok:false,reason:'read-failed'};
  const current=latest.stamp;
  if(current.id!==expected.id||current.revision!==expected.revision||current.raw!==expected.raw)return {ok:false,reason:'stale-source',latest};
  if(!replace&&current.id&&draft.id!==current.id)return {ok:false,reason:'target-mismatch',latest};
  if(current.revision>=Number.MAX_SAFE_INTEGER)return {ok:false,reason:'revision-limit'};
  const next={...draft,saveRevision:current.revision+1};
  if(!E.save(storage,next))return {ok:false,reason:'save-failed'};
  return {ok:true,state:next,stamp:stamp(JSON.stringify(next))};
 }
 function commit(storage,scope,draft,expected,options={},locks){return lock(scope,()=>writeDurable(storage,scope,draft,expected,options),locks);}
 return {stamp,load,latest,lock,write,writeDurable,commit};
});
