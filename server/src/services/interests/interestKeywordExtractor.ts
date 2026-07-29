import type { InterestId } from './interestCatalog.js';

export interface InterestKeywordExtractor {
  extract(message: string): Array<{ id: InterestId; confidence: number; source: 'conversation' }>;
}

const synonyms: Partial<Record<InterestId, string[]>> = {
  plant: ['식물', '꽃', '나무', '수목원', '정원'],
  photo: ['사진', '포토존', '촬영', '카메라'],
  cafe: ['카페', '커피', '디저트', '빵'],
  food: ['맛집', '식당', '밥', '음식', '먹거리'],
  festival: ['축제', '행사', '부스'],
  performance: ['공연', '콘서트'],
  walking: ['산책', '걷기', '호수', '공원'],
  technology: ['기술', 'ai', '개발', '코딩'],
  study: ['공부', '도서관', '스터디'],
  culture: ['전시', '문화', '박물관'],
  workshop: ['공방', '만들기', '체험'],
  shopping: ['쇼핑', '상점', '시장'],
  campus: ['캠퍼스', '동아리'],
};

const containsPersonalData = (value: string) =>
  /\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\d{6}[-\s]?[1-4]\d{6}/i.test(value);

export class LocalInterestKeywordExtractor implements InterestKeywordExtractor {
  extract(message: string) {
    const normalized = message.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/g, ' ').trim();
    if (!normalized || containsPersonalData(normalized)) return [];
    return (Object.entries(synonyms) as Array<[InterestId, string[]]>)
      .filter(([, words]) => words.some(word => normalized.includes(word)))
      .map(([id]) => ({ id, confidence: 0.55, source: 'conversation' as const }));
  }
}

export const localInterestKeywordExtractor = new LocalInterestKeywordExtractor();

