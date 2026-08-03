import type { MapId } from '../../shared/socket-events';
import type { UserProfile } from '../types';
import { BEAR_CLUES, loadBearProgress } from '../data/bear-wildlife';
import { greenhousePlantById } from '../data/greenhouse-plants';
import { loadBearHabitatProgress } from './bearHabitatDecision';
import { loadBearTravelProgress } from './bearTravelStyle';
import { loadVisitedCampusBuildings } from './campusVisits';
import { parseGreenhouseProgress } from './greenhouseProgress';
import { loadExperienceActivityHistory,loadFestivalKeywordInsights } from './experienceHarness';
import { campusSignalAxisScores,loadCampusProfileSignals } from './campusProfileSignals';

export const PROFILE_VISITS_PREFIX = 'sejong-profile-visits-v1:';
const LAKE_KEY = 'sejong-lake-interest-profile-v1';
const keyFor = (nickname: string) => `${PROFILE_VISITS_PREFIX}${nickname.trim().toLowerCase() || 'guest'}`;

export type ProfileVisit = { mapId: MapId; visitedAt: string };
export type ProfileZone = { id: string; label: string; maps: MapId[]; icon: string };
export type ProfileRecord = { id: string; zone: string; title: string; note: string; point: number; at?: string; image: string; breakdown?: Array<{ label: string; point: number }> };

export const PROFILE_ZONES: ProfileZone[] = [
  { id: 'town', label: '세종호수공원', maps: ['town'], icon: '🌊' },
  { id: 'arts-center', label: '세종예술의전당', maps: ['arts-center'], icon: '🎭' },
  { id: 'festival-experience', label: '축제 체험장', maps: ['festival-experience'], icon: '🎪' },
  { id: 'food-experience', label: '먹거리 체험장', maps: ['food-experience'], icon: '🍽️' },
  { id: 'bear-tree-park', label: '베어트리파크', maps: ['bear-tree-park'], icon: '🐻' },
  { id: 'bear-play-zone', label: 'AI 생태 연구소', maps: ['bear-play-zone'], icon: '🔬' },
  { id: 'garden', label: '국립세종수목원', maps: ['garden'], icon: '🌿' },
  { id: 'campus', label: '공동캠퍼스', maps: ['campus'], icon: '🎓' },
  { id: 'student-hall', label: '학생회관', maps: ['student-hall'], icon: '🤝' },
  { id: 'recruitment-center', label: '모집센터', maps: ['recruitment-center'], icon: '📣' },
  { id: 'project-room', label: '프로젝트실', maps: ['project-room'], icon: '🧩' },
  { id: 'government', label: '정부세종청사', maps: ['government'], icon: '🏛️' },
  { id: 'government-central-plaza', label: '정부청사 중앙광장', maps: ['government-central-plaza'], icon: '⛲' },
  { id: 'government-policy-hall', label: '정책 체험관', maps: ['government-policy-hall'], icon: '📋' },
  { id: 'government-observatory', label: '정부청사 전망대', maps: ['government-observatory'], icon: '🔭' },
  { id: 'sejong-smart-city', label: '스마트시티 전시관', maps: ['sejong-smart-city'], icon: '🏙️' },
  { id: 'jochwon-station', label: '조치원역', maps: ['jochwon-station'], icon: '🚉' },
  { id: 'traditional-market', label: '세종전통시장', maps: ['traditional-market'], icon: '🛍️' },
  { id: 'jochwon-park', label: '조치원공원', maps: ['jochwon-park'], icon: '🌳' },
  { id: 'college-street', label: '대학로', maps: ['college-street'], icon: '🏘️' },
];

const MAP_LABELS: Record<MapId, string> = {
  'club-street-festival': '동아리 거리제',
  town: '세종호수공원', 'arts-center': '세종예술의전당', 'festival-experience': '축제 체험장', 'food-experience': '먹거리 체험장',
  'bear-tree-park': '베어트리파크', 'bear-play-zone': 'AI 생태 연구소', garden: '국립세종수목원', campus: '공동캠퍼스',
  'student-hall': '학생회관', 'recruitment-center': '모집센터', 'project-room': '프로젝트실', government: '정부세종청사', 'government-central-plaza': '정부청사 중앙광장',
  'government-policy-hall': '정책 체험관', 'government-observatory': '정부청사 전망대', 'sejong-smart-city': '스마트시티 전시관',
  'jochwon-station': '조치원역', 'traditional-market': '세종전통시장', 'jochwon-park': '조치원공원', 'college-street': '대학로',
};

