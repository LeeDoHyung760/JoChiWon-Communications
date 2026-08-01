import {useEffect,useState} from 'react';
import {ArrowLeft,ExternalLink,Play,X} from 'lucide-react';
import {ARTS_CENTER_PERFORMANCES,artsCenterPerformanceImageUrl} from '../game/artsCenterPerformances';
import {gameEvents} from '../game/events';
import './ArtsCenterPosterKiosk.css';

type PosterFocus={active:boolean;index:number;ready:boolean};
type PosterRect={left:number;top:number;width:number;height:number};
type PosterButtonEvent=React.PointerEvent<HTMLButtonElement>|React.MouseEvent<HTMLButtonElement>;

export function ArtsCenterPosterKiosk(){
  const [focus,setFocus]=useState<PosterFocus>({active:false,index:0,ready:false});
  const [rect,setRect]=useState<PosterRect|null>(null);
  const [detailOpen,setDetailOpen]=useState(false);
  useEffect(()=>{
    const changed=(next:PosterFocus)=>{setFocus(next);setDetailOpen(false)};
    const rectChanged=(next:PosterRect|null)=>setRect(next);
    gameEvents.on('arts-center-poster-focus-mode-changed',changed);
    gameEvents.on('arts-center-poster-screen-rect',rectChanged);
    return()=>{gameEvents.off('arts-center-poster-focus-mode-changed',changed);gameEvents.off('arts-center-poster-screen-rect',rectChanged)};
  },[]);
  if(!focus.active)return null;
  const performance=ARTS_CENTER_PERFORMANCES[Math.max(0,Math.min(ARTS_CENTER_PERFORMANCES.length-1,focus.index))];
  const closePoster=(event:PosterButtonEvent)=>{
    event.preventDefault();
    event.stopPropagation();
    setFocus(current=>({...current,active:false,ready:false}));
    setRect(null);
    gameEvents.emit('arts-center-poster-focus-close');
  };
  const selectVideo=(event:React.MouseEvent<HTMLButtonElement>)=>{
    gameEvents.emit('arts-center-video-select',{index:focus.index});
    closePoster(event);
  };
  return <div className="arts-center-poster-focus-marker" role="dialog" aria-modal="true" aria-label={`${performance.title} 공연 포스터`}>
    {focus.ready&&rect&&<article className="arts-center-editable-poster" style={{left:rect.left,top:rect.top,width:rect.width,height:rect.height}}>
      <button className="arts-center-poster-close" type="button" onPointerDown={closePoster} onClick={closePoster} aria-label="포스터 닫기"><X size={20}/></button>
      {!detailOpen&&<><img src={artsCenterPerformanceImageUrl(performance)} alt={`${performance.title} 공연 이미지`}/>
      <div className="arts-center-editable-poster-copy">
        <span className="arts-center-poster-category" style={{background:performance.accent}}>{performance.category}</span>
        <small>세종예술의전당 공식 공연</small>
        <h2>{performance.title}</h2>
        <p>{performance.description}</p>
        <dl><div><dt>일정</dt><dd>{performance.date}</dd></div><div><dt>장소</dt><dd>{performance.venue}</dd></div></dl>
        <button className="arts-center-watch-button" type="button" onClick={selectVideo}><Play size={19} fill="currentColor"/>영상 보기</button>
        <button className="arts-center-poster-detail-link" type="button" onClick={()=>setDetailOpen(true)}>공식 공연 정보 보기 <span>→</span></button>
      </div></>}
      {detailOpen&&<section className="arts-center-poster-detail-page">
        <button type="button" className="arts-center-poster-back" onClick={()=>setDetailOpen(false)}><ArrowLeft size={16}/> 포스터로 돌아가기</button>
        <small>SEJONG ARTS CENTER · PERFORMANCE INFO</small>
        <h2>{performance.title}</h2>
        <p>{performance.description}</p>
        <dl>
          <div><dt>공연 일정</dt><dd>{performance.date}</dd></div>
          <div><dt>공연 장소</dt><dd>{performance.venue}</dd></div>
          <div><dt>관람 등급</dt><dd>{performance.age}</dd></div>
          <div><dt>러닝타임</dt><dd>{performance.runtime}</dd></div>
          <div><dt>가격</dt><dd>{performance.price}</dd></div>
          <div><dt>주최</dt><dd>{performance.host}</dd></div>
          <div><dt>주관</dt><dd>{performance.organizer}</dd></div>
          <div><dt>문의</dt><dd>{performance.inquiry}</dd></div>
        </dl>
        <a href={performance.detailUrl} target="_blank" rel="noreferrer">세종예술의전당 공식 페이지 <ExternalLink size={15}/></a>
      </section>}
    </article>}
  </div>;
}
