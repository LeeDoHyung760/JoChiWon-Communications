import {useEffect,useState} from 'react';
import {MapPin,Sparkles,X} from 'lucide-react';
import {gameEvents} from '../game/events';
import './FoodTruckExperience.css';
import './FoodTruckKiosk.css';

export type FoodTruckId='local'|'street'|'dessert';
type NearbyTruck={id:FoodTruckId;label:string}|null;
const menus:Record<FoodTruckId,{eyebrow:string;title:string;description:string;color:string;items:{emoji:string;name:string;detail:string;place:string;image?:string}[]}>= {
  local:{eyebrow:'LOCAL FOOD',title:'세종 로컬푸드 트럭',description:'세종 농가와 조치원의 제철 식재료를 만나요.',color:'#2f9168',items:[
    {emoji:'🍑',name:'조치원 복숭아',detail:'향긋하고 달콤한 세종의 대표 여름 특산물',place:'조치원읍 일원',image:'/images/festivals/peach-2026.jpg'},
    {emoji:'🥬',name:'싱싱장터 로컬 채소',detail:'세종 농가가 당일 출하한 신선한 제철 채소',place:'세종로컬푸드 싱싱장터',image:'/images/food-shops/actual/singsing-dodam.jpg'},
    {emoji:'🥩',name:'세종 한우 불고기',detail:'지역 농축산물로 차린 든든한 한 끼',place:'세종 지역 농가'},
  ]},
  street:{eyebrow:'STREET FOOD',title:'세종 길거리 음식 트럭',description:'세종의 오래된 맛집과 시장 먹거리를 간편하게 즐겨요.',color:'#d66f38',items:[
    {emoji:'🍗',name:'왕천파닭',detail:'바삭한 닭과 알싸한 파채를 함께 먹는 조치원의 명물',place:'조치원읍 조치원6길',image:'/images/food-shops/actual/wangcheon.jpg'},
    {emoji:'🍜',name:'세종 칼국수',detail:'진한 육수와 쫄깃한 면이 어우러진 지역 대표 면 요리',place:'부강면',image:'/images/food-shops/actual/matnadang.jpg'},
    {emoji:'🥣',name:'들깨수제비',detail:'고소한 들깨 국물에 손수제비를 담은 따뜻한 한 그릇',place:'세종 대평동',image:'/images/food-shops/actual/yoongane.jpg'},
  ]},
  dessert:{eyebrow:'DESSERT',title:'세종 디저트 트럭',description:'조치원 복숭아와 지역 베이커리의 달콤한 메뉴를 골라보세요.',color:'#c98645',items:[
    {emoji:'🍑',name:'복숭아 아이스크림',detail:'조치원 복숭아의 산뜻한 향을 담은 제철 디저트',place:'조치원 복숭아',image:'/images/festivals/peach-2026.jpg'},
    {emoji:'🥐',name:'세종 로컬 베이커리',detail:'지역 제과점에서 구운 바삭하고 고소한 빵',place:'세종 빵쇼과자점',image:'/images/food-shops/actual/pangshow.jpg'},
    {emoji:'☕',name:'로스터리 커피',detail:'세종 로스터리의 원두로 내린 향긋한 커피',place:'세종 지역 로스터리',image:'/images/food-shops/actual/suabean.jpg'},
  ]},
};

export function FoodTruckExperience(){
  const [nearby,setNearby]=useState<NearbyTruck>(null),[active,setActive]=useState<FoodTruckId|null>(null);
  const [screenRect,setScreenRect]=useState<{left:number;top:number;width:number;height:number}|null>(null);
  useEffect(()=>{
    const changed=(truck:NearbyTruck)=>setNearby(truck);
    const mode=(id:FoodTruckId|null)=>setActive(id),rect=(value:{left:number;top:number;width:number;height:number}|null)=>setScreenRect(value);
    const key=(event:KeyboardEvent)=>{if(event.code==='KeyE'&&nearby&&!active){event.preventDefault();gameEvents.emit('food-truck-kiosk-activate',nearby.id)}};
    gameEvents.on('food-truck-proximity-changed',changed);gameEvents.on('food-truck-kiosk-mode-changed',mode);gameEvents.on('food-truck-kiosk-screen-rect',rect);window.addEventListener('keydown',key);
    return()=>{gameEvents.off('food-truck-proximity-changed',changed);gameEvents.off('food-truck-kiosk-mode-changed',mode);gameEvents.off('food-truck-kiosk-screen-rect',rect);window.removeEventListener('keydown',key)};
  },[nearby,active]);
  useEffect(()=>{if(!active)return;gameEvents.emit('game-input-lock',true);return()=>{gameEvents.emit('game-input-lock',false)}},[active]);
  const menu=active?menus[active]:null;
  return <>
    {active&&<div className="food-truck-kiosk-active-marker" aria-hidden="true"/>}
    {nearby&&!active&&<button type="button" className="food-truck-prompt" onClick={()=>gameEvents.emit('food-truck-kiosk-activate',nearby.id)}><span>🍽️</span><div><small>푸드트럭 창구</small><b>{nearby.label} 메뉴 보기</b></div><kbd>E</kbd></button>}
    {menu&&screenRect&&<div className="food-truck-overlay is-kiosk" role="dialog" aria-modal="true" aria-label={menu.title}>
      <section className="food-truck-menu" style={{'--truck-color':menu.color,position:'fixed',left:screenRect.left,top:screenRect.top,width:screenRect.width,height:screenRect.height} as React.CSSProperties}>
        <button type="button" className="food-truck-close" onClick={()=>gameEvents.emit('food-truck-kiosk-close')} aria-label="메뉴 닫기"><X size={20}/></button>
        <header><span>🍽️</span><div><small>{menu.eyebrow} · 세종의 맛</small><h2>{menu.title}</h2><p>{menu.description}</p></div></header>
        <div className="food-truck-menu-grid">{menu.items.map(item=><article key={item.name}>{item.image?<img src={item.image} alt=""/>:<div className="food-truck-fallback">{item.emoji}</div>}<section><small>{item.emoji} 세종 추천 메뉴</small><h3>{item.name}</h3><p>{item.detail}</p><em><MapPin size={12}/>{item.place}</em></section></article>)}</div>
        <footer><Sparkles size={16}/><span>창구 가까이에서 다른 트럭의 세종 음식도 살펴보세요.</span></footer>
      </section>
    </div>}
  </>;
}
