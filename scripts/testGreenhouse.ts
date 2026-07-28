import assert from 'node:assert/strict';
import { greenhousePlants,GREENHOUSE_PLANT_TOTAL } from '../src/data/greenhouse-plants';
import { analyzeNatureTaste,createFallbackMemoryLetter,dominantEmotion,GreenhouseProgressService,greenhouseCompletion,greenhouseInputLocked,natureCuratorMessage,normalizeMemoryText,parseGreenhouseProgress,type GreenhouseProgress } from '../src/services/greenhouseProgress';
import { hasUsablePlantImage,plantGallery } from '../src/services/plantImages';

class MemoryStorage{
  values=new Map<string,string>();
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
progress=service.collect(progress,'flower-01','평온','수정 메시지');
assert.equal(progress.collected.length,1,'같은 식물은 중복 수집되지 않아야 한다');
assert.equal(progress.collected[0].selectedEmotion,'평온','감정을 수정할 수 있어야 한다');
assert.equal(progress.collected[0].collectedAt,firstDate,'감정 수정 시 최초 수집일을 유지해야 한다');

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
unlockProgress=service.collect(unlockProgress,greenhousePlants[6].id,'평온','테스트');
assert.equal(greenhouseCompletion(unlockProgress).blooming,true,'7개에서는 기억나무에 꽃이 피어야 한다');
assert.equal(greenhouseCompletion(unlockProgress).complete,false,'7개는 완전 탐험이 아니어야 한다');
greenhousePlants.slice(7).forEach(plant=>{unlockProgress=service.collect(unlockProgress,plant.id,'희망','테스트')});
assert.equal(greenhouseCompletion(unlockProgress).count,GREENHOUSE_PLANT_TOTAL);
assert.equal(greenhouseCompletion(unlockProgress).complete,true,'14개에서는 완전 탐험 보상이 열려야 한다');
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
assert.equal(plantGallery(greenhousePlants[0]).length,1,'식물 대표 사진을 갤러리에 연결한다');
assert.equal(hasUsablePlantImage('/plants/test.webp',false),true,'정상 사진은 표시한다');
assert.equal(hasUsablePlantImage('/plants/test.webp',true),false,'로드 실패 사진은 대체 화면으로 전환한다');
assert.equal(hasUsablePlantImage(undefined,false),false,'사진이 없으면 대체 화면을 표시한다');

console.log('Greenhouse tests passed: staged unlocks, nature analysis, curator, representative plant, visibility, fallback, recovery, input lock, mapping');
