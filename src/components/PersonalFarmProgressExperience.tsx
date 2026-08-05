import {useEffect,useMemo,useRef,useState} from 'react';
import type {MapId} from '../../shared/socket-events';
import {
  BEAR_FEED_IDS,BEAR_FEED_SPOT_IDS,GARDEN_FLOWER_IDS,
  type BearFeedId,type BearFeedSpotId,type GardenFlowerId,type PersonalFarmProgressDto,
} from '../../shared/personal-farm';
import {greenhousePlantById} from '../data/greenhouse-plants';
import {gameEvents} from '../game/events';
import {
  PERSONAL_FARM_PROGRESS_CHANGED,collectBearFeed,collectGardenFlower,completeBearFeedSpot,getCachedPersonalFarmProgress,
  personalFarmErrorMessage,plantGardenFlower,refreshPersonalFarmProgress,setPersonalFarmProgressUser,type PersonalFarmApiError,
} from '../services/personalFarmApi';
import './PersonalFarmProgressExperience.css';

const gardenFlowerByPlantId:Partial<Record<string,GardenFlowerId>>={'flower-04':'hydrangea','flower-05':'tulip','flower-06':'iris','flower-08':'camellia','flower-09':'sunflower'};
const plantName:Record<GardenFlowerId,string>={tulip:'튤립',sunflower:'해바라기',hydrangea:'수국',camellia:'동백꽃',iris:'붓꽃'};
const feedByClue:Partial<Record<string,BearFeedId>>={food:'apple',cave:'carrot',water:'acorn'};
const feedName:Record<BearFeedId,string>={apple:'사과',carrot:'당근',acorn:'도토리'};

