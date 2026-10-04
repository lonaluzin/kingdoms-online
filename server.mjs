import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {Room} from './rooms.mjs';
const root=path.resolve(fileURLToPath(new URL('./dist/',import.meta.url)));
export function createServer(){
  const sessions=new Map(),rooms=new Map();
  const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  const server=http.createServer(async(req,res)=>{try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/health'){json(res,200,{ok:true,version:'0.7.0'});return;}
    if(url.pathname.startsWith('/api/')){
      let token=/kingdom_session=([a-f0-9]{48})/.exec(req.headers.cookie||'')?.[1];let session=sessions.get(token);
      if(!session){if(sessions.size>=1000){json(res,503,{ok:false,message:'Сервер заполнен'});return;}token=randomBytes(24).toString('hex');session={id:token,room:null,last:Date.now(),count:0,window:Date.now(),seen:new Map()};sessions.set(token,session);res.setHeader('Set-Cookie',`kingdom_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${req.headers['x-forwarded-proto']==='https'?'; Secure':''}`);}
      session.last=Date.now();if(session.last-session.window>1000){session.window=session.last;session.count=0;}if(++session.count>15){json(res,429,{ok:false,message:'Слишком много запросов'});return;}
      if(session.room&&!rooms.get(session.room)?.members.some(m=>m.session===token))session.room=null;
      if(req.method==='GET'&&url.pathname==='/api/state'){json(res,200,{ok:true,room:rooms.get(session.room)?.snapshot(token)||null});return;}
      if(req.method!=='POST'||req.headers['content-type']?.split(';')[0]!=='application/json'){json(res,405,{ok:false,message:'Нужен POST JSON'});return;}
      if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){json(res,403,{ok:false,message:'Чужой источник запроса'});return;}
      let body='';for await(const chunk of req){body+=chunk;if(body.length>4096){json(res,413,{ok:false,message:'Запрос слишком большой'});return;}}
      let data;try{data=JSON.parse(body);}catch{json(res,400,{ok:false,message:'Неверный JSON'});return;}
      if(!data||typeof data!=='object'||Array.isArray(data)){json(res,400,{ok:false,message:'Неверный запрос'});return;}
      const current=rooms.get(session.room);
      const name=String(data.name||'Гость').replace(/[\u0000-\u001f]/g,'').trim().slice(0,24)||'Гость';let result;
      if(url.pathname==='/api/create'){
        if(current){json(res,409,{ok:false,message:'Сначала покиньте текущую комнату'});return;}
        if(rooms.size>=30){json(res,503,{ok:false,message:'Все комнаты заняты'});return;}
        const bots=Number(data.bots);if(!Number.isInteger(bots)||bots<0||bots>3){json(res,400,{ok:false,message:'Выберите 0–3 бота'});return;}
        if(data.map!==undefined&&!['valley','forest','hills'].includes(data.map)){json(res,400,{ok:false,message:'Неизвестная карта'});return;}
        const room=new Room(token,name,bots,data.map,data.solo===true);while(rooms.has(room.code))room.code=randomBytes(3).toString('hex').toUpperCase();rooms.set(room.code,room);session.room=room.code;result={ok:true};
        
      }else if(url.pathname==='/api/join'){
        if(current){json(res,409,{ok:false,message:'Сначала покиньте текущую комнату'});return;}
        const code=String(data.code||'').toUpperCase().trim();const room=rooms.get(code);result=room?room.join(token,name):{ok:false,message:'Комната не найдена'};if(result.ok)session.room=code;
      }else if(url.pathname==='/api/lobby')result=current?.lobby(token,data)||{ok:false,message:'Комната не найдена'};
      else if(url.pathname==='/api/start')result=current?.start(token)||{ok:false,message:'Комната не найдена'};
      else if(url.pathname==='/api/leave'){
        if(current?.phase==='lobby'){current.members=current.members.filter(m=>m.session!==token);if(!current.members.length)rooms.delete(current.code);else{current.host=current.members[0].session;current.members.forEach(m=>m.ready=m.session===current.host);}}
        session.room=null;result={ok:true};
      }else if(url.pathname==='/api/command'){
        if(typeof data.id!=='string'||data.id.length>80){json(res,400,{ok:false,message:'Нужен идентификатор команды'});return;}
        if(session.seen.has(data.id)){json(res,200,session.seen.get(data.id));return;}
        result=current?.command(token,data.type,data.args)||{ok:false,message:'Комната не найдена'};
        session.seen.set(data.id,result);if(session.seen.size>100)session.seen.delete(session.seen.keys().next().value);
      }else{json(res,404,{ok:false,message:'Неизвестный API'});return;}
      json(res,200,{...result,room:rooms.get(session.room)?.snapshot(token)||null});return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    const relative=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
    const target=path.resolve(root,'.'+relative);if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(403);res.end();return;}
    const info=await stat(target);if(!info.isFile())throw new Error('not file');
    const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'}[path.extname(target)]||'application/octet-stream';
    res.writeHead(200,{'Content-Type':mime,'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Cache-Control':target.includes('vendor')?'public, max-age=86400':'no-cache'});res.end(req.method==='HEAD'?undefined:await readFile(target));
  }catch(error){if(!res.headersSent)json(res,404,{ok:false,message:'Ресурс не найден'});else res.end();}});
  let last=performance.now();const timer=setInterval(()=>{const now=performance.now(),dt=Math.min(1,(now-last)/1000);last=now;for(const room of rooms.values())room.tick(dt);},100);
  const cleanup=setInterval(()=>{const now=Date.now();for(const [token,s]of sessions)if(now-s.last>86400000)sessions.delete(token);for(const [code,room]of rooms){const present=[...sessions.values()].some(s=>s.room===code&&now-s.last<86400000);if(!present)rooms.delete(code);}},60000);
  server.on('close',()=>{clearInterval(timer);clearInterval(cleanup);});return {server,rooms};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const {server}=createServer();server.listen(Number(process.env.PORT)||4174,process.env.HOST||'0.0.0.0',()=>console.log(`Kingdoms online ready on port ${server.address().port}`));}
