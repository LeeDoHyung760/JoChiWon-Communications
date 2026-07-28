import { useEffect,useMemo,useRef,useState } from 'react';
import { Check,ChevronRight,Map,Send,Sparkles,Users,X } from 'lucide-react';
import type { BearExplorationCardId,BearExplorationPointId,BearExplorationRole,BearExplorationState,MapId,PlayerState } from '../../shared/socket-events';
import { API_BASE_URL } from '../config/api';
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
  explorer:{icon:'🧭',name:'탐험가',description:'연구소를 직접 이동하며 현장 단서를 발견합니다.'},
  recorder:{icon:'📒',name:'기록가',description:'AI 생태 지도를 보고 탐험가에게 다음 조사 위치를 전달합니다.'},
  photographer:{icon:'🗂️',name:'최종 기록 담당자',description:'대표 제목과 장면을 선택해 공동 탐험 카드를 게시합니다.'},
};
const EMPTY_STATE:BearExplorationState={missionId:'',title:'오늘의 생태 탐험',prompt:'잃어버린 탐험 기록 3개를 찾아주세요.',role:'explorer',roleMembers:[],foundCards:[],pendingCards:[],mergedCards:[],members:[],analyses:[],photoReady:false,photoComplete:false,completedRouteCount:0,completedRoutes:[],completed:false};
const TITLE_OPTIONS=['반달곰의 이동을 추적했습니다','세 장소에서 완성한 곰 생태 기록','AI와 함께 찾은 숲속 이동 경로'];

