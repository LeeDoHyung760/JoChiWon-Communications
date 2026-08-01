import {
  useEffect,
  useRef,
  useState,
} from 'react'
import { Eye,EyeOff,MessageCircle,MessageCircleOff } from 'lucide-react'

import { assetManifest } from '../data/assetManifest'
import { CharacterPreview } from '../components/CharacterPreview'
import { ThreeCharacterPreview } from '../components/ThreeCharacterPreview'
import { CharacterDesignStep } from './CharacterDesignStep'
import { buildExperienceRecommendationProfile } from '../services/experienceRecommendationProfile'

import chungnyeongUrl from '../assets/characters/chungnyeong.glb?url'
import girl1Url from '../assets/characters/girl_metaverse_animated.glb?url'
import boy1Url from '../assets/characters/boy_metaverse.glb?url'
import clothsUrl from '../assets/characters/men_total.glb?url'
import womenUrl from '../assets/characters/women_total.glb?url'

import type {
  CharacterModel,
  PartKind,
  UserProfile,
} from '../types'

import './CreateProfilePage.css'

const interestOptions = [
  {id:'축제',emoji:'🎪',copy:'공연과 지역 행사'},
  {id:'자연',emoji:'🌿',copy:'수목원과 산책'},
  {id:'맛집',emoji:'🍽️',copy:'세종의 지역 음식'},
  {id:'카페',emoji:'☕',copy:'카페와 디저트'},
  {id:'공방',emoji:'🎨',copy:'로컬 상점과 체험'},
  {id:'스마트도시',emoji:'🏙️',copy:'미래 도시와 기술'},
];
const residenceOptions = [
  '세종특별자치시',
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
  '경기도',
  '강원특별자치도',
  '충청북도',
  '충청남도',
  '전북특별자치도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도',
  '해외',
];
const sejongVisitOptions = ['처음이에요', '1~2번 방문', '여러 번 방문', '세종에 살고 있어요'];
const mbtiOptions = ['', 'ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP', 'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'];
const journeySteps = [
  {number:'하나',emoji:'🌱',title:'관심 주제로 시작해요',copy:'첫 공간과 이야깃거리를 안내하는 가벼운 출발점이에요'},
  {number:'둘',emoji:'📷',title:'체험하며 기록을 쌓아요',copy:'저장한 콘텐츠와 식물·곰 관찰이 나다운 취향이 돼요'},
  {number:'셋',emoji:'💬',title:'이웃과 계속 이어져요',copy:'닮은 기록으로 만나 대화하고 실제 세종 장소를 추천받아요'},
];
const interestPlaceMap:Record<string,string[]>={
  축제:['문화시설'],자연:['공원'],맛집:['음식점'],카페:['카페'],공방:['문화시설'],스마트도시:['관광명소'],
};
const modelOptions: Array<{id: CharacterModel; label: string; description: string}> = [
  {id: 'girl1', label: 'girl1', description: '3D 여성형 모델'},
  {id: 'boy1', label: 'boy1', description: '3D 남성형 모델'},
  {id: 'women', label: '여성형 2', description: '신규 3D 여성형 모델'},
  {id: 'cloths', label: '남성형 2', description: '확장형 3D 남성 모델'}
];

const modelUrls: Record<Exclude<CharacterModel, 'custom'>, string> = {
  chungnyeong: chungnyeongUrl,
  girl1: girl1Url,
  boy1: boy1Url,
  cloths: clothsUrl,
  women: womenUrl
};

