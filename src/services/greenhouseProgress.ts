import { GREENHOUSE_PLANT_TOTAL,greenhousePlantById,type PlantDefinition } from '../data/greenhouse-plants';
import type { GreenhouseAnalysisStage,GreenhouseNarrativeAnalysis,StoredGreenhouseAnalysis } from '../../shared/greenhouse-analysis';

export const GREENHOUSE_EMOTIONS=[
  {id:'평온함',icon:'🍃'},{id:'설렘',icon:'✨'},{id:'따뜻함',icon:'☀️'},
  {id:'신비로움',icon:'🔮'},{id:'그리움',icon:'🌙'},{id:'희망',icon:'🌱'},
  {id:'기쁨',icon:'😊'},{id:'감탄',icon:'🌟'},{id:'호기심',icon:'🔎'},
  {id:'애틋함',icon:'💗'},{id:'상쾌함',icon:'🌿'},{id:'외로움',icon:'🍂'},
  {id:'용기',icon:'🔥'},{id:'아쉬움',icon:'🌧️'},
] as const;
export type GreenhouseEmotion=typeof GREENHOUSE_EMOTIONS[number]['id'];
export type EmotionReasonCategory='scene'|'change'|'relationship'|'memory';
export type GreenhouseRecordStyle='visual'|'language'|'inner'|'share';

export const GREENHOUSE_RECORD_STYLES=[
  {id:'visual',label:'사진처럼 장면으로 남기기',analysisLabel:'시각 기록형'},
  {id:'language',label:'짧은 문장으로 기록하기',analysisLabel:'언어 기록형'},
  {id:'inner',label:'마음속에 조용히 기억하기',analysisLabel:'내면 기억형'},
  {id:'share',label:'다른 사람에게 이야기하기',analysisLabel:'관계 공유형'},
] as const;

export interface CollectedPlant{
  plantId:string;
  collectedAt:string;
  selectedEmotion?:GreenhouseEmotion;
  reasonCategory?:EmotionReasonCategory;
  reasonText?:string;
  recordStyle?:GreenhouseRecordStyle;
  userAnswer?:string;
  keywords?:string[];
  reflectionTitle?:string;
  shortReflection?:string;
  analysisSource?:'openai'|'fallback';
  includeInAnalysis?:boolean;
  aiMessage:string;
  userMemo?:string;
}
export interface MemoryLeaf{
  id:string;
  createdAt:string;
  originalText:string;
  aiLetter:string;
  analysisStage?:GreenhouseAnalysisStage;
  dominantEmotion:string;
  collectedPlantIds:string[];
  natureType?:string;
  representativePlantId?:string;
  visibility?:'private'|'public';
}
export interface RepresentativePlant{
  plantId:string;
  memo:string;
  selectedAt:string;
}
export interface GreenhouseProgress{
  collected:CollectedPlant[];
  memoryLeaves:MemoryLeaf[];
  introSeen:boolean;
  representativePlant?:RepresentativePlant;
  aiAnalysis?:StoredGreenhouseAnalysis;
  recordVisibility:'private'|'public';
}

const VERSION=1;
const emptyProgress=():GreenhouseProgress=>({collected:[],memoryLeaves:[],introSeen:false,recordVisibility:'private'});
const safeEmotion=(value:unknown):value is GreenhouseEmotion=>GREENHOUSE_EMOTIONS.some(item=>item.id===value);
const normalizeEmotion=(value:unknown):GreenhouseEmotion|undefined=>value==='평온'?'평온함':safeEmotion(value)?value:undefined;
const safeReasonCategory=(value:unknown):value is EmotionReasonCategory=>['scene','change','relationship','memory'].includes(String(value));
const safeRecordStyle=(value:unknown):value is GreenhouseRecordStyle=>['visual','language','inner','share'].includes(String(value));
const safeReflectionSource=(value:unknown):value is 'openai'|'fallback'=>value==='openai'||value==='fallback';
const safeNarrativeSection=(value:unknown):value is {title:string;description:string}=>{
  if(!value||typeof value!=='object')return false;
  const section=value as Record<string,unknown>;
  return typeof section.title==='string'&&typeof section.description==='string';
};
const safeStoredAnalysis=(value:unknown):value is StoredGreenhouseAnalysis=>{
  if(!value||typeof value!=='object')return false;
  const stored=value as Record<string,unknown>,analysis=stored.analysis;
  if((stored.stage!==3&&stored.stage!==7)||(stored.source!=='ai'&&stored.source!=='fallback')||typeof stored.generatedAt!=='string'||!analysis||typeof analysis!=='object')return false;
  const result=analysis as Record<string,unknown>,representative=result.representativePlant;
  return safeNarrativeSection(result.frequentEmotion)&&safeNarrativeSection(result.natureValue)&&safeNarrativeSection(result.recordStyle)
    &&Boolean(representative&&typeof representative==='object'
      &&typeof (representative as Record<string,unknown>).plantId==='string'
      &&typeof (representative as Record<string,unknown>).plantName==='string'
      &&typeof (representative as Record<string,unknown>).reason==='string')
    &&typeof result.memoryLetter==='string';
};

