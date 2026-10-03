export const RESOURCES = { gold: 'Золото', wood: 'Дерево', stone: 'Камень', food: 'Провизия' };
export const BUILDINGS = {
  farm: { name: 'Ферма', icon: 'wheat', text: 'Кормит население и войско.', effect: '+90 провизии / мин', cost: { gold: 100, wood: 140 }, income: { food: 90 } },
  lumber: { name: 'Лесопилка', icon: 'tree', text: 'Леса становятся опорой строительства.', effect: '+75 дерева / мин', cost: { gold: 120, wood: 80 }, income: { wood: 75 } },
  quarry: { name: 'Каменоломня', icon: 'mountain', text: 'Камень для крепостей и великих городов.', effect: '+60 камня / мин', cost: { gold: 140, wood: 120 }, income: { stone: 60 } },
  market: { name: 'Рынок', icon: 'coins', text: 'Купцы наполняют королевскую казну.', effect: '+100 золота / мин', cost: { gold: 200, wood: 160, stone: 80 }, income: { gold: 100 } },
  barracks: { name: 'Казармы', icon: 'swords', text: 'Открывают тяжёлую пехоту и рыцарей.', effect: 'Новые войска · найм быстрее', cost: { gold: 260, wood: 200, stone: 120 }, income: {} },
  walls: { name: 'Крепостные стены', icon: 'shield', text: 'Защищают столицу от вражеских набегов.', effect: '+100 защиты столицы', cost: { gold: 180, wood: 100, stone: 240 }, income: {} },
  academy: { name: 'Академия', icon: 'book', text: 'Знания открывают новые возможности.', effect: 'Открывает исследования', cost: { gold: 300, wood: 180, stone: 180 }, income: {} },
  shrine: { name: 'Древнее святилище', icon: 'flame', text: 'Здесь ещё помнят имена древних зверей.', effect: 'Открывает ритуал призыва', cost: { gold: 650, wood: 200, stone: 350 }, income: {} },
};
export const UNITS = {
  sword: { name: 'Мечники', type: 'Пехота', icon: 'swords', power: 4, cost: { gold: 16, food: 8 }, req: 0, text: 'Универсальная пехота' },
  spear: { name: 'Копейщики', type: 'Пехота', icon: 'spear', power: 4, cost: { gold: 14, wood: 8, food: 6 }, req: 0, text: 'Сильны против кавалерии' },
  shield: { name: 'Щитоносцы', type: 'Пехота', icon: 'shield', power: 6, cost: { gold: 24, stone: 5, food: 10 }, req: 1, text: 'Удерживают позиции' },
  archer: { name: 'Лучники', type: 'Стрелки', icon: 'bow', power: 5, cost: { gold: 18, wood: 10, food: 8 }, req: 0, text: 'Поддержка с дальней дистанции' },
  crossbow: { name: 'Арбалетчики', type: 'Стрелки', icon: 'bow', power: 7, cost: { gold: 28, wood: 12, food: 10 }, req: 1, text: 'Против тяжёлой брони' },
  knight: { name: 'Рыцари', type: 'Кавалерия', icon: 'horse', power: 13, cost: { gold: 55, food: 25 }, req: 2, text: 'Быстры, уязвимы к копьям' },
  catapult: { name: 'Катапульты', type: 'Осада', icon: 'siege', power: 17, cost: { gold: 80, wood: 55, stone: 20, food: 10 }, req: 2, text: 'Двойная сила против городов' },
  ram: { name: 'Тараны', type: 'Осада', icon: 'siege', power: 11, cost: { gold: 50, wood: 70, food: 10 }, req: 1, text: 'Двойная сила против городов' },
  tower: { name: 'Осадные башни', type: 'Осада', icon: 'castle', power: 14, cost: { gold: 70, wood: 90, food: 12 }, req: 2, text: 'Двойная сила против городов' },
};
export const TECHS = {
  harvest: { name: 'Севооборот', icon: 'wheat', text: '+25% производства провизии за уровень', cost: { gold: 260, wood: 100 } },
  tactics: { name: 'Военное дело', icon: 'swords', text: '+15% силы войска за уровень', cost: { gold: 320, stone: 80 } },
  diplomacy: { name: 'Искусство переговоров', icon: 'scroll', text: '+8 репутации за уровень', cost: { gold: 280, food: 100 } },
};
export const PLACES = [
  { id: 'home', name: 'Велиград', kind: 'capital', owner: 'player', x: -10, z: 8, defense: 220, ruler: 'Ваше королевство', color: '#70cdb6', detail: 'Сердце вашей державы' },
  { id: 'willow', name: 'Ивовая долина', kind: 'village', owner: 'willow', x: -20, z: -6, defense: 95, ruler: 'Староста Мирон', color: '#d4bb81', detail: 'Плодородные земли и мирные жители' },
  { id: 'oak', name: 'Дубравы', kind: 'village', owner: 'oak', x: 6, z: 21, defense: 110, ruler: 'Староста Радмила', color: '#d4bb81', detail: 'Лесное поселение у старого тракта' },
  { id: 'gold', name: 'Златогорье', kind: 'city', owner: 'gold', x: 21, z: 5, defense: 360, ruler: 'Княгиня Элеонора', color: '#e5bf70', detail: 'Богатый город свободных купцов' },
  { id: 'red', name: 'Багровый престол', kind: 'city', owner: 'red', x: 7, z: -21, defense: 460, ruler: 'Король Рейнард', color: '#df897a', detail: 'Гордая крепость северных земель' },
  { id: 'bandits', name: 'Разбойничий стан', kind: 'camp', owner: 'bandits', x: -28, z: 17, defense: 85, ruler: 'Вольные разбойники', color: '#df897a', detail: 'Здесь исчезают торговые караваны' },
  { id: 'ruins', name: 'Забытые руины', kind: 'ruins', owner: 'wild', x: 26, z: -16, defense: 180, ruler: 'Дикие земли', color: '#adb5bb', detail: 'Древний зверь охраняет сокровища' },
];
export function freshGame() {
  return { version: 1, time: 0, speed: 1, resources: { gold: 1200, wood: 760, stone: 520, food: 980 }, buildings: { farm: 1, lumber: 1, quarry: 1, market: 1, barracks: 0, walls: 0, academy: 0, shrine: 0 }, troops: { sword: 20, spear: 12, archer: 14 }, techs: { harvest: 0, tactics: 0, diplomacy: 0 }, places: structuredClone(PLACES), relations: Object.fromEntries(['willow', 'oak', 'gold', 'red'].map(id => [id, { status: 'peace', trade: false }])), reputation: 50, queue: [], marches: [], events: [], logs: [{ time: 0, text: 'Летопись Велиграда началась. Ваш народ ждёт первых решений.', kind: 'good' }], nextId: 1, victory: null, ritual: null, beast: null, flags: {} };
}
export function restoreGame(raw) {
  try {
    const s = JSON.parse(raw);
    if (s?.version !== 1 || !Number.isFinite(s.time) || s.time < 0 || ![0, 1, 2, 4].includes(s.speed)) return null;
    const valid = (o, keys, max) => o && keys.every(k => Number.isFinite(o[k]) && o[k] >= 0 && o[k] <= max);
    if (!valid(s.resources, Object.keys(RESOURCES), 1e9) || !valid(s.buildings, Object.keys(BUILDINGS), 3) || !valid(s.techs, Object.keys(TECHS), 3)) return null;
    if (!s.troops || Object.entries(s.troops).some(([k, v]) => !UNITS[k] || !Number.isInteger(v) || v < 0 || v > 1e6)) return null;
    if (!Array.isArray(s.places) || s.places.length !== PLACES.length || !s.places.every((p, i) => p.id === PLACES[i].id && Number.isFinite(p.defense) && p.defense >= 0)) return null;
    if (!['queue', 'marches', 'events', 'logs'].every(k => Array.isArray(s[k])) || !s.flags || !s.relations || !Number.isFinite(s.reputation) || !Number.isInteger(s.nextId)) return null;
    if (!['willow', 'oak', 'gold', 'red'].every(id => ['peace','alliance','war','pact'].includes(s.relations[id]?.status))) return null;
    if (!s.queue.every(q => ['build','recruit','research'].includes(q.type) && Number.isFinite(q.end) && Number.isFinite(q.start) && (q.type === 'build' ? BUILDINGS[q.key] : q.type === 'recruit' ? UNITS[q.key] && Number.isInteger(q.count) && q.count > 0 : TECHS[q.key]))) return null;
    if (!s.marches.every(m => PLACES.some(p => p.id === m.target) && Number.isFinite(m.end) && Number.isFinite(m.start) && m.troops && Object.entries(m.troops).every(([k,v]) => UNITS[k] && Number.isInteger(v) && v >= 0))) return null;
    s.places = s.places.map((p,i) => ({ ...PLACES[i], owner: p.owner, defense: p.defense }));
    return s;
  } catch { return null; }
}
export const totalTroops = troops => Object.values(troops).reduce((a,b) => a + b, 0);
export function power(troops, s, target) {
  let base = Object.entries(troops).reduce((n,[id,count]) => n + UNITS[id].power * count * (target?.kind === 'city' && UNITS[id].type === 'Осада' ? 2 : 1), 0);
  if (target?.id === 'red') base += (troops.spear || 0) * 2;
  if (target?.kind === 'camp') base += (troops.archer || 0) * 1.5;
  return Math.round(base * (1 + s.techs.tactics * .15));
}
export function income(s) {
  const r = { gold: 60, wood: 30, stone: 20, food: 90 };
  if(s.map==='forest')r.wood+=25;else if(s.map==='hills')r.stone+=25;else if(s.map==='valley')r.food+=25;
  for (const [key,b] of Object.entries(BUILDINGS)) for (const [res,v] of Object.entries(b.income)) r[res] += v * s.buildings[key];
  r.gold += Object.entries(s.relations).filter(([k,r])=>!r.group||r.group===k).map(([,r])=>r).filter(x => x.trade && x.status !== 'war').length * 65;
  for (const p of s.places) if (p.owner === (s.playerId || 'player') && p.id !== (s.home || 'home')) { r.gold += 30; r[p.kind === 'village' ? 'food' : 'stone'] += 45; }
  r.food *= 1 + s.techs.harvest * .25;
  if (s.events.some(e => e.type === 'drought' && e.end > s.time)) r.food *= .45;
  r.food -= s.places.filter(p=>p.owner===(s.playerId||'player')).reduce((n,p)=>n+totalTroops(p.garrison||{})*.6,0);
  r.food -= totalTroops(s.troops) * .6 + s.marches.reduce((n,m) => n + totalTroops(m.troops) * .6, 0);
  return r;
}
export const costAt = (base, level = 0, count = 1) => Object.fromEntries(Object.entries(base).map(([k,v]) => [k,Math.ceil(v * (1 + level * .6) * count)]));
export const canPay = (s,cost) => Object.entries(cost).every(([k,v]) => s.resources[k] >= v);
function pay(s,cost) { for (const [k,v] of Object.entries(cost)) s.resources[k] -= v; }
function log(s,text,kind='info') { s.logs.unshift({ time: s.time, text, kind }); s.logs = s.logs.slice(0,60); }
const fail = message => ({ ok: false, message });
export function act(s, type, args = {}) {
  if (s.victory && type !== 'continue') return fail('Эта летопись завершена. Продолжите игру или начните новую.');
  if (type === 'continue') { s.flags.won = true; s.victory = null; s.speed = 1; return { ok: true, message: 'История продолжается' }; }
  if (type === 'build' || type === 'research') {
    const catalog = type === 'build' ? BUILDINGS : TECHS, levels = type === 'build' ? s.buildings : s.techs, item = catalog[args.key];
    if (!item) return fail('Неизвестное улучшение');
    if (type === 'research' && !s.buildings.academy) return fail('Сначала постройте академию');
    if (levels[args.key] >= 3) return fail('Достигнут максимальный уровень');
    if (s.queue.some(q => q.type === type)) return fail(type === 'build' ? 'Строители уже заняты' : 'Учёные уже заняты');
    const cost = costAt(item.cost, levels[args.key]);
    if (!canPay(s,cost)) return fail('Недостаточно ресурсов');
    pay(s,cost); s.queue.push({ id: s.nextId++, type, key: args.key, start: s.time, end: s.time + 16 + levels[args.key] * 10 });
    log(s,`${item.name}: ${type === 'build' ? 'строительство' : 'исследование'} начато.`);
    return { ok: true, message: `${item.name} — работа началась` };
  }
  if (type === 'recruit') {
    const u = UNITS[args.key], count = Number(args.count);
    if (!u || !Number.isInteger(count) || count < 1 || count > 100) return fail('Выберите от 1 до 100 воинов');
    if (s.buildings.barracks < u.req) return fail(`Нужны казармы уровня ${u.req}`);
    if (s.queue.filter(q => q.type === 'recruit').length >= 3) return fail('Очередь найма заполнена');
    const cost = costAt(u.cost,0,count);
    if (!canPay(s,cost)) return fail('Недостаточно ресурсов');
    pay(s,cost); const start = Math.max(s.time, ...s.queue.filter(q => q.type === 'recruit').map(q => q.end));
    s.queue.push({ id:s.nextId++, type, key: args.key, count, start, end: start + Math.max(6, count * 1.2 / (1 + s.buildings.barracks * .25)) });
    return { ok: true, message: `${u.name}: ${count} в очереди найма` };
  }
  if (type === 'diplomacy') {
    const p = s.places.find(p => p.id === args.target), r = s.relations[args.target];
    if (!p || !r || p.owner === (s.playerId || 'player')) return fail('С этим поселением переговоры недоступны');
    const a = args.action;
    if (a === 'war') {
      if (r.status === 'war') return fail('Война уже объявлена');
      s.reputation = Math.max(0,s.reputation - (r.status === 'alliance' || r.status === 'pact' ? 25 : 8)); r.status = 'war'; r.trade = false;
      log(s,`Объявлена война: ${p.name}. Договоры расторгнуты.`, 'bad');
    } else {
      if (r.status === 'war' && a !== 'peace') return fail('Сначала заключите мир');
      const cost = { trade: 120, alliance: 300, pact: 100, aid: 180, peace: 220 }[a];
      if (!cost) return fail('Неизвестное действие');
      if (a === 'trade' && r.trade) return fail('Торговый путь уже открыт');
      if (a === 'alliance' && r.status === 'alliance') return fail('Союз уже заключён');
      if (a === 'pact' && ['pact','alliance'].includes(r.status)) return fail('Договор уже действует');
      if (a === 'alliance' && s.reputation < 45) return fail('Для союза нужна репутация не ниже 45');
      if (a === 'aid' && r.status !== 'alliance') return fail('Военную помощь оказывают союзники');
      if (a === 'aid' && (r.aidAt || 0) > s.time) return fail('Помощь будет доступна через минуту');
      if (a === 'peace' && r.status !== 'war') return fail('Вы уже живёте в мире');
      if (!canPay(s,{gold:cost})) return fail('Недостаточно золота');
      pay(s,{gold:cost});
      if (a === 'trade') r.trade = true;
      if (a === 'alliance' || a === 'pact') r.status = a;
      if (a === 'peace') r.status = 'peace';
      if (a === 'aid') { s.troops.spear = (s.troops.spear || 0) + 15; r.aidAt = s.time + 60; }
      if (a === 'alliance') s.reputation = Math.min(100,s.reputation + 8);
      if (a === 'trade') s.reputation = Math.min(100,s.reputation + 3);
      log(s,`${p.name}: ${ {trade:'торговый путь открыт', alliance:'союз заключён', pact:'пакт о ненападении подписан', aid:'прибыли 15 копейщиков', peace:'мир заключён'}[a] }.`, 'good');
    }
    checkVictory(s); return { ok:true, message:s.logs[0].text };
  }
  if (type === 'trade') {
    if (!['wood','stone','food'].includes(args.resource) || !['buy','sell'].includes(args.side)) return fail('Неизвестная сделка');
    const price = args.resource === 'food' && s.events.some(e => e.type === 'drought') ? 160 : args.resource === 'stone' ? 130 : 100;
    const cost = args.side === 'buy' ? {gold:price} : {[args.resource]:100};
    if (!canPay(s,cost)) return fail('Недостаточно ресурсов для сделки');
    pay(s,cost); s.resources[args.side === 'buy' ? args.resource : 'gold'] += args.side === 'buy' ? 100 : Math.floor(price * .65);
    return {ok:true,message:args.side === 'buy' ? `Куплено: ${RESOURCES[args.resource]} +100` : `Продано: ${RESOURCES[args.resource]} −100`};
  }
  if (type === 'march' || type === 'reinforce') {
    const p = s.places.find(p => p.id === args.target);
    if(!p)return fail('Неизвестное поселение');
    if(type==='reinforce'&&(p.owner!==(s.playerId||'player')||p.id===(s.home||'home')))return fail('Выберите своё владение вне столицы');
    if(type==='march'&&p.owner===(s.playerId||'player'))return fail('Выберите чужое поселение');
    if (s.marches.some(m => m.target === p.id && !m.returning)) return fail('Армия уже идёт к этой цели');
    if (type==='march' && s.relations[p.id] && s.relations[p.id].status !== 'war') return fail('Перед походом объявите войну в окне дипломатии');
    const fraction = Number(args.fraction ?? 1);
    if (![.25,.5,.75,1].includes(fraction)) return fail('Неверная доля войска');
    const troops = Object.fromEntries(Object.entries(s.troops).map(([k,v]) => [k,Math.floor(v * fraction)]));
    if (!totalTroops(troops)) return fail('В столице нет войск для похода');
    if (s.resources.food < 40) return fail('Для похода нужно 40 провизии');
    pay(s,{food:40}); for (const [k,v] of Object.entries(troops)) s.troops[k] -= v;
    const duration = Math.max(10,Math.hypot(p.x-(s.places.find(x=>x.id===(s.home||'home'))?.x??-10),p.z-(s.places.find(x=>x.id===(s.home||'home'))?.z??8)) * .65);
    s.marches.push({id:s.nextId++,target:p.id,troops,start:s.time,end:s.time+duration,duration,returning:false});
    log(s,`Армия (${totalTroops(troops)}) выступила: ${p.name}.`); return {ok:true,message:`Поход начался · ${Math.ceil(duration)} сек.`};
  }
  if (type === 'summon') {
    if (!s.buildings.shrine) return fail('Сначала постройте древнее святилище');
    if (s.ritual || s.beast) return fail('Ритуал уже начат');
    const target = s.places.find(p => p.kind === 'city' && p.owner !== (s.playerId || 'player') && s.relations[p.id]?.status === 'war');
    if (!target) return fail('Для призыва нужен вражеский город в состоянии войны');
    if (!canPay(s,{gold:2500,stone:800,food:700})) return fail('Нужно 2500 золота, 800 камня и 700 провизии');
    pay(s,{gold:2500,stone:800,food:700}); s.ritual = {start:s.time,end:s.time+45,target:target.id};
    log(s,'В святилище начался ритуал пробуждения древнего зверя.','bad'); return {ok:true,message:'Ритуал начался · 45 секунд'};
  }
  return fail('Неизвестное действие');
}
function checkVictory(s) {
  if (s.online || s.flags.won || s.victory) return;
  if (s.places.filter(p => p.kind === 'city').every(p => p.owner === (s.playerId || 'player'))) s.victory = 'Военная победа';
  else if (s.resources.gold >= 6000 && Object.entries(s.relations).filter(([k,r])=>!r.group||r.group===k).map(([,r])=>r).filter(r => r.trade).length >= 3) s.victory = 'Экономическая победа';
  else if (Object.entries(s.relations).filter(([k,r])=>!r.group||r.group===k).map(([,r])=>r).filter(r => r.status === 'alliance').length >= 4 && s.reputation >= 80) s.victory = 'Политическая победа';
  if (s.victory) { s.speed = 0; log(s,`${s.victory}! Имя вашего королевства вошло в историю.`, 'good'); }
}
export function tick(s, dt) {
  if (s.speed === 0 || s.victory || dt <= 0) return;
  const elapsed = dt * s.speed; s.time += elapsed;
  const inc = income(s); for (const key of Object.keys(RESOURCES)) s.resources[key] = Math.max(0,s.resources[key] + inc[key] / 60 * elapsed);
  for (const q of s.queue.filter(q => q.end <= s.time)) {
    if (q.type === 'build') { s.buildings[q.key]++; log(s,`${BUILDINGS[q.key].name}: уровень ${s.buildings[q.key]} готов.`, 'good'); }
    if (q.type === 'research') { s.techs[q.key]++; if (q.key === 'diplomacy') s.reputation = Math.min(100,s.reputation+8); log(s,`${TECHS[q.key].name}: исследование завершено.`, 'good'); }
    if (q.type === 'recruit') { s.troops[q.key] = (s.troops[q.key] || 0) + q.count; log(s,`${UNITS[q.key].name}: ${q.count} воинов прибыли в столицу.`, 'good'); }
  }
  s.queue = s.queue.filter(q => q.end > s.time);
  const arrived = s.online ? [] : s.marches.filter(m => m.end <= s.time);
  if (!s.online) s.marches = s.marches.filter(m => m.end > s.time);
  for (const m of arrived) {
    if (m.returning) { for (const [k,v] of Object.entries(m.troops)) s.troops[k] = (s.troops[k]||0)+v; log(s,`В столицу вернулись ${totalTroops(m.troops)} воинов.`); continue; }
    const p = s.places.find(p => p.id === m.target), relation = s.relations[p.id];
    if (p.owner === (s.playerId || 'player') || (relation && relation.status !== 'war')) { s.marches.push({...m,start:s.time,end:s.time+m.duration,returning:true}); log(s,`Поход к ${p.name} отменён: цель больше не враждебна.`); continue; }
    const attack = power(m.troops,s,p), win = attack >= p.defense, ratio = attack / Math.max(1,p.defense);
    const lost = win ? Math.min(.48,.3 / Math.max(.3,ratio)) : Math.min(.9,.48 / Math.max(.3,ratio));
    const survivors = Object.fromEntries(Object.entries(m.troops).map(([k,v]) => [k,Math.max(0,v-Math.ceil(v*lost))]));
    if (win) {
      const gold = p.kind === 'camp' ? 380 : p.kind === 'ruins' ? 650 : p.kind === 'city' ? 700 : 200;
      p.owner = (s.playerId || 'player'); p.defense = Math.round(attack * .3); s.resources.gold += gold; s.resources.wood += 90;
      s.reputation = Math.max(0,Math.min(100,s.reputation + (p.kind === 'camp' || p.kind === 'ruins' ? 8 : p.kind === 'village' ? -15 : -5)));
      if (relation) { relation.trade = false; relation.status = 'peace'; }
      log(s,`Победа! ${p.name} под вашим контролем. Добыча: ${gold} золота, 90 дерева. Потери: ${totalTroops(m.troops)-totalTroops(survivors)}.`, 'good');
    } else { p.defense = Math.max(25,Math.round(p.defense-attack*.35)); log(s,`Поражение у ${p.name}. Оборона врага ослаблена до ${p.defense}. Выжившие отступают.`, 'bad'); }
    if (totalTroops(survivors)) s.marches.push({...m,troops:survivors,start:s.time,end:s.time+m.duration,returning:true});
  }
  if (s.time >= 90 && !s.flags.drought) { s.flags.drought=true; s.events.push({type:'drought',end:s.time+70}); log(s,'Засуха в долине: урожай снижен на 55% на 70 секунд. Цены на еду выросли.','bad'); }
  s.events = s.events.filter(e => e.end > s.time);
  if (s.time >= 240 && !s.flags.invasion) { s.flags.invasion=true; s.events.push({type:'invasion',end:s.time+45}); log(s,'Северные варвары идут к Велиграду. Набег через 45 секунд!','bad'); }
  if (s.flags.invasion && !s.flags.raided && !s.events.some(e => e.type === 'invasion')) {
    s.flags.raided=true; const defense = power(s.troops,s)+s.buildings.walls*100;
    if (defense >= 240) { s.resources.gold += 300; s.reputation=Math.min(100,s.reputation+8); log(s,'Варварский набег отражён! +300 золота, +8 репутации.','good'); }
    else { s.resources.gold=Math.max(0,s.resources.gold-300); s.resources.food=Math.max(0,s.resources.food-250); log(s,'Варвары разграбили предместья: −300 золота, −250 провизии.','bad'); }
  }
  const raidPeriod = Math.floor(s.time / 100);
  if (!s.online && raidPeriod > (s.flags.npcRaid || 0)) {
    s.flags.npcRaid = raidPeriod;
    const enemy = s.places.find(p => p.kind === 'city' && p.owner !== (s.playerId || 'player') && s.relations[p.id]?.status === 'war');
    if (enemy) { const defense = power(s.troops,s)+s.buildings.walls*100; if (defense<200) {s.resources.gold=Math.max(0,s.resources.gold-150);log(s,`${enemy.name}: вражеский отряд похитил 150 золота. Усильте гарнизон.`,'bad');} else log(s,`Гарнизон отразил вылазку войск ${enemy.name}.`,'good'); }
  }
  if (s.resources.food === 0 && s.time >= (s.flags.famineAt||0)) { s.flags.famineAt=s.time+20; for (const k of Object.keys(s.troops)) s.troops[k]=Math.max(0,s.troops[k]-Math.ceil(s.troops[k]*.1)); log(s,'Голод: часть воинов покинула гарнизон. Постройте фермы или купите еду.','bad'); }
  if (s.ritual && s.ritual.end <= s.time) { s.beast={start:s.time,end:s.time+30,target:s.ritual.target}; s.ritual=null; log(s,'Древний зверь пробудился и идёт к вражеским стенам!','bad'); }
  if (!s.online && s.beast && s.beast.end <= s.time) { const p=s.places.find(p=>p.id===s.beast.target); if(p.owner!==(s.playerId || 'player')&&s.relations[p.id]?.status==='war'){p.defense=Math.max(20,Math.round(p.defense*.2));log(s,`Древний зверь сокрушил стены ${p.name}. Оборона снижена на 80%.`,'good');}else log(s,`Древний зверь ушёл в горы: ${p.name} больше не враг.`); s.beast=null; }
  checkVictory(s);
}


