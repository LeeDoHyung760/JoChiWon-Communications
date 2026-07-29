import { useEffect,useRef,useState } from 'react';
import { Compass,Sparkles,X } from 'lucide-react';
import type { MapId } from '../../shared/socket-events';
import { API_BASE_URL } from '../config/api';
import { gameEvents } from '../game/events';
import { analyzeBearTravel,loadBearTravelProgress,saveBearTravelProgress,type BearTravelPoint,type BearTravelProgress } from '../services/bearTravelStyle';
import './BearTravelStyleExperience.css';

const pointInfo:Record<BearTravelPoint,{icon:string;name:string;ecology:string;question:string;options:Array<{id:string;label:string}>}>={
  waterfall:{icon:'💧',name:'폭포',ecology:'곰에게 물가는 물을 마시는 장소뿐 아니라 더위를 피하고 주변 먹이를 찾는 생활 공간이 됩니다.',question:'이 장소를 어떻게 둘러볼까요?',options:[{id:'photo',label:'풍경을 사진으로 남긴다'},{id:'scenery',label:'잠시 머물며 감상한다'},{id:'info',label:'생태 정보를 자세히 확인한다'},{id:'fast',label:'다음 장소로 이동한다'}]},
  cave:{icon:'🪨',name:'동굴',ecology:'동굴과 바위틈은 곰이 외부 환경을 피하거나 휴식할 수 있는 공간입니다.',question:'동굴을 어떤 방식으로 살펴볼까요?',options:[{id:'explore',label:'바로 안쪽으로 들어간다'},{id:'observe',label:'입구에서 주변부터 관찰한다'},{id:'later',label:'다른 장소를 먼저 보고 돌아온다'},{id:'deep',label:'내부 정보를 자세히 확인한다'}]},
  tree:{icon:'🌲',name:'큰 나무',ecology:'큰 나무는 곰에게 먹이와 휴식, 주변 환경을 살피는 장소가 될 수 있습니다.',question:'이곳에서 무엇을 해보고 싶나요?',options:[{id:'rest',label:'조용히 머무른다'},{id:'photo',label:'주변 풍경을 기록한다'},{id:'explore',label:'나무 주변을 더 탐색한다'},{id:'together',label:'다른 탐험가와 함께 둘러본다'}]},
};
const companionOptions=[{id:'wait',label:'옆에서 함께 기다린다'},{id:'return',label:'먼저 다른 장소를 보고 돌아온다'},{id:'lead',label:'다음 장소로 이동하자고 제안한다'},{id:'rejoin',label:'각자 둘러본 뒤 다시 만난다'}];

