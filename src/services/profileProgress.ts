import type { MapId } from '../../shared/socket-events';
import type { UserProfile } from '../types';
import { loadBearProgress } from '../data/bear-wildlife';
import { loadBearHabitatProgress } from './bearHabitatDecision';
import { loadBearTravelProgress } from './bearTravelStyle';
import { loadVisitedCampusBuildings } from './campusVisits';
import { parseGreenhouseProgress } from './greenhouseProgress';

export const PROFILE_VISITS_PREFIX = 'sejong-profile-visits-v1:';
const LAKE_KEY = 'sejong-lake-interest-profile-v1';
const keyFor = (nickname: string) => `${PROFILE_VISITS_PREFIX}${nickname.trim().toLowerCase() || 'guest'}`;

export type ProfileVisit = { mapId: MapId; visitedAt: string };
export type ProfileZone = { id: string; label: string; maps: MapId[]; icon: string };
export type ProfileRecord = { id: string; zone: string; title: string; note: string; point: number; at?: string; image: string };

export const PROFILE_ZONES: ProfileZone[] = [
  { id: 'lake', label: '세종호수공원', maps: ['town'], icon: '🌊' },
  { id: 'culture', label: '예술·축제 공간', maps: ['arts-center', 'festival-experience', 'food-experience'], icon: '🎭' },
  { id: 'bear', label: '베어트리파크', maps: ['bear-tree-park', 'bear-play-zone'], icon: '🐻' },
  { id: 'garden', label: '국립세종수목원', maps: ['garden'], icon: '🌿' },
  { id: 'campus', label: '공동캠퍼스', maps: ['campus', 'student-hall', 'project-room'], icon: '🎓' },
  { id: 'government', label: '정부세종청사', maps: ['government', 'government-central-plaza', 'government-policy-hall', 'government-observatory', 'sejong-smart-city'], icon: '🏛️' },
  { id: 'local', label: '조치원 생활권', maps: ['jochwon-station', 'traditional-market', 'jochwon-park', 'college-street'], icon: '🚉' },
];

const MAP_LABELS: Record<MapId, string> = {
  town: '세종호수공원', 'arts-center': '세종예술의전당', 'festival-experience': '축제 체험장', 'food-experience': '먹거리 체험장',
  'bear-tree-park': '베어트리파크', 'bear-play-zone': 'AI 생태 연구소', garden: '국립세종수목원', campus: '공동캠퍼스',
  'student-hall': '학생회관', 'project-room': '프로젝트실', government: '정부세종청사', 'government-central-plaza': '정부청사 중앙광장',
  'government-policy-hall': '정책 체험관', 'government-observatory': '정부청사 전망대', 'sejong-smart-city': '스마트시티 전시관',
  'jochwon-station': '조치원역', 'traditional-market': '세종전통시장', 'jochwon-park': '조치원공원', 'college-street': '대학로',
};

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

