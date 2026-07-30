import { ArrowRight,Calendar,MapPin,MessageCircle,Plus,Sparkles,Users,X } from 'lucide-react';
import { useState,type FormEvent } from 'react';

type Project={
  id:string;emoji:string;title:string;goal:string;capacity:number;members:string[];
  tags:string[];description:string;
};
const initialProjects:Project[]=[
  {id:'garden-photo',emoji:'🌸',title:'수목원 사진 프로젝트',goal:'꽃 사진 촬영',capacity:4,members:['하늘여우','초록산책'],tags:['자연 선호','사진 촬영','여유형 여행 스타일'],description:'수목원의 계절 꽃을 천천히 관찰하고 각자의 시선으로 사진을 남겨요.'},
  {id:'cafe-tour',emoji:'☕',title:'세종 카페 탐방',goal:'감성카페 3곳 방문',capacity:4,members:['라떼구름','모카별','산책자'],tags:['감성카페','디저트','대화'],description:'공간 분위기가 좋은 카페를 골라 함께 방문하고 기록을 공유해요.'},
  {id:'night-festival',emoji:'🎆',title:'야간축제 탐험',goal:'축제 관람 · 사진 촬영',capacity:5,members:['별빛여행','밤산책'],tags:['야간축제','공연','사진 촬영'],description:'야간축제의 공연과 빛을 함께 감상하고 사진으로 남기는 프로젝트예요.'},
];
type DetailTab='overview'|'members'|'chat'|'memo'|'places'|'schedule';
const detailTabs:Array<{id:DetailTab;label:string}>=[{id:'overview',label:'프로젝트 설명'},{id:'members',label:'참여자 목록'},{id:'chat',label:'채팅'},{id:'memo',label:'공유 메모'},{id:'places',label:'추천 장소'},{id:'schedule',label:'인공지능 추천 일정'}];

