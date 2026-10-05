import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {formationTarget,findRoute,layoutPlaces,routeLength} from '../dist/navigation.js';
import {PLACES} from '../dist/game.js';

function glb(name){const bytes=readFileSync(new URL(`../dist/assets/${name}.glb`,import.meta.url));assert.equal(bytes.readUInt32LE(0),0x46546c67);const size=bytes.readUInt32LE(12);return {json:JSON.parse(bytes.subarray(20,20+size)),bin:bytes.subarray(28+size)};}
function values(data,index){const a=data.json.accessors[index],v=data.json.bufferViews[a.bufferView],n={VEC3:3,VEC4:4,SCALAR:1}[a.type],start=(v.byteOffset||0)+(a.byteOffset||0);return Array.from({length:a.count*n},(_,i)=>data.bin.readFloatLE(start+i*4));}
test('Blender soldiers, mounted rider and beast have real skins and six distinct clips',()=>{
 for(const name of ['sword','spear','shield','archer','crossbow','knight','beast','catapult','ram','tower']){
  const data=glb(name),j=data.json;assert.equal(j.skins.length,1,name);assert.deepEqual(j.animations.map(a=>a.name).sort(),['attack','death','hit','idle','run','walk']);
  const skin=j.meshes.flatMap(m=>m.primitives).filter(p=>p.attributes.JOINTS_0!==undefined);assert.ok(skin.length,name);assert.ok(skin.reduce((n,p)=>n+j.accessors[p.attributes.POSITION].count,0)<16000,name+' vertex budget');
  if(['sword','knight','beast'].includes(name)){
   const walk=j.animations.find(a=>a.name==='walk');assert.ok(walk.samplers.some(s=>{const v=values(data,s.output);return Math.max(...v)-Math.min(...v)>.1;}),name+' locomotion');
   for(const sampler of walk.samplers){const a=j.accessors[sampler.output],n={VEC3:3,VEC4:4}[a.type],v=values(data,sampler.output);for(let i=0;i<n;i++)assert.ok(Math.abs(v[i]-v[v.length-n+i])<.002,name+' closed loop');}
  }
  if(name==='knight')for(const bone of ['frontL','frontR','rearL','rearR','thighL','shinL'])assert.ok(j.nodes.some(n=>n.name===bone),bone);
 }
});
test('formation endpoints preserve distinct soldiers instead of collapsing rows',()=>{
 const path=[{x:-20,z:10},{x:20,z:10}];
 for(const returning of [false,true])for(const t of [0,.5,1]){const points=Array.from({length:20},(_,i)=>formationTarget(path,t,i,20,returning));for(let i=0;i<points.length;i++)for(let k=i+1;k<points.length;k++)assert.ok(Math.hypot(points[i].x-points[k].x,points[i].z-points[k].z)>.75);}
});
test('formation makes a single file over water and separates again on the bank',()=>{
 const path=[{x:-10,z:12},{x:10,z:12}];
 for(let t=0;t<=1;t+=.025){const points=Array.from({length:24},(_,i)=>formationTarget(path,t,i,24));for(const p of points)if(Math.abs(p.x)<2.5)assert.ok(Math.abs(p.z-12)<.6,'bridge footprint');for(let i=0;i<points.length;i++)for(let k=i+1;k<points.length;k++)assert.ok(Math.hypot(points[i].x-points[k].x,points[i].z-points[k].z)>.75);}
});
test('opposite riverbank villages remain reachable with symmetric starting distances',()=>{
 const places=layoutPlaces([...PLACES,{id:'silver',x:0,z:0,kind:'city'}]);assert.ok(places.find(p=>p.id==='willow').x>0);assert.ok(places.find(p=>p.id==='oak').x<0);
 const distances=['home','gold','red','silver'].map(id=>Math.min(...places.filter(p=>p.kind==='village').map(p=>routeLength(findRoute(places.find(n=>n.id===id),p,places)))));assert.ok(Math.max(...distances)-Math.min(...distances)<2);
});
