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
