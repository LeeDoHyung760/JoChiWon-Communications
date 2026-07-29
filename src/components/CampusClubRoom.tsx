import { Bell,Camera,ChevronLeft,Image,MessageCircle,Send,Users } from 'lucide-react';
import { useState,type CSSProperties,type FormEvent } from 'react';

type ClubRoomData={id:string;name:string;description:string;category:string;color:string;ownerName:string;members:Array<{userId:string;name:string}>};
type RoomTab='intro'|'notices'|'chat'|'album'|'board'|'members';

const tabs:Array<{id:RoomTab;label:string}>=[
  {id:'intro',label:'소개'},{id:'notices',label:'공지사항'},{id:'chat',label:'단체 채팅'},{id:'album',label:'사진 앨범'},{id:'board',label:'게시판'},{id:'members',label:'멤버 목록'},
];
const activities=[
  ['📍','가고 싶은 장소 투표'],['✨','AI 추천 장소 공유'],['📷','사진 업로드'],['📝','여행 후기 작성'],['🎉','축제 일정 공유'],
];

export function CampusClubRoom({club,onBack,onOpenChat}:{club:ClubRoomData;onBack:()=>void;onOpenChat:()=>void}){
  const [tab,setTab]=useState<RoomTab>('intro');
  const [vote,setVote]=useState('');
  const [albumCount,setAlbumCount]=useState(3);
  const [posts,setPosts]=useState(['이번 주말 수목원 산책 코스 어때요?','야간축제 일정 공유합니다!']);
  const [post,setPost]=useState('');
  const submitPost=(event:FormEvent)=>{event.preventDefault();const value=post.trim();if(!value)return;setPosts(current=>[value,...current]);setPost('')};
  return <section className="campus-club-room" style={{'--club-room-color':club.color} as CSSProperties}>
    <header><button type="button" onClick={onBack}><ChevronLeft size={15}/> 동아리관</button><div><small>{club.category} · CLUB ROOM</small><h2>{club.name}</h2><p>{club.description}</p></div><span><Users size={13}/> {club.members.length}명</span></header>
    <nav aria-label="동아리방 메뉴">{tabs.map(item=><button type="button" key={item.id} className={tab===item.id?'active':''} onClick={()=>setTab(item.id)}>{item.label}</button>)}</nav>
    <div className="campus-club-room-layout"><main>
      {tab==='intro'&&<div className="club-room-intro"><span>☕</span><small>우리 동아리를 소개합니다</small><h3>{club.name}</h3><p>{club.description}</p><dl><div><dt>운영자</dt><dd>{club.ownerName}</dd></div><div><dt>주요 활동</dt><dd>세종 곳곳을 함께 경험하고 기록하기</dd></div><div><dt>모임 분위기</dt><dd>부담 없이 제안하고 천천히 친해지는 모임</dd></div></dl></div>}
      {tab==='notices'&&<div className="club-room-notices"><article><Bell size={15}/><div><b>이번 달 정기 모임 안내</b><p>토요일 오후 2시, 학생회관 앞에서 만나요.</p><small>운영자 · 고정 공지</small></div></article><article><Bell size={15}/><div><b>사진과 여행 후기 공유 방법</b><p>활동 후 앨범과 게시판에 자유롭게 기록해 주세요.</p><small>3일 전</small></div></article></div>}
      {tab==='chat'&&<div className="club-room-chat"><MessageCircle size={34}/><h3>동아리 단체 채팅</h3><p>멤버들과 다음 활동과 장소를 실시간으로 이야기해요.</p><button type="button" onClick={onOpenChat}>단체 채팅방 열기 <Send size={14}/></button></div>}
      {tab==='album'&&<div className="club-room-album"><header><div><Image size={16}/><span><b>함께 만든 사진 앨범</b><small>활동의 순간을 차곡차곡 모아요.</small></span></div><button type="button" onClick={()=>setAlbumCount(count=>count+1)}><Camera size={13}/> 사진 업로드</button></header><div>{Array.from({length:albumCount},(_,index)=><figure key={index}><span>{['🌿','☕','🌙','📷'][index%4]}</span><figcaption>{['수목원 산책','감성 카페 탐방','야간축제 기록','새로운 활동 사진'][index%4]}</figcaption></figure>)}</div></div>}
      {tab==='board'&&<div className="club-room-board"><form onSubmit={submitPost}><input value={post} onChange={event=>setPost(event.target.value)} placeholder="동아리 멤버들과 나눌 이야기를 적어보세요."/><button>등록</button></form>{posts.map((item,index)=><article key={`${item}-${index}`}><b>{item}</b><small>{index===0?'방금 전':`${index+1}일 전`} · 댓글 {index+2}</small></article>)}</div>}
      {tab==='members'&&<div className="club-room-members">{club.members.length?club.members.map((member,index)=><article key={member.userId}><span>{member.name.slice(0,1)}</span><div><b>{member.name}</b><small>{index===0?'운영자':'동아리 멤버'} · 현재 활동 중</small></div><i/></article>):<p>첫 멤버를 기다리고 있어요.</p>}</div>}
    </main><aside><small>TOGETHER ACTIVITY</small><h3>함께 하는 활동</h3><p>멤버들과 다음 경험을 정하고 기록해요.</p>{activities.map(([emoji,label])=><button type="button" key={label} className={vote===label?'selected':''} onClick={()=>setVote(label)}><span>{emoji}</span><b>{label}</b><i>{vote===label?'선택됨':'›'}</i></button>)}</aside></div>
  </section>;
}
