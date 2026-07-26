import { GREENHOUSE_PLANT_TOTAL,greenhousePlantById,type PlantDefinition } from '../data/greenhouse-plants';

export const GREENHOUSE_EMOTIONS=[
  {id:'희망',icon:'🌱'},{id:'설렘',icon:'✨'},{id:'평온',icon:'🍃'},
  {id:'따뜻함',icon:'☀️'},{id:'신비로움',icon:'🔮'},{id:'그리움',icon:'🌙'},
] as const;
export type GreenhouseEmotion=typeof GREENHOUSE_EMOTIONS[number]['id'];

export interface CollectedPlant{
  plantId:string;
  collectedAt:string;
  selectedEmotion:GreenhouseEmotion;
  aiMessage:string;
  userMemo?:string;
}
export interface MemoryLeaf{
  id:string;
  createdAt:string;
  originalText:string;
  aiLetter:string;
  dominantEmotion:string;
  collectedPlantIds:string[];
}
export interface GreenhouseProgress{
  collected:CollectedPlant[];
  memoryLeaves:MemoryLeaf[];
  introSeen:boolean;
}

const VERSION=1;
const emptyProgress=():GreenhouseProgress=>({collected:[],memoryLeaves:[],introSeen:false});
const safeEmotion=(value:unknown):value is GreenhouseEmotion=>GREENHOUSE_EMOTIONS.some(item=>item.id===value);

export function parseGreenhouseProgress(raw:string|null):GreenhouseProgress{
  if(!raw)return emptyProgress();
  try{
    const parsed=JSON.parse(raw) as {version?:unknown;data?:Partial<GreenhouseProgress>};
    const source=parsed.version===VERSION?parsed.data:parsed as Partial<GreenhouseProgress>;
    const collected=Array.isArray(source?.collected)?source.collected.filter((item):item is CollectedPlant=>{
      if(!item||typeof item!=='object')return false;
      const value=item as Partial<CollectedPlant>;
      return typeof value.plantId==='string'&&greenhousePlantById.has(value.plantId)&&typeof value.collectedAt==='string'&&safeEmotion(value.selectedEmotion)&&typeof value.aiMessage==='string';
    }):[];
    const unique=[...new Map(collected.map(item=>[item.plantId,item])).values()];
    const memoryLeaves=Array.isArray(source?.memoryLeaves)?source.memoryLeaves.filter((item):item is MemoryLeaf=>{
      if(!item||typeof item!=='object')return false;
      const value=item as Partial<MemoryLeaf>;
      return typeof value.id==='string'&&typeof value.createdAt==='string'&&typeof value.originalText==='string'&&typeof value.aiLetter==='string'&&typeof value.dominantEmotion==='string'&&Array.isArray(value.collectedPlantIds);
    }):[];
    return {collected:unique,memoryLeaves,introSeen:source?.introSeen===true};
  }catch{return emptyProgress()}
}

export class GreenhouseProgressService{
  private readonly key:string;
  constructor(private storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>,userKey:string){
    this.key=`greenhouse-progress-v${VERSION}:${userKey.trim().toLowerCase()||'guest'}`;
  }
  load(){return parseGreenhouseProgress(this.storage.getItem(this.key))}
  save(progress:GreenhouseProgress){this.storage.setItem(this.key,JSON.stringify({version:VERSION,data:progress}));return progress}
  collect(progress:GreenhouseProgress,plantId:string,emotion:GreenhouseEmotion,aiMessage:string){
    const existing=progress.collected.find(item=>item.plantId===plantId);
    const next:CollectedPlant={plantId,collectedAt:existing?.collectedAt??new Date().toISOString(),selectedEmotion:emotion,aiMessage,userMemo:existing?.userMemo};
    return this.save({...progress,collected:[...progress.collected.filter(item=>item.plantId!==plantId),next]});
  }
  addMemoryLeaf(progress:GreenhouseProgress,leaf:MemoryLeaf){return this.save({...progress,memoryLeaves:[leaf,...progress.memoryLeaves]})}
  deleteMemoryLeaf(progress:GreenhouseProgress,id:string){return this.save({...progress,memoryLeaves:progress.memoryLeaves.filter(item=>item.id!==id)})}
  reset(){this.storage.removeItem(this.key);return emptyProgress()}
}

export const greenhouseCompletion=(progress:GreenhouseProgress)=>({
  count:progress.collected.length,
  total:GREENHOUSE_PLANT_TOTAL,
  unlocked:progress.collected.length>=GREENHOUSE_PLANT_TOTAL,
  ratio:Math.min(1,progress.collected.length/GREENHOUSE_PLANT_TOTAL),
});
export const greenhouseInputLocked=(activeView:string|null)=>activeView!==null;

export function dominantEmotion(collected:CollectedPlant[]){
  if(!collected.length)return '평온';
  const counts=new Map<string,number>();
  collected.forEach(item=>counts.set(item.selectedEmotion,(counts.get(item.selectedEmotion)??0)+1));
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ko'))[0][0];
}

export function createFallbackPlantMessage(plant:PlantDefinition){
  return plant.observationGuide??`${plant.observationPoint??plant.shortDescription}을 천천히 살펴보세요. 꽃과 잎의 모양이 주변 부분과 어떻게 다른지 비교해보세요.`;
}

export function createFallbackMemoryLetter(userText:string,collected:CollectedPlant[]){
  const emotion=dominantEmotion(collected);
  const names=collected.slice(0,2).map(item=>greenhousePlantById.get(item.plantId)?.displayName).filter(Boolean).join('와 ');
  const emotions=[...new Set(collected.slice(0,2).map(item=>item.selectedEmotion))].join('과 ');
  const text=normalizeMemoryText(userText.replace(/^[^:]{1,40}:\s*/,''));
  return `오늘 ${names||'수목원의 식물'}을 발견하며 ${emotions||emotion}의 마음을 기록했습니다.\n\n“${text}”라는 오늘의 마음이 내일의 작은 용기가 되기를 바랍니다.\n\n다음에 기억나무를 다시 찾았을 때, 오늘의 다짐을 웃으며 꺼내볼 수 있기를 바랍니다.`;
}

export function normalizeMemoryText(value:string){
  let text=value.trim().replace(/\s+/g,' ');
  text=text.replace(/^([가-힣]{2,4}야)(?=(오늘|내일|다음|우리|항상|힘내|화이팅))/,'$1, ');
  text=text.replace(/(오늘|내일|다음)(?=(도|은|을|에))/g,'$1');
  if(text&&!/[.!?。]$/.test(text))text+='.';
  return text;
}
