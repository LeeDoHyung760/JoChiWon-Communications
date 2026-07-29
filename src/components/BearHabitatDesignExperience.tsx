import { useEffect,useState } from 'react';
import { Check,Compass,Sparkles,X } from 'lucide-react';
import type { MapId } from '../../shared/socket-events';
import { API_BASE_URL } from '../config/api';
import { gameEvents } from '../game/events';
import {
  analyzeBearHabitat,loadBearHabitatProgress,saveBearHabitatProgress,
  type BearHabitatProgress,type HabitatResearchPoint,type HabitatResource,type HabitatMapPosition,
} from '../services/bearHabitatDecision';
import './BearHabitatDesignExperience.css';

type ResourcePoint=Extract<HabitatResearchPoint,'cave'|'food'|'water'>;
type DesignBear='bearA'|'bearB';
const pointInfo:Record<HabitatResearchPoint,{icon:string;name:string;description:string;facts?:string[]}>={
  bearA:{
    icon:'🐻',name:'불곰',description:'넓은 공간을 이동하며 계절과 주변 환경에 맞춰 먹이를 찾는 대형 잡식성 곰입니다.',
    facts:[
      '풀·열매·뿌리뿐 아니라 물고기와 작은 동물 등 다양한 먹이를 이용합니다.',
      '먹이를 찾고 겨울을 준비하는 데 많은 시간과 에너지를 사용합니다.',
      '활동 범위는 고열량 먹이의 위치와 밀도에 따라 크게 달라지며, 충분한 개인 공간이 필요합니다.',
    ],
  },
  bearB:{
    icon:'🐻',name:'반달가슴곰',description:'울창한 산림과 경사가 있는 산지에 적응하고 나무와 은신처를 적극적으로 활용하는 곰입니다.',
    facts:[
      '열매·도토리·뿌리·곤충 등을 먹으며 계절에 따라 먹이를 찾아 이동합니다.',
      '나무를 잘 타고 나무굴이나 동굴을 휴식과 겨울나기 공간으로 이용합니다.',
      '숲의 차폐와 조용한 은신 환경이 중요하며 사람의 활동과 먹이 부족은 스트레스 요인이 될 수 있습니다.',
    ],
  },
  cave:{icon:'🪨',name:'동굴',description:'외부 자극을 피하고 안정적으로 쉴 수 있는 한정된 은신 공간입니다.'},
  food:{icon:'🥕',name:'먹이 공급 지점',description:'두 곰의 이동과 마주침에 직접 영향을 주는 하나뿐인 먹이 공급 지점입니다.'},
  water:{icon:'💧',name:'물가',description:'활동과 휴식에 모두 필요하지만 두 곰의 이용 시간이 겹칠 수 있는 공간입니다.'},
};
const isResource=(id:HabitatResearchPoint):id is ResourcePoint=>id==='cave'||id==='food'||id==='water';
const completedResources=(progress:BearHabitatProgress)=>[
  Boolean(progress.caveAllocation&&progress.resourcePositions.cave),
  Boolean(progress.foodPolicy&&progress.resourcePositions.food),
  Boolean(progress.waterPolicy&&progress.resourcePositions.water),
].filter(Boolean).length;

