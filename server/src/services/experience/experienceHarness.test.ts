import assert from 'node:assert/strict';
import test from 'node:test';
import {buildPersistedActivity,scoreMapExit,type MapExit} from './experienceHarness.js';

test('축제 부스 완료를 최근 활동 기록으로 만든다',()=>{
  const input:MapExit={mapId:'festival-experience',sessionId:'festival-activity-1',events:[{type:'festival-booth-complete',at:10,booth:'traditional-culture',selectedCards:['한글 도장','전통 매듭']}]};
  const record=buildPersistedActivity(input,scoreMapExit(input));
  assert.equal(record?.mapId,'festival-experience');
  assert.match(record?.title??'',/전통문화/);
  assert.equal(record?.point,12);
});

test('관심 표시한 축제 이름과 키워드를 최근 기록으로 만든다',()=>{
  const input:MapExit={mapId:'festival-experience',sessionId:'festival-interest-1',events:[{type:'festival-save',at:10,festivalId:'nakhwa',festivalTitle:'세종 낙화축제',categories:['낙화','야간공연'],saved:true}]};
  const record=buildPersistedActivity(input,scoreMapExit(input));
  assert.equal(record?.title,'세종 낙화축제 관심 저장');
  assert.match(record?.note??'',/낙화 · 야간공연/);
  assert.equal(record?.point,5);
});

test('공연 활동 기록은 사용자용 제목과 점수 근거로 변환한다',()=>{
  const input:MapExit={mapId:'arts-center',sessionId:'readable-performance-record',events:[{type:'browse',performanceId:'0',at:0,durationSeconds:20},{type:'watch',performanceId:'0',at:1,durationSeconds:42},{type:'finish',performanceId:'0',at:2},{type:'favorite',performanceId:'0',at:3}]};
  const record=buildPersistedActivity(input,scoreMapExit(input));
  assert.equal(record?.title,'뮤지컬 〈서편제〉');
  assert.equal(record?.point,15);
  assert.deepEqual(record?.breakdown,[{label:'공연 탐색',point:2},{label:'영상 42초 감상',point:5},{label:'끝까지 감상',point:5},{label:'관심 공연 저장',point:3}]);
  assert.doesNotMatch(record?.note??'',/musical|finish|watch/);
});

test('관심 공연은 공연명과 장르가 포함된 최근 기록으로 만든다',()=>{
  const input:MapExit={mapId:'arts-center',sessionId:'performance-favorite-1',events:[{type:'favorite',performanceId:'4',at:1}]};
  const record=buildPersistedActivity(input,scoreMapExit(input));
  assert.match(record?.title??'',/브람스/);
  assert.match(record?.note??'',/관심 공연.*클래식/);
  assert.deepEqual(record?.breakdown,[{label:'관심 공연 저장',point:3}]);
});

test('공연 임계값과 종료 보너스를 서버에서 계산한다',()=>{
  const result=scoreMapExit({mapId:'arts-center',sessionId:'session-123',events:[{type:'watch',at:0,durationSeconds:42},{type:'finish',at:42000}]});
  assert.deepEqual(result.scores,{culture:2,immersion:7});
  assert.deepEqual(result.evidence,['공연 42초 시청','공연 끝까지 시청']);
});

test('세종 먹거리 상세 행동을 요약하고 세 트럭 완료 보너스를 계산한다',()=>{
  const events:any[]=[];
  for(const [truck,itemType,prefix] of [['local','restaurant','restaurant'],['street','local_food','peach'],['dessert','cafe','cafe']] as const){
    for(let index=0;index<3;index++)events.push({type:'food_card_open',truck,itemType,itemId:`${prefix}-${index}`,categories:itemType==='restaurant'?['한식']:[],tags:itemType==='local_food'?['복숭아']:[],at:events.length});
    events.push({type:'food_hours_open',truck,itemType,itemId:`${prefix}-0`,at:events.length},{type:'food_map_open',truck,itemType,itemId:`${prefix}-0`,at:events.length},{type:'food_nearby_place_open',truck,itemType,itemId:`${prefix}-0`,at:events.length},{type:'food_truck_complete',truck,at:events.length});
  }
  const result=scoreMapExit({mapId:'food-experience',sessionId:'food-session-rules',events});
  assert.equal(result.space,'sejong_food_trucks');assert.equal(result.sessionSummary?.restaurantsViewed,3);assert.equal(result.sessionSummary?.allTrucksCompleted,true);assert.equal(result.scores.sejongFoodExploration,10);assert.equal(result.scores.visitIntent,8);
});

test('포스터 탐색은 관람 점수로 계산하지 않고 실제 장르 시청과 관심만 누적한다',()=>{
  const result=scoreMapExit({mapId:'arts-center',sessionId:'session-performance-signals',events:[{type:'browse',performanceId:'0',at:0,durationSeconds:120},{type:'watch',performanceId:'0',at:1,durationSeconds:45},{type:'favorite',performanceId:'0',at:2},{type:'finish',performanceId:'0',at:3}]});
  assert.equal(result.scores.culture,2);assert.equal(result.scores.musical,13);assert.equal(result.scores.preference,5);assert.equal(result.scores.exploration,1);
});

test('먹거리 트럭별 점수와 기록 점수를 분리한다',()=>{
  const result=scoreMapExit({mapId:'food-experience',sessionId:'session-456',events:[{type:'visit',truck:'local',at:0},{type:'dwell',truck:'local',at:0,durationSeconds:20},{type:'favorite',truck:'local',at:1,item:'복숭아'},{type:'photo',truck:'local',at:2}]});
  assert.equal(result.scores.local,6);assert.equal(result.scores.recording,2);
});

test('축제 누적 임계값 보너스를 한 번만 계산한다',()=>{
  const result=scoreMapExit({mapId:'festival-experience',sessionId:'session-789',events:[{type:'booth',at:0,count:4},{type:'photo',at:1,count:3},{type:'exploration',at:2,percent:85}]});
  assert.deepEqual(result.scores,{participation:16,exploration:4,recording:4});
});

test('축제 구조화 행동을 서버 규칙으로 요약하고 근거를 만든다',()=>{
  const common={festivalTitle:'세종 빛 축제',categories:['야간','공연','사진'],location:'이응다리'};
  const summary=scoreMapExit({mapId:'festival-experience',sessionId:'festival-rules-1',events:[
    {type:'festival-open',at:0,festivalId:'light-1',...common},{type:'festival-close',at:42000,festivalId:'light-1',durationSeconds:42,...common},{type:'festival-open',at:43000,festivalId:'light-1',...common},
    {type:'festival-open',at:44000,festivalId:'light-2',festivalTitle:'야간 음악제',categories:['야간','공연'],location:'호수공원'},
    {type:'festival-open',at:45000,festivalId:'light-3',festivalTitle:'낙화 축제',categories:['야간','문화예술'],location:'중앙공원'},
    {type:'festival-save',at:46000,festivalId:'light-1',saved:true,...common},{type:'festival-section',at:47000,festivalId:'light-1',section:'map',...common},{type:'festival-section',at:48000,festivalId:'light-1',section:'transport',...common},
  ]});
  assert.equal(summary.space,'sejong_festival_booth');assert.equal(summary.sessionSummary?.festivalsViewed,3);assert.deepEqual(summary.sessionSummary?.reopenedFestivals,['세종 빛 축제']);assert.ok(summary.scores.nightFestivalInterest>=80);assert.ok(summary.scores.visitIntent>=70);assert.ok(summary.evidence.some(item=>item.includes('지도와 교통')));
});
