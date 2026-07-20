import { Router } from 'express';
import { env } from '../config/env.js';
import { recommendationRateLimit } from '../middleware/recommendationRateLimit.js';
import { getProviderDiagnostics } from '../providers/providerDiagnostics.js';
import { providerStatus } from '../providers/providerFactory.js';
import { calculateMatchScore } from '../services/matching/calculateMatchScore.js';
import { searchAddress,searchPlacesByKeyword } from '../services/places/placeSearch.js';
import type { RecommendationUser } from '../types/recommendation.js';

export const apiRouter=Router();
const looksLikeAddress=(value:string)=>/(?:로|길|동|리|읍|면)\s*\d+(?:-\d+)?/.test(value)||/\d+(?:-\d+)?\s*(?:번지)?$/.test(value);

apiRouter.post('/matching/score',(req,res)=>{const b=req.body as Record<string,unknown>,first=(b.first??b.userA) as RecommendationUser|undefined,second=(b.second??b.userB) as RecommendationUser|undefined;if(!first||!second)return res.status(400).json({error:'비교할 두 사용자 프로필이 필요합니다.'});return res.json(calculateMatchScore(first,second))});
apiRouter.get('/health/providers',(_req,res)=>{const tests=getProviderDiagnostics();res.json(env.NODE_ENV==='production'?{ok:true,providers:{ai:{active:providerStatus.ai.active},place:{active:providerStatus.place.active}}}:{ok:true,environment:env.NODE_ENV,providers:{ai:{...providerStatus.ai,lastTest:tests.ai??null},place:{...providerStatus.place,lastTest:tests.place??null}}})});
apiRouter.post('/places/search',recommendationRateLimit,async(req,res)=>{const b=req.body as Record<string,unknown>,query=typeof b.query==='string'?b.query.trim().slice(0,env.MAX_RECOMMENDATION_QUERY_LENGTH):'';if(!query)return res.status(400).json({error:'검색어를 입력해 주세요.'});if(looksLikeAddress(query))return res.json({addresses:await searchAddress(query),places:[]});const number=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value:undefined;const places=await searchPlacesByKeyword([query],{longitude:number(b.longitude),latitude:number(b.latitude),radius:number(b.radius),size:number(b.size)});return res.json({places:places.slice(0,env.RECOMMENDATION_RESULT_LIMIT)})});
apiRouter.post('/places/address',recommendationRateLimit,async(req,res)=>{const query=typeof req.body?.query==='string'?req.body.query.trim().slice(0,env.MAX_RECOMMENDATION_QUERY_LENGTH):'';if(!query)return res.status(400).json({error:'주소를 입력해 주세요.'});return res.json({addresses:await searchAddress(query)})});
