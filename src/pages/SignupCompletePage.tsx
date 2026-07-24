import { Check, MapPin, Sparkles } from 'lucide-react';
import type { UserProfile } from '../types';
import './TermsPage.css';

export function SignupCompletePage({profile,onEnter}:{profile:UserProfile;onEnter:()=>void}){
  return <main className="terms-page"><section className="terms-card signup-complete-card"><div className="signup-complete-content">
    <div className="signup-complete-symbol"><Check size={40}/><Sparkles size={22}/></div>
    <small>WELCOME, NEIGHBOR!</small>
    <h1>가입이 완료됐어요,<br/><em>{profile.nickname}</em>님!</h1>
    <p>이제 세종호수공원에서 새로운 이웃과 만나보세요.</p>
    <div className="signup-complete-place"><MapPin size={20}/><span><strong>첫 번째 목적지</strong><small>세종호수공원</small></span></div>
    <button type="button" className="terms-next" onClick={onEnter}>세종 월드로 입장하기 <span>→</span></button>
  </div></section></main>;
}
