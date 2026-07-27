import { env } from '../../config/env.js';
import { createConversationAnalysisProvider } from '../../providers/providerFactory.js';
import type { ConversationMessage, RecommendationUser } from '../../types/recommendation.js';

const provider = createConversationAnalysisProvider();
export const analyzeConversation = (users: RecommendationUser[], messages: ConversationMessage[], mapId: string, areaName = env.DEFAULT_SEARCH_REGION, userRequest?: string) => provider.analyze(users, messages, mapId, areaName, userRequest);
