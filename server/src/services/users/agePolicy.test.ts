import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ageGroupFromBirthDate, canStartDirectChat } from './agePolicy.js';

const now = new Date('2026-07-29T00:00:00.000Z');

test('만 19세 생일이 지난 사용자는 adult로 분류한다', () => {
  assert.equal(ageGroupFromBirthDate('2007-07-29', now), 'adult');
});

test('만 19세 생일 전과 잘못된 생년월일은 안전하게 분류한다', () => {
  assert.equal(ageGroupFromBirthDate('2007-07-30', now), 'minor');
  assert.equal(ageGroupFromBirthDate('invalid', now), 'unknown');
});

test('성인과 미성년자 및 연령 미확인 계정의 1:1 채팅을 차단한다', () => {
  assert.equal(canStartDirectChat('adult', 'minor'), false);
  assert.equal(canStartDirectChat('adult', 'unknown'), false);
  assert.equal(canStartDirectChat('minor', 'minor'), true);
  assert.equal(canStartDirectChat('adult', 'adult'), true);
});
