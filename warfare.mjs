import {power,totalTroops,BUILDINGS} from './dist/game.js';
import {findRoute,routeLength} from './dist/navigation.js';
export const troopsAt=(room,p)=>room.actors.find(a=>a.playerId===p.owner&&a.home===p.id)?.troops||(p.garrison??={});
export const spirit=morale=>.55+Math.max(0,Math.min(100,morale??80))*.005625;
export function prepareBattle(room,s,m,p){
  if(!room.actors.some(a=>a.playerId===p.owner)&&!p.garrison)p.garrison={spear:Math.max(1,Math.round(p.defense/4))};
  const defender=troopsAt(room,p),force=Math.round(power(m.troops,s,p)*spirit(m.morale)),def=p.defense,ratio=force/Math.max(1,def),win=force>=def;
  m.battle=true;m.battleAt=room.time;m.end=room.time+12;m.defenderOwner=p.owner;
  m.combat={force,defense:def,win,attackerInitial:{...m.troops},defenderInitial:{...defender},attackerStart:totalTroops(m.troops),defenderStart:totalTroops(defender),attackerMorale:m.morale??80,defenderMorale:p.morale??80,
    attackerLoss:win?Math.min(.48,.3/Math.max(.3,ratio)):Math.min(.9,.48/Math.max(.3,ratio)),defenderLoss:win?.85:Math.min(.7,force*.35/Math.max(1,def)),round:0};
}
export function advanceBattle(room,s,m,p){
  const c=m.combat;if(!c||p.owner!==m.defenderOwner)return;
  const round=Math.min(6,Math.floor((room.time-m.battleAt)/2));if(round<=c.round)return;
  const d=troopsAt(room,p),progress=round/6;
  for(const [k,n] of Object.entries(c.attackerInitial)){const prev=Math.ceil(n*c.attackerLoss*c.round/6),next=Math.ceil(n*c.attackerLoss*progress);m.troops[k]=Math.max(0,(m.troops[k]||0)-(next-prev));}
  for(const [k,n] of Object.entries(c.defenderInitial)){const prev=Math.ceil(n*c.defenderLoss*c.round/6),next=Math.ceil(n*c.defenderLoss*progress);d[k]=Math.max(0,(d[k]||0)-(next-prev));}
  m.morale=Math.max(0,c.attackerMorale-(c.win?15:65)*progress-(c.shock||0));p.morale=Math.max(0,c.defenderMorale-(c.win?65:18)*progress-(c.defenderShock||0));c.round=round;
  if(m.morale<20||!totalTroops(m.troops))m.routed=true;
}
export function awaken(room,s){
  const beast=s.beast;if(!beast||beast.id)return;
  const origin=room.places.find(p=>p.id===beast.origin),target=room.places.find(p=>p.id===beast.target),route=findRoute(origin,target,room.places,room.map);
  if(!route){s.beast=null;return;}
  Object.assign(beast,{id:`beast-${s.playerId}-${s.nextId++}`,owner:s.playerId,beast:true,route,start:room.time,duration:Math.max(35,routeLength(route)*1.6),phase:'march',health:2400});beast.end=beast.start+beast.duration;
  for(const a of room.actors)room.announce(a,`ДРЕВНИЙ ЗВЕРЬ ПРОБУДИЛСЯ! ${room.member(s).name} направил его к ${target.name}. Прибытие через ${Math.ceil(beast.duration)} сек.`,'bad');
}
export function tickBeast(room,s,dt){
  const b=s.beast;if(!b)return;awaken(room,s);if(!s.beast)return;
  const p=room.places.find(p=>p.id===b.target);
  if(b.phase==='march'&&room.time>=b.end){b.phase='assault';b.battle=true;b.start=room.time;b.end=room.time+12;b.strikes=0;
    for(const a of room.actors)room.announce(a,`Древний зверь ворвался в ${p.name}! Укрепления и гарнизон под ударом.`,'bad');}
  if(b.phase==='assault'){
    const defender=room.actors.find(a=>a.playerId===p.owner),troops=troopsAt(room,p);
    b.health=Math.max(0,b.health-(power(troops,defender||s)*.12)*dt);
    const strikes=Math.min(3,Math.floor((room.time-b.start)/4));
    while(b.strikes<strikes){b.strikes++;
      for(const k of Object.keys(troops))troops[k]=Math.max(0,troops[k]-Math.ceil(troops[k]*.2));
      for(const a of room.actors)for(const m of a.marches.filter(m=>m.battle&&m.target===p.id)){for(const k of Object.keys(m.troops))m.troops[k]=Math.max(0,m.troops[k]-Math.ceil(m.troops[k]*.2));m.morale=Math.max(0,(m.morale??80)-25);if(m.combat){m.combat.shock=(m.combat.shock||0)+25;m.combat.defenderShock=(m.combat.defenderShock||0)+25;}}
      p.morale=Math.max(5,(p.morale??80)-25);p.wallDamage=Math.min(.9,(p.wallDamage||0)+.3);p.devastated=true;
      // Two destroyed buildings at most; losses are actual levels, not a visual overlay.
      if(b.strikes<=2){const key=Object.keys(BUILDINGS).filter(k=>k!=='walls'&&p.buildings?.[k]>0).sort((a,c)=>p.buildings[c]-p.buildings[a])[0];if(key){p.buildings[key]=0;(p.ruinedBuildings??=[]).push(key);if(defender)defender.queue=defender.queue.filter(q=>q.key!==key||(q.settlement||defender.home)!==p.id);}}
      if(p.buildings)p.buildings.walls=0;
      for(const a of room.actors)room.announce(a,`${p.name}: удар древнего зверя ${b.strikes}/3. Гарнизон: ${totalTroops(troops)}, мораль: ${Math.round(p.morale)}.`,'bad');
    }
    if(room.time>=b.end||b.health<=0){
      if(b.health<=0){if(defender){defender.resources.gold+=900;defender.reputation=Math.min(100,defender.reputation+10);}for(const a of room.actors)room.announce(a,`Древний зверь повержен у ${p.name}! Защитники получают награду.`,'good');b.phase='fallen';b.battle=false;b.start=room.time;b.end=room.time+8;}
      else{b.phase='retreat';b.battle=false;b.returning=true;b.start=room.time;b.end=room.time+b.duration;for(const a of room.actors)room.announce(a,`Зверь покидает ${p.name}. Город сохранил владельца, но укрепления разрушены, гарнизон понёс потери.`,'bad');}
    }
  }else if(['retreat','fallen'].includes(b.phase)&&room.time>=b.end)s.beast=null;
}
