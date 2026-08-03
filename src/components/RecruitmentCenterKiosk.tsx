import { useEffect,useMemo,useState,type CSSProperties } from 'react';
import { CheckCircle2,X } from 'lucide-react';
import { gameEvents } from '../game/events';
import './RecruitmentCenterKiosk.css';
import './RecruitmentCenterKioskSurface.css';

type KioskSection={id:string;icon:string;title:string;summary:string;details:string[]};
type ScreenRect={left:number;top:number;width:number;height:number};
const DEFAULT_SECTIONS:KioskSection[]=[
  {id:'top',icon:'🔥',title:'오늘 모집 TOP10',summary:'지금 가장 인기 있는 공개 모집을 보여줍니다.',details:['AI 스터디','수목원 탐방','축제 영상팀','사진 출사']},
  {id:'schedule',icon:'🗓️',title:'모집 일정',summary:'오늘 진행되는 모집 일정을 시간순으로 확인합니다.',details:['14:00  ·  AI 스터디','15:00  ·  식물 탐방','18:00  ·  야간축제']},
  {id:'rules',icon:'📋',title:'모집 규칙',summary:'참가부터 프로젝트 활동까지의 공통 절차입니다.',details:['① 신청','② 모집자 승인','③ 프로젝트실 이동']},
  {id:'notice',icon:'📣',title:'캠퍼스 공지',summary:'오늘 새로 열린 프로젝트와 행사를 알려드립니다.',details:['오늘 신규 프로젝트  4개','오늘 행사  2개','모집 정보는 모든 사용자에게 동일하게 표시됩니다.']},
  {id:'help',icon:'❓',title:'도움말 / FAQ',summary:'공간 이용에 관한 자주 묻는 질문입니다.',details:['프로젝트는 어떻게 참여하나요?','동아리는 어디에서 찾나요?','프로젝트실은 무엇을 하는 곳인가요?']},
];
const SCREEN_SUMMARIES=['인기 공개 모집','오늘 시간표','신청 · 승인 · 이동','프로젝트 · 행사','이용 방법'];

export function RecruitmentCenterKiosk({active,onOpenChange,onNotice}:{active:boolean;onOpenChange:(open:boolean)=>void;onNotice:(message:string)=>void}){
  const [nearby,setNearby]=useState(false),[open,setOpen]=useState(false),[detailOpen,setDetailOpen]=useState(false),[selectedId,setSelectedId]=useState('guide');
  const [rect,setRect]=useState<ScreenRect|null>(null);
  const sections=DEFAULT_SECTIONS;
  const selected=useMemo(()=>sections.find(section=>section.id===selectedId)??sections[0],[sections,selectedId]);

  useEffect(()=>{
    const proximity=(value:boolean)=>setNearby(value);
    const mode=(value:boolean)=>{setOpen(value);setDetailOpen(false);if(!value)setRect(null)};
    const screenRect=(value:ScreenRect|null)=>setRect(value);
    gameEvents.on('recruitment-kiosk-proximity-changed',proximity);gameEvents.on('recruitment-kiosk-mode-changed',mode);gameEvents.on('recruitment-kiosk-screen-rect',screenRect);
    return()=>{gameEvents.off('recruitment-kiosk-proximity-changed',proximity);gameEvents.off('recruitment-kiosk-mode-changed',mode);gameEvents.off('recruitment-kiosk-screen-rect',screenRect)};
  },[]);
  useEffect(()=>{if(!active){setNearby(false);setOpen(false);setRect(null);gameEvents.emit('recruitment-kiosk-close')}},[active]);
  useEffect(()=>onOpenChange(open),[open,onOpenChange]);
  useEffect(()=>{
    if(!open)return;
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();gameEvents.emit('recruitment-kiosk-close')}};
    window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);
  },[open]);

  const choose=(id:string)=>{setSelectedId(id);setDetailOpen(true)};
  const close=()=>gameEvents.emit('recruitment-kiosk-close');
  // Sit slightly inside the authored black bezel instead of covering its
  // edges. The lower vertical inset makes the DOM read as content behind the
  // kiosk glass rather than a browser card floating over the model.
  const style=rect?{
    left:rect.left+rect.width*.018,
    top:rect.top+rect.height*.032,
    width:Math.max(1,rect.width*.964),
    height:Math.max(1,rect.height*.948),
  } as CSSProperties:undefined;

  return <>
    {active&&open&&<div className="recruitment-kiosk-active-marker" aria-hidden="true"/>}
    {active&&nearby&&!open&&<button type="button" className="recruitment-kiosk-prompt" onClick={()=>gameEvents.emit('recruitment-kiosk-open')}>
      <kbd>E</kbd><span>키오스크 보기</span>
    </button>}
    {active&&open&&rect&&<section className={`recruitment-kiosk-web is-kiosk-surface${detailOpen?' is-detail':''}`} style={style} role="dialog" aria-modal="true" aria-label="모집센터 정보 키오스크" onKeyDown={event=>event.stopPropagation()} onKeyUp={event=>event.stopPropagation()}>
        <header className="recruitment-kiosk-screen-header"><div><h2>모집센터 정보 키오스크</h2><p>누구나 똑같이 보는 공용 정보 화면</p></div><button type="button" onClick={close} aria-label="키오스크 사용 종료"><X/></button></header>
        {!detailOpen?<main className="recruitment-kiosk-screen-menu">
          <nav aria-label="확인할 정보 선택">{sections.map((section,index)=><button type="button" className={index===0?'active':''} key={section.id} onClick={()=>choose(section.id)}><i>{section.icon}</i><span><b>{section.title}</b><small>{SCREEN_SUMMARIES[index]}</small></span><strong>›</strong></button>)}</nav>
          <footer>개인 추천과 신청 현황은 안내 데스크의 충녕이에게 물어보세요.</footer>
        </main>:<main className="recruitment-kiosk-detail-screen">
            <button type="button" className="recruitment-kiosk-menu-back" onClick={()=>setDetailOpen(false)}>‹ 전체 메뉴</button>
            <article className="recruitment-kiosk-detail">
              <header><div><small>PUBLIC INFORMATION</small><h3>{selected.icon} {selected.title}</h3><p>{selected.summary}</p></div></header><ul>{selected.details.map((detail,index)=><li key={`${selected.id}-${index}`}><CheckCircle2/><span>{detail}</span></li>)}</ul><footer><span>이 화면은 모든 방문자에게 동일하게 표시됩니다.</span></footer>
            </article>
          </main>}
      </section>}
  </>;
}
