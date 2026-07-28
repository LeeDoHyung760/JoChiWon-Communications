import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const [, ,inputPath,outputPath,maxSizeArgument='2048']=process.argv;
const maxSize=Number(maxSizeArgument);
if(!inputPath||!outputPath||!Number.isFinite(maxSize)||maxSize<64){
  console.error('Usage: node scripts/resizeGlbTextures.mjs <input.glb> <output.glb> [max-size]');
  process.exit(1);
}

const source=fs.readFileSync(inputPath);
if(source.toString('ascii',0,4)!=='glTF'||source.readUInt32LE(4)!==2)throw new Error('Only GLB v2 files are supported.');
const jsonLength=source.readUInt32LE(12);
const jsonStart=20,jsonEnd=jsonStart+jsonLength;
const document=JSON.parse(source.subarray(jsonStart,jsonEnd).toString('utf8'));
const binaryHeader=jsonEnd,binaryLength=source.readUInt32LE(binaryHeader);
const binaryStart=binaryHeader+8,binary=source.subarray(binaryStart,binaryStart+binaryLength);
const imageViewIndexes=new Map(
  (document.images??[])
    .filter(image=>Number.isInteger(image.bufferView)&&image.mimeType==='image/jpeg')
    .map((image,index)=>[image.bufferView,index]),
);
const temporaryDirectory=fs.mkdtempSync(path.join(os.tmpdir(),'resize-glb-textures-'));

try{
  const replacements=new Map();
  for(const [bufferViewIndex,imageIndex] of imageViewIndexes){
    const view=document.bufferViews[bufferViewIndex];
    const original=binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
    const inputImage=path.join(temporaryDirectory,`image-${imageIndex}-original.jpg`);
    const outputImage=path.join(temporaryDirectory,`image-${imageIndex}-${maxSize}.jpg`);
    fs.writeFileSync(inputImage,original);
    const result=spawnSync('/usr/bin/sips',['-Z',String(maxSize),inputImage,'--out',outputImage],{encoding:'utf8'});
    if(result.status!==0)throw new Error(result.stderr||result.stdout||`sips failed for image ${imageIndex}`);
    replacements.set(bufferViewIndex,fs.readFileSync(outputImage));
  }

  const chunks=[];
  let byteOffset=0;
  document.bufferViews.forEach((view,index)=>{
    const bytes=replacements.get(index)??binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
    const padding=(4-byteOffset%4)%4;
    if(padding){chunks.push(Buffer.alloc(padding));byteOffset+=padding}
    view.byteOffset=byteOffset;
    view.byteLength=bytes.length;
    chunks.push(bytes);
    byteOffset+=bytes.length;
  });
  const binaryPadding=(4-byteOffset%4)%4;
  if(binaryPadding){chunks.push(Buffer.alloc(binaryPadding));byteOffset+=binaryPadding}
  const nextBinary=Buffer.concat(chunks,byteOffset);
  document.buffers[0].byteLength=nextBinary.length;

  const jsonBytes=Buffer.from(JSON.stringify(document));
  const jsonPadding=(4-jsonBytes.length%4)%4;
  const paddedJson=Buffer.concat([jsonBytes,Buffer.alloc(jsonPadding,0x20)]);
  const header=Buffer.alloc(12);
  header.write('glTF',0,'ascii');header.writeUInt32LE(2,4);
  header.writeUInt32LE(12+8+paddedJson.length+8+nextBinary.length,8);
  const jsonChunkHeader=Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(paddedJson.length,0);jsonChunkHeader.writeUInt32LE(0x4e4f534a,4);
  const binaryChunkHeader=Buffer.alloc(8);
  binaryChunkHeader.writeUInt32LE(nextBinary.length,0);binaryChunkHeader.writeUInt32LE(0x004e4942,4);
  fs.writeFileSync(outputPath,Buffer.concat([header,jsonChunkHeader,paddedJson,binaryChunkHeader,nextBinary]));
  console.log(`Resized ${replacements.size} embedded JPEG textures to ${maxSize}px: ${outputPath}`);
}finally{
  fs.rmSync(temporaryDirectory,{recursive:true,force:true});
}
