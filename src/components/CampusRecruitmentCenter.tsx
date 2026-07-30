import { CalendarDays,Check,Heart,MapPin,Search,Send,Users,X } from 'lucide-react';
import { useMemo,useState,type ReactNode } from 'react';
import { API_BASE_URL } from '../config/api';
import type { UserProfile } from '../types';

type RecruitmentApplication={id:string;userId:string;name:string;introduction:string;interests:string[];travelStyle:string;status:'pending'|'accepted'|'rejected';createdAt:string};
type Recruitment={id:string;author:string;title:string;content:string;likes:number;likedBy:string[];createdAt:string;applications?:RecruitmentApplication[]};
type RecruitmentCard={id:string;emoji:string;author:string;title:string;description:string;size:string;current:number;tags:string[];region:string;date:string;likes:number;source?:Recruitment};
const examples:RecruitmentCard[]=[
  {id:'example-garden',emoji:'🌸',author:'초록산책',title:'이번 주말, 수목원 같이 둘러보실 분',description:'자연을 좋아하시는 분과 천천히 걷고 사진도 찍어요.',size:'4명',current:2,tags:['자연','사진','카페'],region:'국립세종수목원',date:'이번 주말',likes:12},
  {id:'example-cafe',emoji:'☕',author:'라떼구름',title:'세종 감성 카페 세 곳 함께 가요',description:'분위기 좋은 카페를 찾아 이야기와 사진을 남겨요.',size:'5명',current:3,tags:['카페','맛집','사진'],region:'세종 호수공원 근처',date:'토요일',likes:9},
  {id:'example-festival',emoji:'🎆',author:'별빛여행',title:'야간축제 같이 보러 가실 분',description:'축제 공연부터 이응다리 야경까지 함께 즐겨요.',size:'3명',current:1,tags:['축제','사진','공연'],region:'이응다리 일대',date:'금요일',likes:18},
  {id:'example-smart-city',emoji:'🏙️',author:'도시산책자',title:'세종 스마트도시 건축 산책',description:'도시 공간과 건축에 관심 있는 분들을 기다려요.',size:'6명',current:2,tags:['스마트도시','산책','사진'],region:'어진동 일대',date:'날짜 협의',likes:7},
];
const interests=['전체','자연','축제','카페','사진','맛집','스마트도시'];
const formatRecruitDate=(value:string)=>{
  if(!value)return '일정 협의';
  const parsed=new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())?'일정 협의':`${parsed.getMonth()+1}월 ${parsed.getDate()}일`;
};

