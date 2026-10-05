(function(root){'use strict';
// Received, registered shoulder interior only. Draw separately so collision alpha stays cut out.
function draw({context,layer,assets}){
 if(layer.sourceView!=='front-r7-fixed-3/4')return false;
 if(layer.key!=='player/attack-shoulder'||layer.actorId!=='player'||layer.groupId!=='W'||!layer.innerCuts?.length)return false;
 const image=assets['finish/player-W-inner']?.image;if(!image)return false;
 context.save();context.transform(...layer.matrix);context.beginPath();
 for(const cut of layer.innerCuts){context.moveTo(cut.x-10,cut.y-7);context.lineTo(cut.x+12,cut.y+2);context.lineTo(cut.x-5,cut.y+15);context.closePath();}
 context.clip();context.drawImage(image,0,0);context.restore();return true;
}
root.AwaiPartbreakWInnerR8=Object.freeze({draw,registration:()=>({player:{owner:'player/W/attack-shoulder',availableView:'front-r7-fixed-3/4',availablePivot:[299,239],availableAlphaBBox:[312,206,326,226],currentView:'approved-sheet-back',currentPivot:[204.5,228.5],status:'missing-matching-back-view',damageOnly:true,brokenOrDetached:false,defenseSurface:false},machine:{owner:'machine/torso',exposedBy:'W-broken',availableView:'received-machine-frontal-3/4',currentView:'received-machine-frontal-3/4',pivot:[256,430],alphaBBox:[142,149,172,185],status:'matching-received-registration',brokenWFragment:false,defenseSurface:false}})});
})(globalThis);
