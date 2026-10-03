import assert from 'node:assert/strict';
const base=process.argv[2];
assert.ok(base?.startsWith('https://'),'Pass deployed HTTPS URL');
const client=()=>{let cookie='';return async(path,data)=>{const res=await fetch(base+'/api/'+path,{method:data?'POST':'GET',headers:{cookie,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(15000)});if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];const json=await res.json();return {status:res.status,...json};};};
const a=client(),b=client();
assert.equal((await fetch(base+'/health')).status,200);
assert.equal((await (await fetch(base+'/health')).json()).version,'0.3.0');
for(const file of ['index.html','app.js','online.js','world.js','audio.js','navigation.js','online.css','vendor/three.module.min.js','vendor/three.core.min.js','vendor/OrbitControls.js'])assert.equal((await fetch(base+'/'+file)).status,200,file);
assert.equal((await fetch(base+'/server.mjs')).status,404);
try{
 const created=await a('create',{name:'Проверка A',bots:1,map:'hills'});assert.ok(created.ok);const code=created.room.code;
 assert.ok((await b('join',{name:'Проверка B',code})).ok);
 assert.equal((await b('start',{})).ok,false);
 assert.ok((await a('start',{})).ok);
 assert.ok((await a('command',{id:'cloud-build',type:'build',args:{key:'farm'}})).ok);
 const one=await a('state'),two=await b('state');
 assert.equal(one.room.state.queue.length,1);assert.equal(two.room.state.queue.length,0);assert.equal(two.room.state.home,'gold');
 assert.ok(one.room.players.some(p=>p.bot));
 assert.ok((await a('command',{id:'cloud-alliance',type:'diplomacy',args:{target:'gold',action:'alliance'}})).ok);
 const pending=await b('state');assert.ok(pending.room.offers.length);
 assert.ok((await b('command',{id:'cloud-accept',type:'accept',args:{id:pending.room.offers[0].id}})).ok);
 assert.equal((await a('command',{id:'self-war',type:'diplomacy',args:{target:'home',action:'war'}})).ok,false);
 assert.ok((await a('command',{id:'real-war',type:'diplomacy',args:{target:'gold',action:'war'}})).ok);
 const marching=await a('command',{id:'routed-march',type:'march',args:{target:'gold',fraction:.25}});assert.ok(marching.ok);assert.ok(marching.room.state.marches[0].route.length>2);assert.equal(marching.room.state.map,'hills');
 console.log(JSON.stringify({ok:true,base,twoIndependentClients:true,bots:true,privateEconomies:true,diplomacy:true,assets:true}));
}finally{await a('leave',{});await b('leave',{});}
