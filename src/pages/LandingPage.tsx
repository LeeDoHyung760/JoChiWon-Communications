export function LandingPage({onStart}:{onStart:()=>void}){
  const featureCards=[
    {title:'실제 위치 기반 입장', description:'세종 호수공원 중심으로 동네를 선택하고 현장 여부로 안전하게 입장합니다.'},
    {title:'주변 사용자 채팅', description:'동네 이웃과 간편한 대화로 만남을 주선해 보세요.'},
    {title:'캐릭터 커스터마이징', description:'나만의 아바타로 멀티버스에 들어가는 재미를 높입니다.'},
    {title:'동아리 및 모임 생성', description:'관심사 기반 소모임을 만들어 오프라인 만남을 확장해요.'},
  ];

  const flowSteps=[
    {number:'01', title:'회원가입', detail:'간단한 정보 입력으로 바로 시작하세요.'},
    {number:'02', title:'캐릭터 만들기', detail:'나만의 캐릭터를 꾸며서 입장 준비 완료.'},
    {number:'03', title:'위치 인증', detail:'현장 인증은 위치 노출 없이 안전하게 처리됩니다.'},
    {number:'04', title:'멀티버스 입장', detail:'동네 이웃과 만나고 대화를 이어가 보세요.'},
  ];

  return (
    <main className="landing landing-shell">
      <div className="landing-container">
        <header className="landing-topbar">
          <div className="landing-logo">
            <span className="brand-mark">●</span>
            <div>
              <strong>여기 사람 있음</strong>
              <span>세종 로컬 멀티버스</span>
            </div>
          </div>
          <div className="landing-actions-row">
            <button className="ghost small" onClick={onStart}>로그인</button>
            <button className="primary small" onClick={onStart}>멀티버스 입장</button>
          </div>
        </header>

        <section className="landing-hero">
          <div className="hero-copy">
            <span className="eyebrow">세종 호수공원 기반 로컬 멀티버스</span>
            <h1>오늘, 우리 동네에서<br/><em>함께할 사람을 찾아요.</em></h1>
            <p>
              멀리 가지 않아도 괜찮아요. 산책, 커피, 취미처럼 가벼운 일상부터
              이웃과 시작해 보세요.
            </p>
            <div className="hero-cta">
              <button className="primary large" onClick={onStart}>내 동네 입장하기 <span>→</span></button>
              <button className="ghost large" onClick={onStart}>동네 둘러보기</button>
            </div>
            <div className="hero-meta">
              <div>
                <strong>42명</strong>
                <span>현재 이웃이 만남을 기다리고 있어요</span>
              </div>
              <div>
                <strong>현장 인증</strong>
                <span>위치 비공개로 안전하게</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-bg-circle visual-bg-circle-1" />
            <div className="visual-bg-circle visual-bg-circle-2" />
            <div className="hero-card">
              <div className="hero-card-top">
                <small>지금 활동 중</small>
                <span>42명이 이웃을 찾고 있어요</span>
              </div>
              <div className="hero-map">
                <div className="hero-map-pin">여기</div>
                <div className="hero-map-dot dot-coffee">☕</div>
                <div className="hero-map-dot dot-photo">📸</div>
                <div className="hero-map-dot dot-walk">🚶</div>
              </div>
              <div className="hero-card-footer">
                <div>
                  <strong>호수 한 바퀴</strong>
                  <span>18:30 · 3명 참여</span>
                </div>
                <div>
                  <strong>최근 접속</strong>
                  <span>지금 바로 입장해 보세요</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="section-head">
            <small>오늘의 세종</small>
            <h2>가까운 동네부터 둘러보세요</h2>
          </div>
          <div className="feature-grid">
            {featureCards.map((item)=> (
              <article className="feature-card" key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="section-head">
            <small>이용 흐름</small>
            <h2>간단한 4단계로 시작해요</h2>
          </div>
          <div className="process-grid">
            {flowSteps.map((step)=> (
              <article className="process-card" key={step.number}>
                <div className="process-number">{step.number}</div>
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-cta-bottom">
          <div>
            <p className="cta-label">지금 바로 시작하기</p>
            <h2>세종 로컬 멀티버스에<br/><em>바로 입장해 보세요.</em></h2>
            <p>회원가입 → 캐릭터 생성 → 위치 인증 → 멀티버스 입장까지, 한 번에 경험할 수 있어요.</p>
          </div>
          <button className="primary xlarge" onClick={onStart}>서비스 시작하기</button>
        </section>
      </div>
    </main>
  );
}
