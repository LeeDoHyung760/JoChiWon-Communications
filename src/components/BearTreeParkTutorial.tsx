import { useState } from 'react';

const BEAR_TUTORIAL_HIDDEN_KEY='bear-tree-park-tutorial-hidden-v1';

const tutorialSteps=[
  {
    icon:'🌳',
    label:'하나 · 자유롭게 둘러보기',
    title:'베어트리파크에서 자연 감성을 발견해요',
    description:'정해진 순서 없이 공원을 산책하다가 끌리는 체험 지점부터 방문해 보세요.',
    actions:[
      {key:'↑ ↓ ← →',title:'공원 산책',copy:'방향키로 자유롭게 이동'},
      {key:'🐻',title:'곰 만나기',copy:'곰 가족 체험 지점 방문'},
      {key:'🌿',title:'수목원 탐험',copy:'식물을 보고 감정 기록'},
    ],
    hint:'곰 만나기와 수목원 탐험은 어느 쪽을 먼저 해도 괜찮아요.',
  },
  {
    icon:'🟠',
    label:'둘 · 빛나는 체험 지점',
    title:'주황색 지점을 찾아 체험을 시작해요',
    description:'주황색 원은 아직 남은 체험이에요. 가까이 가면 이동하거나 체험을 시작하는 안내가 나타납니다.',
    actions:[
      {key:'🟠',title:'진행 전',copy:'아직 남아 있는 체험'},
      {key:'🟢',title:'완료',copy:'기록을 남긴 체험'},
      {key:'2곳',title:'자유 순서',copy:'원하는 곳부터 방문'},
    ],
    hint:'곰 공간 방문과 식물 감정 3종 기록을 마치면 두 체험 지점이 모두 초록색으로 바뀌어요.',
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
    <footer className="guide-dialog-actions">{step>0&&<button type="button" onClick={onPrevious}>이전</button>}<button type="button" className="guide-dialog-primary" onClick={proceed}>{last?'자유롭게 탐험 시작하기':'다음'}</button></footer>
  </section>;
}
