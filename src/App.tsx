import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupCompletePage } from './pages/SignupCompletePage';
import { TermsPage } from './pages/TermsPage';

import { useLocalStorage } from './hooks/useLocalStorage';
import { API_BASE_URL } from './config/api';
import { clearAllAccountData } from './services/accountData';

import {
  defaultProfile,
  defaultUserJourney,
  PROFILE_KEY,
  USER_JOURNEY_KEY,
  type OnboardingStep,
  type UserJourney,
} from './stores/profileStore';

import type { UserProfile } from './types';
import type { GameReturnState } from './game/gameReturnState';
import type { MapId } from '../shared/socket-events';
import { loadAccountProfile, saveAccountProfile } from './services/accountProfile';

const CharacterTestPage=lazy(()=>import('./pages/CharacterTestPage').then(module=>({default:module.CharacterTestPage})));
const CommunityPage=lazy(()=>import('./pages/CommunityPage').then(module=>({default:module.CommunityPage})));
const CreateProfilePage=lazy(()=>import('./pages/CreateProfilePage').then(module=>({default:module.CreateProfilePage})));
const loadGamePage=()=>import('./pages/GamePage').then(module=>({default:module.GamePage}));
const GamePage=lazy(loadGamePage);

class DeferredPageErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};

  static getDerivedStateFromError(){
    return {failed:true};
  }

  componentDidCatch(error:Error,errorInfo:ErrorInfo){
    console.error('[deferred page load failed]',error,errorInfo);
  }

  render(){
    if(this.state.failed){
      return <main className="deferred-page-loading" role="alert">
        <span>⚠️</span>
        <b>화면을 불러오지 못했어요.</b>
        <button type="button" onClick={()=>window.location.reload()}>다시 불러오기</button>
      </main>;
    }
    return this.props.children;
  }
}

function DeferredPage({children}:{children:React.ReactNode}){
  return <DeferredPageErrorBoundary><Suspense fallback={<main className="deferred-page-loading" role="status"><span>🌿</span><b>페이지를 준비하고 있어요</b></main>}>{children}</Suspense></DeferredPageErrorBoundary>;
}

function ExperienceLoading({mapId='town'}:{mapId?:MapId}){
  const government=mapId==='government';
  const place=government?'정부청사':'세종호수공원';
  const tasks=government
    ?['정부청사 입구 확인','정부청사 불러오기','캐릭터 배치','공동 계획 공간 연결','주변 사용자 연결']
    :['입장 위치 확인','호수공원 산책로 불러오기','캐릭터 배치','축제·공연 체험 연결','주변 사용자 연결'];
  return <main className="experience-entry-loading" role="status" aria-live="polite">
    <div className="experience-entry-brand"><span>🧑🏻‍🌾</span><div><b>세종한바퀴</b><small>세종 소통형 체험 공간</small></div></div>
    <div className="experience-entry-center">
      <i/>
      <span>{place}</span>
      <h1>{place}로 이동중...</h1>
      <p>{government?'함께 방문할 장소와 코스를 정할 공간을 준비하고 있어요.':'호수 산책로와 다양한 취향 체험을 준비하고 있어요.'}</p>
      <div className="experience-entry-tasks">{tasks.map((task,index)=><span key={task}>{index===0?'✓':'●'} {task}</span>)}</div>
      <div className="experience-entry-progress"><em/></div>
    </div>
  </main>;
}

type Page =
  | 'landing'
  | 'login'
  | 'terms'
  | 'create'
  | 'complete'
  | 'account'
  | 'game'
  | 'community';

const KAKAO_LOGIN_URL = `${API_BASE_URL}/auth/kakao`;
const DEMO_LOGIN_URL = `${API_BASE_URL}/auth/demo`;

const KAKAO_USER_ID_KEY =
  'jochiwon-kakao-user-id';

const KAKAO_PROFILE_IMAGE_KEY =
  'jochiwon-kakao-profile-image';