export function BearHabitatDesignExperience({userKey,mapId}:{userKey:string;mapId:MapId}){
  const [progress,setProgress]=useState<BearHabitatProgress>(()=>loadBearHabitatProgress(userKey));
  const [introOpen,setIntroOpen]=useState(false);
  const [activePoint,setActivePoint]=useState<HabitatResearchPoint>();
  const [nearbyBear,setNearbyBear]=useState<'bearA'|'bearB'>();
  const [selectedDesignBear,setSelectedDesignBear]=useState<DesignBear>();
  const [pendingPlacement,setPendingPlacement]=useState<HabitatResource>();
  const [reviewOpen,setReviewOpen]=useState(false);
  const [resultOpen,setResultOpen]=useState(false);
  const [analyzing,setAnalyzing]=useState(false);
  const [notice,setNotice]=useState('');
  const active=mapId==='bear-play-zone';
  const bearsReady=progress.researchedBears.length===2;
  const resourcesDone=completedResources(progress);

  const update=(next:BearHabitatProgress)=>{
    setProgress(next);
    saveBearHabitatProgress(userKey,next);
    gameEvents.emit('bear-habitat-decision-changed');
  };
  const startResourcePlacement=(resource:HabitatResource)=>{
    if(!selectedDesignBear){setNotice('먼저 설계할 곰을 선택해 주세요.');return}
    const next:BearHabitatProgress=resource==='cave'
      ?{...progress,caveAllocation:selectedDesignBear}
      :resource==='food'
        ?{...progress,foodPolicy:selectedDesignBear}
        :{...progress,waterPolicy:selectedDesignBear};
    update(next);
    setPendingPlacement(resource);
    gameEvents.emit('habitat-resource-placement-arm',resource);
    setNotice(`${pointInfo[selectedDesignBear].name}의 ${pointInfo[resource].name} 위치를 정해 주세요.`);
  };

  useEffect(()=>{
    if(!active){gameEvents.emit('habitat-resource-placement-arm',null);setIntroOpen(false);setActivePoint(undefined);setNearbyBear(undefined);setSelectedDesignBear(undefined);setPendingPlacement(undefined);setReviewOpen(false);setResultOpen(false);return}
    const saved=loadBearHabitatProgress(userKey);
    setProgress(saved);
    (Object.entries(saved.resourcePositions) as Array<[HabitatResource,HabitatMapPosition]>).forEach(([resource,position])=>gameEvents.emit('habitat-resource-position-set',{resource,...position}));
    if(!saved.researchOrder.length&&!saved.result)setIntroOpen(true);
  },[active,userKey]);
  useEffect(()=>{
    if(!notice)return;
    const timer=window.setTimeout(()=>setNotice(''),2200);
    return()=>window.clearTimeout(timer);
  },[notice]);
  useEffect(()=>{
    const proximity=(value:string|null)=>{
      if(!active)return;
      if(!value){setNearbyBear(undefined);return}
      if(!(value in pointInfo))return;
      const id=value as HabitatResearchPoint;
      if(id==='bearA'||id==='bearB'){
        setNearbyBear(id);
        return;
      }
      setNearbyBear(undefined);
      if(introOpen||activePoint||pendingPlacement||reviewOpen||resultOpen)return;
      if(progress.result){setNotice('서식 환경 설계가 완료되었습니다. 상단의 결과 보기에서 기록을 확인할 수 있어요.');return}
      if(isResource(id)&&progress.researchedBears.length<2){
        setNotice('자원을 배분하기 전에 두 곰의 특성을 먼저 조사해 주세요.');
        return;
      }
      if(isResource(id)&&!selectedDesignBear){
        setNotice('오른쪽 설계 패널에서 먼저 배치 대상 곰을 선택해 주세요.');
        return;
      }
      if(isResource(id)){
        setNotice('오른쪽 설계 패널에서 곰과 자원을 선택한 뒤 T키로 위치를 수정할 수 있어요.');
        return;
      }
      const researchOrder=progress.researchOrder.includes(id)?progress.researchOrder:[...progress.researchOrder,id];
      if(researchOrder!==progress.researchOrder)update({...progress,researchOrder});
      setActivePoint(id);
    };
    gameEvents.on('bear-clue-proximity-changed',proximity);
    return()=>{gameEvents.off('bear-clue-proximity-changed',proximity)};
  },[active,introOpen,activePoint,pendingPlacement,reviewOpen,resultOpen,progress,selectedDesignBear]);
  const inspectBear=(id:'bearA'|'bearB')=>{
    if(progress.result){setNotice('이미 서식 환경 설계를 완료했습니다.');return}
    const researchOrder=progress.researchOrder.includes(id)?progress.researchOrder:[...progress.researchOrder,id];
    const researchedBears=[...new Set([...progress.researchedBears,id])] as Array<'bearA'|'bearB'>;
    update({...progress,researchOrder,researchedBears});
    setActivePoint(id);
  };
  useEffect(()=>{
    const keyDown=(event:KeyboardEvent)=>{
      const focused=document.activeElement as HTMLElement|null;
      if(event.repeat||introOpen||activePoint||reviewOpen||resultOpen||analyzing||(focused&&['INPUT','TEXTAREA','SELECT'].includes(focused.tagName)))return;
      if(event.code!=='KeyE'||!nearbyBear)return;
      event.preventDefault();
      inspectBear(nearbyBear);
    };
    window.addEventListener('keydown',keyDown);
    return()=>window.removeEventListener('keydown',keyDown);
  },[nearbyBear,pendingPlacement,introOpen,activePoint,reviewOpen,resultOpen,analyzing,progress]);
  useEffect(()=>{
    const saved=(position:{resource:HabitatResource;x:number;z:number})=>{
      setProgress(current=>{
        const placementOrder=current.placementOrder.includes(position.resource)?current.placementOrder:[...current.placementOrder,position.resource];
        const placementChanges=current.resourcePositions[position.resource]?current.placementChanges+1:current.placementChanges;
        const next={...current,placementOrder,placementChanges,resourcePositions:{...current.resourcePositions,[position.resource]:{x:position.x,z:position.z}}};
        saveBearHabitatProgress(userKey,next);gameEvents.emit('bear-habitat-decision-changed');
        if(completedResources(next)===3)window.setTimeout(()=>setReviewOpen(true),220);
        return next;
      });
      gameEvents.emit('habitat-resource-placement-arm',null);
      setPendingPlacement(undefined);
      setSelectedDesignBear(undefined);
      setNotice(`${pointInfo[position.resource].name} 위치를 저장했습니다. 다음 자원은 곰을 다시 선택해 주세요.`);
    };
    gameEvents.on('habitat-resource-position-saved',saved);
    return()=>{gameEvents.off('habitat-resource-position-saved',saved)};
  },[userKey]);
  useEffect(()=>{
    const locked=introOpen||!!activePoint||reviewOpen||resultOpen||analyzing;
    gameEvents.emit('game-input-lock',locked);
    return()=>{if(locked)gameEvents.emit('game-input-lock',false)};
  },[introOpen,activePoint,reviewOpen,resultOpen,analyzing]);

  if(!active)return null;

  const chooseDesignBear=(bear:DesignBear)=>{
    setSelectedDesignBear(bear);
    if(!progress.designBearOrder.includes(bear))update({...progress,designBearOrder:[...progress.designBearOrder,bear]});
  };
  const analyzeDesign=async()=>{
    const base:BearHabitatProgress={...progress};
    const result=analyzeBearHabitat(base);
    setReviewOpen(false);setAnalyzing(true);
    try{
      const controller=new AbortController(),timer=window.setTimeout(()=>controller.abort(),8000);
      const response=await fetch(`${API_BASE_URL}/bear-wildlife/ask`,{
        method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
        body:JSON.stringify({
          mode:'report',
          question:'두 곰의 특성 조사 순서, 자원 이용 대상, 맵에 직접 배치한 위치와 수정 횟수를 바탕으로 사용자의 의사결정 기준을 존중하는 한국어 두세 문장으로 분석해 주세요. 정답이나 우열을 말하지 마세요.',
          selected:result.title,
          findings:[{
            researchOrder:base.researchOrder,caveAllocation:base.caveAllocation,foodPolicy:base.foodPolicy,
            waterPolicy:base.waterPolicy,resourcePositions:base.resourcePositions,
            placementOrder:base.placementOrder,designBearOrder:base.designBearOrder,
            bearPositions:{brownBear:{x:1325,z:1410},asiaticBlackBear:{x:1125,z:1435}},
            placementChanges:base.placementChanges,
          },{criteria:result.criteria,response:result.response,mapAnalysis:result.mapAnalysis}],
        }),
      });
      window.clearTimeout(timer);
      const data=await response.json() as {answer?:string};
      if(response.ok&&data.answer?.trim())result.interpretation=data.answer.trim();
    }catch{/* The deterministic analysis remains available when AI is offline. */}
    const next={...base,result};update(next);setAnalyzing(false);setResultOpen(true);
  };
  const totalDone=progress.researchedBears.length+resourcesDone;
  const phase=progress.result?'의사결정 프로필 완성':!bearsReady?'1단계 · 두 곰 조사':resourcesDone<3?selectedDesignBear?`2단계 · ${pointInfo[selectedDesignBear].name} 환경 설계 중`:'2단계 · 설계할 곰 선택':'3단계 · 배치 검토';

  return <div className="habitat-design-ui">
    <aside className="habitat-design-status">
      <Compass size={16}/><div><small>AI 탐험 연구소 · 두 곰의 서식 환경 설계</small><b>{phase}</b><span>현장 조사 {totalDone}/5</span></div>
      {progress.result&&<button type="button" onClick={()=>setResultOpen(true)}>결과 보기</button>}
    </aside>

    {notice&&<div className="habitat-design-notice">{notice}</div>}
    {bearsReady&&!progress.result&&!pendingPlacement&&!introOpen&&!activePoint&&!reviewOpen&&!resultOpen&&!analyzing&&<aside className="habitat-resource-picker">
      <header><small>2단계 · 서식 환경 설계</small><b><span>1</span> 먼저 설계할 곰을 선택하세요</b></header>
      <div className="habitat-bear-selector">
        {(['bearA','bearB'] as DesignBear[]).map(bear=><button type="button" className={selectedDesignBear===bear?'active':''} onClick={()=>chooseDesignBear(bear)} key={bear}>
          <span>{bear==='bearA'?'🐻':'🐻‍❄️'}</span><b>{pointInfo[bear].name}</b><em>{selectedDesignBear===bear?'현재 선택됨':'선택하기'}</em>
        </button>)}
      </div>
      <section className={!selectedDesignBear?'locked':''}>
        <small><span>2</span>{selectedDesignBear?`${pointInfo[selectedDesignBear].name} 기준으로 자원을 선택하세요`:'곰을 선택하면 자원이 열립니다'}</small>
        <div className="habitat-resource-options">
          {(['cave','food','water'] as HabitatResource[]).map(resource=><button type="button" disabled={!selectedDesignBear} className={progress.resourcePositions[resource]?'placed':''} onClick={()=>startResourcePlacement(resource)} key={resource}>
            <span>{pointInfo[resource].icon}</span><b>{pointInfo[resource].name}</b><em>{progress.resourcePositions[resource]?'배치됨 · 수정':'선택'}</em>
          </button>)}
        </div>
      </section>
      <p><span>3</span> 위치로 이동한 뒤 <kbd>T</kbd>키로 배치</p>
    </aside>}
    {nearbyBear&&!pendingPlacement&&!introOpen&&!activePoint&&!reviewOpen&&!resultOpen&&!analyzing&&!progress.result&&<button type="button" className="habitat-bear-inspect" onClick={()=>inspectBear(nearbyBear)}>
      <kbd>E</kbd><div><small>조사 대상이 가까이 있습니다</small><b>{pointInfo[nearbyBear].name} 조사 정보 확인</b></div>
    </button>}
    {pendingPlacement&&!introOpen&&!activePoint&&!reviewOpen&&!resultOpen&&!analyzing&&<button type="button" className="habitat-resource-place" onClick={()=>gameEvents.emit('habitat-resource-position-place',pendingPlacement)}>
      <kbd>T</kbd><div><small>{selectedDesignBear?`${pointInfo[selectedDesignBear].name} 기준 · `:''}맵을 걸어 다니며 위치를 정하세요</small><b>현재 위치에 {pointInfo[pendingPlacement].name} 배치</b></div>
    </button>}

    {introOpen&&<section className="habitat-design-overlay"><div className="habitat-design-modal habitat-design-intro">
      <i>🐻</i><small>AI DECISION LAB</small><h2>두 곰의 서식 환경을 설계해 주세요</h2>
      <p>처음에는 자원 위치가 정해져 있지 않습니다. 두 곰을 조사한 뒤 <b>동굴 1곳, 먹이 공급 지점 1곳, 물가 1곳</b>을 선택하고 맵의 원하는 장소에서 T키로 직접 배치해 주세요.</p>
      <div className="habitat-resource-summary"><span>🪨 동굴 1곳</span><span>🥕 먹이 1곳</span><span>💧 물가 1곳</span></div>
      <button className="habitat-primary" onClick={()=>setIntroOpen(false)}>곰 조사 시작하기</button>
    </div></section>}

    {activePoint&&<section className="habitat-design-overlay"><div className="habitat-design-modal">
      <button className="habitat-close" onClick={()=>setActivePoint(undefined)} aria-label="닫기"><X size={18}/></button>
      <i>{pointInfo[activePoint].icon}</i><small>{activePoint==='bearA'||activePoint==='bearB'?'1단계 · 조사 정보 카드':'2단계 · 자원 배분'}</small>
      <h2>{pointInfo[activePoint].name}</h2><p>{pointInfo[activePoint].description}</p>
      <ul className="habitat-bear-facts">{pointInfo[activePoint].facts?.map(item=><li key={item}><Check size={14}/>{item}</li>)}</ul><button className="habitat-primary" onClick={()=>setActivePoint(undefined)}>조사 기록 저장</button>
    </div></section>}

    {reviewOpen&&<section className="habitat-design-overlay"><div className="habitat-design-modal habitat-review">
      <i>🗺️</i><small>3단계 · 배치 검토</small><h2>세 자원의 위치가 모두 정해졌습니다.</h2><p>맵을 다시 둘러보고 위치나 이용 대상을 수정할 수 있습니다. 수정한 과정도 의사결정 분석에 반영됩니다.</p>
      <div className="habitat-review-actions"><button type="button" onClick={()=>setReviewOpen(false)}>배치 수정하기</button><button type="button" className="habitat-primary" onClick={()=>void analyzeDesign()}>AI 분석 시작</button></div>
    </div></section>}

    {analyzing&&<section className="habitat-design-overlay"><div className="habitat-design-modal habitat-analyzing"><Sparkles size={36}/><small>AI DECISION ANALYSIS</small><h2>결정 구조를 분석하고 있습니다</h2><p>선택의 정답이 아니라 어떤 기준을 먼저 살폈는지 정리하고 있어요.</p></div></section>}

    {resultOpen&&progress.result&&<section className="habitat-design-overlay"><div className="habitat-design-modal habitat-result">
      <button className="habitat-close" onClick={()=>setResultOpen(false)} aria-label="닫기"><X size={18}/></button>
      <i><Sparkles size={30}/></i><small>AI 탐험 연구소 · 의사결정 프로필</small><h2>{progress.result.title}</h2>
      <section className="habitat-criteria"><b>주요 판단 기준</b><div>{progress.result.criteria.map(item=><span key={item.id}><em>{item.label}</em><strong>{item.score}%</strong><i><b style={{width:`${item.score}%`}}/></i></span>)}</div></section>
      <dl><dt>설계 과정</dt><dd>{progress.result.response}</dd><dt>코스 구성 방식</dt><dd>{progress.result.courseStrategy}</dd></dl>
      <p className="habitat-map-copy"><b>맵 배치 분석</b>{progress.result.mapAnalysis}</p>
      <p className="habitat-ai-copy"><b>AI 해석</b>{progress.result.interpretation}</p>
      <button className="habitat-primary" onClick={()=>setResultOpen(false)}>내 프로필에 저장 완료</button>
    </div></section>}
  </div>;
}
