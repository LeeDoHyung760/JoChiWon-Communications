import { useEffect,useMemo,useState,type CSSProperties } from 'react';
import { Bot,Clock3,Flame,FolderPlus,Megaphone,Radio,TrendingUp,Users } from 'lucide-react';
import type { UserProfile } from '../types';
import { gameEvents } from '../game/events';
import { loadProjectApplications,loadProjectRoomProjects,type Project } from '../services/projectRoomProjects';
import gardenPreview from '../assets/maps/government-central-plaza-top-preview.png';
import festivalPreview from '../assets/maps/club-street-festival-map-preview.png';
import smartCityPreview from '../assets/maps/sejong-smartcity-exhibition-preview.png';
import './ProjectLobbyBoard.css';
import './ProjectLobbyBoardZoom.css';

type ScreenPoint={x:number;y:number};
type ScreenRect={left:number;top:number;width:number;height:number;quad?:readonly [ScreenPoint,ScreenPoint,ScreenPoint,ScreenPoint]};
// Keep the HTML surface in the same aspect ratio as Lobby_AI_Board_Surface
// (6.75 x 3.5). A mismatched ratio makes the projected UI look stretched.
const BOARD_WIDTH=1920,BOARD_HEIGHT=996;
const images=[gardenPreview,festivalPreview,smartCityPreview];

const perspectiveMatrix=(quad:ScreenRect['quad'])=>{
  if(!quad)return undefined;
  const [topLeft,topRight,bottomRight,bottomLeft]=quad;
  const dx1=topRight.x-bottomRight.x,dx2=bottomLeft.x-bottomRight.x,dx3=topLeft.x-topRight.x+bottomRight.x-bottomLeft.x;
  const dy1=topRight.y-bottomRight.y,dy2=bottomLeft.y-bottomRight.y,dy3=topLeft.y-topRight.y+bottomRight.y-bottomLeft.y;
  const denominator=dx1*dy2-dx2*dy1;let perspectiveX=0,perspectiveY=0;
  if(Math.abs(denominator)>1e-6){perspectiveX=(dx3*dy2-dx2*dy3)/denominator;perspectiveY=(dx1*dy3-dx3*dy1)/denominator}
  const scaleX=topRight.x-topLeft.x+perspectiveX*topRight.x,skewX=bottomLeft.x-topLeft.x+perspectiveY*bottomLeft.x;
  const scaleY=topRight.y-topLeft.y+perspectiveX*topRight.y,skewY=bottomLeft.y-topLeft.y+perspectiveY*bottomLeft.y;
  return `matrix3d(${[scaleX/BOARD_WIDTH,scaleY/BOARD_WIDTH,0,perspectiveX/BOARD_WIDTH,skewX/BOARD_HEIGHT,skewY/BOARD_HEIGHT,0,perspectiveY/BOARD_HEIGHT,0,0,1,0,topLeft.x,topLeft.y,0,1].map(value=>Math.abs(value)<1e-10?0:value).join(',')})`;
};

const boardStyle=(rect:ScreenRect):CSSProperties=>{
  const matrix=perspectiveMatrix(rect.quad);
  return matrix?{left:0,top:0,width:BOARD_WIDTH,height:BOARD_HEIGHT,transform:matrix,transformOrigin:'0 0'}:{left:rect.left,top:rect.top,width:rect.width,height:rect.height};
};
const projectFill=(project:Project)=>Math.min(100,Math.round(project.memberIds.length/Math.max(1,project.maxMembers)*100));
const relativeTime=(value:string,now:number)=>{
  const minutes=Math.max(0,Math.floor((now-new Date(value).getTime())/60000));
  if(minutes<1)return '방금 전';
  if(minutes<60)return `${minutes}분 전`;
  const hours=Math.floor(minutes/60);return hours<24?`${hours}시간 전`:`${Math.floor(hours/24)}일 전`;
};

