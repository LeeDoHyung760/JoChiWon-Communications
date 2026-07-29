export const INTEREST_IDS = [
  'plant', 'nature', 'festival', 'photo', 'cafe', 'food', 'culture',
  'performance', 'shopping', 'workshop', 'walking', 'activity', 'study',
  'technology', 'campus', 'local_business',
] as const;

export type InterestId = typeof INTEREST_IDS[number];
export const INTEREST_LABELS: Record<InterestId, string> = {
  plant: '식물', nature: '자연', festival: '축제', photo: '사진',
  cafe: '카페', food: '음식', culture: '문화', performance: '공연',
  shopping: '쇼핑', workshop: '공방·체험', walking: '산책',
  activity: '활동', study: '공부', technology: '기술',
  campus: '캠퍼스', local_business: '지역 상점',
};
export const isInterestId = (value: unknown): value is InterestId =>
  typeof value === 'string' && (INTEREST_IDS as readonly string[]).includes(value);

