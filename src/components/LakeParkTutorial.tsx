import { useEffect, useState } from 'react';

export const LAKE_WELCOME_SEEN_KEY='sejong-lake-tutorial-hidden-v2';

const dialogue=[
  {text:'안녕! 나는 세종 여행을 함께할 충녕이야.',sub:'네가 이곳에서 무엇을 좋아하는지 함께 찾아볼게.'},
  {text:'여기는 세종호수공원이야. 정해진 순서는 없어!',sub:'축제, 공연, 먹거리 중 마음이 끌리는 곳부터 찾아가면 돼.'},
  {text:'네가 직접 고르고 체험한 것만 내가 기억할게.',sub:'그 기록으로 키워드와 관심사, 세종 코스가 하나씩 완성될 거야.'},
  {text:'그럼 우리, 천천히 세종을 여행해 볼까?',sub:'내가 계속 곁에서 다음 여정을 알려줄게!'},
] as const;

export function LakeParkTutorial({onClose}:{onClose:()=>void}){
  const [step,setStep]=useState(0);
  const [showControls,setShowControls]=useState(false);
  const current=dialogue[step];

  useEffect(()=>{
    if(!showControls)return;
    const timer=window.setTimeout(()=>{
      localStorage.setItem(LAKE_WELCOME_SEEN_KEY,'true');
      onClose();
    },3000);
    return()=>window.clearTimeout(timer);
  },[onClose,showControls]);

  const next=()=>{
    if(step<dialogue.length-1)setStep(value=>value+1);
    else setShowControls(true);
  };

  if(showControls)return <section className="lake-control-toast" role="status" aria-live="polite">
    <header><span>🎮</span><div><small>충녕이의 마지막 안내</small><b>이제 자유롭게 움직여 보세요!</b></div><em>3초 후 시작</em></header>
    <div><span><kbd>↑ ↓ ← →</kbd><b>이동</b></span><span><kbd>Shift</kbd><b>달리기</b></span><span><kbd>Space</kbd><b>점프</b></span></div>
    <i><b/></i>
  </section>;

  return <section className="chungnyeong-conversation" role="dialog" aria-modal="true" aria-labelledby="lake-welcome-title" tabIndex={-1} autoFocus onKeyDown={event=>event.stopPropagation()} onKeyUp={event=>event.stopPropagation()}>
    <div className="chungnyeong-conversation-avatar"><span>👑</span><i>AI</i></div>
    <div className="chungnyeong-conversation-bubble">
      <header><small>세종 인공지능 동행자</small><b>충녕이</b><em>{step+1} / {dialogue.length}</em></header>
      <h2 id="lake-welcome-title">{current.text}</h2>
      <p>{current.sub}</p>
      <div className="chungnyeong-dialogue-dots">{dialogue.map((_,index)=><i key={index} className={index<=step?'active':''}/>)}</div>
      <button type="button" onClick={next}>{step===dialogue.length-1?'좋아, 출발하자!':'다음'}</button>
    </div>
  </section>;
}
