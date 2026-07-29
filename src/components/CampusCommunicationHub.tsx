import { useEffect,useMemo,useState,type CSSProperties,type FormEvent } from 'react';
import { ArrowRight,Bot,Check,MessageCircle,Plus,Search,Sparkles,Users,X } from 'lucide-react';
import type { PlayerState } from '../../shared/socket-events';
import { API_BASE_URL } from '../config/api';
import type { UserProfile } from '../types';
import { CampusStudentHall } from './CampusStudentHall';
import { CampusClubRoom } from './CampusClubRoom';
import { CampusProjectRoom } from './CampusProjectRoom';
import { CampusRecruitmentCenter } from './CampusRecruitmentCenter';
import './CampusCommunicationHub.css';

export type CampusHubTab='people'|'clubs'|'recruit'|'government';
type MatchResult={totalScore:number;reason:string;sharedInterests:string[];sharedPurposes:string[];sharedExperienceRecords:string[]};
type ClubMember={userId:string;name:string};
type Club={id:string;name:string;description:string;category:string;color:string;ownerId:string;ownerName:string;members:ClubMember[]};
type Recruitment={id:string;author:string;title:string;content:string;likes:number;likedBy:string[];createdAt:string};

const tabs:Array<{id:CampusHubTab;icon:string;label:string;copy:string}>=[
  {id:'people',icon:'🏛️',label:'학생회관',copy:'AI 이웃 추천'},
  {id:'clubs',icon:'🎪',label:'동아리 거리',copy:'AI와 운영하는 모임'},
  {id:'government',icon:'💡',label:'프로젝트실',copy:'목표·일정 함께 만들기'},
  {id:'recruit',icon:'📣',label:'모집센터',copy:'새로운 동행 모집'},
];
const defaultClubs=[
  {name:'세종 축제 기획부',category:'문화·예술',description:'세종의 밤을 빛낼 축제 아이디어를 함께 만들어요.',color:'#e59a52'},
  {name:'식물사진 동아리',category:'문화·예술',description:'계절마다 달라지는 식물과 풍경을 사진으로 기록해요.',color:'#55a879'},
  {name:'세종 맛집 탐방부',category:'친목',description:'동네의 숨은 맛집을 찾고 함께 방문해요.',color:'#dd7b61'},
  {name:'카페 산책부',category:'친목',description:'산책하기 좋은 길과 편안한 카페를 이어 걸어요.',color:'#8b72c8'},
  {name:'스마트도시 연구회',category:'스터디',description:'세종의 도시 기술과 공간을 가볍게 탐구해요.',color:'#438daf'},
  {name:'친환경 여행 동아리',category:'봉사',description:'자연을 아끼며 즐기는 세종 여행법을 나눠요.',color:'#4f9b8c'},
];
const activityOptions=[
  {id:'night-festival',emoji:'🌙',label:'야간축제',copy:'빛과 공연이 있는 밤 산책'},
  {id:'plant-photo',emoji:'📷',label:'식물사진',copy:'수목원에서 계절 기록'},
  {id:'cafe-tour',emoji:'☕',label:'카페투어',copy:'동네 카페와 디저트 탐방'},
  {id:'smart-city',emoji:'🏙️',label:'스마트도시 탐방',copy:'도시 기술과 건축 둘러보기'},
];
const clubEmoji=(name:string)=>name.includes('카페')?'☕':name.includes('맛집')?'🍜':name.includes('친환경')?'🌿':name.includes('스마트')?'🏙️':name.includes('식물')?'🌸':'🎪';
const userIdFor=(name:string)=>`community-user-${name.trim().toLowerCase().replace(/\s+/g,'-')||'anonymous'}`;
const readError=async(response:Response)=>{try{const body=await response.json() as {message?:string;error?:string};return body.message??body.error??'요청을 처리하지 못했어요.'}catch{return '요청을 처리하지 못했어요.'}};

