import { Headphones, LockKeyhole, Sparkles, Users, X } from 'lucide-react';
import { useState } from 'react';
import type { PlayerState,PublicMatchProfile } from '../../shared/socket-events';
import { CharacterPreview } from './CharacterPreview';
import { recordCampusProfileSignal } from '../services/campusProfileSignals';

type MatchResult={
  totalScore:number;
  reason:string;
  sharedInterests:string[];
  sharedPurposes:string[];
  sharedExperienceRecords:string[];
};

const cleanInterest=(value:string)=>value.replace(/^.*?:\s*/,'').replace(/\s+/g,'');

export function CampusStudentHall({players,matches,profileBasis,nickname,loading,onProfile,onDirectChat,onNotice,onClose}:{players:PlayerState[];matches:Record<string,MatchResult>;profileBasis:PublicMatchProfile;nickname:string;loading:boolean;onProfile:(player:PlayerState)=>void;onDirectChat:(player:PlayerState)=>void;onNotice:(message:string)=>void;onClose:()=>void}){
  const [listening,setListening]=useState<string|null>(null);
  const activePlayers=players.filter(player=>matches[player.id]).slice(0,3);
  const profileKeywords=[profileBasis.mbti,...profileBasis.interests,...profileBasis.usagePurposes,...profileBasis.preferredPlaceCategories].filter(Boolean).slice(0,5);

  const toggleListen=(id:string,name:string)=>{
    const next=listening===id?null:id;
    setListening(next);
    if(next)recordCampusProfileSignal(nickname,{mapId:'student-hall',zone:'학생회관',action:'explore-together',subject:id,title:`${name}님과 함께 둘러보기`,note:'추천받은 이웃과 캠퍼스를 함께 살펴보기로 했어요',point:6,keywords:['함께 탐험','새로운 만남'],axes:{relation:6,explore:2}});
    onNotice(next?`${name}님의 공개 음성 소개를 재생해요.`:'음성 소개 재생을 멈췄어요.');
  };
  const openProfile=(player:PlayerState)=>{recordCampusProfileSignal(nickname,{mapId:'student-hall',zone:'학생회관',action:'recommended-profile',subject:player.id,title:'추천 이웃 프로필 확인',note:`${player.nickname}님의 공통 관심사와 공개 프로필을 살펴봤어요`,point:3,keywords:['관심사 중심','신중한 연결'],axes:{relation:2,explore:1}});onProfile(player)};
  const requestChat=(player:PlayerState)=>{recordCampusProfileSignal(nickname,{mapId:'student-hall',zone:'학생회관',action:'chat-request',subject:player.id,title:'추천 이웃에게 대화 신청',note:`${player.nickname}님과 새로운 대화를 시작했어요`,point:8,keywords:['대화에 열린','새로운 만남'],axes:{relation:8}});onDirectChat(player)};

  return <section className="student-match-panel" aria-label="나와 잘 맞는 사람 추천">
    <header className="student-match-header">
      <div>
        <span><Sparkles size={14}/></span>
        <div><h2>당신과 잘 맞는 사람</h2><p><LockKeyhole size={12}/> 프로필은 나에게만 보여요</p></div>
      </div>
    </header>

    <div className="student-match-list">
      {activePlayers.length?activePlayers.map(player=>{
        const match=matches[player.id];
        const interests=[...(match?.sharedInterests??[]),...(match?.sharedPurposes??[]),...(match?.sharedExperienceRecords??[])].map(cleanInterest).filter(Boolean).slice(0,5);
        const score=match.totalScore;
        return <article className="student-match-card" key={player.id}>
          <div className="student-match-person">
            <div className="student-match-avatar"><CharacterPreview parts={player.appearance} small/></div>
            <div className="student-match-identity"><h3>{player.nickname}</h3><small>공통 관심사</small></div>
            <strong>{score}<em>%</em></strong>
          </div>
          <div className="student-match-tags">{(interests.length?interests:['새로운이웃','캠퍼스']).map((tag,index)=><span key={`${tag}-${index}`}>#{tag}</span>)}</div>
          <div className="student-match-actions">
            <button type="button" onClick={()=>openProfile(player)}>프로필 보기</button>
            <button type="button" className="primary" onClick={()=>requestChat(player)}>대화 신청</button>
          </div>
          <button type="button" className={listening===player.id?'student-listen is-playing':'student-listen'} onClick={()=>toggleListen(player.id,player.nickname)}><Headphones size={12}/>{listening===player.id?'소개 재생 중':'같이 둘러보기'}</button>
        </article>;
      }):<div className="student-match-empty"><Sparkles/><b>{loading?'실제 프로필을 비교하고 있어요':'추천할 수 있는 접속자가 아직 없어요'}</b><p>{loading?'가입 프로필과 지금까지의 체험 기록을 함께 읽는 중입니다.':'다른 사용자가 접속하면 공개한 실제 프로필과 내 프로필을 비교해 추천합니다.'}</p>{!loading&&profileKeywords.length>0&&<div>{profileKeywords.map(keyword=><span key={keyword}>#{cleanInterest(keyword)}</span>)}</div>}</div>}
    </div>

    <footer className="student-match-footer">
      <span><Users size={13}/> 내 실제 프로필 {profileBasis.experienceRecords.length?`· 체험 기록 ${profileBasis.experienceRecords.length}개 포함`:''}을 바탕으로 업데이트돼요</span>
      <button type="button" onClick={onClose} aria-label="추천 목록 닫기"><X size={20}/></button>
    </footer>
  </section>;
}
