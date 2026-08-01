import { useState } from 'react';

export const LAKE_WELCOME_SEEN_KEY='sejong-lake-tutorial-hidden-v2';

export function LakeParkTutorial({onClose}:{onClose:()=>void}){
  const [step,setStep]=useState<0|1>(0);
  const finish=()=>{localStorage.setItem(LAKE_WELCOME_SEEN_KEY,'true');onClose()};

  return <section className="lake-welcome-bubble" role="dialog" aria-modal="true" aria-labelledby="lake-welcome-title" tabIndex={-1} autoFocus onKeyDown={event=>event.stopPropagation()} onKeyUp={event=>event.stopPropagation()}>
    <div className="lake-welcome-speaker"><span>👑</span><div><small>세종 안내자</small><b>충녕이</b></div></div>
    <div className="lake-welcome-copy" id="lake-welcome-title">
      <small>{step+1} / 2 · {step===0?'움직이는 방법':'호수공원 둘러보기'}</small>
      {step===0?<><strong>먼저 움직이는 방법부터 알려줄게!</strong><div className="lake-control-guide"><span><kbd>WASD</kbd><em>이동</em></span><span><kbd>Shift</kbd><em>달리기</em></span><span><kbd>Space</kbd><em>점프</em></span><span><kbd>T · E</kbd><em>대화·입장</em></span></div></>:<><strong>세종호수공원은 자유롭게 둘러보는 시작 공간이야.</strong><p>안내 표지판에서는 전체 지도를 보고, 빛나는 체험존과 포탈에서는 새로운 장소로 이동할 수 있어.</p></>}
    </div>
    <div className="lake-welcome-actions"><button type="button" className="skip" onClick={finish}>건너뛰기</button><button type="button" onClick={()=>step===0?setStep(1):finish()}>{step===0?'다음':'시작하기'}</button></div>
  </section>;
}