function normalizeCharacterForModel(model:CharacterModel,character:UserProfile['character']):UserProfile['character']{
  const legacyGarmentStyle=character?.outfitStyle==='outfit2'?'style2':'style1';
  const safeCharacter={
    hair:character?.hair||'hair-brown',
    hairStyle:(character?.hairStyle==='hair2'?'hair2':'hair1') as 'hair1'|'hair2',
    topStyle:character?.topStyle??legacyGarmentStyle,
    bottomStyle:character?.bottomStyle??legacyGarmentStyle,
    shoesStyle:character?.shoesStyle??legacyGarmentStyle,
    face:character?.face||'face-smile',
    top:character?.top||'top-green',
    topLayer:character?.topLayer==='topLayer-original'?'top-layer-original':character?.topLayer||'top-layer-original',
    bottom:character?.bottom||'bottom-navy',
    shoes:character?.shoes||'shoes-black',
    accessory:character?.accessory||'accessory-none',
  };
  if(model==='cloths')return {
    ...safeCharacter,
    hair:safeCharacter.hair.endsWith('-none')?'hair-original':safeCharacter.hair,
    face:safeCharacter.face.endsWith('-none')?'face-original':safeCharacter.face,
    top:safeCharacter.top.endsWith('-none')?'top-original':safeCharacter.top,
    bottom:safeCharacter.bottom.endsWith('-none')?'bottom-original':safeCharacter.bottom,
    shoes:safeCharacter.shoes.endsWith('-none')?'shoes-original':safeCharacter.shoes,
    accessory:safeCharacter.accessory?.endsWith('-none')?'accessory-original':safeCharacter.accessory,
  };
  if(model==='women')return {
    ...safeCharacter,
    hair:safeCharacter.hair.endsWith('-none')?'hair-original':safeCharacter.hair,
    face:safeCharacter.face.endsWith('-none')?'face-original':safeCharacter.face,
    top:safeCharacter.top.endsWith('-none')?'top-original':safeCharacter.top,
    topLayer:safeCharacter.topLayer.endsWith('-none')?'top-layer-original':safeCharacter.topLayer,
    bottom:safeCharacter.bottom.endsWith('-none')?'bottom-original':safeCharacter.bottom,
    shoes:safeCharacter.shoes.endsWith('-none')?'shoes-original':safeCharacter.shoes,
    accessory:'accessory-none',
  };
  if(model==='girl1'){
    const legacyDefaults=safeCharacter.hair==='hair-brown'&&safeCharacter.face==='face-smile'&&safeCharacter.top==='top-green'&&safeCharacter.bottom==='bottom-navy'&&safeCharacter.shoes==='shoes-black';
    return {
      ...safeCharacter,
      hair:legacyDefaults||safeCharacter.hair.endsWith('-none')?'hair-original':safeCharacter.hair,
      face:legacyDefaults||safeCharacter.face.endsWith('-none')?'face-original':safeCharacter.face,
      top:legacyDefaults||safeCharacter.top.endsWith('-none')?'top-original':safeCharacter.top,
      bottom:legacyDefaults||safeCharacter.bottom.endsWith('-none')?'bottom-original':safeCharacter.bottom,
      shoes:legacyDefaults||safeCharacter.shoes.endsWith('-none')?'shoes-original':safeCharacter.shoes,
    };
  }
  if(model==='boy1'){
    const legacyDefaults=safeCharacter.hair==='hair-brown'&&safeCharacter.face==='face-smile'&&safeCharacter.top==='top-green'&&safeCharacter.bottom==='bottom-navy'&&safeCharacter.shoes==='shoes-black';
    return {
      ...safeCharacter,
      hair:legacyDefaults||safeCharacter.hair.endsWith('-none')?'hair-original':safeCharacter.hair,
      face:legacyDefaults||safeCharacter.face.endsWith('-none')?'face-original':safeCharacter.face,
      top:legacyDefaults||safeCharacter.top.endsWith('-none')?'top-original':safeCharacter.top,
      topLayer:legacyDefaults||safeCharacter.topLayer.endsWith('-none')?'top-layer-original':safeCharacter.topLayer,
      bottom:legacyDefaults||safeCharacter.bottom.endsWith('-none')?'bottom-original':safeCharacter.bottom,
      shoes:legacyDefaults||safeCharacter.shoes.endsWith('-none')?'shoes-original':safeCharacter.shoes,
      accessory:legacyDefaults||safeCharacter.accessory?.endsWith('-none')?'accessory-original':safeCharacter.accessory,
    };
  }
  return {
    ...safeCharacter,
    hair:safeCharacter.hair.endsWith('-none')?'hair-brown':safeCharacter.hair,
    top:safeCharacter.top.endsWith('-none')?'top-green':safeCharacter.top,
    bottom:safeCharacter.bottom.endsWith('-none')?'bottom-navy':safeCharacter.bottom,
    shoes:safeCharacter.shoes.endsWith('-none')?'shoes-black':safeCharacter.shoes,
  };
}

function profileForSave(profile:UserProfile):UserProfile{
  return {
    ...profile,
    preferredPlaceCategories:[...new Set(profile.interests.flatMap(interest=>interestPlaceMap[interest]??[]))],
    recordVisibility:profile.recordVisibility??'public',
    chatEnabled:profile.chatEnabled??true,
  };
}

