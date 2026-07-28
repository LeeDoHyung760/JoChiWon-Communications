import { useEffect,useMemo,useState } from 'react';
import { Check } from 'lucide-react';
import type { MapId } from '../../shared/socket-events';
import { gameEvents } from '../game/events';
import { GreenhouseProgressService,greenhouseCompletion,type GreenhouseProgress } from '../services/greenhouseProgress';
import { loadBearProgress } from '../data/bear-wildlife';
import './NatureDiscoveryGuide.css';

type NatureMapId=Extract<MapId,'bear-tree-park'|'bear-play-zone'|'garden'>;
type NatureVisit='forest'|'bear';

const NATURE_MAPS:NatureMapId[]=['bear-tree-park','bear-play-zone','garden'];
const isNatureMap=(mapId:MapId):mapId is NatureMapId=>NATURE_MAPS.includes(mapId as NatureMapId);
const visitStorageKey=(userKey:string)=>`nature-discovery-visits-v1:${userKey.trim().toLowerCase()||'guest'}`;

function loadVisits(userKey:string):NatureVisit[]{
  try{
    const parsed=JSON.parse(localStorage.getItem(visitStorageKey(userKey))??'[]') as unknown;
    return Array.isArray(parsed)?parsed.filter((item):item is NatureVisit=>item==='forest'||item==='bear'):[];
  }catch{return []}
}

function saveVisits(userKey:string,visits:NatureVisit[]){
  localStorage.setItem(visitStorageKey(userKey),JSON.stringify(visits));
}

export function NatureDiscoveryGuide({userKey}:{userKey:string}){
  const greenhouseService=useMemo(()=>new GreenhouseProgressService(localStorage,userKey),[userKey]);
  const [mapId,setMapId]=useState<MapId>('town');
  const [visits,setVisits]=useState<NatureVisit[]>(()=>loadVisits(userKey));
  const [greenhouse,setGreenhouse]=useState<GreenhouseProgress>(()=>greenhouseService.load());
  const [bearComplete,setBearComplete]=useState(()=>Boolean(loadBearProgress(userKey).completedAt));

  useEffect(()=>{
    setVisits(loadVisits(userKey));
    setGreenhouse(greenhouseService.load());
    setBearComplete(Boolean(loadBearProgress(userKey).completedAt));
  },[greenhouseService,userKey]);

  useEffect(()=>{
    const mapChanged=(nextMap:MapId)=>{
      setMapId(nextMap);
      if(!isNatureMap(nextMap))return;
      const visit:NatureVisit|undefined=nextMap==='bear-tree-park'?'forest':nextMap==='bear-play-zone'?'bear':undefined;
      if(!visit)return;
      setVisits(current=>{
        if(current.includes(visit))return current;
        const next=[...current,visit];
        saveVisits(userKey,next);
        return next;
      });
    };
    const progressChanged=()=>setGreenhouse(greenhouseService.load());
    const bearProgressChanged=()=>setBearComplete(Boolean(loadBearProgress(userKey).completedAt));
    gameEvents.on('map-travel-complete',mapChanged);
    gameEvents.on('greenhouse-progress-changed',progressChanged);
    gameEvents.on('bear-wildlife-progress-changed',bearProgressChanged);
    return()=>{
      gameEvents.off('map-travel-complete',mapChanged);
      gameEvents.off('greenhouse-progress-changed',progressChanged);
      gameEvents.off('bear-wildlife-progress-changed',bearProgressChanged);
    };
  },[greenhouseService,userKey]);

  const completion=greenhouseCompletion(greenhouse);
  useEffect(()=>{
    gameEvents.emit('nature-chapter-progress-changed',{
      bear:bearComplete,
      garden:completion.analysisUnlocked,
    });
  },[bearComplete,completion.analysisUnlocked,visits,mapId]);

  if(!isNatureMap(mapId))return null;

  const steps=[
    {id:'forest',label:'숲 산책',done:visits.includes('forest')},
    {id:'bear',label:'곰 생태 탐험',done:bearComplete},
    {id:'emotion',label:'식물 감성',done:completion.analysisUnlocked},
    {id:'record',label:'대표 기록',done:Boolean(greenhouse.representativePlant)},
  ];
  const completed=steps.filter(step=>step.done).length;
  const current=steps.findIndex(step=>!step.done);
  const guide=current===0
    ?'베어트리파크를 걸으며 자연 감성 여정을 시작해 보세요.'
    :current===1
       ?visits.includes('bear')?'서로 다른 자연 기록을 가진 탐험가와 만나 오늘의 탐험을 완성해 보세요.':'곰 가족 체험 지점에서 함께 만드는 탐험에 들어가 보세요.'
      :current===2
        ?'주황색 수목원 포털로 이동해 식물 3종의 감정을 기록해 보세요.'
        :current===3
          ?'식물 3종 중 가장 기억에 남는 대표 식물을 골라 새싹 기억나무를 깨워 보세요.'
          :'나의 자연 감성 기록이 완성됐어요. 다음 공간에서도 발견을 이어가 보세요.';

  return <aside className={`nature-discovery-guide ${completed===steps.length?'is-complete':''}`} aria-label="자연 감성 발견 여정">
    <header>
      <span>🌿</span>
      <div>
        <small>베어트리파크 + 수목원 체험</small>
        <b>{completed===steps.length?'자연 감성 발견 완료!':'자연 감성 발견 여정'}</b>
      </div>
      <strong>{completed}/4</strong>
    </header>
    <div className="nature-discovery-steps">
      {steps.map((step,index)=><div key={step.id} className={step.done?'done':index===current?'current':''}>
        <i>{step.done?<Check size={10}/>:index+1}</i>
        <span>{step.label}</span>
      </div>)}
    </div>
    <p>{guide}</p>
  </aside>;
}
