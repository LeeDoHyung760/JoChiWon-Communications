import assert from 'node:assert/strict';
import { greenhousePlants,GREENHOUSE_PLANT_TOTAL } from '../src/data/greenhouse-plants';
import { analyzeGreenhouseDiscoveries,analyzeNatureTaste,buildMemoryLetterProfile,compareGreenhouseRecords,createFallbackGreenhouseAnalysis,createFallbackMemoryLetter,createGreenhouseCompletionStory,dominantEmotion,GreenhouseProgressService,greenhouseCompletion,greenhouseInputLocked,memoryLeafNeedsGrowth,natureCuratorMessage,nextGreenhouseAnalysisStage,normalizeMemoryText,parseGreenhouseProgress,recommendRepresentativePlant,representativePlantExplanation,type GreenhouseProgress,type MemoryLeaf } from '../src/services/greenhouseProgress';
import { fallbackPlantReflection,greenhouseReflectionQuestion } from '../src/services/greenhouseReflection';
import { hasUsablePlantImage,plantGallery } from '../src/services/plantImages';
import { clearAllAccountData } from '../src/services/accountData';

class MemoryStorage{
  values=new Map<string,string>();
  get length(){return this.values.size}
  key(index:number){return [...this.values.keys()][index]??null}
  getItem(key:string){return this.values.get(key)??null}
  setItem(key:string,value:string){this.values.set(key,value)}
  removeItem(key:string){this.values.delete(key)}
}
const storage=new MemoryStorage(),service=new GreenhouseProgressService(storage as Storage,'test-user');
let progress=service.load();
assert.equal(progress.collected.length,0);

progress=service.collect(progress,'flower-01','희망','첫 메시지');
assert.equal(progress.collected.length,1,'첫 수집이 저장되어야 한다');
const firstDate=progress.collected[0].collectedAt;
progress=service.collect(progress,'flower-01','평온함','수정 메시지');
assert.equal(progress.collected.length,1,'같은 식물은 중복 수집되지 않아야 한다');
assert.equal(progress.collected[0].selectedEmotion,'평온함','감정을 수정할 수 있어야 한다');
assert.equal(progress.collected[0].collectedAt,firstDate,'감정 수정 시 최초 수집일을 유지해야 한다');

