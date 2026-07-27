import { Router } from 'express';
import { getSejongFestivals } from '../services/festivals/sejongFestivals.js';
import { getTourFestivals } from '../services/festivals/tourFestivals.js';
import { getOfficial2026Festivals } from '../services/festivals/official2026Festivals.js';

export const festivalsRouter=Router();

festivalsRouter.get('/',async(_req,res)=>{
  try{
    const official=getOfficial2026Festivals();
    if(official.festivals.length)return res.json({...official,count:official.festivals.length,year:2026,source:'sejong-official-2026',cacheTtlSeconds:3600});
    try{
      const result=await getTourFestivals();
      if(result.festivals.length)return res.json({...result,count:result.festivals.length,source:'tour-api',cacheTtlSeconds:3600});
    }catch(error){console.warn('[TourAPI festivals fallback]',error instanceof Error?error.message:'UNKNOWN')}
    const result=await getSejongFestivals();
    return res.json({...result,count:result.festivals.length,source:'sejong',cacheTtlSeconds:3600});
  }catch(error){
    const message=error instanceof Error?error.message:'UNKNOWN';
    console.error('[Sejong festivals API]',message);
    if(message==='SEJONG_API_KEY_NOT_CONFIGURED')return res.status(503).json({error:'세종 문화축제 API가 설정되지 않았습니다.'});
    return res.status(502).json({error:'세종 문화축제 정보를 불러오지 못했습니다.'});
  }
});