export function CampusRecruitmentCenter({items,loading,userId,profile,composer,onToggleInterest,onNotice}:{items:Recruitment[];loading:boolean;userId:string;profile:UserProfile;composer?:ReactNode;onToggleInterest:(item:Recruitment)=>void;onNotice:(message:string)=>void}){
  const [query,setQuery]=useState(''),[interest,setInterest]=useState('전체'),[headcount,setHeadcount]=useState('전체 인원'),[date,setDate]=useState('날짜 전체'),[region,setRegion]=useState('지역 전체');
  const [applied,setApplied]=useState<string[]>(()=>{try{const value=JSON.parse(localStorage.getItem(`campus-recruit-applications:${userId}`)??'[]');return Array.isArray(value)?value:[]}catch{return[]}});
  const [likedExamples,setLikedExamples]=useState<string[]>([]);
  const [selected,setSelected]=useState<RecruitmentCard|null>(null);
  const [applicationUpdates,setApplicationUpdates]=useState<Record<string,RecruitmentApplication[]>>({});
  const [introduction,setIntroduction]=useState(()=>`${profile.interests.slice(0,2).join('과 ')}에 관심이 많고, 새로운 사람들과 세종을 천천히 둘러보는 것을 좋아합니다.`);
  const dynamic=useMemo<RecruitmentCard[]>(()=>items.map(item=>{
    const tags=(item.content.match(/관심 태그: ([^\n]+)/)?.[1]??'함께하기').split(/,\s*/);
    const size=item.content.match(/모집 인원: ([^\n]+)/)?.[1]??'인원 협의';
    const savedDate=item.content.match(/모임 일정: ([^\n]+)/)?.[1]??'';
    return {id:item.id,emoji:'📢',author:item.author,title:item.title,description:'함께 세종을 즐길 이웃을 기다리고 있어요.',size,current:1,tags,region:'세종시',date:formatRecruitDate(savedDate),likes:item.likes,source:item};
  }),[items]);
  const cards=useMemo(()=>{
    const keyword=query.trim().toLocaleLowerCase('ko');
    return [...dynamic,...examples]
      .filter(card=>interest==='전체'||card.tags.includes(interest))
      .filter(card=>!keyword||[card.title,card.description,card.author,card.region,...card.tags].some(value=>value.toLocaleLowerCase('ko').includes(keyword)))
      .filter(card=>headcount==='전체 인원'||(headcount==='2명'?/^2명$|2~/.test(card.size):headcount==='3~4명'?/[34]|2~4/.test(card.size):/[5-9]|제한|협의/.test(card.size)))
      .filter(card=>date==='날짜 전체'||(date==='날짜 협의'?card.date.includes('협의'):card.date.includes(date)))
      .filter(card=>region==='지역 전체'||card.region.includes(region));
  },[date,dynamic,headcount,interest,query,region]);
  const submitApplication=async()=>{
    if(!selected||applied.includes(selected.id))return;
    if(selected.source){
      const response=await fetch(`${API_BASE_URL}/community/${selected.id}/applications`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,name:profile.nickname,introduction,interests:[...profile.interests,...profile.preferredPlaceCategories].slice(0,8),travelStyle:profile.usagePurposes[0]??'여유롭게 둘러보기'})});
      if(!response.ok){const body=await response.json().catch(()=>({})) as {message?:string};onNotice(body.message??'참가 신청을 보내지 못했어요.');return}
      const application=await response.json() as RecruitmentApplication;
      setApplicationUpdates(current=>({...current,[selected.id]:[...(current[selected.id]??selected.source?.applications??[]),application]}));
    }
    const next=[...applied,selected.id];
    setApplied(next);
    localStorage.setItem(`campus-recruit-applications:${userId}`,JSON.stringify(next));
    onNotice(`${selected.title}에 내 프로필 카드를 보냈어요. 모집자의 승인을 기다려 주세요.`);
    setSelected(null);
  };
  const reviewApplication=async(card:RecruitmentCard,application:RecruitmentApplication,status:'accepted'|'rejected')=>{
    if(!card.source)return;
    const response=await fetch(`${API_BASE_URL}/community/${card.id}/applications/${application.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({author:profile.nickname,status})});
    if(!response.ok){const body=await response.json().catch(()=>({})) as {message?:string};onNotice(body.message??'참가 신청을 처리하지 못했어요.');return}
    const updated={...application,status};
    const current=applicationUpdates[card.id]??card.source.applications??[];
    setApplicationUpdates(value=>({...value,[card.id]:current.map(item=>item.id===application.id?updated:item)}));
    onNotice(status==='accepted'?`${application.name}님의 참가를 수락했어요. 단체 채팅이 준비됐습니다.`:`${application.name}님의 참가 신청을 거절했어요.`);
  };
  const toggleExampleLike=(id:string,title:string)=>{
    setLikedExamples(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]);
    onNotice(`${title}을 관심 목록에 ${likedExamples.includes(id)?'제외했어요.':'저장했어요.'}`);
  };
  return <>
    <div className="campus-section-title campus-recruit-title"><div><small>④ 모집센터 · 열린 동행 모집</small><h2>지금 함께할 사람을 찾아보세요</h2><p>검색하고 관심 분야를 고른 뒤, 마음에 맞는 모집에 내 프로필로 신청할 수 있어요.</p></div></div>
    <section className="campus-recruit-discovery">
      <div className="campus-recruit-search"><Search size={19}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="수목원, 카페, 사진처럼 검색해 보세요" aria-label="모집글 검색"/>{query&&<button type="button" onClick={()=>setQuery('')} aria-label="검색어 지우기"><X size={15}/></button>}</div>
      <div className="campus-recruit-interest-head"><div><b>관심 분야</b><small>분야를 누르면 모집글이 바로 바뀝니다.</small></div></div>
      <nav className="campus-recruit-interest" aria-label="관심 분야">{interests.map(item=><button type="button" className={interest===item?'active':''} onClick={()=>setInterest(item)} key={item}>{item}</button>)}</nav>
      <div className="campus-recruit-more-filters"><label>인원<select value={headcount} onChange={event=>setHeadcount(event.target.value)}><option>전체 인원</option><option>2명</option><option>3~4명</option><option>5명 이상</option></select></label><label>날짜<select value={date} onChange={event=>setDate(event.target.value)}><option>날짜 전체</option><option>오늘</option><option>이번 주말</option><option>날짜 협의</option></select></label><label>지역<select value={region} onChange={event=>setRegion(event.target.value)}><option>지역 전체</option><option>국립세종수목원</option><option>세종 호수공원</option><option>나성동</option><option>어진동</option></select></label><span>{cards.length}개의 모집글</span></div>
    </section>
    {composer&&<section className="campus-recruit-composer-wrap"><header><b>새 모집글 작성</b><small>누구와 어디서 무엇을 하고 싶은지 알려주세요.</small></header>{composer}</section>}
    <div className="campus-recruit-feed">{cards.map(card=>{
      const sourceLiked=Boolean(card.source?.likedBy?.includes(userId)),exampleLiked=likedExamples.includes(card.id),liked=sourceLiked||exampleLiked,joined=applied.includes(card.id);
      const applications=applicationUpdates[card.id]??card.source?.applications??[],isOwner=card.source?.author===profile.nickname;
      return <article className="campus-recruit-card" key={card.id}>
        <header><span>{card.emoji}</span><div><b>{card.author}</b><small>{card.date} · 모집 중</small></div><i>{card.tags[0]}</i></header>
        <h3>{card.title}</h3><p>{card.description}</p>
        <div className="recruit-center-tags">{card.tags.map(tag=><span key={tag}>#{tag}</span>)}</div>
        <dl><div><Users size={15}/><span><dt>모집 인원</dt><dd>{card.current} / {card.size}</dd></span></div><div><MapPin size={15}/><span><dt>만남 장소</dt><dd>{card.region}</dd></span></div><div><CalendarDays size={15}/><span><dt>일정</dt><dd>{card.date}</dd></span></div></dl>
        <footer><button type="button" className={`campus-recruit-heart ${liked?'liked':''}`} onClick={()=>card.source?onToggleInterest(card.source):toggleExampleLike(card.id,card.title)} aria-label={liked?'관심 목록에서 제외':'관심 목록에 저장'}><Heart size={18} fill={liked?'currentColor':'none'}/><span>{card.likes+(exampleLiked?1:0)}</span></button><button type="button" className={`campus-recruit-apply ${joined?'applied':''}`} disabled={joined} onClick={()=>setSelected(card)}>{joined?<><Check size={16}/> 승인 대기 중</>:<><Send size={16}/> 참가 신청</>}</button></footer>
        {isOwner&&applications.length>0&&<section className="campus-recruit-applicants"><header><b>받은 참가 신청</b><span>{applications.filter(item=>item.status==='pending').length}명 확인 대기</span></header>{applications.map(application=><article key={application.id}><div className="campus-applicant-name"><span>{application.name.slice(0,1)}</span><div><b>{application.name}</b><small>{application.travelStyle}</small></div></div><p>{application.introduction}</p><div className="campus-applicant-tags">{application.interests.slice(0,4).map(value=><span key={value}>#{value}</span>)}</div><footer>{application.status==='pending'?<><button type="button" onClick={()=>void reviewApplication(card,application,'rejected')}>거절</button><button type="button" onClick={()=>void reviewApplication(card,application,'accepted')}>수락</button></>:<strong className={application.status}>{application.status==='accepted'?'수락 완료 · 단체 채팅 생성':'거절 완료'}</strong>}</footer></article>)}</section>}
      </article>;
    })}{!cards.length&&!loading&&<p className="campus-recruit-none">검색 조건에 맞는 모집글이 아직 없어요. 직접 첫 모집글을 작성해 보세요.</p>}</div>
    <section className="campus-recruit-flow"><span><b>1</b>참가 신청</span><i>›</i><span><b>2</b>내 프로필 전달</span><i>›</i><span><b>3</b>모집자 승인</span><i>›</i><span><b>4</b>단체 채팅 자동 생성</span></section>
    {selected&&<div className="campus-application-overlay" role="dialog" aria-modal="true" aria-label="참가 신청 프로필 확인"><section className="campus-application-card">
      <header><div><small>참가 신청</small><h3>내 프로필을 확인해 주세요</h3><p>모집자에게 아래 소개와 관심사가 전달됩니다.</p></div><button type="button" onClick={()=>setSelected(null)} aria-label="닫기"><X size={18}/></button></header>
      <div className="campus-application-target"><span>{selected.emoji}</span><div><small>신청할 모집글</small><b>{selected.title}</b></div></div>
      <div className="campus-application-profile"><span>{profile.nickname.slice(0,1)}</span><div><small>내 소개</small><h4>{profile.nickname}</h4><p>{profile.usagePurposes[0]??'세종에서 새로운 경험을 함께하고 싶어요.'}</p></div></div>
      <label>모집자에게 보낼 소개<textarea value={introduction} onChange={event=>setIntroduction(event.target.value)} maxLength={160}/><small>{introduction.length}/160자</small></label>
      <div className="campus-application-tags"><b>관심 분야</b><div>{[...profile.interests,...profile.preferredPlaceCategories].slice(0,6).map(value=><span key={value}>#{value}</span>)}</div></div>
      <div className="campus-application-style"><b>여행 방식</b><span>{profile.usagePurposes[0]??'여유롭게 둘러보기'}</span></div>
      <footer><button type="button" onClick={()=>setSelected(null)}>취소</button><button type="button" onClick={()=>void submitApplication()} disabled={!introduction.trim()}><Send size={16}/> 신청 보내기</button></footer>
      <p className="campus-application-note">모집자가 수락하면 참여자용 단체 채팅이 자동으로 만들어집니다.</p>
    </section></div>}
  </>;
}
