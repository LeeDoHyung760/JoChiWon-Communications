import { useEffect,useRef,useState } from 'react';
import { Check,ChevronRight,Sparkles,Users,X } from 'lucide-react';
import type { BearExplorationCardId,BearExplorationPointId,BearExplorationRole,BearExplorationState,MapId,PlayerState } from '../../shared/socket-events';
import { gameEvents } from '../game/events';
import { socket } from '../game/systems/socketClient';
import './BearWildlifeExperience.css';

type PointInfo={id:BearExplorationPointId;icon:string;name:string;card:BearExplorationCardId;clue:string};
const POINTS:PointInfo[]=[
  {id:'waterfall',icon:'💧',name:'폭포',card:'card_1',clue:'물가에서 발견한 곰 털'},
  {id:'cave',icon:'🪨',name:'동굴',card:'card_2',clue:'동굴 앞에서 발견한 곰 발자국'},
  {id:'tree',icon:'🌲',name:'큰 나무',card:'card_3',clue:'나무에 남은 발톱 자국'},
];
const ROLE_INFO:Record<BearExplorationRole,{icon:string;name:string;description:string}>={
  explorer:{icon:'🧭',name:'탐험가',description:'맵을 돌아다니며 현장 단서를 찾습니다.'},
  recorder:{icon:'📒',name:'기록가',description:'발견된 단서를 AI로 분석해 지도에 연결합니다.'},
  photographer:{icon:'📷',name:'사진가',description:'완성된 이동 경로를 공동 탐험 카드로 기록합니다.'},
};
const EMPTY_STATE:BearExplorationState={missionId:'',title:'오늘의 탐험',prompt:'잃어버린 탐험 기록 3개를 찾아주세요.',role:'explorer',roleMembers:[],foundCards:[],pendingCards:[],mergedCards:[],members:[],photoReady:false,photoComplete:false,completed:false};

