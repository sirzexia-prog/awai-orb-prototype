(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./engine.js'));
  else root.AwaiCombat=factory(root.AwaiEngine);
})(typeof globalThis!=='undefined'?globalThis:this,function(E){
  'use strict';
  const DRILLS={
    power:{name:'打ちこみ',stat:'打撃',kind:'explore',plus:'power',minus:'guard',effect:'打撃 +2 / 守り −1',line:'えいっ！ …今の、見てた？ 次はもっと強く当てる！'},
    guard:{name:'受け身',stat:'守り',kind:'care',plus:'guard',minus:'focus',effect:'守り +2 / 集中 −1',line:'うわっ、転んだ！ もう一回。今度は丸まって受ける。'},
    focus:{name:'見切り練習',stat:'集中',kind:'calm',plus:'focus',minus:'power',effect:'集中 +2 / 威力 −1',line:'こ、こわくないぞ。合図が見えたら、飛びこむんだよね？'}
  };
  // Stable module IDs are suitable for future consent-based selected-part inheritance.
  const PARTS={
    armor:{id:'armor',slot:'shell',family:'armor',name:'岩殻の胸甲',foe:'rock',effect:'守り +2 / 威力 −1',bonus:{guard:2,power:-1},description:'肩の鋭い装甲と胸甲。大技を受け止め、守って打ち返す姿。'},
    magic:{id:'magic',slot:'aura',family:'magic',name:'火紋の魔環',foe:'spark',effect:'集中 +2 / 守り −1',bonus:{focus:2,guard:-1},description:'核の外を巡る魔環と符印。突進を見切る、浮遊の術師。'},
    arms:{id:'arms',slot:'arms',family:'machine',name:'二連の駆動腕',foe:'echo',effect:'威力 +3 / 集中 −1',bonus:{power:3,focus:-1},description:'大型の機械腕と爪。隙に重い一撃を叩き込む機体。'},
    crown:{id:'crown',slot:'head',family:'royal',name:'光冠',foe:'rock',effect:'集中 +1 / 威力 −1',bonus:{focus:1,power:-1},description:'核の上に浮く、光る宝石のクラウン。見切りを支える姿。'},
    dress:{id:'dress',slot:'mantle',family:'royal',name:'浮遊ドレス',foe:'spark',effect:'集中 +1 / 守り −1',bonus:{focus:1,guard:-1},description:'核の下に広がる光の布。浮遊も歩行も選べる、軽やかな姿。'},
    trail:{id:'trail',slot:'trail',family:'star',name:'星の軌跡',chapter:true,effect:'外見の部位 · 能力はそのまま',bonus:{},description:'核の後ろに流れる二筋の光と小さな星。姫にも機械にも、自由に重ねられる。'}
  };
  const GOALS={princess:{name:'プリンセスの例',parts:['crown','dress']},machine:{name:'機械の例',parts:['armor','arms']},armor:{name:'鎧の例',parts:['armor','crown']}};
  const validPart=id=>typeof id==='string'&&Object.hasOwn(PARTS,id);
  const MOVES={
    charge:{label:'力をためている',hint:'今は攻撃が来ない。先に攻めるか、防御で次の見切りを準備できる。',damage:0},
    heavy:{label:'大技が来る！',hint:'攻撃すると直撃。防御で受け流そう。',damage:12,focus:4},
    recover:{label:'息切れで隙だらけ',hint:'攻撃の威力が2倍。防御は好機を逃す。',damage:0},
    shell:{label:'硬い殻で守る',hint:'攻撃は1しか通らない。防御で息を整える好機。',damage:0},
    quick:{label:'すばやい突進',hint:'防御で止めるか、集中4以上で見切り。',damage:6,focus:4},
    feint:{label:'守りを崩すフェイント',hint:'防御だけを狙う。攻撃ならそのまま通せる。',damage:7}
  };
  const FOES=[
    {id:'rock',name:'巻き岩',tag:'最初の壁',description:'ためる → 大技 → 息切れ → 殻。隙を待って打つ。',hp:22,limit:12,pattern:['charge','heavy','recover','shell'],hue:32},
    {id:'spark',name:'はね火',tag:'自分の戦法を試す',description:'低く跳ぶ構えと、左右に散る火花。速攻、受け返し、見切りで挑める。',hp:24,limit:12,pattern:['quick','feint','quick','recover'],hue:8},
    {id:'echo',name:'ひびき輪',tag:'育ちの試験',description:'殻 → ためる → 大技 → フェイント → 突進 → 息切れ。合図を読み分ける。',hp:34,limit:16,pattern:['shell','charge','heavy','feint','quick','recover'],hue:270}
  ];
  const REMATCH={...FOES[0],name:'巻き岩・再戦',tag:'獲得した部位の試運転',description:'前より重い一撃と、低く滑る動き。獲得した部位を試す勝負。',hp:36,limit:16,pattern:['charge','heavy','shell','quick','recover']};
  const CHALLENGE_GOALS={speed:{name:'速攻 · 6手以内',met:r=>r.turns<=6},safe:{name:'無傷 · 被害0',met:r=>r.taken===0},counter:{name:'見切り · 2回成功',met:r=>r.counters>=2}};
  const CHAPTER_ROUTES={
    shield:{id:'gate',variant:'gate-shield',route:'shield',name:'境界の門 · 盾の道',tag:'境界の庭',description:'重い衝撃を完全に受け切ると、門が3手だけひらく。返しと打撃を、開いた隙へ。',hp:24,limit:12,pattern:['charge','heavy'],hue:165},
    wind:{id:'gate',variant:'gate-wind',route:'wind',name:'境界の門 · 風の道',tag:'境界の庭',description:'踏み込みの見切りに成功すると、門が3手だけひらく。集中と打撃、息の配分で進む。',hp:24,limit:12,pattern:['charge','quick'],hue:220}
  };
  const routeFor=variant=>Object.values(CHAPTER_ROUTES).find(f=>f.variant===variant);
  const chapterUnlocked=g=>g.wins.echo>0&&Object.keys(CHALLENGE_GOALS).every(k=>g.challengeMarks.includes(k));
  const availableParts=g=>Object.keys(PARTS).filter(id=>!PARTS[id].chapter||chapterUnlocked(g)||g.parts.includes(id));
  const partCondition=id=>PARTS[id].chapter?'境界の庭の初クリア':FOES.find(f=>f.id===PARTS[id].foe).name+'の初勝';
  const encounterFor=b=>b.variant==='rematch'?REMATCH:b.foe==='gate'?routeFor(b.variant):FOES.find(f=>f.id===b.foe);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?Math.floor(v):a));
  const fresh=()=>({xp:{power:0,guard:0,focus:0},slots:3,condition:null,wins:{rock:0,spark:0,echo:0},rematchWins:0,chapterWins:{shield:0,wind:0},chapterRoute:'shield',challengeGoal:'speed',challengeMarks:[],records:{},notes:{},attempts:0,battle:null,result:null,scouted:false,parts:[],equipped:[],locomotion:'hover',goal:'armor',goalParts:['armor','crown']});
  const stats=g=>Object.fromEntries(Object.keys(DRILLS).map(k=>[k,Math.min(6,2+Math.floor(g.xp[k]/3))]));
  // Every implemented penalty remains effective. Raw power -1 is displayed as actual strike 1.
  function effective(g){const out=stats(g),d=DRILLS[g.condition];if(d){out[d.plus]+=2;out[d.minus]-=1;}for(const id of g.equipped)for(const [k,v] of Object.entries(PARTS[id].bonus))out[k]+=v;return out;}
  const displayStat=(stats,k)=>stats[k]+(k==='power'?2:0);
  const unlocked=(g,id)=>id==='rock'||(id==='spark'&&g.wins.rock>0)||(id==='echo'&&g.wins.spark>0)||(id==='gate'&&chapterUnlocked(g));
  const foeFor=id=>id==='gate'?CHAPTER_ROUTES.shield:FOES.find(x=>x.id===id);
  const noteKey=b=>b.variant||b.foe;
  function observe(g,b){const m=moveFor(b);if(!m.damage)return;const key=noteKey(b),note=g.notes[key]||{moves:[],opening:false};if(!note.moves.includes(m.key))note.moves.push(m.key);g.notes[key]=note;}
  function recognize(g,r,restore=false,valid=true){
    const previous=restore?r.earnedMarks:[],legacy=restore&&r.markEarned?r.goal:null;
    r.achievedMarks=r.variant==='rematch'&&r.outcome==='win'&&valid?Object.keys(CHALLENGE_GOALS).filter(k=>CHALLENGE_GOALS[k].met(r)):[];
    const newly=r.achievedMarks.filter(k=>!g.challengeMarks.includes(k));
    r.earnedMarks=[...new Set([...(previous||[]),...(legacy?[legacy]:[]),...newly])].filter(k=>r.achievedMarks.includes(k));
    g.challengeMarks.push(...newly);r.markEarned=r.earnedMarks.length>0;
  }
  function preparationNotes(g,foe,variant=null){
    const key=variant||foe,note=g.notes[key],enemy=encounterFor({foe,variant}),own=effective(g);
    const moves=(note?.moves||[]).map(k=>{const m=moveFor({foe,variant,turn:Math.max(1,enemy.pattern.indexOf(k)+1),gateOpen:foe==='gate'&&k==='quick'?2:0,rules:3,tutorial:false});return {key:k,name:{heavy:'大技',quick:'突進',feint:'守り崩し'}[k],damage:m.damage,guard:m.focus?Math.max(0,Math.ceil((m.damage-4)/2)):null,focus:m.focus||null};});
    return {moves,opening:note?.opening===true,guard:own.guard,focus:own.focus};
  }
  function moveFor(b){
    const foe=encounterFor(b),second=foe.id==='spark'&&b.rules>=2&&b.turn>=5&&b.turn<=8,pattern=second?['quick','quick','feint','recover']:foe.pattern;
    const key=foe.id==='gate'&&b.gateOpen?['recover','quick','recover'][3-b.gateOpen]:b.variant==='rematch'&&b.opening?'recover':pattern[(b.turn-1)%pattern.length],m={...MOVES[key],key};
    if(b.rules<3&&foe.id==='rock'&&key==='charge')m.hint='今は攻撃が来ない。次は大技。';
    if(b.variant==='rematch'){if(key==='heavy'){m.damage=16;m.focus=6;}if(key==='quick'){m.damage=8;m.focus=4;}}
    if(foe.id==='echo'){if(key==='heavy'){m.damage=14;m.focus=6;}if(key==='quick'){m.damage=7;m.focus=5;}}
    if(foe.id==='gate'){if(key==='heavy'){m.damage=14;m.focus=5;}if(key==='quick'){m.damage=8;m.focus=6;}}
    if(foe.id!=='rock'||b.variant==='rematch'||b.rules>=3&&!b.tutorial){
      const signals={
        charge:['体を縮め、力を集める','輪が沈み、地面の小石が浮き上がる。次の一撃へ力を蓄えている。'],
        heavy:['重い一撃の構え','集めた力が前へ傾く。強い衝撃が近づく。'],
        recover:['光が薄れ、息が乱れる','直前の動きで力を使い切った。今は無防備な体が揺れている。'],
        shell:['外殻が閉じる','硬い外側が核を覆う。力を通しにくいが、こちらへの打撃は来ない。'],
        quick:['火花を束ね、低く跳ぶ','足元の光が一本にまとまる。こちらへまっすぐ飛びこむ構え。'],
        feint:['火花が左右へ散る','正面から距離を取り、硬く丸まる相手の懐へ潜りこもうとしている。']
      };
      if(foe.id==='echo'&&key==='quick')signals.quick=['輪が細くなり、前へ傾く','光が一筋に細くなった。すばやい直進の気配。'];
      [m.label,m.hint]=signals[key];
      if(foe.id==='rock'&&key==='charge')m.hint='岩の割れ目に光が集まる。次の一撃へ力を蓄えている。';
      if(foe.id==='rock'&&key==='quick'){m.label='丸まった岩が、低く滑る';m.hint='地面から砂が舞う。重い体がまっすぐ滑り出す気配。';}
      if(second&&b.turn===5)m.hint+='着地の火花が、まだ次の跳躍へまとまっている。';
      if(b.variant==='rematch'&&b.opening){m.label='大技を崩され、殻がほどける';m.hint='さっきの受け方で、岩の重心が崩れた。核がむき出しのまま揺れている。';}
    }
    m.phaseNotice=foe.id==='spark'&&b.rules>=2?(b.turn===4?'火花が荒くなった。次の巡りは、跳ぶ拍子が変わりそう。':second?'2巡目 · 火花が荒い。さっきと跳ぶ拍子が違う。':''):'';
    if(foe.id==='gate'){m.phaseNotice=b.gateOpen?'門がひらいた · あと'+b.gateOpen+'手':'門は閉じている · 通る威力1';if(key==='charge'){m.label='光の門が、力を集める';m.hint='二つの輪が重なる。閉じた門が次の衝撃をためている。';}if(key==='quick'){m.label='輪が細くなり、踏み込む';m.hint='重なった光が一筋になる。すばやい直進の合図。';}if(key==='recover'){m.label='門がほどけ、道が見える';m.hint='輪の間に光の道が現れた。今は打撃を通せる隙。';}}
    m.facts=m.focus?'衝撃 '+m.damage+' · 見切りに集中 '+m.focus:key==='feint'?'守り崩し '+m.damage+' · 固めた守りだけを狙う':key==='recover'?'無防備 · 攻撃の威力2倍':key==='shell'?'硬い外殻 · 通る威力1':'この手の衝撃 0';
    return m;
  }
  function ensure(state){
    const raw=state.gameplay,g=fresh();
    if(raw&&typeof raw==='object'){
      for(const k of Object.keys(DRILLS))g.xp[k]=clamp(raw.xp?.[k],0,12);
      for(const f of FOES)g.wins[f.id]=clamp(raw.wins?.[f.id],0,100000);
      g.rematchWins=clamp(raw.rematchWins,0,100000);for(const route of Object.keys(CHAPTER_ROUTES))g.chapterWins[route]=clamp(raw.chapterWins?.[route],0,100000);g.chapterRoute=Object.hasOwn(CHAPTER_ROUTES,raw.chapterRoute)?raw.chapterRoute:"shield";
      g.challengeGoal=Object.hasOwn(CHALLENGE_GOALS,raw.challengeGoal)?raw.challengeGoal:'speed';g.challengeMarks=Array.isArray(raw.challengeMarks)?[...new Set(raw.challengeMarks)].filter(k=>Object.hasOwn(CHALLENGE_GOALS,k)):[];
      for(const key of ['rock','spark','echo','rematch','gate-shield','gate-wind']){const record=raw.records?.[key];if(record&&Number.isInteger(record.turns)&&record.turns>=1&&record.turns<=16&&Number.isInteger(record.taken)&&record.taken>=0&&record.taken<=1000)g.records[key]={turns:record.turns,taken:record.taken};}
      if(raw.notes&&typeof raw.notes==='object')for(const [key,note] of Object.entries(raw.notes)){const f=key==='rematch'?REMATCH:routeFor(key)||foeFor(key);if(!f||!note||typeof note!=='object')continue;g.notes[key]={moves:Array.isArray(note.moves)?[...new Set(note.moves)].filter(k=>(f.pattern.includes(k)||f.id==='gate'&&k==='quick')&&MOVES[k]?.damage>0):[],opening:(key==='rematch'||f.id==='gate')&&note.opening===true};}
      // Wins are the source of truth for ownership, including older v0.3 draft saves.
      g.parts=Object.keys(PARTS).filter(id=>PARTS[id].chapter?Object.values(g.chapterWins).some(n=>n>0):g.wins[PARTS[id].foe]>0);
      g.equipped=Array.isArray(raw.equipped)?[...new Set(raw.equipped)].filter(id=>g.parts.includes(id)):[];
      g.locomotion=raw.locomotion==='legs'?'legs':'hover';
      g.goal=Object.hasOwn(GOALS,raw.goal)||raw.goal==='custom'?raw.goal:'armor';
      g.goalParts=Array.isArray(raw.goalParts)?[...new Set(raw.goalParts)].filter(validPart):[...GOALS[g.goal==='custom'?'armor':g.goal].parts];
      g.slots=clamp(raw.slots,0,3);g.attempts=clamp(raw.attempts,0,100000);g.condition=DRILLS[raw.condition]?raw.condition:null;g.scouted=raw.scouted===true;
      const b=raw.battle;
      const variant=b?.foe==='gate'&&chapterUnlocked(g)?routeFor(b.variant)?.variant||null:b?.variant==='rematch'&&b.foe==='rock'&&g.wins.echo>0?'rematch':null,enemy=b?encounterFor({foe:b.foe,variant}):null;
      if(b&&enemy&&unlocked(g,b.foe)&&typeof b.id==='string'&&b.id.length<=80&&Number.isInteger(b.turn)&&b.turn>=1&&b.turn<=enemy.limit){
        const s=b.stats;
        if(s&&Object.keys(DRILLS).every(k=>Number.isInteger(s[k])&&s[k]>={power:-1,guard:0,focus:0}[k]&&s[k]<={power:11,guard:10,focus:12}[k])&&Number.isInteger(b.hp)&&b.hp>0&&b.hp<=20+s.guard*2&&Number.isInteger(b.enemyHp)&&b.enemyHp>0&&b.enemyHp<=enemy.hp){
          const rules=[1,2,3].includes(b.rules)?b.rules:0;
          g.battle={id:b.id,foe:b.foe,variant,goal:variant==='rematch'?Object.hasOwn(CHALLENGE_GOALS,b.goal)?b.goal:g.challengeGoal:null,turn:b.turn,stats:{...s},hp:b.hp,maxHp:20+s.guard*2,enemyHp:b.enemyHp,breath:clamp(b.breath,0,4),logs:Array.isArray(b.logs)?b.logs.slice(-6).map(x=>E.clean(x,250)):[],mistakes:{},dealt:clamp(b.dealt,0,1000),taken:clamp(b.taken,0,1000),rules,rebound:clamp(b.rebound,0,5),readiness:rules>=3?clamp(b.readiness,0,2):0,tutorial:rules<3||b.tutorial===true,opening:variant==='rematch'&&b.opening===true,counters:clamp(b.counters,0,16),gateOpen:b.foe==='gate'?clamp(b.gateOpen,0,3):0,gateOpens:b.foe==='gate'?clamp(b.gateOpens,0,12):0};
          for(const k of ['heavyExposed','counterFails','attackShell','missedRecover','feintBlocked'])g.battle.mistakes[k]=clamp(b.mistakes?.[k],0,16);
        }
      }
      const r=raw.result;
      if(r&&foeFor(r.foe)&&['win','loss'].includes(r.outcome)&&(r.foe!=='gate'||!!routeFor(r.variant))){const rewards=(Array.isArray(r.rewards)?r.rewards:(r.reward?[r.reward]:[])).filter(id=>g.parts.includes(id));g.result={foe:r.foe,variant:r.foe==='gate'?routeFor(r.variant).variant:r.variant==='rematch'&&r.foe==='rock'?'rematch':null,goal:Object.hasOwn(CHALLENGE_GOALS,r.goal)?r.goal:null,markEarned:r.markEarned===true,achievedMarks:[],earnedMarks:Array.isArray(r.earnedMarks)?[...new Set(r.earnedMarks)].filter(k=>Object.hasOwn(CHALLENGE_GOALS,k)):[],recordFirst:r.recordFirst===true,recordTurns:r.recordTurns===true,recordTaken:r.recordTaken===true,counters:clamp(r.counters,0,16),outcome:r.outcome,turns:clamp(r.turns,1,16),reason:E.clean(r.reason,240).replace('次の相手は、同じ指示だけでは崩せない。','部位と構えを変え、別の戦法も試せる。'),line:E.clean(r.line,180),time:clamp(r.time,0,Date.now()+1000),dealt:clamp(r.dealt,0,1000),taken:clamp(r.taken,0,1000),reward:rewards.includes(r.reward)?r.reward:rewards[0]||null,rewards,rewardDismissed:typeof r.rewardDismissed==='boolean'?r.rewardDismissed:rewards.some(id=>g.equipped.includes(id)),gateOpens:clamp(r.gateOpens,0,12)};}
      if(g.result)recognize(g,g.result,true,Number.isInteger(r.turns)&&r.turns>=1&&r.turns<=16&&Number.isInteger(r.taken)&&r.taken>=0&&r.taken<=1000);
      // Older wins prove the first attack was encountered. The last result also proves its resolved prefix.
      if(!raw.notes){for(const f of [...FOES,...(g.rematchWins?[REMATCH]:[])]){const variant=f===REMATCH?'rematch':null;if(!(variant?g.rematchWins:g.wins[f.id]))continue;const turn=f.pattern.findIndex(k=>MOVES[k].damage>0)+1;observe(g,{foe:f.id,variant,turn,rules:3,tutorial:false});}for(const saved of [r,b]){if(!saved||!foeFor(saved.foe)||!Number.isInteger(saved.turns??saved.turn))continue;const variant=saved.foe==='gate'?routeFor(saved.variant)?.variant:saved.variant==='rematch'&&saved.foe==='rock'?'rematch':null,f=encounterFor({foe:saved.foe,variant});if(!f)continue;const resolved=saved===b?saved.turn-1:saved.turns;for(let turn=1;turn<=Math.min(resolved,f.pattern.length);turn++)observe(g,{foe:f.id,variant,turn,rules:3,tutorial:false});}}
    }
    state.gameplay=g;return g;
  }
  function experience(state,kind,id,title,text,now){
    // A saved conversation choice is independent of training; it is neither lost nor consumed.
    const pending=state.pendingEvent;state.pendingEvent=null;
    const out=E.act(state,kind,id,now);
    state.pendingEvent=pending;
    if(out.ok){out.memory.title=title;out.memory.text=text;out.memory.userText='';state.chats.at(-1).text=text;const a=state.appearances.at(-1);if(a?.id===id){a.reason=title+' · '+state.actions+'回目';a.appearance.parts=[...state.gameplay.equipped];a.appearance.locomotion=state.gameplay.locomotion;}}
    return out;
  }
  function train(state,kind,id,now=Date.now()){
    const g=state.gameplay,d=DRILLS[kind];
    if(!d||g.battle||g.slots<=0||state.handled.includes(id))return {ok:false};
    const before=stats(g)[kind];
    const out=experience(state,d.kind,id,d.name,d.line,now);if(!out.ok)return out;
    g.xp[kind]=Math.min(12,g.xp[kind]+1);g.slots--;g.condition=kind;state.updatedAt=now;
    const reps=g.xp[kind],line=stats(g)[kind]>before?'今の'+d.name+'、さっきよりできた！ 基礎がひとつ上がった。':reps>=12?'この構え、もう慣れた。次はどの相手に試す？':reps%3===2?'もう一度'+d.name+'。次は、どの相手に試す？':d.line;
    out.memory.text=line;state.chats.at(-1).text=line;return {ok:true,line};
  }
  function scout(state,id,now=Date.now()){
    const g=state.gameplay;if(g.battle||g.scouted)return {ok:false};
    const out=experience(state,'explore',id,'対戦相手を見回った','巻き岩は、ためたあとに大技。そのあと息切れ。ぼく、そこを狙ってみたい！',now);
    if(out.ok)g.scouted=true;return out;
  }
  function start(state,foe,id,now=Date.now(),variant=null){
    const g=state.gameplay,f=encounterFor({foe,variant});if(!f||foe==='gate'&&(!routeFor(variant)||!chapterUnlocked(g))||foe!=='gate'&&variant&&(variant!=='rematch'||foe!=='rock'||!g.wins.echo)||g.battle||!unlocked(g,foe)||state.handled.includes(id)||!state.customized)return {ok:false};
    const s=effective(g);g.attempts++;g.battle={id,foe,variant,goal:variant==='rematch'?g.challengeGoal:null,turn:1,stats:s,hp:20+s.guard*2,maxHp:20+s.guard*2,enemyHp:f.hp,breath:4,logs:[],mistakes:{heavyExposed:0,counterFails:0,attackShell:0,missedRecover:0,feintBlocked:0},dealt:0,taken:0,rules:3,rebound:0,readiness:0,tutorial:g.wins[foe]===0,opening:false,counters:0,gateOpen:0,gateOpens:0};g.result=null;state.updatedAt=now;return {ok:true};
  }
  function preview(b,action){
    const m=moveFor(b),s=b.stats,focus=s.focus+(b.rules>=3?b.readiness||0:0);
    if(action==='attack')return {cost:2,damage:b.foe==='gate'&&!b.gateOpen||m.key==='shell'?1:(s.power+2+(b.rebound||0))*(m.key==='recover'?2:1),incoming:m.key==='feint'?0:m.damage};
    if(action==='defend')return {cost:0,damage:0,incoming:m.key==='feint'?m.damage:Math.max(0,m.damage-(4+s.guard*2))};
    if(action==='counter')return {cost:1,damage:m.focus&&focus>=m.focus?(b.foe==='gate'&&!b.gateOpen?1:s.focus+3):0,incoming:m.key==='feint'?0:(m.focus&&focus>=m.focus?0:m.damage)};
    return null;
  }
  function diagnose(b,outcome,timedOut){
    const m=b.mistakes;if(b.foe==='gate'){if(outcome==='win')return '門を'+b.gateOpens+'回ひらき、'+b.turn+'手で境界の庭を越えた。受けた衝撃は'+b.taken+'。';if(!b.gateOpens)return b.variant==='gate-shield'?'門が閉じたままだった。盾の道は重い衝撃を完全に受け切るとひらく。守りと部位を組み替えて試そう。':'門が閉じたままだった。風の道は踏み込みの見切りでひらく。集中と部位を組み替えて試そう。';return '門はひらけた。3手の隙に打撃と見切りを通し、息も残してみよう。部位と構えを変えて再挑戦できる。';}
    if(outcome==='win')return '合図を読んで、'+b.turn+'手で勝利。受けた衝撃は'+b.taken+'。部位と構えを変えて、別の戦法も試せる。';
    if(m.heavyExposed)return '大技の前に攻撃して、直撃を受けた。大技は防御、息切れは攻撃へ。受け身の訓練で被害も減らせる。';
    if(m.counterFails)return '集中が足りず、見切りが失敗した。必要値を確認して見切り練習。届くまでは防御を使おう。';
    if(m.feintBlocked)return 'フェイントに防御を合わせて崩された。この合図には攻撃。突進と読み分けよう。';
    if(m.attackShell)return '硬い殻に攻撃して、息を使った。殻は防御で回復し、息切れに大きく打とう。';
    if(timedOut||m.missedRecover)return '守るだけでは倒せない。制限手数までに体力を削ろう。息切れへの攻撃は2倍。打ちこみで威力を上げられる。';
    return '攻撃を受けすぎた。合図に合わせて防御か見切りを使い、無傷の隙に攻めよう。';
  }
  function choose(state,action,turnToken,now=Date.now()){
    const g=state.gameplay,b=g.battle;
    if(!b||turnToken!==b.id+':'+b.turn||!['attack','defend','counter'].includes(action))return {ok:false};
    const p=preview(b,action),m=moveFor(b),f=encounterFor(b);
    if(b.breath<p.cost)return {ok:false,error:'息が足りない。防御すると2回復する。'};
    observe(g,b);
    if(b.foe==='gate'){const opened=!b.gateOpen&&(b.variant==='gate-shield'?m.key==='heavy'&&action==='defend'&&p.incoming===0:m.key==='quick'&&action==='counter'&&p.damage>0);b.gateOpen=opened?3:Math.max(0,b.gateOpen-1);if(opened){b.gateOpens++;g.notes[b.variant].opening=true;}}
    b.breath=action==='defend'?Math.min(4,b.breath+2):b.breath-p.cost;
    const returnPower=b.rules>=1&&(b.foe!=='rock'||b.variant==='rematch')&&action==='defend'&&m.focus&&p.incoming===0?Math.floor(b.stats.guard/2):0;
    b.opening=b.variant==='rematch'&&m.key==='heavy'&&(action==='counter'&&p.damage>0||action==='defend'&&p.incoming===0);
    if(b.opening)g.notes.rematch.opening=true;
    const prepared=b.rules>=3&&action==='defend'&&['charge','shell'].includes(m.key);
    if(m.focus)b.readiness=0;
    if(prepared)b.readiness=2;
    if(action==='attack')b.rebound=0;
    if(returnPower)b.rebound=Math.max(b.rebound||0,returnPower);
    b.enemyHp=Math.max(0,b.enemyHp-p.damage);b.hp=Math.max(0,b.hp-p.incoming);b.dealt+=p.damage;b.taken+=p.incoming;
    if(action==='counter'&&p.damage>0)b.counters++;
    if(m.key==='heavy'&&action==='attack')b.mistakes.heavyExposed++;
    if(action==='counter'&&m.focus&&!p.damage)b.mistakes.counterFails++;
    if(m.key==='shell'&&action==='attack')b.mistakes.attackShell++;
    if(m.key==='recover'&&action!=='attack')b.mistakes.missedRecover++;
    if(m.key==='feint'&&action==='defend')b.mistakes.feintBlocked++;
    const name={attack:'攻撃',defend:'防御',counter:'見切り'}[action];
    let note=action==='counter'?(m.focus?(p.damage?'見切り成功！':'集中不足で失敗。'):'飛びこむ攻撃が来なかった。'):m.key==='shell'&&action==='attack'?'殻に弾かれた。':m.key==='recover'&&action==='attack'?'隙に2倍の一撃！':'';
    if(returnPower)note+='受け返しを蓄えた（次の攻撃 +'+returnPower+'）。';
    if(prepared)note+='動きを見据えた（次の打撃の見切りに集中 +2）。';
    if(b.foe==='gate'&&b.gateOpen===3)note+='門がひらいた！ 3手の隙がある。';
    if(b.foe==='gate'&&!b.gateOpen&&m.phaseNotice.startsWith('門がひらいた'))note+='門が閉じた。次の合図で、もう一度ひらける。';
    const log=b.turn+'手目 · '+name+' → '+p.damage+'与え / '+p.incoming+'受け。'+note;
    b.logs.push(log);b.logs=b.logs.slice(-6);state.updatedAt=now;
    // Simultaneous resolution: a reckless mutual knockout is a defeat.
    const timedOut=b.turn>=f.limit;
    if(b.hp===0||b.enemyHp===0||timedOut){
      const outcome=b.hp>0&&b.enemyHp===0?'win':'loss';
      const reason=diagnose(b,outcome,timedOut),line=outcome==='win'?(b.counters>=2?'見えた！ '+b.counters+'回も飛びこめた。きみの指示、覚えたよ。':b.taken===0?'一度も当たらなかった！ ちゃんと受けて、返せたね。':b.turn<=6?'すぐ決まった！ '+b.turn+'手だ。強くぶつかるの、少し上手になった。':'勝った…！ '+b.taken+'受けたけど、最後まで一緒だったね。'):'うう、負けた。あの合図、ちゃんと見られなかった。もう一回、教えて。';
      g.result={foe:b.foe,variant:b.variant,goal:b.goal,markEarned:false,achievedMarks:[],earnedMarks:[],recordFirst:false,recordTurns:false,recordTaken:false,counters:b.counters,outcome,turns:b.turn,reason,line,time:now,dealt:b.dealt,taken:b.taken,reward:null,rewards:[],rewardDismissed:false,gateOpens:b.gateOpens||0};
      if(outcome==='win'){
        if(b.foe==='gate')g.chapterWins[routeFor(b.variant).route]++;else g.wins[b.foe]++;
        if(b.variant==='rematch')g.rematchWins++;
        const key=b.variant||b.foe,old=g.records[key];g.result.recordFirst=!old;g.result.recordTurns=!!old&&b.turn<old.turns;g.result.recordTaken=!!old&&b.taken<old.taken;g.records[key]={turns:Math.min(old?.turns??16,b.turn),taken:Math.min(old?.taken??1000,b.taken)};
        recognize(g,g.result);
        const rewards=Object.keys(PARTS).filter(id=>(PARTS[id].chapter?b.foe==='gate':PARTS[id].foe===b.foe)&&!g.parts.includes(id));
        g.parts.push(...rewards);g.parts=Object.keys(PARTS).filter(id=>g.parts.includes(id));g.result.rewards=rewards;g.result.reward=g.goalParts.find(id=>rewards.includes(id))||rewards[0]||null;
      }
      const kind=g.condition?DRILLS[g.condition].kind:'explore';
      experience(state,kind,b.id+'-result',f.name+'に'+(outcome==='win'?'勝った':'挑んだ'),line+' '+reason,now);
      g.battle=null;g.slots=3;g.condition=null;g.scouted=false;
      return {ok:true,finished:true,result:g.result,log};
    }
    b.turn++;return {ok:true,log};
  }
  function equip(state,id){const g=state.gameplay;if(g.battle||!g.parts.includes(id))return false;g.equipped=g.equipped.includes(id)?g.equipped.filter(x=>x!==id):[...g.equipped,id];return true;}
  function setGoal(state,id){if(!Object.hasOwn(GOALS,id))return false;state.gameplay.goal=id;state.gameplay.goalParts=[...GOALS[id].parts];return true;}
  function toggleGoalPart(state,id){if(!validPart(id)||!availableParts(state.gameplay).includes(id))return false;const g=state.gameplay;g.goal='custom';g.goalParts=g.goalParts.includes(id)?g.goalParts.filter(x=>x!==id):[...g.goalParts,id];return true;}
  function wearGoal(state){const g=state.gameplay;if(g.battle)return false;g.equipped=g.goalParts.filter(id=>g.parts.includes(id));return true;}
  function goalPlan(g){
    const owned=g.goalParts.filter(id=>g.parts.includes(id)),missing=g.goalParts.filter(id=>!g.parts.includes(id));
    if(!missing.length&&chapterUnlocked(g)){const first=!Object.values(g.chapterWins).some(n=>n>0);return {owned,total:g.goalParts.length,missing,foe:'gate',variant:CHAPTER_ROUTES[g.chapterRoute].variant,next:first?'境界の庭へ。部位を組み合わせて、星の軌跡を獲得しよう。':'星の軌跡を獲得！ もう一つの道も、好きな姿と組合せで試せる。'};}
    if(!missing.length){const foe=g.wins.spark&&!g.wins.echo?'echo':g.wins.echo&&g.challengeMarks.length<3?'rock':null,variant=foe==='rock'?'rematch':null;
      const next=variant?'巻き岩・再戦で「'+CHALLENGE_GOALS[g.challengeGoal].name+'」を試そう。達成 '+g.challengeMarks.length+' / 3。':foe==='echo'?'目標の部位を獲得済み。この姿でひびき輪へ挑み、機械腕も試そう。':g.rematchWins?'再戦の3つの印を獲得！ 部位と構えを替え、自己ベストを比べよう。':g.goalParts.length?'目標の部位を獲得済み。装着して、この姿へ。':'丸い核のまま、次の挑戦へ。';
      return {owned,total:g.goalParts.length,missing,foe,variant,next};}
    const part=PARTS[missing[0]];if(part.chapter)return {owned,total:g.goalParts.length,missing,foe:chapterUnlocked(g)?'gate':'rock',variant:chapterUnlocked(g)?CHAPTER_ROUTES[g.chapterRoute].variant:'rematch',next:chapterUnlocked(g)?'境界の庭を越えて、星の軌跡を獲得。':'再戦の3印を獲得すると、境界の庭への道がひらく。'};const destination=foeFor(part.foe),foe=unlocked(g,part.foe)?part.foe:!g.wins.rock?'rock':'spark';
    const next=foe===part.foe?destination.name+'の初勝で、'+missing.filter(id=>PARTS[id].foe===foe).map(id=>PARTS[id].name).join('・')+'を獲得。':foeFor(foe).name+'に初勝して道を開く。その先の'+destination.name+'で'+part.name+'を獲得。';
    return {owned,total:g.goalParts.length,missing,foe,next};
  }
  function setChallengeGoal(state,k){if(state.gameplay.battle||!Object.hasOwn(CHALLENGE_GOALS,k))return false;state.gameplay.challengeGoal=k;return true;}
  function setChapterRoute(state,k){if(state.gameplay.battle||!chapterUnlocked(state.gameplay)||!Object.hasOwn(CHAPTER_ROUTES,k))return false;state.gameplay.chapterRoute=k;return true;}
  return {CHAPTER_ROUTES,chapterUnlocked,availableParts,partCondition,setChapterRoute,DRILLS,PARTS,GOALS,MOVES,FOES,REMATCH,CHALLENGE_GOALS,encounterFor,displayStat,ensure,stats,effective,unlocked,moveFor,preview,train,scout,start,choose,equip,setGoal,toggleGoalPart,wearGoal,goalPlan,setChallengeGoal,preparationNotes};
});
