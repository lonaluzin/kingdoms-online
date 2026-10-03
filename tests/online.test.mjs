import test from 'node:test';
import assert from 'node:assert/strict';
import {Room} from '../rooms.mjs';
import {createServer} from '../server.mjs';
const setup=()=>{const r=new Room('one','Первый',0);r.join('two','Второй');r.start('one');return r;};
test('independent resources, shared world, private snapshots',()=>{
  const r=setup();const before=r.actor('two').resources.gold;assert.ok(r.command('one','build',{key:'farm'}).ok);assert.equal(r.actor('two').resources.gold,before);
  r.tick(27);assert.equal(r.actor('one').buildings.farm,2);assert.equal(r.actor('two').buildings.farm,1);
  assert.equal(r.snapshot('two').state.home,'gold');assert.equal(r.snapshot('two').state.places.find(p=>p.id==='gold').owner,'player');
  assert.ok(!('resources' in r.snapshot('one').players[1]));assert.equal(r.snapshot('unknown'),null);
});
test('bilateral diplomacy and actual transferred aid',()=>{
  const r=setup();assert.ok(r.command('one','diplomacy',{target:'gold',action:'alliance'}).ok);assert.equal(r.actor('two').relations.home.status,'peace');
  assert.equal(r.command('one','accept',{id:r.offers[0].id}).ok,false);assert.ok(r.command('two','accept',{id:r.offers[0].id}).ok);
  assert.equal(r.actor('one').relations.gold.status,'alliance');assert.equal(r.actor('two').relations.home.status,'alliance');
  r.actor('two').troops.spear=20;assert.ok(r.command('one','diplomacy',{target:'gold',action:'aid'}).ok);assert.ok(r.command('two','accept',{id:r.offers[0].id}).ok);
  assert.equal(r.actor('two').troops.spear,5);assert.equal(r.actor('one').troops.spear,27);
});
test('march shared between clients, capital battle, elimination and victory',()=>{
  const r=setup();r.actor('one').troops={knight:100};assert.ok(r.command('one','diplomacy',{target:'gold',action:'war'}).ok);assert.ok(r.command('one','march',{target:'gold',fraction:.75}).ok);
  assert.equal(r.snapshot('two').state.mapMarches.length,1);assert.equal(r.snapshot('two').state.mapMarches[0].origin,'home');
  r.tick(30);assert.ok(r.actor('two').eliminated);assert.equal(r.snapshot('two').state.places.find(p=>p.id==='gold').owner,'r0');assert.equal(r.winner.id,'r0');assert.equal(r.command('two','build',{key:'farm'}).ok,false);
});
test('bots develop, recruit and march using paid commands',()=>{
  const r=new Room('one','Игрок',2);r.start('one');for(let i=0;i<180;i++)r.tick(1);
  const bot=r.actors.find(s=>r.member(s).bot&&s.buildings.farm>=2);assert.ok(bot.buildings.farm>=2);assert.ok(bot.buildings.barracks>=1);assert.ok(bot.logs.some(l=>/Армия|Победа|Поражение/.test(l.text)));assert.ok(bot.resources.gold>=0);
});
test('invalid commands cannot inject balances, keys, counts or invalid armies',()=>{
  const r=setup(),s=r.actor('one');assert.equal(r.command('one','setResources',{gold:999999}).ok,false);assert.equal(r.command('one','build',{key:'__proto__'}).ok,false);
  assert.equal(r.command('one','recruit',{key:'sword',count:-100}).ok,false);assert.equal(r.command('one','march',{target:'bandits',fraction:-1}).ok,false);assert.equal(s.resources.gold,1200);assert.equal(s.troops.sword,20);
});
test('HTTP: two cookies join, host starts, deduplication, refresh and private files',async()=>{
  const {server}=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  const client=()=>{let cookie='';return async(path,data)=>{const res=await fetch(base+'/api/'+path,{method:data?'POST':'GET',headers:{cookie,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];return {status:res.status,...await res.json()};};};
  try{assert.equal((await fetch(base)).status,200);assert.equal((await fetch(base+'/server.mjs')).status,404);const a=client(),b=client();
    const created=await a('create',{name:'A',bots:1});assert.ok(created.ok);const code=created.room.code;assert.ok((await b('join',{name:'B',code})).ok);assert.equal((await b('start',{})).ok,false);assert.ok((await a('start',{})).ok);
    const one=await a('command',{id:'same-command',type:'build',args:{key:'farm'}});const two=await a('command',{id:'same-command',type:'build',args:{key:'farm'}});assert.ok(one.ok);assert.ok(two.ok);assert.equal(two.message,one.message);assert.equal((await a('state')).room.state.queue.length,1);assert.equal((await b('state')).room.state.queue.length,0);assert.equal((await b('state')).room.state.home,'gold');
  }finally{await new Promise(resolve=>server.close(resolve));}
});

