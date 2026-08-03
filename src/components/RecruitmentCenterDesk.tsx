import { useEffect,useMemo,useRef,useState,type FormEvent } from 'react';
import { Check,ChevronLeft,History,LoaderCircle,MapPin,Send,Sparkles,UserRound,X } from 'lucide-react';
import type { PlayerState } from '../../shared/socket-events';
import type { ChungnyeongCard,ChungnyeongChatResponse } from '../../shared/chungnyeong';
import type { UserProfile } from '../types';
import {
  createProjectApplication,
  loadProjectApplications,
  loadProjectRoomProjects,
  recommendProjects,
  saveProjectApplications,
  saveProjectRoomProjects,
  type Project,
} from '../services/projectRoomProjects';
import { gameEvents } from '../game/events';
import { inferCampusTopicProfile,recordCampusProfileSignal } from '../services/campusProfileSignals';
import { chatWithChungnyeong,sendChungnyeongProfileRequest } from '../services/chungnyeong';
import './RecruitmentCenterDesk.css';

type DeskMode='chat'|'join';
type SortMode='모집 중'|'인기'|'최신'|'내 관심사';

const GUIDE_ID='recruitment-center-guide-chungnyeong';

const userId=(profile:UserProfile)=>profile.nickname.trim()||'anonymous';

