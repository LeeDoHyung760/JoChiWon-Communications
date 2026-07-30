export const LAKE_WELCOME_SEEN_KEY='sejong-lake-tutorial-hidden-v1';

export function LakeParkTutorial({onClose}:{onClose:()=>void}){
  const finish=()=>{
    localStorage.setItem(LAKE_WELCOME_SEEN_KEY,'true');
    onClose();
  };

  return <section className="lake-welcome-bubble" role="dialog" aria-modal="true" aria-labelledby="lake-welcome-title" tabIndex={-1} autoFocus onKeyDown={event=>event.stopPropagation()} onKeyUp={event=>event.stopPropagation()}>
    <div className="lake-welcome-speaker">
      <span>👑</span>
      <div><small>세종 안내자</small><b>충녕이</b></div>
    </div>
    <p id="lake-welcome-title">
      <strong>세종에 온 걸 환영해.</strong>
      <strong>여기서는 정답을 고를 필요 없어.</strong>
      <strong>네가 직접 선택하는 모든 행동이 너의 세종 프로필이 될 거야.</strong>
    </p>
    <button type="button" onClick={finish}>알겠어</button>
  </section>;
}
