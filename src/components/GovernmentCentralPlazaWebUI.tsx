import { useEffect,useMemo,useState,type CSSProperties } from 'react';
import { BarChart3,Bookmark,Check,Compass,Download,Plus,QrCode,Route,Smartphone,Sparkles,X } from 'lucide-react';
import type { UserProfile } from '../types';
import { gameEvents } from '../game/events';
import { buildAiSejongProfile } from '../services/aiSejongProfile';
import type { GovernmentCentralPlazaWebUiId,GovernmentCentralPlazaWebUiSurface } from '../game/governmentCentralPlazaWebUi';
import './GovernmentCentralPlazaWebUI.css';
import './GovernmentApprovalFlow.css';
import './GovernmentCoursePlanner.css';
import { loadTravelProjectDraft,saveTravelProjectDraft } from '../services/travelProjectDraft';

type ScreenPoint={x:number;y:number};
type ScreenRect={left:number;top:number;width:number;height:number;quad?:readonly [ScreenPoint,ScreenPoint,ScreenPoint,ScreenPoint]};
const WEB_UI_WIDTH=1280,WEB_UI_HEIGHT=720;
const perspectiveMatrix=(quad:ScreenRect['quad'])=>{
  if(!quad)return undefined;
  const [topLeft,topRight,bottomRight,bottomLeft]=quad;
  const dx1=topRight.x-bottomRight.x,dx2=bottomLeft.x-bottomRight.x,dx3=topLeft.x-topRight.x+bottomRight.x-bottomLeft.x;
  const dy1=topRight.y-bottomRight.y,dy2=bottomLeft.y-bottomRight.y,dy3=topLeft.y-topRight.y+bottomRight.y-bottomLeft.y;
  const denominator=dx1*dy2-dx2*dy1;
  let perspectiveX=0,perspectiveY=0;
  if(Math.abs(denominator)>1e-6){
    perspectiveX=(dx3*dy2-dx2*dy3)/denominator;
    perspectiveY=(dx1*dy3-dx3*dy1)/denominator;
  }
  const scaleX=topRight.x-topLeft.x+perspectiveX*topRight.x;
  const skewX=bottomLeft.x-topLeft.x+perspectiveY*bottomLeft.x;
  const scaleY=topRight.y-topLeft.y+perspectiveX*topRight.y;
  const skewY=bottomLeft.y-topLeft.y+perspectiveY*bottomLeft.y;
  const values=[
    scaleX/WEB_UI_WIDTH,scaleY/WEB_UI_WIDTH,0,perspectiveX/WEB_UI_WIDTH,
    skewX/WEB_UI_HEIGHT,skewY/WEB_UI_HEIGHT,0,perspectiveY/WEB_UI_HEIGHT,
    0,0,1,0,
    topLeft.x,topLeft.y,0,1,
  ];
  return `matrix3d(${values.map(value=>Math.abs(value)<1e-10?0:value).join(',')})`;
};
const routes=[
  {id:'admin',title:'도심 행정 투어',places:'정부청사 → 대통령기록관 → 국립세종박물관',time:'3시간',score:92},
  {id:'nature',title:'세종 자연 산책',places:'국립세종수목원 → 호수공원 → 전망대',time:'4시간',score:88},
  {id:'night',title:'야간 문화 코스',places:'박물관단지 → 중앙광장 → 도시전망대',time:'3.5시간',score:81},
];

