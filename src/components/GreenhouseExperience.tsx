import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { BookOpen,Check,ChevronLeft,ChevronRight,ImageOff,Leaf,Lock,MoreVertical,Search,Sparkles,Trash2,X,ZoomIn } from 'lucide-react';
import type { MapId } from '../../shared/socket-events';
import { greenhousePlantById,greenhousePlants,GREENHOUSE_PLANT_TOTAL,type PlantCategory } from '../data/greenhouse-plants';
import { gameEvents } from '../game/events';
import { requestMemoryLetter,requestPlantMessage } from '../services/greenhouseAi';
import { createFallbackPlantMessage,dominantEmotion,GREENHOUSE_EMOTIONS,GreenhouseProgressService,greenhouseCompletion,greenhouseInputLocked,normalizeMemoryText,type GreenhouseEmotion,type GreenhouseProgress,type MemoryLeaf } from '../services/greenhouseProgress';
import { hasUsablePlantImage,plantGallery } from '../services/plantImages';
import './GreenhouseExperience.css';

type View='intro'|'plant'|'book'|'memory'|'complete'|null;
type Nearby={kind:'plant';plantId:string;distance:number}|{kind:'memory-tree';distance:number}|null;
const date=(value:string)=>new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'short',day:'numeric'}).format(new Date(value));
const memoryPlaceholders:Record<string,string>={
  '오늘 가장 기억에 남은 순간':'오늘 수목원에서 가장 기억에 남은 순간은 무엇인가요?',
  '미래의 나에게 남길 말':'미래의 내가 다시 읽었으면 하는 말을 남겨보세요.',
  '다음에 올 나에게 남길 말':'다음에 이 수목원을 찾을 나에게 어떤 말을 남기고 싶나요?',
};

