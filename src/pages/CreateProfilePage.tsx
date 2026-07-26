import '@google/model-viewer'
import React, {
  useEffect,
  useRef,
  useState,
} from 'react'

import { assetManifest } from '../data/assetManifest'
import { CharacterPreview } from '../components/CharacterPreview'
import { CharacterDesignStep } from './CharacterDesignStep'

import chungnyeongUrl from '../assets/characters/chungnyeong.glb?url'
import girl1Url from '../assets/characters/girl1_3.glb?url'
import boy1Url from '../assets/characters/boy1_3.glb?url'

import type {
  CharacterModel,
  PartKind,
  UserProfile,
} from '../types'

import './CreateProfilePage.css'
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

export function CreateProfilePage({initial,initialStep=1,editMode=false,onCancel,onLogout,onProgress,onComplete}: {initial:UserProfile;initialStep?:1|2;editMode?:boolean;onCancel?:()=>void;onLogout?:()=>void;onProgress?:(step:1|2,p:UserProfile)=>void;onComplete:(p:UserProfile)=>void}) {
  const [p, setP] = useState(initial);
  const [step, setStep] = useState<1|2>(initialStep);
  const onProgressRef=useRef(onProgress);
  useEffect(()=>{onProgressRef.current=onProgress},[onProgress]);
  useEffect(()=>onProgressRef.current?.(step,p),[step,p]);

  const toggle = (key: 'interests' | 'usagePurposes' | 'preferredPlaceCategories', value: string, max = 3) => {
    setP({...p, [key]: p[key].includes(value) ? p[key].filter(item => item !== value) : p[key].length < max ? [...p[key], value] : p[key]});
  };

  const part = (k: PartKind, id: string) => setP({...p, character: {...p.character, [k]: id}});
  const selectModel = (model: CharacterModel) => setP({...p, model});
  const activeModel = modelOptions.find(option => option.id === p.model) ?? modelOptions[0];

  if (step === 2) {
    return (
      <CharacterDesignStep
        model={p.model}
        character={p.character}
        part={part}
        selectModel={selectModel}
        onSubmit={() => onComplete(p)}
        editMode={editMode}
        onBack={() => setStep(1)}
      />
    );
  }

  const canContinue=p.nickname.trim().length>=2&&p.interests.length>0&&p.usagePurposes.length>0;
  return (
    <main className="profile-design-page">
      <section className="profile-design-card">
        <header className="profile-design-heading">
          <span className="profile-design-sparkle" aria-hidden="true">✧</span>
          <div><h1>{editMode?'회원 정보 변경':'어떤 이웃인가요?'}</h1><p>{editMode?'프로필과 관심 정보를 확인하고 변경해보세요':'나를 소개하고 잘 맞는 동네 이웃을 만나보세요'}</p></div>
          {editMode?<div className="profile-design-header-actions"><button type="button" className="profile-design-logout" onClick={onLogout}>로그아웃</button><button type="button" className="profile-design-close" onClick={onCancel}>메인 이동</button></div>:<span className="profile-design-step">캐릭터 설정 · 1/2</span>}
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

        <footer className="profile-design-actions"><span>{editMode?'변경 내용은 완료 버튼을 누르면 저장돼요':'프로필을 완성하면 캐릭터를 꾸밀 수 있어요'}</span><button type="button" disabled={!canContinue} onClick={()=>setStep(2)}>{editMode?'캐릭터 설정 확인':'캐릭터 꾸미기'} <b>→</b></button></footer>
      </section>
    </main>
  );
}
