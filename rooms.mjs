import {troopsAt,spirit,prepareBattle,advanceBattle,tickBeast} from './warfare.mjs';
import {randomBytes} from 'node:crypto';
import {MAPS,layoutPlaces,findRoute,routeLength} from './dist/navigation.js';
import {freshGame,act,tick,power,totalTroops,PLACES,BUILDINGS,UNITS,TECHS} from './dist/game.js';
const homes=['home','gold','red','silver'];
const colors=['#70cdb6','#e5bf70','#df897a','#9caded'];
const fail=message=>({ok:false,message});
const note=(s,text,kind='info')=>{s.logs.unshift({time:s.time,text,kind});s.logs=s.logs.slice(0,60);};
export class Room {
  constructor(host,name,bots=2,map='valley'){
    this.map=Object.hasOwn(MAPS,map)?map:'valley';
    this.code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();this.host=host;this.members=[{session:host,name,id:'r0',home:'home',bot:false}];
    this.botCount=bots;this.phase='lobby';this.time=0;this.offers=[];this.updated=Date.now();this.actors=[];this.winner=null;this.revision=0;
  }
  join(session,name){
    if(this.members.some(p=>p.session===session))return {ok:true};
    if(this.phase!=='lobby')return fail('Партия уже началась. Подключиться можно до старта.');
    if(this.members.length>=4)return fail('В комнате уже четыре игрока');
    const slot=this.members.length;this.members.push({session,name,id:`r${slot}`,home:homes[slot],bot:false});this.updated=Date.now();return {ok:true};
  }
  start(session){
    if(session!==this.host)return fail('Начать игру может создатель комнаты');
    if(this.phase!=='lobby')return fail('Партия уже началась');
    const bots=Math.min(this.botCount,4-this.members.length);
    for(let i=0;i<bots;i++){const slot=this.members.length;this.members.push({id:`r${slot}`,name:['Торвальд','Элина','Рейнард'][i],home:homes[slot],bot:true});}
    if(this.members.length<2)return fail('Нужен соперник: друг или хотя бы один бот');
    this.places=structuredClone(PLACES);this.places.push({id:'silver',name:'Серебряный утёс',kind:'city',owner:'silver',x:-27,z:-23,defense:320,ruler:'Северный князь',color:colors[3],detail:'Крепость на северном тракте'});
    this.places=layoutPlaces(this.places,this.map);
    this.actors=this.members.map((m,i)=>{
      const s=freshGame();Object.assign(s,{playerId:m.id,home:m.home,map:this.map,online:true,places:this.places,speed:1,eliminated:false,botAt:4+i*2});
      s.logs=[{time:0,text:`${m.name}: основана новая держава. Все правители действуют одновременно.`,kind:'good'}];
      const p=this.places.find(p=>p.id===m.home);Object.assign(p,{owner:m.id,kind:'city',ruler:m.name,color:colors[i]});
      return s;
    });
    for(const p of this.places){const a=this.actors.find(a=>a.home===p.id);p.buildings=a?a.buildings:Object.fromEntries(Object.keys(BUILDINGS).map(k=>[k,0]));p.morale=80;if(!a)p.garrison={spear:Math.max(1,Math.round(p.defense/4))};}this.phase='playing';this.refresh();return {ok:true,message:'Партия началась'};
  }
  actor(session){const m=this.members.find(m=>m.session===session);return this.actors.find(s=>s.playerId===m?.id);}
  refresh(){
    for(const p of this.places)if(!this.actors.some(a=>a.playerId===p.owner)&&p.garrison)p.defense=Math.max(0,Math.round(totalTroops(p.garrison)*4*spirit(p.morale)*(1-(p.wallDamage||0))));
    for(const p of this.places){const owner=this.actors.find(a=>a.playerId===p.owner);if(owner){p.ruler=this.member(owner).name;p.color=colors[this.members.findIndex(m=>m.id===p.owner)];if(p.id!==owner.home&&p.garrison)p.defense=Math.round((power(p.garrison,owner)*spirit(p.morale)+(p.buildings?.walls||0)*100)*(1-(p.wallDamage||0)));} }
    for(const s of this.actors){
      s.places=this.places;
      const previous=s.relations;s.relations={};
      for(const p of this.places){if(p.owner===s.playerId)continue;
        const owner=this.actors.find(a=>a.playerId===p.owner);const key=owner?owner.home:p.id;
        if(!owner&&!['city','village'].includes(p.kind)){delete s.relations[p.id];continue;}
        s.relations[key]??=(previous[key]?.group===key?previous[key]:{status:'peace',trade:false});s.relations[key].group=key;s.relations[p.id]=s.relations[key];
      }
      if(!s.eliminated){const p=this.places.find(p=>p.id===s.home);p.defense=Math.max(5,Math.round((power(s.troops,s)*spirit(p.morale)+s.buildings.walls*100)*(1-(p.wallDamage||0)))-(s.siegeDamage||0));}
    }
  }
  command(session,type,args={}){
    return this.commandFor(this.actor(session),type,args);
  }
  commandFor(s,type,args={}){
    if(!s||this.phase!=='playing')return fail('Начните партию');
    if(s.eliminated)return fail('Ваша столица потеряна. Выберите наблюдение или новую игру.');
    if(this.winner)return fail('Партия завершена. Начните новую игру.');
    if(!args||typeof args!=='object'||Array.isArray(args))return fail('Неверные параметры');
    if(['build','recruit','research'].includes(type)&&!Object.hasOwn(type==='build'?BUILDINGS:type==='recruit'?UNITS:TECHS,args.key))return fail('Неизвестное улучшение или войско');
    this.updated=Date.now();
    if(type==='accept'||type==='reject'){
      const o=this.offers.find(o=>o.id===args.id&&o.to===s.playerId&&o.end>this.time);if(!o)return fail('Предложение уже недоступно');
      this.offers=this.offers.filter(x=>x!==o);if(type==='reject')return {ok:true,message:'Предложение отклонено'};
      return this.treaty(this.actors.find(a=>a.playerId===o.from),s,o.action);
    }
    if(!['build','research','recruit','diplomacy','trade','march','reinforce','recall','summon','retreat'].includes(type))return fail('Неизвестное действие');
    this.refresh();
    if(type==='retreat'){const m=s.marches.find(m=>m.id===args.id&&m.battle&&!m.returning);if(!m)return fail('Эта армия не участвует в бою');m.casualties=m.combat.attackerStart-totalTroops(m.troops);m.outcome='retreat';m.battle=false;m.returning=true;m.start=this.time;m.end=this.time+m.duration;m.morale=Math.max(5,(m.morale??80)-10);note(s,'Армия отступает к месту отправления.','bad');return {ok:true,message:'Приказ об отступлении принят'};}
    if(type==='recall'){const p=this.places.find(p=>p.id===args.target);if(!p||p.owner!==s.playerId||p.id===s.home||!totalTroops(p.garrison||{}))return fail('В этом владении нет гарнизона');const route=findRoute(p,this.places.find(p=>p.id===s.home),this.places,this.map);if(!route)return fail('Нет безопасного пути');const duration=Math.max(30,routeLength(route)*1.4);s.marches.push({id:`${s.playerId}-${s.nextId++}`,owner:s.playerId,origin:p.id,target:s.home,kind:'recall',troops:p.garrison,route,start:this.time,end:this.time+duration,duration,returning:false});p.garrison={};this.refresh();return {ok:true,message:'Гарнизон возвращается в столицу'};}
    if(type==='diplomacy'){
      const p=this.places.find(p=>p.id===args.target), other=this.actors.find(a=>a.playerId===p?.owner);
      if(other&&other!==s){
        if(p.owner===s.playerId)return fail('Это ваши земли. Переговоры с собой недоступны');
        const a=args.action;if(a==='war'){const r=s.relations[other.home];if(r.status==='war')return fail('Война уже объявлена');s.reputation=Math.max(0,s.reputation-(['pact','alliance'].includes(r.status)?25:8));this.setRelation(s,other,'war',false);this.offers=this.offers.filter(o=>![s.playerId,other.playerId].includes(o.from)||![s.playerId,other.playerId].includes(o.to));note(s,`Объявлена война: ${p.name}`,'bad');note(other,`${this.member(s).name} объявляет вам войну!`,'bad');return {ok:true,message:'Война объявлена'};}
        if(!['peace','pact','alliance','trade','aid'].includes(a))return fail('Неизвестный договор');
        if(this.offers.some(o=>o.from===s.playerId&&o.to===other.playerId&&o.action===a))return fail('Предложение уже отправлено');
        if(other.bot)return this.treaty(s,other,a);
        this.offers.push({id:randomBytes(6).toString('hex'),from:s.playerId,to:other.playerId,action:a,end:this.time+60});
        note(other,`${this.member(s).name} предлагает: ${a==='trade'?'торговлю':a==='alliance'?'союз':a==='pact'?'пакт':a==='aid'?'военную помощь':'мир'}.`);
        return {ok:true,message:'Предложение отправлено. Сосед должен его принять.'};
      }
    }
    let route;
    if(type==='march'||type==='reinforce'){const target=this.places.find(p=>p.id===args.target);if(!target)return fail('Неизвестная цель');const origin=this.places.find(p=>p.id===(args.source||s.home));if(!origin||origin.owner!==s.playerId)return fail('Источник армии должен принадлежать вам');route=findRoute(origin,target,this.places,this.map);if(!route)return fail('Нет безопасного пути к поселению');}
    const r=act(s,type,args);
    if(r.ok&&(type==='march'||type==='reinforce')){const m=s.marches.at(-1);m.id=`${s.playerId}-${m.id}`;m.origin=args.source||s.home;m.owner=s.playerId;m.route=route;m.kind=type;m.duration=Math.max(30,routeLength(route)*1.4);m.end=m.start+m.duration;const target=this.places.find(p=>p.id===m.target),defender=this.actors.find(a=>a.playerId===target.owner);if(defender&&defender!==s)note(defender,`${this.member(s).name}: ${totalTroops(m.troops)} воинов идут к ${target.name}. До прибытия ${Math.ceil(m.duration)} сек.`,'bad');r.message=`${type==='reinforce'?'Подкрепление':'Армия'} в пути: ${Math.ceil(m.duration)} сек.`;}
    this.refresh();this.revision++;return r;
  }
  announce(s,text,kind){note(s,text,kind);}
  member(s){return this.members.find(m=>m.id===s.playerId);}
  setRelation(a,b,status,trade){a.relations[b.home]={status,trade,group:b.home};b.relations[a.home]={status,trade,group:a.home};this.refresh();}
  treaty(a,b,action){
    if(!a||!b||a===b||a.eliminated||b.eliminated)return fail('Правитель больше не доступен');
    const rel=a.relations[b.home];const price={peace:160,pact:110,alliance:180,trade:130,aid:120}[action];
    if(!rel||!Number.isFinite(price))return fail('Договор с этим правителем недоступен');
    if(a.resources.gold<price)return fail('У отправителя недостаточно золота');
    if(action==='peace'&&rel.status!=='war')return fail('Уже действует мир');
    if(action!=='peace'&&rel.status==='war')return fail('Сначала заключите мир');
    if(action==='trade'&&rel.trade)return fail('Торговый путь уже открыт');
    if(['alliance','pact'].includes(action)&&(rel.status===action||(action==='pact'&&rel.status==='alliance')))return fail('Договор уже действует');
    if(action==='alliance'&&a.reputation<45)return fail('Нужна репутация 45');
    if(action==='aid'){
      if(rel.status!=='alliance')return fail('Помощь доступна союзникам');
      if((rel.aidAt||0)>this.time||!(b.troops.spear>=15))return fail('У союзника нет 15 свободных копейщиков или помощь ещё недоступна');
      b.troops.spear-=15;a.troops.spear=(a.troops.spear||0)+15;rel.aidAt=this.time+60;
    }else this.setRelation(a,b,['peace','pact','alliance'].includes(action)?action:rel.status,action==='trade'||(action!=='peace'&&rel.trade));
    a.resources.gold-=price;a.reputation=Math.min(100,a.reputation+(action==='alliance'?8:action==='trade'?3:0));
    note(a,`Договор с ${this.member(b).name}: ${action}.`,'good');note(b,`Принят договор с ${this.member(a).name}: ${action}.`,'good');return {ok:true,message:'Договор принят обеими державами'};
  }
  tick(dt){
    if(this.phase!=='playing'||this.winner)return;
    this.time+=dt;this.refresh();
    for(const s of this.actors){if(s.eliminated)continue;tick(s,dt);s.time=this.time;
      tickBeast(this,s,dt);
      for(const p of this.places.filter(p=>p.owner===s.playerId))if(!this.actors.some(a=>a.marches.some(m=>m.battle&&m.target===p.id))&&!this.actors.some(a=>a.beast?.battle&&a.beast.target===p.id))p.morale=Math.max(5,Math.min(100,(p.morale??80)+(s.resources.food>0?.15:-.5)*dt));
      for(const m of s.marches)if(m.battle)advanceBattle(this,s,m,this.places.find(p=>p.id===m.target));
    }
    this.refresh();
    for(const s of this.actors){if(s.eliminated)continue;
      const arrived=s.marches.filter(m=>m.end<=this.time);s.marches=s.marches.filter(m=>m.end>this.time);
      for(const m of arrived){if(s.eliminated)break;
        if(m.returning||m.kind==='recall'){const destination=this.places.find(p=>p.id===(m.kind==='recall'?m.target:m.origin));const target=destination?.owner===s.playerId?destination:this.places.find(p=>p.id===s.home);const troops=troopsAt(this,target);for(const [k,n]of Object.entries(m.troops))troops[k]=(troops[k]||0)+n;note(s,`${totalTroops(m.troops)} воинов вернулись: ${target.name}.`);continue;}
        const p=this.places.find(p=>p.id===m.target);
        if(m.kind==='reinforce'&&p.owner===s.playerId){const guard=troopsAt(this,p);for(const [k,n]of Object.entries(m.troops))guard[k]=(guard[k]||0)+n;note(s,`${p.name}: прибыли ${totalTroops(m.troops)} защитников.`,'good');continue;}
        if(p.owner===s.playerId||(s.relations[p.id]&&s.relations[p.id].status!=='war')){s.marches.push({...m,returning:true,start:this.time,end:this.time+m.duration});continue;}
        if(!m.battle){prepareBattle(this,s,m,p);s.marches.push(m);note(s,`Сражение за ${p.name} началось. Исход через 12 секунд.`,'bad');continue;}
        this.refresh();const force=m.combat.force,def=m.combat.defense,win=m.combat.win&&!m.routed&&totalTroops(m.troops)>0;
        const survivors={...m.troops};
        const defender=this.actors.find(a=>a.playerId===p.owner&&a.home===p.id);
        if(win){
          if(defender){defender.eliminated=true;defender.troops={};defender.marches=[];defender.queue=[];defender.ritual=null;defender.beast=null;defender.defeat={attacker:this.member(s).name,force,defense:def,place:p.name,time:this.time};note(defender,`${this.member(s).name} захватил вашу столицу: атака ${force}, ваша оборона ${def}. Правление завершено.`,'bad');for(const land of this.places)if(land.owner===defender.playerId)land.owner=s.playerId;}
          p.owner=s.playerId;p.morale=55;p.garrison={};{for(const [k,n]of Object.entries(survivors)){const guard=Math.floor(n*.35);p.garrison[k]=guard;survivors[k]-=guard;}}p.defense=power(p.garrison,s);s.resources.gold+=p.kind==='city'?700:p.kind==='camp'?380:200;s.resources.wood+=90;s.reputation=Math.max(0,s.reputation+(p.kind==='village'?-15:p.kind==='camp'?8:-5));note(s,`Победа! ${p.name} присоединён к вашей державе.`,'good');
        }else{
          if(defender)note(defender,`Отражена атака ${this.member(s).name} у столицы.`,'good');
          note(s,`Поражение у ${p.name}. Выжившие отступают.`,'bad');
        }
        if(totalTroops(survivors))s.marches.push({...m,battle:false,outcome:win?'victory':'defeat',casualties:m.combat.attackerStart-totalTroops(m.troops),garrisonLeft:win?totalTroops(m.troops)-totalTroops(survivors):0,troops:survivors,returning:true,start:this.time,end:this.time+m.duration});
      }
      if(this.member(s).bot&&this.time>=s.botAt){s.botAt=this.time+12;this.bot(s);}
    }
    this.offers=this.offers.filter(o=>o.end>this.time);this.refresh();
    const living=this.actors.filter(s=>!s.eliminated);
    const economic=living.find(s=>s.resources.gold>=6000&&[...new Set(Object.values(s.relations))].filter(r=>r.trade).length>=3);
    const political=living.find(s=>s.reputation>=80&&[...new Set(Object.values(s.relations))].filter(r=>r.status==='alliance').length>=4);
    const winner=living.length===1?living[0]:economic||political;
    if(winner){this.winner={id:winner.playerId,name:this.member(winner).name,type:living.length===1?'Военная победа':economic?'Экономическая победа':'Политическая победа'};for(const s of this.actors)note(s,`${this.winner.type}: ${this.winner.name}`,'good');}
    this.revision++;
  }
  bot(s){
    const run=(type,args)=>this.commandFor(s,type,args).ok;
    // Growth, logistics and military decisions use exactly the same costs as human commands.
    const buildOrder=['farm','barracks','market','walls','lumber','quarry'];
    if(!s.queue.some(q=>q.type==='build'))for(const key of buildOrder)if(s.buildings[key]<(key==='barracks'?2:2)&&run('build',{key}))break;
    if(s.resources.food<150)run('trade',{resource:'food',side:'buy'});
    if(totalTroops(s.troops)<90&&!s.queue.some(q=>q.type==='recruit'))run('recruit',{key:s.buildings.barracks>=2?'knight':'spear',count:8});
    if(!s.marches.some(m=>!m.returning)&&totalTroops(s.troops)>25){
      const own=this.places.find(p=>p.id===s.home);
      const targets=this.places.filter(p=>{const realm=this.actors.find(a=>a.playerId===p.owner);return p.owner!==s.playerId&&(!realm||this.time>=300)&&p.defense<power(s.troops,s,p)*(realm?.4:.62)&&(!s.relations[p.id]||!['alliance','pact'].includes(s.relations[p.id].status));}).sort((a,b)=>Math.hypot(a.x-own.x,a.z-own.z)-Math.hypot(b.x-own.x,b.z-own.z));
      const p=targets[0];if(p){const enemy=this.actors.find(a=>a.playerId===p.owner);if(s.relations[p.id]?.status!=='war'&&s.relations[p.id])run('diplomacy',{target:p.id,action:'war'});run('march',{target:p.id,fraction:enemy?.5:.75});}
    }
    if(s.time>30&&s.resources.gold>500){const p=this.places.find(p=>p.kind==='village'&&p.owner!==s.playerId&&s.relations[p.id]?.status==='peace'&&!s.relations[p.id].trade);if(p)run('diplomacy',{target:p.id,action:'trade'});}
  }
  snapshot(session){
    const member=this.members.find(m=>m.session===session);if(!member)return null;
    const meta={code:this.code,phase:this.phase,host:this.host===session,botCount:this.botCount,map:this.map,players:this.members.map(m=>({id:m.id,name:m.name,home:m.home,bot:m.bot,eliminated:this.actors.find(a=>a.playerId===m.id)?.eliminated||false})),winner:this.winner,revision:this.revision};
    if(this.phase==='lobby')return meta;
    const s=this.actor(session),state=structuredClone(s);state.time=this.time;
    state.realmId=s.playerId;state.realmNames=Object.fromEntries(this.members.map(m=>[m.id,m.name]));
    state.places=state.places.map(p=>({...p,owner:p.owner===s.playerId?'player':p.owner}));
    state.mapMarches=this.actors.flatMap(a=>a.marches.map(m=>({...m,owner:a.playerId})));state.playerId='player';
    state.settlements=Object.fromEntries(this.places.map(p=>[p.id,{owner:p.owner===s.playerId?'player':p.owner,buildings:{...p.buildings},troops:totalTroops(troopsAt(this,p)),composition:{...troopsAt(this,p)},morale:p.morale??80,queue:p.owner===s.playerId?s.queue.filter(q=>(q.settlement||s.home)===p.id):[]} ]));
    state.mapBeasts=this.actors.filter(a=>a.beast?.id).map(a=>({...a.beast}));
    state.receivedAt=0;state.matchWinner=this.winner;state.realmColors=Object.fromEntries(this.members.map((m,i)=>[m.id,colors[i]]));
    meta.state=state;meta.self=member.id;meta.offers=this.offers.filter(o=>o.to===member.id).map(o=>({...o,name:this.members.find(m=>m.id===o.from)?.name}));return meta;
  }
}
