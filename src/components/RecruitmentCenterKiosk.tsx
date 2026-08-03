import { useEffect,useMemo,useState,type CSSProperties } from 'react';
import { CalendarDays,CircleHelp,Heart,Info,MapPin,Megaphone,Search,SlidersHorizontal,UsersRound,X } from 'lucide-react';
import { gameEvents } from '../game/events';
import { API_BASE_URL } from '../config/api';
import './RecruitmentCenterKiosk.css';
import './RecruitmentCenterKioskSurface.css';

type KioskSection={id:string;title:string;summary:string;details:string[]};
type ScreenRect={left:number;top:number;width:number;height:number};
type CommunityApplication={status:'pending'|'accepted'|'rejected'};
type CommunityPost={id:string;author:string;title:string;content:string;category:string;likes:number;createdAt:string;applications?:CommunityApplication[]};
type KioskActivity={id:string;emoji:string;title:string;members:string;intro:string;deadline:string;place:string;duration:string;author?:string;tags?:string[];likes?:number;startAt?:string;createdAt?:string};
type KioskSchedule={id:string;time:string;title:string;place:string;description:string;supplies:string;recruiting:string;activityId?:string};
const DEFAULT_SECTIONS:KioskSection[]=[
  {id:'status',title:'모집 둘러보기',summary:'오늘·전체·인기 모집을 검색합니다.',details:['오늘 모집','전체 모집','인기 모집','검색','필터']},
  {id:'schedule',title:'오늘 일정',summary:'시간별 활동 일정을 확인합니다.',details:['14:00 AI스터디','15:00 사진출사','18:00 축제']},
  {id:'guide',title:'이용 방법',summary:'모집부터 활동까지의 순서를 안내합니다.',details:['모집 작성','신청','승인','활동']},
  {id:'notice',title:'공지사항',summary:'행사·점검·운영 소식을 확인합니다.',details:['오늘 행사','점검','운영']},
  {id:'help',title:'FAQ',summary:'자주 묻는 질문을 확인합니다.',details:['프로젝트는?','승인은?','동아리는?']},
];
const SCREEN_SUMMARIES=['오늘·전체·인기 모집 보기','14:00부터 오늘 일정 확인','모집 작성부터 활동까지','오늘 행사·점검·운영 안내','프로젝트·승인·동아리 질문'];
const RECRUITING_ACTIVITIES:KioskActivity[]=[
  {id:'ai-coding',emoji:'🔥',title:'AI 코딩 스터디',members:'2 / 5명',intro:'AI 도구와 코딩 사례를 함께 실습하는 초급 스터디입니다.',deadline:'오늘 13:30까지',place:'프로젝트실 A',duration:'약 2시간'},
  {id:'garden-photo',emoji:'📸',title:'수목원 사진 출사',members:'3 / 6명',intro:'수목원을 산책하며 계절 식물과 풍경을 사진으로 기록합니다.',deadline:'오늘 14:30까지',place:'수목원 입구',duration:'약 2시간 30분'},
  {id:'night-festival',emoji:'🌃',title:'야간축제 탐방',members:'4 / 8명',intro:'중앙광장에서 만나 야간 공연과 포토존을 함께 둘러봅니다.',deadline:'오늘 17:30까지',place:'중앙광장',duration:'약 3시간'},
  {id:'cafe-tour',emoji:'☕',title:'감성 카페 투어',members:'2 / 5명',intro:'캠퍼스 주변의 분위기 좋은 카페를 차례로 방문합니다.',deadline:'오늘 15:30까지',place:'모집센터 앞',duration:'약 2시간'},
  {id:'plant-explorers',emoji:'🌿',title:'식물 탐험대',members:'5 / 8명',intro:'식물의 특징을 관찰하고 팀별 탐험 기록을 완성합니다.',deadline:'오늘 14:00까지',place:'수목원 안내소',duration:'약 2시간'},
];
const TODAY_SCHEDULE:KioskSchedule[]=[
  {id:'schedule-ai',time:'14:00',title:'AI스터디',place:'프로젝트실',description:'AI 도구를 함께 실습하고 활용 사례를 나눕니다.',supplies:'노트북 · 충전기',recruiting:'모집 중 · 3자리 남음'},
  {id:'schedule-photo',time:'15:00',title:'사진출사',place:'수목원 입구',description:'수목원을 걸으며 계절 풍경을 사진으로 기록합니다.',supplies:'카메라 또는 휴대폰',recruiting:'모집 중 · 3자리 남음'},
  {id:'schedule-festival',time:'18:00',title:'축제',place:'중앙광장',description:'공연과 야경 포인트를 함께 둘러봅니다.',supplies:'가벼운 겉옷',recruiting:'모집 중 · 4자리 남음'},
];
const FAQS=[
  ['모집글은 어디에서 작성하나요?','개인 AI 충녕이와 대화한 뒤 ‘새 모집 시작하기’를 누르면 작성할 수 있어요. 제목, 소개, 태그, 인원, 일정과 장소를 입력해 등록합니다.'],
  ['키오스크에서 바로 참가할 수 있나요?','아니요. 키오스크는 누구나 보는 공용 정보 화면입니다. 참가 신청은 ‘충녕이와 대화하기’에서 공개 프로필을 확인하고 동의한 뒤 진행합니다.'],
  ['사람이나 활동은 어떻게 찾나요?','충녕이에게 원하는 관심사와 활동을 자연스럽게 말하면 됩니다. 예: “사진 좋아하는 사람과 수목원에 가고 싶어요.”'],
  ['신청하면 어떤 정보가 전달되나요?','닉네임, 직접 공개한 관심사·활동 성향, 신청 메시지만 전달됩니다. 신청 전 확인 화면에서 전달 내용을 다시 볼 수 있습니다.'],
  ['승인은 얼마나 걸리나요?','정해진 자동 승인 시간은 없습니다. 모집자가 신청자 프로필을 확인해 승인하거나 거절하면 내 신청 현황에 결과가 표시됩니다.'],
  ['신청 상태는 어디에서 확인하나요?','충녕이 메뉴의 ‘내 신청 현황 보기’에서 승인 대기, 승인 완료, 거절 상태를 확인할 수 있습니다.'],
  ['내가 만든 모집의 신청자는 어디서 보나요?','충녕이의 ‘내 모집 관리하기’에서 모집별 신청자 보기 버튼을 누르면 공개 프로필과 신청 메시지를 확인하고 승인·거절할 수 있습니다.'],
  ['프로젝트는 어디에서 만드나요?','공동 결과물을 만드는 프로젝트는 프로젝트실에서 생성합니다. 모집센터는 사람과 활동을 연결하고, 프로젝트실은 승인된 팀이 계획과 활동을 이어가는 공간입니다.'],
  ['동아리와 프로젝트는 같은가요?','동아리는 지속적인 관심사 모임이고, 프로젝트는 목표와 기간이 있는 협업 활동입니다. 관련 모집은 모집 둘러보기에서 함께 확인할 수 있습니다.'],
];
const GUIDE_STEPS=[
  ['충녕이와 대화','원하는 활동, 관심사 또는 직접 모집하고 싶은 내용을 개인 AI 충녕이에게 말합니다.'],
  ['모집 찾기·작성','추천 모집을 살펴보거나 제목, 소개, 태그, 인원, 일정과 장소를 입력해 새 모집글을 등록합니다.'],
  ['프로필 확인·전달','참가 신청 전 공개 프로필과 신청 메시지를 확인하고 동의한 정보만 모집자에게 전달합니다.'],
  ['모집자 승인 대기','모집자는 내 모집 관리에서 신청자 프로필을 확인하고 승인 또는 거절합니다. 상태는 충녕이가 알려줍니다.'],
  ['활동 시작','승인 후 참여자와 약속한 장소에서 만나며, 공동 프로젝트가 필요하면 프로젝트실에서 계획과 역할을 이어갑니다.'],
];

