import { useEffect,useMemo,useState,type CSSProperties } from 'react';
import { ArrowLeft,BriefcaseBusiness,Camera,ChevronDown,Clock3,Coffee,MapPin,MessageCircle,Radio,Sparkles,TreePine,UserPlus,Users,X } from 'lucide-react';
import type { ChatMessage,GroupRoom,PlayerState } from '../../shared/socket-events';
import type { UserProfile } from '../types';
import { gameEvents } from '../game/events';
import { loadProjectRoomProjects,type Project } from '../services/projectRoomProjects';
import smartCityPreview from '../assets/maps/sejong-smartcity-exhibition-preview.png';
import gardenPreview from '../assets/maps/government-central-plaza-top-preview.png';
import festivalPreview from '../assets/maps/club-street-festival-map-preview.png';
import projectRoomPreview from '../assets/maps/project-room-preview.png';
import './StudentHallBoards.css';

type BoardId='occupancy'|'activity';
type ScreenPoint={x:number;y:number};
type ScreenRect={left:number;top:number;width:number;height:number;quad?:readonly [ScreenPoint,ScreenPoint,ScreenPoint,ScreenPoint]};
type BoardRects=Partial<Record<BoardId,ScreenRect>>;
type InterestKey='smart'|'festival'|'nature'|'cafe'|'photo';
type CampusDetail='people'|'projects'|'groups'|'feed';
type ActivityDetail='activities'|'groups'|'schedule'|'members'|'hotspots';
// The authored GLB boards are portrait surfaces (roughly 4.6:5.56).
// Matching that source aspect here prevents the perspective transform from
// stretching text and icons vertically when the board fills the camera.
const BOARD_WIDTH=900,BOARD_HEIGHT=1088;
const interests:Array<{id:InterestKey;label:string;pattern:RegExp}>=[
  {id:'smart',label:'스마트도시',pattern:/스마트|도시|기술|AI/i},
  {id:'festival',label:'축제 · 행사',pattern:/축제|행사|공연|문화/i},
  {id:'nature',label:'수목원 · 자연',pattern:/수목원|자연|산책|공원|식물/i},
  {id:'cafe',label:'카페 · 맛집',pattern:/카페|맛집|음식|먹거리/i},
  {id:'photo',label:'사진 · 가볼 곳',pattern:/사진|여행|가볼|명소/i},
];
const interestMeta:Record<InterestKey,{icon:typeof TreePine;color:string}>={
  smart:{icon:BriefcaseBusiness,color:'#4c9a79'},nature:{icon:TreePine,color:'#6697d4'},festival:{icon:Sparkles,color:'#9684c8'},photo:{icon:Camera,color:'#e7a654'},cafe:{icon:Coffee,color:'#e4bf52'},
};
const projectImages=[smartCityPreview,gardenPreview,festivalPreview,projectRoomPreview];

const perspectiveMatrix=(quad:ScreenRect['quad'])=>{
  if(!quad)return undefined;
  const [topLeft,topRight,bottomRight,bottomLeft]=quad;
  const dx1=topRight.x-bottomRight.x,dx2=bottomLeft.x-bottomRight.x,dx3=topLeft.x-topRight.x+bottomRight.x-bottomLeft.x;
  const dy1=topRight.y-bottomRight.y,dy2=bottomLeft.y-bottomRight.y,dy3=topLeft.y-topRight.y+bottomRight.y-bottomLeft.y;
  const denominator=dx1*dy2-dx2*dy1;let perspectiveX=0,perspectiveY=0;
  if(Math.abs(denominator)>1e-6){perspectiveX=(dx3*dy2-dx2*dy3)/denominator;perspectiveY=(dx1*dy3-dx3*dy1)/denominator}
  const scaleX=topRight.x-topLeft.x+perspectiveX*topRight.x,skewX=bottomLeft.x-topLeft.x+perspectiveY*bottomLeft.x;
  const scaleY=topRight.y-topLeft.y+perspectiveX*topRight.y,skewY=bottomLeft.y-topLeft.y+perspectiveY*bottomLeft.y;
  return `matrix3d(${[scaleX/BOARD_WIDTH,scaleY/BOARD_WIDTH,0,perspectiveX/BOARD_WIDTH,skewX/BOARD_HEIGHT,skewY/BOARD_HEIGHT,0,perspectiveY/BOARD_HEIGHT,0,0,1,0,topLeft.x,topLeft.y,0,1].map(value=>Math.abs(value)<1e-10?0:value).join(',')})`;
};
const boardStyle=(rect:ScreenRect):CSSProperties=>{const matrix=perspectiveMatrix(rect.quad);return matrix?{left:0,top:0,width:BOARD_WIDTH,height:BOARD_HEIGHT,transform:matrix,transformOrigin:'0 0'}:{left:rect.left,top:rect.top,width:Math.max(1,rect.width),height:Math.max(1,rect.height)}};
const CloseButton=()=> <button type="button" className="student-hall-board__close" onClick={()=>gameEvents.emit('student-hall-board-focus-close')} aria-label="보드 확대 화면 닫기"><X/></button>;

