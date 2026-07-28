import { useEffect,useMemo,useState } from 'react';
import { Bookmark,Check,Heart,Route,Sparkles,ThumbsUp,Users,X } from 'lucide-react';
import type { LakeExperienceId,PlayerState } from '../../shared/socket-events';
import { gameEvents } from '../game/events';
import { socket } from '../game/systems/socketClient';
import { API_BASE_URL } from '../config/api';
import { analyzeLakeTaste,lakeTasteQuestions,type LakeTasteAnswers,type LakeTasteDomain,type LakeTasteInsights } from '../services/lakeTasteAnalysis';
import './LakeParkExperiences.css';

type NearbyExperience={id:LakeExperienceId;label:string;description:string};
type FoodCategory='지역 먹거리'|'카페·디저트'|'시장·상점';
type FoodPlaceInterest={id:string;name:string;type:'food'|'place';category:string;tags:string[]};
type BoothCompletion={activity:boolean;food:boolean;festival:boolean};
type FestivalCard={id:string;category:'축제'|'공연';emoji:string;image:string;source:string;title:string;description:string;schedule:string;venue:string;status:string;tags:string[];tone:string};
type ApiFestival={id:string;name:string;startDate:string;endDate:string;status:string;venue:string;description:string;organizer?:string;image?:string;source:string};
type LakeInterestProfile={savedContentIds:string[];activities:string[];foodPlaceInterests:FoodPlaceInterest[];festivalTheme:string;likedCourseTitles:string[];tasteAnswers:LakeTasteAnswers;tasteInsights:LakeTasteInsights;updatedAt:number};

