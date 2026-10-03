// Original scored themes, synthesized locally. No streamed files or third-party music.
const themes=[
 {name:'Тихая долина',bpm:64,chords:[[48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,59]],melody:[72,null,76,74,72,67,null,69,72,null,69,67,65,64,null,67]},
 {name:'Совет королевства',bpm:58,chords:[[50,57,62,65],[46,53,58,62],[48,55,60,64],[45,52,57,61]],melody:[74,77,null,76,74,69,72,null,70,74,null,72,69,65,69,null]},
];
export function createAudio(){
 let context,master,music,fx,wind,timer,next=0,beat=0,theme=0,enabled=localStorage.getItem('kingdoms-audio')!=='off';
 let volume=Number(localStorage.getItem('kingdoms-volume')||.25),choice='auto';
 const button=document.createElement('button');button.id='audio-toggle';button.className='icon-button';button.setAttribute('aria-label','Звук и музыка');button.title='Звук и музыка';button.textContent=enabled?'♫':'♪';document.querySelector('.topbar').append(button);
 const panel=document.createElement('div');panel.id='audio-settings';panel.hidden=true;panel.innerHTML='<strong>Звук королевства</strong><label><input id="sound-on" type="checkbox"> Музыка и звуки</label><label>Громкость<input id="sound-volume" aria-label="Громкость" type="range" min="0" max="0.6" step="0.01"></label><label>Музыка<select id="sound-theme"><option value="auto">Обе темы по очереди</option><option value="0">Тихая долина</option><option value="1">Совет королевства</option></select></label><small>Авторские инструментальные темы · ветер, птицы и сигналы армии</small>';document.body.append(panel);
 panel.querySelector('#sound-on').checked=enabled;panel.querySelector('#sound-volume').value=volume;
 function tone(midi,at,duration,gain=.03,type='triangle',output=music){if(!context)return;const osc=context.createOscillator(),env=context.createGain();osc.type=type;osc.frequency.value=440*2**((midi-69)/12);osc.connect(env);env.connect(output);env.gain.setValueAtTime(0,at);env.gain.linearRampToValueAtTime(gain,at+.06);env.gain.exponentialRampToValueAtTime(.0001,at+duration);osc.start(at);osc.stop(at+duration+.05);}
 function schedule(){if(!context||context.state!=='running')return;if(next<context.currentTime)next=context.currentTime+.05;
  while(next<context.currentTime+.7){const t=themes[theme],length=60/t.bpm,chord=t.chords[Math.floor(beat/4)%4];
   if(beat%4===0)chord.forEach((n,i)=>tone(n,next+i*.09,length*4,.014,'sine'));
   tone(chord[beat%4]+12,next,length*1.8,.023);
   const note=t.melody[beat%16];if(note)tone(note,next+.04,length*1.65,.023,'sine');
   if(beat%16===7){tone(94,next,.18,.013,'sine',fx);tone(98,next+.23,.22,.008,'sine',fx);}
   next+=length;beat++;if(beat%64===0&&choice==='auto')theme=1-theme;
  }
 }
 async function start(){if(!context){context=new AudioContext();master=context.createGain();music=context.createGain();fx=context.createGain();master.connect(context.destination);music.connect(master);fx.connect(master);master.gain.value=enabled?volume:0;
  const buffer=context.createBuffer(1,context.sampleRate*4,context.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.18;wind=context.createBufferSource();wind.buffer=buffer;wind.loop=true;const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=350;const gain=context.createGain();gain.gain.value=.025;wind.connect(filter);filter.connect(gain);gain.connect(master);wind.start();timer=setInterval(schedule,250);next=context.currentTime+.05;}
  if(enabled)await context.resume();schedule();
 }
 button.onclick=async()=>{panel.hidden=!panel.hidden;await start();};
 panel.querySelector('#sound-on').onchange=async e=>{enabled=e.target.checked;localStorage.setItem('kingdoms-audio',enabled?'on':'off');await start();master.gain.setTargetAtTime(enabled?volume:0,context.currentTime,.15);button.textContent=enabled?'♫':'♪';};
 panel.querySelector('#sound-volume').oninput=e=>{volume=Number(e.target.value);localStorage.setItem('kingdoms-volume',volume);master?.gain.setTargetAtTime(enabled?volume:0,context.currentTime,.1);};
 panel.querySelector('#sound-theme').onchange=e=>{choice=e.target.value;theme=choice==='auto'?0:Number(choice);beat=0;};
 document.addEventListener('pointerdown',e=>{if(e.target.closest('button'))start();});
 function cue(kind){if(!enabled||!context||context.state!=='running')return;const now=context.currentTime+.01;
  if(kind==='march'){[0,.15,.3].forEach((d,i)=>tone(38+i,now+d,.18,.14,'triangle',fx));tone(57,now+.45,.65,.07,'sine',fx);}
  else if(kind==='warning'){[62,57,62].forEach((n,i)=>tone(n,now+i*.3,.45,.1,'triangle',fx));}
  else if(kind==='build'){[72,76,79].forEach((n,i)=>tone(n,now+i*.16,.8,.08,'sine',fx));}
  else tone(79,now,.14,.025,'sine',fx);
 }
 window.addEventListener('pagehide',()=>{clearInterval(timer);context?.close();},{once:true});return {cue,start};
}
