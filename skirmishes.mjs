import {counterPower,totalTroops,UNITS} from './dist/game.js';
import {routePoint} from './dist/navigation.js';
import {troopsAt} from './warfare.mjs';
export const STANCES=['aggressive','defensive','hold','passive'];
export const marchPoint=(m,time)=>routePoint(m.route,Math.max(0,Math.min(1,(time-m.start)/(m.end-m.start)))*(m.returning?-1:1)+(m.returning?1:0));
const range=stance=>({aggressive:5,defensive:3,hold:2,passive:0}[stance]??3);
function damage(troops,amount){let left=Math.max(1,Math.floor(amount));for(const [k,n]of Object.entries(troops).sort((a,b)=>a[1]-b[1])){const loss=Math.min(n,Math.max(0,Math.floor(left/Math.max(1,UNITS[k]?.power||4))));troops[k]-=loss;left-=loss*(UNITS[k]?.power||4);}}
export function tickSkirmishes(room,dt){
 const marches=room.actors.flatMap(a=>a.eliminated?[]:a.marches.filter(m=>!m.battle&&m.route&&totalTroops(m.troops)>0).map(m=>({a,m,point:m.encounter?.point||marchPoint(m,room.time)})));
 for(const {m}of marches){if(m.encounter){m.start+=dt;m.end+=dt;if(room.time>=m.encounter.end){m.encounter=null;m.engageAfter=room.time+6;}}}
 for(let i=0;i<marches.length;i++)for(let j=i+1;j<marches.length;j++){
  const x=marches[i],y=marches[j];if(x.a===y.a||x.m.returning||y.m.returning||x.m.engageAfter>room.time||y.m.engageAfter>room.time||x.a.relations[y.a.home]?.status!=='war')continue;
  if(!x.m.encounter&&!y.m.encounter&&Math.max(range(x.m.stance),range(y.m.stance))===0)continue;
  const distance=Math.hypot(x.point.x-y.point.x,x.point.z-y.point.z);if(!x.m.encounter&&!y.m.encounter&&distance>Math.max(range(x.m.stance),range(y.m.stance)))continue;
  if(!x.m.encounter&&!y.m.encounter){const id='field-'+x.m.id+'-'+y.m.id;for(const [a,b]of [[x,y],[y,x]]){a.m.encounter={id,enemy:b.m.id,point:a.point,start:room.time,end:room.time+10,next:room.time};room.announce(a.a,'Ваш отряд встретил вражескую армию. Локальный бой; затем продолжит приказ.','bad');}}
  if(x.m.encounter?.enemy!==y.m.id)continue;
  if(distance>1.8)for(const [a,b]of [[x,y],[y,x]]){if(['hold','passive'].includes(a.m.stance))continue;const step=Math.min((distance-1.8)/2,dt*.8),dx=b.point.x-a.point.x,dz=b.point.z-a.point.z;a.m.encounter.point={...a.point,x:a.point.x+dx/distance*step,z:a.point.z+dz/distance*step,angle:Math.atan2(dx,dz)};}
  if(room.time<x.m.encounter.next)continue;
  const attackTroops=t=>distance<2.3?t:Object.fromEntries(Object.entries(t).filter(([k])=>['ranged','siege'].includes(UNITS[k]?.role)));
  const xp=counterPower(attackTroops(x.m.troops),y.m.troops,x.a),yp=counterPower(attackTroops(y.m.troops),x.m.troops,y.a);if(xp>0)damage(y.m.troops,xp*.07);if(yp>0)damage(x.m.troops,yp*.07);
  for(const {m}of [x,y]){m.morale=Math.max(5,(m.morale??80)-5);m.encounter.next=room.time+2;if(!totalTroops(m.troops)){m.end=room.time;m.kind='destroyed';m.encounter=null;}else if(m.morale<20){m.encounter=null;m.returning=true;m.start=room.time;m.end=room.time+m.duration;m.engageAfter=room.time+m.duration;}}
 }
 // City guards cover their gate; they never pursue a passing army across the map.
 for(const {a:enemy,m,point} of marches)for(const p of room.places){
  const defender=room.actors.find(a=>a.playerId===p.owner);if(!defender||defender===enemy||enemy.relations[defender.home]?.status!=='war'||p.guardStance==='passive')continue;
  const gate={x:p.x,z:p.z+(p.z>0?-7.5:7.5)},distance=Math.hypot(point.x-gate.x,point.z-gate.z);if(distance>range(p.guardStance||'defensive')||room.time<(p.guardHitAt||0))continue;
  const guards=troopsAt(room,p);if(!totalTroops(guards))continue;p.guardHitAt=room.time+2;damage(m.troops,counterPower(guards,m.troops,defender)*.06);if(distance<2)damage(guards,counterPower(m.troops,guards,enemy)*.04);if(!totalTroops(m.troops)){m.kind='destroyed';m.end=room.time;}
 }
 for(const a of room.actors){const beast=a.beast;if(!beast?.route||!['march','assault'].includes(beast.phase))continue;const pos=beast.phase==='assault'?room.places.find(p=>p.id===beast.target):marchPoint(beast,room.time);
  for(const {a:army,m,point}of marches){if(army===a||m.returning||Math.hypot(point.x-pos.x,point.z-pos.z)>range(m.stance))continue;beast.health=Math.max(0,beast.health-counterPower(m.troops,{},army)*.09*dt);if(!m.beastHitAt||room.time-m.beastHitAt>=2){damage(m.troops,35);m.beastHitAt=room.time;m.morale=Math.max(5,(m.morale??80)-5);}m.encounter={enemy:beast.id,point,start:room.time,end:room.time+1};}
  for(const p of room.places){if(p.owner===a.playerId||Math.hypot(p.x-pos.x,p.z-pos.z)>8)continue;const defender=room.actors.find(x=>x.playerId===p.owner);if(!defender)continue;beast.health=Math.max(0,beast.health-counterPower(troopsAt(room,p),{},defender)*.07*dt);}
  if(beast.health<=0&&beast.phase==='march'){beast.phase='fallen';beast.start=room.time;beast.end=room.time+8;for(const player of room.actors)room.announce(player,'Древний зверь повержен на пути к городу.','good');}
 }
}
