import assert from 'node:assert/strict';

process.env.AI_PROVIDER='mock';
process.env.OPENAI_API_KEY='';

const {fallbackGreenhouseAnalysis,fallbackGreenhouseReflection,greenhouseAnalyze,greenhouseAnalysisRequestSchema,greenhouseReflect,greenhouseReflectionRequestSchema}=await import('../server/src/services/ai/greenhouseExperience.js');

const reflectionRequest=greenhouseReflectionRequestSchema.parse({
  plantId:'peach-tree',
  plantName:'복숭아나무',
  plantDescription:'봄에 분홍색 꽃을 피우며 새로운 도약을 상징하는 나무예요.',
  observationPoint:'밝은 분홍빛 꽃잎과 가지 끝에서 피어나는 모습',
  question:'복숭아꽃을 보며 가장 먼저 떠오른 생각이나 느낌은 무엇인가요?',
  answer:'햇빛을 받아 따뜻하고 새로운 일이 시작될 것 같아요.',
});
const reflectionFallback=fallbackGreenhouseReflection(reflectionRequest);
assert.equal(reflectionFallback.emotion,'희망','폴백은 답변과 식물 기본값으로 감정을 추출해야 한다');
assert.equal(reflectionFallback.reasonCategory,'change','폴백은 변화 관련 키워드를 이유 축으로 추출해야 한다');
assert.equal(reflectionFallback.recordStyle,'language','폴백은 짧은 답변의 기록 성향을 추출해야 한다');
assert.deepEqual(reflectionFallback.keywords,['햇빛','따뜻함','새로운 시작'],'서버 폴백도 핵심 키워드를 자연스러운 표현으로 정리해야 한다');
const fruitRequest=greenhouseReflectionRequestSchema.parse({...reflectionRequest,answer:'복숭아 나무는 언제 열릴까? 맛있겠다'});
const fruitFallback=fallbackGreenhouseReflection(fruitRequest);
assert.equal(fruitFallback.emotion,'설렘','서버 폴백도 식물 상징보다 맛과 열매에 관한 사용자 문장을 우선해야 한다');
assert.equal(fruitFallback.reflectionTitle,'열매를 기다리는 호기심과 설렘','서버 폴백이 화면용 개인화 제목을 만든다');
assert.match(fruitFallback.shortReflection,/열리는 시기와 맛/,'서버 폴백 해석에 입력 근거를 반영한다');
const calmFallback=fallbackGreenhouseReflection(greenhouseReflectionRequestSchema.parse({...reflectionRequest,answer:'보고 있으면 마음이 놓이고 힐링돼서 여유로워요'}));
assert.equal(calmFallback.emotion,'평온함','서버 폴백도 일상적인 안정 표현을 이해한다');
assert.deepEqual(calmFallback.keywords,['마음의 안정','휴식'],'서버 폴백도 유사 표현을 의미 핵심어로 묶는다');
const friendFallback=fallbackGreenhouseReflection(greenhouseReflectionRequestSchema.parse({...reflectionRequest,answer:'친구와 다시 와서 같이 보고 싶어요'}));
assert.equal(friendFallback.emotion,'따뜻함','서버 폴백도 함께하고 싶은 관계 표현을 이해한다');
const originalFallback=fallbackGreenhouseReflection(greenhouseReflectionRequestSchema.parse({...reflectionRequest,answer:'제주에서 보았던 푸른 바다색이 떠올라요'}));
assert.ok(originalFallback.keywords.some(keyword=>keyword.includes('제주')),'서버 폴백도 사전에 없는 원문 핵심어를 보존한다');
assert.ok(originalFallback.keywords.length<=5,'서버 폴백 핵심어는 최대 다섯 개로 제한한다');
const reflectionResult=await greenhouseReflect(reflectionRequest);
assert.equal(reflectionResult.source,'fallback','키가 없거나 mock 모드면 식물 기록도 폴백을 반환해야 한다');
assert.deepEqual(reflectionResult.analysis,reflectionFallback,'식물 기록 폴백도 같은 구조화 결과를 반환해야 한다');

const request=greenhouseAnalysisRequestSchema.parse({
  stage:3,
  records:[
    {plantId:'peach-tree',plantName:'복숭아나무',emotion:'희망',reasonCategory:'change',reasonText:'새롭게 시작하는 느낌이 들어서',recordStyle:'inner'},
    {plantId:'flower-04',plantName:'수국',emotion:'따뜻함',reasonCategory:'relationship',reasonText:'여러 꽃이 함께 피어 있는 모습이 따뜻해서',recordStyle:'language'},
    {plantId:'red-tree',plantName:'단풍나무',emotion:'그리움',reasonCategory:'memory',reasonText:'예전에 보았던 가을 풍경이 떠올라서',recordStyle:'inner'},
  ],
  ruleAnalysis:{
    dominantEmotion:'희망',
    dominantReasonCategory:'change',
    dominantRecordStyle:'inner',
    representativePlantId:'peach-tree',
    representativePlantName:'복숭아나무',
    representativePlantSymbolism:['새로운 시작','희망','도약'],
  },
});

const fallback=fallbackGreenhouseAnalysis(request);
assert.equal(fallback.representativePlant.plantId,'peach-tree','AI가 규칙 기반 대표 식물 후보를 바꿀 수 없어야 한다');
assert.match(fallback.memoryLetter,/복숭아나무/,'기본 편지에 대표 식물 이름이 포함되어야 한다');

const result=await greenhouseAnalyze(request);
assert.equal(result.source,'fallback','API 키가 없거나 mock 모드면 즉시 폴백을 반환해야 한다');
assert.deepEqual(result.analysis,fallback,'서버 폴백 응답은 동일한 구조화 결과를 반환해야 한다');

const expanded=fallbackGreenhouseAnalysis({...request,stage:7,previousAnalysis:fallback});
assert.equal(expanded.frequentEmotion.title,fallback.frequentEmotion.title,'7종 확장은 기존 분석의 핵심 방향을 유지해야 한다');
assert.match(expanded.memoryLetter,/일곱 식물/,'7종 편지는 추가 기록으로 확장되어야 한다');

console.log('Greenhouse AI tests passed: one-answer OpenAI schema, reflection fallback, fixed rule outputs, 3/7 fallback, previous-analysis continuity');
