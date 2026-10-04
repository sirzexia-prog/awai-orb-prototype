(function(root){'use strict';
// Read-only inspection: never invoke SaveGuard.latest (which can settle a pending record).
async function read(){
 const local=Object.entries(localStorage).sort(([a],[b])=>a.localeCompare(b));
 if(typeof indexedDB.databases!=='function')throw Error('既存保存DBを新規作成せず確認できないため開始を止めます');
 const databases=await indexedDB.databases();let canonical=[];
 if(databases.some(d=>d.name==='awai.persistence.v1')){
  const connection=await new Promise((resolve,reject)=>{const r=indexedDB.open('awai.persistence.v1');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('canonical-read-blocked'));r.onupgradeneeded=()=>{r.transaction.abort();reject(Error('canonical-read-must-not-upgrade'));};});
  try{
   if(!connection.objectStoreNames.contains('sources'))throw Error('canonical-sources-missing');
   canonical=await new Promise((resolve,reject)=>{const tx=connection.transaction('sources','readonly'),store=tx.objectStore('sources'),keys=store.getAllKeys(),values=store.getAll();let k,v;keys.onsuccess=()=>k=keys.result;values.onsuccess=()=>v=values.result;tx.oncomplete=()=>resolve(k.map((key,i)=>({key,value:v[i]})));tx.onerror=tx.onabort=()=>reject(tx.error||Error('canonical-read-failed'));});
  }finally{connection.close();}
 }
 const source={version:1,local,canonical},bytes=new TextEncoder().encode(JSON.stringify(source)),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
 return {...source,snapshotId:'read-only-'+hash,sha256:hash};
}
root.AwaiPartbreakSourceR8=Object.freeze({read,normalWrites:0});
})(globalThis);
