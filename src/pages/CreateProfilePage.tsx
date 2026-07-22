import '@google/model-viewer';
import React, { useState } from 'react';
import { assetManifest } from '../data/assetManifest';
import { CharacterPreview } from '../components/CharacterPreview';
import chungnyeongUrl from '../assets/characters/chungnyeong.glb?url';
import girl1Url from '../assets/characters/girl1_3종.glb?url';
import boy1Url from '../assets/characters/boy1_3종.glb?url';
import type { CharacterModel, PartKind, UserProfile } from '../types';
import './CreateProfilePage.css';

const MODEL_VIEWER_TAG = 'model-viewer';

const interestOptions = ['카페', '맛집', '산책', '사진', '독서', '공연', '스터디', '로컬여행'];
const purposeOptions = ['친구 만들기', '취미 공유', '동네 탐방', '스터디', '가벼운 대화'];
const placeOptions = ['카페', '음식점', '공원', '문화시설', '관광명소'];
const mbtis = ['ENFP', 'INFP', 'ENFJ', 'INFJ', 'ENTP', 'INTP', 'ENTJ', 'INTJ', 'ESFP', 'ISFP', 'ESFJ', 'ISFJ', 'ESTP', 'ISTP', 'ESTJ', 'ISTJ'];
const modelOptions: Array<{id: CharacterModel; label: string; description: string}> = [
  {id: 'chungnyeong', label: '충녕이', description: '3D 캐릭터 모델 선택'},
  {id: 'girl1', label: 'girl1', description: '3D 여성형 모델'},
  {id: 'boy1', label: 'boy1', description: '3D 남성형 모델'},
  {id: 'custom', label: '커스텀', description: '2D 기본 미리보기'}
];

const modelUrls: Record<Exclude<CharacterModel, 'custom'>, string> = {
  chungnyeong: chungnyeongUrl,
  girl1: girl1Url,
  boy1: boy1Url
};

