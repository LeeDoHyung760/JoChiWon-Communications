import {
  Bell,Camera,ChevronLeft,Image,Lightbulb,MapPin,MessageCircle,
  Send,Share2,Sparkles,Users,Vote,
} from 'lucide-react';
import { useState,type CSSProperties,type FormEvent } from 'react';
import { API_BASE_URL } from '../config/api';

type ActivityVoter={userId:string;name:string};
export type ClubActivityBoard={
  placeVotes:Array<{option:string;voters:ActivityVoter[]}>;
  topicVotes:Array<{option:string;voters:ActivityVoter[]}>;
  themeIdeas:Array<{id:string;author:string;text:string;createdAt:string}>;
  placeCards:Array<{id:string;author:string;name:string;reason:string;createdAt:string}>;
  introCopies:Array<{id:string;author:string;text:string;createdAt:string}>;
};
type ClubRoomData={
  id:string;name:string;description:string;category:string;color:string;ownerName:string;
  members:Array<{userId:string;name:string}>;activity?:string;location?:string;schedule?:string;
  tags?:string[];activityBoard?:ClubActivityBoard;
};
type RoomTab='intro'|'activities'|'notices'|'chat'|'album'|'board'|'members';
type ActivityFocus='place'|'theme'|'topic'|'share'|'intro';

const tabs:Array<{id:RoomTab;label:string}>=[
  {id:'intro',label:'소개'},{id:'activities',label:'공동 활동'},{id:'notices',label:'공지사항'},
  {id:'chat',label:'단체 채팅'},{id:'album',label:'사진 앨범'},{id:'board',label:'게시판'},{id:'members',label:'멤버 목록'},
];
const placeOptions=['국립세종수목원','세종호수공원','이응다리','조치원전통시장'];
const topicOptions=['야간축제','식물사진','카페투어','스마트도시 탐방'];
const emptyBoard=():ClubActivityBoard=>({
  placeVotes:placeOptions.map(option=>({option,voters:[]})),
  topicVotes:topicOptions.map(option=>({option,voters:[]})),
  themeIdeas:[],placeCards:[],introCopies:[],
});
const activityLinks:Array<{id:ActivityFocus;emoji:string;label:string}>=[
  {id:'place',emoji:'📍',label:'가고 싶은 장소 투표'},
  {id:'theme',emoji:'✨',label:'축제 테마 아이디어 등록'},
  {id:'topic',emoji:'🧭',label:'세종 여행 주제 선택'},
  {id:'share',emoji:'🗺️',label:'추천 장소 카드 공유'},
  {id:'intro',emoji:'✍️',label:'동아리 소개 문구 만들기'},
];

