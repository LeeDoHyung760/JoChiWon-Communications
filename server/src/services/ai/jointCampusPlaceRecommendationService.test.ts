import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  jointCampusRecommendationInputSchema,
  jointCampusRecommendationOutputSchema,
  validateJointRecommendationResult,
} from './schemas/jointCampusPlaceRecommendationSchema.js';

const user = {
  userId: '507f1f77bcf86cd799439011',
  displayName: '사용자',
  explicitInterests: ['plant'] as const,
  inferredInterests: [{ id: 'cafe' as const, confidence: 0.7 }],
};
const input = jointCampusRecommendationInputSchema.parse({
  roomId: 'room-1',
  requester: user,
  companion: { ...user, userId: '507f1f77bcf86cd799439012' },
  sharedKeywords: ['plant'],
  candidatePlaces: [{
    placeId: 'p1', name: '장소', category: '카페', address: '세종시',
    tags: [], isLocalBusiness: true, source: 'kakao',
  }],
});
const output = () => jointCampusRecommendationOutputSchema.parse({
  recommendationTitle: '추천',
  sharedInterestSummary: '공통 관심사 요약',
  usedExplicitInterests: ['plant'],
  usedInferredInterests: ['cafe'],
  route: [{
    placeId: 'p1', order: 1, recommendedMinutes: 60,
    reasonForRequester: '이유', reasonForCompanion: '이유', sharedReason: '공통 이유',
    experienceConnection: '체험 연결', localEconomyConnection: '지역경제 연결',
  }],
  conversationStarters: [],
  totalEstimatedMinutes: 999,
  routeConcept: '코스',
  cautions: [],
});

test('후보 안 placeId를 허용하고 총 시간을 서버에서 재계산', () => {
  assert.equal(validateJointRecommendationResult(output(), input).totalEstimatedMinutes, 60);
});
test('후보 밖 placeId 차단', () => {
  const value = output();
  value.route[0]!.placeId = 'unknown';
  assert.throws(() => validateJointRecommendationResult(value, input), /후보/);
});
test('중복 장소 차단', () => {
  const value = output();
  value.route.push({ ...value.route[0]!, order: 2 });
  assert.throws(() => validateJointRecommendationResult(value, input), /중복/);
});
test('잘못된 순서를 차단', () => {
  const value = output();
  value.route[0]!.order = 2;
  assert.throws(() => validateJointRecommendationResult(value, input), /순서/);
});
test('입력에 없던 관심사를 모델이 만들면 차단', () => {
  const value = output();
  value.usedExplicitInterests = ['photo'];
  assert.throws(() => validateJointRecommendationResult(value, input), /관심사/);
});
test('candidatePlaces가 비어 있으면 입력 단계에서 실패', () => {
  assert.equal(jointCampusRecommendationInputSchema.safeParse({ ...input, candidatePlaces: [] }).success, false);
});
test('민감한 사용자 필드는 strict 입력에서 거부', () => {
  assert.equal(jointCampusRecommendationInputSchema.safeParse({
    ...input,
    requester: { ...input.requester, email: 'private@example.com', birthInfo: { birthyear: '2000' } },
  }).success, false);
});
