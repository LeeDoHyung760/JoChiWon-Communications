import { ArrowLeft, MapPin, Sparkles, Users } from 'lucide-react';
import './LoginPage.css';

export function LoginPage({onLogin,onBack}:{onLogin:()=>void;onBack:()=>void}){
  return <main className="login-design-page">
    <section className="login-design-card">
      <header className="login-design-header">
        <button type="button" onClick={onBack}><ArrowLeft size={17}/> 돌아가기</button>
        <span>여기 사람 있음 · LOGIN</span>
      </header>

      <div className="login-design-content">
        <section className="login-design-intro">
          <span className="login-design-kicker"><Sparkles size={17}/> 반가워요, 이웃님!</span>
          <h1>우리 동네에서<br/><em>새로운 인연</em>을 만나요.</h1>
          <p>가까운 이웃과 취미를 나누고<br/>조치원의 다양한 공간을 함께 둘러보세요.</p>
          <div className="login-design-scene" aria-hidden="true">
            <div className="login-design-aura"/>
            <span className="login-design-character character-left">👧🏻</span>
            <span className="login-design-character character-center">🧑🏻‍🌾</span>
            <span className="login-design-character character-right">👦🏻</span>
            <span className="login-design-bubble"><MapPin size={14} fill="currentColor"/> 조치원에서 만나요!</span>
          </div>
          <div className="login-design-status"><Users size={17}/><strong>지금 42명의 이웃이 함께하고 있어요</strong></div>
        </section>

        <section className="login-design-form">
          <div className="login-design-logo">🧑🏻‍🌾</div>
          <span className="login-design-eyebrow">WELCOME</span>
          <h2>여기 사람 있음</h2>
          <p>로그인하고 조치원 멀티버스에 입장해보세요.</p>
          <button type="button" className="login-design-kakao" onClick={onLogin}><b>●</b><span>카카오로 3초 만에 시작하기</span></button>
          <div className="login-design-divider"><span/>또는<span/></div>
          <button type="button" className="login-design-guest" onClick={onLogin}>게스트로 둘러보기 <b>→</b></button>
          <small>계속하면 서비스 이용약관과 개인정보 처리방침에 동의한 것으로 간주합니다.</small>
        </section>
      </div>
    </section>
  </main>;
}