let reflectionProgress:GreenhouseProgress={collected:[],memoryLeaves:[],introSeen:true,recordVisibility:'private'};
const peach=greenhousePlants.find(item=>item.id==='peach-tree')!;
const peachAnswer='햇빛을 받아 따뜻하고 새로운 일이 시작될 것 같아요.';
const peachReflection=fallbackPlantReflection(peach,peachAnswer);
assert.equal(peachReflection.emotion,'희망','키워드가 동률이면 식물의 안정적인 기본 감정을 유지한다');
assert.equal(peachReflection.reasonCategory,'change','짧은 답변에서 변화 이유 축을 추출한다');
assert.equal(peachReflection.recordStyle,'language','짧은 문장 입력의 기본 기록 성향을 언어형으로 유지한다');
assert.deepEqual(peachReflection.keywords,['햇빛','따뜻함','새로운 시작'],'폴백도 답변의 핵심 의미를 읽기 쉬운 키워드로 정리한다');
assert.match(peachReflection.shortReflection,/희망/,'사용자에게 보여 줄 한 문장 해석을 만든다');
const fruitReflection=fallbackPlantReflection(peach,'복숭아 나무는 언제 열릴까? 맛있겠다');
assert.equal(fruitReflection.emotion,'설렘','식물의 희망 상징보다 사용자가 쓴 맛과 기다림을 우선한다');
assert.equal(fruitReflection.reasonCategory,'scene','열매와 맛은 기존 이유 축 중 장면으로 안전하게 저장한다');
assert.equal(fruitReflection.reflectionTitle,'열매를 기다리는 호기심과 설렘','사용자 관심을 제목으로 보여 준다');
assert.match(fruitReflection.shortReflection,/열리는 시기와 맛/,'사용자의 표현이 해석 근거에 드러나야 한다');
const calmReflection=fallbackPlantReflection(peach,'보고 있으면 마음이 놓이고 힐링돼서 여유로워요');
assert.equal(calmReflection.emotion,'평온함','일상적인 안정과 휴식 표현을 평온함으로 이해한다');
assert.deepEqual(calmReflection.keywords,['마음의 안정','휴식'],'뜻이 같은 표현을 읽기 쉬운 핵심어로 묶는다');
const friendReflection=fallbackPlantReflection(peach,'친구와 다시 와서 같이 보고 싶어요');
assert.equal(friendReflection.emotion,'따뜻함','친구와 함께하고 싶은 마음을 따뜻함으로 이해한다');
assert.equal(friendReflection.reasonCategory,'relationship','사람과 함께하는 표현을 관계 이유로 분류한다');
const mysteryReflection=fallbackPlantReflection(peach,'처음 보는 무늬라 묘하고 계속 궁금해요');
assert.equal(mysteryReflection.emotion,'신비로움','묘함과 궁금함 같은 일상 표현을 신비로움으로 이해한다');
assert.ok(mysteryReflection.keywords.includes('호기심'),'확장된 개념 사전에서 호기심을 추출한다');
assert.equal(fallbackPlantReflection(peach,'꽃 색이 정말 아름답고 눈부셔서 한참 바라봤어요').emotion,'감탄','아름다움에 멈춰 선 마음을 감탄으로 구분한다');
assert.equal(fallbackPlantReflection(peach,'바람이 시원하고 잎이 싱그러워서 기분이 개운해요').emotion,'상쾌함','맑고 시원한 감각을 상쾌함으로 구분한다');
assert.equal(fallbackPlantReflection(peach,'혼자 보니 조금 쓸쓸하고 허전한 기분이에요').emotion,'외로움','쓸쓸하고 허전한 마음을 평온함으로 뭉개지 않는다');
assert.equal(fallbackPlantReflection(peach,'이 꽃을 보니 나도 용기 내서 다시 도전해보고 싶어요').emotion,'용기','도전하려는 마음을 막연한 희망과 구분한다');
assert.equal(fallbackPlantReflection(peach,'짧게 피었다가 진다니 아쉽고 안타까워요').emotion,'아쉬움','지나가는 순간에 대한 아쉬움을 별도 감정으로 구분한다');
const originalWordReflection=fallbackPlantReflection(peach,'제주에서 보았던 푸른 바다색이 떠올라요');
assert.ok(originalWordReflection.keywords.some(keyword=>keyword.includes('제주')),'사전에 없는 사용자 고유 표현도 핵심어로 보존한다');
assert.ok(originalWordReflection.keywords.length<=5,'폴백 핵심어는 최대 다섯 개로 제한한다');
const reflectionEntries=[
  {plantId:'peach-tree',answer:peachAnswer,analysis:peachReflection},
  {plantId:'red-tree',answer:'예전에 할머니와 걷던 길이 생각나요.',analysis:fallbackPlantReflection(greenhousePlants.find(item=>item.id==='red-tree')!,'예전에 할머니와 걷던 길이 생각나요.')},
  {plantId:'flower-04',answer:'꽃들이 같이 있는 모습이 가족 같고 새롭게 피어나는 느낌이에요.',analysis:{emotion:'희망',reasonCategory:'change',recordStyle:'inner',keywords:['가족','피어남'],reflectionTitle:'함께 피어나는 희망',shortReflection:'함께 피어나는 모습에서 희망을 발견했군요.'} as const},
];
reflectionEntries.forEach(({plantId,answer,analysis})=>{
  reflectionProgress=service.collect(reflectionProgress,plantId,analysis.emotion,'관찰',undefined,{
    reasonCategory:analysis.reasonCategory,
    reasonText:answer,
    recordStyle:analysis.recordStyle,
    userAnswer:answer,
    keywords:analysis.keywords,
    reflectionTitle:analysis.reflectionTitle,
    shortReflection:analysis.shortReflection,
    analysisSource:'fallback',
  });
});
assert.equal(reflectionProgress.collected[0].userAnswer,peachAnswer,'사용자 원문을 기존 분석값과 함께 저장한다');
assert.equal(reflectionProgress.collected[0].analysisSource,'fallback','식물별 분석 출처를 저장한다');
const discoveries=analyzeGreenhouseDiscoveries(reflectionProgress.collected);
assert.equal(discoveries.dominantEmotion,'희망','가장 잦은 감정으로 발견 결과를 만든다');
assert.equal(discoveries.dominantReasonCategory,'change','감정 이유의 내부 축을 집계한다');
assert.equal(discoveries.dominantRecordStyle,'inner','기록 방식의 내부 값을 집계한다');
assert.match(discoveries.emotion.description,/성장과 계절/,'감정과 이유를 함께 해석한다');
const questions=greenhousePlants.map(greenhouseReflectionQuestion);
assert.equal(new Set(questions).size,14,'14종 식물마다 서로 다른 질문 하나를 제공한다');
assert.match(greenhouseReflectionQuestion(peach),/생각이나 느낌/,'복숭아나무 전용 질문을 제공한다');
assert.match(compareGreenhouseRecords(reflectionProgress.collected[0],reflectionProgress.collected[1]),/서로 다른 장면/,'두 기록의 공통점과 차이를 중간 결과로 설명한다');
const recommendedId=recommendRepresentativePlant(reflectionProgress.collected,discoveries);
assert.ok(recommendedId&&reflectionProgress.collected.some(item=>item.plantId===recommendedId),'기록한 식물 중 대표 식물을 추천한다');
assert.match(representativePlantExplanation(recommendedId!,discoveries),/닮았습니다/,'대표 식물 추천 설명을 생성한다');
const profile=buildMemoryLetterProfile(reflectionProgress);
assert.deepEqual(profile.emotionPattern,['희망','그리움','희망'],'AI 편지에 실제 감정 패턴을 전달한다');
assert.equal(profile.dominantRecordStyle,'내면 기억형','AI 편지에 해석된 기록 성향을 전달한다');
const fallbackAnalysis=createFallbackGreenhouseAnalysis(reflectionProgress,3);
assert.equal(fallbackAnalysis.representativePlant.plantId,recommendedId,'폴백도 규칙이 계산한 대표 식물을 유지한다');
assert.match(fallbackAnalysis.memoryLetter,/복숭아나무|수국|단풍나무/,'폴백 기본 편지는 실제 기록 식물을 사용한다');
reflectionProgress=service.setAiAnalysis(reflectionProgress,{stage:3,source:'fallback',generatedAt:new Date().toISOString(),analysis:fallbackAnalysis});
assert.equal(service.load().aiAnalysis?.stage,3,'AI 또는 폴백 분석 결과를 진행 데이터에 저장한다');
const selectedReflectionProgress=service.selectRepresentative(reflectionProgress,'peach-tree','봄의 시작을 닮았어요');
const clearedReflection=service.clearPlantReflection(selectedReflectionProgress,'peach-tree');
const clearedPeach=clearedReflection.collected.find(item=>item.plantId==='peach-tree');
assert.equal(clearedReflection.collected.length,3,'마음 기록을 삭제해도 식물 발견은 도감에 남아야 한다');
assert.equal(clearedPeach?.includeInAnalysis,false,'삭제한 식물은 마음 분석에서 제외되어야 한다');
assert.equal(clearedPeach?.userAnswer,undefined,'사용자가 작성한 원문을 삭제해야 한다');
assert.equal(clearedPeach?.selectedEmotion,undefined,'원문에서 추출한 감정도 함께 삭제해야 한다');
assert.equal(clearedReflection.aiAnalysis,undefined,'삭제된 기록을 사용한 종합 분석은 초기화해야 한다');
assert.equal(clearedReflection.representativePlant,undefined,'삭제된 기록을 사용한 대표 식물 선택은 초기화해야 한다');
assert.equal(analyzeGreenhouseDiscoveries(clearedReflection.collected).recordCount,2,'남아 있는 마음 기록만 다시 집계해야 한다');
const removedReflection=service.removePlant(reflectionProgress,'peach-tree');
assert.equal(removedReflection.collected.some(item=>item.plantId==='peach-tree'),false,'마음 기록을 삭제하면 해당 식물도 도감에서 삭제해야 한다');
assert.equal(removedReflection.aiAnalysis,undefined,'식물 삭제 후 기존 종합 분석을 초기화해야 한다');
assert.equal(removedReflection.representativePlant,undefined,'식물 삭제 후 대표 식물 선택을 다시 받는다');
const expandedFallback=createFallbackGreenhouseAnalysis(reflectionProgress,7);
assert.equal(expandedFallback.frequentEmotion.title,fallbackAnalysis.frequentEmotion.title,'7종 폴백 확장도 기존 결과의 핵심 제목을 유지한다');
assert.equal(nextGreenhouseAnalysisStage(2,3),3,'3종에서 최초 AI 분석을 호출한다');
assert.equal(nextGreenhouseAnalysisStage(6,7),7,'7종에서 AI 분석을 한 번 확장한다');
assert.equal(nextGreenhouseAnalysisStage(13,14),null,'14종에서는 AI를 다시 호출하지 않는다');
const stageThreeLeaf:MemoryLeaf={
  id:'stage-three-memory',
  createdAt:new Date().toISOString(),
  originalText:'오늘 본 꽃을 오래 기억하고 싶어요.',
  aiLetter:fallbackAnalysis.memoryLetter,
  analysisStage:3,
  dominantEmotion:'희망',
  collectedPlantIds:reflectionProgress.collected.map(item=>item.plantId),
};
let memoryGrowthProgress=service.addMemoryLeaf(reflectionProgress,stageThreeLeaf);
memoryGrowthProgress=service.setAiAnalysis(memoryGrowthProgress,{stage:7,source:'fallback',generatedAt:new Date().toISOString(),analysis:expandedFallback});
assert.equal(memoryLeafNeedsGrowth(memoryGrowthProgress),true,'7종 분석 뒤에는 3종 때 작성한 기억을 자동으로 성장시켜야 한다');
memoryGrowthProgress=service.updateMemoryLeaf(memoryGrowthProgress,{...stageThreeLeaf,analysisStage:7,aiLetter:expandedFallback.memoryLetter});
assert.equal(memoryLeafNeedsGrowth(memoryGrowthProgress),false,'7종 확장을 저장한 기억은 다시 작성하거나 중복 확장하지 않는다');
const discoveredOnly=service.collectDiscovery(reflectionProgress,'flower-05','관찰');
assert.equal(analyzeGreenhouseDiscoveries(discoveredOnly.collected).recordCount,3,'발견만 저장한 식물은 개인 분석에서 제외한다');

