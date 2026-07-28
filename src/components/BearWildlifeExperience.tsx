import { useEffect,useMemo,useRef,useState } from 'react';
import { BookOpen,Check,ChevronRight,Send,Sparkles,X } from 'lucide-react';
import type { MapId } from '../../shared/socket-events';
import { BEAR_CLUES,loadBearProgress,saveBearProgress,type BearClue,type BearWildlifeProgress } from '../data/bear-wildlife';
import { gameEvents } from '../game/events';
import { requestBearAnswer,requestClueExplanation } from '../services/bearWildlifeAi';
import './BearWildlifeExperience.css';

type View='intro'|'clue'|'result'|'book';
type ChatItem={question:string;answer:string};
const examples=['반달가슴곰은 사람을 공격하나요?','곰 발자국은 어떻게 구별하나요?','겨울잠은 얼마나 자나요?'];

export function BearWildlifeExperience({userKey,mapId}:{userKey:string;mapId:MapId}){
  const [nearbyClueId,setNearbyClueId]=useState<string|null>(null);
  const [progress,setProgress]=useState<BearWildlifeProgress>(()=>loadBearProgress(userKey));
  const [view,setView]=useState<View|null>(null);
  const [clueIndex,setClueIndex]=useState(0);
  const [selected,setSelected]=useState<number|null>(null);
  const [explanation,setExplanation]=useState('');
  const [loadingExplanation,setLoadingExplanation]=useState(false);
  const [question,setQuestion]=useState('');
  const [asking,setAsking]=useState(false);
  const [chat,setChat]=useState<ChatItem[]>([]);
  const modalRef=useRef<HTMLDivElement>(null);
  const active=mapId==='bear-play-zone';
  const completed=progress.completedClues.length;
  const clue=BEAR_CLUES[clueIndex];

  useEffect(()=>{setProgress(loadBearProgress(userKey))},[userKey]);
  useEffect(()=>{
    if(mapId!=='bear-play-zone'){setView(null);setNearbyClueId(null);return}
    const saved=loadBearProgress(userKey);setProgress(saved);
    if(saved.completedAt)return;
    const introTimer=window.setTimeout(()=>setView('intro'),700);
    return()=>window.clearTimeout(introTimer);
  },[mapId,userKey]);
  useEffect(()=>{
    const nearbyChanged=(id:string|null)=>setNearbyClueId(id);
    gameEvents.on('bear-clue-proximity-changed',nearbyChanged);
    return()=>{gameEvents.off('bear-clue-proximity-changed',nearbyChanged)};
  },[]);

  useEffect(()=>{
    gameEvents.emit('game-input-lock',view!==null);
    if(view)window.setTimeout(()=>modalRef.current?.focus(),0);
    return()=>{if(view)gameEvents.emit('game-input-lock',false)};
  },[view]);

  const publish=(next:BearWildlifeProgress)=>{
    saveBearProgress(userKey,next);setProgress(next);
    gameEvents.emit('bear-wildlife-progress-changed',next);
  };
  const openClue=(index:number)=>{
    setClueIndex(index);setSelected(null);setExplanation('');setView('clue');
  };
  const start=()=>{
    setView(null);
  };
  const close=()=>setView(null);
  const choose=async(index:number)=>{
    if(selected!==null||loadingExplanation)return;
    setSelected(index);setLoadingExplanation(true);
    const answer=await requestClueExplanation(clue,clue.options[index]);
    setExplanation(answer);setLoadingExplanation(false);
    if(!progress.completedClues.includes(clue.id)){
      publish({...progress,completedClues:[...progress.completedClues,clue.id]});
    }
  };
  const nextClue=()=>{
    const saved=loadBearProgress(userKey);
    if(saved.completedClues.length<BEAR_CLUES.length){setView(null);return}
    const final={...saved,completedClues:BEAR_CLUES.map(item=>item.id),completedAt:saved.completedAt??new Date().toISOString()};
    publish(final);setView('result');
  };
  const ask=async(value=question)=>{
    const normalized=value.trim();if(normalized.length<2||asking)return;
    setQuestion('');setAsking(true);
    const answer=await requestBearAnswer(normalized);
    setChat(current=>[...current.slice(-3),{question:normalized,answer}]);
    const saved=loadBearProgress(userKey);
    publish({...saved,questionsAsked:saved.questionsAsked+1});
    setAsking(false);
  };

  const level=completed===BEAR_CLUES.length?1:0;
  const progressPercent=Math.round(completed/BEAR_CLUES.length*100);
  const clueCards=useMemo(()=>BEAR_CLUES.map(item=>({...item,done:progress.completedClues.includes(item.id)})),[progress.completedClues]);
  const nearbyClue=BEAR_CLUES.find(item=>item.id===nearbyClueId);
  if(!active)return null;

  return <div className="bear-wildlife-ui">
    {!view&&<aside className="bear-wildlife-map-guide">
      <div><small>AI 야생 탐험가</small><b>곰 주변의 빛나는 흔적 3개를 찾아보세요</b></div>
      <span>{clueCards.map(item=><i className={item.done?'done':''} key={item.id}>{item.done?'✓':item.icon}</i>)}</span>
    </aside>}
    {!view&&nearbyClue&&<button type="button" className="bear-clue-nearby" onClick={()=>openClue(BEAR_CLUES.indexOf(nearbyClue))}>
      <span>{nearbyClue.icon}</span><div><small>{progress.completedClues.includes(nearbyClue.id)?'조사한 흔적을 다시 발견했어요':'빛나는 야생 흔적을 발견했어요'}</small><b>{nearbyClue.title} 조사하기</b></div><ChevronRight size={18}/>
    </button>}
    {!view&&!nearbyClue&&<button type="button" className={`bear-wildlife-launch ${progress.completedAt?'is-complete':''}`} onClick={()=>progress.completedAt?setView('book'):setView('intro')}>
      <span>{progress.completedAt?'🏅':'🐾'}</span>
      <div><small>AI 야생 탐험가 · {completed}/3 흔적</small><b>{progress.completedAt?'반달가슴곰 생태도감':'첫 번째 흔적 조사하기'}</b></div>
      <ChevronRight size={18}/>
    </button>}
    {view&&<section className="bear-wildlife-overlay" role="dialog" aria-modal="true" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}>
      <div className={`bear-wildlife-modal is-${view}`} ref={modalRef} tabIndex={-1} onKeyDown={event=>event.stopPropagation()} onKeyUp={event=>event.stopPropagation()}>
        <button type="button" className="bear-wildlife-close" onClick={close} aria-label="닫기"><X size={18}/></button>
        <header className="bear-wildlife-header">
          <span>🐻</span>
          <div><small>AI 야생 탐험가</small><b>반달가슴곰 흔적 연구소</b></div>
          <em>Lv.{level}</em>
        </header>

        {view==='intro'&&<>
          <div className="bear-wildlife-hero">🐾<i>✦</i></div>
          <small className="bear-wildlife-kicker">BEAR TRACE MISSION</small>
          <h2>흔적을 따라가며<br/>곰 전문가가 되어보세요</h2>
          <p>맵에 빛나는 세 흔적을 직접 찾아보세요. 가까이에서 관찰하고, 궁금한 점은 AI 생태 해설사에게 자유롭게 물어볼 수 있어요.</p>
          <div className="bear-wildlife-route">
            {clueCards.map((item,index)=><span className={item.done?'done':''} key={item.id}><i>{item.done?<Check size={15}/>:item.icon}</i><b>{index+1}</b><small>{item.title}</small></span>)}
          </div>
          <button type="button" className="bear-wildlife-primary" onClick={start}>{completed?'다음 흔적 찾으러 가기':'빛나는 흔적 찾으러 가기'} <ChevronRight size={17}/></button>
        </>}

        {view==='clue'&&<>
          <div className="bear-clue-progress"><span>흔적 {clueIndex+1} / {BEAR_CLUES.length}</span><i><b style={{width:`${(clueIndex+1)/BEAR_CLUES.length*100}%`}}/></i></div>
          <div className="bear-clue-icon">{clue.icon}<i/></div>
          <small className="bear-wildlife-kicker">{clue.title}</small>
          <h2>{clue.question}</h2>
          <div className="bear-clue-options">
            {clue.options.map((option,index)=><button type="button" className={selected===index?(index===clue.answer?'correct':'wrong'):selected!==null&&index===clue.answer?'correct':''} disabled={selected!==null} onClick={()=>void choose(index)} key={option}><span>{String.fromCharCode(65+index)}</span><b>{option}</b>{selected!==null&&index===clue.answer&&<Check size={17}/>}</button>)}
          </div>
          {selected!==null&&<section className="bear-ai-explanation" aria-live="polite">
            <Sparkles size={19}/><div><small>AI 생태 해설사</small><p>{loadingExplanation?'흔적과 생태 자료를 함께 살펴보고 있어요…':explanation}</p></div>
          </section>}
          {selected!==null&&!loadingExplanation&&<button type="button" className="bear-wildlife-primary" onClick={nextClue}>{progress.completedClues.length===BEAR_CLUES.length?'탐험 결과 확인':'맵에서 다음 흔적 찾기'} <ChevronRight size={17}/></button>}
        </>}

        {view==='result'&&<>
          <div className="bear-result-badge"><span>🐻</span><i>AI</i></div>
          <small className="bear-wildlife-kicker">WILDLIFE EXPLORER COMPLETE</small>
          <h2>반달가슴곰 생태 전문가</h2>
          <strong className="bear-result-level">Lv.1</strong>
          <p>발자국·먹이·겨울 보금자리의 세 흔적을 조사했어요. 이제 나만의 생태도감에서 기록을 다시 보고 AI 해설사에게 질문할 수 있어요.</p>
          <div className="bear-result-stats"><span><b>3</b><small>조사한 흔적</small></span><span><b>{progress.questionsAsked}</b><small>AI 질문</small></span><span><b>100%</b><small>첫 탐험</small></span></div>
          <button type="button" className="bear-wildlife-primary" onClick={()=>setView('book')}><BookOpen size={17}/> 생태도감 열기</button>
        </>}

        {view==='book'&&<>
          <div className="bear-book-heading"><div><small>나의 반달가슴곰 생태도감</small><h2>발견한 흔적과 AI 해설</h2></div><strong>{progressPercent}%</strong></div>
          <div className="bear-book-clues">
            {clueCards.map((item,index)=><article className={item.done?'done':''} key={item.id}><span>{item.icon}</span><div><small>RECORD {index+1}</small><b>{item.title}</b><p>{item.done?item.fallbackExplanation:'아직 조사하지 않은 흔적이에요.'}</p></div>{item.done?<Check size={17}/>:<button type="button" onClick={close}>찾기</button>}</article>)}
          </div>
          <section className="bear-question-panel">
            <header><Sparkles size={19}/><div><small>무엇이든 물어보세요</small><b>AI 반달가슴곰 생태 해설사</b></div></header>
            <div className="bear-question-examples">{examples.map(item=><button type="button" onClick={()=>void ask(item)} disabled={asking} key={item}>{item}</button>)}</div>
            {chat.map((item,index)=><div className="bear-chat-item" key={`${item.question}-${index}`}><p><b>나</b>{item.question}</p><p><b>AI</b>{item.answer}</p></div>)}
            {asking&&<p className="bear-chat-loading">생태 자료에서 답을 찾고 있어요…</p>}
            <form onSubmit={event=>{event.preventDefault();void ask()}}><input value={question} maxLength={200} onChange={event=>setQuestion(event.target.value)} placeholder="반달가슴곰에 대해 궁금한 점을 입력하세요"/><button type="submit" disabled={asking||question.trim().length<2} aria-label="질문 보내기"><Send size={17}/></button></form>
            <small className="bear-ai-notice">AI는 준비된 생태 자료를 바탕으로 답해요. 실제 야생동물 조우 시에는 현장 및 국립공원 안전 안내를 우선하세요.</small>
          </section>
          <div className="bear-source-links"><span>생태 자료</span><a href="https://species.nibr.go.kr/digital/mobile/viewSpeciesDetail.do?content_type=ID&ktsn=120000212858" target="_blank" rel="noreferrer">국립생물자원관</a><a href="https://reservation.knps.or.kr/contents/G/serviceGuide.do?parkId=B991" target="_blank" rel="noreferrer">국립공원공단</a></div>
        </>}
      </div>
    </section>}
  </div>;
}