const LAKE_INTEREST_KEY='sejong-lake-interest-profile-v1';
const LAKE_JOURNEY_STEP_KEY='sejong-lake-journey-step-v1';
const LAKE_BOOTH_COMPLETION_KEY='sejong-lake-booth-completion-v1';
const LAKE_COMPLETION_DISMISSED_KEY='sejong-lake-taste-completion-dismissed-v1';
const activities=[
  {id:'lunch-concert',emoji:'🎸',label:'12시 런치 콘서트',mood:'자유로운 라이브',description:'이한결 트리오의 대중음악을 가까이에서 즐기는 로비 콘서트',schedule:'2026. 7. 29. 12:00',venue:'세종예술의전당 로비',image:'/images/performances/lunch-concert-2026.jpg',detailUrl:'https://www.sjac.or.kr/base/nrr/performance/read?menuLevel=2&menuNo=77&performanceNo=667'},
  {id:'seopyeonje-musical',emoji:'🎭',label:'뮤지컬 〈서편제〉',mood:'전통과 감동',description:'우리 소리와 현대적인 음악이 어우러지는 창작 뮤지컬',schedule:'2026. 7. 30. ~ 8. 1.',venue:'세종예술의전당',image:'/images/performances/seopyeonje-2026.jpg',detailUrl:'https://www.sjac.or.kr/base/nrr/performance/read?menuLevel=2&menuNo=77&performanceNo=650'},
  {id:'lungs-play',emoji:'🌿',label:'연극 〈렁스〉',mood:'몰입하는 이야기',description:'사랑과 삶의 선택을 섬세한 대화로 풀어내는 연극',schedule:'2026. 8. 7. ~ 8. 8.',venue:'세종예술의전당',image:'/images/performances/lungs-2026.jpg',detailUrl:'https://www.sjac.or.kr/base/nrr/performance/read?menuLevel=2&menuNo=77&performanceNo=653'},
  {id:'starry-night-concert',emoji:'🌃',label:'심야음악회 〈별 헤는 밤, 별 하나〉',mood:'밤의 클래식',description:'늦은 밤 별빛 같은 선율을 만나는 국립심포니 콘서트',schedule:'2026. 8. 7.',venue:'세종예술의전당',image:'/images/performances/starry-night-2026.jpg',detailUrl:'https://www.sjac.or.kr/base/nrr/performance/read?menuLevel=2&menuNo=77&performanceNo=654'},
];
const fallbackFestivalContents:FestivalCard[]=[
  {id:'peach-festival',category:'축제' as const,emoji:'🍑',image:'/images/festivals/peach-2026.jpg',source:'세종특별자치시 제공',title:'제24회 세종 조치원복숭아축제',description:'조치원 복숭아를 맛보고 공연·체험·농가 판매 부스를 만나는 세종의 대표 여름 축제예요.',schedule:'2026. 7. 24. ~ 7. 26.',venue:'세종시민운동장 보조경기장·도도리파크 일원',status:'행사 종료',tags:['복숭아','여름축제'],tone:'coral'},
  {id:'hangeul-festival',category:'축제' as const,emoji:'🔤',image:'/images/festivals/hangeul-2026.jpg',source:'세종시문화관광재단 제공',title:'2026 세종한글축제',description:'한글날을 중심으로 전시·공연·시민 참여 프로그램을 즐기는 세종의 대표 문화축제예요.',schedule:'2026. 10. 9. ~ 10. 11.',venue:'세종호수공원·중앙공원 일원',status:'개최 예정',tags:['한글','문화'],tone:'violet'},
  {id:'nakhwa-festival',category:'공연' as const,emoji:'🎇',image:'/images/festivals/nakhwa-2026.jpg',source:'세종시문화관광재단 제공',title:'2026 세종낙화축제',description:'전통 낙화가 호수공원의 밤을 불꽃비로 물들이는 세종 대표 봄 야간 축제예요.',schedule:'2026. 5. 16.',venue:'세종호수공원·중앙공원 일원',status:'행사 종료',tags:['낙화','야간공연'],tone:'blue'},
  {id:'spring-flower-festival',category:'축제' as const,emoji:'🌸',image:'/images/festivals/spring-flower-2026.jpg',source:'세종특별자치시 제공',title:'2026 조치원 봄꽃축제',description:'조치원의 봄꽃과 지역 공연, 시민 참여 프로그램을 함께 즐기는 봄 축제예요.',schedule:'2026. 4. 4. ~ 4. 5.',venue:'조치원읍 일원',status:'행사 종료',tags:['봄꽃','지역축제'],tone:'green'},
  {id:'childrens-day-festival',category:'축제' as const,emoji:'🧸',image:'/images/festivals/childrens-day-2026.jpg',source:'세종특별자치시 제공',title:'제104회 세종 어린이날 축제',description:'가족이 함께 공연, 놀이, 체험과 먹거리를 즐기는 어린이날 시민 축제예요.',schedule:'2026. 5. 5.',venue:'세종호수공원 중앙광장·매화공연장 일원',status:'행사 종료',tags:['어린이날','가족체험'],tone:'coral'},
  {id:'kings-birthday-book-festival',category:'축제' as const,emoji:'📚',image:'/images/festivals/king-book-2026.jpg',source:'세종특별자치시·문화관광재단 제공',title:'세종대왕 나신 날 × 세종 책사랑 축제',description:'세종대왕 나신 날을 기념하며 한글과 책, 공연과 가족 체험을 함께 만나는 축제예요.',schedule:'2026. 5. 15. ~ 5. 16.',venue:'세종호수공원·중앙공원 일원',status:'행사 종료',tags:['세종대왕','책'],tone:'violet'},
  {id:'dano-festival',category:'공연' as const,emoji:'🎭',image:'/images/festivals/dano-2026.jpg',source:'대한민국 구석구석 제공',title:'2026 세종단오제',description:'단오의 세시풍속과 전통·현대 공연, 체험을 함께 즐기는 지역문화축제예요.',schedule:'2026. 6. 13.',venue:'세종특별자치시 일원',status:'행사 종료',tags:['단오','전통문화'],tone:'green'},
  {id:'street-hangeul-festival',category:'공연' as const,emoji:'🎤',image:'/images/festivals/street-hangeul-2026.jpg',source:'한글문화도시 세종 관련 행사 사진',title:'2026 거리 한글문화 한마당',description:'거리 공연과 시민 참여 프로그램으로 생활 속 한글문화를 만나는 순회형 한마당이에요.',schedule:'2026년 회차별 진행',venue:'세종시 주요 거리·생활권 일원',status:'일정 확인 중',tags:['한글','거리공연'],tone:'blue'},
];
const foodShopContents=[
  {id:'jochwon-peach',emoji:'🍑',name:'조치원 복숭아',group:'지역 먹거리' as const,category:'local-food',tags:['복숭아','지역특산물','제철과일'],description:'세종 조치원의 대표 특산물인 달콤한 복숭아입니다.',location:'조치원읍 일원',action:'먹어보고 싶어요',imagePosition:'0% 0%'},
  {id:'local-produce-food',emoji:'🍗',name:'왕천파닭',group:'지역 먹거리' as const,category:'local-food',tags:['파닭','조치원','로컬맛집'],description:'조치원에서 오랫동안 사랑받아 온 세종의 대표 파닭입니다.',location:'조치원읍 조치원8길 16',action:'먹어보고 싶어요',imagePosition:'100% 0%'},
  {id:'matnadang-kalguksu',emoji:'🍜',name:'맛나당칼국수',group:'지역 먹거리' as const,category:'local-food',tags:['칼국수','부강면','세종맛집'],description:'부강에서 즐기는 푸짐하고 따뜻한 손칼국수입니다.',location:'부강면 부강로 35',action:'먹어보고 싶어요',imagePosition:'50% 0%'},
  {id:'bok-samgyetang',emoji:'🍲',name:'복누룽지삼계탕',group:'지역 먹거리' as const,category:'local-food',tags:['삼계탕','누룽지','보양식'],description:'구수한 누룽지와 삼계탕을 함께 맛보는 지역 음식점입니다.',location:'장군면 산학리길 16-19',action:'먹어보고 싶어요',imagePosition:'100% 0%'},
  {id:'sansujeong-baeksuk',emoji:'🍄',name:'산수정 능이버섯백숙',group:'지역 먹거리' as const,category:'local-food',tags:['백숙','능이버섯','고복저수지'],description:'능이버섯 향을 담은 백숙을 즐길 수 있는 세종 맛집입니다.',location:'연서면 도신고복로 985',action:'먹어보고 싶어요',imagePosition:'0% 0%'},
  {id:'yoongane-sujebi',emoji:'🥣',name:'윤가네들깨수제비&보쌈',group:'지역 먹거리' as const,category:'local-food',tags:['들깨수제비','보쌈','한식'],description:'고소한 들깨수제비와 보쌈을 함께 맛볼 수 있습니다.',location:'대평로 87',action:'먹어보고 싶어요',imagePosition:'50% 0%'},
  {id:'lake-cafe',emoji:'☕',name:'바이핸커피',group:'카페·디저트' as const,category:'cafe',tags:['커피','휴식','어진동'],description:'정부세종청사 인근에서 커피와 휴식을 즐길 수 있는 카페입니다.',location:'절재로 172',action:'방문하고 싶어요',imagePosition:'0% 100%'},
  {id:'local-bakery',emoji:'🫘',name:'로스터리카페 수아빈',group:'카페·디저트' as const,category:'cafe',tags:['로스터리','커피','카페'],description:'직접 볶은 원두의 커피를 즐길 수 있는 세종 로스터리 카페입니다.',location:'도움8로 91',action:'방문하고 싶어요',imagePosition:'50% 100%'},
  {id:'mrbean-roasters',emoji:'🧊',name:'미스터빈커피로스터스',group:'카페·디저트' as const,category:'cafe',tags:['로스터리','팥빙수','감성카페'],description:'커피와 인절미 우유 팥빙수로 알려진 로스터리 카페입니다.',location:'고운서길 13',action:'방문하고 싶어요',imagePosition:'0% 100%'},
  {id:'newold-coffee',emoji:'☕',name:'뉴올드커피',group:'카페·디저트' as const,category:'cafe',tags:['커피','디저트','대평동'],description:'세종 미식여행이 소개하는 개성 있는 지역 카페입니다.',location:'한누리대로 2150',action:'방문하고 싶어요',imagePosition:'50% 100%'},
  {id:'pangshow-bakery',emoji:'🥐',name:'팡쇼과자점',group:'카페·디저트' as const,category:'bakery',tags:['베이커리','빵','디저트'],description:'다양한 빵과 디저트를 만날 수 있는 세종 지역 베이커리입니다.',location:'노을3로 25',action:'방문하고 싶어요',imagePosition:'50% 100%'},
  {id:'stellaon-coffee',emoji:'🌉',name:'스텔라온 커피',group:'카페·디저트' as const,category:'cafe',tags:['커피','디저트','보람동'],description:'세종 도심에서 여유롭게 쉬어 가기 좋은 카페입니다.',location:'시청대로 213',action:'방문하고 싶어요',imagePosition:'0% 100%'},
  {id:'jochwon-market',emoji:'🛍️',name:'세종전통시장',group:'시장·상점' as const,category:'market',tags:['전통시장','먹거리','로컬'],description:'지역 먹거리와 생활 상점을 함께 둘러볼 수 있는 전통시장입니다.',location:'조치원읍 조치원8길 42',action:'가보고 싶어요',imagePosition:'100% 100%'},
  {id:'daepyeong-market',emoji:'🏘️',name:'금남대평시장',group:'시장·상점' as const,category:'market',tags:['오일장','전통시장','금남면'],description:'2일과 7일에 장이 열리는 금남면의 전통 오일장입니다.',location:'금남면 대평시장1길 17-2',action:'가보고 싶어요',imagePosition:'100% 100%'},
  {id:'bugang-market',emoji:'🧺',name:'부강전통시장',group:'시장·상점' as const,category:'market',tags:['오일장','전통시장','부강면'],description:'지역 농산물과 생활 먹거리를 만나는 부강의 전통시장입니다.',location:'부강면 부강5길 18',action:'가보고 싶어요',imagePosition:'100% 100%'},
  {id:'jeonui-market',emoji:'👑',name:'전의왕의물시장',group:'시장·상점' as const,category:'market',tags:['오일장','전통시장','전의면'],description:'전의 지역의 역사와 장터 문화를 함께 만나는 전통시장입니다.',location:'전의면 장터길 33',action:'가보고 싶어요',imagePosition:'100% 100%'},
  {id:'singsing-dodam',emoji:'🥬',name:'싱싱장터 도담점',group:'시장·상점' as const,category:'market',tags:['로컬푸드','농산물','직매장'],description:'세종 농가가 출하한 신선한 로컬푸드를 만나는 직매장입니다.',location:'보듬6로 16',action:'가보고 싶어요',imagePosition:'100% 100%'},
  {id:'singsing-areum',emoji:'🥕',name:'싱싱장터 아름점',group:'시장·상점' as const,category:'market',tags:['로컬푸드','농산물','직매장'],description:'지역 농축산물을 가까이에서 고를 수 있는 상설 직매장입니다.',location:'보듬3로 105',action:'가보고 싶어요',imagePosition:'100% 100%'},
];
const foodCategories:FoodCategory[]=['지역 먹거리','카페·디저트','시장·상점'];
const foodShopImages:Record<string,string>={
  'jochwon-peach':'/images/festivals/peach-2026.jpg',
  'local-produce-food':'/images/food-shops/actual/wangcheon.jpg',
  'matnadang-kalguksu':'/images/food-shops/actual/matnadang.jpg',
  'bok-samgyetang':'/images/food-shops/actual/bok-samgyetang.jpg',
  'sansujeong-baeksuk':'/images/food-shops/actual/sansujeong.jpg',
  'yoongane-sujebi':'/images/food-shops/actual/yoongane.jpg',
  'lake-cafe':'/images/food-shops/actual/byhand.jpg',
  'local-bakery':'/images/food-shops/actual/suabean.jpg',
  'mrbean-roasters':'/images/food-shops/actual/mrbean.jpg',
  'newold-coffee':'/images/food-shops/actual/newold.jpg',
  'pangshow-bakery':'/images/food-shops/actual/pangshow.jpg',
  'stellaon-coffee':'/images/food-shops/actual/stellaon.jpg',
  'jochwon-market':'/images/food-shops/jochwon-market.jpg',
  'daepyeong-market':'/images/food-shops/actual/daepyeong-market.jpg',
  'bugang-market':'/images/food-shops/actual/bugang-market.jpg',
  'jeonui-market':'/images/food-shops/actual/jeonui-market.jpg',
  'singsing-dodam':'/images/food-shops/actual/singsing-dodam.jpg',
  'singsing-areum':'/images/food-shops/actual/singsing-areum.jpg',
};
const foodShopPhotoSource:Record<string,string>={
  'jochwon-peach':'세종시 관광·축제 자료',
  'local-produce-food':'세종미식여행',
  'matnadang-kalguksu':'세종미식여행',
  'bok-samgyetang':'세종미식여행',
  'sansujeong-baeksuk':'세종미식여행',
  'yoongane-sujebi':'세종미식여행',
  'lake-cafe':'세종미식여행',
  'local-bakery':'세종미식여행',
  'mrbean-roasters':'세종미식여행',
  'newold-coffee':'세종미식여행',
  'pangshow-bakery':'세종미식여행',
  'stellaon-coffee':'세종미식여행',
  'jochwon-market':'세종시 관광 자료',
  'daepyeong-market':'세종도시교통공사',
  'bugang-market':'세종특별자치시선거관리위원회',
  'jeonui-market':'세종시설관리공단',
  'singsing-dodam':'세종로컬푸드 싱싱장터',
  'singsing-areum':'세종로컬푸드 싱싱장터',
};
const sharedCourses=[
  {emoji:'🏙️',title:'세종 도심 핵심 당일 코스',tags:['첫여행','도보·자전거'],stops:['대통령기록관','세종호수공원','국립세종수목원','이응다리'],duration:'반나절~하루',source:'세종 대표 관광지 동선',likes:42},
  {emoji:'🌃',title:'세종 시티투어 야경 코스',tags:['야경','데이트'],stops:['세종호수공원','이응다리 남측','나성동 도시상징광장','방축천 음악분수'],duration:'약 3시간',source:'세종시티투어 야경 노선',likes:38},
  {emoji:'🍗',title:'조치원 로컬 미식 코스',tags:['시장','로컬맛집'],stops:['조치원역','조치원 청년 골목','세종전통시장','왕천파닭'],duration:'약 3~4시간',source:'세종오식 미식여행 코스',likes:35},
  {emoji:'👨‍👩‍👧',title:'아이와 함께 세종 나들이',tags:['가족','자연·체험'],stops:['국립어린이박물관','세종호수공원','국립세종수목원','이응다리'],duration:'하루',source:'가족 방문형 대표 명소',likes:46},
];

