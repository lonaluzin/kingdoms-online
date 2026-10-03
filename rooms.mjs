import {randomBytes} from 'node:crypto';
import {freshGame,act,tick,power,totalTroops,PLACES,BUILDINGS,UNITS,TECHS} from './dist/game.js';
const homes=['home','gold','red','silver'];
const colors=['#70cdb6','#e5bf70','#df897a','#9caded'];
const fail=message=>({ok:false,message});
const note=(s,text,kind='info')=>{s.logs.unshift({time:s.time,text,kind});s.logs=s.logs.slice(0,60);};
export class Room {
  constructor(host,name,bots=2){
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
    this.actors=this.members.map((m,i)=>{
      const s=freshGame();Object.assign(s,{playerId:m.id,home:m.home,online:true,places:this.places,speed:1,eliminated:false,botAt:4+i*2});
      s.logs=[{time:0,text:`${m.name}: основана новая держава. Все правители действуют одновременно.`,kind:'good'}];
      const p=this.places.find(p=>p.id===m.home);Object.assign(p,{owner:m.id,kind:'city',ruler:m.name,color:colors[i]});
      return s;
    });
    this.phase='playing';this.refresh();return {ok:true,message:'Партия началась'};
  }
  actor(session){const m=this.members.find(m=>m.session===session);return this.actors.find(s=>s.playerId===m?.id);}
  refresh(){
    for(const s of this.actors){
      s.places=this.places;
      for(const p of this.places){if(p.owner===s.playerId){delete s.relations[p.id];continue;}
        const owner=this.actors.find(a=>a.playerId===p.owner);const key=owner?owner.home:p.id;
        if(!owner&&!['city','village'].includes(p.kind)){delete s.relations[p.id];continue;}
        s.relations[key]??={status:'peace',trade:false};s.relations[key].group=key;s.relations[p.id]=s.relations[key];
      }
      if(!s.eliminated){const p=this.places.find(p=>p.id===s.home);p.defense=Math.max(20,power(s.troops,s)+s.buildings.walls*100-(s.siegeDamage||0));}
    }
  }
  command(session,type,args={}){
    const s=this.actor(session);if(!s||this.phase!=='playing')return fail('Начните партию');
    if(s.eliminated||this.winner)return fail('Правление завершено');
    if(!args||typeof args!=='object'||Array.isArray(args))return fail('Неверные параметры');
    if(['build','recruit','research'].includes(type)&&!Object.hasOwn(type==='build'?BUILDINGS:type==='recruit'?UNITS:TECHS,args.key))return fail('Неизвестное улучшение или войско');
    this.updated=Date.now();
    if(type==='accept'||type==='reject'){
      const o=this.offers.find(o=>o.id===args.id&&o.to===s.playerId&&o.end>this.time);if(!o)return fail('Предложение уже недоступно');
      this.offers=this.offers.filter(x=>x!==o);if(type==='reject')return {ok:true,message:'Предложение отклонено'};
      return this.treaty(this.actors.find(a=>a.playerId===o.from),s,o.action);
    }
    if(!['build','research','recruit','diplomacy','trade','march','summon'].includes(type))return fail('Неизвестное действие');
    this.refresh();
    if(type==='diplomacy'){
      const p=this.places.find(p=>p.id===args.target), other=this.actors.find(a=>a.playerId===p?.owner);
      if(other&&other!==s){
        const a=args.action;if(a==='war'){const r=s.relations[other.home];if(r.status==='war')return fail('Война уже объявлена');s.reputation=Math.max(0,s.reputation-(['pact','alliance'].includes(r.status)?25:8));this.setRelation(s,other,'war',false);this.offers=this.offers.filter(o=>![s.playerId,other.playerId].includes(o.from)||![s.playerId,other.playerId].includes(o.to));note(s,`Объявлена война: ${p.name}`,'bad');note(other,`${this.member(s).name} объявляет вам войну!`,'bad');return {ok:true,message:'Война объявлена'};}
        if(!['peace','pact','alliance','trade','aid'].includes(a))return fail('Неизвестный договор');
        if(this.offers.some(o=>o.from===s.playerId&&o.to===other.playerId&&o.action===a))return fail('Предложение уже отправлено');
        if(other.bot)return this.treaty(s,other,a);
        this.offers.push({id:randomBytes(6).toString('hex'),from:s.playerId,to:other.playerId,action:a,end:this.time+60});
        note(other,`${this.member(s).name} предлагает: ${a==='trade'?'торговлю':a==='alliance'?'союз':a==='pact'?'пакт':a==='aid'?'военную помощь':'мир'}.`);
        return {ok:true,message:'Предложение отправлено. Сосед должен его принять.'};
      }
    }
    const r=act(s,type,args);
    if(r.ok&&type==='march'){const m=s.marches.at(-1);m.id=`${s.playerId}-${m.id}`;m.origin=s.home;m.owner=s.playerId;}
    this.refresh();this.revision++;return r;
  }
  member(s){return this.members.find(m=>m.id===s.playerId);}
  setRelation(a,b,status,trade){a.relations[b.home]={status,trade};b.relations[a.home]={status,trade};this.refresh();}
  treaty(a,b,action){
    if(!a||!b||a.eliminated||b.eliminated)return fail('Правитель больше не доступен');
    const rel=a.relations[b.home];const price={peace:160,pact:110,alliance:180,trade:130,aid:120}[action];
    if(a.resources.gold<price)return fail('У отправителя недостаточно золота');
    if(action==='peace'&&rel.status!=='war')return fail('Уже действует мир');
    if(action!=='peace'&&rel.status==='war')return fail('Сначала заключите мир');
    if(action==='trade'&&rel.trade)return fail('Торговый путь уже открыт');
    if(['alliance','pact'].includes(action)&&rel.status===action)return fail('Договор уже действует');
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
      if(s.beast&&s.beast.end<=this.time){const p=this.places.find(p=>p.id===s.beast.target);if(p&&p.owner!==s.playerId&&s.relations[p.id]?.status==='war'){const enemy=this.actors.find(a=>a.playerId===p.owner&&a.home===p.id);if(enemy)enemy.siegeDamage=(enemy.siegeDamage||0)+p.defense*.8;else p.defense=Math.max(20,Math.round(p.defense*.2));note(s,`Древний зверь разрушил стены: ${p.name}`,'good');}s.beast=null;}
    }
    this.refresh();
    for(const s of this.actors){if(s.eliminated)continue;
      const arrived=s.marches.filter(m=>m.end<=this.time);s.marches=s.marches.filter(m=>m.end>this.time);
      for(const m of arrived){if(s.eliminated)break;
        if(m.returning){for(const [k,n]of Object.entries(m.troops))s.troops[k]=(s.troops[k]||0)+n;note(s,`${totalTroops(m.troops)} воинов вернулись в столицу.`);continue;}
        const p=this.places.find(p=>p.id===m.target);
        if(p.owner===s.playerId||(s.relations[p.id]&&s.relations[p.id].status!=='war')){s.marches.push({...m,returning:true,start:this.time,end:this.time+m.duration});continue;}
        this.refresh();const force=power(m.troops,s,p),def=p.defense,win=force>=def,ratio=force/Math.max(1,def);
        const lost=win?Math.min(.48,.3/Math.max(.3,ratio)):Math.min(.9,.48/Math.max(.3,ratio));
        const survivors=Object.fromEntries(Object.entries(m.troops).map(([k,n])=>[k,Math.max(0,n-Math.ceil(n*lost))]));
        const defender=this.actors.find(a=>a.playerId===p.owner&&a.home===p.id);
        if(win){
          if(defender){defender.eliminated=true;defender.troops={};defender.marches=[];defender.queue=[];defender.ritual=null;defender.beast=null;note(defender,'Ваша столица захвачена. Вы можете наблюдать за партией.','bad');for(const land of this.places)if(land.owner===defender.playerId)land.owner=s.playerId;}
          p.owner=s.playerId;p.defense=Math.round(force*.3);s.resources.gold+=p.kind==='city'?700:p.kind==='camp'?380:200;s.resources.wood+=90;s.reputation=Math.max(0,s.reputation+(p.kind==='village'?-15:p.kind==='camp'?8:-5));note(s,`Победа! ${p.name} присоединён к вашей державе.`,'good');
        }else{
          if(defender){const loss=Math.min(.7,force*.35/Math.max(1,def));for(const k of Object.keys(defender.troops))defender.troops[k]=Math.max(0,defender.troops[k]-Math.ceil(defender.troops[k]*loss));note(defender,`Отражена атака ${this.member(s).name} у столицы.`,'good');}
          else p.defense=Math.max(25,Math.round(def-force*.35));note(s,`Поражение у ${p.name}. Выжившие отступают.`,'bad');
        }
        if(totalTroops(survivors))s.marches.push({...m,troops:survivors,returning:true,start:this.time,end:this.time+m.duration});
      }
      if(this.member(s).bot&&this.time>=s.botAt){s.botAt=this.time+7;this.bot(s);}
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
    const run=(type,args)=>{const r=act(s,type,args);if(r.ok&&type==='march'){const m=s.marches.at(-1);Object.assign(m,{id:`${s.playerId}-${m.id}`,owner:s.playerId,origin:s.home});}return r.ok;};
    // Growth, logistics and military decisions use exactly the same costs as human commands.
    const buildOrder=['farm','barracks','market','walls','lumber','quarry'];
    if(!s.queue.some(q=>q.type==='build'))for(const key of buildOrder)if(s.buildings[key]<(key==='barracks'?2:2)&&run('build',{key}))break;
    if(s.resources.food<150)run('trade',{resource:'food',side:'buy'});
    if(totalTroops(s.troops)<90&&!s.queue.some(q=>q.type==='recruit'))run('recruit',{key:s.buildings.barracks>=2?'knight':'spear',count:8});
    if(!s.marches.some(m=>!m.returning)&&totalTroops(s.troops)>25){
      const own=this.places.find(p=>p.id===s.home);
      const targets=this.places.filter(p=>{const realm=this.actors.find(a=>a.playerId===p.owner);return p.owner!==s.playerId&&(!realm||this.time>=120)&&p.defense<power(s.troops,s,p)*(realm?.4:.62)&&(!s.relations[p.id]||!['alliance','pact'].includes(s.relations[p.id].status));}).sort((a,b)=>Math.hypot(a.x-own.x,a.z-own.z)-Math.hypot(b.x-own.x,b.z-own.z));
      const p=targets[0];if(p){const enemy=this.actors.find(a=>a.playerId===p.owner);if(enemy)this.setRelation(s,enemy,'war',false);else if(s.relations[p.id])run('diplomacy',{target:p.id,action:'war'});run('march',{target:p.id,fraction:enemy?.5:.75});}
    }
    if(s.time>30&&s.resources.gold>500){const p=this.places.find(p=>p.kind==='village'&&p.owner!==s.playerId&&s.relations[p.id]?.status==='peace'&&!s.relations[p.id].trade);if(p)run('diplomacy',{target:p.id,action:'trade'});}
  }
  snapshot(session){
    const member=this.members.find(m=>m.session===session);if(!member)return null;
    const meta={code:this.code,phase:this.phase,host:this.host===session,botCount:this.botCount,players:this.members.map(m=>({id:m.id,name:m.name,home:m.home,bot:m.bot,eliminated:this.actors.find(a=>a.playerId===m.id)?.eliminated||false})),winner:this.winner,revision:this.revision};
    if(this.phase==='lobby')return meta;
    const s=this.actor(session),state=structuredClone(s);
    state.places=state.places.map(p=>({...p,owner:p.owner===s.playerId?'player':p.owner}));
    state.mapMarches=this.actors.flatMap(a=>a.marches.map(m=>({...m,owner:a.playerId})));state.playerId='player';
    state.matchWinner=this.winner;state.realmColors=Object.fromEntries(this.members.map((m,i)=>[m.id,colors[i]]));
    meta.state=state;meta.self=member.id;meta.offers=this.offers.filter(o=>o.to===member.id).map(o=>({...o,name:this.members.find(m=>m.id===o.from)?.name}));return meta;
  }
}
