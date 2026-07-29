import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MemoryConversationInterestCache } from './conversationInterestCache.js';
import { LocalInterestKeywordExtractor } from './interestKeywordExtractor.js';
import { mergeInterests } from './interestMergeService.js';

test('규칙 기반 추출기는 메시지 원문 없이 관심사만 반환', () => {
  const result = new LocalInterestKeywordExtractor().extract('식물 사진 찍고 카페에서 커피 마셔요');
  assert.deepEqual(result.map(({ id }) => id).sort(), ['cafe', 'photo', 'plant']);
  assert.equal(JSON.stringify(result).includes('커피 마셔요'), false);
});
test('한 메시지의 같은 관심사는 한 번만 계산', () => {
  const result = new LocalInterestKeywordExtractor().extract('사진 사진 카메라 촬영');
  assert.equal(result.filter(({ id }) => id === 'photo').length, 1);
});
test('개인정보가 포함된 메시지는 캐시 후보로 만들지 않음', () => {
  assert.deepEqual(new LocalInterestKeywordExtractor().extract('010-1234-5678로 연락해서 카페 가요'), []);
});
test('캐시 TTL 만료', () => {
  let now = new Date(0);
  const cache = new MemoryConversationInterestCache(100, 10, () => now);
  cache.merge('r', 'u', [{ id: 'plant', confidence: 0.5, source: 'conversation' }]);
  now = new Date(101);
  assert.equal(cache.get('r', 'u'), undefined);
});
test('캐시 최대 크기 제한', () => {
  const cache = new MemoryConversationInterestCache(1000, 2, () => new Date());
  for (const userId of ['a', 'b', 'c']) cache.merge('r', userId, [{ id: 'plant', confidence: 0.5, source: 'conversation' }]);
  assert.equal(cache.size, 2);
});
test('반복 언급은 confidence를 높이고 0.95를 넘지 않음', () => {
  const cache = new MemoryConversationInterestCache();
  for (let i = 0; i < 10; i += 1) cache.merge('r', 'u', [{ id: 'cafe', confidence: 0.4, source: 'conversation' }]);
  assert.equal(cache.get('r', 'u')?.keywords[0]?.confidence, 0.95);
});
test('병합 시 명시적 관심사가 우선되고 추론 중복 제거', () => {
  const result = mergeInterests(['plant'], [
    { id: 'plant', confidence: 0.9 }, { id: 'cafe', confidence: 0.8 },
  ]);
  assert.deepEqual(result.combined, ['plant', 'cafe']);
  assert.deepEqual(result.inferred.map(({ id }) => id), ['cafe']);
});
