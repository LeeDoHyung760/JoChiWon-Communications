import { useEffect,useMemo,useState } from 'react';
import { ArrowDown,ArrowUp,Check,Clock3,Coffee,MapPin,RefreshCw,Save,Share2,Sparkles,Utensils,X } from 'lucide-react';
import type { DirectMessage,GovernmentCourse,GovernmentPlanConstraints,GovernmentPlanState,GovernmentPlanUpdate,PlayerState } from '../../shared/socket-events';
import type { UserProfile as AppUserProfile } from '../types';
import { API_BASE_URL } from '../config/api';
import { socket } from '../game/systems/socketClient';
import { buildExperienceRecommendationProfile } from '../services/experienceRecommendationProfile';
import './GovernmentPlanningExperience.css';

type Theme={id:string;emoji:string;description:string};
type Place={id:string;name:string;category:string;themes:string[];x:number;y:number;durationMinutes:number;description:string};
const themes:Theme[]=[
  {id:'스마트도시',emoji:'🏙️',description:'도시 기술과 미래형 건축'},
  {id:'친환경도시',emoji:'🌿',description:'공원·수목원·자전거길'},
  {id:'행정도시',emoji:'🏛️',description:'정부청사와 도시 기록'},
  {id:'문화·축제도시',emoji:'🎆',description:'공연·축제·문화 공간'},
  {id:'정원도시',emoji:'🌳',description:'정원과 호수 산책'},
  {id:'청년·교육도시',emoji:'🎓',description:'캠퍼스와 청년 문화'},
];
const places:Place[]=[
  {id:'government',name:'정부세종청사',category:'관광지',themes:['행정도시','스마트도시'],x:54,y:28,durationMinutes:45,description:'세종의 행정 중심과 도시 구조를 살펴봐요.'},
  {id:'arboretum',name:'국립세종수목원',category:'자연',themes:['친환경도시','정원도시'],x:68,y:58,durationMinutes:120,description:'계절 식물과 정원을 천천히 관찰해요.'},
  {id:'lake',name:'세종호수공원',category:'자연',themes:['친환경도시','정원도시'],x:50,y:50,durationMinutes:75,description:'호수 산책과 사진 촬영에 좋아요.'},
  {id:'eungbridge',name:'이응다리',category:'관광지',themes:['스마트도시','문화·축제도시'],x:42,y:66,durationMinutes:60,description:'세종의 상징적인 보행교와 야경을 만나요.'},
  {id:'museum',name:'국립박물관단지',category:'관광지',themes:['문화·축제도시','청년·교육도시'],x:58,y:70,durationMinutes:90,description:'전시와 도시 문화를 함께 감상해요.'},
  {id:'festival',name:'중앙공원 축제광장',category:'축제',themes:['문화·축제도시','정원도시'],x:61,y:45,durationMinutes:75,description:'계절 축제와 야외 행사를 즐겨요.'},
  {id:'market',name:'세종전통시장',category:'특산품',themes:['문화·축제도시'],x:20,y:30,durationMinutes:75,description:'지역 먹거리와 특산품을 둘러봐요.'},
  {id:'local-food',name:'어진동 지역음식점',category:'맛집',themes:['행정도시'],x:48,y:35,durationMinutes:60,description:'세종 지역 음식을 함께 맛봐요.'},
  {id:'garden-cafe',name:'수목원 정원카페',category:'카페',themes:['친환경도시','정원도시'],x:73,y:63,durationMinutes:50,description:'초록 풍경을 보며 쉬어 가요.'},
  {id:'nasung-cafe',name:'나성동 로컬카페',category:'카페',themes:['청년·교육도시'],x:35,y:52,durationMinutes:50,description:'청년 상권의 감성 카페를 만나요.'},
  {id:'craft',name:'한글문화 공방',category:'공방',themes:['문화·축제도시','청년·교육도시'],x:30,y:68,durationMinutes:80,description:'세종의 이야기를 작은 작품으로 만들어요.'},
  {id:'terminal',name:'세종고속시외버스터미널',category:'교통',themes:['스마트도시'],x:28,y:80,durationMinutes:30,description:'대중교통 코스의 시작과 끝을 연결해요.'},
];
const defaultConstraints:GovernmentPlanConstraints={date:'토요일',startTime:'13:00',endTime:'19:00',transport:'대중교통',meal:true,cafe:true,experience:true,activities:['사진 촬영']};
const activityOptions=['사진 촬영','산책','전시 관람','축제 즐기기','지역 음식','대화'];
const emptyPlan=(sessionId:string,nickname:string):GovernmentPlanState=>({sessionId,memberIds:[socket.id??'local'],selections:{[socket.id??'local']:{nickname,themes:[],placeIds:[]}},constraints:defaultConstraints,updatedAt:Date.now()});
const courseText=(course:GovernmentCourse)=>`${course.title}\n${course.items.map(item=>`${item.time} ${item.placeName} · ${item.reason}`).join('\n')}`;

