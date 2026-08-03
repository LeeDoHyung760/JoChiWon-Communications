import { Router } from 'express';
import { env } from '../config/env.js';
import { recommendationRateLimit } from '../middleware/recommendationRateLimit.js';
import { getProviderDiagnostics } from '../providers/providerDiagnostics.js';
import { providerStatus } from '../providers/providerFactory.js';
import { calculateMatchScore } from '../services/matching/calculateMatchScore.js';
import { searchAddress,searchPlacesByKeyword } from '../services/places/placeSearch.js';
import type { RecommendationUser } from '../types/recommendation.js';
import { greenhouseAnalyze,greenhouseAnalysisRequestSchema,greenhouseReflect,greenhouseReflectionRequestSchema } from '../services/ai/greenhouseExperience.js';
import { publicMemoryStore } from '../services/greenhouse/publicMemoryStore.js';
import { bearWildlifeAnswer } from '../services/ai/bearWildlife.js';
import { generateGovernmentCourse,governmentCourseRequestSchema } from '../services/ai/governmentCourse.js';
import { projectRoomPlaceRequestSchema,suggestProjectRoomPlaces } from '../services/ai/projectRoomPlaceSuggestions.js';

export const apiRouter=Router();
const looksLikeAddress=(value:string)=>/(?:로|길|동|리|읍|면)\s*\d+(?:-\d+)?/.test(value)||/\d+(?:-\d+)?\s*(?:번지)?$/.test(value);

apiRouter.post('/matching/score',(req,res)=>{const b=req.body as Record<string,unknown>,first=(b.first??b.userA) as RecommendationUser|undefined,second=(b.second??b.userB) as RecommendationUser|undefined;if(!first||!second)return res.status(400).json({error:'비교할 두 사용자 프로필이 필요합니다.'});return res.json(calculateMatchScore(first,second))});
apiRouter.get('/health/providers',(_req,res)=>{const tests=getProviderDiagnostics();res.json(env.NODE_ENV==='production'?{ok:true,providers:{ai:{active:providerStatus.ai.active},place:{active:providerStatus.place.active}}}:{ok:true,environment:env.NODE_ENV,providers:{ai:{...providerStatus.ai,lastTest:tests.ai??null},place:{...providerStatus.place,lastTest:tests.place??null}}})});
apiRouter.post('/project-room/place-suggestions',recommendationRateLimit,async(req,res)=>{const parsed=projectRoomPlaceRequestSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'프로젝트 정보를 확인해 주세요.'});return res.json(await suggestProjectRoomPlaces(parsed.data))});
apiRouter.post('/places/search',recommendationRateLimit,async(req,res)=>{const b=req.body as Record<string,unknown>,query=typeof b.query==='string'?b.query.trim().slice(0,env.MAX_RECOMMENDATION_QUERY_LENGTH):'';if(!query)return res.status(400).json({error:'검색어를 입력해 주세요.'});if(looksLikeAddress(query))return res.json({addresses:await searchAddress(query),places:[]});const number=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value:undefined;const places=await searchPlacesByKeyword([query],{longitude:number(b.longitude),latitude:number(b.latitude),radius:number(b.radius),size:number(b.size)});return res.json({places:places.slice(0,env.RECOMMENDATION_RESULT_LIMIT)})});
apiRouter.post('/places/address',recommendationRateLimit,async(req,res)=>{const query=typeof req.body?.query==='string'?req.body.query.trim().slice(0,env.MAX_RECOMMENDATION_QUERY_LENGTH):'';if(!query)return res.status(400).json({error:'주소를 입력해 주세요.'});return res.json({addresses:await searchAddress(query)})});

apiRouter.post('/greenhouse/analyze',recommendationRateLimit,async(req,res)=>{
  const parsed=greenhouseAnalysisRequestSchema.safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:'온실 분석 기록 형식이 올바르지 않습니다.'});
  return res.json(await greenhouseAnalyze(parsed.data));
});

apiRouter.post('/greenhouse/reflection',recommendationRateLimit,async(req,res)=>{
  const parsed=greenhouseReflectionRequestSchema.safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:'식물 마음 기록 형식이 올바르지 않습니다.'});
  return res.json(await greenhouseReflect(parsed.data));
});

apiRouter.get('/greenhouse/public-memories',(req,res)=>{
  const requested=Number(req.query.limit);
  return res.json({memories:publicMemoryStore.list(Number.isFinite(requested)?requested:60)});
});

apiRouter.post('/greenhouse/public-memories',recommendationRateLimit,(req,res)=>{
  const memory=publicMemoryStore.add(req.body);
  if(!memory)return res.status(400).json({error:'공개할 기억 정보가 올바르지 않습니다.'});
  return res.status(201).json({memory});
});

apiRouter.post('/bear-wildlife/ask',recommendationRateLimit,async(req,res)=>{
  const mode=req.body?.mode==='clue'?'clue':req.body?.mode==='report'?'report':'question';
  const question=typeof req.body?.question==='string'?req.body.question.trim().slice(0,240):'';
  const clueId=typeof req.body?.clueId==='string'?req.body.clueId.trim().slice(0,40):undefined;
  const selected=typeof req.body?.selected==='string'?req.body.selected.trim().slice(0,120):undefined;
  if(question.length<2)return res.status(400).json({error:'궁금한 내용을 두 글자 이상 입력해 주세요.'});
  const findings=Array.isArray(req.body?.findings)?req.body.findings.slice(0,3):undefined;
  return res.json({answer:await bearWildlifeAnswer({mode,question,clueId,selected,findings})});
});

apiRouter.post('/government/course',recommendationRateLimit,async(req,res)=>{
  const parsed=governmentCourseRequestSchema.safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:'공동 코스 조건을 다시 확인해 주세요.'});
  return res.json({course:await generateGovernmentCourse(parsed.data)});
});