export function parseGreenhouseProgress(raw:string|null):GreenhouseProgress{
  if(!raw)return emptyProgress();
  try{
    const parsed=JSON.parse(raw) as {version?:unknown;data?:Partial<GreenhouseProgress>};
    const source=parsed.version===VERSION?parsed.data:parsed as Partial<GreenhouseProgress>;
    const collected=Array.isArray(source?.collected)?source.collected.filter((item):item is CollectedPlant=>{
      if(!item||typeof item!=='object')return false;
      const value=item as Partial<CollectedPlant>;
      return typeof value.plantId==='string'&&greenhousePlantById.has(value.plantId)&&typeof value.collectedAt==='string'&&(value.selectedEmotion===undefined||normalizeEmotion(value.selectedEmotion)!==undefined)&&typeof value.aiMessage==='string';
    }):[];
    const unique=[...new Map(collected.map(item=>[item.plantId,{
      ...item,
      selectedEmotion:normalizeEmotion(item.selectedEmotion),
      reasonCategory:safeReasonCategory(item.reasonCategory)?item.reasonCategory:undefined,
      reasonText:typeof item.reasonText==='string'?item.reasonText.slice(0,180):undefined,
      recordStyle:safeRecordStyle(item.recordStyle)?item.recordStyle:undefined,
      userAnswer:typeof item.userAnswer==='string'?item.userAnswer.trim().slice(0,100):undefined,
      keywords:Array.isArray(item.keywords)?item.keywords.filter((keyword):keyword is string=>typeof keyword==='string').map(keyword=>keyword.trim().slice(0,30)).filter(Boolean).slice(0,5):undefined,
      reflectionTitle:typeof item.reflectionTitle==='string'?item.reflectionTitle.trim().slice(0,80):undefined,
      shortReflection:typeof item.shortReflection==='string'?item.shortReflection.trim().slice(0,180):undefined,
      analysisSource:safeReflectionSource(item.analysisSource)?item.analysisSource:undefined,
      includeInAnalysis:item.includeInAnalysis===false?false:item.includeInAnalysis===true||Boolean(item.selectedEmotion&&item.reasonCategory&&item.recordStyle),
    }])).values()];
    const memoryLeaves=Array.isArray(source?.memoryLeaves)?source.memoryLeaves.filter((item):item is MemoryLeaf=>{
      if(!item||typeof item!=='object')return false;
      const value=item as Partial<MemoryLeaf>;
      return typeof value.id==='string'&&typeof value.createdAt==='string'&&typeof value.originalText==='string'&&typeof value.aiLetter==='string'&&typeof value.dominantEmotion==='string'&&Array.isArray(value.collectedPlantIds);
    }).map(item=>({...item,analysisStage:item.analysisStage===7?7:3 as GreenhouseAnalysisStage})):[];
    const representativePlant=source?.representativePlant&&typeof source.representativePlant==='object'
      &&typeof source.representativePlant.plantId==='string'&&greenhousePlantById.has(source.representativePlant.plantId)
      &&unique.some(item=>item.plantId===source.representativePlant!.plantId)
      &&typeof source.representativePlant.memo==='string'&&typeof source.representativePlant.selectedAt==='string'
      ?source.representativePlant:undefined;
    return {
      collected:unique,
      memoryLeaves,
      introSeen:source?.introSeen===true,
      representativePlant,
      aiAnalysis:safeStoredAnalysis(source?.aiAnalysis)?source.aiAnalysis:undefined,
      recordVisibility:source?.recordVisibility==='public'?'public':'private',
    };
  }catch{return emptyProgress()}
}

export class GreenhouseProgressService{
  private readonly key:string;
  constructor(private storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>,userKey:string){
    this.key=`greenhouse-progress-v${VERSION}:${userKey.trim().toLowerCase()||'guest'}`;
  }
  load(){return parseGreenhouseProgress(this.storage.getItem(this.key))}
  save(progress:GreenhouseProgress){this.storage.setItem(this.key,JSON.stringify({version:VERSION,data:progress}));return progress}
  collect(
    progress:GreenhouseProgress,
    plantId:string,
    emotion:GreenhouseEmotion|undefined,
    aiMessage:string,
    userMemo?:string,
    reflection?:{
      reasonCategory:EmotionReasonCategory;
      reasonText:string;
      recordStyle:GreenhouseRecordStyle;
      userAnswer?:string;
      keywords?:string[];
      reflectionTitle?:string;
      shortReflection?:string;
      analysisSource?:'openai'|'fallback';
      includeInAnalysis?:boolean;
    },
  ){
    const existing=progress.collected.find(item=>item.plantId===plantId);
    const next:CollectedPlant={
      plantId,
      collectedAt:existing?.collectedAt??new Date().toISOString(),
      selectedEmotion:emotion,
      reasonCategory:reflection?.reasonCategory??existing?.reasonCategory,
      reasonText:reflection?.reasonText.trim().slice(0,180)??existing?.reasonText,
      recordStyle:reflection?.recordStyle??existing?.recordStyle,
      userAnswer:reflection?.userAnswer?.trim().slice(0,100)??existing?.userAnswer,
      keywords:reflection?.keywords?.map(keyword=>keyword.trim().slice(0,30)).filter(Boolean).slice(0,5)??existing?.keywords,
      reflectionTitle:reflection?.reflectionTitle?.trim().slice(0,80)??existing?.reflectionTitle,
      shortReflection:reflection?.shortReflection?.trim().slice(0,180)??existing?.shortReflection,
      analysisSource:reflection?.analysisSource??existing?.analysisSource,
      includeInAnalysis:reflection?reflection.includeInAnalysis!==false:existing?.includeInAnalysis,
      aiMessage,
      userMemo:userMemo?.trim().slice(0,180)||existing?.userMemo,
    };
    return this.save({...progress,collected:[...progress.collected.filter(item=>item.plantId!==plantId),next]});
  }
  collectDiscovery(progress:GreenhouseProgress,plantId:string,aiMessage:string){
    const existing=progress.collected.find(item=>item.plantId===plantId);
    const next:CollectedPlant={plantId,collectedAt:existing?.collectedAt??new Date().toISOString(),aiMessage,includeInAnalysis:false};
    return this.save({...progress,collected:[...progress.collected.filter(item=>item.plantId!==plantId),next]});
  }
  clearPlantReflection(progress:GreenhouseProgress,plantId:string){
    const existing=progress.collected.find(item=>item.plantId===plantId);
    if(!existing)return progress;
    const discovery:CollectedPlant={
      plantId:existing.plantId,
      collectedAt:existing.collectedAt,
      aiMessage:existing.aiMessage,
      includeInAnalysis:false,
    };
    return this.save({
      ...progress,
      collected:progress.collected.map(item=>item.plantId===plantId?discovery:item),
      representativePlant:undefined,
      aiAnalysis:undefined,
    });
  }
  removePlant(progress:GreenhouseProgress,plantId:string){
    return this.save({
      ...progress,
      collected:progress.collected.filter(item=>item.plantId!==plantId),
      representativePlant:undefined,
      aiAnalysis:undefined,
    });
  }
  selectRepresentative(progress:GreenhouseProgress,plantId:string,memo:string){
    if(!progress.collected.some(item=>item.plantId===plantId))return progress;
    return this.save({...progress,representativePlant:{plantId,memo:memo.trim().slice(0,180),selectedAt:new Date().toISOString()}});
  }
  setAiAnalysis(progress:GreenhouseProgress,aiAnalysis:StoredGreenhouseAnalysis){return this.save({...progress,aiAnalysis})}
  setRecordVisibility(progress:GreenhouseProgress,recordVisibility:'private'|'public'){return this.save({...progress,recordVisibility})}
  addMemoryLeaf(progress:GreenhouseProgress,leaf:MemoryLeaf){return this.save({...progress,memoryLeaves:[leaf,...progress.memoryLeaves]})}
  updateMemoryLeaf(progress:GreenhouseProgress,leaf:MemoryLeaf){
    return this.save({...progress,memoryLeaves:progress.memoryLeaves.map(item=>item.id===leaf.id?leaf:item)})
  }
  deleteMemoryLeaf(progress:GreenhouseProgress,id:string){return this.save({...progress,memoryLeaves:progress.memoryLeaves.filter(item=>item.id!==id)})}
  reset(){this.storage.removeItem(this.key);return emptyProgress()}
}

