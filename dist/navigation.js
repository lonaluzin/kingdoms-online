export const MAPS={
 valley:{name:'Речная долина',seed:9271,river:1,forest:1},
 forest:{name:'Лесное пограничье',seed:18451,river:2,forest:1.3},
 hills:{name:'Каменные холмы',seed:43271,river:3,forest:.65},
};
export const riverX=(z,map='valley')=>Math.sin(z*.12)*((MAPS[map]?.river||1)+2)*.35;
export const bridges=map=>[-12,12].map(z=>({x:riverX(z,map),z}));
export function layoutPlaces(places,map='valley'){
 const positions={home:[-22,18],gold:[22,18],red:[22,-18],silver:[-22,-18],willow:[10,0],oak:[-10,0],bandits:[-9,21],ruins:[9,-21]};
 return places.map(p=>({...p,...(positions[p.id]?{x:positions[p.id][0],z:positions[p.id][1]}:{})}));
}
export function blocked(x,z,places,map='valley'){
 if(Math.abs(x)>32||Math.abs(z)>26)return true;
 if(Math.abs(x-riverX(z,map))<3.6&&!bridges(map).some(b=>Math.abs(z-b.z)<.7&&Math.abs(x-b.x)<5))return true;
 return places.some(p=>Math.hypot(x-p.x,z-p.z)<(p.strategic?5:6.7));
}
const gate=(p,other)=>p.strategic?{x:Math.sign(other.x)*5,z:Math.sign(other.z)*5}:{x:Math.round(p.x),z:Math.round(p.z+(p.z===0?(other.z>0?7.5:-7.5):p.z>0?-7.5:7.5))};
export function findRoute(origin,target,places,map='valley'){
 const from=gate(origin,target),to=gate(target,origin),key=p=>`${p.x},${p.z}`;
 const open=[{...from,g:0,f:Math.hypot(from.x-to.x,from.z-to.z)}],seen=new Map([[key(from),open[0]]]),closed=new Set();
 while(open.length){open.sort((a,b)=>a.f-b.f);const n=open.shift(),nk=key(n);if(closed.has(nk))continue;closed.add(nk);
  if(n.x===to.x&&n.z===to.z){const path=[];for(let a=n;a;a=a.parent)path.unshift({x:a.x,z:a.z});return path;}
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=n.x+dx,z=n.z+dz,p={x,z},k=key(p);if(closed.has(k)||blocked(x,z,places,map)||(dx&&dz&&(blocked(n.x+dx,n.z,places,map)||blocked(n.x,n.z+dz,places,map))))continue;
   if([.25,.5,.75].some(t=>blocked(n.x+dx*t,n.z+dz*t,places,map)))continue;
   const g=n.g+Math.hypot(dx,dz);if(seen.has(k)&&seen.get(k).g<=g)continue;const node={x,z,g,f:g+Math.hypot(x-to.x,z-to.z),parent:n};seen.set(k,node);open.push(node);
  }
 }
 return null;
}
export const routeLength=path=>path.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-path[i].x,p.z-path[i].z),0);
export function routePoint(path,t){
 const length=routeLength(path),distance=Math.max(0,Math.min(1,t))*length;
 const sample=distance=>{let passed=0;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],d=Math.hypot(b.x-a.x,b.z-a.z);if(d>0&&passed+d>=distance)return {x:a.x+(b.x-a.x)*(distance-passed)/d,z:a.z+(b.z-a.z)*(distance-passed)/d};passed+=d;}return {...path.at(-1)};};
 const point=sample(distance),before=sample(Math.max(0,distance-.8)),after=sample(Math.min(length,distance+.8));
 return {...point,angle:Math.atan2(after.x-before.x,after.z-before.z)};
}
// Formation offsets extend the tangent beyond endpoints instead of stacking figures there.
export function formationTargets(path,t,count,returning=false,map='valley'){
 const length=routeLength(path),out=[];let distance=t*length;
 const sample=d=>{const u=d/Math.max(1,length),p=routePoint(path,u);if(u<0||u>1){const extra=(u<0?u:u-1)*length;p.x+=Math.sin(p.angle)*extra;p.z+=Math.cos(p.angle)*extra;}return p;};
 while(out.length<count){
  const p=sample(distance),bank=Math.abs(p.x-riverX(p.z,map));
  const columns=Math.min(count-out.length,bank>6.6?4:bank>5.2?2:1),angle=p.angle+(returning?Math.PI:0);
  for(let column=0;column<columns;column++){const side=(column-(columns-1)/2)*1.12;out.push({x:p.x+Math.cos(angle)*side,z:p.z-Math.sin(angle)*side,angle});}
  distance+=(returning?1:-1)*1.4;
 }
 return out;
}
export const formationTarget=(path,t,index,count,returning=false,map='valley')=>formationTargets(path,t,count,returning,map)[index];
// A correction may change the destination, but never teleport a visible soldier.
export function advanceVisualPosition(current,target,dt,speed){
 if(!current)return {...target};if(dt<=0)return {...current};
 const dx=target.x-current.x,dz=target.z-current.z,d=Math.hypot(dx,dz),blend=1-Math.exp(-12*dt),step=Math.min(d*blend,Math.max(0,speed)*dt*1.8),ratio=d>0?step/d:0;
 return {x:current.x+dx*ratio,z:current.z+dz*ratio,y:current.y+(target.y-current.y)*(1-Math.exp(-10*dt))};
}
// Render one snapshot interval behind the server; never advance beyond a stale snapshot.
export function visualTime(time,receivedAt,now,speed=1){return speed===0?time:time-.65*speed+Math.min(.65,Math.max(0,(now-receivedAt)/1000))*speed;}