export function BearTravelStyleExperience({userKey,mapId}:{userKey:string;mapId:MapId}){
  const [progress,setProgress]=useState<BearTravelProgress>(()=>loadBearTravelProgress(userKey));
  const [activePoint,setActivePoint]=useState<BearTravelPoint>();
  const [companionOpen,setCompanionOpen]=useState(false);
  const [resultOpen,setResultOpen]=useState(false);
  const [introOpen,setIntroOpen]=useState(false);
  const [analyzing,setAnalyzing]=useState(false);
  const enteredAt=useRef<{point:BearTravelPoint;time:number}|undefined>(undefined);
  const active=mapId==='bear-play-zone';
  const result=progress.result;
  const readyForFinal=Object.keys(progress.choices).length===3&&!progress.companionChoice&&!result;

  const update=(next:BearTravelProgress)=>{setProgress(next);saveBearTravelProgress(userKey,next);gameEvents.emit('bear-travel-style-changed')};
  useEffect(()=>{
    const proximity=(id:string|null)=>{
      const now=Date.now();
      if(enteredAt.current&&enteredAt.current.point!==id){
        const seconds=Math.round((now-enteredAt.current.time)/1000),point=enteredAt.current.point;
        setProgress(current=>{const next={...current,dwellSeconds:{...current.dwellSeconds,[point]:(current.dwellSeconds[point]??0)+seconds}};saveBearTravelProgress(userKey,next);return next});
        enteredAt.current=undefined;
      }
      if(!id||!(id in pointInfo))return;
      const point=id as BearTravelPoint;enteredAt.current={point,time:now};
      setProgress(current=>{
        if(current.route.includes(point))return current;
        const next={...current,route:[...current.route,point]};saveBearTravelProgress(userKey,next);return next;
      });
      if(!loadBearTravelProgress(userKey).choices[point])setActivePoint(point);
    };
    const photo=()=>setProgress(current=>{const next={...current,photoCaptured:true};saveBearTravelProgress(userKey,next);return next});
    gameEvents.on('bear-clue-proximity-changed',proximity);gameEvents.on('bear-photo-captured',photo);
    return()=>{gameEvents.off('bear-clue-proximity-changed',proximity);gameEvents.off('bear-photo-captured',photo)};
  },[userKey]);
  useEffect(()=>{if(mapId==='bear-play-zone'&&!progress.route.length)setIntroOpen(true)},[mapId,userKey]);
  useEffect(()=>{if(progress.result)setResultOpen(true)},[progress]);
  useEffect(()=>{
    const exitNearby=(value:unknown)=>{if(value&&mapId==='bear-play-zone'&&Object.keys(progress.choices).length===3&&!progress.companionChoice)setCompanionOpen(true)};
    gameEvents.on('world-interaction-proximity-changed',exitNearby);
    return()=>{gameEvents.off('world-interaction-proximity-changed',exitNearby)};
  },[mapId,progress]);
  useEffect(()=>{const locked=introOpen||!!activePoint||companionOpen||resultOpen;gameEvents.emit('game-input-lock',locked);return()=>{if(locked)gameEvents.emit('game-input-lock',false)}},[introOpen,activePoint,companionOpen,resultOpen]);
  if(!active)return null;

  const choosePoint=(choice:string)=>{if(!activePoint)return;update({...progress,choices:{...progress.choices,[activePoint]:choice}});setActivePoint(undefined)};
  const chooseCompanion=async(choice:string)=>{
    const base={...progress,companionChoice:choice},result=analyzeBearTravel(base);setAnalyzing(true);
    try{
      const response=await fetch(`${API_BASE_URL}/bear-wildlife/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'report',question:'방문 순서, 체류 시간, 장소별 관찰 선택, 사진 행동, 동행 선택을 바탕으로 여행 스타일과 세종 자연 코스 추천 근거를 3문장으로 설명해 주세요.',selected:'여행 스타일 분석',findings:[base,result]})});
      const data=await response.json() as {answer?:string};
      if(response.ok&&data.answer)result.description=data.answer;
    }catch{/* The deterministic profile remains available when AI is offline. */}
    update({...base,result});setAnalyzing(false);setCompanionOpen(false);setResultOpen(true);
  };
  return <div className="bear-style-ui">
    <aside className="bear-style-status"><Compass size={16}/><div><small>AI 탐험 연구소</small><b>{result?'나의 탐험 프로필 완성':readyForFinal?'모든 장소 관찰 완료':'여행 스타일 분석 중'} · 탐험 장소 {Object.keys(progress.choices).length}/3</b></div>{result?<button type="button" onClick={()=>setResultOpen(true)}>프로필 보기</button>:readyForFinal?<button type="button" onClick={()=>setCompanionOpen(true)}>최종 분석하기</button>:<span>{progress.photoCaptured?'포토 기록 완료':'자유롭게 둘러보세요'}</span>}</aside>
    {introOpen&&<section className="bear-style-overlay"><div className="bear-style-modal bear-style-intro"><i>🐻</i><small>자연을 탐험하며 나의 여행 방식을 발견하는 곳</small><h2>AI 탐험 연구소</h2><p>폭포, 동굴, 큰 나무를 자유롭게 둘러보세요. 관찰 방식과 이동 기록을 바탕으로 나의 여행 스타일을 분석합니다.</p><button className="bear-style-done" onClick={()=>setIntroOpen(false)}>자유 탐험 시작하기</button></div></section>}
    {activePoint&&<section className="bear-style-overlay"><div className="bear-style-modal"><button onClick={()=>setActivePoint(undefined)} aria-label="닫기"><X size={18}/></button><i>{pointInfo[activePoint].icon}</i><small>{pointInfo[activePoint].name} 생태 관찰</small><p className="bear-ecology-copy">{pointInfo[activePoint].ecology}</p><h2>{pointInfo[activePoint].question}</h2><div>{pointInfo[activePoint].options.map(option=><button key={option.id} onClick={()=>choosePoint(option.id)}>{option.label}</button>)}</div><em>선택 후 관찰 기록이 저장됩니다.</em></div></section>}
    {companionOpen&&<section className="bear-style-overlay"><div className="bear-style-modal"><i>👥</i><small>출구 근처 · 공동 코스 추천 기록</small><h2>함께 방문한 사람이 폭포에 조금 더 머물고 싶어 합니다. 어떻게 하시겠어요?</h2><div>{companionOptions.map(option=><button disabled={analyzing} key={option.id} onClick={()=>void chooseCompanion(option.id)}>{option.label}</button>)}</div>{analyzing&&<em>AI가 탐험 행동을 해석하고 있습니다.</em>}</div></section>}
    {resultOpen&&result&&<section className="bear-style-overlay"><div className="bear-style-modal bear-style-result"><button onClick={()=>setResultOpen(false)} aria-label="닫기"><X size={18}/></button><i><Sparkles size={30}/></i><small>나의 베어트리 탐험 프로필</small><h2>{result.title}</h2><section className="bear-observation-summary"><b>관찰 기록</b><span>폭포 · {pointInfo.waterfall.options.find(item=>item.id===progress.choices.waterfall)?.label}</span><span>동굴 · {pointInfo.cave.options.find(item=>item.id===progress.choices.cave)?.label}</span><span>큰 나무 · {pointInfo.tree.options.find(item=>item.id===progress.choices.tree)?.label}</span><span>포토 기록 · {progress.photoCaptured?'완료':'남기지 않음'}</span></section><p><b>AI 해석</b>{result.description}</p><dl><dt>이동 방식</dt><dd>{result.movement}</dd><dt>관람 속도</dt><dd>{result.pace}</dd><dt>활동 선호</dt><dd>{result.activity}</dd><dt>동행 방식</dt><dd>{result.companion}</dd><dt>정보 선호</dt><dd>{result.information}</dd></dl><button className="bear-style-done" onClick={()=>setResultOpen(false)}>탐험 프로필 저장하기</button></div></section>}
  </div>;
}
