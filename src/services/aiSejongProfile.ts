import type { UserProfile } from '../types';
import { greenhousePlantById } from '../data/greenhouse-plants';
import { dominantEmotion,parseGreenhouseProgress,recommendRepresentativePlant } from './greenhouseProgress';
import { loadBearHabitatProgress } from './bearHabitatDecision';
import {loadGeneratedExperienceProfile} from './experienceHarness';
import {buildFoodTasteProfile} from './foodTasteProfile';
import {campusSignalKeywords} from './campusProfileSignals';

type ProfileInterest={emoji:string;label:string};
export type AiSejongProfile={
  nickname:string;
  completion:number;
  interests:ProfileInterest[];
  dominantEmotion?:string;
  emotionCounts:Array<{label:string;count:number}>;
  representativePlant?:{name:string;description:string};
  decisionProfile?:{title:string;description:string;criteria:string;response:string};
  recommendedCourse:string[];
  oneLineAnalysis:string;
  experienceProfile?:ReturnType<typeof loadGeneratedExperienceProfile>;
};

const LAKE_KEY='sejong-lake-interest-profile-v1';
const unique=<T>(values:T[])=>[...new Set(values)];
const userKey=(nickname:string)=>nickname.trim().toLowerCase()||'guest';
const emotionIcon=(emotion:string)=>emotion.includes('평온')?'🌿':emotion.includes('설렘')?'✨':emotion.includes('희망')?'🌱':emotion.includes('기쁨')||emotion.includes('행복')?'😊':emotion.includes('따뜻')?'☀️':'🍃';

function readLakeProfile(){
  try{
    return JSON.parse(localStorage.getItem(LAKE_KEY)??'null') as {
      savedContentIds?:unknown;
      activities?:unknown;
      foodPlaceInterests?:unknown;
      festivalTheme?:unknown;
      likedCourseTitles?:unknown;
      tasteInsights?:Record<string,{label?:unknown;keywords?:unknown}>;
    }|null;
  }catch{return null}
}

function lakeInterests(){
  const lake=readLakeProfile(),labels:ProfileInterest[]=[];
  const activities=Array.isArray(lake?.activities)?lake.activities.filter((item):item is string=>typeof item==='string'):[];
  const festivals=Array.isArray(lake?.savedContentIds)?lake.savedContentIds.filter((item):item is string=>typeof item==='string'):[];
  const foods=Array.isArray(lake?.foodPlaceInterests)?lake.foodPlaceInterests:[];
  const keywords=lake?.tasteInsights&&typeof lake.tasteInsights==='object'
    ?Object.values(lake.tasteInsights).flatMap(insight=>Array.isArray(insight?.keywords)?insight.keywords.filter((item):item is string=>typeof item==='string'):[])
    :[];
  if(activities.length||keywords.some(item=>/공연|라이브|버스킹|음악/.test(item)))labels.push({emoji:'🎵',label:'공연'});
  if(festivals.length||typeof lake?.festivalTheme==='string'&&lake.festivalTheme)labels.push({emoji:'🌙',label:keywords.some(item=>/야간/.test(item))?'야간축제':'축제'});
  if(foods.length||keywords.some(item=>/먹거리|미식|카페|로컬/.test(item)))labels.push({emoji:'🍜',label:'지역 먹거리'});
  if(keywords.some(item=>/사진|기록/.test(item)))labels.push({emoji:'📸',label:'사진'});
  if(keywords.some(item=>/산책|휴식|자연/.test(item)))labels.push({emoji:'🌿',label:'산책'});
  return [...new Map(labels.map(item=>[item.label,item])).values()].slice(0,6);
}