export function GreenhouseExperience({userKey}:{userKey:string}){
  const service=useMemo(()=>new GreenhouseProgressService(localStorage,userKey),[userKey]);
  const [active,setActive]=useState(false),[view,setView]=useState<View>(null),[nearby,setNearby]=useState<Nearby>(null);
  const [progress,setProgress]=useState<GreenhouseProgress>(()=>service.load());
  const [plantId,setPlantId]=useState<string|null>(null),[emotion,setEmotion]=useState<GreenhouseEmotion|null>(null);
  const [message,setMessage]=useState(''),[loadingMessage,setLoadingMessage]=useState(false),[filter,setFilter]=useState<'all'|'flower'|'tree'>('all');
  const [imageFailed,setImageFailed]=useState(false),[imageLoading,setImageLoading]=useState(false),[lightboxIndex,setLightboxIndex]=useState<number|null>(null);
  const modalRef=useRef<HTMLDivElement>(null),previousFocusRef=useRef<HTMLElement|null>(null);
  const [memoryType,setMemoryType]=useState('오늘 가장 기억에 남은 순간'),[memoryText,setMemoryText]=useState(''),[letter,setLetter]=useState(''),[loadingLetter,setLoadingLetter]=useState(false),[selectedLeaf,setSelectedLeaf]=useState<MemoryLeaf|null>(null);
  const completion=greenhouseCompletion(progress),plant=plantId?greenhousePlantById.get(plantId):undefined;
  const modalOpen=greenhouseInputLocked(view);

  const publish=useCallback((next:GreenhouseProgress)=>{
    setProgress(next);
    const state=greenhouseCompletion(next);
    gameEvents.emit('greenhouse-progress-changed',{collectedIds:next.collected.map(item=>item.plantId),unlocked:state.unlocked,count:state.count});
  },[]);
  const close=useCallback(()=>{setView(null);setSelectedLeaf(null)},[]);
  const observePlant=useCallback(async(id:string)=>{
    const definition=greenhousePlantById.get(id);if(!definition)return;
    const saved=progress.collected.find(item=>item.plantId===id);
    const savedMessage=saved?.aiMessage&&!/^안녕, 나는 꽃 \d/.test(saved.aiMessage)?saved.aiMessage:createFallbackPlantMessage(definition);
    setPlantId(id);setEmotion(saved?.selectedEmotion??null);setMessage(savedMessage??'');setView('plant');
    setImageFailed(false);setImageLoading(Boolean(definition.imageUrl));setLightboxIndex(null);
    if(!saved){
      if(definition.observationGuide){setLoadingMessage(false);setMessage(definition.observationGuide)}
      else{setLoadingMessage(true);const next=await requestPlantMessage(definition);setMessage(next);setLoadingMessage(false)}
    }
  },[progress.collected]);
  const observeNearby=useCallback(()=>{
    if(nearby?.kind==='plant')void observePlant(nearby.plantId);
    if(nearby?.kind==='memory-tree')setView('memory');
  },[nearby,observePlant]);

  useEffect(()=>{setProgress(service.load())},[service]);
  useEffect(()=>{
    const mapChanged=(mapId:MapId)=>{
      const isGarden=mapId==='garden';setActive(isGarden);setNearby(null);
      if(isGarden){
        const current=service.load();publish(current);
        if(!current.introSeen){const next=service.save({...current,introSeen:true});publish(next);setView('intro')}
      }else setView(null);
    };
    const nearbyChanged=(value:Nearby)=>setNearby(value);
    const observe=(id:string)=>void observePlant(id);
    const tree=()=>setView('memory');
    gameEvents.on('map-travel-complete',mapChanged);gameEvents.on('greenhouse-nearby-changed',nearbyChanged);gameEvents.on('greenhouse-observe-plant',observe);gameEvents.on('greenhouse-observe-tree',tree);
    return()=>{gameEvents.off('map-travel-complete',mapChanged);gameEvents.off('greenhouse-nearby-changed',nearbyChanged);gameEvents.off('greenhouse-observe-plant',observe);gameEvents.off('greenhouse-observe-tree',tree)};
  },[observePlant,publish,service]);
  useEffect(()=>{gameEvents.emit('game-input-lock',modalOpen);return()=>{if(modalOpen)gameEvents.emit('game-input-lock',false)}},[modalOpen]);
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{if(!active||event.repeat)return;if(event.key==='Escape'&&lightboxIndex!==null){event.preventDefault();setLightboxIndex(null);return}if(event.key==='Escape'&&modalOpen){event.preventDefault();close();return}if(lightboxIndex!==null&&plant){const gallery=plantGallery(plant);if(event.key==='ArrowLeft')setLightboxIndex(index=>index===null?null:(index-1+gallery.length)%gallery.length);if(event.key==='ArrowRight')setLightboxIndex(index=>index===null?null:(index+1)%gallery.length);return}if(modalOpen)return;if(event.key.toLowerCase()==='e'&&nearby){event.preventDefault();observeNearby()}};
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[active,modalOpen,nearby,observeNearby,close,lightboxIndex,plant]);
  useEffect(()=>{
    if(!modalOpen)return;
    previousFocusRef.current=document.activeElement as HTMLElement;
    window.setTimeout(()=>modalRef.current?.querySelector<HTMLElement>('button,[href],input,textarea,[tabindex]:not([tabindex="-1"])')?.focus());
    return()=>previousFocusRef.current?.focus();
  },[modalOpen]);
  useEffect(()=>{
    if(!modalOpen)return;
    const trap=(event:KeyboardEvent)=>{
      if(event.key!=='Tab'||!modalRef.current)return;
      const focusable=[...modalRef.current.querySelectorAll<HTMLElement>('button:not(:disabled),[href],input:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')];
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    };
    window.addEventListener('keydown',trap);return()=>window.removeEventListener('keydown',trap);
  },[modalOpen]);

  if(!active)return null;
  const existing=plantId?progress.collected.find(item=>item.plantId===plantId):undefined;
  const savePlant=()=>{
    if(!plant||!emotion)return;
    const next=service.collect(progress,plant.id,emotion,message||createFallbackPlantMessage(plant));publish(next);setView('book');
    if(greenhouseCompletion(next).unlocked&&!completion.unlocked)window.setTimeout(()=>setView('complete'),250);
  };
  const generateLetter=async()=>{
    if(memoryText.trim().length<2)return;
    setLoadingLetter(true);
    const normalized=normalizeMemoryText(memoryText);setMemoryText(normalized);
    const dominant=dominantEmotion(progress.collected);
    const plants=progress.collected.map(item=>({name:greenhousePlantById.get(item.plantId)?.displayName??item.plantId,emotion:item.selectedEmotion}));
    setLetter(await requestMemoryLetter(normalized,progress.collected,plants,dominant));setLoadingLetter(false);
  };
  const saveLeaf=()=>{
    if(!letter)return;
    const leaf:MemoryLeaf={id:crypto.randomUUID(),createdAt:new Date().toISOString(),originalText:memoryText.trim(),aiLetter:letter,dominantEmotion:dominantEmotion(progress.collected),collectedPlantIds:progress.collected.map(item=>item.plantId)};
    publish(service.addMemoryLeaf(progress,leaf));setMemoryText('');setLetter('');setSelectedLeaf(leaf);
  };
  const visiblePlants=greenhousePlants.filter(item=>filter==='all'||filter==='flower'&&item.category==='flower'||filter==='tree'&&item.category!=='flower');

  return <div className="greenhouse-ui">
    <button className={`greenhouse-book-button ${completion.unlocked?'is-complete':''}`} type="button" onClick={()=>setView('book')}><BookOpen size={19}/><span><small>AI 식물도감</small><b>{completion.count} / {completion.total}</b></span>{completion.unlocked&&<Check size={16}/>}</button>
    {nearby&&!modalOpen&&<button className="greenhouse-observe-button" type="button" onClick={observeNearby}><span>{nearby.kind==='plant'?'🔎':'🌳'}</span><div><small>{nearby.kind==='plant'?'가까운 식물을 발견했어요':'중앙 기억나무'}</small><b>{nearby.kind==='plant'?'E · 식물 관찰하기':'E · 기억나무 살펴보기'}</b></div></button>}
    {view&&<section className="greenhouse-overlay" role="dialog" aria-modal="true" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}>
      <div ref={modalRef} className={`greenhouse-modal greenhouse-${view}`}>
        <button className="greenhouse-close" type="button" onClick={close} aria-label="닫기"><X size={18}/></button>
        {view==='intro'&&<><div className="greenhouse-hero-icon">🌿</div><small>SEJONG GREENHOUSE EXPERIENCE</small><h2>수목원의 기억을 모아보세요</h2><p>온실을 걸으며 14개의 식물을 발견하고, 각 식물에서 느낀 마음을 AI 식물도감에 기록해보세요.</p><div className="greenhouse-intro-steps"><span><b>1</b>식물 가까이 이동</span><span><b>2</b>E키 또는 관찰하기</span><span><b>3</b>감정을 골라 기록</span></div><button className="greenhouse-primary" type="button" onClick={close}>수목원 둘러보기</button></>}
        {view==='plant'&&plant&&<>
          <div className="greenhouse-plant-layout">
            <div className="greenhouse-media">
              {hasUsablePlantImage(plant.imageUrl,imageFailed)
                ?<button type="button" className="greenhouse-photo-button" onClick={()=>setLightboxIndex(0)} aria-label={`${plant.displayName} 사진 확대`}>
                  <img src={plant.imageUrl} alt={plant.imageAlt??`${plant.displayName} 대표 사진`} width="640" height="480" loading="lazy" onLoad={()=>setImageLoading(false)} onError={()=>{setImageFailed(true);setImageLoading(false)}}/>
                  {imageLoading&&<span className="greenhouse-image-skeleton"/>}<ZoomIn size={18}/>
                </button>
                :<div className="greenhouse-image-fallback" style={{background:plant.fallbackColor}}><ImageOff size={24}/><span>식물 사진 준비 중</span><small>{plant.displayName}</small></div>}
              {plant.imageSource&&<small className="greenhouse-image-source">출처: {plant.imageSourceUrl?<a href={plant.imageSourceUrl} target="_blank" rel="noreferrer">{plant.imageSource}</a>:plant.imageSource}</small>}
            </div>
            <div className="greenhouse-plant-info">
              <header className="greenhouse-plant-header"><div style={{background:plant.fallbackColor}}>🌱</div><section><small>{plant.category==='flower'?'FLOWER':plant.category==='peach-tree'?'PEACH TREE':'TREE'}</small><h2>{plant.displayName}</h2>{plant.scientificName&&<i>{plant.scientificName}</i>}</section></header>
              <p className="greenhouse-description">{plant.shortDescription}</p>
              <div className="greenhouse-traits">{plant.characteristics.map(item=><span key={item}>{item}</span>)}</div>
              {plant.season&&<p className="greenhouse-meta"><b>피는 계절</b>{plant.season}</p>}
              <div className="greenhouse-observation"><Search size={18}/><div><b>관찰 포인트</b><ul>{(plant.observationPoints?.length?plant.observationPoints:[plant.observationPoint].filter(Boolean) as string[]).map(item=><li key={item}>{item}</li>)}</ul></div></div>
              <div className="greenhouse-ai-message"><Sparkles size={17}/><div><small>AI 관찰 가이드</small>{loadingMessage?<p className="greenhouse-skeleton">관찰 가이드를 준비하고 있어요…</p>:<p>{message}</p>}</div></div>
              <h3>이 식물에서 어떤 마음을 느꼈나요?</h3>
              <div className="greenhouse-emotions">{GREENHOUSE_EMOTIONS.map(item=><button type="button" aria-pressed={emotion===item.id} className={emotion===item.id?'active':''} key={item.id} onClick={()=>setEmotion(item.id)}><span>{item.icon}</span>{item.id}{emotion===item.id&&<Check size={13}/>}</button>)}</div>
              {existing&&<p className="greenhouse-saved-note"><Check size={14}/> 도감에 기록됨 · {date(existing.collectedAt)} · 감정은 다시 선택할 수 있어요.</p>}
            </div>
          </div>
          <div className="greenhouse-actions"><button type="button" onClick={close}>닫기</button><button className="greenhouse-primary" type="button" disabled={!emotion||loadingMessage} onClick={savePlant}>{existing?'기록 수정하기':'도감에 기록하기'}</button></div>
          {lightboxIndex!==null&&plantGallery(plant)[lightboxIndex]&&<div className="greenhouse-lightbox" role="dialog" aria-modal="true" aria-label={`${plant.displayName} 사진 확대 보기`} onMouseDown={event=>{if(event.target===event.currentTarget)setLightboxIndex(null)}}>
            <button type="button" className="greenhouse-lightbox-close" onClick={()=>setLightboxIndex(null)} aria-label="확대 보기 닫기"><X/></button>
            <img src={plantGallery(plant)[lightboxIndex].url} alt={plantGallery(plant)[lightboxIndex].alt}/>
            {plantGallery(plant).length>1&&<><button type="button" className="greenhouse-lightbox-prev" onClick={()=>setLightboxIndex((lightboxIndex-1+plantGallery(plant).length)%plantGallery(plant).length)} aria-label="이전 사진"><ChevronLeft/></button><button type="button" className="greenhouse-lightbox-next" onClick={()=>setLightboxIndex((lightboxIndex+1)%plantGallery(plant).length)} aria-label="다음 사진"><ChevronRight/></button><span>{lightboxIndex+1} / {plantGallery(plant).length}</span></>}
          </div>}
        </>}
        {view==='book'&&<><header className="greenhouse-book-head"><div><small>MY AI PLANT BOOK</small><h2>나의 식물도감</h2><p>수목원의 식물을 모두 발견하면 중앙의 기억나무가 깨어납니다.</p></div><strong>{completion.count} / {completion.total}</strong></header><div className="greenhouse-progress"><i style={{width:`${completion.ratio*100}%`}}/></div><div className="greenhouse-filters">{(['all','flower','tree'] as const).map(value=><button type="button" className={filter===value?'active':''} onClick={()=>setFilter(value)} key={value}>{value==='all'?'전체':value==='flower'?'꽃':'나무'}</button>)}</div><div className="greenhouse-grid">{visiblePlants.map(item=>{const saved=progress.collected.find(entry=>entry.plantId===item.id);return <button type="button" key={item.id} className={saved?'collected':'locked'} onClick={()=>saved&&void observePlant(item.id)}><span style={saved?{background:item.fallbackColor}:undefined}>{saved?'🌱':'?'}</span><div><small>{item.category==='flower'?'꽃':'나무'}</small><b>{saved?item.displayName:'아직 발견하지 못했어요'}</b>{saved&&<em>{saved.selectedEmotion} · {date(saved.collectedAt)}</em>}</div>{saved?<Check size={16}/>:<Lock size={14}/>}</button>})}</div><div className={`greenhouse-tree-status ${completion.unlocked?'unlocked':''}`}>{completion.unlocked?<Sparkles size={20}/>:<Lock size={18}/>}<div><b>{completion.unlocked?'기억나무가 깨어났어요!':'기억나무가 기다리고 있어요'}</b><span>{completion.unlocked?'중앙 나무로 이동해 오늘의 기억을 남겨보세요.':`${completion.count} / ${GREENHOUSE_PLANT_TOTAL}개의 기억을 모았어요.`}</span></div></div>{import.meta.env.DEV&&<div className="greenhouse-dev"><b>개발 도구</b><button type="button" onClick={()=>publish(service.reset())}>도감 초기화</button><button type="button" onClick={()=>{let next=progress;greenhousePlants.forEach(item=>{next=service.collect(next,item.id,'평온',createFallbackPlantMessage(item))});publish(next)}}>모두 즉시 수집</button></div>}</>}
        {view==='memory'&&<><div className={`greenhouse-memory-symbol ${completion.unlocked?'awake':''}`}>🌳</div><small>AI MEMORY TREE</small><h2>{completion.unlocked?'오늘의 기억을 나무에 남겨보세요':'식물의 기억이 아직 부족해요'}</h2>{!completion.unlocked?<><p>도감에 기록한 식물이 더 필요해요.</p><div className="greenhouse-locked-progress"><Lock/><b>{completion.count} / {completion.total}</b><span>개의 기억을 모았어요.</span></div><button className="greenhouse-primary" type="button" onClick={()=>setView('book')}>식물도감 확인하기</button></>:<>
          <div className="greenhouse-memory-tabs">{Object.keys(memoryPlaceholders).map(item=><button type="button" className={memoryType===item?'active':''} onClick={()=>setMemoryType(item)} key={item}>{item}</button>)}</div>
          <textarea maxLength={500} value={memoryText} onChange={event=>setMemoryText(event.target.value)} placeholder={memoryPlaceholders[memoryType]}/>
          <button className="greenhouse-primary greenhouse-memory-create" type="button" disabled={memoryText.trim().length<2||loadingLetter} onClick={generateLetter}>{loadingLetter?'기억의 잎을 만들고 있어요…':'오늘의 기억을 편지로 남기기'}</button>
          <small className="greenhouse-memory-help">AI가 오늘 수집한 식물과 감정을 바탕으로 편지를 만들어 드려요.</small>
          {letter&&<div className="greenhouse-letter"><Leaf/><p>{letter}</p><button type="button" onClick={saveLeaf}>기억나무에 남기기</button></div>}
          <h3>나의 기억 잎</h3><div className="greenhouse-leaves">{progress.memoryLeaves.length?progress.memoryLeaves.map(item=><button type="button" key={item.id} onClick={()=>setSelectedLeaf(item)}><Leaf size={17}/><span><b>{date(item.createdAt)} · {item.dominantEmotion}</b><small>{item.aiLetter.slice(0,48)}…</small></span></button>):<p>아직 남긴 기억의 잎이 없어요.</p>}</div>
          {selectedLeaf&&(()=>{const foundPlants=selectedLeaf.collectedPlantIds.map(id=>greenhousePlantById.get(id)).filter((item):item is NonNullable<typeof item>=>Boolean(item)).slice(0,3);return <div className="greenhouse-leaf-detail">
            <button className="greenhouse-letter-back" type="button" onClick={()=>setSelectedLeaf(null)}><ChevronLeft size={15}/> 기억나무로 돌아가기</button>
            <details className="greenhouse-letter-menu"><summary aria-label="기억 편지 메뉴"><MoreVertical size={18}/></summary><button type="button" onClick={()=>{if(window.confirm('이 기억의 잎을 삭제할까요?')){publish(service.deleteMemoryLeaf(progress,selectedLeaf.id));setSelectedLeaf(null)}}}><Trash2 size={14}/> 이 기억 삭제</button></details>
            <article className="greenhouse-paper"><time>{date(selectedLeaf.createdAt)}</time><h2>{selectedLeaf.dominantEmotion}의 기억</h2><Leaf className="greenhouse-paper-leaf"/><h3>미래의 나에게</h3><blockquote>“{normalizeMemoryText(selectedLeaf.originalText)}”</blockquote><hr/><p className="greenhouse-paper-letter">{selectedLeaf.aiLetter}</p><hr/><section><b>오늘 발견한 식물</b><div className="greenhouse-letter-plants">{foundPlants.map(item=><span key={item.id}>{item.imageUrl?<img src={item.thumbnailUrl??item.imageUrl} alt="" loading="lazy"/>:<i style={{background:item.fallbackColor}}>🌱</i>}<small>{item.displayName}</small></span>)}</div></section><section className="greenhouse-letter-emotion"><b>오늘의 감정</b><span>✨ {selectedLeaf.dominantEmotion}</span></section></article>
            <button className="greenhouse-primary greenhouse-letter-return" type="button" onClick={()=>setSelectedLeaf(null)}>기억나무로 돌아가기</button>
          </div>})()}
        </>}</>}
        {view==='complete'&&<><div className="greenhouse-unlock">✨🌳✨</div><small>MEMORY TREE UNLOCKED</small><h2>수목원의 모든 기억이 모였습니다</h2><p>중앙의 큰 나무가 AI 기억나무로 깨어났어요. 나무 가까이에서 오늘의 기억을 남겨보세요.</p><button className="greenhouse-primary" type="button" onClick={close}>기억나무로 이동하기</button></>}
      </div>
    </section>}
  </div>
}
