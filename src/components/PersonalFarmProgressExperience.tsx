import {useEffect,useMemo,useRef,useState} from 'react';
import type {MapId} from '../../shared/socket-events';
import {
  BEAR_FEED_IDS,BEAR_FEED_SPOT_IDS,GARDEN_FLOWER_IDS,GARDEN_PLANTABLE_FLOWER_IDS,
  type BearFeedId,type BearFeedSpotId,type GardenFlowerId,type PersonalFarmProgressDto,
} from '../../shared/personal-farm';
import {greenhousePlantById} from '../data/greenhouse-plants';
import {flowerCatalogByFlowerId,flowerCatalogByPlantId} from '../services/flowerInterestProfile';
import {gameEvents} from '../game/events';
import {
  PERSONAL_FARM_PROGRESS_CHANGED,collectBearFeed,collectGardenFlower,completeBearFeedSpot,feedBear,getCachedPersonalFarmProgress,
  personalFarmErrorMessage,plantGardenFlower,removeGardenFlower,refreshPersonalFarmProgress,setPersonalFarmProgressUser,type PersonalFarmApiError,
} from '../services/personalFarmApi';
import './PersonalFarmProgressExperience.css';
import './PersonalFarmGuide.css';

const gardenFlowerByPlantId=new Map([...flowerCatalogByPlantId].map(([plantId,entry])=>[plantId,entry.flowerId]));
const plantName=(id:GardenFlowerId)=>flowerCatalogByFlowerId.get(id)?.displayName??id;
const feedByClue:Partial<Record<string,BearFeedId>>={food:'apple',cave:'carrot',water:'acorn'};
const feedName:Record<BearFeedId,string>={apple:'사과',carrot:'당근',acorn:'도토리'};

