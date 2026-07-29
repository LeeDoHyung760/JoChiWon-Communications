import { useState } from 'react';

const BEAR_TUTORIAL_HIDDEN_KEY='bear-tree-park-tutorial-hidden-v1';

const tutorialSteps=[
  {
    icon:'🌳',
    label:'베어트리파크 · AI 여행 행동 분석',
    title:'자연을 탐험하며 나의 여행 방식을 발견해요',
    description:'AI 탐험 연구소에서 폭포, 동굴, 큰 나무를 자유롭게 둘러보세요. 생태환경을 관찰하는 방식과 이동 기록을 AI가 하나의 탐험 프로필로 분석합니다.',
    actions:[
      {key:'💧',title:'폭포',copy:'물가와 곰의 생활환경 관찰'},
      {key:'🪨',title:'동굴',copy:'곰의 휴식·보금자리 환경 탐색'},
      {key:'🌲',title:'큰 나무',copy:'먹이와 휴식 환경 관찰'},
    ],
    hint:'정해진 순서는 없어요. 포토존 기록과 마지막 동행 선택도 여행 스타일 분석에 함께 반영됩니다.',
  },
] as const;

export function BearTreeParkTutorial({step,onPrevious,onNext}:{step:number;onPrevious:()=>void;onNext:()=>void}){
  const [neverShowAgain,setNeverShowAgain]=useState(false);
  const current=tutorialSteps[Math.min(step,tutorialSteps.length-1)],last=step===tutorialSteps.length-1;
  const proceed=()=>{
    if(last&&neverShowAgain)localStorage.setItem(BEAR_TUTORIAL_HIDDEN_KEY,'true');
    onNext();
  };
  return <section className="guide-dialog tutorial-dialog lake-tutorial bear-tree-tutorial" role="dialog" aria-modal="true" aria-labelledby="bear-tree-tutorial-title" tabIndex={-1} autoFocus onKeyDown={event=>event.stopPropagation()} onKeyUp={event=>event.stopPropagation()}>
    <header>
      <span>{current.icon}</span>
      <div><small>{current.label}</small><h2 id="bear-tree-tutorial-title">{current.title}</h2></div>
      <b>{step+1} / {tutorialSteps.length}</b>
    </header>
    <div className="tutorial-progress">{tutorialSteps.map((_,index)=><i key={index} className={index<=step?'active':''}/>)}</div>
    <p className="lake-tutorial-description">{current.description}</p>
    <div className="lake-tutorial-actions">{current.actions.map(action=><article key={action.title}><kbd>{action.key}</kbd><strong>{action.title}</strong><small>{action.copy}</small></article>)}</div>
    <p className="lake-tutorial-hint"><span>인공지능 동행자 충녕이</span>{current.hint}</p>
    <label className="lake-tutorial-never-show"><input type="checkbox" checked={neverShowAgain} onChange={event=>setNeverShowAgain(event.target.checked)}/><span>다시는 이 시작 안내를 보지 않기</span></label>
    <footer className="guide-dialog-actions">{step>0&&<button type="button" onClick={onPrevious}>이전</button>}<button type="button" className="guide-dialog-primary" onClick={proceed}>체험 시작하기</button></footer>
  </section>;
}
