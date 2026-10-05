import * as THREE from 'three';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';
import {clone} from './vendor/utils/SkeletonUtils.js';

const catalog=new Map();
export const hasAsset=name=>catalog.has(name);
export const assetNames=['knight','beast','house','barracks','stable','academy','market','lumber','quarry','shrine','archery','mill','cart','tent','ruins','mountain','knight_banner','rubble','hunting','spoils','mercenaries','excavation','archive','runeforge'];
export async function loadAssets(){
 const loader=new GLTFLoader();
 await Promise.all(assetNames.map(async name=>{
  const gltf=await loader.loadAsync(new URL(`./assets/${name}.glb`,import.meta.url).href);
  gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.userData.sharedAsset=true;}});
  catalog.set(name,gltf);
 }));
}
export function cloneAsset(name,color){
 const source=catalog.get(name);if(!source)return null;
 const root=clone(source.scene);
 if(color)root.traverse(o=>{if(o.isMesh){const recolor=m=>{if(m.name!=='cloth')return m;const own=m.clone();own.map=null;own.color.set(color);own.userData.owned=true;return own;};o.material=Array.isArray(o.material)?o.material.map(recolor):recolor(o.material);}});
 if(source.animations.length){root.userData.mixer=new THREE.AnimationMixer(root);root.userData.actions=Object.fromEntries(source.animations.map(clip=>[clip.name,root.userData.mixer.clipAction(clip)]));}
 return root;
}
export function releaseAsset(root){
 const materials=new Set();root.traverse(o=>{if(o.userData.mixer){o.userData.mixer.stopAllAction();o.userData.mixer.uncacheRoot(o);}if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.userData.owned)materials.add(m);});for(const m of materials)m.dispose();
}
export function animateRig(root,mode,dt,speed=1){
 const data=root.userData;if(!data.mixer)return;
 const action=data.actions[mode]||data.actions.idle;
 if(data.mode!==mode){const previous=data.actions[data.mode];action.reset().play();if(mode==='death'||mode==='hit'){action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;}else action.setLoop(THREE.LoopRepeat,Infinity);if(previous)action.crossFadeFrom(previous,.18,true);data.mode=mode;}
 action.timeScale=mode==='walk'||mode==='run'?Math.max(.08,Math.min(3,speed)):1;
 data.mixer.update(Math.min(.08,dt));
}
