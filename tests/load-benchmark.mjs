// Local load measurement: one room, four independent guest clients, real HTTP polling.
import {createServer} from '../server.mjs';
import {writeFile} from 'node:fs/promises';
const {server}=createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
let responseBytes=0,requests=0,failures=0;
function client(){let cookie='';return async (route,data)=>{
  const response=await fetch(base+'/api/'+route,{method:data?'POST':'GET',headers:{cookie,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
  const assigned=response.headers.get('set-cookie');if(assigned)cookie=assigned.split(';')[0];
  const text=await response.text();responseBytes+=Buffer.byteLength(text);requests++;if(!response.ok)failures++;
  return JSON.parse(text);
};}
try{
  const clients=Array.from({length:4},client);
  const created=await clients[0]('create',{name:'Бенчмарк 1',bots:0});
  for(let i=1;i<4;i++)await clients[i]('join',{name:`Бенчмарк ${i+1}`,code:created.room.code});
  await clients[0]('start',{});
  for(const c of clients)await c('command',{id:crypto.randomUUID(),type:'build',args:{key:'farm'}});
  const cpuStart=process.cpuUsage(),start=performance.now();let peakRss=0;
  requests=0;responseBytes=0;
  while(performance.now()-start<20000){const frame=performance.now();await Promise.all(clients.map(c=>c('state')));peakRss=Math.max(peakRss,process.memoryUsage().rss);await new Promise(resolve=>setTimeout(resolve,Math.max(0,500-(performance.now()-frame))));}
  const cpu=process.cpuUsage(cpuStart),elapsed=performance.now()-start;
  const result={scenario:'1 room / 4 humans / 2 HTTP snapshots per second per player',durationSeconds:Math.round(elapsed/1000),requests,failures,peakServerRssMB:Math.round(peakRss/1024/1024),cpuPercentOfOneCore:Number(((cpu.user+cpu.system)/1000/elapsed*100).toFixed(2)),jsonOutboundKBPerSecond:Number((responseBytes/1024/(elapsed/1000)).toFixed(2)),note:'Local single-process benchmark, not a guarantee for other hardware or hostings; excludes browser 3D and tunnel.'};
  console.log(JSON.stringify(result,null,2));
  await writeFile(new URL('../load-report.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
}finally{await new Promise(resolve=>server.close(resolve));}