export function ProjectLobbyBoard({active,profile}:{active:boolean;profile:UserProfile}){
  const [rect,setRect]=useState<ScreenRect|null>(null),[nearby,setNearby]=useState(false),[focused,setFocused]=useState(false),[projects,setProjects]=useState<Project[]>(loadProjectRoomProjects),[now,setNow]=useState(Date.now());
  useEffect(()=>{const update=(value:ScreenRect|null)=>setRect(value);gameEvents.on('project-lobby-board-screen-rect',update);return()=>{gameEvents.off('project-lobby-board-screen-rect',update)}},[]);
  useEffect(()=>{const update=(value:boolean)=>setNearby(value);gameEvents.on('project-lobby-board-proximity-changed',update);return()=>{gameEvents.off('project-lobby-board-proximity-changed',update)}},[]);
  useEffect(()=>{const update=(value:boolean)=>setFocused(value);gameEvents.on('project-lobby-board-focus-mode-changed',update);return()=>{gameEvents.off('project-lobby-board-focus-mode-changed',update)}},[]);
  useEffect(()=>{const update=()=>setProjects(loadProjectRoomProjects());window.addEventListener('project-room-projects-updated',update);return()=>window.removeEventListener('project-room-projects-updated',update)},[]);
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),10000);return()=>window.clearInterval(timer)},[]);
  useEffect(()=>{if(!active){setRect(null);setNearby(false);setFocused(false)}},[active]);
  const data=useMemo(()=>{
    const live=projects.filter(project=>project.status!=='completed');
    const recruiting=projects.filter(project=>project.status==='recruiting');
    const members=new Set(live.flatMap(project=>project.memberIds));
    const today=new Date(now).toDateString();
    const createdToday=projects.filter(project=>new Date(project.createdAt).toDateString()===today).length;
    const recent=[...projects].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,3);
    const popular=[...live].sort((a,b)=>projectFill(b)-projectFill(a)).slice(0,3);
    return {live,recruiting,members,createdToday,recent,popular,aiUses:projects.length*3+loadProjectApplications().length};
  },[now,projects]);
  if(!active||!rect)return null;
  const stats=[
    {icon:Users,label:'진행 중 프로젝트',value:data.live.length,unit:'개',tone:'green'},
    {icon:Megaphone,label:'모집 중 프로젝트',value:data.recruiting.length,unit:'개',tone:'yellow'},
    {icon:Users,label:'현재 협업 중',value:data.members.size,unit:'명',tone:'blue'},
    {icon:FolderPlus,label:'오늘 생성된 프로젝트',value:data.createdToday,unit:'개',tone:'purple'},
  ];
  return <>{nearby&&!focused&&<button type="button" className="project-lobby-board-prompt" onClick={()=>gameEvents.emit('project-lobby-board-focus-open')}><span>📺</span><div><small>프로젝트실 전광판</small><b>가까이에서 전광판 보기</b></div><kbd>E</kbd><em>확대</em></button>}
  {focused&&<div className="project-lobby-board-focused-marker" aria-hidden="true"/>}
  {focused&&<div className="project-lobby-board-close-hint"><kbd>E</kbd><span>또는</span><kbd>ESC</kbd><b>돌아가기</b></div>}
  <div className={`project-lobby-board-layer${focused?' is-zoomed':''}`} aria-hidden="true"><section className="project-lobby-board" style={boardStyle(rect)}>
    <div className="project-live-screen">
      <header className="project-live-header"><div><h1>프로젝트실 전광판 <em>(PROJECT LIVE)</em></h1><p>{profile.nickname||'체험 탐험가'}님, 프로젝트실의 실시간 현황과 주요 소식을 확인하세요.</p></div><span><Radio/> LIVE</span></header>
      <main className="project-live-grid">
        <section className="project-live-summary panel"><header><div><b>PROJECT <span>LIVE</span></b><small>실시간 프로젝트 현황</small></div><i/></header><div className="project-live-stats">{stats.map(({icon:Icon,...stat})=><article className={stat.tone} key={stat.label}><Icon/><span>{stat.label}</span><b>{stat.value}<small>{stat.unit}</small></b></article>)}</div><footer><Bot/><span>AI 협업 사용 횟수 (오늘)</span><b>{data.aiUses}<small>회</small></b></footer></section>
        <section className="project-live-recent panel"><header><h2><Flame/> 방금 생성된 프로젝트</h2><span>›</span></header><div>{data.recent.map((project,index)=><article key={project.id}><img src={images[index%images.length]} alt=""/><div><h3>{project.title}</h3><p>{project.tags.slice(0,2).join(' · ')||project.activityTypes.slice(0,2).join(' · ')}</p><b>{project.memberIds.length} / {project.maxMembers}명</b></div><time>{relativeTime(project.createdAt,now)}</time></article>)}</div><footer>더 많은 프로젝트 보기 <span>›</span></footer></section>
        <div className="project-live-right"><section className="project-live-ranking panel"><header><h2><TrendingUp/> 오늘의 인기 프로젝트 TOP 3</h2><span>›</span></header><ol>{data.popular.map((project,index)=>{const percent=projectFill(project);return <li key={project.id}><i>{index+1}</i><div><b>{project.title}</b><p><span>{project.memberIds.length}명</span> 참여 중</p></div><u><em style={{width:`${percent}%`}}/></u><strong>{percent}%</strong></li>})}</ol></section><section className="project-live-activity panel"><header><h2><Clock3/> 최근 활동</h2><span>›</span></header>{data.recent.map((project,index)=><p key={project.id}><time>{new Date(now-index*6*60000).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false})}</time><b>{project.title}</b><span>{index===0?'팀 구성':index===1?'회의 시작':'팀원 추가'}</span></p>)}</section></div>
      </main>
      <footer className="project-live-footer"><p><b>알림</b> 프로젝트실 이용 시간은 09:00 ~ 24:00 입니다.</p><time>{new Date(now).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false})}</time></footer>
      <span className="project-live-scanline"/>
    </div>
  </section></div></>;
}
