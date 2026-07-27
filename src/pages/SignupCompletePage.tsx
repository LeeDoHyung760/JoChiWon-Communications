import { Check,MapPin,Sparkles } from 'lucide-react';
import type { UserProfile } from '../types';
import './TermsPage.css';

export function SignupCompletePage({profile,onEnter}:{profile:UserProfile;onEnter:()=>void}){
  return <main className="terms-page"><section className="terms-card signup-complete-card"><div className="signup-complete-content">
    <div className="signup-complete-symbol"><Check size={40}/><Sparkles size={22}/></div>
    <small>세종에서 만날 준비 완료</small>
    <h1><em>{profile.nickname}</em>님,<br/>이제 첫 기록을 만들어요.</h1>
    <p>관심 주제는 출발을 돕는 단서예요. 직접 보고 고르고 남긴 기록부터<br/>나와 닮은 이웃과 실제 세종 장소가 더욱 또렷하게 이어집니다.</p>
    <div className="signup-profile-tags">
      <strong>나의 관심 주제</strong>
      <div>{profile.interests.map(interest=><span key={interest}>#{interest}</span>)}</div>
    </div>
    <div className="signup-complete-flow" aria-label="세종한바퀴 경험 흐름">
      <article><span>01</span><b>공간을 둘러봐요</b><small>세종의 축제와 장소를 자유롭게 발견해요</small></article>
      <article><span>02</span><b>나의 기록을 남겨요</b><small>마음에 든 콘텐츠와 체험을 저장해요</small></article>
      <article><span>03</span><b>이웃과 장소로 이어져요</b><small>닮은 기록으로 대화하고 방문을 계획해요</small></article>
    </div>
    <div className="signup-complete-place"><MapPin size={24}/><span><strong>첫 기록을 만들 장소</strong><small>세종호수공원 · 축제, 공연, 먹거리와 지역 콘텐츠를 둘러봐요</small></span><b>첫 번째 공간</b></div>
    <button type="button" className="terms-next" onClick={onEnter}>호수공원으로 출발하기 <span>→</span></button>
  </div></section></main>;
}
