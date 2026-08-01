import { useEffect,useMemo,useState,type FormEvent } from 'react';
import { ArrowUpDown,Bot,CalendarDays,Check,ChevronRight,Clock3,Info,MapPin,Plus,RotateCcw,Search,Send,Sparkles,Trash2,UserPlus,Users,X } from 'lucide-react';
import type { UserProfile } from '../types';
import { gameEvents } from '../game/events';
import type { ProjectRoomInteraction,ProjectRoomInteractionId } from '../game/projectRoomInteractions';
import { buildAiSejongProfile } from '../services/aiSejongProfile';
import {
  createProjectApplication,
  loadProjectApplications,
  loadProjectRoomProjects,
  recommendProjects,
  saveProjectApplications,
  saveProjectRoomProjects,
  suggestProjectCopy,
  type AIProjectRecommendation,
  type Project,
  type ProjectApplication,
} from '../services/projectRoomProjects';
import './ProjectRoomInteractions.css';
import { loadTravelProjectDraft,saveTravelProjectDraft,type TravelIdea,type TravelProjectDraft } from '../services/travelProjectDraft';

type Panel='board'|'recommendation'|'creation'|'course'|'detail'|'profile-send'|null;
const filters=['전체','사진','탐방','문화','축제','자연','조사','인터뷰'];
const places=['세종호수공원','국립세종수목원','베어트리파크','전통시장','공동캠퍼스','기타'];
const activities=['사진','탐방','문화','축제','자연','조사','인터뷰','코스 기획'];
const traits=['사진 기록형','탐색형','계획형','자유형','여유형','효율형','대화 중심','실행 중심'];
const panelFor=(id:ProjectRoomInteractionId):Panel=>id==='project-board'?'board':id==='ai-recommendation-screen'?'recommendation':id==='collaboration-table'?'course':'creation';
const formatDate=(value?:string)=>value?new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric'}).format(new Date(`${value}T00:00:00`)):'일정 협의';

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
  const [kioskActive,setKioskActive]=useState(false);
  const [kioskScreenRect,setKioskScreenRect]=useState<{left:number;top:number;width:number;height:number}|null>(null);
  const aiProfile=useMemo(()=>buildAiSejongProfile(profile),[profile]);
  const recommendations=useMemo(()=>recommendProjects(projects,profile),[profile,projects]);

  useEffect(()=>{
    const proximity=(interaction:ProjectRoomInteraction|null)=>setNearby(interaction);
    const open=(id:ProjectRoomInteractionId)=>{
      const next=panelFor(id);
      if(next!=='course')setReturnPanel(next as 'board'|'recommendation'|'creation');
      setPanel(next);
    };
    const kioskMode=(enabled:boolean)=>setKioskActive(enabled);
    const kioskRect=(rect:{left:number;top:number;width:number;height:number}|null)=>setKioskScreenRect(rect);
    const kioskSelection=(selection:'create'|'board'|'recommendation')=>{
      if(selection==='create'){setKioskActive(true);setReturnPanel('creation');setPanel('creation');return}
      setKioskActive(false);
      if(selection==='board'){setReturnPanel('board');setPanel('board');return}
      setReturnPanel('recommendation');setPanel('recommendation');
    };
    gameEvents.on('project-room-interaction-proximity-changed',proximity);
    gameEvents.on('project-room-interaction-open',open);
    gameEvents.on('project-room-kiosk-mode-changed',kioskMode);
    gameEvents.on('project-room-kiosk-screen-rect',kioskRect);
    gameEvents.on('project-room-kiosk-selection',kioskSelection);
    return()=>{
      gameEvents.off('project-room-interaction-proximity-changed',proximity);
      gameEvents.off('project-room-interaction-open',open);
      gameEvents.off('project-room-kiosk-mode-changed',kioskMode);
      gameEvents.off('project-room-kiosk-screen-rect',kioskRect);
      gameEvents.off('project-room-kiosk-selection',kioskSelection);
    };
  },[]);
  useEffect(()=>{if(!active){setNearby(null);setPanel(null);setSelected(null);setKioskActive(false);gameEvents.emit('project-room-focus-changed',undefined)}},[active]);
  useEffect(()=>onOpenChange(panel!==null||kioskActive),[kioskActive,onOpenChange,panel]);
  useEffect(()=>{
    gameEvents.emit('project-room-focus-changed',panel==='creation'?'project-kiosk':undefined);
  },[panel]);
  useEffect(()=>()=>{gameEvents.emit('project-room-focus-changed',undefined)},[]);
  useEffect(()=>{
    if(!panel)return;
    const escape=(event:KeyboardEvent)=>{
      if(event.key!=='Escape')return;
      event.preventDefault();
      if(panel==='profile-send'||panel==='detail')setPanel(returnPanel);
      else setPanel(null);
    };
    window.addEventListener('keydown',escape);
    return()=>window.removeEventListener('keydown',escape);
  },[panel,returnPanel]);

  const filtered=projects.filter(project=>project.status==='recruiting')
    .filter(project=>filter==='전체'||project.tags.includes(filter)||project.activityTypes.includes(filter))
    .filter(project=>!query.trim()||[project.title,project.summary,...project.tags,...project.placeIds].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const isSent=(project:Project)=>applications.some(item=>item.projectId===project.id&&item.applicantId===profile.nickname);
  const showDetail=(project:Project,from:'board'|'recommendation'|'creation')=>{setSelected(project);setReturnPanel(from);setPanel('detail')};
  const showProfileSend=(project:Project,from:'board'|'recommendation')=>{if(isSent(project))return;setSelected(project);setReturnPanel(from);setMessage(aiProfile.oneLineAnalysis);setPanel('profile-send')};
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
    {active&&nearby&&!panel&&!kioskActive&&<button type="button" className="project-room-prompt" onClick={()=>gameEvents.emit(nearby.id==='project-kiosk'?'project-room-kiosk-activate':'project-room-interaction-open',nearby.id==='project-kiosk'?undefined:nearby.id)}>
      <span><Sparkles size={18}/></span><div><small>프로젝트실 상호작용</small><b>{nearby.label}</b></div><kbd>E</kbd><em>상호작용</em>
    </button>}
    {active&&panel&&<div className={`project-room-overlay ${panel==='creation'?'is-kiosk-mode':''}`} role="dialog" aria-modal="true" aria-label="프로젝트실 기능 패널" onMouseDown={event=>{if(event.target===event.currentTarget)setPanel(null)}}>
      <section className={`project-room-panel is-${panel}`} style={panel==='creation'&&kioskScreenRect?{position:'fixed',left:kioskScreenRect.left+2,top:kioskScreenRect.top+2,width:Math.max(1,kioskScreenRect.width-4),height:Math.max(1,kioskScreenRect.height-4)}:undefined}>
        <button type="button" className="project-room-close" onClick={()=>panel==='detail'||panel==='profile-send'?setPanel(returnPanel):setPanel(null)} aria-label="패널 닫기"><X size={20}/></button>

        {panel==='board'&&<>
          <PanelHeader eyebrow="PROJECT BOARD" icon="📌" title="모집 중인 프로젝트" copy="관심 분야를 확인하고, 참여하고 싶은 팀에 내 체험 프로필을 전달하세요."/>
          <div className="project-room-tools"><label><Search size={17}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="프로젝트·장소·태그 검색"/></label><nav>{filters.map(item=><button type="button" className={filter===item?'active':''} onClick={()=>setFilter(item)} key={item}>{item}</button>)}</nav></div>
          <div className="project-board-list">{filtered.map(project=><ProjectCard key={project.id} project={project} recommendation={recommendations.find(item=>item.projectId===project.id)} sent={isSent(project)} onDetail={()=>showDetail(project,'board')} onSend={()=>showProfileSend(project,'board')}/>)}</div>
          {!filtered.length&&<EmptyState text="검색 조건에 맞는 모집 프로젝트가 없어요."/>}
        </>}

        {panel==='recommendation'&&<>
          <PanelHeader eyebrow="AI PROJECT MATCH" icon="✨" title={`${profile.nickname||'사용자'}님을 위한 프로젝트`} copy={aiProfile.oneLineAnalysis}/>
          <section className="project-profile-summary"><div><span>{profile.nickname.slice(0,1)||'나'}</span><b>{aiProfile.completion}% 프로필 완성</b></div><p>{[...aiProfile.interests.map(item=>item.label),aiProfile.representativePlant?.name,aiProfile.dominantEmotion].filter(Boolean).join(' · ')||'첫 체험 기록을 프로젝트에서 만들어 보세요.'}</p></section>
          <div className="project-recommend-list">{recommendations.map((recommendation,index)=>{
            const project=projects.find(item=>item.id===recommendation.projectId);if(!project)return null;
            return <article className="project-recommend-card" key={project.id}><div className="recommend-rank">0{index+1}</div><div className="recommend-score"><strong>{recommendation.matchScore}%</strong><small>적합도</small></div><div className="recommend-main"><span>{project.thumbnail??'💡'}</span><div><small>{project.placeIds[0]}</small><h3>{project.title}</h3><p>{recommendation.reasons[0]}</p></div></div><div className="recommend-reasons">{recommendation.reasons.slice(0,3).map(reason=><span key={reason}><Check size={12}/>{reason}</span>)}</div><div className="recommend-members">{project.memberIds.slice(0,3).map(member=><span title={member} key={member}>{member.slice(0,1)}</span>)}<small>{project.memberIds.slice(0,2).join(' · ')} 참여 중</small></div><dl><div><dt>공통 관심사</dt><dd>{recommendation.commonInterests.join(' · ')||project.tags.slice(0,2).join(' · ')}</dd></div><div><dt>예상 역할</dt><dd>{recommendation.recommendedRole}</dd></div><div><dt>참여 인원</dt><dd>{project.memberIds.length}/{project.maxMembers}명</dd></div></dl><footer><button type="button" onClick={()=>showDetail(project,'recommendation')}>상세 보기</button><button type="button" disabled={isSent(project)} onClick={()=>showProfileSend(project,'recommendation')}><Send size={14}/>{isSent(project)?'팀장 확인 중':'프로필 전달하기'}</button></footer></article>;
          })}</div>
        </>}

        {panel==='course'&&<CourseCollaborationTable profile={profile} onNotice={onNotice}/>}

        {panel==='creation'&&<ProjectCreationForm profile={profile} onCreated={project=>{const next=[project,...projects];setProjects(next);saveProjectRoomProjects(next);setCreated(project);onNotice('새 프로젝트를 모집 중으로 등록했어요.')}} onDetail={project=>showDetail(project,'creation')} created={created}/>}

        {panel==='detail'&&selected&&<ProjectDetail project={selected} sent={isSent(selected)} onSend={()=>showProfileSend(selected,returnPanel==='recommendation'?'recommendation':'board')}/>}

        {panel==='profile-send'&&selected&&<section className="profile-send-modal">
          <PanelHeader eyebrow="PROFILE DELIVERY" icon="📨" title="내 체험 프로필 전달하기" copy="바로 가입되지 않으며, 팀장이 확인한 뒤 참여 여부를 결정합니다."/>
          <div className="profile-send-target"><span>{selected.thumbnail??'💡'}</span><div><small>전달할 프로젝트</small><b>{selected.title}</b><p>{selected.leaderId} 팀장 · {selected.memberIds.length}/{selected.maxMembers}명</p></div></div>
          <div className="profile-snapshot-grid"><span><small>축제·활동</small><b>{aiProfile.interests.map(item=>item.label).join(' · ')||profile.interests.join(' · ')||'체험 기록 없음'}</b></span><span><small>대표 식물</small><b>{aiProfile.representativePlant?.name??'아직 선택 전'}</b></span><span><small>감정 기록</small><b>{aiProfile.dominantEmotion??'아직 기록 전'}</b></span><span><small>관심 장소</small><b>{profile.preferredPlaceCategories.join(' · ')||aiProfile.recommendedCourse[0]||'세종 전역'}</b></span></div>
          <label className="profile-message">자기소개 또는 참여 메시지<textarea value={message} onChange={event=>setMessage(event.target.value)} maxLength={240}/><small>{message.length}/240자</small></label>
          <footer><button type="button" onClick={()=>setPanel(returnPanel)}>취소</button><button type="button" disabled={!message.trim()} onClick={sendProfile}><Send size={15}/> 프로필 전달하기</button></footer>
        </section>}
      </section>
    </div>}
  </>;
}

