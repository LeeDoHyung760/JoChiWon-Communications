import { lazy,Suspense,useState,type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, Clock3, Gamepad2, Map, MapPin, MessageCircle, Play, Radio, Route, Sparkles, UserPlus, Users, Wifi, X } from 'lucide-react';
import parkMapImage from '../assets/maps/hotspots/jochwon-park-map.jpg';
import lakeMapPreview from '../assets/maps/previews/sejong-lake-park.png';
import bearTreeMapPreview from '../assets/maps/previews/new-beartree.png';
import bearLabMapPreview from '../assets/maps/previews/park-landscape.png';
import gardenMapPreview from '../assets/maps/previews/garden.png';
import campusMapPreview from '../assets/maps/previews/new-campus-floor.png';
import governmentMapPreview from '../assets/maps/previews/sejong-gov.png';
import lakeWorldUrl from '../assets/maps/sejong-lake-park.glb?url';
import bearTreeWorldUrl from '../assets/maps/new-beartree.glb?url';
import bearLabWorldUrl from '../assets/maps/park-landscape.glb?url';
import gardenWorldUrl from '../assets/maps/garden.glb?url';
import campusWorldUrl from '../assets/maps/new-campus-floor.glb?url';
import studentHallWorldUrl from '../assets/maps/student-hall.glb?url';
import studentHallPreview from '../assets/maps/student-hall-preview.png';
import recruitmentCenterWorldUrl from '../assets/maps/recruitment-center.glb?url';
import recruitmentCenterPreview from '../assets/maps/recruitment-center-preview.png';
import governmentWorldUrl from '../assets/maps/sejong-gov.glb?url';
import projectRoomWorldUrl from '../assets/maps/project-room.glb?url';
import projectRoomPreview from '../assets/maps/project-room-preview.png';
import governmentCentralPlazaWorldUrl from '../assets/maps/government-central-plaza.glb?url';
import governmentCentralPlazaPreview from '../assets/maps/government-central-plaza-preview.png';
import observatoryWorldUrl from '../assets/maps/observatory-interior.glb?url';
import observatoryPreview from '../assets/maps/observatory-preview.png';
import sejongSmartCityWorldUrl from '../assets/maps/sejong-smartcity-exhibition.glb?url';
import sejongSmartCityPreview from '../assets/maps/sejong-smartcity-exhibition-preview.png';
import sejongArtsCenterWorldUrl from '../assets/maps/sejong-arts-center.glb?url';
import sejongArtsCenterPreview from '../assets/maps/sejong-arts-center-preview.png';
import festivalExperienceWorldUrl from '../assets/maps/festival-experience-map.glb?url';
import festivalExperiencePreview from '../assets/maps/festival-experience-map-preview.png';
import foodExperienceWorldUrl from '../assets/maps/food-experience-map.glb?url';
import foodExperiencePreview from '../assets/maps/food-experience-map-preview.png';
import clubStreetFestivalWorldUrl from '../assets/maps/club-street-festival-map.glb?url';
import clubStreetFestivalPreview from '../assets/maps/club-street-festival-map-preview.png';
import type { MapId } from '../../shared/socket-events';
import './LandingPage.css';

type LandingPageProps={onStart:()=>void;onEnterWorld:(mapId:MapId)=>void;onLogin:()=>void;onUserClick?:()=>void;actionLabel?:string;userName?:string};
type WorldPlace={name:string;description:string;people:string;image:string;modelUrl:string;modelSize:string;accent:string;emoji:string;points:string[];mapId?:MapId};
const WorldModelPreview=lazy(()=>import('../components/WorldModelPreview').then(module=>({default:module.WorldModelPreview})));

const places:WorldPlace[]=[
  {name:'세종호수공원',description:'축제와 지역 볼거리에서 취향 발견',people:'시작',emoji:'🎪',image:lakeMapPreview,modelUrl:lakeWorldUrl,modelSize:'3.2MB',accent:'#2f72c7',mapId:'town',points:['축제·공연 체험존','지역 먹거리·상점','방문 코스 게시판']},
  {name:'수목원 · 베어트리파크',description:'식물을 발견하고 개인 탐험 기록 생성',people:'기록',emoji:'🌿',image:bearTreeMapPreview,modelUrl:bearTreeWorldUrl,modelSize:'13.9MB',accent:'#299467',mapId:'bear-tree-park',points:['숲길 자연 탐험','곰 생태 관찰','수목원 이동 포털']},
  {name:'공동캠퍼스',description:'비슷한 사람과 만나 동아리·대화 시작',people:'만남',emoji:'🎓',image:campusMapPreview,modelUrl:campusWorldUrl,modelSize:'22.7MB',accent:'#dd7b25',mapId:'campus',points:['학생회관에서 추천 이웃 확인','동아리관·모집센터 참여','프로젝트실 입장과 팀 협업']},
  {name:'정부청사',description:'함께 장소를 고르고 인공지능 방문 코스 완성',people:'계획',emoji:'🗺️',image:governmentMapPreview,modelUrl:governmentWorldUrl,modelSize:'3.9MB',accent:'#8155c3',mapId:'government',points:['도시 테마 전시관','공동 선택 대형 지도','AI 방문 코스']},
];

