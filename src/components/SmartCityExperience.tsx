import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Activity, Bot, BusFront, Check, Database, HeartPulse, Leaf, Sparkles, X } from 'lucide-react';
import { gameEvents } from '../game/events';
import type { UserProfile } from '../types';
import './SmartCityExperience.css';

type Point={x:number;y:number};
type ScreenRect={left:number;top:number;width:number;height:number;quad?:readonly [Point,Point,Point,Point]};
type TechnologyId='ai'|'mobility'|'energy'|'twin'|'health';
const WIDTH=1200,HEIGHT=620;
const technologies=[
  {id:'ai' as const,label:'AI 행정',icon:Bot,eyebrow:'CONNECTED GOVERNMENT',title:'AI 행정',lines:['AI 기반 민원·행정 자동화','청사와 공공 데이터 실시간 연결','시민 맞춤형 행정 서비스']},
  {id:'mobility' as const,label:'스마트 교통',icon:BusFront,eyebrow:'AUTONOMOUS MOBILITY',title:'스마트 교통',lines:['AI 기반 자율주행 BRT','UAM 도심 항공 모빌리티','실시간 교통 흐름 제어']},
  {id:'energy' as const,label:'친환경 에너지',icon:Leaf,eyebrow:'ZERO ENERGY CITY',title:'친환경 에너지',lines:['건물 일체형 태양광 발전','도시형 풍력 에너지','AI 전력망 수요 최적화']},
  {id:'twin' as const,label:'디지털 트윈',icon:Database,eyebrow:'LIVE CITY DATA',title:'디지털 트윈',lines:['인구·교통량 실시간 시각화','환경 센서 통합 모니터링','도시 변화 예측 시뮬레이션']},
  {id:'health' as const,label:'스마트 헬스케어',icon:HeartPulse,eyebrow:'HEALTH CONNECT',title:'스마트 헬스케어',lines:['응급 차량 최적 이동 경로','병원 중심 의료 데이터 연결','도시 건강 안전망 구축']},
];

function matrix(quad:ScreenRect['quad']){if(!quad)return;const [tl,tr,br,bl]=quad,dx1=tr.x-br.x,dx2=bl.x-br.x,dx3=tl.x-tr.x+br.x-bl.x,dy1=tr.y-br.y,dy2=bl.y-br.y,dy3=tl.y-tr.y+br.y-bl.y,d=dx1*dy2-dx2*dy1;let px=0,py=0;if(Math.abs(d)>1e-6){px=(dx3*dy2-dx2*dy3)/d;py=(dx1*dy3-dx3*dy1)/d}const sx=tr.x-tl.x+px*tr.x,kx=bl.x-tl.x+py*bl.x,sy=tr.y-tl.y+px*tr.y,ky=bl.y-tl.y+py*bl.y;return `matrix3d(${[sx/WIDTH,sy/WIDTH,0,px/WIDTH,kx/HEIGHT,ky/HEIGHT,0,py/HEIGHT,0,0,1,0,tl.x,tl.y,0,1].join(',')})`}
const style=(rect:ScreenRect):CSSProperties=>{const transform=matrix(rect.quad);return transform?{left:0,top:0,width:WIDTH,height:HEIGHT,transform,transformOrigin:'0 0'}:{left:rect.left,top:rect.top,width:rect.width,height:rect.height}};
const openStyle:CSSProperties={left:'50%',top:'50%',width:'min(1200px, 96vw)',height:'min(620px, 92vh)',transform:'translate(-50%, -50%)',transformOrigin:'center',borderWidth:3,borderRadius:22,boxShadow:'0 25px 90px #000c, 0 0 55px #44dfff70'};