export function buildAiSejongProfile(profile:UserProfile):AiSejongProfile{
  const generatedExperience=loadGeneratedExperienceProfile();
  const foodTaste=buildFoodTasteProfile();
  const campusInterests=campusSignalKeywords(profile.nickname).map(label=>({emoji:/자연/.test(label)?'🌿':/문화|축제/.test(label)?'🎭':/먹거리|카페/.test(label)?'🍽️':/기록/.test(label)?'📸':/교류|동행|대화|모임/.test(label)?'🤝':'🧭',label}));
  const interests=[...new Map([...campusInterests,...lakeInterests(),...foodTaste.insights.map(item=>({emoji:'🍽️',label:item.label})),...(generatedExperience?.tags??[]).map(label=>({emoji:'🎭',label}))].map(item=>[item.label,item])).values()].slice(0,6);
  const greenhouse=parseGreenhouseProgress(localStorage.getItem(`greenhouse-progress-v1:${userKey(profile.nickname)}`));
  const emotionCounts=[...greenhouse.collected.reduce((counts,item)=>{
    if(item.selectedEmotion)counts.set(item.selectedEmotion,(counts.get(item.selectedEmotion)??0)+1);
    return counts;
  },new Map<string,number>()).entries()].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'ko'));
  const dominant=emotionCounts.length?dominantEmotion(greenhouse.collected):undefined;
  const representativeId=greenhouse.representativePlant?.plantId
    ??greenhouse.aiAnalysis?.analysis.representativePlant.plantId
    ??(greenhouse.collected.length>=3?recommendRepresentativePlant(greenhouse.collected):undefined);
  const plant=representativeId?greenhousePlantById.get(representativeId):undefined;
  const decisionResult=loadBearHabitatProgress(profile.nickname).result;
  const coreCount=[interests.length>0,Boolean(dominant),Boolean(plant),Boolean(decisionResult)].filter(Boolean).length;
  const selectedCourse=readLakeProfile()?.likedCourseTitles;
  const savedCourses=Array.isArray(selectedCourse)?selectedCourse.filter((item):item is string=>typeof item==='string'):[];
  const generatedCourse:string[]=[];
  if(coreCount>=3){
    if(interests.some(item=>/공연|축제/.test(item.label)))generatedCourse.push('세종호수공원 야간 공연·축제');
    if(interests.some(item=>/먹거리/.test(item.label)))generatedCourse.push('조치원 로컬 먹거리 탐방');
    if(interests.some(item=>/사진/.test(item.label)))generatedCourse.push('호수공원 감성 포토 산책');
    if(dominant?.includes('평온')||decisionResult?.title==='안전 우선형')generatedCourse.push('국립세종수목원 힐링 산책');
    if(decisionResult?.courseStrategy)generatedCourse.push(decisionResult.courseStrategy);
    generatedCourse.push('베어트리파크 자연 탐험');
  }
  const recommendedCourse=unique([...savedCourses,...generatedCourse]).slice(0,4);
  const completed=[interests.length>0,Boolean(dominant),Boolean(plant),Boolean(decisionResult),recommendedCourse.length>0].filter(Boolean).length;
  const completion=completed*20;
  const pace=decisionResult?.title==='효율 운영형'?'효율적으로':decisionResult?.title==='상황 적응형'?'유연하게':'차근차근';
  const memory=interests.some(item=>item.label==='사진')?'풍경과 순간을 기록하는':'여러 조건을 살펴 결정하는';
  const baseAnalysis=generatedExperience?.summary??(completed
    ?`새로운 장소를 ${pace} 둘러보며 ${memory} 사람입니다.${dominant?` 자연에서는 ${emotionIcon(dominant)} ${dominant}의 감정을 가장 자주 느껴요.`:''}`
    :'세종 곳곳의 체험을 시작하면 나만의 여행 성향이 이곳에 자라납니다.');
  const oneLineAnalysis=foodTaste.summary?`${baseAnalysis} ${foodTaste.summary}`:baseAnalysis;
  return {
    nickname:profile.nickname,
    completion,
    interests,
    dominantEmotion:dominant,
    emotionCounts,
    representativePlant:plant?{
      name:plant.displayName,
      description:plant.emotionBridge??`${plant.displayName}처럼 ${plant.characteristics.slice(0,2).join('과 ')}의 가치를 좋아하는 사람`,
    }:undefined,
    decisionProfile:decisionResult?{
      title:decisionResult.title,
      description:decisionResult.interpretation,
      criteria:decisionResult.criteria.map(item=>`${item.label} ${item.score}%`).join(' · '),
      response:decisionResult.response,
    }:undefined,
    recommendedCourse,
    oneLineAnalysis,
    experienceProfile:generatedExperience,
  };
}
