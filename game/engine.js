(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AwaiEngine = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const STORAGE_KEY = 'awai.companion.v1';
  const ACTIONS = {
    explore: {label: 'いっしょに探す', short: '探る', reaction: 'あっ、光！ ぼくが見つけた！ …先は暗いから、きみが前を歩いて。', delta: 2},
    care: {label: 'おやつを分ける', short: '寄りそう', reaction: 'はんぶん？ ぼくのほう、ちょっと大きくして。次はきみに分けるから！', delta: 5},
    calm: {label: 'ひと息つく', short: 'くつろぐ', reaction: 'ふう。さっき転んだところ、まだ痛い。ここで少し丸まってる。', delta: 8}
  };
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const clean = (s, length = 180) => typeof s === 'string' ? s.trim().slice(0, length) : '';
  const copy = value => JSON.parse(JSON.stringify(value));
  // The round core stays the same size. External modules expand the silhouette.
  const sizeFor = () => .48;
  function appearanceFor(seed, traits, count, baseStyle = {color:34,eyes:'hollow',mouth:'none'}) {
    const total = traits.explore + traits.care + traits.calm;
    // Every dimension grows continuously. Seed preserves this individual's proportions and markings.
    const scale = Math.min(1, Math.sqrt(count / 24));
    const shares = total ? [traits.explore, traits.care, traits.calm].map(x => x / total) : [0, 0, 0];
    return {
      seed, hue: baseStyle.color + scale * (shares[0] * 12 - shares[1] * 8 + shares[2] * 5),
      eyes:baseStyle.eyes, mouth:baseStyle.mouth, tone:baseStyle.tone||'pastel', eyeColor:baseStyle.eyeColor||'#fffbe8', weapon:baseStyle.weapon||'sword', size:sizeFor(count),
      width: 1, height: 1,
      fins: .15 + scale * (shares[1] * .6 + shares[0] * .28),
      antenna: .08 + scale * shares[0] * .48,
      markings: Math.min(8, Math.floor(count / 3)),
      glow: .25 + scale * shares[2] * .65,
      pace: 1 + scale * shares[0] * .45 - scale * shares[2] * .45,
      growth: scale
    };
  }
  function createState(now = Date.now(), seed = Math.floor(Math.random() * 1000000)) {
    const appearance = appearanceFor(seed, {explore:0,care:0,calm:0}, 0);
    return {
      version: 2, id: 'individual-' + seed + '-' + now, seed, createdAt: now, updatedAt: now,
      name: '相棒', baseStyle:{color:34,eyes:'hollow',mouth:'none'}, customized:false,
      traits: {explore:0,care:0,calm:0}, actions:0, energy:72,
      chats: [], memories: [], handled: [], pendingEvent: null, autoGrow: true,
      appearance, appearances: [{id:'birth',time:now,reason:'はじめての姿',appearance:copy(appearance)}]
    };
  }
  function hydrate(raw) {
    if (!raw || ![1,2].includes(raw.version) || !Number.isFinite(raw.seed) || !raw.traits || !Number.isFinite(raw.actions)) throw new Error('unsupported-save');
    const state = createState(Number(raw.createdAt) || Date.now(), clamp(Math.floor(raw.seed),0,1000000));
    for (const key of Object.keys(ACTIONS)) {
      if (!Number.isFinite(raw.traits[key]) || raw.traits[key] < 0) throw new Error('invalid-traits');
      state.traits[key] = clamp(Math.floor(raw.traits[key]),0,100000);
    }
    state.id = clean(raw.id,80) || state.id;
    state.actions = clamp(Math.floor(raw.actions),0,300000);
    state.updatedAt = Number(raw.updatedAt) || state.createdAt;
    state.energy = clamp(Number(raw.energy) || 72,0,100);
    state.name = clean(raw.name,20) || '相棒';
    const base=raw.baseStyle || {};
    state.baseStyle={color:Number.isFinite(base.color)?clamp(base.color,0,359):34,eyes:['hollow','oval','line','arc'].includes(base.eyes)?base.eyes:'hollow',mouth:['none','smile','flat','dot','teeth','fang'].includes(base.mouth)?base.mouth:'none',tone:['pastel','vivid','dark','black','white'].includes(base.tone)?base.tone:'pastel',eyeColor:/^#[0-9a-f]{6}$/i.test(base.eyeColor||'')?base.eyeColor:'#fffbe8',weapon:['sword','machinegun','thunder'].includes(base.weapon)?base.weapon:'sword',weaponChosen:base.weaponChosen===true||(base.weaponChosen===undefined&&['sword','machinegun','thunder'].includes(base.weapon)),weaponRevision:Number.isFinite(base.weaponRevision)?clamp(Math.floor(base.weaponRevision),0,1000000):0};
    state.customized=raw.customized===true;
    state.autoGrow = raw.autoGrow !== false;
    const withSize=(a,count)=>a?{...a,tone:a.tone||'pastel',eyeColor:a.eyeColor||'#fffbe8',weapon:a.weapon||'sword',size:a.size===undefined?sizeFor(count):a.size}:a;
    const validAppearance = a => a && a.seed === state.seed && ['hollow','oval','line','arc'].includes(a.eyes) && ['none','smile','flat','dot','teeth','fang'].includes(a.mouth) && ['hue','width','height','fins','antenna','markings','glow','pace','growth','size'].every(k => Number.isFinite(a[k])) && a.size>=.48 && a.size<=1 && a.hue>=-12 && a.hue<=371 && a.width >= 1 && a.width <= 1.3 && a.height >= 1 && a.height <= 1.3 && a.pace >= .5 && a.pace <= 1.5 && a.markings >= 0 && a.markings <= 8 && a.fins >= .1 && a.fins <= .8 && a.antenna >= 0 && a.antenna <= .6 && a.glow >= .2 && a.glow <= 1 && a.growth >= 0 && a.growth <= 1;
    const current=withSize(raw.appearance,state.actions);
    state.appearance = validAppearance(current) ? copy(current) : appearanceFor(state.seed,state.traits,state.actions,state.baseStyle);
    state.appearances = Array.isArray(raw.appearances) ? raw.appearances.filter(x=>x).map(x=>({...x,appearance:withSize(x.appearance,x.id==='birth'?0:Number(clean(x.reason,80).match(/(\d+)回目/)?.[1])||Math.round((x.appearance?.growth||0)**2*24))})).filter(x=>validAppearance(x.appearance)).slice(-30).map(x=>({id:clean(x.id,80),time:Number(x.time)||state.createdAt,reason:clean(x.reason,80),appearance:copy(x.appearance)})) : [];
    if (!state.appearances.length) state.appearances = [{id:'birth',time:state.createdAt,reason:'はじめての姿',appearance:copy(state.appearance)}];
    state.memories = Array.isArray(raw.memories) ? raw.memories.filter(x=>x && typeof x.id === 'string' && ACTIONS[x.kind]).slice(-60).map(x=>({id:clean(x.id,80),time:Number(x.time)||state.createdAt,kind:x.kind,title:clean(x.title,80),text:clean(x.text,300),userText:clean(x.userText)})) : [];
    state.chats = Array.isArray(raw.chats) ? raw.chats.filter(x=>x && ['user','companion'].includes(x.role)).slice(-12).map(x=>({role:x.role,text:clean(x.text,400)})) : [];
    state.handled = Array.isArray(raw.handled) ? raw.handled.filter(x=>typeof x === 'string').slice(-64) : [];
    const event = raw.pendingEvent;
    state.pendingEvent = event && typeof event.id === 'string' && typeof event.prompt === 'string' ? {id:clean(event.id,80),prompt:clean(event.prompt,120),userText:clean(event.userText),choices:Object.keys(ACTIONS)} : null;
    // Combat normalizes this bounded payload before use. The v1 key and individual remain intact.
    if(raw.gameplay && typeof raw.gameplay==='object' && JSON.stringify(raw.gameplay).length<40000) state.gameplay=copy(raw.gameplay);
    return state;
  }
  function load(storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      return {state:raw ? hydrate(JSON.parse(raw)) : createState(), restored:!!raw, warning:null};
    } catch { return {state:createState(),restored:false,warning:'保存した記録を読めませんでした。この画面では新しい相棒として遊べます。'}; }
  }
  function save(storage, state) {
    try { storage.setItem(STORAGE_KEY,JSON.stringify(state)); return true; }
    catch { return false; }
  }
  function growthLabel(state) {
    if (state.actions < 6) return 'まだ、芽のような姿';
    const ranked = Object.entries(state.traits).sort((a,b)=>b[1]-a[1]);
    if (ranked[0][1]-ranked[1][1] <= 1) return 'いろんな経験が混じる育ち';
    return {explore:'探る気配が育っている',care:'寄りそう気配が育っている',calm:'くつろぐ気配が育っている'}[ranked[0][0]];
  }
  function addChat(state, role, text) {
    state.chats.push({role,text:clean(text,400)});
    state.chats = state.chats.slice(-12);
  }
  function startConversation(state, message, result, token, now=Date.now()) {
    const text = clean(message);
    if (!text || state.pendingEvent) return false;
    addChat(state,'user',text);
    addChat(state,'companion',result.reply);
    state.pendingEvent = {id:token,prompt:clean(result.event.prompt,120),choices:Object.keys(ACTIONS),userText:text};
    state.updatedAt=now;
    return true;
  }
  function act(state, kind, token, now=Date.now(), fromEvent=false) {
    if (!ACTIONS[kind] || typeof token !== 'string' || state.handled.includes(token)) return {ok:false};
    if (fromEvent && (!state.pendingEvent || state.pendingEvent.id!==token)) return {ok:false};
    const pending=state.pendingEvent;
    if (!fromEvent && pending) return {ok:false};
    state.handled.push(token); state.handled=state.handled.slice(-64);
    state.actions++; state.traits[kind]++; state.energy=clamp(state.energy+ACTIONS[kind].delta,0,100);
    const next=appearanceFor(state.seed,state.traits,state.actions,state.baseStyle);
    if (state.autoGrow) state.appearance=next;
    const firstMilestone=state.actions===6;
    const reaction=ACTIONS[kind].reaction+(firstMilestone?' いっしょに過ごしたことが、ぼくの姿にも現れはじめたよ。':'');
    addChat(state,'companion',reaction);
    const memory={id:token,time:now,kind,title:pending?'光の庭で、'+ACTIONS[kind].short:ACTIONS[kind].label,text:reaction,userText:pending?pending.userText:''};
    state.memories.push(memory); state.memories=state.memories.slice(-60);
    if(state.autoGrow) {
      state.appearances.push({id:token,time:now,reason:ACTIONS[kind].short+'時間 · '+state.actions+'回目',appearance:copy(state.appearance)});
      // Retain the original silhouette and the most recent changes.
      if(state.appearances.length>30) state.appearances.splice(1,state.appearances.length-30);
    }
    state.pendingEvent=null; state.updatedAt=now;
    return {ok:true,memory,reaction,milestone:firstMilestone};
  }
  function forget(state, id) {
    state.memories=id ? state.memories.filter(m=>m.id!==id) : [];
    // References to forgotten words cannot survive in dialogue or a pending event.
    state.chats=[]; state.pendingEvent=null;
  }
  function setAutoGrow(state, enabled, now=Date.now()) {
    state.autoGrow=!!enabled;
    if(enabled) {
      state.appearance=appearanceFor(state.seed,state.traits,state.actions,state.baseStyle);
      state.appearances.push({id:'resume-'+now,time:now,reason:'今の育ちを反映',appearance:copy(state.appearance)});
      if(state.appearances.length>30) state.appearances.splice(1,state.appearances.length-30);
    }
  }
  function restoreAppearance(state,id) {
    const entry=state.appearances.find(x=>x.id===id);
    if(!entry) return false;
    state.appearance=copy(entry.appearance); state.autoGrow=false;
    return true;
  }
  function customize(state, baseStyle, now=Date.now()) {
    const checked=hydrate({...state,baseStyle}).baseStyle;if(JSON.stringify(checked)===JSON.stringify(state.baseStyle))return false;
    const previousAppearance=JSON.stringify(state.appearance);state.baseStyle=checked; state.appearance={...state.appearance,...appearanceFor(state.seed,state.traits,state.actions,checked)};
    state.updatedAt=now;if(state.customized&&JSON.stringify(state.appearance)===previousAppearance)return true;
    if(!state.customized&&state.actions===0)state.appearances=[{id:'birth',time:state.createdAt,reason:'選んだ、はじめての姿',appearance:copy(state.appearance)}];
    else {state.appearances.push({id:'custom-'+now,time:now,reason:'カスタムした姿',appearance:copy(state.appearance)});if(state.appearances.length>30)state.appearances.splice(1,state.appearances.length-30);}
    return true;
  }
  return {STORAGE_KEY,ACTIONS,createState,hydrate,load,save,appearanceFor,sizeFor,growthLabel,startConversation,act,forget,setAutoGrow,restoreAppearance,customize,clean};
});
