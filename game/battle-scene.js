(function(){
  'use strict';
  const C=AwaiSceneCombat,E=AwaiEngine,$=id=>document.getElementById(id),params=new URLSearchParams(location.search),family=['princess','machine'].includes(params.get('look'))?params.get('look'):'current';
  const trial=params.get('trial')==='1',requestedSlot=params.get('slot'),slot=trial&&/^[a-z0-9-]{8,48}$/.test(requestedSlot||'')?requestedSlot:null;
  const suffix=trial?(slot?'.trial.'+slot:'.trial'):'',KEY='awai.scene.review.v1.'+family+suffix;
  let source,restored=false;try{const loaded=E.load({getItem:key=>localStorage.getItem(key+suffix)});source=loaded.state;restored=loaded.restored;}catch{source=E.createState();}AwaiCombat.ensure(source);
  const back=new URL('index.html',location.href);if(trial){back.searchParams.set('trial','1');if(slot)back.searchParams.set('slot',slot);}document.querySelector('.scene-header a').href=back.href;
  if(family!=='current')document.querySelector('.scene-header span').textContent='装備の表示見本';
  const look={...source.appearance,parts:[...source.gameplay.equipped],locomotion:source.gameplay.locomotion};let stats=AwaiCombat.effective(source.gameplay);
  if(family!=='current'){look.parts=family==='princess'?['magic','crown','dress']:['armor','arms'];look.locomotion=family==='machine'?'legs':'hover';stats=AwaiCombat.effective({...source.gameplay,equipped:look.parts});}
  const signature=source.id+':'+JSON.stringify(look.parts)+':'+JSON.stringify(stats);let battle;try{const old=JSON.parse(localStorage.getItem(KEY));battle=old?.signature===signature?C.hydrate(old.battle):null;}catch{}if(!battle)battle=C.create(stats);
  const player=document.createElement('canvas'),enemy=document.createElement('canvas');for(const c of [player,enemy]){c.width=400;c.height=300;}AwaiCreature.draw(player,look,0,true,{facing:1,lightFromRight:true});AwaiCreature.drawEnemy(enemy,{id:'rock',hue:32},null,0,true);
  const sprites={player,enemy},canvas=$('scene-canvas'),motion=matchMedia('(prefers-reduced-motion: reduce)');let animation=null,frameTime=0,manualReduced=false;
  try{manualReduced=localStorage.getItem(KEY+'.motion')==='reduce';}catch{}
  const reduced=()=>motion.matches||manualReduced;
  function syncMotion(){const control=$('scene-reduced-motion');control.checked=reduced();control.disabled=motion.matches;$('scene-motion-note').textContent=motion.matches?'端末の動作軽減設定に合わせています。':'移動と光の変化を抑えます。';}
  syncMotion();motion.addEventListener('change',syncMotion);$('scene-reduced-motion').addEventListener('change',event=>{manualReduced=event.target.checked;try{localStorage.setItem(KEY+'.motion',manualReduced?'reduce':'full');}catch{}syncMotion();});
  function save(){try{localStorage.setItem(KEY,JSON.stringify({version:1,signature,battle}));}catch{$('scene-message').textContent='この戦闘の保存ができません。';}}
  function reset(){battle=C.create(stats,'scene-'+Date.now()+'-'+Math.random().toString(36).slice(2,8));animation=null;save();render();}
  function render(time=performance.now()){
    const p=animation?Math.min(1,(time-animation.started)/animation.duration):1,out=animation?.out;
    const hp=out&&p<.8?out.before.hp:battle.hp,enemyHp=out&&p<.36?out.before.enemyHp:battle.enemyHp,breath=out&&p<.28?out.before.breath:battle.breath;
    $('scene-player-name').textContent=source.name||'相棒';$('scene-player-hp').textContent=hp+' / '+battle.maxHp;$('scene-player-bar').max=battle.maxHp;$('scene-player-bar').value=hp;
    $('scene-enemy-hp').textContent=enemyHp+' / '+battle.enemyMaxHp;$('scene-enemy-bar').max=battle.enemyMaxHp;$('scene-enemy-bar').value=enemyHp;
    const charge=$('scene-breath');charge.replaceChildren();for(let i=0;i<4;i++){const dot=document.createElement('i');dot.className=i<breath?'full':'';charge.append(dot);}charge.setAttribute('aria-label','息 '+breath+' / 4');
    $('scene-intent').textContent=C.MOVES[out&&p<.93?out.before.intent:battle.intent].name;
    for(const button of document.querySelectorAll('[data-scene-action]'))button.disabled=!!animation||!C.allowed(battle,button.dataset.sceneAction);
    const result=$('scene-result');result.hidden=!battle.outcome||!!animation;$('scene-outcome').textContent=battle.outcome==='win'?'水庭に、光が戻った。':'ひと息ついて、もう一度。';
    $('scene-message').textContent=animation?'':battle.outcome?'':battle.opening?'殻が崩れている。':battle.intent==='slam'?'巻き岩が大きく体を持ち上げる。':battle.intent==='charge'?'周りの石が、浮きはじめた。':battle.returnPower?'受け返す構えを取った。':'次の一手を、きみが選ぶ。';
  }
  function act(action){if(animation)return;const out=C.resolve(battle,action,battle.id+':'+battle.turn);if(!out.ok)return;animation={action,out,started:performance.now(),duration:reduced()?500:out.events.some(x=>x.actor==='enemy'&&x.damage>0)?1650:1200};save();render();}
  function resize(){const rect=canvas.getBoundingClientRect(),ratio=Math.min(2,devicePixelRatio||1),w=Math.round(rect.width*ratio),h=Math.round(rect.height*ratio);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;} }
  new ResizeObserver(resize).observe($('scene-stage'));resize();
  function tick(time){if(time-frameTime>=30&&!document.hidden){frameTime=time;if(animation&&time-animation.started>=animation.duration){animation=null;render(time);}else if(animation)render(time);AwaiSceneWorld.draw(canvas,battle,{look,sprites,time,reduced:reduced(),effect:animation});}requestAnimationFrame(tick);}
  for(const button of document.querySelectorAll('[data-scene-action]'))button.addEventListener('click',()=>act(button.dataset.sceneAction));
  $('scene-menu').addEventListener('click',()=>{const list=$('scene-history');list.replaceChildren();battle.logs.slice().reverse().forEach(text=>{const li=document.createElement('li');li.textContent=text;list.append(li);});$('scene-details').showModal();});$('scene-details-close').addEventListener('click',()=>$('scene-details').close());
  $('scene-reset').addEventListener('click',()=>{if(confirm('この試作の戦闘だけをやり直します。普段の相棒と記録はそのままです。')){reset();$('scene-details').close();}});$('scene-retry').addEventListener('click',reset);
  window.AwaiScene={current:()=>JSON.parse(JSON.stringify(battle)),storageKey:KEY,busy:()=>!!animation,reduced,source:()=>JSON.parse(JSON.stringify({id:source.id,name:source.name,appearance:look,stats,storageKey:E.STORAGE_KEY+suffix,restored,preview:family!=='current'}))};
  save();render();requestAnimationFrame(tick);
})();
