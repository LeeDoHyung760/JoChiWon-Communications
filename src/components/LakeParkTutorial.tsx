const tutorialSteps = [
  {
    icon:'🎮',
    label:'하나 · 이동하기',
    title:'WASD로 자유롭게 움직여 보세요',
    description:'호수공원을 돌아다니며 원하는 체험 부스를 먼저 방문할 수 있어요.',
    actions:[
      {key:'W A S D',title:'이동',copy:'방향키로도 움직일 수 있어요'},
      {key:'Shift',title:'달리기',copy:'이동 키와 함께 눌러요'},
      {key:'Space',title:'점프',copy:'낮은 장애물을 넘어가요'},
    ],
    hint:'공연, 먹거리, 축제 부스는 원하는 순서대로 체험할 수 있어요.',
  },
  {
    icon:'✨',
    label:'둘 · 취향 발견하기',
    title:'주황색 체험존에서 세종 취향을 발견해요',
    description:'빛나는 체험존에 들어가 관심 콘텐츠를 고르고 저장해 보세요.',
    actions:[
      {key:'🎤',title:'공연',copy:'관심 공연 1~2개 선택'},
      {key:'🍑',title:'먹거리·장소',copy:'관심 항목 1~3개 선택'},
      {key:'🎪',title:'축제',copy:'관심 축제 1~2개 선택'},
    ],
    hint:'완료한 체험존은 초록색으로 바뀌며, 세 곳을 완료하면 다음 맵이 열려요.',
  },
] as const;

export function LakeParkTutorial({step,onPrevious,onNext}:{step:number;onPrevious:()=>void;onNext:()=>void}){
  const [neverShowAgain,setNeverShowAgain]=useState(false);
  const current=tutorialSteps[Math.min(step,tutorialSteps.length-1)],last=step===tutorialSteps.length-1;
  const proceed=()=>{
    if(last&&neverShowAgain)localStorage.setItem(LAKE_TUTORIAL_HIDDEN_KEY,'true');
    onNext();
  };
  return <section className="guide-dialog tutorial-dialog lake-tutorial" role="dialog" aria-modal="true" aria-labelledby="lake-tutorial-title" tabIndex={-1} autoFocus onKeyDown={event=>event.stopPropagation()} onKeyUp={event=>event.stopPropagation()}>
    <header>
      <span>{current.icon}</span>
      <div><small>{current.label}</small><h2 id="lake-tutorial-title">{current.title}</h2></div>
      <b>{step+1} / {tutorialSteps.length}</b>
    </header>
    <div className="tutorial-progress">{tutorialSteps.map((_,index)=><i key={index} className={index<=step?'active':''}/>)}</div>
    <p className="lake-tutorial-description">{current.description}</p>
    <div className="lake-tutorial-actions">{current.actions.map(action=><article key={action.title}><kbd>{action.key}</kbd><strong>{action.title}</strong><small>{action.copy}</small></article>)}</div>
    <p className="lake-tutorial-hint"><span>AI 동행자 충녕이</span>{current.hint}</p>
    <label className="lake-tutorial-never-show"><input type="checkbox" checked={neverShowAgain} onChange={event=>setNeverShowAgain(event.target.checked)}/><span>다시는 이 시작 안내를 보지 않기</span></label>
    <footer className="guide-dialog-actions">{step>0&&<button type="button" onClick={onPrevious}>이전</button>}<button type="button" className="guide-dialog-primary" onClick={proceed}>{last?'자유롭게 체험 시작하기':'다음'}</button></footer>
  </section>;
}
import { useState } from 'react';

const LAKE_TUTORIAL_HIDDEN_KEY='sejong-lake-tutorial-hidden-v1';
