import { Heart,Map,MessageCircle,Plus,Search,Sparkles,Users,X } from 'lucide-react';
import { useMemo,useState } from 'react';
import type { PlayerState } from '../../shared/socket-events';
import type { CharacterParts } from '../types';
import { CharacterPreview } from './CharacterPreview';

type MatchResult={
  totalScore:number;
  reason:string;
  sharedInterests:string[];
  sharedPurposes:string[];
  sharedExperienceRecords:string[];
};

const analysisSources=['저장한 축제','식물도감 및 대표 식물','좋아하는 활동','가보고 싶은 장소','대화·방문 목적'];
const initialBoardPosts=[
  {id:'garden',title:'국립세종수목원 처음 방문한 후기',content:'사계절전시온실부터 천천히 보니 두 시간 정도 걸렸어요. 편한 신발을 추천합니다.',author:'초록산책',time:'방금 전',likes:12,comments:4,tags:['방문후기','수목원']},
  {id:'cafe',title:'조용한 세종 카페 추천해주세요.',content:'책을 읽기 좋고 디저트가 맛있는 카페를 찾고 있습니다.',author:'라떼구름',time:'12분 전',likes:21,comments:8,tags:['질문','카페']},
  {id:'festival',title:'야간축제 공연 관람 정보 정리',content:'공연 시작 시간과 대중교통 막차 정보를 보기 쉽게 정리해 두었습니다.',author:'별빛여행',time:'28분 전',likes:18,comments:6,tags:['생활정보','축제']},
  {id:'walk',title:'호수공원 저녁 산책 후기',content:'해 질 무렵 이응다리 쪽 풍경이 정말 좋았어요. 산책 코스로 추천합니다.',author:'세종바람',time:'1시간 전',likes:15,comments:3,tags:['호수공원','산책']},
  {id:'photo',title:'수련 사진 잘 찍는 방법 공유',content:'빛이 부드러운 오전에 낮은 각도로 촬영하니 색이 정말 예쁘게 나왔습니다.',author:'도담도담',time:'2시간 전',likes:27,comments:11,tags:['촬영팁','수련']},
];
const previewPeople:Array<{id:string;name:string;emoji:string;score:number;subtitle:string;reason:string;tags:string[];signals:Array<{label:string;value:number}>;appearance:CharacterParts}>=[
  {id:'preview-haneul',name:'하늘여우',emoji:'🦊',score:87,subtitle:'자연을 천천히 촬영하는 여행자',reason:'수목원의 식물을 천천히 관찰하고 사진으로 기록한 경험이 비슷해요.',tags:['국립세종수목원 수련 촬영','야간축제 불꽃공연','조용한 감성카페','느린 도보 여행'],signals:[{label:'식물 기록',value:92},{label:'사진 활동',value:88},{label:'여행 방식',value:84}],appearance:{hair:'hair-brown',face:'face-smile',top:'top-coral',topLayer:'top-layer-cream',bottom:'bottom-navy',shoes:'shoes-brown',accessory:'accessory-gold'}},
  {id:'preview-sejong',name:'세종바람',emoji:'📷',score:82,subtitle:'계절 식물과 산책을 기록하는 이웃',reason:'오전 수목원 산책과 계절 식물도감 기록, 카페 후기 활동이 서로 비슷해요.',tags:['계절 식물도감 기록','수목원 오전 산책','여행 사진 정리','카페에서 후기 작성'],signals:[{label:'식물 관심',value:89},{label:'산책 활동',value:83},{label:'기록 습관',value:77}],appearance:{hair:'hair-black',face:'face-calm',top:'top-green',topLayer:'top-layer-sky',bottom:'bottom-beige',shoes:'shoes-brown',accessory:'accessory-navy'}},
];

