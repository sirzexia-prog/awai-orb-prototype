(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory();else root.AwaiSortieRoutesR8=factory();})(globalThis,function(){'use strict';
const enemies=Object.freeze({rex:Object.freeze({id:'rex',name:'大牙',ready:false,reason:'大牙の非生物・部位用素材は未接続です。選択はそのままで、戦闘と報酬の開始を止めています。'}),robot:Object.freeze({id:'robot',name:'巨機',ready:true,reason:''})});
function enemy(value,fallback='robot'){return Object.hasOwn(enemies,value)?value:fallback;}
function describe(value){return enemies[enemy(value)];}
function url(base,{selected='robot',trial=false,slot=null,fitting=false,hash='',entry=null}={}){const u=new URL('partbreak-main-r8-v4.html',base);u.searchParams.set('enemy',enemy(selected));if(trial){u.searchParams.set('trial','1');if(slot&&/^[a-z0-9-]{8,48}$/.test(slot))u.searchParams.set('slot',slot);}if(fitting)u.searchParams.set('fitting','1');if(entry){u.searchParams.set('intent','start');u.searchParams.set('entry',entry);}if(hash)u.hash=hash;return u;}
function legacy(base,{selected='robot',trial=false,slot=null,battleId}={}){const u=new URL('realtime.html',base);u.searchParams.set('enemy',enemy(selected));u.searchParams.set('legacy','1');u.searchParams.set('legacyBattle',battleId);if(trial){u.searchParams.set('trial','1');if(slot)u.searchParams.set('slot',slot);}return u;}
function fittingKey(context){return 'awai.partbreak.fitting.r8'+context.suffix+'.'+context.enemy;}
return Object.freeze({enemy,describe,url,legacy,fittingKey});
});
