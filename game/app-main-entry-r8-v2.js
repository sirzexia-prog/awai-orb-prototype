(function(){
  'use strict';
  const E=AwaiEngine,C=AwaiCombat,P=AwaiProviders,U=AwaiUiCopy,$=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search),trial=params.get('trial')==='1';
  const requestedSlot=params.get('slot'),trialSlot=trial&&/^[a-z0-9-]{8,48}$/.test(requestedSlot||'')?requestedSlot:null;
  const storageSuffix=trial?(trialSlot?'.trial.'+trialSlot:'.trial'):'';
  const trialName='試遊枠';
  let storage;
  try {const disk=window.localStorage;storage={getItem:k=>disk.getItem(k+storageSuffix),setItem:(k,v)=>disk.setItem(k+storageSuffix,v)};} catch {storage={getItem(){throw Error('storage-unavailable');},setItem(){throw Error('storage-unavailable');}};}
  const G=AwaiSaveGuard,SCOPE=E.STORAGE_KEY+storageSuffix,loaded=G.load(storage);let observed=loaded.stamp,epoch=0,saveChain=Promise.resolve(),pendingSaves=0,lastSaveResult=null,navigationBusy=false,entryToken=null;
  const sceneLink=new URL('realtime.html',location.href);sceneLink.searchParams.set('intent','start');if(trial){sceneLink.searchParams.set('trial','1');if(trialSlot)sceneLink.searchParams.set('slot',trialSlot);}$('scene-entry').href=sceneLink.href;
  const previewLink=new URL('preview.html',location.href);if(trial){previewLink.searchParams.set('trial','1');if(trialSlot)previewLink.searchParams.set('slot',trialSlot);}for(const id of ['all-equipment-tab','all-equipment-preview','all-equipment-custom'])if($(id))$(id).href=previewLink.href;
  let state=loaded.state, view='home', busy=false, actionLock=false, toastTimer, confirmAction=null, sequence=0;
  let lookMode='current',reviewingReward=false,battleEffect=null,lastPaint=0;
  const openEnemyNotes=new Set();
  C.ensure(state);
  if(state.gameplay.battle)view='home';
  const conversationProvider=new P.DemoConversationProvider();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const date=time=>new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(time);
  const token=()=>state.id+'-'+Date.now()+'-'+(++sequence);
  const element=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  function warrior(fresh=false){E.customize(state,{...state.baseStyle,color:270,tone:'black',eyeColor:'#ffffff',weapon:'sword',weaponChosen:true,weaponRevision:(state.baseStyle.weaponRevision||0)+1,eyes:'hollow',mouth:'none'});if(fresh){state.gameplay.trialStarterParts=['armor','arms'];C.ensure(state);}state.gameplay.equipped=['armor','arms'].filter(id=>state.gameplay.parts.includes(id));state.gameplay.locomotion='hover';state.customized=true;}
  if(trial&&!loaded.restored){warrior(true);persist();}
  $('custom-settings').append($('customizer'),$('equipment-details'));
  $('equipment-details').open=true;const oldBattleTitle=document.querySelector('.battle-intro h1');if(oldBattleTitle)oldBattleTitle.textContent='保存中の旧戦闘';
  $('customizer').hidden=false;
  const studio=document.querySelector('.target-studio'),details=element('details','secondary-play'),summary=element('summary','','獲得したいパーツを確認');details.append(summary,studio);$('custom-settings').append(details);details.hidden=false;details.open=true;$('play-controls').prepend(details);const legacy=element('button','secondary full','以前の戦闘の続き');legacy.id='legacy-battle-entry';legacy.hidden=!state.gameplay.battle;legacy.addEventListener('click',()=>switchView('legacy'));$('play-controls').append(legacy);
  for(const id of ['custom-fight','home-fight','scene-entry']){$(id).href=sceneLink.href;$(id).addEventListener('click',event=>{event.preventDefault();enterScene($(id).href);});}
  const giantLink=new URL(sceneLink);giantLink.searchParams.set('enemy','robot');for(const [id,host] of [['giant-home-entry',$('play-controls')],['giant-custom-entry',document.querySelector('#custom-view .custom-links')]]){const link=element('a','button-link','巨機と戦う · 部位破壊と核抜き');link.id=id;link.href=giantLink.href;link.addEventListener('click',event=>{event.preventDefault();enterScene(link.href);});host.append(link);}
  const past=element('a','button-link','これまでの戦い・獲得したもの');const historyLink=new URL('results.html',location.href);if(trial){historyLink.searchParams.set('trial','1');if(trialSlot)historyLink.searchParams.set('slot',trialSlot);}past.href=historyLink.href;past.addEventListener('click',event=>{event.preventDefault();enterScene(past.href);});document.querySelector('.custom-links').append(past);
  $('home-view').prepend(document.querySelector('.goal-card'));
  if(!state.customized)view='custom';
  if(['home','custom','battle','growth','legacy'].includes(params.get('view')))view=params.get('view');
  const continuationCopy='進行中の一戦へ戻ります。外装・色・顔・脚は次の新規出撃から反映します。武器・方針は次の行動から変わります。進行中の一撃は開始時の武器で最後まで動きます。能力・戦闘の進み・報酬は保持します。';
  const sortieNotice=element('p','small-label');sortieNotice.id='sortie-notice';document.querySelector('#custom-view .custom-links').before(sortieNotice);
  const homeNotice=element('p','small-label');homeNotice.id='home-sortie-notice';$('play-controls').before(homeNotice);
  const entryLabels=Object.fromEntries(['custom-fight','home-fight','scene-entry'].map(id=>[id,$(id).textContent]));
  function hasContinuation(enemy='rex'){try{const saved=JSON.parse(localStorage.getItem('awai.scene.realtime.v1'+storageSuffix+(enemy==='robot'?'.robot':'')));return saved?.battle&&!saved.battle.outcome&&(saved.sourceId===state.id||saved.signature?.startsWith(state.id+'{'));}catch{return false;}}
  function renderSortieNotice(){const live=hasContinuation(),goalLive=hasContinuation(C.goalPlan(state.gameplay).foe==='robot'?'robot':'rex');sortieNotice.hidden=!live;sortieNotice.textContent=live?continuationCopy:'';homeNotice.hidden=!(live||goalLive);homeNotice.textContent=live||goalLive?continuationCopy:'';for(const id of Object.keys(entryLabels))$(id).textContent=live?'進行中の一戦へ戻る':entryLabels[id];if(goalLive)$('go-battle').textContent='進行中の一戦へ戻る';}
  function persist(options={}){const draft=JSON.parse(JSON.stringify(state)),generation=epoch;pendingSaves++;$('save-status').textContent='保存中…';saveChain=saveChain.then(async()=>{if(generation!==epoch)return {ok:false,reason:'superseded'};let result;try{result=await G.commit(storage,SCOPE,draft,observed,options);}catch{result={ok:false,reason:'lock-unavailable'};}if(generation!==epoch)return result;if(result.ok){observed=result.stamp;state.saveRevision=result.state.saveRevision;$('save-status').textContent='保存しました';}else{if(result.latest){epoch++;state=result.latest.state;observed=result.latest.stamp;C.ensure(state);busy=false;actionLock=false;render();}$('save-status').textContent=result.reason==='stale-source'||result.reason==='target-mismatch'?'別の画面で更新されています。最新の相棒を読み直しました。操作をもう一度選んでください。':result.reason==='lock-unavailable'?'このブラウザでは安全に保存できません。対応ブラウザで再読込してください。':'保存できません。この画面を閉じると記録が失われます';}lastSaveResult=result;$('save-status').classList.toggle('warning',!result.ok);return result;}).finally(()=>pendingSaves--);return saveChain;}
  function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,3000);}
  function closeReward(){reviewingReward=false;const r=state.gameplay.result;if(r?.reward&&!r.rewardDismissed){r.rewardDismissed=true;persist();}}
  async function enterScene(url=sceneLink.href){if(navigationBusy)return;navigationBusy=true;let navigating=false;const generation=epoch;try{if(pendingSaves)toast('保存を待って水庭へ移動します…');let waiting;do{waiting=saveChain;await waiting;}while(waiting!==saveChain||pendingSaves>0);const refreshed=lastSaveResult&&['stale-source','target-mismatch'].includes(lastSaveResult.reason)&&lastSaveResult.latest?.restored&&!lastSaveResult.latest.warning;if(generation!==epoch||lastSaveResult&&!lastSaveResult.ok&&!refreshed){toast('保存が完了していません。育成画面で操作を再試行してください。');return;}const target=new URL(url,location.href);if(target.pathname.endsWith('/realtime.html')&&target.searchParams.get('enemy')==='robot'){target.pathname=target.pathname.replace(/realtime\.html$/,'partbreak-main-r8.html');}if(target.pathname.endsWith('/realtime.html')||target.pathname.endsWith('/partbreak-main-r8.html')){target.searchParams.set('intent','start');entryToken ||= Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);target.searchParams.set('entry',entryToken);}navigating=true;location.href=target.href;}catch{toast('保存できません。育成画面で再試行してください。');}finally{if(!navigating)navigationBusy=false;}}
  function switchView(next){if(next==='battle'){enterScene();return;}if(next==='legacy')next='battle';if(view==='battle'&&next!=='battle')closeReward();view=next;for(const name of ['home','battle','memories','growth','custom'])$(name+'-view').hidden=name!==view;document.querySelectorAll('.tab').forEach(b=>{const active=b.dataset.view===view;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});render();}
  function render(){
    const rule=document.querySelector('.training-rule');if(rule)rule.textContent='最後の訓練が、一戦だけの構えになります。成長経験3回で基礎能力+1。基礎上限：'+Object.keys(C.DRILLS).map(k=>C.DRILLS[k].stat+' '+C.displayBaseCap(k)).join('・')+'。訓練せずに挑んでもOK。戦闘が終わると訓練回数は3回に戻ります。';
    $('creature-name').textContent=state.name;
    $('growth-label').textContent=E.growthLabel(state);
    $('visit-label').textContent='いっしょの経験 '+state.actions;
    $('size-progress').max=C.availableParts(state.gameplay).length;$('size-progress').value=state.gameplay.equipped.length;
    $('size-label').textContent=state.gameplay.equipped.length+'装備 · '+(state.gameplay.locomotion==='legs'?'歩行':'浮遊');
    $('appearance-mode').textContent=state.autoGrow?'経験とともに育つ':'この姿を保つ';
    $('customizer').hidden=false;$('begin').hidden=state.customized;
    $('play-controls').hidden=!state.customized;
    document.body.classList.toggle('playing',state.customized);
    $('memory-count').textContent=state.memories.length;
    $('milestone-label').textContent=state.actions<6?'姿の変化を感じるまで':'いっしょに育っている';
    $('milestone-count').textContent=state.actions<6?'あと'+(6-state.actions)+'回':'経験 '+state.actions+'回';
    $('milestone-progress').value=Math.min(6,state.actions);
    $('auto-grow').checked=state.autoGrow;
    $('tendency').textContent=E.growthLabel(state);
    const face={hollow:'縦長の塗りつぶした目',oval:'まるい目',line:'すっとした目',arc:'にこっとした目'}[state.baseStyle.eyes];
    $('morph-description').textContent=face+'と選んだ口、丸い核の大きさは、そのまま。訓練と戦闘で経験を残し、勝ち取った装備でシルエットが広がります。光と動きも経験で変わります。装備と脚は育成画面で変更できます。';
    const log=$('dialogue');log.replaceChildren();
    const chats=state.chats.length?state.chats.slice(-4):[{role:'companion',text:'ぼく、まだ弱いけど。強くなったら先頭を歩くんだ。今日は何をする？'}];
    chats.forEach(c=>log.append(element('div','bubble'+(c.role==='user'?' user':''),c.role==='companion'?U.companion(c.text):c.text)));
    log.scrollTop=log.scrollHeight;
    const event=state.pendingEvent;
    $('event-card').hidden=!event;
    $('event-heading').textContent=event?event.prompt:'';
    const choices=$('event-choices');choices.replaceChildren();
    if(event) for(const kind of event.choices){const b=element('button','',({explore:'光をたどる',care:'そばに座る',calm:'風を感じる'})[kind]);b.dataset.event=kind;b.disabled=actionLock;b.addEventListener('click',()=>perform(kind,event.id,true));choices.append(b);}
    $('message').disabled=busy||!!event||!!state.gameplay.battle;$('send').disabled=$('message').disabled;
    $('message').placeholder=event?'先に、出来事をひとつ選んでね':'次は、どうする？';
    document.querySelectorAll('[data-message]').forEach(b=>b.disabled=$('message').disabled);
    document.querySelectorAll('[data-care]').forEach(b=>b.disabled=busy||actionLock||!!event||!!state.gameplay.battle);
    for(const [attr,key] of [['color','color'],['eyes','eyes'],['mouth','mouth'],['tone','tone'],['eye-color','eyeColor'],['weapon','weapon']])document.querySelectorAll('[data-'+attr+']').forEach(b=>{const active=String(state.baseStyle[key])===b.getAttribute('data-'+attr);b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
    if(view==='memories')renderMemories();
    if(view==='growth')renderGrowth();
    renderGameplay();renderSortieNotice();drawCompanion(0,true);
  }
  async function talk(message){
    message=E.clean(message);
    if(!message||busy||state.pendingEvent||state.gameplay.battle||!state.customized)return;
    const conversationState=state,conversationEpoch=epoch;busy=true;render();
    try {
      const response=await conversationProvider.respond({message,state});
      if(state!==conversationState||epoch!==conversationEpoch)return;E.startConversation(state,message,response,token());$('message').value='';persist();render();
      $('event-card').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'nearest'});
    }catch{toast('返事を用意できませんでした。もう一度話しかけてね。');}
    finally{busy=false;render();}
  }
  function perform(kind,id,fromEvent=false){
    if(actionLock||!state.customized||state.gameplay.battle)return;
    actionLock=true;
    const result=E.act(state,kind,id,Date.now(),fromEvent);
    if(result.ok){persist();render();toast(result.milestone?'いっしょの経験が、姿にも。思い出を記録しました。':'思い出をひとつ、記録しました。');}
    else {actionLock=false;render();return;}
    setTimeout(()=>{actionLock=false;render();},650);
  }
  function lockAction(action,delay=400){
    if(actionLock)return;actionLock=true;
    const out=action();
    if(out?.ok){persist();render();if(out.line)toast(U.companion(out.line));}
    else {actionLock=false;if(out?.error)toast(out.error);render();return;}
    setTimeout(()=>{actionLock=false;render();},delay);
  }
  function startFight(foe,variant=null){
    if(actionLock)return;
    if(!state.customized){toast('最初の色と顔を選んで、はじめよう。');switchView('home');return;}
    const out=C.start(state,foe,token(),Date.now(),variant);if(!out.ok)return;
    clearTimeout(toastTimer);$('toast').hidden=true;
    persist();switchView('battle');window.scrollTo({top:0,behavior:'instant'});
  }
  function drawEnemy(canvas,foe,move){AwaiCreature.drawEnemy(canvas,foe,move);}
  function renderGameplay(){
    const g=state.gameplay,base=C.stats(g),s=C.effective(g),b=g.battle,showReward=!!g.result?.reward&&(!g.result.rewardDismissed||reviewingReward);
    const plan=C.goalPlan(g);
    $('goal-heading').textContent=plan.next;$('legacy-battle-entry').hidden=!g.battle;
    renderTarget(plan);
    $('partner-line').textContent=b?'戦ってる途中だよ。次の指示、待ってる！':U.companion(g.result?.line)||(g.condition?C.DRILLS[g.condition].line:'水庭の大牙と戦って、浮遊パーツを集めよう。動きはぼくにまかせて！');
    $('go-battle').textContent='この姿で水庭へ · 勝利で成長';
    $('training-budget').textContent=b?'戦闘中': '訓練 残り'+g.slots+'回';
    const statBox=$('stats');statBox.replaceChildren();
    for(const k of Object.keys(C.DRILLS)){const n=element('div','stat');n.append(element('span','',C.DRILLS[k].stat),element('strong','',C.displayStat(s,k)),element('small','',U.statDetail(C,g,base,k)));statBox.append(n);}
    $('condition').textContent=g.condition?'今回の訓練効果：'+U.statEffect(C.DRILLS[g.condition].effect):'訓練は任意。能力を整えたら、そのまま戦闘へ。';
    renderTraining($('training-options'),g,base);
    $('scout').hidden=true;$('scout-note').hidden=true;$('scout').disabled=actionLock||!!b||g.scouted;$('scout-note').textContent=g.scouted?'巻き岩：ためた後は大技、その次は息切れ。殻の間は息を戻そう。':'相手の癖を調べられるのは各戦闘の前に1回。訓練回数は使いません。';
    const gear=$('gear-list');gear.replaceChildren();
    for(const id of C.availableParts(g)){const part=C.PARTS[id],owned=g.parts.includes(id),equipped=g.equipped.includes(id),card=element('article','gear-card'+(owned?'':' locked')),cv=element('canvas');cv.width=320;cv.height=230;cv.setAttribute('role','img');cv.setAttribute('aria-label',part.name+'を付けた姿');AwaiCreature.draw(cv,{...state.appearance,parts:[id],locomotion:g.locomotion},0,true);const info=element('div');info.append(element('h3','',part.name),element('p','',U.statEffect(part.effect)),element('p','',U.system(part.description)));const button=element('button',equipped?'selected':'',owned?(equipped?'装着中 · 外す':'装着する'):C.partCondition(id));button.dataset.equip=id;button.disabled=!owned||!!b||actionLock;button.addEventListener('click',()=>{if(C.equip(state,id)){recordOutfit(part.name+(g.equipped.includes(id)?'を装着':'を外した'));persist();render();}});info.append(button);card.append(cv,info);gear.append(card);}
    document.querySelectorAll('[data-locomotion]').forEach(button=>{button.disabled=!!b;button.classList.toggle('selected',button.dataset.locomotion===g.locomotion);button.setAttribute('aria-pressed',String(button.dataset.locomotion===g.locomotion));});
    const foes=$('foe-list');foes.replaceChildren();foes.hidden=!!b;
    for(const f of C.FOES){const allowed=C.unlocked(g,f.id),card=element('article','foe-card'+(f.id===plan.foe&&!plan.variant?' goal-foe':'')),cv=element('canvas');cv.width=320;cv.height=220;cv.setAttribute('role','img');cv.setAttribute('aria-label',f.name);drawEnemy(cv,f);const text=element('div','foe-info');text.append(element('span','eyebrow',f.id===plan.foe&&!plan.variant?'目標への次の相手':f.tag),element('h2','',f.name),element('p','',U.system(f.description)),element('small','small-label','体力 '+f.hp+' · '+f.limit+'手以内'+(g.wins[f.id]?' · 勝利 '+g.wins[f.id]+'回':'')),renderEnemyNotes(g,f.id));const button=element('button',allowed?'primary':'',allowed?'挑む':f.id==='spark'?'巻き岩に勝つと解放':'はね火に勝つと解放');button.dataset.foe=f.id;button.disabled=!allowed||!state.customized||actionLock;button.addEventListener('click',()=>startFight(f.id));text.append(button);card.append(cv,text);foes.append(card);}
    $('fight').hidden=!b;
    $('battle-prep').hidden=!!b;
    $('reward-review').hidden=!!b||!g.result?.reward||showReward;
    $('prep-budget').textContent='訓練 残り'+g.slots+'回';
    $('prep-stats').textContent='打撃 '+C.displayStat(s,'power')+'　守り '+s.guard+'　集中 '+s.focus;
    $('prep-condition').textContent=g.condition?'最後の訓練の効果：'+C.DRILLS[g.condition].name:'訓練は任意です。選ぶと今回の得意な能力が変わります。';
    renderTraining($('prep-training'),g,base);
    const prepParts=$('prep-parts');prepParts.replaceChildren();$('prep-loadout').hidden=!g.parts.length;
    for(const id of g.parts){const p=C.PARTS[id],on=g.equipped.includes(id),button=element('button',on?'selected':'',p.name+(on?' · 装着中':'')+' / '+U.statEffect(p.effect));button.dataset.prepEquip=id;button.disabled=!!b||actionLock;button.setAttribute('aria-pressed',String(on));button.addEventListener('click',()=>{if(C.equip(state,id)){recordOutfit(p.name+(g.equipped.includes(id)?'を装着':'を外した'));persist();render();}});prepParts.append(button);}
    if(g.wins.echo){const f=C.REMATCH,card=element('article','foe-card rematch-card'),cv=element('canvas');cv.width=320;cv.height=220;cv.setAttribute('role','img');cv.setAttribute('aria-label',f.name);drawEnemy(cv,f);const info=element('div','foe-info');info.append(element('span','eyebrow',U.system(f.tag)),element('h2','',f.name),element('p','',U.system(f.description)),element('small','small-label','体力 '+f.hp+' · '+f.limit+'手以内'+(g.rematchWins?' · 再戦勝利 '+g.rematchWins+'回':'')),renderEnemyNotes(g,'rock','rematch'));const choices=element('div','challenge-choices');for(const [key,goal] of Object.entries(C.CHALLENGE_GOALS)){const pick=element('button',g.challengeGoal===key?'selected':'',goal.name+(g.challengeMarks.includes(key)?' · 達成':''));pick.dataset.challengeGoal=key;pick.disabled=!!b;pick.setAttribute('aria-pressed',String(g.challengeGoal===key));pick.addEventListener('click',()=>{if(C.setChallengeGoal(state,key)){persist();render();}});choices.append(pick);}info.append(element('p','small-label','選択は今回の目安。勝利で満たした条件の印を、すべて記録します。'),choices);const button=element('button','primary','この目安で、再戦');button.dataset.rematch='rock';button.disabled=!!b||actionLock;button.addEventListener('click',()=>startFight('rock','rematch'));info.append(button);card.append(cv,info);if(plan.variant==='rematch')card.classList.add('goal-foe');foes.prepend(card);}
    if(C.chapterUnlocked(g))renderChapterCard(foes,g,plan);
    $('battle-result').hidden=!!b||!g.result;
    document.querySelector('.battle-intro').hidden=!!b;
    $('battle-view').insertBefore($('battle-result'),$('battle-prep'));
    if(g.result){const r=g.result,f=C.encounterFor(r);$('result-tag').textContent=r.outcome==='win'?(r.foe==='gate'?'勝利 · 境界の庭をクリア':r.variant==='rematch'?'勝利 · '+r.achievedMarks.length+'条件達成':'勝利 · 挑戦クリア'):'敗北 · 次の作戦';$('result-title').textContent=r.reward?C.PARTS[r.reward].name+'を獲得！':f.name+'に'+(r.outcome==='win'?'勝った！':'届かなかった。');$('result-line').textContent=U.companion(r.line);$('result-reason').textContent=U.system(r.reason);$('result-numbers').textContent=r.turns+'手 · 与えた '+r.dealt+' / 受けた '+r.taken+' · 姿の経験 +1';$('retrain').textContent=r.outcome==='win'?'構えを変えて試す':'鍛え直す';$('retrain').parentElement.hidden=false;renderReward(r);}
    if(g.result){const r=g.result,record=g.records[r.variant||r.foe],names=keys=>keys.map(k=>C.CHALLENGE_GOALS[k].name).join(' / ');let earned='';if(r.variant==='rematch'&&r.outcome==='win'){earned=r.earnedMarks.length?'達成印を獲得！ '+names(r.earnedMarks)+'。 ':r.achievedMarks.length?'今回も達成：'+names(r.achievedMarks)+'（印は記録済み）。 ':'今回の条件達成はありません。 ';if(r.goal&&!r.achievedMarks.includes(r.goal))earned+='選んだ目安は未達：'+C.CHALLENGE_GOALS[r.goal].name+'。 ';}$('result-record').hidden=!record;$('result-record').textContent=record?earned+(r.recordTurns?'手数の自己ベスト更新！ ':r.recordTaken?'被害の自己ベスト更新！ ':r.recordFirst?'この勝利からベストを記録。 ':'')+'自己ベスト：最短 '+record.turns+'手 / 最少被害 '+record.taken+'（別々の記録）':'';}
    if(!b)return;
    const f=C.encounterFor(b),m=C.moveFor(b);
    $('fight-name').textContent=state.name+' vs '+f.name;$('fight-turn').textContent=b.turn+' / '+f.limit+'手';
    $('fighter-name').textContent=state.name;$('enemy-name').textContent=f.name;
    $('player-hp').textContent=b.hp+' / '+b.maxHp;$('player-hp-bar').max=b.maxHp;$('player-hp-bar').value=b.hp;
    $('enemy-hp').textContent=b.enemyHp+' / '+f.hp;$('enemy-hp-bar').max=f.hp;$('enemy-hp-bar').value=b.enemyHp;
    drawFight(0,true);
    const tutorial=f.id==='rock'&&b.tutorial&&b.variant!=='rematch';
    $('move-name').textContent=m.label;$('move-hint').textContent=m.hint;$('move-facts').textContent=tutorial?'':m.facts;
    const goalNote=b.variant==='rematch'?'今回の目安：'+C.CHALLENGE_GOALS[b.goal].name+' · 満たした印はすべて記録':'';
    $('phase-notice').hidden=!m.phaseNotice&&!goalNote;$('phase-notice').textContent=m.phaseNotice||goalNote;
    $('rebound-rule').hidden=b.rules<1;
    $('readiness-rule').hidden=b.rules<3;
    $('breath').textContent='息 '+b.breath+' / 4'+(b.rebound?' · 返し +'+b.rebound:'')+(b.readiness?' · 見据え +2':'');$('fight-stats').textContent='打撃 '+C.displayStat(b.stats,'power')+' · 守り '+b.stats.guard+' · 集中 '+b.stats.focus;
    const actions=$('battle-actions');actions.replaceChildren();const turnToken=b.id+':'+b.turn;
    for(const [action,label] of [['attack','攻撃'],['defend','防御'],['counter','見切り']]){const p=C.preview(b,action),button=element('button','battle-action'+(action==='attack'?' attack':''));button.dataset.battleAction=action;button.disabled=actionLock||b.breath<p.cost;const summary=tutorial?'与えた '+p.damage+' / 受けた '+p.incoming:action==='attack'?(b.foe==='gate'?'通る威力 '+p.damage:'基本 '+(b.stats.power+2+(b.rebound||0))):action==='defend'?'軽減 '+(4+b.stats.guard*2):'成功時 '+(b.foe==='gate'&&!b.gateOpen?1:b.stats.focus+3);button.append(element('strong','',label),element('span','',summary),element('small','',action==='defend'?'息 +2':'息 −'+p.cost));button.addEventListener('click',()=>lockAction(()=>{const out=C.choose(state,action,turnToken);if(out.ok){battleEffect={action,started:performance.now()};$('battle-feedback').textContent=U.battleLog(out.log);if(out.finished){clearTimeout(toastTimer);$('toast').hidden=true;window.scrollTo({top:0,behavior:'instant'});}}return out;},300));actions.append(button);}
    const logs=$('battle-log');logs.replaceChildren();b.logs.slice(-3).forEach(x=>logs.append(element('li','',U.battleLog(x))));
    if(b.turn===1)$('battle-feedback').textContent='ぼく、いくよ。最初の指示は？';
  }
  function renderChapterCard(foes,g,plan){
    const f=C.CHAPTER_ROUTES[g.chapterRoute],card=element('article','foe-card chapter-card'+(plan.foe==='gate'?' goal-foe':'')),cv=element('canvas');cv.width=320;cv.height=220;cv.setAttribute('role','img');cv.setAttribute('aria-label','星の軌跡を重ねた獲得後の姿の予告');AwaiCreature.draw(cv,{...state.appearance,parts:[...new Set([...g.equipped,'trail'])],locomotion:g.locomotion},0,true);const info=element('div','foe-info');
    info.append(element('span','eyebrow','次章 · 境界の庭'),element('h2','','星の軌跡へ'),element('p','','閉じた門に通る威力は1。どちらかの道で門をひらき、3手の隙を使って越えよう。初クリアで外付けの星を獲得。'),element('small','small-label','体力24 · 12手以内 · 選ぶ道でひらき方が変わる'));
    const choices=element('div','challenge-choices');for(const [key,route] of Object.entries(C.CHAPTER_ROUTES)){const pick=element('button',g.chapterRoute===key?'selected':'',(key==='shield'?'盾の道 · 受け切る':'風の道 · 見切る')+(g.chapterWins[key]?' · クリア':''));pick.dataset.chapterRoute=key;pick.disabled=!!g.battle;pick.setAttribute('aria-pressed',String(g.chapterRoute===key));pick.addEventListener('click',()=>{if(C.setChapterRoute(state,key)){persist();render();}});choices.append(pick);}info.append(element('p','small-label','左は獲得後の姿の予告。能力はそのまま、ほかの装備と自由に重ねられます。'),choices,element('p','',U.system(f.description)),renderEnemyNotes(g,'gate',f.variant));
    const go=element('button','primary',g.chapterRoute==='shield'?'盾の道へ挑む':'風の道へ挑む');go.dataset.chapterStart=g.chapterRoute;go.disabled=!!g.battle||actionLock;go.addEventListener('click',()=>startFight('gate',f.variant));info.append(go);card.append(cv,info);foes.prepend(card);
  }
  function renderEnemyNotes(g,foe,variant=null){
    const key=variant||foe,n=C.preparationNotes(g,foe,variant),box=element('details','enemy-notes');box.dataset.enemyNotes=key;box.open=openEnemyNotes.has(key);
    const attacks=n.moves.filter(m=>m.guard!==null),strongest=attacks.sort((a,b)=>b.damage-a.damage)[0];
    box.append(element('summary','',strongest?U.moveNoun(strongest)+'を受け切るには守り'+strongest.guard+'が必要（今は'+n.guard+'）':'経験メモ · '+(n.moves.length?'守り崩しを経験':'まだ確かめた動きなし')));
    if(n.moves.length){box.append(element('p','notes-current','今：守り '+n.guard+' / 集中 '+n.focus));for(const m of n.moves)box.append(element('p','',U.moveNoun(m)+'：衝撃 '+m.damage+(m.guard===null?' · 通常の防御軽減なし':' · 受け切りに守り '+m.guard+' / 見切りに集中 '+m.focus)));box.append(element('small','small-label','見切りは今の集中に、見据えがあれば +2。未経験の動きは載せていません。'));if(n.opening)box.append(element('p','',foe==='gate'?'経験した変化：この道の合図で門がひらく。3手の間、打撃と見切りを通せる。':'経験した変化：大技を崩すと、次の殻がほどけて隙になる。'));}else box.append(element('p','','実際に受けた合図が、次の準備に残ります。'));
    box.addEventListener('toggle',()=>{if(box.isConnected)box.open?openEnemyNotes.add(key):openEnemyNotes.delete(key);});return box;
  }
  function renderTraining(container,g,base){container.replaceChildren();for(const [kind,d] of Object.entries(C.DRILLS)){const button=element('button','drill');button.dataset.train=kind;button.disabled=actionLock||!!g.battle||g.slots<=0;button.append(element('strong','',d.name),element('span','',U.statEffect(d.effect)),element('small','',C.growthProgress(g,kind).atCap?'基礎 '+C.growthProgress(g,kind).base+' / 上限 '+C.displayBaseCap(kind)+' · 構えは選べる':'基礎 '+C.growthProgress(g,kind).base+' / 上限 '+C.displayBaseCap(kind)+' → 次の能力+1まで 成長経験 '+C.growthProgress(g,kind).untilNext+'回'));const id=token();button.addEventListener('click',()=>lockAction(()=>C.train(state,kind,id)));container.append(button);}}
  function renderTarget(plan){
    const g=state.gameplay;
    $('target-heading').textContent=state.name+'の育てたい姿';
    $('target-mode-label').textContent=lookMode==='current'?'今の姿':C.GOALS[g.goal]?.name||'自分の組合せ';
    document.querySelectorAll('[data-goal]').forEach(b=>{const active=b.dataset.goal===g.goal;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
    document.querySelectorAll('[data-look]').forEach(b=>{const active=b.dataset.look===lookMode;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
    $('target-description').textContent=lookMode==='current'?'丸い核と顔はそのまま。目標に切り替えて、育てたい姿を選ぼう。':plan.missing.length?'薄い装備は未獲得。取れる条件を下に表示しています。組合せは自由です。':'目標の装備はすべて獲得済み。脚あり・浮遊も、組み替えも自由です。';
    $('target-progress-text').textContent='目標の装備：'+plan.total+'つ中'+plan.owned.length+'つ獲得（装着'+g.goalParts.filter(id=>g.equipped.includes(id)).length+'）';
    $('target-progress').max=Math.max(1,plan.total);$('target-progress').value=plan.owned.length;
    const parts=$('target-parts');parts.replaceChildren();
    for(const id of C.availableParts(g)){const p=C.PARTS[id],button=element('button','',p.name+(g.parts.includes(id)?' · 所持':' · '+C.partCondition(id)));const selected=g.goalParts.includes(id);button.dataset.goalPart=id;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));button.addEventListener('click',()=>{C.toggleGoalPart(state,id);lookMode='target';persist();render();});parts.append(button);}
    const ownedDesired=g.goalParts.filter(id=>g.parts.includes(id));$('target-equip').hidden=!ownedDesired.length;$('target-equip').disabled=!!g.battle||ownedDesired.length===g.equipped.length&&ownedDesired.every(id=>g.equipped.includes(id));
    drawTarget(0,true);
  }
  function drawTarget(time,reducedMotion){const g=state.gameplay;drawReward($('target-avatar'),{...state.appearance,parts:lookMode==='target'?g.goalParts:g.equipped,lockedParts:lookMode==='target'?g.goalParts.filter(id=>!g.parts.includes(id)):[],locomotion:g.locomotion},time,reducedMotion);}
  function renderReward(result){
    const id=result.reward,part=C.PARTS[id];$('reward-preview').hidden=!part;if(!part)return;
    const options=$('reward-options');options.replaceChildren();
    const rewards=result.rewards?.length?result.rewards:[id];
    if(rewards.length>1)for(const choice of rewards){const b=element('button',choice===id?'selected':'',C.PARTS[choice].name);b.dataset.reward=choice;b.setAttribute('aria-pressed',String(choice===id));b.addEventListener('click',()=>{state.gameplay.result.reward=choice;persist();render();});options.append(b);}
    const g=state.gameplay,before=g.equipped.filter(x=>x!==id),after=[...before,id],already=g.equipped.includes(id);
    const look={...state.appearance,locomotion:g.locomotion};
    drawReward($('reward-before'),{...look,parts:before});drawReward($('reward-after'),{...look,parts:after});
    $('reward-location').textContent={armor:'核の胸元と両肩に、角のある装甲が付く。',magic:'核の外側に、光る魔環と浮かぶ符印が巡る。',arms:'核の左右に、関節と爪を持つ大型の機械腕が付く。',crown:'核の上に、宝石の光る光冠が付く。縦長の目はそのまま。',dress:'核の下に光のドレスが広がる。顔を隠さず、浮遊も歩行も選べる。',trail:'核の後ろに二筋の光と星が流れる。顔・核の大きさ・能力はそのまま。ほかの装備と自由に重ねられる。'}[id];
    const a=C.effective({...g,equipped:before}),z=C.effective({...g,equipped:after}),stats=$('reward-stats');stats.replaceChildren();
    for(const k of Object.keys(C.DRILLS)){const cell=element('div');cell.append(element('span','',C.DRILLS[k].stat),element('strong','',C.displayStat(a,k)+' → '+C.displayStat(z,k)));const diff=z[k]-a[k];cell.append(element('small','',diff===0?'そのまま':(diff>0?'+':'')+diff));stats.append(cell);}
    $('reward-choice').textContent=already?outfitReaction(id):'まだ付けていません。元の色と顔はそのまま。付けずに保管することもできます。';
    $('reward-equip').disabled=already||actionLock;$('reward-equip').textContent=already?'装着済み':part.name+'を装着';$('reward-later').textContent=already?'この姿で育成へ':'今は付けずに進む';
  }
  function drawReward(canvas,look,time=0,reducedMotion=true){
    // Equal close-ups make the new module readable without changing the core's size.
    const frame=document.createElement('canvas');frame.width=600;frame.height=430;
    AwaiCreature.draw(frame,look,time,reducedMotion);
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;ctx.drawImage(frame,110,65,380,300,0,0,canvas.width,canvas.height);
  }
  function recordOutfit(reason){
    const part=Object.keys(C.PARTS).find(id=>reason===C.PARTS[id].name+'を装着');
    if(part){const line=outfitReaction(part);state.chats.push({role:'companion',text:line});state.chats=state.chats.slice(-12);reason+=' · '+line;}
    state.appearances.push({id:token(),time:Date.now(),reason,appearance:{...state.appearance,parts:[...state.gameplay.equipped],locomotion:state.gameplay.locomotion}});
    if(state.appearances.length>30)state.appearances.splice(1,state.appearances.length-30);
  }
  function outfitReaction(id){return {armor:'少し重い…でも、この胸甲で受けてみたい。',magic:'輪っかが回る！ 飛びこむタイミング、見えるかな。',arms:'腕が付いた！ 巻き岩の再戦にぶつけてみたい。',crown:'頭の上、光ってる。ちゃんと見てから飛びこむね。',dress:'ふわっとした！ 跳ぶとき、揺れるの見てて。',trail:'星がついてきた！ この姿でも、あの門を越えたんだね。'}[id];}
  function renderMemories(){
    const list=$('memory-list');list.replaceChildren();
    if(!state.memories.length){list.append(element('div','empty','まだ白紙の、小さな記録。ひとこと話して、いっしょに過ごすところから。'));return;}
    state.memories.slice().reverse().forEach(m=>{
      const card=element('article','memory-card'),head=element('div','memory-head'),titles=element('div');
      titles.append(element('div','memory-date',date(m.time)),element('h2','',m.title));
      const remove=element('button','text-button','この記録を消す');remove.setAttribute('aria-label','この記録を消す');
      remove.addEventListener('click',()=>askConfirm('この記録を消す？','この記録と、画面に残る会話を消します。育ちと姿はそのままです。',()=>{E.forget(state,m.id);persist();render();toast('記録を消しました。');}));
      head.append(titles,remove);card.append(head);
      if(m.userText)card.append(element('p','quoted','「'+m.userText+'」'));
      card.append(element('p','',m.text));list.append(card);
    });
  }
  function renderGrowth(){
    const bars=$('trait-bars');bars.replaceChildren();
    for(const [kind,a] of Object.entries(E.ACTIONS)){
      const row=element('div','trait-row'),progress=element('progress');progress.max=Math.max(6,state.actions);progress.value=state.traits[kind];progress.setAttribute('aria-label',a.short+'経験 '+state.traits[kind]+'回');row.append(element('span','',a.short),progress,element('span','',state.traits[kind]));bars.append(row);
    }
    const list=$('appearance-list');list.replaceChildren();
    state.appearances.slice().reverse().forEach(entry=>{
      const card=element('article','appearance-card'),canvas=element('canvas');canvas.width=240;canvas.height=190;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',U.appearance(entry,C.PARTS));
      AwaiCreature.draw(canvas,entry.appearance,0,true);
      const button=element('button','','この姿で過ごす');button.disabled=!!state.gameplay.battle;button.addEventListener('click',()=>{if(state.gameplay.battle)return;E.restoreAppearance(state,entry.id);state.gameplay.equipped=(entry.appearance.parts||[]).filter(id=>state.gameplay.parts.includes(id));state.gameplay.locomotion=entry.appearance.locomotion==='legs'?'legs':'hover';persist();render();toast('この姿を保ちます。経験は育ち続けます。');});card.append(canvas,element('p','',date(entry.time)+' · '+U.appearance(entry,C.PARTS)),button);list.append(card);
    });
  }
  function askConfirm(title,description,action){
    confirmAction=action;$('confirm-heading').textContent=title;$('confirm-description').textContent=description;$('confirm-dialog').showModal();$('confirm-cancel').focus();
  }
  document.querySelectorAll('[data-view-link]').forEach(b=>b.addEventListener('click',()=>{switchView(b.dataset.viewLink);window.scrollTo({top:0,behavior:'instant'});}));
  $('dark-warrior').addEventListener('click',()=>{warrior();persist();render();});
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
  document.querySelectorAll('[data-color],[data-eyes],[data-mouth],[data-tone],[data-eye-color],[data-weapon]').forEach(b=>b.addEventListener('click',()=>{
    const style={...state.baseStyle};for(const key of ['color','eyes','mouth','tone','eyeColor','weapon'])if(b.dataset[key]!==undefined)style[key]=key==='color'?Number(b.dataset[key]):b.dataset[key];
    if(b.dataset.weapon!==undefined){style.weaponChosen=true;style.weaponRevision=(state.baseStyle.weaponRevision||0)+1;}
    E.customize(state,style);persist();render();
  }));
  $('begin').addEventListener('click',()=>{if(state.customized)return;state.customized=true;persist();switchView('home');});
  document.querySelectorAll('[data-goal]').forEach(button=>button.addEventListener('click',()=>{C.setGoal(state,button.dataset.goal);lookMode='target';persist();render();}));
  document.querySelectorAll('[data-look]').forEach(button=>button.addEventListener('click',()=>{lookMode=button.dataset.look;render();}));
  $('target-equip').addEventListener('click',()=>{if(C.wearGoal(state)){recordOutfit('持っている目標部位へ着替えた');lookMode='current';persist();render();}});
  $('go-battle').addEventListener('click',()=>{const next=new URL(sceneLink);if(C.goalPlan(state.gameplay).foe==='robot')next.searchParams.set('enemy','robot');enterScene(next.href);});
  $('scout').addEventListener('click',()=>lockAction(()=>C.scout(state,token())));
  $('retrain').addEventListener('click',()=>{switchView('home');$('training-heading').scrollIntoView({block:'start',behavior:'instant'});});
  $('reward-equip').addEventListener('click',()=>{const reward=state.gameplay.result?.reward;if(!reward||state.gameplay.equipped.includes(reward)||state.gameplay.battle||actionLock)return;if(C.equip(state,reward)){recordOutfit(C.PARTS[reward].name+'を装着');state.gameplay.result.rewardDismissed=true;reviewingReward=true;persist();render();}});
  $('reward-later').addEventListener('click',()=>{closeReward();switchView('home');window.scrollTo({top:0,behavior:'instant'});});
  $('reward-review').addEventListener('click',()=>{if(!state.gameplay.result?.reward||state.gameplay.battle)return;reviewingReward=true;switchView('battle');$('battle-result').scrollIntoView({block:'start',behavior:'instant'});});
  window.addEventListener('pagehide',()=>{if(view==='battle')closeReward();});
  window.addEventListener('pageshow',event=>{if(event.persisted)render();});
  document.querySelectorAll('[data-locomotion]').forEach(button=>button.addEventListener('click',()=>{if(state.gameplay.battle)return;state.gameplay.locomotion=button.dataset.locomotion;recordOutfit(state.gameplay.locomotion==='legs'?'歩行の脚を選んだ':'脚なしの浮遊を選んだ');persist();render();}));
  $('retry').addEventListener('click',()=>{if(state.gameplay.result)startFight(state.gameplay.result.foe,state.gameplay.result.variant);});
  $('talk-form').addEventListener('submit',e=>{e.preventDefault();talk($('message').value);});
  document.querySelectorAll('[data-message]').forEach(b=>b.addEventListener('click',()=>talk(b.dataset.message)));
  document.querySelectorAll('[data-care]').forEach(b=>b.addEventListener('click',()=>perform(b.dataset.care,token())));
  $('auto-grow').addEventListener('change',()=>{E.setAutoGrow(state,$('auto-grow').checked);persist();render();});
  $('settings-open').addEventListener('click',()=>{$('name-input').value=state.name;$('settings-dialog').showModal();});
  $('settings-close').addEventListener('click',()=>$('settings-dialog').close());
  $('name-form').addEventListener('submit',async e=>{e.preventDefault();state.name=E.clean($('name-input').value,20)||'相棒';const result=await persist();render();if(result.ok)toast('呼び名を保存しました。');});
  $('clear-memories').addEventListener('click',()=>askConfirm('思い出と会話の記録を消す？','この端末の記録をすべて消します。育ちと姿の履歴は残ります。',()=>{E.forget(state);persist();render();toast('思い出と会話の記録を消しました。');}));
  $('trial-new').addEventListener('click',()=>{
    let slot;for(let i=0;i<5;i++){slot=crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,14);try{if(window.localStorage.getItem(E.STORAGE_KEY+'.trial.'+slot)===null)break;}catch{break;}if(i===4){toast('新しい枠を作れませんでした。もう一度試してください。');return;}}
    const url=new URL(location.href);url.searchParams.set('trial','1');url.searchParams.set('slot',slot);location.assign(url.href);
  });
  $('reset-open').textContent=trial?'この試遊を最初から':'最初からはじめる';
  $('reset-open').addEventListener('click',()=>askConfirm(trial?trialName+'だけ、最初からはじめる？':'新しい丸い玉からはじめる？',trial?trialName+'の相棒、会話、思い出、育ち、姿の履歴だけを消します。普段の相棒と、ほかの試遊枠は消しません。元には戻せません。':'普段の相棒、会話、思い出、育ち、姿の履歴をすべて消します。試遊枠は消しません。元には戻せません。',()=>{
    epoch++;state=E.createState();C.ensure(state);lookMode='current';actionLock=false;busy=false;$('message').value='';$('settings-dialog').close();persist({replace:true});switchView('home');toast('新しい相棒と、挑もう。');
  }));
  $('confirm-cancel').addEventListener('click',()=>{confirmAction=null;$('confirm-dialog').close();});
  $('confirm-dialog').addEventListener('cancel',()=>confirmAction=null);
  $('confirm-accept').addEventListener('click',()=>{const action=confirmAction;confirmAction=null;$('confirm-dialog').close();if(action)action();});
  function drawFight(time,still){const b=state.gameplay.battle;if(!b)return;const look={...state.appearance,parts:state.gameplay.equipped,locomotion:state.gameplay.locomotion},f=C.encounterFor(b),m=C.moveFor(b);if(battleEffect&&time-battleEffect.started>360)battleEffect=null;const active=!still&&battleEffect&&time>=battleEffect.started,step=active?Math.round(Math.sin((time-battleEffect.started)/360*Math.PI)*2):0;AwaiCreature.drawBattleGround($('battle-ground'),look,f,m,time,still,battleEffect);AwaiCreature.draw($('fighter'),look,time,still,{shift:active&&battleEffect.action!=='defend'?step:0});AwaiCreature.drawEnemy($('enemy'),f,m,time,still,{shift:active&&battleEffect.action!=='defend'?-step:0});}
  function drawCompanion(time,still){const look={...state.appearance,parts:state.gameplay.equipped,locomotion:state.gameplay.locomotion};AwaiCreature.draw($('creature'),look,time,still);AwaiCreature.draw($('custom-avatar'),look,time,still);}
  function animate(time){if(!document.hidden&&time-lastPaint>=80){lastPaint=time;if(view==='home'||view==='custom'){drawCompanion(time,reduced.matches);if(state.customized)drawTarget(time,reduced.matches);}else if(view==='battle')drawFight(time,reduced.matches);}requestAnimationFrame(animate);}
  switchView(view);requestAnimationFrame(animate);
  $('trial-banner').hidden=!trial;
  if(trial){const banner=$('trial-banner');banner.firstChild.textContent=trialName+'です。この枠だけに保存します。普段の相棒と、ほかの試遊枠はそのままです。 ';$('save-status').textContent='普段とは別の保存';}
  // Display hydration does not write an unchanged save. Canonical pending recovery remains under the scope lock.
  if(loaded.restored&&!loaded.warning){pendingSaves++;saveChain=G.lock(SCOPE,async()=>{const current=await G.latest(storage,SCOPE);if(!current.restored||current.warning)return;state=current.state;C.ensure(state);observed=current.stamp;const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);let original;try{original=JSON.parse(current.stamp.raw);}catch{return;}if(stable(original)!==stable(state)){const result=await G.writeDurable(storage,SCOPE,state,current.stamp);lastSaveResult=result;if(!result.ok)throw Error(result.reason);state=result.state;observed=result.stamp;C.ensure(state);$('save-status').textContent='保存形式を更新しました';}else $('save-status').textContent='保存を読み込みました';render();}).catch(()=>{$('save-status').textContent='保存を読み込めません。再読込してください';$('save-status').classList.add('warning');lastSaveResult={ok:false,reason:'read-failed'};}).finally(()=>pendingSaves--);}

  if(loaded.warning){$('save-status').textContent=loaded.warning;$('save-status').classList.add('warning');}
  window.AwaiPersistence={current:()=>JSON.parse(JSON.stringify(state)),settled:()=>saveChain,pending:()=>pendingSaves};
  // Read-only bridge to the proposed browser WebMCP API; no remote MCP or model is connected.
  const context=document.modelContext;
  if(context?.registerTool){
    const lifecycle=new AbortController();
    const tool={name:'read_companion_state',title:'相棒の育ちを読む',description:'Read the visible companion growth and procedural appearance mode without changing the game.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw Error('empty object required');return {name:state.name,experiences:state.actions,traits:{...state.traits},growth:E.growthLabel(state),appearanceMode:'procedural',conversationMode:'demo'};}};
    try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
    window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  }
})();


