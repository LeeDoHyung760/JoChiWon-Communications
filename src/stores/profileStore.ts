import type { UserProfile } from '../types';
export const defaultProfile:UserProfile={nickname:'',mbti:'ENFP',interests:[],usagePurposes:[],preferredPlaceCategories:[],model:'chungnyeong',character:{hair:'hair-brown',face:'face-smile',top:'top-green',bottom:'bottom-navy',shoes:'shoes-black'}};
export const PROFILE_KEY='yeogi-profile';
export type OnboardingStep='terms'|'profile'|'character';
export interface UserJourney{authenticated:boolean;membershipComplete:boolean;onboardingStep:OnboardingStep}
export const defaultUserJourney:UserJourney={authenticated:false,membershipComplete:false,onboardingStep:'terms'};
export const USER_JOURNEY_KEY='yeogi-user-journey';
