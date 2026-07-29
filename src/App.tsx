import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
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

const CharacterTestPage=lazy(()=>import('./pages/CharacterTestPage').then(module=>({default:module.CharacterTestPage})));
const CommunityPage=lazy(()=>import('./pages/CommunityPage').then(module=>({default:module.CommunityPage})));
const CreateProfilePage=lazy(()=>import('./pages/CreateProfilePage').then(module=>({default:module.CreateProfilePage})));
const loadGamePage=()=>import('./pages/GamePage').then(module=>({default:module.GamePage}));
const GamePage=lazy(loadGamePage);

function DeferredPage({children}:{children:React.ReactNode}){
  return <Suspense fallback={<main className="deferred-page-loading" role="status"><span>🌿</span><b>페이지를 준비하고 있어요</b></main>}>{children}</Suspense>;
}

function ExperienceLoading(){
  const tasks=['입장 위치 확인','호수공원 산책로 불러오기','캐릭터 배치','축제·공연 체험 연결','주변 사용자 연결'];
  return <main className="experience-entry-loading" role="status" aria-live="polite">
    <div className="experience-entry-brand"><span>🧑🏻‍🌾</span><div><b>세종한바퀴</b><small>세종 소통형 체험 공간</small></div></div>
    <div className="experience-entry-center">
      <i/>
      <span>세종호수공원</span>
      <h1>세종호수공원으로 이동중...</h1>
      <p>호수 산책로와 다양한 취향 체험을 준비하고 있어요.</p>
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
    });

    if (completedMembership) {
      setPage('game');
    } else if (
      journey.onboardingStep === 'terms'
    ) {
      setPage('terms');
    } else {
      setPage('create');
    }

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname,
    );
  }, []);

  const startExperience = () => {
    setPage(
      canExperience
        ? 'game'
        : 'login',
    );
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

    setJourney({
      authenticated: true,
      membershipComplete: true,
      onboardingStep: 'character',
    });

    setPage('complete');
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
        onLogin={openLogin}
        onUserClick={() =>
          setPage('account')
        }
        actionLabel={
          canExperience
            ? '체험 시작하기'
            : '로그인 후 체험하기'
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
    <Suspense fallback={<ExperienceLoading/>}>
      <GamePage
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
