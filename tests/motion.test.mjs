import test from 'node:test';import assert from 'node:assert/strict';
import {routePoint,advanceVisualPosition} from '../dist/navigation.js';
test('route facing stays continuous at corners and preserves final heading on return',()=>{
 const path=[{x:0,z:0},{x:0,z:1},{x:1,z:1},{x:2,z:2}];const length=2+Math.SQRT2;
 const a=routePoint(path,(1-.001)/length),b=routePoint(path,(1+.001)/length);
 assert.ok(Math.abs(a.angle-b.angle)<.01);assert.ok(Math.abs(routePoint(path,1).angle-Math.PI/4)<.001);
 assert.deepEqual(routePoint(path,0),{x:0,z:0,angle:0});
});
test('snapshot and obstacle corrections cannot teleport a visible figure or move while paused',()=>{
 const start={x:0,y:1,z:0},target={x:10,y:2,z:-10},dt=1/60,speed=.72;
 const next=advanceVisualPosition(start,target,dt,speed);assert.ok(Math.hypot(next.x,next.z)<=speed*dt*1.8+1e-9);assert.ok(next.y>1&&next.y<2);
 assert.deepEqual(advanceVisualPosition(start,target,0,speed),start);
 for(const hz of [30,60,144]){let p=start;for(let i=0;i<hz;i++)p=advanceVisualPosition(p,target,1/hz,speed);assert.ok(Math.abs(Math.hypot(p.x,p.z)-speed*1.8)<1e-7);}
});
import {marchingTargets} from '../dist/navigation.js';
test('bridge columns follow the deck instead of a wide rigid rectangle',()=>{
 const path=[{x:-10,z:12},{x:0,z:12},{x:10,z:12}];
 for(const returning of [false,true])for(const t of [.3,.5,.7]){
  const figures=marchingTargets(path,t,12,returning);
  assert.ok(figures.every(p=>p.z===12));
  for(let i=1;i<figures.length;i++)assert.ok(Math.hypot(figures[i].x-figures[i-1].x,figures[i].z-figures[i-1].z)>1.5);
 }
});
test('fixed marching order has unique slots and smooth positions between frames',()=>{
 const path=[{x:-15,z:0},{x:-10,z:0},{x:-10,z:10}];
 const a=marchingTargets(path,.4,48),b=marchingTargets(path,.4001,48);
 assert.equal(new Set(a.map(p=>`${p.x},${p.z}`)).size,48);
 for(let i=0;i<a.length;i++)assert.ok(Math.hypot(a[i].x-b[i].x,a[i].z-b[i].z)<.01);
});
test('retreat changes facing without reversing soldier slots at the battle endpoint',()=>{
 const path=[{x:-10,z:12},{x:10,z:12}],attack=marchingTargets(path,1,12),retreat=marchingTargets(path,1,12,true);
 for(let i=0;i<attack.length;i++){assert.equal(attack[i].x,retreat[i].x);assert.equal(attack[i].z,retreat[i].z);assert.ok(Math.abs(retreat[i].angle-attack[i].angle-Math.PI)<1e-9);}
});