export function SmartCityExperience({active,profile,onNotice}:{active:boolean;profile:UserProfile;onNotice?:(message:string)=>void}){
  const [rect,setRect]=useState<ScreenRect|null>(null),[nearby,setNearby]=useState(false),[open,setOpen]=useState(false);
  const [selected,setSelected]=useState<TechnologyId>('mobility'),[visited,setVisited]=useState<TechnologyId[]>([]),[showResult,setShowResult]=useState(false),[pulse,setPulse]=useState(0);
  useEffect(()=>{const update=(value:ScreenRect|null)=>setRect(value);const proximity=(value:boolean)=>setNearby(value);const launch=()=>setOpen(true);gameEvents.on('smart-city-screen-rect',update);gameEvents.on('smart-city-table-proximity-changed',proximity);gameEvents.on('smart-city-experience-open',launch);return()=>{gameEvents.off('smart-city-screen-rect',update);gameEvents.off('smart-city-table-proximity-changed',proximity);gameEvents.off('smart-city-experience-open',launch)}},[]);
  useEffect(()=>{if(!active){setRect(null);setOpen(false);setNearby(false)}},[active]);
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.repeat)return;if(event.code==='KeyE'&&!open&&active&&nearby){event.preventDefault();event.stopImmediatePropagation();setOpen(true)}else if(event.key==='Escape'&&open){event.preventDefault();event.stopImmediatePropagation();setOpen(false)}};window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true)},[active,nearby,open]);
  useEffect(()=>{gameEvents.emit('game-input-lock',open);return()=>{if(open)gameEvents.emit('game-input-lock',false)}},[open]);
  const current=technologies.find(item=>item.id===selected)!;
  const completed=visited.length===technologies.length;
  const buildings=useMemo(()=>Array.from({length:24},(_,i)=>({height:44+(i*29)%108,left:9+(i*17)%84,bottom:10+(i*23)%38,delay:(i%8)*.08})),[]);
  const choose=(id:TechnologyId)=>{setSelected(id);setVisited(value=>value.includes(id)?value:[...value,id]);setShowResult(false);setPulse(value=>value+1)};
  const saveResult=()=>{const result={completedAt:Date.now(),visited,ratings:{'스마트 교통':5,'친환경':4,'AI 행정':5,'문화':3}};const user=profile.nickname.trim().toLowerCase()||'guest';localStorage.setItem(`sejong-smart-city-experience-v2:${user}`,JSON.stringify(result));window.dispatchEvent(new CustomEvent('sejong-profile-progress-updated',{detail:{mapId:'sejong-smart-city'}}));setShowResult(true);onNotice?.('미래 세종 체험 결과를 사용자 프로필에 저장했어요.')};
  if(!active)return null;
  return <>
    {!open&&nearby&&<button type="button" className="smart-city-prompt is-nearby" style={{pointerEvents:'auto',cursor:'pointer'}} onClick={()=>setOpen(true)}><kbd>E</kbd><span><b>미래 세종 체험하기</b><small>디지털 트윈 테이블</small></span></button>}
    <div className={`smart-city-web-layer ${open?'is-open':'is-idle'}`} style={open?{zIndex:24,pointerEvents:'auto',background:'rgba(2,10,17,.74)',backdropFilter:'blur(3px)'}:{display:rect?'block':'none'}}><section className="smart-city-web-board" style={open?openStyle:rect?style(rect):openStyle} aria-label="미래 세종 디지털 트윈">
      <header><div><Sparkles/><span><small>FUTURE SEJONG · DIGITAL TWIN</small><b>미래 세종관</b></span></div><div className="city-live"><i/> LIVE CITY 2035</div>{open&&<button className="city-close" onClick={()=>setOpen(false)} aria-label="닫기"><X/></button>}</header>
      <main>
        <section className="city-visual" data-theme={selected} key={pulse}>
          <div className="city-beam"/><div className="city-orbit orbit-one"/><div className="city-orbit orbit-two"/>
          <div className="city-model">{buildings.map((building,i)=><i className={`city-building building-${i}`} key={i} style={{height:building.height,left:`${building.left}%`,bottom:`${building.bottom}%`,animationDelay:`${building.delay}s`}}/>)}<div className="city-road road-a"/><div className="city-road road-b"/><div className="city-lake"/><div className="city-government">청사</div><div className="city-brt"><BusFront/></div><div className="city-uam">◆</div>{selected==='energy'&&<><i className="wind wind-a">✣</i><i className="wind wind-b">✣</i></>}{selected==='twin'&&<div className="live-data"><span>인구 <b>402,103</b></span><span>교통량 <b>72%</b></span><span>환경 <b>GOOD</b></span></div>}{selected==='health'&&<div className="health-node"><Activity/> 응급 경로 연결</div>}</div>
          <div className="city-base"><span>SEJONG DIGITAL TWIN</span></div>
        </section>
        <aside className="city-description"><small>{current.eyebrow}</small><current.icon/><h1>{current.title}</h1>{current.lines.map(line=><p key={line}><Check/> {line}</p>)}<div className="city-progress"><span>체험 진행률</span><b>{visited.length} / 5</b><i><em style={{width:`${visited.length*20}%`}}/></i></div>{completed&&<button className="city-summary-button" onClick={saveResult}>AI 체험 결과 보기</button>}</aside>
        {showResult&&<div className="city-result"><Bot/><small>AI EXPERIENCE SUMMARY</small><h2>당신이 경험한 미래 세종</h2><dl><div><dt>스마트 교통</dt><dd>★★★★★</dd></div><div><dt>친환경</dt><dd>★★★★☆</dd></div><div><dt>AI 행정</dt><dd>★★★★★</dd></div><div><dt>문화</dt><dd>★★★☆☆</dd></div></dl><p>모든 기술을 연결해 이동이 편리하고 지속 가능한 도시를 완성했습니다.</p><button onClick={()=>setShowResult(false)}>도시 다시 보기</button></div>}
      </main>
      <nav aria-label="기술 선택">{technologies.map(({id,label,icon:Icon})=><button className={selected===id?'active':''} key={id} onClick={()=>choose(id)}><span><Icon/></span><b>{label}</b>{visited.includes(id)&&<Check className="visited"/>}</button>)}</nav>
    </section></div>
  </>;
}
