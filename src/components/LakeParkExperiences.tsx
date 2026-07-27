import { useEffect,useMemo,useState } from 'react';
import { Bookmark,Check,Heart,MapPin,Route,Sparkles,ThumbsUp,Users,X } from 'lucide-react';
import type { LakeExperienceId,PlayerState } from '../../shared/socket-events';
import { gameEvents } from '../game/events';
import { socket } from '../game/systems/socketClient';
import './LakeParkExperiences.css';

type NearbyExperience={id:LakeExperienceId;label:string;description:string};
type FestivalCategory='전체'|'축제'|'공연'|'먹거리'|'지역상점';
type LakeInterestProfile={savedContentIds:string[];activities:string[];updatedAt:number};

const LAKE_INTEREST_KEY='sejong-lake-interest-profile-v1';
const categories:FestivalCategory[]=['전체','축제','공연','먹거리','지역상점'];
const activities=[
  {id:'watch',emoji:'🎵',label:'공연 함께 보기'},
  {id:'taste',emoji:'🥄',label:'지역 음식 맛보기'},
  {id:'photo',emoji:'📷',label:'사진 남기기'},
  {id:'workshop',emoji:'🎨',label:'체험 부스 참여'},
];
const festivalContents=[
  {id:'hangeul-festival',category:'축제' as const,emoji:'🎆',title:'세종축제 수상공연',description:'호수의 야경과 미디어아트가 어우러지는 세종 대표 공연을 미리 만나보세요.',tags:['야간축제','문화'],tone:'violet'},
  {id:'peach-festival',category:'축제' as const,emoji:'🍑',title:'조치원복숭아축제',description:'세종의 대표 특산품과 지역 축제의 활기를 경험해 보세요.',tags:['복숭아','지역축제'],tone:'coral'},
  {id:'lake-stage',category:'공연' as const,emoji:'🎤',title:'호수 위 야간 공연',description:'호수공원에서 열리는 음악과 미디어 공연을 감상해요.',tags:['라이브','야간'],tone:'blue'},
  {id:'peach-dessert',category:'먹거리' as const,emoji:'🥤',title:'복숭아 디저트 부스',description:'세종의 재료를 활용한 음료와 디저트를 살펴보세요.',tags:['디저트','특산품'],tone:'pink'},
  {id:'local-market',category:'지역상점' as const,emoji:'🧺',title:'세종 로컬마켓',description:'지역 공방의 소품과 농가의 특산품을 만나요.',tags:['공방','로컬상점'],tone:'amber'},
  {id:'photo-zone',category:'지역상점' as const,emoji:'📷',title:'세종 기억 포토존',description:'마음에 드는 축제 테마를 골라 캐릭터 사진을 남겨요.',tags:['사진','기록'],tone:'green'},
];
const sharedCourses=[
  {title:'초록빛 세종 반나절 코스',people:'민트곰 · 하늘여우',tags:['자연','사진','카페'],route:'국립세종수목원 → 지역 카페 → 호수공원',likes:18},
  {title:'야간축제와 로컬 맛집 코스',people:'복숭아소다 · 시장탐험가',tags:['축제','맛집'],route:'세종축제 → 지역 음식점 → 야간 산책',likes:11},
];

function readProfile():LakeInterestProfile{
  try{
    const saved=JSON.parse(localStorage.getItem(LAKE_INTEREST_KEY)??'null') as Partial<LakeInterestProfile>|null;
    return {savedContentIds:Array.isArray(saved?.savedContentIds)?saved.savedContentIds:[],activities:Array.isArray(saved?.activities)?saved.activities:[],updatedAt:typeof saved?.updatedAt==='number'?saved.updatedAt:Date.now()};
  }catch{return {savedContentIds:[],activities:[],updatedAt:Date.now()}}
}

