export type ArtsCenterPerformance={
  title:string;
  category:string;
  description:string;
  date:string;
  venue:string;
  color:string;
  accent:string;
  image:string;
  detailUrl:string;
  age:string;
  price:string;
  runtime:string;
  host:string;
  organizer:string;
  inquiry:string;
};

export const ARTS_CENTER_PERFORMANCES:readonly ArtsCenterPerformance[]=[
  {title:'뮤지컬 〈서편제〉',category:'전통과 감동',description:'우리 소리와 현대적인 음악이 어우러지는 창작 뮤지컬',date:'2026. 7. 30. — 8. 1.',venue:'세종예술의전당',color:'#f2d8df',accent:'#8b3151',image:'/images/performances/seopyeonje-2026.jpg',detailUrl:'https://www.sjac.or.kr/base/nrr/performance/read?menuLevel=2&menuNo=76&performanceNo=650',age:'8세 이상',price:'VIP석 150,000원 · R석 120,000원 · S석 90,000원',runtime:'150분(인터미션 20분 포함)',host:'세종특별자치시',organizer:'(재)세종시문화관광재단',inquiry:'044-850-8989'},
  {title:'연극 〈렁스〉',category:'몰입하는 이야기',description:'사랑과 삶의 선택을 섬세한 대화로 풀어내는 연극',date:'2026. 8. 7. — 8. 8.',venue:'세종예술의전당',color:'#f6ebc9',accent:'#c83e55',image:'/images/performances/lungs-2026.jpg',detailUrl:'https://www.sjac.or.kr/base/nrr/performance/read?menuLevel=2&menuNo=76&performanceNo=651',age:'14세 이상',price:'R석 44,000원 · S석 33,000원',runtime:'90분(인터미션 없음)',host:'세종특별자치시',organizer:'(재)세종시문화관광재단',inquiry:'044-850-8989'},
  {title:'19시 야민락콘서트 〈레브드집시〉',category:'자유로운 라이브',description:'레브드집시의 리듬과 선율을 가까이에서 만나는 저녁',date:'2026. 8. 19. 19:00',venue:'세종예술의전당',color:'#bcefd9',accent:'#176b58',image:'/images/performances/yaminrak-revedgipsy-2026.jpg',detailUrl:'https://www.sjac.or.kr/base/nrr/performance/read?menuLevel=2&menuNo=76&performanceNo=677',age:'8세 이상',price:'전석 20,000원',runtime:'80분(인터미션 없음)',host:'세종특별자치시',organizer:'세종시문화관광재단',inquiry:'044-850-8989'},
  {title:'국립국악원 〈연희-판, 흥으로 잇는 세상〉',category:'흥으로 잇는 세상',description:'전통 연희의 생동감과 신명을 한 무대에서 만나요',date:'2026. 8. 20. 19:30',venue:'세종예술의전당',color:'#e4c79b',accent:'#153755',image:'/images/performances/national-gugak-yeonhui-pan-2026.png',detailUrl:'https://www.sjac.or.kr/base/nrr/performance/read?menuLevel=2&menuNo=77&performanceNo=652',age:'8세 이상',price:'전석 20,000원',runtime:'80분(인터미션 없음)',host:'세종특별자치시',organizer:'(재)세종시문화관광재단',inquiry:'044-850-8989'},
  {title:'국립심포니콘서트오케스트라 〈브람스, 교향곡 1번〉',category:'시대를 잇는 클래식',description:'베토벤의 황제와 브람스 교향곡 1번을 한 무대에서 만나는 밤',date:'2026. 8. 27. 19:30',venue:'세종예술의전당',color:'#d8d4c9',accent:'#263b57',image:'/images/performances/brahms-symphony-no1-2026.png',detailUrl:'https://www.sjac.or.kr/base/nrr/performance/read?menuLevel=2&menuNo=76&performanceNo=693',age:'8세 이상',price:'R석 20,000원 · S석 10,000원',runtime:'약 120분(인터미션 15분)',host:'국립심포니오케스트라',organizer:'국립심포니오케스트라',inquiry:'044-215-3455'},
];

// Vite snapshots the public directory when the dev server starts. These posters
// can be replaced while that server is running, so use the explicit public path
// in development and the normal copied path in production.
export const artsCenterPerformanceImageUrl=(performance:ArtsCenterPerformance)=>
  `${import.meta.env.DEV?'/public':''}${performance.image}?official-poster=20260802-2`;