export function RecruitmentCenterDesk({profile,players,onOpenChange,onNotice,onProfile,onTravelProjectRoom,onEditInterests}:{
  profile:UserProfile;
  players:PlayerState[];
  onOpenChange:(open:boolean)=>void;
  onNotice:(message:string)=>void;
  onProfile:(player:PlayerState)=>void;
  onTravelProjectRoom:()=>void;
  onEditInterests:()=>void;
}){
  const [open,setOpen]=useState(false);
  const [mode,setMode]=useState<DeskMode>('chat');
  const [projects,setProjects]=useState<Project[]>(loadProjectRoomProjects);
  const [sort,setSort]=useState<SortMode>('모집 중');
  const [lastApplied,setLastApplied]=useState<Project|null>(null);
  const [pendingApply,setPendingApply]=useState<Project|null>(null);
  const [chatInput,setChatInput]=useState('');
  const [chatBusy,setChatBusy]=useState(false);
  const [chatError,setChatError]=useState('');
  const [profileRequestBusy,setProfileRequestBusy]=useState(false);
  const chatLogRef=useRef<HTMLDivElement>(null);
  const [chatMessages,setChatMessages]=useState<Array<{role:'user'|'assistant';text:string;result?:ChungnyeongChatResponse}>>([
    {role:'assistant',text:'혼자 왔어도 괜찮아요. 무엇을 하고 싶은지 편하게 말해 주세요. 함께할 사람과 모집을 찾아드릴게요.'},
  ]);

  useEffect(()=>{
    const show=()=>{setProjects(loadProjectRoomProjects());setMode('chat');setLastApplied(null);setPendingApply(null);setOpen(true)};
    gameEvents.on('recruitment-guide-open',show);
    return()=>{gameEvents.off('recruitment-guide-open',show)};
  },[]);
  useEffect(()=>onOpenChange(open),[onOpenChange,open]);
  useEffect(()=>{
    if(!open)return;
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();if(mode==='join')setMode('chat');else setOpen(false)}};
    window.addEventListener('keydown',escape);
    return()=>window.removeEventListener('keydown',escape);
  },[mode,open]);
  useEffect(()=>{if(open&&mode==='chat')chatLogRef.current?.scrollTo({top:chatLogRef.current.scrollHeight,behavior:'smooth'})},[chatBusy,chatMessages,mode,open]);

  const recommendations=useMemo(()=>recommendProjects(projects,profile),[profile,projects]);
  const applicationStatus=useMemo(()=>{
    const mine=loadProjectApplications().filter(item=>item.applicantId===userId(profile));
    return {
      pending:mine.filter(item=>item.status==='pending').length,
      accepted:mine.filter(item=>item.status==='accepted').length,
      rejected:mine.filter(item=>item.status==='rejected').length,
    };
  },[lastApplied,profile]);
  const sortedProjects=useMemo(()=>{
    const recruiting=projects.filter(project=>project.status==='recruiting');
    if(sort==='인기')return [...recruiting].sort((a,b)=>(b.memberIds.length+b.applicantIds.length)-(a.memberIds.length+a.applicantIds.length));
    if(sort==='최신')return [...recruiting].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
    if(sort==='내 관심사'){
      const recommendedIds=recommendations.map(item=>item.projectId);
      return [...recruiting].sort((a,b)=>recommendedIds.indexOf(a.id)-recommendedIds.indexOf(b.id));
    }
    return recruiting;
  },[projects,recommendations,sort]);

  const close=()=>{setOpen(false);setMode('chat');setLastApplied(null);setPendingApply(null)};
  const apply=async(project:Project)=>{
    if(profileRequestBusy)return;
    setProfileRequestBusy(true);
    try{await sendChungnyeongProfileRequest(project.id,`${profile.nickname}님의 공개 체험 프로필을 전달합니다.`)}
    catch(error){onNotice(error instanceof Error?error.message:'프로필을 전달하지 못했어요.');setProfileRequestBusy(false);return}
    const applications=loadProjectApplications();
    const nextApplications=createProjectApplication(project,profile,`${profile.nickname}님의 체험 프로필을 모집센터에서 전달합니다.`,applications);
    saveProjectApplications(nextApplications);
    const nextProjects=projects.map(item=>item.id===project.id?{...item,applicantIds:[...new Set([...item.applicantIds,userId(profile)])]}:item);
    setProjects(nextProjects);saveProjectRoomProjects(nextProjects);setLastApplied(project);setPendingApply(null);
    const topic=inferCampusTopicProfile(project.title,project.summary,...project.tags);recordCampusProfileSignal(profile.nickname,{mapId:'recruitment-center',zone:'모집센터',action:'apply-project',subject:project.id,title:'프로젝트 참가 신청',note:`${project.title}에 내 프로필을 전달했어요`,point:10,keywords:['적극적 참여','프로젝트 동행',...topic.keywords],axes:{...topic.axes,relation:8,explore:2}});
    onNotice('확인한 내 프로필이 프로젝트 담당자에게 전달됐어요.');
    setProfileRequestBusy(false);
  };
  const applied=(project:Project)=>project.applicantIds.includes(userId(profile));
  const askChat=async(rawMessage:string)=>{
    const message=rawMessage.trim();if(!message||chatBusy)return;
    if(/관심사|프로필/.test(message)&&/수정|변경/.test(message)){close();onEditInterests();return}
    setChatInput('');setChatError('');setChatMessages(current=>[...current,{role:'user',text:message}]);setChatBusy(true);
    try{const result=await chatWithChungnyeong(message);setChatMessages(current=>[...current,{role:'assistant',text:result.message,result}])}
    catch(error){setChatError(error instanceof Error?error.message:'충녕이와 연결하지 못했어요.')}
    finally{setChatBusy(false)}
  };
  const submitChat=(event:FormEvent)=>{event.preventDefault();void askChat(chatInput)};
  const useChatCard=(card:ChungnyeongCard,action:ChungnyeongCard['actions'][number])=>{
    if(action==='TRAVEL'){close();onTravelProjectRoom();return}
    if(card.type==='recruitment'){
      const project=projects.find(item=>item.id===card.id);
      if(action==='PROFILE_REQUEST'&&project){setPendingApply(project);return}
      setMode('join');return;
    }
    const player=players.find(item=>item.id===card.id||item.nickname===card.title);
    if(action==='PROFILE'&&player){onProfile(player);return}
    onNotice(action==='CHAT_REQUEST'?`${card.title}님에게 대화를 신청하기 전 공개 프로필을 확인해 주세요.`:`${card.title}의 공개 정보만 확인할 수 있어요.`);
  };

  if(!open)return null;
  return <div className="recruitment-desk-overlay" role="dialog" aria-modal={mode!=='chat'} aria-label="모집센터 안내 데스크">
    <section className={`recruitment-desk-panel ${mode==='chat'?'is-chat':'is-kiosk'}`}>
      {mode==='chat'?<>
        <div className="chungnyeong-chat-title">충녕이 AI 리크루터 <span>– 대화 화면</span></div>
        <header className="chungnyeong-chat-head">
          <span className="chungnyeong-profile-avatar">🤴<i/></span>
          <div><strong>충녕이</strong><p><i/> AI 리크루터 · 지금 대화 가능</p></div>
          <button type="button" className="chungnyeong-history-button" onClick={()=>onNotice('이 대화창에서 나눈 최근 대화를 확인하고 있어요.')}><History/> 대화 기록</button>
          <button type="button" className="chungnyeong-window-action" onClick={close} aria-label="대화 종료"><X/></button>
        </header>
        <main className="chungnyeong-chat-shell">
          <section className="chungnyeong-chat">
            <div className="chungnyeong-chat-log" ref={chatLogRef}>{chatMessages.map((entry,index)=><article className={`${entry.role}${entry.result?.cards.length?' has-results':''}`} key={`${entry.role}-${index}`}>
              {entry.role==='assistant'&&<span className="chungnyeong-bubble-avatar">🤴</span>}
              <div className="chungnyeong-message-body"><p>{entry.text}</p>
                {index===0&&<nav className="chungnyeong-starter-chips" aria-label="추천 질문"><button type="button" onClick={()=>void askChat('사진 좋아하는 사람 찾아줘')}>✨ 사진 좋아하는 사람</button><button type="button" onClick={()=>void askChat('자연 탐방 같이 갈 사람 찾아줘')}>🌳 자연 탐방 같이 갈 사람</button><button type="button" onClick={()=>void askChat('축제 같이 갈 사람 찾아줘')}>🎉 축제 같이 갈 사람</button><button type="button" onClick={()=>void askChat('AI 스터디 팀원 찾아줘')}>🤖 AI 스터디 팀원 찾기</button></nav>}
                {entry.result?.cards.length?<section className="chungnyeong-results"><header><b>{entry.result.intent==='FIND_PERSON'?'함께하기 좋은 사람':'현재 모집중'}</b><button type="button" onClick={()=>void askChat(entry.result?.intent==='FIND_PERSON'?'다른 사람도 보여줘':'다른 모집도 보여줘')}>더 보기 ›</button></header><div className="chungnyeong-result-grid">{entry.result.cards.map(card=><div className="chungnyeong-result-card" key={card.id}>
                  <div className="chungnyeong-card-person"><span>{card.title.slice(0,1)}</span><div><strong>{card.title}</strong><small><i/> {card.type==='person'?'온라인':'모집 중'}</small></div></div>
                  <aside>{card.tags.map(tag=><i key={tag}>{tag}</i>)}</aside>
                  <p>{card.description}</p>{card.matchScore!==null&&<div className="chungnyeong-match"><small>관심사 일치도</small><b>{card.matchScore}%</b></div>}
                  <footer>{card.actions.map(action=><button type="button" key={action} onClick={()=>useChatCard(card,action)}>{chatActionLabel(action)}</button>)}</footer>
                </div>)}</div></section>:null}
                {entry.result?.intent==='CHECK_APPLICATION'&&<div className="chungnyeong-status-card"><header><span>📌</span><div><small>내 신청 현황</small><b>신청한 활동</b></div></header><dl><div><dt>승인 대기</dt><dd>{applicationStatus.pending}</dd></div><div><dt>참여중</dt><dd>{applicationStatus.accepted}</dd></div><div><dt>거절됨</dt><dd>{applicationStatus.rejected}</dd></div></dl></div>}
                {entry.result&&<nav>{entry.result.suggestedReplies.map(reply=><button type="button" key={reply} onClick={()=>setChatInput(reply)}>{reply}</button>)}</nav>}
              </div>
              {entry.role==='user'&&<span className="chungnyeong-user-avatar">{profile.nickname.trim().slice(0,1)||'나'}</span>}
            </article>)}{chatBusy&&<article className="assistant loading"><span className="chungnyeong-bubble-avatar">🤴</span><div className="chungnyeong-message-body"><p><LoaderCircle/> 답변을 생각하고 있어요</p></div></article>}
              <section className="chungnyeong-quick-help"><strong>충녕이가 도와드릴 수 있어요</strong><div>
                <button type="button" disabled={chatBusy} onClick={()=>void askChat('자연 좋아하는 사람 찾고 싶어요')}><UserRound/><span><b>같이 할 사람 찾기</b><small>관심사가 맞는 사람 추천</small></span></button>
                <button type="button" disabled={chatBusy} onClick={()=>void askChat('축제 같이 갈 모집 있어?')}><Sparkles/><span><b>모집 찾기</b><small>현재 모집 중인 활동</small></span></button>
                <button type="button" disabled={chatBusy} onClick={()=>void askChat('내 신청 현황 보여줘')}><Check/><span><b>내 신청 현황</b><small>승인 대기 · 참여중 · 거절됨</small></span></button>
                <button type="button" onClick={()=>{close();onEditInterests()}}><span className="chungnyeong-quick-icon">✎</span><span><b>관심사 수정</b><small>{profile.interests.slice(0,3).join(' · ')||'프로필 수정'}</small></span></button>
                <button type="button" onClick={()=>{close();onTravelProjectRoom()}}><MapPin/><span><b>프로젝트실 안내</b><small>프로젝트 만들기 · 팀 활동</small></span></button>
              </div></section>
            </div>
            {chatError&&<p className="chungnyeong-chat-error">{chatError}</p>}
            <div className="chungnyeong-chat-composer"><form onSubmit={submitChat}><input autoFocus value={chatInput} onChange={event=>setChatInput(event.target.value)} maxLength={500} placeholder="충녕이에게 편하게 이야기해 보세요"/><button type="submit" disabled={chatBusy||!chatInput.trim()} aria-label="충녕이에게 질문 보내기"><Send/></button></form><small>공개된 정보만 확인하며, 민감한 개인정보는 조회하지 않아요.</small></div>
          </section>
        </main>
        {pendingApply&&<aside className="recruitment-application-result is-confirm"><UserRound/><div><small>프로필 전달 확인</small><b>{pendingApply.title}에 내 공개 프로필을 전달할까요?</b><p>담당자에게는 닉네임과 공개한 관심사·활동 기록만 전달됩니다.</p></div><button type="button" className="cancel" disabled={profileRequestBusy} onClick={()=>setPendingApply(null)}>취소</button><button type="button" disabled={profileRequestBusy} onClick={()=>void apply(pendingApply)}>{profileRequestBusy?'전달 중…':'확인하고 전달'}</button></aside>}
        {lastApplied&&!pendingApply&&<aside className="recruitment-application-result"><Check/><div><small>참가 신청 완료</small><b>확인한 공개 프로필 전달 → 담당자 승인 대기</b><p>승인되면 프로젝트실에서 팀 활동을 이어갈 수 있어요.</p></div><button type="button" onClick={()=>{close();onTravelProjectRoom()}}>프로젝트실로 이동</button></aside>}
      </>:<>
        <button type="button" className="recruitment-desk-close" onClick={close} aria-label="모집센터 안내 닫기"><X/></button>
        <header className="recruitment-kiosk-head"><button type="button" onClick={()=>setMode('chat')}><ChevronLeft/> 충녕이와 대화로 돌아가기</button><div><small>RECRUITMENT CONNECTION</small><b>충녕이가 찾아본 모집 활동</b></div><i>ONLINE</i></header>
        <main className="recruitment-kiosk-body">
          {mode==='join'&&<section><KioskTitle icon="📌" title="프로젝트 참가하기" copy="정렬해서 살펴보고 확인 후 내 프로필로 참가를 신청하세요."/><nav className="recruitment-sort-tabs">{(['모집 중','인기','최신','내 관심사'] as SortMode[]).map(item=><button type="button" className={sort===item?'active':''} onClick={()=>setSort(item)} key={item}>{item==='인기'?'★★★★★ 인기':item}</button>)}</nav><ProjectList projects={sortedProjects} recommendations={recommendations} applied={applied} onApply={setPendingApply}/></section>}
        </main>
        {pendingApply&&<aside className="recruitment-application-result is-confirm"><UserRound/><div><small>프로필 전달 확인</small><b>{pendingApply.title}에 내 공개 프로필을 전달할까요?</b><p>담당자에게는 닉네임과 공개한 관심사·활동 기록만 전달됩니다.</p></div><button type="button" className="cancel" disabled={profileRequestBusy} onClick={()=>setPendingApply(null)}>취소</button><button type="button" disabled={profileRequestBusy} onClick={()=>void apply(pendingApply)}>{profileRequestBusy?'전달 중…':'확인하고 전달'}</button></aside>}
        {lastApplied&&!pendingApply&&<aside className="recruitment-application-result"><Check/><div><small>참가 신청 완료</small><b>확인한 공개 프로필 전달 → 담당자 승인 대기</b><p>승인되면 프로젝트실에서 팀 활동을 이어갈 수 있어요.</p></div><button type="button" onClick={()=>{close();onTravelProjectRoom()}}>프로젝트실로 이동</button></aside>}
        <footer className="recruitment-flow"><span className="done">충녕이 안내</span><i>→</i><span className="done">키오스크 실행</span><i>→</i><span className={lastApplied?'done':''}>프로필 전달</span><i>→</i><span>참가 승인</span><i>→</i><span>프로젝트실</span></footer>
      </>}
    </section>
  </div>;
}

