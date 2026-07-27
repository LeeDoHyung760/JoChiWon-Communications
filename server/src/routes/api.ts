import { Router } from 'express';
import { env } from '../config/env.js';
import { recommendationRateLimit } from '../middleware/recommendationRateLimit.js';
import { getProviderDiagnostics } from '../providers/providerDiagnostics.js';
import { providerStatus } from '../providers/providerFactory.js';
import { calculateMatchScore } from '../services/matching/calculateMatchScore.js';
import { searchAddress,searchPlacesByKeyword } from '../services/places/placeSearch.js';
import type { RecommendationUser } from '../types/recommendation.js';
import { greenhouseMemoryLetter,greenhousePlantMessage } from '../services/ai/greenhouseExperience.js';

export const apiRouter=Router();
const looksLikeAddress=(value:string)=>/(?:로|길|동|리|읍|면)\s*\d+(?:-\d+)?/.test(value)||/\d+(?:-\d+)?\s*(?:번지)?$/.test(value);

apiRouter.post('/matching/score',(req,res)=>{const b=req.body as Record<string,unknown>,first=(b.first??b.userA) as RecommendationUser|undefined,second=(b.second??b.userB) as RecommendationUser|undefined;if(!first||!second)return res.status(400).json({error:'비교할 두 사용자 프로필이 필요합니다.'});return res.json(calculateMatchScore(first,second))});
apiRouter.get('/health/providers',(_req,res)=>{const tests=getProviderDiagnostics();res.json(env.NODE_ENV==='production'?{ok:true,providers:{ai:{active:providerStatus.ai.active},place:{active:providerStatus.place.active}}}:{ok:true,environment:env.NODE_ENV,providers:{ai:{...providerStatus.ai,lastTest:tests.ai??null},place:{...providerStatus.place,lastTest:tests.place??null}}})});
apiRouter.post('/places/search',recommendationRateLimit,async(req,res)=>{const b=req.body as Record<string,unknown>,query=typeof b.query==='string'?b.query.trim().slice(0,env.MAX_RECOMMENDATION_QUERY_LENGTH):'';if(!query)return res.status(400).json({error:'검색어를 입력해 주세요.'});if(looksLikeAddress(query))return res.json({addresses:await searchAddress(query),places:[]});const number=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value:undefined;const places=await searchPlacesByKeyword([query],{longitude:number(b.longitude),latitude:number(b.latitude),radius:number(b.radius),size:number(b.size)});return res.json({places:places.slice(0,env.RECOMMENDATION_RESULT_LIMIT)})});
apiRouter.post('/places/address',recommendationRateLimit,async(req,res)=>{const query=typeof req.body?.query==='string'?req.body.query.trim().slice(0,env.MAX_RECOMMENDATION_QUERY_LENGTH):'';if(!query)return res.status(400).json({error:'주소를 입력해 주세요.'});return res.json({addresses:await searchAddress(query)})});

apiRouter.post('/greenhouse/plant-message',recommendationRateLimit,async(req,res)=>{
  const plantId=typeof req.body?.plantId==='string'?req.body.plantId.trim().slice(0,80):'';
  const plantName=typeof req.body?.plantName==='string'?req.body.plantName.trim().slice(0,80):'';
  const plantInfo=typeof req.body?.plantInfo==='string'?req.body.plantInfo.trim().slice(0,600):'';
  if(!plantId||!plantName||!plantInfo)return res.status(400).json({error:'식물 정보가 올바르지 않습니다.'});
  return res.json({message:await greenhousePlantMessage({plantId,plantName,plantInfo})});
});

apiRouter.post('/greenhouse/memory-letter',recommendationRateLimit,async(req,res)=>{
  const userText=typeof req.body?.userText==='string'?req.body.userText.trim().slice(0,500):'';
  const dominantEmotion=typeof req.body?.dominantEmotion==='string'?req.body.dominantEmotion.trim().slice(0,30):'평온';
  const plants=Array.isArray(req.body?.plants)?req.body.plants.slice(0,14).flatMap((item:unknown)=>{
    if(!item||typeof item!=='object')return [];
    const value=item as Record<string,unknown>,name=typeof value.name==='string'?value.name.trim().slice(0,80):'',emotion=typeof value.emotion==='string'?value.emotion.trim().slice(0,30):'';
    return name&&emotion?[{name,emotion}]:[];
  }):[];
  if(!userText)return res.status(400).json({error:'기억을 한 문장 이상 입력해 주세요.'});
  return res.json({letter:await greenhouseMemoryLetter({userText,plants,dominantEmotion})});
});
