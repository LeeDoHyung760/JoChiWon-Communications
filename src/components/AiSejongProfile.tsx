import { Sparkles,X } from 'lucide-react';
import type { UserProfile } from '../types';
import { CharacterPreview } from './CharacterPreview';
import { buildAiSejongProfile } from '../services/aiSejongProfile';
import './AiSejongProfile.css';

export function AiSejongProfile({profile,onClose,onEdit}:{profile:UserProfile;onClose:()=>void;onEdit:()=>void}){
  const result=buildAiSejongProfile(profile);
  return <div className="ai-sejong-profile-overlay" role="dialog" aria-modal="true" aria-labelledby="ai-sejong-profile-title">
    <section className="ai-sejong-profile">
      <button type="button" className="ai-sejong-close" onClick={onClose} aria-label="내 프로필 닫기"><X size={18}/></button>
      <header>
        <div className="ai-sejong-identity"><CharacterPreview parts={profile.character} small/><div><small>체험할수록 성장하는</small><h2 id="ai-sejong-profile-title">내 프로필</h2><p>{result.nickname}</p></div></div>
        <div className="ai-sejong-completion"><strong>{result.completion}<small>%</small></strong><span>완성도</span></div>
      </header>
      <div className="ai-sejong-progress"><i style={{width:`${result.completion}%`}}/></div>
      <div className="ai-sejong-grid">
        <article className={result.dominantEmotion?'complete':''}><small>수목원에서 발견</small><span>{result.dominantEmotion?'🌿':'○'}</span><h3>대표 감정</h3><b>{result.dominantEmotion??'아직 비어 있어요'}</b>{result.emotionCounts.length>0&&<p>{result.emotionCounts.slice(0,3).map(item=>`${item.label} ${item.count}회`).join(' · ')}</p>}</article>
        <article className={result.representativePlant?'complete':''}><small>수목원에서 발견</small><span>{result.representativePlant?'🌸':'○'}</span><h3>대표 식물</h3><b>{result.representativePlant?.name??'아직 비어 있어요'}</b><p>{result.representativePlant?.description??'식물을 관찰하면 대표 식물이 생겨요.'}</p></article>
        <article className={result.decisionProfile?'complete':''}><small>AI 탐험 연구소에서 발견</small><span>{result.decisionProfile?'⚖️':'○'}</span><h3>의사결정 유형</h3><b>{result.decisionProfile?.title??'아직 비어 있어요'}</b><p>{result.decisionProfile?`${result.decisionProfile.criteria} · ${result.decisionProfile.response}`:'두 곰의 환경을 설계하면 판단 기준이 보여요.'}</p>{result.decisionProfile&&<p>{result.decisionProfile.description}</p>}</article>
        <article className={result.interests.length?'complete':''}><small>세종호수공원에서 발견</small><span>{result.interests.length?'✨':'○'}</span><h3>관심사</h3>{result.interests.length?<div className="ai-sejong-tags">{result.interests.map(item=><em key={item.label}>{item.emoji} {item.label}</em>)}</div>:<b>아직 비어 있어요</b>}</article>
      </div>
      <section className="ai-sejong-analysis"><Sparkles size={19}/><div><small>AI 한줄 분석</small><p>{result.oneLineAnalysis}</p></div></section>
      <section className={`ai-sejong-course ${result.recommendedCourse.length?'complete':''}`}>
        <header><div><small>정부청사에서 활용</small><h3>당신에게 추천하는 세종 코스</h3></div><span>🗺️</span></header>
        {result.recommendedCourse.length?<ul>{result.recommendedCourse.map(item=><li key={item}>✓ {item}</li>)}</ul>:<p>관심사·감정·의사결정 기준 중 세 가지를 발견하면 맞춤 코스가 완성됩니다.</p>}
      </section>
      <footer><p>이 프로필은 공동캠퍼스의 비슷한 이웃 추천과 정부청사의 맞춤 코스에 계속 활용됩니다.</p><button type="button" onClick={onEdit}>기본 프로필 편집</button></footer>
    </section>
  </div>;
}