function OccupancyBoard({focused,profile,players,groups,messages}:{focused:boolean;profile:UserProfile;players:PlayerState[];groups:GroupRoom[];messages:ChatMessage[]}){
  const [selected,setSelected]=useState<CampusDetail|null>(null),[joined,setJoined]=useState<string[]>([]),[projects,setProjects]=useState<Project[]>(()=>loadProjectRoomProjects());
  const people=useMemo(()=>[
    {nickname:profile.nickname,interests:profile.interests},
    ...players.map(player=>({nickname:player.nickname,interests:player.matchProfile?.interests??[]})),
  ],[players,profile.interests,profile.nickname]);
  const rows=interests.map(item=>({...item,members:people.filter(person=>person.interests.some(interest=>item.pattern.test(interest)))}));
  const totalInterestMatches=Math.max(1,rows.reduce((sum,row)=>sum+row.members.length,0));
  const hasInterestMatches=rows.some(row=>row.members.length>0);
  const updatedAt=new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false});
  const currentGroups=groups.filter(group=>group.mapId==='student-hall'||group.mapId==='campus');
  const activeProjects=projects.filter(project=>project.status!=='completed');
  const recentMessages=messages.filter(message=>message.mapId==='student-hall'||message.mapId==='campus').slice(-4).reverse();
  const feed=useMemo(()=>[
    ...recentMessages.map((message,index)=>({id:message.id,icon:'message',text:<><b>{message.nickname}</b>님이 새 메시지를 남겼습니다.</>,tag:'실시간 대화',time:index===0?'방금':'최근'})),
    ...currentGroups.slice(0,2).map((group,index)=>({id:`group-${group.id}`,icon:'group',text:<><b>{group.name}</b> 그룹이 활동 중입니다.</>,tag:`${group.memberIds.length}명 활동 중`,time:`${6+index*4}분 전`})),
    ...activeProjects.slice(0,2).map((project,index)=>({id:`project-${project.id}`,icon:'project',text:<><b>{project.title}</b> 프로젝트가 열렸습니다.</>,tag:`모집 중 ${project.memberIds.length}/${project.maxMembers}명`,time:`${12+index*5}분 전`})),
    {id:'online-me',icon:'person',text:<><b>{profile.nickname}</b>님이 공동캠퍼스에 접속했습니다.</>,tag:'현재 접속 중',time:'지금'},
  ].slice(0,6),[activeProjects,currentGroups,profile.nickname,recentMessages]);
  useEffect(()=>{if(!focused)setSelected(null)},[focused]);
  useEffect(()=>{const update=()=>setProjects(loadProjectRoomProjects());window.addEventListener('project-room-projects-updated',update);return()=>window.removeEventListener('project-room-projects-updated',update)},[]);
  const donut=rows.reduce((gradient,row,index)=>{
    const before=rows.slice(0,index).reduce((sum,item)=>sum+item.members.length,0)/totalInterestMatches*360;
    const after=before+row.members.length/totalInterestMatches*360;
    return `${gradient}${index?', ':''}${interestMeta[row.id].color} ${before}deg ${after}deg`;
  },'');
  const detailTitle={people:'현재 접속자',projects:'진행 중 프로젝트',groups:'활동 중 그룹',feed:'실시간 피드'} as const;
  return <section className="student-hall-board student-hall-board--occupancy"><div className="student-hall-board__screen">
    {focused&&<CloseButton/>}
    <header className="campus-status-hero"><div className="campus-status-building" aria-hidden="true">🏫</div><div><span>공동캠퍼스 현황</span><p>지금 이 순간, 캠퍼스의 연결을 확인해요!</p></div><aside><small><Radio/> LIVE</small><time>실시간 업데이트 {updatedAt}</time></aside></header>
    <div className="campus-status-stats">
      <button type="button" onClick={()=>focused&&setSelected('people')}><Users/><span>현재 접속자</span><b>{people.length}<small>명</small></b><em>실시간 접속 중</em></button>
      <button type="button" onClick={()=>focused&&setSelected('projects')}><BriefcaseBusiness/><span>진행 중 프로젝트</span><b>{activeProjects.length}<small>개</small></b><em>함께할 팀을 찾아요</em></button>
      <button type="button" onClick={()=>focused&&setSelected('groups')}><UserPlus/><span>활동 중 그룹</span><b>{currentGroups.length}<small>개</small></b><em>{currentGroups.length?'지금 활동 중':'새 그룹을 기다려요'}</em></button>
      <button type="button" onClick={()=>focused&&setSelected('feed')}><Sparkles/><span>새로운 캠퍼스 활동</span><b>{feed.length}<small>건</small></b><em>최근 업데이트</em></button>
    </div>
    <section className="campus-interest-section"><div className="campus-section-title"><b>관심사 분포</b><small>지금 접속자들의 관심사예요!</small></div><div className="campus-interest-body"><div className="campus-donut" style={{background:hasInterestMatches?`conic-gradient(${donut})`:'#e9eeeb'}}><span><b>{people.length}</b><small>접속자</small></span></div><ol>{rows.map(row=>{const Icon=interestMeta[row.id].icon;const percent=Math.round(row.members.length/totalInterestMatches*100);return <li key={row.id}><Icon style={{background:interestMeta[row.id].color}}/><span>{row.label}</span><i><u style={{width:`${percent}%`,background:interestMeta[row.id].color}}/></i><b>{row.members.length}명</b><small>{percent}%</small></li>})}</ol></div></section>
    <section className="campus-feed-preview"><div className="campus-section-title"><b>실시간 피드</b><button type="button" onClick={()=>setSelected('feed')}>더보기 <span>›</span></button></div>{feed.slice(0,3).map(item=><article key={item.id}><i className={`is-${item.icon}`}>{item.icon==='project'?<BriefcaseBusiness/>:item.icon==='group'?<Users/>:item.icon==='person'?<UserPlus/>:<MessageCircle/>}</i><p>{item.text}</p><em>{item.tag}</em><time>{item.time}</time></article>)}</section>
    <footer className="campus-status-welcome"><Sparkles/><b>함께 만들고, 함께 배우고, 함께 성장하는 공동캠퍼스에 오신 것을 환영합니다!</b><span>🏫</span></footer>
    {selected&&<div className={`student-hall-board__detail-view campus-detail campus-detail--${selected}`}><button type="button" className="student-hall-board__back" onClick={()=>setSelected(null)}><ArrowLeft/></button><div className="campus-detail-heading"><small>공동캠퍼스 현황</small><h2>{detailTitle[selected]} <em>{selected==='people'?`${people.length}명`:selected==='projects'?`${activeProjects.length}개`:selected==='groups'?`${currentGroups.length}개`:'최근 30분'}</em></h2></div>
      {selected==='people'&&<div className="campus-people-detail">{people.map((person,index)=><article key={person.nickname}><i>{person.nickname.slice(0,1)}</i><div><b>{person.nickname}{index===0&&<u/>}</b><p>{person.interests.slice(0,2).map(interest=><span key={interest}>{interest}</span>)}</p></div><small><MapPin/> {index===0?'프로젝트실':'캠퍼스 라운지'}</small><button type="button">프로필 보기<br/>대화 신청</button></article>)}</div>}
      {selected==='projects'&&<div className="campus-project-detail">{activeProjects.map((project,index)=><article key={project.id}><img src={projectImages[index%projectImages.length]} alt=""/><div><h3>{project.title}</h3><p className="campus-project-tags">{project.tags.slice(0,2).map(tag=><span key={tag}>{tag}</span>)}</p><p>{project.summary}</p><small><Clock3/> {project.startDate??'일정 협의'}부터</small></div><aside><b>{project.memberIds.length}/{project.maxMembers}명</b><button type="button" className={joined.includes(project.id)?'is-joined':''} onClick={()=>setJoined(value=>value.includes(project.id)?value:[...value,project.id])}>{joined.includes(project.id)?'신청 완료':'참가하기'}</button></aside></article>)}</div>}
      {selected==='groups'&&<div className="campus-group-detail">{currentGroups.map((group,index)=><article key={group.id}><i>{index%3===0?<TreePine/>:index%3===1?<Coffee/>:<Sparkles/>}</i><div><h3>{group.name}</h3><span>{index%2?'카페 · 맛집':'수목원 · 자연'}</span><b>{group.memberIds.length}명 활동 중</b></div><p><MapPin/> {index%2?'중앙광장 카페거리':'수목원 탐방 중'}</p><button type="button">합류하기</button></article>)}{!currentGroups.length&&<div className="campus-detail-empty"><Users/><b>지금 활동 중인 그룹이 없어요</b><p>캠퍼스에서 이웃을 만나 새 그룹을 시작해 보세요.</p></div>}</div>}
      {selected==='feed'&&<div className="campus-feed-detail">{feed.map(item=><article key={item.id}><time>{item.time}</time><i className={`is-${item.icon}`}>{item.icon==='project'?<BriefcaseBusiness/>:item.icon==='group'?<Users/>:item.icon==='person'?<UserPlus/>:<MessageCircle/>}</i><p>{item.text}<em>{item.tag}</em></p></article>)}</div>}
      <button type="button" className="campus-detail-more">더 많은 {detailTitle[selected]} 보기 <ChevronDown/></button>
    </div>}
  </div></section>;
}