function readProfile():LakeInterestProfile{
  try{
    const saved=JSON.parse(localStorage.getItem(LAKE_INTEREST_KEY)??'null') as (Partial<LakeInterestProfile>&{foodInterests?:FoodPlaceInterest[];shopInterests?:FoodPlaceInterest[]})|null;
    const oldIds=Array.isArray((saved as {foodShopIds?:unknown})?.foodShopIds)?(saved as {foodShopIds:string[]}).foodShopIds:[];
    const fromIds=foodShopContents.filter(item=>oldIds.includes(item.id));
    const legacy=[...(Array.isArray(saved?.foodInterests)?saved.foodInterests:[]),...(Array.isArray(saved?.shopInterests)?saved.shopInterests:[])];
    const unified=Array.isArray(saved?.foodPlaceInterests)?saved.foodPlaceInterests:[...legacy,...fromIds].map(item=>{
      const content=foodShopContents.find(candidate=>candidate.id===item.id);
      return {id:item.id,name:item.name,type:content?.group==='지역 먹거리'?'food':'place',category:item.category,tags:item.tags} as FoodPlaceInterest;
    });
    const tasteAnswers=saved?.tasteAnswers&&typeof saved.tasteAnswers==='object'?saved.tasteAnswers as LakeTasteAnswers:{};
    const tasteInsights=saved?.tasteInsights&&typeof saved.tasteInsights==='object'?saved.tasteInsights as LakeTasteInsights:{};
    return {savedContentIds:Array.isArray(saved?.savedContentIds)?saved.savedContentIds:[],activities:Array.isArray(saved?.activities)?saved.activities.filter(id=>activities.some(activity=>activity.id===id)).slice(0,2):[],foodPlaceInterests:unified.slice(0,3),festivalTheme:typeof saved?.festivalTheme==='string'?saved.festivalTheme:'',likedCourseTitles:Array.isArray(saved?.likedCourseTitles)?saved.likedCourseTitles.slice(0,1):[],tasteAnswers,tasteInsights,updatedAt:typeof saved?.updatedAt==='number'?saved.updatedAt:Date.now()};
  }catch{return {savedContentIds:[],activities:[],foodPlaceInterests:[],festivalTheme:'',likedCourseTitles:[],tasteAnswers:{},tasteInsights:{},updatedAt:Date.now()}}
}

