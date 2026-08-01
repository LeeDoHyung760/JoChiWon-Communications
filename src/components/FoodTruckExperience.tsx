import {useEffect,useMemo,useRef,useState} from 'react';
import {Bookmark,Check,Clock,Info,MapPin,Search,Sparkles,X} from 'lucide-react';
import {sejongRestaurants} from '../data/sejongRestaurants';
import {sejongDiningCodeDessertPlaces} from '../data/sejongDiningCodePlaces';
import {sejongLocalFoods} from '../data/sejongLocalFoods';
import type {FoodTruckId,SejongFoodPlace} from '../data/sejongFoodTypes';
import {gameEvents} from '../game/events';
import {recordExperienceAction} from '../services/experienceHarness';
import './FoodTruckExperience.css';
import './FoodTruckKiosk.css';
import './FoodTruckDetails.css';
import './FoodTruckLocalDetail.css';

export type {FoodTruckId} from '../data/sejongFoodTypes';
type NearbyTruck={id:FoodTruckId;label:string}|null;
type Section='hours'|'price'|'origin'|'nearby';
const allItems=[...sejongRestaurants,...sejongLocalFoods,...sejongDiningCodeDessertPlaces].filter(item=>item.active);
const menus:Record<FoodTruckId,{eyebrow:string;title:string;description:string;button:string;color:string;emoji:string}>={
 local:{eyebrow:'SEJONG RESTAURANTS',title:'세종 대표 맛집',description:'세종에서 실제로 방문할 수 있는 식당과 대표 메뉴를 살펴보세요.',button:'맛집 둘러보기',color:'#2f9168',emoji:'🍲'},
 street:{eyebrow:'SEJONG LOCAL FOOD',title:'세종 특산물·로컬푸드',description:'조치원 복숭아와 세종산 농산물로 만든 지역 먹거리를 확인해보세요.',button:'로컬푸드 보기',color:'#d66f38',emoji:'🍑'},
 dessert:{eyebrow:'SEJONG CAFE & DESSERT',title:'세종 카페·디저트',description:'세종에서 방문할 수 있는 카페와 지역 디저트를 만나보세요.',button:'카페 둘러보기',color:'#c98645',emoji:'☕'},
};
const SAVE_KEY='sejong-food-visit-candidates-v1',STAMP_KEY='sejong-food-stamps-v1';
const event=(type:string,item?:SejongFoodPlace,extra:Record<string,unknown>={})=>recordExperienceAction({type,truck:item?.truckId,itemId:item?.id,itemType:item?.itemType,categories:item?.category??[],tags:item?.tags??[],district:item?.district,timestamp:new Date().toISOString(),...extra});

