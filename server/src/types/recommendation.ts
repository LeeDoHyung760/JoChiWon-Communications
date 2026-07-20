import type { MatchProfile } from '../services/matching/calculateMatchScore.js';

export interface RecommendationUser extends MatchProfile { id?: string; nickname?: string }
export interface ConversationMessage { senderId?: string; nickname?: string; message: string; createdAt?: number }
export interface ConversationAnalysis {
  sharedInterests: string[];
  preferredMood: string[];
  placeCategories: string[];
  meetingIntent: string;
  searchKeywords: string[];
}
export interface PlaceCandidate {
  id: string; placeName: string; categoryName: string; addressName: string; roadAddressName: string;
  phone: string; placeUrl: string; x: string; y: string; distance: string;
  tags?: string[]; groupFriendly?: boolean; score?: number;
}
export interface RecommendationCopy { message: string; recommendations: Array<{placeId:string;reason:string}> }
