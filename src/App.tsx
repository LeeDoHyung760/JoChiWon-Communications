import { useCallback, useState } from 'react';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { TermsPage } from './pages/TermsPage';
import { LocationVerificationPage } from './pages/LocationVerificationPage';
import { CreateProfilePage } from './pages/CreateProfilePage';
import { SignupCompletePage } from './pages/SignupCompletePage';
import { GamePage } from './pages/GamePage';
import { CharacterTestPage } from './pages/CharacterTestPage';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  defaultProfile,
  defaultUserJourney,
  PROFILE_KEY,
  USER_JOURNEY_KEY,
  type OnboardingStep,
  type UserJourney,
  type WorldAccessMode
} from './stores/profileStore';
import type { UserProfile } from './types';

type Page = 'landing' | 'login' | 'terms' | 'verify' | 'create' | 'complete' | 'account' | 'game';

export default function App() {
  const [page, setPage] = useState<Page>('landing');
  const [storedProfile, setProfile] = useLocalStorage<UserProfile>(PROFILE_KEY, defaultProfile);
  const [journey, setJourney] = useLocalStorage<UserJourney>(USER_JOURNEY_KEY, defaultUserJourney);
  const profile: UserProfile = {
    ...defaultProfile,
    ...storedProfile,
    interests: storedProfile.interests ?? [],
    usagePurposes: storedProfile.usagePurposes ?? [],
    preferredPlaceCategories: storedProfile.preferredPlaceCategories ?? []
  };
  const legacyMember = profile.nickname.trim().length >= 2 && profile.interests.length > 0 && profile.usagePurposes.length > 0;
  const membershipComplete = journey.membershipComplete || legacyMember;
  const accessMode: WorldAccessMode = journey.accessMode ?? 'unverified';
  const onboardingInProgress = journey.authenticated && !membershipComplete;

  const continueOnboarding = () => {
    setPage(journey.onboardingStep === 'terms' ? 'terms' : journey.onboardingStep === 'verification' ? 'verify' : 'create');
  };
  const startFromLanding = () => {
    if (journey.authenticated && membershipComplete) return setPage(accessMode === 'unverified' ? 'verify' : 'game');
    if (onboardingInProgress) return continueOnboarding();
    setPage('login');
  };
  const kakaoLogin = () => {
    const next = {...journey, authenticated: true, membershipComplete, accessMode};
    setJourney(next);
    if (membershipComplete) setPage(accessMode === 'unverified' ? 'verify' : 'game');
    else setPage(next.onboardingStep === 'terms' ? 'terms' : next.onboardingStep === 'verification' ? 'verify' : 'create');
  };
  const moveToStep = (onboardingStep: OnboardingStep) => {
    setJourney({...journey, authenticated: true, onboardingStep});
    setPage(onboardingStep === 'terms' ? 'terms' : onboardingStep === 'verification' ? 'verify' : 'create');
  };
  const finishVerification = (mode: Exclude<WorldAccessMode, 'unverified'>) => {
    if (membershipComplete) {
      setJourney({...journey, authenticated: true, membershipComplete: true, accessMode: mode});
      setPage('game');
    } else {
      setJourney({...journey, authenticated: true, accessMode: mode, onboardingStep: 'profile'});
      setPage('create');
    }
  };
  const saveProgress = useCallback((step: 1 | 2, draft: UserProfile) => {
    setProfile(draft);
    setJourney({...journey, authenticated: true, onboardingStep: step === 1 ? 'profile' : 'character'});
  }, [journey, setJourney, setProfile]);
  const finishSignup = (completedProfile: UserProfile) => {
    setProfile(completedProfile);
    setJourney({authenticated: true, membershipComplete: true, onboardingStep: 'character', accessMode});
    setPage('complete');
  };

  if (import.meta.env.DEV && location.pathname === '/dev/character-test') return <CharacterTestPage />;
  if (page === 'landing') {
    return (
      <LandingPage
        onStart={startFromLanding}
        onUserClick={() => setPage('account')}
        actionLabel="체험 시작하기"
        userName={journey.authenticated && membershipComplete ? profile.nickname : undefined}
      />
    );
  }
  if (page === 'login') return <LoginPage onBack={() => setPage('landing')} onLogin={kakaoLogin} />;
  if (page === 'terms') return <TermsPage onBack={() => setPage('landing')} onComplete={() => moveToStep('verification')} />;
  if (page === 'verify') return <LocationVerificationPage onComplete={finishVerification} />;
  if (page === 'create') {
    return (
      <CreateProfilePage
        initial={profile}
        initialStep={journey.onboardingStep === 'character' ? 2 : 1}
        onProgress={saveProgress}
        onComplete={finishSignup}
      />
    );
  }
  if (page === 'complete') return <SignupCompletePage profile={profile} onEnter={() => setPage('game')} />;
  if (page === 'account') {
    return (
      <CreateProfilePage
        initial={profile}
        editMode
        onCancel={() => setPage('landing')}
        onLogout={() => {
          setJourney({...journey, authenticated: false});
          setPage('landing');
        }}
        onComplete={updated => {
          setProfile(updated);
          setPage('landing');
        }}
      />
    );
  }
  return <GamePage profile={profile} accessMode={accessMode === 'sejong' ? 'sejong' : 'experience'} onExit={() => setPage('landing')} />;
}