const LAKE_CONTENT_LABELS:Record<string,string>={
  'peach-festival':'제24회 세종 조치원복숭아축제','hangeul-festival':'2026 세종한글축제','nakhwa-festival':'2026 세종낙화축제',
  'spring-flower-festival':'2026 조치원 봄꽃축제','childrens-day-festival':'제104회 세종 어린이날 축제',
  'kings-birthday-book-festival':'세종대왕 나신 날 × 세종 책사랑 축제','dano-festival':'2026 세종단오제',
  'street-hangeul-festival':'2026 거리 한글문화 한마당',
};
const PERFORMANCE_LABELS:Record<string,string>={
  'lunch-concert':'12시 런치 콘서트','seopyeonje-musical':'뮤지컬 〈서편제〉','lungs-play':'연극 〈렁스〉',
  'starry-night-concert':'심야음악회 〈별 헤는 밤, 별 하나〉',
};
const NATURE_DISCOVERY_LABELS:Record<string,{title:string;note:string}>={
  forest:{title:'숲 산책 시작',note:'베어트리파크 숲길에서 자연 관찰을 시작했어요'},
  bear:{title:'곰 생태 탐험 시작',note:'AI 생태 연구소에서 곰의 흔적을 조사하기로 했어요'},
};
const validDate=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?new Date(value).toISOString():undefined;

export function loadProfileVisits(nickname: string): ProfileVisit[] {
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(nickname)) ?? '[]') as unknown;
    return Array.isArray(value) ? value.filter((item): item is ProfileVisit => Boolean(item && typeof item === 'object' && 'mapId' in item && 'visitedAt' in item)) : [];
  } catch { return []; }
}

export function recordProfileVisit(nickname: string, mapId: MapId) {
  const visits = loadProfileVisits(nickname);
  if (!visits.some(item => item.mapId === mapId)) {
    localStorage.setItem(keyFor(nickname), JSON.stringify([...visits, { mapId, visitedAt: new Date().toISOString() }]));
    window.dispatchEvent(new CustomEvent('sejong-profile-progress-updated', { detail: { mapId } }));
  }
}

const safeLake = () => {
  try { return JSON.parse(localStorage.getItem(LAKE_KEY) ?? 'null') as Record<string, unknown> | null; } catch { return null; }
};
const countArray = (value: unknown) => Array.isArray(value) ? value.length : 0;
const readJson = <T,>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) ?? 'null') as T ?? fallback; } catch { return fallback; } };

