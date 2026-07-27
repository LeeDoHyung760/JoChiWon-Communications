import { useState } from 'react';
import { ArrowLeft, Check, Eye, LockKeyhole, MessageCircle, ShieldCheck } from 'lucide-react';
import './TermsPage.css';

export function TermsPage({onBack,onComplete}:{onBack:()=>void;onComplete:()=>void}){
  const [service,setService]=useState(false);
  const [privacy,setPrivacy]=useState(false);
  const [marketing,setMarketing]=useState(false);
  const all=service&&privacy&&marketing;
  const toggleAll=()=>{const next=!all;setService(next);setPrivacy(next);setMarketing(next)};
  return <main className="terms-page">
    <section className="terms-card">
      <header className="terms-top"><button type="button" onClick={onBack}><ArrowLeft size={17}/> 돌아가기</button><span>가입 단계 · 1/3</span></header>
      <div className="terms-content terms-content-wide">
        <section className="terms-intro">
          <span className="terms-icon"><ShieldCheck size={36}/></span>
          <small>세종한바퀴 가입 안내</small>
          <h1>세종 여정을 시작하기 전에<br/>약속을 확인해주세요.</h1>
          <p>취향과 탐험 기록을 안전하게 남기고, 서로 배려하며 대화하기 위한 기본 약속이에요.</p>
          <div className="terms-promise-list">
            <article><span><Eye size={20}/></span><div><strong>내 기록은 내가 정해요</strong><p>탐험 기록의 공개 여부를 가입 후 언제든 바꿀 수 있어요.</p></div></article>
            <article><span><MessageCircle size={20}/></span><div><strong>대화는 서로 동의한 뒤 시작해요</strong><p>수목원과 공동캠퍼스에서 요청을 수락한 경우에만 대화가 열려요.</p></div></article>
            <article><span><LockKeyhole size={20}/></span><div><strong>개인정보는 필요한 만큼만 사용해요</strong><p>계정 관리와 취향·탐험 기록 저장에 필요한 정보만 안전하게 다뤄요.</p></div></article>
          </div>
        </section>
        <section className="terms-agreement-panel">
          <div className="terms-agreement-heading"><span>가입 약속</span><h2>함께 지킬 약속을 확인해 주세요.</h2><p>필수 약관만 동의하면 시작할 수 있으며, 소식 알림은 선택할 수 있어요.</p></div>
          <button type="button" className={`terms-all ${all?'checked':''}`} onClick={toggleAll}><i>{all&&<Check size={16}/>}</i><span><strong>모두 동의하기</strong><small>필수 및 선택 항목을 한 번에 선택해요</small></span></button>
          <div className="terms-list">
            <label><input type="checkbox" checked={service} onChange={e=>setService(e.target.checked)}/><i>{service&&<Check size={13}/>}</i><span><strong>[필수] 서비스 이용약관 동의</strong><small>세종한바퀴의 이용 기준과 기본 운영 원칙을 확인해요</small></span><button type="button" aria-label="내용 보기">›</button></label>
            <label><input type="checkbox" checked={privacy} onChange={e=>setPrivacy(e.target.checked)}/><i>{privacy&&<Check size={13}/>}</i><span><strong><LockKeyhole size={14}/> [필수] 개인정보 처리 동의</strong><small>계정 관리와 취향·탐험 기록 저장에 필요한 정보만 사용해요</small></span><button type="button" aria-label="내용 보기">›</button></label>
            <label><input type="checkbox" checked={marketing} onChange={e=>setMarketing(e.target.checked)}/><i>{marketing&&<Check size={13}/>}</i><span><strong>[선택] 세종 소식 및 체험 알림 수신</strong><small>관심사와 관련된 축제와 새로운 체험 소식을 알려드려요</small></span><button type="button" aria-label="내용 보기">›</button></label>
          </div>
          <button type="button" className="terms-next" disabled={!service||!privacy} onClick={onComplete}>동의하고 내 기록 만들기 <span>→</span></button>
        </section>
      </div>
    </section>
  </main>;
}