const field=(content:string,label:string)=>content.split('\n').find(line=>line.startsWith(`${label}:`))?.slice(label.length+1).trim()??'';
const isSameDay=(value:string|undefined,date=new Date())=>{if(!value)return false;const parsed=new Date(value);return !Number.isNaN(parsed.getTime())&&parsed.getFullYear()===date.getFullYear()&&parsed.getMonth()===date.getMonth()&&parsed.getDate()===date.getDate()};
const communityActivity=(post:CommunityPost):KioskActivity|null=>{
  if(post.category!=='모임·행사')return null;
  const capacity=Math.max(2,Number.parseInt(field(post.content,'모집 인원'),10)||2),accepted=post.applications?.filter(item=>item.status==='accepted').length??0,startAt=field(post.content,'모임 일정'),tags=field(post.content,'관심 태그').split(',').map(item=>item.trim()).filter(Boolean);
  return {id:`community-${post.id}`,emoji:'📢',title:post.title,members:`${Math.min(capacity,1+accepted)} / ${capacity}명`,intro:post.content.split('\n')[0]?.trim()||'함께할 사람을 찾는 공개 모집입니다.',deadline:startAt&&startAt!=='날짜 협의'?`${new Date(startAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} 시작`:'모집자와 협의',place:field(post.content,'모이는 장소')||'장소 협의',duration:'모집자에게 문의',author:post.author,tags,likes:post.likes??0,startAt:startAt&&startAt!=='날짜 협의'?startAt:undefined,createdAt:post.createdAt};
};
const activitySchedule=(activity:KioskActivity):KioskSchedule=>({id:`schedule-${activity.id}`,activityId:activity.id,time:activity.startAt?new Date(activity.startAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false}):'협의',title:activity.title,place:activity.place,description:activity.intro,supplies:'모집글 상세 내용 확인 · 필요 시 모집자에게 문의',recruiting:`모집 중 · ${activity.members}`});

