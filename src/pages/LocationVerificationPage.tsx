import { useState } from 'react';
import { Check,Eye,LoaderCircle,LocateFixed,LockKeyhole,Map,MapPin,MessageCircle,Store,Users } from 'lucide-react';
import type { WorldAccessMode } from '../stores/profileStore';
import './LocationVerificationPage.css';

const isInsideSejong=(latitude:number,longitude:number)=>latitude>=36.38&&latitude<=36.73&&longitude>=127.10&&longitude<=127.43;

export function LocationVerificationPage({onComplete}:{onComplete:(mode:Exclude<WorldAccessMode,'unverified'>)=>void}){
  const [status,setStatus]=useState<'ready'|'checking'|'outside'|'denied'>('ready');
  const verify=()=>{
    if(!navigator.geolocation){setStatus('denied');return}
    setStatus('checking');
    navigator.geolocation.getCurrentPosition(position=>{
      if(isInsideSejong(position.coords.latitude,position.coords.longitude))onComplete('sejong');
      else setStatus('outside');
    },()=>setStatus('denied'),{enableHighAccuracy:true,timeout:10000,maximumAge:300000});
  };
  const unavailable=status==='outside'||status==='denied';
  return <main className="verification-page"><section className="verification-card">
    <header className="verification-top"><span>여기 사람 있음 · SEJONG PASS</span><b>가입 단계 · 2/4</b></header>
    <div className="verification-heading"><span><LocateFixed size={30}/></span><div><small>STEP 1 · 세종 입장 인증</small><h1>세종이라는 도시가<br/><em>하나의 입장권</em>이 됩니다.</h1><p>현재 위치를 한 번 확인하고 이용 가능한 월드를 안내해드릴게요.</p></div></div>
    <div className="verification-modes">
      <article className="experience-mode"><header><Eye size={21}/><div><strong>체험 모드</strong><small>세종시 밖에서도 둘러볼 수 있어요</small></div></header><ul><li><Check/> 중심 맵 구경</li><li><Check/> 캐릭터 커스텀</li><li><Check/> 지역 소개 확인</li><li><Check/> 접속자 일부 확인</li></ul></article>
      <article className="sejong-mode"><i>SEJONG WORLD</i><header><MapPin size={21}/><div><strong>세종 월드 접속 완료</strong><small>세종시 안에서 모든 기능이 열려요</small></div></header><ul><li><Map/> 생활권 맵 모두 입장</li><li><MessageCircle/> 실시간 채팅 · 모임 참여</li><li><Users/> 지역 미션 수행</li><li><Store/> 여민전 · 상점 · 행사 정보</li></ul></article>
    </div>
    {unavailable&&<div className="verification-notice"><LockKeyhole size={17}/><span><strong>{status==='outside'?'현재 세종시 밖에 있어요':'위치 확인이 허용되지 않았어요'}</strong><small>체험 모드로 먼저 둘러보고 세종에서 다시 인증할 수 있어요.</small></span></div>}
    <div className="verification-actions"><button type="button" className="verification-demo" onClick={()=>onComplete('experience')}>체험 모드로 둘러보기</button><button type="button" className="verification-check" onClick={verify} disabled={status==='checking'}>{status==='checking'?<><LoaderCircle className="verification-spinner" size={18}/> 위치 확인 중</>:<><LocateFixed size={18}/> 세종 입장 인증하기</>}</button></div>
    <p className="verification-privacy">위치는 세종시 내 접속 여부 확인에만 사용되며 정확한 좌표는 저장하지 않아요.</p>
  </section></main>;
}
