import { env } from '../../config/env.js';
import { createPlaceSearchProvider } from '../../providers/providerFactory.js';
import { MockPlaceProvider } from '../../providers/places/mockPlaceProvider.js';
import type { ConversationAnalysis,PlaceCandidate } from '../../types/recommendation.js';
import { isPlaceCompatibleWithIntent } from './placeIntentRules.js';

const provider=createPlaceSearchProvider(),mock=new MockPlaceProvider();
export interface IntentSearchDebug{intent:string;rejectedCategories:string[];queries:string[];rawResultCount:number;compatibleResultCount:number;filteredOutCount:number;provider:'kakao'|'mock';fallbackUsed:boolean;expandedRegion:boolean}
export interface IntentSearchResult{places:PlaceCandidate[];debug:IntentSearchDebug}

const regionMatched=(place:PlaceCandidate,expanded:boolean)=>{const text=`${place.address} ${place.roadAddress}`;return expanded?text.includes('세종특별자치시')||text.includes('조치원'):text.includes('조치원')};
const withoutFranchiseDuplicates=(places:PlaceCandidate[])=>{const counts=new Map<string,number>();return places.filter(place=>{const brand=['메가박스','CGV','롯데시네마'].find(value=>place.name.toLocaleLowerCase('ko-KR').includes(value.toLocaleLowerCase('ko-KR')));if(!brand)return true;const count=counts.get(brand)??0;if(count>=2)return false;counts.set(brand,count+1);return true})};

export async function searchPlacesForIntent(analysis:ConversationAnalysis):Promise<IntentSearchResult>{
 const queries=analysis.searchKeywords.slice(0,5),accepted:PlaceCandidate[]=[],seen=new Set<string>();let rawResultCount=0,filteredOutCount=0,fallbackUsed=false,expandedRegion=false,providerName:'kakao'|'mock'='kakao';
 for(let index=0;index<queries.length;index+=1){const query=queries[index],expanded=index>0&&analysis.activity==='movie';const options=expanded?{size:15}:{longitude:127.298,latitude:36.601,radius:env.DEFAULT_SEARCH_RADIUS_METERS,size:15};const results=await provider.searchKeywords([query],options);const kakaoResults=results.filter(place=>place.source==='kakao');if(results.some(place=>place.source==='mock')){fallbackUsed=true;providerName='mock';break}rawResultCount+=kakaoResults.length;if(env.NODE_ENV!=='production')console.log('[Recommendation] Kakao search',{query,resultCount:kakaoResults.length});for(const place of kakaoResults){const categoryMatched=isPlaceCompatibleWithIntent(place,analysis.activity),regionOk=regionMatched(place,expanded);if(env.NODE_ENV!=='production')console.log('[Recommendation] Candidate',{name:place.name,category:place.category,categoryMatched,regionMatched:regionOk});if(!categoryMatched||!regionOk||seen.has(place.id)){filteredOutCount+=1;continue}seen.add(place.id);accepted.push(place);if(expanded)expandedRegion=true}const enoughExactBoardgame=analysis.activity==='boardgame'&&accepted.filter(place=>/(보드게임|보드카페)/.test(`${place.name} ${place.category}`)).length>=env.RECOMMENDATION_RESULT_LIMIT;if(index===0&&accepted.length>=env.RECOMMENDATION_RESULT_LIMIT&&(analysis.activity!=='boardgame'||enoughExactBoardgame))break}
 let places=withoutFranchiseDuplicates(accepted);
 if(!places.length){const mockPlaces=await mock.searchKeywords(queries);places=mockPlaces.filter(place=>isPlaceCompatibleWithIntent(place,analysis.activity)&&regionMatched(place,false));fallbackUsed=true;providerName='mock'}
 return {places,debug:{intent:analysis.activity,rejectedCategories:analysis.rejectedCategories,queries,rawResultCount,compatibleResultCount:places.length,filteredOutCount,provider:providerName,fallbackUsed,expandedRegion}};
}

export const searchPlacesByKeyword=(keywords:string[],options?:{longitude?:number;latitude?:number;radius?:number;size?:number})=>provider.searchKeywords(keywords,options);
export const searchPlaces=searchPlacesByKeyword;
export const searchAddress=(query:string)=>provider.searchAddress(query);
