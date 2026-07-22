import { ArrowRight, Coffee, MapPin, Play, Sparkles, Trees, Users } from 'lucide-react';
import stationImage from '../assets/maps/jochwon-station/building.svg';
import marketImage from '../assets/maps/traditional-market/building.svg';
import parkImage from '../assets/maps/jochwon-park/building.svg';
import './LandingPage.css';

type LandingPageProps={onStart:()=>void};

const places=[
  {name:'조치원역',description:'새로운 이웃과 만나는 시작점',people:'18명',image:stationImage},
  {name:'전통시장',description:'맛있는 이야기가 모이는 곳',people:'12명',image:marketImage},
  {name:'호수공원',description:'함께 걷기 좋은 산책길',people:'26명',image:parkImage}
];

export function LandingPage({onStart}:LandingPageProps){
  return <main className="welcome-page">
    <section className="welcome-card">
      <header className="welcome-header">
        <a href="#welcome" className="welcome-brand" aria-label="여기 사람 있음 홈">
          <span className="welcome-brand-face">🧑🏻‍🌾</span>
          <span><strong>여기 사람 있음</strong><small>세종 로컬 멀티버스</small></span>
        </a>
        <nav className="welcome-nav" aria-label="주요 메뉴"><a href="#welcome">홈</a><a href="#places">동네</a><a href="#neighbors">이웃</a></nav>
        <button type="button" className="welcome-login" onClick={onStart}>로그인</button>
      </header>

      <div className="welcome-hero" id="welcome">
        <div className="welcome-copy">
          <span className="welcome-kicker"><Sparkles size={17}/> 같이 걸어요, 조치원!</span>
          <h1>오늘, 우리 동네에서<br/><em>함께할 사람을</em> 찾아요.</h1>
          <p>산책, 커피, 취미처럼 가벼운 일상부터<br/>가까운 동네 이웃과 시작해보세요.</p>
          <div className="welcome-actions">
            <button type="button" className="welcome-primary" onClick={onStart}><Play size={20} fill="currentColor"/> 멀티버스 입장하기</button>
            <button type="button" className="welcome-secondary" onClick={onStart}><span>🧑🏻‍🌾</span> 내 캐릭터 만들기</button>
          </div>
          <div className="welcome-stats" id="neighbors">
            <span><Users size={17}/><b>42명</b><small>지금 접속 중</small></span>
            <span><Coffee size={17}/><b>3개</b><small>진행 중인 모임</small></span>
          </div>
        </div>

        <div className="welcome-preview" aria-label="조치원 멀티버스 미리보기">
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
            <div className="welcome-town-label"><MapPin size={15} fill="currentColor"/><span><strong>조치원 중심 마을</strong><small>지금 42명의 이웃이 함께해요</small></span></div>
          </div>
          <div className="welcome-chat chat-one">산책 같이 할래요? 🙂</div>
          <div className="welcome-chat chat-two">카페 같이 가요! ☕</div>
        </div>
      </div>

      <section className="welcome-places" id="places">
        <div className="welcome-section-title"><span><Trees size={20}/><strong>우리 동네 핫플레이스</strong></span><small>가까운 곳부터 둘러보세요</small></div>
        <div className="welcome-place-grid">{places.map(place=><button type="button" className="welcome-place" key={place.name} onClick={onStart}>
          <span className="welcome-place-image" style={{backgroundImage:`url(${place.image})`}}><i><Users size={12}/>{place.people}</i></span>
          <span className="welcome-place-copy"><span><strong>{place.name}</strong><small>{place.description}</small></span><ArrowRight size={19}/></span>
        </button>)}</div>
      </section>
    </section>
  </main>;
}
