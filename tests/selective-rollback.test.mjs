import test from 'node:test';
import assert from 'node:assert/strict';
import {Room} from '../rooms.mjs';
import {availableBuildings,totalTroops} from '../dist/game.js';
import {routePoint} from '../dist/navigation.js';
const setup=()=>{const r=new Room('a','Первый',0);r.join('b','Второй');r.seed=1329;r.members.forEach(m=>m.ready=true);r.start('a');return r;};
test('unique outposts replace ordinary equivalents in both catalog and server validation',()=>{
 const r=setup(),s=r.actor('a');for(const [id,excluded,included]of [['bandits',['farm','market','barracks'],['hunting','spoils','mercenaries']],['ruins',['quarry','academy'],['excavation','archive']]]){const p=r.places.find(p=>p.id===id);p.owner=s.playerId;r.refresh();const keys=availableBuildings(p).map(([k])=>k);for(const key of excluded){assert.ok(!keys.includes(key));assert.equal(r.command('a','build',{settlement:id,key}).ok,false);}for(const key of included)assert.ok(keys.includes(key));}
});
test('redirect changes destination from current position without spawning or duplicating troops',()=>{
 const r=setup(),s=r.actor('a'),target=r.places.find(p=>p.id==='willow');target.owner=s.playerId;target.garrison={spear:2};r.refresh();assert.ok(r.command('a','reinforce',{target:target.id,source:s.home,units:{sword:10}}).ok);const m=s.marches[0];r.tick(3);const point=routePoint(m.route,(r.time-m.start)/(m.end-m.start)),gold=s.resources.gold,troops={...m.troops};assert.ok(r.command('a','redirect',{id:m.id,target:s.home}).ok);assert.equal(s.marches.length,1);assert.deepEqual(m.route[0],{x:point.x,z:point.z});assert.deepEqual(m.troops,troops);assert.equal(s.resources.gold,gold);assert.equal(m.target,s.home);r.tick(m.duration+.1);assert.equal(s.marches.length,0);assert.equal(s.troops.sword,20);assert.equal(totalTroops(target.garrison),2);
});
test('redirect rejects other player armies, active battles and peaceful enemy targets',()=>{
 const r=setup(),s=r.actor('a'),other=r.actor('b');r.command('a','diplomacy',{target:'willow',action:'war'});assert.ok(r.command('a','march',{target:'willow',fraction:.5}).ok);const m=s.marches[0],before=JSON.stringify(m);assert.equal(r.command('b','redirect',{id:m.id,target:other.home}).ok,false);assert.equal(r.command('a','redirect',{id:m.id,target:other.home}).ok,false);assert.equal(JSON.stringify(m),before);m.battle=true;assert.equal(r.command('a','redirect',{id:m.id,target:s.home}).ok,false);
});