export function BearWildlifeExperience({mapId}:{userKey:string;mapId:MapId}){
  const [state,setState]=useState<BearExplorationState>(EMPTY_STATE);
  const [nearbyPointId,setNearbyPointId]=useState<string|null>(null);
  const [onlineCount,setOnlineCount]=useState(1);
  const [introOpen,setIntroOpen]=useState(false);
  const [resultOpen,setResultOpen]=useState(false);
  const [notice,setNotice]=useState('');
  const [collecting,setCollecting]=useState(false);
  const previousCards=useRef(0);
  const active=mapId==='bear-play-zone';
  const nearbyPoint=POINTS.find(point=>point.id===nearbyPointId);

  useEffect(()=>{
    const update=(next:BearExplorationState)=>{
      if(next.mergedCards.length>previousCards.current&&previousCards.current>0)setNotice(`AI가 탐험 기록 ${next.mergedCards.length}개를 연결했습니다.`);
      previousCards.current=next.mergedCards.length;
      setState(next);
      if(next.completed&&next.story)setResultOpen(true);
    };
    const users=(players:PlayerState[])=>setOnlineCount(Math.max(1,players.filter(player=>player.mapId==='bear-play-zone').length));
    socket.on('bearExplorationUpdated',update);
    socket.on('currentMapUsers',users);
    socket.on('onlineUsersUpdated',users);
    return()=>{socket.off('bearExplorationUpdated',update);socket.off('currentMapUsers',users);socket.off('onlineUsersUpdated',users)};
  },[]);
  useEffect(()=>{
    if(!active){setIntroOpen(false);setResultOpen(false);setNearbyPointId(null);return}
    socket.emit('getBearExploration',next=>{previousCards.current=next.mergedCards.length;setState(next);if(!next.ownedCard)setIntroOpen(true)});
  },[active]);
  useEffect(()=>{
    const changed=(id:string|null)=>setNearbyPointId(id);
    gameEvents.on('bear-clue-proximity-changed',changed);
    return()=>{gameEvents.off('bear-clue-proximity-changed',changed)};
  },[]);
  useEffect(()=>{
    const locked=introOpen||resultOpen;
    gameEvents.emit('game-input-lock',locked);
    return()=>{if(locked)gameEvents.emit('game-input-lock',false)};
  },[introOpen,resultOpen]);

  const collect=()=>{
    if(!nearbyPoint||collecting)return;
    setCollecting(true);setNotice('');
    socket.emit('collectBearExplorationCard',nearbyPoint.id,result=>{
      setState(result.state);setNotice(result.message);setCollecting(false);
    });
  };
  const analyze=()=>{
    if(collecting)return;setCollecting(true);
    socket.emit('analyzeBearExplorationCards',result=>{setState(result.state);setNotice(result.message);setCollecting(false)});
  };
  const capture=()=>{
    if(collecting)return;setCollecting(true);
    socket.emit('captureBearExplorationPhoto',result=>{setState(result.state);setNotice(result.message);setCollecting(false)});
  };
  const roleInfo=ROLE_INFO[state.role];
  if(!active)return null;

  return <div className="bear-coop">
    <aside className="bear-coop-status">
      <div><small>🐻 함께 만드는 자연 탐험 · {roleInfo.name}</small><b>{state.title}</b><span>{state.mergedCards.length}/3 기록 연결</span></div>
      <div className="bear-coop-card-dots">{POINTS.map(point=><i className={state.mergedCards.includes(point.card)?'found':''} key={point.id}>{state.mergedCards.includes(point.card)?<Check size={14}/>:point.icon}</i>)}</div>
    </aside>

    {!introOpen&&!resultOpen&&nearbyPoint&&state.role==='explorer'&&<button type="button" className="bear-clue-nearby" onClick={collect} disabled={collecting}>
      <span>{nearbyPoint.icon}</span>
      <div><small>{state.foundCards.includes(nearbyPoint.card)?'이미 발견한 기록이에요':'잃어버린 탐험 기록이 가까이 있어요'}</small><b>{collecting?'조사 중...':`${nearbyPoint.name} 조사하기`}</b></div>
      <ChevronRight size={18}/>
    </button>}

    {!introOpen&&!resultOpen&&<section className="bear-coop-guide">
      <span className="bear-role-icon">{roleInfo.icon}</span><div><small>나의 역할 · {roleInfo.name}</small><b>{state.completed?'모든 역할이 탐험을 완성했습니다.':roleInfo.description}</b><p>{onlineCount===1?'혼자 플레이 중이라 부족한 역할은 AI가 대신합니다.':`${onlineCount}명이 역할을 나누어 함께 진행 중입니다.`}</p></div>
      {state.role==='recorder'&&<button type="button" disabled={!state.pendingCards.length||collecting} onClick={analyze}>AI 분석 {state.pendingCards.length?`(${state.pendingCards.length})`:''}</button>}
      {state.role==='photographer'&&<button type="button" disabled={!state.photoReady||state.photoComplete||collecting} onClick={capture}>포토 기록</button>}
    </section>}
    {notice&&<div className="bear-coop-notice" role="status">{notice}</div>}

    {introOpen&&<section className="bear-wildlife-overlay" role="dialog" aria-modal="true">
      <div className="bear-wildlife-modal">
        <button type="button" className="bear-wildlife-close" onClick={()=>setIntroOpen(false)} aria-label="닫기"><X size={18}/></button>
        <header className="bear-wildlife-header"><span>🐻</span><div><small>COOPERATIVE NATURE QUEST</small><b>함께 만드는 자연 탐험</b></div><em>{onlineCount}명</em></header>
        <div className="bear-wildlife-hero">🧭</div>
        <small className="bear-wildlife-kicker">TODAY'S EXPLORATION</small>
        <h2>{state.title}</h2>
        <p>{state.prompt}</p>
        <section className="bear-role-assignment"><span>{roleInfo.icon}</span><div><small>이번 탐험의 역할</small><b>{roleInfo.name}</b><p>{roleInfo.description}</p></div></section>
        <div className="bear-coop-rules">
          <article><span>1</span><b>탐험가</b><p>세 지점을 직접 이동하며 현장 단서를 발견해요.</p></article>
          <article><span>2</span><b>기록가</b><p>새 단서를 AI로 분석해 하나의 이동 경로로 연결해요.</p></article>
          <article><span>3</span><b>사진가</b><p>완성된 경로와 참여자를 공동 탐험 카드에 기록해요.</p></article>
        </div>
        <button type="button" className="bear-wildlife-primary" onClick={()=>setIntroOpen(false)}>첫 기록 찾으러 가기 <ChevronRight size={17}/></button>
      </div>
    </section>}

    {resultOpen&&<section className="bear-wildlife-overlay" role="dialog" aria-modal="true">
      <div className="bear-wildlife-modal">
        <button type="button" className="bear-wildlife-close" onClick={()=>setResultOpen(false)} aria-label="닫기"><X size={18}/></button>
        <header className="bear-wildlife-header"><span>🐻</span><div><small>EXPLORATION COMPLETE</small><b>오늘의 공동 탐험 카드</b></div><em>완료</em></header>
        <div className="bear-result-badge"><span>🧭</span><i>AI</i></div>
        <h2>우리가 자연 기록을 완성했어요</h2>
        <section className="bear-research-report"><small>AI가 연결한 곰의 이동 이야기</small><p>{state.story}</p></section>
        <div className="bear-coop-members">{state.roleMembers.map(member=><article key={member.playerId}><span>{ROLE_INFO[member.role].icon}</span><div><b>{member.nickname} · {ROLE_INFO[member.role].name}</b><small>{ROLE_INFO[member.role].description}</small></div></article>)}</div>
        <div className="bear-campus-next"><Users size={20}/><div><small>다음 연결</small><b>함께 탐험했던 사람과 공동캠퍼스에서 다시 만나보세요.</b></div></div>
        <button type="button" className="bear-wildlife-primary" onClick={()=>setResultOpen(false)}>탐험 공간으로 돌아가기</button>
      </div>
    </section>}
  </div>;
}
