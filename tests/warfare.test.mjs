import test from 'node:test';import assert from 'node:assert/strict';
import {Room} from '../rooms.mjs';import {income,totalTroops,costAt} from '../dist/game.js';import {formation} from '../dist/formation.js';
const setup=()=>{const r=new Room('a','Первый',0);r.join('b','Второй');r.seed=1329;r.members.forEach(m=>m.ready=true);r.start('a');return r;};
const advance=(r,n)=>{for(let i=0;i<Math.ceil(n*10);i++)r.tick(.1);};
test('captured settlements have independent construction, local hiring, income and march origin',()=>{
 const r=setup(),s=r.actor('a'),p=r.places.find(p=>p.id==='bandits');p.owner=s.playerId;p.garrison={sword:10};r.refresh();const before=income(s).food;
 assert.ok(r.command('a','build',{key:'farm',settlement:p.id}).ok);assert.ok(r.command('a','build',{key:'farm',settlement:s.home}).ok);
 assert.equal(r.command('b','build',{key:'walls',settlement:p.id}).ok,false);
 assert.ok(r.command('a','recruit',{key:'spear',count:5,settlement:p.id}).ok);advance(r,27);
 assert.equal(p.buildings.farm,1);assert.equal(s.buildings.farm,2);assert.equal(p.garrison.spear,5);assert.equal(s.troops.spear,12);assert.ok(income(s).food>before+170);
 r.command('a','diplomacy',{target:'willow',action:'war'});assert.ok(r.command('a','march',{target:'willow',source:p.id,fraction:1}).ok);const m=s.marches[0];assert.equal(m.origin,p.id);assert.equal(totalTroops(m.troops),15);assert.equal(totalTroops(p.garrison),0);
 assert.equal(costAt({gold:100},2).gold,220);
});
test('battle casualties and morale are real before resolution; retreat preserves survivors',()=>{
 const r=setup(),s=r.actor('a');r.command('a','diplomacy',{target:'willow',action:'war'});r.command('a','march',{target:'willow',fraction:.75});const m=s.marches[0];advance(r,m.duration+.2);assert.ok(m.battle);const start=totalTroops(m.troops),morale=m.morale;
 advance(r,4.1);assert.ok(totalTroops(m.troops)<start);assert.ok(m.morale<morale);assert.equal(r.snapshot('b').state.mapMarches[0].troops.sword,m.troops.sword);
 assert.equal(r.command('b','retreat',{id:m.id}).ok,false);const left=totalTroops(m.troops);assert.ok(r.command('a','retreat',{id:m.id}).ok);assert.ok(m.returning);assert.equal(r.places.find(p=>p.id==='willow').owner,'willow');advance(r,m.duration+.2);assert.equal(totalTroops(s.troops),46-start+left);
});
test('ancient beast is shared, walks, destroys real buildings and garrison, leaves ownership intact and returns',()=>{
 const r=setup(),s=r.actor('a'),enemy=r.actor('b'),p=r.places.find(p=>p.id===enemy.home);s.buildings.shrine=1;s.resources={gold:4000,wood:1000,stone:1200,food:2000};enemy.buildings.walls=3;const count=totalTroops(enemy.troops);
 r.command('a','diplomacy',{target:p.id,action:'war'});assert.ok(r.command('a','summon',{target:p.id}).ok);advance(r,45.2);const b=s.beast;assert.ok(b.route.length>2);assert.equal(b.phase,'march');assert.equal(r.snapshot('b').state.mapBeasts[0].id,b.id);assert.ok(enemy.logs.some(l=>/ДРЕВНИЙ ЗВЕРЬ/.test(l.text)));
 advance(r,b.duration+12.5);assert.equal(p.owner,enemy.playerId);assert.equal(enemy.eliminated,false);assert.equal(enemy.buildings.walls,0);assert.equal(p.ruinedBuildings.length,2);assert.ok(totalTroops(enemy.troops)<count);assert.ok(p.morale<35);assert.ok(p.defense<100);assert.equal(b.phase,'retreat');advance(r,b.duration+1);assert.equal(s.beast,null);
});
test('strong garrison can kill the beast and receive reward without a capture',()=>{
 const r=setup(),s=r.actor('a'),d=r.actor('b');s.buildings.shrine=1;s.resources={gold:4000,wood:1000,stone:1200,food:2000};d.troops={knight:2000};r.command('a','diplomacy',{target:d.home,action:'war'});r.command('a','summon',{target:d.home});advance(r,45.2);const b=s.beast;advance(r,b.duration+1.5);assert.equal(b.phase,'fallen');assert.ok(d.logs.some(l=>/повержен/.test(l.text)));assert.equal(d.eliminated,false);
});
test('troop types have proportional visible formations with a bounded large-army budget',()=>{
 assert.deepEqual(formation({sword:5,spear:5}).map(f=>f.type),['sword','spear']);assert.equal(formation({sword:20,spear:10,archer:15}).length,9);assert.equal(formation({knight:1})[0].type,'knight');assert.ok(formation({sword:100000,spear:10000,archer:1000}).length<=96);
});
test('victory recap distinguishes casualties from troops left guarding captured land',()=>{
 const r=setup(),s=r.actor('a');r.command('a','march',{target:'bandits',fraction:.75});const m=s.marches[0],start=totalTroops(m.troops);advance(r,m.duration+12.5);const returning=s.marches.find(m=>m.returning);assert.equal(returning.outcome,'victory');assert.equal(returning.casualties+returning.garrisonLeft+totalTroops(returning.troops),start);assert.equal(returning.garrisonLeft,totalTroops(r.places.find(p=>p.id==='bandits').garrison));
});
