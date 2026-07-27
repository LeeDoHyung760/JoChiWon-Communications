import type { Festival } from '../../types/festival.js';
import { festivalStatus } from './sejongFestivals.js';

const CACHE_TTL_MS=60*60*1000;
let cache:{festivals:Festival[];expiresAt:number;fetchedAt:string}|undefined;

const base={
  organizer:'세종특별자치시',
  host:'세종시문화관광재단',
  sponsor:'',
  phone:'',
  relatedInfo:'2026년 공식 공지 기준',
  source:'sejong-official-2026' as const,
};

export function getOfficial2026Festivals():{festivals:Festival[];cached:boolean;fetchedAt:string}{
  const now=Date.now();
  if(cache&&cache.expiresAt>now)return {festivals:cache.festivals,cached:true,fetchedAt:cache.fetchedAt};

  const values:Array<Omit<Festival,'status'>>=[
    {
      ...base,id:'sejong-2026-spring-flower',name:'2026 조치원 봄꽃축제',
      startDate:'2026-04-04',endDate:'2026-04-05',venue:'조치원읍 일원',
      description:'조치원의 봄꽃과 지역 문화공연, 시민 참여 프로그램을 함께 즐기는 봄 축제입니다.',
      homepage:'https://www.sjcf.or.kr/index.do',
      image:'/images/festivals/spring-flower-2026.jpg',
    },
    {
      ...base,id:'sejong-2026-nakhwa',name:'2026 세종낙화축제',
      startDate:'2026-05-16',endDate:'2026-05-16',venue:'세종호수공원·중앙공원 일원',
      description:'전통 낙화가 호수공원의 밤을 수놓는 세종 대표 야간 문화관광축제입니다.',
      homepage:'https://www.sjcf.or.kr/index.do',
      image:'/images/festivals/nakhwa-2026.jpg',
    },
    {
      ...base,id:'sejong-2026-childrens-day',name:'제104회 세종 어린이날 축제',
      startDate:'2026-05-05',endDate:'2026-05-05',venue:'세종호수공원 중앙광장·매화공연장 일원',
      description:'어린이날을 맞아 가족이 함께 공연, 놀이, 체험과 먹거리를 즐기는 시민 축제입니다.',
      homepage:'https://www.sejong.go.kr/index.jsp',
      image:'/images/festivals/childrens-day-2026.jpg',
    },
    {
      ...base,id:'sejong-2026-kings-birthday-book',name:'제629돌 세종대왕 나신 날 × 세종 책사랑 축제',
      startDate:'2026-05-15',endDate:'2026-05-16',venue:'세종호수공원·중앙공원 일원',
      description:'세종대왕 나신 날을 기념하며 한글과 책을 주제로 공연, 독서문화와 가족 체험을 선보이는 축제입니다.',
      homepage:'https://www.sjcf.or.kr/hangeul/www/index.do',
      image:'/images/festivals/king-book-2026.jpg',
    },
    {
      ...base,id:'sejong-2026-dano',name:'2026 세종단오제',
      startDate:'2026-06-13',endDate:'2026-06-13',venue:'세종특별자치시 일원',
      description:'단오의 세시풍속과 전통·현대 공연, 체험 및 포토존을 함께 즐기는 지역문화축제입니다.',
      homepage:'https://korean.visitkorea.or.kr/kfes/detail/fstvlDetail.do?fstvlCntntsId=4495d901-1618-4c5a-b431-f97a600430ec',
      image:'/images/festivals/dano-2026.jpg',
    },
    {
      ...base,id:'sejong-2026-peach',name:'제24회 세종 조치원복숭아축제',
      startDate:'2026-07-24',endDate:'2026-07-26',venue:'세종시민운동장 보조경기장·도도리파크 일원',
      description:'조치원 복숭아 판매와 먹거리, 공연, 물놀이 및 체험 프로그램을 만나는 여름 축제입니다.',
      homepage:'https://www.sjcf.or.kr/index.do',
      image:'/images/festivals/peach-2026.jpg',
    },
    {
      ...base,id:'sejong-2026-hangeul',name:'2026 세종한글축제',
      startDate:'2026-10-09',endDate:'2026-10-11',venue:'세종호수공원·중앙공원 일원',
      description:'한글날을 중심으로 전시, 공연과 시민 참여 프로그램을 선보이는 세종 대표 문화축제입니다.',
      homepage:'https://www.sjcf.or.kr/index.do',
      image:'/images/festivals/hangeul-2026.jpg',
    },
    {
      ...base,id:'sejong-2026-street-hangeul',name:'2026 거리 한글문화 한마당',
      startDate:'',endDate:'',venue:'세종시 주요 거리·생활권 일원',
      description:'거리 공연과 시민 참여 프로그램으로 생활 속에서 한글문화를 만나는 순회형 문화 한마당입니다. 회차별 일정은 공식 공지를 확인해 주세요.',
      homepage:'https://www.sjcf.or.kr/hangeul/www/bbs/list.do?key=2504150020',
      image:'/images/festivals/street-hangeul-2026.jpg',
    },
  ];
  const festivals=values.map(value=>({
    ...value,
    status:value.startDate?festivalStatus(value.startDate,value.endDate):'예정' as const,
  }));
  const fetchedAt=new Date(now).toISOString();
  cache={festivals,expiresAt:now+CACHE_TTL_MS,fetchedAt};
  return {festivals,cached:false,fetchedAt};
}
