import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const hooks=registerHooks({resolve(specifier,context,next){return next(specifier==='three'?new URL('../dist/vendor/three.module.min.js',import.meta.url).href:specifier,context);}});
const THREE=await import('../dist/vendor/three.module.min.js');
const {createArmyModel,animateArmy}=await import('../dist/models.js');
const {labelTransform}=await import('../dist/world.js');
hooks.deregister();
const geo={box:new THREE.BoxGeometry(),cone:new THREE.ConeGeometry(1,1,7),sphere:new THREE.IcosahedronGeometry(1,1),cylinder:new THREE.CylinderGeometry(1,1,1,10)};
const materials=new Map();
const mesh=(parent,shape,color,x,y,z,sx=1,sy=1,sz=1)=>{if(!materials.has(color))materials.set(color,new THREE.MeshBasicMaterial({color}));const m=new THREE.Mesh(typeof shape === 'string' ? geo[shape] : shape,materials.get(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;};
const flag=()=>null;

test('army standard stays in a living soldier hand for infantry, cavalry and casualty rebuilds',()=>{
 const heldFlag=(parent,x,y,z,color)=>{mesh(parent,'cylinder','#e0d0a6',x,y/2,z,.025,y,.025);const cloth=new THREE.Mesh(new THREE.PlaneGeometry(.85,.5),new THREE.MeshBasicMaterial({color}));cloth.position.set(x+.43,y-.3,z);parent.add(cloth);return cloth;};
 for(const troops of [{sword:20,knight:10},{sword:1},{knight:1},{archer:1}]){
  const g=createArmyModel(mesh,heldFlag,false,'#448877',troops),bearer=g.userData.bannerBearer,standard=g.userData.standard;
  assert.ok(bearer);assert.equal(standard.parent,bearer.arms[1]);assert.equal(g.userData.banner.parent,standard);
  const grip=standard.position.clone();
  for(const mode of ['walk','run','idle','attack']){animateArmy(g,1,mode);bearer.group.position.set(8,2,-12);g.rotation.y=1.7;g.updateMatrixWorld(true);const world=standard.getWorldPosition(new THREE.Vector3());const expected=bearer.arms[1].localToWorld(grip.clone());assert.ok(world.distanceTo(expected)<1e-9);assert.ok(Math.abs(bearer.bannerArm.rotation.x)<.2);}
  // The fallen body also carries the standard; no detached root flag survives.
  bearer.group.rotation.z=1.4;g.updateMatrixWorld(true);assert.ok(standard.getWorldPosition(new THREE.Vector3()).distanceTo(bearer.arms[1].localToWorld(grip.clone()))<1e-9);
 }
 for(const troops of [{},{catapult:5}])assert.equal(createArmyModel(mesh,heldFlag,false,'#448877',troops).userData.banner,undefined);
});
test('city and guard labels need no march context; beast health stays below the header',()=>{assert.equal(labelTransform({x:0,y:0},1280,720),'translate(-50%,-100%) translate(640px,360px)');assert.equal(labelTransform({x:0,y:1},1280,720,165),'translate(-50%,-100%) translate(640px,165px)');});
test('walking, waiting and attack use joint poses; weapons follow the hand',()=>{
 const g=createArmyModel(mesh,flag,false,'#448877',{sword:5,spear:5,archer:5,crossbow:5,knight:5,shield:5});
 assert.equal(g.userData.fighters.length,6);
 for(const f of g.userData.fighters){assert.equal(f.arms.length,2);assert.equal(f.legs.length,2);assert.ok(f.arms[1].children.length>=3);}
 let meshes=0;g.traverse(o=>{if(o.isMesh){meshes++;for(const value of o.geometry.attributes.position.array)assert.ok(Number.isFinite(value));}});assert.ok(meshes<190,'Static batching bounds draw calls for six detailed soldiers');
 const f=g.userData.fighters.find(f=>f.type==='sword');
 animateArmy(g,.2,'walk');const leg=f.legs[0].pivot.rotation.x;animateArmy(g,.6,'walk');assert.notEqual(f.legs[0].pivot.rotation.x,leg);
 for(let i=0;i<40;i++)animateArmy(g,.6,'idle');assert.ok(Math.abs(f.legs[0].pivot.rotation.x)<1e-6);assert.ok(Math.abs(f.legs[0].knee.rotation.x)<1e-6);
 animateArmy(g,.3,'attack');const arm=f.arms[1].rotation.x;animateArmy(g,.5,'attack');assert.notEqual(f.arms[1].rotation.x,arm);
 animateArmy(g,.5,'attack',1);assert.equal(f.group.rotation.x,-.25);
 const cavalry=g.userData.fighters.find(f=>f.type==='knight');assert.equal(cavalry.horseLegs.length,4);
});
test('sale returns the actual proceeds without adding chronicle entries',async()=>{
 const {freshGame,act}=await import('../dist/game.js');const s=freshGame(),gold=s.resources.gold,wood=s.resources.wood,count=s.logs.length;
 const r=act(s,'trade',{resource:'wood',side:'sell'});assert.equal(r.ok,true);assert.equal(r.message,'Продано 100 дерева · +65 золота');assert.equal(s.resources.gold,gold+65);assert.equal(s.resources.wood,wood-100);assert.equal(s.logs.length,count);
});

test('pike, halberd and siege tower have readable silhouettes',()=>{
 const make=type=>createArmyModel(mesh,flag,false,'#448877',{[type]:5});
 const height=type=>new THREE.Box3().setFromObject(make(type)).getSize(new THREE.Vector3()).y;
 assert.ok(height('pike')>height('spear')+.5);
 assert.ok(height('tower')>height('catapult')+.4);
 const width=type=>new THREE.Box3().setFromObject(make(type)).getSize(new THREE.Vector3()).x;
 assert.ok(width('halberd')>width('spear')+.1);
});
