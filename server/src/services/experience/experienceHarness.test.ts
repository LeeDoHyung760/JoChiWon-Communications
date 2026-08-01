import assert from 'node:assert/strict';
import test from 'node:test';
import {scoreMapExit} from './experienceHarness.js';

test('공연 임계값과 종료 보너스를 서버에서 계산한다',()=>{
  const result=scoreMapExit({mapId:'arts-center',sessionId:'session-123',events:[{type:'watch',at:0,durationSeconds:42},{type:'finish',at:42000}]});
  assert.deepEqual(result.scores,{culture:2,immersion:7});
  assert.deepEqual(result.evidence,['공연 42초 시청','공연 끝까지 시청']);
});

test('포스터 탐색은 관람 점수로 계산하지 않고 실제 장르 시청과 관심만 누적한다',()=>{
  const result=scoreMapExit({mapId:'arts-center',sessionId:'session-performance-signals',events:[{type:'browse',performanceId:'0',at:0,durationSeconds:120},{type:'watch',performanceId:'0',at:1,durationSeconds:45},{type:'favorite',performanceId:'0',at:2},{type:'finish',performanceId:'0',at:3}]});
  assert.equal(result.scores.culture,2);assert.equal(result.scores.musical,13);assert.equal(result.scores.preference,5);assert.equal(result.scores.exploration,1);
});

test('먹거리 트럭별 점수와 기록 점수를 분리한다',()=>{
  const result=scoreMapExit({mapId:'food-experience',sessionId:'session-456',events:[{type:'visit',truck:'local',at:0},{type:'dwell',truck:'local',at:0,durationSeconds:20},{type:'favorite',truck:'local',at:1,item:'복숭아'},{type:'photo',truck:'local',at:2}]});
  assert.equal(result.scores.local,9);assert.equal(result.scores.recording,2);
});

test('축제 누적 임계값 보너스를 한 번만 계산한다',()=>{
  const result=scoreMapExit({mapId:'festival-experience',sessionId:'session-789',events:[{type:'booth',at:0,count:4},{type:'photo',at:1,count:3},{type:'exploration',at:2,percent:85}]});
  assert.deepEqual(result.scores,{participation:16,exploration:4,recording:4});
});