export function CreateProfilePage({initial,initialStep=1,editMode=false,cancelLabel='메인 이동',onCancel,onLogout,onWithdraw,onProgress,onComplete}: {initial:UserProfile;initialStep?:1|2;editMode?:boolean;cancelLabel?:string;onCancel?:()=>void;onLogout?:()=>void;onWithdraw?:()=>void;onProgress?:(step:1|2,p:UserProfile)=>void;onComplete:(p:UserProfile)=>void}) {
  const [p, setP] = useState<UserProfile>(() => {
    const model=initial.model === 'chungnyeong'||initial.model === 'custom'?'girl1':initial.model;
    return {...initial,model,character:normalizeCharacterForModel(model,initial.character)};
  });
  const [step, setStep] = useState<1|2>(initialStep);
  const onProgressRef=useRef(onProgress);
  useEffect(()=>{onProgressRef.current=onProgress},[onProgress]);
  useEffect(()=>onProgressRef.current?.(step,profileForSave(p)),[step,p]);

  const toggle = (key: 'interests', value: string, max = 3) => {
    setP({...p, [key]: p[key].includes(value) ? p[key].filter(item => item !== value) : p[key].length < max ? [...p[key], value] : p[key]});
  };

  const part = (k: PartKind, id: string) => setP(current=>({...current, character: {...current.character, [k]: id}}));
  const selectHairStyle = (hairStyle:'hair1'|'hair2') => setP(current=>({...current,character:{...current.character,hairStyle}}));
  const selectGarmentStyle = (kind:'topStyle'|'bottomStyle'|'shoesStyle',style:'style1'|'style2') => setP(current=>({...current,character:{...current.character,[kind]:style}}));
  const selectModel = (model: CharacterModel) => setP(current=>({
    ...current,
    model,
    character:model==='cloths'
      ?{...current.character,hair:'hair-original',hairStyle:'hair1',topStyle:'style1',bottomStyle:'style1',shoesStyle:'style1',face:'face-original',top:'top-original',topLayer:'top-layer-original',bottom:'bottom-original',shoes:'shoes-original',accessory:'accessory-none'}
      :model==='women'
        ?{...current.character,hair:'hair-original',hairStyle:'hair1',topStyle:'style1',bottomStyle:'style1',shoesStyle:'style1',face:'face-original',top:'top-original',topLayer:'top-layer-original',bottom:'bottom-original',shoes:'shoes-original',accessory:'accessory-none'}
      :model==='girl1'&&current.model!=='girl1'
        ?{...current.character,hair:'hair-original',face:'face-original',top:'top-original',bottom:'bottom-original',shoes:'shoes-original',accessory:'accessory-none'}
      :model==='boy1'&&current.model!=='boy1'
        ?{...current.character,hair:'hair-original',face:'face-original',top:'top-original',topLayer:'top-layer-original',bottom:'bottom-original',shoes:'shoes-original',accessory:'accessory-original'}
      :normalizeCharacterForModel(model,current.character)
  }));
  const activeModel = modelOptions.find(option => option.id === p.model) ?? modelOptions[0];

  if (step === 2) {
    return (
      <CharacterDesignStep
        model={p.model}
        character={p.character}
        part={part}
        selectHairStyle={selectHairStyle}
        selectGarmentStyle={selectGarmentStyle}
        selectModel={selectModel}
        onSubmit={() => onComplete(profileForSave(p))}
        editMode={editMode}
        onBack={() => setStep(1)}
        onHome={!editMode?onCancel:undefined}
      />
    );
  }

  const canContinue=p.nickname.trim().length>=2&&Boolean(p.residence)&&Boolean(p.sejongVisitExperience);
  const experienceRecordCount=buildExperienceRecommendationProfile(p).experienceRecords.length;
  return (
    <main className={`profile-design-page ${editMode?'is-edit-mode':''}`}>
      <section className="profile-design-card">
        {!editMode&&onCancel&&<button type="button" className="onboarding-home-button" onClick={onCancel}>홈으로</button>}
        <header className="profile-design-heading">
          <span className="profile-design-sparkle" aria-hidden="true">✧</span>
          <div><h1>{editMode?'회원 정보 변경':'세종에서 만날 나를 소개해 주세요'}</h1><p>{editMode?'프로필 정보를 확인하고 변경해보세요':'간단한 기본 정보를 알려주시면 세종에서의 만남과 체험을 더 편하게 시작할 수 있어요.'}</p></div>
          {editMode?<div className="profile-design-header-actions"><button type="button" className="profile-design-withdraw" onClick={()=>{if(window.confirm('세종한바퀴에서 탈퇴할까요? 저장된 프로필과 체험 기록이 삭제됩니다.'))onWithdraw?.()}}>탈퇴</button><button type="button" className="profile-design-logout" onClick={onLogout}>로그아웃</button><button type="button" className="profile-design-close" onClick={onCancel}>{cancelLabel}</button></div>:<span className="profile-design-step">캐릭터 설정 · 1/2</span>}
        </header>

        <div className="profile-design-content">
          <aside className="profile-design-preview">
            <div className="profile-design-aura" />
            <div className="profile-design-viewer">
              {activeModel.id === 'custom'
                ?<CharacterPreview parts={p.character}/>
                :<ThreeCharacterPreview
                  src={modelUrls[activeModel.id]}
                  model={activeModel.id}
                  parts={p.character}
                  animationName={activeModel.id==='women'?'standing':null}
                  animationTime={activeModel.id==='women'?0:undefined}
                />}
            </div>
            <div className="profile-design-summary">
              <strong>{p.nickname || '새로운 이웃'}</strong>
              <small>나의 관심 주제</small>
              <div>{p.interests.length?p.interests.map(interest=><span key={interest}>#{interest}</span>):<span>관심 주제를 골라주세요</span>}</div>
              <p><b>체험 기록 {experienceRecordCount}개</b>{experienceRecordCount===0&&<> · 호수공원에서 첫 기록을 만들어보세요</>}</p>
            </div>
          </aside>

          <div className="profile-design-form">
            <p className="profile-design-notice">입력한 기본 정보는 세종에서의 만남과 체험을 편리하게 안내하는 데 활용돼요. MBTI는 선택 사항이며, 모든 정보는 회원 정보에서 언제든 변경할 수 있어요.</p>
            <label className="profile-nickname-field">닉네임 <small>다른 이웃에게 보여요</small><input maxLength={10} value={p.nickname} onChange={e=>setP({...p,nickname:e.target.value})} placeholder="2~10자로 입력해주세요" /></label>

            <div className="profile-basic-fields">
              <label>거주지역 <small>필수</small><select value={p.residence??''} onChange={e=>setP({...p,residence:e.target.value})}><option value="">거주지역을 선택해 주세요</option>{residenceOptions.map(option=><option key={option}>{option}</option>)}</select></label>
              <label>세종 방문 경험 <small>필수</small><select value={p.sejongVisitExperience??''} onChange={e=>setP({...p,sejongVisitExperience:e.target.value})}><option value="">방문 경험을 선택해 주세요</option>{sejongVisitOptions.map(option=><option key={option}>{option}</option>)}</select></label>
              <label>MBTI <small>선택</small><select value={p.mbti} onChange={e=>setP({...p,mbti:e.target.value})}>{mbtiOptions.map(option=><option key={option||'none'} value={option}>{option||'선택하지 않음'}</option>)}</select></label>
            </div>

            <fieldset className="profile-choice-fieldset profile-privacy-fieldset">
              <legend>공개 및 대화 설정 <small>언제든 변경 가능</small></legend>
              <div className="profile-privacy-grid">
                <div>
                  <small>탐험 기록</small>
                  <button type="button" aria-pressed={(p.recordVisibility??'public')==='public'} className={(p.recordVisibility??'public')==='public'?'selected':''} onClick={()=>setP({...p,recordVisibility:'public'})}><Eye size={16}/> 공개</button>
                  <button type="button" aria-pressed={p.recordVisibility==='private'} className={p.recordVisibility==='private'?'selected':''} onClick={()=>setP({...p,recordVisibility:'private'})}><EyeOff size={16}/> 나만 보기</button>
                </div>
                <div>
                  <small>채팅 상태</small>
                  <button type="button" aria-pressed={p.chatEnabled??true} className={(p.chatEnabled??true)?'selected':''} onClick={()=>setP({...p,chatEnabled:true})}><MessageCircle size={16}/> 대화 가능</button>
                  <button type="button" aria-pressed={p.chatEnabled===false} className={p.chatEnabled===false?'selected':''} onClick={()=>setP({...p,chatEnabled:false})}><MessageCircleOff size={16}/> 잠시 쉬기</button>
                </div>
              </div>
            </fieldset>
          </div>
        </div>

        <footer className="profile-design-actions"><span>{editMode?'변경 내용은 완료 버튼을 누르면 저장돼요':'다음 단계에서 메타버스 캐릭터를 선택해요'}</span><button type="button" disabled={!canContinue} onClick={()=>setStep(2)}>{editMode?'캐릭터 설정 확인':'캐릭터 선택하기'} <b>→</b></button></footer>
      </section>
    </main>
  );
}