function KioskIcon({id}:{id:string}){
  if(id==='status')return <UsersRound/>;
  if(id==='schedule')return <CalendarDays/>;
  if(id==='notice')return <Megaphone/>;
  if(id==='guide')return <CircleHelp/>;
  return <Heart/>;
}

export function RecruitmentCenterKiosk({active,onOpenChange,onNotice}:{active:boolean;onOpenChange:(open:boolean)=>void;onNotice:(message:string)=>void}){
  const [nearby,setNearby]=useState(false),[open,setOpen]=useState(false),[detailOpen,setDetailOpen]=useState(false),[selectedId,setSelectedId]=useState('status'),[detailItemId,setDetailItemId]=useState<string|null>(null);
  const [activities,setActivities]=useState<KioskActivity[]>(RECRUITING_ACTIVITIES),[dataLoading,setDataLoading]=useState(false),[dataError,setDataError]=useState('');
  const [rect,setRect]=useState<ScreenRect|null>(null);
  const sections=DEFAULT_SECTIONS;
  const selected=useMemo(()=>sections.find(section=>section.id===selectedId)??sections[0],[sections,selectedId]);

  useEffect(()=>{
    const proximity=(value:boolean)=>setNearby(value);
    const mode=(value:boolean)=>{setOpen(value);setDetailOpen(false);setDetailItemId(null);if(!value)setRect(null)};
    const screenRect=(value:ScreenRect|null)=>setRect(value);
    gameEvents.on('recruitment-kiosk-proximity-changed',proximity);gameEvents.on('recruitment-kiosk-mode-changed',mode);gameEvents.on('recruitment-kiosk-screen-rect',screenRect);
    return()=>{gameEvents.off('recruitment-kiosk-proximity-changed',proximity);gameEvents.off('recruitment-kiosk-mode-changed',mode);gameEvents.off('recruitment-kiosk-screen-rect',screenRect)};
  },[]);
  useEffect(()=>{if(!active){setNearby(false);setOpen(false);setRect(null);gameEvents.emit('recruitment-kiosk-close')}},[active]);
  useEffect(()=>onOpenChange(open),[open,onOpenChange]);
  useEffect(()=>{
    if(!open)return;
    const controller=new AbortController();setDataLoading(true);setDataError('');
    void fetch(`${API_BASE_URL}/community`,{signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error('공개 모집을 불러오지 못했습니다.');return response.json() as Promise<CommunityPost[]>}).then(posts=>{const linked=posts.map(communityActivity).filter((item):item is KioskActivity=>item!==null);setActivities(linked.length?linked:RECRUITING_ACTIVITIES)}).catch(error=>{if(error instanceof DOMException&&error.name==='AbortError')return;setActivities(RECRUITING_ACTIVITIES);setDataError('실시간 모집 연결이 지연되어 기본 운영 정보를 표시합니다.');onNotice('키오스크 공개 모집을 새로 불러오지 못했어요.')}).finally(()=>setDataLoading(false));
    return()=>controller.abort();
  },[onNotice,open]);
  useEffect(()=>{
    if(!open)return;
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();gameEvents.emit('recruitment-kiosk-close')}};
    window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);
  },[open]);

  const choose=(id:string)=>{setSelectedId(id);setDetailItemId(null);setDetailOpen(true)};
  const close=()=>gameEvents.emit('recruitment-kiosk-close');
  const talkToChungnyeong=()=>{close();window.setTimeout(()=>gameEvents.emit('recruitment-guide-open'),220)};
  // Sit slightly inside the authored black bezel instead of covering its
  // edges. The lower vertical inset makes the DOM read as content behind the
  // kiosk glass rather than a browser card floating over the model.
  const style=rect?{
    left:rect.left+rect.width*.018,
    top:rect.top+rect.height*.032,
    width:Math.max(1,rect.width*.964),
    height:Math.max(1,rect.height*.948),
  } as CSSProperties:undefined;

  return <>
    {active&&open&&<div className="recruitment-kiosk-active-marker" aria-hidden="true"/>}
    {active&&nearby&&!open&&<button type="button" className="recruitment-kiosk-prompt" onClick={()=>gameEvents.emit('recruitment-kiosk-open')}>
      <kbd>E</kbd><span>키오스크 보기</span>
    </button>}
    {active&&open&&rect&&<section className={`recruitment-kiosk-web is-kiosk-surface${detailOpen?' is-detail':''}`} style={style} role="dialog" aria-modal="true" aria-label="모집센터 정보 키오스크" onKeyDown={event=>event.stopPropagation()} onKeyUp={event=>event.stopPropagation()}>
        <header className="recruitment-kiosk-screen-header"><div className="recruitment-kiosk-brand"><UsersRound/><span><h2>모집센터 공용 키오스크</h2><p>누가 눌러도 같은 화면</p></span></div><button type="button" onClick={close} aria-label="키오스크 사용 종료"><X/></button></header>
        {!detailOpen?<main className="recruitment-kiosk-screen-menu">
          <nav aria-label="확인할 정보 선택">{sections.map((section,index)=><button type="button" key={section.id} onClick={()=>choose(section.id)}><i>{String(index+1).padStart(2,'0')}</i><span className="recruitment-kiosk-menu-icon"><KioskIcon id={section.id}/></span><span className="recruitment-kiosk-menu-copy"><b>{section.title}</b><small>{SCREEN_SUMMARIES[index]}</small></span><strong>›</strong></button>)}</nav>
          <footer><Info/> 화면을 터치해 메뉴를 선택해주세요!</footer>
        </main>:<main className="recruitment-kiosk-detail-screen">
            <button type="button" className="recruitment-kiosk-menu-back" onClick={()=>detailItemId?setDetailItemId(null):setDetailOpen(false)}>‹ {detailItemId?'목록으로':'전체 메뉴'}</button>
            <article className="recruitment-kiosk-detail">
              <KioskDetail sectionId={selected.id} detailItemId={detailItemId} activities={activities} loading={dataLoading} error={dataError} onDetail={setDetailItemId} onTalk={talkToChungnyeong}/>
            </article>
          </main>}
      </section>}
  </>;
}