function KioskTitle({icon,title,copy}:{icon:string;title:string;copy:string}){return <header className="recruitment-kiosk-title"><span>{icon}</span><div><small>CONNECTION SERVICE</small><h2>{title}</h2><p>{copy}</p></div></header>}

function chatActionLabel(action:ChungnyeongCard['actions'][number]){
  return {PROFILE:'프로필 보기',CHAT_REQUEST:'대화 신청',DETAIL:'상세 보기',PROFILE_REQUEST:'참가 신청',TRAVEL:'이동하기'}[action];
}

function ProjectList({projects,recommendations,applied,onApply}:{projects:Project[];recommendations:ReturnType<typeof recommendProjects>;applied:(project:Project)=>boolean;onApply:(project:Project)=>void}){
  return <div className="recruitment-project-list">{projects.map(project=>{const recommendation=recommendations.find(item=>item.projectId===project.id);return <article key={project.id}><span>{project.thumbnail??'💡'}</span><div><small>{recommendation?`${recommendation.matchScore}% AI 적합도`:`${project.memberIds.length}/${project.maxMembers}명 참여 중`}</small><h3>{project.title}</h3><p>{recommendation?.reasons[0]??project.summary}</p><aside>{project.tags.slice(0,4).map(tag=><i key={tag}>#{tag}</i>)}</aside></div><button type="button" disabled={applied(project)} onClick={()=>onApply(project)}>{applied(project)?'승인 대기 중':'내 프로필로 참가 신청'}</button></article>})}</div>;
}

export { GUIDE_ID as RECRUITMENT_GUIDE_ID };