export const greenhouseCompletion=(progress:GreenhouseProgress)=>({
  count:progress.collected.length,
  total:GREENHOUSE_PLANT_TOTAL,
  analysisUnlocked:progress.collected.length>=3,
  representativeUnlocked:progress.collected.length>=3,
  unlocked:progress.collected.length>=3&&Boolean(progress.representativePlant),
  blooming:progress.collected.length>=7,
  complete:progress.collected.length>=GREENHOUSE_PLANT_TOTAL,
  ratio:Math.min(1,progress.collected.length/GREENHOUSE_PLANT_TOTAL),
});
export const memoryLeafNeedsGrowth=(progress:GreenhouseProgress)=>{
  const latest=progress.memoryLeaves[0];
  return Boolean(latest&&progress.aiAnalysis?.stage===7&&(latest.analysisStage??3)<7);
};
export const greenhouseInputLocked=(activeView:string|null)=>activeView!==null;
export function nextGreenhouseAnalysisStage(previousCount:number,nextCount:number):GreenhouseAnalysisStage|null{
  if(previousCount<3&&nextCount>=3)return 3;
  if(previousCount<7&&nextCount>=7)return 7;
  return null;
}

export function dominantEmotion(collected:CollectedPlant[]){
  if(!collected.length)return '평온함';
  const counts=new Map<string,number>();
  collected.forEach(item=>{if(item.selectedEmotion)counts.set(item.selectedEmotion,(counts.get(item.selectedEmotion)??0)+1)});
  if(!counts.size)return '아직 선택하지 않음';
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ko'))[0][0];
}

export interface NatureTaste{
  id:'observer'|'explorer'|'recorder'|'collector';
  label:string;
  description:string;
  keywords:string[];
}
const NATURE_TASTES:Record<NatureTaste['id'],NatureTaste>={
  observer:{id:'observer',label:'고요한 관찰자',description:'천천히 둘러보며 식물의 분위기와 그 순간의 기억을 중요하게 생각합니다.',keywords:['평온함','기억','관찰']},
  explorer:{id:'explorer',label:'설레는 탐험가',description:'새로운 식물을 발견하고 변화하는 풍경 속에서 다음 시작을 찾습니다.',keywords:['발견','변화','새로운 시작']},
  recorder:{id:'recorder',label:'따뜻한 기록가',description:'식물 자체뿐 아니라 함께한 순간의 느낌과 이야기를 오래 기억합니다.',keywords:['따뜻함','이야기','기록']},
  collector:{id:'collector',label:'신비로운 수집가',description:'익숙한 식물 속에서도 새로운 특징과 자신만의 의미를 발견합니다.',keywords:['신비','호기심','수집']},
};
export function analyzeNatureTaste(collected:CollectedPlant[]):NatureTaste{
  const counts=new Map<string,number>();
  collected.forEach(item=>{if(item.selectedEmotion)counts.set(item.selectedEmotion,(counts.get(item.selectedEmotion)??0)+1)});
  const score=(...emotions:string[])=>emotions.reduce((sum,item)=>sum+(counts.get(item)??0),0);
  const ranked:Array<[NatureTaste['id'],number]>=[
    ['observer',score('평온함','평온함','그리움','외로움','아쉬움')],
    ['explorer',score('희망','설렘','용기','상쾌함')],
    ['recorder',score('따뜻함','따뜻함','그리움','애틋함','기쁨')],
    ['collector',score('신비로움','신비로움','희망','호기심','감탄')],
  ];
  ranked.sort((a,b)=>b[1]-a[1]);
  return NATURE_TASTES[ranked[0]?.[0]??'observer'];
}

const NATURE_TASTE_EMOTIONS:Record<NatureTaste['id'],GreenhouseEmotion[]>={
  observer:['평온함','그리움','외로움','아쉬움'],
  explorer:['희망','설렘','용기','상쾌함'],
  recorder:['따뜻함','그리움','애틋함','기쁨'],
  collector:['신비로움','희망','호기심','감탄'],
};
export function natureTasteEvidence(collected:CollectedPlant[],taste:NatureTaste){
  const counts=new Map<GreenhouseEmotion,number>();
  collected.forEach(item=>{if(item.selectedEmotion)counts.set(item.selectedEmotion,(counts.get(item.selectedEmotion)??0)+1)});
  const evidence=NATURE_TASTE_EMOTIONS[taste.id].map(emotion=>({emotion,count:counts.get(emotion)??0})).filter(item=>item.count>0);
  return evidence.length?`${evidence.map(item=>`${item.emotion} ${item.count}회`).join(' · ')}의 기록이 두드러져 이 유형이 선택됐어요.`:'기록한 감정의 전체 조합을 바탕으로 이 유형이 선택됐어요.';
}

const REASON_LABELS:Record<EmotionReasonCategory,{title:string;value:string;description:string}>={
  scene:{title:'색과 분위기에서 발견하는 마음',value:'색과 분위기',description:'식물의 희귀함이나 지식보다 눈앞의 색, 형태와 전체적인 분위기가 만들어내는 감정을 중요하게 바라봅니다.'},
  change:{title:'변화 속에서 발견하는 마음',value:'성장과 변화',description:'식물이 자라고 계절이 바뀌는 모습에서 새로운 시작과 이어지는 가능성을 중요하게 바라봅니다.'},
  relationship:{title:'함께하는 순간에서 발견하는 마음',value:'함께하는 사람',description:'자연의 장면을 혼자 간직하기보다 함께 보고 싶은 사람과 나누는 경험을 중요하게 바라봅니다.'},
  memory:{title:'익숙한 시간에서 발견하는 마음',value:'기억과 익숙함',description:'눈앞의 식물에 지난 장소와 계절을 포개며 자연이 불러오는 추억과 지나간 시간을 중요하게 바라봅니다.'},
};
const STYLE_RESULTS:Record<GreenhouseRecordStyle,{title:string;description:string;label:string}>={
  visual:{title:'장면을 선명하게 남기는 기록',description:'마음이 움직인 순간을 사진처럼 또렷한 색과 모습으로 기억하는 편입니다.',label:'시각 기록형'},
  language:{title:'문장으로 마음을 이해하는 기록',description:'느낀 감정을 짧은 문장으로 정리하면서 그 순간의 의미를 이해하는 편입니다.',label:'언어 기록형'},
  inner:{title:'천천히 마음속에 남기는 기록',description:'순간을 바로 보여주기보다 개인적인 기억으로 조용히 오래 간직하는 편입니다.',label:'내면 기억형'},
  share:{title:'이야기하며 완성하는 기록',description:'누군가에게 그 순간을 이야기하고 감정을 나누면서 경험을 완성하는 편입니다.',label:'관계 공유형'},
};

