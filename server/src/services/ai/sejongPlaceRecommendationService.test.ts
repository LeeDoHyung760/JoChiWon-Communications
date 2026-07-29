import assert from 'node:assert/strict';
import { test } from 'node:test';
import { env } from '../../config/env.js';
import { ExternalProviderError } from '../../providers/types.js';
import { getOpenAIClient } from './openaiClient.js';
import { SejongPlaceRecommendationService, type PlaceRecommendationGenerator, type PlaceRecommendationStore } from './sejongPlaceRecommendationService.js';
import type { PlaceRecommendationInput, PlaceRecommendationResult } from './schemas/placeRecommendationSchema.js';

const requester = {
  userId: 'untrusted-body-id', interests: ['자연'], currentNeeds: ['산책'], campusInterests: ['사진'],
  plantProfile: { representativePlant: '소나무', discoveredPlants: ['소나무'], completionRate: 30 },
  festivalProfile: { visitedFestivals: [], likedBooths: [], likedActivities: ['사진'] },
};
const candidates = [
  { placeId: 'p1', name: '장소 1', category: '공원', address: '세종시', tags: ['산책'], isLocalBusiness: false, source: 'database' as const },
  { placeId: 'p2', name: '장소 2', category: '카페', address: '세종시', tags: ['차'], isLocalBusiness: true, source: 'kakao' as const },
];
const validResult: PlaceRecommendationResult = {
  recommendationTitle: '자연과 카페 코스', userSummary: '자연과 사진을 위한 코스입니다.', sharedInterests: ['자연'],
  conversationStarters: ['기억에 남은 식물은 무엇인가요?'],
  route: [
    { placeId: 'p1', order: 1, recommendedMinutes: 60, reason: '산책 관심 반영', experienceConnection: '식물도감과 연결', localEconomyConnection: '지역 방문으로 연결' },
    { placeId: 'p2', order: 2, recommendedMinutes: 40, reason: '휴식 필요 반영', experienceConnection: '캠퍼스 관심과 연결', localEconomyConnection: '지역 카페 이용' },
  ],
  totalEstimatedMinutes: 100, routeConcept: '자연을 보고 지역 카페에서 쉬는 코스', cautions: [],
};
const input = (overrides: Partial<PlaceRecommendationInput> = {}): PlaceRecommendationInput => ({ requester, candidatePlaces: candidates, ...overrides });

function mockedService(result: PlaceRecommendationResult, calls: { generate: number; received?: PlaceRecommendationInput; requesterId?: string }) {
  const generator: PlaceRecommendationGenerator = { async generate(value) { calls.generate++; calls.received = value; return result; } };
  const store: PlaceRecommendationStore = { async save(_input, _result, requesterId) { calls.requesterId = requesterId; return 'recommendation-id'; } };
  return new SejongPlaceRecommendationService(generator, store);
}

test('정상적인 한 명 추천은 인증 ID로 저장된다', async () => {
  const calls: { generate: number; requesterId?: string } = { generate: 0 };
  const value = await mockedService(validResult, calls).create(input(), 'authenticated-id');
  assert.equal(value.recommendationId, 'recommendation-id');
  assert.equal(calls.requesterId, 'authenticated-id');
});

test('서로 다른 companion 취향을 모델에 전달한다', async () => {
  const calls: { generate: number; received?: PlaceRecommendationInput } = { generate: 0 };
  await mockedService(validResult, calls).create(input({ companion: {
    ...requester, userId: 'companion-id', interests: ['카페'], plantProfile: { discoveredPlants: [], completionRate: 0 },
  } }), 'authenticated-id');
  assert.deepEqual(calls.received?.companion?.interests, ['카페']);
});

test('빈 후보는 OpenAI 호출 전에 차단된다', async () => {
  const calls = { generate: 0 };
  await assert.rejects(mockedService(validResult, calls).create({ requester, candidatePlaces: [] }, 'id'), hasCode('CANDIDATE_PLACES_EMPTY'));
  assert.equal(calls.generate, 0);
});

test('후보 밖 placeId를 차단한다', async () => {
  const calls = { generate: 0 };
  const result = { ...validResult, route: [{ ...validResult.route[0]!, placeId: 'unknown' }], totalEstimatedMinutes: 60 };
  await assert.rejects(mockedService(result, calls).create(input(), 'id'), hasCode('UNKNOWN_PLACE'));
});

test('중복 placeId를 차단한다', async () => {
  const calls = { generate: 0 };
  const result = { ...validResult, route: [validResult.route[0]!, { ...validResult.route[0]!, order: 2 }], totalEstimatedMinutes: 120 };
  await assert.rejects(mockedService(result, calls).create(input(), 'id'), hasCode('DUPLICATE_PLACE'));
});

test('completionRate가 0~100 밖이면 실패한다', async () => {
  const calls = { generate: 0 };
  const invalid = input({ requester: { ...requester, plantProfile: { discoveredPlants: [], completionRate: 101 } } });
  await assert.rejects(mockedService(validResult, calls).create(invalid, 'id'), hasCode('INVALID_INPUT'));
});

test('API 키가 없으면 missing_key 오류를 반환한다', () => {
  const previous = env.OPENAI_API_KEY;
  (env as { OPENAI_API_KEY?: string }).OPENAI_API_KEY = undefined;
  try {
    assert.throws(() => getOpenAIClient(), (error: unknown) => error instanceof ExternalProviderError && error.kind === 'missing_key');
  } finally {
    (env as { OPENAI_API_KEY?: string }).OPENAI_API_KEY = previous;
  }
});

function hasCode(code: string) {
  return (error: unknown) => error instanceof Error && 'code' in error && error.code === code;
}
