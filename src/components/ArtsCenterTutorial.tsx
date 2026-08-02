const guideSteps=[
  {icon:'🖼️',title:'포스터를 둘러보세요',copy:'로비의 공연 포스터 앞으로 이동한 뒤, 마음에 드는 포스터를 클릭하세요.'},
  {icon:'🎬',title:'보고 싶은 공연을 선택하세요',copy:'포스터 상세 화면에서 공연 정보와 영상을 확인하고 관람할 작품을 골라요.'},
  {icon:'💺',title:'객석에 앉아 관람하세요',copy:'공연장 의자를 클릭하거나 가까이에서 E를 누르면 영상 관람이 시작돼요.'},
] as const;

export function ArtsCenterTutorial({onClose}:{onClose:()=>void}){
  return <section className="guide-dialog tutorial-dialog lake-tutorial arts-center-tutorial" role="dialog" aria-modal="true" aria-labelledby="arts-center-tutorial-title" tabIndex={-1} autoFocus onKeyDown={event=>event.stopPropagation()} onKeyUp={event=>event.stopPropagation()}>
    <header>
      <span>👑</span>
      <div><small>인공지능 동행자 충녕이 · 공연 관람 안내</small><h2 id="arts-center-tutorial-title">세종예술의전당에 잘 왔어!</h2></div>
      <b>GUIDE</b>
    </header>
    <p className="lake-tutorial-description">포스터에서 보고 싶은 공연을 고른 다음, 공연장 객석에 앉아 영상을 감상하면 돼. 내가 순서대로 알려줄게!</p>
    <div className="lake-tutorial-actions">{guideSteps.map(step=><article key={step.title}><kbd>{step.icon}</kbd><strong>{step.title}</strong><small>{step.copy}</small></article>)}</div>
    <p className="lake-tutorial-hint"><span>충녕이의 팁</span>관람을 마치면 화면 아래의 <b>내리기</b> 버튼이나 E 키를 누르면 자리에서 일어날 수 있어.</p>
    <footer className="guide-dialog-actions"><button type="button" className="guide-dialog-primary" onClick={onClose}>알겠어, 공연을 골라볼게!</button></footer>
  </section>;
}
