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
const mesh=(parent,shape,color,x,y,z,sx=1,sy=1,sz=1)=>{if(!materials.has(color))materials.set(color,new THREE.MeshBasicMaterial({color}));const m=new THREE.Mesh(geo[shape],materials.get(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;};
const flag=()=>null;
test('city and guard labels need no march context; beast health stays below the header',()=>{assert.equal(labelTransform({x:0,y:0},1280,720),'translate(-50%,-100%) translate(640px,360px)');assert.equal(labelTransform({x:0,y:1},1280,720,165),'translate(-50%,-100%) translate(640px,165px)');});
test('walking, waiting and attack use joint poses; weapons follow the hand',()=>{
 const g=createArmyModel(mesh,flag,false,'#448877',{sword:5,spear:5,archer:5,crossbow:5,knight:5,shield:5});
 assert.equal(g.userData.fighters.length,6);
 for(const f of g.userData.fighters){assert.equal(f.arms.length,2);assert.equal(f.legs.length,2);assert.ok(f.arms[1].children.length>=3);}
 let meshes=0;g.traverse(o=>{if(o.isMesh){meshes++;for(const value of o.geometry.attributes.position.array)assert.ok(Number.isFinite(value));}});assert.ok(meshes<190,'Static batching bounds draw calls for six detailed soldiers');
 const f=g.userData.fighters.find(f=>f.type==='sword');
 animateArmy(g,.2,'walk');const leg=f.legs[0].pivot.rotation.x;animateArmy(g,.6,'walk');assert.notEqual(f.legs[0].pivot.rotation.x,leg);
 animateArmy(g,.6,'idle');assert.equal(f.legs[0].pivot.rotation.x,0);assert.equal(f.legs[0].knee.rotation.x,0);
 animateArmy(g,.3,'attack');const arm=f.arms[1].rotation.x;animateArmy(g,.5,'attack');assert.notEqual(f.arms[1].rotation.x,arm);
 animateArmy(g,.5,'attack',1);assert.equal(f.group.rotation.x,-.25);
 const cavalry=g.userData.fighters.find(f=>f.type==='knight');assert.equal(cavalry.horseLegs.length,4);
});
test('sale returns the actual proceeds without adding chronicle entries',async()=>{
 const {freshGame,act}=await import('../dist/game.js');const s=freshGame(),gold=s.resources.gold,wood=s.resources.wood,count=s.logs.length;
 const r=act(s,'trade',{resource:'wood',side:'sell'});assert.equal(r.ok,true);assert.equal(r.message,'Продано 100 дерева · +65 золота');assert.equal(s.resources.gold,gold+65);assert.equal(s.resources.wood,wood-100);assert.equal(s.logs.length,count);
});
