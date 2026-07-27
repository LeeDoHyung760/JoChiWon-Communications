import fs from 'node:fs';
import path from 'node:path';
import { Box3, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

globalThis.ProgressEvent ??= class ProgressEvent {};
globalThis.self ??= globalThis;
globalThis.createImageBitmap ??= async()=>({width:1,height:1,close(){}});
const directory=path.resolve('src/assets/characters');
const files=fs.readdirSync(directory).filter(file=>file.endsWith('.glb')).sort();

function parseGlbJson(buffer){
  if(buffer.toString('utf8',0,4)!=='glTF'||buffer.readUInt32LE(4)!==2)throw new Error('Expected a glTF 2.0 binary');
  const jsonLength=buffer.readUInt32LE(12);
  return JSON.parse(buffer.toString('utf8',20,20+jsonLength));
}
function accessorDuration(json,animation){
  let duration=0;
  for(const sampler of animation.samplers??[]){const accessor=json.accessors?.[sampler.input];if(accessor?.max?.[0]>duration)duration=accessor.max[0]}
  return duration;
}
function accessorRange(json,accessorIndex){
  const accessor=json.accessors?.[accessorIndex];
  return accessor?.min&&accessor?.max?{min:accessor.min,max:accessor.max}:undefined;
}
function load(arrayBuffer){return new Promise((resolve,reject)=>new GLTFLoader().parse(arrayBuffer,'',resolve,reject))}

for(const file of files){
  const filePath=path.join(directory,file),buffer=fs.readFileSync(filePath),json=parseGlbJson(buffer);
  const arrayBuffer=buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);
  const gltf=await load(arrayBuffer);gltf.scene.updateMatrixWorld(true);
  const box=new Box3().setFromObject(gltf.scene),size=box.getSize(new Vector3()),center=box.getCenter(new Vector3());
  const nodes=[],meshes=[],bones=[],skinnedMeshes=[];
  gltf.scene.traverse(object=>{nodes.push(object.name||'(unnamed)');if(object.isMesh)meshes.push(object.name||'(unnamed)');if(object.isBone)bones.push(object.name||'(unnamed)');if(object.isSkinnedMesh)skinnedMeshes.push(object.name||'(unnamed)')});
  console.log(`\n[GLB] ${path.relative(process.cwd(),filePath).replaceAll('\\','/')}`);
  console.log(`  scene: ${gltf.scene.name||'(unnamed)'}`);
  console.log(`  root: position=${gltf.scene.position.toArray()} rotation=${gltf.scene.rotation.toArray().slice(0,3)} scale=${gltf.scene.scale.toArray()}`);
  console.log(`  nodes (${nodes.length}): ${nodes.join(', ')}`);
  console.log(`  meshes (${meshes.length}): ${meshes.join(', ')}`);
  console.log(`  skeleton: ${bones.length>0?'yes':'no'}, bones=${bones.length}, skinnedMeshes=${skinnedMeshes.length}`);
  console.log(`  bounds: min=${box.min.toArray()} max=${box.max.toArray()} size=${size.toArray()} center=${center.toArray()} footY=${box.min.y}`);
  console.log(`  animations (${gltf.animations.length}):`);
  for(const [index,clip] of gltf.animations.entries()){
    const animation=json.animations?.[index],positionTracks=(animation?.channels??[]).filter(channel=>channel.target.path==='translation');
    const rootTracks=positionTracks.map(channel=>({node:json.nodes?.[channel.target.node]?.name??String(channel.target.node),range:accessorRange(json,animation.samplers[channel.sampler].output)})).filter(track=>['Root','Armature'].includes(track.node));
    console.log(`    - ${clip.name}: duration=${accessorDuration(json,animation).toFixed(3)}s tracks=${clip.tracks.length} positionTracks=${positionTracks.length}`);
    console.log(`      rootPositionTracks=${rootTracks.length?JSON.stringify(rootTracks):'none'}`);
    for(const track of clip.tracks.filter(track=>/(^|\.)Root\.position$/.test(track.name))){
      const values=track.values,axes=[0,1,2].map(axis=>{const samples=[];for(let i=axis;i<values.length;i+=3)samples.push(values[i]);return {min:Math.min(...samples),max:Math.max(...samples),delta:samples.at(-1)-samples[0]}});
      console.log(`      rootMotion ${track.name}: x=${JSON.stringify(axes[0])} y=${JSON.stringify(axes[1])} z=${JSON.stringify(axes[2])}`);
    }
  }
}
