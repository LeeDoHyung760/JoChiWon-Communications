import path from 'node:path';
import { env } from '../config/env.js';
import { loadedEnvPath } from '../loadEnv.js';
import { OpenAIConversationAnalysisProvider } from '../providers/ai/openAIConversationAnalysisProvider.js';
import { KakaoPlaceProvider } from '../providers/places/kakaoPlaceProvider.js';
import { ExternalProviderError } from '../providers/types.js';

const shownEnv=loadedEnvPath?(loadedEnvPath.replace(/\\/g,'/').endsWith('/server/.env')?'server/.env':path.basename(loadedEnvPath)):'none';
console.log(`[Verify] Env loaded: ${shownEnv}`);
console.log(`[Verify] OpenAI configured: ${env.OPENAI_API_KEY?'yes':'no'}`);
console.log(`[Verify] Kakao configured: ${env.KAKAO_REST_API_KEY?'yes':'no'}`);

if(env.OPENAI_API_KEY){try{await new OpenAIConversationAnalysisProvider().analyze([], [{message:'조치원 카페'}], 'verify', env.DEFAULT_SEARCH_REGION);console.log('[Verify] OpenAI request: success')}catch(error){console.log('[Verify] OpenAI request: failed');console.log(`[Verify] Category: ${error instanceof ExternalProviderError?error.kind:'unknown'}`)}}else console.log('[Verify] OpenAI request: skipped (missing key)');
if(env.KAKAO_REST_API_KEY){try{const places=await new KakaoPlaceProvider().searchPlacesByKeyword('조치원 카페');console.log('[Verify] Kakao request: success');console.log(`[Verify] Kakao result count: ${places.length}`)}catch(error){console.log('[Verify] Kakao request: failed');if(error instanceof ExternalProviderError){console.log(`[Verify] Status: ${error.details.status??'unknown'}`);console.log(`[Verify] Code: ${error.details.providerCode??'unknown'}`);console.log(`[Verify] Message: ${error.details.providerMessage??'unknown'}`)}else console.log('[Verify] Category: unknown')}}else console.log('[Verify] Kakao request: skipped (missing key)');
