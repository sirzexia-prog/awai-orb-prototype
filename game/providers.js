(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AwaiProviders = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Interface: respond({message,state,signal}) -> {reply,event:{prompt}}.
  // This provider is explicitly a keyword/rule demo. It never makes a network call.
  class DemoConversationProvider {
    constructor(){this.mode='demo';}
    async respond({message,state}) {
      const recall=state.memories.at(-1);
      let reply;
      if (/覚え|思い出|記憶/.test(message)) reply=recall ? '記録をめくったよ。「'+recall.title+'」をいっしょにしたね。'+(recall.userText?'そのときは「'+recall.userText+'」って話してくれた。':'') : 'まだ記録は少ないね。今日の小さなことから、いっしょに残そう。';
      else if (/疲|つかれ|しんど|悲|不安/.test(message)) reply='ぼくも足がふらふら。ゆっくり休憩したら、おやつ半分ちょうだい。';
      else if (/戦|勝|強|訓練/.test(message)) reply='勝ったら、ぼくが先頭！ …でも大技はこわい。指示を間違えないでね。';
      else if (/楽|うれし|嬉|わくわく|探検/.test(message)) reply='探検？ いく！ …さっき、岩の影で転んだことは内緒だよ。';
      else if (/久しぶり|ただいま/.test(message)) reply='あ、帰ってきた！ 今日は何からやる？ ぼく、まだ巻き岩の動きを練習中。';
      else reply='「'+message.slice(0,60)+'」か。うーん、まだよくわからない。とりあえず、次の行き先を決めて！';
      return {reply,event:{prompt:'光の庭で、小さな光が揺れている。どう過ごそう？'}};
    }
  }
  // Future opt-in server adapter. Unused in this prototype; no key belongs in this file.
  class ServerConversationProvider {
    constructor(endpoint='/api/conversation') {
      if(!endpoint.startsWith('/') || endpoint.startsWith('//')) throw new Error('same-origin endpoint required');
      this.endpoint=endpoint;this.mode='server';
    }
    async respond({message,state,signal}) {
      const response=await fetch(this.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',signal,
        body:JSON.stringify({message:message.slice(0,180),companion:{id:state.id,traits:state.traits},memories:state.memories.slice(-3).map(m=>({title:m.title,userText:m.userText}))})});
      if(!response.ok) throw new Error('conversation-unavailable');
      const result=await response.json();
      if(typeof result.reply!=='string' || !result.event || typeof result.event.prompt!=='string') throw new Error('invalid-conversation');
      return {reply:result.reply.slice(0,400),event:{prompt:result.event.prompt.slice(0,120)}};
    }
  }
  class ProceduralAppearanceProvider {
    constructor(engine){this.engine=engine;this.mode='procedural';}
    async propose({seed,traits,actions,baseStyle}){return {appearance:this.engine.appearanceFor(seed,traits,actions,baseStyle),source:'procedural'};}
  }
  // Future generated-appearance boundary; see docs/AI-CONNECTION.md. No implementation or API call yet.
  return {DemoConversationProvider,ServerConversationProvider,ProceduralAppearanceProvider};
});
