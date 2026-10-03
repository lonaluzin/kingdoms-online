import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

export function createWorld(host, labelsHost, getState, onSelect) {
  let seed = 9271;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#839d94');
  scene.fog = new THREE.FogExp2('#91a89b', .0045);
  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7)); renderer.setSize(host.clientWidth,host.clientHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.22;
  host.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(39,host.clientWidth/host.clientHeight,.1,300);
  camera.position.set(45,63,72);
  const controls = new OrbitControls(camera,renderer.domElement);
  controls.target.set(0,0,1); controls.enableDamping=true; controls.dampingFactor=.08; controls.minDistance=28; controls.maxDistance=123; controls.maxPolarAngle=Math.PI*.43; controls.minPolarAngle=.3;
  controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};
  controls.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_ROTATE}; controls.screenSpacePanning=false;
  const hemi = new THREE.HemisphereLight('#e9f4dc','#38554a',2.4); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0cb',3.1); sun.position.set(-25,65,25); sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:1,far:150}); sun.shadow.bias=-.0005; sun.shadow.normalBias=.045; scene.add(sun);
  const mats=new Map();
  const mat = color => {if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:.95,flatShading:true}));return mats.get(color);};
  const geometries = {box:new THREE.BoxGeometry(1,1,1),cone:new THREE.ConeGeometry(1,1,5),cylinder:new THREE.CylinderGeometry(1,1,1,8),sphere:new THREE.IcosahedronGeometry(1,0)};
  function mesh(parent,geometry,color,x,y,z,sx=1,sy=1,sz=1) {const m=new THREE.Mesh(typeof geometry==='string'?geometries[geometry]:geometry,mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  const riverX = z => 3 + Math.sin(z*.12)*5 + Math.cos(z*.2)*1.5;
  function height(x,z) {
    const river=Math.abs(x-riverX(z));
    let h = .75+Math.sin(x*.32)*Math.cos(z*.22)*.45+Math.sin(x*.8+z*.4)*.13;
    if(river<2.9) h=-.8+Math.pow(river/2.9,4)*1.6;
    const edge=Math.max(Math.abs(x)/42,Math.abs(z)/36);
    if(edge>.8) h+=(edge-.8)*9;
    for(const p of getState().places){const d=Math.hypot(x-p.x,z-p.z);if(d<5.5)h=THREE.MathUtils.lerp(.83,h,THREE.MathUtils.smoothstep(d,3.6,5.5));}
    return h;
  }
  mesh(scene,'box','#263f35',0,-2.5,0,85,4,73);
  const terrain=new THREE.PlaneGeometry(84,72,105,90);terrain.rotateX(-Math.PI/2);
  const pos=terrain.attributes.position;
  for(let i=0;i<pos.count;i++)pos.setY(i,height(pos.getX(i),pos.getZ(i)));
  const flat=terrain.toNonIndexed(); const colors=[]; const colorset=['#688252','#718d56','#748d59','#6c8652','#7c925a','#82965f'];
  for(let i=0;i<flat.attributes.position.count;i+=3){const x=flat.attributes.position.getX(i),z=flat.attributes.position.getZ(i),d=Math.abs(x-riverX(z));const c=new THREE.Color(d<3.7?'#ada57d':colorset[Math.floor(random()*colorset.length)]);for(let k=0;k<3;k++)colors.push(c.r,c.g,c.b);}
  flat.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));flat.computeVertexNormals();
  const land=new THREE.Mesh(flat,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));land.receiveShadow=true;scene.add(land);
  const water=new THREE.Mesh(new THREE.PlaneGeometry(83.9,71.9),new THREE.MeshStandardMaterial({color:'#479aa7',roughness:.29,metalness:.25,transparent:true,opacity:.94}));water.rotation.x=-Math.PI/2;water.position.y=.02;scene.add(water);
  const waterLines=[];
  for(let i=0;i<95;i++){const z=random()*69-34.5,x=riverX(z)+(random()-.5)*3; const l=mesh(scene,'box','#8ec4bf',x,.045,z,.15+random()*.6,.009,.025);l.castShadow=false;waterLines.push(l);}
  function road(a,b,color='#b6a078',width=.25) {
    const points=[];for(let i=0;i<=45;i++){const t=i/45,x=THREE.MathUtils.lerp(a.x,b.x,t),z=THREE.MathUtils.lerp(a.z,b.z,t)+Math.sin(t*Math.PI)*1.5;points.push(new THREE.Vector3(x,Math.max(.12,height(x,z)+.04),z));}
    const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),70,width,4,false);const r=new THREE.Mesh(geo,mat(color));r.receiveShadow=true;scene.add(r);return points;
  }
  const places=getState().places;
  const roads=[['home','willow'],['home','oak'],['home','bandits'],['home','gold'],['gold','red'],['gold','ruins'],['willow','red']].map(([a,b])=>road(places.find(p=>p.id===a),places.find(p=>p.id===b)));
  for(const z of [11,-10]){const x=riverX(z);mesh(scene,'box','#998564',x,.67,z,7,.4,1.6);for(const side of [-1,1]){mesh(scene,'box','#6c654e',x,1.23,z+side*.77,7,.25,.14);for(let j=-3;j<=3;j+=1.5)mesh(scene,'box','#6c654e',x+j,.78,z+side*.77,.15,1.2,.15);}for(let j=-3;j<3.5;j+=.35)mesh(scene,'box','#b1a383',x+j,.9,z,.055,.055,1.5);}
  const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.11,.18,1.6,5),mat('#63583b'),850);
  const crowns=new THREE.InstancedMesh(new THREE.ConeGeometry(1,2.7,5),mat('#285846'),850);
  const tips=new THREE.InstancedMesh(new THREE.ConeGeometry(.7,2.1,5),mat('#3e7151'),850);
  const dummy=new THREE.Object3D();let trees=0;
  for(let i=0;i<2000&&trees<850;i++){
    const x=random()*81-40.5,z=random()*69-34.5;
    if(Math.abs(x-riverX(z))<4.3||places.some(p=>Math.hypot(x-p.x,z-p.z)<6)||roads.some(r=>r.some(p=>Math.hypot(x-p.x,z-p.z)<.9)))continue;
    const n=Math.sin(x*.13+1)*Math.cos(z*.15);if(random()>(n+.9)*.58)continue;
    const h=height(x,z),scale=.5+random()*.7;
    dummy.position.set(x,h+.6*scale,z);dummy.scale.setScalar(scale);dummy.rotation.y=random()*7;dummy.updateMatrix();trunk.setMatrixAt(trees,dummy.matrix);
    dummy.position.y=h+1.7*scale;dummy.updateMatrix();crowns.setMatrixAt(trees,dummy.matrix);
    dummy.position.y=h+2.55*scale;dummy.updateMatrix();tips.setMatrixAt(trees,dummy.matrix);trees++;
  }
  for(const t of [trunk,crowns,tips]){t.count=trees;t.castShadow=true;t.receiveShadow=true;scene.add(t);}
  for(let i=0;i<45;i++){const x=-39+random()*78,z=-31+random()*8;if(Math.abs(x-riverX(z))<5||places.some(p=>Math.hypot(x-p.x,z-p.z)<7))continue;const scale=2+random()*5;const m=mesh(scene,new THREE.ConeGeometry(1,1,5),'#879189',x,height(x,z)+scale*.42,z,scale*.9,scale*1.5,scale*.75);m.rotation.y=random()*6;if(scale>4)mesh(scene,new THREE.ConeGeometry(1,1,5),'#d4d9c8',x,height(x,z)+scale*1.12,z,scale*.26,scale*.46,scale*.22);}
  for(let i=0;i<60;i++){const x=random()*80-40,z=random()*68-34;if(places.some(p=>Math.hypot(x-p.x,z-p.z)<5)||Math.abs(x-riverX(z))<3.4)continue;const sc=.3+random()*.6;mesh(scene,'sphere','#9a9c85',x,height(x,z)+sc*.3,z,sc,sc*.8,sc);}
  const flags=[],mills=[],settlements=new Map(),borderGroup=new THREE.Group();scene.add(borderGroup);
  function flag(parent,x,y,z,color){mesh(parent,'cylinder','#e0d0a6',x,y/2,z,.045,y,.045);const cloth=new THREE.Mesh(new THREE.PlaneGeometry(.85,.5,6,1),new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.8}));cloth.position.set(x+.43,y-.3,z);parent.add(cloth);flags.push(cloth);return cloth;}
  function house(parent,x,z,scale=1,roof='#866252'){
    mesh(parent,'box','#d7c8a3',x,.52*scale,z,1.1*scale,1.03*scale,.95*scale);
    const r=mesh(parent,new THREE.ConeGeometry(.9,.8,4),roof,x,1.34*scale,z,scale,scale,scale);r.rotation.y=Math.PI/4;
    mesh(parent,'box','#584e3a',x,.34*scale,z+.482*scale,.24*scale,.64*scale,.026);
    mesh(parent,'box','#7c684b',x,.92*scale,z+.49*scale,1.11*scale,.065,.035);
    mesh(parent,'box','#d4b788',x+.33*scale,.65*scale,z+.492*scale,.2*scale,.23*scale,.035);
    mesh(parent,'box','#b4aa92',x+.28*scale,1.55*scale,z-.2*scale,.2*scale,.5*scale,.2*scale);
  }
  function tower(parent,x,z,color,size=1){mesh(parent,'box','#c8c6ad',x,1.5*size,z,1.1*size,3*size,1.1*size);const roof=mesh(parent,new THREE.ConeGeometry(.98,1.35,4),color,x,3.65*size,z,size,size,size);roof.rotation.y=Math.PI/4;mesh(parent,'box','#485b54',x,2*size,z+.56*size,.23*size,.65*size,.035);mesh(parent,'box','#ded8bd',x,2.9*size,z,1.27*size,.2*size,1.27*size);}
  function castle(group,p){const roof=p.id==='home'?'#487b89':p.id==='red'?'#944e47':'#a18b47';
    mesh(group,'box','#b4b395',0,.12,0,7,.22,6);
    for(const z of [-2.5,2.5]){mesh(group,'box','#aaa98f',0,1,z,5.8,1.8,.4);for(let i=-2.6;i<=2.6;i+=.58)mesh(group,'box','#d0cbb0',i,2.02,z,.3,.45,.46);}
    for(const x of [-2.9,2.9]){mesh(group,'box','#b8b79b',x,1,0,.4,1.8,5);for(let i=-2.2;i<=2.2;i+=.58)mesh(group,'box','#d0cbb0',x,2.02,i,.46,.45,.3);}
    for(const x of [-2.9,2.9])for(const z of [-2.5,2.5])tower(group,x,z,roof,.85);
    mesh(group,'box','#d4ceb2',0,1.9,-.7,2.35,3.5,2.1);mesh(group,'box','#e2d9ba',0,3.64,-.7,2.55,.2,2.3);
    const r=mesh(group,new THREE.ConeGeometry(2,1.8,4),roof,0,4.5,-.7,1,1,1);r.rotation.y=Math.PI/4;
    tower(group,1.3,-1.2,roof,1.24);flag(group,1.3,6.2,-1.2,p.color);
    mesh(group,'box','#495a51',0,.8,2.725,1.2,1.6,.045);mesh(group,'box','#5c5b48',0,.2,3.2,1.7,.15,1.15);
    for(const x of [-.65,.65])mesh(group,'box','#506963',x,2.45,.363,.28,.66,.04);
    house(group,-1.6,-.1,.7,roof);
    for(const [x,z,s] of [[-4.6,1,.8],[-3.8,4.1,.9],[-1.2,4.6,.8],[2.1,4.6,.85],[4.4,1.8,.85],[4.6,-1.1,.65]])house(group,x,z,s);
  }
  function farm(parent,x,z){mesh(parent,'box','#9d9454',x,.04,z,3.7,.06,2.5);for(let i=-1.5;i<=1.5;i+=.35){const crop=mesh(parent,'box','#cec17a',x+i,.13,z,.18,.18,2.35);crop.receiveShadow=true;}for(const j of [-1,1])mesh(parent,'box','#827449',x,.25,z+j*1.3,3.9,.18,.08);}
  for(const p of places){const group=new THREE.Group();group.position.set(p.x,.87,p.z);scene.add(group);let placeFlag;
    if(['capital','city'].includes(p.kind)){castle(group,p);group.scale.setScalar(p.id==='home'?1.04:.85);}
    else if(p.kind==='village'){
      for(const [x,z,s] of [[-1.7,0,1],[.2,1.3,.8],[1.7,-.8,1.1],[-.3,-2,.8]])house(group,x,z,s);farm(group,-3.8,2.6);farm(group,2.5,3.5);
      const mill=new THREE.Group();mill.position.set(-2,0,-2.3);group.add(mill);mesh(mill,'cylinder','#d6ceb1',0,1.1,0,.5,2.2,.5);mesh(mill,'cone','#6b6550',0,2.5,0,.78,.9,.78);const blades=new THREE.Group();blades.position.set(0,1.9,.59);for(let i=0;i<4;i++){const wing=mesh(blades,'box','#e8dbb5',0,.75,0,.22,1.5,.06);wing.geometry=wing.geometry.clone();wing.geometry.translate(0,.5,0);wing.position.y=0;wing.rotation.z=i*Math.PI/2;}mill.add(blades);mills.push(blades);placeFlag=flag(group,0,3,0,p.color);
    }else if(p.kind==='camp'){for(const [x,z]of[[-1,0],[1.5,1],[0,-1.5]])mesh(group,new THREE.ConeGeometry(1.2,1.5,4),'#9b654c',x,.75,z);mesh(group,'sphere','#edaa56',0,.25,1.6,.4,.6,.4);placeFlag=flag(group,1.5,3,-1,p.color);}
    else {for(let i=0;i<7;i++){const a=i/7*Math.PI*2;mesh(group,'cylinder','#b0b7a6',Math.cos(a)*2,1,Math.sin(a)*2,.3,2,.3);}mesh(group,'box','#a1aa96',0,.15,0,4.5,.25,4.5);mesh(group,'sphere','#465b57',0,.9,0,1.2,.8,1.2);}
    const ring=new THREE.Mesh(new THREE.RingGeometry(p.kind==='village'?5:6.2,p.kind==='village'?5.05:6.25,80),new THREE.MeshBasicMaterial({color:p.color,transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(p.x,1.1,p.z);borderGroup.add(ring);
    const label=document.createElement('button');label.className='place-label';label.dataset.id=p.id;label.setAttribute('aria-label',`Выбрать ${p.name}`);label.innerHTML=`<span class="place-dot"></span><span>${p.name}</span><small></small>`;label.style.setProperty('--faction',p.color);label.onclick=()=>onSelect(p.id);labelsHost.appendChild(label);
    settlements.set(p.id,{group,label,ring,placeFlag});
  }
  farm(settlements.get('home').group,-5.8,-1.4);farm(settlements.get('home').group,-5.8,-4.3);
  const selectRing = new THREE.Mesh(new THREE.RingGeometry(5.65,5.8,100),new THREE.MeshBasicMaterial({color:'#f7df9d',side:THREE.DoubleSide,transparent:true,opacity:.92,depthWrite:false}));selectRing.rotation.x=-Math.PI/2;selectRing.position.y=1.13;scene.add(selectRing);
  const armyModels=new Map();
  function armyModel(beast=false,color='#8bdcba'){const g=new THREE.Group();if(beast){mesh(g,'sphere','#334b43',0,1.2,0,1.5,1.1,2);mesh(g,'sphere','#435f51',0,1.8,1.6,.8,.65,.8);for(const x of [-1,1])for(const z of [-1,1])mesh(g,'box','#273d35',x,.5,z,.5,1,.5);for(const x of [-.5,.5])mesh(g,'cone','#dfc397',x,2.7,1.5,.18,1,.18);}else{for(let i=0;i<6;i++){const x=(i%3-1)*.5,z=Math.floor(i/3)*.65;mesh(g,'cylinder','#457d83',x,.45,z,.17,.7,.17);mesh(g,'sphere','#d7c6a6',x,.92,z,.16,.18,.16);mesh(g,'box','#bec6b7',x+.23,.67,z,.045,.75,.045);mesh(g,'box','#416c79',x-.17,.45,z+.12,.13,.4,.3);}flag(g,0,2.2,0,color);}scene.add(g);return g;}
  let selection=getState().home||'home',frame=0,frameId,disposed=false;
  const projected=new THREE.Vector3();
  const raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.85),intersection=new THREE.Vector3();
  let down=null;
  renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
  renderer.domElement.addEventListener('pointerup',e=>{if(!down||e.button!==0||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;const rect=renderer.domElement.getBoundingClientRect();ndc.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(ndc,camera);if(raycaster.ray.intersectPlane(plane,intersection)){const p=getState().places.find(p=>Math.hypot(intersection.x-p.x,intersection.z-p.z)<4.7);if(p)onSelect(p.id);}});
  function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);
  function render(){if(disposed)return;frameId=requestAnimationFrame(render);frame++;const s=getState();controls.update();controls.target.x=THREE.MathUtils.clamp(controls.target.x,-28,28);controls.target.z=THREE.MathUtils.clamp(controls.target.z,-22,22);
    const w=host.clientWidth,h=host.clientHeight;
    for(const p of s.places){const v=settlements.get(p.id);projected.set(p.x, p.kind==='city'||p.kind==='capital'?7.5:4.6,p.z).project(camera);v.label.style.transform=`translate(-50%,-100%) translate(${(projected.x+1)*w/2}px,${(-projected.y+1)*h/2}px)`;v.label.hidden=projected.z>1||projected.z<-1;v.label.classList.toggle('selected',p.id===selection);const color=p.owner==='player'?'#89dfbc':p.color;v.label.style.setProperty('--faction',color);v.ring.material.color.set(color);const relation=s.relations[p.id];v.label.querySelector('small').textContent=p.owner==='player'?(p.id===(s.home||'home')?'ВАША СТОЛИЦА':'ВАШИ ЗЕМЛИ'):relation?.status==='alliance'?'СОЮЗНИК':relation?.status==='war'?'ВОЙНА':p.kind==='camp'?'УГРОЗА':p.kind==='ruins'?'ДИКИЕ ЗЕМЛИ':p.kind==='village'?'ДЕРЕВНЯ':'НЕЗАВИСИМОЕ ГОСУДАРСТВО';}
    const p=s.places.find(p=>p.id===selection);selectRing.position.set(p.x,1.13,p.z);selectRing.material.opacity=.65+Math.sin(frame*.025)*.2;
    for(const f of flags){const a=f.geometry.attributes.position;for(let i=0;i<a.count;i++)a.setZ(i,Math.sin(frame*.04+a.getX(i)*5)*.08*(a.getX(i)+.45));a.needsUpdate=true;}
    for(const m of mills)m.rotation.z=frame*.008;
    for(const l of waterLines)l.material=mat('#8ec4bf');
    const active=new Set();
    for(const m of [...(s.mapMarches||s.marches),...(s.beast?[{...s.beast,id:'beast',beast:true}]:[])]){active.add(m.id);if(!armyModels.has(m.id))armyModels.set(m.id,armyModel(m.beast,s.realmColors?.[m.owner]||'#8bdcba'));const g=armyModels.get(m.id),p=s.places.find(p=>p.id===m.target);let t=THREE.MathUtils.clamp((s.time-m.start)/(m.end-m.start),0,1);if(m.returning)t=1-t;const origin=s.places.find(p=>p.id===(m.origin||s.home||'home'));const x=THREE.MathUtils.lerp(origin.x,p.x,t),z=THREE.MathUtils.lerp(origin.z,p.z,t);g.position.set(x,Math.max(.8,height(x,z))+.1,z);g.rotation.y=Math.atan2(p.x-origin.x,p.z-origin.z)+(m.returning?Math.PI:0);}
    for(const [id,g]of armyModels)if(!active.has(id)){scene.remove(g);armyModels.delete(id);}
    renderer.render(scene,camera);
  }
  render();
  return {
    select(id){selection=id;},
    focus(id='home'){const p=getState().places.find(p=>p.id===id);const offset=camera.position.clone().sub(controls.target);controls.target.set(p.x,0,p.z);camera.position.copy(controls.target).add(offset);controls.update();},
    zoom(factor){const delta=camera.position.clone().sub(controls.target);delta.multiplyScalar(factor);delta.clampLength(28,123);camera.position.copy(controls.target).add(delta);controls.update();},
    borders(show){borderGroup.visible=show;},
    dispose(){disposed=true;cancelAnimationFrame(frameId);controls.dispose();renderer.dispose();window.removeEventListener('resize',resize);},
  };
}

