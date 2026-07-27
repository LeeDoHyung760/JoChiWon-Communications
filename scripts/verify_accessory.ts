import fs from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyColorsToThreeScene } from '../src/utils/modelColorizer';

(globalThis as any).ProgressEvent ??= class ProgressEvent {};

const bytes=fs.readFileSync('src/assets/characters/cloths_rig.glb');
const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer;
const gltf=await new Promise<any>((resolve,reject)=>new GLTFLoader().parse(buffer,'',resolve,reject));
applyColorsToThreeScene(gltf.scene,'cloths',{
  hair:'hair-original',
  face:'face-smile',
  top:'top-original',
  bottom:'bottom-original',
  shoes:'shoes-original',
  accessory:'accessory-none'
});
const accessoryMeshes=['shirt1_1001','tripo_part_2'].map(name=>gltf.scene.getObjectByName(name));
if(accessoryMeshes.some(mesh=>!mesh||mesh.visible))throw new Error(`Accessory hide failed: ${accessoryMeshes.map(mesh=>`${mesh?.name}:${mesh?.visible}`).join(', ')}`);
console.log('Accessory hide verified:',accessoryMeshes.map(mesh=>`${mesh!.name}:${mesh!.visible}`).join(', '));
