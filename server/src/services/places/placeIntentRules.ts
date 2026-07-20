import type { ConversationAnalysis,ConversationMessage,PlaceCandidate } from '../../types/recommendation.js';

export type PlaceIntent='movie'|'cafe'|'food'|'walk'|'other';
export interface PlaceIntentRule{label:string;category:string;requiredKeywords:string[];allowedCategoryPatterns:string[];rejectedCategoryPatterns:string[];searchQueries:(region:string)=>string[]}
export const PLACE_INTENT_RULES:Record<PlaceIntent,PlaceIntentRule>={
 movie:{label:'영화 보기',category:'영화관',requiredKeywords:['영화관','시네마','메가박스','CGV','롯데시네마'],allowedCategoryPatterns:['영화관','극장','시네마','메가박스','CGV','롯데시네마'],rejectedCategoryPatterns:['보험','금융','마사지','미용','도장','생활용품','부동산','병원','약국','은행','정보통신','대리점','카셰어링','주차장','교통시설'],searchQueries:region=>[`${region} 영화관`,'세종 영화관','세종 메가박스','세종 CGV','세종 롯데시네마']},
 cafe:{label:'카페 가기',category:'카페',requiredKeywords:['카페','커피','디저트'],allowedCategoryPatterns:['카페','커피전문점','디저트','베이커리'],rejectedCategoryPatterns:[],searchQueries:region=>[`${region} 카페`]},
 food:{label:'함께 식사하기',category:'음식점',requiredKeywords:['음식점','맛집','식당'],allowedCategoryPatterns:['음식점','한식','일식','중식','양식','분식','고기'],rejectedCategoryPatterns:[],searchQueries:region=>[`${region} 음식점`]},
 walk:{label:'함께 산책하기',category:'공원',requiredKeywords:['공원','산책로'],allowedCategoryPatterns:['공원','산책','관광명소','자연'],rejectedCategoryPatterns:[],searchQueries:region=>[`${region} 공원`]},
 other:{label:'함께 시간 보내기',category:'',requiredKeywords:[],allowedCategoryPatterns:[],rejectedCategoryPatterns:['보험','금융','마사지','도장','부동산','은행'],searchQueries:region=>[`${region} 가볼만한 곳`]},
};
const signals:Record<Exclude<PlaceIntent,'other'>,string[]>={movie:['영화관','영화','시네마','메가박스','cgv','롯데시네마'],cafe:['카페','커피','디저트'],food:['밥','고기','음식','맛집','식당'],walk:['공원','산책','걷']};
const positive=/^(응+|ㅇㅇ+|좋아(?:해)?|괜찮아|그래|콜|가자|오케이|ok)$/i,negative=/^(아니|노노|싫어|별로|안\s*가|ㄴㄴ|no)$/i;
const mentionedIntent=(text:string):Exclude<PlaceIntent,'other'>|undefined=>(Object.entries(signals) as Array<[Exclude<PlaceIntent,'other'>,string[]]>).find(([,terms])=>terms.some(term=>text.toLocaleLowerCase('ko-KR').includes(term)))?.[0];

export function resolveConversationIntent(analysis:ConversationAnalysis,messages:ConversationMessage[],region:string):ConversationAnalysis{
 let lastProposal:Exclude<PlaceIntent,'other'>|undefined,accepted:Exclude<PlaceIntent,'other'>|undefined;const rejected=new Set<PlaceIntent>();
 for(const item of messages){const text=item.message.trim().toLocaleLowerCase('ko-KR'),mention=mentionedIntent(text);if(mention){lastProposal=mention;accepted=mention;continue}if(lastProposal&&negative.test(text)){rejected.add(lastProposal);if(accepted===lastProposal)accepted=undefined;lastProposal=undefined;continue}if(lastProposal&&positive.test(text)){accepted=lastProposal;lastProposal=undefined}}
 const aiIntent=analysis.activity&&analysis.activity!=='other'?analysis.activity:mentionedIntent(`${analysis.meetingIntent} ${analysis.placeCategories.join(' ')}`);
 const activity=accepted??aiIntent??'other',rule=PLACE_INTENT_RULES[activity];
 const rejectedCategories=[...new Set([...analysis.rejectedCategories,...rejected].map(value=>value in PLACE_INTENT_RULES?PLACE_INTENT_RULES[value as PlaceIntent].category:value).filter(Boolean))];
 return {...analysis,activity,meetingIntent:rule.label,placeCategories:rule.category?[rule.category]:analysis.placeCategories,rejectedCategories,searchKeywords:rule.searchQueries(region).slice(0,5),summary:`두 분은 ${rule.label}에 관심이 있고 ${rejectedCategories.length?`${rejectedCategories.join(', ')}은 제외했습니다.`:'함께 방문할 장소를 찾고 있습니다.'}`};
}

export function isPlaceCompatibleWithIntent(place:PlaceCandidate,intent:PlaceIntent){const rule=PLACE_INTENT_RULES[intent],text=`${place.name} ${place.category} ${(place.tags??[]).join(' ')}`.toLocaleLowerCase('ko-KR');if(rule.rejectedCategoryPatterns.some(pattern=>text.includes(pattern.toLocaleLowerCase('ko-KR'))))return false;if(place.intentTypes?.length&&!place.intentTypes.includes(intent))return false;if(intent==='movie'){const category=place.category.toLocaleLowerCase('ko-KR'),name=place.name.trim();return ['영화관','극장','시네마'].some(pattern=>category.includes(pattern))||/^(메가박스|CGV|롯데시네마|씨네큐)(?:\s|$)/i.test(name)}return rule.allowedCategoryPatterns.length===0||rule.allowedCategoryPatterns.some(pattern=>text.includes(pattern.toLocaleLowerCase('ko-KR')))}
