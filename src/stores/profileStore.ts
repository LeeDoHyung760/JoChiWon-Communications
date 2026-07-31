import type { UserProfile } from '../types';
export const defaultProfile:UserProfile={nickname:'',mbti:'',interests:[],usagePurposes:[],preferredPlaceCategories:[],recordVisibility:'public',chatEnabled:true,model:'girl1',character:{hair:'hair-original',topStyle:'style1',bottomStyle:'style1',shoesStyle:'style1',face:'face-original',top:'top-original',topLayer:'top-layer-original',bottom:'bottom-original',shoes:'shoes-original',accessory:'accessory-none'}};
export const PROFILE_KEY='yeogi-profile';
export type OnboardingStep='terms'|'profile'|'character';
export interface UserJourney{authenticated:boolean;membershipComplete:boolean;onboardingStep:OnboardingStep}
export const defaultUserJourney:UserJourney={authenticated:false,membershipComplete:false,onboardingStep:'terms'};
export const USER_JOURNEY_KEY='yeogi-user-journey';