export function GovernmentCentralPlazaWebUI({profile,active,onOpenChange,onNotice}:{profile:UserProfile;active:boolean;onOpenChange:(open:boolean)=>void;onNotice:(message:string)=>void}){
  const [nearby,setNearby]=useState<GovernmentCentralPlazaWebUiSurface|null>(null);
  const [screen,setScreen]=useState<GovernmentCentralPlazaWebUiId|null>(null);
  const [rect,setRect]=useState<ScreenRect|null>(null);
  const [mood,setMood]=useState('여유롭게');
  const [duration,setDuration]=useState('반나절');
  const [generated,setGenerated]=useState(false);
  const [saved,setSaved]=useState<string[]>([]);
  const [draft,setDraft]=useState(loadTravelProjectDraft);
  const [approved,setApproved]=useState(()=>loadTravelProjectDraft().status==='approved');
  const [projectLoaded,setProjectLoaded]=useState(false);
  const [optimized,setOptimized]=useState(false);
  const [coursePlaces,setCoursePlaces]=useState(['세종수목원','이응다리','조치원 카페거리','세종호수공원']);
  const [dragging,setDragging]=useState<string|null>(null);
  const ai=useMemo(()=>buildAiSejongProfile(profile),[profile]);
  const close=()=>gameEvents.emit('government-webui-close');

  useEffect(()=>{
    const proximity=(surface:GovernmentCentralPlazaWebUiSurface|null)=>setNearby(surface);
    const mode=(id:GovernmentCentralPlazaWebUiId|null)=>{setScreen(id);if(!id)setRect(null)};
    const screenRect=(value:ScreenRect|null)=>setRect(value);
    gameEvents.on('government-webui-proximity-changed',proximity);
    gameEvents.on('government-webui-mode-changed',mode);
    gameEvents.on('government-webui-screen-rect',screenRect);
    return()=>{
      gameEvents.off('government-webui-proximity-changed',proximity);
      gameEvents.off('government-webui-mode-changed',mode);
      gameEvents.off('government-webui-screen-rect',screenRect);
    };
  },[]);
  useEffect(()=>{if(!active){setNearby(null);setScreen(null);setRect(null);gameEvents.emit('government-webui-close')}},[active]);
  useEffect(()=>onOpenChange(!!screen),[onOpenChange,screen]);
  useEffect(()=>{
    if(!screen)return;
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();close()}};
    window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);
  },[screen]);
  useEffect(()=>{const refresh=()=>setDraft(loadTravelProjectDraft());window.addEventListener('sejong-travel-draft-changed',refresh);return()=>window.removeEventListener('sejong-travel-draft-changed',refresh)},[]);

  const toggleSave=(id:string)=>{
    setSaved(items=>items.includes(id)?items.filter(item=>item!==id):[...items,id]);
    onNotice(saved.includes(id)?'저장한 코스에서 해제했어요.':'추천 코스를 저장했어요.');
  };
  const analysis=[
    {label:'프로필 완성도',value:Math.max(20,ai.completion)},
    {label:'자연·힐링 선호',value:ai.interests.some(item=>/산책|자연/.test(item.label))?88:72},
    {label:'문화·행정 관심',value:profile.interests.length?76:61},
  ];
  const matrix=perspectiveMatrix(rect?.quad);
  const style=rect?(matrix
    ?{left:0,top:0,width:WEB_UI_WIDTH,height:WEB_UI_HEIGHT,transform:matrix,transformOrigin:'0 0'} as CSSProperties
    :{left:rect.left,top:rect.top,width:Math.max(1,rect.width),height:Math.max(1,rect.height)}):undefined;
  const optimizeCourse=()=>{
    setProjectLoaded(true);setGenerated(true);setOptimized(true);setApproved(false);
    setCoursePlaces(['세종수목원','정부세종청사','이응다리','세종호수공원']);
    onNotice('AI가 이동시간이 가장 짧은 순서로 코스를 최적화했어요.');
  };
  const addCoursePlace=()=>{
    const candidates=['국립세종박물관','세종전통시장','대통령기록관'];
    const next=candidates.find(place=>!coursePlaces.includes(place));
    if(!next){onNotice('추가할 수 있는 추천 장소를 모두 담았어요.');return}
    setCoursePlaces(items=>[...items,next]);setOptimized(false);setApproved(false);
  };
  const dropCoursePlace=(target:string)=>{
    if(!dragging||dragging===target)return;
    setCoursePlaces(items=>{const next=items.filter(item=>item!==dragging);next.splice(items.indexOf(target),0,dragging);return next});
    setDragging(null);setOptimized(false);setApproved(false);
  };

  return <>
    {active&&screen&&<div className="government-webui-active-marker" aria-hidden="true"/>}
    {active&&nearby&&!screen&&<button type="button" className="government-webui-prompt" onClick={()=>gameEvents.emit('government-webui-open',nearby.id)}>
      <span><Sparkles size={18}/></span><div><small>AI 세종 추천센터</small><b>{nearby.label}</b></div><kbd>E</kbd><em>웹 화면 열기</em>
    </button>}
    {active&&screen&&rect&&<section className={`government-surface-webui is-${screen}`} style={style} role="dialog" aria-modal="true">
      <header><div><small>AI SEJONG · CENTRAL PLAZA</small><h2>AI 여행 일정 확정센터</h2></div><button type="button" onClick={close} aria-label="웹 화면 닫기"><X/></button></header>

      {screen&&<div className="government-approval-flow">
        <aside className="project-import-panel"><small>PROJECT ROOM</small><h3>프로젝트 가져오기</h3><article><i>📁</i><b>{draft.title}</b><p>{draft.concept}</p><dl><span><dt>장소</dt><dd>4개</dd></span><span><dt>참여자</dt><dd>3명</dd></span><span><dt>예상 소요</dt><dd>6시간</dd></span></dl></article><button className={projectLoaded?'loaded':''} type="button" onClick={()=>{setProjectLoaded(true);setCoursePlaces(['세종수목원','이응다리','조치원 카페거리','세종호수공원']);setOptimized(false);setApproved(false);onNotice('프로젝트실 여행 기획을 불러왔어요.')}}>{projectLoaded?<><Check/> 불러오기 완료</>:<><Download/> 프로젝트 불러오기</>}</button></aside>
        <main className="hologram-course-panel"><header><Route/><div><small>AI COURSE MAP</small><b>홀로그램 코스</b></div><em>카드를 드래그해 순서를 바꿔보세요</em></header><div className="hologram-map"><div className="hologram-rings"/>{coursePlaces.map((place,index)=><span key={place} style={{'--node-index':index} as CSSProperties}><i>{index+1}</i>{place}</span>)}</div><div className="draggable-course-list">{coursePlaces.map((place,index)=><article key={place} draggable onDragStart={()=>setDragging(place)} onDragOver={event=>event.preventDefault()} onDrop={()=>dropCoursePlace(place)}><i>{index+1}</i><span><b>{place}</b><small>{index===0?'자연·전시':index===coursePlaces.length-1?'야경·공연':'관광·체험'}</small></span><em>⋮⋮</em></article>)}<button type="button" onClick={addCoursePlace}><Plus/> 장소 추가</button></div></main>
        <aside className="ai-result-panel"><small>AI RESULT</small><h3>AI 분석 결과</h3>{[['이동시간',optimized?'3시간 45분':'4시간 20분'],['예상 비용','18,000원'],['현재 축제','1개 포함'],['추천도',optimized?'96%':'89%']].map(([label,value])=><article key={label}><Check/><span><small>{label}</small><b>{value}</b></span></article>)}{optimized&&<div className="time-saved"><Sparkles/><span><b>이동시간 35분 감소</b><small>정부청사 경유 순서로 최적화했어요.</small></span></div>}</aside>
        <footer><button className="optimize" disabled={!projectLoaded} onClick={optimizeCourse}><Sparkles/> AI 최적화</button><button className="confirm" disabled={!projectLoaded} onClick={()=>{const next={...draft,status:'approved' as const};saveTravelProjectDraft(next);setDraft(next);setApproved(true);onNotice('여행 일정을 최종 확정했어요.')}}><Check/> {approved?'일정 확정 완료':'일정 확정'}</button>{approved&&<div className="export-actions"><button onClick={()=>onNotice('여행 일정 QR을 생성했어요.')}><QrCode/> QR</button><button onClick={()=>onNotice('여행 일정 PDF를 저장했어요.')}><Download/> PDF</button><button onClick={()=>onNotice('모바일 저장 링크를 만들었어요.')}><Smartphone/> 모바일 저장</button></div>}</footer>
      </div>}

    </section>}
  </>;
}
