import {STANCES,tickSkirmishes} from './skirmishes.mjs';
import {troopsAt,spirit,prepareBattle,advanceBattle,tickBeast} from './warfare.mjs';
import {randomBytes} from 'node:crypto';
import {MAPS,layoutPlaces,findRoute,routeLength} from './dist/navigation.js';
import {freshGame,act,tick,power,armySpeed,totalTroops,PLACES,BUILDINGS,UNITS,TECHS} from './dist/game.js';
const homes=['home','gold','red','silver'];
const colors=['#70cdb6','#e5bf70','#df897a','#9caded'];
const fail=message=>({ok:false,message});
const note=(s,text,kind='info')=>{s.logs.unshift({time:s.time,text,kind});s.logs=s.logs.slice(0,60);};
export class Room {
  constructor(host,name,bots=2,map='valley',solo=false){
    this.map=Object.hasOwn(MAPS,map)?map:'valley';
    this.code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();this.host=host;this.members=[{session:host,name,id:'r0',home:'home',bot:false,slot:0}];
    this.seed=randomBytes(4).readUInt32LE();this.title='Королевства · '+name;this.closed=[];this.botSlots=Array.from({length:bots},(_,i)=>i+1);this.botDifficulties=Array(bots).fill('medium');this.members[0].ready=true;this.solo=solo;this.speed=1;this.wallTime=0;this.vote=null;this.voteAfter=0;this.pauseUntil=null;this.botCount=bots;this.phase='lobby';this.time=0;this.offers=[];this.updated=Date.now();this.actors=[];this.winner=null;this.revision=0;
  }
  join(session,name){
    if(this.members.some(p=>p.session===session))return {ok:true};
    if(this.solo)return fail('Эта комната предназначена для одиночной игры');
    if(this.phase!=='lobby')return fail('Партия уже началась. Подключиться можно до старта.');
    if(this.members.length+this.botCount>=4-this.closed.length)return fail('В комнате уже четыре игрока');
    const slot=[0,1,2,3].find(i=>!this.closed.includes(i)&&!this.botSlots.includes(i)&&!this.members.some(m=>m.slot===i));this.members.push({slot,session,name,id:`r${slot}`,home:homes[slot],bot:false,ready:false});this.updated=Date.now();return {ok:true};
  }
  lobby(session,args={}){
    if(this.phase!=='lobby')return fail('Настройки меняются до начала матча');const member=this.members.find(m=>m.session===session);if(!member)return fail('Комната недоступна');
    if(args.action==='ready'){member.ready=!member.ready;return {ok:true};}
    if(session!==this.host)return fail('Настройки доступны создателю');
    if(args.action==='bots'){if(!Number.isInteger(args.count)||args.count<0||args.count>4-this.members.length-this.closed.length)return fail('Нет свободного слота');if(args.count<this.botCount){const index=Number.isInteger(args.index)&&args.index>=0&&args.index<this.botCount?args.index:this.botCount-1;this.botSlots.splice(index,1);this.botDifficulties.splice(index,1);while(this.botSlots.length>args.count){this.botSlots.pop();this.botDifficulties.pop();}}while(this.botSlots.length<args.count){const slot=[0,1,2,3].find(i=>!this.closed.includes(i)&&!this.botSlots.includes(i)&&!this.members.some(m=>m.slot===i));this.botSlots.push(slot);this.botDifficulties.push('medium');}this.botCount=args.count;}
    else if(args.action==='difficulty'){if(!Number.isInteger(args.index)||args.index<0||args.index>=this.botCount||!['easy','medium','hard'].includes(args.value))return fail('Неверный бот');this.botDifficulties[args.index]=args.value;}
    else if(args.action==='map'){if(!Object.hasOwn(MAPS,args.value))return fail('Неизвестная карта');this.map=args.value;}
    else if(args.action==='mode'){if(!['solo','online'].includes(args.value)||args.value==='solo'&&this.members.length>1)return fail('Одиночный режим доступен только одному человеку');this.solo=args.value==='solo';}
    else if(args.action==='seed')this.seed=randomBytes(4).readUInt32LE();
    else if(args.action==='slot'){if(!Number.isInteger(args.slot)||args.slot<0||this.members.some(m=>m.slot===args.slot)||this.botSlots.includes(args.slot)||args.slot>3)return fail('Этот слот занят');this.closed=this.closed.includes(args.slot)?this.closed.filter(i=>i!==args.slot):[...this.closed,args.slot];}
    else if(args.action==='kick'){const target=this.members.find(m=>m.id===args.id&&m.session!==this.host);if(!target)return fail('Игрок недоступен');this.members=this.members.filter(m=>m!==target);}
    else if(args.action==='title'){this.title=String(args.value||'Королевства').trim().slice(0,48);}
    else return fail('Неизвестная настройка');
    this.members.forEach(m=>m.ready=m.session===this.host);return {ok:true};
  }
  start(session){
    if(session!==this.host)return fail('Начать игру может создатель комнаты');
    if(this.phase!=='lobby')return fail('Партия уже началась');
    if(!this.solo&&this.members.some(m=>!m.ready))return fail('Дождитесь готовности всех игроков');
    const bots=Math.min(this.botCount,4-this.members.length);
    for(let i=0;i<bots;i++){const slot=this.botSlots[i];this.members.push({slot,id:`r${slot}`,name:['Торвальд','Элина','Рейнард'][i],home:homes[slot],bot:true,ready:true,difficulty:this.botDifficulties[i]||'medium'});}
    if(this.members.length<2)return fail('Нужен соперник: друг или хотя бы один бот');
    this.places=structuredClone(PLACES);this.places.push({id:'silver',name:'Серебряный утёс',kind:'city',owner:'silver',x:-27,z:-23,defense:320,ruler:'Северный князь',color:colors[3],detail:'Крепость на северном тракте'});
    this.places=layoutPlaces(this.places,this.map);
    const random=(()=>{let n=this.seed;return ()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};})();const starts=[...homes];for(let i=starts.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[starts[i],starts[j]]=[starts[j],starts[i]];}this.members.forEach((m,i)=>m.home=starts[i]);
    // Paired neutral resources keep both river banks equally useful.
    this.places.push({id:'east-camp',name:'Восточный стан',kind:'camp',owner:'wild-east',x:14,z:26,defense:85,color:'#c59268',ruler:'Вольные дружины'}, {id:'west-ruins',name:'Западные руины',kind:'ruins',owner:'wild-west',x:-30,z:-10,defense:180,color:'#adb5bb',ruler:'Древний хранитель'}, {id:'center',name:'Сердце долины',kind:'village',owner:'center',x:0,z:0,defense:140,color:'#d8bb74',ruler:'Хранитель перевала',strategic:true,detail:'Редкая руда: +80 золота/мин сверх обычного дохода'});
    for(const side of [-1,1]){this.places.push({id:'north-camp-'+side,name:side<0?'Северный стан':'Стан у перевала',kind:'camp',owner:'wild-north-'+side,x:side*14,z:-26,defense:85,color:'#c59268',ruler:'Вольные дружины'}, {id:'south-ruins-'+side,name:side<0?'Руины старой башни':'Руины у рощи',kind:'ruins',owner:'wild-south-'+side,x:side*30,z:10,defense:180,color:'#adb5bb',ruler:'Древний хранитель'}, {id:'north-village-'+side,name:side<0?'Тихая роща':'Ясные поля',kind:'village',owner:'village-north-'+side,x:side*14,z:-10,defense:100,color:'#d4bb81',ruler:'Свободные жители'});}
    for(const p of this.places){if(homes.includes(p.id))p.defense=220;if(p.kind==='village'&&!p.strategic)p.defense=100;}
    const shift=Math.floor(random()*3)-1;for(const p of this.places)if(!p.strategic){p.x+=Math.sign(p.x)*shift;p.z+=Math.sign(p.z)*shift;}
    this.actors=this.members.map((m,i)=>{
      const s=freshGame();Object.assign(s,{playerId:m.id,home:m.home,map:this.map,seed:this.seed,online:true,places:this.places,speed:1,eliminated:false,botAt:4+i*2});
      s.logs=[{time:0,text:`${m.name}: основана новая держава. Все правители действуют одновременно.`,kind:'good'}];
      const p=this.places.find(p=>p.id===m.home);Object.assign(p,{owner:m.id,kind:'city',ruler:m.name,color:colors[i]});
      return s;
    });
    for(const p of this.places){const a=this.actors.find(a=>a.home===p.id);p.buildings=a?a.buildings:Object.fromEntries(Object.keys(BUILDINGS).map(k=>[k,0]));if(!a){if(p.kind==='village')p.buildings.farm=1;if(p.kind==='city'){p.buildings.market=1;p.buildings.walls=1;}}p.morale=80;if(!a)p.garrison={spear:Math.max(1,Math.round(p.defense/4))};}this.phase='playing';this.refresh();return {ok:true,message:'Партия началась'};
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
    if(s.eliminated)return fail('Все поселения потеряны. Выберите наблюдение или новую игру.');
    if(!args||typeof args!=='object'||Array.isArray(args))return fail('Неверные параметры');
    if(['build','recruit','research'].includes(type)&&!Object.hasOwn(type==='build'?BUILDINGS:type==='recruit'?UNITS:TECHS,args.key))return fail('Неизвестное улучшение или войско');
    this.updated=Date.now();
    if(type==='stance'){if(!STANCES.includes(args.stance))return fail('Неизвестная стойка');if(typeof args.id==='string'&&args.id.startsWith('guard-')){const p=this.places.find(p=>p.id===args.id.slice(6)&&p.owner===s.playerId);if(!p)return fail('Выберите свой гарнизон');p.guardStance=args.stance;return {ok:true,message:'Стойка гарнизона изменена'};}const march=s.marches.find(m=>m.id===args.id);if(!march)return fail('Выберите свою армию');march.stance=args.stance;return {ok:true,message:'Стойка изменена'};}
    if(type==='speed'||type==='time-vote')return this.timeCommand(s,type,args);
    if(type==='accept'||type==='reject'){
      const o=this.offers.find(o=>o.id===args.id&&o.to===s.playerId&&o.end>this.time);if(!o)return fail('Предложение уже недоступно');
      this.offers=this.offers.filter(x=>x!==o);if(type==='reject')return {ok:true,message:'Предложение отклонено'};
      return this.treaty(this.actors.find(a=>a.playerId===o.from),s,o.action);
    }
    if(!['build','demolish','research','recruit','diplomacy','trade','march','reinforce','recall','summon','retreat'].includes(type))return fail('Неизвестное действие');
    this.refresh();
    if(type==='retreat'){const m=s.marches.find(m=>m.id===args.id&&m.battle&&!m.returning);if(!m)return fail('Эта армия не участвует в бою');m.casualties=m.combat.attackerStart-totalTroops(m.troops);m.outcome='retreat';m.battle=false;m.returning=true;m.start=this.time;m.end=this.time+m.duration;m.morale=Math.max(5,(m.morale??80)-10);note(s,'Армия отступает к месту отправления.','bad');return {ok:true,message:'Приказ об отступлении принят'};}
    if(type==='recall'){const p=this.places.find(p=>p.id===args.target);if(!p||p.owner!==s.playerId||p.id===s.home||!totalTroops(p.garrison||{}))return fail('В этом владении нет гарнизона');const route=findRoute(p,this.places.find(p=>p.id===s.home),this.places,this.map);if(!route)return fail('Нет безопасного пути');const duration=Math.max(12,routeLength(route)/armySpeed(p.garrison));s.marches.push({id:`${s.playerId}-${s.nextId++}`,owner:s.playerId,origin:p.id,target:s.home,kind:'recall',troops:p.garrison,route,start:this.time,end:this.time+duration,duration,returning:false});p.garrison={};this.refresh();return {ok:true,message:'Гарнизон возвращается в столицу'};}
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
    if(r.ok&&(type==='march'||type==='reinforce')){const m=s.marches.at(-1);m.id=`${s.playerId}-${m.id}`;m.origin=args.source||s.home;m.owner=s.playerId;m.route=route;m.kind=type;m.stance=STANCES.includes(args.stance)?args.stance:'defensive';m.duration=Math.max(12,routeLength(route)/armySpeed(m.troops));m.end=m.start+m.duration;const target=this.places.find(p=>p.id===m.target),defender=this.actors.find(a=>a.playerId===target.owner);if(defender&&defender!==s)note(defender,`${this.member(s).name}: ${totalTroops(m.troops)} воинов идут к ${target.name}. До прибытия ${Math.ceil(m.duration)} сек.`,'bad');r.message=`${type==='reinforce'?'Подкрепление':'Армия'} в пути: ${Math.ceil(m.duration)} сек.`;}
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
  timeCommand(s,type,args){
    const voters=this.members.filter(m=>!m.bot&&!this.actors.find(a=>a.playerId===m.id)?.eliminated).map(m=>m.id);
    if(type==='time-vote'){
      if(!this.vote||!voters.includes(s.playerId)||!Object.hasOwn(this.vote.votes,s.playerId)||typeof args.accept!=='boolean')return fail('Нет доступного голосования');
      if(!args.accept){this.vote=null;return {ok:true,message:'Смена времени отклонена'};}
      this.vote.votes[s.playerId]=true;this.finishVote();return {ok:true,message:'Ваш голос принят'};
    }
    const speed=Number(args.speed);if(![0,1,1.5,2,4,5].includes(speed))return fail('Недопустимая скорость');
    if(this.solo){this.speed=speed;return {ok:true,message:speed===0?'Пауза':'Скорость '+speed+'×'};}
    if(speed===1){this.speed=1;this.pauseUntil=null;this.vote=null;return {ok:true,message:'Возвращаем обычное время'};}
    if(this.vote||this.wallTime<this.voteAfter)return fail('Предлагать смену времени можно раз в две минуты на комнату');
    this.voteAfter=this.wallTime+120;this.vote={speed,end:this.wallTime+30,from:s.playerId,votes:Object.fromEntries(voters.map(id=>[id,id===s.playerId]))};this.finishVote();return {ok:true,message:'Нужно согласие всех действующих игроков'};
  }
  finishVote(){if(this.vote&&Object.values(this.vote.votes).every(Boolean)){this.speed=this.vote.speed;this.pauseUntil=this.speed===0?this.wallTime+60:null;this.vote=null;}}
  tick(dt){
    if(this.phase!=='playing')return;
    this.wallTime+=dt;if(this.vote&&this.vote.end<=this.wallTime)this.vote=null;
    if(this.pauseUntil!==null&&this.wallTime>=this.pauseUntil){this.speed=1;this.pauseUntil=null;}
    if(this.speed===0)return;
    dt*=this.speed;
    this.time+=dt;this.refresh();tickSkirmishes(this,dt);
    for(const s of this.actors){if(s.eliminated)continue;tick(s,dt);s.time=this.time;
      tickBeast(this,s,dt);
      for(const p of this.places.filter(p=>p.owner===s.playerId))if(!this.actors.some(a=>a.marches.some(m=>m.battle&&m.target===p.id))&&!this.actors.some(a=>a.beast?.battle&&a.beast.target===p.id))p.morale=Math.max(5,Math.min(100,(p.morale??80)+(s.resources.food>0?.15:-.5)*dt*(p.buildings?.runeforge?3:1)));
      for(const m of s.marches)if(m.battle)advanceBattle(this,s,m,this.places.find(p=>p.id===m.target));
    }
    this.refresh();
    for(const s of this.actors){if(s.eliminated)continue;
      const arrived=s.marches.filter(m=>m.end<=this.time);s.marches=s.marches.filter(m=>m.end>this.time);
      for(const m of arrived){if(s.eliminated)break;if(m.kind==='destroyed'){note(s,'Отряд уничтожен в полевом бою.','bad');continue;}
        if(m.returning||m.kind==='recall'){const destination=this.places.find(p=>p.id===(m.kind==='recall'?m.target:m.origin));const target=destination?.owner===s.playerId?destination:this.places.find(p=>p.id===s.home);const troops=troopsAt(this,target);for(const [k,n]of Object.entries(m.troops))troops[k]=(troops[k]||0)+n;note(s,`${totalTroops(m.troops)} воинов вернулись: ${target.name}.`);continue;}
        const p=this.places.find(p=>p.id===m.target);
        if(m.kind==='reinforce'&&p.owner===s.playerId){const guard=troopsAt(this,p);for(const [k,n]of Object.entries(m.troops))guard[k]=(guard[k]||0)+n;note(s,`${p.name}: прибыли ${totalTroops(m.troops)} защитников.`,'good');continue;}
        if((m.battle&&p.owner!==m.defenderOwner)||p.owner===s.playerId||(s.relations[p.id]&&s.relations[p.id].status!=='war')){s.marches.push({...m,battle:false,returning:true,start:this.time,end:this.time+m.duration});continue;}
        if(!m.battle){prepareBattle(this,s,m,p);s.marches.push(m);note(s,`Сражение за ${p.name} началось. Исход через 12 секунд.`,'bad');continue;}
        this.refresh();const force=m.combat.force,def=m.combat.defense,win=m.combat.win&&!m.routed&&totalTroops(m.troops)>0;
        const survivors={...m.troops};
        const previousOwner=this.actors.find(a=>a.playerId===p.owner),defender=previousOwner?.home===p.id?previousOwner:null;
        if(win){
          if(previousOwner)previousOwner.queue=previousOwner.queue.filter(q=>(q.settlement||previousOwner.home)!==p.id);
          if(defender){const replacement=this.places.filter(land=>land.owner===defender.playerId&&land!==p).sort((a,b)=>totalTroops(b.garrison||{})-totalTroops(a.garrison||{}))[0];
            if(replacement){const oldCapital=defender.home;for(const actor of this.actors){const rel=actor.relations[oldCapital];if(rel)actor.relations[replacement.id]={...rel,group:replacement.id};}defender.home=replacement.id;this.member(defender).home=replacement.id;defender.buildings=replacement.buildings;defender.troops=replacement.garrison||{};replacement.garrison={};defender.siegeDamage=0;defender.capitalMoved={from:p.name,to:replacement.name,time:this.time};note(defender,'Столица перенесена: '+replacement.name+'. Вы продолжаете правление.','bad');}
            else{if(this.solo){this.speed=1;this.pauseUntil=null;}defender.eliminated=true;defender.troops={};defender.marches=[];defender.queue=[];defender.ritual=null;defender.beast=null;defender.defeat={attacker:this.member(s).name,force,defense:def,place:p.name,time:this.time};note(defender,'Все поселения потеряны. Правление завершено. Мир продолжает жить.','bad');}}

          p.owner=s.playerId;p.occupationUntil=this.time+60;p.morale=55;p.garrison={};{for(const [k,n]of Object.entries(survivors)){const guard=Math.floor(n*.35);p.garrison[k]=guard;survivors[k]-=guard;}}p.defense=power(p.garrison,s);s.resources.gold+=p.kind==='city'?700:p.kind==='camp'?380:200;s.resources.wood+=90;s.reputation=Math.max(0,s.reputation+(p.kind==='village'?-15:p.kind==='camp'?8:-5));note(s,`Победа! ${p.name} присоединён к вашей державе.`,'good');
        }else{
          if(defender)note(defender,`Отражена атака ${this.member(s).name} у столицы.`,'good');
          note(s,`Поражение у ${p.name}. Выжившие отступают.`,'bad');
        }
        if(totalTroops(survivors))s.marches.push({...m,battle:false,outcome:win?'victory':'defeat',casualties:m.combat.attackerStart-totalTroops(m.troops),garrisonLeft:win?totalTroops(m.troops)-totalTroops(survivors):0,troops:survivors,returning:true,start:this.time,end:this.time+m.duration});
      }
      if(this.member(s).bot&&this.time>=s.botAt){s.botAt=this.time+({easy:20,medium:12,hard:7}[this.member(s).difficulty]||12);this.bot(s);}
    }
    this.offers=this.offers.filter(o=>o.end>this.time);this.refresh();
    const living=this.actors.filter(s=>!s.eliminated);
    const economic=living.find(s=>s.resources.gold>=6000&&[...new Set(Object.values(s.relations))].filter(r=>r.trade).length>=3);
    const political=living.find(s=>s.reputation>=80&&[...new Set(Object.values(s.relations))].filter(r=>r.status==='alliance').length>=4);
    const winner=living.length===1?living[0]:economic||political;
    if(winner&&!this.winner){this.winner={id:winner.playerId,name:this.member(winner).name,type:living.length===1?'Военная победа':economic?'Экономическая победа':'Политическая победа'};for(const s of this.actors)note(s,`${this.winner.type}: ${this.winner.name}`,'good');}
    this.revision++;
  }
  bot(s){
    const run=(type,args)=>this.commandFor(s,type,args).ok;
    // Growth, logistics and military decisions use exactly the same costs as human commands.
    const buildOrder=['farm','barracks','market','walls','lumber','quarry'];
    if(!s.queue.some(q=>q.type==='build'))for(const key of buildOrder)if(s.buildings[key]<(key==='barracks'?2:2)&&run('build',{key}))break;
    if(s.resources.food<150)run('trade',{resource:'food',side:'buy'});
    if(totalTroops(s.troops)<({easy:65,medium:90,hard:140}[this.member(s).difficulty]||90)&&!s.queue.some(q=>q.type==='recruit'))run('recruit',{key:s.buildings.barracks>=2?'knight':'spear',count:8});
    if(!s.marches.some(m=>!m.returning)&&totalTroops(s.troops)>25){
      const own=this.places.find(p=>p.id===s.home);
      const targets=this.places.filter(p=>{const realm=this.actors.find(a=>a.playerId===p.owner);return p.owner!==s.playerId&&(!realm||this.time>=300)&&p.defense<power(s.troops,s,p)*(realm?.4:.62)&&(!s.relations[p.id]||!['alliance','pact'].includes(s.relations[p.id].status));}).sort((a,b)=>Math.hypot(a.x-own.x,a.z-own.z)-Math.hypot(b.x-own.x,b.z-own.z));
      const p=targets[0];if(p){const enemy=this.actors.find(a=>a.playerId===p.owner);if(s.relations[p.id]?.status!=='war'&&s.relations[p.id])run('diplomacy',{target:p.id,action:'war'});run('march',{target:p.id,fraction:enemy?.5:.75});}
    }
    if(s.time>30&&s.resources.gold>500){const p=this.places.find(p=>p.kind==='village'&&p.owner!==s.playerId&&s.relations[p.id]?.status==='peace'&&!s.relations[p.id].trade);if(p)run('diplomacy',{target:p.id,action:'trade'});}
  }
  snapshot(session){
    const member=this.members.find(m=>m.session===session);if(!member)return null;
    const meta={botSlots:this.botSlots,title:this.title,seed:this.seed,closed:this.closed,botDifficulties:this.botDifficulties,code:this.code,phase:this.phase,host:this.host===session,botCount:this.botCount,map:this.map,players:this.members.map(m=>({slot:m.slot,id:m.id,name:m.name,home:m.home,bot:m.bot,ready:!!m.ready,difficulty:m.difficulty,eliminated:this.actors.find(a=>a.playerId===m.id)?.eliminated||false})),winner:this.winner,revision:this.revision,solo:this.solo,speed:this.speed,wallTime:this.wallTime,timeVote:this.vote};
    if(this.phase==='lobby'){meta.self=member.id;return meta;}
    const s=this.actor(session),state=structuredClone(s);state.time=this.time;state.speed=this.speed;state.solo=this.solo;
    state.realmId=s.playerId;state.realmNames=Object.fromEntries(this.members.map(m=>[m.id,m.name]));
    state.places=state.places.map(p=>({...p,owner:p.owner===s.playerId?'player':p.owner}));
    state.mapMarches=this.actors.flatMap(a=>a.marches.map(m=>({...m,owner:a.playerId})));state.playerId='player';
    state.settlements=Object.fromEntries(this.places.map(p=>[p.id,{owner:p.owner===s.playerId?'player':p.owner,buildings:{...p.buildings},troops:totalTroops(troopsAt(this,p)),composition:{...troopsAt(this,p)},morale:p.morale??80,occupationUntil:p.occupationUntil||0,queue:p.owner===s.playerId?s.queue.filter(q=>(q.settlement||s.home)===p.id):[]} ]));
    state.mapBeasts=this.actors.filter(a=>a.beast?.id).map(a=>({...a.beast}));
    state.receivedAt=0;state.matchWinner=this.winner;state.realmColors=Object.fromEntries(this.members.map((m,i)=>[m.id,colors[i]]));
    meta.state=state;meta.self=member.id;meta.offers=this.offers.filter(o=>o.to===member.id).map(o=>({...o,name:this.members.find(m=>m.id===o.from)?.name}));return meta;
  }
}
