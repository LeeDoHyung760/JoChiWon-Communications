import { useState } from 'react';
import { ArrowLeft, ArrowRight, Clock3, Headphones, Map, MapPin, MessageCircle, Play, Route, Sparkles, UserPlus, Users } from 'lucide-react';
import stationImage from '../assets/maps/jochwon-station/building.svg';
import marketImage from '../assets/maps/traditional-market/building.svg';
import stationMapImage from '../assets/maps/hotspots/jochwon-station-map.jpg';
import marketMapImage from '../assets/maps/hotspots/traditional-market-map.jpg';
import parkMapImage from '../assets/maps/hotspots/jochwon-park-map.jpg';
import './LandingPage.css';

type LandingPageProps={onStart:()=>void;onUserClick?:()=>void;actionLabel?:string;userName?:string};

const places=[
  {name:'세종호수공원',description:'축제와 지역 볼거리에서 취향 발견',people:'시작',image:parkMapImage},
  {name:'수목원 · 베어트리파크',description:'식물을 발견하고 개인 탐험 기록 생성',people:'기록',image:marketMapImage},
  {name:'공동캠퍼스',description:'비슷한 사람과 만나 동아리·대화 시작',people:'만남',image:stationMapImage},
  {name:'정부청사',description:'함께 장소를 고르고 인공지능 방문 코스 완성',people:'계획',image:marketMapImage}
];

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