function KioskDetail({sectionId,detailItemId,activities,loading,error,onDetail,onTalk}:{sectionId:string;detailItemId:string|null;activities:KioskActivity[];loading:boolean;error:string;onDetail:(id:string)=>void;onTalk:()=>void}){
  const [browseMode,setBrowseMode]=useState<'today'|'all'|'popular'>('today'),[query,setQuery]=useState(''),[filterOpen,setFilterOpen]=useState(false);
  const activity=activities.find(item=>item.id===detailItemId);
  const liveSchedules=activities.filter(item=>isSameDay(item.startAt)).map(activitySchedule),schedules=liveSchedules.length?liveSchedules:TODAY_SCHEDULE;
  const schedule=schedules.find(item=>item.id===detailItemId);
  const keyword=query.trim().toLocaleLowerCase('ko-KR'),matched=activities.filter(item=>!keyword||[item.title,item.intro,item.author??'',item.place,...(item.tags??[])].some(value=>value.toLocaleLowerCase('ko-KR').includes(keyword))),today=matched.filter(item=>isSameDay(item.startAt)||isSameDay(item.createdAt));
  const visibleActivities=browseMode==='today'?(today.length?today:matched.filter(item=>!item.createdAt).slice(0,3)):browseMode==='popular'?[...matched].sort((a,b)=>(b.likes??0)-(a.likes??0)).slice(0,8):matched;
  if(sectionId==='status'&&activity)return <div className="kiosk-activity-detail"><header><small>ACTIVITY INFORMATION · {activity.author??'운영진'}</small><h3><span>{activity.emoji}</span>{activity.title}</h3><p>{activity.intro}</p>{activity.tags?.length?<div className="kiosk-activity-tags">{activity.tags.map(tag=><span key={tag}>#{tag}</span>)}</div>:null}</header><dl><div><dt>모집 인원</dt><dd>{activity.members}</dd></div><div><dt>일정·모집 마감</dt><dd>{activity.deadline}</dd></div><div><dt>모이는 장소</dt><dd>{activity.place}</dd></div><div><dt>예상 소요시간</dt><dd>{activity.duration}</dd></div></dl><button type="button" className="kiosk-talk-button" onClick={onTalk}>충녕이와 대화하기</button><p className="kiosk-public-note">키오스크는 공용 정보 화면입니다. 참가 신청은 충녕이와 대화한 뒤 공개 프로필 전달에 동의해야 진행됩니다.</p></div>;
  if(sectionId==='schedule'&&schedule)return <div className="kiosk-activity-detail"><header><small>TODAY · {schedule.time}</small><h3><CalendarDays/>{schedule.title}</h3><p>{schedule.description}</p></header><dl><div><dt>준비물</dt><dd>{schedule.supplies}</dd></div><div><dt>모집 여부</dt><dd>{schedule.recruiting}</dd></div><div className="wide"><dt>집합 장소</dt><dd>{schedule.place}</dd></div></dl></div>;
  if(sectionId==='status')return <><header><div><small>PUBLIC RECRUITMENT</small><h3><UsersRound/> 모집 둘러보기</h3><p>사용자가 등록한 공개 모집글을 실시간으로 연결해 모든 사람에게 동일하게 보여줍니다.</p></div></header><div className="kiosk-browse-tabs">{([['today','오늘 모집'],['all','전체 모집'],['popular','인기 모집']] as const).map(([id,label])=><button type="button" className={browseMode===id?'active':''} key={id} onClick={()=>setBrowseMode(id)}>{label}</button>)}</div><div className="kiosk-browse-tools"><label><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="제목·태그·장소·작성자 검색"/></label><button type="button" className={filterOpen?'active':''} onClick={()=>setFilterOpen(value=>!value)}><SlidersHorizontal/> 안내</button></div>{filterOpen&&<div className="kiosk-filter-note">오늘 모집은 오늘 등록되었거나 오늘 시작하는 활동, 인기 모집은 관심 수가 높은 순서입니다.</div>}{error&&<div className="kiosk-data-note">{error}</div>}{loading?<div className="kiosk-public-empty">공개 모집을 불러오고 있어요…</div>:<div className="kiosk-recruiting-list">{visibleActivities.map(item=><button type="button" key={item.id} onClick={()=>onDetail(item.id)}><span>{item.emoji}</span><span className="kiosk-recruit-copy"><b>{item.title}</b><em>{item.author??'운영진'} · {item.place}</em></span><small>{item.members}</small><strong>›</strong></button>)}</div>}{!loading&&!visibleActivities.length&&<div className="kiosk-public-empty">조건에 맞는 공개 모집이 아직 없습니다.</div>}</>;
  if(sectionId==='schedule')return <><header><div><small>TODAY'S CAMPUS</small><h3><CalendarDays/> 오늘의 일정</h3><p>오늘 시작하는 사용자 모집과 공동캠퍼스 운영 일정을 시간순으로 확인합니다.</p></div></header><div className="kiosk-schedule-date"><b>{new Date().toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'long'})}</b><span>{liveSchedules.length?'사용자 등록 일정 연동':'운영 기본 일정'}</span></div><div className="kiosk-schedule-list">{schedules.map(item=><button type="button" key={item.id} onClick={()=>onDetail(item.id)}><time>{item.time}</time><span><b>{item.title}</b><small><MapPin/> {item.place}</small></span><strong>›</strong></button>)}</div></>;
  if(sectionId==='notice')return <><header><div><small>OPERATIONS NOTICE</small><h3><Megaphone/> 공지사항</h3><p>모집센터의 공용 운영 안내입니다.</p></div></header><ul className="kiosk-notice-list"><li><b>오늘 행사</b><small>18:00 중앙광장에서 축제가 시작됩니다.</small></li><li><b>점검</b><small>오늘 21:00부터 일부 기능을 점검합니다.</small></li><li><b>운영</b><small>모집 정보는 모든 사용자에게 동일하게 표시됩니다.</small></li></ul></>;
  if(sectionId==='guide')return <><header><div><small>HOW TO USE</small><h3><CircleHelp/> 모집센터 이용 방법</h3><p>공용 키오스크는 정보를 확인하고, 개인 AI 충녕이는 내 정보로 찾기·작성·신청·관리를 돕습니다.</p></div></header><div className="kiosk-guide-flow">{GUIDE_STEPS.map(([label],index)=><div key={label}><span>{index+1}</span><b>{label}</b>{index<GUIDE_STEPS.length-1&&<i>↓</i>}</div>)}</div><div className="kiosk-guide-details">{GUIDE_STEPS.map(([title,copy],index)=><article key={title}><span>{index+1}</span><div><b>{title}</b><p>{copy}</p></div></article>)}</div><div className="kiosk-guide-copy"><p><b>모집센터</b>는 사람과 활동을 연결하는 공간입니다.</p><p><b>프로젝트 생성과 승인 후 협업</b>은 프로젝트실에서 진행합니다.</p><p><b>개인정보는 자동 전달되지 않으며</b> 신청 확인 화면에서 동의한 공개 정보만 전달됩니다.</p></div></>;
  return <><header><div><small>FAQ</small><h3><Heart/> 자주 묻는 질문</h3></div></header><div className="kiosk-faq-list">{FAQS.map(([question,answer])=><article key={question}><div><b>Q</b><p>{question}</p></div><div><b>A</b><p>{answer}</p></div></article>)}</div></>;
}