const dominantValue=<T extends string>(values:T[],fallback:T)=>{
  const firstSeen=new Map<T,number>(),counts=new Map<T,number>();
  values.forEach((value,index)=>{if(!firstSeen.has(value))firstSeen.set(value,index);counts.set(value,(counts.get(value)??0)+1)});
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]||((firstSeen.get(a[0])??0)-(firstSeen.get(b[0])??0)))[0]?.[0]??fallback;
};

const emotionDiscovery=(emotion:GreenhouseEmotion,reason:EmotionReasonCategory)=>{
  const reasonPhrase={
    scene:'부드러운 색과 눈앞의 분위기',
    change:'성장과 계절이 달라지는 모습',
    relationship:'편안한 사람과 함께할 장면',
    memory:'익숙한 풍경과 지나간 기억',
  }[reason];
  const titles:Record<GreenhouseEmotion,string>={
    평온함:'마음이 편안해지는 순간',설렘:'새로운 장면을 기대하는 순간',따뜻함:'다정한 온기를 만나는 순간',
    신비로움:'낯선 아름다움에 머무는 순간',그리움:'지나간 시간을 다시 만나는 순간',희망:'다음 시작을 바라보는 순간',
    기쁨:'자연스럽게 웃음이 피는 순간',감탄:'눈앞의 아름다움에 멈추는 순간',호기심:'더 가까이 알고 싶은 순간',
    애틋함:'소중한 마음을 오래 품는 순간',상쾌함:'마음까지 맑아지는 순간',외로움:'혼자만의 고요가 깊어지는 순간',
    용기:'한 걸음 내딛을 힘을 얻는 순간',아쉬움:'지나가는 풍경을 붙잡고 싶은 순간',
  };
  return {title:titles[emotion],description:`당신은 ${reasonPhrase}에서 ${emotion}을 느끼는 편입니다. 같은 감정도 무엇을 바라보았는지에 따라 자신만의 기록으로 남습니다.`};
};

export interface GreenhouseDiscoveries{
  recordCount:number;
  dominantEmotion:GreenhouseEmotion;
  dominantReasonCategory:EmotionReasonCategory;
  dominantRecordStyle:GreenhouseRecordStyle;
  emotion:{title:string;description:string};
  natureValue:{title:string;value:string;description:string};
  recordStyle:{title:string;description:string;label:string};
}

export interface GreenhouseCompletionStory{
  stages:Array<{count:3|7|14;label:string;emotion:GreenhouseEmotion}>;
  finalLetter:string;
  declaration:string;
}

export function analyzeGreenhouseDiscoveries(collected:CollectedPlant[]):GreenhouseDiscoveries{
  const records=collected.filter(item=>item.includeInAnalysis!==false&&item.selectedEmotion);
  const dominantReasonCategory=dominantValue(records.flatMap(item=>item.reasonCategory?[item.reasonCategory]:[]),'scene');
  const dominantRecordStyle=dominantValue(records.flatMap(item=>item.recordStyle?[item.recordStyle]:[]),'inner');
  const dominant=dominantValue(records.flatMap(item=>item.selectedEmotion?[item.selectedEmotion]:[]),'평온함');
  return {
    recordCount:records.length,
    dominantEmotion:dominant,
    dominantReasonCategory,
    dominantRecordStyle,
    emotion:emotionDiscovery(dominant,dominantReasonCategory),
    natureValue:REASON_LABELS[dominantReasonCategory],
    recordStyle:STYLE_RESULTS[dominantRecordStyle],
  };
}

export function createGreenhouseCompletionStory(progress:GreenhouseProgress):GreenhouseCompletionStory{
  const records=progress.collected
    .filter(item=>item.includeInAnalysis!==false&&item.selectedEmotion)
    .sort((a,b)=>new Date(a.collectedAt).getTime()-new Date(b.collectedAt).getTime());
  const emotionAt=(count:number)=>dominantValue(
    records.slice(0,count).flatMap(item=>item.selectedEmotion?[item.selectedEmotion]:[]),
    '평온함',
  );
  const discoveries=analyzeGreenhouseDiscoveries(progress.collected);
  const representativeId=progress.representativePlant?.plantId??recommendRepresentativePlant(progress.collected,discoveries);
  const representativeName=representativeId?greenhousePlantById.get(representativeId)?.displayName:undefined;
  const originalMemory=[...progress.memoryLeaves].sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime())[0]?.originalText;
  const grownLetter=progress.memoryLeaves.find(item=>item.analysisStage===7)?.aiLetter
    ??progress.aiAnalysis?.analysis.memoryLetter
    ??createFallbackGreenhouseAnalysis(progress,7).memoryLetter;
  const stylePhrase:Record<GreenhouseRecordStyle,string>={
    visual:'장면으로 선명하게 기억하는',
    language:'문장으로 차분히 기록하는',
    inner:'마음속에 오래 간직하는',
    share:'소중한 사람과 나누어 기억하는',
  };
  const completionParagraph=`열네 식물을 모두 만난 지금, ${discoveries.natureValue.value}에서 발견한 ${discoveries.dominantEmotion}의 마음은 하나의 완성된 자연 기록이 되었습니다.${representativeName?` ${representativeName}과 함께한 이 여정이 다음 계절에도 당신만의 시선을 지켜주기를 바랍니다.`:''}`;
  const originalBridge=originalMemory?` 처음 남긴 “${normalizeMemoryText(originalMemory)}”라는 마음도 이 모든 발견의 시작으로 남아 있습니다.`:'';
  return {
    stages:[
      {count:3,label:'처음 발견한 마음',emotion:emotionAt(3)},
      {count:7,label:'더 선명해진 마음',emotion:emotionAt(7)},
      {count:14,label:'완성된 자연 기록',emotion:emotionAt(records.length)},
    ],
    finalLetter:`${grownLetter.trim()}\n\n${completionParagraph}${originalBridge}`,
    declaration:`나는 자연의 ${discoveries.natureValue.value}에서 ${discoveries.dominantEmotion}을 발견하고, 그 순간을 ${stylePhrase[discoveries.dominantRecordStyle]} 사람입니다.`,
  };
}

