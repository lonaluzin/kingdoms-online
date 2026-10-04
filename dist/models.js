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
   const rider=type==='knight',ranged=['archer','crossbow'].includes(type),y=rider?.74:0;
   const steel='#b6c2c3',darkSteel='#586776',leather='#664832',skin='#d4ac85';
   if(rider){
    mesh(u,'sphere',leather,0,.61,0,.29,.3,.56);mesh(u,'sphere',leather,0,.93,.38,.2,.38,.22).rotation.x=-.35;
    mesh(u,'sphere',leather,0,1.1,.58,.16,.19,.29);for(const x of [-.09,.09])mesh(u,'cone',leather,x,1.32,.48,.055,.2,.055);
    mesh(u,'box',darkSteel,0,.89,-.06,.48,.06,.39);mesh(u,'box',color,0,.72,-.04,.59,.38,.37);
    for(const x of [-.2,.2])for(const z of [-.3,.3]){const leg=mesh(u,'cylinder','#48372e',x,.28,z,.055,.48,.055);g.userData.legs.push({leg,side:x<0?-1:1,phase:i+z});mesh(u,'box','#252e2b',x,.06,z+.04,.11,.11,.19);}
    mesh(u,'cone','#322d2b',0,.67,-.61,.1,.48,.1).rotation.x=-.65;
   }
   mesh(u,'cylinder',ranged?leather:darkSteel,0,.68+y,0,.18,.43,.14);
   mesh(u,'box',color,0,.65+y,.13,.22,.4,.055);mesh(u,'cylinder','#433a2d',0,.45+y,0,.19,.07,.15);
   mesh(u,'sphere',skin,0,1.03+y,.035,.14,.17,.14);mesh(u,'sphere',ranged?'#5c7153':steel,0,1.12+y,-.025,.17,.13,.17);
   if(!ranged){mesh(u,'box',darkSteel,0,1.04+y,.15,.23,.055,.045);mesh(u,'cone',steel,0,1.25+y,0,.09,.13,.09);}
   else mesh(u,'cone','#637653',0,1.2+y,-.04,.19,.18,.19).rotation.z=.15;
   for(const side of [-1,1]){
    mesh(u,'sphere',ranged?leather:steel,side*.21,.83+y,0,.12,.12,.13);
    const arm=mesh(u,'cylinder',ranged?leather:darkSteel,side*.23,.64+y,.05,.055,.29,.055);arm.rotation.z=side*.18;
    mesh(u,'sphere',skin,side*.25,.5+y,.09,.065,.075,.065);
    const leg=mesh(u,'cylinder',rider?darkSteel:'#394844',side*.095,.27+y,0,.065,.33,.065);g.userData.legs.push({leg,side,phase:i*.45});
    mesh(u,'box','#2e302e',side*.095,.085+y,.065,.14,.16,.23);
   }
   if(ranged){
    if(type==='archer')for(let j=0;j<7;j++){const a=(j-3)*.26;const bow=mesh(u,'cylinder','#b99059',.31,.75+y+Math.sin(a)*.43,.18+Math.cos(a)*.2,.025,.14,.025);bow.rotation.x=a;}
    else {mesh(u,'box','#967348',.3,.7+y,.24,.5,.07,.1);mesh(u,'box','#61503d',.3,.7+y,.18,.06,.07,.48);}
    mesh(u,'box','#eadfbb',.31,.75+y,.25,.025,.025,.65);mesh(u,'cylinder',leather,-.08,.77+y,-.18,.07,.38,.07);
    for(let j=0;j<3;j++)mesh(u,'box','#dbc49c',-.13+j*.04,1.04+y,-.18,.02,.3,.02);
   }else{
    const spear=type==='spear'||rider;
    mesh(u,'cylinder',spear?'#93764d':steel,.27,.95+y,.1,spear?.025:.035,spear?1.5:.72,.025);
    mesh(u,'box','#b8a571',.27,.64+y,.1,.18,.045,.055);
    if(spear)mesh(u,'cone',steel,.27,1.78+y,.1,.065,.28,.065);
    const shield=mesh(u,'cylinder',type==='shield'?darkSteel:color,-.27,.65+y,.13,type==='shield'?.27:.19,.09,type==='shield'?.27:.19);shield.rotation.x=Math.PI/2;
    mesh(u,'sphere',steel,-.27,.65+y,.2,.07,.07,.04);
    if(type==='shield'){mesh(u,'box',steel,-.27,.65+y,.2,.035,.45,.035);mesh(u,'box',steel,-.27,.65+y,.2,.4,.035,.035);}
   }
  }
  g.userData.banner=flag(g,0,2.6,.3,color);
 }
 return g;
}