let unlockProgress:GreenhouseProgress={collected:[],memoryLeaves:[],introSeen:true,recordVisibility:'private'};
greenhousePlants.slice(0,2).forEach(plant=>{unlockProgress=service.collect(unlockProgress,plant.id,'희망','테스트')});
assert.equal(greenhouseCompletion(unlockProgress).analysisUnlocked,false,'2개에서는 자연 취향 분석이 잠겨야 한다');
unlockProgress=service.collect(unlockProgress,greenhousePlants[2].id,'희망','테스트');
assert.equal(greenhouseCompletion(unlockProgress).analysisUnlocked,true,'3개에서는 자연 취향 분석이 열려야 한다');
assert.equal(greenhouseCompletion(unlockProgress).representativeUnlocked,true,'3개에서는 대표 식물 선택이 열려야 한다');
assert.equal(greenhouseCompletion(unlockProgress).unlocked,false,'대표 식물을 고르기 전에는 기억나무가 기다려야 한다');
unlockProgress=service.selectRepresentative(unlockProgress,greenhousePlants[0].id,'봄의 시작이 생각나요');
assert.equal(unlockProgress.representativePlant?.plantId,greenhousePlants[0].id,'수집한 식물을 대표 식물로 저장해야 한다');
assert.equal(greenhouseCompletion(unlockProgress).unlocked,true,'3개와 대표 식물 선택을 완료하면 새싹 기억나무가 열려야 한다');
greenhousePlants.slice(3,6).forEach(plant=>{unlockProgress=service.collect(unlockProgress,plant.id,'희망','테스트')});
assert.equal(greenhouseCompletion(unlockProgress).blooming,false,'6개에서는 기억나무가 아직 새싹 단계여야 한다');
unlockProgress=service.collect(unlockProgress,greenhousePlants[6].id,'평온함','테스트');
assert.equal(greenhouseCompletion(unlockProgress).blooming,true,'7개에서는 기억나무에 꽃이 피어야 한다');
assert.equal(greenhouseCompletion(unlockProgress).complete,false,'7개는 완전 탐험이 아니어야 한다');
greenhousePlants.slice(7).forEach(plant=>{unlockProgress=service.collect(unlockProgress,plant.id,'희망','테스트')});
assert.equal(greenhouseCompletion(unlockProgress).count,GREENHOUSE_PLANT_TOTAL);
assert.equal(greenhouseCompletion(unlockProgress).complete,true,'14개에서는 완전 탐험 보상이 열려야 한다');
unlockProgress=service.setAiAnalysis(unlockProgress,{stage:7,source:'fallback',generatedAt:new Date().toISOString(),analysis:createFallbackGreenhouseAnalysis(unlockProgress,7)});
const completionStory=createGreenhouseCompletionStory(unlockProgress);
assert.deepEqual(completionStory.stages.map(stage=>stage.count),[3,7,14],'완주 결과에서 3종·7종·14종의 마음 변화를 보여준다');
assert.match(completionStory.finalLetter,/열네 식물/,'7종 편지에 14종 완주 문장을 더해 최종 편지를 완성한다');
assert.match(completionStory.declaration,/나는 자연의.+사람입니다/,'전체 기록으로 나의 자연 선언문을 만든다');
assert.equal(dominantEmotion(unlockProgress.collected),'희망','가장 많이 선택한 감정을 계산해야 한다');
assert.equal(analyzeNatureTaste(unlockProgress.collected).label,'설레는 탐험가','감정 기록으로 자연 유형을 분석해야 한다');
assert.match(natureCuratorMessage(greenhousePlants[0],'설렘'),/목련에서 설렘을 느낀 당신/,'식물과 감정 조합 큐레이터 문구를 만든다');
unlockProgress=service.setRecordVisibility(unlockProgress,'public');
assert.equal(unlockProgress.recordVisibility,'public','탐험 기록 공개 범위를 저장해야 한다');

