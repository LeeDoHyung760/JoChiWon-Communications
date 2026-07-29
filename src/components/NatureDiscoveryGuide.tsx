import { useEffect,useMemo,useState } from 'react';
import { Check } from 'lucide-react';
import type { MapId } from '../../shared/socket-events';
import { gameEvents } from '../game/events';
import { loadBearHabitatProgress } from '../services/bearHabitatDecision';
import { GreenhouseProgressService,greenhouseCompletion,type GreenhouseProgress } from '../services/greenhouseProgress';
import './NatureDiscoveryGuide.css';

type NatureMapId=Extract<MapId,'bear-tree-park'|'bear-play-zone'|'garden'>;
const NATURE_MAPS:NatureMapId[]=['bear-tree-park','bear-play-zone','garden'];
const isNatureMap=(mapId:MapId):mapId is NatureMapId=>NATURE_MAPS.includes(mapId as NatureMapId);
const progressKey=(kind:'photo'|'ai',userKey:string)=>`bear-tree-${kind}-completed-v1:${userKey.trim().toLowerCase()||'guest'}`;
const aiJourneyComplete=(userKey:string)=>Boolean(loadBearHabitatProgress(userKey).result);

export function NatureDiscoveryGuide({userKey}:{userKey:string}){
  const greenhouseService=useMemo(()=>new GreenhouseProgressService(localStorage,userKey),[userKey]);
  const [mapId,setMapId]=useState<MapId>('town');
  const [greenhouse,setGreenhouse]=useState<GreenhouseProgress>(()=>greenhouseService.load());
  const [photoComplete,setPhotoComplete]=useState(()=>localStorage.getItem(progressKey('photo',userKey))==='true');
  const [aiComplete,setAiComplete]=useState(()=>aiJourneyComplete(userKey));

  useEffect(()=>{
    setGreenhouse(greenhouseService.load());
    setPhotoComplete(localStorage.getItem(progressKey('photo',userKey))==='true');
    setAiComplete(aiJourneyComplete(userKey));
  },[greenhouseService,userKey]);
  useEffect(()=>{
    const mapChanged=(nextMap:MapId)=>setMapId(nextMap);
    const greenhouseChanged=()=>setGreenhouse(greenhouseService.load());
    const photoCaptured=()=>{localStorage.setItem(progressKey('photo',userKey),'true');setPhotoComplete(true)};
    const aiCompleted=()=>setAiComplete(aiJourneyComplete(userKey));
    gameEvents.on('map-travel-complete',mapChanged);
    gameEvents.on('greenhouse-progress-changed',greenhouseChanged);
    gameEvents.on('bear-photo-captured',photoCaptured);
    gameEvents.on('bear-wildlife-progress-changed',aiCompleted);
    gameEvents.on('bear-travel-style-changed',aiCompleted);
    gameEvents.on('bear-habitat-decision-changed',aiCompleted);
    return()=>{
      gameEvents.off('map-travel-complete',mapChanged);
      gameEvents.off('greenhouse-progress-changed',greenhouseChanged);
      gameEvents.off('bear-photo-captured',photoCaptured);
      gameEvents.off('bear-wildlife-progress-changed',aiCompleted);
      gameEvents.off('bear-travel-style-changed',aiCompleted);
      gameEvents.off('bear-habitat-decision-changed',aiCompleted);
    };
  },[greenhouseService,userKey]);

  const gardenComplete=greenhouseCompletion(greenhouse).analysisUnlocked;
  useEffect(()=>{gameEvents.emit('nature-chapter-progress-changed',{bear:aiComplete,garden:gardenComplete,photo:photoComplete})},[aiComplete,gardenComplete,photoComplete,mapId]);
  if(!isNatureMap(mapId)||mapId==='bear-play-zone')return null;

  const steps=[
    {id:'garden',label:'수목원 체험',done:gardenComplete},
    {id:'photo',label:'곰 가족 포토존',done:photoComplete},
    {id:'ai',label:'AI 생태 탐험',done:aiComplete},
  ];
  const completed=steps.filter(step=>step.done).length,current=steps.findIndex(step=>!step.done);
  const guide=current===0
    ?'수목원에서 식물 3종을 관찰하고 AI 질문에 짧은 마음 기록을 남겨 보세요.'
    :current===1
      ?'곰 가족 포토존에서 대표 사진을 남겨 보세요.'
      :current===2
        ?'AI 탐험 연구소에서 두 곰을 조사하고 제한된 서식 자원을 배분해 보세요.'
        :'베어트리파크의 세 가지 자연 체험을 모두 완료했어요.';

  return <aside className={`nature-discovery-guide ${completed===steps.length?'is-complete':''}`} aria-label="베어트리파크 자연 체험 여정">
    <header><span>🌿</span><div><small>베어트리파크 · 자연 협력 체험</small><b>{completed===steps.length?'세 가지 자연 체험 완료!':'자연 체험 여정'}</b></div><strong>{completed}/3</strong></header>
    <div className="nature-discovery-steps">
      {steps.map((step,index)=><div key={step.id} className={step.done?'done':index===current?'current':''}><i>{step.done?<Check size={10}/>:index+1}</i><span>{step.label}</span></div>)}
    </div>
    <p>{guide}</p>
  </aside>;
}
