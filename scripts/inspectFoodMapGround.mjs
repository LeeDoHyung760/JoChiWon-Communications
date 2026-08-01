import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

const bytes=await readFile('src/assets/maps/food-experience-map.glb');
const gltf=await new Promise((resolve,reject)=>new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',resolve,reject));
const model=gltf.scene;
model.rotation.y=Math.PI;model.updateMatrixWorld(true);
const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
const WORLD_WIDTH=2400,WORLD_HEIGHT=1900,GROUND_PROJECTION=.72;
const scale=Math.min((WORLD_WIDTH-180)/size.x,(WORLD_HEIGHT-120)/size.z)*1.6,depthScale=scale/GROUND_PROJECTION;
model.position.set(WORLD_WIDTH/2-center.x*scale,-bounds.min.y*scale,WORLD_HEIGHT/(2*GROUND_PROJECTION)-center.z*depthScale);
model.scale.set(scale,scale,depthScale);model.updateMatrixWorld(true);
const raycaster=new THREE.Raycaster(new THREE.Vector3(1200,1200,WORLD_HEIGHT/2+(1820-WORLD_HEIGHT/2)/GROUND_PROJECTION),new THREE.Vector3(0,-1,0));
const meshes=[];model.traverse(object=>{if(object.isMesh)meshes.push(object)});
const allowed=['Map_island','Grass_island','Central_plaza','Plaza_paving_ring','North_walkway','South_walkway'];
const hits=raycaster.intersectObjects(meshes.filter(mesh=>allowed.some(prefix=>mesh.name.startsWith(prefix))),false);
console.log(hits.map(hit=>({name:hit.object.name,height:Number(hit.point.y.toFixed(3)),normalY:Number(hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).y.toFixed(3))})));
const plaza=meshes.find(mesh=>mesh.name==='Central_plaza');
const plazaBounds=new THREE.Box3().setFromObject(plaza),plazaCenter=plazaBounds.getCenter(new THREE.Vector3());
const plazaWorldZ=WORLD_HEIGHT/2+(plazaCenter.z-WORLD_HEIGHT/2)*GROUND_PROJECTION;
const plazaRay=new THREE.Raycaster(new THREE.Vector3(plazaCenter.x,1200,plazaCenter.z),new THREE.Vector3(0,-1,0));
console.log({plazaCenter:{x:plazaCenter.x,z:plazaWorldZ},plazaBounds:{minY:plazaBounds.min.y,maxY:plazaBounds.max.y},hits:plazaRay.intersectObject(plaza,false).map(hit=>({height:hit.point.y}))});
const safe=[];
for(const radius of [0,80,140,200,260,320])for(let index=0;index<(radius?16:1);index++){
  const angle=index/16*Math.PI*2,x=plazaCenter.x+Math.cos(angle)*radius,worldZ=plazaWorldZ+Math.sin(angle)*radius;
  const sceneZ=WORLD_HEIGHT/2+(worldZ-WORLD_HEIGHT/2)/GROUND_PROJECTION;
  const down=new THREE.Raycaster(new THREE.Vector3(x,1200,sceneZ),new THREE.Vector3(0,-1,0));
  const ground=down.intersectObject(plaza,false).find(hit=>hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).y>.7);
  if(!ground)continue;
  const up=new THREE.Raycaster(new THREE.Vector3(x,ground.point.y+4,sceneZ),new THREE.Vector3(0,1,0),4,220);
  if(!up.intersectObjects(meshes,false).length)safe.push({x:Math.round(x),z:Math.round(worldZ),height:Number(ground.point.y.toFixed(2))});
}
console.log({safeCentralPlazaSpawns:safe.slice(0,12)});
