import { KakaoPlaceProvider } from '../providers/places/kakaoPlaceProvider.js';
import { resolveConversationIntent,isPlaceCompatibleWithIntent } from '../services/places/placeIntentRules.js';
import { scorePlaces } from '../services/places/placeScoring.js';
import type { ConversationAnalysis,ConversationMessage,PlaceCandidate } from '../types/recommendation.js';
import { OpenAIConversationAnalysisProvider } from '../providers/ai/openAIConversationAnalysisProvider.js';

const base:ConversationAnalysis={activity:'other',sharedInterests:[],meetingIntent:'',preferredMood:['조용함'],placeCategories:['장소'],rejectedCategories:[],searchKeywords:['조치원'],summary:''};
const cases:Array<{name:string;messages:string[];intent:ConversationAnalysis['activity'];rejected?:string}>=[
 {name:'movie rejection/acceptance',messages:['조용한곳 좋아해?','난 좋아하긴해','카페?','노노','영화관','ㅇㅇ'],intent:'movie',rejected:'카페'},
 {name:'cafe',messages:['카페 갈래?','좋아','조용한 데로 가자'],intent:'cafe'},
 {name:'food',messages:['밥 먹자','고기 먹고 싶어'],intent:'food'},
 {name:'walk',messages:['공원 산책할래?','좋아'],intent:'walk'},
];
for(const item of cases){const messages:ConversationMessage[]=item.messages.map((message,index)=>({senderId:index%2?'b':'a',message}));const analysis=resolveConversationIntent(base,messages,'조치원');const ok=analysis.activity===item.intent&&(!item.rejected||analysis.rejectedCategories.includes(item.rejected))&&analysis.searchKeywords.every(query=>item.intent!=='movie'||['영화관','메가박스','CGV','롯데시네마'].some(keyword=>query.includes(keyword)));console.log(`[Intent Verify] ${item.name}: ${ok?'success':'failed'} (${analysis.activity}; rejected=${analysis.rejectedCategories.join(',')||'none'}; queries=${analysis.searchKeywords.join(' | ')})`)}

const incompatible:PlaceCandidate[]=[
 {id:'insurance',name:'KB손해보험 조치원영업소',category:'금융 > 보험',address:'세종특별자치시 조치원읍',roadAddress:'',phone:'',externalUrl:'https://map.kakao.com/',longitude:127.3,latitude:36.6,distanceMeters:5,source:'kakao'},
 {id:'massage',name:'짱태국전신마사지',category:'가정,생활 > 마사지',address:'세종특별자치시 조치원읍',roadAddress:'',phone:'',externalUrl:'https://map.kakao.com/',longitude:127.3,latitude:36.6,distanceMeters:6,source:'kakao'},
 {id:'stamp',name:'복인당',category:'서비스 > 도장',address:'세종특별자치시 조치원읍',roadAddress:'',phone:'',externalUrl:'https://map.kakao.com/',longitude:127.3,latitude:36.6,distanceMeters:7,source:'kakao'},
];
const movie=resolveConversationIntent(base,cases[0].messages.map((message,index)=>({senderId:index%2?'b':'a',message})),'조치원');
console.log(`[Intent Verify] incompatible movie candidates accepted: ${scorePlaces(incompatible,movie).length}`);
const categoryCandidates:PlaceCandidate[]=[{...incompatible[0],id:'movie',name:'CGV 세종',category:'문화,예술 > 영화관'},{...incompatible[0],id:'cafe',name:'조치원 카페',category:'음식점 > 카페',intentTypes:['cafe']},{...incompatible[0],id:'food',name:'조치원 식당',category:'음식점 > 한식',intentTypes:['food']},{...incompatible[0],id:'walk',name:'조치원 공원',category:'여행 > 공원',intentTypes:['walk']}];
for(const item of cases.slice(1)){const analysis=resolveConversationIntent(base,item.messages.map((message,index)=>({senderId:index%2?'b':'a',message})),'조치원');const accepted=scorePlaces(categoryCandidates,analysis);console.log(`[Intent Verify] ${item.intent} category-only: ${accepted.length===1&&accepted[0].id===item.intent?'success':'failed'}`)}
const exactMessages=cases[0].messages.map((message,index)=>({senderId:index%2?'b':'a',message}));
const rawAI=await new OpenAIConversationAnalysisProvider().analyze([{id:'a',interests:[],usagePurposes:[],preferredPlaceCategories:[]},{id:'b',interests:[],usagePurposes:[],preferredPlaceCategories:[]}],exactMessages,'verify-room','조치원');
console.log(`[OpenAI Verify] activity=${rawAI.activity}; categories=${rawAI.placeCategories.join(',')}; rejected=${rawAI.rejectedCategories.join(',')}; queries=${rawAI.searchKeywords.join(' | ')}`);

const kakao=new KakaoPlaceProvider();
for(const query of ['조치원 영화관','세종 영화관','세종 메가박스','세종 CGV']){const raw=await kakao.searchPlacesByKeyword(query);const compatible=raw.filter(place=>isPlaceCompatibleWithIntent(place,'movie'));console.log(`[Kakao Verify] ${query}: results=${raw.length}, compatible=${compatible.length}`);for(const place of compatible.slice(0,3))console.log(`[Kakao Verify] place: ${place.name} | ${place.category} | ${place.address}`)}