const fallback=createFallbackMemoryLetter('끝까지 해내고 싶다.',unlockProgress.collected);
assert.match(fallback,/끝까지 해내고 싶다/);
assert.ok(fallback.length>30,'AI 실패 fallback 편지가 생성되어야 한다');
assert.equal(normalizeMemoryText('민주야내일도화이팅'),'민주야, 내일도화이팅.','붙여 쓴 호칭과 문장부호를 의미 변경 없이 정리한다');
assert.ok(!createFallbackMemoryLetter('내일도 화이팅',unlockProgress.collected.slice(0,2)).includes(greenhousePlants[4].displayName),'편지에 수집하지 않은 식물을 만들지 않는다');
assert.deepEqual(parseGreenhouseProgress('{broken json'),{collected:[],memoryLeaves:[],introSeen:false,recordVisibility:'private'},'깨진 저장 데이터는 안전하게 초기화해야 한다');
assert.equal(greenhouseInputLocked('plant'),true,'모달 중 이동 입력을 잠가야 한다');
assert.equal(greenhouseInputLocked(null),false,'모달 종료 후 이동 입력을 복구해야 한다');
assert.equal(greenhousePlants.length,14,'수집 대상은 14개여야 한다');
assert.equal(new Set(greenhousePlants.flatMap(plant=>plant.objectNames)).size,15,'겹친 하위 Mesh 2개를 하나의 식물로 묶어야 한다');
assert.ok(greenhousePlants.every(plant=>plant.nameStory&&plant.everydayStory&&plant.habitat&&plant.comparisonTip&&plant.emotionBridge),'14종 모두 이름·생활·서식·구별·감정 연결 정보를 제공해야 한다');
assert.ok(greenhousePlants.every(plant=>(plant.observationPoints?.length??0)>=3),'14종 모두 실제 관찰에 쓸 세 가지 관찰 포인트를 제공해야 한다');
assert.ok(greenhousePlants.every(plant=>plant.season?.match(/\d|연중/)),'14종 모두 월 단위의 구체적인 관찰 시기를 제공해야 한다');
assert.ok(greenhousePlants.every(plant=>plant.imageUrl&&!plant.imageUrl.startsWith('http')),'14종 사진은 외부 연결 없이 표시되는 로컬 자산이어야 한다');
assert.equal(plantGallery(greenhousePlants[0]).length,1,'식물 대표 사진을 갤러리에 연결한다');
assert.equal(hasUsablePlantImage('/plants/test.webp',false),true,'정상 사진은 표시한다');
assert.equal(hasUsablePlantImage('/plants/test.webp',true),false,'로드 실패 사진은 대체 화면으로 전환한다');
assert.equal(hasUsablePlantImage(undefined,false),false,'사진이 없으면 대체 화면을 표시한다');

