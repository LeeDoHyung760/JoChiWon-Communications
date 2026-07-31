import { useEffect,useMemo,useState,type CSSProperties } from 'react';
import { BarChart3,Bookmark,Check,Compass,Route,Sparkles,X } from 'lucide-react';
import type { UserProfile } from '../types';
import { gameEvents } from '../game/events';
import { buildAiSejongProfile } from '../services/aiSejongProfile';
import type { GovernmentCentralPlazaWebUiId,GovernmentCentralPlazaWebUiSurface } from '../game/governmentCentralPlazaWebUi';
import './GovernmentCentralPlazaWebUI.css';

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

  return <>
    {active&&screen&&<div className="government-webui-active-marker" aria-hidden="true"/>}
    {active&&nearby&&!screen&&<button type="button" className="government-webui-prompt" onClick={()=>gameEvents.emit('government-webui-open',nearby.id)}>
      <span><Sparkles size={18}/></span><div><small>AI 세종 추천센터</small><b>{nearby.label}</b></div><kbd>E</kbd><em>웹 화면 열기</em>
    </button>}
    {active&&screen&&rect&&<section className={`government-surface-webui is-${screen}`} style={style} role="dialog" aria-modal="true">
      <header><div><small>AI SEJONG · CENTRAL PLAZA</small><h2>{screen==='experience-analysis'?'체험 데이터 분석':screen==='course-recommendation'?'여행코스 추천':'추천 코스 둘러보기'}</h2></div><button type="button" onClick={close} aria-label="웹 화면 닫기"><X/></button></header>

      {screen==='experience-analysis'&&<div className="government-analysis">
        <article className="analysis-summary"><div><BarChart3/><span><small>현재 분석 점수</small><strong>{ai.completion||40}<i>%</i></strong></span></div><p>{ai.oneLineAnalysis}</p></article>
        <div className="analysis-bars">{analysis.map(item=><div key={item.label}><span><b>{item.label}</b><em>{item.value}%</em></span><i><b style={{width:`${item.value}%`}}/></i></div>)}</div>
        <footer><span>수집된 체험 신호 <b>{Math.max(3,ai.interests.length+ai.emotionCounts.length)}개</b></span><button type="button" onClick={()=>onNotice('최신 체험 기록으로 분석을 갱신했어요.')}><Sparkles/> 분석 새로고침</button></footer>
      </div>}

      {screen==='course-recommendation'&&<div className="government-course-maker">
        <aside><label>오늘의 분위기</label><div>{['여유롭게','알차게','새롭게'].map(item=><button className={mood===item?'active':''} onClick={()=>{setMood(item);setGenerated(false)}} type="button" key={item}>{item}</button>)}</div><label>여행 시간</label><div>{['2시간','반나절','하루'].map(item=><button className={duration===item?'active':''} onClick={()=>{setDuration(item);setGenerated(false)}} type="button" key={item}>{item}</button>)}</div><button className="generate-course" type="button" onClick={()=>setGenerated(true)}><Sparkles/> AI 코스 생성</button></aside>
        <article><div className="course-heading"><Route/><span><small>{mood} · {duration}</small><b>{profile.nickname}님을 위한 세종 코스</b></span></div>{(generated?routes:routes.slice(0,2)).map((route,index)=><div className="course-stop" key={route.id}><i>{index+1}</i><span><b>{route.title}</b><small>{route.places}</small></span><em>{route.score}%</em></div>)}{!generated&&<p className="course-hint">조건을 선택하고 AI 코스 생성을 눌러주세요.</p>}<button type="button" className="save-generated" disabled={!generated} onClick={()=>onNotice('나의 세종 코스에 저장했어요.')}><Bookmark/> 생성 코스 저장</button></article>
      </div>}

      {screen==='course-browser'&&<div className="government-course-browser">
        <nav><button className="active" type="button">전체</button><button type="button">행정·문화</button><button type="button">자연·힐링</button><button type="button">야간</button></nav>
        <div>{routes.map(route=><article key={route.id}><div className="route-icon"><Compass/></div><span><small>AI 추천 {route.score}% · {route.time}</small><b>{route.title}</b><p>{route.places}</p></span><button className={saved.includes(route.id)?'saved':''} type="button" onClick={()=>toggleSave(route.id)}>{saved.includes(route.id)?<Check/>:<Bookmark/>}{saved.includes(route.id)?'저장됨':'저장'}</button></article>)}</div>
      </div>}
    </section>}
  </>;
}
