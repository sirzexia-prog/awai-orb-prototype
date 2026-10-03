'use strict';
(() => {
  const form=document.getElementById('gate-form'),input=document.getElementById('password'),button=document.getElementById('enter'),status=document.getElementById('status');
  const base=new URL('./',location.href);
  const storageKey='awai.entry.v1:'+base.pathname;
  let config=null,busy=false;
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
  async function load(){
    try{
      const response=await fetch(new URL('password-config.json',base),{cache:'no-store',credentials:'omit'});
      if(!response.ok)throw Error('configuration unavailable');
      const candidate=await response.json();
      if(candidate.configured!==true){status.textContent='パスワードの設定を準備中です。';return;}
      if(candidate.algorithm!=='PBKDF2-SHA256'||!Number.isInteger(candidate.iterations)||candidate.iterations<210000||candidate.iterations>1000000||decode(candidate.salt).length!==16||decode(candidate.verifier).length!==32)throw Error('invalid configuration');
      if(!crypto.subtle)throw Error('secure context required');
      config=candidate;
      const sessionTag=config.salt+':'+config.verifier;
      try{if(sessionStorage.getItem(storageKey)===sessionTag){entry();return;}}catch{}
      setBusy(false);status.textContent='パスワードを入力してください。';
    }catch{status.textContent='入口を読み込めませんでした。時間をおいて再読み込みしてください。';}
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!config||busy)return;
    let password=input.value;input.value='';setBusy(true);status.textContent='パスワードを確認しています。';
    try{
      const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);password='';
      const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:decode(config.salt),iterations:config.iterations},material,256);
      if(encode(new Uint8Array(bits))!==config.verifier){status.textContent='パスワードが違うようです。もう一度入力してください。';setBusy(false);input.focus();return;}
      try{sessionStorage.setItem(storageKey,config.salt+':'+config.verifier);}catch{}
      entry();
    }catch{status.textContent='確認できませんでした。再読み込みしてお試しください。';setBusy(false);}
    finally{password='';input.value='';}
  });
  load();
})();
