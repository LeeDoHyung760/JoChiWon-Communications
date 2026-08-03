import { Fragment,useEffect,useMemo,useRef,useState,type FormEvent } from 'react';
import { Check,ChevronLeft,ChevronRight,ClipboardList,History,LoaderCircle,Plus,Search,Send,Settings,UserRound,X } from 'lucide-react';
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
import { API_BASE_URL } from '../config/api';
import './RecruitmentCenterDesk.css';

type DeskMode='chat'|'join';
type SortMode='모집 중'|'인기'|'최신'|'내 관심사';
type RecruitmentDraft={title:string;introduction:string;tags:string[]};
type RecruitmentForm={title:string;introduction:string;tags:string[];capacity:string;date:string;place:string};
type ChatEntry={role:'user'|'assistant';text:string;result?:ChungnyeongChatResponse;draft?:RecruitmentDraft;management?:boolean};
type CommunityRecruitmentPost={id:string;author:string;title:string;content:string;category:string;createdAt:string};

const GUIDE_ID='recruitment-center-guide-chungnyeong';
const INITIAL_CHAT_MESSAGE='안녕하세요! 👋 저는 나의 관심사와 활동 기록을 바탕으로 돕는 개인 AI 충녕이예요. 함께할 사람을 찾거나, 모집글을 만들고, 신청 상태를 확인할 수 있어요.';

