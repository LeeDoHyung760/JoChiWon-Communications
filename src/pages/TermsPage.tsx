import { useState } from 'react';
import { ArrowLeft, Check, MapPin, ShieldCheck } from 'lucide-react';
import './TermsPage.css';

export function TermsPage({onBack,onComplete}:{onBack:()=>void;onComplete:()=>void}){
  const [service,setService]=useState(false);
  const [location,setLocation]=useState(false);
  const [marketing,setMarketing]=useState(false);
  const all=service&&location&&marketing;
  const toggleAll=()=>{const next=!all;setService(next);setLocation(next);setMarketing(next)};
  return <main className="terms-page">
    <section className="terms-card">
      <header className="terms-top"><button type="button" onClick={onBack}><ArrowLeft size={17}/> 돌아가기</button><span>가입 단계 · 1/4</span></header>
      <div className="terms-content">
        <span className="terms-icon"><ShieldCheck size={32}/></span>
        <small>WELCOME TO JOCHIWON</small>
        <h1>조치원 이웃이 되기 전에<br/>약속을 확인해주세요.</h1>
        <p>안전하고 편안한 동네 연결을 위해 필요한 항목이에요.</p>
        <button type="button" className={`terms-all ${all?'checked':''}`} onClick={toggleAll}><i>{all&&<Check size={16}/>}</i><span><strong>모두 동의하기</strong><small>필수 및 선택 항목을 모두 확인했어요</small></span></button>
        <div className="terms-list">
          <label><input type="checkbox" checked={service} onChange={e=>setService(e.target.checked)}/><i>{service&&<Check size={13}/>}</i><span><strong>[필수] 서비스 이용약관 및 개인정보 처리 동의</strong><small>서비스 운영과 계정 관리를 위해 사용해요</small></span><button type="button" aria-label="내용 보기">›</button></label>
          <label><input type="checkbox" checked={location} onChange={e=>setLocation(e.target.checked)}/><i>{location&&<Check size={13}/>}</i><span><strong><MapPin size={14}/> [필수] 위치기반 서비스 이용 동의</strong><small>가까운 동네와 이웃을 연결하기 위해 사용해요</small></span><button type="button" aria-label="내용 보기">›</button></label>
          <label><input type="checkbox" checked={marketing} onChange={e=>setMarketing(e.target.checked)}/><i>{marketing&&<Check size={13}/>}</i><span><strong>[선택] 동네 소식 및 모임 알림 수신</strong><small>관심 있을 만한 새로운 소식을 알려드려요</small></span><button type="button" aria-label="내용 보기">›</button></label>
        </div>
        <button type="button" className="terms-next" disabled={!service||!location} onClick={onComplete}>동의하고 프로필 만들기 <span>→</span></button>
      </div>
    </section>
  </main>;
}
