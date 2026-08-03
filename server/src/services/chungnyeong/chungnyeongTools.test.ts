import assert from 'node:assert/strict';
import test from 'node:test';
import { getSpaceGuide, searchOpenRecruitments } from './chungnyeongTools.js';

test('프로젝트 생성은 모집센터가 아닌 프로젝트실로 안내한다', () => {
  assert.deepEqual(getSpaceGuide({ purpose: 'create_project' }), {
    destination: '프로젝트실',
    reason: '프로젝트 생성과 팀 작업은 프로젝트실에서 진행합니다.',
    travelAction: 'project-room',
  });
});

test('모집 추천 점수는 서버가 계산하고 요청 개수로 제한한다', () => {
  const result = searchOpenRecruitments({ interests: ['사진', '수목원'], status: 'recruiting', limit: 2 });
  assert.equal(result.recruitments.length, 2);
  assert.equal(result.recruitments[0]?.id, 'garden-photo');
  assert.equal(result.recruitments[0]?.matchScore, 85);
});
