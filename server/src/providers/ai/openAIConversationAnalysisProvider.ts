import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { env } from '../../config/env.js';
import type { ConversationAnalysis, ConversationMessage, PlaceCandidate, RecommendationCopy, RecommendationUser } from '../../types/recommendation.js';
import { ExternalProviderError, type ConversationAnalysisProvider, type ExternalErrorKind } from '../types.js';
import { getOpenAIClient } from '../../services/ai/openaiClient.js';

const analysisSchema = z.object({
  activity:z.enum(['movie','boardgame','cafe','food','walk','leisure','other']),
  sharedInterests: z.array(z.string()).max(10), preferredMood: z.array(z.string()).max(5),
  placeCategories: z.array(z.string()).min(1).max(5), meetingIntent: z.string().min(1).max(200),
  rejectedCategories:z.array(z.string()).max(5),searchKeywords: z.array(z.string()).min(1).max(5), summary: z.string().min(1).max(300),
});
const copySchema = z.object({ message: z.string().min(1).max(500), recommendations: z.array(z.object({ placeId: z.string(), reason: z.string().min(1).max(300) })) });

function classify(error: unknown): ExternalErrorKind {
  if (error instanceof OpenAI.AuthenticationError) return 'authentication';
  if (error instanceof OpenAI.RateLimitError) return 'rate_limit';
  if (error instanceof OpenAI.APIConnectionTimeoutError) return 'timeout';
  if (error instanceof OpenAI.APIConnectionError) return 'network';
  if (error instanceof SyntaxError || error instanceof z.ZodError) return 'response_format';
  if(error instanceof Error&&error.name.includes('FinishReason'))return 'response_format';
  if(error instanceof OpenAI.BadRequestError)return 'response_format';
  return 'unknown';
}

export class OpenAIConversationAnalysisProvider implements ConversationAnalysisProvider {
  private readonly client: OpenAI;
  constructor() {
    if (!env.OPENAI_API_KEY) throw new ExternalProviderError('openai', 'missing_key');
    if (!env.OPENAI_MODEL) throw new ExternalProviderError('openai', 'missing_key', { providerMessage: 'OPENAI_MODEL_NOT_CONFIGURED' });
    this.client = getOpenAIClient();
  }
  async analyze(users: RecommendationUser[], messages: ConversationMessage[], mapId: string, areaName: string, userRequest?: string): Promise<ConversationAnalysis> {
    const safeUsers = users.map(({ interests, usagePurposes, meetingPurposes, preferredPlaceCategories,experienceRecords },index) => ({ participant:index===0?'participantA':'participantB', signupInterests:interests,placePreference:usagePurposes ?? meetingPurposes,experienceRecords,preferredPlaceCategories }));
    const safeMessages = messages.slice(-env.MAX_ANALYSIS_MESSAGES).map(({ senderId,message }) => ({ role:senderId&&senderId===users[1]?.id?'participantB':'participantA', content:message.slice(0,500) }));
    try {
      const result = await this.client.chat.completions.parse({ model: env.OPENAI_MODEL!, max_completion_tokens:1500, response_format: zodResponseFormat(analysisSchema, 'conversation_analysis'), messages: [
        { role: 'system', content: '두 사용자의 대화에서 최종 합의된 활동을 추출하세요. 추천 취향을 판단할 때는 실제 맵에서 쌓인 experienceRecords를 signupInterests보다 우선하세요. activity는 movie,boardgame,cafe,food,walk,leisure,other 중 하나입니다. 보드게임 카페는 반드시 boardgame입니다. 음식점/카페/보드게임/영화/산책/여가처럼 구체적인 장소 활동이 없으면 반드시 other입니다. 사용자 프로필만으로 카페를 추측하지 마세요. 조용함, 차분함 같은 분위기 표현은 preferredMood에 보존하세요. 실제 상호명은 만들지 마세요.' },
        { role: 'user', content: JSON.stringify({ roomId:mapId,zoneName:areaName,userRequest:userRequest?.slice(0,300),participants:safeUsers,recentMessages:safeMessages }) },
      ] });
      const parsed = result.choices[0]?.message.parsed;
      if (!parsed) throw new ExternalProviderError('openai', 'response_format');
      return parsed;
    } catch (error) { if (error instanceof ExternalProviderError) throw error; throw new ExternalProviderError('openai', classify(error)); }
  }
  async createCopy(analysis: ConversationAnalysis, places: PlaceCandidate[]): Promise<RecommendationCopy> {
    const safePlaces = places.map(({ id, name, category, address, roadAddress }) => ({ id, name, category, address, roadAddress }));
    try {
      const result = await this.client.chat.completions.parse({ model: env.OPENAI_MODEL!, max_completion_tokens:600, response_format: zodResponseFormat(copySchema, 'recommendation_copy'), messages: [
        { role: 'system', content: '친근한 존댓말로 추천 이유를 작성하세요. 제공된 장소와 placeId만 사용하고 확인되지 않은 사실을 만들지 마세요.' },
        { role: 'user', content: JSON.stringify({ analysis, places: safePlaces }) },
      ] });
      const parsed = result.choices[0]?.message.parsed;
      if (!parsed || parsed.recommendations.some((item) => !places.some((place) => place.id === item.placeId))) throw new ExternalProviderError('openai', 'response_format');
      return parsed;
    } catch (error) { if (error instanceof ExternalProviderError) throw error; throw new ExternalProviderError('openai', classify(error)); }
  }
}