function PanelHeader({eyebrow,icon,title,copy}:{eyebrow:string;icon:string;title:string;copy:string}){
  return <header className="project-panel-header"><span>{icon}</span><div><small>{eyebrow}</small><h2>{title}</h2><p>{copy}</p></div></header>;
}

type CoursePlace={id:string;name:string;time:string;duration:string;description:string;image:string;tags:string[]};
const COURSE_PLACES:CoursePlace[]=[
  {id:'lake',name:'세종호수공원',time:'14:00',duration:'약 1시간 30분',description:'호수와 이응다리를 배경으로 팀의 첫 사진 기록을 시작합니다.',image:'/images/festivals/hangeul-2026.jpg',tags:['호수','야외 촬영','산책']},
  {id:'garden',name:'국립세종수목원',time:'16:00',duration:'약 2시간',description:'다양한 식물과 테마 정원을 사진으로 기록합니다.',image:'/images/festivals/spring-flower-2026.jpg',tags:['자연','사진 기록','식물 관찰']},
  {id:'cafe',name:'조치원 카페거리',time:'18:30',duration:'약 1시간',description:'촬영한 사진을 함께 살펴보고 기록을 정리합니다.',image:'/images/food-shops/actual/stellaon.jpg',tags:['카페','회고','팀 대화']},
  {id:'market',name:'세종전통시장',time:'19:40',duration:'약 1시간',description:'시장 풍경과 지역의 생활 문화를 사진으로 남깁니다.',image:'/images/food-shops/jochwon-market.jpg',tags:['시장','로컬','문화 기록']},
  {id:'festival',name:'세종 야간축제',time:'21:00',duration:'약 1시간 30분',description:'조명과 공연이 있는 야간 풍경을 촬영합니다.',image:'/images/festivals/nakhwa-2026.jpg',tags:['야경','축제','공연']},
];

