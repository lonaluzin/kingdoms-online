import {cloneAsset,animateRig,releaseAsset} from './assets.js';
import {createArmyModel,animateArmy,batchStaticParts} from './models.js';
import * as THREE from 'three';
import {MAPS,riverX as mapRiver,findRoute,routePoint,routeLength,blocked,visualTime,advanceVisualPosition,marchingTargets,advanceRenderClock} from './navigation.js';
import { OrbitControls } from './vendor/OrbitControls.js';

export function labelTransform(projected,width,height,minY=0){return `translate(-50%,-100%) translate(${(projected.x+1)*width/2}px,${Math.max(minY,(-projected.y+1)*height/2)}px)`;}

export function createWorld(host, labelsHost, getState, onSelect, onArmy=()=>{}) {
  const map=getState().map||'valley'; let seed = getState().seed||MAPS[map].seed;
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
  camera.position.set(32,48,54);
  const controls = new OrbitControls(camera,renderer.domElement);
  controls.target.set(0,0,1); controls.enableDamping=true; controls.dampingFactor=.08; controls.minDistance=28; controls.maxDistance=62; controls.maxPolarAngle=Math.PI*.29; controls.minPolarAngle=.3;
  controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};
  controls.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_ROTATE}; controls.screenSpacePanning=false;
  const hemi = new THREE.HemisphereLight('#d6e8f0','#4c6141',1.8); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe5b4',2.6); sun.position.set(-25,65,25); sun.castShadow=true;sun.shadow.radius=3;
  sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:1,far:150}); sun.shadow.bias=-.0005; sun.shadow.normalBias=.045; scene.add(sun);
  const mats=new Map();
  const mat = color => {if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:['#b6c2c3','#586776'].includes(color)?.42:.87,metalness:['#b6c2c3','#586776'].includes(color)?.55:0,flatShading:true}));return mats.get(color);};
  const geometries = {box:new THREE.BoxGeometry(1,1,1),cone:new THREE.ConeGeometry(1,1,7),cylinder:new THREE.CylinderGeometry(1,1,1,10),sphere:new THREE.IcosahedronGeometry(1,1)};
  function mesh(parent,geometry,color,x,y,z,sx=1,sy=1,sz=1) {const m=new THREE.Mesh(typeof geometry==='string'?geometries[geometry]:geometry,mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function asset(parent,name,x=0,z=0,scale=1,rotation=0){const g=cloneAsset(name);if(!g)return null;g.position.set(x,0,z);g.scale.setScalar(scale);g.rotation.y=rotation;parent.add(g);return g;}
  const riverX = z => mapRiver(z,map);
  function height(x,z) {
    const river=Math.abs(x-riverX(z));
    let h = .75+Math.sin(x*.32)*Math.cos(z*.22)*.45+Math.sin(x*.8+z*.4)*.13;
    const edge=Math.max(Math.abs(x)/34,Math.abs(z)/28);
    if(edge>.8) h+=Math.min(2,(edge-.8)*4);
    for(const p of getState().places){const d=Math.hypot(x-p.x,z-p.z);if(d<9)h=THREE.MathUtils.lerp(.83,h,THREE.MathUtils.smoothstep(d,7,9));}
    if(river<2.9) h=-.8+Math.pow(river/2.9,4)*1.6;
    return h;
  }
  mesh(scene,'box','#5d754b',0,-4.2,0,76,6,68);
  const terrain=new THREE.PlaneGeometry(76,68,152,136);terrain.rotateX(-Math.PI/2);
  const pos=terrain.attributes.position;
  for(let i=0;i<pos.count;i++)pos.setY(i,height(pos.getX(i),pos.getZ(i)));
  const flat=terrain.toNonIndexed(); const colors=[]; const colorset=['#688252','#718d56','#748d59','#6c8652','#7c925a','#82965f'];
  for(let i=0;i<flat.attributes.position.count;i+=3){const x=flat.attributes.position.getX(i),z=flat.attributes.position.getZ(i),d=Math.abs(x-riverX(z));const shade=Math.max(0,Math.min(5,Math.floor((Math.sin(x*.18)*Math.cos(z*.15)*.5+.5)*5+random()*.4)));const c=new THREE.Color(d<3.7?'#b5aa86':colorset[shade]);for(let k=0;k<3;k++)colors.push(c.r,c.g,c.b);}
  flat.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));flat.computeVertexNormals();
  const skirtVertices=[];for(const [a,b]of [[[-38,-34],[38,-34]],[[38,-34],[38,34]],[[38,34],[-38,34]],[[-38,34],[-38,-34]]])for(let i=0;i<152;i++){const t=i/152,u=(i+1)/152,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,X=a[0]+(b[0]-a[0])*u,Z=a[1]+(b[1]-a[1])*u;skirtVertices.push(x,height(x,z),z,X,height(X,Z),Z,x,-7,z,X,height(X,Z),Z,X,-7,Z,x,-7,z);}const skirtGeometry=new THREE.BufferGeometry();skirtGeometry.setAttribute('position',new THREE.Float32BufferAttribute(skirtVertices,3));skirtGeometry.computeVertexNormals();const skirt=new THREE.Mesh(skirtGeometry,new THREE.MeshStandardMaterial({color:'#5d754b',side:THREE.DoubleSide,roughness:1}));scene.add(skirt);
  const land=new THREE.Mesh(flat,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));land.receiveShadow=true;scene.add(land);
  const waterUniform={value:0};
  const waterMaterial=new THREE.MeshStandardMaterial({color:'#429397',roughness:.2,metalness:.35,transparent:true,opacity:.91});
  waterMaterial.onBeforeCompile=shader=>{shader.uniforms.waveTime=waterUniform;shader.vertexShader='uniform float waveTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal.x += cos(position.x*2.2+waveTime)*.12; objectNormal.z += sin(position.z*2.6+waveTime*1.3)*.12;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y += sin(position.x*1.8+waveTime)*.022 + cos(position.z*2.4+waveTime*1.2)*.018;');};
  const waterGeometry=new THREE.BufferGeometry(),waterVertices=[],waterIndices=[];
  for(let i=0;i<=136;i++){const z=i*.5-34;for(const side of [-1,1])waterVertices.push(riverX(z)+side*2.95,.02,z);if(i<136){const n=i*2;waterIndices.push(n,n+2,n+1,n+1,n+2,n+3);}}
  waterGeometry.setAttribute('position',new THREE.Float32BufferAttribute(waterVertices,3));waterGeometry.setIndex(waterIndices);waterGeometry.computeVertexNormals();waterMaterial.side=THREE.DoubleSide;const water=new THREE.Mesh(waterGeometry,waterMaterial);scene.add(water);
  const waterLines=[];
  for(let i=0;i<95;i++){const z=random()*69-34.5,x=riverX(z)+(random()-.5)*3; const l=mesh(scene,'box','#8ec4bf',x,.045,z,.15+random()*.6,.009,.025);l.castShadow=false;waterLines.push(l);}
  function road(a,b,color='#b6a078',width=.25) {
    const points=[];for(let i=0;i<=45;i++){const t=i/45,x=THREE.MathUtils.lerp(a.x,b.x,t),z=THREE.MathUtils.lerp(a.z,b.z,t)+Math.sin(t*Math.PI)*1.5;points.push(new THREE.Vector3(x,Math.max(.12,height(x,z)+.04),z));}
    const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),70,width,4,false);const r=new THREE.Mesh(geo,mat(color));r.receiveShadow=true;scene.add(r);return points;
  }
  const places=getState().places;
  const staging=(x,z)=>places.some(p=>{const gx=p.x+Math.sign(p.x||1)*3.8,gz=p.z+(p.z>0?-7.5:7.5),forward=(z-gz)*(p.z>0?-1:1);return Math.abs(x-gx)<2.2&&forward>-.8&&forward<13;});
  // Clear walking corridors through woods, without laying paths through the river.
  const roads=[];for(let i=0;i<places.length;i++)for(let j=i+1;j<places.length;j++){const path=findRoute(places[i],places[j],places,map);if(path)roads.push(path);}
  for(const z of [12,-12]){const x=riverX(z);mesh(scene,'box','#998564',x,.67,z,10,.4,1.6);for(const side of [-1,1]){mesh(scene,'box','#6c654e',x,1.23,z+side*.77,10,.25,.14);for(let j=-4.5;j<=4.5;j+=1.5)mesh(scene,'box','#6c654e',x+j,.78,z+side*.77,.15,1.2,.15);}for(let j=-4.5;j<4.8;j+=.35)mesh(scene,'box','#b1a383',x+j,.9,z,.055,.055,1.5);}
  const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.11,.18,1.6,5),mat('#63583b'),320);
  const crowns=new THREE.InstancedMesh(new THREE.ConeGeometry(1,2.7,7),mat('#35604a'),320);
  const tips=new THREE.InstancedMesh(new THREE.ConeGeometry(.7,2.1,7),mat('#567b50'),320);
  const canopy=new THREE.InstancedMesh(geometries.sphere,mat('#63824b'),320),upperCanopy=new THREE.InstancedMesh(geometries.sphere,mat('#789352'),320);
  const dummy=new THREE.Object3D();let trees=0;
  for(let i=0;i<1100&&trees<320;i++){
    const x=random()*61-30.5,z=random()*43-21.5;
    if(Math.abs(x-riverX(z))<4.3||places.some(p=>Math.hypot(x-p.x,z-p.z)<8.1)||staging(x,z)||roads.some(r=>r.some(p=>Math.hypot(x-p.x,z-p.z)<1.9)))continue;
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
  for(const side of [-1,1])for(let i=0;i<6;i++){const x=-29+i*11+(random()-.5),z=side*(27+random()*2);if(Math.abs(x-riverX(z))<6||places.some(p=>Math.hypot(x-p.x,z-p.z)<9))continue;const size=2.1+random()*1.7,m=asset(scene,'mountain',x,z,size,random()*6);if(m)m.position.y=height(x,z)-.08;}

  for(let i=0;i<24;i++){const x=random()*60-30,z=random()*48-24;if(places.some(p=>Math.hypot(x-p.x,z-p.z)<8.1)||staging(x,z)||Math.abs(x-riverX(z))<3.4)continue;const sc=.3+random()*.6;mesh(scene,'sphere','#9a9c85',x,height(x,z)+sc*.3,z,sc,sc*.8,sc);}
  // Vegetation shares geometry and uses two draw calls, rather than hundreds of small objects.
  const shrubs=new THREE.InstancedMesh(geometries.sphere,mat('#69834f'),80),grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.12,.55,3),mat('#87975b'),180);let bushes=0,tufts=0;
  for(let i=0;i<600&&tufts<180;i++){const x=random()*60-30,z=random()*48-24;if(Math.abs(x-riverX(z))<3.8||places.some(p=>Math.hypot(x-p.x,z-p.z)<8.1)||staging(x,z)||roads.some(r=>r.some(p=>Math.hypot(x-p.x,z-p.z)<.8)))continue;const h=height(x,z);dummy.position.set(x,h+.2,z);dummy.scale.set(.6+random()*.4,.3+random()*.25,.55+random()*.4);dummy.rotation.y=random()*6;dummy.updateMatrix();if(bushes<80&&i%3===0)shrubs.setMatrixAt(bushes++,dummy.matrix);dummy.scale.setScalar(.6+random());dummy.position.y=h+.12;dummy.updateMatrix();grass.setMatrixAt(tufts++,dummy.matrix);}
  shrubs.count=bushes;grass.count=tufts;shrubs.castShadow=true;scene.add(shrubs,grass);
  const flags=[],mills=[],settlements=new Map(),borderGroup=new THREE.Group();scene.add(borderGroup);
  function flag(parent,x,y,z,color){mesh(parent,'cylinder','#e0d0a6',x,y/2,z,.045,y,.045);const cloth=new THREE.Mesh(new THREE.PlaneGeometry(.85,.5,6,1),new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.8}));cloth.position.set(x+.43,y-.3,z);parent.add(cloth);flags.push(cloth);return cloth;}
  function house(parent,x,z,scale=1){return asset(parent,'house',x,z,scale*.68);}
  function tower(parent,x,z,color,size=1){mesh(parent,'box','#c8c6ad',x,1.5*size,z,1.1*size,3*size,1.1*size);const roof=mesh(parent,new THREE.ConeGeometry(.98,1.35,4),color,x,3.65*size,z,size,size,size);roof.rotation.y=Math.PI/4;mesh(parent,'box','#485b54',x,2*size,z+.56*size,.23*size,.65*size,.035);mesh(parent,'box','#ded8bd',x,2.9*size,z,1.27*size,.2*size,1.27*size);}
  function castle(group,p){const roof=p.id==='home'?'#487b89':p.id==='red'?'#944e47':'#487b89';
    const fort=new THREE.Group();group.add(fort);group.userData.fortifications=fort;
    mesh(fort,'box','#b4b395',0,.12,0,7,.22,6);
    for(const z of [-2.5,2.5]){mesh(fort,'box','#aaa98f',0,1,z,5.8,1.8,.4);for(let i=-2.6;i<=2.6;i+=.58)mesh(fort,'box','#d0cbb0',i,2.02,z,.3,.45,.46);}
    for(const x of [-2.9,2.9]){mesh(fort,'box','#b8b79b',x,1,0,.4,1.8,5);for(let i=-2.2;i<=2.2;i+=.58)mesh(fort,'box','#d0cbb0',x,2.02,i,.46,.45,.3);}
    for(const x of [-2.9,2.9])for(const z of [-2.5,2.5])tower(fort,x,z,roof,.85);
    const keep=new THREE.Group();keep.rotation.y=Math.PI/2;group.add(keep);
    mesh(keep,'box','#d4ceb2',0,1.8,-.35,2.2,3.3,2);mesh(keep,'box','#e2d9ba',0,3.47,-.35,2.4,.2,2.2);
    const r=mesh(keep,new THREE.ConeGeometry(1.72,1.6,4),roof,0,4.3,-.35,1,1,1);r.rotation.y=Math.PI/4;
    for(const x of [-.55,.55])mesh(keep,'box','#506963',x,2.3,.67,.25,.6,.035);
    const banner=flag(group,1.8,4.7,-1.5,p.color);
    mesh(group,'box','#495a51',0,.8,2.725,1.2,1.6,.045);mesh(group,'box','#5c5b48',0,.2,3.2,1.7,.15,1.15);



    for(const x of [-.65,.65]){mesh(group,'box','#a89164',x,1.5,2.75,.09,1.5,.08);mesh(group,'box','#b49c6e',x,2.25,2.75,.22,.15,.16);}
    return banner;
  }
  function farm(parent,x,z){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(.65);parent.add(g);mesh(g,'box','#6b4c2d',0,.05,0,3.7,.09,2.5);for(let i=-1.5;i<=1.5;i+=.45)for(let j=-1;j<=1;j+=.45){mesh(g,'cylinder','#e1c75d',i,.3,j,.035,.5,.035);mesh(g,'cone','#eac76a',i,.58,j,.095,.23,.095);}for(const j of [-1,1]){mesh(g,'box','#a58d61',0,.4,j*1.3,3.9,.09,.08);for(let i=-1.8;i<2;i+=.6)mesh(g,'box','#a58d61',i,.3,j*1.3,.08,.6,.08);}house(g,2.2,-.2,.65,'#b67944');}
  for(const p of places){const group=new THREE.Group();group.position.set(p.x,.87,p.z);scene.add(group);let placeFlag;
    if(['capital','city'].includes(p.kind)){placeFlag=castle(group,p);group.scale.setScalar(p.id==='home'?1.04:.85);}
    else if(p.kind==='village'){
      for(const [x,z,s] of [[-1.7,0,.85],[.5,1.6,.72],[1.8,-.8,.82]])house(group,x,z,s);
      const mill=asset(group,'mill',-2.8,-2.4,.85);if(mill)mills.push(mill.getObjectByName('Rotor'));placeFlag=flag(group,0,3,0,p.color);
    }else if(p.kind==='camp'){for(const [x,z,r]of[[-2,-1.8,0],[2,-1.8,.2],[0,2.5,Math.PI]])asset(group,'tent',x,z,.75,r);placeFlag=flag(group,3.2,3,-1,p.color);}
    else {asset(group,'ruins',0,0,.9);}
    const ring=new THREE.Mesh(new THREE.RingGeometry(p.kind==='village'?5:6.2,p.kind==='village'?5.05:6.25,80),new THREE.MeshBasicMaterial({color:p.color,transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(p.x,1.1,p.z);borderGroup.add(ring);
    const label=document.createElement('button');label.className='place-label';label.dataset.id=p.id;label.setAttribute('aria-label',`Выбрать ${p.name}`);label.innerHTML=`<span class="place-dot"></span><span>${p.name}</span><small></small>`;label.style.setProperty('--faction',p.color);label.onclick=()=>onSelect(p.id);label.oncontextmenu=e=>{e.preventDefault();onSelect(p.id,true);};labelsHost.appendChild(label);
    settlements.set(p.id,{group,label,ring,placeFlag,owner:p.owner,flagY:placeFlag?.position.y,buildingGroup:null,buildingKey:''});
  }
  function showBuildings(v,buildings){
    const key=JSON.stringify([buildings||{},getState().places.find(p=>settlements.get(p.id)===v)?.devastated]);if(v.buildingKey===key)return;v.buildingKey=key;if(v.buildingGroup){v.group.remove(v.buildingGroup);v.buildingGroup.traverse(o=>{if(o.isMesh&&!o.userData.sharedAsset&&!Object.values(geometries).includes(o.geometry))o.geometry.dispose();});}
    const root=new THREE.Group();v.group.add(root);v.buildingGroup=root;const levels=buildings||{};v.slots??={};for(const key of Object.keys(v.slots))if(!levels[key])delete v.slots[key];for(const key of Object.keys(levels).filter(k=>levels[k]>0))if(v.slots[key]===undefined)v.slots[key]=[0,1,2,3,4].find(i=>!Object.values(v.slots).includes(i));
    const names={farm:'farm',market:'market',barracks:'barracks',lumber:'lumber',quarry:'quarry',academy:'academy',shrine:'shrine',archery:'archery',stable:'stable',hunting:'hunting',spoils:'spoils',mercenaries:'mercenaries',excavation:'excavation',archive:'archive',runeforge:'runeforge'};
    for(const [key,level] of Object.entries(levels).filter(([,n])=>n>0)){
     if(key==='walls')continue;
     const angle=v.slots[key]/5*Math.PI*2+Math.PI*.6,kind=getState().places.find(p=>settlements.get(p.id)===v)?.kind,radius=['camp','ruins'].includes(kind)?4.6:5.2;
     if(key==='farm'){farm(root,Math.cos(angle)*radius,Math.sin(angle)*radius);continue;}
     const item=asset(root,names[key]||'house',Math.cos(angle)*radius,Math.sin(angle)*radius,.72);
     if(item)item.rotation.y=-angle-Math.PI/2;
    }
  }
  for(const p of places)showBuildings(settlements.get(p.id),getState().settlements?.[p.id]?.buildings||(p.id===(getState().home||'home')?getState().buildings:null));
  const smoke=[];
  for(const p of places){const v=settlements.get(p.id),g=v.group;
    if(p.kind==='ruins'){mesh(g,'sphere','#d8d7c3',-2.8,.45,2.4,.75,.55,.65);for(let i=0;i<3;i++)mesh(g,'sphere','#648459',Math.cos(i*2)*2.2,.25,Math.sin(i*2)*2.2,.6,.3,.5);continue;}
    for(const [x,z]of(p.kind==='capital'||p.kind==='city'?[[-1.8,1.5],[1.8,.8]]:[[-2.2,2.5],[2.4,.6]])){mesh(g,'cylinder','#906b43',x,.35,z,.24,.7,.24);for(const y of [.12,.55])mesh(g,'cylinder','#51594f',x,y,z,.25,.065,.25);mesh(g,'box','#816843',x+.5,.25,z,.28,.32,.28);}
    asset(g,'cart',p.kind==='camp'?3.9:p.kind==='village'?1.5:-1.65,p.kind==='camp'?2.2:p.kind==='village'?-2.5:1.2,.6,0);
    if(p.kind==='camp'){for(let i=0;i<8;i++){const a=i/8*Math.PI*2;mesh(g,'sphere','#777c70',Math.cos(a)*.55,.1,Math.sin(a)*.55,.17,.13,.17);}for(let i=0;i<3;i++){const flame=mesh(g,'cone',i%2?'#efaf55':'#d66c35',-.16+i*.16,.55,0,.16,.6,.16);flame.userData.fire=true;smoke.push({mesh:flame,fire:true,base:flame.position.clone(),phase:i});}const smokeMat=new THREE.MeshBasicMaterial({color:'#b2b4a4',transparent:true,opacity:.18,depthWrite:false});for(let i=0;i<0;i++){const puff=new THREE.Mesh(geometries.sphere,smokeMat);puff.position.set(0,1.6+i*.3,1.6);puff.scale.setScalar(.25);puff.userData.animate=true;g.add(puff);smoke.push({mesh:puff,base:puff.position.clone(),phase:i});}}
  }
  for(const v of settlements.values())batchStaticParts(v.group);
  const selectRing = new THREE.Mesh(new THREE.RingGeometry(5.65,5.8,100),new THREE.MeshBasicMaterial({color:'#f7df9d',side:THREE.DoubleSide,transparent:true,opacity:.92,depthWrite:false}));selectRing.rotation.x=-Math.PI/2;selectRing.position.y=1.13;scene.add(selectRing);
  const armyModels=new Map();
  const effects=[];
  const dustMaterial=new THREE.MeshBasicMaterial({color:'#c7b998',transparent:true,opacity:.16,depthWrite:false});
  function armyModel(beast=false,color='#8bdcba',troops={}){const g=createArmyModel(mesh,flag,beast,color,troops);g.userData.key=JSON.stringify([troops,color]);g.userData.composition={...troops};const radius=beast?3.8:Math.max(1.2,Math.sqrt(g.userData.count||1)*.65),r=new THREE.Mesh(new THREE.RingGeometry(radius,radius+.09,48),new THREE.MeshBasicMaterial({color:'#ffe2a2',transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));r.rotation.x=-Math.PI/2;r.position.y=.04;r.visible=false;g.add(r);g.userData.selectionRing=r;scene.add(g);return g;}
  function fallen(g,n,troops={}){g.updateMatrixWorld(true);const victims=g.userData.fighters.filter(f=>f.arms.length&&(g.userData.composition?.[f.sourceType||f.type]||0)>(troops[f.sourceType||f.type]||0)).slice(0,Math.min(4,n));for(const f of victims){if(!f.arms.length)continue;const body=f.group;scene.attach(body);if(f.rigged){animateRig(body,'death',0);effects.push({mesh:body,start:performance.now(),end:performance.now()+3200,rigDeath:true});continue;}for(const {pivot,knee}of f.legs){pivot.rotation.x=.35;knee.rotation.x=.5;}f.arms[0].rotation.z=-.8;f.arms[1].rotation.z=.65;effects.push({mesh:body,start:performance.now(),end:performance.now()+3200,fall:true,ground:Math.max(.85,height(body.position.x,body.position.z))+.19,baseY:body.position.y,baseX:body.rotation.x});}g.userData.hitAt=performance.now();}
  function ensureArmy(id,beast,color,troops){let g=armyModels.get(id);const key=JSON.stringify([troops,color]);if(g&&!beast&&g.userData.key!==key){const old=g.userData.total||0;if(old>Object.values(troops).reduce((a,b)=>a+b,0))fallen(g,Math.ceil((old-Object.values(troops).reduce((a,b)=>a+b,0))/5),troops);const poses=new Map();for(const f of g.userData.fighters){if(f.group.parent!==g)continue;const key=f.sourceType||f.type;const list=poses.get(key)||[];list.push({pos:f.group.position.clone(),baseZ:f.baseZ,walkPhase:f.walkPhase,visualPosition:f.visualPosition,worldPosition:f.worldPosition,slot:f.slot});poses.set(key,list);}const pos=g.position.clone(),rot=g.rotation.y;removeArmy(id,g);g=armyModel(beast,color,troops);for(const f of g.userData.fighters){const pose=poses.get(f.sourceType||f.type)?.shift();if(pose){f.group.position.copy(pose.pos);f.baseZ=pose.baseZ;f.walkPhase=pose.walkPhase;f.visualPosition=pose.visualPosition;f.worldPosition=pose.worldPosition;if(old>Object.values(troops).reduce((a,b)=>a+b,0))f.slot=pose.slot;}}g.position.copy(pos);g.rotation.y=rot;g.userData.placed=true;g.userData.hitAt=old>Object.values(troops).reduce((a,b)=>a+b,0)?performance.now():0;armyModels.set(id,g);}if(!g){g=armyModel(beast,color,troops);armyModels.set(id,g);}g.userData.total=Object.values(troops).reduce((a,b)=>a+b,0);return g;}
  function removeArmy(id,g){releaseAsset(g);scene.remove(g);g.userData.label?.remove();const i=flags.indexOf(g.userData.banner);if(i>=0)flags.splice(i,1);armyModels.delete(id);g.traverse(o=>{if(o.isMesh){if(!o.userData.sharedAsset&&!Object.values(geometries).includes(o.geometry))o.geometry.dispose();if(!o.userData.sharedAsset&&![...mats.values()].includes(o.material))o.material.dispose();}});}
  let selection=getState().home||'home',armySelection=null,frame=0,frameId,disposed=false,lastFrameAt=performance.now();
  const projected=new THREE.Vector3();
  const raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.85),intersection=new THREE.Vector3();
  let down=null;
  renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
  renderer.domElement.addEventListener('pointerup',e=>{if(!down||![0,2].includes(e.button)||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;const rect=renderer.domElement.getBoundingClientRect();ndc.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(ndc,camera);if(e.button===0){const hits=raycaster.intersectObjects([...armyModels.values()],true);if(hits.length){let root=hits[0].object;while(root.parent&&root.parent!==scene)root=root.parent;const entry=[...armyModels].find(([,g])=>g===root);if(entry){armySelection=entry[0];onArmy(entry[0]);return;}}}if(raycaster.ray.intersectPlane(plane,intersection)){const p=getState().places.find(p=>Math.hypot(intersection.x-p.x,intersection.z-p.z)<4.7);if(p)onSelect(p.id,e.button===2);}});
  function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);
  function render(){if(disposed)return;frameId=requestAnimationFrame(render);frame++;const s=getState();controls.update();controls.target.x=THREE.MathUtils.clamp(controls.target.x,-20,20);controls.target.z=THREE.MathUtils.clamp(controls.target.z,-17,17);
    const w=host.clientWidth,h=host.clientHeight;
    for(const p of s.places){const v=settlements.get(p.id);projected.set(p.x, p.kind==='city'||p.kind==='capital'?7.5:4.6,p.z).project(camera);v.label.style.transform=labelTransform(projected,w,h);v.label.hidden=projected.z>1||projected.z<-1;v.label.classList.toggle('selected',p.id===selection);const color=p.color;
      if(v.owner!==p.owner){v.owner=p.owner;v.captureAt=performance.now();}
      if(v.placeFlag){v.placeFlag.material.color.set(color);const transition=(performance.now()-(v.captureAt||-10000))/1800;v.placeFlag.position.y=v.flagY-(transition<1?Math.sin(transition*Math.PI)*1.7:0);}
      if(v.group.userData.fortifications)v.group.userData.fortifications.traverse(o=>{if(/^Wall_/.test(o.name))o.visible=Number(o.name.split('_')[1])>=Math.floor((p.wallDamage||0)*5);if(/^Tower_/.test(o.name))o.visible=Number(o.name.split('_')[1])>=Math.floor((p.wallDamage||0)*3);});if((p.wallDamage||0)>0&&!v.rubble){v.rubble=new THREE.Group();v.group.add(v.rubble);asset(v.rubble,'rubble',0,2.5,1);asset(v.rubble,'rubble',-2.7,0,1,Math.PI/2);v.rubble.visible=true;}if(v.rubble)v.rubble.visible=(p.wallDamage||0)>0;showBuildings(v,s.settlements?.[p.id]?.buildings||(p.id===(s.home||'home')?s.buildings:null));v.label.style.setProperty('--faction',color);v.ring.material.color.set(color);const relation=s.relations[p.id];v.label.querySelector('small').textContent=p.owner==='player'?(p.id===(s.home||'home')?'ВАША СТОЛИЦА':'ВАШИ ЗЕМЛИ'):relation?.status==='alliance'?'СОЮЗНИК':relation?.status==='war'?'ВОЙНА':p.kind==='camp'?'УГРОЗА':p.kind==='ruins'?'ДИКИЕ ЗЕМЛИ':p.kind==='village'?'ДЕРЕВНЯ':'НЕЗАВИСИМОЕ ГОСУДАРСТВО';}
    const p=s.places.find(p=>p.id===selection);selectRing.position.set(p.x,1.13,p.z);selectRing.material.opacity=.65+Math.sin(frame*.025)*.2;
    for(const f of flags){const a=f.geometry.attributes.position;for(let i=0;i<a.count;i++)a.setZ(i,Math.sin(frame*.04+a.getX(i)*5)*.08*(a.getX(i)+.45));a.needsUpdate=true;}
    for(const m of mills)m.rotation.z=frame*.008;
    waterUniform.value=performance.now()*.0008;
    for(let i=0;i<waterLines.length;i++){const l=waterLines[i];l.scale.x=.25+Math.pow(Math.sin(performance.now()*.0008+i),2)*.55;l.position.y=.05+Math.sin(performance.now()*.001+i)*.008;}
    const active=new Set(),now=performance.now(),desiredTime=s.online?visualTime(s.time,s.receivedAt||now,now,s.speed):s.time;
    render.clock=advanceRenderClock(render.clock,desiredTime,s.time,(now-lastFrameAt)/1000,s.speed);const time=render.clock;
    const frameDelta=Math.min(.05,(now-lastFrameAt)/1000);lastFrameAt=now;
    for(const m of [...(s.mapMarches||s.marches),...(s.mapBeasts||[])]){
      active.add(m.id);const g=ensureArmy(m.id,m.beast,s.realmColors?.[m.owner]||'#8bdcba',m.troops||{});if(!g.userData.label){g.userData.label=document.createElement('button');g.userData.label.className='army-label';g.userData.label.onclick=e=>{e.stopPropagation();armySelection=m.id;onArmy(m.id);};labelsHost.append(g.userData.label);}const p=s.places.find(p=>p.id===m.target),origin=s.places.find(p=>p.id===(m.origin||s.home||'home'));
      const previousPosition=g.position.clone();const path=m.route||findRoute(origin,p,places,map);if(!path)continue;
      let t=m.battle||m.phase==='fallen'?1:THREE.MathUtils.clamp((time-m.start)/(m.end-m.start),0,1);if(m.returning)t=1-t;
      const point=m.encounter?.point||routePoint(path,t);const destination=new THREE.Vector3(m.beast&&m.battle?p.x:point.x,Math.abs(point.x-riverX(point.z))<3.6?1.02:Math.max(.8,height(point.x,point.z))+.1,m.beast&&m.battle?p.z:point.z);
      const defender=m.battle&&!m.beast&&armyModels.get('guard-'+p.id);
      if(g.userData.placed){const next=advanceVisualPosition(g.position,destination,s.speed===0?0:frameDelta,Math.max(.2,routeLength(path)/Math.max(1,m.duration))*(s.speed||1));g.position.set(next.x,next.y,next.z);}else g.position.copy(destination);g.userData.placed=true;g.userData.at=now;
      const label=g.userData.label;const labelText=`${m.beast?'Древний зверь':s.realmNames?.[m.owner]||'Армия'} · ${m.beast?'':Object.values(m.troops||{}).reduce((a,b)=>a+b,0)+' воинов · '}${m.battle||m.encounter?'БОЙ · нажмите':m.returning?'возвращение':Math.max(0,Math.ceil(m.end-s.time))+' сек.'}`;if(label.dataset.text!==labelText){label.dataset.text=labelText;label.textContent=labelText;}label.style.zIndex=m.battle||m.beast?'8':'4';label.style.borderColor=s.realmColors?.[m.owner]||'#e0c27c';projected.copy(g.position).add(new THREE.Vector3(0,m.beast?8:4.8,0)).project(camera);label.style.transform=labelTransform(projected,w,h,m.beast?165:0);label.hidden=projected.z>1||projected.z<-1;
      label.classList.toggle('in-battle',!!m.battle||!!m.encounter);label.classList.toggle('beast-label',!!m.beast);label.classList.toggle('selected',armySelection===m.id);label.title=label.textContent;
      if(m.beast){let hp=label.querySelector('.beast-health');if(!hp){hp=document.createElement('span');hp.className='beast-health';hp.innerHTML='<i></i>';label.append(hp);}hp.setAttribute('role','meter');hp.setAttribute('aria-label','Здоровье древнего зверя');hp.setAttribute('aria-valuemin','0');hp.setAttribute('aria-valuemax','2400');hp.setAttribute('aria-valuenow',String(m.health||0));hp.firstChild.style.width=(Math.max(0,Math.min(1,m.health/2400))*100)+'%';}
      if(!g.userData.selectionRing){const r=new THREE.Mesh(new THREE.RingGeometry(1.4,1.5,48),new THREE.MeshBasicMaterial({color:'#ffe2a2',transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));r.rotation.x=-Math.PI/2;r.position.y=.06;g.add(r);g.userData.selectionRing=r;}g.userData.selectionRing.visible=armySelection===m.id;
      const angle=defender?Math.atan2(defender.position.x-g.position.x,defender.position.z-g.position.z):point.angle+(m.returning?Math.PI:0);g.rotation.y+=Math.atan2(Math.sin(angle-g.rotation.y),Math.cos(angle-g.rotation.y))*(1-Math.exp(-8*frameDelta));
      for(const leg of g.userData.legs)leg.leg.rotation.x=m.battle?Math.sin(time*5+leg.phase)*.12:Math.sin(time*(m.beast?3:9)+leg.phase)*.45*leg.side;
      g.rotation.z=m.beast&&m.phase==='fallen'?1.3:0;
      if(m.beast&&!m.battle&&s.speed!==0&&now-(g.userData.dustAt||0)>450&&effects.length<80){g.userData.dustAt=now;for(const side of [-1,1]){const dust=new THREE.Mesh(geometries.sphere,dustMaterial);dust.position.set(g.position.x+side*1.5,g.position.y+.1,g.position.z);dust.scale.set(.35,.18,.35);scene.add(dust);effects.push({mesh:dust,end:now+700,dust:true,velocity:new THREE.Vector3(side*.009,.009,-.012)});}}
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

      if(s.speed!==0&&m.battle&&!m.beast&&now-(g.userData.sparkAt||0)>600&&effects.length<64){g.userData.sparkAt=now;for(let i=0;i<3;i++){const spark=mesh(scene,'sphere',i%2?'#e5bb73':'#d7d8bb',g.position.x+(Math.random()-.5)*2,g.position.y+.8,g.position.z+1.2,.035,.1,.035);effects.push({mesh:spark,end:now+300,velocity:new THREE.Vector3((Math.random()-.5)*.025,.012,(Math.random()-.5)*.025)});}}
      for(const f of g.userData.fighters){
        if((m.battle||m.encounter)&&['archer','crossbow','catapult'].includes(f.type)){if(!f.shot){f.shot=new THREE.Group();if(f.type==='catapult')mesh(f.shot,'sphere','#6c7369',0,0,0,.18,.18,.18);else{mesh(f.shot,'cylinder','#ae8855',0,0,0,.018,.65,.018).rotation.x=Math.PI/2;mesh(f.shot,'cone','#d3ddde',0,0,.38,.045,.14,.045).rotation.x=Math.PI/2;}g.add(f.shot);}const phase=(time*1.1+f.phase)%1;f.shot.position.set(f.group.position.x,1+Math.sin(phase*Math.PI)*1.5,f.group.position.z+phase*5);f.shot.rotation.x=-Math.cos(phase*Math.PI)*.5;f.shot.visible=phase>.12&&phase<.92;}}

      animateArmy(g,time,m.battle||m.encounter?'attack':s.speed===0?'idle':routeLength(path)/m.duration>.9?'run':'walk',Math.max(0,1-(now-(g.userData.hitAt||0))/500),g.position.distanceTo(previousPosition)/Math.max(.001,frameDelta),frameDelta);
      if(!m.beast){
        const targets=marchingTargets(path,t,Math.max(0,...g.userData.fighters.map(f=>f.slot))+1,m.returning,map);
        g.updateMatrixWorld(true);
        for(let i=0;i<g.userData.fighters.length;i++){
          const f=g.userData.fighters[i],target=targets[f.slot];
          const onBridge=Math.abs(target.x-riverX(target.z))<5&&Math.abs(Math.abs(target.z)-12)<.75;
          target.y=onBridge?.94:Math.max(.8,height(target.x,target.z))+.07;
          const prior=f.worldPosition,step=advanceVisualPosition(prior,target,s.speed===0?0:frameDelta,Math.max(.4,routeLength(path)/Math.max(1,m.duration))*(s.speed||1));
          f.worldPosition=step;const local=g.worldToLocal(new THREE.Vector3(step.x,step.y,step.z));f.group.position.copy(local);
          f.group.rotation.y=target.angle-g.rotation.y;
        }
      }
      g.userData.banner?.material.color.set(m.battle?'#ef9577':s.realmColors?.[m.owner]||'#8bdcba');
    }
    for(const p of s.places){const data=s.settlements?.[p.id],troops=data?.composition||p.garrison||{},count=Object.values(troops).reduce((a,b)=>a+b,0),id='guard-'+p.id;if(count>0){active.add(id);const g=ensureArmy(id,false,p.color,troops);g.position.set(p.x+Math.sign(p.x||1)*3.8,height(p.x+Math.sign(p.x||1)*3.8,p.z+(p.z>0?-7.5:7.5))+.07,p.z+(p.z>0?-7.5:7.5));g.scale.setScalar(.78);g.userData.banner?.material.color.set(p.color);
      if(!g.userData.label){g.userData.label=document.createElement('button');g.userData.label.className='army-label guard-label';g.userData.label.onclick=e=>{e.stopPropagation();armySelection=id;onArmy(id);};labelsHost.append(g.userData.label);}g.userData.label.textContent=`⚔ ${count}`;g.userData.label.title=`Гарнизон ${p.name}: ${count} воинов, дух ${Math.round(data?.morale??80)}. Нажмите для состава.`;projected.copy(g.position).add(new THREE.Vector3(0,2.8,0)).project(camera);g.userData.label.style.transform=labelTransform(projected,w,h);g.userData.label.hidden=projected.z>1||projected.z<-1;g.userData.label.classList.toggle('selected',selection===p.id||armySelection===id);
      g.userData.selectionRing.visible=armySelection===id;g.rotation.y=p.z>0?Math.PI:0;const enemy=(s.mapMarches||[]).find(m=>m.battle&&m.target===p.id);const enemyModel=enemy&&armyModels.get(enemy.id);if(enemyModel)g.rotation.y=Math.atan2(enemyModel.position.x-g.position.x,enemyModel.position.z-g.position.z);const fighting=(p.guardHitAt||0)>s.time-1&&(p.guardHitAt||0)>0||(s.mapMarches||[]).some(m=>m.battle&&m.target===p.id)||(s.mapBeasts||[]).some(b=>b.battle&&b.target===p.id);for(const f of g.userData.fighters){f.baseZ=Math.abs(f.baseZ);if(f.rigged)f.group.position.z=f.baseZ;}animateArmy(g,time,fighting?'attack':'idle',Math.max(0,1-(now-(g.userData.hitAt||0))/500));for(const f of g.userData.fighters){const foot=g.localToWorld(new THREE.Vector3(f.group.position.x,0,f.group.position.z));f.group.position.y=(height(foot.x,foot.z)+.06-g.position.y)/.78;}
    }}
    for(const puff of smoke){const phase=(time*.7+puff.phase*.25)%1;if(puff.fire)puff.mesh.scale.y=.6+Math.sin(time*8+puff.phase)*.15;else{puff.mesh.position.y=puff.base.y+phase*1.4;puff.mesh.position.x=puff.base.x+phase*.6;puff.mesh.scale.setScalar(.2+phase*.4);}}
    for(const v of settlements.values()){const shake=Math.max(0,1-(now-(v.impactAt||0))/500);v.group.rotation.z=Math.sin(now*.07)*.035*shake;}
    for(const e of effects){if(e.rigDeath)animateRig(e.mesh,'death',frameDelta);if(e.velocity){e.mesh.position.addScaledVector(e.velocity,frameDelta*60);if(e.dust)e.mesh.scale.multiplyScalar(1+frameDelta*.8);else e.velocity.y-=.09*frameDelta;e.mesh.rotation.x+=4.8*frameDelta;}if(e.fall){const t=Math.min(1,(now-e.start)/650);e.mesh.rotation.x=e.baseX+t*Math.PI/2;e.mesh.position.y=THREE.MathUtils.lerp(e.baseY,e.ground,t);e.mesh.scale.setScalar(Math.max(0,Math.min(1,(e.end-now)/400)));}}
    for(let i=effects.length-1;i>=0;i--)if(effects[i].end<now){const e=effects[i];scene.remove(e.mesh);releaseAsset(e.mesh);if(e.fall||e.rigDeath)e.mesh.traverse(o=>{if(o.isMesh&&!o.userData.sharedAsset&&!Object.values(geometries).includes(o.geometry))o.geometry.dispose();});effects.splice(i,1);}
    for(const [id,g]of armyModels)if(!active.has(id))removeArmy(id,g);
    renderer.render(scene,camera);
  }
  render();
  return {
    select(id){selection=id;armySelection=null;},
    focus(id='home'){const p=getState().places.find(p=>p.id===id);const offset=camera.position.clone().sub(controls.target);controls.target.set(p.x,0,p.z);camera.position.copy(controls.target).add(offset);controls.update();},
    zoom(factor){const delta=camera.position.clone().sub(controls.target);delta.multiplyScalar(factor);delta.clampLength(28,76);camera.position.copy(controls.target).add(delta);controls.update();},
    borders(show){borderGroup.visible=show;},
    dispose(){disposed=true;cancelAnimationFrame(frameId);controls.dispose();renderer.dispose();releaseAsset(scene);const geometriesToFree=new Set(),materialsToFree=new Set([dustMaterial]);scene.traverse(o=>{if(o.isMesh&&!o.userData.sharedAsset){geometriesToFree.add(o.geometry);materialsToFree.add(o.material);}});for(const g of geometriesToFree)g.dispose();for(const m of materialsToFree)m.dispose();window.removeEventListener('resize',resize);},
  };
}