function readBoothCompletion(profile:LakeInterestProfile):BoothCompletion{
  try{
    const saved=JSON.parse(localStorage.getItem(LAKE_BOOTH_COMPLETION_KEY)??'null') as Partial<BoothCompletion>|null;
    if(saved)return {activity:!!saved.activity&&!!profile.tasteInsights.performance,food:!!saved.food&&!!profile.tasteInsights.food,festival:!!saved.festival&&!!profile.tasteInsights.festival};
  }catch{/* Migrate the previous ordered progress below. */}
  const rawStep=localStorage.getItem(LAKE_JOURNEY_STEP_KEY);
  const savedStep=Number(rawStep);
  if(rawStep!==null&&savedStep>=0)return {activity:savedStep>=1&&!!profile.tasteInsights.performance,food:savedStep>=2&&!!profile.tasteInsights.food,festival:savedStep>=3&&!!profile.tasteInsights.festival};
  return {activity:profile.activities.length>0&&!!profile.tasteInsights.performance,food:profile.foodPlaceInterests.length>0&&!!profile.tasteInsights.food,festival:profile.savedContentIds.length>0&&!!profile.tasteInsights.festival};
}

export function LakeParkExperiences(){
  const [location,setLocation]=useState('세종호수공원');
  const [onlineCount,setOnlineCount]=useState(1);
  const [nearby,setNearby]=useState<NearbyExperience|null>(null);
  const [active,setActive]=useState<LakeExperienceId|null>(null);
  const [profile,setProfile]=useState<LakeInterestProfile>(readProfile);
  const [festivals,setFestivals]=useState<FestivalCard[]>(fallbackFestivalContents);
  const [festivalDataSource,setFestivalDataSource]=useState<'api'|'fallback'>('fallback');
  const [selectedFestival,setSelectedFestival]=useState<FestivalCard|null>(null);
  const [selectedCourse,setSelectedCourse]=useState<(typeof sharedCourses)[number]|null>(null);
  const [selectedFoodShop,setSelectedFoodShop]=useState<(typeof foodShopContents)[number]|null>(null);
  const [foodCategory,setFoodCategory]=useState<FoodCategory>('지역 먹거리');
  const [foodSelectionComplete,setFoodSelectionComplete]=useState(false);
  const [foodSavedNotice,setFoodSavedNotice]=useState(false);
  const [completionNotice,setCompletionNotice]=useState('');
  const [performanceLimitNotice,setPerformanceLimitNotice]=useState(false);
  const [foodLimitNotice,setFoodLimitNotice]=useState(false);
  const [festivalLimitNotice,setFestivalLimitNotice]=useState(false);
  const [completedBooths,setCompletedBooths]=useState<BoothCompletion>(()=>readBoothCompletion(profile));
  const [showJourneyComplete,setShowJourneyComplete]=useState(false);
  const [journeyCompleteDismissed,setJourneyCompleteDismissed]=useState(()=>localStorage.getItem(LAKE_COMPLETION_DISMISSED_KEY)==='true');
  const [journeyNotice,setJourneyNotice]=useState('');
  const [coach,setCoach]=useState<{domain:LakeTasteDomain;step:number}|null>(null);

  const savedContents=useMemo(()=>festivals.filter(content=>profile.savedContentIds.includes(content.id)),[festivals,profile.savedContentIds]);
  const selectedFoodShops=profile.foodPlaceInterests;
  const visibleFoodShops=foodShopContents.filter(item=>item.group===foodCategory);
  const completedCount=Object.values(completedBooths).filter(Boolean).length;
  const allBoothsCompleted=completedCount===3;
  const coachQuestion=coach?lakeTasteQuestions[coach.domain][coach.step]:null;

  useEffect(()=>{
    const proximity=(experience:NearbyExperience|null)=>setNearby(experience);
    const locationChanged=(name:string)=>setLocation(name);
    gameEvents.on('lake-experience-proximity-changed',proximity);
    gameEvents.on('location-changed',locationChanged);
    return()=>{gameEvents.off('lake-experience-proximity-changed',proximity);gameEvents.off('location-changed',locationChanged)};
  },[]);
  useEffect(()=>{
    const updateOnline=(players:PlayerState[])=>setOnlineCount(Math.max(1,players.length));
    socket.on('onlineUsersUpdated',updateOnline);
    return()=>{socket.off('onlineUsersUpdated',updateOnline)};
  },[]);
  useEffect(()=>{localStorage.setItem(LAKE_INTEREST_KEY,JSON.stringify(profile));window.dispatchEvent(new CustomEvent('sejong-lake-interest-updated',{detail:profile}))},[profile]);
  useEffect(()=>{localStorage.setItem(LAKE_BOOTH_COMPLETION_KEY,JSON.stringify(completedBooths))},[completedBooths]);
  useEffect(()=>{if(location!=='세종호수공원'){setActive(null);setNearby(null)}},[location]);
  useEffect(()=>{
    gameEvents.emit('lake-booth-completion-changed',{
      'activity-zone':completedBooths.activity,
      'food-shop-zone':completedBooths.food,
      'central-plaza':completedBooths.festival,
    });
  },[completedBooths]);
  useEffect(()=>{if(allBoothsCompleted&&!journeyCompleteDismissed)setShowJourneyComplete(true)},[allBoothsCompleted,journeyCompleteDismissed]);
  useEffect(()=>{
    const controller=new AbortController();
    fetch(`${API_BASE_URL}/festivals`,{signal:controller.signal}).then(response=>{
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{festivals?:ApiFestival[]}>;
    }).then(payload=>{
      if(!payload.festivals?.length)return;
      const fallbackByName=(name:string)=>fallbackFestivalContents.find(item=>name.includes(item.title.replace(/^2026\s*/,'').replace(/^제\d+회\s*/,''))||item.title.includes(name.replace(/^2026\s*/,'')));
      const cards=payload.festivals.map((festival,index)=>{
        const fallback=fallbackByName(festival.name);
        const schedule=festival.startDate===festival.endDate?festival.startDate:`${festival.startDate} ~ ${festival.endDate}`;
        return {id:fallback?.id??festival.id,category:'축제' as const,emoji:fallback?.emoji??'🎪',image:festival.image||fallback?.image||'/images/festivals/hangeul-2026.jpg',source:festival.source==='tour-api'?'한국관광공사 관광자료':festival.source==='sejong'?'세종특별자치시 공개자료':'세종 공식 2026 축제 데이터',title:festival.name,description:festival.description||fallback?.description||'세종에서 열리는 문화축제입니다.',schedule,venue:festival.venue||'세종특별자치시 일원',status:festival.status,tags:fallback?.tags??[festival.status,festival.organizer||'세종축제'].filter(Boolean),tone:fallback?.tone??['coral','violet','blue','green'][index%4]} satisfies FestivalCard;
      });
      setFestivals(cards);setFestivalDataSource('api');
    }).catch(error=>{if(error instanceof Error&&error.name!=='AbortError'){setFestivals(fallbackFestivalContents);setFestivalDataSource('fallback')}});
    return()=>controller.abort();
  },[]);
  useEffect(()=>{
    if(!active&&!showJourneyComplete)return;
    gameEvents.emit('game-input-lock',true);
    const closeWithEscape=(event:KeyboardEvent)=>{
      if(event.key!=='Escape')return;
      if(coach){setCoach(null);return}
      if(showJourneyComplete){setShowJourneyComplete(false);return}
      setSelectedFestival(null);
      setSelectedCourse(null);
      setSelectedFoodShop(null);
      setActive(null);
    };
    window.addEventListener('keydown',closeWithEscape);
    return()=>{
      window.removeEventListener('keydown',closeWithEscape);
      gameEvents.emit('game-input-lock',false);
      (document.activeElement as HTMLElement|null)?.blur?.();
    };
  },[active,showJourneyComplete,coach]);

  const openExperience=(id:LakeExperienceId)=>{
    socket.emit('enterLakeExperience',id);setActive(id);
  };
  const experienceName=(id:LakeExperienceId)=>id==='central-plaza'?'축제 부스':id==='activity-zone'?'공연 부스':id==='food-shop-zone'?'먹거리·상점 부스':'세종 추천 코스 게시판';
  const toggleContent=(id:string)=>setProfile(current=>{
    const removing=current.savedContentIds.includes(id);
    if(!removing&&current.savedContentIds.length>=2){setFestivalLimitNotice(true);window.setTimeout(()=>setFestivalLimitNotice(false),2200);return current}
    setFestivalLimitNotice(false);
    return {...current,savedContentIds:removing?current.savedContentIds.filter(saved=>saved!==id):[...current.savedContentIds,id],updatedAt:Date.now()};
  });
  const toggleActivity=(id:string)=>setProfile(current=>{const selected=current.activities.includes(id);if(!selected&&current.activities.length>=2){setPerformanceLimitNotice(true);window.setTimeout(()=>setPerformanceLimitNotice(false),2200);return current}setPerformanceLimitNotice(false);return {...current,activities:selected?current.activities.filter(saved=>saved!==id):[...current.activities,id],updatedAt:Date.now()}});
  const toggleFoodShop=(id:string)=>{
    const item=foodShopContents.find(content=>content.id===id);if(!item)return;
    setFoodSelectionComplete(false);
    setProfile(current=>{
      const list=current.foodPlaceInterests,removing=list.some(saved=>saved.id===id);
      if(!removing&&list.length>=3){setFoodLimitNotice(true);window.setTimeout(()=>setFoodLimitNotice(false),2200);return current}
      setFoodLimitNotice(false);
      const interest:FoodPlaceInterest={id:item.id,name:item.name,type:item.group==='지역 먹거리'?'food':'place',category:item.category,tags:item.tags};
      return {...current,foodPlaceInterests:removing?list.filter(saved=>saved.id!==id):[...list,interest],updatedAt:Date.now()};
    });
  };
  const toggleCourse=(title:string)=>setProfile(current=>({...current,likedCourseTitles:current.likedCourseTitles.includes(title)?[]:[title],updatedAt:Date.now()}));
  const startTasteInterview=(domain:LakeTasteDomain)=>setCoach({domain,step:0});
  const answerTasteQuestion=(value:string)=>{
    if(!coach)return;
    const question=lakeTasteQuestions[coach.domain][coach.step];
    const nextAnswers={...profile.tasteAnswers,[question.id]:value};
    if(coach.step<lakeTasteQuestions[coach.domain].length-1){
      setProfile(current=>({...current,tasteAnswers:nextAnswers,updatedAt:Date.now()}));
      setCoach({...coach,step:coach.step+1});
      return;
    }
    const signals=coach.domain==='performance'?profile.activities:coach.domain==='food'?selectedFoodShops.flatMap(item=>[item.id,item.category,...item.tags]):savedContents.flatMap(item=>[item.id,item.title,...item.tags]);
    const insight=analyzeLakeTaste(coach.domain,signals,nextAnswers);
    setProfile(current=>({...current,tasteAnswers:nextAnswers,tasteInsights:{...current.tasteInsights,[coach.domain]:insight},updatedAt:Date.now()}));
    setCompletedBooths(current=>({...current,[coach.domain==='performance'?'activity':coach.domain]:true}));
    setCoach(null);setSelectedFestival(null);setSelectedFoodShop(null);setActive(null);
    showCompletionNotice(`충녕이가 ${insight.label} 취향을 발견했어요!`);
  };
  const completeFoodSelection=()=>{if(!selectedFoodShops.length)return;setFoodSelectionComplete(true);startTasteInterview('food')};
  const showCompletionNotice=(message:string)=>{setCompletionNotice(message);window.setTimeout(()=>setCompletionNotice(''),3500)};
  const completeActivitySelection=()=>{if(!profile.activities.length)return;startTasteInterview('performance')};
  const completeFestivalSelection=()=>{if(!savedContents.length)return;setSelectedFestival(null);startTasteInterview('festival')};

  if(location!=='세종호수공원')return null;
  return <>
    <aside className={`lake-journey-guide ${allBoothsCompleted?'step-3':''}`}>
      <header><span>🧭</span><div><small>호수공원 취향 여정</small><b>{allBoothsCompleted?'호수공원 체험 완료!':`자유 체험 ${completedCount} / 3`}</b></div></header>
      <div className="lake-journey-steps">{([['공연',completedBooths.activity],['먹거리',completedBooths.food],['축제',completedBooths.festival]] as const).map(([label,done],index)=><div key={label} className={done?'done':'current'}><i>{done?<Check size={11}/>:index+1}</i><span>{label}</span></div>)}</div>
      <p>{allBoothsCompleted?'충녕이가 세 가지 취향 분석을 마쳤어요. 다음 공간의 안내가 내 취향에 맞게 달라집니다.':'부스에서 선택하고 충녕이의 짧은 질문에 답해 보세요.'}</p>
      {allBoothsCompleted&&<button type="button" onClick={()=>setShowJourneyComplete(true)}>내 취향 결과 보기 →</button>}
    </aside>
    {journeyNotice&&<div className="lake-journey-notice" role="status">{journeyNotice}</div>}
    {foodSavedNotice&&<aside className="food-saved-map-notice" role="status"><span><Check size={22}/></span><div><b>내 세종 맛 {selectedFoodShops.length}개 저장 완료!</b><p>선택한 취향이 맞춤 코스에 반영됩니다.</p></div><button type="button" onClick={()=>setFoodSavedNotice(false)} aria-label="저장 알림 닫기"><X size={16}/></button></aside>}
    {completionNotice&&<aside className="food-saved-map-notice" role="status"><span><Check size={22}/></span><div><b>{completionNotice}</b><p>선택한 취향이 맞춤 코스에 반영됩니다.</p></div><button type="button" onClick={()=>setCompletionNotice('')} aria-label="저장 알림 닫기"><X size={16}/></button></aside>}

    {nearby&&!active&&<button type="button" className={`lake-experience-enter is-${nearby.id}`} onClick={()=>openExperience(nearby.id)}>
      <span>{nearby.id==='central-plaza'?'🎪':nearby.id==='activity-zone'?'🎤':nearby.id==='food-shop-zone'?'🍑':'🗺️'}</span><div><small>{nearby.id==='food-shop-zone'?'세종 맛 발견소':'세종의 축제와 문화를 알아보는 공간'}</small><b>{nearby.id==='food-shop-zone'?'먹거리·상점 둘러보기':`${experienceName(nearby.id)} 둘러보기`}</b><em>{nearby.id==='food-shop-zone'?'세종의 맛과 장소를 골라보세요':nearby.description}</em></div><Sparkles size={18}/>
    </button>}

    {(active==='central-plaza'||active==='activity-zone'||active==='food-shop-zone')&&<div className="lake-experience-overlay festival-plaza-overlay" role="dialog" aria-modal="true" aria-labelledby="festival-title">
      <section className="festival-plaza-panel">
        <button type="button" className="lake-experience-close" onClick={()=>setActive(null)} aria-label="부스 닫기"><X size={18}/></button>
        <header className="festival-plaza-header"><div className="festival-plaza-title"><span>{active==='activity-zone'?'🎤':active==='food-shop-zone'?'🍑':'🎪'}</span><div><small>충녕이가 알아가는 나의 취향</small><h2 id="festival-title">{active==='food-shop-zone'?'세종 맛 발견소':experienceName(active)}</h2><p>{active==='central-plaza'?'끌리는 축제를 고르면 충녕이가 좋아하는 분위기를 분석해요.':active==='activity-zone'?'끌리는 공연과 짧은 답변으로 나만의 공연 취향을 찾아요.':'장소를 고른 뒤 충녕이가 나의 여행 미식 스타일을 알아가요.'}</p></div></div><div className="festival-live"><Users size={15}/><span><b>{onlineCount}명</b>이 지금 각자의 취향을 찾고 있어요</span></div></header>
        {active==='central-plaza'&&<><div className="booth-selection-progress"><div><b>설명보다 분위기에 끌리는 축제를 1~2개 골라보세요.</b><small>{festivalDataSource==='api'?'공식 연계 자료':'저장된 축제 자료'}</small></div><strong>현재 선택 {savedContents.length} / 2</strong></div>{festivalLimitNotice&&<div className="performance-limit-notice" role="status">축제는 최대 2개까지 선택할 수 있어요.</div>}<div className="festival-card-grid">{festivals.map(content=>{const saved=profile.savedContentIds.includes(content.id);return <article className={`festival-card tone-${content.tone} ${saved?'is-saved':''}`} key={content.id} role="button" tabIndex={0} onClick={()=>setSelectedFestival(content)} onKeyDown={event=>{if(event.key==='Enter')setSelectedFestival(content)}}><div className="festival-card-visual"><span>{content.emoji}</span><img src={content.image} alt={`${content.title} 축제 사진`}/><small>{content.status}</small></div><div className="festival-card-copy"><small>세종의 실제 축제 · 자세히 보기</small><h3>{content.title}</h3><p>{content.description}</p><dl><div><dt>시기</dt><dd>{content.schedule}</dd></div><div><dt>장소</dt><dd>{content.venue}</dd></div></dl><div>{content.tags.map(tag=><span key={tag}>#{tag}</span>)}</div><em>사진·정보 출처: {content.source}</em></div><button type="button" className="festival-save-button" onClick={event=>{event.stopPropagation();toggleContent(content.id)}}>{saved?<><Check size={14}/> 끌려요</>:<><Heart size={14}/> 이 분위기가 좋아요</>}</button></article>})}</div><footer className="festival-plaza-footer"><div><Heart size={16}/><span><b>{savedContents.length}개</b>의 축제 분위기를 골랐어요.</span></div><button type="button" disabled={!savedContents.length} onClick={completeFestivalSelection}><Sparkles size={15}/> 충녕이와 취향 분석하기</button></footer></>}
        {active==='activity-zone'&&<><section className="lake-activity-section performance-choice-section"><div className="performance-poster-heading"><div><small>세종의 실제 공연</small><h3>어떤 공연 분위기가 가장 끌리나요?</h3><p>장르를 고민하기보다 먼저 마음이 가는 포스터를 최대 2개 골라보세요.</p></div><strong>{profile.activities.length}<span>/2 선택</span></strong></div>{performanceLimitNotice&&<div className="performance-limit-notice" role="status">공연 취향은 최대 2개까지 선택할 수 있어요.</div>}<div className="performance-poster-grid">{activities.map(activity=>{const selected=profile.activities.includes(activity.id);return <article key={activity.id} className={selected?'active':''} role="button" tabIndex={0} onClick={()=>toggleActivity(activity.id)} onKeyDown={event=>{if(event.key==='Enter')toggleActivity(activity.id)}}><div className="performance-poster-image"><img src={activity.image} alt={`${activity.label} 공식 포스터`}/><span>{activity.emoji} {activity.mood}</span></div><div className="performance-poster-copy"><small>세종예술의전당 공식 공연</small><h3>{activity.label}</h3><p>{activity.description}</p><dl><div><dt>일정</dt><dd>{activity.schedule}</dd></div><div><dt>장소</dt><dd>{activity.venue}</dd></div></dl><button type="button" className={selected?'active':''} onClick={event=>{event.stopPropagation();toggleActivity(activity.id)}}>{selected?<><Check size={15}/> 이게 끌려요</>:<><Heart size={15}/> 마음에 들어요</>}</button><a href={activity.detailUrl} target="_blank" rel="noreferrer" onClick={event=>event.stopPropagation()}>공식 공연 정보 보기 ↗</a></div></article>})}</div></section><footer className="festival-plaza-footer performance-footer"><div><Sparkles size={16}/><span><b>{profile.activities.length}개</b>의 공연 분위기를 골랐어요.</span></div><button type="button" disabled={!profile.activities.length} onClick={completeActivitySelection}><Sparkles size={15}/> 충녕이와 취향 분석하기</button></footer></>}
        {active==='food-shop-zone'&&<><div className="booth-selection-progress"><div><b>여행 중 실제로 끌리는 맛과 공간을 1~3개 골라보세요.</b><small>선택의 공통점을 충녕이가 찾아드려요.</small></div><strong>현재 선택 {selectedFoodShops.length} / 3</strong></div>{foodLimitNotice&&<div className="performance-limit-notice" role="status">먹거리·장소는 최대 3개까지 선택할 수 있어요.</div>}<nav className="festival-category-tabs food-category-tabs" aria-label="먹거리와 상점 분류">{foodCategories.map(category=><button type="button" key={category} className={foodCategory===category?'active':''} onClick={()=>setFoodCategory(category)}>{category}</button>)}</nav><div className="food-discovery-grid">{visibleFoodShops.map(item=>{const saved=selectedFoodShops.some(interest=>interest.id===item.id),image=foodShopImages[item.id];return <article className={saved?'active':''} key={item.id} role="button" tabIndex={0} onClick={()=>setSelectedFoodShop(item)} onKeyDown={event=>{if(event.key==='Enter')setSelectedFoodShop(item)}}><div className={`food-card-image ${image?'has-photo':'no-photo'}`} role="img" aria-label={`${item.name} 대표 이미지`} style={image?{backgroundImage:`url('${image}')`}:undefined}><span>{item.emoji}</span></div><div className="food-card-copy"><small>{item.group} · 자세히 보기</small><h3>{item.name}</h3><p>{item.description}</p><em>{item.location}</em><div>{item.tags.map(tag=><span key={tag}>#{tag}</span>)}</div></div><button type="button" onClick={event=>{event.stopPropagation();toggleFoodShop(item.id)}}>{saved?<><Check size={14}/> 이게 끌려요</>:<><Heart size={14}/> 마음에 들어요</>}</button></article>})}</div><section className={`food-selection-summary ${foodSelectionComplete?'is-complete':''}`}><div className="food-selection-title"><span><Heart size={18} fill="currentColor"/></span><div><small>내가 발견한 세종의 맛</small><h3>마음이 간 세종 맛 <b>{selectedFoodShops.length}</b>개</h3></div></div>{selectedFoodShops.length?<div className="food-selection-chips">{selectedFoodShops.map(item=>{const content=foodShopContents.find(candidate=>candidate.id===item.id);return <button type="button" key={item.id} onClick={()=>toggleFoodShop(item.id)}>{content?.emoji} {item.name}<X size={12}/></button>})}</div>:<p>마음에 드는 카드를 골라 나만의 세종 맛을 만들어 보세요.</p>}<button type="button" className="food-complete-button" disabled={!selectedFoodShops.length} onClick={completeFoodSelection}><Sparkles size={17}/>충녕이와 취향 분석하기</button></section></>}
      </section>
      {selectedFestival&&<section className="festival-detail-modal" role="dialog" aria-modal="true" aria-labelledby="festival-detail-title"><button type="button" className="festival-detail-close" onClick={()=>setSelectedFestival(null)} aria-label="축제 상세 닫기"><X size={18}/></button><div className="festival-detail-image"><img src={selectedFestival.image} alt={`${selectedFestival.title} 대표 사진`}/><small>{selectedFestival.status}</small></div><div className="festival-detail-copy"><small>세종 공식 축제</small><h2 id="festival-detail-title">{selectedFestival.title}</h2><p>{selectedFestival.description}</p><dl><div><dt>개최 시기</dt><dd>{selectedFestival.schedule}</dd></div><div><dt>개최 장소</dt><dd>{selectedFestival.venue}</dd></div></dl><h3>주요 키워드</h3><div className="festival-detail-tags">{selectedFestival.tags.map(tag=><span key={tag}>#{tag}</span>)}</div><footer><button type="button" onClick={()=>toggleContent(selectedFestival.id)}>{profile.savedContentIds.includes(selectedFestival.id)?<><Check size={14}/> 관심 축제 저장됨</>:<><Bookmark size={14}/> 관심 축제로 저장</>}</button></footer><em>사진·정보 출처: {selectedFestival.source}</em></div></section>}
      {selectedFoodShop&&<section className="food-detail-modal" role="dialog" aria-modal="true" aria-labelledby="food-detail-title"><button type="button" className="festival-detail-close" onClick={()=>setSelectedFoodShop(null)} aria-label="먹거리 상세 닫기"><X size={18}/></button><div className={`food-detail-image ${foodShopImages[selectedFoodShop.id]?'has-photo':'no-photo'}`} style={foodShopImages[selectedFoodShop.id]?{backgroundImage:`url('${foodShopImages[selectedFoodShop.id]}')`}:undefined}><span>{selectedFoodShop.emoji}</span>{foodShopPhotoSource[selectedFoodShop.id]&&<small>사진 출처: {foodShopPhotoSource[selectedFoodShop.id]}</small>}</div><div className="food-detail-copy"><small>세종 먹거리와 장소 · {selectedFoodShop.group}</small><h2 id="food-detail-title">{selectedFoodShop.name}</h2><p>{selectedFoodShop.description}</p><dl><div><dt>분류</dt><dd>{selectedFoodShop.group}</dd></div><div><dt>위치</dt><dd>{selectedFoodShop.location}</dd></div></dl><h3>이곳의 특징</h3><div className="festival-detail-tags">{selectedFoodShop.tags.map(tag=><span key={tag}>#{tag}</span>)}</div><footer><button type="button" onClick={()=>toggleFoodShop(selectedFoodShop.id)}>{selectedFoodShops.some(item=>item.id===selectedFoodShop.id)?<><Check size={14}/> 선택했어요</>:<><Bookmark size={14}/> {selectedFoodShop.action}</>}</button></footer></div></section>}
      {coach&&coachQuestion&&<section className="chungnyeong-taste-coach" role="dialog" aria-modal="true" aria-labelledby="chungnyeong-question">
        <button type="button" className="festival-detail-close" onClick={()=>setCoach(null)} aria-label="충녕이 질문 닫기"><X size={18}/></button>
        <div className="chungnyeong-coach-avatar"><span>👑</span><i><Sparkles size={14}/></i></div>
        <small>인공지능 동행자 충녕이 · {coach.step+1} / {lakeTasteQuestions[coach.domain].length}</small>
        <p>선택을 보니 조금씩 취향이 보여요.</p>
        <h2 id="chungnyeong-question">{coachQuestion.question}</h2>
        <div className="chungnyeong-answer-grid">{coachQuestion.options.map(option=><button type="button" key={option.value} onClick={()=>answerTasteQuestion(option.value)}><span>{option.emoji}</span><b>{option.label}</b></button>)}</div>
        <div className="chungnyeong-question-progress">{lakeTasteQuestions[coach.domain].map((_,index)=><i className={index<=coach.step?'active':''} key={index}/>)}</div>
        <em>정답은 없어요. 지금 더 끌리는 쪽을 골라주세요.</em>
      </section>}
    </div>}

    {showJourneyComplete&&allBoothsCompleted&&<div className="lake-experience-overlay lake-completion-overlay" role="dialog" aria-modal="true" aria-labelledby="lake-completion-title">
      <section className="lake-completion-panel">
        <button type="button" className="lake-experience-close" onClick={()=>setShowJourneyComplete(false)} aria-label="완료 결과 닫기"><X size={18}/></button>
        <span className="lake-completion-icon">🌸</span><small>충녕이의 취향 분석</small><h2 id="lake-completion-title">나의 취향을 분석했어요</h2>
        <p>선택과 답변에서 발견한 나의 여행 취향이에요.</p>
        <dl className="lake-taste-report">
          <div><dt>🎤 공연</dt><dd><b>{profile.tasteInsights.performance?.label}</b><span>{'⭐'.repeat(profile.tasteInsights.performance?.stars??0)}</span><small>{profile.tasteInsights.performance?.detail}</small></dd></div>
          <div><dt>🍑 음식</dt><dd><b>{profile.tasteInsights.food?.label}</b><span>{'⭐'.repeat(profile.tasteInsights.food?.stars??0)}</span><small>{profile.tasteInsights.food?.detail}</small></dd></div>
          <div><dt>🎪 축제</dt><dd><b>{profile.tasteInsights.festival?.label}</b><span>{'⭐'.repeat(profile.tasteInsights.festival?.stars??0)}</span><small>{profile.tasteInsights.festival?.detail}</small></dd></div>
        </dl>
        <em>이 취향을 기억하고 수목원의 관찰 안내와 이후 세종 맞춤 코스에 반영할게요.</em>
        <p className="lake-completion-portal-guide">맵으로 돌아가 캐릭터를 직접 움직인 뒤 베어트리파크 포털에 들어가세요.</p>
        <div className="lake-completion-actions"><button type="button" className="lake-completion-dismiss" onClick={()=>{localStorage.setItem(LAKE_COMPLETION_DISMISSED_KEY,'true');setJourneyCompleteDismissed(true);setShowJourneyComplete(false)}}>다시 안 보기</button><button type="button" className="lake-completion-travel" onClick={()=>{setShowJourneyComplete(false);setJourneyNotice('빛나는 베어트리파크 포털을 찾아 직접 이동하세요!');window.setTimeout(()=>setJourneyNotice(''),4000)}}>맵으로 돌아가 포털 찾기</button></div>
      </section>
    </div>}

    {active==='wind-hill'&&<div className="lake-experience-overlay lake-picnic-overlay" role="dialog" aria-modal="true" aria-labelledby="course-board-title">
      <section className="lake-picnic-panel">
        <button type="button" className="lake-experience-close" onClick={()=>setActive(null)} aria-label="세종 추천 코스 게시판 닫기"><X size={18}/></button>
        <header><span>🗺️</span><small>세종 추천 여행 코스</small><h2 id="course-board-title">세종 추천 코스 게시판</h2><p>마음에 드는 코스를 열어 동선을 미리 보고 ‘나도 가고 싶어요’로 저장해 보세요.</p></header>
        <section className="lake-saved-section"><div className="lake-section-heading"><div><small>실제 세종 여행 동선</small><h3>실제로 방문 가능한 세종 여행 코스</h3><p>공식 관광·시티투어 동선을 바탕으로 가까운 장소끼리 연결했어요.</p></div><button type="button" onClick={()=>setActive('central-plaza')}>내 관심사 더 담기</button></div><div className="lake-saved-list course-preview-list">{sharedCourses.map(course=>{const liked=profile.likedCourseTitles.includes(course.title);return <article key={course.title} role="button" tabIndex={0} onClick={()=>setSelectedCourse(course)} onKeyDown={event=>{if(event.key==='Enter')setSelectedCourse(course)}}><span>{course.emoji}</span><div><small>{course.tags.map(tag=>`#${tag}`).join(' ')} · {course.duration}</small><b>{course.title}</b><p>{course.stops.join(' → ')}</p><em>{course.source}</em></div><button type="button" onClick={event=>{event.stopPropagation();toggleCourse(course.title)}} aria-label={`${course.title} 나도 가고 싶어요`}><ThumbsUp size={14} fill={liked?'currentColor':'none'}/><small>{course.likes+(liked?1:0)}</small></button></article>})}</div></section>
        <footer className="lake-record-footer"><div><Route size={17}/><span><b>나만의 기록도 실제 방문으로 이어져요.</b><small>수목원에서 탐험 기록을 만들고 공동캠퍼스에서 함께할 사람을 만나보세요.</small></span></div><button type="button" onClick={()=>setActive(null)}>호수공원으로 돌아가기</button></footer>
      </section>
      {selectedCourse&&<section className="course-detail-modal" role="dialog" aria-modal="true" aria-labelledby="course-detail-title"><button type="button" className="festival-detail-close" onClick={()=>setSelectedCourse(null)} aria-label="코스 미리보기 닫기"><X size={18}/></button><span>{selectedCourse.emoji}</span><small>실제 여행 코스 · {selectedCourse.duration}</small><h2 id="course-detail-title">{selectedCourse.title}</h2><div className="course-stop-list">{selectedCourse.stops.map((stop,index)=><div key={stop}><i>{index+1}</i><b>{stop}</b>{index<selectedCourse.stops.length-1&&<em>↓</em>}</div>)}</div><p className="course-detail-source">구성 기준: {selectedCourse.source}</p><button type="button" className={profile.likedCourseTitles.includes(selectedCourse.title)?'active':''} onClick={()=>toggleCourse(selectedCourse.title)}><ThumbsUp size={15}/>{profile.likedCourseTitles.includes(selectedCourse.title)?'가고 싶은 코스로 저장됨':'나도 이 코스 가고 싶어요'}</button></section>}
    </div>}
  </>;
}
