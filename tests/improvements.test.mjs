import test from 'node:test';
import assert from 'node:assert/strict';
import {Room} from '../rooms.mjs';
import {MAPS,findRoute,blocked,riverX,bridges,routePoint,visualTime} from '../dist/navigation.js';
import {income,totalTroops} from '../dist/game.js';
const game=(map='valley')=>{const r=new Room('a','Правитель',1,map);r.start('a');return r;};
test('all three maps have valid routes using bridges and avoiding buildings',()=>{
 for(const map of Object.keys(MAPS)){const r=game(map);for(let i=0;i<r.places.length;i++)for(let j=i+1;j<r.places.length;j++){
  const route=findRoute(r.places[i],r.places[j],r.places,map);assert.ok(route,`${map} ${r.places[i].id}->${r.places[j].id}`);
  for(let k=0;k<=100;k++){const p=routePoint(route,k/100);assert.ok(!blocked(p.x,p.z,r.places,map),`${map} blocked ${JSON.stringify(p)}`);if(Math.abs(p.x-riverX(p.z,map))<3.6)assert.ok(bridges(map).some(b=>Math.abs(b.z-p.z)<.7));}
 }}
});
test('visual clock advances continuously across regular snapshots and stops when offline',()=>{
 assert.equal(visualTime(10,1000,1250),9.6);assert.equal(visualTime(10,1000,1500),visualTime(10.5,1500,1500));assert.equal(visualTime(10,1000,8000),10);
});
test('own diplomacy rejects all actions without spending; eliminated orders stay rejected',()=>{
 const r=game(),s=r.actor('a'),before=structuredClone(s.resources);for(const action of ['trade','war','pact','aid','alliance','peace'])assert.equal(r.command('a','diplomacy',{target:'home',action}).ok,false);assert.deepEqual(s.resources,before);assert.equal(s.relations.home,undefined);
 s.eliminated=true;assert.match(r.command('a','build',{key:'farm'}).message,/столица/);assert.deepEqual(s.resources,before);
});
test('capture changes ruler and color, leaves real guards; reinforcements and recall conserve troops',()=>{
 const r=game(),s=r.actor('a');r.command('a','diplomacy',{target:'willow',action:'war'});assert.ok(r.command('a','march',{target:'willow',fraction:.75}).ok);
 let m=s.marches[0];r.tick(m.duration+.1);assert.ok(m.battle);r.tick(12.1);const p=r.places.find(p=>p.id==='willow');assert.equal(p.owner,s.playerId);assert.equal(p.ruler,'Правитель');assert.equal(p.color,r.places[0].color);assert.ok(totalTroops(p.garrison)>0);assert.equal(s.relations.willow,undefined);
 for(let i=0;i<100;i++)r.tick(1);const before=totalTroops(s.troops)+totalTroops(p.garrison);
 assert.ok(r.command('a','reinforce',{target:'willow',fraction:.25}).ok);m=s.marches.find(m=>m.kind==='reinforce');r.tick(m.duration+.1);assert.equal(totalTroops(s.troops)+totalTroops(p.garrison),before);
 assert.ok(r.command('a','recall',{target:'willow'}).ok);m=s.marches.find(m=>m.kind==='recall');r.tick(m.duration+.1);assert.equal(totalTroops(p.garrison),0);assert.equal(totalTroops(s.troops),before);
});
test('bots respect first five minutes and announce war with incoming army',()=>{
 const r=game();for(let i=0;i<299;i++)r.tick(1);assert.ok(!r.actors.flatMap(s=>s.marches).some(m=>m.target==='home'));const bot=r.actors[1];bot.troops={knight:100};bot.marches=[];for(const p of r.places)if(p.id!=='home')p.owner=bot.playerId;r.refresh();r.time=301;bot.time=301;r.bot(bot);assert.equal(r.actor('a').relations.gold.status,'war');assert.ok(r.actor('a').logs.some(l=>/воинов идут/.test(l.text)));
});
test('economy rejects forgery, negative and huge counts, duplicate deals and self aid',()=>{
 const r=game(),s=r.actor('a');for(const [type,args]of [['setResources',{gold:1e99}],['recruit',{key:'spear',count:-1}],['recruit',{key:'spear',count:1e99}],['build',{key:'__proto__'}],['trade',{resource:'__proto__',side:'sell'}],['march',{target:'willow',fraction:NaN}]])assert.equal(r.command('a',type,args).ok,false);
 const gold=s.resources.gold;for(let i=0;i<30;i++){assert.ok(r.command('a','trade',{resource:'wood',side:'buy'}).ok);assert.ok(r.command('a','trade',{resource:'wood',side:'sell'}).ok);}assert.equal(s.resources.gold,gold-30*35);assert.ok(Object.values(s.resources).every(n=>Number.isFinite(n)&&n>=0));
});
test('map resources differ and garrison food upkeep is counted',()=>{
 const valley=game(),forest=game('forest'),hills=game('hills');assert.equal(income(forest.actor('a')).wood-income(valley.actor('a')).wood,25);assert.equal(income(hills.actor('a')).stone-income(valley.actor('a')).stone,25);
 const s=valley.actor('a'),p=valley.places[1];p.owner=s.playerId;p.garrison={spear:10};const before=income(s).food;p.garrison={};assert.equal(income(s).food-before,6);
});
