import {readFile,writeFile} from 'node:fs/promises';

const filePath=process.argv[2]??'src/assets/maps/food-experience-map.glb';
const source=await readFile(filePath);
const jsonLength=source.readUInt32LE(12);
const json=JSON.parse(source.toString('utf8',20,20+jsonLength).trimEnd());
const tableCenters=[[-1.7,-.5],[2,1.15]];
let changed=0;

for(const node of json.nodes??[]){
  if(!/^Cafe chair back(?:\.\d+)?$/.test(node.name??'')||!node.translation)continue;
  const [x,y,z]=node.translation;
  const center=tableCenters.reduce((best,current)=>
    Math.hypot(x-current[0],z-current[1])<Math.hypot(x-best[0],z-best[1])?current:best
  );
  const dx=x-center[0],dz=z-center[1],length=Math.hypot(dx,dz);
  const outwardDistance=length+.4;
  node.translation=[center[0]+dx/length*outwardDistance,y,center[1]+dz/length*outwardDistance];
  changed++;
}
if(changed!==8)throw new Error(`Expected 8 chair backs, changed ${changed}`);

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
console.log(`Moved ${changed} chair backs to the outside so the seats face their tables.`);