export function compareGreenhouseRecords(first:CollectedPlant|undefined,second:CollectedPlant|undefined){
  if(!first||!second)return '서로 다른 식물에서 마음이 시작되는 이유를 천천히 살펴보고 있어요.';
  const firstReason=first.reasonText??'식물의 색과 분위기';
  const secondReason=second.reasonText??'또 다른 식물의 모습';
  const sameEmotion=first.selectedEmotion&&first.selectedEmotion===second.selectedEmotion;
  return `첫 번째 식물에서는 ${firstReason}, 두 번째 식물에서는 ${secondReason} 마음이 움직였어요. ${sameEmotion?`같은 ${first.selectedEmotion}도 서로 다른 이유에서 시작될 수 있어요.`:'서로 다른 장면이 각기 다른 마음을 불러왔어요.'}`;
}

export function recommendRepresentativePlant(collected:CollectedPlant[],discoveries=analyzeGreenhouseDiscoveries(collected)){
  const candidates=collected.filter(item=>item.selectedEmotion&&item.includeInAnalysis!==false)
    .sort((a,b)=>new Date(a.collectedAt).getTime()-new Date(b.collectedAt).getTime());
  const ranked=candidates.map((entry,index)=>{
    const plant=greenhousePlantById.get(entry.plantId);
    if(!plant)return {entry,index,score:-1};
    const text=[plant.shortDescription,...plant.characteristics,plant.aiMessage].join(' ');
    const emotionTerms:Record<GreenhouseEmotion,string[]>={
      평온함:['평온','조용','은은'],설렘:['설렘','새로운','다채'],따뜻함:['따뜻','온기','함께'],
      신비로움:['신비','독특','낯선'],그리움:['기억','그리움','익숙'],희망:['희망','시작','도약','가능'],
      기쁨:['기쁨','즐거','행복','밝'],감탄:['아름','화려','눈부신','멋진'],호기심:['호기심','궁금','관찰'],
      애틋함:['소중','애틋','사랑'],상쾌함:['싱그러운','맑은','시원'],외로움:['외로움','쓸쓸','고독'],
      용기:['용기','강인','도전'],아쉬움:['아쉬움','짧은','지는'],
    };
    const symbolismScore=emotionTerms[discoveries.dominantEmotion].filter(term=>text.includes(term)).length;
    return {entry,index,score:symbolismScore+(entry.reasonCategory===discoveries.dominantReasonCategory?2:0)+(entry.recordStyle===discoveries.dominantRecordStyle?1:0)};
  }).sort((a,b)=>b.score-a.score||a.index-b.index);
  return ranked[0]?.entry.plantId??collected[0]?.plantId;
}

export function representativePlantExplanation(plantId:string,discoveries:GreenhouseDiscoveries){
  const plant=greenhousePlantById.get(plantId);
  if(!plant)return '';
  const symbol=plant.characteristics[1]??plant.characteristics[0]??'자신만의 모습';
  return `${discoveries.natureValue.value}을 중요하게 바라보고 ${discoveries.recordStyle.title.toLowerCase()} 당신의 모습이, ${symbol}을 품은 ${plant.displayName}과 닮았습니다.`;
}

export function createFallbackGreenhouseAnalysis(progress:GreenhouseProgress,stage:GreenhouseAnalysisStage):GreenhouseNarrativeAnalysis{
  const discoveries=analyzeGreenhouseDiscoveries(progress.collected);
  const representativeId=progress.representativePlant?.plantId??recommendRepresentativePlant(progress.collected,discoveries)??progress.collected[0]?.plantId??'';
  const representative=greenhousePlantById.get(representativeId);
  const representativeReason=representativePlantExplanation(representativeId,discoveries);
  const names=progress.collected.filter(item=>item.includeInAnalysis!==false&&item.selectedEmotion)
    .slice(0,3).map(item=>greenhousePlantById.get(item.plantId)?.displayName).filter(Boolean).join(', ');
  const base:GreenhouseNarrativeAnalysis={
    frequentEmotion:{title:discoveries.emotion.title,description:discoveries.emotion.description},
    natureValue:{title:discoveries.natureValue.title,description:discoveries.natureValue.description},
    recordStyle:{title:discoveries.recordStyle.title,description:discoveries.recordStyle.description},
    representativePlant:{
      plantId:representativeId,
      plantName:representative?.displayName??'대표 식물',
      reason:representativeReason,
    },
    memoryLetter:`오늘 ${names||'수목원의 식물'}을 바라보며 ${discoveries.emotion.title}을 발견했습니다. ${discoveries.natureValue.value}에서 시작된 ${discoveries.dominantEmotion}의 마음을 ${discoveries.recordStyle.title}으로 남겼습니다. 이 기록이 ${representative?.displayName??'대표 식물'}의 ${representative?.characteristics[1]??representative?.characteristics[0]??'새로운 시작'}처럼 다음 계절에도 조용히 이어지기를 바랍니다.`,
  };
  if(stage===3||!progress.aiAnalysis)return base;
  const previous=progress.aiAnalysis.analysis;
  return {
    frequentEmotion:{title:previous.frequentEmotion.title,description:`${previous.frequentEmotion.description} 추가 기록에서도 ${discoveries.dominantEmotion}의 마음이 이어지며 처음의 발견이 더 선명해졌습니다.`},
    natureValue:{title:previous.natureValue.title,description:`${previous.natureValue.description} 더 많은 식물을 만나며 ${discoveries.natureValue.value}을 바라보는 시선이 구체적으로 드러났습니다.`},
    recordStyle:{title:previous.recordStyle.title,description:`${previous.recordStyle.description} 일곱 식물의 순간이 쌓이며 이 기록 방식이 더욱 또렷해졌습니다.`},
    representativePlant:base.representativePlant,
    memoryLetter:`${previous.memoryLetter}\n\n일곱 식물까지 탐험한 지금, ${discoveries.dominantEmotion}의 마음과 ${discoveries.natureValue.value}을 바라보는 시선이 처음의 기록을 더 풍성하게 만들었습니다. ${base.representativePlant.plantName}과 함께 남긴 마음이 다음 방문에도 선명한 기억으로 이어지기를 바랍니다.`,
  };
}

export function buildMemoryLetterProfile(progress:GreenhouseProgress){
  const discoveries=analyzeGreenhouseDiscoveries(progress.collected);
  const records=progress.collected.filter(item=>item.includeInAnalysis!==false&&item.selectedEmotion);
  const representativeId=progress.representativePlant?.plantId??recommendRepresentativePlant(progress.collected,discoveries);
  const representative=representativeId?greenhousePlantById.get(representativeId):undefined;
  return {
    dominantEmotion:discoveries.dominantEmotion,
    emotionPattern:records.flatMap(item=>item.selectedEmotion?[item.selectedEmotion]:[]),
    dominantReasonCategory:discoveries.dominantReasonCategory,
    reasonSelections:records.flatMap(item=>item.reasonText?[item.reasonText]:[]),
    dominantRecordStyle:discoveries.recordStyle.label,
    representativePlant:representative?{name:representative.displayName,symbolism:representative.characteristics}:undefined,
    discoveries:{
      emotion:discoveries.emotion.title,
      natureValue:discoveries.natureValue.value,
      recordStyle:discoveries.recordStyle.title,
    },
  };
}