export function PersonalFarmProgressExperience({mapId,userKey,authenticated,onNotice}:{mapId:MapId;userKey:string;authenticated:boolean;onNotice?:(message:string)=>void}){
  setPersonalFarmProgressUser(userKey);
  const [progress,setProgress]=useState<PersonalFarmProgressDto|undefined>(()=>getCachedPersonalFarmProgress());
  const [gardenNearby,setGardenNearby]=useState<string|null>(null),[bearClue,setBearClue]=useState<string|null>(null),[feedSpot,setFeedSpot]=useState<BearFeedSpotId|null>(null),[bearNearby,setBearNearby]=useState(false),[farmAnchor,setFarmAnchor]=useState(false),[farmDoor,setFarmDoor]=useState<{inside:boolean}|null>(null),[farmFlower,setFarmFlower]=useState<GardenFlowerId|null>(null);
  const [selectedFlower,setSelectedFlower]=useState<GardenFlowerId|''>(''),[pending,setPending]=useState<string>(),[error,setError]=useState('');
  const userRef=useRef(userKey);
  const reportedLoadErrorRef=useRef('');
  const previousProgressRef=useRef<PersonalFarmProgressDto|undefined>(undefined);
  const availableToPlant=useMemo(()=>progress?.gardenMission.collectedFlowerIds.filter(id=>(GARDEN_PLANTABLE_FLOWER_IDS as readonly string[]).includes(id)&&!progress.gardenMission.plantedFlowerIds.includes(id))??[],[progress]);
  useEffect(()=>{
    const previous=previousProgressRef.current;
    if(progress&&previous){
      if(!previous.bearMission.completed&&progress.bearMission.completed)onNotice?.('베어트리파크 미션 완료! 개인 팜에 곰 동상이 추가되었습니다.');
      if(!previous.gardenMission.interestCompleted&&progress.gardenMission.interestCompleted)onNotice?.('수목원 미션 완료! 개인 팜에 식물을 심을 수 있습니다.');
      if(!previous.natureChapter.completed&&progress.natureChapter.completed)onNotice?.('자연 체험을 모두 완료했습니다. 개인 팜 보상이 준비되었습니다.');
    }
    previousProgressRef.current=progress;
  },[onNotice,progress]);

  useEffect(()=>{
    if(userRef.current!==userKey){userRef.current=userKey;previousProgressRef.current=undefined;setProgress(undefined)}
    let active=true;setError('');
    void refreshPersonalFarmProgress().then(value=>{if(active){reportedLoadErrorRef.current='';setProgress(value)}}).catch(reason=>{if(active){const message=personalFarmErrorMessage(reason);if(reportedLoadErrorRef.current!==message){reportedLoadErrorRef.current=message;setError(message)}}});
    const changed=(event:Event)=>{const detail=(event as CustomEvent<PersonalFarmProgressDto>).detail;if(detail)setProgress(detail)};
    const refreshed=changed;
    window.addEventListener(PERSONAL_FARM_PROGRESS_CHANGED,changed);
    window.addEventListener('personal-farm-progress-refresh',refreshed);
    return()=>{active=false;window.removeEventListener(PERSONAL_FARM_PROGRESS_CHANGED,changed);window.removeEventListener('personal-farm-progress-refresh',refreshed)};
  },[authenticated,userKey]);
  useEffect(()=>{
    const garden=(value:{kind:string;plantId?:string}|null)=>setGardenNearby(value?.kind==='plant'&&value.plantId?value.plantId:null);
    const clue=(id:string|null)=>setBearClue(id);const spot=(id:BearFeedSpotId|null)=>setFeedSpot(id);const bear=(nearby:boolean)=>setBearNearby(nearby);const anchor=(nearby:boolean)=>setFarmAnchor(nearby);
    const door=(value:{inside:boolean}|null)=>setFarmDoor(value);const planted=(value:GardenFlowerId|null)=>setFarmFlower(value);
    gameEvents.on('greenhouse-nearby-changed',garden);gameEvents.on('bear-clue-proximity-changed',clue);gameEvents.on('bear-feed-spot-proximity-changed',spot);gameEvents.on('bear-feeding-proximity-changed',bear);gameEvents.on('personal-farm-plant-anchor-proximity-changed',anchor);gameEvents.on('personal-farm-door-proximity-changed',door);gameEvents.on('personal-farm-flower-proximity-changed',planted);
    return()=>{gameEvents.off('greenhouse-nearby-changed',garden);gameEvents.off('bear-clue-proximity-changed',clue);gameEvents.off('bear-feed-spot-proximity-changed',spot);gameEvents.off('bear-feeding-proximity-changed',bear);gameEvents.off('personal-farm-plant-anchor-proximity-changed',anchor);gameEvents.off('personal-farm-door-proximity-changed',door);gameEvents.off('personal-farm-flower-proximity-changed',planted)};
  },[]);
  useEffect(()=>{const locked=()=>{const message=authenticated?'개인 팜은 미션 결과에 따라 장식이 추가됩니다.':'개인 팜은 소셜 로그인 후 이용할 수 있습니다.';setError(message);onNotice?.(message)};gameEvents.on('personal-farm-locked',locked);gameEvents.on('personal-farm-login-required',locked);return()=>{gameEvents.off('personal-farm-locked',locked);gameEvents.off('personal-farm-login-required',locked)}},[authenticated,onNotice]);

  const run=async(key:string,operation:()=>Promise<PersonalFarmProgressDto>,success:string)=>{if(pending)return;if(!authenticated){const message='로그인 후 생태 미션을 진행할 수 있습니다.';setError(message);onNotice?.(message);return}setPending(key);setError('');try{const next=await operation();setProgress(next);onNotice?.(success)}catch(reason){const message=personalFarmErrorMessage(reason as PersonalFarmApiError);setError(message);onNotice?.(message)}finally{setPending(undefined)}};
  const gardenFlower=gardenNearby?gardenFlowerByPlantId.get(gardenNearby):undefined;
  const feed=bearClue?feedByClue[bearClue]:undefined;
  const canCollectFlower=gardenFlower&&!progress?.gardenMission.collectedFlowerIds.includes(gardenFlower);
  const canCollectFeed=feed&&!progress?.bearMission.collectedFeedIds.includes(feed);
  const flowerBedFull=(progress?.gardenMission.plantedFlowerIds.length??0)>=5;
  const spotDone=feedSpot?progress?.bearMission.completedFeedSpotIds.includes(feedSpot):false;
  const canFeedBear=mapId==='bear-tree-park'&&bearNearby&&progress?.bearMission.completedFeedSpotIds.length===BEAR_FEED_SPOT_IDS.length&&!progress?.bearMission.bearFed;
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(event.defaultPrevented||event.key.toLowerCase()!=='e'||event.repeat||pending)return;
      const focused=document.activeElement;if(focused instanceof HTMLInputElement||focused instanceof HTMLTextAreaElement||focused instanceof HTMLSelectElement)return;
      if(mapId==='garden'&&gardenFlower&&canCollectFlower){event.preventDefault();void run(`flower:${gardenFlower}`,()=>collectGardenFlower(gardenFlower),`${plantName(gardenFlower)} 수집 완료`);return}
      if(canFeedBear){event.preventDefault();void run('bear-feed',feedBear,'곰에게 먹이를 주었습니다. 베어트리파크 체험을 완료했습니다.');return}
      if(mapId==='bear-tree-park'&&feed&&canCollectFeed){event.preventDefault();void run(`feed:${feed}`,()=>collectBearFeed(feed),`${feedName[feed]}을(를) 수집했어요.`);return}
      if(mapId==='bear-tree-park'&&feedSpot&&!spotDone){event.preventDefault();void run(`spot:${feedSpot}`,()=>completeBearFeedSpot(feedSpot),'먹이 지점을 완료했어요.');return}
      if(mapId==='personal-farm'&&farmAnchor&&!farmDoor&&!farmFlower&&!flowerBedFull&&selectedFlower){event.preventDefault();void run(`plant:${selectedFlower}`,()=>plantGardenFlower(selectedFlower),`${plantName(selectedFlower)}을(를) 팜에 심었어요.`).then(()=>setSelectedFlower(''))}
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[authenticated,canCollectFeed,canCollectFlower,canFeedBear,farmAnchor,farmDoor,farmFlower,feed,feedSpot,flowerBedFull,gardenFlower,mapId,pending,progress?.bearMission.collectedFeedIds.length,selectedFlower,spotDone]);

  return <div className="personal-farm-mission-ui" aria-live="polite">
    {mapId==='personal-farm'&&!farmDoor&&!farmAnchor&&<aside className="personal-farm-guide-card">
      <span>🏡</span><div><b>나의 집과 작은 화단</b><small>현관 앞에서 E키를 누르면 집 안에 들어갑니다. 수목원에서 꽃을 채집한 뒤 집 앞 작은 화단에서 원하는 꽃을 골라 배치할 수 있어요.</small></div>
    </aside>}
    {mapId==='personal-farm'&&farmFlower&&!farmDoor&&<section className="personal-farm-action-card farm-remove-card"><span>✂️</span><div><small>심어진 꽃</small><b>{plantName(farmFlower)} 제거하기</b></div><button type="button" disabled={!!pending} onClick={()=>void run(`remove:${farmFlower}`,()=>removeGardenFlower(farmFlower),`${plantName(farmFlower)}을(를) 화단에서 제거했어요.`)}>{pending===`remove:${farmFlower}`?'제거 중…':'제거'}</button></section>}
    {mapId==='personal-farm'&&farmDoor&&<section className="personal-farm-action-card personal-farm-door-card"><span>🚪</span><div><small>개인 팜 집</small><b>{farmDoor.inside?'[E] 키를 눌러 집 밖으로 나가기':'[E] 키를 눌러 집 안으로 들어가기'}</b></div><button type="button" onClick={()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'e',code:'KeyE',bubbles:true,cancelable:true}))}>E</button></section>}
    {mapId==='bear-tree-park'&&bearNearby&&<section className="personal-farm-action-card"><span>🐻</span><div><small>베어트리파크 실제 곰</small><b>{progress?.bearMission.bearFed?'곰 급여 완료':'다섯 곳의 먹이를 마친 뒤 곰에게 먹이를 주세요'}</b></div><button type="button" disabled={!canFeedBear||!!pending} onClick={()=>void run('bear-feed',feedBear,'곰에게 먹이를 주었습니다. 베어트리파크 체험을 완료했습니다.')}>{pending==='bear-feed'?'처리 중…':progress?.bearMission.bearFed?'완료':'E · 곰에게 먹이 주기'}</button></section>}
    {error&&<button type="button" className="personal-farm-api-error" onClick={()=>setError('')}>{error}</button>}
    {!authenticated&&mapId!=='personal-farm'&&(gardenFlower||feed||feedSpot)&&<section className="personal-farm-action-card"><span>🔐</span><div><small>게스트 체험</small><b>로그인 후 생태 미션을 진행할 수 있습니다.</b></div><button type="button" onClick={()=>onNotice?.('로그인 후 생태 미션을 진행할 수 있습니다.')}>로그인하기</button><button type="button" onClick={()=>setError('계속 둘러보며 맵과 곰 서식 구역을 구경할 수 있어요.')}>계속 둘러보기</button></section>}
    {mapId==='garden'&&gardenFlower&&<section className="personal-farm-action-card"><span>{gardenFlower.endsWith('tree')?'🌳':'🌸'}</span><div><small>{greenhousePlantById.get(gardenNearby!)?.displayName??plantName(gardenFlower)}</small><b>{canCollectFlower?'개인 팜 수집 기록에 담기':'획득 완료'}</b></div><button type="button" disabled={!canCollectFlower||!!pending} onClick={()=>void run(`flower:${gardenFlower}`,()=>collectGardenFlower(gardenFlower),`${plantName(gardenFlower)}을(를) 수집했어요.`)}>{pending===`flower:${gardenFlower}`?'저장 중…':canCollectFlower?'획득':'완료'}</button></section>}
    {mapId==='bear-tree-park'&&feed&&<section className="personal-farm-action-card"><span>🧺</span><div><small>가상 생태 체험 먹이</small><b>{canCollectFeed?`${feedName[feed]} 획득`:'획득 완료'}</b></div><button type="button" disabled={!canCollectFeed||!!pending} onClick={()=>void run(`feed:${feed}`,()=>collectBearFeed(feed),`${feedName[feed]}을(를) 수집했어요.`)}>{pending===`feed:${feed}`?'저장 중…':canCollectFeed?'획득':'완료'}</button></section>}
    {mapId==='bear-tree-park'&&feedSpot&&<section className="personal-farm-action-card"><span>🐻</span><div><small>실제 동물 급여가 아닌 가상 생태 체험</small><b>{spotDone?'먹이 체험 완료':feedSpot}</b></div><button type="button" disabled={!!spotDone||!!pending||!progress?.bearMission.collectedFeedIds.length} onClick={()=>void run(`spot:${feedSpot}`,()=>completeBearFeedSpot(feedSpot),'가상 먹이 체험 지점을 완료했어요.')}>{pending===`spot:${feedSpot}`?'저장 중…':spotDone?'완료':'E · 체험 완료'}</button></section>}
    {mapId==='personal-farm'&&farmAnchor&&!farmFlower&&<section className="personal-farm-action-card farm-plant-card"><span>🌱</span><div><small>집 앞 5칸 꽃밭</small><b>{flowerBedFull?'화단이 가득 찼어요. 꽃 앞에서 먼저 제거해 주세요.':'수집한 꽃 심기'}</b><select disabled={flowerBedFull} value={selectedFlower} onChange={event=>setSelectedFlower(event.target.value as GardenFlowerId|'')}><option value="">{flowerBedFull?'빈 칸이 필요합니다':'심을 꽃 선택'}</option>{availableToPlant.map(id=><option value={id} key={id}>{plantName(id)}</option>)}</select></div><button type="button" disabled={flowerBedFull||!selectedFlower||!!pending} onClick={()=>selectedFlower&&void run(`plant:${selectedFlower}`,()=>plantGardenFlower(selectedFlower),`${plantName(selectedFlower)}을(를) 팜에 심었어요.`).then(()=>setSelectedFlower(''))}>{pending?.startsWith('plant:')?'저장 중…':'E · 꽃 심기'}</button></section>}
    {mapId==='personal-farm'&&progress&&<aside className="personal-farm-reward-status"><b>나의 팜</b><span>수집 {progress.gardenMission.collectedFlowerIds.length}/{GARDEN_FLOWER_IDS.length}</span><span>화단 {progress.gardenMission.plantedFlowerIds.length}/5</span><span>먹이 {progress.bearMission.collectedFeedIds.length}/{BEAR_FEED_IDS.length}</span><span>체험 {progress.bearMission.completedFeedSpotIds.length}/{BEAR_FEED_SPOT_IDS.length}</span><em>{progress.bearMission.completed?'곰 동상 해금':'곰 미션 진행 중'}</em><em>{progress.gardenMission.completed?'꽃밭 완성':'꽃 미션 진행 중'}</em></aside>}
  </div>;
}
