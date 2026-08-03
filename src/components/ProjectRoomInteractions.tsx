import { useEffect,useMemo,useRef,useState,type FormEvent } from 'react';
import { Armchair,ArrowUpDown,Bot,CalendarDays,Check,ChevronRight,Clock3,FolderOpen,Info,MapPin,Plus,RotateCcw,Search,Send,Sparkles,Trash2,Users,X } from 'lucide-react';
import type { UserProfile } from '../types';
import { gameEvents } from '../game/events';
import { isProjectRoomKioskInteraction,type ProjectRoomInteraction,type ProjectRoomInteractionId } from '../game/projectRoomInteractions';
import { buildAiSejongProfile } from '../services/aiSejongProfile';
import {
  createProjectApplication,
  loadProjectApplications,
  loadProjectRoomProjects,
  recommendProjects,
  saveProjectApplications,
  saveProjectRoomProjects,
  suggestProjectCopy,
  suggestProjectTraits,
  type AIProjectRecommendation,
  type Project,
  type ProjectApplication,
} from '../services/projectRoomProjects';
import './ProjectRoomInteractions.css';
import './ProjectRoomCompletion.css';
import { loadTravelProjectDraft,saveTravelProjectDraft,type TravelIdea,type TravelProjectDraft } from '../services/travelProjectDraft';
import { API_BASE_URL } from '../config/api';
import type { GovernmentCourse } from '../../shared/socket-events';
import {clearClubProjectContext,loadClubProjectContext} from '../services/clubProjectBridge';

