import { env } from '../../config/env.js';
import type { ConversationAnalysis,PlaceCandidate } from '../../types/recommendation.js';
import { isPlaceCompatibleWithIntent,PLACE_INTENT_RULES } from './placeIntentRules.js';

export function scorePlaces(candidates:PlaceCandidate[],analysis:ConversationAnalysis):PlaceCandidate[]{
 const rule=PLACE_INTENT_RULES[analysis.activity];
 return candidates.filter(place=>isPlaceCompatibleWithIntent(place,analysis.activity)).map(place=>{const text=`${place.name} ${place.category} ${place.address} ${(place.tags??[]).join(' ')}`;const activity=50;const brandMatch=analysis.activity==='movie'&&['메가박스','CGV','롯데시네마'].some(keyword=>place.name.toLocaleLowerCase('ko-KR').includes(keyword.toLocaleLowerCase('ko-KR')));const detail=brandMatch?20:analysis.activity==='movie'?5:Math.min(20,rule.requiredKeywords.filter(keyword=>text.toLocaleLowerCase('ko-KR').includes(keyword.toLocaleLowerCase('ko-KR'))).length*10);const region=`${place.address} ${place.roadAddress}`.includes('조치원')?15:10;const interest=Math.min(10,analysis.sharedInterests.filter(value=>text.includes(value)).length*5);const distance=place.distanceMeters>0?Math.max(0,Math.round(5-place.distanceMeters/4000)):0;return {...place,score:activity+detail+region+interest+distance}}).sort((a,b)=>(b.score??0)-(a.score??0)).slice(0,env.RECOMMENDATION_RESULT_LIMIT)
}
