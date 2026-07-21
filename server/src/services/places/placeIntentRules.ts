import type { ConversationAnalysis, ConversationMessage, PlaceCandidate } from '../../types/recommendation.js';

export type PlaceIntent = 'movie' | 'boardgame' | 'cafe' | 'food' | 'walk' | 'leisure' | 'other';

export interface PlaceIntentRule {
  label: string;
  category: string;
  requiredKeywords: string[];
  allowedCategoryPatterns: string[];
  searchQueries: (region: string) => string[];
}

const GLOBAL_REJECTED_PATTERNS = [
  '보험', '손해보험', '생명보험', '은행', '금융', '증권', '대출', '카드', '부동산', '공인중개',
  '병원', '의원', '치과', '약국', '정비', '주차장', '행정복지', '관공서', '사무소', '법무', '세무',
];

export const PLACE_INTENT_RULES: Record<PlaceIntent, PlaceIntentRule> = {
  movie: { label: '영화 보기', category: '영화관', requiredKeywords: ['영화관', '극장', '시네마'], allowedCategoryPatterns: ['영화관', '극장', '시네마', '메가박스', 'cgv', '롯데시네마'], searchQueries: region => [`${region} 영화관`] },
  boardgame: { label: '보드게임 카페 가기', category: '보드게임카페', requiredKeywords: ['보드게임', '보드카페'], allowedCategoryPatterns: ['보드게임', '보드카페', '카페'], searchQueries: region => [`${region} 보드게임 카페`, `${region} 보드카페`, `${region} 카페`] },
  cafe: { label: '카페 가기', category: '카페', requiredKeywords: ['카페', '커피', '디저트'], allowedCategoryPatterns: ['카페', '커피전문점', '디저트', '베이커리'], searchQueries: region => [`${region} 카페`] },
  food: { label: '함께 식사하기', category: '음식점', requiredKeywords: ['음식점', '맛집', '식당'], allowedCategoryPatterns: ['음식점', '한식', '일식', '중식', '양식', '분식', '고기'], searchQueries: region => [`${region} 음식점`] },
  walk: { label: '함께 산책하기', category: '공원', requiredKeywords: ['공원', '산책로'], allowedCategoryPatterns: ['공원', '산책', '관광명소', '자연'], searchQueries: region => [`${region} 공원`] },
  leisure: { label: '함께 여가 즐기기', category: '여가시설', requiredKeywords: ['볼링', '방탈출', '노래방', '전시', '공연'], allowedCategoryPatterns: ['볼링', '방탈출', '노래방', '전시', '공연', '미술관', '박물관', '테마카페'], searchQueries: region => [`${region} 놀거리`, `${region} 데이트`] },
  other: { label: '구체적인 활동 없음', category: '', requiredKeywords: [], allowedCategoryPatterns: [], searchQueries: () => [] },
};

const signals: Array<[Exclude<PlaceIntent, 'other'>, string[]]> = [
  ['boardgame', ['보드게임 카페', '보드게임카페', '보드카페', '보드게임']],
  ['movie', ['영화관', '영화', '시네마', '메가박스', 'cgv', '롯데시네마']],
  ['food', ['밥', '고기', '음식', '맛집', '식당', '레스토랑', '파스타', '술집', '이자카야']],
  ['walk', ['공원', '산책', '걷기']],
  ['leisure', ['볼링', '방탈출', '노래방', '전시', '공연', '미술관', '박물관', '놀거리', '데이트 코스']],
  ['cafe', ['카페', '커피', '디저트']],
];

const positive = /^(응|네|넵+|좋아(?:요)?|괜찮아|그래|콜|가자|하자|ok)$/i;
const negative = /^(아니|아니요|노노|싫어|별로|안\s*가|됐어|no)$/i;
const normalize = (value: string) => value.toLocaleLowerCase('ko-KR');

export function detectExplicitPlaceIntent(text: string): Exclude<PlaceIntent, 'other'> | undefined {
  const normalized = normalize(text);
  return signals.find(([, terms]) => terms.some(term => normalized.includes(term)))?.[0];
}

export function hasExplicitPlaceIntent(messages: ConversationMessage[], userRequest = ''): boolean {
  return Boolean(detectExplicitPlaceIntent(`${messages.map(item => item.message).join(' ')} ${userRequest}`));
}

