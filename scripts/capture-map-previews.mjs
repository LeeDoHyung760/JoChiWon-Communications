import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const outputDirectory=path.join(root,'src/assets/maps/previews');
const models=[
  'sejong-lake-park',
  'new-beartree',
  'park-landscape',
  'garden',
  'new-campus-floor',
  'sejong-gov',
];

const pages=await fetch('http://127.0.0.1:9222/json').then(response=>response.json());
const page=pages.find(item=>item.type==='page');
if(!page)throw new Error('Chrome page target not found');
const socket=new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{
  socket.addEventListener('open',resolve,{once:true});
  socket.addEventListener('error',reject,{once:true});
});

let sequence=0;
const pending=new Map();
socket.addEventListener('message',event=>{
  const message=JSON.parse(event.data);
  if(!message.id)return;
  const request=pending.get(message.id);
  if(!request)return;
  pending.delete(message.id);
  if(message.error)request.reject(new Error(message.error.message));
  else request.resolve(message.result);
});
const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++sequence;
  pending.set(id,{resolve,reject});
  socket.send(JSON.stringify({id,method,params}));
});
const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));

await mkdir(outputDirectory,{recursive:true});
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
for(const model of models){
  const url=`http://127.0.0.1:5173/map-preview-render.html?model=${model}.glb`;
  await send('Page.navigate',{url});
  let ready=false;
  for(let attempt=0;attempt<120;attempt++){
    await wait(250);
    const result=await send('Runtime.evaluate',{expression:"document.body?.dataset.ready==='true'",returnByValue:true});
    if(result.result.value){ready=true;break}
  }
  if(!ready)throw new Error(`${model} did not finish loading`);
  await wait(350);
  const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile(path.join(outputDirectory,`${model}.png`),Buffer.from(screenshot.data,'base64'));
  process.stdout.write(`Captured ${model}.png\n`);
}
socket.close();