export function PersonalFarmProgressExperience({mapId,userKey,authenticated,onNotice}:{mapId:MapId;userKey:string;authenticated:boolean;onNotice?:(message:string)=>void}){
  setPersonalFarmProgressUser(userKey);
  const [progress,setProgress]=useState<PersonalFarmProgressDto|undefined>(()=>getCachedPersonalFarmProgress());
  const [gardenNearby,setGardenNearby]=useState<string|null>(null),[bearClue,setBearClue]=useState<string|null>(null),[feedSpot,setFeedSpot]=useState<BearFeedSpotId|null>(null),[farmAnchor,setFarmAnchor]=useState(false);
  const [selectedFlower,setSelectedFlower]=useState<GardenFlowerId|''>(''),[pending,setPending]=useState<string>(),[error,setError]=useState('');
  const userRef=useRef(userKey);
  const availableToPlant=useMemo(()=>progress?.gardenMission.collectedFlowerIds.filter(id=>!progress.gardenMission.plantedFlowerIds.includes(id))??[],[progress]);

  useEffect(()=>{
    if(userRef.current!==userKey){userRef.current=userKey;setProgress(undefined)}
    let active=true;setError('');
    if(authenticated)void refreshPersonalFarmProgress().then(value=>{if(active)setProgress(value)}).catch(reason=>{if(active)setError(personalFarmErrorMessage(reason))});
    const changed=(event:Event)=>{const detail=(event as CustomEvent<PersonalFarmProgressDto>).detail;if(detail)setProgress(detail)};
    window.addEventListener(PERSONAL_FARM_PROGRESS_CHANGED,changed);
    return()=>{active=false;window.removeEventListener(PERSONAL_FARM_PROGRESS_CHANGED,changed)};
  },[authenticated,userKey]);
  useEffect(()=>{if(authenticated&&mapId==='personal-farm')void refreshPersonalFarmProgress().catch(reason=>setError(personalFarmErrorMessage(reason)))},[authenticated,mapId]);
  useEffect(()=>{
    const garden=(value:{kind:string;plantId?:string}|null)=>setGardenNearby(value?.kind==='plant'&&value.plantId?value.plantId:null);
    const clue=(id:string|null)=>setBearClue(id);const spot=(id:BearFeedSpotId|null)=>setFeedSpot(id);const anchor=(nearby:boolean)=>setFarmAnchor(nearby);
    gameEvents.on('greenhouse-nearby-changed',garden);gameEvents.on('bear-clue-proximity-changed',clue);gameEvents.on('bear-feed-spot-proximity-changed',spot);gameEvents.on('personal-farm-plant-anchor-proximity-changed',anchor);
    return()=>{gameEvents.off('greenhouse-nearby-changed',garden);gameEvents.off('bear-clue-proximity-changed',clue);gameEvents.off('bear-feed-spot-proximity-changed',spot);gameEvents.off('personal-farm-plant-anchor-proximity-changed',anchor)};
  },[]);
  useEffect(()=>{const locked=()=>{const message=authenticated?'개인 팜은 미션 결과에 따라 장식이 추가됩니다.':'개인 팜은 소셜 로그인 후 이용할 수 있습니다.';setError(message);onNotice?.(message)};gameEvents.on('personal-farm-locked',locked);gameEvents.on('personal-farm-login-required',locked);return()=>{gameEvents.off('personal-farm-locked',locked);gameEvents.off('personal-farm-login-required',locked)}},[authenticated,onNotice]);

  const run=async(key:string,operation:()=>Promise<PersonalFarmProgressDto>,success:string)=>{if(pending)return;if(!authenticated){const message='로그인 후 생태 미션을 진행할 수 있습니다.';setError(message);onNotice?.(message);return}setPending(key);setError('');try{const next=await operation();setProgress(next);onNotice?.(success)}catch(reason){const message=personalFarmErrorMessage(reason as PersonalFarmApiError);setError(message);onNotice?.(message)}finally{setPending(undefined)}};
  const gardenFlower=gardenNearby?gardenFlowerByPlantId[gardenNearby]:undefined;
  const feed=bearClue?feedByClue[bearClue]:undefined;
  const canCollectFlower=gardenFlower&&!progress?.gardenMission.collectedFlowerIds.includes(gardenFlower);
  const canCollectFeed=feed&&!progress?.bearMission.collectedFeedIds.includes(feed);
  const spotDone=feedSpot?progress?.bearMission.completedFeedSpotIds.includes(feedSpot):false;
  useEffect(()=>{
    if(!authenticated)return;
    const key=(event:KeyboardEvent)=>{
      if(event.key.toLowerCase()!=='e'||event.repeat||pending)return;
      const focused=document.activeElement;if(focused instanceof HTMLInputElement||focused instanceof HTMLTextAreaElement||focused instanceof HTMLSelectElement)return;
      if(mapId==='bear-tree-park'&&feed&&canCollectFeed){event.preventDefault();void run(`feed:${feed}`,()=>collectBearFeed(feed),`${feedName[feed]}을(를) 수집했어요.`);return}
      if(mapId==='bear-tree-park'&&feedSpot&&!spotDone&&progress?.bearMission.collectedFeedIds.length){event.preventDefault();void run(`spot:${feedSpot}`,()=>completeBearFeedSpot(feedSpot),'가상 먹이 체험 지점을 완료했어요.');return}
      if(mapId==='personal-farm'&&farmAnchor&&selectedFlower){event.preventDefault();void run(`plant:${selectedFlower}`,()=>plantGardenFlower(selectedFlower),`${plantName[selectedFlower]}을(를) 팜에 심었어요.`).then(()=>setSelectedFlower(''))}
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[authenticated,canCollectFeed,farmAnchor,feed,feedSpot,mapId,pending,progress?.bearMission.collectedFeedIds.length,selectedFlower,spotDone]);

  return <div className="personal-farm-mission-ui" aria-live="polite">
    {error&&<button type="button" className="personal-farm-api-error" onClick={()=>setError('')}>{error}</button>}
    {!authenticated&&mapId!=='personal-farm'&&(gardenFlower||feed||feedSpot)&&<section className="personal-farm-action-card"><span>🔐</span><div><small>게스트 체험</small><b>로그인 후 생태 미션을 진행할 수 있습니다.</b></div><button type="button" onClick={()=>onNotice?.('로그인 후 생태 미션을 진행할 수 있습니다.')}>로그인하기</button><button type="button" onClick={()=>setError('계속 둘러보며 맵과 곰 서식 구역을 구경할 수 있어요.')}>계속 둘러보기</button></section>}
    {mapId==='garden'&&gardenFlower&&<section className="personal-farm-action-card"><span>🌸</span><div><small>{greenhousePlantById.get(gardenNearby!)?.displayName??plantName[gardenFlower]}</small><b>{canCollectFlower?'개인 팜에 가져갈 꽃 획득':'획득 완료'}</b></div><button type="button" disabled={!canCollectFlower||!!pending} onClick={()=>void run(`flower:${gardenFlower}`,()=>collectGardenFlower(gardenFlower),`${plantName[gardenFlower]}을(를) 수집했어요.`)}>{pending===`flower:${gardenFlower}`?'저장 중…':canCollectFlower?'획득':'완료'}</button></section>}
    {mapId==='bear-tree-park'&&feed&&<section className="personal-farm-action-card"><span>🧺</span><div><small>가상 생태 체험 먹이</small><b>{canCollectFeed?`${feedName[feed]} 획득`:'획득 완료'}</b></div><button type="button" disabled={!canCollectFeed||!!pending} onClick={()=>void run(`feed:${feed}`,()=>collectBearFeed(feed),`${feedName[feed]}을(를) 수집했어요.`)}>{pending===`feed:${feed}`?'저장 중…':canCollectFeed?'획득':'완료'}</button></section>}
    {mapId==='bear-tree-park'&&feedSpot&&<section className="personal-farm-action-card"><span>🐻</span><div><small>실제 동물 급여가 아닌 가상 생태 체험</small><b>{spotDone?'먹이 체험 완료':feedSpot}</b></div><button type="button" disabled={!!spotDone||!!pending||!progress?.bearMission.collectedFeedIds.length} onClick={()=>void run(`spot:${feedSpot}`,()=>completeBearFeedSpot(feedSpot),'가상 먹이 체험 지점을 완료했어요.')}>{pending===`spot:${feedSpot}`?'저장 중…':spotDone?'완료':'E · 체험 완료'}</button></section>}
    {mapId==='personal-farm'&&farmAnchor&&<section className="personal-farm-action-card farm-plant-card"><span>🌱</span><div><small>고정 꽃밭</small><b>수집한 꽃 심기</b><select value={selectedFlower} onChange={event=>setSelectedFlower(event.target.value as GardenFlowerId|'')}><option value="">심을 꽃 선택</option>{availableToPlant.map(id=><option value={id} key={id}>{plantName[id]}</option>)}</select></div><button type="button" disabled={!selectedFlower||!!pending} onClick={()=>selectedFlower&&void run(`plant:${selectedFlower}`,()=>plantGardenFlower(selectedFlower),`${plantName[selectedFlower]}을(를) 팜에 심었어요.`).then(()=>setSelectedFlower(''))}>{pending?.startsWith('plant:')?'저장 중…':'E · 꽃 심기'}</button></section>}
    {mapId==='personal-farm'&&progress&&<aside className="personal-farm-reward-status"><b>나의 팜</b><span>꽃 {progress.gardenMission.plantedFlowerIds.length}/{GARDEN_FLOWER_IDS.length}</span><span>먹이 {progress.bearMission.collectedFeedIds.length}/{BEAR_FEED_IDS.length}</span><span>체험 {progress.bearMission.completedFeedSpotIds.length}/{BEAR_FEED_SPOT_IDS.length}</span><em>{progress.farm.unlocked?'정식 해금':'미션 진행 중'}</em></aside>}
  </div>;
}
