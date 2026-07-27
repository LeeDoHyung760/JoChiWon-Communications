import { env } from '../config/env.js';
import type { ConversationAnalysis, ConversationMessage, PlaceCandidate, RecommendationCopy, RecommendationUser } from '../types/recommendation.js';
import { MockConversationAnalysisProvider } from './ai/mockConversationAnalysisProvider.js';
import { OpenAIConversationAnalysisProvider } from './ai/openAIConversationAnalysisProvider.js';
import { KakaoPlaceProvider } from './places/kakaoPlaceProvider.js';
import { MockPlaceProvider } from './places/mockPlaceProvider.js';
import { ExternalProviderError, type ConversationAnalysisProvider, type PlaceSearchProvider } from './types.js';
import { recordProviderFailure,recordProviderSuccess } from './providerDiagnostics.js';

export const providerStatus = {
  ai: { requested: env.AI_PROVIDER, active: (env.AI_PROVIDER === 'mock' || (env.AI_PROVIDER === 'auto' && !env.OPENAI_API_KEY) || (env.AI_PROVIDER === 'openai' && !env.OPENAI_API_KEY && env.ALLOW_MOCK_FALLBACK) ? 'mock' : 'openai') as 'mock' | 'openai', configured: Boolean(env.OPENAI_API_KEY) },
  place: { requested: env.PLACE_PROVIDER, active: (env.PLACE_PROVIDER === 'mock' || (env.PLACE_PROVIDER === 'auto' && !env.KAKAO_REST_API_KEY) || (env.PLACE_PROVIDER === 'kakao' && !env.KAKAO_REST_API_KEY && env.ALLOW_MOCK_FALLBACK) ? 'mock' : 'kakao') as 'mock' | 'kakao', configured: Boolean(env.KAKAO_REST_API_KEY) },
};

const safeWarning = (provider: 'OpenAI'|'Kakao', error: unknown) => {
  const detail=error instanceof ExternalProviderError?error:undefined;
  recordProviderFailure(provider==='OpenAI'?'ai':'place',detail?.kind??'unknown',detail?.details??{});
  if(provider==='Kakao')console.warn('[Provider] Kakao request failed',{status:detail?.details.status,code:detail?.details.providerCode,message:detail?.details.providerMessage,endpoint:detail?.details.endpoint,query:detail?.details.query,fallback:true});
  else console.warn('[Provider] OpenAI request failed',{category:detail?.kind??'unknown',fallback:true});
};

export function createConversationAnalysisProvider(): ConversationAnalysisProvider {
  const mock = new MockConversationAnalysisProvider();
  if (providerStatus.ai.active === 'mock') {
    if (env.AI_PROVIDER === 'openai' && !env.OPENAI_API_KEY) console.warn('[Config] OpenAI was requested without a key; using mock fallback');
    return mock;
  }
  const real = new OpenAIConversationAnalysisProvider();
  if (!env.ALLOW_MOCK_FALLBACK) return real;
  return { async analyze(...args: [RecommendationUser[], ConversationMessage[], string, string, string?]) { try { const value=await real.analyze(...args);recordProviderSuccess('ai');return value; } catch (error) { safeWarning('OpenAI', error); return mock.analyze(...args); } }, async createCopy(...args: [ConversationAnalysis, PlaceCandidate[]]): Promise<RecommendationCopy> { try { const value=await real.createCopy(...args);recordProviderSuccess('ai');return value; } catch (error) { safeWarning('OpenAI', error); return mock.createCopy(...args); } } };
}

export function createPlaceSearchProvider(): PlaceSearchProvider {
  const mock = new MockPlaceProvider();
  if (providerStatus.place.active === 'mock') {
    if (env.PLACE_PROVIDER === 'kakao' && !env.KAKAO_REST_API_KEY) console.warn('[Config] Kakao was requested without a key; using mock fallback');
    return mock;
  }
  const real = new KakaoPlaceProvider();
  if (!env.ALLOW_MOCK_FALLBACK) return real;
  return { async searchKeywords(keywords, options) { try { const places = await real.searchKeywords(keywords, options);recordProviderSuccess('place');return places; } catch (error) { safeWarning('Kakao', error); return mock.searchKeywords(keywords, options); } }, async searchAddress(query) { try { const value=await real.searchAddress(query);recordProviderSuccess('place');return value; } catch (error) { safeWarning('Kakao', error); return mock.searchAddress(query); } } };
}
