'use strict';
(() => {
  const form=document.getElementById('gate-form'),input=document.getElementById('password'),button=document.getElementById('enter'),status=document.getElementById('status'),forget=document.getElementById('forget-entry'),continueButton=document.getElementById('continue-entry');
  const base=new URL('./',location.href),storageKey='awai.entry.v2:'+base.pathname,legacyKey='awai.entry.v1:'+base.pathname;
  const manage=new URLSearchParams(location.search).get('entry-settings')==='1';
  let config=null,configId=null,busy=false,remembered=false,storageAvailable=true;
  const decode=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
  const encode=bytes=>btoa(String.fromCharCode(...bytes));
  function entry(){
    const destination=new URL('game/index.html',base),query=new URLSearchParams(location.search);
    if(query.get('trial')==='1'){
      destination.searchParams.set('trial','1');
      const slot=query.get('slot');if(/^[a-z0-9-]{8,48}$/.test(slot||''))destination.searchParams.set('slot',slot);
    }
    location.replace(destination.href);
  }
  function setBusy(value){busy=value;input.disabled=value;button.disabled=value;button.textContent=value?'確認しています…':'相棒に会う';}
  function showRecord(){form.hidden=remembered;continueButton.hidden=!remembered;forget.disabled=!remembered;}
  async function load(){
    try{
      const response=await fetch(new URL('password-config.json',base),{cache:'no-store',credentials:'omit'});
      if(!response.ok)throw Error('configuration unavailable');
      const raw=await response.arrayBuffer(),candidate=JSON.parse(new TextDecoder().decode(raw));
      if(!crypto.subtle)throw Error('secure context required');
      // Only a non-secret configuration fingerprint is stored, never the verifier or input.
      configId=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)),b=>b.toString(16).padStart(2,'0')).join('');
      try{sessionStorage.removeItem(legacyKey);}catch{}
      try{const record=localStorage.getItem(storageKey);remembered=record===configId;if(record&&!remembered)localStorage.removeItem(storageKey);}catch{storageAvailable=false;remembered=false;}
      if(candidate.configured!==true){status.textContent='パスワードの設定待ちです。';return;}
      if(candidate.algorithm!=='PBKDF2-SHA256'||!Number.isInteger(candidate.iterations)||candidate.iterations<210000||candidate.iterations>1000000||decode(candidate.salt).length!==16||decode(candidate.verifier).length!==32)throw Error('invalid configuration');
      config=candidate;
      showRecord();
      if(remembered&&!manage){entry();return;}
      setBusy(false);status.textContent=remembered?'このブラウザの入場記録があります。':storageAvailable?'パスワードを入力してください。成功後、このブラウザで入場を記憶します。':'入場記録を保存できません。再訪する際もパスワードを入力してください。';
    }catch{status.textContent='入口を読み込めませんでした。時間をおいて再読み込みしてください。';}
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!config||busy)return;
    let password=input.value;input.value='';setBusy(true);status.textContent='パスワードを確認しています。';
    try{
      const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);password='';
      const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:decode(config.salt),iterations:config.iterations},material,256);
      if(encode(new Uint8Array(bits))!==config.verifier){status.textContent='パスワードが違うようです。もう一度入力してください。';setBusy(false);input.focus();return;}
      try{localStorage.setItem(storageKey,configId);}catch{storageAvailable=false;}
      entry();
    }catch{status.textContent='確認できませんでした。再読み込みしてお試しください。';setBusy(false);}
    finally{password='';input.value='';}
  });
  forget.addEventListener('click',()=>{
    try{localStorage.removeItem(storageKey);if(localStorage.getItem(storageKey)!==null)throw Error('record remains');}
    catch{status.textContent='入場記録を消せませんでした。ブラウザのサイトデータ設定から削除してください。';return;}
    try{sessionStorage.removeItem(legacyKey);}catch{}
    remembered=false;showRecord();setBusy(false);status.textContent='このブラウザの入場記録を消しました。次の入場にはパスワードが必要です。';input.focus();
  });
  continueButton.addEventListener('click',()=>{if(remembered)entry();});
  load();
})();
