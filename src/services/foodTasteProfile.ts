import {sejongDiningCodeDessertPlaces,sejongDiningCodeRestaurantPlaces} from '../data/sejongDiningCodePlaces';
import {sejongLocalFoods} from '../data/sejongLocalFoods';
import type {SejongFoodPlace} from '../data/sejongFoodTypes';

const SAVE_KEY='sejong-food-visit-candidates-v1';
const foods=[...sejongDiningCodeRestaurantPlaces,...sejongLocalFoods,...sejongDiningCodeDessertPlaces];
export type FoodTasteInsight={label:string;score:number;evidence:string[]};
export type FoodTasteProfile={saved:SejongFoodPlace[];insights:FoodTasteInsight[];summary:string};

const rules:Array<{label:string;matches:(item:SejongFoodPlace,text:string)=>boolean}>=[
  {label:'든든한 한식',matches:(_,text)=>/한식|국밥|순대|찌개|칼국수|보리밥|솥밥|삼계탕|청국장/.test(text)},
  {label:'면 요리 탐험',matches:(_,text)=>/면|국수|파스타|짜장|짬뽕|쌀국수|뇨끼/.test(text)},
  {label:'고기 메뉴 선호',matches:(_,text)=>/고기|갈비|곱창|막창|스테이크|돈까스|오리|삼겹살/.test(text)},
  {label:'카페·디저트',matches:(item,text)=>item.itemType==='cafe'||/카페|커피|디저트|베이커리|빵|브런치|아이스크림|파이|스콘/.test(text)},
  {label:'세종 로컬 발견',matches:(item,text)=>item.itemType==='local_food'||/로컬|특산|조치원|농가|지역 농산물|제철|복숭아/.test(text)},
  {label:'이색 미식 탐험',matches:(_,text)=>/베트남|중식|양식|이탈리안|일본|도삭면|양꼬치|수제버거/.test(text)},
];

function savedIds(){try{const value=JSON.parse(localStorage.getItem(SAVE_KEY)??'[]') as unknown;return Array.isArray(value)?value.filter((id):id is string=>typeof id==='string'):[]}catch{return []}}

export function buildFoodTasteProfile():FoodTasteProfile{
  const ids=new Set(savedIds()),saved=foods.filter(item=>ids.has(item.id));
  if(!saved.length)return {saved:[],insights:[],summary:''};
  const insights=rules.map(rule=>{
    const matched=saved.filter(item=>rule.matches(item,[item.name,item.menuName,...item.category,...item.tags,...item.features,...(item.atmosphereTags??[])].join(' ')));
    return {label:rule.label,score:Math.min(100,28+matched.length*22+Math.max(0,matched.length-1)*6),evidence:matched.map(item=>item.name).slice(0,3)};
  }).filter(item=>item.evidence.length).sort((a,b)=>b.score-a.score||b.evidence.length-a.evidence.length).slice(0,3);
  const names=saved.slice(0,3).map(item=>item.name).join('·'),traits=insights.slice(0,2).map(item=>item.label).join('과 ');
  return {saved,insights,summary:traits?`${names}${saved.length>3?` 외 ${saved.length-3}곳`:''}을 저장한 선택을 보면, ${traits} 취향이 두드러져요.`:`저장한 ${saved.length}개의 메뉴를 바탕으로 먹거리 취향을 분석하고 있어요.`};
}