export function FoodTruckExperience(){
 const [nearby,setNearby]=useState<NearbyTruck>(null),[active,setActive]=useState<FoodTruckId|null>(null),[selected,setSelected]=useState<SejongFoodPlace|null>(null);
 const [screenRect,setScreenRect]=useState<{left:number;top:number;width:number;height:number}|null>(null),[search,setSearch]=useState(''),[filter,setFilter]=useState('전체');
 const [saved,setSaved]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem(SAVE_KEY)??'[]')}catch{return[]}});
 const [viewed,setViewed]=useState<Record<FoodTruckId,string[]>>({local:[],street:[],dessert:[]}),[sections,setSections]=useState<Record<FoodTruckId,string[]>>({local:[],street:[],dessert:[]});
 const [activeInfoSection,setActiveInfoSection]=useState<string|null>(null);
 const [stamps,setStamps]=useState<FoodTruckId[]>(()=>{try{return JSON.parse(localStorage.getItem(STAMP_KEY)??'[]')}catch{return[]}});
 const openedAt=useRef(0),itemOpenedAt=useRef(Date.now()),lastOpened=useRef(new Set<string>()),lastInteraction=useRef(Date.now());
 useEffect(()=>{const changed=(truck:NearbyTruck)=>setNearby(truck);const mode=(id:FoodTruckId|null)=>{if(active&&!id)event('food_truck_exit',undefined,{truck:active,activeDurationSec:Math.round((Date.now()-openedAt.current)/1000)});setActive(id);setSelected(null);setSearch('');setFilter('전체');if(id){openedAt.current=Date.now();event('food_truck_enter',undefined,{truck:id})}};const rect=(value:typeof screenRect)=>setScreenRect(value);const key=(e:KeyboardEvent)=>{if(e.code==='KeyE'&&nearby&&!active){e.preventDefault();gameEvents.emit('food-truck-kiosk-activate',nearby.id)}};gameEvents.on('food-truck-proximity-changed',changed);gameEvents.on('food-truck-kiosk-mode-changed',mode);gameEvents.on('food-truck-kiosk-screen-rect',rect);window.addEventListener('keydown',key);return()=>{gameEvents.off('food-truck-proximity-changed',changed);gameEvents.off('food-truck-kiosk-mode-changed',mode);gameEvents.off('food-truck-kiosk-screen-rect',rect);window.removeEventListener('keydown',key)}},[nearby,active]);
 useEffect(()=>{if(!active)return;gameEvents.emit('game-input-lock',true);return()=>{gameEvents.emit('game-input-lock',false)}},[active]);
 const items=useMemo(()=>allItems.filter(item=>item.truckId===active&&(`${item.name} ${item.menuName} ${item.tags.join(' ')}`).toLowerCase().includes(search.toLowerCase())&&(filter==='전체'||item.category.includes(filter)||item.tags.includes(filter))),[active,search,filter]);
 const filters=useMemo(()=>['전체',...new Set(allItems.filter(i=>i.truckId===active).flatMap(i=>i.category))].slice(0,8),[active]);
 const menu=active?menus[active]:null;
 const fittedWindowRect=screenRect?{
  left:screenRect.left-screenRect.width*.23,
  top:screenRect.top+screenRect.height*.085,
  width:screenRect.width*1.46,
  height:screenRect.height*.82,
 }:null;
 const markSection=(section:Section)=>{if(!selected)return;lastInteraction.current=Date.now();setSections(current=>({...current,[selected.truckId]:[...new Set([...current[selected.truckId],section])]}));event(section==='hours'?'food_hours_open':section==='price'?'food_price_open':section==='origin'?'food_origin_open':'food_nearby_place_open',selected)};
 const markInfoSection=(section:string)=>{if(!selected)return;lastInteraction.current=Date.now();setActiveInfoSection(section);setSections(current=>({...current,[selected.truckId]:[...new Set([...current[selected.truckId],section])]}));event('food_section_open',selected,{section})};
 const openItem=(item:SejongFoodPlace)=>{const reopened=lastOpened.current.has(item.id);lastOpened.current.add(item.id);itemOpenedAt.current=Date.now();lastInteraction.current=Date.now();setActiveInfoSection(item.infoSections?.[0]?.id??null);setSelected(item);setViewed(current=>({...current,[item.truckId]:[...new Set([...current[item.truckId],item.id])]}));event(reopened?'food_reopen':'food_card_open',item)};
 const closeItem=()=>{if(selected)event('food_card_close',selected,{activeDurationSec:Math.round((Date.now()-itemOpenedAt.current)/1000)});setSelected(null);setActiveInfoSection(null)};
 const toggleSave=(item:SejongFoodPlace)=>{const removing=saved.includes(item.id),next=removing?saved.filter(id=>id!==item.id):[...saved,item.id];setSaved(next);localStorage.setItem(SAVE_KEY,JSON.stringify(next));event(removing?'food_unsave':'food_save',item)};
 useEffect(()=>{(['local','street','dessert'] as FoodTruckId[]).forEach(id=>{if(stamps.includes(id)||viewed[id].length<3||sections[id].length<2)return;const qualifies=viewed[id].some(itemId=>saved.includes(itemId))||sections[id].some(s=>['hours','origin','nearby'].includes(s));if(!qualifies)return;const next=[...stamps,id];setStamps(next);localStorage.setItem(STAMP_KEY,JSON.stringify(next));event('food_truck_complete',undefined,{truck:id});if(next.length===3)gameEvents.emit('experience-analysis-request')})},[viewed,sections,saved,stamps]);
 return <>
  {active&&<div className="food-truck-kiosk-active-marker" aria-hidden="true"/>}
  {nearby&&!active&&<button type="button" className="food-truck-prompt" onClick={()=>gameEvents.emit('food-truck-kiosk-activate',nearby.id)}><span>{menus[nearby.id].emoji}</span><div><small>세종 먹거리 안내</small><b>{menus[nearby.id].title}</b><em>{menus[nearby.id].button}</em></div><kbd>E</kbd></button>}
   {menu&&fittedWindowRect&&<div className="food-truck-overlay is-kiosk" role="dialog" aria-modal="true" aria-label={menu.title}><section className="food-truck-menu" style={{'--truck-color':menu.color,left:fittedWindowRect.left,top:fittedWindowRect.top,width:fittedWindowRect.width,height:fittedWindowRect.height} as React.CSSProperties}>
   <button type="button" className="food-truck-close" onClick={()=>gameEvents.emit('food-truck-kiosk-close')} aria-label="닫기"><X size={20}/></button>
   <header><span>{menu.emoji}</span><div><small>{menu.eyebrow}</small><h2>{menu.title}</h2><p>{menu.description}</p></div><div className="food-stamps">{(['local','street','dessert'] as FoodTruckId[]).map(id=><i className={stamps.includes(id)?'done':''} key={id}>{stamps.includes(id)?'✓':'○'}</i>)}</div></header>
   <div className="food-tools"><label><Search size={15}/><input value={search} onChange={e=>{setSearch(e.target.value);event('food_search',undefined,{truck:active,query:e.target.value.slice(0,50)})}} placeholder="메뉴·지역·태그 검색"/></label><nav>{filters.map(value=><button className={filter===value?'active':''} key={value} onClick={()=>{setFilter(value);event('food_filter_apply',undefined,{truck:active,categories:value==='전체'?[]:[value]})}}>{value}</button>)}</nav></div>
   <div className="food-truck-menu-grid">{items.map(item=><article key={item.id}><button className="food-card-main" onClick={()=>openItem(item)}>{item.imageUrl?<img src={item.imageUrl} alt={`${item.name} 대표 이미지`}/>:<div className="food-truck-fallback">{menu.emoji}</div>}<section><small>{item.category.join(' · ')}</small><h3>{item.name}</h3><b>{item.menuName}</b><p>{item.description}</p><em><MapPin size={12}/>{item.district}</em></section></button><button className="food-save" onClick={()=>toggleSave(item)}>{saved.includes(item.id)?<><Check size={13}/> 저장됨</>:<><Bookmark size={13}/> 방문 후보</>}</button></article>)}</div>
   <footer><Sparkles size={16}/><span>카드 3개, 상세 정보 2종 이상, 지도·영업시간·원산지·저장 중 하나를 확인하면 스탬프가 완성됩니다.</span></footer>
  </section></div>}
  {selected?.infoSections&&<div className="food-detail-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)closeItem()}}><section className="food-place-detail food-local-detail" role="dialog" aria-modal="true" aria-labelledby="food-local-title"><button className="food-truck-close" onClick={closeItem}><X/></button><img src={selected.imageUrl} alt=""/><div className="food-place-copy"><small>{selected.sourceLabel} · {selected.verifiedAt} 확인</small><h2 id="food-local-title">{selected.name}</h2><h3>{selected.menuName}</h3><p>{selected.description}</p><div className="food-local-section-tabs">{selected.infoSections.map(section=><button key={section.id} className={activeInfoSection===section.id?'active':''} onClick={()=>markInfoSection(section.id)}>{section.title}</button>)}</div>{selected.infoSections.filter(section=>section.id===(activeInfoSection??selected.infoSections?.[0]?.id)).map(section=><article className="food-local-section" key={section.id}><Info size={18}/><div><h4>{section.title}</h4><p>{section.content}</p></div></article>)}<div className="food-place-links"><a href={selected.sourceUrl} target="_blank" rel="noreferrer">공식 자료 확인</a><button onClick={()=>toggleSave(selected)}>{saved.includes(selected.id)?'관심 저장 취소':'관심 저장'}</button></div></div></section></div>}
  {selected&&<div className="food-detail-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)closeItem()}}><section className="food-place-detail" role="dialog" aria-modal="true" aria-labelledby="food-place-title"><button className="food-truck-close" onClick={closeItem}><X/></button><img src={selected.imageUrl} alt=""/><div className="food-place-copy"><small>{selected.sourceLabel} · {selected.verifiedAt} 확인</small><h2 id="food-place-title">{selected.name}</h2><h3>{selected.menuName}</h3><p>{selected.description}</p><div className="food-detail-actions"><button onClick={()=>markSection('hours')}><Clock/> 영업시간</button><button onClick={()=>markSection('price')}>₩ 가격대</button>{selected.origin&&<button onClick={()=>markSection('origin')}><Info/> 원산지</button>}<button onClick={()=>markSection('nearby')}><MapPin/> 주변 명소</button></div><dl><div><dt>주소</dt><dd>{selected.address}</dd></div><div><dt>영업</dt><dd>{selected.openingHours} · {selected.closedDays}</dd></div><div><dt>가격</dt><dd>{selected.priceRange}</dd></div>{selected.origin&&<div><dt>생산·원산지</dt><dd>{selected.origin}</dd></div>}<div><dt>주변</dt><dd>{selected.nearbyPlaces.join(' · ')}</dd></div></dl><div className="food-place-links"><a href={selected.mapUrl} target="_blank" rel="noreferrer" onClick={()=>{markSection('nearby');event('food_map_open',selected)}}>지도 보기</a><a href={selected.sourceUrl} target="_blank" rel="noreferrer">출처 확인</a><button onClick={()=>toggleSave(selected)}>{saved.includes(selected.id)?'저장 취소':'방문 후보 저장'}</button></div><p className="food-verification-note">영업시간·가격·메뉴는 바뀔 수 있으니 방문 전에 매장 또는 지도에서 다시 확인하세요.</p></div></section></div>}
  {stamps.length===3&&<aside className="food-complete-toast"><b>세종 미식 스탬프 3개 완료!</b><span>세종 미식 탐험가 배지와 먹거리 취향 프로필이 생성됐어요.</span></aside>}
 </>;
}
