import {createArmyModel,animateArmy,batchStaticParts} from './models.js';
import * as THREE from 'three';
import {MAPS,riverX as mapRiver,findRoute,routePoint,visualTime} from './navigation.js';
import { OrbitControls } from './vendor/OrbitControls.js';

export function labelTransform(projected,width,height,minY=0){return `translate(-50%,-100%) translate(${(projected.x+1)*width/2}px,${Math.max(minY,(-projected.y+1)*height/2)}px)`;}

export function createWorld(host, labelsHost, getState, onSelect, onArmy=()=>{}) {
  const map=getState().map||'valley'; let seed = MAPS[map].seed;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#b0c6bf');
  scene.fog = new THREE.FogExp2('#b0c6bf', .0055);
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
  const hemi = new THREE.HemisphereLight('#d6e8f0','#4c6141',1.8); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe5b4',2.6); sun.position.set(-25,65,25); sun.castShadow=true;sun.shadow.radius=3;
  sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:1,far:150}); sun.shadow.bias=-.0005; sun.shadow.normalBias=.045; scene.add(sun);
  const mats=new Map();
  const mat = color => {if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:['#b6c2c3','#586776'].includes(color)?.42:.87,metalness:['#b6c2c3','#586776'].includes(color)?.55:0,flatShading:true}));return mats.get(color);};
  const geometries = {box:new THREE.BoxGeometry(1,1,1),cone:new THREE.ConeGeometry(1,1,7),cylinder:new THREE.CylinderGeometry(1,1,1,10),sphere:new THREE.IcosahedronGeometry(1,1)};
  function mesh(parent,geometry,color,x,y,z,sx=1,sy=1,sz=1) {const m=new THREE.Mesh(typeof geometry==='string'?geometries[geometry]:geometry,mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  const riverX = z => mapRiver(z,map);
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
  for(let i=0;i<flat.attributes.position.count;i+=3){const x=flat.attributes.position.getX(i),z=flat.attributes.position.getZ(i),d=Math.abs(x-riverX(z));const shade=Math.max(0,Math.min(5,Math.floor((Math.sin(x*.18)*Math.cos(z*.15)*.5+.5)*5+random()*.4)));const c=new THREE.Color(d<3.7?'#b5aa86':colorset[shade]);for(let k=0;k<3;k++)colors.push(c.r,c.g,c.b);}
  flat.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));flat.computeVertexNormals();
  const land=new THREE.Mesh(flat,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));land.receiveShadow=true;scene.add(land);
  const waterUniform={value:0};
  const waterMaterial=new THREE.MeshStandardMaterial({color:'#429397',roughness:.2,metalness:.35,transparent:true,opacity:.91});
  waterMaterial.onBeforeCompile=shader=>{shader.uniforms.waveTime=waterUniform;shader.vertexShader='uniform float waveTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal.x += cos(position.x*2.2+waveTime)*.12; objectNormal.y += sin(position.y*2.6+waveTime*1.3)*.12;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z += sin(position.x*1.8+waveTime)*.022 + cos(position.y*2.4+waveTime*1.2)*.018;');};
  const water=new THREE.Mesh(new THREE.PlaneGeometry(83.9,71.9,110,95),waterMaterial);water.rotation.x=-Math.PI/2;water.position.y=.02;scene.add(water);
  const waterLines=[];
  for(let i=0;i<95;i++){const z=random()*69-34.5,x=riverX(z)+(random()-.5)*3; const l=mesh(scene,'box','#8ec4bf',x,.045,z,.15+random()*.6,.009,.025);l.castShadow=false;waterLines.push(l);}
  function road(a,b,color='#b6a078',width=.25) {
    const points=[];for(let i=0;i<=45;i++){const t=i/45,x=THREE.MathUtils.lerp(a.x,b.x,t),z=THREE.MathUtils.lerp(a.z,b.z,t)+Math.sin(t*Math.PI)*1.5;points.push(new THREE.Vector3(x,Math.max(.12,height(x,z)+.04),z));}
    const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),70,width,4,false);const r=new THREE.Mesh(geo,mat(color));r.receiveShadow=true;scene.add(r);return points;
  }
  const places=getState().places;
  // Clear walking corridors through woods, without laying paths through the river.
  const roads=[];for(let i=0;i<places.length;i++)for(let j=i+1;j<places.length;j++){const path=findRoute(places[i],places[j],places,map);if(path)roads.push(path);}
  for(const z of [11,-10]){const x=riverX(z);mesh(scene,'box','#998564',x,.67,z,10,.4,1.6);for(const side of [-1,1]){mesh(scene,'box','#6c654e',x,1.23,z+side*.77,10,.25,.14);for(let j=-4.5;j<=4.5;j+=1.5)mesh(scene,'box','#6c654e',x+j,.78,z+side*.77,.15,1.2,.15);}for(let j=-4.5;j<4.8;j+=.35)mesh(scene,'box','#b1a383',x+j,.9,z,.055,.055,1.5);}
  const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.11,.18,1.6,5),mat('#63583b'),850);
  const crowns=new THREE.InstancedMesh(new THREE.ConeGeometry(1,2.7,7),mat('#35604a'),850);
  const tips=new THREE.InstancedMesh(new THREE.ConeGeometry(.7,2.1,7),mat('#567b50'),850);
  const canopy=new THREE.InstancedMesh(geometries.sphere,mat('#63824b'),850),upperCanopy=new THREE.InstancedMesh(geometries.sphere,mat('#789352'),850);
  const dummy=new THREE.Object3D();let trees=0;
  for(let i=0;i<2000&&trees<850;i++){
    const x=random()*81-40.5,z=random()*69-34.5;
    if(Math.abs(x-riverX(z))<4.3||places.some(p=>Math.hypot(x-p.x,z-p.z)<6)||roads.some(r=>r.some(p=>Math.hypot(x-p.x,z-p.z)<.9)))continue;
    const n=Math.sin(x*.13+1)*Math.cos(z*.15);if(random()>(n+.9)*.58*MAPS[map].forest)continue;
    const h=height(x,z),scale=.5+random()*.7;
    dummy.position.set(x,h+.6*scale,z);dummy.scale.setScalar(scale);dummy.rotation.y=random()*7;dummy.updateMatrix();trunk.setMatrixAt(trees,dummy.matrix);
    const broad=random()<.32;dummy.scale.setScalar(broad?0:scale);
    dummy.position.y=h+1.7*scale;dummy.updateMatrix();crowns.setMatrixAt(trees,dummy.matrix);crowns.setColorAt(trees,new THREE.Color().setHSL(.28+random()*.06,.3,.4+random()*.12));
    dummy.position.y=h+2.55*scale;dummy.updateMatrix();tips.setMatrixAt(trees,dummy.matrix);
    dummy.position.y=h+1.8*scale;dummy.scale.set(broad?scale*1.35:0,broad?scale*.85:0,broad?scale*1.1:0);dummy.updateMatrix();canopy.setMatrixAt(trees,dummy.matrix);
    dummy.position.set(x+.3*scale,h+2.45*scale,z-.2*scale);dummy.scale.multiplyScalar(.75);dummy.updateMatrix();upperCanopy.setMatrixAt(trees,dummy.matrix);trees++;
  }
  for(const t of [trunk,crowns,tips,canopy,upperCanopy]){t.count=trees;t.castShadow=true;t.receiveShadow=true;scene.add(t);}
  for(let i=0;i<45;i++){const x=-39+random()*78,z=-31+random()*8;if(Math.abs(x-riverX(z))<5||places.some(p=>Math.hypot(x-p.x,z-p.z)<7))continue;const scale=2+random()*(map==='hills'?7:5);const m=mesh(scene,new THREE.ConeGeometry(1,1,5),'#879189',x,height(x,z)+scale*.42,z,scale*.9,scale*1.5,scale*.75);m.rotation.y=random()*6;if(scale>4)mesh(scene,new THREE.ConeGeometry(1,1,5),'#d4d9c8',x,height(x,z)+scale*1.12,z,scale*.26,scale*.46,scale*.22);}
  for(let i=0;i<60;i++){const x=random()*80-40,z=random()*68-34;if(places.some(p=>Math.hypot(x-p.x,z-p.z)<5)||Math.abs(x-riverX(z))<3.4)continue;const sc=.3+random()*.6;mesh(scene,'sphere','#9a9c85',x,height(x,z)+sc*.3,z,sc,sc*.8,sc);}
  // Vegetation shares geometry and uses two draw calls, rather than hundreds of small objects.
  const shrubs=new THREE.InstancedMesh(geometries.sphere,mat('#69834f'),240),grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.12,.55,3),mat('#87975b'),600);let bushes=0,tufts=0;
  for(let i=0;i<1600&&tufts<600;i++){const x=random()*80-40,z=random()*68-34;if(Math.abs(x-riverX(z))<3.8||places.some(p=>Math.hypot(x-p.x,z-p.z)<6)||roads.some(r=>r.some(p=>Math.hypot(x-p.x,z-p.z)<.8)))continue;const h=height(x,z);dummy.position.set(x,h+.2,z);dummy.scale.set(.6+random()*.4,.3+random()*.25,.55+random()*.4);dummy.rotation.y=random()*6;dummy.updateMatrix();if(bushes<240&&i%3===0)shrubs.setMatrixAt(bushes++,dummy.matrix);dummy.scale.setScalar(.6+random());dummy.position.y=h+.12;dummy.updateMatrix();grass.setMatrixAt(tufts++,dummy.matrix);}
  shrubs.count=bushes;grass.count=tufts;shrubs.castShadow=true;scene.add(shrubs,grass);
  const flags=[],mills=[],settlements=new Map(),borderGroup=new THREE.Group();scene.add(borderGroup);
  function flag(parent,x,y,z,color){mesh(parent,'cylinder','#e0d0a6',x,y/2,z,.045,y,.045);const cloth=new THREE.Mesh(new THREE.PlaneGeometry(.85,.5,6,1),new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.8}));cloth.position.set(x+.43,y-.3,z);parent.add(cloth);flags.push(cloth);return cloth;}
  function house(parent,x,z,scale=1,roof='#866252'){
    mesh(parent,'box','#d7c8a3',x,.52*scale,z,1.1*scale,1.03*scale,.95*scale);
    const r=mesh(parent,new THREE.ConeGeometry(.9,.8,4),roof,x,1.34*scale,z,scale,scale,scale);r.rotation.y=Math.PI/4;
    mesh(parent,'box','#584e3a',x,.34*scale,z+.482*scale,.24*scale,.64*scale,.026);
    mesh(parent,'box','#7c684b',x,.92*scale,z+.49*scale,1.11*scale,.065,.035);
    mesh(parent,'box','#d4b788',x+.33*scale,.65*scale,z+.492*scale,.2*scale,.23*scale,.035);
    mesh(parent,'box','#b4aa92',x+.28*scale,1.55*scale,z-.2*scale,.2*scale,.5*scale,.2*scale);
    for(const side of [-1,1]){mesh(parent,'box','#75624c',x+side*.51*scale,.53*scale,z+.49*scale,.06*scale,.99*scale,.035);mesh(parent,'box','#7b624a',x+side*.3*scale,.68*scale,z+.52*scale,.055,.29*scale,.025);}
    mesh(parent,'box','#ad9775',x,.05*scale,z,1.25*scale,.15*scale,1.08*scale);
    mesh(parent,'box','#786347',x,.2*scale,z+.62*scale,.4*scale,.09,.22*scale);
  }
  function tower(parent,x,z,color,size=1){mesh(parent,'box','#c8c6ad',x,1.5*size,z,1.1*size,3*size,1.1*size);const roof=mesh(parent,new THREE.ConeGeometry(.98,1.35,4),color,x,3.65*size,z,size,size,size);roof.rotation.y=Math.PI/4;mesh(parent,'box','#485b54',x,2*size,z+.56*size,.23*size,.65*size,.035);mesh(parent,'box','#ded8bd',x,2.9*size,z,1.27*size,.2*size,1.27*size);}
  function castle(group,p){const roof=p.id==='home'?'#487b89':p.id==='red'?'#944e47':'#a18b47';
    const fort=new THREE.Group();group.add(fort);group.userData.fortifications=fort;
    mesh(fort,'box','#b4b395',0,.12,0,7,.22,6);
    for(const z of [-2.5,2.5]){mesh(fort,'box','#aaa98f',0,1,z,5.8,1.8,.4);for(let i=-2.6;i<=2.6;i+=.58)mesh(fort,'box','#d0cbb0',i,2.02,z,.3,.45,.46);}
    for(const x of [-2.9,2.9]){mesh(fort,'box','#b8b79b',x,1,0,.4,1.8,5);for(let i=-2.2;i<=2.2;i+=.58)mesh(fort,'box','#d0cbb0',x,2.02,i,.46,.45,.3);}
    for(const x of [-2.9,2.9])for(const z of [-2.5,2.5])tower(fort,x,z,roof,.85);
    mesh(group,'box','#d4ceb2',0,1.9,-.7,2.35,3.5,2.1);mesh(group,'box','#e2d9ba',0,3.64,-.7,2.55,.2,2.3);
    const r=mesh(group,new THREE.ConeGeometry(2,1.8,4),roof,0,4.5,-.7,1,1,1);r.rotation.y=Math.PI/4;
    tower(group,1.3,-1.2,roof,1.24);const banner=flag(group,1.3,6.2,-1.2,p.color);
    mesh(group,'box','#495a51',0,.8,2.725,1.2,1.6,.045);mesh(group,'box','#5c5b48',0,.2,3.2,1.7,.15,1.15);
    for(const x of [-.65,.65])mesh(group,'box','#506963',x,2.45,.363,.28,.66,.04);
    house(group,-1.6,-.1,.7,roof);
    for(const x of [-.45,0,.45])mesh(group,'box','#5f6c63',x,2.55,.375,.18,.55,.035);
    for(const x of [-.65,.65]){mesh(group,'box','#a89164',x,1.5,2.75,.09,1.5,.08);mesh(group,'box','#b49c6e',x,2.25,2.75,.22,.15,.16);}
    for(const [x,z,s] of [[-4.6,1,.8],[-3.8,4.1,.9],[-1.2,4.6,.8],[2.1,4.6,.85],[4.4,1.8,.85],[4.6,-1.1,.65]])house(group,x,z,s);return banner;
  }
  function farm(parent,x,z){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(.65);parent.add(g);mesh(g,'box','#6b4c2d',0,.05,0,3.7,.09,2.5);for(let i=-1.5;i<=1.5;i+=.45)for(let j=-1;j<=1;j+=.45){mesh(g,'cylinder','#e1c75d',i,.3,j,.035,.5,.035);mesh(g,'cone','#eac76a',i,.58,j,.095,.23,.095);}for(const j of [-1,1]){mesh(g,'box','#a58d61',0,.4,j*1.3,3.9,.09,.08);for(let i=-1.8;i<2;i+=.6)mesh(g,'box','#a58d61',i,.3,j*1.3,.08,.6,.08);}house(g,2.2,-.2,.65,'#b67944');}
  for(const p of places){const group=new THREE.Group();group.position.set(p.x,.87,p.z);scene.add(group);let placeFlag;
    if(['capital','city'].includes(p.kind)){placeFlag=castle(group,p);group.scale.setScalar(p.id==='home'?1.04:.85);}
    else if(p.kind==='village'){
      for(const [x,z,s] of [[-1.7,0,1],[.2,1.3,.8],[1.7,-.8,1.1],[-.3,-2,.8]])house(group,x,z,s);farm(group,-3.8,2.6);farm(group,2.5,3.5);
      const mill=new THREE.Group();mill.position.set(-2,0,-2.3);group.add(mill);mesh(mill,'cylinder','#d6ceb1',0,1.1,0,.5,2.2,.5);mesh(mill,'cone','#6b6550',0,2.5,0,.78,.9,.78);const blades=new THREE.Group();blades.position.set(0,1.9,.59);for(let i=0;i<4;i++){const wing=mesh(blades,'box','#e8dbb5',0,.75,0,.22,1.5,.06);wing.geometry=wing.geometry.clone();wing.geometry.translate(0,.5,0);wing.position.y=0;wing.rotation.z=i*Math.PI/2;}mill.add(blades);mills.push(blades);placeFlag=flag(group,0,3,0,p.color);
    }else if(p.kind==='camp'){for(const [x,z]of[[-1,0],[1.5,1],[0,-1.5]])mesh(group,new THREE.ConeGeometry(1.2,1.5,4),'#9b654c',x,.75,z);mesh(group,'sphere','#edaa56',0,.25,1.6,.4,.6,.4);placeFlag=flag(group,1.5,3,-1,p.color);}
    else {for(let i=0;i<7;i++){const a=i/7*Math.PI*2;mesh(group,'cylinder','#b0b7a6',Math.cos(a)*2,1,Math.sin(a)*2,.3,2,.3);}mesh(group,'box','#a1aa96',0,.15,0,4.5,.25,4.5);mesh(group,'sphere','#465b57',0,.9,0,1.2,.8,1.2);}
    const ring=new THREE.Mesh(new THREE.RingGeometry(p.kind==='village'?5:6.2,p.kind==='village'?5.05:6.25,80),new THREE.MeshBasicMaterial({color:p.color,transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(p.x,1.1,p.z);borderGroup.add(ring);
    const label=document.createElement('button');label.className='place-label';label.dataset.id=p.id;label.setAttribute('aria-label',`Выбрать ${p.name}`);label.innerHTML=`<span class="place-dot"></span><span>${p.name}</span><small></small>`;label.style.setProperty('--faction',p.color);label.onclick=()=>onSelect(p.id);labelsHost.appendChild(label);
    settlements.set(p.id,{group,label,ring,placeFlag,owner:p.owner,flagY:placeFlag?.position.y,buildingGroup:null,buildingKey:''});
  }
  function showBuildings(v,buildings){
    const key=JSON.stringify([buildings||{},getState().places.find(p=>settlements.get(p.id)===v)?.devastated]);if(v.buildingKey===key)return;v.buildingKey=key;if(v.buildingGroup){v.group.remove(v.buildingGroup);v.buildingGroup.traverse(o=>{if(o.isMesh&&!Object.values(geometries).includes(o.geometry))o.geometry.dispose();});}
    const g=new THREE.Group();v.group.add(g);v.buildingGroup=g;const b=buildings||{};if(getState().places.find(p=>settlements.get(p.id)===v)?.devastated)for(let i=0;i<9;i++)mesh(g,'sphere','#65645c',-3+i*.7,.15,-3+(i%3),.5,.24,.4);
    if(b.farm){farm(g,-3.5,-3.6);if(b.farm>1)farm(g,3.8,-3.8);if(b.farm>2){mesh(g,'cylinder','#c6ac5e',-4.6,1.1,-1.8,.45,2.2,.45);}}
    if(b.market){for(let i=0;i<b.market+1;i++){const x=-2+i*1.25;mesh(g,'box','#a2885e',x,.4,3.8,.9,.7,.6);mesh(g,'box',i%2?'#cead5d':'#6d9890',x,1.2,3.8,1.1,.15,.9);for(const dx of [-.4,.4])mesh(g,'box','#a2885e',x+dx,.9,3.8,.05,1.1,.05);}}
    if(b.barracks){house(g,3.7,0,.9,'#586e83');for(let i=0;i<b.barracks;i++){mesh(g,'box','#6b543c',3.8+i*.2,.7,1.3,.06,1.3,.06);mesh(g,'box','#bfc3b2',3.8+i*.2,1.45,1.3,.04,.5,.04);}}
    if(b.lumber){house(g,-4,0,.6);for(let i=0;i<b.lumber+2;i++){const log=mesh(g,'cylinder','#86643b',-4,.18,1.2+i*.25,.17,1.4,.17);log.rotation.z=Math.PI/2;}}
    if(b.quarry){for(let i=0;i<b.quarry+2;i++)mesh(g,'sphere','#a2a69d',4.3,.25,-2+i*.35,.45,.35,.35);}
    if(b.academy)house(g,-1.7,-3.5,.9,'#596780');
    if(b.shrine){mesh(g,'cylinder','#a7bca5',2,1.1,-3,.5,2,.5);mesh(g,'sphere','#c1dbc7',2,2.3,-3,.3,.4,.3);}
    if(b.archery){house(g,2.8,2.8,.65,'#748d65');for(let i=0;i<2;i++){const target=mesh(g,'cylinder','#e2d1a7',3+i*.8,1.1,2.5,.35,.08,.35);target.rotation.x=Math.PI/2;mesh(g,'sphere','#b26450',3+i*.8,1.1,2.6,.12,.12,.04);}}
    if(b.stable){house(g,-3.6,2.6,.8,'#896846');for(const z of [2.4,3.2]){mesh(g,'sphere','#775341',-3.1,.7,z,.28,.3,.55);mesh(g,'sphere','#775341',-3.1,1.1,z+.4,.15,.35,.2);}}
    if(b.hunting){house(g,-3.3,-2.6,.7,'#657950');mesh(g,'cone','#c6b388',-2.7,1.3,-2.6,.6,.8,.6);}
    if(b.spoils){house(g,3.3,2.5,.8,'#806843');for(let i=0;i<3;i++)mesh(g,'box','#ab8650',2.2+i*.4,.35,3.2,.32,.45,.4);}
    if(b.mercenaries){house(g,2.8,-2.4,.9,'#804b42');mesh(g,'cone','#ce9d5c',2.8,2.7,-2.4,.3,.6,.3);}
    if(b.excavation){mesh(g,'cylinder','#4c4940',-3.2,.05,-2.9,1,.12,1);for(let i=0;i<4;i++)mesh(g,'box','#acaa93',-3.7+i*.5,.25,-2.4,.4,.35,.4);}
    if(b.archive){house(g,2.7,-2.9,.9,'#69758b');mesh(g,'cylinder','#d2c2a0',2.7,2.1,-2.9,.5,.35,.5);}
    if(b.runeforge){house(g,-3.1,2.8,.7,'#536b70');mesh(g,'sphere','#73daca',-3.1,1.8,2.8,.35,.5,.35);}
    if(b.walls)for(const x of [-2.9,2.9])mesh(g,'box','#dad3bd',x,2.3,0,.45,b.walls*.3,5);
    batchStaticParts(g);
  }
  for(const p of places)showBuildings(settlements.get(p.id),getState().settlements?.[p.id]?.buildings||(p.id===(getState().home||'home')?getState().buildings:null));
  const smoke=[];
  for(const p of places){const v=settlements.get(p.id),g=v.group;
    if(p.kind==='ruins'){for(let i=0;i<3;i++)mesh(g,'sphere','#648459',Math.cos(i*2)*2.2,.25,Math.sin(i*2)*2.2,.6,.3,.5);continue;}
    for(const [x,z]of[[-2.2,2.5],[2.4,.6]]){mesh(g,'cylinder','#906b43',x,.35,z,.24,.7,.24);for(const y of [.12,.55])mesh(g,'cylinder','#51594f',x,y,z,.25,.065,.25);mesh(g,'box','#816843',x+.5,.25,z,.4,.5,.4);}
    const cart=new THREE.Group();cart.position.set(-3.5,0,2);g.add(cart);mesh(cart,'box','#967248',0,.6,0,1.1,.2,.75);for(const side of [-1,1]){mesh(cart,'box','#a88a59',0,.87,side*.37,1.1,.38,.08);const wheel=mesh(cart,'cylinder','#514c37',side*.6,.33,0,.35,.08,.35);wheel.rotation.z=Math.PI/2;mesh(cart,'cylinder','#aa936b',side*.645,.33,0,.08,.09,.08).rotation.z=Math.PI/2;}mesh(cart,'box','#88673f',0,.38,.9,.08,.08,1.1);
    if(p.kind==='camp'){for(let i=0;i<8;i++){const a=i/8*Math.PI*2;mesh(g,'sphere','#777c70',Math.cos(a)*.55,.1,1.6+Math.sin(a)*.55,.17,.13,.17);}for(let i=0;i<3;i++){const flame=mesh(g,'cone',i%2?'#efaf55':'#d66c35',-.16+i*.16,.55,1.6,.16,.6,.16);flame.userData.fire=true;smoke.push({mesh:flame,fire:true,base:flame.position.clone(),phase:i});}const smokeMat=new THREE.MeshBasicMaterial({color:'#b2b4a4',transparent:true,opacity:.18,depthWrite:false});for(let i=0;i<4;i++){const puff=new THREE.Mesh(geometries.sphere,smokeMat);puff.position.set(0,1.6+i*.3,1.6);puff.scale.setScalar(.25);puff.userData.animate=true;g.add(puff);smoke.push({mesh:puff,base:puff.position.clone(),phase:i});}}
  }
  for(const v of settlements.values())batchStaticParts(v.group);
  const selectRing = new THREE.Mesh(new THREE.RingGeometry(5.65,5.8,100),new THREE.MeshBasicMaterial({color:'#f7df9d',side:THREE.DoubleSide,transparent:true,opacity:.92,depthWrite:false}));selectRing.rotation.x=-Math.PI/2;selectRing.position.y=1.13;scene.add(selectRing);
  const armyModels=new Map();
  const effects=[];
  const dustMaterial=new THREE.MeshBasicMaterial({color:'#c7b998',transparent:true,opacity:.16,depthWrite:false});
  function armyModel(beast=false,color='#8bdcba',troops={}){const g=createArmyModel(mesh,flag,beast,color,troops);g.userData.key=JSON.stringify([troops,color]);g.userData.composition={...troops};const radius=beast?3.8:Math.max(1.2,Math.sqrt(g.userData.count||1)*.65),r=new THREE.Mesh(new THREE.RingGeometry(radius,radius+.09,48),new THREE.MeshBasicMaterial({color:'#ffe2a2',transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));r.rotation.x=-Math.PI/2;r.position.y=.04;r.visible=false;g.add(r);g.userData.selectionRing=r;scene.add(g);return g;}
  function fallen(g,n,troops={}){g.updateMatrixWorld(true);const victims=g.userData.fighters.filter(f=>f.arms.length&&(g.userData.composition?.[f.type]||0)>(troops[f.type]||0)).slice(0,Math.min(4,n));for(const f of victims){if(!f.arms.length)continue;const body=f.group;scene.attach(body);for(const {pivot,knee}of f.legs){pivot.rotation.x=.35;knee.rotation.x=.5;}f.arms[0].rotation.z=-.8;f.arms[1].rotation.z=.65;effects.push({mesh:body,start:performance.now(),end:performance.now()+3200,fall:true,ground:Math.max(.85,height(body.position.x,body.position.z))+.19,baseY:body.position.y,baseX:body.rotation.x});}g.userData.hitAt=performance.now();}
  function ensureArmy(id,beast,color,troops){let g=armyModels.get(id);const key=JSON.stringify([troops,color]);if(g&&!beast&&g.userData.key!==key){const old=g.userData.total||0;if(old>Object.values(troops).reduce((a,b)=>a+b,0))fallen(g,Math.ceil((old-Object.values(troops).reduce((a,b)=>a+b,0))/5),troops);const pos=g.position.clone(),rot=g.rotation.y;removeArmy(id,g);g=armyModel(beast,color,troops);g.position.copy(pos);g.rotation.y=rot;g.userData.placed=true;g.userData.hitAt=old>Object.values(troops).reduce((a,b)=>a+b,0)?performance.now():0;armyModels.set(id,g);}if(!g){g=armyModel(beast,color,troops);armyModels.set(id,g);}g.userData.total=Object.values(troops).reduce((a,b)=>a+b,0);return g;}
  function removeArmy(id,g){scene.remove(g);g.userData.label?.remove();const i=flags.indexOf(g.userData.banner);if(i>=0)flags.splice(i,1);armyModels.delete(id);g.traverse(o=>{if(o.isMesh){if(!Object.values(geometries).includes(o.geometry))o.geometry.dispose();if(![...mats.values()].includes(o.material))o.material.dispose();}});}
  let selection=getState().home||'home',armySelection=null,frame=0,frameId,disposed=false,lastFrameAt=performance.now();
  const projected=new THREE.Vector3();
  const raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.85),intersection=new THREE.Vector3();
  let down=null;
  renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
  renderer.domElement.addEventListener('pointerup',e=>{if(!down||e.button!==0||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;const rect=renderer.domElement.getBoundingClientRect();ndc.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(ndc,camera);if(raycaster.ray.intersectPlane(plane,intersection)){const p=getState().places.find(p=>Math.hypot(intersection.x-p.x,intersection.z-p.z)<4.7);if(p)onSelect(p.id);}});
  function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);
  function render(){if(disposed)return;frameId=requestAnimationFrame(render);frame++;const s=getState();controls.update();controls.target.x=THREE.MathUtils.clamp(controls.target.x,-28,28);controls.target.z=THREE.MathUtils.clamp(controls.target.z,-22,22);
    const w=host.clientWidth,h=host.clientHeight;
    for(const p of s.places){const v=settlements.get(p.id);projected.set(p.x, p.kind==='city'||p.kind==='capital'?7.5:4.6,p.z).project(camera);v.label.style.transform=labelTransform(projected,w,h);v.label.hidden=projected.z>1||projected.z<-1;v.label.classList.toggle('selected',p.id===selection);const color=p.color;
      if(v.owner!==p.owner){v.owner=p.owner;v.captureAt=performance.now();}
      if(v.placeFlag){v.placeFlag.material.color.set(color);const transition=(performance.now()-(v.captureAt||-10000))/1800;v.placeFlag.position.y=v.flagY-(transition<1?Math.sin(transition*Math.PI)*1.7:0);}
      if(v.group.userData.fortifications)v.group.userData.fortifications.scale.y=Math.max(.15,1-(p.wallDamage||0));showBuildings(v,s.settlements?.[p.id]?.buildings||(p.id===(s.home||'home')?s.buildings:null));v.label.style.setProperty('--faction',color);v.ring.material.color.set(color);const relation=s.relations[p.id];v.label.querySelector('small').textContent=p.owner==='player'?(p.id===(s.home||'home')?'ВАША СТОЛИЦА':'ВАШИ ЗЕМЛИ'):relation?.status==='alliance'?'СОЮЗНИК':relation?.status==='war'?'ВОЙНА':p.kind==='camp'?'УГРОЗА':p.kind==='ruins'?'ДИКИЕ ЗЕМЛИ':p.kind==='village'?'ДЕРЕВНЯ':'НЕЗАВИСИМОЕ ГОСУДАРСТВО';}
    const p=s.places.find(p=>p.id===selection);selectRing.position.set(p.x,1.13,p.z);selectRing.material.opacity=.65+Math.sin(frame*.025)*.2;
    for(const f of flags){const a=f.geometry.attributes.position;for(let i=0;i<a.count;i++)a.setZ(i,Math.sin(frame*.04+a.getX(i)*5)*.08*(a.getX(i)+.45));a.needsUpdate=true;}
    for(const m of mills)m.rotation.z=frame*.008;
    waterUniform.value=performance.now()*.0008;
    for(let i=0;i<waterLines.length;i++){const l=waterLines[i];l.scale.x=.25+Math.pow(Math.sin(performance.now()*.0008+i),2)*.55;l.position.y=.05+Math.sin(performance.now()*.001+i)*.008;}
    const active=new Set(),now=performance.now(),time=s.online?visualTime(s.time,s.receivedAt||now,now,s.speed):s.time;
    const frameDelta=Math.min(.05,(now-lastFrameAt)/1000);lastFrameAt=now;
    for(const m of [...(s.mapMarches||s.marches),...(s.mapBeasts||[])]){
      active.add(m.id);const g=ensureArmy(m.id,m.beast,s.realmColors?.[m.owner]||'#8bdcba',m.troops||{});if(!g.userData.label){g.userData.label=document.createElement('button');g.userData.label.className='army-label';g.userData.label.onclick=e=>{e.stopPropagation();armySelection=m.id;onArmy(m.id);};labelsHost.append(g.userData.label);}const p=s.places.find(p=>p.id===m.target),origin=s.places.find(p=>p.id===(m.origin||s.home||'home'));
      const path=m.route||findRoute(origin,p,places,map);if(!path)continue;
      let t=m.battle||m.phase==='fallen'?1:THREE.MathUtils.clamp((time-m.start)/(m.end-m.start),0,1);if(m.returning)t=1-t;
      const point=routePoint(path,t);const destination=new THREE.Vector3(m.beast&&m.battle?p.x:point.x,Math.abs(point.x-riverX(point.z))<3.6?1.02:Math.max(.8,height(point.x,point.z))+.1,m.beast&&m.battle?p.z:point.z);if(g.userData.placed)g.position.lerp(destination,Math.min(1,(now-(g.userData.at||now))/1000*12));else g.position.copy(destination);g.userData.placed=true;g.userData.at=now;
      const label=g.userData.label;const labelText=`${m.beast?'Древний зверь':s.realmNames?.[m.owner]||'Армия'} · ${m.beast?'':Object.values(m.troops||{}).reduce((a,b)=>a+b,0)+' воинов · '}${m.battle?'БОЙ · нажмите':m.returning?'возвращение':Math.max(0,Math.ceil(m.end-s.time))+' сек.'}`;if(label.dataset.text!==labelText){label.dataset.text=labelText;label.textContent=labelText;}label.style.zIndex=m.battle||m.beast?'8':'4';label.style.borderColor=s.realmColors?.[m.owner]||'#e0c27c';projected.copy(g.position).add(new THREE.Vector3(0,m.beast?8:4.8,0)).project(camera);label.style.transform=labelTransform(projected,w,h,m.beast?165:0);label.hidden=projected.z>1||projected.z<-1;
      label.classList.toggle('in-battle',!!m.battle);label.classList.toggle('beast-label',!!m.beast);label.classList.toggle('selected',armySelection===m.id);label.title=label.textContent;
      if(m.beast){let hp=label.querySelector('.beast-health');if(!hp){hp=document.createElement('span');hp.className='beast-health';hp.innerHTML='<i></i>';label.append(hp);}hp.setAttribute('role','meter');hp.setAttribute('aria-label','Здоровье древнего зверя');hp.setAttribute('aria-valuemin','0');hp.setAttribute('aria-valuemax','2400');hp.setAttribute('aria-valuenow',String(m.health||0));hp.firstChild.style.width=(Math.max(0,Math.min(1,m.health/2400))*100)+'%';}
      if(!g.userData.selectionRing){const r=new THREE.Mesh(new THREE.RingGeometry(1.4,1.5,48),new THREE.MeshBasicMaterial({color:'#ffe2a2',transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));r.rotation.x=-Math.PI/2;r.position.y=.06;g.add(r);g.userData.selectionRing=r;}g.userData.selectionRing.visible=armySelection===m.id;
      const angle=point.angle+(m.returning?Math.PI:0);g.rotation.y+=Math.atan2(Math.sin(angle-g.rotation.y),Math.cos(angle-g.rotation.y))*.12;
      for(const leg of g.userData.legs)leg.leg.rotation.x=m.battle?Math.sin(time*5+leg.phase)*.12:Math.sin(time*(m.beast?3:9)+leg.phase)*.45*leg.side;
      g.rotation.z=m.beast&&m.phase==='fallen'?1.3:0;
      if(m.beast&&m.battle){
        const attackPhase=((time-m.start)%4)/4;g.rotation.x=-Math.sin(attackPhase*Math.PI)*.24;g.position.y+=Math.sin(attackPhase*Math.PI)*.55;
        g.rotation.y=Math.atan2(p.x-origin.x,p.z-origin.z);
        if((m.strikes||0)>(g.userData.strikes||0)){g.userData.strikes=m.strikes;const v=settlements.get(p.id);v.impactAt=now;
          for(let i=0;i<16;i++){const rock=mesh(scene,'sphere',i%2?'#baaa88':'#73796d',p.x+(Math.random()-.5)*6,1+Math.random()*2,p.z+(Math.random()-.5)*6,.2+Math.random()*.5,.3,.3);effects.push({mesh:rock,end:now+1600,velocity:new THREE.Vector3((Math.random()-.5)*.06,.035,(Math.random()-.5)*.06)});}
          for(let i=0;i<8&&effects.length<96;i++){const a=i*Math.PI/4,dust=new THREE.Mesh(geometries.sphere,dustMaterial);dust.position.set(p.x+Math.cos(a)*2,1,p.z+Math.sin(a)*2);dust.scale.set(.7,.35,.7);scene.add(dust);effects.push({mesh:dust,end:now+1400,dust:true,velocity:new THREE.Vector3(Math.cos(a)*.024,.014,Math.sin(a)*.024)});}
        }
      }else g.rotation.x=0;
      if(g.userData.aura)g.userData.aura.material.opacity=.3+Math.sin(time*3)*.2;
      if(g.userData.jaw)g.userData.jaw.rotation.x=m.battle?Math.max(0,Math.sin(time*1.6))*.45:.06+Math.sin(time*.6)*.04;
      animateArmy(g,time,m.battle?'attack':'walk',Math.max(0,1-(now-(g.userData.hitAt||0))/500));
      if(s.speed!==0&&m.battle&&!m.beast&&now-(g.userData.sparkAt||0)>600&&effects.length<64){g.userData.sparkAt=now;for(let i=0;i<3;i++){const spark=mesh(scene,'sphere',i%2?'#e5bb73':'#d7d8bb',g.position.x+(Math.random()-.5)*2,g.position.y+.8,g.position.z+1.2,.035,.1,.035);effects.push({mesh:spark,end:now+300,velocity:new THREE.Vector3((Math.random()-.5)*.025,.012,(Math.random()-.5)*.025)});}}
      for(const f of g.userData.fighters){
        if(m.battle&&['archer','crossbow','catapult'].includes(f.type)){if(!f.shot){f.shot=new THREE.Group();if(f.type==='catapult')mesh(f.shot,'sphere','#6c7369',0,0,0,.18,.18,.18);else{mesh(f.shot,'cylinder','#ae8855',0,0,0,.018,.65,.018).rotation.x=Math.PI/2;mesh(f.shot,'cone','#d3ddde',0,0,.38,.045,.14,.045).rotation.x=Math.PI/2;}g.add(f.shot);}const phase=(time*1.1+f.phase)%1;f.shot.position.set(f.group.position.x,1+Math.sin(phase*Math.PI)*1.5,f.group.position.z+phase*5);f.shot.rotation.x=-Math.cos(phase*Math.PI)*.5;f.shot.visible=phase>.12&&phase<.92;}}

      g.userData.banner?.material.color.set(m.battle?'#ef9577':s.realmColors?.[m.owner]||'#8bdcba');
    }
    for(const p of s.places){const data=s.settlements?.[p.id],troops=data?.composition||p.garrison||{},count=Object.values(troops).reduce((a,b)=>a+b,0),id='guard-'+p.id;if(count>0){active.add(id);const g=ensureArmy(id,false,p.color,troops);g.position.set(p.x,1.05,p.z+6);g.scale.setScalar(.78);g.userData.banner?.material.color.set(p.color);
      if(!g.userData.label){g.userData.label=document.createElement('button');g.userData.label.className='army-label guard-label';g.userData.label.onclick=e=>{e.stopPropagation();armySelection=id;onArmy(id);};labelsHost.append(g.userData.label);}g.userData.label.textContent=`⚔ ${count}`;g.userData.label.title=`Гарнизон ${p.name}: ${count} воинов, дух ${Math.round(data?.morale??80)}. Нажмите для состава.`;projected.copy(g.position).add(new THREE.Vector3(0,2.8,0)).project(camera);g.userData.label.style.transform=labelTransform(projected,w,h);g.userData.label.hidden=projected.z>1||projected.z<-1;g.userData.label.classList.toggle('selected',selection===p.id||armySelection===id);
      g.userData.selectionRing.visible=armySelection===id;g.rotation.y=Math.PI;const enemy=(s.mapMarches||[]).find(m=>m.battle&&m.target===p.id);const enemyModel=enemy&&armyModels.get(enemy.id);if(enemyModel)g.rotation.y=Math.atan2(enemyModel.position.x-g.position.x,enemyModel.position.z-g.position.z);const fighting=(s.mapMarches||[]).some(m=>m.battle&&m.target===p.id)||(s.mapBeasts||[]).some(b=>b.battle&&b.target===p.id);animateArmy(g,time,fighting?'attack':'idle',Math.max(0,1-(now-(g.userData.hitAt||0))/500));
    }}
    for(const puff of smoke){const phase=(time*.7+puff.phase*.25)%1;if(puff.fire)puff.mesh.scale.y=.6+Math.sin(time*8+puff.phase)*.15;else{puff.mesh.position.y=puff.base.y+phase*1.4;puff.mesh.position.x=puff.base.x+phase*.6;puff.mesh.scale.setScalar(.2+phase*.4);}}
    for(const v of settlements.values()){const shake=Math.max(0,1-(now-(v.impactAt||0))/500);v.group.rotation.z=Math.sin(now*.07)*.035*shake;}
    for(const e of effects){if(e.velocity){e.mesh.position.addScaledVector(e.velocity,frameDelta*60);e.velocity.y-=.09*frameDelta;e.mesh.rotation.x+=4.8*frameDelta;}if(e.fall){const t=Math.min(1,(now-e.start)/650);e.mesh.rotation.x=e.baseX+t*Math.PI/2;e.mesh.position.y=THREE.MathUtils.lerp(e.baseY,e.ground,t);e.mesh.scale.setScalar(Math.max(0,Math.min(1,(e.end-now)/400)));}}
    for(let i=effects.length-1;i>=0;i--)if(effects[i].end<now){const e=effects[i];scene.remove(e.mesh);if(e.fall)e.mesh.traverse(o=>{if(o.isMesh&&!Object.values(geometries).includes(o.geometry))o.geometry.dispose();});effects.splice(i,1);}
    for(const [id,g]of armyModels)if(!active.has(id))removeArmy(id,g);
    renderer.render(scene,camera);
  }
  render();
  return {
    select(id){selection=id;armySelection=null;},
    focus(id='home'){const p=getState().places.find(p=>p.id===id);const offset=camera.position.clone().sub(controls.target);controls.target.set(p.x,0,p.z);camera.position.copy(controls.target).add(offset);controls.update();},
    zoom(factor){const delta=camera.position.clone().sub(controls.target);delta.multiplyScalar(factor);delta.clampLength(28,123);camera.position.copy(controls.target).add(delta);controls.update();},
    borders(show){borderGroup.visible=show;},
    dispose(){disposed=true;cancelAnimationFrame(frameId);controls.dispose();renderer.dispose();const geometriesToFree=new Set(),materialsToFree=new Set([dustMaterial]);scene.traverse(o=>{if(o.isMesh){geometriesToFree.add(o.geometry);materialsToFree.add(o.material);}});for(const g of geometriesToFree)g.dispose();for(const m of materialsToFree)m.dispose();window.removeEventListener('resize',resize);},
  };
}