const accountStorage=new MemoryStorage();
[
  'yeogi-profile',
  'yeogi-user-journey',
  'jochiwon-kakao-user-id',
  'sejong-lake-interest-profile-v1',
  'greenhouse-progress-v1:test-user',
  'bear-travel-style-v2:test-user',
  'bear-wildlife-comparison-v2:test-user',
  'bear-tree-ai-completed-v1:test-user',
  'nature-discovery-visits-v1:test-user',
  'sejong-map-experience-v1:test-user',
  'campus-activity-vote:test-user',
].forEach(key=>accountStorage.setItem(key,'saved'));
accountStorage.setItem('unrelated-site-setting','keep');
const removed=clearAllAccountData(accountStorage as Storage);
assert.equal(removed.length,11,'탈퇴 시 서비스의 계정·체험 기록을 모두 찾아 삭제한다');
assert.equal(accountStorage.getItem('greenhouse-progress-v1:test-user'),null,'탈퇴 후 식물 기록이 남지 않아야 한다');
assert.equal(accountStorage.getItem('unrelated-site-setting'),'keep','서비스와 무관한 브라우저 저장 값은 건드리지 않는다');

console.log('Greenhouse tests passed: one-answer reflections, staged unlocks, account withdrawal cleanup, AI fallback, recovery, input lock, mapping');