export function buildProfileProgress(profile: UserProfile) {
  const visits = loadProfileVisits(profile.nickname);
  const visitedIds = new Set(visits.map(item => item.mapId));
  const zones = PROFILE_ZONES.map(zone => ({ ...zone, visited: zone.maps.some(id => visitedIds.has(id)), mapVisits: zone.maps.filter(id => visitedIds.has(id)).length }));
  const greenhouse = parseGreenhouseProgress(localStorage.getItem(`greenhouse-progress-v1:${profile.nickname.trim().toLowerCase() || 'guest'}`));
  const bear = loadBearProgress(profile.nickname);
  const bearTravel = loadBearTravelProgress(profile.nickname);
  const habitat = loadBearHabitatProgress(profile.nickname);
  const campus = loadVisitedCampusBuildings(profile.nickname);
  const lake = safeLake();
  const lakeRecords = countArray(lake?.savedContentIds) + countArray(lake?.activities) + countArray(lake?.foodPlaceInterests) + countArray(lake?.likedCourseTitles);
  const experienceCount = lakeRecords + greenhouse.collected.length + greenhouse.memoryLeaves.length + bear.completedClues.length + campus.length + (bearTravel.result ? 1 : 0) + (habitat.result ? 1 : 0);

  const records: ProfileRecord[] = [];
  visits.forEach(visit => records.push({ id: `visit-${visit.mapId}`, zone: MAP_LABELS[visit.mapId], title: `${MAP_LABELS[visit.mapId]} 첫 방문`, note: '새로운 세종 공간을 발견했어요', point: 5, at: visit.visitedAt, image: imageForMap(visit.mapId) }));
  const addLakeRecords = (value: unknown, prefix: string, title: string, note: string, image: string) => {
    if (!Array.isArray(value)) return;
    value.forEach((entry, index) => {
      const rawId = typeof entry === 'string' ? entry : entry && typeof entry === 'object' && 'id' in entry ? String(entry.id) : String(index);
      records.push({ id: `lake-${prefix}-${rawId}`, zone: '세종호수공원', title, note, point: 7, image });
    });
  };
  addLakeRecords(lake?.savedContentIds, 'content', '관심 콘텐츠 저장', '마음에 드는 축제와 장소를 발견했어요', '/images/festivals/nakhwa-2026.jpg');
  addLakeRecords(lake?.activities, 'activity', '공연 취향 기록', '좋아하는 공연 분위기를 선택했어요', '/images/performances/starry-night-2026.jpg');
  addLakeRecords(lake?.foodPlaceInterests, 'food', '세종 먹거리 발견', '가보고 싶은 로컬 맛집을 저장했어요', '/images/food-shops/jochwon-market.jpg');
  addLakeRecords(lake?.likedCourseTitles, 'course', '맞춤 코스 저장', '나에게 맞는 세종 코스를 골랐어요', '/images/festivals/nakhwa-2026.jpg');
  greenhouse.collected.forEach((item, index) => records.push({ id: `plant-${item.plantId}`, zone: '국립세종수목원', title: `식물 관찰 ${index + 1}번째 기록`, note: item.selectedEmotion ? `${item.selectedEmotion}의 감정을 남겼어요` : '새로운 식물을 발견했어요', point: item.selectedEmotion ? 10 : 6, at: item.collectedAt, image: '/images/festivals/spring-flower-2026.jpg' }));
  greenhouse.memoryLeaves.forEach(item => records.push({ id: `memory-${item.id}`, zone: '국립세종수목원', title: '마음의 잎 기록', note: item.dominantEmotion ? `${item.dominantEmotion}의 마음을 간직했어요` : '자연에서 느낀 마음을 남겼어요', point: 12, at: item.createdAt, image: '/images/festivals/spring-flower-2026.jpg' }));
  bear.completedClues.forEach((id, index) => records.push({ id: `bear-${id}`, zone: '베어트리파크', title: `곰 생태 단서 ${index + 1} 발견`, note: '생태 조사 기록을 완성했어요', point: 10, at: bear.completedAt, image: '/images/government-complex-diorama.png' }));
  campus.forEach(id => records.push({ id: `campus-${id}`, zone: '공동캠퍼스', title: '캠퍼스 공간 탐험', note: '새로운 교류 공간을 둘러봤어요', point: 8, image: '/images/government-complex-diorama.png' }));
  if (bearTravel.result) records.push({ id: 'bear-travel', zone: '베어트리파크', title: '나의 여행 스타일 발견', note: bearTravel.result.title, point: 20, at: bearTravel.result.completedAt, image: '/images/government-complex-diorama.png' });
  if (habitat.result) records.push({ id: 'habitat', zone: 'AI 생태 연구소', title: '서식지 설계 완료', note: habitat.result.title, point: 25, at: habitat.result.completedAt, image: '/images/government-complex-diorama.png' });

  const sortedRecords = records.sort((a, b) => (b.at ? Date.parse(b.at) : 0) - (a.at ? Date.parse(a.at) : 0));
  const points = records.reduce((sum, item) => sum + item.point, 0);
  const visitedZoneCount = zones.filter(zone => zone.visited).length;
  const completion = Math.min(100, Math.round((visitedZoneCount / PROFILE_ZONES.length) * 45 + Math.min(1, experienceCount / 24) * 55));
  const scores = {
    nature: Math.min(100, 18 + zones.filter(z => ['lake', 'bear', 'garden'].includes(z.id) && z.visited).length * 15 + greenhouse.collected.length * 4),
    culture: Math.min(100, 15 + (zones.find(z => z.id === 'culture')?.visited ? 30 : 0) + countArray(lake?.activities) * 8),
    relation: Math.min(100, 12 + (zones.find(z => z.id === 'campus')?.visited ? 28 : 0) + campus.length * 10),
    record: Math.min(100, 10 + sortedRecords.length * 4 + greenhouse.memoryLeaves.length * 8),
    explore: Math.min(100, 10 + visitedIds.size * 5 + (bearTravel.result ? 15 : 0)),
  };
  return { visits, zones, records: sortedRecords, points, completion, visitedZoneCount, experienceCount, scores, lakeRecords, greenhouse, bear, campus };
}

function imageForMap(mapId: MapId) {
  if (mapId === 'arts-center') return '/images/performances/starry-night-2026.jpg';
  if (mapId === 'festival-experience') return '/images/festivals/nakhwa-2026.jpg';
  if (mapId === 'garden') return '/images/festivals/spring-flower-2026.jpg';
  return '/images/government-complex-diorama.png';
}
