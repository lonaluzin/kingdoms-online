import * as THREE from 'three';
import {formation} from './formation.js';
export function createArmyModel(mesh,flag,beast,color,troops){
 const g=new THREE.Group();g.userData.legs=[];g.userData.fighters=[];g.userData.shots=[];
 if(beast){
  const dark='#292b38',rock='#444554',armor='#626170',bone='#ded0a4';
  mesh(g,'sphere',dark,0,2.6,-.3,2.5,2.3,3.5);mesh(g,'sphere',rock,0,3.5,1.4,2.35,2.4,2.3);mesh(g,'sphere',dark,0,2.6,3,1.7,1.3,1.4);
  for(const side of [-1,1]){for(const z of [-2,1.6]){const leg=mesh(g,'sphere',rock,side*1.8,1.1,z,.85,1.5,.9);g.userData.legs.push({leg,side,phase:z});mesh(g,'box',dark,side*1.8,.2,z+.4,1.05,.5,1.3);for(let i=-1;i<=1;i++)mesh(g,'cone',bone,side*1.8+i*.28,.25,z+1,.13,.6,.13).rotation.x=Math.PI/2;}
   const horn=mesh(g,'cone',bone,side*1.35,4,3.1,.7,3.8,.7);horn.rotation.z=-side*.65;horn.rotation.x=.4;
   const tip=mesh(g,'cone','#f0e4b7',side*2.4,5.45,3.8,.32,2.2,.32);tip.rotation.z=side*.2;tip.rotation.x=.65;
   const eye=mesh(g,'sphere','#84ffe6',side*1.25,3.3,3.65,.19,.22,.14);eye.material=new THREE.MeshStandardMaterial({color:'#84ffe6',emissive:'#40ffc9',emissiveIntensity:3});
   for(let i=0;i<4;i++){const plate=mesh(g,'sphere',armor,side*1.55,3.5-i*.35,1-i*1.15,.95,.65,.7);plate.rotation.z=side*.4;}
  }
  for(let i=0;i<6;i++){const spike=mesh(g,'cone',armor,0,4.5-i*.26,1-i*.8,.5,1.5,.5);spike.rotation.x=-.3;}
  for(let i=0;i<7;i++)mesh(g,'box','#75c6b8',-.5+(i%2),3.5-i*.12,-i*.4,.12,.45,.12).rotation.z=.45;
  const aura=new THREE.Mesh(new THREE.RingGeometry(3.5,3.65,24),new THREE.MeshBasicMaterial({color:'#81e1d1',transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));aura.rotation.x=-Math.PI/2;aura.position.y=.06;g.add(aura);g.userData.aura=aura;
 }else{
  const figures=formation(troops),columns=Math.max(2,Math.ceil(Math.sqrt(figures.length)));g.userData.count=figures.length;
  for(let i=0;i<figures.length;i++){
   const {type}=figures[i],u=new THREE.Group();u.position.set((i%columns-(columns-1)/2)*.65,0,Math.floor(i/columns)*.8);g.add(u);g.userData.fighters.push({group:u,type,phase:i*.63});
   if(['catapult','ram','tower'].includes(type)){
    mesh(u,'box','#725737',0,.3,0,.5,.18,.65);for(const x of [-.27,.27])for(const z of [-.24,.24]){const wheel=mesh(u,'cylinder','#473b2b',x,.18,z,.17,.12,.17);wheel.rotation.z=Math.PI/2;}
    if(type==='catapult'){const arm=mesh(u,'box','#a78958',0,.8,0,.08,1.1,.08);arm.rotation.x=.6;mesh(u,'sphere','#666a65',0,1.2,.3,.17,.17,.17);}
    else if(type==='tower')mesh(u,'box','#977649',0,.8,0,.5,1.1,.5);
    else{mesh(u,'cylinder','#ad8958',0,.62,0,.16,.8,.16).rotation.x=Math.PI/2;mesh(u,'cone',color,0,.95,0,.55,.45,.55);}continue;
   }
   const rider=type==='knight',y=rider?.65:0;
   if(rider){mesh(u,'sphere','#735342',0,.5,0,.3,.25,.55);mesh(u,'box','#735342',0,.75,.4,.22,.55,.2);for(const x of [-.2,.2])for(const z of [-.3,.3]){const leg=mesh(u,'box','#493c32',x,.2,z,.08,.45,.08);g.userData.legs.push({leg,side:x<0?-1:1,phase:i+z});}}
   mesh(u,'box',color,0,.62+y,0,.29,.44,.22);mesh(u,'sphere','#aeb7b0',0,1.04+y,0,.17,.2,.17);
   if(!rider)for(const side of [-1,1]){const leg=mesh(u,'box','#3b4a43',side*.09,.27,0,.11,.4,.12);g.userData.legs.push({leg,side,phase:i*.45});}
   if(['archer','crossbow'].includes(type)){mesh(u,'box','#8e7351',.2,.8+y,.1,type==='archer'?.045:.42,type==='archer'?.65:.06,.05).rotation.z=.3;mesh(u,'box','#dad5bf',.22,.8+y,.1,.04,.04,.55);}
   else{const spear=type==='spear'||rider;mesh(u,'box',spear?'#8e7351':'#cad3cd',.23,.9+y,0,.055,spear?1.25:.65,.05);if(spear)mesh(u,'cone','#cbd1ca',.23,1.58+y,0,.085,.23,.085);mesh(u,'box',type==='shield'?'#697f86':color,-.23,.65+y,.1,.07,type==='shield'?.65:.4,.3);}
  }
  g.userData.banner=flag(g,0,2.6,.3,color);
 }
 return g;
}