export function buildProfileProgress(profile: UserProfile) {
  const visits = loadProfileVisits(profile.nickname);
  const visitedIds = new Set(visits.map(item => item.mapId));
  const zones = PROFILE_ZONES.map(zone => ({ ...zone, visited: zone.maps.some(id => visitedIds.has(id)), mapVisits: zone.maps.filter(id => visitedIds.has(id)).length }));
  const greenhouse = parseGreenhouseProgress(localStorage.getItem(`greenhouse-progress-v1:${profile.nickname.trim().toLowerCase() || 'guest'}`));
  const bear = loadBearProgress(profile.nickname);
  const bearTravel = loadBearTravelProgress(profile.nickname);
  const habitat = loadBearHabitatProgress(profile.nickname);
  const campus = loadVisitedCampusBuildings(profile.nickname);
  const user = profile.nickname.trim().toLowerCase() || 'guest';
  const lake = safeLake();
  const festivalKeywords = loadFestivalKeywordInsights(profile.nickname);
  const campusSignals=loadCampusProfileSignals(profile.nickname),campusAxes=campusSignalAxisScores(profile.nickname);
  const lakeRecords = countArray(lake?.savedContentIds) + countArray(lake?.activities) + countArray(lake?.foodPlaceInterests) + countArray(lake?.likedCourseTitles);
  const records: ProfileRecord[] = [];
  // Portal travel is represented by `zones`; the activity feed only contains
  // choices and completed actions that say something meaningful about the user.
  campusSignals.forEach(signal=>records.push({id:`campus-signal-${signal.id}`,zone:signal.zone,title:signal.title,note:signal.note,point:signal.point,at:signal.at,image:imageForMap(signal.mapId),breakdown:[{label:'선택 행동',point:signal.point}]}));
  const harnessHistory = loadExperienceActivityHistory(profile.nickname);
  harnessHistory.forEach(activity => {
    const zone = activity.mapId === 'arts-center' ? '세종예술의전당' : activity.mapId === 'food-experience' ? '먹거리 체험장' : '축제 체험장';
    records.push({ id: `harness-${activity.id}`, zone, title: activity.title, note: activity.note, point: activity.point, breakdown: activity.breakdown, at: activity.recordedAt, image: imageForMap(activity.mapId) });
  });
  if(festivalKeywords.length)records.push({
    id:'festival-keywords',
    zone:'축제 체험장',
    title:'나의 축제 관심 키워드 발견',
    note:festivalKeywords.slice(0,8).map(item=>item.keyword).join(' · '),
    point:Math.min(20,festivalKeywords.reduce((sum,item)=>sum+item.count,0)),
    image:'/images/festivals/nakhwa-2026.jpg',
  });
  const lakeUpdatedAt=validDate(lake?.updatedAt);
  const addLakeRecords = (value: unknown, prefix: string, describe:(rawId:string)=>{title:string;note:string}, image: string) => {
    if (!Array.isArray(value)) return;
    value.forEach((entry, index) => {
      const rawId = typeof entry === 'string' ? entry : entry && typeof entry === 'object' && 'id' in entry ? String(entry.id) : String(index);
      records.push({ id: `lake-${prefix}-${rawId}`, zone: '세종호수공원', ...describe(rawId), point: 7, at:lakeUpdatedAt, image });
    });
  };
  addLakeRecords(lake?.savedContentIds,'content',id=>{const label=LAKE_CONTENT_LABELS[id]??id;return{title:`${label} 관심 저장`,note:`${label}의 일정과 프로그램을 살펴보고 가고 싶은 축제로 골랐어요`}},'/images/festivals/nakhwa-2026.jpg');
  addLakeRecords(lake?.activities,'activity',id=>{const label=PERFORMANCE_LABELS[id]??id;return{title:`${label} 선택`,note:`${label} 포스터를 보고 끌리는 공연 분위기로 골랐어요`}},'/images/performances/starry-night-2026.jpg');
  if(Array.isArray(lake?.foodPlaceInterests))lake.foodPlaceInterests.forEach((entry,index)=>{
    if(!entry||typeof entry!=='object')return;
    const item=entry as {id?:unknown;name?:unknown;type?:unknown;category?:unknown;tags?:unknown;selectedAt?:unknown};
    const name=typeof item.name==='string'?item.name:'세종 먹거리';
    const tags=Array.isArray(item.tags)?item.tags.filter((tag):tag is string=>typeof tag==='string').slice(0,3):[];
    const kind=item.type==='food'?'먹어보고 싶은 메뉴':'가보고 싶은 장소';
    records.push({id:`lake-food-${String(item.id??index)}`,zone:'세종호수공원',title:`${name} 관심 저장`,note:`${kind}${tags.length?` · 관심 키워드: ${tags.join(' · ')}`:''}`,point:7,at:typeof item.selectedAt==='string'?item.selectedAt:undefined,image:'/images/food-shops/jochwon-market.jpg',breakdown:[{label:'먹거리·장소 선택',point:4},{label:'취향 키워드 발견',point:3}]});
  });
  addLakeRecords(lake?.likedCourseTitles,'course',title=>({title:`${title} 저장`,note:`${title}을 실제로 가고 싶은 세종 여행 코스로 골랐어요`}),'/images/festivals/nakhwa-2026.jpg');
  const booths = readJson<Record<string, boolean>>('sejong-lake-booth-completion-v1', {});
  Object.entries(booths).filter(([, done]) => done).forEach(([id]) => records.push({ id: `lake-booth-${id}`, zone: '세종호수공원', title: '호수공원 체험 부스 완료', note: `${id === 'activity' ? '공연' : id === 'food' ? '먹거리' : '축제'} 취향 체험을 마쳤어요`, point: 15, image: '/images/festivals/nakhwa-2026.jpg' }));
  const tents = readJson<Record<string, { completed?: boolean; interested?: boolean; lastOpenedAt?: number }>>('sejong-festival-tent-engagement-v1', {});
  Object.entries(tents).filter(([, value]) => value.completed || value.interested).forEach(([id, value]) => records.push({ id: `festival-tent-${id}`, zone: '축제 체험장', title: `${id === 'blue' ? '전통문화' : '문화예술'} 전시 관람`, note: value.completed ? '전시를 끝까지 관람했어요' : '관심 전시로 저장했어요', point: value.completed ? 15 : 8, at: value.lastOpenedAt ? new Date(value.lastOpenedAt).toISOString() : undefined, image: id === 'blue' ? '/images/festivals/dano-2026.jpg' : '/images/festivals/hangeul-2026.jpg' }));
  const stage = readJson<{ completed?: boolean; maxProgress?: number }>('sejong-festival-stage-video-v1', {});
  if (stage.completed || (stage.maxProgress ?? 0) > 0) records.push({ id: 'festival-stage-video', zone: '축제 체험장', title: '세종 축제 영상 관람', note: stage.completed ? '축제 영상을 끝까지 감상했어요' : `영상 ${Math.round((stage.maxProgress ?? 0) * 100)}%를 감상했어요`, point: stage.completed ? 15 : 5, image: '/images/festivals/nakhwa-2026.jpg' });
  greenhouse.collected.forEach(item => {
    const plant=greenhousePlantById.get(item.plantId);
    const plantName=plant?.displayName??'이름을 확인 중인 식물';
    const plantKind=plant?.category==='flower'?'꽃':plant?.category==='peach-tree'?'복숭아나무':'나무';
    const reflection=item.shortReflection??item.userAnswer??item.reasonText??item.userMemo;
    const details=[`${plantKind} · ${plantName}`,item.selectedEmotion?`느낀 감정: ${item.selectedEmotion}`:undefined,reflection?`마음 기록: ${reflection}`:undefined].filter(Boolean).join(' · ');
    records.push({
      id:`plant-${item.plantId}`,
      zone:'국립세종수목원',
      title:`${plantName} 관찰 기록`,
      note:details,
      point:item.selectedEmotion?10:6,
      at:item.updatedAt??item.collectedAt,
      image:plant?.thumbnailUrl??plant?.imageUrl??'/images/festivals/spring-flower-2026.jpg',
      breakdown:[{label:`${plantName} 발견`,point:6},...(item.selectedEmotion?[{label:'마음 기록',point:4}]:[])],
    });
  });
  greenhouse.memoryLeaves.forEach(item => {
    const plantNames=item.collectedPlantIds.map(id=>greenhousePlantById.get(id)?.displayName).filter((name):name is string=>Boolean(name));
    records.push({ id: `memory-${item.id}`, zone: '국립세종수목원', title: plantNames.length?`${plantNames.slice(0,3).join(' · ')} 기억의 잎`:'마음의 잎 기록', note: item.dominantEmotion ? `${plantNames.length?`관찰한 식물: ${plantNames.join(', ')} · `:''}${item.dominantEmotion}의 마음을 간직했어요` : plantNames.length?`관찰한 식물: ${plantNames.join(', ')}`:'자연에서 느낀 마음을 남겼어요', point: 12, at: item.createdAt, image: greenhousePlantById.get(item.representativePlantId??item.collectedPlantIds[0])?.thumbnailUrl??greenhousePlantById.get(item.representativePlantId??item.collectedPlantIds[0])?.imageUrl??'/images/festivals/spring-flower-2026.jpg' });
  });
  bear.completedClues.forEach(id=>{const clue=BEAR_CLUES.find(item=>item.id===id),finding=bear.findings[id];records.push({id:`bear-${id}`,zone:'베어트리파크',title:clue?`${clue.title} 조사 완료`:'곰 생태 단서 조사 완료',note:[finding?.species&&`${finding.species}(으)로 판단`,finding?.evidence&&`근거: ${finding.evidence}`].filter(Boolean).join(' · ')||'관찰 결과와 판단 근거를 생태 조사 기록에 남겼어요',point:10,at:bear.completedAt,image:'/images/government-complex-diorama.png'});});
  const natureVisits = readJson<string[]>(`nature-discovery-visits-v1:${user}`, []);
  natureVisits.forEach((id,index)=>{const detail=NATURE_DISCOVERY_LABELS[id];if(detail)records.push({id:`nature-action-${id}-${index}`,zone:'베어트리파크',...detail,point:8,image:'/images/government-complex-diorama.png'});});
  if (localStorage.getItem(`bear-tree-photo-completed-v1:${user}`) === 'true') records.push({ id: 'bear-photo', zone: '베어트리파크', title: '자연 포토 기록', note: '베어트리파크에서 추억을 남겼어요', point: 12, image: '/images/government-complex-diorama.png' });
  const governmentPlan = readJson<{title?:string;items?:Array<{placeName?:string}>;generatedAt?:number}|null>(`government-visit-plans:${profile.nickname}`, null);
  if (governmentPlan) {const places=governmentPlan.items?.map(item=>item.placeName).filter((name):name is string=>Boolean(name)).slice(0,4)??[];records.push({ id: 'government-plan', zone: '정부세종청사', title: governmentPlan.title?`${governmentPlan.title} 저장`:'나만의 세종 방문 계획 저장', note: places.length?`방문 순서: ${places.join(' → ')}`:'선택한 장소와 이동 조건으로 맞춤 코스를 완성했어요', point: 20,at:validDate(governmentPlan.generatedAt), image: '/images/government-complex-diorama.png' });}
  const applications = readJson<Array<{ id: string; applicantId: string; createdAt?: string }>>('sejong-project-room-applications-v1', []);
  applications.filter(item => item.applicantId === profile.nickname).forEach(item => records.push({ id: `project-${item.id}`, zone: '프로젝트실', title: '공동 프로젝트 지원', note: '세종 프로젝트에 참여 의사를 남겼어요', point: 15, at: item.createdAt, image: '/images/government-complex-diorama.png' }));
  if (bearTravel.result) records.push({ id: 'bear-travel', zone: '베어트리파크', title: '나의 여행 스타일 발견', note: bearTravel.result.title, point: 20, at: bearTravel.result.completedAt, image: '/images/government-complex-diorama.png' });
  if (habitat.result) records.push({ id: 'habitat', zone: 'AI 생태 연구소', title: '서식지 설계 완료', note: habitat.result.title, point: 25, at: habitat.result.completedAt, image: '/images/government-complex-diorama.png' });

  const sortedRecords = records.sort((a, b) => (b.at ? Date.parse(b.at) : 0) - (a.at ? Date.parse(a.at) : 0));
  const experienceCount = sortedRecords.length;
  const points = records.reduce((sum, item) => sum + item.point, 0);
  const visitedZoneCount = zones.filter(zone => zone.visited).length;
  const completion = Math.min(100, Math.round((visitedZoneCount / PROFILE_ZONES.length) * 45 + Math.min(1, experienceCount / 24) * 55));
  const performanceRecords = harnessHistory.filter(item => item.mapId === 'arts-center');
  const performancePoints = performanceRecords.reduce((sum, item) => sum + item.point, 0);
  const foodRecords = harnessHistory.filter(item => item.mapId === 'food-experience');
  const foodSignal = Math.min(30, foodRecords.reduce((sum,item)=>sum+item.point,0) + countArray(lake?.foodPlaceInterests)*4);
  const performanceWatchCount = performanceRecords.filter(item => item.breakdown.some(part => part.label.includes('영상'))).length;
  const festivalSignal=Math.min(35,festivalKeywords.reduce((sum,item)=>sum+item.count,0)*2);
  const festivalPlanning=festivalKeywords.some(item=>item.keyword==='방문·계획');
  const scores = {
    nature: Math.min(100, zones.filter(z => ['town', 'bear-tree-park', 'bear-play-zone', 'garden', 'jochwon-park'].includes(z.id) && z.visited).length * 9 + greenhouse.collected.length * 4+campusAxes.nature),
    culture: Math.min(100, zones.filter(z => ['arts-center', 'festival-experience'].includes(z.id) && z.visited).length * 12 + countArray(lake?.activities) * 8 + performancePoints * 3 + festivalSignal+campusAxes.culture),
    food: Math.min(100, foodSignal * 3 + (visitedIds.has('food-experience') ? 5 : 0)+campusAxes.food),
    relation: Math.min(100, zones.filter(z => ['campus', 'student-hall', 'project-room'].includes(z.id) && z.visited).length * 6 + campus.length * 5+campusAxes.relation),
    record: Math.min(100, sortedRecords.filter(item=>!item.id.startsWith('campus-signal-')).length * 4 + greenhouse.memoryLeaves.length * 8 + performanceRecords.length * 5 + (festivalPlanning?6:0)+campusAxes.record),
    explore: Math.min(100, visitedIds.size * 3 + (bearTravel.result ? 15 : 0) + performanceWatchCount * 6 + festivalKeywords.length*2 + (festivalPlanning?8:0) + Math.min(20,foodRecords.length*5+countArray(lake?.foodPlaceInterests)*3)+campusAxes.explore),
  };
  return { visits, zones, records: sortedRecords, points, completion, visitedZoneCount, experienceCount, scores, lakeRecords, festivalKeywords, greenhouse, bear, campus, campusSignals };
}

function imageForMap(mapId: MapId) {
  if (mapId === 'arts-center') return '/images/performances/starry-night-2026.jpg';
  if (mapId === 'festival-experience') return '/images/festivals/nakhwa-2026.jpg';
  if (mapId === 'garden') return '/images/festivals/spring-flower-2026.jpg';
  return '/images/government-complex-diorama.png';
}