function CourseCollaborationTable({profile,onNotice}:{profile:UserProfile;onNotice:(message:string)=>void}){
  const [tab,setTab]=useState<'ideas'|'themes'|'roles'|'info'>('ideas');
  const [draft,setDraft]=useState<TravelProjectDraft>(loadTravelProjectDraft);
  const [newIdea,setNewIdea]=useState('');
  const update=(next:TravelProjectDraft)=>{setDraft(next);saveTravelProjectDraft(next)};
  const vote=(id:string)=>update({...draft,ideas:draft.ideas.map(idea=>idea.id===id?{...idea,votes:idea.votes+1}:idea),status:'draft'});
  const addIdea=()=>{if(!newIdea.trim())return;const idea:TravelIdea={id:`idea-${Date.now()}`,name:newIdea.trim(),category:'place',emoji:'📍',votes:1};update({...draft,ideas:[...draft.ideas,idea],status:'draft'});setNewIdea('');onNotice('새 여행 아이디어를 추가했어요.')};
  const requestReview=()=>{update({...draft,status:'review-requested'});onNotice('임시 여행 프로젝트를 정부청사 AI에 전달했어요.')};
  const groups=[
    {key:'theme',title:'가고 싶은 활동',tone:'purple'},
    {key:'festival',title:'축제·테마 아이디어',tone:'blue'},
    {key:'food',title:'먹거리 아이디어',tone:'green'},
  ] as const;
  return <section className="course-collaboration">
    <header className="course-project-header">
      <div className="course-project-title"><Users/><div><h2>{draft.title} <em>아이디어 기획 중</em></h2><p>함께 만드는 세종 여행 프로젝트 <i/> 참여자 4명 <i/> 시간·동선은 아직 정하지 않아요</p></div></div>
      <button type="button"><UserPlus/> 초대하기</button>
    </header>
    <nav className="course-tabs">
      <button className={tab==='ideas'?'active':''} onClick={()=>setTab('ideas')}><MapPin/> 아이디어 보드</button>
      <button className={tab==='themes'?'active':''} onClick={()=>setTab('themes')}><Sparkles/> 테마와 먹거리</button>
      <button className={tab==='roles'?'active':''} onClick={()=>setTab('roles')}><Users/> 역할 및 멤버</button>
      <button className={tab==='info'?'active':''} onClick={()=>setTab('info')}><Info/> 프로젝트 정보</button>
    </nav>
    {tab==='ideas'?<div className="idea-planning-board">
      <aside className="idea-chat"><h3>프로젝트 채팅</h3><p><b>민주</b> 호수공원 야경은 꼭 가고 싶어요! 🌙</p><p><b>철수</b> 이응다리와 카페도 넣으면 좋겠어요.</p><p><b>복숭아</b> 복숭아 디저트는 필수예요 🍑</p><div><input value={newIdea} onChange={e=>setNewIdea(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addIdea()}} placeholder="새 의견을 입력하세요"/><button onClick={addIdea}><Send/></button></div></aside>
      <main><header><div><h3>장소 아이디어 보드</h3><p>가고 싶은 장소에 투표해 우선순위를 함께 정해요.</p></div><button onClick={addIdea}><Plus/> 장소 추가</button></header><div className="idea-place-grid">{draft.ideas.filter(i=>i.category==='place').sort((a,b)=>b.votes-a.votes).map((idea,index)=><article key={idea.id}><span>{index+1}</span><i>{idea.emoji}</i><b>{idea.name}</b><small>#{index===0?'야경':'사진'} · #{index===2?'카페':'산책'}</small><button onClick={()=>vote(idea.id)}>♥ {idea.votes}</button></article>)}</div><section className="ai-meeting-summary"><Bot/><div><b>AI 회의 도우미</b><p>호수공원 야경 선호가 가장 높고, 카페와 복숭아 디저트 의견도 모였어요. 아직 운영시간과 이동 순서는 계산하지 않았어요.</p></div></section></main>
      <aside className="idea-members"><h3>멤버 및 역할</h3>{draft.roles.map((member,index)=><div key={member.name}><span>{member.name.slice(0,1)}</span><p><b>{member.name}{index===0?' (나)':''}</b><small>{member.role}</small></p></div>)}<section><h4>참여도 현황</h4><p>의견 작성 <i><b style={{width:'80%'}}/></i></p><p>장소 투표 <i><b style={{width:'65%'}}/></i></p><p>아이디어 제안 <i><b style={{width:'55%'}}/></i></p></section></aside>
    </div>:tab==='themes'?<div className="theme-idea-columns">{groups.map(group=><section className={group.tone} key={group.key}><h3>{group.title}</h3>{draft.ideas.filter(i=>i.category===group.key).map(idea=><button key={idea.id} onClick={()=>vote(idea.id)}><span>{idea.emoji} {idea.name}</span><b>♥ {idea.votes}</b></button>)}<button className="add"><Plus/> 아이디어 추가</button></section>)}</div>:tab==='roles'?<CourseSecondaryTab tab="roles" profile={profile}/>:<CourseSecondaryTab tab="info" profile={profile}/>} 
    <footer className="idea-action-footer"><button onClick={()=>{saveTravelProjectDraft(draft);onNotice('임시 여행 프로젝트를 저장했어요.')}}>☁ 임시 저장</button><div><small>다음 단계</small><b>정부청사 AI가 현실 정보로 검증하고 실행 일정으로 완성해요.</b></div><button className="review" onClick={requestReview}>정부청사로 검증 요청 <ChevronRight/></button></footer>
  </section>;
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
  return <article className="project-board-card"><header><span style={{background:project.id.includes('garden')?'#5cae85':project.id.includes('festival')?'#8a6ad2':'#d38a53'}}>{project.thumbnail??'💡'}</span><div><small>{project.placeIds[0]} · 모집 중</small><h3>{project.title}</h3><p>{project.summary}</p></div><strong>{match}%<small>적합도</small></strong></header><div className="project-tags">{project.tags.map(tag=><i key={tag}>#{tag}</i>)}</div><dl><div><Users size={14}/><span><dt>참여 현황</dt><dd>{project.memberIds.length}/{project.maxMembers}명</dd></span></div><div><CalendarDays size={14}/><span><dt>일정</dt><dd>{formatDate(project.startDate)}</dd></span></div><div><Sparkles size={14}/><span><dt>원하는 성향</dt><dd>{project.preferredTraits.slice(0,2).join(' · ')}</dd></span></div></dl><p className="project-reason">추천 이유 · {recommendation?.reasons[0]??`${project.tags.slice(0,2).join('과 ')} 관심사를 프로젝트 활동으로 이어갈 수 있어요.`}</p><footer><button type="button" onClick={onDetail}>상세 보기 <ChevronRight size={13}/></button><button type="button" disabled={sent} onClick={onSend}>{sent?<><Check size={14}/> 팀장 확인 중</>:<><Send size={14}/> 프로필 전달하기</>}</button></footer></article>;
}

function ProjectDetail({project,sent,onSend}:{project:Project;sent:boolean;onSend:()=>void}){
  return <section className="project-detail-panel"><PanelHeader eyebrow="PROJECT DETAIL" icon={project.thumbnail??'💡'} title={project.title} copy={project.summary}/><div className="project-detail-hero"><div><small>대표 장소</small><b><MapPin size={15}/>{project.placeIds.join(' · ')}</b></div><div><small>참여 현황</small><b><Users size={15}/>{project.memberIds.length}/{project.maxMembers}명</b></div><div><small>프로젝트 일정</small><b><CalendarDays size={15}/>{formatDate(project.startDate)}</b></div></div><article><small>프로젝트 목적</small><p>{project.description}</p></article><div className="project-detail-columns"><section><small>활동과 태그</small><div>{[...project.activityTypes,...project.tags].map(item=><span key={item}>#{item}</span>)}</div></section><section><small>팀장이 원하는 참여자</small><div>{project.preferredTraits.map(item=><span key={item}>#{item}</span>)}</div></section></div><footer><p>참가 확정이 아니라 체험 프로필을 팀장에게 먼저 전달합니다.</p><button type="button" disabled={sent} onClick={onSend}>{sent?'프로필 전달 완료 · 팀장 확인 중':'프로필 전달하기'}</button></footer></section>;
}

function ProjectCreationForm({profile,onCreated,onDetail,created}:{profile:UserProfile;onCreated:(project:Project)=>void;onDetail:(project:Project)=>void;created:Project|null}){
  const [title,setTitle]=useState(''),[summary,setSummary]=useState(''),[purpose,setPurpose]=useState(''),[place,setPlace]=useState('국립세종수목원'),[selectedActivities,setSelectedActivities]=useState<string[]>(['사진']),[maxMembers,setMaxMembers]=useState(5),[startDate,setStartDate]=useState(''),[deadline,setDeadline]=useState(''),[selectedTraits,setSelectedTraits]=useState<string[]>(['사진 기록형']),[visibility,setVisibility]=useState<'public'|'private'>('public'),[tags,setTags]=useState<string[]>([]),[suggestedRoles,setSuggestedRoles]=useState<string[]>([]);
  const toggle=(value:string,current:string[],setter:(value:string[])=>void)=>setter(current.includes(value)?current.filter(item=>item!==value):[...current,value]);
  const assist=()=>{const result=suggestProjectCopy(place,purpose);setTitle(result.title);setSummary(result.summary);setTags(result.tags);setSuggestedRoles(result.roles)};
  const submit=(event:FormEvent)=>{event.preventDefault();if(!title.trim()||!summary.trim()||!purpose.trim()||!place)return;const project:Project={id:`project-${Date.now()}`,title:title.trim(),summary:summary.trim(),description:purpose.trim(),placeIds:[place],activityTypes:selectedActivities,tags:tags.length?tags:[...selectedActivities,place],leaderId:profile.nickname,memberIds:[profile.nickname],applicantIds:[],maxMembers,startDate:startDate||undefined,deadline:deadline||undefined,preferredTraits:selectedTraits,status:'recruiting',thumbnail:'💡',createdAt:new Date().toISOString(),visibility};onCreated(project)};
  return <section className="project-create-panel"><PanelHeader eyebrow="PROJECT KIOSK" icon="＋" title="새 프로젝트 만들기" copy="장소와 목적을 입력하면 AI 도우미가 제목, 소개와 태그를 제안합니다."/>
    {created&&<div className="project-created"><Check size={20}/><div><b>{created.title} 등록 완료</b><small>프로젝트 게시판에 ‘모집 중’으로 바로 추가됐어요.</small></div><button type="button" onClick={()=>onDetail(created)}>상세 확인</button></div>}
    <form onSubmit={submit}><div className="creation-grid"><label>프로젝트 이름<input value={title} onChange={event=>setTitle(event.target.value)} placeholder="프로젝트 이름"/></label><label>한 줄 소개<input value={summary} onChange={event=>setSummary(event.target.value)} placeholder="어떤 프로젝트인가요?"/></label><label className="wide">프로젝트 목적<textarea value={purpose} onChange={event=>setPurpose(event.target.value)} placeholder="함께 무엇을 만들거나 기록하고 싶나요?"/></label><label>세종 장소<select value={place} onChange={event=>setPlace(event.target.value)}>{places.map(item=><option key={item}>{item}</option>)}</select></label><label>모집 인원<select value={maxMembers} onChange={event=>setMaxMembers(Number(event.target.value))}>{[2,3,4,5,6,8].map(item=><option value={item} key={item}>{item}명</option>)}</select></label><label>일정<input type="date" value={startDate} onChange={event=>setStartDate(event.target.value)}/></label><label>모집 마감일<input type="date" value={deadline} onChange={event=>setDeadline(event.target.value)}/></label></div>
      <fieldset><legend>활동 유형</legend><div>{activities.map(item=><button type="button" className={selectedActivities.includes(item)?'active':''} onClick={()=>toggle(item,selectedActivities,setSelectedActivities)} key={item}>{item}</button>)}</div></fieldset>
      <fieldset><legend>원하는 팀원 성향</legend><div>{traits.map(item=><button type="button" className={selectedTraits.includes(item)?'active':''} onClick={()=>toggle(item,selectedTraits,setSelectedTraits)} key={item}>{item}</button>)}</div></fieldset>
      <div className="ai-copy-assist"><Bot size={22}/><div><b>AI 프로젝트 작성 도우미</b><p>장소와 목적을 바탕으로 제목·소개·태그·역할을 제안합니다.</p>{tags.length>0&&<span>{tags.map(tag=><i key={tag}>#{tag}</i>)}</span>}{suggestedRoles.length>0&&<small>추천 역할 · {suggestedRoles.join(' · ')}</small>}</div><button type="button" onClick={assist}><Sparkles size={14}/> 자동 작성</button></div>
      <div className="creation-footer"><label><input type="checkbox" checked={visibility==='public'} onChange={event=>setVisibility(event.target.checked?'public':'private')}/> 프로젝트 공개</label><button type="submit"><Plus size={16}/> 프로젝트 생성</button></div>
    </form>
  </section>;
}

function EmptyState({text}:{text:string}){return <div className="project-empty"><Search size={28}/><b>{text}</b><p>오른쪽 키오스크에서 새 프로젝트를 만들 수 있어요.</p></div>}
