import test from 'node:test';import assert from 'node:assert/strict';
import {Room} from '../rooms.mjs';import {income,BUILDINGS,buildingSlots,militaryLevel,UNITS,totalTroops} from '../dist/game.js';import {visualTime} from '../dist/navigation.js';
const setup=()=>{const r=new Room('a','Первый',0);r.join('b','Второй');r.start('a');return r;};
const advance=(r,n)=>{for(let i=0;i<n*10;i++)r.tick(.1);};
test('defeated spectator sees a living world and accurate independent ownership; winner can keep playing',()=>{
 const r=setup(),a=r.actor('a'),b=r.actor('b'),outpost=r.places.find(p=>p.id==='willow');outpost.owner=b.playerId;outpost.buildings.farm=2;outpost.garrison={spear:10};a.troops={knight:100};
 r.command('a','diplomacy',{target:'gold',action:'war'});r.command('a','march',{target:'gold',fraction:.75});advance(r,a.marches[0].duration+13);
 assert.ok(b.eliminated);assert.equal(r.winner.id,a.playerId);assert.equal(outpost.owner,'independent-willow');assert.equal(outpost.buildings.farm,2);assert.equal(outpost.garrison.spear,10);
 assert.equal(r.snapshot('b').state.places.filter(p=>p.owner==='player').length,0);const time=r.time,gold=a.resources.gold;advance(r,10);assert.ok(r.time>time+9);assert.ok(a.resources.gold>gold);assert.ok(r.command('a','build',{key:'farm'}).ok);assert.equal(r.command('b','speed',{speed:5}).ok,false);
});
test('five slots count types and queued buildings, preserve upgrades, and free through deliberate demolition',()=>{
 const r=setup(),s=r.actor('a');assert.equal(buildingSlots(s.buildings),4);assert.ok(r.command('a','build',{key:'barracks'}).ok);assert.equal(buildingSlots(s.buildings,s.queue),5);advance(r,17);
 const before={...s.resources};assert.equal(r.command('a','build',{key:'walls'}).ok,false);assert.deepEqual(s.resources,before);assert.ok(r.command('a','build',{key:'farm'}).ok);advance(r,27);assert.equal(s.buildings.farm,2);assert.equal(buildingSlots(s.buildings),5);
 assert.ok(r.command('a','demolish',{key:'quarry'}).ok);assert.equal(buildingSlots(s.buildings),4);assert.ok(r.command('a','build',{key:'walls'}).ok);assert.equal(r.command('b','demolish',{key:'market',settlement:'home'}).ok,false);
});
test('capture keeps existing buildings and halves local production for 60 game seconds',()=>{
 const r=setup(),s=r.actor('a'),p=r.places.find(p=>p.id==='willow');s.troops={knight:100};assert.equal(p.buildings.farm,1);r.command('a','diplomacy',{target:p.id,action:'war'});r.command('a','march',{target:p.id,fraction:.75});advance(r,s.marches[0].duration+13);assert.equal(p.owner,s.playerId);assert.equal(p.buildings.farm,1);assert.ok(p.occupationUntil>r.time);
 const half=income(s);p.occupationUntil=0;const full=income(s);assert.equal(full.food-half.food,67.5);assert.equal(full.gold-half.gold,15);p.occupationUntil=r.time+60;advance(r,61);assert.ok(p.occupationUntil<r.time);
});
test('multiple armies to same target never attack their own newly captured city or duplicate its reward',()=>{
 const r=setup(),s=r.actor('a');s.troops={knight:100};assert.ok(r.command('a','march',{target:'bandits',fraction:.5}).ok);assert.ok(r.command('a','march',{target:'bandits',fraction:1}).ok);assert.equal(s.marches.length,2);const start=totalTroops(s.marches[0].troops)+totalTroops(s.marches[1].troops);advance(r,s.marches[0].duration+13);
 assert.equal(r.places.find(p=>p.id==='bandits').owner,s.playerId);assert.equal(s.logs.filter(l=>l.text==='Победа! Разбойничий стан присоединён к вашей державе.').length,1);assert.equal(s.marches.filter(m=>m.battle).length,0);assert.equal(s.marches.length,2);assert.ok(totalTroops(r.places.find(p=>p.id==='bandits').garrison)+s.marches.reduce((n,m)=>n+totalTroops(m.troops),0)<=start);
});
test('solo speed and pause control simulation without changing wall clock; observer resumes after loss',()=>{
 const r=new Room('a','Один',1,'valley',true);r.start('a');r.command('a','speed',{speed:5});r.tick(2);assert.equal(r.time,10);assert.equal(r.wallTime,2);assert.equal(r.snapshot('a').state.speed,5);r.command('a','speed',{speed:0});r.tick(20);assert.equal(r.time,10);assert.equal(r.wallTime,22);r.command('a','speed',{speed:1.5});r.tick(2);assert.equal(r.time,13);assert.equal(visualTime(10,0,300,0),10);assert.equal(visualTime(10,0,650,5),10);
});
test('online requires unanimous votes, rejects spam, expires votes while paused and always allows normal time',()=>{
 const r=setup();assert.ok(r.command('a','speed',{speed:2}).ok);assert.equal(r.speed,1);assert.equal(r.command('b','time-vote',{accept:'yes'}).ok,false);assert.ok(r.command('b','time-vote',{accept:true}).ok);assert.equal(r.speed,2);assert.equal(r.command('b','speed',{speed:5}).ok,false);assert.ok(r.command('b','speed',{speed:1}).ok);assert.equal(r.speed,1);r.tick(121);assert.ok(r.command('b','speed',{speed:0}).ok);assert.ok(r.command('a','time-vote',{accept:true}).ok);assert.equal(r.speed,0);const t=r.time;r.tick(59);assert.equal(r.time,t);r.tick(1);assert.equal(r.speed,1);
 r.tick(121);r.command('a','speed',{speed:4});r.command('b','time-vote',{accept:false});assert.equal(r.speed,1);assert.equal(r.vote,null);r.tick(121);r.command('a','speed',{speed:5});r.tick(31);assert.equal(r.vote,null);assert.equal(r.speed,1);
});
test('unique camp and ruins buildings have effects and cannot be built in other settlement kinds',()=>{
 const r=setup(),s=r.actor('a'),camp=r.places.find(p=>p.id==='bandits'),ruins=r.places.find(p=>p.id==='ruins');camp.owner=s.playerId;ruins.owner=s.playerId;assert.equal(r.command('a','build',{key:'spoils'}).ok,false);
 const before=income(s).gold;assert.ok(r.command('a','build',{key:'spoils',settlement:camp.id}).ok);assert.ok(r.command('a','build',{key:'archive',settlement:ruins.id}).ok);advance(r,17);assert.equal(income(s).gold-before,120);assert.ok(r.command('a','research',{key:'tactics',settlement:ruins.id}).ok);
 assert.equal(militaryLevel({archery:1},UNITS.crossbow),1);assert.equal(militaryLevel({stable:1},UNITS.knight),2);assert.equal(militaryLevel({mercenaries:1},UNITS.shield),2);for(const p of r.places)assert.ok(buildingSlots(p.buildings)<=5);assert.ok(Object.keys(BUILDINGS).includes('runeforge'));
});
