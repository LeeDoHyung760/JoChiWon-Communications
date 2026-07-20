import type { AddressSearchResult, ConversationAnalysis, ConversationMessage, PlaceCandidate, RecommendationCopy, RecommendationUser } from '../types/recommendation.js';

export interface ConversationAnalysisProvider {
  analyze(users: RecommendationUser[], messages: ConversationMessage[], mapId: string, areaName: string, userRequest?: string): Promise<ConversationAnalysis>;
  createCopy(analysis: ConversationAnalysis, places: PlaceCandidate[]): Promise<RecommendationCopy>;
}

export interface PlaceSearchProvider {
  searchKeywords(keywords: string[], options?: { longitude?: number; latitude?: number; radius?: number; size?: number }): Promise<PlaceCandidate[]>;
  searchAddress(query: string): Promise<AddressSearchResult[]>;
}

export type ExternalErrorKind = 'missing_key' | 'authentication' | 'network' | 'rate_limit' | 'response_format' | 'timeout' | 'unknown';

export class ExternalProviderError extends Error {
  constructor(public readonly provider: 'openai' | 'kakao', public readonly kind: ExternalErrorKind, public readonly details: {status?:number;providerCode?:string|number;providerMessage?:string;endpoint?:string;query?:string}={}) {
    super(`${provider} provider request failed: ${kind}`);
    this.name = 'ExternalProviderError';
  }
}
