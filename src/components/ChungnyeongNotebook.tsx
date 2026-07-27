import { useEffect,useState } from 'react';
import { BookOpen,Check } from 'lucide-react';
import type { UserProfile } from '../types';
import { gameEvents } from '../game/events';
import { buildExperienceRecommendationProfile } from '../services/experienceRecommendationProfile';
import './ChungnyeongNotebook.css';

const TOTAL_PAGES=8;

export function ChungnyeongNotebook({profile}:{profile:UserProfile}){
  const count=()=>Math.min(TOTAL_PAGES,buildExperienceRecommendationProfile(profile).experienceRecords.length);
  const [pages,setPages]=useState(count);

  useEffect(()=>{
    const refresh=()=>window.setTimeout(()=>setPages(count()),0);
    window.addEventListener('sejong-lake-interest-updated',refresh);
    gameEvents.on('greenhouse-progress-changed',refresh);
    gameEvents.on('map-travel-complete',refresh);
    return()=>{
      window.removeEventListener('sejong-lake-interest-updated',refresh);
      gameEvents.off('greenhouse-progress-changed',refresh);
      gameEvents.off('map-travel-complete',refresh);
    };
  },[profile]);

  return <aside className={`chungnyeong-notebook ${pages===TOTAL_PAGES?'is-complete':''}`} aria-label={`충녕이의 취향 수첩 ${pages}/${TOTAL_PAGES}장`}>
    <span className="chungnyeong-notebook-avatar">👑<i><BookOpen size={10}/></i></span>
    <div>
      <small>AI 동행자 충녕이 · 취향 수첩</small>
      <b>{pages===TOTAL_PAGES?'네 취향을 모두 기억했어!':'네가 좋아하는 것을 내가 기억하고 있어!'}</b>
      <div className="chungnyeong-notebook-pages">{Array.from({length:TOTAL_PAGES},(_,index)=><i className={index<pages?'filled':''} key={index}>{index<pages&&<Check size={8}/>}</i>)}</div>
    </div>
    <em>{pages}/{TOTAL_PAGES}</em>
  </aside>;
}
