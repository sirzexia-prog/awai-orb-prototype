(function(root){'use strict';
// Received, registered shoulder interior only. Draw separately so collision alpha stays cut out.
function draw({context,layer,assets}){
 if(layer.key!=='player/attack-shoulder'||layer.actorId!=='player'||layer.groupId!=='W'||!layer.innerCuts?.length)return false;
 const image=assets['finish/player-W-inner']?.image;if(!image)return false;
 context.save();context.transform(...layer.matrix);context.beginPath();
 for(const cut of layer.innerCuts){context.moveTo(cut.x-10,cut.y-7);context.lineTo(cut.x+12,cut.y+2);context.lineTo(cut.x-5,cut.y+15);context.closePath();}
 context.clip();context.drawImage(image,0,0);context.restore();return true;
}
root.AwaiPartbreakWInnerR8=Object.freeze({draw});
})(globalThis);