type CuratorMessages=Record<GreenhouseEmotion,string>;
const CURATOR_FALLBACK:CuratorMessages={
  희망:'변화 속에서 새로운 가능성과 시작을 발견하는 편이에요.',
  설렘:'새로운 풍경을 만나는 순간과 계절의 변화를 즐기는 편이에요.',
  평온함:'천천히 머물며 식물의 형태와 주변 분위기를 깊이 바라보는 편이에요.',
  따뜻함:'자연에서 편안한 관계와 다정한 이야기를 떠올리는 편이에요.',
  신비로움:'익숙한 모습 속에서도 낯선 특징과 숨은 의미를 찾아내는 편이에요.',
  그리움:'장소와 계절에 담긴 순간의 기억을 소중하게 간직하는 편이에요.',
  기쁨:'밝은 색과 생기 있는 풍경에서 자연스럽게 웃을 이유를 발견하는 편이에요.',
  감탄:'식물의 아름다운 색과 형태를 마주하면 잠시 멈춰 깊이 바라보는 편이에요.',
  호기심:'눈에 띈 작은 특징을 그냥 지나치지 않고 더 가까이 알고 싶어 하는 편이에요.',
  애틋함:'자연이 불러온 소중한 존재와 마음을 오래 품고 간직하는 편이에요.',
  상쾌함:'맑은 빛과 바람, 싱그러운 색에서 기분이 환기되는 순간을 즐기는 편이에요.',
  외로움:'혼자 마주한 자연의 고요 속에서 자신의 깊은 마음을 천천히 바라보는 편이에요.',
  용기:'쉽지 않은 순간에도 다시 한 걸음 나아갈 힘을 자연에서 발견하는 편이에요.',
  아쉬움:'짧게 머무는 계절과 풍경을 소중히 여기며 지나가는 순간을 오래 기억하는 편이에요.',
};
const CURATOR_BY_PLANT:Record<string,Partial<CuratorMessages>>={
  'flower-01':{
    희망:'잎보다 먼저 피는 목련처럼, 아직 준비되지 않은 순간에도 자신의 계절을 시작할 힘을 발견하는 편이에요.',
    설렘:'가지 끝에서 큰 꽃봉오리가 열리는 순간처럼, 새로운 시작이 가까워지는 기척에 마음이 움직이는 편이에요.',
    평온함:'두툼하고 밝은 목련 꽃잎을 천천히 바라보며, 서두르지 않아도 찾아오는 계절을 믿는 편이에요.',
    따뜻함:'봄의 시작을 먼저 알려 주는 목련처럼, 주변 사람에게 다정한 시작의 신호를 건네는 편이에요.',
    신비로움:'잎도 없는 가지에서 먼저 피어나는 목련의 순서를 보며, 익숙한 규칙을 벗어난 아름다움에 끌리는 편이에요.',
    그리움:'해마다 같은 가지에 돌아오는 목련을 보며, 다시 만나고 싶은 봄날과 장소를 오래 간직하는 편이에요.',
  },
  'flower-02':{
    희망:'추위가 남은 땅에서 먼저 피는 세복수초처럼, 작은 가능성을 누구보다 빨리 알아보는 편이에요.',
    설렘:'햇빛을 따라 노란 꽃을 여는 세복수초처럼, 곧 시작될 계절의 첫 소식에 설레는 편이에요.',
    평온함:'지면 가까이 조용히 피어난 세복수초를 보며, 작고 낮은 풍경에서도 안정감을 찾는 편이에요.',
    따뜻함:'차가운 계절에 노란빛을 건네는 세복수초처럼, 힘든 때일수록 먼저 온기를 나누는 편이에요.',
    신비로움:'빛이 있을 때 꽃잎을 여는 세복수초의 움직임에서, 자연이 가진 섬세한 질서를 발견하는 편이에요.',
    그리움:'봄보다 먼저 나타나는 세복수초를 보며, 오래 기다린 소식과 다시 찾아온 순간을 소중히 여기는 편이에요.',
  },
  'flower-03':{
    희망:'여러 송이가 산과 정원을 채우는 철쭉처럼, 함께 피어날 때 더 큰 변화를 만들 수 있다고 믿는 편이에요.',
    설렘:'화사한 철쭉 무리가 풍경을 한순간 바꾸듯, 사람들과 함께 맞이하는 새로운 장면을 즐기는 편이에요.',
    평온함:'철쭉 꽃잎 안쪽의 작은 무늬를 살피며, 화려한 풍경 속에서도 세밀한 균형을 찾는 편이에요.',
    따뜻함:'무리 지어 피는 철쭉처럼, 혼자보다 함께일 때 생기는 다정한 분위기를 중요하게 생각해요.',
    신비로움:'깔때기 모양 꽃 안쪽에 숨은 무늬를 보며, 가까이 다가가야 보이는 특징에 호기심을 느끼는 편이에요.',
    그리움:'봄 산을 물들이는 철쭉을 보며, 함께 걸었던 길과 그 계절의 사람들을 선명하게 기억하는 편이에요.',
  },
  'flower-04':{
    희망:'작은 꽃들이 모여 큰 꽃송이가 되는 수국처럼, 작은 마음도 모이면 커다란 변화를 만든다고 믿는 편이에요.',
    설렘:'환경에 따라 빛깔이 달라지는 수국처럼, 새로운 장소에서 달라질 자신의 모습에 기대를 품는 편이에요.',
    평온함:'둥글고 풍성한 수국의 균형을 바라보며, 여러 마음이 조화롭게 머무는 상태를 편안해하는 편이에요.',
    따뜻함:'수많은 작은 꽃이 서로 기대어 있는 수국처럼, 관계 속에서 위로와 포근함을 발견하는 편이에요.',
    신비로움:'토양과 시간에 따라 색이 달라지는 수국에서, 겉으로 보이지 않는 환경의 이야기를 궁금해하는 편이에요.',
    그리움:'비 내리던 여름의 수국처럼, 색과 날씨가 함께 남긴 장면을 오래 마음에 보관하는 편이에요.',
  },
  'flower-05':{
    희망:'곧게 선 줄기 위에 꽃을 올리는 튤립처럼, 자신이 고른 방향으로 또렷하게 나아가고 싶은 편이에요.',
    설렘:'다채로운 튤립 중 마음에 드는 색을 고르듯, 새로운 선택 앞에서 즐거운 가능성을 먼저 보는 편이에요.',
    평온함:'단정하게 겹친 튤립 꽃잎을 보며, 복잡하지 않고 분명한 형태에서 안정감을 찾는 편이에요.',
    따뜻함:'봄 화단을 함께 채우는 튤립처럼, 소박한 인사와 밝은 색으로 주변을 기분 좋게 만드는 편이에요.',
    신비로움:'알뿌리 속에 다음 봄을 품은 튤립처럼, 보이지 않는 곳에서 준비되는 변화에 매력을 느끼는 편이에요.',
    그리움:'해마다 다시 만나는 튤립의 색을 보며, 한때 마음을 설레게 했던 시작과 약속을 떠올리는 편이에요.',
  },
  'flower-06':{
    희망:'붓을 닮은 꽃봉오리처럼, 아직 펼쳐지지 않은 마음도 언젠가 자신만의 색을 그릴 수 있다고 믿는 편이에요.',
    설렘:'섬세한 꽃무늬가 번지는 붓꽃을 보며, 새로운 풍경에 어떤 색이 더해질지 기대하는 편이에요.',
    평온함:'곧게 뻗은 잎과 부드러운 꽃잎의 대비에서, 단단함과 여유가 함께 있는 균형을 좋아하는 편이에요.',
    따뜻함:'풍경에 색을 더하는 붓꽃처럼, 말보다 작은 표현으로 마음을 전하는 데 익숙한 편이에요.',
    신비로움:'꽃잎마다 다르게 이어지는 붓꽃의 무늬에서, 자연이 그린 한 번뿐인 선을 발견하는 편이에요.',
    그리움:'붓으로 남긴 그림처럼 보이는 꽃을 보며, 오래전 풍경과 그때 표현하지 못한 마음을 떠올리는 편이에요.',
  },
  'flower-07':{
    희망:'크게 열린 백합처럼, 자신의 마음과 가능성을 숨기지 않고 온전히 펼치고 싶은 편이에요.',
    설렘:'우아한 꽃잎 사이로 길게 뻗은 수술을 보며, 익숙한 풍경을 특별하게 만드는 순간에 끌리는 편이에요.',
    평온함:'백합의 은은한 향과 넓은 꽃잎처럼, 조용하지만 분명하게 머무는 아름다움에서 편안함을 느껴요.',
    따뜻함:'말없이 향기를 건네는 백합처럼, 드러내지 않아도 전해지는 배려와 진심을 중요하게 생각해요.',
    신비로움:'여섯 장처럼 보이는 꽃잎의 대칭을 살피며, 단정한 모습 안에 숨은 구조를 발견하는 편이에요.',
    그리움:'오래 남는 백합의 향처럼, 지나간 뒤에도 마음에 머무는 사람과 순간을 소중히 여기는 편이에요.',
  },
  'flower-08':{
    희망:'차가운 계절에도 붉게 피는 동백처럼, 어려운 때에도 사라지지 않는 자신의 온기를 믿는 편이에요.',
    설렘:'윤기 나는 푸른 잎 사이에서 붉은 꽃을 만나는 순간처럼, 예상 밖의 선명한 발견을 좋아하는 편이에요.',
    평온함:'두꺼운 상록 잎과 겹겹의 꽃잎을 바라보며, 계절이 바뀌어도 유지되는 단단함에서 안정을 느껴요.',
    따뜻함:'겨울 풍경에 붉은빛을 남기는 동백처럼, 필요한 순간에 조용히 온기를 건네는 편이에요.',
    신비로움:'꽃송이째 떨어지는 동백의 독특한 마지막에서, 아름다움이 머무는 방식의 차이를 생각하는 편이에요.',
    그리움:'겨울마다 같은 빛으로 돌아오는 동백을 보며, 추운 날 곁을 지켜 준 기억을 오래 간직하는 편이에요.',
  },
  'flower-09':{
    희망:'높이 자라 밝은 꽃을 펼치는 해바라기처럼, 마음이 향할 곳을 정하면 힘차게 나아가는 편이에요.',
    설렘:'넓은 노란 꽃잎이 여름빛을 담듯, 크고 밝은 가능성을 만날 때 에너지가 살아나는 편이에요.',
    평온함:'가운데 작은 꽃들이 만든 나선 배열을 바라보며, 큰 모습 안의 정돈된 질서에서 편안함을 느껴요.',
    따뜻함:'주변을 환하게 만드는 해바라기처럼, 자신의 밝은 기운을 사람들과 자연스럽게 나누는 편이에요.',
    신비로움:'수많은 작은 꽃이 정교한 나선을 이루는 모습에서, 자연의 수학적 규칙을 발견하는 편이에요.',
    그리움:'한여름 햇빛을 닮은 해바라기를 보며, 가장 밝았던 날과 그때 함께한 사람을 떠올리는 편이에요.',
  },
  'flower-10':{
    희망:'가을 들판에 조용히 피는 구절초처럼, 눈에 띄지 않는 순간에도 자신의 때를 준비하는 편이에요.',
    설렘:'서늘한 바람 속에서 흰 꽃을 만나는 것처럼, 계절 끝에 찾아오는 잔잔한 새로움을 좋아하는 편이에요.',
    평온함:'소박한 구절초 꽃송이와 깊게 갈라진 잎을 바라보며, 꾸밈없는 풍경에서 마음을 쉬게 하는 편이에요.',
    따뜻함:'들판 한쪽을 은은하게 밝혀 주는 구절초처럼, 조용한 존재만으로도 주변을 편안하게 만드는 편이에요.',
    신비로움:'가느다란 잎과 작은 꽃이 만드는 섬세한 대비에서, 가까이 보아야 드러나는 아름다움에 끌리는 편이에요.',
    그리움:'가을 들판의 구절초를 보며, 말없이 지나간 계절과 오래된 고향의 풍경을 떠올리는 편이에요.',
  },
  'flower-11':{
    희망:'여름부터 가을까지 새 꽃을 이어 피우는 무궁화처럼, 다시 시작할 기회를 스스로 만들어 가는 편이에요.',
    설렘:'매일 새로운 꽃을 피우는 무궁화처럼, 오늘과 다른 내일이 찾아올 가능성에 마음이 뛰는 편이에요.',
    평온함:'넓게 펼쳐진 다섯 꽃잎의 균형을 보며, 꾸준히 반복되는 일상 속에서 안정과 힘을 얻는 편이에요.',
    따뜻함:'오랫동안 곁에서 꽃을 이어 온 무궁화처럼, 관계를 쉽게 놓지 않고 꾸준히 마음을 건네는 편이에요.',
    신비로움:'꽃 중심의 붉은 무늬가 바깥으로 번지는 모습을 보며, 한 존재 안의 강한 중심을 발견하는 편이에요.',
    그리움:'익숙한 나라꽃 무궁화를 보며, 함께 살아온 장소와 자신의 뿌리에 담긴 이야기를 소중히 여기는 편이에요.',
  },
  'flower-12':{
    희망:'하늘을 향한 새를 닮은 극락조화처럼, 익숙한 한계를 넘어 더 넓은 곳으로 나아가고 싶은 편이에요.',
    설렘:'주황과 푸른색이 대담하게 만나는 극락조화처럼, 전에 없던 조합과 낯선 경험에 마음이 뛰는 편이에요.',
    평온함:'독특한 형태를 서두르지 않고 바라보며, 낯선 모습도 있는 그대로 이해할 때 편안함을 느끼는 편이에요.',
    따뜻함:'자신만의 모양을 숨기지 않는 극락조화처럼, 서로의 다름을 인정해 주는 관계를 따뜻하게 여겨요.',
    신비로움:'꽃이 한 마리 새처럼 보이는 극락조화에서, 현실과 상상이 겹치는 순간을 발견하는 편이에요.',
    그리움:'먼 곳의 풍경을 닮은 극락조화를 보며, 아직 가 보지 못한 장소나 놓쳐 버린 여행을 떠올리는 편이에요.',
  },
  'peach-tree':{
    희망:'봄마다 새 꽃을 피우는 복숭아나무처럼, 지금의 선택이 새로운 도약으로 이어질 수 있다고 믿는 편이에요.',
    설렘:'가지를 따라 연분홍 꽃이 번지는 모습처럼, 작은 시작이 풍성해지는 과정을 기대하는 편이에요.',
    평온함:'부드러운 복숭아꽃의 색을 바라보며, 서두르지 않고 시작을 준비하는 시간에서 편안함을 느껴요.',
    따뜻함:'행운과 환영의 빛을 품은 복숭아꽃처럼, 새로운 사람과 시작을 다정하게 맞이하는 편이에요.',
    신비로움:'꽃이 진 자리에서 여름 열매가 자라는 복숭아나무를 보며, 변화 뒤에 이어질 이야기를 궁금해해요.',
    그리움:'봄의 복숭아꽃을 보며, 다시 시작하고 싶었던 순간과 오래 마음에 둔 소망을 떠올리는 편이에요.',
  },
  'red-tree':{
    희망:'계절마다 새 색을 입는 단풍나무처럼, 변화는 끝이 아니라 다음 모습으로 가는 과정이라고 믿는 편이에요.',
    설렘:'초록 잎이 붉게 달라지는 순간처럼, 익숙한 풍경이 새롭게 변하는 장면을 즐기는 편이에요.',
    평온함:'손바닥처럼 갈라진 잎의 규칙을 살피며, 변화 속에서도 유지되는 형태에서 안정감을 찾는 편이에요.',
    따뜻함:'붉게 물든 단풍이 길을 밝혀 주듯, 자신의 변화가 누군가에게 따뜻한 용기가 되기를 바라는 편이에요.',
    신비로움:'잎마다 조금씩 다른 붉은 색조를 보며, 같은 계절 안에서도 서로 다른 변화의 속도를 발견해요.',
    그리움:'단풍이 물든 길을 보며, 지나간 계절과 그 길을 함께 걸었던 순간을 오래 간직하는 편이에요.',
  },
};
export function natureCuratorMessage(plant:PlantDefinition,emotion:GreenhouseEmotion){
  const message=CURATOR_BY_PLANT[plant.id]?.[emotion]??CURATOR_FALLBACK[emotion];
  return `${plant.displayName}에서 ${emotion}을 느낀 당신은 ${message}`;
}

