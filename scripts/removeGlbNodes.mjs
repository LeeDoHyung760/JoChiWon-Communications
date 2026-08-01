import {readFile,writeFile} from 'node:fs/promises';

const [, , filePath, ...targetNames]=process.argv;
if(!filePath||!targetNames.length)throw new Error('Usage: node scripts/removeGlbNodes.mjs <file.glb> <node-name> [...]');

const source=await readFile(filePath);
if(source.toString('ascii',0,4)!=='glTF')throw new Error(`${filePath} is not a GLB file`);
const version=source.readUInt32LE(4);
const jsonLength=source.readUInt32LE(12);
const jsonType=source.readUInt32LE(16);
if(version!==2||jsonType!==0x4e4f534a)throw new Error('Only GLB 2.0 JSON-first files are supported');

const json=JSON.parse(source.toString('utf8',20,20+jsonLength).trimEnd());
const nodes=json.nodes??[];
const remove=new Set();
const collect=index=>{
  if(remove.has(index))return;
  remove.add(index);
  for(const child of nodes[index]?.children??[])collect(child);
};
nodes.forEach((node,index)=>{if(targetNames.includes(node.name))collect(index)});
const missing=targetNames.filter(name=>!nodes.some(node=>node.name===name));
if(missing.length)throw new Error(`Node not found: ${missing.join(', ')}`);

const remap=new Map();
const retained=[];
nodes.forEach((node,index)=>{if(!remove.has(index)){remap.set(index,retained.length);retained.push(node)}});
const mapIndex=index=>remap.get(index);
for(const node of retained){
  if(node.children)node.children=node.children.filter(index=>!remove.has(index)).map(mapIndex);
}
for(const scene of json.scenes??[]){
  if(scene.nodes)scene.nodes=scene.nodes.filter(index=>!remove.has(index)).map(mapIndex);
}
for(const skin of json.skins??[]){
  if(skin.joints)skin.joints=skin.joints.filter(index=>!remove.has(index)).map(mapIndex);
  if(skin.skeleton!==undefined)skin.skeleton=remove.has(skin.skeleton)?undefined:mapIndex(skin.skeleton);
}
for(const animation of json.animations??[]){
  animation.channels=(animation.channels??[]).filter(channel=>channel.target?.node===undefined||!remove.has(channel.target.node));
  for(const channel of animation.channels??[]){
    if(channel.target?.node!==undefined)channel.target.node=mapIndex(channel.target.node);
  }
}
json.nodes=retained;

let jsonBytes=Buffer.from(JSON.stringify(json));
const padding=(4-jsonBytes.length%4)%4;
if(padding)jsonBytes=Buffer.concat([jsonBytes,Buffer.alloc(padding,0x20)]);
const remainingChunks=source.subarray(20+jsonLength);
const output=Buffer.alloc(20+jsonBytes.length+remainingChunks.length);
source.copy(output,0,0,12);
output.writeUInt32LE(output.length,8);
output.writeUInt32LE(jsonBytes.length,12);
output.writeUInt32LE(0x4e4f534a,16);
jsonBytes.copy(output,20);
remainingChunks.copy(output,20+jsonBytes.length);
await writeFile(filePath,output);
console.log(JSON.stringify({filePath,removed:[...remove].map(index=>nodes[index]?.name),nodeCountBefore:nodes.length,nodeCountAfter:retained.length}));