export function CampusClubRoom({
  club,currentUser,onBack,onOpenChat,onNotice,
}:{
  club:ClubRoomData;currentUser:{userId:string;name:string};onBack:()=>void;onOpenChat:()=>void;
  onNotice:(message:string)=>void;
}){
  const [tab,setTab]=useState<RoomTab>('intro');
  const [focus,setFocus]=useState<ActivityFocus>('place');
  const [board,setBoard]=useState<ClubActivityBoard>(club.activityBoard??emptyBoard());
  const [saving,setSaving]=useState(false);
  const [themeIdea,setThemeIdea]=useState('');
  const [placeName,setPlaceName]=useState('');
  const [placeReason,setPlaceReason]=useState('');
  const [introTone,setIntroTone]=useState('따뜻하고 편안한');
  const [introCopy,setIntroCopy]=useState('');
  const [albumCount,setAlbumCount]=useState(3);
  const [posts,setPosts]=useState(['이번 주말 수목원 산책 코스 어때요?','야간축제 일정 공유합니다!']);
  const [post,setPost]=useState('');

  const request=async(path:string,method:'PUT'|'POST',payload:Record<string,string>)=>{
    setSaving(true);
    try{
      const response=await fetch(`${API_BASE_URL}/clubs/${encodeURIComponent(club.id)}/${path}`,{
        method,headers:{'Content-Type':'application/json'},
        body:JSON.stringify({...payload,userId:currentUser.userId,userName:currentUser.name,author:currentUser.name}),
      });
      const result=await response.json() as ClubActivityBoard|{message?:string};
      if(!response.ok)throw new Error('message' in result&&result.message?result.message:'공동 활동을 저장하지 못했어요.');
      setBoard(result as ClubActivityBoard);
      return result as ClubActivityBoard;
    }catch(error){
      onNotice(error instanceof Error?error.message:'네트워크 연결을 확인해 주세요.');
      return null;
    }finally{setSaving(false)}
  };
  const saveGovernmentContext=(key:'place'|'topic',value:string)=>{
    const storageKey=`campus-club-government-context:${currentUser.name}`;
    let previous:Record<string,string>={};
    try{previous=JSON.parse(localStorage.getItem(storageKey)??'{}') as Record<string,string>}catch{previous={}}
    localStorage.setItem(storageKey,JSON.stringify({...previous,[key]:value,clubName:club.name,updatedAt:new Date().toISOString()}));
    if(key==='topic')localStorage.setItem(`campus-activity-vote:${currentUser.name}`,value);
  };
  const castVote=async(kind:'place'|'topic',option:string)=>{
    const result=await request('activity-vote','PUT',{kind,option});
    if(!result)return;
    saveGovernmentContext(kind,option);
    onNotice(`${option} 선택을 저장했어요. 정부청사에서 함께 장소를 정할 때 이어서 볼 수 있어요.`);
  };
  const submitTheme=async(event:FormEvent)=>{
    event.preventDefault();const text=themeIdea.trim();if(!text)return;
    if(await request('theme-ideas','POST',{text})){setThemeIdea('');onNotice('축제 테마 아이디어를 등록했어요.')}
  };
  const submitPlace=async(event:FormEvent)=>{
    event.preventDefault();const name=placeName.trim(),reason=placeReason.trim();if(!name||!reason)return;
    if(await request('place-cards','POST',{name,reason})){setPlaceName('');setPlaceReason('');onNotice('추천 장소 카드를 공유했어요.')}
  };
  const makeIntro=()=>{
    const keyTopics=board.topicVotes.slice().sort((a,b)=>b.voters.length-a.voters.length).filter(item=>item.voters.length).slice(0,2).map(item=>item.option);
    const interests=[...(club.tags??[]),...keyTopics].slice(0,3).join(' · ')||club.activity||'세종의 새로운 경험';
    setIntroCopy(`${club.name}은 ${interests}에 관심 있는 이웃들이 모여, ${introTone} 분위기로 함께 경험하고 이야기하는 동아리입니다.`);
  };
  const shareIntro=async()=>{
    const text=introCopy.trim();if(!text)return;
    if(await request('intro-copies','POST',{text}))onNotice('소개 문구를 동아리 활동판에 저장했어요.');
  };
  const openActivity=(id:ActivityFocus)=>{setFocus(id);setTab('activities')};
  const submitPost=(event:FormEvent)=>{event.preventDefault();const value=post.trim();if(!value)return;setPosts(current=>[value,...current]);setPost('')};
  const voterCount=(items:ClubActivityBoard['placeVotes'])=>Math.max(1,...items.map(item=>item.voters.length));

  return <section className="campus-club-room" style={{'--club-room-color':club.color} as CSSProperties}>
    <header><button type="button" onClick={onBack}><ChevronLeft size={15}/> 동아리관</button><div><small>{club.category} · 동아리방</small><h2>{club.name}</h2><p>{club.description}</p></div><span><Users size={13}/> {club.members.length}명</span></header>
    <nav aria-label="동아리방 메뉴">{tabs.map(item=><button type="button" key={item.id} className={tab===item.id?'active':''} onClick={()=>setTab(item.id)}>{item.label}</button>)}</nav>
    <div className={`campus-club-room-layout ${tab==='activities'?'is-activities':''}`}><main>
      {tab==='intro'&&<div className="club-room-intro"><span>☕</span><small>우리 동아리를 소개합니다</small><h3>{club.name}</h3><p>{club.description}</p><dl><div><dt>운영자</dt><dd>{club.ownerName}</dd></div><div><dt>주요 활동</dt><dd>{club.activity||'세종 곳곳을 함께 경험하고 기록하기'}</dd></div><div><dt>모임 정보</dt><dd>{club.location||'세종 공동캠퍼스'} · {club.schedule||'일정 협의'}</dd></div></dl></div>}
      {tab==='activities'&&<div className="club-activity-board">
        <header><div><small>가볍게 참여하는 공동 활동</small><h3>이야기하며 다음 모임을 함께 정해요</h3></div><span><Sparkles size={13}/> 결과는 정부청사 계획에 연결됩니다</span></header>
        <div className="club-activity-sections">
          <article className={focus==='place'?'focused':''} id="club-place-vote"><div className="club-activity-title"><MapPin size={16}/><div><b>가고 싶은 장소 투표</b><small>이번 모임의 후보 장소를 골라주세요.</small></div></div><div className="club-vote-list">{board.placeVotes.map(item=>{const selected=item.voters.some(voter=>voter.userId===currentUser.userId);return <button type="button" className={selected?'selected':''} disabled={saving} key={item.option} onClick={()=>void castVote('place',item.option)}><span>{item.option}<small>{item.voters.map(voter=>voter.name).join(', ')||'첫 표를 기다려요'}</small></span><b>{item.voters.length}표</b><i style={{'--vote-width':`${item.voters.length/voterCount(board.placeVotes)*100}%`} as CSSProperties}/></button>})}</div></article>
          <article className={focus==='topic'?'focused':''} id="club-topic-vote"><div className="club-activity-title"><Vote size={16}/><div><b>세종 여행 주제 선택</b><small>장소를 고를 때 기준이 되는 주제예요.</small></div></div><div className="club-topic-options">{board.topicVotes.map(item=><button type="button" className={item.voters.some(voter=>voter.userId===currentUser.userId)?'selected':''} disabled={saving} key={item.option} onClick={()=>void castVote('topic',item.option)}><span>{item.option}</span><b>{item.voters.length}</b></button>)}</div></article>
          <article className={focus==='theme'?'focused':''}><div className="club-activity-title"><Lightbulb size={16}/><div><b>축제 테마 아이디어</b><small>한 문장으로 편하게 제안해 보세요.</small></div></div><form className="club-inline-form" onSubmit={submitTheme}><input maxLength={80} value={themeIdea} onChange={event=>setThemeIdea(event.target.value)} placeholder="예: 별빛 아래 식물 사진전"/><button disabled={saving}>등록</button></form><div className="club-idea-list">{board.themeIdeas.length?board.themeIdeas.slice(0,3).map(item=><p key={item.id}><span>💡 {item.text}</span><small>{item.author}</small></p>):<p className="empty">첫 아이디어를 남겨주세요.</p>}</div></article>
          <article className={focus==='share'?'focused':''}><div className="club-activity-title"><Share2 size={16}/><div><b>추천 장소 카드 공유</b><small>장소와 추천 이유를 함께 알려주세요.</small></div></div><form className="club-place-form" onSubmit={submitPlace}><input maxLength={30} value={placeName} onChange={event=>setPlaceName(event.target.value)} placeholder="장소 이름"/><input maxLength={80} value={placeReason} onChange={event=>setPlaceReason(event.target.value)} placeholder="추천하는 이유"/><button disabled={saving}>공유</button></form><div className="club-place-cards">{board.placeCards.length?board.placeCards.slice(0,2).map(item=><p key={item.id}><MapPin size={12}/><span><b>{item.name}</b><small>{item.reason} · {item.author}</small></span></p>):<p className="empty">공유된 장소가 아직 없어요.</p>}</div></article>
          <article className={`club-intro-maker ${focus==='intro'?'focused':''}`}><div className="club-activity-title"><Sparkles size={16}/><div><b>동아리 소개 문구 만들기</b><small>선택한 주제와 동아리 정보를 바탕으로 함께 다듬어요.</small></div></div><div className="club-intro-controls"><select value={introTone} onChange={event=>setIntroTone(event.target.value)}><option>따뜻하고 편안한</option><option>활기차고 유쾌한</option><option>차분하고 진지한</option></select><button type="button" onClick={makeIntro}>문구 만들기</button><textarea value={introCopy} onChange={event=>setIntroCopy(event.target.value)} placeholder="만들어진 소개 문구를 자유롭게 다듬어 보세요."/>{introCopy&&<button type="button" disabled={saving} onClick={()=>void shareIntro()}>활동판에 저장</button>}</div>{board.introCopies[0]&&<p className="club-latest-intro"><b>최근 저장 문구</b><span>{board.introCopies[0].text}</span></p>}</article>
        </div>
      </div>}
      {tab==='notices'&&<div className="club-room-notices"><article><Bell size={15}/><div><b>이번 달 정기 모임 안내</b><p>토요일 오후 2시, 학생회관 앞에서 만나요.</p><small>운영자 · 고정 공지</small></div></article><article><Bell size={15}/><div><b>사진과 여행 후기 공유 방법</b><p>활동 후 앨범과 게시판에 자유롭게 기록해 주세요.</p><small>3일 전</small></div></article></div>}
      {tab==='chat'&&<div className="club-room-chat"><MessageCircle size={34}/><h3>동아리 단체 채팅</h3><p>멤버들과 다음 활동과 장소를 실시간으로 이야기해요.</p><button type="button" onClick={onOpenChat}>단체 채팅방 열기 <Send size={14}/></button></div>}
      {tab==='album'&&<div className="club-room-album"><header><div><Image size={16}/><span><b>함께 만든 사진 앨범</b><small>활동의 순간을 차곡차곡 모아요.</small></span></div><button type="button" onClick={()=>setAlbumCount(count=>count+1)}><Camera size={13}/> 사진 업로드</button></header><div>{Array.from({length:albumCount},(_,index)=><figure key={index}><span>{['🌿','☕','🌙','📷'][index%4]}</span><figcaption>{['수목원 산책','감성 카페 탐방','야간축제 기록','새로운 활동 사진'][index%4]}</figcaption></figure>)}</div></div>}
      {tab==='board'&&<div className="club-room-board"><form onSubmit={submitPost}><input value={post} onChange={event=>setPost(event.target.value)} placeholder="동아리 멤버들과 나눌 이야기를 적어보세요."/><button>등록</button></form>{posts.map((item,index)=><article key={`${item}-${index}`}><b>{item}</b><small>{index===0?'방금 전':`${index+1}일 전`} · 댓글 {index+2}</small></article>)}</div>}
      {tab==='members'&&<div className="club-room-members">{club.members.length?club.members.map((member,index)=><article key={member.userId}><span>{member.name.slice(0,1)}</span><div><b>{member.name}</b><small>{index===0?'운영자':'동아리 멤버'} · 현재 활동 중</small></div><i/></article>):<p>첫 멤버를 기다리고 있어요.</p>}</div>}
    </main><aside><small>함께하는 활동</small><h3>공동 활동</h3><p>투표하고 제안하며 다음 경험을 함께 만들어요.</p>{activityLinks.map(item=><button type="button" key={item.id} className={tab==='activities'&&focus===item.id?'selected':''} onClick={()=>openActivity(item.id)}><span>{item.emoji}</span><b>{item.label}</b><i>›</i></button>)}</aside></div>
  </section>;
}
