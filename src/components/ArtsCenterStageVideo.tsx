import {useEffect,useMemo,useRef,useState} from 'react';
import {Armchair,ExternalLink,Maximize2,Minimize2,Play,Square,X} from 'lucide-react';
import type {MapId} from '../../shared/socket-events';
import {ARTS_CENTER_PERFORMANCES} from '../game/artsCenterPerformances';
import {ARTS_CENTER_VIDEOS} from '../game/artsCenterVideos';
import {gameEvents} from '../game/events';
import {recordExperienceAction,type ExperienceAnalysisResult} from '../services/experienceHarness';
import './ArtsCenterStageVideo.css';

type ScreenRect={left:number;top:number;width:number;height:number};
type SeatState={id:string;seated?:boolean}|null;

export function ArtsCenterStageVideo(){
  const [selectedIndex,setSelectedIndex]=useState<number|null>(null);
  const [videoIndex,setVideoIndex]=useState(0);
  const [seat,setSeat]=useState<SeatState>(null);
  const [rect,setRect]=useState<ScreenRect|null>(null);
  const [expanded,setExpanded]=useState(false);
  const autoExpandedForSeat=useRef(false);
  const iframeRef=useRef<HTMLIFrameElement>(null);
  const watchStartedAt=useRef<number|null>(null);
  const finishWatchSegment=useRef<(reason:'pause'|'stop'|'finish')=>number>(()=>0);
  const playCounts=useRef(new Map<number,number>());
  const startedCurrentViewing=useRef(false);
  const [analysis,setAnalysis]=useState<ExperienceAnalysisResult|null>(null);
  const [favoriteIndexes,setFavoriteIndexes]=useState<Set<number>>(()=>new Set());
  useEffect(()=>{
    const selected=({index}:{index:number})=>{setSelectedIndex(index);setVideoIndex(0);setRect(null);setExpanded(false);autoExpandedForSeat.current=false;startedCurrentViewing.current=false};
    const seatChanged=(next:SeatState)=>{setSeat(next);if(!next?.seated){setRect(null);setExpanded(false);autoExpandedForSeat.current=false}};
    const rectChanged=(next:ScreenRect|null)=>{setRect(next);if(next&&!autoExpandedForSeat.current){autoExpandedForSeat.current=true;setExpanded(true)}};
    const mapChanged=(mapId:MapId)=>{if(mapId!=='arts-center'){setSelectedIndex(null);setSeat(null);setRect(null)}};
    gameEvents.on('arts-center-video-select',selected);
    gameEvents.on('arts-center-seat-proximity-changed',seatChanged);
    gameEvents.on('arts-center-stage-screen-rect',rectChanged);
    gameEvents.on('map-travel-complete',mapChanged);
    const analyzed=(result:ExperienceAnalysisResult)=>{setAnalysis(result);window.setTimeout(()=>setAnalysis(null),6500)};
    gameEvents.on('experience-profile-updated',analyzed);
    return()=>{
      gameEvents.off('arts-center-video-select',selected);
      gameEvents.off('arts-center-seat-proximity-changed',seatChanged);
      gameEvents.off('arts-center-stage-screen-rect',rectChanged);
      gameEvents.off('map-travel-complete',mapChanged);
      gameEvents.off('experience-profile-updated',analyzed);
    };
  },[]);
  useEffect(()=>{
    if(!expanded)return;
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setExpanded(false)};
    window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);
  },[expanded]);
  const performance=selectedIndex===null?null:ARTS_CENTER_PERFORMANCES[selectedIndex];
  const videos=useMemo(()=>selectedIndex===null?[]:ARTS_CENTER_VIDEOS[selectedIndex]??[],[selectedIndex]);
  const video=videos[Math.min(videoIndex,Math.max(0,videos.length-1))];
  useEffect(()=>{
    if(selectedIndex===null||!seat?.seated||!rect||!video)return;
    const finishSegment=(reason:'pause'|'stop'|'finish')=>{
      if(watchStartedAt.current===null)return 0;
      const durationSeconds=(Date.now()-watchStartedAt.current)/1000;watchStartedAt.current=null;
      if(durationSeconds>=1)recordExperienceAction({type:'watch',performanceId:String(selectedIndex),durationSeconds});
      if(reason==='stop')recordExperienceAction({type:'stop',performanceId:String(selectedIndex),durationSeconds});
      return durationSeconds;
    };
    finishWatchSegment.current=finishSegment;
    const receive=(event:MessageEvent)=>{
      if(!event.origin.includes('youtube.com')&&!event.origin.includes('youtube-nocookie.com'))return;
      let data:unknown=event.data;try{if(typeof data==='string')data=JSON.parse(data)}catch{return}
      const state=data&&typeof data==='object'&&'info' in data?(data as {info?:{playerState?:number}}).info?.playerState:undefined;
      if(state===1&&watchStartedAt.current===null){if(!startedCurrentViewing.current){const count=playCounts.current.get(selectedIndex)??0;if(count)recordExperienceAction({type:'rewatch',performanceId:String(selectedIndex)});playCounts.current.set(selectedIndex,count+1);startedCurrentViewing.current=true}watchStartedAt.current=Date.now()}
      else if(state===2)finishSegment('pause');
      else if(state===0){finishSegment('finish');recordExperienceAction({type:'finish',performanceId:String(selectedIndex)});gameEvents.emit('experience-analysis-request')}
    };
    window.addEventListener('message',receive);
    const listen=()=>iframeRef.current?.contentWindow?.postMessage(JSON.stringify({event:'listening',id:'arts-center-stage'}),'*');listen();
    const timer=window.setInterval(listen,1000);
    return()=>{window.removeEventListener('message',receive);window.clearInterval(timer);finishSegment('stop');finishWatchSegment.current=()=>0};
  },[selectedIndex,seat?.seated,!!rect,video?.youtubeId]);
  const clearSelection=()=>{finishWatchSegment.current('stop');gameEvents.emit('experience-analysis-request');setSelectedIndex(null);setVideoIndex(0);setRect(null);setExpanded(false)};
  const leaveSeat=()=>{finishWatchSegment.current('stop');gameEvents.emit('experience-analysis-request');gameEvents.emit('arts-center-seat-toggle')};
  const saveFavorite=()=>{if(selectedIndex===null||favoriteIndexes.has(selectedIndex))return;setFavoriteIndexes(current=>new Set(current).add(selectedIndex));recordExperienceAction({type:'favorite',performanceId:String(selectedIndex)})};
  if(!performance||!video)return analysis?<AnalysisToast result={analysis}/>:null;
  if(!seat?.seated||!rect)return <aside className="arts-center-video-seat-guide" aria-live="polite">
    <span><Play size={18} fill="currentColor"/></span>
    <div><small>무대 영상 선택 완료</small><b>{performance.title}</b><p>{seat?'가까운 의자에 앉으면 무대에서 영상이 재생돼요.':'객석으로 이동해 가까운 의자에 앉아주세요.'}</p></div>
    {seat&&<button type="button" onClick={()=>gameEvents.emit('arts-center-seat-toggle')}><Armchair size={17}/><kbd>E</kbd> 앉아서 보기</button>}
    <button type="button" className="arts-center-video-selection-delete" onClick={clearSelection} aria-label="선택한 공연 영상 삭제"><X size={17}/>선택 삭제</button>
  </aside>;
  const pageOrigin=window.location.protocol==='http:'||window.location.protocol==='https:'?window.location.origin:'';
  const embedParameters=new URLSearchParams({rel:'0',playsinline:'1',enablejsapi:'1',hl:'ko'});
  if(pageOrigin){embedParameters.set('origin',pageOrigin);embedParameters.set('widget_referrer',window.location.href)}
  const embedUrl=`https://www.youtube-nocookie.com/embed/${video.youtubeId}?${embedParameters.toString()}`;
  const watchUrl=`https://www.youtube.com/watch?v=${video.youtubeId}`;
  return <section className={`arts-center-stage-video${expanded?' is-expanded':''}`} style={expanded?undefined:{left:rect.left,top:rect.top,width:rect.width,height:rect.height}} aria-label={`${performance.title} 무대 영상`}>
    <header>
      <div><small>STAGE VIDEO</small><b>{performance.title}</b></div>
      {videos.length>1&&<nav aria-label="영상 선택">{videos.map((item,index)=><button type="button" className={index===videoIndex?'active':''} onClick={()=>setVideoIndex(index)} key={item.youtubeId}>{item.title}</button>)}</nav>}
      <button type="button" className="arts-center-stage-favorite" disabled={selectedIndex!==null&&favoriteIndexes.has(selectedIndex)} onClick={saveFavorite}>{selectedIndex!==null&&favoriteIndexes.has(selectedIndex)?'♥ 저장됨':'♡ 관심 저장'}</button>
      <button type="button" className="arts-center-stage-leave-seat" onClick={leaveSeat} aria-label="좌석에서 일어나기"><Armchair size={13}/> 일어나기</button>
      <button type="button" className="arts-center-stage-expand" onClick={()=>setExpanded(value=>!value)} aria-label={expanded?'무대 화면 축소':'무대 화면 확대'}>{expanded?<Minimize2 size={13}/>:<Maximize2 size={13}/>} {expanded?'축소':'확대'}</button>
      <button type="button" className="arts-center-stage-stop" onClick={clearSelection} aria-label="영상 끄기"><Square size={13} fill="currentColor"/> 끄기</button>
    </header>
    <iframe
      ref={iframeRef}
      key={video.youtubeId}
      src={embedUrl}
      title={`${performance.title} - ${video.title}`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="origin-when-cross-origin"
      allowFullScreen
    />
    <footer><b>{video.title}</b><span>{video.source}</span><a href={watchUrl} target="_blank" rel="noopener noreferrer">재생이 안 되면 YouTube에서 보기 <ExternalLink size={10}/></a></footer>
    {analysis&&<AnalysisToast result={analysis}/>}
  </section>;
}

const scoreLabels:Record<string,string>={culture:'문화예술 관심도',immersion:'공연 몰입도',preference:'선호 확신도',appreciation:'객석 감상',musical:'뮤지컬 선호',play:'연극 선호',jazz:'재즈 선호',traditional:'전통공연 선호',classical:'클래식 선호',variety:'장르 탐색'};
function AnalysisToast({result}:{result:ExperienceAnalysisResult}){const scores=Object.entries(result.summary.scores).filter(([,value])=>value>0).sort((a,b)=>b[1]-a[1]).slice(0,4);return <aside className="arts-center-analysis-toast"><span>✨</span><div><small>AI가 실제 관람 행동을 분석했어요</small><h3>{result.profile.tags.join(' · ')}</h3>{scores.map(([key,value])=><p key={key}>✓ {scoreLabels[key]??key} <b>+{value}</b></p>)}<em>{result.profile.summary}</em></div></aside>}
