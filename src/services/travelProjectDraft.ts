export type TravelIdea={id:string;name:string;category:'place'|'theme'|'food'|'festival';emoji:string;votes:number};
export type TravelRole={name:string;role:string};
export type TravelMessage={id:string;author:string;text:string;createdAt:string};
export type TravelProjectDraft={
  title:string;
  concept:string;
  ideas:TravelIdea[];
  roles:TravelRole[];
  messages?:TravelMessage[];
  courseOrder?:string[];
  courseConfirmed?:boolean;
  courseStartTime?:string;
  courseDurations?:Record<string,number>;
  courseActivityMap?:Record<string,string[]>;
  courseTimes?:Record<string,string>;
  note:string;
  status:'draft'|'review-requested'|'approved';
  updatedAt:string;
};

const KEY='sejong-travel-project-draft-v1';
const keyFor=(projectId?:string)=>projectId?`${KEY}:${projectId}`:KEY;

export const DEFAULT_TRAVEL_DRAFT:TravelProjectDraft={
  title:'세종 야경 출사 여행',
  concept:'📸 야경과 감성 사진을 함께 남기는 세종 여행',
  ideas:[
    {id:'lake',name:'세종호수공원',category:'place',emoji:'🌉',votes:7},
    {id:'bridge',name:'이응다리',category:'place',emoji:'🌁',votes:5},
    {id:'cafe',name:'조치원 카페거리',category:'place',emoji:'☕',votes:3},
    {id:'night',name:'야경 사진 촬영',category:'theme',emoji:'📸',votes:6},
    {id:'peach',name:'조치원 복숭아 디저트',category:'food',emoji:'🍑',votes:6},
    {id:'festival',name:'세종 야간 재즈 페스티벌',category:'festival',emoji:'🎪',votes:5},
  ],
  roles:[
    {name:'민주',role:'사진 담당'},
    {name:'철수',role:'길찾기 담당'},
    {name:'하늘여우',role:'아이디어 담당'},
    {name:'복숭아',role:'맛집 담당'},
  ],
  note:'시간과 동선은 정부청사 AI 검증 단계에서 결정해요.',
  status:'draft',
  updatedAt:new Date().toISOString(),
};

export function loadTravelProjectDraft(projectId?:string,fallback:TravelProjectDraft=DEFAULT_TRAVEL_DRAFT):TravelProjectDraft{
  try{
    const value=localStorage.getItem(keyFor(projectId));
    return value?{...fallback,...JSON.parse(value)}:fallback;
  }catch{return fallback}
}

export function saveTravelProjectDraft(draft:TravelProjectDraft,projectId?:string){
  localStorage.setItem(keyFor(projectId),JSON.stringify({...draft,updatedAt:new Date().toISOString()}));
  window.dispatchEvent(new CustomEvent('sejong-travel-draft-changed'));
}