function specificTerm(text: string, terms: string[]) { return terms.find(term => normalize(text).includes(term)); }

function buildSearchQueries(activity: PlaceIntent, region: string, text: string, moods: string[]) {
  if (activity === 'boardgame') return PLACE_INTENT_RULES.boardgame.searchQueries(region);
  if (activity === 'cafe') {
    const moodText = normalize(`${text} ${moods.join(' ')}`);
    const queries: string[] = [];
    if (/(조용|차분|한적|대화|북카페)/.test(moodText)) queries.push(`${region} 조용한 카페`);
    if (/(분위기|감성|예쁜|데이트)/.test(moodText)) queries.push(`${region} 분위기 좋은 카페`);
    if (/(디저트|베이커리|빵)/.test(moodText)) queries.push(`${region} 디저트 카페`);
    return [...new Set([...queries, `${region} 카페`])];
  }
  if (activity === 'food') {
    const term = specificTerm(text, ['파스타', '고기', '한식', '일식', '중식', '분식', '술집', '이자카야', '레스토랑']);
    return [...new Set([term ? `${region} ${term}` : '', `${region} 음식점`].filter(Boolean))];
  }
  if (activity === 'leisure') {
    const term = specificTerm(text, ['볼링', '방탈출', '노래방', '전시', '공연', '미술관', '박물관']);
    return term ? [`${region} ${term}`] : PLACE_INTENT_RULES.leisure.searchQueries(region);
  }
  return PLACE_INTENT_RULES[activity].searchQueries(region);
}

export function resolveConversationIntent(analysis: ConversationAnalysis, messages: ConversationMessage[], region: string, userRequest = ''): ConversationAnalysis {
  let lastProposal: Exclude<PlaceIntent, 'other'> | undefined;
  let accepted: Exclude<PlaceIntent, 'other'> | undefined;
  const rejected = new Set<PlaceIntent>();
  for (const item of messages) {
    const text = normalize(item.message.trim());
    const mention = detectExplicitPlaceIntent(text);
    if (mention) { lastProposal = mention; accepted = mention; continue; }
    if (lastProposal && negative.test(text)) { rejected.add(lastProposal); if (accepted === lastProposal) accepted = undefined; lastProposal = undefined; continue; }
    if (lastProposal && positive.test(text)) { accepted = lastProposal; lastProposal = undefined; }
  }
  const requested = detectExplicitPlaceIntent(userRequest);
  const activity: PlaceIntent = requested ?? accepted ?? 'other';
  const rule = PLACE_INTENT_RULES[activity];
  const combinedText = `${messages.map(item => item.message).join(' ')} ${userRequest}`;
  const preferredMood = [...analysis.preferredMood];
  if (/(조용|차분|한적)/.test(combinedText) && !preferredMood.some(value => /조용|차분|한적/.test(value))) preferredMood.unshift('조용한');
  const rejectedCategories = [...new Set([...analysis.rejectedCategories, ...rejected].map(value => value in PLACE_INTENT_RULES ? PLACE_INTENT_RULES[value as PlaceIntent].category : value).filter(Boolean))];
  return { ...analysis, activity, preferredMood, meetingIntent: rule.label, placeCategories: rule.category ? [rule.category] : [], rejectedCategories, searchKeywords: buildSearchQueries(activity, region, combinedText, preferredMood).slice(0, 5), summary: activity === 'other' ? '추천할 구체적인 활동을 대화에서 찾지 못했습니다.' : `두 분이 ${rule.label}에 관심이 있는 대화를 반영했습니다.${preferredMood.length ? ` 선호 분위기: ${preferredMood.join(', ')}.` : ''}` };
}

export function isPlaceCompatibleWithIntent(place: PlaceCandidate, intent: PlaceIntent) {
  const rule = PLACE_INTENT_RULES[intent];
  const text = normalize(`${place.name} ${place.category} ${(place.tags ?? []).join(' ')}`);
  if (GLOBAL_REJECTED_PATTERNS.some(pattern => text.includes(normalize(pattern)))) return false;
  if (place.intentTypes?.length && !place.intentTypes.includes(intent) && !(intent === 'boardgame' && place.intentTypes.includes('cafe'))) return false;
  if (intent === 'other') return false;
  return rule.allowedCategoryPatterns.some(pattern => text.includes(normalize(pattern)));
}