const guideWorldCatalog:WorldPlace[]=[
  {name:'동아리 거리제',description:'공동캠퍼스 동아리관에서 이어지는 야외 거리제로, 양쪽의 동아리 부스와 중앙 광장을 자유롭게 둘러볼 수 있어요.',people:'동아리 교류',emoji:'🎪',image:clubStreetFestivalPreview,modelUrl:clubStreetFestivalWorldUrl,modelSize:'44MB',accent:'#d47a32',mapId:'club-street-festival',points:['좌우 동아리 홍보·체험 부스 둘러보기','중앙 광장에서 다른 사용자와 교류하기','입구 포털로 공동캠퍼스에 돌아가기']},
  {name:'세종호수공원',description:'세종의 축제와 먹거리, 공연을 체험하며 나의 여행 취향을 발견하는 시작 월드예요.',people:'취향 발견',emoji:'🎪',image:lakeMapPreview,modelUrl:lakeWorldUrl,modelSize:'3.2MB',accent:'#2f72c7',mapId:'town',points:['축제 부스에서 선호 분위기 선택','공연·먹거리 부스에서 여행 스타일 분석','추천 코스 게시판 저장과 반응']},
  {name:'세종예술의전당',description:'세종호수공원의 공연 공간에서 이어지는 별도 실내 공연장으로, 밝은 예술 로비와 어두운 객석·무대를 둘러볼 수 있어요.',people:'공연 문화',emoji:'🎭',image:sejongArtsCenterPreview,modelUrl:sejongArtsCenterWorldUrl,modelSize:'7.1MB',accent:'#a84875',mapId:'arts-center',points:['공연 포스터가 전시된 밝은 예술 로비','객석과 조명이 갖춰진 공연 무대','세종호수공원으로 돌아가는 별도 포털']},
  {name:'축제 부스',description:'세종호수공원의 축제 부스에서 이어지는 야외 축제 공간으로, 공연 무대와 체험 부스, 휴게 공간을 둘러볼 수 있어요.',people:'축제 체험',emoji:'🎪',image:festivalExperiencePreview,modelUrl:festivalExperienceWorldUrl,modelSize:'4.0MB',accent:'#7c4b9d',mapId:'festival-experience',points:['조명과 악기가 설치된 야외 공연 무대','양쪽 체험 부스와 피크닉 테이블','세종호수공원 축제 부스로 돌아가는 포털']},
  {name:'먹거리 부스',description:'세종호수공원의 먹거리 부스에서 이어지는 야외 광장으로, 푸드트럭과 테이블 사이를 걸으며 공간을 둘러볼 수 있어요.',people:'먹거리 체험',emoji:'🍜',image:foodExperiencePreview,modelUrl:foodExperienceWorldUrl,modelSize:'3.3MB',accent:'#d47a32',mapId:'food-experience',points:['서로 다른 메뉴의 푸드트럭 세 대','파라솔 테이블과 수변 휴게 공간','세종호수공원 먹거리 부스로 돌아가는 포털']},
  {name:'베어트리파크',description:'숲길과 곰 생태 공간을 탐색하고 행동 선택을 나만의 자연 여행 기록으로 남겨요.',people:'자연 탐험',emoji:'🐻',image:bearTreeMapPreview,modelUrl:bearTreeWorldUrl,modelSize:'13.9MB',accent:'#299467',mapId:'bear-tree-park',points:['숲길과 곰 생태 공간 탐색','아기곰 포토존과 생태 관찰','수목원으로 이어지는 이동 포털']},
  {name:'AI 탐험 연구소',description:'곰의 흔적을 조사하고 관찰 결과를 모아 자연 탐험 프로필을 완성하는 체험 월드예요.',people:'생태 조사',emoji:'🔎',image:bearLabMapPreview,modelUrl:bearLabWorldUrl,modelSize:'5.8MB',accent:'#bd7b35',mapId:'bear-play-zone',points:['불곰과 반달가슴곰 단서 조사','관찰 미션과 생태 퀴즈 수행','베어트리 자연 체험 기록 완성']},
  {name:'국립세종수목원',description:'온실 속 식물을 직접 찾아 촬영하고 식물도감과 대표 식물을 만드는 기록 월드예요.',people:'식물 기록',emoji:'🌱',image:gardenMapPreview,modelUrl:gardenWorldUrl,modelSize:'8.2MB',accent:'#36a168',mapId:'garden',points:['온실별 대표 식물 발견과 촬영','식물도감·사진·메모 기록','대표 식물 선택과 취향 분석']},
  {name:'공동캠퍼스',description:'현재 캠퍼스 맵을 걸으며 학생회관·동아리관·모집센터를 방문하고 비슷한 이웃과 활동을 시작해요.',people:'이웃 연결',emoji:'🎓',image:campusMapPreview,modelUrl:campusWorldUrl,modelSize:'22.7MB',accent:'#dd7b25',mapId:'campus',points:['학생회관에서 추천 이웃 확인','동아리관 가입과 단체 채팅','모집센터와 프로젝트실 입장']},
  {name:'학생회관',description:'공동캠퍼스에서 만난 이웃과 함께 머물며 대화하고 쉬어 갈 수 있는 단층 커뮤니티 로비예요.',people:'커뮤니티 로비',emoji:'🏛️',image:studentHallPreview,modelUrl:studentHallWorldUrl,modelSize:'2.3MB',accent:'#4b9279',mapId:'student-hall',points:['중앙 원형 소파와 휴게 공간','현재 활동 중인 캠퍼스 이웃 확인','공동캠퍼스로 바로 돌아가는 포털']},
  {name:'모집센터',description:'공동캠퍼스에서 관심사가 맞는 동행과 활동을 찾고, 내 프로필로 참가를 신청하는 모집 공간이에요.',people:'동행 모집',emoji:'📣',image:recruitmentCenterPreview,modelUrl:recruitmentCenterWorldUrl,modelSize:'3.7MB',accent:'#7f8ed8',mapId:'recruitment-center',points:['열린 동행 모집글과 관심 분야 확인','내 프로필로 참가 신청하기','안내 데스크와 키오스크 둘러보기']},
  {name:'정부청사',description:'기존 대화를 유지하며 함께 장소와 조건을 고르고 실제 세종 방문 코스를 완성해요.',people:'방문 계획',emoji:'🗺️',image:governmentMapPreview,modelUrl:governmentWorldUrl,modelSize:'3.9MB',accent:'#8155c3',mapId:'government',points:['도시 테마 전시와 대형 지도 탐색','공통 장소·시간·이동 방법 선택','AI 코스 생성·수정·공동 저장']},
  {name:'세종 스마트시티 국가시범도시',description:'정부청사에서 연결되는 밝은 미래도시 전시관에서 AI, 자율주행, 에너지 서비스를 체험해요.',people:'미래도시 탐험',emoji:'🌐',image:sejongSmartCityPreview,modelUrl:sejongSmartCityWorldUrl,modelSize:'12MB',accent:'#18a8db',mapId:'sejong-smart-city',points:['중앙 스마트시티 미래지도 테이블','AI·자율주행·스마트 에너지 전시 존','정부청사로 돌아가는 이동 포털']},
  {name:'정부청사 중앙광장',description:'행정중심도시의 열린 광장을 걸으며 AI 세종 추천센터와 도시 안내 시설을 둘러보는 공간이에요.',people:'도시 안내',emoji:'🏙️',image:governmentCentralPlazaPreview,modelUrl:governmentCentralPlazaWorldUrl,modelSize:'13MB',accent:'#3979a8',mapId:'government-central-plaza',points:['열린 중앙광장과 행정 상징 공간','AI 세종 추천센터 키오스크','정부청사로 돌아가는 이동 포털']},
  {name:'전망대',description:'곡면 파노라마 창 너머로 세종의 방향을 살펴보고 망원경과 포토존을 체험하는 실내 전망 공간이에요.',people:'전경 감상',emoji:'🔭',image:observatoryPreview,modelUrl:observatoryWorldUrl,modelSize:'10MB',accent:'#1683b8',mapId:'government-observatory',points:['곡면 유리 파노라마 전망 공간','전망 망원경과 중앙 포토 스팟','정부청사로 돌아가는 이동 포털']},
  {name:'프로젝트실',description:'공동캠퍼스에서 만든 팀과 프로젝트를 찾고 추천받아 실제 협업을 시작하는 공간이에요.',people:'팀 협업',emoji:'💡',image:projectRoomPreview,modelUrl:projectRoomWorldUrl,modelSize:'3.6MB',accent:'#566171',mapId:'project-room',points:['모집 프로젝트 게시판 확인','AI 추천 프로젝트와 적합도 확인','키오스크에서 새 프로젝트 생성']},
];