export function createFallbackPlantMessage(plant:PlantDefinition){
  return plant.observationGuide??`${plant.observationPoint??plant.shortDescription}을 천천히 살펴보세요. 꽃과 잎의 모양이 주변 부분과 어떻게 다른지 비교해보세요.`;
}

export interface MemoryLetterContext{
  profile?:ReturnType<typeof buildMemoryLetterProfile>;
  representativePlant?:string;
  previousLetter?:string;
  complete?:boolean;
}

export function createFallbackMemoryLetter(userText:string,collected:CollectedPlant[],context?:MemoryLetterContext){
  const profile=context?.profile??buildMemoryLetterProfile({
    collected,memoryLeaves:[],introSeen:true,recordVisibility:'private',
  });
  const names=collected.slice(0,2).map(item=>greenhousePlantById.get(item.plantId)?.displayName).filter(Boolean).join('와 ');
  const text=normalizeMemoryText(userText.replace(/^[^:]{1,40}:\s*/,''));
  const representative=context?.representativePlant??profile.representativePlant?.name??(names||'수목원의 식물');
  const reason=profile.reasonSelections[0]??profile.discoveries.natureValue;
  const symbol=profile.representativePlant?.symbolism[1]??profile.representativePlant?.symbolism[0]??'새로운 시작';
  if(context?.previousLetter){
    const growth=context.complete?'열네 식물을 모두 만난 지금':'일곱 식물까지 탐험을 이어온 지금';
    return `${context.previousLetter.trim()}\n\n${growth}, ${names||'새로운 식물들'}에서 발견한 ${profile.emotionPattern.join('과 ')||profile.dominantEmotion}의 마음이 기존 기록을 더 선명하게 만들었습니다.\n\n${reason} 시작된 마음은 ${representative}의 ${symbol}처럼 더 많은 발견을 품고 자랐습니다. 처음 남긴 “${text}”라는 마음도 그 곁에 오래 머물기를 바랍니다.`;
  }
  return `오늘 ${names||representative}을 바라보며 ${profile.discoveries.emotion}을 발견했습니다.\n\n${reason} ${profile.dominantEmotion}이 시작되었고, 그 순간을 ${profile.discoveries.recordStyle}으로 남겼습니다.\n\n“${text}”라는 오늘의 마음이 ${representative}이 품은 ${symbol}처럼 다음 시간을 향해 조용히 이어지기를 바랍니다.`;
}

export function normalizeMemoryText(value:string){
  let text=value.trim().replace(/\s+/g,' ');
  text=text.replace(/^([가-힣]{2,4}야)(?=(오늘|내일|다음|우리|항상|힘내|화이팅))/,'$1, ');
  text=text.replace(/(오늘|내일|다음)(?=(도|은|을|에))/g,'$1');
  if(text&&!/[.!?。]$/.test(text))text+='.';
  return text;
}
