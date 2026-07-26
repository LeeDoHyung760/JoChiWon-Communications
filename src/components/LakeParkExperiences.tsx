import { useEffect,useMemo,useState } from 'react';
import { CalendarDays,MapPin,Send,Sparkles,Users,X } from 'lucide-react';
import type { LakeDailyStats,LakeExperienceId,LakeWish,PlayerState } from '../../shared/socket-events';
import { gameEvents } from '../game/events';
import { socket } from '../game/systems/socketClient';
import './LakeParkExperiences.css';

type NearbyExperience={id:LakeExperienceId;label:string;description:string};

const missions=[
  '중앙광장에서 오늘의 소식을 확인해 보세요.',
  '바람의 언덕에 따뜻한 소원 한 줄을 남겨보세요.',
  '호수공원에서 만난 이웃에게 먼저 인사해 보세요.',
  '두 개의 빛나는 체험 공간을 모두 방문해 보세요.',
];
const events=[
  '바람 우체국 · 소원 나누기',
  '호수공원 산책 주간',
  '오늘의 이웃 인사 캠페인',
  '세종의 마음 모으기',
];

export function LakeParkExperiences(){
  const [location,setLocation]=useState('세종호수공원');
  const [onlineCount,setOnlineCount]=useState(1);
  const [nearby,setNearby]=useState<NearbyExperience|null>(null);
  const [active,setActive]=useState<LakeExperienceId|null>(null);
  const [editorOpen,setEditorOpen]=useState(false);
  const [placementNotice,setPlacementNotice]=useState('');
  const [wishes,setWishes]=useState<LakeWish[]>([]);
  const [wishText,setWishText]=useState('');
  const [wishSending,setWishSending]=useState(false);
  const [wishStatus,setWishStatus]=useState('');
  const [stats,setStats]=useState<LakeDailyStats>({date:'',visitors:onlineCount,centralPlazaVisits:0,windHillVisits:0,popularExperience:'아직 집계 중'});
  const daily=useMemo(()=>{
    const day=Math.floor(Date.now()/86_400_000);
    return {mission:missions[day%missions.length],event:events[day%events.length]};
  },[]);

  useEffect(()=>{
    const proximity=(experience:NearbyExperience|null)=>setNearby(experience);
    const locationChanged=(name:string)=>setLocation(name);
    gameEvents.on('lake-experience-proximity-changed',proximity);
    gameEvents.on('location-changed',locationChanged);
    return()=>{gameEvents.off('lake-experience-proximity-changed',proximity);gameEvents.off('location-changed',locationChanged)};
  },[]);
  useEffect(()=>{
    const replaceWishes=(next:LakeWish[])=>setWishes(next.slice(-80));
    const addWish=(wish:LakeWish)=>setWishes(current=>[...current.filter(item=>item.id!==wish.id),wish].slice(-80));
    const updateStats=(next:LakeDailyStats)=>setStats(next);
    const updateOnline=(players:PlayerState[])=>setOnlineCount(Math.max(1,players.length));
    socket.on('lakeWishesUpdated',replaceWishes);
    socket.on('lakeWishAdded',addWish);
    socket.on('lakeDailyStatsUpdated',updateStats);
    socket.on('onlineUsersUpdated',updateOnline);
    return()=>{
      socket.off('lakeWishesUpdated',replaceWishes);
      socket.off('lakeWishAdded',addWish);
      socket.off('lakeDailyStatsUpdated',updateStats);
      socket.off('onlineUsersUpdated',updateOnline);
    };
  },[]);
  useEffect(()=>{if(location!=='세종호수공원'){setActive(null);setEditorOpen(false);setNearby(null)}},[location]);

  const openExperience=(id:LakeExperienceId)=>{
    socket.emit('enterLakeExperience',id);
    setActive(id);
    setPlacementNotice('');
  };
  const moveExperience=(id:LakeExperienceId)=>{
    gameEvents.emit('lake-experience-move-to-player',id);
    setPlacementNotice(`${id==='central-plaza'?'중앙광장':'바람의 언덕'} 빛 원을 현재 위치로 옮겼어요.`);
  };
  const submitWish=()=>{
    const message=wishText.trim();
    if(!message||wishSending)return;
    setWishSending(true);
    setWishStatus('바람에 소원을 싣고 있어요…');
    let finished=false;
    const timeout=window.setTimeout(()=>{
      if(finished)return;
      finished=true;
      setWishSending(false);
      setWishStatus('소원을 보내지 못했어요. 서버를 확인한 뒤 다시 시도해 주세요.');
    },5000);
    socket.emit('addLakeWish',message,result=>{
      if(finished)return;
      finished=true;
      window.clearTimeout(timeout);
      setWishSending(false);
      if(!result.ok||!result.wish){
        setWishStatus(result.message??'소원을 보내지 못했어요. 다시 시도해 주세요.');
        return;
      }
      setWishes(current=>[...current.filter(item=>item.id!==result.wish!.id),result.wish!].slice(-80));
      setWishText(current=>current.trim()===message?'':current);
      setWishStatus('소원이 바람을 타고 도착했어요.');
    });
  };

  if(location!=='세종호수공원')return null;
  return <>
    <div className={`lake-experience-editor ${editorOpen?'is-open':''}`}>
      <button type="button" className="lake-experience-editor-toggle" onClick={()=>setEditorOpen(open=>!open)}><MapPin size={15}/><span>체험 위치 편집</span></button>
      {editorOpen&&<div className="lake-experience-editor-menu">
        <small>원하는 장소로 이동한 뒤 버튼을 누르면 캐릭터가 서 있는 곳에 빛 원이 놓입니다.</small>
        <button type="button" onClick={()=>moveExperience('central-plaza')}><i className="central"/>중앙광장 위치로 지정</button>
        <button type="button" onClick={()=>moveExperience('wind-hill')}><i className="wind"/>바람의 언덕 위치로 지정</button>
        {placementNotice&&<p>{placementNotice}</p>}
      </div>}
    </div>

    {nearby&&!active&&<button type="button" className={`lake-experience-enter is-${nearby.id}`} onClick={()=>openExperience(nearby.id)}>
      <span>{nearby.id==='central-plaza'?'🏛️':'🍃'}</span>
      <div><small>빛나는 공간을 발견했어요</small><b>{nearby.label} 체험하기</b><em>{nearby.description}</em></div>
      <Sparkles size={18}/>
    </button>}

    {active==='central-plaza'&&<div className="lake-experience-overlay" role="dialog" aria-modal="true" aria-labelledby="central-plaza-title">
      <section className="central-plaza-panel">
        <button type="button" className="lake-experience-close" onClick={()=>setActive(null)} aria-label="중앙광장 닫기"><X size={18}/></button>
        <header>
          <span>🏛️</span>
          <div><small>SEJONG LAKE PARK · TODAY</small><h2 id="central-plaza-title">오늘의 중앙광장</h2><p>사람과 소식이 모이는 호수공원의 중심이에요.</p></div>
        </header>
        <div className="central-plaza-stats">
          <article><Users size={19}/><small>오늘 접속한 사람</small><strong>{Math.max(stats.visitors,onlineCount)}명</strong><em>현재 호수공원 {onlineCount}명</em></article>
          <article><Sparkles size={19}/><small>오늘 인기 체험</small><strong>{stats.popularExperience}</strong><em>중앙광장 {stats.centralPlazaVisits} · 바람의 언덕 {stats.windHillVisits}</em></article>
        </div>
        <div className="central-plaza-board">
          <article><span>✓</span><div><small>TODAY'S MISSION</small><strong>오늘의 미션</strong><p>{daily.mission}</p></div></article>
          <article><span>✦</span><div><small>TODAY'S EVENT</small><strong>오늘의 이벤트</strong><p>{daily.event}</p></div></article>
        </div>
        <footer><CalendarDays size={14}/><span>{stats.date||'오늘'}의 광장 소식은 자정에 새로 바뀝니다.</span></footer>
      </section>
    </div>}

    {active==='wind-hill'&&<div className="lake-experience-overlay wind-hill-overlay" role="dialog" aria-modal="true" aria-labelledby="wind-hill-title">
      <div className="wind-petals" aria-hidden="true">{Array.from({length:20},(_,index)=><i key={index} style={{left:`${(index*37)%100}%`,animationDelay:`-${index*.43}s`,animationDuration:`${5+index%5}s`}}/>)}</div>
      <section className="wind-hill-panel">
        <button type="button" className="lake-experience-close" onClick={()=>setActive(null)} aria-label="바람의 언덕 닫기"><X size={18}/></button>
        <header><span>🍃</span><small>WIND HILL · WISH GARDEN</small><h2 id="wind-hill-title">바람의 언덕</h2><p>잠시 바람을 맞으며 마음속 소원을 남겨보세요.<br/>꽃잎이 소원을 다른 이웃에게 전해줄 거예요.</p></header>
        <div className="wind-wish-compose">
          <label htmlFor="wind-wish">바람에 실어 보낼 한마디</label>
          <div><input id="wind-wish" value={wishText} maxLength={80} onChange={event=>{setWishText(event.target.value);setWishStatus('')}} onKeyDown={event=>{if(event.key==='Enter'&&!event.nativeEvent.isComposing)submitWish()}} placeholder="예: 모두 건강하고 행복했으면 좋겠어요."/><button type="button" onClick={submitWish} disabled={wishSending||!wishText.trim()} aria-label="소원 보내기"><Send size={17}/></button></div>
          <small>{wishText.length}/80 · 소원은 호수공원의 다른 이웃에게도 보여요.</small>
          {wishStatus&&<p className={wishStatus.includes('못했어요')?'is-error':'is-success'}>{wishStatus}</p>}
        </div>
        <div className="wind-wish-list">
          <div><strong>바람이 전해준 소원</strong><small>최근 소원 {wishes.length}개</small></div>
          {wishes.length?<ul>{[...wishes].reverse().slice(0,8).map(wish=><li key={wish.id}><span>🌸</span><p>{wish.message}<small>{wish.nickname} · {new Date(wish.createdAt).toLocaleDateString('ko-KR',{month:'short',day:'numeric'})}</small></p></li>)}</ul>:<div className="wind-wish-empty">아직 도착한 소원이 없어요.<br/>첫 번째 소원을 바람에 실어보세요.</div>}
        </div>
      </section>
    </div>}
  </>;
}
