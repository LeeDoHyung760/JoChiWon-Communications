import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canStartDirectChat, classifyAgeGroup } from './ageClassificationService.js';

const now = new Date('2026-07-30T12:00:00.000Z');

test('정확히 만 19세 생일이면 adult', () => {
  assert.equal(classifyAgeGroup({ birthyear: '2007', birthday: '0730', birthdayType: 'SOLAR', now }).ageGroup, 'adult');
});
test('만 19세 생일 전이면 minor', () => {
  assert.equal(classifyAgeGroup({ birthyear: '2007', birthday: '0731', birthdayType: 'SOLAR', now }).ageGroup, 'minor');
});
test('출생 연도 누락은 unknown', () => {
  assert.equal(classifyAgeGroup({ birthday: '0730', birthdayType: 'SOLAR', now }).reason, 'MISSING_BIRTHYEAR');
});
test('생일 누락은 unknown', () => {
  assert.equal(classifyAgeGroup({ birthyear: '2007', birthdayType: 'SOLAR', now }).reason, 'MISSING_BIRTHDAY');
});
test('잘못된 날짜와 미래/비정상 과거 출생 연도를 거부', () => {
  for (const [birthyear, birthday] of [['2007', '0230'], ['2027', '0101'], ['1800', '0101']]) {
    assert.equal(classifyAgeGroup({ birthyear, birthday, birthdayType: 'SOLAR', now }).reason, 'INVALID_FORMAT');
  }
});
test('음력은 양력으로 계산하지 않음', () => {
  const result = classifyAgeGroup({ birthyear: '2000', birthday: '0101', birthdayType: 'LUNAR', now });
  assert.deepEqual([result.ageGroup, result.reason], ['unknown', 'UNSUPPORTED_LUNAR_DATE']);
});
test('동일하고 확정된 연령 그룹만 채팅 가능', () => {
  assert.equal(canStartDirectChat({ ageGroup: 'adult' }, { ageGroup: 'adult' }), true);
  assert.equal(canStartDirectChat({ ageGroup: 'minor' }, { ageGroup: 'minor' }), true);
  assert.equal(canStartDirectChat({ ageGroup: 'adult' }, { ageGroup: 'minor' }), false);
  assert.equal(canStartDirectChat({ ageGroup: 'adult' }, { ageGroup: 'unknown' }), false);
  assert.equal(canStartDirectChat({ ageGroup: 'unknown' }, { ageGroup: 'unknown' }), false);
});
