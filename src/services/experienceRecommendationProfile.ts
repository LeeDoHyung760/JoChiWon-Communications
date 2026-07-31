import type { MapId,PublicMatchProfile } from '../../shared/socket-events';
import type { UserProfile } from '../types';
import { greenhousePlantById } from '../data/greenhouse-plants';
import { analyzeNatureTaste,dominantEmotion,parseGreenhouseProgress } from './greenhouseProgress';
import { loadBearProgress } from '../data/bear-wildlife';
import { loadBearHabitatProgress } from './bearHabitatDecision';
import { buildAiSejongProfile } from './aiSejongProfile';

const LAKE_INTEREST_KEY='sejong-lake-interest-profile-v1';
const MAP_RECORD_PREFIX='sejong-map-experience-v1:';

const lakeContentRecords:Record<string,{record:string;categories:string[]}>={
  'hangeul-festival':{record:'세종축제와 수상공연 저장',categories:['문화시설','관광명소']},
  'peach-festival':{record:'조치원복숭아축제 저장',categories:['관광명소','음식점']},
  'lake-stage':{record:'호수공원 야간 공연 저장',categories:['문화시설','관광명소']},
  'peach-dessert':{record:'솔티마을 복숭아와인 관심',categories:['음식점']},
  'local-market':{record:'세종 로컬마켓 저장',categories:['문화시설','관광명소']},
  'photo-zone':{record:'세종 기억 포토존 저장',categories:['관광명소']},
  'nakhwa-festival':{record:'세종낙화축제 저장',categories:['문화시설','관광명소']},
  'guryong-festival':{record:'영평사 구절초꽃축제 저장',categories:['관광명소']},
  'local-restaurant':{record:'세종 지역 맛집 관심',categories:['음식점']},
  'local-cafe':{record:'호수공원 근처 카페 관심',categories:['카페']},
  'flea-market':{record:'세종 로컬 플리마켓 관심',categories:['문화시설']},
  'local-workshop':{record:'세종 공방 관심',categories:['문화시설']},
  'jochwon-peach':{record:'조치원 복숭아·지역 특산물 관심',categories:['음식점']},
  'local-produce-food':{record:'왕천파닭·조치원 로컬 맛집 관심',categories:['음식점']},
  'lake-cafe':{record:'바이핸커피·지역 카페 관심',categories:['카페']},
  'local-bakery':{record:'로스터리카페 수아빈·커피 관심',categories:['카페']},
  'jochwon-market':{record:'세종전통시장·로컬 먹거리 탐방 관심',categories:['음식점','관광명소']},
  'matnadang-kalguksu':{record:'맛나당칼국수·지역 면요리 관심',categories:['음식점']},
  'bok-samgyetang':{record:'복누룽지삼계탕·보양식 관심',categories:['음식점']},
  'sansujeong-baeksuk':{record:'산수정 능이버섯백숙·보양식 관심',categories:['음식점']},
  'yoongane-sujebi':{record:'윤가네 들깨수제비와 보쌈 관심',categories:['음식점']},
  'mrbean-roasters':{record:'미스터빈커피로스터스·팥빙수 관심',categories:['카페']},
  'newold-coffee':{record:'뉴올드커피·지역 카페 관심',categories:['카페']},
  'pangshow-bakery':{record:'팡쇼과자점·베이커리 관심',categories:['카페']},
  'stellaon-coffee':{record:'스텔라온 커피·도심 카페 관심',categories:['카페']},
  'daepyeong-market':{record:'금남대평시장·오일장 관심',categories:['음식점','관광명소']},
  'bugang-market':{record:'부강전통시장·오일장 관심',categories:['음식점','관광명소']},
  'jeonui-market':{record:'전의왕의물시장·오일장 관심',categories:['음식점','관광명소']},
  'singsing-dodam':{record:'싱싱장터 도담점·로컬푸드 관심',categories:['음식점','관광명소']},
  'singsing-areum':{record:'싱싱장터 아름점·로컬푸드 관심',categories:['음식점','관광명소']},
};
const lakeActivityRecords:Record<string,string>={
  busking:'공연 감상 선호: 버스킹',
  'night-media':'공연 감상 선호: 야간 미디어쇼',
  classic:'공연 감상 선호: 클래식 공연',
  traditional:'공연 감상 선호: 전통 공연',
  'lunch-concert':'공연 분위기 선호: 자유로운 라이브·대중음악',
  'seopyeonje-musical':'공연 분위기 선호: 전통 문화·감동적인 뮤지컬',
  'lungs-play':'공연 분위기 선호: 몰입하는 이야기·연극',
  'starry-night-concert':'공연 분위기 선호: 야간 공연·클래식',
};
const lakeThemeRecords:Record<string,string>={'night-media':'야간 미디어아트 축제 선호','local-food':'로컬 푸드 축제 선호','live-stage':'라이브 공연 축제 선호','craft-market':'공방 마켓 축제 선호'};
const mapRecords:Partial<Record<MapId,{record:string;categories:string[]}>>={
  garden:{record:'국립세종수목원 탐험',categories:['공원','관광명소']},
  'bear-tree-park':{record:'베어트리파크 숲 탐험',categories:['공원','관광명소']},
  'bear-play-zone':{record:'베어트리파크 곰 관찰',categories:['공원','관광명소']},
  campus:{record:'공동캠퍼스 이웃 만남',categories:['문화시설']},
  government:{record:'정부청사 공동 계획',categories:['문화시설','관광명소']},
  'sejong-smart-city':{record:'세종 스마트시티 국가시범도시 탐험',categories:['문화시설','관광명소']},
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

export function countTasteDiscoveryRecords(profile:UserProfile){
  const records:string[]=[];
  try{
    const lake=JSON.parse(localStorage.getItem(LAKE_INTEREST_KEY)??'null') as {savedContentIds?:unknown;activities?:unknown;foodShopIds?:unknown;foodPlaceInterests?:unknown;foodInterests?:unknown;shopInterests?:unknown;festivalTheme?:unknown;likedCourseTitles?:unknown;tasteInsights?:unknown}|null;
    const addIds=(prefix:string,value:unknown)=>{
      if(Array.isArray(value))value.forEach(item=>{
        if(typeof item==='string')records.push(`${prefix}:${item}`);
        else if(item&&typeof item==='object'&&'id' in item&&typeof item.id==='string')records.push(`${prefix}:${item.id}`);
      });
    };
    addIds('content',lake?.savedContentIds);
    addIds('activity',lake?.activities);
    addIds('food',lake?.foodShopIds);
    addIds('food',lake?.foodPlaceInterests);
    addIds('food',lake?.foodInterests);
    addIds('food',lake?.shopInterests);
    if(typeof lake?.festivalTheme==='string'&&lake.festivalTheme)records.push(`theme:${lake.festivalTheme}`);
    addIds('course',lake?.likedCourseTitles);
    if(lake?.tasteInsights&&typeof lake.tasteInsights==='object')Object.keys(lake.tasteInsights).forEach(domain=>records.push(`analysis:${domain}`));
  }catch{/* Ignore malformed local experience data. */}
  try{
    const greenhouse=parseGreenhouseProgress(localStorage.getItem(`greenhouse-progress-v1:${profile.nickname.trim().toLowerCase()||'guest'}`));
    greenhouse.collected.forEach(item=>records.push(`plant:${item.plantId}`));
    greenhouse.memoryLeaves.forEach(item=>records.push(`memory:${item.id}`));
    if(greenhouse.representativePlant)records.push(`representative:${greenhouse.representativePlant.plantId}`);
  }catch{/* Ignore malformed greenhouse progress. */}
  try{
    const bear=loadBearProgress(profile.nickname);
    bear.completedClues.forEach(id=>records.push(`bear-clue:${id}`));
    if(bear.questionsAsked)records.push('bear-ai-question');
  }catch{/* Ignore malformed bear exploration progress. */}
  try{
    const decision=loadBearHabitatProgress(profile.nickname).result;
    if(decision)records.push('bear-habitat-decision');
  }catch{/* Ignore malformed habitat decision progress. */}
  try{
    const visited=JSON.parse(localStorage.getItem(mapKey(profile.nickname))??'[]') as unknown;
    if(Array.isArray(visited))visited.forEach(record=>{
      if(typeof record==='string'&&Object.values(mapRecords).some(item=>item?.record===record))records.push(`map:${record}`);
    });
  }catch{/* Ignore malformed map records. */}
  return unique(records).length;
}

export function buildExperienceRecommendationProfile(profile:UserProfile):PublicMatchProfile{
  const experienceRecords:string[]=[];
  const preferredPlaceCategories=[...profile.preferredPlaceCategories];
  const aiSejongProfile=buildAiSejongProfile(profile);
  try{
    const lake=JSON.parse(localStorage.getItem(LAKE_INTEREST_KEY)??'null') as {savedContentIds?:unknown;activities?:unknown;foodShopIds?:unknown;foodPlaceInterests?:unknown;foodInterests?:unknown;shopInterests?:unknown;festivalTheme?:unknown;likedCourseTitles?:unknown;tasteInsights?:unknown}|null;
    const savedIds=Array.isArray(lake?.savedContentIds)?lake.savedContentIds.filter((value):value is string=>typeof value==='string'):[];
    const foodShopIds=Array.isArray(lake?.foodShopIds)?lake.foodShopIds.filter((value):value is string=>typeof value==='string'):[];
    const structuredFoodIds=[...(Array.isArray(lake?.foodPlaceInterests)?lake.foodPlaceInterests:[]),...(Array.isArray(lake?.foodInterests)?lake.foodInterests:[]),...(Array.isArray(lake?.shopInterests)?lake.shopInterests:[])].flatMap(value=>value&&typeof value==='object'&&'id' in value&&typeof value.id==='string'?[value.id]:[]);
    const activities=Array.isArray(lake?.activities)?lake.activities.filter((value):value is string=>typeof value==='string'):[];
    savedIds.forEach(id=>{const item=lakeContentRecords[id];if(item){experienceRecords.push(item.record);preferredPlaceCategories.push(...item.categories)}});
    foodShopIds.forEach(id=>{const item=lakeContentRecords[id];if(item){experienceRecords.push(item.record);preferredPlaceCategories.push(...item.categories)}});
    structuredFoodIds.forEach(id=>{const item=lakeContentRecords[id];if(item){experienceRecords.push(item.record);preferredPlaceCategories.push(...item.categories)}});
    activities.forEach(id=>{const record=lakeActivityRecords[id];if(record)experienceRecords.push(record)});
    if(typeof lake?.festivalTheme==='string'&&lakeThemeRecords[lake.festivalTheme])experienceRecords.push(lakeThemeRecords[lake.festivalTheme]);
    if(Array.isArray(lake?.likedCourseTitles))lake.likedCourseTitles.filter((value):value is string=>typeof value==='string').forEach(title=>experienceRecords.push(`가고 싶은 코스: ${title}`));
    if(lake?.tasteInsights&&typeof lake.tasteInsights==='object')Object.values(lake.tasteInsights).forEach(value=>{
      if(value&&typeof value==='object'&&'label' in value&&typeof value.label==='string')experienceRecords.push(`AI 취향 분석: ${value.label}`);
      if(value&&typeof value==='object'&&'keywords' in value&&Array.isArray(value.keywords))value.keywords.filter((keyword:unknown):keyword is string=>typeof keyword==='string').forEach((keyword:string)=>experienceRecords.push(`선호 키워드: ${keyword}`));
    });
  }catch{/* Ignore malformed local experience data. */}
  try{
    const greenhouse=parseGreenhouseProgress(localStorage.getItem(`greenhouse-progress-v1:${profile.nickname.trim().toLowerCase()||'guest'}`));
    if(greenhouse.collected.length){
      experienceRecords.push('수목원 식물 관찰');
      preferredPlaceCategories.push('공원','관광명소');
    }
    if(greenhouse.memoryLeaves.length)experienceRecords.push('수목원 기억 편지 작성');
    if(greenhouse.recordVisibility==='public'&&greenhouse.collected.length>=3){
      experienceRecords.push(`자연 유형: ${analyzeNatureTaste(greenhouse.collected).label}`,`대표 감정: ${dominantEmotion(greenhouse.collected)}`);
      if(greenhouse.representativePlant){
        const plant=greenhousePlantById.get(greenhouse.representativePlant.plantId);
        if(plant)experienceRecords.push(`대표 식물: ${plant.displayName}`);
        if(greenhouse.representativePlant.memo)experienceRecords.push(`자연 탐험 한마디: ${greenhouse.representativePlant.memo.slice(0,80)}`);
      }
    }
  }catch{/* Ignore malformed greenhouse progress. */}
  try{
    const bear=loadBearProgress(profile.nickname);
    if(bear.completedClues.length)experienceRecords.push(`반달가슴곰 흔적 조사 ${bear.completedClues.length}/3`);
    if(bear.completedAt){
      experienceRecords.push('반달가슴곰 생태 전문가 Lv.1','AI 동물 생태 해설 체험');
      preferredPlaceCategories.push('공원','관광명소');
    }
    if(bear.questionsAsked)experienceRecords.push(`AI 생태 해설 질문 ${bear.questionsAsked}회`);
  }catch{/* Ignore malformed bear exploration progress. */}
  try{
    const decision=loadBearHabitatProgress(profile.nickname).result;
    if(decision){
      experienceRecords.push(
        `의사결정 유형: ${decision.title}`,
        `주요 판단 기준: ${decision.criteria.map(item=>`${item.label} ${item.score}%`).join(' · ')}`,
        `설계 과정: ${decision.response}`,
        `맵 배치 방식: ${decision.mapAnalysis}`,
        `코스 구성 방식: ${decision.courseStrategy}`,
      );
      preferredPlaceCategories.push('공원','관광명소');
    }
  }catch{/* Ignore malformed habitat decision progress. */}
  try{
    const visited=JSON.parse(localStorage.getItem(mapKey(profile.nickname))??'[]') as unknown;
    if(Array.isArray(visited))visited.filter((value):value is string=>typeof value==='string').forEach(record=>{
      const definition=Object.values(mapRecords).find(item=>item?.record===record);
      if(definition){experienceRecords.push(record);preferredPlaceCategories.push(...definition.categories)}
    });
  }catch{/* Ignore malformed map records. */}
  return {
    mbti:profile.mbti,
    interests:unique([...profile.interests,...aiSejongProfile.interests.map(item=>item.label)]).slice(0,10),
    usagePurposes:unique(profile.usagePurposes).slice(0,10),
    preferredPlaceCategories:unique(preferredPlaceCategories).slice(0,10),
    experienceRecords:unique(experienceRecords).slice(-10),
  };
}
