const tutorialSteps = [
  {
    icon:'🎮',
    label:'하나 · 조작 방법',
    title:'먼저 캐릭터를 움직여 보세요',
    description:'세 가지 조작만 알면 호수공원의 모든 체험을 이용할 수 있어요.',
    actions:[
      {key:'W A S D',title:'이동',copy:'방향키로도 움직일 수 있어요'},
      {key:'Shift',title:'달리기',copy:'이동 키와 함께 눌러요'},
      {key:'Space',title:'점프',copy:'낮은 장애물을 넘어가요'},
    ],
    hint:'빛나는 원이나 오브젝트 가까이 가면 체험 버튼이 나타나요.',
  },
  {
    icon:'🎪',
    label:'둘 · 축제광장',
    title:'마음에 드는 콘텐츠를 하나 저장해요',
    description:'축제·공연·먹거리·공방·포토존 부스를 자유롭게 둘러보세요.',
    actions:[
      {key:'1',title:'부스 가까이 가기',copy:'빛나는 체험존을 찾아요'},
      {key:'2',title:'카드 읽어보기',copy:'사진과 설명을 확인해요'},
      {key:'3',title:'관심 장소로 저장',copy:'내 첫 관심 기록이 돼요'},
    ],
    hint:'처음에는 하나만 저장해도 충분해요. 나중에 언제든 더 둘러볼 수 있어요.',
  },
  {
    icon:'📷',
    label:'셋 · 짧은 체험',
    title:'직접 해보고 싶은 활동을 골라요',
    description:'복잡한 놀이 대신 짧게 보고, 찍고, 고르는 체험으로 취향을 남겨요.',
    actions:[
      {key:'보기',title:'공연 감상',copy:'영상과 이미지를 살펴봐요'},
      {key:'찍기',title:'사진 기록',copy:'포토존에서 장면을 남겨요'},
      {key:'고르기',title:'활동 선택',copy:'먹기·보기·체험 중 선택해요'},
    ],
    hint:'선택한 활동은 이후 비슷한 기록의 이웃과 장소를 찾는 데 활용돼요.',
  },
  {
    icon:'🧭',
    label:'넷 · 시민 코스 게시판',
    title:'다른 이웃의 세종 코스를 둘러봐요',
    description:'정부청사에서 완성된 실제 방문 코스가 다시 호수공원에 모여요.',
    actions:[
      {key:'코스',title:'방문 순서 확인',copy:'테마와 대표 장소를 봐요'},
      {key:'이웃',title:'참여자 확인',copy:'누가 함께 만들었는지 봐요'},
      {key:'♡',title:'나도 가고 싶어요',copy:'마음에 든 코스에 반응해요'},
    ],
    hint:'나중에 이웃과 만든 방문 코스도 이 게시판에 공유할 수 있어요.',
  },
  {
    icon:'🌿',
    label:'다섯 · 다음 공간',
    title:'첫 기록을 만들고 수목원으로 가요',
    description:'관심 콘텐츠를 저장했다면 호수공원에서 해야 할 첫 번째 체험은 끝났어요.',
    actions:[
      {key:'✓',title:'관심 콘텐츠 저장',copy:'호수공원 첫 기록 완성'},
      {key:'→',title:'포탈 찾아가기',copy:'안내 표시를 따라 이동'},
      {key:'🌿',title:'수목원 탐험',copy:'식물과 곰 관찰 기록 만들기'},
    ],
    hint:'지금은 축제광장의 빛나는 체험존에서 첫 관심 콘텐츠를 저장해 보세요.',
  },
] as const;

export function LakeParkTutorial({step,onPrevious,onNext}:{step:number;onPrevious:()=>void;onNext:()=>void}){
  const current=tutorialSteps[Math.min(step,tutorialSteps.length-1)],last=step===tutorialSteps.length-1;
  return <section className="guide-dialog tutorial-dialog lake-tutorial" role="dialog" aria-modal="true" aria-labelledby="lake-tutorial-title" tabIndex={-1} autoFocus onKeyDown={event=>event.stopPropagation()} onKeyUp={event=>event.stopPropagation()}>
    <header>
      <span>{current.icon}</span>
      <div><small>{current.label}</small><h2 id="lake-tutorial-title">{current.title}</h2></div>
      <b>{step+1} / {tutorialSteps.length}</b>
    </header>
    <div className="tutorial-progress">{tutorialSteps.map((_,index)=><i key={index} className={index<=step?'active':''}/>)}</div>
    <p className="lake-tutorial-description">{current.description}</p>
    <div className="lake-tutorial-actions">{current.actions.map(action=><article key={action.title}><kbd>{action.key}</kbd><strong>{action.title}</strong><small>{action.copy}</small></article>)}</div>
    <p className="lake-tutorial-hint"><span>충녕이 도움말</span>{current.hint}</p>
    <footer className="guide-dialog-actions">{step>0&&<button type="button" onClick={onPrevious}>이전</button>}<button type="button" className="guide-dialog-primary" onClick={onNext}>{last?'축제광장으로 출발하기':'다음 단계'}</button></footer>
  </section>;
}
