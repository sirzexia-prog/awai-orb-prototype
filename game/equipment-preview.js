(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./combat.js'));
  else root.AwaiEquipmentPreview=factory(root.AwaiCombat);
})(globalThis,function(C){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  function create(source){return {appearance:clone(source.appearance),parts:[...source.gameplay.equipped],locomotion:source.gameplay.locomotion,weapon:source.appearance.weapon||'sword'};}
  function toggle(p,id){if(!Object.hasOwn(C.PARTS,id))return false;p.parts=p.parts.includes(id)?p.parts.filter(x=>x!==id):[...p.parts,id];return true;}
  function preset(p,name){
    const parts={warrior:['armor','arms'],princess:['crown','dress','trail'],mage:['magic','crown','trail'],all:Object.keys(C.PARTS),bare:[]}[name];
    if(!parts)return false;p.parts=[...parts];
    if(name==='warrior'){Object.assign(p.appearance,{hue:270,tone:'black',eyeColor:'#ff415b',eyes:'hollow',mouth:'none'});p.weapon='sword';p.locomotion='hover';}
    if(name==='mage')p.weapon='thunder';return true;
  }
  function look(p){return {...clone(p.appearance),parts:[...p.parts],locomotion:p.locomotion,weapon:p.weapon};}
  return {create,toggle,preset,look};
});
