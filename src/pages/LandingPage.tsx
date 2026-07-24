import { useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, Clock3, Coffee, Map, MapPin, MessageCircle, Play, Sparkles, Trees, UserPlus, Users } from 'lucide-react';
import stationImage from '../assets/maps/jochwon-station/building.svg';
import marketImage from '../assets/maps/traditional-market/building.svg';
import stationMapImage from '../assets/maps/hotspots/jochwon-station-map.jpg';
import marketMapImage from '../assets/maps/hotspots/traditional-market-map.jpg';
import parkMapImage from '../assets/maps/hotspots/jochwon-park-map.jpg';
import './LandingPage.css';

type LandingPageProps={onStart:()=>void;onUserClick?:()=>void;actionLabel?:string;userName?:string};

const places=[
  {name:'세종호수공원',description:'충녕이와 시작하는 첫 만남',people:'CH.1',image:parkMapImage},
  {name:'공동캠퍼스',description:'친구 또는 AI 동료와 협력하기',people:'CH.2',image:stationMapImage},
  {name:'베어트리파크 · 수목원',description:'AI 퀴즈와 포즈 미니게임',people:'CH.3',image:marketMapImage}
];

const livingAreas=[
  {number:1,emoji:'👋',title:'사람을 만나는 챕터',names:['세종호수공원'],summary:'AI 가이드 충녕이와 세계를 익히고 첫 이웃을 만나요.',activities:['이동 · NPC 대화 튜토리얼','다른 플레이어와 이모트','충녕이와 첫 대화'],reward:'첫 만남 스탬프'},
  {number:2,emoji:'🤝',title:'함께 체험하는 챕터',names:['공동캠퍼스'],summary:'다른 사용자 또는 AI 동료와 협동 미션을 해결해요.',activities:['함께 물건 운반하기','동시에 버튼 누르기','길 찾기 · 협동 퍼즐'],reward:'협력 스탬프'},
  {number:3,emoji:'🌳',title:'세종을 체험하는 챕터',names:['베어트리파크','국립세종수목원'],summary:'Gemini 스토리텔링과 포즈 게임으로 세종을 발견해요.',activities:['장소 맞춤 AI 퀴즈','힌트와 추가 이야기','MediaPipe 포즈 미니게임'],reward:'세종 체험 스탬프'},
  {number:4,emoji:'✨',title:'미래·문화로 연결되는 챕터',names:['세종호수공원'],summary:'AI와 미래 세종을 상상하고 시민증을 완성해요.',activities:['20년 후 세종 상상하기','Gemini 자유 대화','세종 시민증 발급'],reward:'미래 세종 스탬프'}
];

const townAndMyeon=['Gemini AI NPC','AI 동료','MediaPipe Pose','실시간 멀티유저','스토리 기반 퀘스트'];

const onlineNeighbors=[
  {name:'복숭아소다',emoji:'👩🏻',mbti:'ENFP',area:'조치원읍',status:'역 앞 산책 중',interests:['카페','사진']},
  {name:'시장탐험가',emoji:'🧑🏻',mbti:'ISTP',area:'조치원읍',status:'전통시장 구경 중',interests:['맛집','산책']},
  {name:'새롬산책러',emoji:'👨🏻',mbti:'ISFJ',area:'새롬동',status:'저녁 산책 메이트 찾아요',interests:['산책','반려동물']},
  {name:'세종책벌레',emoji:'👩🏻‍🦱',mbti:'INFJ',area:'새롬동',status:'북클럽 이야기 중',interests:['독서','전시']},
  {name:'도담커피',emoji:'🧑🏻‍🦰',mbti:'ENTP',area:'도담동',status:'새 카페 탐방 중',interests:['커피','여행']},
  {name:'해밀러너',emoji:'👱🏻‍♀️',mbti:'ESTJ',area:'도담동',status:'주말 러닝 모집 중',interests:['러닝','건강']}
];

