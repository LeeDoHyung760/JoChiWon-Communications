import { createConversationAnalysisProvider } from '../../providers/providerFactory.js';
import type { ConversationAnalysis, PlaceCandidate } from '../../types/recommendation.js';

const provider = createConversationAnalysisProvider();
export const createRecommendationCopy = (analysis: ConversationAnalysis, places: PlaceCandidate[]) => provider.createCopy(analysis, places);
