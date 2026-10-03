const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function connectOnline({receive,toast}){
  let room=null,connected=false,busy=false,playing=false,menuKey='',winnerShown=false;
  const menu=document.createElement('section');menu.id='online-menu';menu.setAttribute('aria-label','Главное меню');document.body.appendChild(menu);
  const status=document.createElement('div');status.id='network';status.innerHTML='<span>Подключение…</span><button id="room-button">Комната</button>';document.body.appendChild(status);
  const $=s=>document.querySelector(s);
  $('#pause').disabled=true;document.querySelectorAll('[data-speed]').forEach(b=>b.disabled=true);
  function updateStatus(){status.querySelector('span').textContent=connected?(room?`● ${room.code} · людей ${room.players.filter(p=>!p.bot).length} · ботов ${room.players.filter(p=>p.bot).length}`:'● Сервер доступен'):'○ Переподключение…';status.classList.toggle('offline',!connected);}
  function showMenu(){
    menu.hidden=false;document.body.classList.add('in-menu');
    const key=room?JSON.stringify([room.code,room.phase,room.players,room.host]):'main';if(menuKey===key)return;menuKey=key;
    if(room){
      const running=room.phase==='playing';menu.innerHTML=`<div class="menu-card"><div class="eyebrow">ЗАЛ ПРАВИТЕЛЕЙ</div><h1>Комната <span class="room-code">${room.code}</span></h1><p class="menu-intro">${running?'Партия уже началась. Новые игроки не принимаются.':'Пригласите друзей. Всем нужно войти до начала партии.'}</p><div class="lobby-list">${room.players.map((p,i)=>`<div><span class="player-avatar" style="--player:${['#70cdb6','#e5bf70','#df897a','#9caded'][i]}">♛</span><span>${esc(p.name)}<small>${p.bot?'ИИ-правитель':i===0?'Создатель комнаты':'Игрок'}${p.eliminated?' · столица потеряна':''}</small></span><b>${p.bot?'БОТ':'ИГРОК'}</b></div>`).join('')}</div>${!running?`<p class="muted">На старте добавятся ${Math.min(room.botCount,4-room.players.length)} бота. Всего мест: 4.</p>`:''}<button class="secondary full" id="invite">Скопировать приглашение</button>${running?'<button class="primary full" id="back-game">Вернуться к карте</button>':room.host?'<button class="primary full" id="start">Начать партию</button>':'<p class="waiting">Ожидаем начала партии…</p>'}<button class="sub-action" id="leave">${running?'Покинуть комнату':'В главное меню'}</button><p id="menu-error" role="alert"></p></div>`;
    }else menu.innerHTML=`<div class="menu-card"><div class="eyebrow">3D СТРАТЕГИЯ В РЕАЛЬНОМ ВРЕМЕНИ</div><div class="menu-crown">♛</div><h1>Королевства</h1><p class="menu-intro">Постройте державу. Найдите союзников.<br>Разделите один мир с друзьями.</p><label>Имя правителя<input id="nickname" maxlength="24" autocomplete="nickname" placeholder="Например, Торвальд" value="${esc(localStorage.getItem('kingdoms-nickname')||'')}"></label><label>Боты в партии<select id="bot-count"><option value="1">1 соперник</option><option value="2" selected>2 соперника</option><option value="3">3 соперника</option><option value="0">Без ботов · только друзья</option></select></label><button class="primary full" id="solo">Одиночная игра с ботами</button><button class="secondary full" id="create">Создать сетевую игру</button><div class="join-row"><input id="room-code" maxlength="6" placeholder="Код комнаты" aria-label="Код комнаты" value="${esc(new URLSearchParams(location.search).get('room')||'')}"><button class="secondary" id="join">Войти</button></div><div class="menu-foot"><span class="online-dot"></span> До 4 правителей · вход без регистрации<br>Все решения и боты рассчитываются сервером.</div><p id="menu-error" role="alert"></p></div>`;
  }
  function hideMenu(){menu.hidden=true;document.body.classList.remove('in-menu');}
  function apply(next){room=next;connected=true;updateStatus();if(!room){if(playing){location.reload();return;}showMenu();return;}
    if(room.phase==='lobby'){showMenu();return;}
    if(!playing){playing=true;hideMenu();}
    receive(room.state,room);
    document.querySelector('.profile').innerHTML=`<span class="shield-mark">♛</span><span>${esc(room.players.find(p=>p.id===room.self)?.name||'Гость')}<small>${room.state.places.find(p=>p.id===room.state.home)?.name}</small></span>`;
    if(room.state.eliminated){$('#objective').innerHTML='<div class="panel-kicker">СТОЛИЦА ПОТЕРЯНА</div><h3>Ваше правление завершено</h3><p>Можно наблюдать за остальными державами.</p>';}
    if(room.winner){$('#objective').innerHTML=`<div class="panel-kicker">ПАРТИЯ ЗАВЕРШЕНА</div><h3>${esc(room.winner.name)}</h3><p>${room.winner.type}</p>`;if(!winnerShown){toast(room.winner.type+' — '+room.winner.name);winnerShown=true;}}
    if(!menu.hidden)showMenu();
  }
  async function api(path,data={}){const res=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(15000)});const r=await res.json();if(!res.ok)throw new Error(r.message||'Ошибка сервера');if('room'in r)apply(r.room);return r;}
  async function leave(){await api('leave');location.href=location.pathname;}
  async function command(type,args={}){if(!connected||busy||!playing)return {ok:false,message:'Дождитесь соединения с сервером'};busy=true;try{return await api('command',{id:crypto.randomUUID(),type,args});}catch(e){return {ok:false,message:e.message};}finally{busy=false;}}
  async function poll(){try{const res=await fetch('/api/state',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!res.ok)throw new Error('Network');apply((await res.json()).room);}catch(e){connected=false;updateStatus();}setTimeout(poll,500);}
  document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.id==='room-button'){$('#drawer').close();showMenu();return;}
    if(b.id==='back-game'){hideMenu();return;}
    if(b.id==='invite'){try{await navigator.clipboard.writeText(location.origin+location.pathname+'?room='+room.code);toast('Приглашение скопировано');}catch{toast('Код комнаты: '+room.code);}return;}
    if(b.dataset.accept||b.dataset.reject){const r=await command(b.dataset.accept?'accept':'reject',{id:b.dataset.accept||b.dataset.reject});toast(r.message||'Готово',!r.ok);return;}
    if(!['solo','create','join','start','leave'].includes(b.id))return;
    b.disabled=true;try{const name=$('#nickname')?.value||'Гость';if($('#nickname'))localStorage.setItem('kingdoms-nickname',name);let r;
      if(['solo','create'].includes(b.id))r=await api('create',{name,bots:b.id==='solo'?Math.max(1,Number($('#bot-count').value)):Number($('#bot-count').value),solo:b.id==='solo'});
      if(b.id==='join')r=await api('join',{name,code:$('#room-code').value});if(b.id==='start')r=await api('start');if(b.id==='leave'){await leave();return;}
      if(r&&!r.ok){$('#menu-error').textContent=r.message;toast(r.message,true);}
    }catch(err){if($('#menu-error'))$('#menu-error').textContent=err.message;}finally{b.disabled=false;}
  });
  const treaty={peace:'мир',pact:'пакт о ненападении',alliance:'союз',trade:'торговый путь',aid:'военную помощь'};
  showMenu();poll();
  return {command,leave,offersHTML:()=>room?.offers?.map(o=>`<article class="item-card"><h3>${esc(o.name)} предлагает ${treaty[o.action]}</h3><p>Ещё ${Math.ceil(o.end-room.state.time)} сек.</p><div class="actions"><button class="primary" data-accept="${o.id}">Принять</button><button class="secondary" data-reject="${o.id}">Отклонить</button></div></article>`).join('')||''};
}
