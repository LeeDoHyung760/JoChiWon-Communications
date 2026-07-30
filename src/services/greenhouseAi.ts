import { API_BASE_URL } from '../config/api';
import { greenhousePlantById } from '../data/greenhouse-plants';
import type { GreenhouseAnalysisResponse,GreenhouseAnalysisStage,GreenhousePlantReflectionResponse } from '../../shared/greenhouse-analysis';
import { analyzeGreenhouseDiscoveries,createFallbackGreenhouseAnalysis,recommendRepresentativePlant,type GreenhouseProgress } from './greenhouseProgress';
import { fallbackPlantReflection,greenhouseReflectionQuestion } from './greenhouseReflection';

async function post<T>(path:string,body:unknown,timeoutMs=9000):Promise<T>{
  const controller=new AbortController(),timer=window.setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(`${API_BASE_URL}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    return await response.json() as T;
  }finally{window.clearTimeout(timer)}
}

export async function requestGreenhouseAnalysis(progress:GreenhouseProgress,stage:GreenhouseAnalysisStage):Promise<GreenhouseAnalysisResponse>{
  const discoveries=analyzeGreenhouseDiscoveries(progress.collected);
  const representativePlantId=progress.representativePlant?.plantId??recommendRepresentativePlant(progress.collected,discoveries)??progress.collected[0]?.plantId??'';
  const representative=greenhousePlantById.get(representativePlantId);
  const records=progress.collected.flatMap(item=>{
    const plant=greenhousePlantById.get(item.plantId);
    return item.includeInAnalysis!==false&&plant&&item.selectedEmotion&&item.reasonCategory&&item.reasonText&&item.recordStyle?[{
      plantId:item.plantId,
      plantName:plant.displayName,
      emotion:item.selectedEmotion,
      reasonCategory:item.reasonCategory,
      reasonText:item.reasonText,
      recordStyle:item.recordStyle,
      userAnswer:item.userAnswer,
      keywords:item.keywords,
      reflectionTitle:item.reflectionTitle,
      shortReflection:item.shortReflection,
    }]:[];
  });
  const fallback=createFallbackGreenhouseAnalysis(progress,stage);
  const body={
    stage,
    records,
    ruleAnalysis:{
      dominantEmotion:discoveries.dominantEmotion,
      dominantReasonCategory:discoveries.dominantReasonCategory,
      dominantRecordStyle:discoveries.dominantRecordStyle,
      representativePlantId,
      representativePlantName:representative?.displayName??'대표 식물',
      representativePlantSymbolism:representative?.characteristics??[],
    },
    previousAnalysis:stage===7?progress.aiAnalysis?.analysis:undefined,
  };
  try{
    const result=await post<GreenhouseAnalysisResponse>('/greenhouse/analyze',body,15000);
    if(!result?.analysis||!['ai','fallback'].includes(result.source))throw new Error('Invalid greenhouse analysis');
    return result;
  }catch{return {source:'fallback',analysis:fallback}}
}

export async function requestPlantReflectionAnalysis(plantId:string,answer:string):Promise<GreenhousePlantReflectionResponse>{
  const plant=greenhousePlantById.get(plantId);
  if(!plant)throw new Error('Unknown greenhouse plant');
  const fallback=fallbackPlantReflection(plant,answer);
  const body={
    plantId:plant.id,
    plantName:plant.displayName,
    plantDescription:plant.shortDescription,
    observationPoint:plant.observationPoints?.join(', ')||plant.observationPoint||plant.characteristics.join(', '),
    question:greenhouseReflectionQuestion(plant),
    answer:answer.trim().slice(0,100),
  };
  try{
    const result=await post<GreenhousePlantReflectionResponse>('/greenhouse/reflection',body,12000);
    if(!result?.analysis||!['openai','fallback'].includes(result.source))throw new Error('Invalid greenhouse reflection');
    if(import.meta.env.DEV)console.info('[greenhouse-reflection]',{source:result.source});
    return result;
  }catch{return {source:'fallback',analysis:fallback}}
}