type Panel='kiosk-home'|'board'|'mine'|'recommendation'|'sejong-schedule'|'project-status'|'creation'|'course'|'door'|'detail'|'profile-send'|null;
type PlaceSearchResult={id:string;name:string;category:string;address:string;roadAddress:string;externalUrl:string;longitude:number;latitude:number;source:'kakao'|'mock'};
const ACTIVE_PROJECT_ROOM_KEY='sejong-active-project-room-id-v1';
const filters=['전체','사진','탐방','문화','축제','자연','조사','인터뷰'];
const activities=['사진','탐방','문화','축제','자연','조사','인터뷰','코스 기획'];
const traits=['사진 기록형','탐색형','계획형','자유형','여유형','효율형','대화 중심','실행 중심'];
const panelFor=(id:ProjectRoomInteractionId):Panel=>{
  switch(id){
    case 'sejong-schedule-board':return 'sejong-schedule';
    case 'project-status-board':return 'project-status';
    case 'collaboration-table':return 'course';
    case 'project-door':return 'door';
    case 'project-kiosk':
    case 'lobby-kiosk-1':
    case 'lobby-kiosk-2':return 'creation';
    default:return null;
  }
};
const isRecruitmentPost=(project:Project)=>project.id.startsWith('recruitment-');
const formatDate=(value?:string)=>{
  const schedule=value?.trim();
  if(!schedule)return '일정 협의';
  const parsed=new Date(/^\d{4}-\d{2}-\d{2}$/.test(schedule)?`${schedule}T00:00:00`:schedule);
  if(Number.isNaN(parsed.getTime()))return schedule;
  try{return new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric'}).format(parsed)}
  catch{return schedule}
};

export function ProjectRoomInteractions({profile,active,onOpenChange,onNotice}:{profile:UserProfile;active:boolean;onOpenChange:(open:boolean)=>void;onNotice:(message:string)=>void}){
  const [nearby,setNearby]=useState<ProjectRoomInteraction|null>(null);
  const [panel,setPanel]=useState<Panel>(null);
  const [returnPanel,setReturnPanel]=useState<Exclude<Panel,'detail'|'profile-send'|null>>('board');
  const [projects,setProjects]=useState<Project[]>(loadProjectRoomProjects);
  const [applications,setApplications]=useState<ProjectApplication[]>(loadProjectApplications);
  const [selected,setSelected]=useState<Project|null>(null);
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState('전체');
  const [message,setMessage]=useState('');
  const [created,setCreated]=useState<Project|null>(null);
  const [creationSession,setCreationSession]=useState(0);
  const [kioskActive,setKioskActive]=useState(false);
  const [kioskScreenRect,setKioskScreenRect]=useState<{left:number;top:number;width:number;height:number}|null>(null);
  const [nearbySeat,setNearbySeat]=useState<{id:string;seated?:boolean}|null>(null);
  const [activeProjectId,setActiveProjectId]=useState<string|null>(()=>localStorage.getItem(ACTIVE_PROJECT_ROOM_KEY));
  const panelRef=useRef<HTMLElement>(null);
  const aiProfile=useMemo(()=>buildAiSejongProfile(profile),[profile]);
  const recommendations=useMemo(()=>recommendProjects(projects,profile),[profile,projects]);

  useEffect(()=>{
    setProjects(current=>{
      let changed=false;
      const next=current.map(project=>{
        if(!project.title.includes('여고'))return project;
        const members=[...new Set([project.leaderId,profile.nickname,...project.memberIds].filter(Boolean))];
        while(members.length<3)members.push(`여고 프로젝트 팀원 ${members.length+1}`);
        const filled={...project,maxMembers:3,memberIds:members.slice(0,3),status:'active' as const};
        if(project.maxMembers!==3||project.status!=='active'||project.memberIds.join('|')!==filled.memberIds.join('|'))changed=true;
        return filled;
      });
      if(changed)saveProjectRoomProjects(next);
      return changed?next:current;
    });
  },[profile.nickname]);

  useEffect(()=>{
    const proximity=(interaction:ProjectRoomInteraction|null)=>setNearby(interaction);
    const open=(id:ProjectRoomInteractionId)=>{
      const next=panelFor(id);
      if(!next)return;
      if(next==='creation'){setCreated(null);setCreationSession(value=>value+1)}
      if(next==='board'||next==='recommendation'||next==='creation')setReturnPanel(next);
      setPanel(next);
    };
    const kioskMode=(enabled:boolean)=>{
      setKioskActive(enabled);
      setPanel(enabled?'kiosk-home':null);
    };
    const kioskRect=(rect:{left:number;top:number;width:number;height:number}|null)=>setKioskScreenRect(rect);
    const seatProximity=(seat:{id:string;seated?:boolean}|null)=>setNearbySeat(seat);
    const projectInstance=(projectId:string)=>{
      setActiveProjectId(projectId);
      localStorage.setItem(ACTIVE_PROJECT_ROOM_KEY,projectId);
    };
    const kioskSelection=(selection:'create'|'board'|'mine')=>{
      if(selection==='create'){setCreated(null);setCreationSession(value=>value+1);setKioskActive(true);setReturnPanel('creation');setPanel('creation');return}
      setKioskActive(true);
      if(selection==='board'){setReturnPanel('board');setPanel('board');return}
      setPanel('mine');
    };
    gameEvents.on('project-room-interaction-proximity-changed',proximity);
    gameEvents.on('project-room-interaction-open',open);
    gameEvents.on('project-room-kiosk-mode-changed',kioskMode);
    gameEvents.on('project-room-kiosk-screen-rect',kioskRect);
    gameEvents.on('project-room-kiosk-selection',kioskSelection);
    gameEvents.on('project-room-seat-proximity-changed',seatProximity);
    gameEvents.on('project-room-instance-enter',projectInstance);
    return()=>{
      gameEvents.off('project-room-interaction-proximity-changed',proximity);
      gameEvents.off('project-room-interaction-open',open);
      gameEvents.off('project-room-kiosk-mode-changed',kioskMode);
      gameEvents.off('project-room-kiosk-screen-rect',kioskRect);
      gameEvents.off('project-room-kiosk-selection',kioskSelection);
      gameEvents.off('project-room-seat-proximity-changed',seatProximity);
      gameEvents.off('project-room-instance-enter',projectInstance);
    };
  },[]);
  useEffect(()=>{if(!active){setNearby(null);setNearbySeat(null);setPanel(null);setSelected(null);setActiveProjectId(null);localStorage.removeItem(ACTIVE_PROJECT_ROOM_KEY);setKioskActive(false);gameEvents.emit('project-room-focus-changed',undefined)}},[active]);
  useEffect(()=>onOpenChange(panel!==null||kioskActive),[kioskActive,onOpenChange,panel]);
  useEffect(()=>{if(kioskActive)panelRef.current?.scrollTo({top:0,left:0})},[kioskActive,panel]);
  useEffect(()=>{
    if(!kioskActive)gameEvents.emit('project-room-focus-changed',panel==='creation'?'project-kiosk':undefined);
  },[kioskActive,panel]);
  useEffect(()=>()=>{gameEvents.emit('project-room-focus-changed',undefined)},[]);
  useEffect(()=>{
    if(!panel)return;
    const escape=(event:KeyboardEvent)=>{
      if(event.key!=='Escape')return;
      event.preventDefault();
      if(kioskActive){
        if(panel==='kiosk-home'){setPanel(null);setKioskActive(false);gameEvents.emit('project-room-focus-changed',undefined)}
        else setPanel('kiosk-home');
      }else if(panel==='profile-send'||panel==='detail')setPanel(returnPanel);
      else setPanel(null);
    };
    window.addEventListener('keydown',escape);
    return()=>window.removeEventListener('keydown',escape);
  },[kioskActive,panel,returnPanel]);

  const filtered=projects.filter(project=>project.status==='recruiting'&&project.visibility!=='private'&&project.leaderId!==profile.nickname&&!project.memberIds.includes(profile.nickname))
    .filter(project=>filter==='전체'||project.tags.includes(filter)||project.activityTypes.includes(filter))
    .filter(project=>!query.trim()||[project.title,project.summary,...project.tags,...project.placeIds].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const isSent=(project:Project)=>applications.some(item=>item.projectId===project.id&&item.applicantId===profile.nickname);
  const myProjects=projects.filter(project=>project.leaderId===profile.nickname||project.memberIds.includes(profile.nickname));
  const readyProjects=myProjects.filter(project=>project.memberIds.length>=project.maxMembers);
  const resolvedActiveProjectId=activeProjectId??(readyProjects.length===1?readyProjects[0].id:null);
  const activeProject=projects.find(project=>project.id===resolvedActiveProjectId)??null;
  const showDetail=(project:Project,from:'board'|'recommendation'|'creation')=>{setSelected(project);setReturnPanel(from);setPanel('detail')};
  const showProfileSend=(project:Project,from:'board'|'recommendation')=>{if(isSent(project))return;setSelected(project);setReturnPanel(from);setMessage('');setPanel('profile-send')};
  const sendProfile=()=>{
    if(!selected||isSent(selected))return;
    const nextApplications=createProjectApplication(selected,profile,message,applications);
    setApplications(nextApplications);saveProjectApplications(nextApplications);
    const nextProjects=projects.map(project=>project.id===selected.id?{...project,applicantIds:[...new Set([...project.applicantIds,profile.nickname])]}:project);
    setProjects(nextProjects);saveProjectRoomProjects(nextProjects);
    setPanel(returnPanel);onNotice('프로필 전달 완료 · 팀장 확인 중');
  };

  return <>
    {active&&<div className="project-room-active-marker" aria-hidden="true"/>}
    {active&&kioskActive&&<div className="project-room-kiosk-active-marker" aria-hidden="true"/>}
    {active&&nearbySeat&&!panel&&!kioskActive&&<button type="button" className="project-room-prompt" onClick={()=>gameEvents.emit('project-room-seat-toggle')}>
      <span><Armchair size={18}/></span><div><small>프로젝트실 휴식 공간</small><b>{nearbySeat.seated?'소파에서 일어나기':'소파에 앉기'}</b></div><kbd>E</kbd><em>상호작용</em>
    </button>}
    {active&&!nearbySeat&&nearby&&!panel&&!kioskActive&&<button type="button" className="project-room-prompt" onClick={()=>gameEvents.emit(isProjectRoomKioskInteraction(nearby.id)?'project-room-kiosk-activate':'project-room-interaction-open',nearby.id)}>
      <span><Sparkles size={18}/></span><div><small>{nearby.id==='project-door'?'프로젝트실 내부 입구':'프로젝트실 상호작용'}</small><b>{nearby.id==='project-door'?(readyProjects[0]?.title??'팀원이 모두 모인 프로젝트가 없어요'):nearby.label}</b></div><kbd>E</kbd><em>상호작용</em>
    </button>}
    {active&&panel&&(!kioskActive||kioskScreenRect)&&<div className={`project-room-overlay ${kioskActive?'is-kiosk-mode':''}`} role="dialog" aria-modal="true" aria-label="프로젝트실 기능 패널" onMouseDown={event=>{if(event.target===event.currentTarget&&!kioskActive)setPanel(null)}}>
      <section ref={panelRef} className={`project-room-panel is-${panel}`} onPointerDown={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()} style={kioskActive&&kioskScreenRect?{position:'fixed',left:kioskScreenRect.left+2,top:kioskScreenRect.top+2,width:Math.max(1,kioskScreenRect.width-4),height:Math.max(1,kioskScreenRect.height-4)}:undefined}>
        <button type="button" className="project-room-close" onClick={()=>{if(kioskActive){if(panel==='kiosk-home'){setPanel(null);setKioskActive(false);gameEvents.emit('project-room-focus-changed',undefined)}else if(panel==='detail'||panel==='profile-send')setPanel(returnPanel);else setPanel('kiosk-home')}else if(panel==='detail'||panel==='profile-send')setPanel(returnPanel);else setPanel(null)}} aria-label={kioskActive&&panel!=='kiosk-home'?'이전 화면으로':'패널 닫기'}>{kioskActive&&panel!=='kiosk-home'?<ChevronRight className="kiosk-back-icon" size={20}/>:<X size={20}/>}</button>

        {panel==='kiosk-home'&&<KioskHome profile={profile} onCreate={()=>{setCreated(null);setCreationSession(value=>value+1);setReturnPanel('creation');setPanel('creation')}} onBrowse={()=>{setReturnPanel('board');setPanel('board')}} onMine={()=>setPanel('mine')}/>}

        {panel==='sejong-schedule'&&<SejongScheduleBoard/>}
        {panel==='project-status'&&<ProjectStatusBoard/>}

        {panel==='board'&&<>
          <PanelHeader eyebrow="PROJECT BOARD" icon="📌" title="프로젝트 둘러보기" copy="내 프로젝트를 제외한 공개 프로젝트를 확인하고 체험 프로필로 참가를 신청하세요."/>
          <div className="project-room-tools"><label><Search size={17}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="모집글·장소·태그 검색"/></label><nav>{filters.map(item=><button type="button" className={filter===item?'active':''} onClick={()=>setFilter(item)} key={item}>{item}</button>)}</nav></div>
          <div className="project-board-list">{filtered.map(project=><ProjectCard key={project.id} project={project} recommendation={recommendations.find(item=>item.projectId===project.id)} sent={isSent(project)} onDetail={()=>showDetail(project,'board')} onSend={()=>showProfileSend(project,'board')}/>)}</div>
          {!filtered.length&&<EmptyState text="검색 조건에 맞는 프로젝트가 없어요." hint="내가 만든 프로젝트와 참여 중인 프로젝트는 ‘내 프로젝트’에서 확인할 수 있어요."/>}
        </>}

        {panel==='recommendation'&&<>
          <PanelHeader eyebrow="AI PROJECT MATCH" icon="✨" title={`${profile.nickname||'사용자'}님을 위한 프로젝트`} copy={aiProfile.oneLineAnalysis}/>
          <section className="project-profile-summary"><div><span>{profile.nickname.slice(0,1)||'나'}</span><b>{aiProfile.completion}% 프로필 완성</b></div><p>{[...aiProfile.interests.map(item=>item.label),aiProfile.representativePlant?.name,aiProfile.dominantEmotion].filter(Boolean).join(' · ')||'첫 체험 기록을 프로젝트에서 만들어 보세요.'}</p></section>
          <div className="project-recommend-list">{recommendations.map((recommendation,index)=>{
            const project=projects.find(item=>item.id===recommendation.projectId);if(!project)return null;
            return <article className="project-recommend-card" key={project.id}><div className="recommend-rank">0{index+1}</div><div className="recommend-score"><strong>{recommendation.matchScore}%</strong><small>적합도</small></div><div className="recommend-main"><span>{project.thumbnail??'💡'}</span><div><small>{project.placeIds[0]}</small><h3>{project.title}</h3><p>{recommendation.reasons[0]}</p></div></div><div className="recommend-reasons">{recommendation.reasons.slice(0,3).map(reason=><span key={reason}><Check size={12}/>{reason}</span>)}</div><div className="recommend-members">{project.memberIds.slice(0,3).map(member=><span title={member} key={member}>{member.slice(0,1)}</span>)}<small>{project.memberIds.slice(0,2).join(' · ')} 참여 중</small></div><dl><div><dt>공통 관심사</dt><dd>{recommendation.commonInterests.join(' · ')||project.tags.slice(0,2).join(' · ')}</dd></div><div><dt>예상 역할</dt><dd>{recommendation.recommendedRole}</dd></div><div><dt>참여 인원</dt><dd>{project.memberIds.length}/{project.maxMembers}명</dd></div></dl><footer><button type="button" onClick={()=>showDetail(project,'recommendation')}>상세 보기</button><button type="button" disabled={isSent(project)} onClick={()=>showProfileSend(project,'recommendation')}><Send size={14}/>{isSent(project)?'팀장 확인 중':'프로필 전달하기'}</button></footer></article>;
          })}</div>
        </>}

        {panel==='mine'&&<section className="kiosk-my-projects">
          <PanelHeader eyebrow="MY PROJECT" icon="📁" title="내 프로젝트" copy="내가 만든 프로젝트와 참여 현황을 확인하세요."/>
          <div className="project-board-list kiosk-my-project-list">{myProjects.length?myProjects.map(project=><article className="project-board-card" key={project.id}><header><span>{project.thumbnail??'💡'}</span><div><small>{project.leaderId===profile.nickname?'내가 만든 프로젝트':'참여 중인 프로젝트'}</small><h3>{project.title}</h3><p>{project.summary}</p></div></header><div className="project-tags">{project.tags.slice(0,2).map(tag=><i key={tag}>#{tag}</i>)}</div><footer><span><Users/> {project.memberIds.length}/{project.maxMembers}명</span><button type="button" onClick={()=>{setSelected(project);setReturnPanel('mine');setPanel('detail')}}>상세 보기 <ChevronRight/></button></footer></article>):<EmptyState text="아직 참여 중인 프로젝트가 없어요." hint="프로젝트 참가가 승인되거나 새 프로젝트를 만들면 여기에 표시돼요."/>}</div>
        </section>}

        {panel==='door'&&<section className="project-door-panel"><PanelHeader eyebrow="PROJECT ROOM ACCESS" icon="🚪" title="프로젝트실 내부 입장" copy="참여 인원이 모두 모인 프로젝트만 내부 협업 공간을 이용할 수 있어요."/>{readyProjects.length?<div className="project-door-ready-list">{readyProjects.map(project=><article key={project.id}><span>{project.thumbnail??'💡'}</span><div><small>팀 구성 완료 · {project.memberIds.length}/{project.maxMembers}명</small><h3>{project.title}</h3><p>{project.summary}</p></div><button type="button" onClick={()=>{gameEvents.emit('project-room-instance-enter',project.id);gameEvents.emit('project-room-door-unlock',project.id);setPanel(null);onNotice(`${project.title} 팀의 프로젝트실 문이 열렸어요.`)}}>내부로 들어가기 <ChevronRight/></button></article>)}</div>:<div className="project-door-waiting"><Users/><b>입장 가능한 프로젝트가 없습니다</b><p>참여 인원이 모두 모인 프로젝트가 생기면 이곳에 표시됩니다.</p></div>}</section>}

        {panel==='course'&&(activeProject?<CourseCollaborationTable key={activeProject.id} project={activeProject} profile={profile} onNotice={onNotice}/>:<section className="project-door-waiting"><Users/><b>선택된 프로젝트가 없습니다</b><p>팀 프로젝트를 선택해 내부 협업 공간으로 먼저 입장해 주세요.</p></section>)}

        {panel==='creation'&&<ProjectCreationForm key={creationSession} profile={profile} onCreated={project=>{const next=[project,...projects];setProjects(next);saveProjectRoomProjects(next);setCreated(project);setPanel(kioskActive?'kiosk-home':null);onNotice('새 프로젝트를 모집 중으로 등록했어요.')}} onDetail={project=>showDetail(project,'creation')} created={created}/>}

        {panel==='detail'&&selected&&<ProjectDetail project={selected} sent={isSent(selected)} canApply={returnPanel!=='mine'} onBack={()=>setPanel(returnPanel)} onSend={()=>showProfileSend(selected,returnPanel==='recommendation'?'recommendation':'board')}/>}

        {panel==='profile-send'&&selected&&<section className="profile-send-modal">
          <PanelHeader eyebrow="PROFILE DELIVERY" icon="📨" title="내 체험 프로필 전달하기" copy="바로 가입되지 않으며, 팀장이 확인한 뒤 참여 여부를 결정합니다."/>
          <div className="profile-send-target"><span>{selected.thumbnail??'💡'}</span><div><small>전달할 프로젝트</small><b>{selected.title}</b><p>{selected.leaderId} 팀장 · {selected.memberIds.length}/{selected.maxMembers}명</p></div></div>
          <div className="profile-snapshot-grid"><span><small>축제·활동</small><b>{aiProfile.interests.map(item=>item.label).join(' · ')||profile.interests.join(' · ')||'체험 기록 없음'}</b></span><span><small>대표 식물</small><b>{aiProfile.representativePlant?.name??'아직 선택 전'}</b></span><span><small>감정 기록</small><b>{aiProfile.dominantEmotion??'아직 기록 전'}</b></span><span><small>관심 장소</small><b>{profile.preferredPlaceCategories.join(' · ')||aiProfile.recommendedCourse[0]||'세종 전역'}</b></span></div>
          <label className="profile-message">자기소개 및 참여 메시지 · 직접 작성<textarea value={message} onChange={event=>setMessage(event.target.value)} maxLength={240} placeholder="프로젝트에 참여하고 싶은 이유와 간단한 자기소개를 작성해 주세요."/><small>{message.length}/240자</small></label>
          <footer><button type="button" onClick={()=>setPanel(returnPanel)}>취소</button><button type="button" disabled={!message.trim()} onClick={sendProfile}><Send size={15}/> 프로필 전달하기</button></footer>
        </section>}
      </section>
    </div>}
  </>;
}

function PanelHeader({eyebrow,icon,title,copy}:{eyebrow:string;icon:string;title:string;copy:string}){
  return <header className="project-panel-header"><span>{icon}</span><div><small>{eyebrow}</small><h2>{title}</h2><p>{copy}</p></div></header>;
}

function SejongScheduleBoard(){
  return <section className="sejong-schedule-board">
    <PanelHeader eyebrow="SEJONG SCHEDULE BOARD · TODAY" icon="📅" title="세종 일정 보드" copy="프로젝트 주제와 활동 장소를 정할 때 참고할 수 있는 오늘의 세종 정보예요."/>
    <div className="schedule-board-grid">
      <article className="schedule-events"><h3>🎉 진행 중 행사</h3>{['야간 분수쇼','조치원 복숭아축제','국립수목원 특별전'].map((event,index)=><div key={event}><i>{index+1}</i><b>{event}</b><span>{index===0?'진행 중':'오늘'}</span></div>)}</article>
      <article><h3>📅 이번 주 일정</h3><strong>18</strong><p>행사 8 · 전시 4 · 체험 6</p></article>
      <article><h3>🔥 인기 장소</h3><strong>TOP 2</strong><p>세종호수공원 · 조치원시장</p></article>
      <article className="schedule-weather"><h3>🌤 오늘의 날씨</h3><strong>24°C</strong><p>맑음 · 야외 활동하기 좋아요</p></article>
    </div>
  </section>;
}

function ProjectStatusBoard(){
  const stats=[['오늘 생성','18','개'],['진행 중','42','개'],['모집 중','12','개'],['오늘 완료','7','개'],['현재 프로젝트실','23','명']];
  return <section className="project-live-status">
    <PanelHeader eyebrow="PROJECT STATUS · LIVE" icon="📡" title="프로젝트 현황" copy="공동캠퍼스에서 지금 진행되고 있는 프로젝트 활동을 실시간으로 보여줘요."/>
    <div className="project-live-status-grid">{stats.map(([label,value,unit],index)=><article className={index===stats.length-1?'is-live':''} key={label}><small>{label}</small><strong>{value}<i>{unit}</i></strong><span>{index===stats.length-1?'● LIVE':'↗ 실시간 집계'}</span></article>)}</div>
  </section>;
}

function KioskHome({profile,onCreate,onBrowse,onMine}:{profile:UserProfile;onCreate:()=>void;onBrowse:()=>void;onMine:()=>void}){
  return <section className="kiosk-touch-menu">
    <header><small>PROJECT KIOSK</small><span>프로젝트실 키오스크</span><h2>{profile.nickname||'체험 탐험가'}님,<br/>무엇을 도와드릴까요?</h2><p>원하는 메뉴를 선택해 주세요.</p></header>
    <div className="kiosk-touch-actions">
      <button type="button" className="primary" onClick={onCreate}><i><Plus/></i><span><b>새 프로젝트 시작하기</b></span><ChevronRight/></button>
      <button type="button" onClick={onBrowse}><i><Search/></i><span><b>프로젝트 둘러보기</b></span><ChevronRight/></button>
      <button type="button" onClick={onMine}><i><FolderOpen/></i><span><b>내 프로젝트</b></span><ChevronRight/></button>
    </div>
    <footer><span>화면을 터치하여 메뉴를 선택하세요.</span><b>ⓘ 이용 안내</b></footer>
  </section>;
}

type CoursePlace={id:string;name:string;time:string;duration:string;description:string;image:string;tags:string[]};
const COURSE_PLACES:CoursePlace[]=[
  {id:'lake',name:'세종호수공원',time:'14:00',duration:'약 1시간 30분',description:'호수와 이응다리를 배경으로 팀의 첫 사진 기록을 시작합니다.',image:'/images/festivals/hangeul-2026.jpg',tags:['호수','야외 촬영','산책']},
  {id:'garden',name:'국립세종수목원',time:'16:00',duration:'약 2시간',description:'다양한 식물과 테마 정원을 사진으로 기록합니다.',image:'/images/festivals/spring-flower-2026.jpg',tags:['자연','사진 기록','식물 관찰']},
  {id:'cafe',name:'조치원 카페거리',time:'18:30',duration:'약 1시간',description:'촬영한 사진을 함께 살펴보고 기록을 정리합니다.',image:'/images/food-shops/actual/stellaon.jpg',tags:['카페','회고','팀 대화']},
  {id:'market',name:'세종전통시장',time:'19:40',duration:'약 1시간',description:'시장 풍경과 지역의 생활 문화를 사진으로 남깁니다.',image:'/images/food-shops/jochwon-market.jpg',tags:['시장','로컬','문화 기록']},
  {id:'festival',name:'세종 야간축제',time:'21:00',duration:'약 1시간 30분',description:'조명과 공연이 있는 야간 풍경을 촬영합니다.',image:'/images/festivals/nakhwa-2026.jpg',tags:['야경','축제','공연']},
];

function draftForProject(project:Project):TravelProjectDraft{
  const ideas:TravelIdea[]=[
    ...project.placeIds.map((name,index)=>({id:`place-${index}`,name,category:'place' as const,emoji:'📍',votes:0})),
    ...project.tags.slice(0,4).map((name,index)=>({id:`theme-${index}`,name,category:'theme' as const,emoji:'✨',votes:0})),
  ];
  return {
    title:project.title,
    concept:project.summary||project.description,
    ideas,
    roles:project.memberIds.map(name=>({name,role:name===project.leaderId?'프로젝트 리더':'역할 미정'})),
    note:project.startDate?`${formatDate(project.startDate)} 시작 예정`:'일정과 역할을 팀 합의로 확정해 주세요.',
    status:'draft',
    updatedAt:new Date().toISOString(),
  };
}

function CourseCollaborationTable({project,profile,onNotice}:{project:Project;profile:UserProfile;onNotice:(message:string)=>void}){
  const [tab,setTab]=useState<'ideas'|'themes'|'course'|'roles'|'info'>('roles');
  const [draft,setDraft]=useState<TravelProjectDraft>(()=>loadTravelProjectDraft(project.id,draftForProject(project)));
  const [chatInput,setChatInput]=useState('');
  const [ideaComposer,setIdeaComposer]=useState<TravelIdea['category']|null>(null);
  const [ideaInput,setIdeaInput]=useState('');
  const [placeResults,setPlaceResults]=useState<PlaceSearchResult[]>([]);
  const [selectedPlace,setSelectedPlace]=useState<PlaceSearchResult|null>(null);
  const [placeSearchLoading,setPlaceSearchLoading]=useState(false);
  const [placeSearchError,setPlaceSearchError]=useState('');
  const [aiLoading,setAiLoading]=useState(false);
  const [aiPlaces,setAiPlaces]=useState<Array<{name:string;reason:string;tags:string[]}>>([]);
  const update=(next:TravelProjectDraft)=>{setDraft(next);saveTravelProjectDraft(next,project.id)};
  const vote=(id:string)=>update({...draft,ideas:draft.ideas.map(idea=>idea.id===id?{...idea,votes:idea.votes+1}:idea),status:'draft'});
  const searchSejongPlaces=async(rawQuery:string)=>{
    const query=rawQuery.trim();if(!query)return;
    setPlaceSearchLoading(true);setPlaceSearchError('');setSelectedPlace(null);
    try{
      const response=await fetch(`${API_BASE_URL}/places/search`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:`세종 ${query}`,longitude:127.289,latitude:36.5,radius:20000,size:15})});
      if(!response.ok)throw new Error();
      const result=await response.json() as {places?:PlaceSearchResult[]};
      const sejongPlaces=(result.places??[]).filter(place=>`${place.address} ${place.roadAddress}`.includes('세종'));
      setPlaceResults(sejongPlaces);
      if(!sejongPlaces.length)setPlaceSearchError('세종시 안에서 일치하는 장소를 찾지 못했어요. 다른 검색어를 입력해 보세요.');
    }catch{setPlaceResults([]);setPlaceSearchError('장소 검색에 실패했어요. 서버와 카카오 Local API 설정을 확인해 주세요.')}finally{setPlaceSearchLoading(false)}
  };
  const openIdeaComposer=(category:TravelIdea['category'])=>{setIdeaComposer(category);setIdeaInput('');if(category==='place'){setPlaceResults([]);setSelectedPlace(null);setPlaceSearchError('')}};
  const addSelectedPlace=()=>{
    if(!selectedPlace)return;
    if(draft.ideas.some(idea=>idea.category==='place'&&idea.name===selectedPlace.name)){onNotice('이미 장소 보드에 있는 장소예요.');return}
    update({...draft,ideas:[...draft.ideas,{id:`place-${selectedPlace.id||Date.now()}`,name:selectedPlace.name,category:'place',emoji:'📍',votes:1}],status:'draft'});
    onNotice(`실제 세종 장소 '${selectedPlace.name}'을 추가했어요.`);setIdeaComposer(null);setIdeaInput('');setPlaceResults([]);setSelectedPlace(null);
  };
  const addIdea=()=>{
    if(!ideaComposer)return;
    const labels={place:'장소',theme:'테마',festival:'축제',food:'먹거리'};
    const name=ideaInput.trim();
    if(!name)return;
    const emoji={place:'📍',theme:'✨',festival:'🎉',food:'🍑'}[ideaComposer];
    update({...draft,ideas:[...draft.ideas,{id:`idea-${Date.now()}`,name,category:ideaComposer,emoji,votes:1}],status:'draft'});
    onNotice(`${labels[ideaComposer]} 아이디어 '${name}'을 추가했어요.`);
    setIdeaComposer(null);setIdeaInput('');
  };
  const addSuggestedPlace=(name:string)=>{
    if(draft.ideas.some(idea=>idea.category==='place'&&idea.name===name)){onNotice('이미 장소 보드에 있는 장소예요.');return}
    update({...draft,ideas:[...draft.ideas,{id:`idea-${Date.now()}`,name,category:'place',emoji:'📍',votes:1}],status:'draft'});
    setAiPlaces(current=>current.filter(place=>place.name!==name));onNotice(`${name}을 장소 아이디어로 추가했어요.`);
  };
  const recommendPlaces=async()=>{
    setAiLoading(true);
    try{
      const response=await fetch(`${API_BASE_URL}/project-room/place-suggestions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:project.title,summary:project.summary,description:project.description,tags:project.tags,activities:project.activityTypes,existingPlaces:draft.ideas.filter(idea=>idea.category==='place').map(idea=>idea.name)})});
      if(!response.ok)throw new Error();
      const result=await response.json() as {places?:Array<{name:string;reason:string;tags:string[]}>;source?:string};
      setAiPlaces(result.places??[]);onNotice(result.source==='openai'?'GPT가 프로젝트에 맞는 장소를 추천했어요.':'기본 장소 추천을 불러왔어요.');
    }catch{onNotice('장소 추천을 불러오지 못했어요. 서버 연결을 확인해 주세요.')}finally{setAiLoading(false)}
  };
  const sendChat=()=>{
    const text=chatInput.trim();if(!text)return;
    update({...draft,messages:[...(draft.messages??[]),{id:`message-${Date.now()}`,author:profile.nickname,text,createdAt:new Date().toISOString()}]});
    setChatInput('');
  };
  const changeRole=(name:string,role:string)=>update({...draft,roles:draft.roles.map(member=>member.name===name?{...member,role}:member),status:'draft'});
  const requestReview=()=>{
    if(!draft.ideas.some(idea=>idea.category==='place')){setTab('ideas');onNotice('최종 검토 전에 장소를 하나 이상 추가해 주세요.');return}
    if(draft.roles.some(member=>member.role==='역할 미정')){setTab('roles');onNotice('최종 검토 전에 모든 팀원의 역할을 정해 주세요.');return}
    if(!(draft.courseOrder?.length)){setTab('course');onNotice('최종 검토 전에 프로젝트 코스를 만들어 주세요.');return}
    update({...draft,status:'review-requested'});onNotice(`${project.title}의 최종 합의 검토를 요청했어요.`)
  };
  const completeCourse=()=>{
    const coursePlaces=(draft.courseOrder??[]).flatMap(id=>{const place=draft.ideas.find(idea=>idea.id===id&&idea.category==='place');return place?[place]:[]});
    if(!coursePlaces.length){setTab('course');onNotice('완성할 프로젝트 코스가 없어요.');return}
    const course:GovernmentCourse={id:`project-course-${project.id}-${Date.now()}`,title:`${project.title} 방문 코스`,summary:project.summary,generatedAt:Date.now(),source:'맞춤 규칙',items:coursePlaces.map((place,index)=>{const activityNames=(draft.courseActivityMap?.[place.id]??[]).flatMap(id=>{const idea=draft.ideas.find(item=>item.id===id);return idea?[idea.name]:[]});return {id:`visit-${place.id}-${index}`,time:draft.courseTimes?.[place.id]??(index===0?draft.courseStartTime??'14:00':'시간 협의'),placeId:place.id,placeName:place.name,category:'프로젝트 장소',durationMinutes:draft.courseDurations?.[place.id]??90,reason:activityNames.length?`${activityNames.join(' · ')} 활동을 진행하는 팀 프로젝트 방문지예요.`:project.summary}})};
    const next={...draft,status:'approved' as const,courseConfirmed:true};
    saveTravelProjectDraft(next,project.id);saveTravelProjectDraft(next);
    localStorage.setItem('government-project-course-handoff-v1',JSON.stringify({projectId:project.id,projectTitle:project.title,course,createdAt:Date.now()}));
    setDraft(next);onNotice('프로젝트 코스를 완성했어요. 실제 방문 준비를 위해 정부청사로 이동합니다.');gameEvents.emit('travel-to-map','government');
  };
  const groups=[
    {key:'theme',title:'가고 싶은 활동',tone:'purple'},
    {key:'festival',title:'축제·테마 아이디어',tone:'blue'},
    {key:'food',title:'먹거리 아이디어',tone:'green'},
  ] as const;
  const memberCount=Math.max(1,draft.roles.length);
  const opinionProgress=Math.min(100,Math.round(((draft.messages?.length??0)/(memberCount*2))*100));
  const totalVotes=draft.ideas.reduce((sum,idea)=>sum+idea.votes,0);
  const voteProgress=Math.min(100,Math.round((totalVotes/Math.max(1,draft.ideas.length*memberCount))*100));
  const ideaProgress=Math.min(100,Math.round((draft.ideas.length/Math.max(3,memberCount*2))*100));
  return <section className="course-collaboration">
    <header className="course-project-header">
      <div className="course-project-title"><Users/><div><h2>{project.title} <em>팀 합의 진행 중</em></h2><p>{project.summary} <i/> 참여자 {project.memberIds.length}명 <i/> {project.startDate?`${formatDate(project.startDate)} 시작`:'일정 협의 중'}</p></div></div>
    </header>
    <nav className="course-tabs">
      <button type="button" onClick={()=>setTab('roles')} className={tab==='roles'?'active':''}><Users/> 역할 및 멤버</button>
      <button type="button" onClick={()=>setTab('ideas')} className={tab==='ideas'?'active':''}><MapPin/> 아이디어 보드</button>
      <button type="button" onClick={()=>setTab('themes')} className={tab==='themes'?'active':''}><Sparkles/> 테마와 먹거리</button>
      <button type="button" onClick={()=>setTab('course')} className={tab==='course'?'active':''}><ArrowUpDown/> 프로젝트 코스</button>
      <button type="button" onClick={()=>setTab('info')} className={tab==='info'?'active':''}><Info/> 프로젝트 정보</button>
    </nav>
    {tab==='ideas'?<div className="idea-planning-board">
      <aside className="idea-chat"><h3>프로젝트 채팅</h3>{(draft.messages??[]).length?(draft.messages??[]).map(message=><p key={message.id}><b>{message.author}</b>{message.text}</p>):<p><b>시스템</b>첫 의견을 남겨 팀 회의를 시작해 보세요.</p>}<div><input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')sendChat()}} placeholder="새 의견을 입력하세요"/><button type="button" onClick={sendChat} disabled={!chatInput.trim()}><Send/></button></div></aside>
      <main><header><div><h3>장소 아이디어 보드</h3><p>가고 싶은 장소에 투표해 우선순위를 함께 정해요.</p></div><button type="button" onClick={()=>openIdeaComposer('place')}><Plus/> 장소 추가</button></header><div className="idea-place-grid">{draft.ideas.filter(i=>i.category==='place').sort((a,b)=>b.votes-a.votes).map((idea,index)=><article key={idea.id}><span>{index+1}</span><i>{idea.emoji}</i><b>{idea.name}</b><small>#{index===0?'야경':'사진'} · #{index===2?'카페':'산책'}</small><button type="button" onClick={()=>vote(idea.id)}>♥ {idea.votes}</button></article>)}</div><section className="ai-meeting-summary"><Bot/><div><b>AI 회의 도우미</b><p>{draft.ideas.length?`현재 프로젝트의 주제와 ${draft.ideas.length}개의 제안을 분석해 어울리는 세종 장소를 추천할 수 있어요.`:'프로젝트 주제를 분석해 첫 장소 후보를 추천할 수 있어요.'}</p><button type="button" onClick={()=>void recommendPlaces()} disabled={aiLoading}>{aiLoading?'GPT가 장소를 찾는 중…':'AI 장소 추천받기'}</button></div></section>{aiPlaces.length>0&&<section className="ai-place-suggestions">{aiPlaces.map(place=><article key={place.name}><div><b>{place.name}</b><p>{place.reason}</p><small>{place.tags.map(tag=>`#${tag}`).join(' ')}</small></div><button type="button" onClick={()=>addSuggestedPlace(place.name)}><Plus/> 보드에 추가</button></article>)}</section>}</main>
      <aside className="idea-members"><h3>멤버 및 역할</h3>{draft.roles.map((member,index)=><div key={member.name}><span>{member.name.slice(0,1)}</span><p><b>{member.name}{index===0?' (나)':''}</b><small>{member.role}</small></p></div>)}<section><h4>참여도 현황</h4><p>의견 작성 <i><b style={{width:`${opinionProgress}%`}}/></i></p><p>장소 투표 <i><b style={{width:`${voteProgress}%`}}/></i></p><p>아이디어 제안 <i><b style={{width:`${ideaProgress}%`}}/></i></p></section></aside>
    </div>:tab==='themes'
      ?<div className="theme-idea-columns">{groups.map(group=><section className={group.tone} key={group.key}><h3>{group.title}</h3>{draft.ideas.filter(i=>i.category===group.key).map(idea=><button type="button" onClick={()=>vote(idea.id)} key={idea.id}><span>{idea.emoji} {idea.name}</span><b>♥ {idea.votes}</b></button>)}<button type="button" className="add" onClick={()=>openIdeaComposer(group.key)}><Plus/> 아이디어 추가</button></section>)}</div>
      :tab==='course'?<ProjectCoursePlanner draft={draft} onChange={update} onGoToIdeas={()=>setTab('ideas')} onGoToThemes={()=>setTab('themes')} onNotice={onNotice}/>
      :tab==='roles'?<ProjectRoleEditor draft={draft} leaderId={project.leaderId} onChange={changeRole}/>
      :<ProjectAgreementInfo project={project} draft={draft}/>}
    <footer className="idea-action-footer"><button type="button" onClick={()=>{saveTravelProjectDraft(draft,project.id);onNotice(`${project.title}의 협상 내용을 저장했어요.`)}}>☁ 임시 저장</button><div><small>다음 단계</small><b>장소·일정·역할을 확인하고 팀의 최종 실행안으로 확정해요.</b></div><button type="button" className="review" onClick={requestReview}>최종 합의 검토 <ChevronRight/></button></footer>
    {ideaComposer&&<div className="course-idea-composer" role="dialog" aria-modal="true" aria-label="아이디어 추가" onClick={()=>{setIdeaComposer(null);setIdeaInput('')}}><section className={ideaComposer==='place'?'place-map-composer':undefined} onClick={event=>event.stopPropagation()}><small>{ideaComposer==='place'?'SEJONG PLACE MAP':ideaComposer==='theme'?'ACTIVITY':ideaComposer==='festival'?'FESTIVAL':'FOOD'} IDEA</small><h3>{ideaComposer==='place'?'지도에서 실제 세종 장소 추가':ideaComposer==='theme'?'가고 싶은 활동':ideaComposer==='festival'?'축제·테마': '먹거리'} 아이디어 추가</h3><p>{ideaComposer==='place'?'세종시 장소를 검색하고 지도에서 정확한 위치를 선택해 주세요.':'팀원들과 함께 검토할 아이디어를 입력해 주세요.'}</p>{ideaComposer==='place'?<><form className="place-map-search" onSubmit={event=>{event.preventDefault();void searchSejongPlaces(ideaInput)}}><Search/><input autoFocus value={ideaInput} onChange={event=>setIdeaInput(event.target.value)} maxLength={60} placeholder="예: 세종호수공원, 카페, 미술관"/><button disabled={!ideaInput.trim()||placeSearchLoading}>{placeSearchLoading?'검색 중…':'검색'}</button></form><div className="sejong-place-picker"><div className="sejong-map" aria-label="세종시 장소 검색 지도"><span className="sejong-map-label">세종특별자치시</span><i className="sejong-river"/>{placeResults.map((place,index)=>{const left=Math.max(5,Math.min(95,((place.longitude-127.15)/.28)*100));const top=Math.max(7,Math.min(93,(1-(place.latitude-36.43)/.29)*100));return <button type="button" key={place.id||`${place.name}-${index}`} className={selectedPlace?.id===place.id?'selected':''} style={{left:`${left}%`,top:`${top}%`}} onClick={()=>setSelectedPlace(place)} title={place.name}><MapPin/><b>{index+1}</b></button>})}{!placeResults.length&&!placeSearchLoading&&<div className="sejong-map-empty"><MapPin/><b>세종의 장소를 검색해 보세요</b><span>검색 결과가 지도에 표시됩니다.</span></div>}</div><div className="sejong-place-results">{placeSearchError&&<p className="place-search-error">{placeSearchError}</p>}{placeResults.map((place,index)=><button type="button" key={place.id||`${place.name}-list-${index}`} className={selectedPlace?.id===place.id?'selected':''} onClick={()=>setSelectedPlace(place)}><span>{index+1}</span><div><b>{place.name}</b><small>{place.roadAddress||place.address}</small><em>{place.category.split(' > ').slice(-1)[0]}</em></div></button>)}</div></div><footer><button type="button" onClick={()=>{setIdeaComposer(null);setIdeaInput('')}}>취소</button><button type="button" onClick={addSelectedPlace} disabled={!selectedPlace}><Plus/> 선택한 장소 추가</button></footer></>:<><input autoFocus value={ideaInput} onChange={event=>setIdeaInput(event.target.value)} onKeyDown={event=>{event.stopPropagation();if(event.key==='Enter'&&!event.nativeEvent.isComposing)addIdea()}} maxLength={60} placeholder={ideaComposer==='theme'?'예: 사진 촬영, 인터뷰, 야경 산책':ideaComposer==='festival'?'예: 복숭아축제 체험, 야간 공연':'예: 복숭아 디저트, 전통시장 먹거리'}/><footer><button type="button" onClick={()=>{setIdeaComposer(null);setIdeaInput('')}}>취소</button><button type="button" onClick={addIdea} disabled={!ideaInput.trim()}><Plus/> 아이디어 등록</button></footer></>}</section></div>}
    {draft.status==='review-requested'&&<div className="course-final-review" role="dialog" aria-modal="true"><section><header><span><Check/></span><div><small>FINAL AGREEMENT</small><h3>프로젝트 코스를 완성할까요?</h3><p>완성하면 정부청사로 이동해 실제 방문 단계로 이어집니다.</p></div></header><div className="final-review-route">{(draft.courseOrder??[]).map((id,index)=>{const place=draft.ideas.find(idea=>idea.id===id);return place?<article key={id}><b>{index+1}</b><div><strong>{place.name}</strong><small>{draft.courseTimes?.[id]??'시간 협의'} · {draft.courseDurations?.[id]??90}분</small></div></article>:null})}</div><aside><Users/> 역할 {draft.roles.length}명 배정 완료 · 장소 {(draft.courseOrder??[]).length}곳</aside><footer><button type="button" onClick={()=>update({...draft,status:'draft'})}>돌아가서 수정</button><button type="button" onClick={completeCourse}><Check/> 코스 완성 · 정부청사 이동</button></footer></section></div>}
  </section>;
}

function ProjectCoursePlanner({draft,onChange,onGoToIdeas,onGoToThemes,onNotice}:{draft:TravelProjectDraft;onChange:(draft:TravelProjectDraft)=>void;onGoToIdeas:()=>void;onGoToThemes:()=>void;onNotice:(message:string)=>void}){
  const places=draft.ideas.filter(idea=>idea.category==='place');
  const activities=draft.ideas.filter(idea=>idea.category!=='place').sort((a,b)=>b.votes-a.votes);
  const orderedIds=(draft.courseOrder??places.slice(0,3).sort((a,b)=>b.votes-a.votes).map(place=>place.id)).filter(id=>places.some(place=>place.id===id));
  const ordered=orderedIds.flatMap(id=>{const place=places.find(item=>item.id===id);return place?[place]:[]});
  const available=places.filter(place=>!orderedIds.includes(place.id));
  const durations=draft.courseDurations??{};
  const activityMap=draft.courseActivityMap??{};
  const courseTimes=draft.courseTimes??{};
  const startTime=draft.courseStartTime??'14:00';
  const startMinutes=(()=>{const [hour,minute]=startTime.split(':').map(Number);return hour*60+minute})();
  const durationFor=(id:string)=>durations[id]??90;
  const suggestedTimeAt=(index:number)=>{const minutes=ordered.slice(0,index).reduce((total,place)=>total+durationFor(place.id)+20,startMinutes);return `${String(Math.floor(minutes/60)%24).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`};
  const timeAt=(placeId:string,index:number)=>courseTimes[placeId]??suggestedTimeAt(index);
  const move=(index:number,direction:-1|1)=>{const target=index+direction;if(target<0||target>=orderedIds.length)return;const next=[...orderedIds];[next[index],next[target]]=[next[target],next[index]];onChange({...draft,courseOrder:next,courseConfirmed:false,status:'draft'})};
  const addPlace=(id:string)=>onChange({...draft,courseOrder:[...orderedIds,id],courseConfirmed:false,status:'draft'});
  const removePlace=(id:string)=>onChange({...draft,courseOrder:orderedIds.filter(item=>item!==id),courseConfirmed:false,status:'draft'});
  const setDuration=(id:string,value:number)=>onChange({...draft,courseDurations:{...durations,[id]:value},courseConfirmed:false,status:'draft'});
  const setVisitTime=(id:string,value:string)=>onChange({...draft,courseTimes:{...courseTimes,[id]:value},courseConfirmed:false,status:'draft'});
  const assignActivity=(placeId:string,activityId:string)=>{
    const next=Object.fromEntries(Object.entries(activityMap).map(([id,ids])=>[id,ids.filter(item=>item!==activityId)]));
    if(!(activityMap[placeId]??[]).includes(activityId))next[placeId]=[...(next[placeId]??[]),activityId];
    onChange({...draft,courseActivityMap:next,courseConfirmed:false,status:'draft'});
  };
  const autoBuild=()=>{
    const nextOrder=places.slice().sort((a,b)=>b.votes-a.votes).slice(0,Math.min(4,places.length)).map(place=>place.id);
    const nextMap:Record<string,string[]>={};activities.forEach((activity,index)=>{const id=nextOrder[index%nextOrder.length];if(id)nextMap[id]=[...(nextMap[id]??[]),activity.id]});
    onChange({...draft,courseOrder:nextOrder,courseActivityMap:nextMap,courseTimes:{},courseConfirmed:false,status:'draft'});onNotice('투표 결과를 기준으로 코스를 자동 배치했어요. 방문 시간은 직접 바꿀 수 있어요.');
  };
  if(!places.length)return <div className="project-course-empty"><MapPin/><h3>코스에 넣을 장소가 아직 없어요</h3><p>아이디어 보드에서 장소를 직접 추가하거나 AI 추천을 받아 보세요.</p><button type="button" onClick={onGoToIdeas}>장소 아이디어 추가하기</button></div>;
  return <div className="project-course-builder">
    <header><div><small>PROJECT COURSE BUILDER</small><h3>팀 아이디어로 코스 만들기</h3><p>장소를 담고 순서를 정한 뒤, 각 장소에서 할 활동을 눌러 배치하세요.</p></div><button type="button" onClick={autoBuild}><Sparkles/> 투표순 자동 배치</button></header>
    <section className="course-builder-settings"><label>기본 시작 시간<input type="time" value={startTime} onChange={event=>onChange({...draft,courseStartTime:event.target.value,courseTimes:{},courseConfirmed:false,status:'draft'})}/></label><p><b>{ordered.length}</b>개 장소 · 각 장소의 방문 시간과 체류 시간을 직접 바꿀 수 있어요.</p></section>
    <section className="course-builder-grid">
      <aside className="course-place-pool"><header><div><b>장소 후보</b><small>아이디어 보드에서 가져옴</small></div><button type="button" onClick={onGoToIdeas}><Plus/> 추가</button></header>{available.length?available.map(place=><button type="button" key={place.id} onClick={()=>addPlace(place.id)}><i>{place.emoji}</i><span><b>{place.name}</b><small>♥ {place.votes}표</small></span><Plus/></button>):<p>모든 장소가 코스에 담겼어요.</p>}</aside>
      <main className="course-route-editor"><header><b>방문 순서와 시간</b><small>시간 입력 또는 화살표를 눌러 바로 수정하세요.</small></header>{ordered.length?ordered.map((place,index)=>{const assignedIds=activityMap[place.id]??[];return <article key={place.id}><div className="route-stop-number"><b>{index+1}</b></div><section><header><i>{place.emoji}</i><div><b>{place.name}</b><small>장소 투표 {place.votes}표</small></div><label>방문 시간<input type="time" value={timeAt(place.id,index)} onChange={event=>setVisitTime(place.id,event.target.value)}/></label><label>체류 시간<select aria-label={`${place.name} 체류 시간`} value={durationFor(place.id)} onChange={event=>setDuration(place.id,Number(event.target.value))}><option value={30}>30분</option><option value={60}>1시간</option><option value={90}>1시간 30분</option><option value={120}>2시간</option><option value={180}>3시간</option></select></label></header><div className="route-activity-picker">{activities.length?activities.map(activity=><button type="button" key={activity.id} className={assignedIds.includes(activity.id)?'selected':''} onClick={()=>assignActivity(place.id,activity.id)}>{activity.emoji} {activity.name}</button>):<button type="button" onClick={onGoToThemes}><Plus/> 활동 아이디어 추가</button>}</div></section><aside><button type="button" disabled={index===0} onClick={()=>move(index,-1)}>↑</button><button type="button" disabled={index===ordered.length-1} onClick={()=>move(index,1)}>↓</button><button type="button" onClick={()=>removePlace(place.id)}><Trash2/></button></aside></article>}):<div className="route-editor-empty"><MapPin/><b>왼쪽 장소 후보를 눌러 코스에 담아 주세요.</b></div>}</main>
    </section>
  </div>;
}

function ProjectRoleEditor({draft,leaderId,onChange}:{draft:TravelProjectDraft;leaderId:string;onChange:(name:string,role:string)=>void}){
  const roleOptions=['역할 미정','프로젝트 리더','일정 관리','장소 조사','사진·영상 기록','인터뷰·취재','예산·준비물','결과물 편집'];
  return <div className="course-secondary project-role-editor"><span>👥</span><h3>역할 및 멤버</h3><p>각 팀원이 맡을 역할을 정하면 최종 검토를 진행할 수 있어요.</p><div>{draft.roles.map(member=><article key={member.name}><i>{member.name.slice(0,1)}</i><b>{member.name}{member.name===leaderId?' · 팀장':''}</b><select value={member.role} onChange={event=>onChange(member.name,event.target.value)}>{roleOptions.map(role=><option key={role} value={role}>{role}</option>)}</select></article>)}</div></div>;
}

function ProjectAgreementInfo({project,draft}:{project:Project;draft:TravelProjectDraft}){
  const places=draft.ideas.filter(idea=>idea.category==='place');
  const activities=draft.ideas.filter(idea=>idea.category!=='place');
  const assigned=draft.roles.filter(member=>member.role!=='역할 미정').length;
  const course=(draft.courseOrder??[]).flatMap(id=>{const place=places.find(item=>item.id===id);return place?[place]:[]});
  const ready=[{label:'팀 역할 정하기',done:assigned===draft.roles.length,value:`${assigned}/${draft.roles.length}명 완료`},{label:'장소 아이디어 모으기',done:places.length>0,value:`${places.length}개`},{label:'활동 아이디어 모으기',done:activities.length>0,value:`${activities.length}개`},{label:'프로젝트 코스 만들기',done:course.length>0,value:`${course.length}곳 배치`}];
  return <div className="project-info-dashboard"><header><span>📋</span><div><small>PROJECT OVERVIEW</small><h3>{project.title}</h3><p>{project.summary}</p></div><em>{ready.filter(item=>item.done).length}/{ready.length} 준비 완료</em></header><section className="project-info-grid"><article className="project-info-purpose"><small>프로젝트 목표</small><h4>{project.description||project.summary}</h4><div>{[...project.tags,...project.activityTypes].slice(0,8).map(tag=><span key={tag}>#{tag}</span>)}</div></article><article><small>진행 일정</small><b><CalendarDays/> {formatDate(project.startDate)}</b><p>{draft.note}</p></article><article><small>참여 팀</small><b><Users/> {draft.roles.length}명 참여</b><p>역할 배정 {assigned}명 · 미정 {draft.roles.length-assigned}명</p></article><article className="project-info-route"><small>현재 프로젝트 코스</small>{course.length?<ol>{course.map((place,index)=><li key={place.id}><b>{index+1}</b><span>{place.name}</span><time>{draft.courseTimes?.[place.id]??'시간 미정'}</time></li>)}</ol>:<p>아직 코스를 만들지 않았어요.</p>}</article></section><section className="project-readiness"><header><b>최종 합의 전 확인</b><span>아래 항목을 모두 준비하면 최종 검토가 쉬워져요.</span></header><div>{ready.map(item=><article className={item.done?'done':''} key={item.label}>{item.done?<Check/>:<Clock3/>}<span><b>{item.label}</b><small>{item.value}</small></span></article>)}</div></section></div>;
}

function CourseSecondaryTab({tab,profile}:{tab:'roles'|'schedule'|'info';profile:UserProfile}){
  const content=tab==='roles'
    ?{icon:'👥',title:'역할 배정',copy:'각 장소의 촬영과 기록 담당자를 정해요.',items:[`${profile.nickname||'나'} · 사진 기록`,`이준서 · 이동 경로 확인`,`연지 · 인터뷰와 메모`,`도형 · 결과물 정리`]}
    :tab==='schedule'
      ?{icon:'🗓️',title:'일정 및 메모',copy:'팀이 함께 가능한 시간과 준비 사항을 확인해요.',items:['토요일 오후 2시 · 세종호수공원 집결','카메라 또는 스마트폰 준비','개인 물과 간단한 간식','촬영 결과는 팀 앨범에 공유']}
      :{icon:'ℹ️',title:'프로젝트 정보',copy:'프로젝트 목표와 참여 현황을 한눈에 확인해요.',items:['목표 · 세종의 자연을 사진으로 기록','참여자 · 4명 / 최대 6명','프로젝트 코드 · 7XF3D','상태 · 코스 계획 중']};
  return <div className="course-secondary"><span>{content.icon}</span><h3>{content.title}</h3><p>{content.copy}</p><div>{content.items.map(item=><article key={item}><Check/><b>{item}</b></article>)}</div></div>;
}

function ProjectCard({project,recommendation,sent,onDetail,onSend}:{project:Project;recommendation?:AIProjectRecommendation;sent:boolean;onDetail:()=>void;onSend:()=>void}){
  const match=recommendation?.matchScore??Math.min(96,66+project.tags.length*5);
  return <article className="project-board-card"><header><span style={{background:project.id.includes('garden')?'#5cae85':project.id.includes('festival')?'#8a6ad2':'#d38a53'}}>{project.thumbnail??'💡'}</span><div><small>{project.placeIds[0]} · 모집글</small><h3>{project.title}</h3><p>{project.summary}</p></div><strong>{match}%<small>적합도</small></strong></header><div className="project-tags">{project.tags.map(tag=><i key={tag}>#{tag}</i>)}</div><dl><div><Users size={14}/><span><dt>모집 현황</dt><dd>{project.memberIds.length}/{project.maxMembers}명</dd></span></div><div><CalendarDays size={14}/><span><dt>일정</dt><dd>{formatDate(project.startDate)}</dd></span></div><div><Sparkles size={14}/><span><dt>관심 태그</dt><dd>{project.tags.slice(0,2).join(' · ')}</dd></span></div></dl><p className="project-reason">추천 이유 · {recommendation?.reasons[0]??`${project.tags.slice(0,2).join('과 ')} 관심사가 잘 맞는 모집글이에요.`}</p><footer><button type="button" onClick={onDetail}>상세 보기 <ChevronRight size={13}/></button><button type="button" disabled={sent} onClick={onSend}>{sent?<><Check size={14}/> 승인 대기 중</>:<><Send size={14}/> 참가 신청</>}</button></footer></article>;
}

function ProjectDetail({project,sent,canApply,onBack,onSend}:{project:Project;sent:boolean;canApply:boolean;onBack:()=>void;onSend:()=>void}){
  const recruitment=isRecruitmentPost(project);
  return <section className="project-detail-panel"><button type="button" className="project-detail-back" onClick={onBack}><ChevronRight/> 이전</button><PanelHeader eyebrow={recruitment?'RECRUITMENT DETAIL':'PROJECT DETAIL'} icon={project.thumbnail??'💡'} title={project.title} copy={project.summary}/><div className="project-detail-hero"><div><small>대표 장소</small><b><MapPin size={15}/>{project.placeIds.join(' · ')}</b></div><div><small>{recruitment?'모집 현황':'참여 현황'}</small><b><Users size={15}/>{project.memberIds.length}/{project.maxMembers}명</b></div><div><small>{recruitment?'모임 일정':'프로젝트 일정'}</small><b><CalendarDays size={15}/>{formatDate(project.startDate)}</b></div></div><article><small>{recruitment?'모집 내용':'프로젝트 목적'}</small><p>{project.description}</p></article><div className="project-detail-columns"><section><small>활동과 태그</small><div>{[...project.activityTypes,...project.tags].map(item=><span key={item}>#{item}</span>)}</div></section><section><small>{recruitment?'관심 태그':'팀장이 원하는 참여자'}</small><div>{(recruitment?project.tags:project.preferredTraits).map(item=><span key={item}>#{item}</span>)}</div></section></div><footer><p>{recruitment?'참가 신청 시 공개한 체험 프로필이 모집자에게 전달됩니다.':canApply?'참가 확정 전 체험 프로필을 팀장에게 전달합니다.':'현재 참여 중인 프로젝트의 상세 정보입니다.'}</p>{canApply&&<button type="button" disabled={sent} onClick={onSend}>{sent?'프로필 전달 완료 · 승인 대기 중':recruitment?'내 프로필로 참가 신청':'프로필 전달하기'}</button>}</footer></section>;
}

function ProjectCreationForm({profile,onCreated,onDetail,created}:{profile:UserProfile;onCreated:(project:Project)=>void;onDetail:(project:Project)=>void;created:Project|null}){
  const clubContext=useMemo(loadClubProjectContext,[]);
  const [step,setStep]=useState(1);
  const [title,setTitle]=useState(''),[summary,setSummary]=useState(''),[purpose,setPurpose]=useState(clubContext?`${clubContext.clubName}의 ${clubContext.interests.join('·')} 관심사를 실제 활동으로 이어갑니다.`:''),[place,setPlace]=useState(''),[selectedActivities,setSelectedActivities]=useState<string[]>(clubContext?.interests.length?clubContext.interests:['사진']),[maxMembers,setMaxMembers]=useState(5),[startDate,setStartDate]=useState(''),[deadline,setDeadline]=useState(''),[selectedTraits,setSelectedTraits]=useState<string[]>([]),[visibility,setVisibility]=useState<'public'|'private'>('public'),[tags,setTags]=useState<string[]>(clubContext?.interests??[]),[sponsorEnabled,setSponsorEnabled]=useState(Boolean(clubContext));
  const toggle=(value:string,current:string[],setter:(value:string[])=>void)=>setter(current.includes(value)?current.filter(item=>item!==value):[...current,value]);
  const assist=()=>{const result=suggestProjectCopy(place,purpose,selectedActivities);setTitle(result.title);setSummary(result.summary);setTags(result.tags)};
  const continueToNextStep=()=>{if(step===2)setSelectedTraits(suggestProjectTraits(place,purpose,selectedActivities));setStep(value=>Math.min(3,value+1))};
  const submit=(event:FormEvent)=>{event.preventDefault();const normalizedPlace=place.trim();if(!title.trim()||!summary.trim()||!purpose.trim()||!normalizedPlace)return;const project:Project={id:`project-${Date.now()}`,title:title.trim(),summary:summary.trim(),description:purpose.trim(),placeIds:[normalizedPlace],activityTypes:selectedActivities,tags:tags.length?tags:[...selectedActivities,normalizedPlace],leaderId:profile.nickname,memberIds:[profile.nickname],applicantIds:[],maxMembers,startDate:startDate||undefined,deadline:deadline||undefined,preferredTraits:selectedTraits,status:'recruiting',thumbnail:clubContext?.icon??'💡',createdAt:new Date().toISOString(),visibility,...(clubContext&&sponsorEnabled?{sponsorClubId:clubContext.clubId,sponsorClubName:clubContext.clubName,sponsorClubInterests:clubContext.interests}:{})};if(clubContext&&sponsorEnabled)clearClubProjectContext();onCreated(project)};
  const canContinue=step===1?Boolean(place.trim()&&purpose.trim()&&selectedActivities.length):step===2?Boolean(title.trim()&&summary.trim()):true;
  return <section className="project-create-panel"><PanelHeader eyebrow="PROJECT KIOSK" icon="＋" title="새 프로젝트 만들기" copy="단계별로 차근차근 프로젝트를 완성해 보세요."/>
    <nav className="creation-steps" aria-label="프로젝트 생성 단계">
      {[['1','기본 정보'],['2','프로젝트 소개'],['3','모집 설정']].map(([number,label],index)=><div className={step===index+1?'active':step>index+1?'done':''} key={number}><span>{step>index+1?<Check/>:number}</span><b>STEP {number}</b><small>{label}</small></div>)}
    </nav>
    {created&&<div className="project-created"><Check size={20}/><div><b>{created.title} 등록 완료</b><small>프로젝트 게시판에 ‘모집 중’으로 바로 추가됐어요.</small></div><button type="button" onClick={()=>onDetail(created)}>상세 확인</button></div>}
    {clubContext&&<aside className="club-project-bridge"><span>{clubContext.icon}</span><div><small>동아리 거리제에서 이어짐</small><b>{clubContext.clubName}와 프로젝트를 시작해 보세요</b><p>관련 회원 {clubContext.memberNames.length}명 · 관심 분야 {clubContext.interests.join(' · ')}</p><strong>이 동아리 회원을 프로젝트 팀원 후보로 추천할 수 있어요.</strong></div><label><input type="checkbox" checked={sponsorEnabled} onChange={event=>setSponsorEnabled(event.target.checked)}/> 동아리 프로젝트로 등록</label></aside>}
    <form onSubmit={submit}>
      <section className="creation-step-content">
        <header><small>STEP {step} / 3</small><h3>{step===1?'어디서 무엇을 할까요?':step===2?'프로젝트를 소개해 주세요': '함께할 팀원을 모집해요'}</h3><p>{step===1?'장소와 활동 목적을 먼저 알려주세요.':step===2?'프로젝트 이름과 한 줄 소개를 정해 주세요.':'인원과 일정, 원하는 팀원 성향을 선택해 주세요.'}</p></header>
        {step===1&&<><div className="creation-grid"><label>세종 장소<input value={place} onChange={event=>setPlace(event.target.value)} placeholder="예: 조치원역 광장, 세종호수공원" autoFocus/></label><label className="wide">프로젝트 목적<textarea value={purpose} onChange={event=>setPurpose(event.target.value)} placeholder="함께 무엇을 만들거나 기록하고 싶나요?"/></label></div><fieldset><legend>활동 유형</legend><div>{activities.map(item=><button type="button" className={selectedActivities.includes(item)?'active':''} onClick={()=>toggle(item,selectedActivities,setSelectedActivities)} key={item}>{item}</button>)}</div></fieldset></>}
        {step===2&&<><div className="creation-grid"><label>프로젝트 이름<input value={title} onChange={event=>setTitle(event.target.value)} placeholder="프로젝트 이름" autoFocus/></label><label>한 줄 소개<textarea className="creation-summary" rows={2} value={summary} onChange={event=>setSummary(event.target.value)} placeholder="어떤 프로젝트인가요?"/></label></div><div className="ai-copy-assist"><Bot size={22}/><div><b>AI 도우미</b></div><button type="button" onClick={assist}><Sparkles size={14}/> 자동 작성</button></div></>}
        {step===3&&<><div className="creation-grid"><label>모집 인원<select value={maxMembers} onChange={event=>setMaxMembers(Number(event.target.value))}>{[2,3,4,5,6,8].map(item=><option value={item} key={item}>{item}명</option>)}</select></label><label>일정<input type="date" value={startDate} onChange={event=>setStartDate(event.target.value)}/></label><label>모집 마감일<input type="date" value={deadline} onChange={event=>setDeadline(event.target.value)}/></label></div><fieldset><legend>원하는 팀원 성향 · AI 추천</legend><div>{traits.map(item=><button type="button" className={selectedTraits.includes(item)?'active':''} onClick={()=>toggle(item,selectedTraits,setSelectedTraits)} key={item}>{item}</button>)}</div></fieldset><label className="creation-visibility"><input type="checkbox" checked={visibility==='public'} onChange={event=>setVisibility(event.target.checked?'public':'private')}/> 프로젝트 공개</label></>}
      </section>
      <div className="creation-footer"><button type="button" className="secondary" disabled={step===1} onClick={()=>setStep(value=>Math.max(1,value-1))}>이전</button>{step<3?<button type="button" disabled={!canContinue} onClick={continueToNextStep}>다음 단계 <ChevronRight size={16}/></button>:<button type="submit"><Plus size={16}/> 프로젝트 생성</button>}</div>
    </form>
  </section>;
}

function EmptyState({text,hint='오른쪽 키오스크에서 새 프로젝트를 만들 수 있어요.'}:{text:string;hint?:string}){return <div className="project-empty"><Search size={28}/><b>{text}</b><p>{hint}</p></div>}