export function CampusProjectRoom({onGovernment,onNotice}:{onGovernment:()=>void;onNotice:(message:string)=>void}){
  const [projects,setProjects]=useState(initialProjects);
  const [selected,setSelected]=useState<Project|null>(null);
  const [detailTab,setDetailTab]=useState<DetailTab>('overview');
  const [composer,setComposer]=useState(false);
  const [title,setTitle]=useState(''),[goal,setGoal]=useState(''),[capacity,setCapacity]=useState(4);
  const [memo,setMemo]=useState('사진 촬영 후 근처 카페에서 서로의 사진을 골라보기');
  const createProject=(event:FormEvent)=>{event.preventDefault();if(!title.trim()||!goal.trim())return;const created:Project={id:`project-${Date.now()}`,emoji:'💡',title:title.trim(),goal:goal.trim(),capacity,members:['나'],tags:['새 프로젝트','함께 계획'],description:`${goal.trim()}을 목표로 함께 만드는 프로젝트입니다.`};setProjects(current=>[created,...current]);setSelected(created);setComposer(false);setTitle('');setGoal('');onNotice('새 프로젝트를 만들었어요.')};
  const join=(project:Project)=>{if(project.members.includes('나')||project.members.length>=project.capacity)return;const updated={...project,members:[...project.members,'나']};setProjects(current=>current.map(item=>item.id===project.id?updated:item));setSelected(updated);onNotice(`${project.title}에 참여했어요.`)};
  if(selected)return <section className="campus-project-detail">
    <header><button type="button" onClick={()=>setSelected(null)}><X size={14}/> 닫기</button><span>{selected.emoji}</span><div><small>함께 만드는 프로젝트</small><h2>{selected.title}</h2><p>{selected.goal} · {selected.members.length}/{selected.capacity}명 참여</p></div></header>
    <nav>{detailTabs.map(item=><button type="button" key={item.id} className={detailTab===item.id?'active':''} onClick={()=>setDetailTab(item.id)}>{item.label}</button>)}</nav>
    <div className="campus-project-detail-body">
      {detailTab==='overview'&&<article className="project-overview"><small>프로젝트 목표</small><h3>{selected.goal}</h3><p>{selected.description}</p><div>{selected.tags.map(tag=><span key={tag}>#{tag}</span>)}</div><button type="button" disabled={selected.members.includes('나')||selected.members.length>=selected.capacity} onClick={()=>join(selected)}>{selected.members.includes('나')?'참여 중':selected.members.length>=selected.capacity?'모집 완료':'프로젝트 참여하기'}</button></article>}
      {detailTab==='members'&&<article className="project-member-list">{selected.members.map((member,index)=><div key={member}><span>{member.slice(0,1)}</span><b>{member}</b><small>{index===0?'프로젝트 리더':'참여자'} · 활동 중</small><i/></div>)}</article>}
      {detailTab==='chat'&&<article className="project-chat-preview"><MessageCircle size={31}/><h3>프로젝트 채팅</h3><p>참여자들과 일정, 준비물, 장소를 함께 조율해요.</p><button type="button" onClick={()=>onNotice('프로젝트 그룹 채팅을 열었어요.')}>프로젝트 채팅 시작</button></article>}
      {detailTab==='memo'&&<article className="project-shared-memo"><small>모든 참여자가 함께 편집하는 메모</small><textarea value={memo} onChange={event=>setMemo(event.target.value)}/><button type="button" onClick={()=>onNotice('공유 메모를 저장했어요.')}>메모 저장</button></article>}
      {detailTab==='places'&&<article className="project-place-list">{[['국립세종수목원','프로젝트 목표와 가장 잘 맞는 장소'],['이응다리','이동 중 함께 둘러보기 좋은 장소'],['세종호수공원','일정을 마무리하며 쉬기 좋은 장소']].map(([name,copy],index)=><div key={name}><span><MapPin size={15}/></span><div><b>{index+1}. {name}</b><small>{copy}</small></div><button type="button" onClick={()=>onNotice(`${name}을(를) 프로젝트에 저장했어요.`)}>저장</button></div>)}</article>}
      {detailTab==='schedule'&&<article className="project-ai-schedule"><header><Sparkles size={18}/><div><small>인공지능 일정 도우미</small><b>참여자 취향을 반영한 추천 일정</b></div></header>{[['14:00','학생회관에서 만나기'],['14:30',selected.goal],['16:30','사진과 기록 함께 정리'],['17:00','카페에서 다음 활동 정하기']].map(([time,activity])=><div key={time}><time>{time}</time><span>{activity}</span></div>)}<button type="button" onClick={onGovernment}>함께 코스 완성하기 <ArrowRight size={14}/></button></article>}
    </div>
  </section>;
  return <>
    <div className="campus-section-title"><div><small>③ 프로젝트실 · 목표 중심 협업</small><h2>함께 세종에서 무엇을 할지 계획해요</h2><p>단순한 채팅을 넘어 목표, 참여자, 장소와 일정을 하나의 프로젝트로 완성합니다.</p></div><button type="button" className="campus-create-button" onClick={()=>setComposer(value=>!value)}><Plus size={15}/> 프로젝트 생성</button></div>
    {composer&&<form className="campus-project-form" onSubmit={createProject}><label>프로젝트 이름<input value={title} onChange={event=>setTitle(event.target.value)} placeholder="예: 세종 건축 사진 프로젝트"/></label><label>목표<input value={goal} onChange={event=>setGoal(event.target.value)} placeholder="무엇을 함께 하나요?"/></label><label>인원<select value={capacity} onChange={event=>setCapacity(Number(event.target.value))}><option value={2}>2명</option><option value={4}>4명</option><option value={6}>6명</option></select></label><button>프로젝트 만들기</button></form>}
    <section className="campus-project-recommend"><Sparkles size={20}/><div><small>인공지능 프로젝트 추천</small><b>“수목원 사진 프로젝트가 잘 맞을 것 같습니다.”</b><p>자연 선호 · 사진 촬영 · 여유형 여행 스타일을 바탕으로 추천했어요.</p></div><button type="button" onClick={()=>setSelected(projects.find(project=>project.id==='garden-photo')??projects[0])}>추천 보기</button></section>
    <div className="campus-project-board-head"><span>프로젝트</span><span>목표</span><span>참여 현황</span><span>상태</span><span>바로가기</span></div>
    <div className="campus-project-grid">{projects.map(project=><article key={project.id}><span>{project.emoji}</span><div className="project-card-heading"><small>{project.members.length>=project.capacity?'모집 완료':'참여 가능'}</small><h3>{project.title}</h3><p>{project.description}</p></div><div className="project-board-goal">{project.goal}</div><dl><div><dt>정원</dt><dd>{project.capacity}명</dd></div><div><dt>참여</dt><dd>{project.members.length}명</dd></div></dl><div className="project-card-members"><Users size={13}/>{project.members.map(member=><i key={member}>{member.slice(0,1)}</i>)}</div><button type="button" onClick={()=>setSelected(project)}>상세 보기 <ArrowRight size={13}/></button></article>)}</div>
    <section className="campus-project-next"><Calendar size={18}/><div><b>프로젝트가 준비되면 함께 코스를 만들어요</b><p>인공지능이 참여자의 취향과 프로젝트 목표를 실제 세종 방문 코스로 정리합니다.</p></div><button type="button" onClick={onGovernment}>함께 코스 만들기</button></section>
  </>;
}