export function CreateProfilePage({initial, onComplete}: {initial: UserProfile; onComplete: (p: UserProfile) => void}) {
  const [p, setP] = useState(initial);
  const [step, setStep] = useState(1);

  const toggle = (key: 'interests' | 'usagePurposes' | 'preferredPlaceCategories', value: string, max = 3) => {
    setP({...p, [key]: p[key].includes(value) ? p[key].filter(item => item !== value) : p[key].length < max ? [...p[key], value] : p[key]});
  };

  const part = (k: PartKind, id: string) => setP({...p, character: {...p.character, [k]: id}});
  const selectModel = (model: CharacterModel) => setP({...p, model});
  const activeModel = modelOptions.find(option => option.id === p.model) ?? modelOptions[0];

  if (step === 2) {
    const modelFaces: Record<CharacterModel, string> = {chungnyeong: '🧑🏻‍🌾', girl1: '👧🏻', boy1: '👦🏻', custom: '＋'};
    const partLabels: Record<PartKind, {label: string; icon: string}> = {
      hair: {label: '머리', icon: '〰'},
      face: {label: '얼굴', icon: '🙂'},
      top: {label: '상의', icon: '👕'},
      bottom: {label: '하의', icon: '👖'}
    };

    return (
      <main className="character-design-page">
        <section className="character-design-card">
          <header className="character-design-heading">
            <span className="character-design-sparkle" aria-hidden="true">✧</span>
            <div>
              <h1>나만의 모습을 골라요</h1>
              <p>캐릭터와 스타일을 선택해보세요</p>
            </div>
          </header>

          <div className="character-design-content">
            <aside className="character-design-preview">
              <div className="character-design-aura" aria-hidden="true" />
              <span className="character-design-decoration decoration-one">✧</span>
              <span className="character-design-decoration decoration-two">◇</span>
              <div className="character-design-viewer">
                {activeModel.id === 'custom' ? (
                  <div className="character-design-custom-preview"><CharacterPreview parts={p.character} /></div>
                ) : React.createElement(MODEL_VIEWER_TAG, {
                  src: modelUrls[activeModel.id],
                  alt: `${activeModel.label} 3D 미리보기`,
                  cameraControls: true,
                  autoRotate: true,
                  autoplay: true,
                  animationName: activeModel.id === 'chungnyeong' ? 'NlaTrack' : 'NlaTrack.001',
                  cameraOrbit: '0deg 78deg auto',
                  interactionPrompt: 'none',
                  shadowIntensity: '1',
                  exposure: '1',
                  style: {width: '100%', height: '100%', background: 'transparent'}
                })}
              </div>
              <div className="character-design-rotate" aria-hidden="true"><span>↪</span><span>↩</span></div>
              <small>드래그해서 캐릭터를 돌려보세요</small>
            </aside>

            <div className="character-design-controls">
              <div className="character-model-picker" aria-label="캐릭터 선택">
                {modelOptions.map(option => (
                  <button type="button" key={option.id} className={p.model === option.id ? 'selected' : ''} onClick={() => selectModel(option.id)}>
                    <span className="character-model-face">{modelFaces[option.id]}</span>
                    <strong>{option.label}</strong>
                    <small>{option.id === 'custom' ? '2D 미리보기' : option.id === 'chungnyeong' ? '3D 캐릭터' : option.id === 'girl1' ? '3D 여성형' : '3D 남성형'}</small>
                  </button>
                ))}
              </div>

              <div className="character-style-list">
                {(['hair', 'face', 'top', 'bottom'] as PartKind[]).map(kind => (
                  <div className="character-style-row" key={kind}>
                    <span className="character-style-name"><i>{partLabels[kind].icon}</i><strong>{partLabels[kind].label}</strong></span>
                    <div className="character-style-options">
                      {assetManifest[kind].map(option => (
                        <button
                          type="button"
                          key={option.id}
                          title={option.label}
                          aria-label={option.label}
                          aria-pressed={p.character[kind] === option.id}
                          className={p.character[kind] === option.id ? 'selected' : ''}
                          style={{'--option-color': option.color} as React.CSSProperties}
                          onClick={() => part(kind, option.id)}
                        >
                          {p.character[kind] === option.id && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <footer className="character-design-actions">
            <button type="button" className="character-design-back" onClick={() => setStep(1)}>이전</button>
            <button type="button" className="character-design-submit" onClick={() => onComplete(p)}>조치원으로 출발하기 <span>→</span></button>
          </footer>
        </section>
      </main>
    );
  }

  const canContinue=p.nickname.trim().length>=2&&p.interests.length>0&&p.usagePurposes.length>0;
  return (
    <main className="profile-design-page">
      <section className="profile-design-card">
        <header className="profile-design-heading">
          <span className="profile-design-sparkle" aria-hidden="true">✧</span>
          <div><h1>어떤 이웃인가요?</h1><p>나를 소개하고 잘 맞는 동네 이웃을 만나보세요</p></div>
          <span className="profile-design-step">캐릭터 만들기 · 1/2</span>
        </header>

        <div className="profile-design-content">
          <aside className="profile-design-preview">
            <div className="profile-design-aura" />
            <div className="profile-design-viewer">
              {activeModel.id === 'custom' ? <CharacterPreview parts={p.character} /> : React.createElement(MODEL_VIEWER_TAG, {
                src:modelUrls[activeModel.id],alt:`${activeModel.label} 3D 미리보기`,cameraControls:true,autoRotate:true,autoplay:true,
                animationName:activeModel.id==='chungnyeong'?'NlaTrack':'NlaTrack.001',cameraOrbit:'0deg 78deg auto',interactionPrompt:'none',shadowIntensity:'1',exposure:'1',
                style:{width:'100%',height:'100%',background:'transparent'}
              })}
            </div>
            <div className="profile-design-summary">
              <strong>{p.nickname || '새로운 이웃'}</strong>
              <span>{p.mbti} · {p.interests.join(' · ') || '관심사를 골라주세요'}</span>
            </div>
          </aside>

          <div className="profile-design-form">
            <p className="profile-design-notice">선택한 관심사와 이용 목적은 잘 맞는 이웃을 연결하기 위한 매칭에 사용돼요. 원치 않는 연결은 언제든 거절할 수 있어요.</p>
            <div className="profile-design-field-grid">
              <label>닉네임<input maxLength={10} value={p.nickname} onChange={e=>setP({...p,nickname:e.target.value})} placeholder="2~10자로 입력해주세요" /></label>
              <label>MBTI<select value={p.mbti} onChange={e=>setP({...p,mbti:e.target.value})}>{mbtis.map(x=><option key={x}>{x}</option>)}</select></label>
            </div>
            <fieldset><legend>관심사 <small>최대 3개</small></legend><div className="profile-design-chips">{interestOptions.map(x=><button type="button" key={x} className={p.interests.includes(x)?'selected':''} onClick={()=>toggle('interests',x)}># {x}</button>)}</div></fieldset>
            <fieldset><legend>이용 목적 <small>매칭을 위해 사용 · 최대 2개</small></legend><div className="profile-design-chips">{purposeOptions.map(x=><button type="button" key={x} className={p.usagePurposes.includes(x)?'selected':''} onClick={()=>toggle('usagePurposes',x,2)}># {x}</button>)}</div></fieldset>
            <fieldset><legend>선호 장소 <small>최대 2개</small></legend><div className="profile-design-chips">{placeOptions.map(x=><button type="button" key={x} className={p.preferredPlaceCategories.includes(x)?'selected':''} onClick={()=>toggle('preferredPlaceCategories',x,2)}># {x}</button>)}</div></fieldset>
          </div>
        </div>

        <footer className="profile-design-actions"><span>프로필을 완성하면 캐릭터를 꾸밀 수 있어요</span><button type="button" disabled={!canContinue} onClick={()=>setStep(2)}>캐릭터 꾸미기 <b>→</b></button></footer>
      </section>
    </main>
  );
}