function ActivityBoard({focused,profile,players,groups,messages}:{focused:boolean;profile:UserProfile;players:PlayerState[];groups:GroupRoom[];messages:ChatMessage[]}){
  const [selected,setSelected]=useState<ActivityDetail|null>(null),[projects,setProjects]=useState<Project[]>(()=>loadProjectRoomProjects());
  useEffect(()=>{if(!focused)setSelected(null)},[focused]);
  useEffect(()=>{const update=()=>setProjects(loadProjectRoomProjects());window.addEventListener('project-room-projects-updated',update);return()=>window.removeEventListener('project-room-projects-updated',update)},[]);
  const currentGroups=groups.filter(group=>group.mapId==='student-hall'||group.mapId==='campus');
  const activeProjects=projects.filter(project=>project.status!=='completed');
  const recentMessages=messages.filter(message=>message.mapId==='student-hall'||message.mapId==='campus').slice(-5).reverse();
  const people=[{id:'me',nickname:profile.nickname,interests:profile.interests},...players.map(player=>({id:player.id,nickname:player.nickname,interests:player.matchProfile?.interests??[]}))];
  const activityCards=activeProjects.slice(0,4).map((project,index)=>({id:project.id,title:project.title,tags:[...project.placeIds,...project.tags].slice(0,2),count:project.memberIds.length,max:project.maxMembers,image:projectImages[index%projectImages.length]}));
  while(activityCards.length<4){
    const index=activityCards.length,group=currentGroups[index-activeProjects.length];
    activityCards.push({id:group?.id??`campus-live-${index}`,title:group?.name??(index===3?'AI 스터디 그룹':'캠퍼스 새 이웃 만나기'),tags:group?['실시간 그룹','학생회관']:[profile.interests[index%Math.max(1,profile.interests.length)]??'공동캠퍼스','실시간'],count:group?.memberIds.length??people.length,max:Math.max(group?.memberIds.length??people.length,6),image:projectImages[index%projectImages.length]});
  }
  const groupCards=(currentGroups.length?currentGroups.map((group,index)=>({id:group.id,name:group.name,count:group.memberIds.length,place:index%2?'학생회관 라운지':'프로젝트실 앞',icon:index%3})):activeProjects.slice(0,3).map((project,index)=>({id:project.id,name:project.title,count:project.memberIds.length,place:project.placeIds[0]??'학생회관',icon:index}))).slice(0,3);
  const schedules=activeProjects.slice(0,4).map((project,index)=>({id:project.id,time:project.startDate?new Date(project.startDate).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'}):`${14+index}:00`,title:project.title,place:project.placeIds[0]??'학생회관'}));
  const projectMembers=new Set(activeProjects.flatMap(project=>project.memberIds));
  const hotspots=[
    {name:'학생회관',detail:`지금 ${people.length}명이 함께 있어요!`,count:people.length},
    {name:'프로젝트실',detail:`${projectMembers.size}명이 프로젝트에 참여 중이에요!`,count:projectMembers.size},
    {name:'그룹 라운지',detail:`${currentGroups.reduce((sum,group)=>sum+group.memberIds.length,0)}명이 그룹 활동 중이에요!`,count:currentGroups.length},
  ];
  const detailTitle={activities:'지금 뜨는 활동',groups:'지금 활동 중인 그룹',schedule:'곧 시작할 일정',members:'최근 도착한 멤버',hotspots:'캠퍼스 핫 스팟'} as const;
  return <section className="student-hall-board student-hall-board--activity"><div className="student-hall-board__screen">
    {focused&&<CloseButton/>}
    <header className="campus-now-hero"><div><small>CAMPUS NOW</small><h1>지금 캠퍼스는?</h1><p>공동캠퍼스의 실시간 소식과 참여 기회를 확인하세요!</p></div><div className="campus-now-illustration" aria-hidden="true"><span>☁</span><b>🏫</b><span>☁</span></div></header>
    <section className="campus-now-hot"><div className="campus-now-title"><b>🔥 지금 뜨는 활동</b><button type="button" onClick={()=>focused&&setSelected('activities')}>모두 보기 <span>›</span></button></div><div className="campus-now-activity-grid">{activityCards.map((activity,index)=><button type="button" key={activity.id} onClick={()=>focused&&setSelected('activities')}><i>{index+1}</i><img src={activity.image} alt=""/><strong>{activity.title}</strong><p>{activity.tags.map(tag=><span key={tag}>{tag}</span>)}</p><small><Users/> {activity.count}명 참여 중</small><u><em style={{width:`${Math.min(100,activity.count/Math.max(1,activity.max)*100)}%`}}/></u></button>)}</div></section>
    <div className="campus-now-columns"><section><div className="campus-now-title"><b>♙ 지금 활동 중인 그룹</b><button type="button" onClick={()=>focused&&setSelected('groups')}>모두 보기 <span>›</span></button></div><div className="campus-now-groups">{groupCards.map(group=><article key={group.id}><i>{group.icon===0?'🌲':group.icon===1?'🎉':'💻'}</i><div><b>{group.name}</b><small>{group.count}명 활동 중</small><p>{group.place}</p></div><button type="button" onClick={()=>focused&&setSelected('groups')}>합류하기</button></article>)}</div></section><section><div className="campus-now-title"><b>⏱ 곧 시작할 일정</b><button type="button" onClick={()=>focused&&setSelected('schedule')}>전체 일정 <span>›</span></button></div><div className="campus-now-schedule">{schedules.map(item=><article key={item.id}><time>{item.time}</time><div><b>{item.title}</b><small>{item.place}</small></div></article>)}{!schedules.length&&<p className="campus-now-empty">예정된 활동을 기다리고 있어요.</p>}</div></section></div>
    <div className="campus-now-columns campus-now-columns--lower"><section><div className="campus-now-title"><b>▣ 최근 도착한 멤버</b><button type="button" onClick={()=>focused&&setSelected('members')}>새 멤버 보기 <span>›</span></button></div><div className="campus-now-members">{people.slice(0,5).map(person=><button type="button" key={person.id} onClick={()=>focused&&setSelected('members')}><i>{person.nickname.slice(0,1)}</i><b>{person.nickname}</b><small>{person.interests[0]??'공동캠퍼스'}</small></button>)}</div></section><section><div className="campus-now-title"><b>♜ 캠퍼스 핫 스팟</b><button type="button" onClick={()=>focused&&setSelected('hotspots')}>지도 보기 <span>›</span></button></div><div className="campus-now-hotspots"><ol>{hotspots.map((spot,index)=><li key={spot.name}><MapPin/><span><b>{spot.name}</b><small>{spot.detail}</small></span></li>)}</ol><div aria-hidden="true"><i/><i/><i/></div></div></section></div>
    <footer className="campus-now-cta"><Sparkles/><p><b>당신도 지금 바로 참여해보세요!</b><small>새로운 연결과 기회가 기다리고 있어요.</small></p><button type="button" onClick={()=>focused&&setSelected('activities')}>활동 둘러보기 <span>→</span></button></footer>
    {selected&&<div className="student-hall-board__detail-view campus-now-detail"><button type="button" className="student-hall-board__back" onClick={()=>setSelected(null)}><ArrowLeft/> 캠퍼스 현황으로 돌아가기</button><small>CAMPUS NOW · 실시간 업데이트</small><h2>{detailTitle[selected]}</h2>
      {selected==='activities'&&<div className="campus-now-detail-list">{activityCards.map(activity=><article key={activity.id}><img src={activity.image} alt=""/><div><b>{activity.title}</b><p>{activity.tags.join(' · ')}</p><small>{activity.count}/{activity.max}명 참여 중</small></div></article>)}</div>}
      {selected==='groups'&&<div className="campus-now-detail-list is-compact">{groupCards.map(group=><article key={group.id}><i>{group.icon===0?'🌲':group.icon===1?'🎉':'💻'}</i><div><b>{group.name}</b><p>{group.place}</p><small>{group.count}명 활동 중</small></div></article>)}</div>}
      {selected==='schedule'&&<div className="campus-now-detail-list is-compact">{schedules.map(item=><article key={item.id}><time>{item.time}</time><div><b>{item.title}</b><p>{item.place}</p></div></article>)}</div>}
      {selected==='members'&&<div className="campus-now-detail-members">{people.map(person=><article key={person.id}><i>{person.nickname.slice(0,1)}</i><div><b>{person.nickname}</b><p>{person.interests.slice(0,3).join(' · ')||'새로운 캠퍼스 멤버'}</p></div></article>)}</div>}
      {selected==='hotspots'&&<div className="campus-now-detail-list is-compact">{hotspots.map(spot=><article key={spot.name}><MapPin/><div><b>{spot.name}</b><p>{spot.detail}</p><small>현재 데이터 기준 {spot.count}</small></div></article>)}</div>}
      {!!recentMessages.length&&<div className="campus-now-live-message"><MessageCircle/><span><b>{recentMessages[0].nickname}</b>{recentMessages[0].message}</span></div>}
    </div>}
  </div></section>;
}

export function StudentHallBoards({active,profile,players,groups,messages}:{active:boolean;profile:UserProfile;players:PlayerState[];groups:GroupRoom[];messages:ChatMessage[]}){
  const [rects,setRects]=useState<BoardRects>({}),[focused,setFocused]=useState<BoardId|null>(null);
  useEffect(()=>{const update=(value:BoardRects|null)=>setRects(value??{});gameEvents.on('student-hall-board-screen-rects',update);return()=>{gameEvents.off('student-hall-board-screen-rects',update)}},[]);
  useEffect(()=>{const change=(value:BoardId|null)=>setFocused(value);gameEvents.on('student-hall-board-focus-mode-changed',change);return()=>{gameEvents.off('student-hall-board-focus-mode-changed',change)}},[]);
  useEffect(()=>{if(!active){setRects({});setFocused(null)}},[active]);
  if(!active)return null;
  return <div className={`student-hall-boards ${focused?'is-focused':''}`} aria-hidden={!focused}>
    {rects.occupancy&&<div className={`student-hall-board-anchor ${focused==='occupancy'?'is-active':''}`} style={boardStyle(rects.occupancy)}><OccupancyBoard focused={focused==='occupancy'} profile={profile} players={players} groups={groups} messages={messages}/></div>}
    {rects.activity&&<div className={`student-hall-board-anchor ${focused==='activity'?'is-active':''}`} style={boardStyle(rects.activity)}><ActivityBoard focused={focused==='activity'} profile={profile} players={players} groups={groups} messages={messages}/></div>}
  </div>;
}