const userId=(profile:UserProfile)=>profile.nickname.trim()||'anonymous';
const recruitmentPostToProject=(post:CommunityRecruitmentPost):Project|null=>{
  if(post.category!=='모임·행사'||!post.content.includes('참가 신청 시 모집자에게 프로필 카드가 전달됩니다.'))return null;
  const line=(label:string)=>post.content.split('\n').find(item=>item.startsWith(`${label}:`))?.slice(label.length+1).trim()??'';
  const description=post.content.split('\n')[0]?.trim()||post.title;
  const tags=line('관심 태그').split(',').map(item=>item.trim()).filter(Boolean);
  const capacity=Math.min(100,Math.max(2,Number.parseInt(line('모집 인원'),10)||2));
  const schedule=line('모임 일정');
  return {id:`recruitment-${post.id}`,title:post.title,summary:description.slice(0,90),description,placeIds:[line('모이는 장소')||'장소 협의'],activityTypes:tags.slice(0,3),tags:tags.length?tags:['함께하기'],leaderId:post.author.trim()||'익명',memberIds:[post.author.trim()||'익명'],applicantIds:[],maxMembers:capacity,startDate:schedule&&schedule!=='날짜 협의'?schedule:undefined,preferredTraits:[],status:'recruiting',thumbnail:'📌',createdAt:new Date(post.createdAt).toISOString(),visibility:'public'};
};
const syncCommunityRecruitments=async(profile:UserProfile,current:Project[])=>{
  const response=await fetch(`${API_BASE_URL}/community`);if(!response.ok)return current;
  const posts=await response.json() as CommunityRecruitmentPost[],known=new Set(current.map(project=>project.id));
  const recovered=posts.filter(post=>post.author===profile.nickname).map(recruitmentPostToProject).filter((project):project is Project=>project!==null&&!known.has(project.id));
  if(!recovered.length)return current;
  const next=[...recovered,...current];saveProjectRoomProjects(next);return next;
};
const createRecruitmentDraft=(message:string,profile:UserProfile):RecruitmentDraft=>{
  const text=message.toLocaleLowerCase('ko-KR');
  if(/축제|야간/.test(text))return {title:'세종 야간축제 탐방 같이 가실 분',introduction:'세종의 야간축제를 함께 둘러보며 공연과 야경을 즐길 분을 찾습니다. 편하게 이야기하고 사진도 남겨요.',tags:['축제','야간탐방','사진']};
  if(/사진|출사|수목원/.test(text))return {title:'수목원 사진 출사 함께하실 분',introduction:'수목원을 천천히 걸으며 계절 식물과 풍경을 사진으로 기록할 분을 모집합니다. 촬영 경험과 관계없이 환영해요.',tags:['사진','수목원','자연']};
  if(/스터디|공부|코딩|ai/.test(text))return {title:'함께 성장하는 AI 코딩 스터디',introduction:'AI와 코딩에 관심 있는 분들과 사례를 나누고 직접 실습하는 스터디를 시작합니다. 초보자도 편하게 참여할 수 있어요.',tags:['AI','코딩','스터디']};
  const interests=profile.interests.slice(0,2);
  return {title:`${interests[0]??'새로운 활동'} 함께하실 분`,introduction:`${profile.nickname}님과 관심사가 비슷한 분들이 편하게 만나 함께 경험을 만들어 가는 모임입니다.`,tags:interests.length?interests:['함께하기','세종','모임']};
};
const localChatResponse=(message:string,players:PlayerState[],projects:Project[],profile:UserProfile):ChungnyeongChatResponse=>{
  const text=message.toLocaleLowerCase('ko-KR');
  if(/만들|생성|프로젝트실/.test(text))return {message:'프로젝트 생성은 프로젝트실에서 진행됩니다.',intent:'GUIDE_SPACE',cards:[{type:'space',id:'project-room',title:'프로젝트실',description:'팀을 만들고 역할과 일정을 정하는 공간이에요.',matchScore:null,tags:['프로젝트 생성','팀 활동'],actions:['TRAVEL']}],suggestedReplies:['프로젝트실로 안내해줘'],source:'rules'};
  if(/신청|승인|상태|현황/.test(text))return {message:'저장된 신청 내역을 기준으로 현재 상태를 확인했어요.',intent:'CHECK_APPLICATION',cards:[],suggestedReplies:['모집 중인 활동 보여줘','함께할 사람 찾아줘'],source:'rules'};
  if(/사람|친구|팀원|함께할/.test(text)){
    const words=['사진','자연','수목원','축제','AI','카페','여행','공연'].filter(word=>text.includes(word.toLocaleLowerCase('ko-KR')));
    const ranked=[...players].sort((a,b)=>{
      const score=(player:PlayerState)=>(player.matchProfile?.interests??[]).filter(interest=>[...words,...profile.interests].some(word=>interest.includes(word)||word.includes(interest))).length;
      return score(b)-score(a);
    }).slice(0,3);
    return {message:ranked.length?'현재 접속 중인 공개 프로필에서 함께하기 좋은 분들을 찾았어요.':'현재 공개 프로필로 대화 가능한 사용자가 없어요. 잠시 후 다시 찾아봐 주세요.',intent:'FIND_PERSON',cards:ranked.map((player,index)=>{const interests=player.matchProfile?.interests??[];const shared=interests.filter(interest=>[...words,...profile.interests].some(word=>interest.includes(word)||word.includes(interest)));return {type:'person',id:player.id,title:player.nickname,description:`현재 같은 공간에서 활동 중 · ${player.matchProfile?.chatEnabled===false?'대화 쉬는 중':'대화 신청 가능'}`,matchScore:Math.min(95,78+shared.length*5-index*2),tags:(shared.length?shared:interests).slice(0,3),actions:player.matchProfile?.chatEnabled===false?['PROFILE']:['PROFILE','CHAT_REQUEST']}}),suggestedReplies:['다른 사람 찾아줘','모집 활동도 보여줘'],source:'rules'};
  }
  const openProjects=projects.filter(project=>project.status==='recruiting'&&project.leaderId!==userId(profile)).slice(0,3);
  return {message:'저장된 공개 모집에서 지금 참여할 수 있는 활동을 찾았어요.',intent:'FIND_RECRUITMENT',cards:openProjects.map(project=>({type:'recruitment',id:project.id,title:project.title,description:`${project.memberIds.length}/${project.maxMembers}명 참여 중 · ${project.summary}`,matchScore:null,tags:project.tags.slice(0,3),actions:['DETAIL','PROFILE_REQUEST']})),suggestedReplies:['내 관심사에 맞는 모집 보여줘','함께할 사람 찾아줘'],source:'rules'};
};

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
  const [recruitmentComposer,setRecruitmentComposer]=useState(false);
  const [recruitmentSaving,setRecruitmentSaving]=useState(false);
  const [recruitmentForm,setRecruitmentForm]=useState<RecruitmentForm>({title:'',introduction:'',tags:[],capacity:'5',date:'',place:''});
  const [recruitmentTagInput,setRecruitmentTagInput]=useState('');
  const chatLogRef=useRef<HTMLDivElement>(null);
  const [chatMessages,setChatMessages]=useState<ChatEntry[]>([
    {role:'assistant',text:INITIAL_CHAT_MESSAGE},
  ]);

  useEffect(()=>{
    const show=()=>{const stored=loadProjectRoomProjects();setProjects(stored);void syncCommunityRecruitments(profile,stored).then(setProjects).catch(error=>console.warn('[recruitment sync failed]',error instanceof Error?error.message:'unknown'));setMode('chat');setLastApplied(null);setPendingApply(null);setRecruitmentComposer(false);setChatInput('');setChatError('');setChatMessages([{role:'assistant',text:INITIAL_CHAT_MESSAGE}]);setOpen(true)};
    gameEvents.on('recruitment-guide-open',show);
    return()=>{gameEvents.off('recruitment-guide-open',show)};
  },[profile.nickname]);
  useEffect(()=>onOpenChange(open),[onOpenChange,open]);
  useEffect(()=>{
    if(!open)return;
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();if(recruitmentComposer)setRecruitmentComposer(false);else if(mode==='join')setMode('chat');else setOpen(false)}};
    window.addEventListener('keydown',escape);
    return()=>window.removeEventListener('keydown',escape);
  },[mode,open,recruitmentComposer]);
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
  const openRecruitmentComposer=(draft?:RecruitmentDraft)=>{setRecruitmentForm({title:draft?.title??'',introduction:draft?.introduction??'',tags:draft?.tags??[],capacity:'5',date:'',place:''});setRecruitmentTagInput('');setRecruitmentComposer(true)};
  const addRecruitmentTag=()=>{const tag=recruitmentTagInput.trim().replace(/^#/,'');if(!tag)return;setRecruitmentForm(current=>current.tags.includes(tag)?current:{...current,tags:[...current.tags,tag].slice(0,8)});setRecruitmentTagInput('')};
  const removeRecruitmentTag=(tag:string)=>setRecruitmentForm(current=>({...current,tags:current.tags.filter(item=>item!==tag)}));
  const submitRecruitment=async(event:FormEvent)=>{
    event.preventDefault();if(recruitmentSaving||!recruitmentForm.title.trim()||!recruitmentForm.introduction.trim())return;
    setRecruitmentSaving(true);
    const tags=recruitmentForm.tags,capacity=Math.min(100,Math.max(2,Number.parseInt(recruitmentForm.capacity,10)||2)),content=`${recruitmentForm.introduction.trim()}\n관심 태그: ${tags.join(', ')||'함께하기'}\n모집 인원: ${capacity}명\n모임 일정: ${recruitmentForm.date||'날짜 협의'}\n모이는 장소: ${recruitmentForm.place||'장소 협의'}\n참가 신청 시 모집자에게 프로필 카드가 전달됩니다.`;
    try{
      const response=await fetch(`${API_BASE_URL}/community`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({author:profile.nickname,title:recruitmentForm.title.trim(),content,category:'모임·행사'})});
      if(!response.ok){const body=await response.json().catch(()=>({})) as {message?:string;error?:{message?:string}};throw new Error(body.error?.message??body.message??'모집글을 등록하지 못했어요.')}
      const post=await response.json() as CommunityRecruitmentPost,created=recruitmentPostToProject(post);
      if(created)setProjects(current=>{const next=[created,...current.filter(project=>project.id!==created.id)];saveProjectRoomProjects(next);return next});
      setRecruitmentComposer(false);setChatMessages(current=>[...current,{role:'assistant',text:`“${recruitmentForm.title.trim()}” 모집글을 등록했어요. 이제 신청자가 오면 내 모집 관리에서 확인할 수 있어요.`,management:true}]);onNotice('새 모집글을 등록했어요.');
    }catch(error){onNotice(error instanceof Error?error.message:'모집글을 등록하지 못했어요.')}
    finally{setRecruitmentSaving(false)}
  };
  const apply=async(project:Project)=>{
    if(profileRequestBusy)return;
    if(project.leaderId===userId(profile)){setPendingApply(null);onNotice('내가 만든 모집에는 참가 신청할 수 없어요.');return}
    setProfileRequestBusy(true);
    const applications=loadProjectApplications();
    const nextApplications=createProjectApplication(project,profile,`${profile.nickname}님의 체험 프로필을 모집센터에서 전달합니다.`,applications);
    saveProjectApplications(nextApplications);
    const nextProjects=projects.map(item=>item.id===project.id?{...item,applicantIds:[...new Set([...item.applicantIds,userId(profile)])]}:item);
    setProjects(nextProjects);saveProjectRoomProjects(nextProjects);setLastApplied(project);setPendingApply(null);
    const topic=inferCampusTopicProfile(project.title,project.summary,...project.tags);recordCampusProfileSignal(profile.nickname,{mapId:'recruitment-center',zone:'모집센터',action:'apply-project',subject:project.id,title:'프로젝트 참가 신청',note:`${project.title}에 내 프로필을 전달했어요`,point:10,keywords:['적극적 참여','프로젝트 동행',...topic.keywords],axes:{...topic.axes,relation:8,explore:2}});
    onNotice('확인한 내 프로필이 프로젝트 담당자에게 전달됐어요.');
    setProfileRequestBusy(false);
    void sendChungnyeongProfileRequest(project.id,`${profile.nickname}님의 공개 체험 프로필을 전달합니다.`).catch(error=>console.warn('[profile request remote sync failed]',error instanceof Error?error.message:'unknown'));
  };
  const applied=(project:Project)=>project.applicantIds.includes(userId(profile));
  const askChat=async(rawMessage:string)=>{
    const message=rawMessage.trim();if(!message||chatBusy)return;
    if(/관심사|프로필/.test(message)&&/수정|변경/.test(message)){close();onEditInterests();return}
    setChatInput('');setChatError('');setChatMessages(current=>[...current,{role:'user',text:message}]);
    if(/내 모집|만든 모집|신청자/.test(message)&&/관리|보여|승인/.test(message)){const synced=await syncCommunityRecruitments(profile,projects).catch(()=>projects);setProjects(synced);setChatMessages(current=>[...current,{role:'assistant',text:'내가 만든 모집과 도착한 신청을 확인했어요. 공개한 프로필 정보만 사용합니다.',management:true}]);return}
    if(/모집하고|모집글|새 모집|스터디 만들|모임 만들/.test(message)){const draft=createRecruitmentDraft(message,profile);setChatMessages(current=>[...current,{role:'assistant',text:'하고 싶은 활동을 이해했어요. 내 관심사를 반영해 모집글 초안을 만들었습니다.',draft}]);return}
    setChatBusy(true);
    try{const result=await chatWithChungnyeong(message);setChatMessages(current=>[...current,{role:'assistant',text:result.message,result}])}
    catch(error){console.warn('[chungnyeong chat fallback]',error instanceof Error?error.message:'unknown');const result=localChatResponse(message,players,projects,profile);setChatMessages(current=>[...current,{role:'assistant',text:result.message,result}]);setChatError('')}
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
            <div className="chungnyeong-chat-log" ref={chatLogRef}>{chatMessages.map((entry,index)=><Fragment key={`${entry.role}-${index}`}><article className={`${entry.role}${entry.result?.cards.length?' has-results':''}`}>
              {entry.role==='assistant'&&<span className="chungnyeong-bubble-avatar">🤴</span>}
              <div className="chungnyeong-message-body"><p>{entry.text}</p>
                {entry.result?.cards.length?<ChatResultCarousel response={entry.result} projects={projects} currentUserId={userId(profile)} onAction={useChatCard}/>:null}
                {entry.result?.intent==='CHECK_APPLICATION'&&<div className="chungnyeong-status-card"><header><span>📌</span><div><small>내 신청 현황</small><b>신청한 활동</b></div></header><dl><div><dt>승인 대기</dt><dd>{applicationStatus.pending}</dd></div><div><dt>참여중</dt><dd>{applicationStatus.accepted}</dd></div><div><dt>거절됨</dt><dd>{applicationStatus.rejected}</dd></div></dl></div>}
                {entry.draft&&<div className="chungnyeong-draft-card"><header><span>✨</span><div><small>AI 모집글 초안</small><b>충녕이가 작성했어요</b></div></header><label>추천 제목<strong>{entry.draft.title}</strong></label><label>소개글<p>{entry.draft.introduction}</p></label><div className="chungnyeong-draft-tags"><small>추천 태그</small><div>{entry.draft.tags.map(tag=><i key={tag}>#{tag}</i>)}</div></div><footer><button type="button" onClick={()=>void askChat(`${entry.draft?.title} 모집글을 다르게 다시 작성해줘`)}>다시 작성</button><button type="button" onClick={()=>openRecruitmentComposer(entry.draft)}>이 초안으로 작성</button></footer></div>}
                {entry.management&&<ManagementCard
                  projects={projects}
                  profile={profile}
                  onNotice={onNotice}
                  onProjectsChange={setProjects}
                />}
                {entry.result&&<nav>{entry.result.suggestedReplies.map(reply=><button type="button" key={reply} onClick={()=>setChatInput(reply)}>{reply}</button>)}</nav>}
              </div>
              {entry.role==='user'&&<span className="chungnyeong-user-avatar">{profile.nickname.trim().slice(0,1)||'나'}</span>}
            </article>{index===0&&<section className="chungnyeong-quick-help"><div>
                <button type="button" disabled={chatBusy} onClick={()=>void askChat('현재 참여할 수 있는 모집을 찾아줘')}><Search/><span><b>참여할 모집 찾기</b><small>모집 중인 활동 확인하기</small></span></button>
                <button type="button" disabled={chatBusy} onClick={()=>openRecruitmentComposer()}><Plus/><span><b>새 모집 시작하기</b><small>모집글 바로 작성하기</small></span></button>
                <button type="button" disabled={chatBusy} onClick={()=>void askChat('내 신청 현황 보여줘')}><ClipboardList/><span><b>내 신청 현황 보기</b><small>신청한 모집 상태 확인하기</small></span></button>
                <button type="button" disabled={chatBusy} onClick={()=>void askChat('내가 만든 모집을 관리하고 싶어요')}><Settings/><span><b>내 모집 관리하기</b><small>내가 만든 모집 관리하기</small></span></button>
              </div></section>}</Fragment>)}{chatBusy&&<article className="assistant loading"><span className="chungnyeong-bubble-avatar">🤴</span><div className="chungnyeong-message-body"><p><LoaderCircle/> 답변을 생각하고 있어요</p></div></article>}
            </div>
            {chatError&&<p className="chungnyeong-chat-error">{chatError}</p>}
            <div className="chungnyeong-chat-composer"><form onSubmit={submitChat}><input autoFocus value={chatInput} onChange={event=>setChatInput(event.target.value)} maxLength={500} placeholder="충녕이에게 편하게 이야기해 보세요"/><button type="submit" disabled={chatBusy||!chatInput.trim()} aria-label="충녕이에게 질문 보내기"><Send/></button></form><small>공개된 정보만 확인하며, 민감한 개인정보는 조회하지 않아요.</small></div>
          </section>
        </main>
        {pendingApply&&<aside className="recruitment-application-result is-confirm"><UserRound/><div><small>프로필 전달 확인</small><b>{pendingApply.title}에 내 공개 프로필을 전달할까요?</b><p>담당자에게는 닉네임과 공개한 관심사·활동 기록만 전달됩니다.</p></div><button type="button" className="cancel" disabled={profileRequestBusy} onClick={()=>setPendingApply(null)}>취소</button><button type="button" disabled={profileRequestBusy} onClick={()=>void apply(pendingApply)}>{profileRequestBusy?'전달 중…':'확인하고 전달'}</button></aside>}
        {lastApplied&&!pendingApply&&<aside className="recruitment-application-result"><Check/><div><small>참가 신청 완료</small><b>확인한 공개 프로필 전달 → 담당자 승인 대기</b><p>승인되면 프로젝트실에서 팀 활동을 이어갈 수 있어요.</p></div><button type="button" onClick={()=>{close();onTravelProjectRoom()}}>프로젝트실로 이동</button></aside>}
        {recruitmentComposer&&<div className="chungnyeong-recruitment-composer" role="dialog" aria-modal="true" aria-label="새 모집글 작성"><form onSubmit={submitRecruitment}><header><div><small>NEW RECRUITMENT</small><h3>새 모집글 작성</h3><p>함께하고 싶은 활동을 직접 작성해 주세요. 모든 내용은 등록 전까지 자유롭게 수정할 수 있어요.</p></div><button type="button" onClick={()=>setRecruitmentComposer(false)} aria-label="모집글 작성 닫기"><X/></button></header><label className="wide">모집 제목<input autoFocus value={recruitmentForm.title} onChange={event=>setRecruitmentForm(current=>({...current,title:event.target.value}))} maxLength={80} placeholder="어떤 사람을 모집하고 싶은지 제목을 작성해 주세요" required/></label><label className="wide">소개글<textarea value={recruitmentForm.introduction} onChange={event=>setRecruitmentForm(current=>({...current,introduction:event.target.value}))} maxLength={500} placeholder="함께할 활동과 원하는 분위기 등을 자유롭게 소개해 주세요" required/></label><label>추천 태그<div className="chungnyeong-tag-editor"><div className="chungnyeong-tag-list">{recruitmentForm.tags.map(tag=><button type="button" key={tag} onClick={()=>removeRecruitmentTag(tag)} title="태그 삭제">#{tag}<X/></button>)}</div><div className="chungnyeong-tag-input"><input value={recruitmentTagInput} onChange={event=>setRecruitmentTagInput(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();addRecruitmentTag()}}} maxLength={20} placeholder="태그 단어 입력"/><button type="button" onClick={addRecruitmentTag} disabled={!recruitmentTagInput.trim()} aria-label="태그 추가"><Plus/></button></div></div><small className="chungnyeong-field-help">단어 입력 후 + 또는 Enter · 태그를 누르면 삭제</small></label><label>모집 인원<input type="number" inputMode="numeric" min="2" max="100" step="1" value={recruitmentForm.capacity} onChange={event=>setRecruitmentForm(current=>({...current,capacity:event.target.value}))} onBlur={()=>setRecruitmentForm(current=>({...current,capacity:String(Math.min(100,Math.max(2,Number.parseInt(current.capacity,10)||2)))}))} placeholder="직접 인원 입력" required/></label><label>모임 일정<input type="datetime-local" value={recruitmentForm.date} onChange={event=>setRecruitmentForm(current=>({...current,date:event.target.value}))}/></label><label>모이는 장소<input value={recruitmentForm.place} onChange={event=>setRecruitmentForm(current=>({...current,place:event.target.value}))} placeholder="예: 수목원 입구"/></label><footer><button type="button" onClick={()=>setRecruitmentComposer(false)}>취소</button><button type="submit" disabled={recruitmentSaving||!recruitmentForm.title.trim()||!recruitmentForm.introduction.trim()}>{recruitmentSaving?'등록 중…':'모집글 등록'}</button></footer></form></div>}
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

function ManagementCard({projects,profile,onNotice,onProjectsChange}:{projects:Project[];profile:UserProfile;onNotice:(message:string)=>void;onProjectsChange:(projects:Project[])=>void}){
  const mine=projects.filter(project=>project.leaderId===userId(profile));
  const [applications,setApplications]=useState(loadProjectApplications);
  const [selectedProjectId,setSelectedProjectId]=useState<string|null>(null);
  const review=(project:Project,application:ReturnType<typeof loadProjectApplications>[number],status:'accepted'|'rejected')=>{
    if(status==='accepted'&&!project.memberIds.includes(application.applicantId)&&project.memberIds.length>=project.maxMembers){onNotice('모집 인원이 모두 찼어요.');return}
    const nextApplications=applications.map(item=>item.id===application.id?{...item,status}:item);setApplications(nextApplications);saveProjectApplications(nextApplications);
    const nextProjects=projects.map(item=>item.id!==project.id?item:{...item,memberIds:status==='accepted'?[...new Set([...item.memberIds,application.applicantId])]:item.memberIds.filter(member=>member!==application.applicantId),applicantIds:item.applicantIds.filter(id=>id!==application.applicantId)});saveProjectRoomProjects(nextProjects);onProjectsChange(nextProjects);onNotice(status==='accepted'?`${application.applicantId}님의 신청을 승인했어요.`:`${application.applicantId}님의 신청을 거절했어요.`);
  };
  return <div className="chungnyeong-management-card"><header><span>👑</span><div><small>내 모집 관리</small><b>{mine.length}개의 모집</b></div></header>{mine.length?mine.map(project=>{const applicants=applications.filter(item=>item.projectId===project.id),pending=applicants.filter(item=>item.status==='pending').length,expanded=selectedProjectId===project.id;return <Fragment key={project.id}><article><div><b>{project.title}</b><small>대기 신청자 {pending}명 · {project.memberIds.length}/{project.maxMembers}명 참여</small></div><button type="button" className={expanded?'active':''} onClick={()=>setSelectedProjectId(expanded?null:project.id)}>{expanded?'목록 닫기':'신청자 보기'}</button></article>{expanded&&<section className="chungnyeong-applicant-list"><header><div><small>APPLICANT PROFILES</small><b>{project.title} 신청자</b></div><span>{applicants.length}명</span></header>{applicants.length?applicants.map(application=><article className="chungnyeong-applicant-card" key={application.id}><header><span>{application.applicantId.slice(0,1)||'신'}</span><div><b>{application.applicantId}</b><small>{application.profileSnapshot.travelStyle||'활동 성향 정보 없음'}</small></div><i className={application.status}>{application.status==='pending'?'승인 대기':application.status==='accepted'?'승인 완료':'거절됨'}</i></header>{application.profileSnapshot.introduction&&<p>{application.profileSnapshot.introduction}</p>}<div className="chungnyeong-applicant-tags">{[...application.profileSnapshot.activities,...application.profileSnapshot.preferredPlaces].slice(0,5).map((tag,index)=><span key={`${tag}-${index}`}>#{tag}</span>)}</div>{application.message&&<blockquote>“{application.message}”</blockquote>}<footer><button type="button" disabled={application.status!=='pending'} onClick={()=>review(project,application,'rejected')}><X/> 거절</button><button type="button" disabled={application.status!=='pending'} onClick={()=>review(project,application,'accepted')}><Check/> 승인</button></footer></article>):<div className="chungnyeong-applicant-empty"><UserRound/><b>아직 도착한 신청이 없어요</b><p>신청자가 프로필 전달에 동의하면 이곳에서 확인할 수 있어요.</p></div>}</section>}</Fragment>}):<p>아직 내가 만든 모집이 없어요. “새 모집 시작하기”를 눌러 충녕이와 초안을 만들어 보세요.</p>}</div>;
}

function ChatResultCarousel({response,projects,currentUserId,onAction}:{response:ChungnyeongChatResponse;projects:Project[];currentUserId:string;onAction:(card:ChungnyeongCard,action:ChungnyeongCard['actions'][number])=>void}){
  const [page,setPage]=useState(0),isPeople=response.intent==='FIND_PERSON';
  const cards=useMemo(()=>{
    if(isPeople)return response.cards;
    const mine=projects.filter(project=>project.leaderId===currentUserId),ownIds=new Set(mine.map(project=>project.id)),ownTitles=new Set(mine.map(project=>project.title));
    const merged=response.cards.filter(card=>card.type!=='recruitment'||(!ownIds.has(card.id)&&!ownTitles.has(card.title))),known=new Set(merged.map(card=>card.id));
    projects.filter(project=>project.status==='recruiting'&&project.leaderId!==currentUserId&&!known.has(project.id)).forEach(project=>merged.push({type:'recruitment',id:project.id,title:project.title,description:`${project.memberIds.length}/${project.maxMembers}명 참여 중 · ${project.summary}`,matchScore:null,tags:project.tags.slice(0,3),actions:['DETAIL','PROFILE_REQUEST']}));
    return merged;
  },[currentUserId,isPeople,projects,response.cards]);
  const pageSize=2,pageCount=Math.max(1,Math.ceil(cards.length/pageSize)),safePage=Math.min(page,pageCount-1),visible=cards.slice(safePage*pageSize,safePage*pageSize+pageSize);
  const move=(direction:number)=>setPage(current=>(current+direction+pageCount)%pageCount);
  return <section className="chungnyeong-results"><header><b>{isPeople?'추천 사람':'추천 모집'} {cards.length}개</b><div className="chungnyeong-result-nav"><span>{safePage+1} / {pageCount}</span><button type="button" onClick={()=>move(-1)} disabled={pageCount===1} aria-label="이전 추천 보기"><ChevronLeft/></button><button type="button" onClick={()=>move(1)} disabled={pageCount===1} aria-label="다음 추천 보기"><ChevronRight/></button></div></header><div className="chungnyeong-result-grid" key={safePage}>{visible.map(card=><div className="chungnyeong-result-card" key={card.id}><div className="chungnyeong-card-person"><span>{card.title.slice(0,1)}</span><div><strong>{card.title}</strong><small><i/> {card.type==='person'?'온라인':'모집 중'}</small></div></div><aside>{card.tags.map(tag=><i key={tag}>{tag}</i>)}</aside><p>{card.description}</p>{card.matchScore!==null&&<div className="chungnyeong-match"><small>관심사 일치도</small><b>{card.matchScore}%</b></div>}<footer>{card.actions.map(action=><button type="button" key={action} onClick={()=>onAction(card,action)}>{chatActionLabel(action)}</button>)}</footer></div>)}</div></section>;
}

function KioskTitle({icon,title,copy}:{icon:string;title:string;copy:string}){return <header className="recruitment-kiosk-title"><span>{icon}</span><div><small>CONNECTION SERVICE</small><h2>{title}</h2><p>{copy}</p></div></header>}

function chatActionLabel(action:ChungnyeongCard['actions'][number]){
  return {PROFILE:'프로필 보기',CHAT_REQUEST:'대화 신청',DETAIL:'상세 보기',PROFILE_REQUEST:'참가 신청',TRAVEL:'이동하기'}[action];
}

function ProjectList({projects,recommendations,applied,onApply}:{projects:Project[];recommendations:ReturnType<typeof recommendProjects>;applied:(project:Project)=>boolean;onApply:(project:Project)=>void}){
  return <div className="recruitment-project-list">{projects.map(project=>{const recommendation=recommendations.find(item=>item.projectId===project.id);return <article key={project.id}><span>{project.thumbnail??'💡'}</span><div><small>{recommendation?`${recommendation.matchScore}% AI 적합도`:`${project.memberIds.length}/${project.maxMembers}명 참여 중`}</small><h3>{project.title}</h3><p>{recommendation?.reasons[0]??project.summary}</p><aside>{project.tags.slice(0,4).map(tag=><i key={tag}>#{tag}</i>)}</aside></div><button type="button" disabled={applied(project)} onClick={()=>onApply(project)}>{applied(project)?'승인 대기 중':'내 프로필로 참가 신청'}</button></article>})}</div>;
}

export { GUIDE_ID as RECRUITMENT_GUIDE_ID };