const GUIDE_WORLD_ORDER:MapId[]=[
  'town',
  'arts-center',
  'festival-experience',
  'food-experience',
  'bear-tree-park',
  'bear-play-zone',
  'garden',
  'campus',
  'student-hall',
  'recruitment-center',
  'project-room',
  'club-street-festival',
  'government',
  'sejong-smart-city',
  'government-central-plaza',
  'government-observatory',
];

const guideWorlds:WorldPlace[]=GUIDE_WORLD_ORDER.map(mapId=>{
  const world=guideWorldCatalog.find(place=>place.mapId===mapId);
  if(!world)throw new Error(`공간 안내에 등록되지 않은 맵입니다: ${mapId}`);
  return world;
});

const livingAreas=[
  {number:1,emoji:'🎪',title:'세종에서 나의 취향을 발견해요',names:['세종호수공원'],summary:'세종의 축제·공연·먹거리·지역 상점을 둘러보고 관심 있는 볼거리를 저장해요.',activities:['축제 공간과 공연·특산품·지역 상점 안내 살펴보기','관심 장소 저장과 하고 싶은 활동 선택','시민 방문 코스 게시판에서 ‘나도 가고 싶어요’ 반응'],reward:'축제 관심사 · 선호 활동 · 가고 싶은 장소',role:'전체 여정의 시작점이자 결과가 다시 공유되는 중심 공간',communication:'1대1·단체 대화는 열지 않고 저장과 가벼운 반응만 제공',connection:'관심사가 하나 이상 쌓이면 수목원에서 개인 탐험 기록 만들기를 안내'},
  {number:2,emoji:'🌿',title:'나만의 탐험 기록을 만들어요',names:['국립세종수목원','베어트리파크'],summary:'수목원의 식물과 베어트리파크의 곰·자연을 탐색하며 나만의 생태 탐험 기록을 만들어요.',activities:['수목원에서 식물을 촬영해 도감을 채우고 대표 식물·사진·메모 선택','베어트리파크에서 숲길을 탐색하고 아기곰 관찰·돌봄 공간 경험','식물 발견과 곰 체험을 하나의 자연 탐험 기록으로 정리해 공개'],reward:'식물도감 진행도 · 대표 식물 · 곰 관찰 기록 · 자연 취향',role:'수목원의 식물 수집과 베어트리파크의 동물·숲 체험을 개인 생태 기록으로 전환',communication:'수목원 탐험 쉼터에서는 공개 기록을 본 뒤 서로 수락하면 1대1 대화 가능',connection:'식물도감·곰 관찰 기록·호수공원 관심사를 조합해 공동캠퍼스 사용자와 동아리 추천에 활용'},
  {number:3,emoji:'🎓',title:'비슷한 사람과 관계를 만들어요',names:['공동캠퍼스'],summary:'축제 관심사와 탐험 기록이 비슷한 사람을 만나 대화하고 동아리를 만들어요.',activities:['공통 관심사와 추천 이유가 표시된 사용자 카드 확인','1대1 대화 신청·수락 또는 관심사 동아리 가입','가고 싶은 장소 투표와 정부청사 이동 제안'],reward:'연결된 사용자 · 동아리 · 공동 관심 장소',role:'서비스의 핵심 커뮤니케이션 맵으로 기록을 실제 관계로 연결',communication:'1대1 채팅과 동아리 단체 채팅을 모두 제공',connection:'상대가 이동 제안을 수락하면 같은 정부청사 계획 세션으로 연결'},
  {number:4,emoji:'🗺️',title:'함께 실제 방문을 계획해요',names:['정부청사'],summary:'세종의 도시 주제와 장소를 함께 선택하면 인공지능이 실제 방문 코스를 완성해요.',activities:['대형 지도에서 도시 주제와 공통 장소 1~3곳 선택','방문 시간·이동 방법·식사·카페·체험 여부 조정','인공지능 코스의 장소·순서·시간을 수정하고 공동 저장'],reward:'추천 이유가 포함된 실제 세종 방문 코스',role:'대화를 결정으로 바꾸고 세종의 도시 정체성을 전달하는 마무리 공간',communication:'새로운 사람을 찾지 않고 기존 1대1·동아리 채팅을 유지',connection:'완성된 코스를 호수공원 게시판이나 동아리 채팅에 공유해 새로운 만남 생성'}
];