export function LakeParkExperiences(){
  const [location,setLocation]=useState('세종호수공원');
  const [onlineCount,setOnlineCount]=useState(1);
  const [nearby,setNearby]=useState<NearbyExperience|null>(null);
  const [active,setActive]=useState<LakeExperienceId|null>(null);
  const [editorOpen,setEditorOpen]=useState(false);
  const [notice,setNotice]=useState('');
  const [selectedCategory,setSelectedCategory]=useState<FestivalCategory>('전체');
  const [profile,setProfile]=useState<LakeInterestProfile>(readProfile);
  const [likedCourses,setLikedCourses]=useState<string[]>([]);

  const savedContents=useMemo(()=>festivalContents.filter(content=>profile.savedContentIds.includes(content.id)),[profile.savedContentIds]);
  const visibleContents=selectedCategory==='전체'?festivalContents:festivalContents.filter(content=>content.category===selectedCategory);

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
  useEffect(()=>{if(location!=='세종호수공원'){setActive(null);setNearby(null)}},[location]);

  const openExperience=(id:LakeExperienceId)=>{socket.emit('enterLakeExperience',id);setActive(id);setNotice('')};
  const moveExperience=(id:LakeExperienceId)=>{gameEvents.emit('lake-experience-move-to-player',id);setNotice(`${id==='central-plaza'?'축제광장':'시민 코스 게시판'}을 현재 위치로 옮겼어요.`)};
  const toggleContent=(id:string)=>setProfile(current=>({...current,savedContentIds:current.savedContentIds.includes(id)?current.savedContentIds.filter(saved=>saved!==id):[...current.savedContentIds,id],updatedAt:Date.now()}));
  const toggleActivity=(id:string)=>setProfile(current=>({...current,activities:current.activities.includes(id)?current.activities.filter(saved=>saved!==id):[...current.activities,id],updatedAt:Date.now()}));

  if(location!=='세종호수공원')return null;
  return <>
    <div className={`lake-experience-editor ${editorOpen?'is-open':''}`}>
      <button type="button" className="lake-experience-editor-toggle" onClick={()=>setEditorOpen(open=>!open)}><MapPin size={15}/><span>체험 위치 편집</span></button>
      {editorOpen&&<div className="lake-experience-editor-menu"><small>호수공원 안의 두 핵심 공간 위치를 지정합니다.</small><button type="button" onClick={()=>moveExperience('central-plaza')}><i className="central"/>축제광장 위치로 지정</button><button type="button" onClick={()=>moveExperience('wind-hill')}><i className="wind"/>시민 코스 게시판 위치로 지정</button>{notice&&<p>{notice}</p>}</div>}
    </div>

    <div className="lake-interest-pass" aria-label={`저장한 관심 콘텐츠 ${savedContents.length}개`}>
      <span><Heart size={14} fill="currentColor"/></span><div><small>MY SEJONG INTEREST</small><b>관심 콘텐츠 {savedContents.length}개</b></div><i>{profile.activities.length}/4 활동</i>
    </div>

    {nearby&&!active&&<button type="button" className={`lake-experience-enter is-${nearby.id}`} onClick={()=>openExperience(nearby.id)}>
      <span>{nearby.id==='central-plaza'?'🎪':'🗺️'}</span><div><small>호수공원 허브 콘텐츠</small><b>{nearby.id==='central-plaza'?'축제광장 둘러보기':'시민 방문 코스 보기'}</b><em>{nearby.id==='central-plaza'?'축제·공연·먹거리에서 내 취향을 저장해요':'다른 사용자가 함께 만든 실제 세종 코스예요'}</em></div><Sparkles size={18}/>
    </button>}

    {active==='central-plaza'&&<div className="lake-experience-overlay festival-plaza-overlay" role="dialog" aria-modal="true" aria-labelledby="festival-title">
      <section className="festival-plaza-panel">
        <button type="button" className="lake-experience-close" onClick={()=>setActive(null)} aria-label="축제광장 닫기"><X size={18}/></button>
        <header className="festival-plaza-header"><div className="festival-plaza-title"><span>🎪</span><div><small>DISCOVER MY TASTE</small><h2 id="festival-title">세종호수공원 축제광장</h2><p>세종의 실제·과거 축제와 로컬 콘텐츠를 미리 체험하고 관심사를 기록해 보세요.</p></div></div><div className="festival-live"><Users size={15}/><span><b>{onlineCount}명</b>이 지금 각자의 취향을 찾고 있어요</span></div></header>
        <nav className="festival-category-tabs" aria-label="축제 콘텐츠 분류">{categories.map(category=><button type="button" key={category} className={selectedCategory===category?'active':''} onClick={()=>setSelectedCategory(category)}>{category}</button>)}</nav>
        <div className="festival-card-grid">{visibleContents.map(content=>{const saved=profile.savedContentIds.includes(content.id);return <article className={`festival-card tone-${content.tone} ${saved?'is-saved':''}`} key={content.id}><div className="festival-card-visual"><span>{content.emoji}</span><small>{content.category}</small></div><div className="festival-card-copy"><small>SEJONG LOCAL CONTENT</small><h3>{content.title}</h3><p>{content.description}</p><div>{content.tags.map(tag=><span key={tag}>#{tag}</span>)}</div></div><button type="button" className="festival-save-button" onClick={()=>toggleContent(content.id)}>{saved?<><Check size={14}/> 저장됨</>:<><Bookmark size={14}/> 관심 장소로 저장</>}</button></article>})}</div>
        <section className="lake-activity-section"><div className="lake-section-heading"><div><small>WANT TO DO</small><h3>직접 해보고 싶은 활동</h3></div></div><div className="lake-activity-grid">{activities.map(activity=>{const selected=profile.activities.includes(activity.id);return <button type="button" key={activity.id} className={selected?'active':''} onClick={()=>toggleActivity(activity.id)}><span>{activity.emoji}</span><b>{activity.label}</b>{selected?<Check size={15}/>:<i/>}</button>})}</div></section>
        <footer className="festival-plaza-footer"><div><Heart size={16}/><span><b>{savedContents.length}개</b>의 관심 콘텐츠가 이후 사용자 추천과 AI 코스에 활용돼요.</span></div><button type="button" onClick={()=>setActive('wind-hill')}>완성된 시민 코스 보기 <span>→</span></button></footer>
      </section>
    </div>}

    {active==='wind-hill'&&<div className="lake-experience-overlay lake-picnic-overlay" role="dialog" aria-modal="true" aria-labelledby="course-board-title">
      <section className="lake-picnic-panel">
        <button type="button" className="lake-experience-close" onClick={()=>setActive(null)} aria-label="시민 코스 게시판 닫기"><X size={18}/></button>
        <header><span>🗺️</span><small>COURSES MADE TOGETHER</small><h2 id="course-board-title">시민 방문 코스 게시판</h2><p>정부청사에서 함께 완성한 실제 세종 방문 계획이 호수공원으로 돌아옵니다.</p></header>
        <section className="lake-saved-section"><div className="lake-section-heading"><div><small>SHARED COURSES</small><h3>이웃들이 함께 만든 세종</h3></div><button type="button" onClick={()=>setActive('central-plaza')}>내 관심사 더 담기</button></div><div className="lake-saved-list">{sharedCourses.map(course=>{const liked=likedCourses.includes(course.title);return <article key={course.title}><span>🧭</span><div><small>{course.people}</small><b>{course.title}</b><p>{course.tags.map(tag=>`#${tag}`).join(' ')}<br/>{course.route}</p></div><button type="button" onClick={()=>setLikedCourses(current=>liked?current.filter(title=>title!==course.title):[...current,course.title])} aria-label={`${course.title} 나도 가고 싶어요`}><ThumbsUp size={14} fill={liked?'currentColor':'none'}/></button></article>})}</div></section>
        <footer className="lake-record-footer"><div><Route size={17}/><span><b>나만의 기록도 실제 방문으로 이어져요.</b><small>수목원에서 탐험 기록을 만들고 공동캠퍼스에서 함께할 사람을 만나보세요.</small></span></div><button type="button" onClick={()=>setActive(null)}>호수공원으로 돌아가기</button></footer>
      </section>
    </div>}
  </>;
}