const neighborFilters=['전체','조치원읍','새롬동','도담동'];
const meetups=[
  {emoji:'☕',title:'퇴근 후 카페 한 잔',place:'조치원역 앞',time:'오늘 19:30',members:'3/5명'},
  {emoji:'🚶',title:'호수공원 저녁 산책',place:'호수공원 입구',time:'내일 18:00',members:'4/6명'},
  {emoji:'🥐',title:'주말 시장 맛집 탐방',place:'세종전통시장',time:'토요일 11:00',members:'2/5명'}
];

export function LandingPage({onStart,onUserClick,actionLabel='멀티버스 입장하기',userName}:LandingPageProps){
  const [view,setView]=useState<'home'|'neighborhoods'|'neighbors'>('home');
  const [neighborFilter,setNeighborFilter]=useState('전체');
  const [selectedChapter,setSelectedChapter]=useState<(typeof livingAreas)[number]|null>(null);
  const showHome=()=>{setSelectedChapter(null);setView('home')};
  const showNeighborhoods=()=>{setSelectedChapter(null);setView('neighborhoods')};
  const filteredNeighbors=neighborFilter==='전체'?onlineNeighbors:onlineNeighbors.filter(neighbor=>neighbor.area===neighborFilter);

  return <main className="welcome-page">
    <section className="welcome-card">
      <header className="welcome-header">
        <button type="button" className="welcome-brand" aria-label="여기 사람 있음 홈" onClick={showHome}>
          <span className="welcome-brand-face">🧑🏻‍🌾</span>
          <span><strong>여기 사람 있음</strong><small>세종 로컬 멀티버스</small></span>
        </button>
        <nav className="welcome-nav" aria-label="주요 메뉴">
          <button type="button" className={view==='home'?'is-active':''} onClick={showHome}>홈</button>
          <button type="button" className={view==='neighborhoods'?'is-active':''} onClick={showNeighborhoods}>챕터</button>
          <button type="button" className={view==='neighbors'?'is-active':''} onClick={()=>setView('neighbors')}>멀티플레이</button>
        </nav>
        <button type="button" className={`welcome-login ${userName?'is-user':''}`} onClick={userName?(onUserClick??onStart):onStart}>{userName?<><span aria-hidden="true">🧑🏻‍🌾</span>{userName}님</>:actionLabel==='가입 이어서 하기'?actionLabel:'로그인'}</button>
      </header>

      {view==='home'?<>
      <div className="welcome-hero" id="welcome">
        <div className="welcome-copy">
          <span className="welcome-kicker"><Sparkles size={17}/> AI와 함께 만나는 새로운 세종</span>
          <h1>만나고, 협력하고,<br/><em>미래 세종을</em> 상상해요.</h1>
          <p>충녕이의 안내를 따라 세종을 체험하고<br/>모든 스탬프를 모아 세종 시민증을 완성해보세요.</p>
          <div className="welcome-actions">
            <button type="button" className="welcome-primary" onClick={onStart}><Play size={20} fill="currentColor"/> {actionLabel}</button>
            <button type="button" className="welcome-secondary" onClick={showNeighborhoods}><span>🗺️</span> 체험 흐름 미리보기</button>
          </div>
          <div className="welcome-stats" id="neighbors">
            <span><Users size={17}/><b>실시간</b><small>멀티유저 동기화</small></span>
            <span><Sparkles size={17}/><b>AI 동료</b><small>혼자여도 함께</small></span>
          </div>
        </div>

        <div className="welcome-preview" aria-label="세종 메타버스 미리보기">
          <div className="welcome-preview-glow"/>
          <span className="welcome-spark spark-one">✧</span><span className="welcome-spark spark-two">◇</span>
          <div className="welcome-town-card">
            <div className="welcome-town-sky"><span/><span/></div>
            <div className="welcome-town-ground">
              <img src={stationImage} alt="" className="welcome-building building-station"/>
              <img src={marketImage} alt="" className="welcome-building building-market"/>
              <span className="welcome-tree tree-one">🌳</span><span className="welcome-tree tree-two">🌲</span>
              <span className="welcome-person person-one">👦🏻</span><span className="welcome-person person-two">👧🏻</span><span className="welcome-person person-three">🧑🏻</span>
            </div>
            <div className="welcome-town-label"><MapPin size={15} fill="currentColor"/><span><strong>세종호수공원</strong><small>지금 42명의 이웃이 함께해요</small></span></div>
          </div>
          <div className="welcome-chat chat-one">충녕이가 안내할게요! 👑</div>
          <div className="welcome-chat chat-two">함께 미션을 풀어요! 🤝</div>
        </div>
      </div>

      <section className="welcome-places" id="places">
        <div className="welcome-section-title"><span><Trees size={20}/><strong>주요 체험 공간</strong></span><button type="button" onClick={showNeighborhoods}>전체 챕터 보기 <ArrowRight size={13}/></button></div>
        <div className="welcome-place-grid">{places.map(place=><button type="button" className="welcome-place" key={place.name} onClick={showNeighborhoods} aria-label={`${place.name}이 포함된 동네 페이지 보기`}>
          <span className="welcome-place-image" style={{backgroundImage:`url(${place.image})`}}><i><Users size={12}/>{place.people}</i></span>
          <span className="welcome-place-copy"><span><strong>{place.name}</strong><small>{place.description}</small></span><ArrowRight size={19}/></span>
        </button>)}</div>
      </section>
      </>:view==='neighborhoods'?selectedChapter?<section className="neighborhood-page chapter-detail" aria-labelledby="chapter-title">
        <button type="button" className="chapter-back" onClick={()=>setSelectedChapter(null)}><ArrowLeft size={16}/> 전체 챕터 보기</button>

        <div className="chapter-hero">
          <div className="chapter-symbol" aria-hidden="true"><span>{selectedChapter.emoji}</span><b>{selectedChapter.number}</b></div>
          <div className="chapter-hero-copy">
            <span className="neighborhood-kicker">CHAPTER {selectedChapter.number} · SEJONG EXPERIENCE</span>
            <h1 id="chapter-title">{selectedChapter.title}</h1>
            <p>{selectedChapter.summary}</p>
            <div className="chapter-location"><MapPin size={13}/><strong>체험 장소</strong><span>{selectedChapter.names.join(' · ')}</span></div>
          </div>
        </div>

        <div className="chapter-progress-title">
          <div><Sparkles size={17}/><strong>이 챕터에서 할 수 있어요</strong></div>
          <span>3개의 체험</span>
        </div>
        <div className="chapter-activity-grid">
          {selectedChapter.activities.map((activity,index)=><article className="chapter-activity" key={activity}>
            <span>{String(index+1).padStart(2,'0')}</span>
            <div><small>EXPERIENCE</small><strong>{activity}</strong></div>
          </article>)}
        </div>

        <div className="chapter-finish">
          <div className="chapter-reward"><span>🏅</span><div><small>CHAPTER REWARD</small><strong>{selectedChapter.reward}</strong></div></div>
          <div className="chapter-finish-copy">
            <strong>{selectedChapter.number===4?'모든 기록을 모아 세종 시민증을 완성해요.':'체험을 완료하고 다음 이야기로 이어가세요.'}</strong>
            <small>{selectedChapter.number===1?'AI 가이드 충녕이가 처음부터 차근차근 안내해 드려요.':'혼자 접속해도 AI 동료와 끝까지 체험할 수 있어요.'}</small>
          </div>
          <button type="button" onClick={onStart}><Play size={16} fill="currentColor"/>CH.{selectedChapter.number} 체험 시작</button>
        </div>
      </section>:<section className="neighborhood-page chapter-hub" aria-labelledby="neighborhood-title">
        <div className="neighborhood-heading">
          <span className="neighborhood-icon"><Map size={27}/></span>
          <div>
            <span className="neighborhood-kicker">SEJONG EXPERIENCE CHAPTERS</span>
            <h1 id="neighborhood-title">하나의 이야기로 이어지는 4개 챕터</h1>
            <p>만남에서 협력, 지역 체험, 미래 상상과 시민증 발급까지 이어집니다.</p>
          </div>
        </div>

        <div className="living-area-grid">
          {livingAreas.map(area=><button type="button" className="living-area-card" key={area.number} onClick={()=>setSelectedChapter(area)} aria-label={`챕터 ${area.number} ${area.title} 자세히 보기`}>
            <div className="living-area-number"><span aria-hidden="true">{area.emoji}</span><b>{area.number}</b></div>
            <div className="living-area-content">
              <div className="living-area-title"><small>CHAPTER {area.number}</small></div>
              <strong className="living-area-name">{area.title}</strong>
              <span className="living-area-summary">{area.summary}</span>
              <span className="living-area-locations"><MapPin size={10}/>{area.names.join(' · ')}</span>
            </div>
            <ArrowRight className="living-area-arrow" size={17}/>
          </button>)}
        </div>

        <section className="town-myeon-card">
          <div className="town-myeon-title">
            <span><Building2 size={21}/></span>
            <div><strong>핵심 기술</strong><small>끊김 없는 몰입 경험</small></div>
          </div>
          <div className="neighborhood-tags town-myeon-tags">{townAndMyeon.map(name=><span key={name}>{name}</span>)}</div>
        </section>
      </section>:<section className="neighbors-page" aria-labelledby="neighbors-title">
        <div className="neighbors-heading">
          <div>
            <span className="neighborhood-kicker">NEIGHBORS ONLINE</span>
            <h1 id="neighbors-title">지금, 우리 동네 이웃들</h1>
            <p>가까이 있는 이웃과 가볍게 인사하고 오늘의 모임에 참여해보세요.</p>
          </div>
          <div className="neighbors-summary">
            <span><i className="online-pulse"/><b>42명</b><small>지금 접속 중</small></span>
            <span><Coffee size={18}/><b>3개</b><small>진행 중인 모임</small></span>
          </div>
        </div>

        <div className="neighbors-toolbar">
          <strong><Users size={18}/> 접속 중인 이웃</strong>
          <div>{neighborFilters.map(filter=><button type="button" className={neighborFilter===filter?'is-selected':''} key={filter} onClick={()=>setNeighborFilter(filter)}>{filter}</button>)}</div>
        </div>

        <div className="neighbor-grid">
          {filteredNeighbors.map(neighbor=><article className="neighbor-card" key={neighbor.name}>
            <div className="neighbor-avatar"><span>{neighbor.emoji}</span><i aria-label="접속 중"/></div>
            <div className="neighbor-info">
              <div><strong>{neighbor.name}</strong><small>{neighbor.mbti}</small></div>
              <span><MapPin size={11}/>{neighbor.area} · {neighbor.status}</span>
              <div className="neighbor-interests">{neighbor.interests.map(interest=><i key={interest}>#{interest}</i>)}</div>
            </div>
            <button type="button" className="neighbor-message" aria-label={`${neighbor.name}에게 인사하기`} onClick={onStart}><MessageCircle size={17}/></button>
          </article>)}
        </div>

        <div className="meetup-header"><strong><Coffee size={18}/> 지금 참여할 수 있는 모임</strong><button type="button" onClick={onStart}>모두 보기 <ArrowRight size={14}/></button></div>
        <div className="meetup-grid">
          {meetups.map(meetup=><button type="button" className="meetup-card" key={meetup.title} onClick={onStart}>
            <span className="meetup-emoji">{meetup.emoji}</span>
            <span className="meetup-info"><strong>{meetup.title}</strong><small><MapPin size={11}/>{meetup.place}</small><small><Clock3 size={11}/>{meetup.time}</small></span>
            <span className="meetup-members"><Users size={12}/>{meetup.members}</span>
          </button>)}
        </div>

        <button type="button" className="neighbors-join" onClick={onStart}><UserPlus size={18}/> 로그인하고 이웃에게 인사하기</button>
      </section>}
    </section>
  </main>;
}
