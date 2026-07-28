import { useEffect,useState } from 'react';
import { BookOpen,Check } from 'lucide-react';
import type { UserProfile } from '../types';
import { gameEvents } from '../game/events';
import { countTasteDiscoveryRecords } from '../services/experienceRecommendationProfile';
import './ChungnyeongNotebook.css';

const TOTAL_PAGES=8;

export function ChungnyeongNotebook({profile}:{profile:UserProfile}){
  const count=()=>Math.min(TOTAL_PAGES,countTasteDiscoveryRecords(profile));
  const [pages,setPages]=useState(count);
  const [location,setLocation]=useState('세종호수공원');

  useEffect(()=>{
    const refresh=()=>window.setTimeout(()=>setPages(count()),0);
    const locationChanged=(name:string)=>setLocation(name);
    window.addEventListener('sejong-lake-interest-updated',refresh);
    gameEvents.on('greenhouse-progress-changed',refresh);
    gameEvents.on('map-travel-complete',refresh);
    gameEvents.on('location-changed',locationChanged);
    return()=>{
      window.removeEventListener('sejong-lake-interest-updated',refresh);
      gameEvents.off('greenhouse-progress-changed',refresh);
      gameEvents.off('map-travel-complete',refresh);
      gameEvents.off('location-changed',locationChanged);
    };
  },[profile]);

  return <aside className={`chungnyeong-notebook ${pages===TOTAL_PAGES?'is-complete':''} ${location==='세종호수공원'?'is-lake-park':''}`} aria-label={`충녕이의 취향 기록 ${pages}/${TOTAL_PAGES}개`}>
    <span className="chungnyeong-notebook-avatar">👑<i><BookOpen size={10}/></i></span>
    <div>
      <small>인공지능 동행자 충녕이 · 취향 기록</small>
      <b>{pages===TOTAL_PAGES?'취향 기록 8개를 모두 모았어!':'선택하고 탐험할 때마다 취향 기록이 쌓여요'}</b>
      <p>{pages===TOTAL_PAGES?'모은 기록으로 이웃과 장소를 추천해 드려요.':'공연·먹거리·축제 취향 분석 · 장소 탐험 · 식물 관찰'}</p>
      <div className="chungnyeong-notebook-pages">{Array.from({length:TOTAL_PAGES},(_,index)=><i className={index<pages?'filled':''} key={index}>{index<pages&&<Check size={8}/>}</i>)}</div>
    </div>
    <em><strong>{pages}/{TOTAL_PAGES}</strong><span>기록</span></em>
  </aside>;
}