const townAndMyeon=['취향 발견','개인 기록','관심사 연결','1:1·동아리 대화','인공지능 방문 코스','호수공원 공유'];
const experienceRooms=[
  {name:'하늘여우',emoji:'🦊',stage:'공동캠퍼스',status:'관심사가 78% 비슷해요',members:'대화 가능',interests:['야간축제','수련','카페','사진']},
  {name:'민트곰',emoji:'🐻',stage:'수목원 탐험 쉼터',status:'공통 관심사 3개',members:'기록 공개',interests:['자연','카페','함께 방문']},
  {name:'식물사진 동아리',emoji:'📷',stage:'공동캠퍼스',status:'수목원 사진 산책 이야기 중',members:'8명',interests:['식물도감','사진']},
  {name:'세종 카페 산책부',emoji:'☕',stage:'공동캠퍼스',status:'주말 방문 장소 투표 중',members:'5명',interests:['카페','지역상점']}
];

export function LandingPage({onStart,onEnterWorld,onLogin,onUserClick,actionLabel='세종 월드 입장하기',userName}:LandingPageProps){
  const [view,setView]=useState<'home'|'neighborhoods'|'neighbors'>('home');
  const [selectedChapter,setSelectedChapter]=useState<(typeof livingAreas)[number]|null>(null);
  const [selectedWorld,setSelectedWorld]=useState<WorldPlace|null>(null);
  const showHome=()=>{setSelectedChapter(null);setView('home')};
  const showNeighborhoods=()=>{setSelectedChapter(null);setView('neighborhoods')};
  return <main className="welcome-page">
    <section className={`welcome-card welcome-card-${view}`}>
      <header className="welcome-header">
        <button type="button" className="welcome-brand" aria-label="세종한바퀴 홈" onClick={showHome}>
          <span className="welcome-brand-face">🧑🏻‍🌾</span>
          <span><strong>세종한바퀴</strong><small>세종 지역 소통 공간</small></span>
        </button>
        <nav className="welcome-nav" aria-label="주요 메뉴">
          <button type="button" className={view==='home'?'is-active':''} onClick={showHome}>홈</button>
          <button type="button" className={view==='neighborhoods'?'is-active':''} onClick={showNeighborhoods}>공간 안내</button>
          <button type="button" className={view==='neighbors'?'is-active':''} onClick={()=>setView('neighbors')}>함께하기</button>
        </nav>
        <button type="button" className={`welcome-login ${userName?'is-user':''}`} title={userName?'캐릭터 설정 변경':'로그인'} aria-label={userName?`${userName}님의 캐릭터 설정 변경`:'로그인'} onClick={userName?(onUserClick??onStart):onLogin}>{userName?<><span aria-hidden="true">🧑🏻‍🌾</span>{userName}님</>:actionLabel==='가입 이어서 하기'?actionLabel:'로그인'}</button>
      </header>
      {selectedWorld&&<div className="world-model-overlay" role="dialog" aria-modal="true" aria-label={`${selectedWorld.name} 3D 월드 안내`} onClick={()=>setSelectedWorld(null)}>
        <section className="world-model-modal" onClick={event=>event.stopPropagation()}>
          <button type="button" className="world-model-close" onClick={()=>setSelectedWorld(null)} aria-label="3D 월드 안내 닫기"><X/></button>
          <div className="world-model-stage" style={{'--world-accent':selectedWorld.accent} as CSSProperties}>
            <div className="world-model-stage-head"><span><i/>LIVE WORLD MODEL</span><small>{selectedWorld.modelSize} · 선택 시 로드</small></div>
            <Suspense fallback={<div className="world-model-module-loading">3D 뷰어를 준비하고 있어요.</div>}><WorldModelPreview src={selectedWorld.modelUrl} poster={selectedWorld.image} name={selectedWorld.name}/></Suspense>
            <div className="world-model-help"><span>↻ 드래그하여 회전</span><span>＋ 휠로 확대</span><span>◇ 실제 게임 맵</span></div>
          </div>
          <aside className="world-model-info">
            <span className="world-model-kicker">SEJONG WORLD PREVIEW</span>
            <h2>{selectedWorld.name}</h2>
            <p>{selectedWorld.description}</p>
            <div className="world-model-points"><small>이 월드의 주요 체험</small>{selectedWorld.points.map((point,index)=><div key={point}><span style={{background:selectedWorld.accent}}>{String(index+1).padStart(2,'0')}</span><b>{point}</b></div>)}</div>
            <div className="world-model-actions">
              {selectedWorld.mapId&&<button type="button" className="world-model-enter" onClick={()=>{const mapId=selectedWorld.mapId;if(!mapId)return;setSelectedWorld(null);onEnterWorld(mapId)}}><Play size={15} fill="currentColor"/> {selectedWorld.name} 입장하기</button>}
              <button type="button" onClick={()=>{setSelectedWorld(null);showNeighborhoods()}}>{view==='home'?`${guideWorlds.length}개 공간 자세히 보기`:'다른 공간 둘러보기'} <ArrowRight/></button>
            </div>
            <small className="world-model-note">3D 모형은 실제 인게임 GLB 파일을 사용합니다.</small>
          </aside>
        </section>
      </div>}

      {view==='home'?<>
      <div className="welcome-hero" id="welcome">
        <div className="welcome-copy">
          <span className="welcome-kicker"><Radio size={17}/> 실시간으로 연결되는 세종 소셜 월드</span>
          <h1><span>아바타로 세종을 탐험하고,</span><em>이웃과 방문을 계획해요.</em></h1>
          <p>나만의 캐릭터로 세종의 축제와 자연을 자유롭게 걸어보세요.<br/>월드에서 만난 이웃과 대화하고, 인공지능으로 실제 방문 코스를 완성합니다.</p>
          <div className="welcome-actions">
            <button type="button" className="welcome-primary" onClick={onStart}><Play size={20} fill="currentColor"/> {actionLabel}</button>
            <button type="button" className="welcome-secondary" onClick={showNeighborhoods}><Gamepad2 size={20}/> 월드 공간 미리보기</button>
          </div>
          <div className="welcome-stats" id="neighbors">
            <span><Users size={17}/><b>취향 기반</b><small>추천 이유가 보이는 만남</small></span>
            <span><Sparkles size={17}/><b>인공지능 코스</b><small>대화를 실제 방문 계획으로</small></span>
          </div>
        </div>

        <div className="welcome-preview" aria-label="세종 메타버스 미리보기">
          <div className="welcome-preview-glow"/>
          <span className="welcome-spark spark-one">✦</span><span className="welcome-spark spark-two">◇</span>
          <div className="welcome-world-shell">
            <div className="welcome-world-topbar">
              <span><i/><b>SEJONG WORLD</b><small>세종호수공원</small></span>
              <span><Wifi size={12}/><b>12</b><small>ONLINE</small></span>
            </div>
            <div className="welcome-town-card">
              <img src={parkMapImage} alt="아바타들이 함께 탐험하는 세종호수공원 월드" className="welcome-world-scene"/>
              <span className="welcome-world-shade"/>
              <div className="world-portal portal-campus"><i/><span><small>PORTAL 03</small><b>공동캠퍼스</b></span></div>
              <div className="world-avatar avatar-me"><span>🧑🏻‍🌾</span><b>나</b><i/></div>
              <div className="world-avatar avatar-friend"><span>🦊</span><b>하늘여우</b><i/></div>
              <div className="world-avatar avatar-neighbor"><span>🐻</span><b>민트곰</b><i/></div>
              <div className="welcome-world-controls"><span><kbd>W</kbd><span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></span><b>월드 이동</b></div>
              <div className="welcome-minimap"><span/><i className="pin-me"/><i className="pin-friend"/><b>MAP</b></div>
              <div className="welcome-town-label"><Sparkles size={15}/><span><strong>오늘의 월드 퀘스트 · 취향 기록 2/4</strong><small>축제 부스 탐험 → 수목원 포털 열기</small></span><em>50%</em></div>
            </div>
          </div>
          <div className="welcome-chat chat-one"><span>🦊</span><p><small>하늘여우 · 가까운 이웃</small>수련과 카페 취향이 같아요!</p></div>
          <div className="welcome-chat chat-two"><span>👑</span><p><small>충녕이 · AI 가이드</small>함께 갈 포털을 선택해 보세요.</p></div>
        </div>
      </div>

      <div className="welcome-world-journey">
      <section className="home-detail-section" aria-label="서비스 연결 방식">
        <div className="home-detail-intro">
          <span className="neighborhood-kicker">METAVERSE JOURNEY</span>
          <h2>체험 기록이<br/><em>연결되는 여정</em></h2>
          <p>발견부터 실제 방문까지 한눈에 확인해요.</p>
        </div>
        <div className="home-detail-flow">
          <article><span className="journey-thumb">🎪</span><div><small>01 · 발견</small><strong>세종 취향 찾기</strong><p>축제와 자연을 체험해요.</p></div></article>
          <article><span className="journey-thumb">🌿</span><div><small>02 · 기록</small><strong>나를 이해하기</strong><p>탐험 기록을 남겨요.</p></div></article>
          <article><span className="journey-thumb">🧑🏻‍🤝‍🧑🏻</span><div><small>03 · 연결</small><strong>비슷한 이웃 만나기</strong><p>공통 관심사를 확인해요.</p></div></article>
          <article><span className="journey-thumb">🗺️</span><div><small>04 · 선택</small><strong>함께 장소 고르기</strong><p>시간과 장소를 정해요.</p></div></article>
          <article><span className="journey-thumb">✨</span><div><small>05 · 방문</small><strong>AI 코스로 출발</strong><p>실제 방문 계획을 완성해요.</p></div></article>
        </div>
      </section>

      <section className="welcome-places" id="places">
        <div className="welcome-section-title"><span><Route size={20}/><strong>세종을 경험하는 {places.length}개의 공간</strong></span><button type="button" onClick={showNeighborhoods}>전체 공간 보기 <ArrowRight size={13}/></button></div>
        <div className="welcome-place-grid">{places.map((place,index)=><button type="button" className="welcome-place" key={place.name} onClick={()=>setSelectedWorld(place)} aria-label={`${place.name} 3D 월드 모형 보기`}>
          <span className="welcome-place-image" style={{backgroundImage:`url(${place.image})`}}><i>{index+1}단계</i><b className="world-3d-badge">3D MAP</b></span>
          <span className="welcome-place-copy"><span><small>{place.people} · WORLD {String(index+1).padStart(2,'0')}</small><strong>{place.name}</strong><em>{place.description}</em><b>3D 모형 보기 <ArrowRight size={12}/></b></span></span>
        </button>)}</div>
      </section>
      </div>
      </>:view==='neighborhoods'?selectedChapter?<section className="neighborhood-page chapter-detail" aria-labelledby="chapter-title">
        <button type="button" className="chapter-back" onClick={()=>setSelectedChapter(null)}><ArrowLeft size={16}/> 전체 공간 보기</button>

        <div className="chapter-hero">
          <div className="chapter-symbol" aria-hidden="true"><span>{selectedChapter.emoji}</span><b>{selectedChapter.number}</b></div>
          <div className="chapter-hero-copy">
            <span className="neighborhood-kicker">제 {selectedChapter.number}장 · 소통 여정</span>
            <h1 id="chapter-title">{selectedChapter.title}</h1>
            <p>{selectedChapter.summary}</p>
            <div className="chapter-location"><MapPin size={13}/><strong>체험 장소</strong><span>{selectedChapter.names.join(' · ')}</span></div>
          </div>
        </div>

        <div className="chapter-progress-title">
          <div><Sparkles size={17}/><strong>이 맵에서 사용자가 하는 일</strong></div>
          <span>맵의 역할과 흐름</span>
        </div>
        <div className="chapter-activity-grid">
          {selectedChapter.activities.map((activity,index)=><article className="chapter-activity" key={activity}>
            <span>{String(index+1).padStart(2,'0')}</span>
            <div><small>사용자 활동</small><strong>{activity}</strong></div>
          </article>)}
        </div>

        <div className="chapter-info-grid">
          <article><small>공간의 역할</small><strong>이 맵의 역할</strong><p>{selectedChapter.role}</p></article>
          <article><small>쌓이는 기록</small><strong>남는 기록</strong><p>{selectedChapter.reward}</p></article>
          <article><small>대화 가능 범위</small><strong>소통 범위</strong><p>{selectedChapter.communication}</p></article>
          <article><small>여정의 연결</small><strong>다음 공간과의 연결</strong><p>{selectedChapter.connection}</p></article>
        </div>
      </section>:<section className="neighborhood-page chapter-hub guide-home-page" aria-labelledby="neighborhood-title">
        <div className="guide-home-hero">
          <div>
            <span className="welcome-kicker"><Map size={16}/> 자유롭게 이동하는 세종 월드</span>
            <h1 id="neighborhood-title">총 {guideWorlds.length}개의 실제 월드를<br/><em>3D로 먼저 둘러보세요.</em></h1>
            <p>각 공간의 GLB 맵을 직접 회전하고 확대해 볼 수 있어요. 월드마다 어떤 체험과 기록이 준비되어 있는지도 함께 확인하세요.</p>
          </div>
        </div>

        <div className="guide-home-title"><div><small>{guideWorlds.length} INTERACTIVE WORLDS</small><h2>세종을 경험하는 {guideWorlds.length}개의 공간</h2></div><span>카드를 누르면 실제 GLB 맵이 열립니다</span></div>
        <div className="guide-world-grid">
          {guideWorlds.map((world,index)=><button type="button" className="guide-world-card" key={world.name} onClick={()=>setSelectedWorld(world)} aria-label={`${world.name} 3D 월드 모형 보기`}>
            <span className="guide-world-image" style={{backgroundImage:`url(${world.image})`}}><i>WORLD {String(index+1).padStart(2,'0')}</i><b>{world.emoji}</b><em>3D GLB</em></span>
            <span className="guide-world-copy">
              <small>{world.people}</small><strong>{world.name}</strong><p>{world.description}</p>
              <span className="guide-world-experiences">{world.points.map(point=><i key={point}><Sparkles size={9}/>{point}</i>)}</span>
              <em>{world.mapId?'3D 맵 확인 후 입장':'3D 맵 둘러보기'} <ArrowRight size={13}/></em>
            </span>
          </button>)}
        </div>
        <section className="guide-home-cycle"><div><Route size={19}/><span><small>하나의 연결된 여정</small><b>발견 → 기록 → 만남 → 계획 → 다시 공유</b></span></div><div>{townAndMyeon.map(name=><span key={name}>{name}</span>)}</div></section>
      </section>:<section className="neighbors-page together-home-page" aria-labelledby="neighbors-title">
        <div className="together-home-hero">
          <div>
            <span className="welcome-kicker"><Users size={16}/> 기록으로 연결되는 세종 이웃</span>
            <h1 id="neighbors-title">취향이 비슷한 이웃과<br/><em>가볍게 대화를 시작해요.</em></h1>
            <p>축제 저장 기록과 생태 탐험 기록을 바탕으로, 왜 잘 맞는지 알 수 있는 이웃과 동아리만 보여드려요.</p>
            <div className="together-home-stats">
              <span><i className="online-pulse"/><b>12명</b> 지금 대화 가능</span>
              <span><Users size={15}/><b>6개</b> 활동 중인 동아리</span>
            </div>
          </div>
          <aside className="together-home-preview">
            <header><span><i className="online-pulse"/> LIVE CAMPUS</span><small>공동캠퍼스 라운지</small></header>
            <div className="together-preview-avatars"><span>👩‍🌾</span><span>🦊</span><span>🐻</span><span>📷</span></div>
            <div className="together-match-reason"><Sparkles size={16}/><span><small>추천 이유</small><b>수련 · 카페 · 사진 취향이 겹쳐요</b></span><strong>78%</strong></div>
            <div className="together-preview-chat"><span>🦊</span><p><small>하늘여우</small><b>이번 주말 수목원 사진 산책 어때요?</b></p></div>
          </aside>
        </div>

        <div className="together-home-title">
          <div><small>MATCH & CLUB</small><h2>지금 만날 수 있는 이웃</h2></div>
          <span>공통 관심사와 추천 이유를 먼저 확인하세요</span>
        </div>

        <div className="together-card-grid">
          {experienceRooms.map((room,index)=><article className="together-person-card" key={room.name}>
            <div className="together-person-head"><span>{room.emoji}</span><i>{index<2?'추천 이웃':'추천 동아리'}</i></div>
            <div className="together-person-copy">
              <div><strong>{room.name}</strong><small>{room.members}</small></div>
              <p><MapPin size={11}/>{room.stage}</p>
              <b><Sparkles size={11}/>{room.status}</b>
              <div>{room.interests.slice(0,3).map(interest=><i key={interest}>#{interest}</i>)}</div>
            </div>
            <button type="button" aria-label={`${room.name} 기록 또는 동아리 보기`} onClick={onStart}>기록 보기 <ArrowRight size={14}/></button>
          </article>)}
        </div>

        <section className="together-home-footer">
          <div><MessageCircle size={18}/><span><small>대화는 필요한 만큼만</small><b>수목원에서 1:1 대화 → 공동캠퍼스에서 동아리 → 정부청사에서 함께 계획</b></span></div>
          <button type="button" onClick={onStart}><UserPlus size={16}/> 내 취향 기록 만들기</button>
        </section>
      </section>}
    </section>
  </main>;
}
