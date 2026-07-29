import { useEffect,useState } from 'react';
import { BookOpen,Check } from 'lucide-react';
import type { UserProfile } from '../types';
import { gameEvents } from '../game/events';
import { countTasteDiscoveryRecords } from '../services/experienceRecommendationProfile';
import { GreenhouseProgressService,greenhouseCompletion } from '../services/greenhouseProgress';
import { loadBearProgress } from '../data/bear-wildlife';
import './ChungnyeongNotebook.css';

const TOTAL_PAGES=8;
const NATURE_LOCATIONS=['베어트리파크','수목원'];

function natureChapterSnapshot(userKey:string,location:string){
  let visits:string[]=[];
  try{
    const parsed=JSON.parse(localStorage.getItem(`nature-discovery-visits-v1:${userKey.trim().toLowerCase()||'guest'}`)??'[]') as unknown;
    if(Array.isArray(parsed))visits=parsed.filter((item):item is string=>typeof item==='string');
  }catch{/* Invalid local progress starts from the current visit. */}
  const greenhouse=new GreenhouseProgressService(localStorage,userKey).load();
  const completion=greenhouseCompletion(greenhouse);
  const forest=visits.includes('forest')||NATURE_LOCATIONS.includes(location);
  const bear=Boolean(loadBearProgress(userKey).completedAt);
  const completed=[forest,bear,completion.analysisUnlocked,Boolean(greenhouse.representativePlant)].filter(Boolean).length;
  const next=completed===4
    ?'자연 감성 여정 완료! 나의 대표 식물과 AI 마음 기록이 저장됐어요.'
    :!forest
      ?'다음 체험: 베어트리파크를 걸으며 숲 산책 시작하기'
      :!bear
         ?visits.includes('bear')||location==='AI 생태 탐험 연구소'?'다음 체험: 역할을 나눠 AI 생태 보고서 완성하기':'다음 체험: AI 생태 탐험 연구소 들어가기'
        :!completion.analysisUnlocked
          ?`다음 체험: 수목원에서 AI 마음 기록하기 (${completion.count}/3종)`
          :'다음 체험: 세 식물 중 가장 기억에 남는 대표 식물과 이유 선택하기';
  return {completed,next};
}

export function ChungnyeongNotebook({profile}:{profile:UserProfile}){
  const count=()=>countTasteDiscoveryRecords(profile);
  const [recordCount,setRecordCount]=useState(count);
  const pages=Math.min(TOTAL_PAGES,recordCount);
  const [location,setLocation]=useState('세종호수공원');
  const [natureProgress,setNatureProgress]=useState(()=>natureChapterSnapshot(profile.nickname,'세종호수공원'));

  useEffect(()=>{
    const refresh=()=>window.setTimeout(()=>{
      setRecordCount(count());
      setNatureProgress(natureChapterSnapshot(profile.nickname,location));
    },0);
    const locationChanged=(name:string)=>{
      setLocation(name);
      window.setTimeout(()=>setNatureProgress(natureChapterSnapshot(profile.nickname,name)),0);
    };
    window.addEventListener('sejong-lake-interest-updated',refresh);
    gameEvents.on('greenhouse-progress-changed',refresh);
    gameEvents.on('bear-wildlife-progress-changed',refresh);
    gameEvents.on('map-travel-complete',refresh);
    gameEvents.on('location-changed',locationChanged);
    return()=>{
      window.removeEventListener('sejong-lake-interest-updated',refresh);
      gameEvents.off('greenhouse-progress-changed',refresh);
      gameEvents.off('bear-wildlife-progress-changed',refresh);
      gameEvents.off('map-travel-complete',refresh);
      gameEvents.off('location-changed',locationChanged);
    };
  },[profile,location]);

  const isNatureChapter=NATURE_LOCATIONS.includes(location);
  const displayPages=isNatureChapter?natureProgress.completed:pages;
  const displayTotal=isNatureChapter?4:TOTAL_PAGES;
  const complete=displayPages===displayTotal;

  return <aside className={`chungnyeong-notebook ${complete?'is-complete':''} ${location==='세종호수공원'?'is-lake-park':''} ${isNatureChapter?'is-nature-chapter':''}`} aria-label={isNatureChapter?`자연 감성 발견 ${displayPages}/${displayTotal}단계`:`충녕이의 누적 탐험 기록 ${recordCount}개`}>
    <span className="chungnyeong-notebook-avatar">👑<i><BookOpen size={10}/></i></span>
    <div>
      <small>{isNatureChapter?'인공지능 동행자 충녕이 · 자연 감성 발견':'인공지능 동행자 충녕이 · 누적 탐험 기록'}</small>
      <b>{isNatureChapter?natureProgress.next:pages===TOTAL_PAGES?'첫 기록 묶음이 완성됐어! 다음 공간에서도 계속 발견해보자.':'선택하고 탐험할 때마다 새로운 기록이 쌓여요'}</b>
      <p>{isNatureChapter?'숲 산책 → AI 곰 생태 탐험 → 식물 AI 마음 기록 3종 → 대표 식물 선택':pages===TOTAL_PAGES?'지금까지 모은 기록에 자연 감성·협력 방식·가치관을 계속 더할 수 있어요.':'첫 취향 발견 · 자연 감성 발견 · 협력 방식 발견'}</p>
      <div className="chungnyeong-notebook-pages" style={{gridTemplateColumns:`repeat(${displayTotal},1fr)`}}>{Array.from({length:displayTotal},(_,index)=><i className={index<displayPages?'filled':''} key={index}>{index<displayPages&&<Check size={8}/>}</i>)}</div>
    </div>
    <em><strong>{isNatureChapter?`${displayPages}/${displayTotal}`:recordCount}</strong><span>{isNatureChapter?'단계':'누적'}</span></em>
  </aside>;
}
