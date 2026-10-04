(function(root){
  'use strict';
  // Original pixel designs authored on a 100-column grid. No vector downsampling or image assets.
  const GRID=100,frames=new WeakMap(),H=(h,s,l,a=1)=>`hsla(${h},${s}%,${l}%,${a})`;
  function frame(canvas){let c=frames.get(canvas);const height=Math.round(canvas.height*GRID/canvas.width);if(!c){c=document.createElement('canvas');frames.set(canvas,c);}if(c.width!==GRID||c.height!==height){c.width=GRID;c.height=height;}c.getContext('2d').clearRect(0,0,c.width,c.height);return c;}
  function present(canvas,source){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;c.drawImage(source,0,0,canvas.width,canvas.height);canvas.dataset.pixelGrid=source.width+'×'+source.height;}
  function tools(c,x,y){const ctx=c.getContext('2d');
    const dot=(px,py,color)=>{ctx.fillStyle=color;ctx.fillRect(x+Math.round(px),y+Math.round(py),1,1);};
    const rect=(px,py,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x+Math.round(px),y+Math.round(py),w,h);};
    function line(x0,y0,x1,y1,color){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let e=dx+dy;for(;;){dot(x0,y0,color);if(x0===x1&&y0===y1)break;const p=2*e;if(p>=dy){e+=dy;x0+=sx;}if(p<=dx){e+=dx;y0+=sy;}}}
    function poly(points,color,edge){const ys=points.map(p=>p[1]);for(let yy=Math.min(...ys);yy<=Math.max(...ys);yy++){const xs=[];for(let i=0;i<points.length;i++){const [ax,ay]=points[i],[bx,by]=points[(i+1)%points.length];if((ay<=yy&&by>yy)||(by<=yy&&ay>yy))xs.push(ax+(yy-ay)*(bx-ax)/(by-ay));}xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)line(Math.ceil(xs[i]),yy,Math.floor(xs[i+1]),yy,color);}if(edge)points.forEach((p,i)=>line(...p,...points[(i+1)%points.length],edge));}
    function ellipse(cx,cy,rx,ry,color,edge){for(let yy=-ry;yy<=ry;yy++)for(let xx=-rx;xx<=rx;xx++){const q=xx*xx/(rx*rx)+yy*yy/(ry*ry);if(q<=1)dot(cx+xx,cy+yy,edge&&q>.79?edge:color);}}
    function ring(cx,cy,rx,ry,color){for(let yy=-ry;yy<=ry;yy++)for(let xx=-rx;xx<=rx;xx++){const q=xx*xx/(rx*rx)+yy*yy/(ry*ry);if(q>.87&&q<=1.07)dot(cx+xx,cy+yy,color);}}
    function star(px,py,color,edge){line(px-2,py,px+2,py,edge||color);line(px,py-2,px,py+2,edge||color);dot(px,py,color);dot(px-1,py,color);dot(px+1,py,color);dot(px,py-1,color);dot(px,py+1,color);}
    return {ctx,dot,rect,line,poly,ellipse,ring,star};
  }
  function draw(canvas,a,time=0,reduced=false,pose={}){
    const c=frame(canvas),t=reduced?0:time*.001*(a.pace||1),bob=reduced?0:Math.round(Math.sin(t*1.6));
    const x=50+(pose.shift||0),y=Math.round(c.height*.52)+bob,{ctx,dot,rect,line,poly,ellipse,ring,star}=tools(c,x,y);
    const parts=Array.isArray(a.parts)?a.parts:[],locked=a.lockedParts||[],ink=H(a.hue-9,58,28),shine=H(a.hue+4,89,82),main=H(a.hue,76,58),dark=H(a.hue-5,73,40);
    if(pose.maturity>=.6){
      const royal=parts.includes('dress')||parts.includes('crown'),machine=parts.includes('arms')||parts.includes('armor');
      if(royal){
        const edge='#514169',cloth=H(a.hue+20,63,52),silk=H(a.hue+17,63,77);
        poly([[-12,2],[-21,8],[-32,27],[-18,31],[-6,24],[0,32],[7,25],[20,31],[32,26],[20,6],[12,1]],cloth,edge);
        for(const side of [-1,1]){
          const p=points=>points.map(([xx,yy])=>[side*xx,yy]);
          poly(p([[11,6],[16,6],[27,25],[20,29],[13,21]]),silk,edge);poly(p([[17,9],[22,10],[30,25],[26,28],[21,20]]),H(a.hue+34,55,64),edge);
          line(side*17,8,side*26,24,'#f2dfcf');line(side*18,28,side*27,26,'#f9e8d1');
          poly(p([[11,-12],[16,-20],[24,-13],[21,-5],[14,-2]]),'#b39ec8',edge);
          line(side*15,-13,side*20,-14,'#fff0dc');
          poly(p([[24,-20],[28,-27],[32,-20],[30,-4],[25,-3]]),'#777ec1','#3e4d86');
          poly(p([[26,-20],[28,-25],[30,-20],[28,-16]]),'#dcf7f2','#e8f4cf');
          line(side*28,-4,side*29,14,'#cfdedb');star(side*29,16,'#fff1ba','#8570ad');
          ellipse(side*20,4,4,5,'#8068a7',edge);line(side*20,8,side*24,13,'#f5e9d5');
        }
        ring(0,-5,34,26,'#83c8d977');ring(0,-5,33,25,'#d9fcf29c');
        poly([[-12,-23],[-9,-30],[-5,-26],[0,-34],[5,-26],[9,-30],[12,-23],[9,-20],[-9,-20]],'#c7a159','#705433');line(-8,-27,-5,-24,'#fff0bc');line(1,-31,4,-27,'#fff0bc');
      }
      if(machine){
        const p=side=>points=>points.map(([xx,yy])=>[side*xx,yy]);
        for(const side of [-1,1]){
          const q=p(side);
          poly(q([[13,-17],[23,-26],[31,-22],[36,-9],[29,-2],[15,-6]]),'#536d8d','#263c56');
          poly(q([[17,-17],[24,-23],[28,-19],[30,-9],[23,-7]]),'#aac2ce','#3c566e');line(side*19,-16,side*26,-18,'#e8f6ea');
          poly(q([[29,-18],[35,-16],[39,-6],[36,2],[29,-2]]),'#364e6e','#25384e');rect(side<0?-36:30,-12,6,3,'#b4e5e4');
          ellipse(side*22,4,5,6,'#7995ad','#263c56');ellipse(side*22,4,2,3,'#b0f0e4','#e5f4de');
          poly(q([[21,6],[30,3],[39,13],[36,23],[29,25],[22,18]]),'#7d9ba7','#263c56');
          poly(q([[25,8],[30,7],[35,14],[32,19],[27,17]]),'#c1d2d3');rect(side<0?-34:28,13,7,3,'#6dc5c8');
          poly(q([[30,22],[37,21],[40,27],[36,29],[34,25],[31,30],[27,28]]),'#354e64','#223b51');
          if(a.locomotion==='legs'){const dy=side*(pose.walk||0);poly(q([[7,14+dy],[15,16+dy],[15,29+dy],[7,31+dy]]),'#617d94','#243b53');poly(q([[7,28+dy],[16,27+dy],[21,32+dy],[18,34+dy],[5,34+dy]]),'#3c586c','#22394e');line(side*9,29+dy,side*15,29+dy,'#b5e1db');}
          else{poly(q([[7,16],[14,15],[16,23],[10,27],[5,23]]),'#536b85','#263c56');line(side*8,27,side*12,31,'#b5f0e6');}
        }
        poly([[-10,6],[-16,13],[-12,22],[0,26],[12,22],[16,13],[10,6]],'#526d8b','#263c56');poly([[-9,11],[-5,15],[0,13],[5,15],[9,11],[8,20],[0,23],[-8,20]],'#b1c7cf','#3c566e');ellipse(0,18,3,3,'#72d0c6','#e8f8e6');
      }
      if(!royal&&!machine){
        poly([[-9,-6],[-20,-10],[-28,-2],[-25,19],[-16,30],[-7,27],[0,31],[7,27],[17,30],[27,18],[28,-2],[20,-10],[9,-6]],H(a.hue-7,46,48),H(a.hue-15,37,29));
        for(const side of [-1,1]){const q=points=>points.map(([xx,yy])=>[side*xx,yy]);poly(q([[14,-7],[22,-13],[31,-5],[27,4],[17,5]]),H(a.hue+15,47,72),H(a.hue-15,37,29));poly(q([[14,7],[22,5],[28,18],[19,26],[11,23]]),H(a.hue+8,49,65),H(a.hue-15,37,29));line(side*18,9,side*23,21,'#e6efcf');ellipse(side*28,8,4,5,H(a.hue+20,49,63),H(a.hue-15,37,29));star(side*31,-8,'#ecf4cf','#669d9e');}
        ring(0,2,33,23,'#8dcbbc');poly([[-8,12],[0,10],[8,12],[7,23],[0,27],[-7,23]],H(a.hue+10,38,79),H(a.hue-15,37,29));ellipse(0,18,3,3,'#b9e8d5','#3b7374');
      }
    }
    function module(id,paint){if(!parts.includes(id))return;ctx.save();if(locked.includes(id))ctx.globalAlpha=.27;paint();ctx.restore();}
    module('trail',()=>{for(const side of [-1,1]){line(side*11,6,side*20,2,'#ca4a93');line(side*20,2,side*25,-8,'#ed72bd');line(side*25,-8,side*26,-21,'#ed72bd');for(const [px,py] of [[20,-4],[25,-12],[26,-22]])star(side*px,py,'#fff1d0','#c94392');}});
    module('magic',()=>{ring(0,0,24,17,'#194f82');ring(0,-1,23,16,'#79f5ff');ring(0,-1,21,14,'#cdfdff');for(const [px,py] of [[-23,0],[-16,-12],[16,12],[23,0],[16,-12]]){rect(px-1,py-1,3,3,'#2c89b5');star(px,py,'#fffbe8','#77eaf4');}line(-10,15,6,15,'#bffcff');});
    if(a.locomotion==='legs')for(const side of [-1,1]){const step=side*(pose.walk||0);poly([[side*3,7+step],[side*8,7+step],[side*9,18+step],[side*4,19+step]],'#607d99','#213e53');rect(side<0?-9:4,10+step,5,2,'#aecfe3');poly([[side*3,17+step],[side*9,17+step],[side*12,21+step],[side*2,21+step]],'#264158','#142b42');line(side*4,18+step,side*8,18+step,'#76e3d2');}
    module('dress',()=>{poly([[-6,6],[6,6],[14,17],[9,20],[3,18],[0,21],[-3,18],[-9,20],[-14,17]],H(a.hue+36,65,49),'#57396e');poly([[-5,7],[-1,8],[-5,18],[-11,17]],H(a.hue+20,73,77));poly([[3,7],[6,7],[12,17],[7,18]],H(a.hue+28,63,65));line(-13,18,-8,20,'#ffe6ff');line(8,20,13,18,'#ffe6ff');rect(-2,18,5,2,'#b286d5');});
    module('arms',()=>{for(const side of [-1,1]){const p=points=>points.map(([px,py])=>[px*side,py]);poly(p([[8,-3],[14,-4],[17,2],[14,8],[10,5]]),'#486a85','#1d3b52');poly(p([[15,2],[22,2],[25,10],[19,13],[16,8]]),'#84a8bf','#244256');line(side*16,3,side*21,3,'#d1edee');rect(side<0?-22:18,6,5,2,'#75ead5');poly(p([[20,11],[25,10],[26,16],[23,17],[23,13],[21,17],[19,16]]),'#244154','#132f42');ellipse(side*14,2,2,2,'#83ece0','#244256');}});
    module('armor',()=>{for(const side of [-1,1]){const p=points=>points.map(([px,py])=>[px*side,py]);poly(p([[5,-7],[11,-12],[17,-8],[15,-3],[10,-2]]),'#7386a6','#32435f');poly(p([[10,-10],[12,-18],[16,-11]]),'#b9d4e0','#516886');line(side*7,-7,side*11,-10,'#d2e6ee');line(side*11,-3,side*15,-4,'#405578');}});
    // Fixed small core: 11 grid units at every experience level; stepped palette, single-pixel outline.
    for(let yy=-11;yy<=11;yy++)for(let xx=-11;xx<=11;xx++)if(xx*xx+yy*yy<=121){const edge=xx*xx+yy*yy>99;let fill=edge?ink:(pose.lightFromRight?-xx+yy:xx+yy)<-7?shine:(pose.lightFromRight?-xx+yy:xx+yy)<0?H(a.hue,82,67):yy>6?dark:main;dot(xx,yy,fill);}
    line(-7,-7,-4,-8,shine);rect(-8,-5,2,3,shine);
    for(let i=0;i<(a.markings||0);i++){const dx=Math.round(Math.cos((a.seed%97)*.1+i*2.399)*7),dy=Math.round(Math.sin((a.seed%97)*.1+i*2.399)*7);if(Math.abs(dx)>6||dy>5)dot(dx,dy,H(a.hue+20,80,78));}
    module('crown',()=>{poly([[-8,-11],[-10,-19],[-4,-15],[0,-25],[4,-15],[10,-19],[8,-11]],'#f1c75d','#84602e');line(-8,-18,-6,-14,'#fff1ad');line(0,-23,3,-17,'#fff1ad');rect(-8,-11,17,3,'#916837');rect(-7,-11,15,1,'#ffe9a4');poly([[0,-20],[2,-17],[0,-14],[-2,-17]],H(a.hue+75,80,68),'#fff4d6');});
    module('armor',()=>{poly([[-9,5],[-5,7],[0,6],[5,7],[9,5],[8,10],[0,14],[-8,10]],'#607394','#2e415c');line(-8,6,-4,8,'#bbd3e2');line(4,8,8,6,'#bbd3e2');poly([[-3,9],[0,7],[3,9],[2,12],[0,13],[-2,12]],'#b3cddd','#e5f8ee');rect(-1,9,3,2,'#62e8cc');});
    const blink=!reduced&&Math.sin(t*.7)>.996,eye='#fffbe8';
    for(const side of [-1,1]){const ex=side*4+(pose.facing||0);
      if(a.eyes==='line'||blink)rect(ex-2,-3,5,1,eye);
      else if(a.eyes==='arc'){line(ex-2,-2,ex-1,-4,eye);line(ex-1,-4,ex+1,-4,eye);line(ex+1,-4,ex+2,-2,eye);}
      else if(a.eyes==='hollow'){rect(ex-1,-8,3,11,eye);rect(ex-2,-6,5,7,eye);}
      else {rect(ex-1,-5,3,5,eye);rect(ex-2,-4,5,3,eye);}
    }
    if(a.mouth==='teeth'||a.mouth==='fang'){rect(-4,4,9,3,ink);if(a.mouth==='teeth'){for(let i=-3;i<=3;i+=2)rect(i,4,1,2,eye);for(let i=-2;i<=2;i+=2)dot(i,6,eye);}else{rect(-3,4,2,2,eye);rect(2,4,2,2,eye);}}
    else if(a.mouth==='flat')rect(-2,5,5,1,ink);else if(a.mouth==='dot')rect(0,5,1,2,ink);else if(a.mouth!=='none'){line(-2,4,-1,5,ink);line(-1,5,1,5,ink);dot(2,4,ink);}
    present(canvas,c);
  }
  function drawEnemy(canvas,foe,move,time=0,reduced=true,pose={}){
    const c=frame(canvas),t=reduced?0:time*.001,{dot,rect,line,poly,ellipse,ring}=tools(c,50+(pose.shift||0),Math.round(c.height*.5)+(reduced?0:Math.round(Math.sin(t*1.2))));
    const eye='#fffbe8';
    if(foe.id==='rock'){
      poly([[-19,-10],[-11,-21],[6,-22],[20,-10],[23,7],[11,21],[-9,23],[-23,7]],'#b99152','#645330');poly([[-17,-10],[-9,-18],[5,-19],[13,-12],[2,-4],[-14,0]],'#e9ce89');poly([[7,5],[19,-2],[18,12],[8,20],[-5,20]],'#967340');line(-15,9,-6,15,'#f3db9c');line(-9,-4,-5,-7,'#79603a');line(5,-8,9,-4,'#79603a');rect(-8,-1,3,7,eye);rect(5,-1,3,7,eye);rect(-3,11,7,1,'#5d432a');
    }else if(foe.id==='spark'){
      poly([[-20,8],[-18,-7],[-10,-4],[-3,-23],[4,-11],[13,-14],[11,-2],[22,6],[17,18],[2,23],[-13,19]],'#ed7c50','#9b4350');poly([[-13,7],[-7,-7],[-4,-4],[0,-14],[8,0],[15,8],[9,17],[-7,17]],'#ffc971');poly([[-7,7],[-1,-2],[7,8],[3,16],[-6,14]],'#fff3b2');rect(-8,1,3,7,'#633e5c');rect(5,1,3,7,'#633e5c');
    }else if(foe.id==='gate'){
      const open=move?.phaseNotice?.startsWith('門がひらいた');ring(0,0,23,25,'#4785a4');ring(0,-1,22,24,'#85e7ed');ring(0,-1,19,21,'#e9ffff');ring(0,0,open?15:5,19,'#58c9df');rect(-29,-6,4,12,'#7be4e1');rect(26,-6,4,12,'#7be4e1');rect(-26,-4,3,8,'#ecfffc');rect(23,-4,3,8,'#ecfffc');if(open){line(-8,17,0,21,'#fff8c6');line(0,21,8,17,'#fff8c6');}
    }else{
      ellipse(0,0,23,24,'#a28bd9','#665590');ellipse(-3,-4,20,20,'#c3b3f0');ellipse(0,-5,9,10,'#294d6d','#6f68ab');line(-13,-13,-8,-17,'#f0e9ff');rect(-8,8,3,7,eye);rect(6,8,3,7,eye);rect(-3,19,7,1,'#5f4a85');
    }
    present(canvas,c);
  }
  function drawBattleGround(canvas,look,foe,move,time=0,reduced=false,effect=null){
    const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,t=reduced?0:time*.001;
    ctx.clearRect(0,0,w,h);const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#b7e5ff');sky.addColorStop(.55,'#eefbff');sky.addColorStop(1,'#e1f4ed');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    const poly=(points,color)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x*w,y*h):ctx.moveTo(x*w,y*h));ctx.closePath();ctx.fillStyle=color;ctx.fill();};
    // Atmospheric distance and a perspective ground plane are 2.5D layers, not a 3D engine.
    poly([[0,.48],[.12,.13],[.27,.46],[.39,.24],[.58,.5],[.76,.13],[1,.47],[1,.68],[0,.68]],'#c4e0e8');
    poly([[0,.54],[.17,.32],[.3,.54],[.6,.36],[.77,.52],[.88,.32],[1,.48],[1,.72],[0,.72]],'#b5d6d6');
    poly([[0,.55],[.25,.49],[.68,.47],[1,.55],[1,1],[0,1]],'#d5e7d9');
    poly([[0,.8],[.22,.64],[.74,.62],[1,.78],[1,1],[0,1]],'#acc8be');
    poly([[.04,.7],[.29,.5],[.72,.5],[.96,.7],[.85,.83],[.13,.83]],'#edf0d5');
    poly([[.04,.7],[.13,.83],[.85,.83],[.96,.7],[.96,.79],[.85,.94],[.13,.94],[.04,.79]],'#91aba5');
    poly([[.13,.83],[.85,.83],[.85,.87],[.13,.87]],'#bfd2bd');
    ctx.strokeStyle='#bbcfbf';ctx.lineWidth=2;for(const d of [.55,.6,.67,.76]){ctx.beginPath();ctx.moveTo(w*(.29-(d-.5)*.86),h*d);ctx.lineTo(w*(.72+(d-.5)*.86),h*d);ctx.stroke();}for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(w*(.3+i*.068),h*.5);ctx.lineTo(w*(.12+i*.123),h*.82);ctx.stroke();}
    // Foreground foliage and a few cut stones give the floating arena depth without obscuring HP.
    poly([[0,.86],[.05,.69],[.09,.91],[.15,.83],[.19,1],[0,1]],'#75aaa1');poly([[.82,1],[.89,.78],[.94,.92],[.98,.69],[1,1]],'#77b3a9');
    for(const [x,y,r] of [[.24,.62,.09],[.76,.59,.105]]){ctx.fillStyle='rgba(40,77,88,.13)';ctx.beginPath();ctx.ellipse(w*x,h*y,w*r,h*.038,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(38,74,86,.11)';ctx.beginPath();ctx.ellipse(w*x,h*y,w*r*.68,h*.021,0,0,Math.PI*2);ctx.fill();}
    function light(x,y,r,color){const g=ctx.createRadialGradient(w*x,h*y,0,w*x,h*y,w*r);g.addColorStop(0,color);g.addColorStop(1,'rgba(150,235,255,0)');ctx.fillStyle=g;ctx.fillRect(w*(x-r),h*y-w*r,w*r*2,w*r*2);}
    if((look.parts||[]).includes('magic'))light(.24,.54,.19,'rgba(107,229,255,.24)');
    light(.76,.52,.18,foe?.id==='spark'?'rgba(255,191,108,.24)':foe?.id==='gate'?'rgba(126,233,232,.26)':'rgba(195,193,255,.12)');
    ctx.fillStyle='rgba(255,255,255,.58)';for(let i=0;i<9;i++){const x=(.08+i*.103)*w,y=(.11+((i*7)%9)*.036+Math.sin(t+i)*.008)*h;ctx.fillRect(Math.round(x),Math.round(y),3,3);}
    if(effect&&!reduced){const p=(time-effect.started)/360;if(p>=0&&p<1){ctx.globalAlpha=Math.sin(p*Math.PI)*.55;if(effect.action==='defend'){ctx.strokeStyle='#b6f9ff';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(w*.24,h*.42,w*.11,h*.25,0,-Math.PI*.6,Math.PI*.65);ctx.stroke();}else{const cx=w*(effect.action==='counter'?.76-.5*p:.24+.52*p);light(cx/w,.42,.12,'rgba(255,244,171,.65)');ctx.fillStyle='#fff9ce';ctx.fillRect(cx-8,h*.41,16,5);ctx.fillRect(cx-3,h*.41-5,6,15);}ctx.globalAlpha=1;}}
  }
  function drawDinosaur(canvas,pose='idle'){
    const c=frame(canvas),{dot,rect,line,poly,ellipse}=tools(c,50,Math.round(c.height*.49));
    const ink='#284953',skin='#6e9e8d',light='#a5c5a1',shade='#477b7e',cream='#eae5bd',jaw=pose==='bite'?7:0;
    poly([[-11,8],[-23,13],[-32,11],[-43,2],[-46,-9],[-39,-4],[-29,-1],[-19,-6],[-9,-2]],skin,ink);
    poly([[-43,0],[-32,9],[-20,11],[-8,5],[-14,13],[-31,13]],shade);
    if(pose==='tail'){poly([[-21,9],[-32,0],[-40,-13],[-47,-17],[-45,-4],[-34,12],[-16,18]],skin,ink);line(-43,-12,-34,4,light);}
    poly([[-21,-8],[-17,-21],[-8,-28],[8,-23],[20,-11],[25,7],[17,20],[-6,23],[-22,13]],skin,ink);
    poly([[-16,-17],[-7,-23],[7,-19],[15,-7],[11,9],[-9,11],[-17,0]],light);
    poly([[-21,5],[-8,15],[14,12],[21,2],[16,20],[-6,23],[-19,14]],shade);
    for(const [x,y]of [[-18,-20],[-10,-27],[0,-25],[9,-21]]){poly([[x-4,y],[x-1,y-10],[x+4,y-4],[x+5,y+3]],'#638a9b',ink);line(x-1,y-8,x+2,y-3,'#c3d7c3');}
    poly([[5,-14],[8,-24],[18,-33],[29,-32],[41,-25],[47,-16],[46,-11],[29,-8],[21,0],[9,4]],skin,ink);
    poly([[12,-23],[20,-29],[28,-28],[38,-23],[42,-17],[29,-16],[18,-9],[11,-12]],light);
    poly([[25,-13],[47,-13],[46,-8+jaw],[37,-4+jaw],[25,-4+jaw],[19,-8]],shade,ink);
    poly([[24,-13],[45,-13],[43,-8+jaw],[26,-7+jaw]],'#34515c');
    for(const x of [28,34,40])poly([[x,-12],[x+3,-12],[x+1,-7]],cream);
    if(jaw)for(const x of [29,37])poly([[x,-1],[x+3,-1],[x+1,-5]],cream);
    rect(23,-25,4,6,cream);line(22,-26,28,-27,ink);rect(40,-19,2,2,ink);
    poly([[-15,10],[-6,12],[-2,28],[-6,35],[-18,35],[-20,30],[-16,21]],shade,ink);
    poly([[10,10],[21,9],[26,24],[24,33],[13,34],[8,29],[13,21]],skin,ink);
    poly([[-18,31],[-6,31],[-2,35],[-5,38],[-22,37]],shade,ink);poly([[13,31],[25,30],[32,34],[29,37],[10,37]],shade,ink);
    for(const x of [-19,-12,13,20,27])poly([[x,33],[x+2,32],[x+3,37],[x,36]],cream);
    poly([[16,-2],[23,0],[28,8],[26,13],[22,8],[17,6]],shade,ink);line(24,8,26,12,cream);
    for(const [x,y]of [[-13,-8],[-5,-15],[5,-10],[-10,2],[1,5],[11,0],[18,-17],[33,-22]]){rect(x,y,3,2,'#4c837b');dot(x+1,y-1,'#d0d6b1');}
    if(pose==='charge'){line(-34,9,-26,17,'#c2c9a5');line(-29,13,-21,20,'#c2c9a5');}
    present(canvas,c);
  }
  // Independent floating modules around a small, constant-sized orb core.
  function drawAssembly(canvas,a,time=0,reduced=false,pose={}){
    const c=frame(canvas),t=reduced?0:time*.001*(a.pace||1),bob=reduced?0:Math.round(Math.sin(t*1.6)),y=Math.round(c.height*.52)+bob;
    const {ctx,dot,rect,line,poly,ellipse,ring,star}=tools(c,50+(pose.shift||0),y),parts=a.parts||[],tone=a.tone||'pastel';
    const black=tone==='black',white=tone==='white',dark=tone==='dark'||black,hue=a.hue||0;
    const ink=white?'#738491':dark?'#0b101e':H(hue-9,58,28),main=black?'#242936':white?'#ecf5fa':H(hue,tone==='vivid'?95:76,dark?27:58),shade=black?'#151a26':white?'#b8cbd6':H(hue-5,73,dark?16:40),shine=white?'#ffffff':dark?H(hue,48,62):H(hue+4,89,82);
    const plate=dark?'#212636':white?'#e0ebf0':H(hue,34,37),edge=dark?'#080d19':'#283647',metal=dark?'#545d76':white?'#ffffff':H(hue,29,66),accent=a.eyeColor||'#fffbe8';
    function module(id,paint){if(!parts.includes(id))return;ctx.save();if((a.lockedParts||[]).includes(id))ctx.globalAlpha=.27;paint();ctx.restore();}
    module('trail',()=>{for(const side of [-1,1]){line(side*15,10,side*25,20,accent);line(side*25,20,side*34,16,accent);star(side*34,16,accent);}});
    module('magic',()=>{ring(0,0,22,16,'#367fbb');ring(0,0,21,15,'#9febff');for(const [px,py] of [[-22,0],[22,0],[0,-16],[0,16]])star(px,py,accent,'#3b6896');});
    module('dress',()=>{for(const side of [-1,1]){const q=p=>p.map(([x,y])=>[x*side,y]);poly(q([[17,8],[24,11],[32,24],[23,27],[16,20]]),H(hue+15,56,dark?24:63),edge);line(side*21,13,side*26,23,metal);}});
    module('armor',()=>{for(const side of [-1,1]){const q=p=>p.map(([x,y])=>[x*side,y]);poly(q([[16,-13],[22,-25],[29,-20],[32,-10],[25,-5],[19,-6]]),plate,edge);poly(q([[21,-18],[23,-23],[27,-18],[28,-10],[23,-9]]),metal,edge);line(side*23,-16,side*27,-14,accent);poly(q([[14,14],[23,16],[27,24],[20,28],[13,22]]),plate,edge);line(side*17,19,side*23,22,metal);}});
    module('arms',()=>{for(const side of [-1,1]){const q=p=>p.map(([x,y])=>[x*side,y]);poly(q([[25,-15],[33,-20],[40,-14],[41,-5],[35,0],[27,-3]]),plate,edge);poly(q([[29,-13],[34,-17],[37,-12],[37,-5],[31,-4]]),metal,edge);ellipse(side*31,3,5,5,edge,metal);ellipse(side*31,3,2,2,accent);poly(q([[27,9],[36,6],[43,14],[41,25],[32,28],[25,21]]),plate,edge);poly(q([[29,11],[35,10],[39,16],[37,23],[31,24]]),metal,edge);rect(side<0?-38:31,17,7,2,accent);poly(q([[30,27],[39,27],[43,32],[41,36],[37,33],[34,37],[29,34]]),plate,edge);line(side*31,30,side*38,30,metal);}});
    module('crown',()=>{poly([[-10,-20],[-12,-29],[-6,-25],[0,-33],[6,-25],[12,-29],[10,-20]],plate,edge);line(-8,-24,0,-28,metal);line(0,-28,8,-24,metal);star(0,-24,accent);});
    if(a.locomotion==='legs')for(const side of [-1,1]){poly([[side*7,15],[side*12,17],[side*13,28],[side*5,29]],plate,edge);line(side*8,19,side*10,25,metal);}
    // Open space separates every satellite from the 22-pixel core; there is no human torso.
    ellipse(0,0,11,11,main,ink);ellipse(1,4,8,6,shade);line(-7,-7,-4,-8,shine);rect(-8,-5,2,3,shine);
    for(let i=0;i<(a.markings||0);i++){const dx=Math.round(Math.cos((a.seed%97)*.1+i*2.399)*7),dy=Math.round(Math.sin((a.seed%97)*.1+i*2.399)*7);if(Math.abs(dx)>6||dy>5)dot(dx,dy,shine);}
    const blink=!reduced&&Math.sin(t*.7)>.996;
    for(const side of [-1,1]){const ex=side*4+(pose.facing||0);if(a.eyes==='line'||blink)rect(ex-2,-3,5,1,accent);else if(a.eyes==='arc'){line(ex-2,-2,ex-1,-4,accent);line(ex-1,-4,ex+1,-4,accent);line(ex+1,-4,ex+2,-2,accent);}else if(a.eyes==='hollow'){rect(ex-1,-8,3,11,accent);rect(ex-2,-6,5,7,accent);}else {rect(ex-1,-5,3,5,accent);rect(ex-2,-4,5,3,accent);}}
    if(a.mouth==='teeth'||a.mouth==='fang'){rect(-4,4,9,3,ink);if(a.mouth==='teeth'){for(let i=-3;i<=3;i+=2)rect(i,4,1,2,accent);for(let i=-2;i<=2;i+=2)dot(i,6,accent);}else{rect(-3,4,2,2,accent);rect(2,4,2,2,accent);}}else if(a.mouth==='flat')rect(-2,5,5,1,ink);else if(a.mouth==='dot')rect(0,5,1,2,ink);else if(a.mouth!=='none'){line(-2,4,-1,5,ink);line(-1,5,1,5,ink);dot(2,4,ink);}
    if(parts.includes('arms')&&a.weapon!=='none'){
      if(a.weapon==='thunder'){line(37,29,40,2,'#617dc1');star(40,0,'#b8efff','#446cd9');}
      else if(a.weapon==='machinegun'){rect(25,29,23,5,plate);rect(34,29,14,2,metal);rect(25,31,6,6,edge);}
      else {poly([[32,28],[28,22],[28,-8],[33,-26],[43,-5],[38,23]],'#151923','#080b13');poly([[32,19],[32,-7],[34,-20],[39,-4],[36,20]],'#465069','#101728');line(34,-16,34,17,'#9e547a');poly([[24,23],[40,21],[43,25],[25,27]],metal,edge);rect(31,27,4,9,plate);rect(30,35,6,2,accent);}
    }
    present(canvas,c);
  }
  root.AwaiAppearance.setExtras(drawAssembly);
  root.AwaiCreature={draw:root.AwaiAppearance.draw,drawEnemy,drawDinosaur,drawBattleGround,pixelArt:true,pixelGrid:root.AwaiAppearance.camera};
})(globalThis);
