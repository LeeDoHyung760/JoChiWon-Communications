import { useCallback, useState } from 'react';

import { CharacterTestPage } from './pages/CharacterTestPage';
import { CommunityPage } from './pages/CommunityPage';
import { CreateProfilePage } from './pages/CreateProfilePage';
import { GamePage } from './pages/GamePage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupCompletePage } from './pages/SignupCompletePage';
import { TermsPage } from './pages/TermsPage';

import { useLocalStorage } from './hooks/useLocalStorage';

import {
  defaultProfile,
  defaultUserJourney,
  PROFILE_KEY,
  USER_JOURNEY_KEY,
  type OnboardingStep,
  type UserJourney,
} from './stores/profileStore';

import type { UserProfile } from './types';

type Page =
  | 'landing'
  | 'login'
  | 'terms'
  | 'create'
  | 'complete'
  | 'account'
  | 'game'
  | 'community';

export default function App() {
  const [page, setPage] = useState<Page>('landing');

  const [storedProfile, setProfile] = useLocalStorage<UserProfile>(
    PROFILE_KEY,
    defaultProfile,
  );

  const [journey, setJourney] = useLocalStorage<UserJourney>(
    USER_JOURNEY_KEY,
    defaultUserJourney,
  );

  const profile: UserProfile = {
    ...defaultProfile,
    ...storedProfile,
    interests: storedProfile.interests ?? [],
    usagePurposes: storedProfile.usagePurposes ?? [],
    preferredPlaceCategories: storedProfile.preferredPlaceCategories ?? [],
    recordVisibility: storedProfile.recordVisibility ?? 'public',
    chatEnabled: storedProfile.chatEnabled ?? true,
  };

  const legacyMember =
    profile.nickname.trim().length >= 2 &&
    profile.interests.length > 0;

  const membershipComplete =
    journey.membershipComplete || legacyMember;

  const startFromLanding = () => {
    if (journey.authenticated && membershipComplete) {
      setPage('game');
      return;
    }

    setPage('login');
  };

  const kakaoLogin = () => {
    const next = {
      ...journey,
      authenticated: true,
      membershipComplete,
    };

    setJourney(next);

    if (membershipComplete) {
      setPage('game');
      return;
    }

    setPage(
      next.onboardingStep === 'terms'
        ? 'terms'
        : 'create',
    );
  };

  const moveToStep = (
    onboardingStep: OnboardingStep,
  ) => {
    setJourney({
      ...journey,
      authenticated: true,
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
        authenticated: true,
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
    location.pathname === '/dev/character-test'
  ) {
    return <CharacterTestPage />;
  }

  if (page === 'landing') {
    return (
      <LandingPage
        onStart={startFromLanding}
        onUserClick={() =>
          setPage('account')
        }
        actionLabel="체험 시작하기"
        userName={
          journey.authenticated &&
          membershipComplete
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
      <CreateProfilePage
        initial={profile}
        initialStep={
          journey.onboardingStep ===
          'character'
            ? 2
            : 1
        }
        onProgress={saveProgress}
        onComplete={finishSignup}
      />
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
      <CreateProfilePage
        initial={profile}
        editMode
        onCancel={() =>
          setPage('landing')
        }
        onWithdraw={() => {
          localStorage.removeItem(
            'sejong-lake-interest-profile-v1',
          );

          setProfile(defaultProfile);
          setJourney(defaultUserJourney);
          setPage('landing');
        }}
        onLogout={() => {
          setJourney({
            ...journey,
            authenticated: false,
          });

          setPage('landing');
        }}
        onComplete={(updated) => {
          setProfile(updated);
          setPage('landing');
        }}
      />
    );
  }

  if (page === 'community') {
    return (
      <CommunityPage
        profile={profile}
        onBack={() =>
          setPage('game')
        }
      />
    );
  }

  return (
    <GamePage
      profile={profile}
      onExit={() =>
        setPage('landing')
      }
      onEditProfile={() =>
        setPage('account')
      }
      onOpenCommunity={() =>
        setPage('community')
      }
    />
  );
}