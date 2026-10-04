import * as THREE from 'three';
import {formation} from './formation.js';
export function createArmyModel(mesh,flag,beast,color,troops){
 const g=new THREE.Group();g.userData.legs=[];g.userData.fighters=[];g.userData.shots=[];
 if(beast){
  const dark='#292b38',rock='#444554',armor='#626170',bone='#ded0a4';
  mesh(g,'sphere',dark,0,2.6,-.3,2.5,2.3,3.5);mesh(g,'sphere',rock,0,3.5,1.4,2.35,2.4,2.3);mesh(g,'sphere',dark,0,2.6,3,1.7,1.3,1.4);
  for(const side of [-1,1]){for(const z of [-2,1.6]){const leg=new THREE.Group();leg.position.set(side*1.8,1.75,z);g.add(leg);mesh(leg,'sphere',rock,0,-.65,0,.85,1.5,.9);g.userData.legs.push({leg,side,phase:z});mesh(leg,'box',dark,0,-1.55,.4,1.05,.5,1.3);for(let i=-1;i<=1;i++)mesh(leg,'cone',bone,i*.28,-1.5,1,.13,.6,.13).rotation.x=Math.PI/2;}
   const horn=mesh(g,'cone',bone,side*1.35,4,3.1,.7,3.8,.7);horn.rotation.z=-side*.65;horn.rotation.x=.4;
   const tip=mesh(g,'cone','#f0e4b7',side*2.4,5.45,3.8,.32,2.2,.32);tip.rotation.z=side*.2;tip.rotation.x=.65;
   const eye=mesh(g,'sphere','#84ffe6',side*1.25,3.3,3.65,.19,.22,.14);eye.material=new THREE.MeshStandardMaterial({color:'#84ffe6',emissive:'#40ffc9',emissiveIntensity:3});
   for(let i=0;i<4;i++){const plate=mesh(g,'sphere',armor,side*1.55,3.5-i*.35,1-i*1.15,.95,.65,.7);plate.rotation.z=side*.4;}
  }
  for(let i=0;i<6;i++){const spike=mesh(g,'cone',armor,0,4.5-i*.26,1-i*.8,.5,1.5,.5);spike.rotation.x=-.3;}
  for(let i=0;i<7;i++)mesh(g,'box','#75c6b8',-.5+(i%2),3.5-i*.12,-i*.4,.12,.45,.12).rotation.z=.45;
  const jaw=new THREE.Group();jaw.position.set(0,2.35,3.2);g.add(jaw);g.userData.jaw=jaw;mesh(jaw,'sphere',rock,0,-.1,.22,1.3,.48,.8);
  for(const side of [-1,1])for(let i=0;i<4;i++){mesh(jaw,'cone',bone,side*(.6+i*.16),.2,.65-i*.2,.12,.32,.12);mesh(g,'sphere',armor,side*2.1,3.2,-1.8,.45,.65,.7);}
  for(let i=0;i<4;i++){const rune=mesh(g,'box','#81d6c2',-.7+i*.45,3.85,2.9,.07,.45,.06);rune.rotation.z=(i%2?1:-1)*.35;}
  const aura=new THREE.Mesh(new THREE.RingGeometry(3.5,3.65,24),new THREE.MeshBasicMaterial({color:'#81e1d1',transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));aura.rotation.x=-Math.PI/2;aura.position.y=.06;g.add(aura);g.userData.aura=aura;
 }else{
  const figures=formation(troops),columns=Math.max(2,Math.ceil(Math.sqrt(figures.length)));g.userData.count=figures.length;
  for(let i=0;i<figures.length;i++){
   const sourceType=figures[i].type,type=({militia:'sword',scout:'knight',veteran:'sword',pike:'spear',ranger:'archer',guard:'shield',halberd:'spear',marksman:'crossbow',paladin:'knight'})[sourceType]||sourceType,u=new THREE.Group();u.position.set((i%columns-(columns-1)/2)*.88,0,-Math.floor(i/columns)*1.06);g.add(u);const fighter={group:u,type,sourceType,phase:(figures.slice(0,i).filter(f=>f.type===sourceType).length*.63+sourceType.length),baseZ:u.position.z,arms:[],legs:[],horseLegs:[]};g.userData.fighters.push(fighter);
   if(['catapult','ram','tower'].includes(type)){
    mesh(u,'box','#725737',0,.3,0,.5,.18,.65);for(const x of [-.27,.27])for(const z of [-.24,.24]){const wheel=mesh(u,'cylinder','#473b2b',x,.18,z,.17,.12,.17);wheel.rotation.z=Math.PI/2;}
    if(type==='catapult'){const arm=new THREE.Group();arm.position.set(0,.65,0);u.add(arm);mesh(arm,'box','#a78958',0,.35,0,.08,1.1,.08);mesh(arm,'sphere','#666a65',0,.75,.1,.17,.17,.17);arm.rotation.x=.6;fighter.siegeArm=arm;for(const x of [-.2,.2])mesh(u,'box','#725737',x,.62,0,.08,.7,.08);}
    else if(type==='tower')mesh(u,'box','#977649',0,.8,0,.5,1.1,.5);
    else{mesh(u,'cylinder','#ad8958',0,.62,0,.16,.8,.16).rotation.x=Math.PI/2;mesh(u,'cone',color,0,.95,0,.55,.45,.55);}continue;
   }
   const rider=type==='knight',ranged=['archer','crossbow'].includes(type),y=rider?.62:0;
   const steel='#b6c2c3',darkSteel='#586776',leather='#664832',skin='#d4ac85';
   if(rider){
    mesh(u,'sphere',leather,0,.61,0,.29,.3,.56);mesh(u,'sphere',leather,0,.93,.38,.2,.38,.22).rotation.x=-.35;
    mesh(u,'sphere',leather,0,1.1,.58,.16,.19,.29);for(const x of [-.09,.09])mesh(u,'cone',leather,x,1.32,.48,.055,.2,.055);
    mesh(u,'box',darkSteel,0,.89,-.06,.48,.06,.39);mesh(u,'box',color,0,.72,-.04,.59,.38,.37);
    for(const x of [-.2,.2])for(const z of [-.3,.3]){const pivot=new THREE.Group();pivot.position.set(x,.51,z);u.add(pivot);mesh(pivot,'cylinder','#48372e',0,-.23,0,.055,.48,.055);mesh(pivot,'box','#252e2b',0,-.45,.04,.11,.11,.19);fighter.horseLegs.push({pivot,phase:(x<0?0:Math.PI)+(z<0?Math.PI:0)});}
    mesh(u,'box','#3f3026',0,1.11,.72,.22,.05,.035);for(const side of [-1,1])mesh(u,'cylinder','#ac9561',side*.15,1.06,.52,.018,.22,.018).rotation.x=.6;
    mesh(u,'cone','#322d2b',0,.67,-.61,.1,.48,.1).rotation.x=-.65;
   }
   mesh(u,'cylinder',ranged?leather:darkSteel,0,.68+y,0,.18,.43,.14);
   if(!ranged){mesh(u,'sphere',steel,0,.75+y,.08,.2,.21,.12);for(const side of [-1,1])mesh(u,'box',color,side*.11,.43+y,.02,.16,.22,.19);}
   mesh(u,'box',color,0,.65+y,.13,.22,.4,.055);mesh(u,'cylinder','#433a2d',0,.45+y,0,.19,.07,.15);
   if(type==='archer')mesh(u,'cone','#547052',0,.65,-.07,.23,.56,.18);
   if(type==='crossbow'){mesh(u,'box','#7c5344',0,.62,.14,.25,.42,.055);mesh(u,'cylinder',steel,0,1.13,0,.25,.035,.23);}
   if(type==='shield'){mesh(u,'sphere',steel,0,.73,.09,.24,.24,.15);mesh(u,'box','#687481',0,.56,.16,.28,.18,.06);}
   mesh(u,'sphere',skin,0,1.03+y,.035,.14,.17,.14);mesh(u,'sphere',ranged?'#5c7153':steel,0,1.12+y,-.025,.17,.13,.17);
   if(!ranged){mesh(u,'box',darkSteel,0,1.04+y,.15,.23,.055,.045);mesh(u,'cone',steel,0,1.25+y,0,.09,.13,.09);for(const side of [-1,1])mesh(u,'sphere',steel,side*.12,1.03+y,0,.065,.12,.12);if(type==='knight')mesh(u,'cone',color,0,1.36+y,-.03,.08,.3,.08).rotation.x=-.35;}
   else if(type==='archer')mesh(u,'cone','#637653',0,1.2+y,-.04,.19,.18,.19).rotation.z=.15;
   for(const side of [-1,1]){
    mesh(u,'sphere',ranged?leather:steel,side*.21,.83+y,0,.12,.12,.13);
    const arm=new THREE.Group();arm.position.set(side*.22,.82+y,0);u.add(arm);arm.rotation.z=side*.12;
    mesh(arm,'cylinder',ranged?leather:darkSteel,0,-.13,.025,.065,.26,.065);mesh(arm,'sphere',ranged?leather:steel,0,-.25,.03,.075,.075,.075);
    mesh(arm,'cylinder',ranged?leather:steel,0,-.32,.065,.06,.16,.06);mesh(arm,'sphere',skin,0,-.42,.095,.065,.075,.065);fighter.arms.push(arm);
    const leg=new THREE.Group();leg.position.set(side*.095,.44+y,0);u.add(leg);mesh(leg,'cylinder',rider?darkSteel:'#394844',0,-.09,0,.07,.19,.07);
    const knee=new THREE.Group();knee.position.y=-.19;leg.add(knee);mesh(knee,'sphere',ranged?leather:steel,0,0,0,.08,.08,.075);mesh(knee,'cylinder',darkSteel,0,-.09,0,.06,.18,.06);mesh(knee,'box','#2e302e',0,-.17,.065,.14,.16,.23);fighter.legs.push({pivot:leg,knee,side});
   }
   if(ranged){
    if(type==='archer')for(let j=0;j<7;j++){const a=(j-3)*.26;const bow=mesh(u,'cylinder','#b99059',.31,.75+y+Math.sin(a)*.43,.18+Math.cos(a)*.2,.025,.14,.025);bow.rotation.x=a;}
    else {mesh(u,'box','#967348',.3,.7+y,.24,.5,.07,.1);mesh(u,'box','#61503d',.3,.7+y,.18,.06,.07,.48);}
    mesh(u,'box','#eadfbb',.31,.75+y,.25,.025,.025,.65);mesh(u,'cylinder',leather,-.08,.77+y,-.18,.07,.38,.07);
    for(let j=0;j<3;j++)mesh(u,'box','#dbc49c',-.13+j*.04,1.04+y,-.18,.02,.3,.02);
   }else{
    const spear=type==='spear'||rider;
    if(spear)mesh(u,'cylinder','#93764d',.27,.95+y,.1,.025,1.5,.025);
    else mesh(u,'box',steel,.27,.95+y,.1,.075,.72,.035);
    mesh(u,'box','#b8a571',.27,.64+y,.1,.18,.045,.055);
    if(spear)mesh(u,'cone',steel,.27,1.78+y,.1,.065,.28,.065);
    const shield=mesh(u,'cylinder',type==='shield'?darkSteel:color,-.27,.65+y,.13,type==='shield'?.27:.19,.09,type==='shield'?.27:.19);shield.rotation.x=Math.PI/2;
    mesh(u,'sphere',steel,-.27,.65+y,.2,.07,.07,.04);
    if(type==='shield'){shield.scale.y=.07;shield.scale.x=.26;shield.scale.z=.37;mesh(u,'box',steel,-.27,.65+y,.2,.035,.62,.035);mesh(u,'box',steel,-.27,.65+y,.2,.45,.035,.035);}
   }
   // Move the weapon assembly into the hand pivot so swings remain anatomically connected.
   const weapons=u.children.filter(o=>o.isMesh&&o.position.x>.24&&o.position.y>.5+y);
   for(const weapon of weapons)fighter.arms[1].attach(weapon);
   if(['guard','halberd','marksman','paladin'].includes(sourceType)){mesh(u,'box','#d2b46d',0,.91+y,.15,.25,.045,.04);mesh(u,'cone',color,0,1.34+y,-.05,.08,.3,.08);}
   if(sourceType==='militia')mesh(u,'box','#997951',0,.68,.17,.3,.34,.035);
   u.scale.setScalar(1.13);
  }
  g.userData.banner=flag(g,0,2.6,.3,color);
 }
 batchStaticParts(g);
 return g;
}

// Merge same-material pieces within each bone; the joints stay independently animated.
export function batchStaticParts(root){
 const parents=[];root.traverse(o=>{if(o.isGroup)parents.push(o);});
 for(const parent of parents){const materials=new Map();for(const o of parent.children){if(!o.isMesh||o.userData.fire||o.userData.animate||o.geometry.type==='PlaneGeometry'||o===root.userData.aura||o===root.userData.banner)continue;const list=materials.get(o.material)||[];list.push(o);materials.set(o.material,list);}
  for(const [material,parts]of materials){if(parts.length<2)continue;const arrays={position:[],normal:[],uv:[]};for(const o of parts){o.updateMatrix();const source=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();source.applyMatrix4(o.matrix);for(const key of Object.keys(arrays))arrays[key].push(source.attributes[key].array);source.dispose();}
   const geometry=new THREE.BufferGeometry();for(const [key,segments]of Object.entries(arrays)){const values=new Float32Array(segments.reduce((n,a)=>n+a.length,0));let at=0;for(const segment of segments){values.set(segment,at);at+=segment.length;}geometry.setAttribute(key,new THREE.BufferAttribute(values,key==='uv'?2:3));}
   const merged=new THREE.Mesh(geometry,material);merged.castShadow=true;merged.receiveShadow=true;parent.add(merged);for(const o of parts)parent.remove(o);
  }
 }
}

export function animateArmy(g,time,mode='idle',hit=0,velocity,dt=1/60){
 for(const f of g.userData.fighters){
  const moving=mode==='walk'||mode==='run',fighting=mode==='attack',phase=velocity===undefined?time*(f.type==='knight'?7:8)+f.phase:((f.walkPhase=(f.walkPhase??f.phase)+(moving?Math.min(15,velocity)*dt*(f.type==='knight'?5:8):0)));
  const blend=1-Math.exp(-16*dt),running=mode==='run';const pulse=Math.max(0,Math.sin(time*4.8+f.phase)),ranged=['archer','crossbow'].includes(f.type);
  if(f.siegeArm)f.siegeArm.rotation.x=.6+(fighting?pulse*.8:0);
  f.group.position.z=f.baseZ+(fighting&&f.type==='ram'?pulse*.2:0);
  f.group.position.y=moving?Math.abs(Math.sin(phase))*.035:Math.sin(time*1.4+f.phase)*.012;
  f.group.rotation.x=hit>0?-.25*hit:fighting&&!ranged?pulse*.12:0;
  for(const {pivot,knee,side} of f.legs||[]){const rider=f.horseLegs.length>0,stride=rider?-.6:moving?Math.sin(phase)*side*(running?.64:.48):0;pivot.rotation.z=rider?side*.55:0;pivot.rotation.x=THREE.MathUtils.lerp(pivot.rotation.x,stride,blend);knee.rotation.x=THREE.MathUtils.lerp(knee.rotation.x,rider?1.2:moving?Math.max(0,-stride)*1.2:0,blend);}
  for(let i=0;i<(f.arms||[]).length;i++){const arm=f.arms[i];const pose=f.horseLegs.length&&!fighting?-.65:moving?-Math.sin(phase)*(i?1:-1)*(running?.5:.35):fighting?(ranged?-1.2+(i?pulse*.3:0):i?-pulse*1.35:-.45):Math.sin(time*1.4+f.phase)*.025;arm.rotation.x=THREE.MathUtils.lerp(arm.rotation.x,pose,blend);arm.rotation.z=(i?1:-1)*.12;}
  for(const {pivot,phase:offset}of f.horseLegs||[])pivot.rotation.x=moving?Math.sin(phase+offset)*.5:0;
  if(f.shot)f.shot.visible=fighting;
 }
}
