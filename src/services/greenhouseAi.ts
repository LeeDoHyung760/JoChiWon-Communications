import { API_BASE_URL } from '../config/api';
import { greenhousePlants,type PlantDefinition } from '../data/greenhouse-plants';
import { createFallbackMemoryLetter,createFallbackPlantMessage,normalizeMemoryText,type CollectedPlant } from './greenhouseProgress';

async function post<T>(path:string,body:unknown,timeoutMs=9000):Promise<T>{
  const controller=new AbortController(),timer=window.setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(`${API_BASE_URL}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    return await response.json() as T;
  }finally{window.clearTimeout(timer)}
}

export async function requestPlantMessage(plant:PlantDefinition){
  try{
    const result=await post<{message?:unknown}>('/greenhouse/plant-message',{plantId:plant.id,plantName:plant.displayName,plantInfo:[plant.shortDescription,...plant.characteristics].join(' ')});
    return typeof result.message==='string'&&result.message.trim()?result.message.trim():createFallbackPlantMessage(plant);
  }catch{return createFallbackPlantMessage(plant)}
}

export async function requestMemoryLetter(userText:string,collected:CollectedPlant[],plants:{name:string;emotion:string}[],dominantEmotion:string){
  const normalized=normalizeMemoryText(userText);
  const allowedNames=new Set(plants.map(item=>item.name));
  const otherPlantNames=[...new Set(greenhousePlants.map(item=>item.displayName))].filter(name=>!allowedNames.has(name));
  try{
    const result=await post<{letter?:unknown}>('/greenhouse/memory-letter',{userText:normalized,plants,dominantEmotion});
    const letter=typeof result.letter==='string'?result.letter.trim():'';
    const inventsPlant=otherPlantNames.some(name=>letter.includes(name));
    return letter&&!inventsPlant?letter:createFallbackMemoryLetter(normalized,collected);
  }catch{return createFallbackMemoryLetter(normalized,collected)}
}
