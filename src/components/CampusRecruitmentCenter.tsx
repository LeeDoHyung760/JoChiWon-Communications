import { ArrowRight,Check,Heart,MessageCircle,Users } from 'lucide-react';
import { useMemo,useState,type ReactNode } from 'react';
import type { PlayerState } from '../../shared/socket-events';

type Recruitment={id:string;author:string;title:string;content:string;likes:number;likedBy:string[];createdAt:string};
type RecruitmentCard={id:string;emoji:string;author:string;title:string;size:string;tags:string[];region:string;date:string;likes:number;source?:Recruitment};
const examples:RecruitmentCard[]=[
  {id:'example-garden',emoji:'🌸',author:'초록산책',title:'주말에 수목원 같이 가실 분',size:'2~4명',tags:['자연','사진','카페'],region:'세종시',date:'이번 주말',likes:12},
  {id:'example-cafe',emoji:'☕',author:'라떼구름',title:'세종 카페 투어',size:'3명',tags:['카페','맛집'],region:'나성동',date:'토요일',likes:9},
  {id:'example-festival',emoji:'🎆',author:'별빛여행',title:'야간축제 같이 보실 분',size:'4명',tags:['축제','사진'],region:'세종호수공원',date:'금요일',likes:18},
];
const interests=['전체','자연','축제','카페','맛집','사진','스마트도시'];

export function CampusRecruitmentCenter({items,loading,userId,composer,onToggleComposer,onToggleInterest,recommended,onChat,onNotice,onGovernment}:{items:Recruitment[];loading:boolean;userId:string;composer?:ReactNode;onToggleComposer:()=>void;onToggleInterest:(item:Recruitment)=>void;recommended?:PlayerState;onChat:(player:PlayerState)=>void;onNotice:(message:string)=>void;onGovernment:()=>void}){
  const [interest,setInterest]=useState('전체'),[headcount,setHeadcount]=useState('전체 인원'),[date,setDate]=useState('날짜 전체'),[region,setRegion]=useState('지역 전체');
  const [applied,setApplied]=useState<string[]>([]);
  const dynamic=useMemo<RecruitmentCard[]>(()=>items.map(item=>({id:item.id,emoji:'📢',author:item.author,title:item.title,size:item.content.match(/모집 인원: ([^\n]+)/)?.[1]??'인원 협의',tags:(item.content.match(/관심 태그: ([^\n]+)/)?.[1]??'함께하기').split(/,\s*/),region:'세종시',date:'일정 협의',likes:item.likes,source:item})),[items]);
  const cards=[...dynamic,...examples]
    .filter(card=>interest==='전체'||card.tags.includes(interest))
    .filter(card=>headcount==='전체 인원'||(headcount==='2명'?/^2명$|2~/.test(card.size):headcount==='3~4명'?/[34]|2~4/.test(card.size):/[5-9]|제한/.test(card.size)))
    .filter(card=>date==='날짜 전체'||(date==='날짜 협의'?card.date.includes('협의'):card.date.includes(date)))
    .filter(card=>region==='지역 전체'||card.region===region);
  const apply=(id:string,title:string)=>{if(applied.includes(id))return;setApplied(current=>[...current,id]);onNotice(`${title}에 참가 신청했어요. 모집 완료 시 그룹 채팅이 자동으로 열립니다.`)};
  return <>
    <div className="campus-section-title"><div><small>④ 모집센터 · OPEN RECRUITMENT</small><h2>동아리 없이도 지금 함께할 사람을 찾아요</h2><p>관심 분야, 인원, 날짜와 지역을 골라 즉석 모임과 여행 동행을 모집할 수 있습니다.</p></div><button type="button" className="campus-create-button" onClick={onToggleComposer}>+ 모집 글 작성</button></div>
    {composer}
    <section className="campus-recruit-filters"><div><small>관심 분야</small><nav>{interests.map(item=><button type="button" className={interest===item?'active':''} onClick={()=>setInterest(item)} key={item}>{item}</button>)}</nav></div><label>인원<select value={headcount} onChange={event=>setHeadcount(event.target.value)}><option>전체 인원</option><option>2명</option><option>3~4명</option><option>5명 이상</option></select></label><label>날짜<select value={date} onChange={event=>setDate(event.target.value)}><option>날짜 전체</option><option>오늘</option><option>이번 주말</option><option>날짜 협의</option></select></label><label>지역<select value={region} onChange={event=>setRegion(event.target.value)}><option>지역 전체</option><option>세종호수공원</option><option>수목원</option><option>나성동</option></select></label></section>
    <div className="campus-recruit-board-head"><span>모집 글</span><span>관심 태그</span><span>인원·지역</span><span>상태</span><span>작업</span></div>
    <div className="campus-recruit-center-grid">{cards.map(card=>{const liked=card.source?.likedBy?.includes(userId),joined=applied.includes(card.id);return <article key={card.id}><header><span>{card.emoji}</span><div><b>{card.title}</b><small>{card.author} · {card.date}</small></div></header><div className="recruit-center-tags">{card.tags.map(tag=><span key={tag}>#{tag}</span>)}</div><dl><div><dt>모집</dt><dd>{card.size}</dd></div><div><dt>지역</dt><dd>{card.region}</dd></div></dl><i className="recruit-board-status">{joined?'신청 완료':'모집 중'}</i><footer><button type="button" className={liked?'liked':''} onClick={()=>card.source?onToggleInterest(card.source):onNotice(`${card.title}에 관심을 표시했어요.`)} aria-label={`관심 있어요 ${card.likes}`}><Heart size={13} fill={liked?'currentColor':'none'}/><span>{card.likes}</span></button><button type="button" disabled={!recommended} onClick={()=>recommended&&onChat(recommended)} aria-label="채팅하기"><MessageCircle size={13}/></button><button type="button" className={joined?'applied':''} disabled={joined} onClick={()=>apply(card.id,card.title)}>{joined?<Check size={13}/>:<Users size={13}/>} {joined?'완료':'참가 신청'}</button></footer></article>})}{!cards.length&&!loading&&<p className="campus-recruit-none">선택한 조건의 모집 글이 아직 없어요.</p>}</div>
    <section className="campus-recruit-complete"><Check size={18}/><div><b>모집 완료 후 자동으로 그룹 채팅방이 생성됩니다</b><p>참여자들은 일정 조율, 장소 공유, 정부청사 이동을 한 공간에서 진행할 수 있어요.</p></div><button type="button" onClick={onGovernment}>정부청사로 이어가기 <ArrowRight size={14}/></button></section>
    <section className="campus-final-journey"><small>JOINT CAMPUS JOURNEY</small><h3>사람을 만나고, 관심사를 나누고, 실제 세종 여행으로</h3><div>{[['🏫','학생회관','AI 친구 추천'],['🏠','동아리관','관심사 커뮤니티'],['💡','프로젝트실','목표 중심 협업'],['📢','모집센터','동행 모집'],['🏛️','정부청사','최종 방문 코스']].map(([emoji,name,copy],index)=><span key={name}><i>{emoji}</i><b>{name}</b><small>{copy}</small>{index<4&&<ArrowRight size={13}/>}</span>)}</div></section>
  </>;
}
