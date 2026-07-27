import type { MapId,PublicMatchProfile } from '../../shared/socket-events';
import type { UserProfile } from '../types';
import { greenhousePlantById } from '../data/greenhouse-plants';
import { dominantEmotion,parseGreenhouseProgress } from './greenhouseProgress';

const LAKE_INTEREST_KEY='sejong-lake-interest-profile-v1';
const MAP_RECORD_PREFIX='sejong-map-experience-v1:';

const lakeContentRecords:Record<string,{record:string;categories:string[]}>={
  'hangeul-festival':{record:'세종축제와 수상공연 저장',categories:['문화시설','관광명소']},
  'peach-festival':{record:'조치원복숭아축제 저장',categories:['관광명소','음식점']},
  'lake-stage':{record:'호수공원 야간 공연 저장',categories:['문화시설','관광명소']},
  'peach-dessert':{record:'복숭아 디저트 저장',categories:['카페','음식점']},
  'local-market':{record:'세종 로컬마켓 저장',categories:['문화시설','관광명소']},
  'photo-zone':{record:'세종 기억 포토존 저장',categories:['관광명소']},
};
const lakeActivityRecords:Record<string,string>={
  watch:'공연 함께 보기 선택',
  taste:'지역 음식 맛보기 선택',
  photo:'사진 남기기 선택',
  workshop:'체험 부스 참여 선택',
};
const mapRecords:Partial<Record<MapId,{record:string;categories:string[]}>>={
  town:{record:'세종호수공원 체험',categories:['공원','관광명소']},
  garden:{record:'국립세종수목원 탐험',categories:['공원','관광명소']},
  'bear-tree-park':{record:'베어트리파크 숲 탐험',categories:['공원','관광명소']},
  'bear-play-zone':{record:'베어트리파크 곰 관찰',categories:['공원','관광명소']},
  campus:{record:'공동캠퍼스 이웃 만남',categories:['문화시설']},
};

const unique=(values:string[])=>[...new Set(values.filter(Boolean))];
const mapKey=(nickname:string)=>`${MAP_RECORD_PREFIX}${nickname.trim().toLowerCase()||'guest'}`;

export function recordMapExperience(nickname:string,mapId:MapId){
  const definition=mapRecords[mapId];
  if(!definition)return;
  try{
    const key=mapKey(nickname);
    const previous=JSON.parse(localStorage.getItem(key)??'[]') as unknown;
    const records=Array.isArray(previous)?previous.filter((value):value is string=>typeof value==='string'):[];
    localStorage.setItem(key,JSON.stringify(unique([...records,definition.record])));
  }catch{/* A recommendation can still use profile and other experience records. */}
}

export function buildExperienceRecommendationProfile(profile:UserProfile):PublicMatchProfile{
  const experienceRecords:string[]=[];
  const preferredPlaceCategories=[...profile.preferredPlaceCategories];
  try{
    const lake=JSON.parse(localStorage.getItem(LAKE_INTEREST_KEY)??'null') as {savedContentIds?:unknown;activities?:unknown}|null;
    const savedIds=Array.isArray(lake?.savedContentIds)?lake.savedContentIds.filter((value):value is string=>typeof value==='string'):[];
    const activities=Array.isArray(lake?.activities)?lake.activities.filter((value):value is string=>typeof value==='string'):[];
    savedIds.forEach(id=>{const item=lakeContentRecords[id];if(item){experienceRecords.push(item.record);preferredPlaceCategories.push(...item.categories)}});
    activities.forEach(id=>{const record=lakeActivityRecords[id];if(record)experienceRecords.push(record)});
  }catch{/* Ignore malformed local experience data. */}
  try{
    const greenhouse=parseGreenhouseProgress(localStorage.getItem(`greenhouse-progress-v1:${profile.nickname.trim().toLowerCase()||'guest'}`));
    if(greenhouse.collected.length){
      experienceRecords.push('수목원 식물 관찰',`${dominantEmotion(greenhouse.collected)} 감정 기록`);
      greenhouse.collected.slice(-3).forEach(item=>{const plant=greenhousePlantById.get(item.plantId);if(plant)experienceRecords.push(`${plant.displayName} 발견`)});
      preferredPlaceCategories.push('공원','관광명소');
    }
    if(greenhouse.memoryLeaves.length)experienceRecords.push('수목원 기억 편지 작성');
  }catch{/* Ignore malformed greenhouse progress. */}
  try{
    const visited=JSON.parse(localStorage.getItem(mapKey(profile.nickname))??'[]') as unknown;
    if(Array.isArray(visited))visited.filter((value):value is string=>typeof value==='string').forEach(record=>{
      experienceRecords.push(record);
      const definition=Object.values(mapRecords).find(item=>item?.record===record);
      if(definition)preferredPlaceCategories.push(...definition.categories);
    });
  }catch{/* Ignore malformed map records. */}
  return {
    mbti:profile.mbti,
    interests:unique(profile.interests).slice(0,10),
    usagePurposes:unique(profile.usagePurposes).slice(0,10),
    preferredPlaceCategories:unique(preferredPlaceCategories).slice(0,10),
    experienceRecords:unique(experienceRecords).slice(-10),
  };
}