export function CampusCommunicationHub({profile,players,initialTab='people',onClose,onOpenBoard,onProfile,onDirectChat,onClubChat,onTour,onGovernment}:{profile:UserProfile;players:PlayerState[];initialTab?:CampusHubTab;onClose:()=>void;onOpenBoard:()=>void;onProfile:(player:PlayerState)=>void;onDirectChat:(player:PlayerState)=>void;onClubChat:(club:Club)=>void;onTour:(player:PlayerState)=>void;onGovernment:()=>void}){
  const [tab,setTab]=useState<CampusHubTab>(initialTab),[matches,setMatches]=useState<Record<string,MatchResult>>({}),[clubs,setClubs]=useState<Club[]>([]),[recruitments,setRecruitments]=useState<Recruitment[]>([]);
  const [loading,setLoading]=useState(true),[notice,setNotice]=useState(''),[clubComposer,setClubComposer]=useState(false),[recruitComposer,setRecruitComposer]=useState(false);
  const [clubRoom,setClubRoom]=useState<Club|null>(null);
  const [clubName,setClubName]=useState(''),[clubDescription,setClubDescription]=useState(''),[recruitTitle,setRecruitTitle]=useState(''),[recruitTags,setRecruitTags]=useState('자연, 카페, 사진'),[recruitSize,setRecruitSize]=useState('2~4명');
  const [vote,setVote]=useState(()=>localStorage.getItem(`campus-activity-vote:${profile.nickname}`)??'');
  const userId=useMemo(()=>userIdFor(profile.nickname),[profile.nickname]);
  useEffect(()=>setTab(initialTab),[initialTab]);
  useEffect(()=>{let active=true;Promise.all(players.filter(player=>player.matchProfile).map(async player=>{const response=await fetch(`${API_BASE_URL}/matching/score`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({first:profile,second:player.matchProfile})});return [player.id,response.ok?await response.json():null] as const})).then(entries=>{if(active)setMatches(Object.fromEntries(entries.filter((entry):entry is readonly[string,MatchResult]=>Boolean(entry[1]))))}).catch(()=>{});return()=>{active=false}},[players,profile]);
  const loadHub=async()=>{setLoading(true);try{const [clubResponse,postResponse]=await Promise.all([fetch(`${API_BASE_URL}/clubs`),fetch(`${API_BASE_URL}/community`)]);if(clubResponse.ok)setClubs(await clubResponse.json() as Club[]);if(postResponse.ok){const posts=await postResponse.json() as Array<Recruitment&{category:string}>;setRecruitments(posts.filter(post=>post.category==='모임·행사'))}}finally{setLoading(false)}};
  useEffect(()=>{void loadHub()},[]);
  const rankedPlayers=useMemo(()=>[...players].sort((a,b)=>(matches[b.id]?.totalScore??0)-(matches[a.id]?.totalScore??0)),[matches,players]);
  const recommendedRecruitPlayers=rankedPlayers.slice(0,2);
  const joinedClubs=clubs.filter(club=>club.members.some(member=>member.userId===userId));
  const chooseVote=(id:string)=>{setVote(id);localStorage.setItem(`campus-activity-vote:${profile.nickname}`,id);setNotice('투표가 저장됐어요. 정부청사에서 장소를 정할 때 활용할 수 있어요.')};
  const seedClub=async(template:typeof defaultClubs[number])=>{const response=await fetch(`${API_BASE_URL}/clubs`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...template,ownerId:userId,ownerName:profile.nickname})});if(!response.ok)throw new Error(await readError(response));const created=await response.json() as Club;setClubs(current=>[created,...current]);return created};
  const createClub=async(event:FormEvent)=>{event.preventDefault();if(!clubName.trim())return;try{const created=await seedClub({name:clubName,description:clubDescription,category:'친목',color:'#4f9b8c'});setClubName('');setClubDescription('');setClubComposer(false);setClubRoom(created);setNotice('새 동아리방이 열렸어요.')}catch(error){setNotice(error instanceof Error?error.message:'동아리를 만들지 못했어요.')}};
  const joinClub=async(club:Club)=>{try{const response=await fetch(`${API_BASE_URL}/clubs/${club.id}/join`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,userName:profile.nickname})});if(!response.ok)throw new Error(await readError(response));const updated=await response.json() as Club;setClubs(current=>current.map(item=>item.id===updated.id?updated:item));setClubRoom(updated);setNotice(`${club.name}에 가입했어요.`)}catch(error){setNotice(error instanceof Error?error.message:'가입하지 못했어요.')}};
  const createRecruitment=async(event:FormEvent)=>{event.preventDefault();if(!recruitTitle.trim())return;const content=`관심 태그: ${recruitTags.trim()}\n모집 인원: ${recruitSize}\n관심 있어요를 누른 뒤 1대1 대화로 연결해요.`;try{const response=await fetch(`${API_BASE_URL}/community`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({author:profile.nickname,title:recruitTitle,content,category:'모임·행사'})});if(!response.ok)throw new Error(await readError(response));const created=await response.json() as Recruitment;setRecruitments(current=>[created,...current]);setRecruitTitle('');setRecruitComposer(false);setNotice('캠퍼스 광장에 모집 카드가 등록됐어요.')}catch(error){setNotice(error instanceof Error?error.message:'모집 카드를 등록하지 못했어요.')}};
  const toggleInterest=async(item:Recruitment)=>{const response=await fetch(`${API_BASE_URL}/community/${item.id}/like`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId})});if(!response.ok)return setNotice(await readError(response));const result=await response.json() as {likes:number;likedBy:string[];liked:boolean};setRecruitments(current=>current.map(post=>post.id===item.id?{...post,likes:result.likes,likedBy:result.likedBy}:post));setNotice(result.liked?'모집자에게 관심 신호를 보냈어요.':'관심 표시를 취소했어요.')};
  return <div className="campus-hub-overlay"><section className="campus-hub" aria-label="공동캠퍼스 커뮤니케이션 허브">
    <header className="campus-hub-header"><div><span><Users size={18}/></span><div><small>AI COMMUNICATION CAMPUS</small><h1>AI가 사람을 연결하고, 함께 세종을 경험하게 해요</h1><p>취향 분석부터 동아리 운영, 동행 모집, 공동 여행 코스까지 하나의 여정으로 이어집니다.</p></div></div><button type="button" onClick={onClose} aria-label="공동캠퍼스 닫기"><X size={20}/></button></header>
    <div className="campus-hub-body"><nav className="campus-hub-nav">{tabs.map(item=><button type="button" className={tab===item.id?'active':''} onClick={()=>setTab(item.id)} key={item.id}><i>{item.icon}</i><span><b>{item.label}</b><small>{item.copy}</small></span><ArrowRight size={15}/></button>)}<button type="button" className="campus-board-link" onClick={onOpenBoard}><Search size={15}/><span><b>전체 게시판</b><small>글·댓글 자세히 보기</small></span><ArrowRight size={15}/></button><aside><Sparkles size={17}/><div><b>오늘의 캠퍼스</b><span>현재 {players.length+1}명 · 동아리 {clubs.length}개</span></div></aside></nav>
      <main className="campus-hub-content">
        {tab==='people'&&<CampusStudentHall players={rankedPlayers} matches={matches} canInvite={Boolean(joinedClubs.length)} onProfile={onProfile} onDirectChat={onDirectChat} onInvite={player=>onClubChat({...joinedClubs[0],members:[...joinedClubs[0].members,{userId:player.id,name:player.nickname}]})} onTour={onTour} onOpenBoard={onOpenBoard} onExploreClubs={()=>setTab('clubs')} onNotice={setNotice}/>}
        {tab==='clubs'&&(clubRoom?<CampusClubRoom club={clubRoom} onBack={()=>setClubRoom(null)} onOpenChat={()=>onClubChat(clubRoom)}/>:<><div className="campus-section-title"><div><small>② 동아리관 · CLUB COMMUNITY</small><h2>관심사가 비슷한 사람들과 지속적으로 활동해요</h2><p>학생회관에서 만난 이웃과 함께 가입하고, 장소와 일정부터 사진과 후기까지 이어갑니다.</p></div><button type="button" className="campus-create-button" onClick={()=>setClubComposer(value=>!value)}><Plus size={15}/> 동아리 만들기</button></div>{clubComposer&&<form className="campus-inline-form" onSubmit={createClub}><input value={clubName} onChange={event=>setClubName(event.target.value)} placeholder="동아리 이름"/><input value={clubDescription} onChange={event=>setClubDescription(event.target.value)} placeholder="어떤 활동을 함께하나요?"/><button>만들기</button></form>}<div className="campus-club-grid">{clubs.map((club,index)=>{const joined=club.members.some(member=>member.userId===userId),suggestion=activityOptions[index%activityOptions.length];return <article key={club.id} style={{'--club-color':club.color} as CSSProperties}><span>{club.category}</span><div className="campus-club-icon">{clubEmoji(club.name)}</div><h3>{club.name}</h3><p>{club.description}</p><small><Users size={13}/> 멤버 {club.members.length}명 · {club.ownerName}</small><aside className="campus-ai-helper"><b><Bot size={13}/> AI 운영 도우미</b><p>인기 기록 · {suggestion.copy}</p><button type="button" className={vote===suggestion.id?'selected':''} onClick={()=>chooseVote(suggestion.id)}>{vote===suggestion.id?<Check size={12}/>:<Sparkles size={12}/>} {suggestion.label} 제안에 투표</button></aside><button type="button" className={joined?'joined':''} onClick={()=>joined?setClubRoom(club):void joinClub(club)}>{joined?<><MessageCircle size={14}/> 동아리방 입장</>:<><Plus size={14}/> 가입하기</>}</button></article>})}{!loading&&defaultClubs.filter(template=>!clubs.some(club=>club.name===template.name)).map((template,index)=>{const suggestion=activityOptions[index%activityOptions.length];return <article className="campus-club-template" key={template.name} style={{'--club-color':template.color} as CSSProperties}><span>{template.category}</span><div className="campus-club-icon">{clubEmoji(template.name)}</div><h3>{template.name}</h3><p>{template.description}</p><aside className="campus-ai-helper"><b><Bot size={13}/> AI 운영 도우미</b><p>추천 주제 · {suggestion.copy}</p></aside><button type="button" onClick={()=>void seedClub(template).then(setClubRoom)}><Plus size={14}/> 가입하고 동아리방 열기</button></article>})}</div></>)}
        {tab==='government'&&<CampusProjectRoom onGovernment={onGovernment} onNotice={setNotice}/>}
        {tab==='recruit'&&<CampusRecruitmentCenter items={recruitments} loading={loading} userId={userId} composer={recruitComposer?<form className="campus-recruit-form" onSubmit={createRecruitment}><label>모집 문구<input value={recruitTitle} onChange={event=>setRecruitTitle(event.target.value)} placeholder="주말에 세종 카페와 수목원을 함께 가실 분?"/></label><label>관심 태그<input value={recruitTags} onChange={event=>setRecruitTags(event.target.value)} placeholder="자연, 카페, 사진"/></label><label>모집 인원<select value={recruitSize} onChange={event=>setRecruitSize(event.target.value)}><option>2명</option><option>2~4명</option><option>3~5명</option><option>제한 없음</option></select></label><button>모집센터에 등록</button></form>:undefined} onToggleComposer={()=>setRecruitComposer(value=>!value)} onToggleInterest={item=>void toggleInterest(item)} recommended={recommendedRecruitPlayers[0]} onChat={onDirectChat} onNotice={setNotice} onGovernment={onGovernment}/>}
      </main>
    </div>
    {notice&&<button type="button" className="campus-hub-notice" onClick={()=>setNotice('')}>{notice}<X size={13}/></button>}
  </section></div>;
}
