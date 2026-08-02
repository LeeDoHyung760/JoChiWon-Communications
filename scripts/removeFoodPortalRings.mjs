import fs from 'node:fs';

const modelPath=new URL('../src/assets/maps/food-experience-map.glb',import.meta.url);
const source=fs.readFileSync(modelPath);

if(source.toString('ascii',0,4)!=='glTF'||source.readUInt32LE(4)!==2){
  throw new Error('Expected a GLB 2.0 file.');
}

const chunks=[];
for(let offset=12;offset<source.length;){
  const length=source.readUInt32LE(offset),type=source.readUInt32LE(offset+4);
  chunks.push({type,data:source.subarray(offset+8,offset+8+length)});
  offset+=8+length;
}

const jsonChunk=chunks.find(chunk=>chunk.type===0x4e4f534a);
if(!jsonChunk)throw new Error('GLB JSON chunk is missing.');

const document=JSON.parse(jsonChunk.data.toString('utf8').trimEnd());
const ringNames=new Set(['Portal ring','Portal ring.001']);
const rings=(document.nodes??[]).filter(node=>ringNames.has(node.name));
if(rings.length!==2)throw new Error(`Expected 2 portal rings, found ${rings.length}.`);
for(const ring of rings)delete ring.mesh;

const json=Buffer.from(JSON.stringify(document),'utf8');
const paddedJson=Buffer.alloc(Math.ceil(json.length/4)*4,0x20);
json.copy(paddedJson);
jsonChunk.data=paddedJson;

const totalLength=12+chunks.reduce((total,chunk)=>total+8+chunk.data.length,0);
const output=Buffer.alloc(totalLength);
output.write('glTF',0,'ascii');
output.writeUInt32LE(2,4);
output.writeUInt32LE(totalLength,8);
let offset=12;
for(const chunk of chunks){
  output.writeUInt32LE(chunk.data.length,offset);
  output.writeUInt32LE(chunk.type,offset+4);
  chunk.data.copy(output,offset+8);
  offset+=8+chunk.data.length;
}

fs.writeFileSync(modelPath,output);
console.log(`Removed GLB meshes from: ${[...ringNames].join(', ')}`);
