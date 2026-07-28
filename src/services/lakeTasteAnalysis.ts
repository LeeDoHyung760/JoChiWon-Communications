export type LakeTasteDomain='performance'|'food'|'festival';

export type LakeTasteInsight={
  label:string;
  detail:string;
  stars:1|2|3;
  keywords:string[];
};

export type LakeTasteAnswers=Record<string,string>;
export type LakeTasteInsights=Partial<Record<LakeTasteDomain,LakeTasteInsight>>;

export const lakeTasteQuestions:Record<LakeTasteDomain,{id:string;question:string;options:{value:string;label:string;emoji:string}[]}[]>={
  performance:[
    {id:'performance-energy',question:'조용히 몰입하는 공연과 신나게 즐기는 공연, 어느 쪽이 더 좋아요?',options:[
      {value:'immersive',label:'조용히 몰입하기',emoji:'🌙'},
      {value:'energetic',label:'신나게 즐기기',emoji:'🎸'},
    ]},
    {id:'performance-scene',question:'공연을 본다면 어떤 장면이 더 끌리나요?',options:[
      {value:'outdoor',label:'야외에서 자유롭게',emoji:'🌿'},
      {value:'stage',label:'무대에 집중해서',emoji:'🎭'},
    ]},
  ],
  food:[
    {id:'food-pace',question:'여행 중 더 오래 머물고 싶은 곳은 어디인가요?',options:[
      {value:'meal',label:'든든한 로컬 맛집',emoji:'🍜'},
      {value:'cafe',label:'느긋한 카페',emoji:'☕'},
    ]},
    {id:'food-flavor',question:'오늘 더 당기는 맛은 무엇인가요?',options:[
      {value:'bold',label:'매콤하고 진한 맛',emoji:'🌶️'},
      {value:'sweet',label:'달콤한 디저트',emoji:'🍰'},
    ]},
  ],
  festival:[
    {id:'festival-action',question:'축제에서 더 하고 싶은 일은 무엇인가요?',options:[
      {value:'photo',label:'예쁜 장면 남기기',emoji:'📷'},
      {value:'experience',label:'직접 참여하기',emoji:'🙌'},
    ]},
    {id:'festival-time',question:'어떤 축제 분위기에 더 마음이 가나요?',options:[
      {value:'day',label:'밝고 활기찬 낮',emoji:'☀️'},
      {value:'night',label:'빛나는 야간 축제',emoji:'🌙'},
    ]},
  ],
};

const includesAny=(values:string[],needles:string[])=>values.some(value=>needles.some(needle=>value.includes(needle)));

export function analyzeLakeTaste(domain:LakeTasteDomain,selectionSignals:string[],answers:LakeTasteAnswers):LakeTasteInsight{
  if(domain==='performance'){
    const energetic=answers['performance-energy']==='energetic'||answers['performance-scene']==='outdoor'||includesAny(selectionSignals,['lunch','starry']);
    const label=energetic?'자유로운 라이브':'몰입형 공연';
    return {label,detail:energetic?'정해진 형식보다 현장의 분위기와 생동감을 즐기는 편이에요.':'이야기와 음악에 천천히 집중하는 시간을 좋아해요.',stars:3,keywords:energetic?['버스킹','야외공연','라이브']:['클래식','연극','감성공연']};
  }
  if(domain==='food'){
    const cafe=answers['food-pace']==='cafe'||includesAny(selectionSignals,['cafe','bakery','coffee','roasters']);
    const sweet=answers['food-flavor']==='sweet';
    const label=cafe?(sweet?'카페·디저트':'느긋한 카페'):sweet?'달콤한 로컬 맛':'든든한 로컬 미식';
    return {label,detail:cafe?'한 끼를 서두르기보다 마음에 드는 공간에 오래 머무는 스타일이에요.':'지역의 개성이 담긴 든든한 한 끼를 찾아다니는 스타일이에요.',stars:3,keywords:cafe?['카페','디저트','휴식']:['로컬맛집','전통시장','한식']};
  }
  const active=answers['festival-action']==='experience'||includesAny(selectionSignals,['어린이','체험','복숭아','단오']);
  const night=answers['festival-time']==='night'||includesAny(selectionSignals,['낙화','야간']);
  const label=active?(night?'야간 체험형 축제':'참여형 축제'):(night?'야간 감성 축제':'포토형 축제');
  return {label,detail:active?'구경만 하기보다 현장에서 직접 움직이고 참여할 때 더 즐거워해요.':'축제의 분위기와 기억에 남을 장면을 발견하는 일을 좋아해요.',stars:3,keywords:[active?'체험':'사진',night?'야간축제':'낮축제','현장분위기']};
}

export function readLakeTasteInsights():LakeTasteInsights{
  try{
    const saved=JSON.parse(localStorage.getItem('sejong-lake-interest-profile-v1')??'null') as {tasteInsights?:unknown}|null;
    return saved?.tasteInsights&&typeof saved.tasteInsights==='object'?saved.tasteInsights as LakeTasteInsights:{};
  }catch{return {}}
}

export function greenhouseTasteLens(){
  const insights=readLakeTasteInsights();
  const keywords=Object.values(insights).flatMap(insight=>insight?.keywords??[]);
  if(keywords.some(keyword=>['사진','야간축제','감성공연'].includes(keyword)))return {label:'감성·사진 렌즈',message:'호수공원에서 발견한 취향에 맞춰 꽃말과 사진에 담기 좋은 모습을 중심으로 안내할게요.'};
  if(keywords.some(keyword=>['체험','야외공연','라이브'].includes(keyword)))return {label:'활동·관찰 렌즈',message:'직접 발견하고 움직이는 취향에 맞춰 식물마다 눈여겨볼 관찰 포인트를 먼저 알려드릴게요.'};
  return {label:'휴식·생태 렌즈',message:'천천히 머무는 취향에 맞춰 식물의 생태와 편안하게 감상할 지점을 중심으로 안내할게요.'};
}