export function LandingPage({onStart,onUserClick,actionLabel='멀티버스 입장하기',userName}:LandingPageProps){
  const [view,setView]=useState<'home'|'neighborhoods'|'neighbors'>('home');
  const [selectedChapter,setSelectedChapter]=useState<(typeof livingAreas)[number]|null>(null);
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
        <button type="button" className={`welcome-login ${userName?'is-user':''}`} title={userName?'캐릭터 설정 변경':'로그인'} aria-label={userName?`${userName}님의 캐릭터 설정 변경`:'로그인'} onClick={userName?(onUserClick??onStart):onStart}>{userName?<><span aria-hidden="true">🧑🏻‍🌾</span>{userName}님</>:actionLabel==='가입 이어서 하기'?actionLabel:'로그인'}</button>
      </header>

      {view==='home'?<>
      <div className="welcome-hero" id="welcome">
        <div className="welcome-copy">
          <span className="welcome-kicker"><MessageCircle size={17}/> 취향에서 실제 만남까지 이어지는 세종</span>
          <h1><span>세종에서 취향을 발견하고,</span><em>이웃과 방문을 계획해요.</em></h1>
          <p>축제와 자연에서 나만의 기록을 만들고 비슷한 사람을 만나보세요.<br/>대화에서 고른 장소를 인공지능이 실제 세종 방문 코스로 완성합니다.</p>
          <div className="welcome-actions">
            <button type="button" className="welcome-primary" onClick={onStart}><Play size={20} fill="currentColor"/> {actionLabel}</button>
            <button type="button" className="welcome-secondary" onClick={showNeighborhoods}><span>🗺️</span> 전체 흐름 미리보기</button>
          </div>
          <div className="welcome-stats" id="neighbors">
            <span><Users size={17}/><b>취향 기반</b><small>추천 이유가 보이는 만남</small></span>
            <span><Sparkles size={17}/><b>인공지능 코스</b><small>대화를 실제 방문 계획으로</small></span>
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
            <div className="welcome-town-label"><MapPin size={15} fill="currentColor"/><span><strong>민트곰과 하늘여우의 초록빛 세종 코스</strong><small>수목원 → 지역 카페 → 호수공원</small></span></div>
          </div>
          <div className="welcome-chat chat-one">수련과 카페 취향이 같아요! 🌿</div>
          <div className="welcome-chat chat-two">함께 갈 장소를 정해볼까요? 🗺️</div>
        </div>
      </div>

      <section className="home-detail-section" aria-label="서비스 연결 방식">
        <div className="home-detail-intro">
          <span className="neighborhood-kicker">기록이 만남으로 이어지는 방법</span>
          <h2>내가 남긴 기록이<br/><em>대화의 이유</em>가 돼요.</h2>
          <p>무작위로 사람을 연결하지 않아요. 축제 관심사와 식물·곰 탐험 기록을 바탕으로 공통점을 먼저 보여줍니다.</p>
        </div>
        <div className="home-detail-flow">
          <article><span><Sparkles size={20}/></span><div><small>첫째 · 기록하기</small><strong>취향과 탐험 기록 쌓기</strong><p>축제, 자연, 곰 관찰, 가고 싶은 장소를 나만의 기록에 남겨요.</p></div></article>
          <article><span><Users size={20}/></span><div><small>둘째 · 만나기</small><strong>추천 이유를 보고 만나기</strong><p>“수련·카페·사진이 같아요”처럼 대화를 시작할 이유를 확인해요.</p></div></article>
          <article><span><Route size={20}/></span><div><small>셋째 · 계획하기</small><strong>대화를 실제 코스로 완성</strong><p>함께 고른 장소와 조건을 인공지능이 세종 방문 일정으로 정리해요.</p></div></article>
        </div>
        <aside className="home-chat-scope">
          <div><MessageCircle size={19}/><span><small>대화가 열리는 공간</small><strong>수목원 · 공동캠퍼스</strong></span></div>
          <p>호수공원에서는 가벼운 반응만, 정부청사에서는 기존 대화를 유지하며 함께 결정해요.</p>
          <button type="button" onClick={()=>setView('neighbors')}>함께하는 방법 자세히 보기 <ArrowRight size={14}/></button>
        </aside>
      </section>

      <section className="welcome-places" id="places">
        <div className="welcome-section-title"><span><Route size={20}/><strong>기록에서 실제 방문으로 이어지는 여정</strong></span><button type="button" onClick={showNeighborhoods}>전체 공간 보기 <ArrowRight size={13}/></button></div>
        <div className="welcome-place-grid">{places.map(place=><button type="button" className="welcome-place" key={place.name} onClick={showNeighborhoods} aria-label={`${place.name}이 포함된 동네 페이지 보기`}>
          <span className="welcome-place-image" style={{backgroundImage:`url(${place.image})`}}><i><Users size={12}/>{place.people}</i></span>
          <span className="welcome-place-copy"><span><strong>{place.name}</strong><small>{place.description}</small></span><ArrowRight size={19}/></span>
        </button>)}</div>
      </section>
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
      </section>:<section className="neighborhood-page chapter-hub" aria-labelledby="neighborhood-title">
        <div className="neighborhood-heading">
          <span className="neighborhood-icon"><Map size={27}/></span>
          <div>
            <span className="neighborhood-kicker">발견 · 기록 · 만남 · 계획</span>
            <h1 id="neighborhood-title">각 역할이 분명한 4개 공간</h1>
            <p>순서대로 깨는 퀘스트가 아니라, 기록이 만남과 실제 방문 계획으로 이어지는 순환형 경험입니다.</p>
          </div>
        </div>

        <div className="living-area-grid">
          {livingAreas.map(area=><button type="button" className="living-area-card" key={area.number} onClick={()=>setSelectedChapter(area)} aria-label={`챕터 ${area.number} ${area.title} 자세히 보기`}>
            <div className="living-area-number"><span aria-hidden="true">{area.emoji}</span><b>{area.number}</b></div>
            <div className="living-area-content">
              <div className="living-area-title"><small>제 {area.number}장</small></div>
              <strong className="living-area-name">{area.title}</strong>
              <span className="living-area-summary">{area.summary}</span>
              <span className="living-area-locations"><MapPin size={10}/>{area.names.join(' · ')}</span>
            </div>
            <ArrowRight className="living-area-arrow" size={17}/>
          </button>)}
        </div>

        <section className="town-myeon-card">
          <div className="town-myeon-title">
            <span><Headphones size={21}/></span>
            <div><strong>전체 경험 구조</strong><small>체험 → 기록 → 만남 → 대화 → 계획 → 공유</small></div>
          </div>
          <div className="neighborhood-tags town-myeon-tags">{townAndMyeon.map(name=><span key={name}>{name}</span>)}</div>
        </section>

        <section className="chapter-guide-panel" aria-label="공간 이용 안내">
          <div className="chapter-guide-heading">
            <span className="neighborhood-kicker">공간을 잇는 세 가지 원칙</span>
            <h2>정해진 순서보다,<br/>나의 기록을 따라 움직여요.</h2>
            <p>모든 공간은 자유롭게 둘러볼 수 있어요. 다만 내가 남긴 기록이 많아질수록 사람 추천과 방문 코스가 더 구체적으로 이어집니다.</p>
          </div>
          <div className="chapter-guide-rules">
            <article><span><Map size={20}/></span><div><strong>자유롭게 이동해요</strong><p>순서대로 완료해야 하는 과제 없이 관심 있는 공간부터 둘러봐요.</p></div></article>
            <article><span><Sparkles size={20}/></span><div><strong>기록이 추천의 근거가 돼요</strong><p>축제·식물·곰 관찰 기록을 바탕으로 공통점이 있는 사람을 알려줘요.</p></div></article>
            <article><span><MessageCircle size={20}/></span><div><strong>공간마다 소통 방식이 달라요</strong><p>호수공원은 반응, 수목원은 1대1, 공동캠퍼스는 동아리 대화가 중심이에요.</p></div></article>
          </div>
          <aside className="chapter-journey-example">
            <div><Route size={20}/><span><small>한 사용자의 여정 예시</small><strong>기록 하나가 실제 방문 계획이 되기까지</strong></span></div>
            <ol>
              <li><b>호수공원</b><span>야간축제와 카페 저장</span></li>
              <li><b>수목원</b><span>수련 발견·사진 기록</span></li>
              <li><b>공동캠퍼스</b><span>식물사진 동아리에서 대화</span></li>
              <li><b>정부청사</b><span>초록빛 세종 반나절 코스 완성</span></li>
            </ol>
          </aside>
        </section>
      </section>:<section className="neighbors-page" aria-labelledby="neighbors-title">
        <div className="neighbors-heading">
          <div>
            <span className="neighborhood-kicker">기록으로 만나고 · 대화하고 · 함께 계획하기</span>
            <h1 id="neighbors-title">기록을 보고, 이유 있는 대화를 시작해요</h1>
            <p>축제 관심사와 식물도감, 하고 싶은 활동이 비슷한 사람과 동아리를 추천합니다.</p>
          </div>
          <div className="neighbors-summary">
            <span><i className="online-pulse"/><b>12명</b><small>대화 가능한 사용자</small></span>
            <span><Users size={18}/><b>6개</b><small>활동 중인 동아리</small></span>
          </div>
        </div>

        <div className="neighbors-toolbar">
          <strong><Users size={18}/> 나와 연결될 수 있는 사람·동아리</strong>
          <div><button type="button" className="is-selected">전체</button><button type="button">추천 사용자</button><button type="button">동아리</button></div>
        </div>

        <div className="neighbor-grid">
          {experienceRooms.map(room=><article className="neighbor-card" key={room.name}>
            <div className="neighbor-avatar"><span>{room.emoji}</span><i aria-label="참여 가능"/></div>
            <div className="neighbor-info">
              <div><strong>{room.name}</strong><small>{room.members}</small></div>
              <span><MapPin size={11}/>{room.stage} · {room.status}</span>
              <div className="neighbor-interests">{room.interests.map(interest=><i key={interest}>#{interest}</i>)}</div>
            </div>
            <button type="button" className="neighbor-message" aria-label={`${room.name} 기록 또는 동아리 보기`} onClick={onStart}><ArrowRight size={17}/></button>
          </article>)}
        </div>

        <div className="meetup-header"><strong><MessageCircle size={18}/> 맵마다 대화의 역할이 달라요</strong></div>
        <div className="meetup-grid">
          <article className="meetup-card"><span className="meetup-emoji">🌿</span><span className="meetup-info"><strong>수목원 · 1대1 대화</strong><small><MessageCircle size={11}/>공개 탐험 기록을 매개로 시작</small></span></article>
          <article className="meetup-card"><span className="meetup-emoji">🎓</span><span className="meetup-info"><strong>공동캠퍼스 · 관계 만들기</strong><small><Users size={11}/>1대1·동아리·단체 채팅</small></span></article>
          <article className="meetup-card"><span className="meetup-emoji">🗺️</span><span className="meetup-info"><strong>정부청사 · 함께 결정하기</strong><small><Clock3 size={11}/>기존 대화를 유지하며 코스 완성</small></span></article>
        </div>

        <button type="button" className="neighbors-join" onClick={onStart}><UserPlus size={18}/> 내 취향 기록 만들러 가기</button>
      </section>}
    </section>
  </main>;
}