export default function App() {
  const [page, setPage] =
    useState<Page>('landing');
  const [gameReturnState,setGameReturnState]=useState<GameReturnState>();

  const [
    storedProfile,
    setProfile,
  ] = useLocalStorage<UserProfile>(
    PROFILE_KEY,
    defaultProfile,
  );

  const [
    journey,
    setJourney,
  ] = useLocalStorage<UserJourney>(
    USER_JOURNEY_KEY,
    defaultUserJourney,
  );

  const profile: UserProfile = {
    ...defaultProfile,
    ...storedProfile,

    interests:
      storedProfile.interests ?? [],

    usagePurposes:
      storedProfile.usagePurposes ?? [],

    preferredPlaceCategories:
      storedProfile.preferredPlaceCategories ?? [],

    recordVisibility:
      storedProfile.recordVisibility ??
      'public',

    chatEnabled:
      storedProfile.chatEnabled ?? true,
  };

  // A nickname and interests are only an onboarding draft. Login becomes
  // complete exclusively after the character save action finishes signup.
  const membershipComplete =
    journey.membershipComplete;
  const hasLoginIdentity =
    Boolean(
      localStorage
        .getItem(KAKAO_USER_ID_KEY)
        ?.trim(),
    );
  const canExperience =
    journey.authenticated &&
    membershipComplete &&
    hasLoginIdentity;

  useEffect(()=>{
    if(page!=='landing')return;
    const timer=window.setTimeout(()=>{
      void loadGamePage().catch(()=>undefined);
    },600);
    return()=>window.clearTimeout(timer);
  },[page]);

  useEffect(() => {
    if (
      journey.authenticated &&
      (
        !journey.membershipComplete ||
        !hasLoginIdentity
      )
    ) {
      setJourney({
        ...journey,
        authenticated: false,
      });
    }
  }, [
    journey,
    hasLoginIdentity,
    setJourney,
  ]);

  useEffect(() => {
    const searchParams =
      new URLSearchParams(
        window.location.search,
      );

    const loginResult =
      searchParams.get('login');

    if (loginResult !== 'success') {
      return;
    }

    const userId =
      searchParams.get('userId')?.trim() ??
      '';

    const nickname =
      searchParams.get('nickname')?.trim() ??
      '';

    const profileImage =
      searchParams
        .get('profileImage')
        ?.trim() ?? '';

    if (userId) {
      localStorage.setItem(
        KAKAO_USER_ID_KEY,
        userId,
      );
    }

    if (profileImage) {
      localStorage.setItem(
        KAKAO_PROFILE_IMAGE_KEY,
        profileImage,
      );
    } else {
      localStorage.removeItem(
        KAKAO_PROFILE_IMAGE_KEY,
      );
    }

    const nextProfile: UserProfile = {
      ...profile,
      nickname:
        nickname ||
        profile.nickname ||
        '카카오 사용자',
    };

    const completedMembership =
      journey.membershipComplete;

    setProfile(nextProfile);

    setJourney({
      ...journey,
      authenticated:
        completedMembership,
      membershipComplete:
        completedMembership,
      onboardingStep:
        completedMembership
          ? journey.onboardingStep
          : 'profile',
    });

    if (completedMembership) {
      setPage('game');
    } else {
      setPage('create');
    }

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname,
    );
  }, []);

  useEffect(() => {
    if (!hasLoginIdentity) return;
    void loadAccountProfile().then(saved => {
      if (saved) setProfile({ ...defaultProfile, ...saved });
    }).catch(() => undefined);
  }, [hasLoginIdentity, setProfile]);

  const startExperience = () => {
    setPage(
      canExperience
        ? 'game'
        : 'login',
    );
  };

  const enterWorld = (mapId:MapId) => {
    const entryPoints:Partial<Record<MapId,GameReturnState>>={
      town:{mapId:'town',x:1870,z:1180,yaw:2.1},
      'arts-center':{mapId:'arts-center',x:1200,z:370,yaw:0},
      'festival-experience':{mapId:'festival-experience',x:1200,z:1530,yaw:Math.PI},
      'food-experience':{mapId:'food-experience',x:1200,z:1530,yaw:Math.PI},
      'club-street-festival':{mapId:'club-street-festival',x:1200,z:1510,yaw:Math.PI},
      'bear-tree-park':{mapId:'bear-tree-park',x:1200,z:1610,yaw:Math.PI},
      'bear-play-zone':{mapId:'bear-play-zone',x:1200,z:1570,yaw:Math.PI},
      garden:{mapId:'garden',x:1200,z:1180,yaw:Math.PI},
      campus:{mapId:'campus',x:1200,z:1500,yaw:Math.PI},
      'student-hall':{mapId:'student-hall',x:1200,z:1510,yaw:Math.PI},
      'recruitment-center':{mapId:'recruitment-center',x:1200,z:1535,yaw:Math.PI},
      'project-room':{mapId:'project-room',x:1200,z:1550,yaw:Math.PI},
      government:{mapId:'government',x:1200,z:1500,yaw:Math.PI},
      'government-central-plaza':{mapId:'government-central-plaza',x:1200,z:1530,yaw:0},
      'government-observatory':{mapId:'government-observatory',x:1200,z:1380,yaw:Math.PI},
      'sejong-smart-city':{mapId:'sejong-smart-city',x:1200,z:1580,yaw:Math.PI},
    };
    setGameReturnState(entryPoints[mapId]);
    setPage('game');
  };

  const openLogin = () => {
    setPage('login');
  };

  const kakaoLogin = () => {
    window.location.href =
      KAKAO_LOGIN_URL;
  };

  const demoLogin = () => {
    window.location.href =
      DEMO_LOGIN_URL;
  };

  const moveToStep = (
    onboardingStep: OnboardingStep,
  ) => {
    setJourney({
      ...journey,
      authenticated: false,
      membershipComplete: false,
      onboardingStep,
    });

    setPage(
      onboardingStep === 'terms'
        ? 'terms'
        : 'create',
    );
  };

  const saveProgress = useCallback(
    (
      step: 1 | 2,
      draft: UserProfile,
    ) => {
      setProfile(draft);

      setJourney({
        ...journey,
        authenticated: false,
        membershipComplete: false,
        onboardingStep:
          step === 1
            ? 'profile'
            : 'character',
      });
    },
    [
      journey,
      setJourney,
      setProfile,
    ],
  );

  const finishSignup = (
    completedProfile: UserProfile,
  ) => {
    setProfile(completedProfile);
    localStorage.removeItem('sejong-lake-tutorial-hidden-v1');
    void saveAccountProfile(completedProfile).catch(error => console.warn('[account profile save failed]', error instanceof Error ? error.message : 'unknown'));

    setJourney({
      authenticated: true,
      membershipComplete: true,
      onboardingStep: 'character',
    });

    setGameReturnState(undefined);
    setPage('game');
  };

  if (
    import.meta.env.DEV &&
    location.pathname ===
      '/dev/character-test'
  ) {
    return <DeferredPage><CharacterTestPage /></DeferredPage>;
  }

  if (page === 'landing') {
    return (
      <LandingPage
        onStart={startExperience}
        onEnterWorld={enterWorld}
        onLogin={openLogin}
        onUserClick={() =>
          setPage('account')
        }
        actionLabel={
          canExperience
            ? '세종 월드 입장하기'
            : '로그인하고 월드 입장'
        }
        userName={
          canExperience
            ? profile.nickname
            : undefined
        }
      />
    );
  }

  if (page === 'login') {
    return (
      <LoginPage
        onBack={() =>
          setPage('landing')
        }
        onLogin={kakaoLogin}
        onDemoLogin={demoLogin}
      />
    );
  }

  if (
    (
      page === 'game' ||
      page === 'community' ||
      page === 'account'
    ) &&
    !canExperience
  ) {
    return (
      <LoginPage
        onBack={() =>
          setPage('landing')
        }
        onLogin={kakaoLogin}
        onDemoLogin={demoLogin}
      />
    );
  }

  if (page === 'terms') {
    return (
      <TermsPage
        onBack={() =>
          setPage('login')
        }
        onComplete={() =>
          moveToStep('profile')
        }
      />
    );
  }

  if (page === 'create') {
    return (
      <DeferredPage><CreateProfilePage
        initial={profile}
        initialStep={
          journey.onboardingStep ===
          'character'
            ? 2
            : 1
        }
        onProgress={saveProgress}
        onCancel={() => setPage('landing')}
        onComplete={finishSignup}
      /></DeferredPage>
    );
  }

  if (page === 'complete') {
    return (
      <SignupCompletePage
        profile={profile}
        onEnter={() =>
          setPage('game')
        }
      />
    );
  }

  if (page === 'account') {
    return (
      <DeferredPage><CreateProfilePage
        initial={profile}
        editMode
        cancelLabel={gameReturnState?'맵으로 이동':'메인 이동'}
        onCancel={() =>
          setPage(gameReturnState?'game':'landing')
        }
        onWithdraw={() => {
          clearAllAccountData(localStorage);
          setGameReturnState(undefined);
          setProfile(defaultProfile);
          setJourney(defaultUserJourney);
          setPage('landing');
        }}
        onLogout={() => {
          setGameReturnState(undefined);
          localStorage.removeItem(
            KAKAO_USER_ID_KEY,
          );

          localStorage.removeItem(
            KAKAO_PROFILE_IMAGE_KEY,
          );

          setJourney({
            ...journey,
            authenticated: false,
          });

          setPage('landing');
        }}
        onComplete={(
          updatedProfile,
        ) => {
          setProfile(updatedProfile);
          void saveAccountProfile(updatedProfile).catch(error => console.warn('[account profile save failed]', error instanceof Error ? error.message : 'unknown'));
          setPage(gameReturnState?'game':'landing');
        }}
      /></DeferredPage>
    );
  }

  if (page === 'community') {
    return (
      <DeferredPage><CommunityPage
        profile={profile}
        onBack={() => {
          setGameReturnState(current=>current?.mapId==='campus'?current:{mapId:'campus',x:1200,z:1500,yaw:Math.PI});
          setPage('game');
        }}
      /></DeferredPage>
    );
  }

  return (
    <Suspense fallback={<ExperienceLoading mapId={gameReturnState?.mapId}/>}>
      <GamePage
        key={gameReturnState?.mapId??'default-world'}
        profile={
          profile.nickname.trim()
            ? profile
            : {
                ...profile,
                nickname: '체험 사용자',
              }
        }
        returnState={gameReturnState}
        onExit={() => {
          setGameReturnState(undefined);
          setPage('landing');
        }}
        onEditProfile={state => {
          setGameReturnState(state);
          setPage('account');
        }}
        onOpenCommunity={state => {
          setGameReturnState(state);
          setPage('community');
        }}
      />
    </Suspense>
  );
}