export function CampusStudentHall({players,matches,onProfile,onDirectChat,onNotice}:{players:PlayerState[];matches:Record<string,MatchResult>;onProfile:(player:PlayerState)=>void;onDirectChat:(player:PlayerState)=>void;onNotice:(message:string)=>void}){
  const [friends,setFriends]=useState<string[]>(()=>{try{const saved=JSON.parse(localStorage.getItem('campus-student-hall-friends')??'[]');return Array.isArray(saved)?saved.filter(value=>typeof value==='string'):[]}catch{return[]}});
  const [boardSort,setBoardSort]=useState<'latest'|'popular'|'tags'>('latest');
  const [boardOpen,setBoardOpen]=useState(false),[boardSearch,setBoardSearch]=useState(''),[boardComposer,setBoardComposer]=useState(false),[boardTitle,setBoardTitle]=useState(''),[boardContent,setBoardContent]=useState('');
  const [boardPosts,setBoardPosts]=useState(initialBoardPosts);
  const [likedBoardPosts,setLikedBoardPosts]=useState<string[]>([]);
  const sortedPosts=useMemo(()=>{
    const keyword=boardSearch.trim().toLocaleLowerCase('ko');
    const filtered=boardPosts.filter(post=>!keyword||[post.title,post.content,post.author,...post.tags].some(value=>value.toLocaleLowerCase('ko').includes(keyword)));
    if(boardSort==='popular')return [...filtered].sort((a,b)=>b.likes-a.likes);
    if(boardSort==='tags')return [...filtered].sort((a,b)=>a.tags[0].localeCompare(b.tags[0],'ko'));
    return filtered;
  },[boardPosts,boardSearch,boardSort]);
  const addFriend=(id:string,name:string)=>{
    setFriends(current=>{const next=current.includes(id)?current:[...current,id];localStorage.setItem('campus-student-hall-friends',JSON.stringify(next));return next});
    onNotice(`${name}님에게 동아리 초대를 보냈어요.`);
  };
  const renderActions=(player:PlayerState)=>{
    const id=player.id,name=player.nickname,added=friends.includes(id);
    return <div className="campus-person-actions campus-student-actions">
      <button type="button" onClick={()=>onProfile(player)}>프로필 보기</button>
      <button type="button" className="primary-action" onClick={()=>onDirectChat(player)}><MessageCircle size={13}/> 1:1 대화 신청</button>
      <button type="button" className={added?'friend-added':''} disabled={added} onClick={()=>addFriend(id,name)}><Users size={13}/> {added?'초대 완료':'동아리 초대'}</button>
      <button type="button" className="campus-tour-request" onClick={()=>onNotice(`${name}님에게 함께 캠퍼스를 둘러보자는 요청을 보냈어요.`)}><Map size={13}/> 함께 둘러보기</button>
    </div>;
  };
  const createBoardPost=()=>{
    if(!boardTitle.trim()||!boardContent.trim())return;
    setBoardPosts(current=>[{id:`board-${Date.now()}`,title:boardTitle.trim(),content:boardContent.trim(),author:'나',time:'방금 전',likes:0,comments:0,tags:['새글']},...current]);
    setBoardTitle('');setBoardContent('');setBoardComposer(false);onNotice('학생회관 게시판에 글을 등록했어요.');
  };
  if(boardOpen)return <section className="campus-board-view">
    <header><div><small>학생회관 자유 게시판</small><h2>캠퍼스 이웃들의 이야기</h2><p>후기·질문·생활 정보를 나누는 공간입니다. 동행 모집은 모집센터를 이용해 주세요.</p></div><button type="button" onClick={()=>setBoardOpen(false)}><X size={15}/> 닫기</button></header>
    <aside className="campus-board-separation"><b>자유게시판</b><span>일상 이야기 · 방문 후기 · 질문 · 생활 정보</span><i>사람을 모으는 글은 모집센터에서 작성해 주세요.</i></aside>
    <div className="campus-board-toolbar"><label><Search size={16}/><input value={boardSearch} onChange={event=>setBoardSearch(event.target.value)} placeholder="제목, 내용, 관심 태그 검색"/></label><nav>{([['latest','최신순'],['popular','인기순'],['tags','관심 태그순']] as const).map(([id,label])=><button type="button" className={boardSort===id?'active':''} onClick={()=>setBoardSort(id)} key={id}>{label}</button>)}</nav><button type="button" className="campus-board-write" onClick={()=>setBoardComposer(value=>!value)}><Plus size={14}/> 글쓰기</button></div>
    {boardComposer&&<section className="campus-board-composer"><input value={boardTitle} onChange={event=>setBoardTitle(event.target.value)} placeholder="제목을 입력하세요"/><textarea value={boardContent} onChange={event=>setBoardContent(event.target.value)} placeholder="캠퍼스 이웃들과 나눌 이야기를 적어보세요."/><div><button type="button" onClick={()=>setBoardComposer(false)}>취소</button><button type="button" onClick={createBoardPost}>등록하기</button></div></section>}
    <div className="campus-board-feed">{sortedPosts.map(post=>{const liked=likedBoardPosts.includes(post.id);return <article key={post.id}><header><span>{post.author.slice(0,1)}</span><div><b>{post.author}</b><small>{post.time} · 학생회관 자유게시판</small></div><i>{post.tags[0]}</i></header><h3>{post.title}</h3><p>{post.content}</p><div className="campus-board-tags">{post.tags.map(tag=><span key={tag}>#{tag}</span>)}</div><footer><button type="button" className={liked?'liked':''} onClick={()=>setLikedBoardPosts(current=>liked?current.filter(id=>id!==post.id):[...current,post.id])}><Heart size={14} fill={liked?'currentColor':'none'}/> 좋아요 {post.likes+(liked?1:0)}</button><button type="button" onClick={()=>onNotice(`${post.title}의 댓글을 준비하고 있어요.`)}><MessageCircle size={14}/> 댓글 {post.comments}</button><span>자유로운 정보와 후기를 나누는 글이에요</span></footer></article>})}{!sortedPosts.length&&<div className="campus-board-empty">검색 결과가 없어요.</div>}</div>
  </section>;
  return <>
    <div className="campus-section-title"><div><small>① 중앙 학생회관 · 만남의 중심</small><h2>나와 잘 맞는 캠퍼스 이웃 추천</h2><p>공동캠퍼스에 처음 들어오면 만나는 메인 공간이에요. 지금까지 저장한 기록을 종합해 추천합니다.</p></div><span className="campus-live"><i/> 현재 활동 중 {players.length}</span></div>
    <section className="campus-student-purpose">
      <div><Sparkles size={19}/><span><small>인공지능 추천에 활용하는 기록</small><b>한 번의 선택보다, 지금까지 쌓인 취향을 함께 봐요</b></span></div>
      <div className="campus-analysis-sources">{analysisSources.map(source=><span key={source}>✓ {source}</span>)}</div>
    </section>
    <div className={`campus-people-grid campus-student-people ${!players.length?'is-preview':''}`}>
      {!players.length?previewPeople.map((person,index)=><article className="campus-person-card campus-preview-person" key={person.id}>
        <div className="campus-person-rank">추천 미리보기 {index+1}</div>
        <div className="campus-preview-label"><Sparkles size={12}/> 가상 이웃 · 실제 접속자가 아닙니다</div>
        <div className="campus-person-main"><CharacterPreview parts={person.appearance} small/><div><h3>{person.emoji} {person.name}</h3><p>{person.subtitle}</p></div><strong>{person.score}<small>%</small></strong></div>
        <div className="campus-match-reason"><Sparkles size={14}/><span><b>{person.name}님과 관심사가 {person.score}% 비슷해요.</b><em>{person.reason}</em></span></div>
        <div className="campus-match-signals">{person.signals.map(signal=><span key={signal.label}><b>{signal.label}</b><i>{signal.value}%</i></span>)}</div>
        <div className="campus-common-title">기록에서 찾은 세부 공통 관심사</div><div className="campus-common-tags campus-precise-tags">{person.tags.map(value=><span key={value}>#{value.replace(/\s+/g,'_')}</span>)}</div>
        <div className="campus-preview-actions campus-student-actions"><button type="button" onClick={()=>onNotice(`${person.name}님은 매칭 결과를 보여주기 위한 추천 사용자입니다.`)}>프로필 보기</button><button type="button" disabled><MessageCircle size={13}/> 1:1 대화 신청</button><button type="button" disabled><Users size={13}/> 동아리 초대</button><button type="button" disabled><Map size={13}/> 함께 둘러보기</button></div>
      </article>):players.map((player,index)=>{const match=matches[player.id],common=[...(match?.sharedExperienceRecords??[]),...(match?.sharedInterests??[]),...(match?.sharedPurposes??[])].slice(0,4);return <article className="campus-person-card" key={player.id}>
        <div className="campus-person-rank">{index===0?'가장 잘 맞는 이웃':`추천 ${index+1}`}</div>
        <div className="campus-person-main"><CharacterPreview parts={player.appearance} small/><div><h3>{player.nickname}</h3><p>{match?`관심사 일치율 ${match.totalScore}%`:'공개 취향을 분석하고 있어요'}</p></div><strong>{match?.totalScore??'–'}<small>%</small></strong></div>
        <div className="campus-activity-line"><i/><span><small>현재 활동</small><b>{player.isMoving?'캠퍼스 이동 중':'학생회관 이용 중'}</b></span></div>
        <div className="campus-match-reason"><Sparkles size={14}/><span><b>{player.nickname}님과 관심사가 {match?.totalScore??0}% 비슷해요.</b><em>{match?.reason??'공개 프로필과 지금까지 저장한 체험 기록을 바탕으로 추천했어요.'}</em><strong>공통 관심사: {common.length?common.map(value=>value.replace(/^.*?:\s*/, '')).join(', '):'새로운 이웃'}</strong></span></div>
        <div className="campus-common-title">공통 관심사</div><div className="campus-common-tags">{common.length?common.map(value=><span key={value}>#{value.replace(/^.*?:\s*/, '')}</span>):<span>#새로운_이웃</span>}</div>
        {renderActions(player)}
      </article>})}
    </div>
    <section className="campus-student-lower is-board-only">
      <article className="campus-student-board"><header><div><small>학생회관 이야기판</small><b>학생회관 자유 게시판</b><p>후기·질문·생활 정보를 나누는 공간이에요. 동행 모집은 모집센터에서 작성해 주세요.</p></div><button type="button" onClick={()=>setBoardOpen(true)}>게시판 열기</button></header>
        <nav aria-label="게시판 정렬">{([['latest','최신순'],['popular','인기순'],['tags','관심 태그순']] as const).map(([id,label])=><button type="button" className={boardSort===id?'active':''} onClick={()=>setBoardSort(id)} key={id}>{label}</button>)}</nav>
        <div>{sortedPosts.slice(0,3).map(post=><button type="button" key={post.id} onClick={()=>setBoardOpen(true)}><span><b>{post.title}</b><small>{post.author} · {post.time}</small></span><em>♥ {post.likes}</em><i>{post.tags.map(tag=>`#${tag}`).join(' ')}</i></button>)}</div>
      </article>
    </section>
  </>;
}