export function GovernmentPlanningExperience({profile,sessionId,partner,chatMessages,activeGroupId,onClose,onNotice}:{profile:AppUserProfile;sessionId?:string;partner?:Pick<PlayerState,'id'|'nickname'|'matchProfile'>;chatMessages:DirectMessage[];activeGroupId?:string|null;onClose:()=>void;onNotice:(message:string)=>void}){
  const localSession=sessionId??`solo-${profile.nickname}`;
  const [plan,setPlan]=useState<GovernmentPlanState>(()=>emptyPlan(localSession,profile.nickname));
  const [activeTheme,setActiveTheme]=useState<string>('전체');
  const [step,setStep]=useState(1);
  const [generating,setGenerating]=useState(false);
  const [saving,setSaving]=useState('');
  const myId=socket.id??'local';
  const mine=plan.selections[myId]??{nickname:profile.nickname,themes:[],placeIds:[]};
  const partnerEntry=Object.entries(plan.selections).find(([id])=>id!==myId)?.[1];
  const commonPlaces=mine.placeIds.filter(id=>partnerEntry?.placeIds.includes(id));
  const filtered=activeTheme==='전체'?places:places.filter(place=>place.themes.includes(activeTheme));

  useEffect(()=>{
    setPlan(emptyPlan(localSession,profile.nickname));
    if(!sessionId){try{const saved=JSON.parse(localStorage.getItem(`government-plan-draft:${localSession}`)??'null') as GovernmentPlanState|null;if(saved?.sessionId===localSession)setPlan(saved)}catch{/* Start with a clean solo plan. */}return}
    socket.emit('getGovernmentPlan',{sessionId},result=>{if(result.ok&&result.plan)setPlan(result.plan);else onNotice(result.message??'공동 계획을 불러오지 못했어요.')});
  },[localSession,sessionId,profile.nickname,onNotice]);
  useEffect(()=>{const updated=(next:GovernmentPlanState)=>{if(next.sessionId===localSession)setPlan(next)};socket.on('governmentPlanUpdated',updated);return()=>{socket.off('governmentPlanUpdated',updated)}},[localSession]);
  useEffect(()=>{if(!sessionId)localStorage.setItem(`government-plan-draft:${localSession}`,JSON.stringify(plan))},[localSession,plan,sessionId]);

  const update=(next:GovernmentPlanUpdate)=>{
    if(sessionId){socket.emit('updateGovernmentPlan',{sessionId,update:next},result=>{if(result&&!result.ok)onNotice(result.message??'공동 계획을 저장하지 못했어요.')});return}
    setPlan(current=>{
      const selection=current.selections[myId]??{nickname:profile.nickname,themes:[],placeIds:[]};
      const selections={...current.selections,[myId]:{...selection,themes:next.themes??selection.themes,placeIds:next.placeIds??selection.placeIds}};
      const changed={...current,selections,constraints:next.constraints?{...current.constraints,...next.constraints}:current.constraints,updatedAt:Date.now()};
      if(next.course===null)delete changed.course;else if(next.course)changed.course=next.course;
      return changed;
    });
  };
  const toggleTheme=(id:string)=>update({themes:mine.themes.includes(id)?mine.themes.filter(value=>value!==id):[...mine.themes,id]});
  const togglePlace=(id:string)=>{
    if(mine.placeIds.includes(id))return update({placeIds:mine.placeIds.filter(value=>value!==id)});
    if(mine.placeIds.length>=3)return onNotice('가고 싶은 장소는 최대 3곳까지 선택할 수 있어요.');
    update({placeIds:[...mine.placeIds,id]});
  };
  const setConstraint=<K extends keyof GovernmentPlanConstraints>(key:K,value:GovernmentPlanConstraints[K])=>update({constraints:{[key]:value}});
  const selectedIds=[...new Set([...commonPlaces,...mine.placeIds,...(partnerEntry?.placeIds??[])])].slice(0,6);
  const profileContext=buildExperienceRecommendationProfile(profile);
  const generate=async()=>{
    if(!selectedIds.length)return onNotice('두 사람이 가고 싶은 장소를 먼저 선택해 주세요.');
    setGenerating(true);
    try{
      const response=await fetch(`${API_BASE_URL}/government/course`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        places:places.map(({id,name,category,themes,durationMinutes})=>({id,name,category,themes,durationMinutes})),
        selectedPlaceIds:selectedIds,themes:[...new Set([...mine.themes,...(partnerEntry?.themes??[])])],
        interests:[...profileContext.interests,...(partner?.matchProfile?.interests??[])].slice(0,20),
        experienceRecords:[...profileContext.experienceRecords,...(partner?.matchProfile?.experienceRecords??[])].slice(0,20),
        chatActivities:chatMessages.filter(message=>message.type==='user').slice(-20).map(message=>message.message),
        constraints:plan.constraints,
      })});
      const body=await response.json() as {course?:GovernmentCourse;error?:string};
      if(!response.ok||!body.course)throw new Error(body.error??'코스를 생성하지 못했어요.');
      update({course:body.course});setStep(4);
    }catch(error){onNotice(error instanceof Error?error.message:'AI 코스를 생성하지 못했어요.')}finally{setGenerating(false)}
  };
  const reorder=(index:number,direction:-1|1)=>{
    if(!plan.course)return;const target=index+direction;if(target<0||target>=plan.course.items.length)return;
    const items=[...plan.course.items];[items[index],items[target]]=[items[target],items[index]];
    update({course:{...plan.course,items}});
  };
  const replace=(index:number)=>{
    if(!plan.course)return;const used=new Set(plan.course.items.map(item=>item.placeId)),replacement=places.find(place=>!used.has(place.id)&&place.category===plan.course!.items[index].category)??places.find(place=>!used.has(place.id));
    if(!replacement)return onNotice('교체할 다른 장소가 없어요.');
    const items=[...plan.course.items];items[index]={...items[index],id:`course-${replacement.id}-${Date.now()}`,placeId:replacement.id,placeName:replacement.name,category:replacement.category,durationMinutes:replacement.durationMinutes,reason:`같은 ${replacement.category} 선택지 중 두 사람의 조건과 잘 맞아 교체했습니다.`};
    update({course:{...plan.course,items}});
  };
  const save=(joint:boolean)=>{if(!plan.course)return;const key=joint?`government-joint-plan:${localSession}`:`government-visit-plans:${profile.nickname}`;localStorage.setItem(key,JSON.stringify(plan.course));setSaving(joint?'공동 저장 완료':'내 계획 저장 완료');onNotice(joint?'상대방과 공동 계획으로 저장했어요.':'내 방문 계획으로 저장했어요.')};
  const shareCommunity=async()=>{if(!plan.course)return;try{const response=await fetch(`${API_BASE_URL}/community`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({author:profile.nickname,title:`[방문 코스] ${plan.course.title}`,content:courseText(plan.course),category:'모임·행사'})});if(!response.ok)throw new Error();onNotice('호수공원 게시판에 코스를 공유했어요.')}catch{onNotice('게시판 공유에 실패했어요. 서버 연결을 확인해 주세요.')}};
  const shareGroup=()=>{if(!plan.course||!activeGroupId)return onNotice('공유할 동아리 채팅을 먼저 열어 주세요.');socket.emit('sendGroupChat',{groupId:activeGroupId,message:`🗺️ ${courseText(plan.course)}`});onNotice('동아리 채팅에 코스를 공유했어요.')};

  return <section className="government-planner">
    <header className="government-planner-header"><div><span>🏛️</span><div><small>세종 정부청사 · 함께 결정하기</small><h1>우리의 세종 방문 계획</h1><p>{sessionId?`${partner?.nickname??'상대방'}님과 실시간 공동 편집 중`:'혼자 먼저 계획하고 나중에 공유할 수 있어요'}</p></div></div><button onClick={onClose} aria-label="계획 화면 닫기"><X/></button></header>
    <nav>{[['1','도시 테마'],['2','장소 비교'],['3','방문 조건'],['4','AI 코스']].map(([value,label])=><button key={value} className={step===Number(value)?'active':''} onClick={()=>setStep(Number(value))}><span>{value}</span>{label}</button>)}</nav>
    <div className="government-planner-body">
      {step===1&&<><div className="government-section-title"><div><small>① 도시 테마 전시관</small><h2>세종은 어떤 도시인가요?</h2><p>관심 있는 전시 오브젝트를 누르면 관련 장소가 지도에서 강조됩니다.</p></div><span>{mine.themes.length}/6 선택</span></div><div className="government-theme-grid">{themes.map(theme=><button key={theme.id} className={mine.themes.includes(theme.id)?'selected':''} onClick={()=>{toggleTheme(theme.id);setActiveTheme(theme.id)}}><span>{theme.emoji}</span><b>{theme.id}</b><small>{theme.description}</small>{mine.themes.includes(theme.id)&&<Check/>}</button>)}</div><button className="government-next" disabled={!mine.themes.length} onClick={()=>setStep(2)}>대형 지도에서 장소 보기</button></>}
      {step===2&&<><div className="government-section-title"><div><small>② 대형 세종 지도</small><h2>두 사람의 관심사가 어디서 겹치나요?</h2></div><div className="government-legend"><span className="mine">내 선택</span><span className="theirs">상대 선택</span><span className="common">공통 선택</span></div></div><div className="government-map-layout"><aside><button className={activeTheme==='전체'?'active':''} onClick={()=>setActiveTheme('전체')}>전체 장소</button>{themes.map(theme=><button key={theme.id} className={activeTheme===theme.id?'active':''} onClick={()=>setActiveTheme(theme.id)}>{theme.emoji} {theme.id}</button>)}</aside><div className="government-map"><span className="map-river"/>{filtered.map(place=>{const mineSelected=mine.placeIds.includes(place.id),theirs=partnerEntry?.placeIds.includes(place.id),common=mineSelected&&theirs;return <button key={place.id} style={{left:`${place.x}%`,top:`${place.y}%`}} className={common?'common':mineSelected?'mine':theirs?'theirs':''} onClick={()=>togglePlace(place.id)} title={place.description}><MapPin/><b>{place.name}</b><small>{place.category}</small></button>})}</div></div><div className="government-selection-summary"><div><b>나 · {mine.nickname}</b><p>{mine.placeIds.map(id=>places.find(place=>place.id===id)?.name).join(' · ')||'장소를 선택해 주세요'}</p></div><div><b>상대 · {partnerEntry?.nickname??partner?.nickname??'대기 중'}</b><p>{partnerEntry?.placeIds.map(id=>places.find(place=>place.id===id)?.name).join(' · ')||'아직 선택하지 않았어요'}</p></div><div className="common"><b>공통 장소</b><p>{commonPlaces.map(id=>places.find(place=>place.id===id)?.name).join(' · ')||'각자의 선택을 비교하고 있어요'}</p></div></div><button className="government-next" disabled={!mine.placeIds.length} onClick={()=>setStep(3)}>방문 조건 정하기</button></>}
      {step===3&&<><div className="government-section-title"><div><small>③ 공동 선택 과정</small><h2>실제로 가능한 방문 조건을 맞춰요</h2><p>변경 내용은 공동 세션에 바로 반영됩니다.</p></div></div><div className="government-condition-grid"><label><span><Clock3/> 방문 날짜</span><select value={plan.constraints.date} onChange={event=>setConstraint('date',event.target.value)}><option>토요일</option><option>일요일</option><option>평일</option></select></label><label><span><Clock3/> 시작 시간</span><input type="time" value={plan.constraints.startTime} onChange={event=>setConstraint('startTime',event.target.value)}/></label><label><span><Clock3/> 종료 시간</span><input type="time" value={plan.constraints.endTime} onChange={event=>setConstraint('endTime',event.target.value)}/></label><label><span><MapPin/> 이동 방법</span><select value={plan.constraints.transport} onChange={event=>setConstraint('transport',event.target.value as GovernmentPlanConstraints['transport'])}><option>대중교통</option><option>도보·자전거</option><option>자가용</option></select></label></div><div className="government-toggle-row"><button className={plan.constraints.meal?'selected':''} onClick={()=>setConstraint('meal',!plan.constraints.meal)}><Utensils/> 식사 포함</button><button className={plan.constraints.cafe?'selected':''} onClick={()=>setConstraint('cafe',!plan.constraints.cafe)}><Coffee/> 카페 포함</button><button className={plan.constraints.experience?'selected':''} onClick={()=>setConstraint('experience',!plan.constraints.experience)}><Sparkles/> 체험 포함</button></div><div className="government-activities"><b>희망 활동</b><div>{activityOptions.map(activity=><button key={activity} className={plan.constraints.activities.includes(activity)?'selected':''} onClick={()=>setConstraint('activities',plan.constraints.activities.includes(activity)?plan.constraints.activities.filter(value=>value!==activity):[...plan.constraints.activities,activity])}>#{activity}</button>)}</div></div><section className="government-condition-card"><span>🗓️</span><p><b>{plan.constraints.date} {plan.constraints.startTime}~{plan.constraints.endTime}</b><br/>{plan.constraints.transport} · {plan.constraints.activities.join(', ')||'자유롭게 둘러보기'} · {[plan.constraints.meal&&'식사',plan.constraints.cafe&&'카페',plan.constraints.experience&&'체험'].filter(Boolean).join(' · ')}</p></section><button className="government-generate" disabled={generating} onClick={()=>void generate()}><Sparkles/>{generating?'두 사람의 기록을 분석하고 있어요...':'AI 방문 코스 생성'}</button></>}
      {step===4&&<>{plan.course?<><div className="government-course-heading"><div><small>④ AI 코스 생성 · {plan.course.source}</small><h2>{plan.course.title}</h2><p>{plan.course.summary}</p></div><button onClick={()=>void generate()} disabled={generating}><RefreshCw/> 다시 생성</button></div><div className="government-course-list">{plan.course.items.map((item,index)=><article key={item.id}><time>{item.time}</time><span className="course-line"/><div><small>{item.category} · 약 {item.durationMinutes}분</small><h3>{item.placeName}</h3><p>{item.reason}</p><footer><button onClick={()=>reorder(index,-1)} disabled={index===0}><ArrowUp/> 위로</button><button onClick={()=>reorder(index,1)} disabled={index===plan.course!.items.length-1}><ArrowDown/> 아래로</button><button onClick={()=>replace(index)}><RefreshCw/> 장소 교체</button></footer></div></article>)}</div><div className="government-final"><div><small>⑤ 최종 선택</small><b>{saving||'완성한 코스를 어디에 남길까요?'}</b></div><button onClick={()=>save(false)}><Save/> 내 방문 계획</button><button onClick={()=>save(true)}><Check/> 상대와 공동 저장</button><button onClick={()=>void shareCommunity()}><Share2/> 호수공원 게시판</button><button onClick={shareGroup} disabled={!activeGroupId}><Share2/> 동아리 채팅</button></div></>:<div className="government-empty-course"><Sparkles/><h2>아직 생성된 코스가 없어요</h2><p>도시 테마, 장소와 방문 조건을 고르면 두 사람의 기록을 반영해 코스를 만듭니다.</p><button onClick={()=>setStep(1)}>처음부터 선택하기</button></div>}</>}
    </div>
  </section>;
}