export function BearWildlifeExperience({userKey,mapId}:{userKey:string;mapId:MapId}){
  const [state,setState]=useState<BearExplorationState>(EMPTY_STATE);
  const [nearbyPointId,setNearbyPointId]=useState<string|null>(null);
  const [onlineCount,setOnlineCount]=useState(1);
  const [introOpen,setIntroOpen]=useState(false);
  const [reportOpen,setReportOpen]=useState(false);
  const [notice,setNotice]=useState('');
  const [working,setWorking]=useState(false);
  const [title,setTitle]=useState(TITLE_OPTIONS[0]);
  const [cover,setCover]=useState<BearExplorationPointId>('waterfall');
  const previousCards=useRef(0);
  const active=mapId==='bear-play-zone';
  const nearbyPoint=POINTS.find(point=>point.id===nearbyPointId);
  const roleInfo=ROLE_INFO[state.role];
  const finalizerId=state.roleMembers.find(member=>member.role==='photographer')?.playerId??state.roleMembers.at(-1)?.playerId;
  const canFinalize=state.photoReady&&!state.completed&&finalizerId===socket.id;
  const reportContent=useMemo(()=>[
    `오늘의 이동 경로: ${state.report?.route.join(' → ')??POINTS.filter(point=>state.mergedCards.includes(point.card)).map(point=>point.name).join(' → ')}`,
    `발견한 단서: ${POINTS.filter(point=>state.foundCards.includes(point.card)).map(point=>point.clue).join(', ')}`,
    `참여자 역할: ${state.roleMembers.map(member=>`${member.nickname}(${ROLE_INFO[member.role].name})`).join(', ')}`,
    `탐험 성공 여부: ${state.photoReady?'성공':'조사 중'}`,
    `한 줄 생태 해설: ${state.story??'AI가 수집된 단서를 분석하고 있습니다.'}`,
  ].join('\n'),[state]);

  useEffect(()=>{
    const update=(next:BearExplorationState)=>{
      if(next.mergedCards.length>previousCards.current)setNotice(`AI가 새 단서를 분석했습니다. 기록가의 생태 지도가 갱신되었습니다.`);
      previousCards.current=next.mergedCards.length;
      setState(next);
      if(next.completed){localStorage.setItem(`bear-tree-ai-completed-v1:${userKey.trim().toLowerCase()||'guest'}`,'true');gameEvents.emit('bear-wildlife-progress-changed');setReportOpen(true)}
    };
    const users=(players:PlayerState[])=>setOnlineCount(Math.max(1,players.filter(player=>player.mapId==='bear-play-zone').length));
    socket.on('bearExplorationUpdated',update);socket.on('currentMapUsers',users);socket.on('onlineUsersUpdated',users);
    return()=>{socket.off('bearExplorationUpdated',update);socket.off('currentMapUsers',users);socket.off('onlineUsersUpdated',users)};
  },[userKey]);
  useEffect(()=>{
    if(!active){setIntroOpen(false);setReportOpen(false);setNearbyPointId(null);return}
    socket.emit('getBearExploration',next=>{previousCards.current=next.mergedCards.length;setState(next);if(!next.ownedCard&&!next.completed)setIntroOpen(true)});
  },[active]);
  useEffect(()=>{
    const changed=(id:string|null)=>setNearbyPointId(id);
    gameEvents.on('bear-clue-proximity-changed',changed);
    return()=>{gameEvents.off('bear-clue-proximity-changed',changed)};
  },[]);
  useEffect(()=>{
    const locked=introOpen||reportOpen||(active&&state.role==='recorder');
    gameEvents.emit('game-input-lock',locked);
    return()=>{if(locked)gameEvents.emit('game-input-lock',false)};
  },[active,introOpen,reportOpen,state.role]);
  useEffect(()=>{if(canFinalize)setReportOpen(true)},[canFinalize]);

  const collect=()=>{
    if(!nearbyPoint||working)return;
    setWorking(true);setNotice('AI가 현장 단서를 분석하고 있습니다.');
    socket.emit('collectBearExplorationCard',nearbyPoint.id,result=>{setState(result.state);setNotice(result.message);setWorking(false)});
  };
  const publish=async()=>{
    if(working||!state.story)return;setWorking(true);setNotice('');
    try{
      const author=state.roleMembers.map(member=>member.nickname).join('·')||'AI 생태 탐험팀';
      const response=await fetch(`${API_BASE_URL}/community`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({author,title,category:'탐험기록',content:reportContent})});
      if(!response.ok)throw new Error('공동캠퍼스 게시판에 등록하지 못했습니다.');
      socket.emit('finalizeBearExplorationReport',{title,cover},result=>{setState(result.state);setNotice(result.message);setWorking(false)});
    }catch(error){setNotice(error instanceof Error?error.message:'탐험 카드를 등록하지 못했습니다.');setWorking(false)}
  };
  if(!active)return null;

  return <div className="bear-coop">
    <aside className="bear-coop-status">
      <div><small>AI 생태 탐험 연구소 · {roleInfo.name}</small><b>{state.title}</b><span>{state.mergedCards.length}/3 단서 분석</span></div>
      <div className="bear-coop-card-dots">{POINTS.map(point=><i className={state.mergedCards.includes(point.card)?'found':''} key={point.id}>{state.mergedCards.includes(point.card)?<Check size={14}/>:point.icon}</i>)}</div>
    </aside>

    {!introOpen&&!reportOpen&&nearbyPoint&&state.role==='explorer'&&<button type="button" className="bear-clue-nearby" onClick={collect} disabled={working||state.foundCards.includes(nearbyPoint.card)}>
      <span>{nearbyPoint.icon}</span><div><small>{state.foundCards.includes(nearbyPoint.card)?'이미 발견한 현장 기록':'현장 단서가 가까이 있습니다'}</small><b>{working?'AI 분석 중...':`${nearbyPoint.name} 조사하기`}</b></div><ChevronRight size={18}/>
    </button>}

    {!introOpen&&!reportOpen&&state.role==='recorder'&&<section className="bear-ai-map">
      <header><Map size={18}/><div><small>기록가 전용 화면</small><b>AI 생태 지도</b></div><em>이동 잠금</em></header>
      <p className="bear-ai-guidance"><Sparkles size={15}/><span>{state.aiGuidance}</span></p>
      <div className="bear-ai-route">{POINTS.map(point=><article className={state.mergedCards.includes(point.card)?'done':''} key={point.id}><i>{point.icon}</i><b>{point.name}</b><small>{state.mergedCards.includes(point.card)?'분석 완료':'탐험가 조사 대기'}</small></article>)}</div>
      <div className="bear-ai-log">{state.analyses.map(item=><p key={item.cardId}><b>{item.place} 분석</b><span>{item.analysis}</span></p>)}</div>
    </section>}

    {!introOpen&&!reportOpen&&state.role!=='recorder'&&<section className="bear-coop-guide">
      <span className="bear-role-icon">{roleInfo.icon}</span><div><small>나의 역할 · {roleInfo.name}</small><b>{state.completed?'공동 탐험 카드가 게시되었습니다.':roleInfo.description}</b><p>{onlineCount===1?'부족한 역할은 AI가 대신합니다.':`${onlineCount}명이 서로 다른 역할로 탐험 중입니다.`}</p></div>
    </section>}
    {notice&&<div className="bear-coop-notice" role="status">{notice}</div>}

    {introOpen&&<section className="bear-wildlife-overlay" role="dialog" aria-modal="true"><div className="bear-wildlife-modal">
      <button type="button" className="bear-wildlife-close" onClick={()=>setIntroOpen(false)} aria-label="닫기"><X size={18}/></button>
      <header className="bear-wildlife-header"><span>🐻</span><div><small>AI ECOLOGY EXPEDITION LAB</small><b>AI 생태 탐험 연구소</b></div><em>{onlineCount}명</em></header>
      <div className="bear-wildlife-hero">🧭</div><small className="bear-wildlife-kicker">TODAY'S RESEARCH</small><h2>{state.title}</h2><p>{state.prompt}</p>
      <section className="bear-role-assignment"><span>{roleInfo.icon}</span><div><small>이번 탐험의 역할</small><b>{roleInfo.name}</b><p>{roleInfo.description}</p></div></section>
      <div className="bear-coop-rules"><article><span>1</span><b>탐험가</b><p>직접 이동하며 단서를 발견하고 기록가와 소통해요.</p></article><article><span>2</span><b>기록가</b><p>이동하지 않고 AI 지도와 다음 위치 힌트를 전달해요.</p></article><article><span>3</span><b>최종 기록 담당자</b><p>대표 제목과 장면을 골라 탐험 보고서를 게시해요.</p></article></div>
      <button type="button" className="bear-wildlife-primary" onClick={()=>setIntroOpen(false)}>역할 시작하기 <ChevronRight size={17}/></button>
    </div></section>}

    {reportOpen&&<section className="bear-wildlife-overlay" role="dialog" aria-modal="true"><div className="bear-wildlife-modal bear-report-editor">
      <button type="button" className="bear-wildlife-close" onClick={()=>setReportOpen(false)} aria-label="닫기"><X size={18}/></button>
      <header className="bear-wildlife-header"><span>🐻</span><div><small>AI EXPEDITION REPORT</small><b>오늘의 공동 탐험 카드</b></div><em>{state.completed?'게시 완료':'최종 편집'}</em></header>
      <h2>AI가 오늘의 탐험 보고서를 작성했습니다</h2>
      <section className="bear-research-report"><small>AI 탐험 보고서</small><p>{state.story}</p></section>
      {!state.completed&&canFinalize&&<><label className="bear-report-field"><span>대표 제목</span><select value={title} onChange={event=>setTitle(event.target.value)}>{TITLE_OPTIONS.map(option=><option key={option}>{option}</option>)}</select></label>
      <fieldset className="bear-cover-options"><legend>대표 장면</legend>{POINTS.map(point=><button type="button" className={cover===point.id?'selected':''} onClick={()=>setCover(point.id)} key={point.id}><i>{point.icon}</i><span>{point.name}</span></button>)}</fieldset>
      <button type="button" className="bear-wildlife-primary" disabled={working} onClick={()=>void publish()}><Send size={16}/>{working?'게시 중...':'공동캠퍼스 게시판에 올리기'}</button></>}
      {state.completed&&state.report&&<><div className="bear-result-cover"><i>{POINTS.find(point=>point.id===state.report?.cover)?.icon}</i><div><small>{state.report.teamName}</small><b>{state.report.title}</b><span>{state.report.route.join(' → ')}</span></div></div>
      <div className="bear-campus-next"><Users size={20}/><div><small>다른 팀과 비교</small><b>오늘 {state.completedRouteCount}개의 이동 경로가 완성되었습니다.</b>{state.completedRoutes.slice(0,-1).map((route,index)=><span key={`${route.join('-')}-${index}`}>다른 팀 {index+1}: {route.join(' → ')}</span>)}</div></div></>}
    </div></section>}
  </div>;
}
