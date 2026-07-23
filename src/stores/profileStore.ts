import type { UserProfile } from '../types';
export const defaultProfile:UserProfile={nickname:'',mbti:'ENFP',interests:[],usagePurposes:[],preferredPlaceCategories:[],model:'chungnyeong',character:{hair:'hair-brown',face:'face-smile',top:'top-green',bottom:'bottom-navy'}};
export const PROFILE_KEY='yeogi-profile';
export type OnboardingStep='terms'|'verification'|'profile'|'character';
export type WorldAccessMode='unverified'|'experience'|'sejong';
export interface UserJourney{authenticated:boolean;membershipComplete:boolean;onboardingStep:OnboardingStep;accessMode:WorldAccessMode}
export const defaultUserJourney:UserJourney={authenticated:false,membershipComplete:false,onboardingStep:'terms',accessMode:'unverified'};
export const USER_JOURNEY_KEY='yeogi-user-journey';
