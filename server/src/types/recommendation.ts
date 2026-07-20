import type { MatchProfile } from '../services/matching/calculateMatchScore.js';
import type { PlaceIntent } from '../services/places/placeIntentRules.js';

export interface RecommendationUser extends MatchProfile { id?: string; nickname?: string }
export interface ConversationMessage { senderId?: string; nickname?: string; message: string; createdAt?: number }
export interface ConversationAnalysis {
  sharedInterests: string[];
  preferredMood: string[];
  placeCategories: string[];
  meetingIntent: string;
  searchKeywords: string[];
  summary: string;
  activity: PlaceIntent;
  rejectedCategories: string[];
}
export interface PlaceCandidate {
  id: string; name: string; category: string; address: string; roadAddress: string;
  phone: string; externalUrl: string; longitude: number; latitude: number; distanceMeters: number; source: 'kakao' | 'mock';
  tags?: string[]; intentTypes?: PlaceIntent[]; zoneId?:string; groupFriendly?: boolean; score?: number;
}
export interface AddressSearchResult {
  address: string; roadAddress: string; buildingName: string; postalCode: string;
  longitude: number; latitude: number; source: 'kakao';
}
export interface RecommendationCopy { message: string; recommendations: Array<{placeId:string;reason:string}> }
