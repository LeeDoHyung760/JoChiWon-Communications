import fs from 'node:fs';
import path from 'node:path';

export interface PublicGreenhouseMemory{
  id:string;
  nickname:string;
  createdAt:string;
  originalText:string;
  aiLetter:string;
  dominantEmotion:string;
  natureType?:string;
  representativePlant?:string;
  plantNames:string[];
}

const dataDirectory=path.basename(process.cwd()).toLowerCase()==='server'?process.cwd():path.resolve(process.cwd(),'server');
const dataFile=path.resolve(dataDirectory,'greenhouse-public-memories.json');

function text(value:unknown,max:number){
  return typeof value==='string'?value.trim().slice(0,max):'';
}

function parse(value:unknown):PublicGreenhouseMemory|undefined{
  if(!value||typeof value!=='object')return;
  const source=value as Record<string,unknown>;
  const id=text(source.id,80),nickname=text(source.nickname,20),createdAt=text(source.createdAt,40);
  const originalText=text(source.originalText,500),aiLetter=text(source.aiLetter,1800),dominantEmotion=text(source.dominantEmotion,30);
  if(!id||!nickname||!createdAt||!originalText||!aiLetter||!dominantEmotion)return;
  const plantNames=Array.isArray(source.plantNames)?source.plantNames.map(item=>text(item,80)).filter(Boolean).slice(0,14):[];
  const natureType=text(source.natureType,50)||undefined,representativePlant=text(source.representativePlant,80)||undefined;
  return {id,nickname,createdAt,originalText,aiLetter,dominantEmotion,natureType,representativePlant,plantNames};
}

class PublicMemoryStore{
  private records:PublicGreenhouseMemory[]=[];
  constructor(){
    try{
      const saved=JSON.parse(fs.readFileSync(dataFile,'utf8')) as unknown;
      this.records=Array.isArray(saved)?saved.flatMap(item=>{const record=parse(item);return record?[record]:[]}).slice(-200):[];
    }catch{/* Public memories begin empty on a new server. */}
  }
  list(limit=60){return [...this.records].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,Math.max(1,Math.min(100,limit)))}
  add(value:unknown){
    const record=parse(value);
    if(!record)return;
    this.records=[...this.records.filter(item=>item.id!==record.id),record].slice(-200);
    try{fs.writeFileSync(dataFile,JSON.stringify(this.records,null,2))}catch(error){console.error('[public greenhouse memory persistence failed]',error)}
    return record;
  }
}

export const publicMemoryStore=new PublicMemoryStore();
