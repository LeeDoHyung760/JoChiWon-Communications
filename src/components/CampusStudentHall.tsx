import { MessageCircle,Plus,Sparkles,UserPlus,Users } from 'lucide-react';
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

const analysisSources=['관심 축제','좋아하는 음식·카페','수목원 대표 식물','감정 기록','여행 스타일','좋아하는 활동','가보고 싶은 장소','방문 목적','커뮤니티 활동 기록'];
const recommendedClubs=[
  {emoji:'🌸',name:'식물사진 동아리',copy:'대표 식물과 사진 관심사를 바탕으로 추천'},
  {emoji:'☕',name:'카페 산책부',copy:'감성 카페와 느린 여행 취향을 바탕으로 추천'},
  {emoji:'🏙️',name:'스마트도시 연구회',copy:'가보고 싶은 장소와 도시 관심사를 바탕으로 추천'},
];
const boardPosts=[
  {id:'garden',title:'오늘 수목원 가시는 분?',author:'초록산책',time:'방금 전',likes:12,tags:['수목원','식물']},
  {id:'cafe',title:'세종 카페 추천해주세요.',author:'라떼구름',time:'12분 전',likes:21,tags:['카페','맛집']},
  {id:'festival',title:'야간축제 같이 보실 분!',author:'별빛여행',time:'28분 전',likes:18,tags:['야간축제','동행']},
];
const demoAppearance={hair:'hair-brown',face:'face-smile',top:'top-coral',topLayer:'top-layer-cream',bottom:'bottom-navy',shoes:'shoes-brown',accessory:'accessory-gold'} satisfies CharacterParts;

export function CampusStudentHall({players,matches,canInvite,onProfile,onDirectChat,onInvite,onTour,onOpenBoard,onExploreClubs,onNotice}:{players:PlayerState[];matches:Record<string,MatchResult>;canInvite:boolean;onProfile:(player:PlayerState)=>void;onDirectChat:(player:PlayerState)=>void;onInvite:(player:PlayerState)=>void;onTour:(player:PlayerState)=>void;onOpenBoard:()=>void;onExploreClubs:()=>void;onNotice:(message:string)=>void}){
  const [friends,setFriends]=useState<string[]>(()=>{try{const saved=JSON.parse(localStorage.getItem('campus-student-hall-friends')??'[]');return Array.isArray(saved)?saved.filter(value=>typeof value==='string'):[]}catch{return[]}});
  const [boardSort,setBoardSort]=useState<'latest'|'popular'|'tags'>('latest');
  const sortedPosts=useMemo(()=>{
    if(boardSort==='popular')return [...boardPosts].sort((a,b)=>b.likes-a.likes);
    if(boardSort==='tags')return [...boardPosts].sort((a,b)=>a.tags[0].localeCompare(b.tags[0],'ko'));
    return boardPosts;
  },[boardSort]);
  const addFriend=(id:string,name:string)=>{
    setFriends(current=>{const next=current.includes(id)?current:[...current,id];localStorage.setItem('campus-student-hall-friends',JSON.stringify(next));return next});
    onNotice(`${name}님을 친구로 추가했어요.`);
  };
  const renderActions=(player?:PlayerState)=>{
    const id=player?.id??'demo-haneul-fox',name=player?.nickname??'하늘여우',added=friends.includes(id);
    return <div className="campus-person-actions campus-student-actions">
      <button type="button" onClick={()=>player?onProfile(player):onNotice('하늘여우님의 공개 프로필 예시를 확인했어요.')}>프로필 보기</button>
      <button type="button" className="primary-action" onClick={()=>player?onDirectChat(player):onNotice('실제 사용자가 접속하면 1:1 대화를 신청할 수 있어요.')}><MessageCircle size={13}/> 1:1 대화 신청</button>
      <button type="button" className={added?'friend-added':''} disabled={added} onClick={()=>addFriend(id,name)}><UserPlus size={13}/> {added?'친구 추가됨':'친구 추가'}</button>
      <button type="button" disabled={!canInvite} title={canInvite?'가입한 동아리로 초대합니다.':'먼저 동아리에 가입해 주세요.'} onClick={()=>player?onInvite(player):onNotice(canInvite?'하늘여우님에게 동아리 초대 예시를 보냈어요.':'먼저 동아리에 가입해 주세요.')}>동아리 초대</button>
      <button type="button" className="campus-tour-action" onClick={()=>player?onTour(player):onNotice('함께 캠퍼스 둘러보기 제안을 보냈어요.')}>함께 캠퍼스 둘러보기</button>
    </div>;
  };
  return <>
    <div className="campus-section-title"><div><small>① 중앙 학생회관 · MAIN HUB</small><h2>AI가 찾아준, 나와 잘 맞는 캠퍼스 이웃</h2><p>공동캠퍼스에 처음 들어오면 만나는 메인 공간이에요. 지금까지 저장한 기록을 종합해 추천합니다.</p></div><span className="campus-live"><i/> 현재 활동 중 {players.length}</span></div>
    <section className="campus-student-purpose">
      <div><Sparkles size={19}/><span><small>AI 추천에 활용하는 기록</small><b>한 번의 선택보다, 지금까지 쌓인 취향을 함께 봐요</b></span></div>
      <div className="campus-analysis-sources">{analysisSources.map(source=><span key={source}>✓ {source}</span>)}</div>
    </section>
    <div className="campus-people-grid campus-student-people">
      {!players.length?<article className="campus-person-card campus-featured-person">
        <div className="campus-person-rank">AI 추천 예시</div>
        <div className="campus-person-main"><CharacterPreview parts={demoAppearance} small/><div><h3>🦊 하늘여우</h3><p>자연을 천천히 감상하는 여행자</p></div><strong>87<small>%</small></strong></div>
        <div className="campus-activity-line"><i/><span><small>현재 활동</small><b>학생회관 이용 중</b></span></div>
        <div className="campus-match-reason"><Sparkles size={14}/><span><b>AI 추천 이유</b>두 분 모두 자연을 천천히 감상하는 여행을 선호하며 야간축제와 카페에 높은 관심을 보였습니다.</span></div>
        <div className="campus-common-title">공통 관심사</div><div className="campus-common-tags">{['야간축제','수련','감성카페','사진 촬영'].map(value=><span key={value}>#{value}</span>)}</div>
        {renderActions()}
      </article>:players.map((player,index)=>{const match=matches[player.id],common=[...(match?.sharedExperienceRecords??[]),...(match?.sharedInterests??[]),...(match?.sharedPurposes??[])].slice(0,4);return <article className="campus-person-card" key={player.id}>
        <div className="campus-person-rank">{index===0?'BEST MATCH':`추천 ${index+1}`}</div>
        <div className="campus-person-main"><CharacterPreview parts={player.appearance} small/><div><h3>{player.nickname}</h3><p>{match?`관심사 일치율 ${match.totalScore}%`:'공개 취향을 분석하고 있어요'}</p></div><strong>{match?.totalScore??'–'}<small>%</small></strong></div>
        <div className="campus-activity-line"><i/><span><small>현재 활동</small><b>{player.isMoving?'캠퍼스 이동 중':'학생회관 이용 중'}</b></span></div>
        <div className="campus-match-reason"><Sparkles size={14}/><span><b>AI 추천 이유</b>{match?.reason??'공개 프로필과 지금까지 저장한 체험 기록을 바탕으로 추천했어요.'}</span></div>
        <div className="campus-common-title">공통 관심사</div><div className="campus-common-tags">{common.length?common.map(value=><span key={value}>#{value.replace(/^.*?:\s*/, '')}</span>):<span>#새로운_이웃</span>}</div>
        {renderActions(player)}
      </article>})}
    </div>
    <section className="campus-student-lower">
      <article className="campus-recommended-clubs"><header><span><Users size={16}/></span><div><small>AI CURATED CLUBS</small><b>오늘의 추천 동아리</b><p>프로필과 활동 기록에 잘 맞는 모임이에요.</p></div></header>{recommendedClubs.map(club=><button type="button" key={club.name} onClick={onExploreClubs}><span>{club.emoji}</span><div><b>{club.name}</b><small>{club.copy}</small></div><Plus size={14}/></button>)}</article>
      <article className="campus-student-board"><header><div><small>STUDENT HALL BOARD</small><b>학생회관 자유 게시판</b><p>현재 접속 중인 학생들과 자유롭게 이야기를 나눠보세요.</p></div><button type="button" onClick={onOpenBoard}>전체 게시판</button></header>
        <nav aria-label="게시판 정렬">{([['latest','최신순'],['popular','인기순'],['tags','관심 태그순']] as const).map(([id,label])=><button type="button" className={boardSort===id?'active':''} onClick={()=>setBoardSort(id)} key={id}>{label}</button>)}</nav>
        <div>{sortedPosts.map(post=><button type="button" key={post.id} onClick={onOpenBoard}><span><b>{post.title}</b><small>{post.author} · {post.time}</small></span><em>♥ {post.likes}</em><i>{post.tags.map(tag=>`#${tag}`).join(' ')}</i></button>)}</div>
      </article>
    </section>
  </>;
}
