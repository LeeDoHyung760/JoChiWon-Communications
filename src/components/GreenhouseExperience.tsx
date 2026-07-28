import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { BookOpen,Check,ChevronLeft,ChevronRight,ImageOff,Leaf,Lock,MoreVertical,Search,Sparkles,Trash2,X,ZoomIn } from 'lucide-react';
import type { MapId } from '../../shared/socket-events';
import { greenhousePlantById,greenhousePlants } from '../data/greenhouse-plants';
import { gameEvents } from '../game/events';
import { requestMemoryLetter,requestPlantMessage } from '../services/greenhouseAi';
import { analyzeNatureTaste,createFallbackPlantMessage,dominantEmotion,GREENHOUSE_EMOTIONS,GreenhouseProgressService,greenhouseCompletion,greenhouseInputLocked,natureCuratorMessage,natureTasteEvidence,normalizeMemoryText,type GreenhouseEmotion,type GreenhouseProgress,type MemoryLeaf } from '../services/greenhouseProgress';
import { hasUsablePlantImage,plantGallery } from '../services/plantImages';
import { greenhouseTasteLens } from '../services/lakeTasteAnalysis';
import { loadPublicGreenhouseMemories,publishGreenhouseMemory,type PublicGreenhouseMemory } from '../services/publicGreenhouseMemories';
import './GreenhouseExperience.base.css';
import './GreenhouseExperience.css';

type View='intro'|'plant'|'comparison'|'taste'|'growth'|'book'|'representative'|'memory'|'complete'|null;
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
  const [memoryStep,setMemoryStep]=useState<'write'|'creating'|'review'>('write'),[creationStage,setCreationStage]=useState<1|2>(1);
  const [expandingLeafId,setExpandingLeafId]=useState<string|null>(null);
  const [memoryArea,setMemoryArea]=useState<'mine'|'community'>('mine'),[publicMemories,setPublicMemories]=useState<PublicGreenhouseMemory[]>([]),[publicLoading,setPublicLoading]=useState(false),[publicError,setPublicError]=useState(''),[selectedPublicMemory,setSelectedPublicMemory]=useState<PublicGreenhouseMemory|null>(null);
  const [representativeId,setRepresentativeId]=useState<string|null>(null),[representativeMemo,setRepresentativeMemo]=useState('');
  const [tasteLens,setTasteLens]=useState(greenhouseTasteLens);
  const completion=greenhouseCompletion(progress),plant=plantId?greenhousePlantById.get(plantId):undefined,natureTaste=analyzeNatureTaste(progress.collected);
  const modalOpen=greenhouseInputLocked(view);

  const publish=useCallback((next:GreenhouseProgress)=>{
    setProgress(next);
    const state=greenhouseCompletion(next);
    gameEvents.emit('greenhouse-progress-changed',{
      collectedIds:next.collected.map(item=>item.plantId),
      unlocked:state.unlocked,
      blooming:state.blooming,
      complete:state.complete,
      count:state.count
    });
  },[]);
  const close=useCallback(()=>{setView(null);setSelectedLeaf(null);setSelectedPublicMemory(null);setMemoryStep('write');setCreationStage(1);setExpandingLeafId(null)},[]);
  const openMemoryTree=useCallback(()=>{setMemoryArea('mine');setSelectedPublicMemory(null);setView('memory')},[]);
  const refreshPublicMemories=useCallback(()=>{
    setPublicLoading(true);setPublicError('');
    void loadPublicGreenhouseMemories().then(setPublicMemories).catch(()=>setPublicError('모두의 기억을 불러오지 못했어요. 잠시 후 다시 열어주세요.')).finally(()=>setPublicLoading(false));
  },[]);
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
    if(nearby?.kind==='memory-tree')openMemoryTree();
  },[nearby,observePlant,openMemoryTree]);

  useEffect(()=>{setProgress(service.load())},[service]);
  useEffect(()=>{
    const mapChanged=(mapId:MapId)=>{
      const isGarden=mapId==='garden';setActive(isGarden);setNearby(null);
      if(isGarden){
        setTasteLens(greenhouseTasteLens());
        const current=service.load();publish(current);
        setView(current.introSeen?null:'intro');
      }else setView(null);
    };
    const nearbyChanged=(value:Nearby)=>setNearby(value);
    const observe=(id:string)=>void observePlant(id);
    const tree=()=>openMemoryTree();
    gameEvents.on('map-travel-complete',mapChanged);gameEvents.on('greenhouse-nearby-changed',nearbyChanged);gameEvents.on('greenhouse-observe-plant',observe);gameEvents.on('greenhouse-observe-tree',tree);
    return()=>{gameEvents.off('map-travel-complete',mapChanged);gameEvents.off('greenhouse-nearby-changed',nearbyChanged);gameEvents.off('greenhouse-observe-plant',observe);gameEvents.off('greenhouse-observe-tree',tree)};
  },[observePlant,openMemoryTree,publish,service]);
  useEffect(()=>{
    if(view!=='memory')return;
    refreshPublicMemories();
  },[refreshPublicMemories,view]);
  useEffect(()=>{gameEvents.emit('game-input-lock',modalOpen);return()=>{if(modalOpen)gameEvents.emit('game-input-lock',false)}},[modalOpen]);
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(!active||event.repeat)return;
      if(event.key==='Escape'&&lightboxIndex!==null){event.preventDefault();setLightboxIndex(null);return}
      if(event.key==='Escape'&&modalOpen){event.preventDefault();close();return}
      if(lightboxIndex!==null&&plant){const gallery=plantGallery(plant);if(event.key==='ArrowLeft')setLightboxIndex(index=>index===null?null:(index-1+gallery.length)%gallery.length);if(event.key==='ArrowRight')setLightboxIndex(index=>index===null?null:(index+1)%gallery.length);return}
      if(modalOpen)return;
      const target=event.target as HTMLElement|null;
      if(target?.matches('input,textarea,select,[contenteditable="true"]'))return;
      if((event.code==='KeyE'||event.key.toLowerCase()==='e')&&nearby){event.preventDefault();observeNearby()}
    };
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
    if(!plant)return;
    if(existing&&!emotion){
      publish(service.removePlant(progress,plant.id));
      setView('book');
      return;
    }
    if(!emotion&&progress.collected.length<3)return;
    const wasNew=!existing;
    const next=service.collect(progress,plant.id,emotion??undefined,message||createFallbackPlantMessage(plant));publish(next);setView('book');
    if(wasNew&&next.collected.length===2)window.setTimeout(()=>setView('comparison'),250);
    if(wasNew&&next.collected.length===3&&!progress.representativePlant)window.setTimeout(()=>setView('taste'),250);
    if(wasNew&&next.collected.length===7)window.setTimeout(()=>setView('growth'),250);
    if(greenhouseCompletion(next).complete&&!completion.complete)window.setTimeout(()=>setView('complete'),250);
  };
  const generateLetter=async()=>{
    if(memoryText.trim().length<2)return;
    setLoadingLetter(true);setMemoryStep('creating');setCreationStage(1);
    const normalized=normalizeMemoryText(memoryText);setMemoryText(normalized);
    const dominant=dominantEmotion(progress.collected);
    const plants=progress.collected.map(item=>({name:greenhousePlantById.get(item.plantId)?.displayName??item.plantId,emotion:item.selectedEmotion??'발견'}));
    const representative=progress.representativePlant?greenhousePlantById.get(progress.representativePlant.plantId):undefined;
    const create=completion.count<7?Promise.resolve((()=>{
      const representativeEntry=progress.collected.find(item=>item.plantId===progress.representativePlant?.plantId);
      const representativeName=representative?.displayName??'대표 식물';
      return `오늘 당신은 ${representativeName}에서 ${representativeEntry?.selectedEmotion??dominant}을 발견했습니다.\n작은 선택이 새로운 시작의 기억이 되었어요.`;
    })()):requestMemoryLetter(normalized,progress.collected,plants,dominant,{
      natureType:natureTaste.label,
      representativePlant:representative?.displayName,
      representativeMemo:progress.representativePlant?.memo,
      complete:completion.complete,
    });
    await new Promise(resolve=>window.setTimeout(resolve,650));
    setCreationStage(2);
    const [createdLetter]=await Promise.all([create,new Promise(resolve=>window.setTimeout(resolve,750))]);
    setLetter(createdLetter);setLoadingLetter(false);setMemoryStep('review');
  };
  const expandLatestMemory=async()=>{
    const existingLeaf=progress.memoryLeaves[0];
    setView('memory');setMemoryArea('mine');setSelectedLeaf(null);setSelectedPublicMemory(null);
    if(!existingLeaf){setMemoryStep('write');return}
    setExpandingLeafId(existingLeaf.id);setMemoryText(existingLeaf.originalText);
    setLoadingLetter(true);setMemoryStep('creating');setCreationStage(1);
    const dominant=dominantEmotion(progress.collected);
    const plants=progress.collected.map(item=>({name:greenhousePlantById.get(item.plantId)?.displayName??item.plantId,emotion:item.selectedEmotion??'발견'}));
    const representative=progress.representativePlant?greenhousePlantById.get(progress.representativePlant.plantId):undefined;
    const create=requestMemoryLetter(existingLeaf.originalText,progress.collected,plants,dominant,{
      natureType:natureTaste.label,
      representativePlant:representative?.displayName,
      representativeMemo:progress.representativePlant?.memo,
      previousLetter:existingLeaf.aiLetter,
      complete:completion.complete,
    });
    await new Promise(resolve=>window.setTimeout(resolve,650));
    setCreationStage(2);
    const [grownLetter]=await Promise.all([create,new Promise(resolve=>window.setTimeout(resolve,750))]);
    setLetter(grownLetter);setLoadingLetter(false);setMemoryStep('review');
  };
  const saveLeaf=()=>{
    if(!letter)return;
    const existingLeaf=expandingLeafId?progress.memoryLeaves.find(item=>item.id===expandingLeafId):undefined;
    const leaf:MemoryLeaf={
      id:existingLeaf?.id??crypto.randomUUID(),
      createdAt:existingLeaf?.createdAt??new Date().toISOString(),
      originalText:existingLeaf?.originalText??memoryText.trim(),
      aiLetter:letter,
      dominantEmotion:dominantEmotion(progress.collected),
      collectedPlantIds:progress.collected.map(item=>item.plantId),
      natureType:natureTaste.label,
      representativePlantId:progress.representativePlant?.plantId,
      visibility:progress.recordVisibility
    };
    publish(existingLeaf?service.updateMemoryLeaf(progress,leaf):service.addMemoryLeaf(progress,leaf));setMemoryText('');setLetter('');setMemoryStep('write');setCreationStage(1);setExpandingLeafId(null);setSelectedLeaf(leaf);
    if(leaf.visibility==='public'){
      const representativePlant=progress.representativePlant?greenhousePlantById.get(progress.representativePlant.plantId)?.displayName:undefined;
      const plantNames=leaf.collectedPlantIds.map(id=>greenhousePlantById.get(id)?.displayName).filter((item):item is string=>Boolean(item));
      void publishGreenhouseMemory(userKey,leaf,representativePlant,plantNames).then(saved=>setPublicMemories(items=>[saved,...items.filter(item=>item.id!==saved.id)])).catch(()=>setPublicError('공개 기억 저장에 실패했어요. 내 기억에는 안전하게 저장됐어요.'));
    }
  };
  const openRepresentative=()=>{
    setRepresentativeId(progress.representativePlant?.plantId??progress.collected[0]?.plantId??null);
    setRepresentativeMemo(progress.representativePlant?.memo??'');
    setView('representative');
  };
  const saveRepresentative=()=>{
    if(!representativeId)return;
    publish(service.selectRepresentative(progress,representativeId,representativeMemo));setView('memory');
  };
  const visiblePlants=greenhousePlants.filter(item=>filter==='all'||filter==='flower'&&item.category==='flower'||filter==='tree'&&item.category!=='flower');
  const comparisonPlants=progress.collected.slice(-2);
  const needsRepresentative=completion.count>=3&&!progress.representativePlant;
  const nextTarget=completion.count<3?3:needsRepresentative?3:completion.count<7?7:14;
  const nextGoal=completion.count<3?'자연 취향 발견':needsRepresentative?'대표 식물 선택':completion.count<7?'기억 편지 성장':'수목원 완전 탐험';
  const stageStart=completion.count<3?0:needsRepresentative?0:completion.count<7?3:7;
  const stageRatio=needsRepresentative?1:Math.min(1,(completion.count-stageStart)/(nextTarget-stageStart));

  return <div className="greenhouse-ui">
    <button
      className={`greenhouse-book-button ${completion.unlocked?'is-complete':''}`}
      style={{position:'fixed',left:'auto',right:102,top:20,width:128,minWidth:128,maxWidth:128,height:40}}
      type="button"
      onClick={()=>setView('book')}
    ><BookOpen size={16}/><span><b>식물도감</b><small>{completion.count}/{completion.total}</small></span>{completion.unlocked&&<Check size={14}/>}</button>
    {nearby&&!modalOpen&&<button className="greenhouse-observe-button" type="button" onClick={observeNearby}><span>{nearby.kind==='plant'?'🔎':'🌳'}</span><div><small>{nearby.kind==='plant'?'가까운 식물을 발견했어요':'중앙 기억나무'}</small><b>{nearby.kind==='plant'?'식물 관찰하기':'기억나무 살펴보기'}</b></div><kbd>E</kbd></button>}
    {view&&<section className="greenhouse-overlay" role="dialog" aria-modal="true" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}>
      <div ref={modalRef} className={`greenhouse-modal greenhouse-${view}`}>
        <button className="greenhouse-close" type="button" onClick={close} aria-label="닫기"><X size={18}/></button>
        {view==='intro'&&<><div className="greenhouse-hero-icon">🌿</div><small>수목원 이용 안내</small><h2>식물 3종을 관찰해 자연 취향을 발견해요</h2><div className="greenhouse-entry-guide"><span><b>1</b><i>🍃</i><strong>식물 마커 찾기</strong><small>정원을 걸으며 빛나는 잎 표시를 찾아보세요.</small></span><span><b>2</b><i>⌨️</i><strong>E로 관찰하기</strong><small>식물 가까이 이동한 뒤 E를 누르거나 식물을 클릭하세요.</small></span><span><b>3</b><i>💚</i><strong>감정 기록하기</strong><small>첫 세 식물에서 느낀 감정을 하나씩 선택하세요.</small></span></div><p>3종을 기록하고 대표 식물을 고르면 중앙의 새싹 기억나무가 열립니다.</p><div className="greenhouse-taste-lens"><Sparkles size={18}/><div><b>호수공원에서 이어진 {tasteLens.label}</b><span>{tasteLens.message}</span></div></div><div className="greenhouse-intro-steps"><span><b>3</b>새싹 기억나무</span><span><b>7</b>꽃이 핀 기억나무</span><span><b>14</b>빛나는 기억나무</span></div><div className="greenhouse-intro-actions"><button type="button" onClick={()=>{publish(service.save({...progress,introSeen:true}));close()}}>다시 안 보기</button><button className="greenhouse-primary greenhouse-intro-start" type="button" onClick={close}>첫 식물 찾기</button></div></>}
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
              <header className="greenhouse-plant-header"><div style={{background:plant.fallbackColor}}>🌱</div><section><small>{plant.category==='flower'?'꽃':plant.category==='peach-tree'?'복숭아나무':'나무'}</small><h2>{plant.displayName}</h2>{plant.scientificName&&<i>{plant.scientificName}</i>}</section></header>
              <p className="greenhouse-description">{plant.shortDescription}</p>
              <div className="greenhouse-traits">{plant.characteristics.map(item=><span key={item}>{item}</span>)}</div>
              {plant.season&&<p className="greenhouse-meta"><b>피는 계절</b>{plant.season}</p>}
              <div className="greenhouse-observation"><Search size={18}/><div><b>관찰 포인트</b><ul>{(plant.observationPoints?.length?plant.observationPoints:[plant.observationPoint].filter(Boolean) as string[]).map(item=><li key={item}>{item}</li>)}</ul></div></div>
              <div className="greenhouse-ai-message"><Search size={17}/><div><small>충녕이의 관찰 가이드</small>{loadingMessage?<p className="greenhouse-skeleton">관찰 가이드를 준비하고 있어요…</p>:<p>{message}</p>}</div></div>
              {!existing&&completion.count===0&&<div className="greenhouse-first-guide"><Sparkles size={17}/><div><b>첫 관찰 · 감정을 기록해 보세요</b><p>식물을 보고 가장 먼저 떠오르는 마음 하나를 선택하면 돼요.</p></div></div>}
              <h3>{completion.count<3?'이 식물에서 어떤 마음을 느꼈나요?':'떠오르는 감정이 있다면 선택해 보세요.'}</h3>
              <div className="greenhouse-emotions">{GREENHOUSE_EMOTIONS.map(item=><button type="button" aria-pressed={emotion===item.id} className={emotion===item.id?'active':''} key={item.id} onClick={()=>setEmotion(current=>current===item.id?null:item.id)}><span>{item.icon}</span>{item.id}{emotion===item.id&&<Check size={13}/>}</button>)}</div>
              {emotion&&<div className="greenhouse-curator-insight"><Sparkles size={17}/><div><small>AI 자연 큐레이터</small><p>{natureCuratorMessage(plant,emotion)}</p></div></div>}
              {existing&&<p className="greenhouse-saved-note"><Check size={14}/> 도감에 기록됨 · {date(existing.collectedAt)} · 선택한 감정을 다시 누르면 기록을 취소할 수 있어요.</p>}
            </div>
          </div>
          <div className="greenhouse-actions"><button type="button" onClick={close}>닫기</button><button className={`greenhouse-primary greenhouse-save-button ${existing&&!emotion?'is-remove':''}`} type="button" disabled={(!existing&&!emotion&&completion.count<3)||loadingMessage} onClick={savePlant}>{existing?(emotion?'기록 수정하기':'기록 취소하기'):completion.count<3?'감정과 함께 기록하기':'발견 기록하기'}</button></div>
          {lightboxIndex!==null&&plantGallery(plant)[lightboxIndex]&&<div className="greenhouse-lightbox" role="dialog" aria-modal="true" aria-label={`${plant.displayName} 사진 확대 보기`} onMouseDown={event=>{if(event.target===event.currentTarget)setLightboxIndex(null)}}>
            <button type="button" className="greenhouse-lightbox-close" onClick={()=>setLightboxIndex(null)} aria-label="확대 보기 닫기"><X/></button>
            <img src={plantGallery(plant)[lightboxIndex].url} alt={plantGallery(plant)[lightboxIndex].alt}/>
            {plantGallery(plant).length>1&&<><button type="button" className="greenhouse-lightbox-prev" onClick={()=>setLightboxIndex((lightboxIndex-1+plantGallery(plant).length)%plantGallery(plant).length)} aria-label="이전 사진"><ChevronLeft/></button><button type="button" className="greenhouse-lightbox-next" onClick={()=>setLightboxIndex((lightboxIndex+1)%plantGallery(plant).length)} aria-label="다음 사진"><ChevronRight/></button><span>{lightboxIndex+1} / {plantGallery(plant).length}</span></>}
          </div>}
        </>}
        {view==='comparison'&&<><div className="greenhouse-hero-icon">🌿</div><small>두 번째 발견 · 감정 비교</small><h2>식물마다 다른 마음을 발견했어요</h2><p className="greenhouse-comparison-lead">두 번의 선택이 나의 자연 감성 기록으로 이어지고 있어요.</p><div className="greenhouse-comparison-cards">{comparisonPlants.map((entry,index)=>{const item=greenhousePlantById.get(entry.plantId);return <div key={entry.plantId}><span>{index+1}</span><b>{item?.displayName}</b><em>{entry.selectedEmotion??'발견'}</em></div>})}</div><p className="greenhouse-comparison-summary">{greenhousePlantById.get(comparisonPlants[0]?.plantId)?.displayName}에서는 {comparisonPlants[0]?.selectedEmotion}, {greenhousePlantById.get(comparisonPlants[1]?.plantId)?.displayName}에서는 {comparisonPlants[1]?.selectedEmotion}을 느꼈어요.<br/>이제 한 식물만 더 기록하면 나의 자연 취향을 발견할 수 있어요.</p><button className="greenhouse-primary greenhouse-comparison-next" type="button" onClick={close}>세 번째 식물 찾기</button></>}
        {view==='taste'&&<><div className="greenhouse-hero-icon">✨</div><small>세 번째 발견 · 나의 자연 취향</small><h2>{natureTaste.label}</h2><p>{natureTaste.description}</p><div className="greenhouse-taste-keywords">{natureTaste.keywords.map(item=><span key={item}>#{item}</span>)}</div><p className="greenhouse-taste-evidence"><Sparkles size={14}/>{natureTasteEvidence(progress.collected,natureTaste)}</p><div className="greenhouse-seed-notice"><span>🌱</span><div><b>새싹 기억나무를 깨울 준비가 됐어요</b><small>세 식물 중 가장 기억에 남는 대표 식물을 선택해 주세요.</small></div></div><button className="greenhouse-primary greenhouse-representative-open" type="button" onClick={openRepresentative}>대표 식물 선택하기</button></>}
        {view==='growth'&&<><div className="greenhouse-unlock">🌳🌸</div><small>7종 탐험 달성</small><h2>기억나무에 꽃이 피었어요</h2><p>{progress.memoryLeaves.length?'처음 남긴 기억에 새로 발견한 식물과 감정을 더해 한층 풍성한 기억으로 성장시켜 드려요.':'대표 감정 분석과 탐험 기록 카드가 열렸어요. 먼저 기억나무에 남길 첫 기억을 작성해 주세요.'}</p><button className="greenhouse-primary" type="button" onClick={()=>void expandLatestMemory()}>{progress.memoryLeaves.length?'기존 기억 성장시키기':'첫 기억 남기기'}</button></>}
        {view==='book'&&<><header className="greenhouse-book-head"><div><small>나의 자연 감성 탐험 도감</small><h2>나의 식물도감</h2><p>식물을 발견할수록 나의 자연 감성과 탐험 기록이 선명해져요.</p></div><strong>{completion.count} / {completion.total}</strong></header><div className="greenhouse-progress"><i style={{width:`${completion.ratio*100}%`}}/></div>
          <div className="greenhouse-next-goal"><div><small>지금의 목표</small><b>{needsRepresentative?nextGoal:`${nextGoal}까지 ${completion.count}/${nextTarget}`}</b></div><span>{needsRepresentative?'선택 대기':`${nextTarget-completion.count}종 남음`}</span><i><u style={{width:`${stageRatio*100}%`}}/></i></div>
          <div className="greenhouse-milestones"><span className={completion.unlocked?'done':''}><b>3종</b>새싹 기억나무</span><span className={completion.blooming?'done':''}><b>7종</b>꽃이 핀 기억나무</span><span className={completion.complete?'done':''}><b>14종</b>빛나는 기억나무</span></div>
          {completion.analysisUnlocked?<section className="greenhouse-nature-result"><Sparkles/><div><small>나의 자연 감성 유형</small><h3>{natureTaste.label}</h3><p>{natureTaste.description}</p><div>{natureTaste.keywords.map(item=><span key={item}>#{item}</span>)}</div></div></section>:<section className="greenhouse-analysis-locked"><Lock size={16}/><span>식물 {3-completion.count}종을 더 기록하면 자연 감성 유형을 발견해요.</span></section>}
          {completion.representativeUnlocked&&<section className="greenhouse-representative-summary"><div><small>나의 대표 식물</small><b>{progress.representativePlant?greenhousePlantById.get(progress.representativePlant.plantId)?.displayName:'대표 식물을 고르면 기억나무가 열려요'}</b>{progress.representativePlant?.memo&&<p>“{progress.representativePlant.memo}”</p>}</div><button type="button" onClick={openRepresentative}>{progress.representativePlant?'다시 선택':'대표 식물 선택'}</button></section>}
          <div className="greenhouse-filters">{(['all','flower','tree'] as const).map(value=><button type="button" className={filter===value?'active':''} onClick={()=>setFilter(value)} key={value}>{value==='all'?'전체':value==='flower'?'꽃':'나무'}</button>)}</div><div className="greenhouse-grid">{visiblePlants.map(item=>{const saved=progress.collected.find(entry=>entry.plantId===item.id);return <button type="button" key={item.id} className={saved?'collected':'locked'} onClick={()=>saved&&void observePlant(item.id)}><span style={saved?{background:item.fallbackColor}:undefined}>{saved?'🌱':'?'}</span><div><small>{item.category==='flower'?'꽃':'나무'}</small><b>{saved?item.displayName:'아직 발견하지 못했어요'}</b>{saved&&<em>{saved.selectedEmotion??'발견 기록'} · {date(saved.collectedAt)}</em>}</div>{saved?<Check size={16}/>:<Lock size={14}/>}</button>})}</div><div className={`greenhouse-tree-status ${completion.unlocked?'unlocked':''}`}>{completion.unlocked?<Sparkles size={20}/>:<Lock size={18}/>}<div><b>{completion.complete?'완전히 빛나는 기억나무':completion.blooming?'꽃이 핀 기억나무':completion.unlocked?'새싹 기억나무가 깨어났어요':'기억나무가 기다리고 있어요'}</b><span>{completion.complete?'완전 탐험 배지와 특별 편지가 열렸어요.':completion.blooming?'긴 AI 편지와 탐험 기록 카드가 열렸어요.':completion.unlocked?'7종을 발견하면 편지와 기록 카드가 성장해요.':completion.count<3?`${completion.count} / 3개의 감정 기록을 모았어요.`:'대표 식물을 선택하면 새싹 기억나무가 열려요.'}</span></div></div></>}
        {view==='representative'&&<><div className="greenhouse-hero-icon">🌱</div><small>나의 대표 식물</small><h2>가장 기억에 남는 식물을 골라주세요</h2><p>선택한 식물과 메모는 AI 편지와 공개 탐험 기록에 사용돼요.</p><div className="greenhouse-representative-grid">{progress.collected.map(entry=>{const item=greenhousePlantById.get(entry.plantId);if(!item)return null;return <button type="button" key={entry.plantId} className={representativeId===entry.plantId?'active':''} onClick={()=>setRepresentativeId(entry.plantId)}><span style={{background:item.fallbackColor}}>🌱</span><b>{item.displayName}</b><small>{entry.selectedEmotion}</small>{representativeId===entry.plantId&&<Check size={15}/>}</button>})}</div><label className="greenhouse-representative-memo"><b>이 식물이 기억에 남은 이유</b><textarea maxLength={180} value={representativeMemo} onChange={event=>setRepresentativeMemo(event.target.value)} onKeyDown={event=>event.stopPropagation()} onKeyUp={event=>event.stopPropagation()} placeholder="예: 꽃의 밝은 색이 새로운 시작처럼 느껴졌어요."/></label><div className="greenhouse-actions greenhouse-representative-actions"><button type="button" onClick={()=>setView('book')}>나중에 선택</button><button className="greenhouse-primary" type="button" disabled={!representativeId} onClick={saveRepresentative}>대표 식물로 저장</button></div></>}
        {view==='memory'&&<><div className={`greenhouse-memory-symbol ${completion.unlocked?'awake':''} ${completion.complete?'radiant':completion.blooming?'blooming':'sprout'}`}>{completion.complete?'✨🌳✨':completion.blooming?'🌳🌸':'🌱'}</div><small>{completion.complete?'기억나무 3단계 · 완전 탐험':completion.blooming?'기억나무 2단계 해금':completion.unlocked?'기억나무 1단계 해금':'발견할수록 함께 성장하는 기억나무'}</small><h2>{completion.complete?'완전히 빛나는 기억나무':completion.blooming?'꽃이 핀 기억나무':'새싹 기억나무'}</h2>{!completion.unlocked?<>{completion.count<3?<><p>식물 3종의 감정을 기록하면 자연 취향을 발견할 수 있어요.</p><div className="greenhouse-locked-progress"><Lock/><b>{completion.count} / 3</b><span>개의 감정을 모았어요.</span></div><button className="greenhouse-primary" type="button" onClick={()=>setView('book')}>식물도감 확인하기</button></>:<><p>세 식물 중 가장 기억에 남는 대표 식물을 고르면 새싹 기억나무가 깨어나요.</p><button className="greenhouse-primary" type="button" onClick={openRepresentative}>대표 식물 선택하기</button></>}</>:<>
          {memoryStep==='write'&&!selectedLeaf&&!selectedPublicMemory&&<nav className="greenhouse-memory-audience-tabs" aria-label="기억나무 보기">
            <button type="button" className={memoryArea==='mine'?'active':''} onClick={()=>setMemoryArea('mine')}>🌱 내 기억</button>
            <button type="button" className={memoryArea==='community'?'active':''} onClick={()=>setMemoryArea('community')}>🌳 모두의 기억 <small>{publicMemories.length}</small></button>
          </nav>}
          {memoryStep==='write'&&memoryArea==='mine'&&<section className="greenhouse-memory-write">
            <div className="greenhouse-memory-write-head"><span>✍️</span><div><small>STEP 1 · 오늘의 마음</small><h3>기억하고 싶은 이야기를 적어주세요</h3></div></div>
            <div className="greenhouse-memory-tabs">{Object.keys(memoryPlaceholders).map(item=><button type="button" className={memoryType===item?'active':''} onClick={()=>setMemoryType(item)} key={item}>{item}</button>)}</div>
            <textarea maxLength={500} value={memoryText} onChange={event=>setMemoryText(event.target.value)} onKeyDown={event=>event.stopPropagation()} onKeyUp={event=>event.stopPropagation()} placeholder={memoryPlaceholders[memoryType]}/>
            <button className="greenhouse-primary greenhouse-memory-create" type="button" disabled={memoryText.trim().length<2||loadingLetter} onClick={generateLetter}>기억 문장 만들기</button>
            <small className="greenhouse-memory-help">작성한 글과 오늘의 식물·감정을 한 문장으로 정리해 드려요.</small>
            <div className="greenhouse-memory-list"><h3>나의 기억 잎</h3><div className="greenhouse-leaves">{progress.memoryLeaves.length?progress.memoryLeaves.map(item=><button type="button" key={item.id} onClick={()=>setSelectedLeaf(item)}><Leaf size={17}/><span><b>{date(item.createdAt)} · {item.dominantEmotion}</b><small>{item.aiLetter.slice(0,48)}…</small></span></button>):<p>아직 남긴 기억의 잎이 없어요.</p>}</div></div>
          </section>}
          {memoryStep==='creating'&&<section className="greenhouse-memory-creating" aria-live="polite">
            <div className="greenhouse-memory-orbit"><Leaf/><i/><i/><i/></div>
            <small>{expandingLeafId?'기존 기억을 성장시키고 있어요':'기억 문장을 만들고 있어요'}</small>
            <h3>{creationStage===1?(expandingLeafId?'처음 남긴 기억을 불러오는 중':'오늘의 감정을 정리하는 중'):(expandingLeafId?'새로운 식물과 감정을 더하는 중':'식물의 기억을 문장에 담는 중')}</h3>
            <div className="greenhouse-creation-steps"><span className="done"><b>1</b><em>{expandingLeafId?'기존 기억':'마음 읽기'}</em></span><i/><span className={creationStage===2?'active':''}><b>2</b><em>{expandingLeafId?'기억 성장':'문장 완성'}</em></span></div>
          </section>}
          {memoryStep==='review'&&letter&&<section className="greenhouse-memory-review">
            <button className="greenhouse-memory-back" type="button" onClick={()=>{setMemoryStep('write');setExpandingLeafId(null);setLetter('')}}><ChevronLeft size={14}/> {expandingLeafId?'확장 취소':'다시 작성하기'}</button>
            <div className="greenhouse-memory-review-icon"><Leaf/></div><small>STEP 2 · {expandingLeafId?'성장한 기억 완성':'기억 문장 완성'}</small><h3>{expandingLeafId?'기존 기억이 이렇게 자랐어요':'오늘의 기억을 확인해 주세요'}</h3>
            <blockquote>{letter}</blockquote>
            <div className="greenhouse-visibility"><span>탐험 기록 공개 범위</span><button type="button" className={progress.recordVisibility==='private'?'active':''} onClick={()=>publish(service.setRecordVisibility(progress,'private'))}>나만 보기</button><button type="button" className={progress.recordVisibility==='public'?'active':''} onClick={()=>publish(service.setRecordVisibility(progress,'public'))}>탐험 기록 공개하기</button></div>
            <button className="greenhouse-primary greenhouse-memory-save" type="button" onClick={saveLeaf}>{expandingLeafId?'성장한 기억으로 저장':'기억나무에 남기기'}</button>
          </section>}
          {memoryStep==='write'&&memoryArea==='community'&&<section className="greenhouse-community-memories">
            <header><div><small>수목원 방문자들이 공개한 이야기</small><h3>모두의 기억 잎</h3></div><span>🌿 {publicMemories.length}개</span></header>
            {publicLoading?<div className="greenhouse-community-empty"><Sparkles/><p>기억나무의 잎을 불러오고 있어요…</p></div>:publicError?<div className="greenhouse-community-empty error"><p>{publicError}</p><button type="button" onClick={refreshPublicMemories}>다시 불러오기</button></div>:publicMemories.length?<div className="greenhouse-community-grid">{publicMemories.map(item=><button type="button" key={item.id} onClick={()=>setSelectedPublicMemory(item)}><span>🍃</span><div><small>{item.nickname} · {date(item.createdAt)}</small><b>{item.dominantEmotion}의 기억</b><p>{item.aiLetter.slice(0,74)}{item.aiLetter.length>74?'…':''}</p><em>{item.representativePlant??item.plantNames[0]??'수목원의 식물'}</em></div><ChevronRight size={16}/></button>)}</div>:<div className="greenhouse-community-empty"><Leaf/><p>아직 공개된 기억이 없어요.<br/>첫 번째 기억 잎을 남겨보세요.</p><button type="button" onClick={()=>setMemoryArea('mine')}>내 기억 작성하기</button></div>}
          </section>}
          {selectedLeaf&&(()=>{const foundPlants=selectedLeaf.collectedPlantIds.map(id=>greenhousePlantById.get(id)).filter((item):item is NonNullable<typeof item>=>Boolean(item)).slice(0,3);return <div className="greenhouse-leaf-detail">
            <button className="greenhouse-letter-back" type="button" onClick={()=>setSelectedLeaf(null)}><ChevronLeft size={15}/> 기억나무로 돌아가기</button>
            <details className="greenhouse-letter-menu"><summary aria-label="기억 편지 메뉴"><MoreVertical size={18}/></summary><button type="button" onClick={()=>{if(window.confirm('이 기억의 잎을 삭제할까요?')){publish(service.deleteMemoryLeaf(progress,selectedLeaf.id));setSelectedLeaf(null)}}}><Trash2 size={14}/> 이 기억 삭제</button></details>
            <article className="greenhouse-paper"><time>{date(selectedLeaf.createdAt)}</time><h2>{selectedLeaf.dominantEmotion}의 기억</h2><Leaf className="greenhouse-paper-leaf"/><h3>미래의 나에게</h3><blockquote>“{normalizeMemoryText(selectedLeaf.originalText)}”</blockquote><hr/><p className="greenhouse-paper-letter">{selectedLeaf.aiLetter}</p><hr/><section><b>오늘 발견한 식물</b><div className="greenhouse-letter-plants">{foundPlants.map(item=><span key={item.id}>{item.imageUrl?<img src={item.thumbnailUrl??item.imageUrl} alt="" loading="lazy"/>:<i style={{background:item.fallbackColor}}>🌱</i>}<small>{item.displayName}</small></span>)}</div></section><section className="greenhouse-letter-emotion"><b>오늘의 감정</b><span>✨ {selectedLeaf.dominantEmotion}</span></section></article>
            <button className="greenhouse-primary greenhouse-letter-return" type="button" onClick={()=>setSelectedLeaf(null)}>기억나무로 돌아가기</button>
          </div>})()}
          {selectedPublicMemory&&<div className="greenhouse-leaf-detail greenhouse-public-leaf-detail">
            <button className="greenhouse-letter-back" type="button" onClick={()=>setSelectedPublicMemory(null)}><ChevronLeft size={15}/> 모두의 기억으로 돌아가기</button>
            <article className="greenhouse-paper"><time>{date(selectedPublicMemory.createdAt)} · {selectedPublicMemory.nickname}</time><h2>{selectedPublicMemory.dominantEmotion}의 기억</h2><Leaf className="greenhouse-paper-leaf"/><h3>수목원에 남긴 마음</h3><blockquote>“{normalizeMemoryText(selectedPublicMemory.originalText)}”</blockquote><hr/><p className="greenhouse-paper-letter">{selectedPublicMemory.aiLetter}</p><hr/><section><b>함께 발견한 식물</b><div className="greenhouse-public-plant-names">{selectedPublicMemory.plantNames.slice(0,5).map(item=><span key={item}>🌱 {item}</span>)}</div></section><section className="greenhouse-letter-emotion"><b>대표 감정</b><span>✨ {selectedPublicMemory.dominantEmotion}</span></section></article>
            <button className="greenhouse-primary greenhouse-letter-return" type="button" onClick={()=>setSelectedPublicMemory(null)}>모두의 기억으로 돌아가기</button>
          </div>}
        </>}</>}
        {view==='complete'&&<><div className="greenhouse-completion-burst" aria-hidden="true">{Array.from({length:12},(_,index)=><i key={index}>✦</i>)}</div><div className="greenhouse-unlock greenhouse-final-tree">✨🌳✨</div><small>14종 완전 탐험 달성</small><h2>수목원의 모든 식물을 발견했어요</h2><p>노란 새싹에서 분홍 꽃을 거쳐, 기억나무가 백금빛으로 완전히 깨어났어요.</p><div className="greenhouse-completion-rewards"><span><b>🏅</b><strong>완전 탐험 배지</strong><small>14종 도감 완성</small></span><span><b>💌</b><strong>최종 기억 편지</strong><small>전체 감정과 식물 반영</small></span><span><b>✨</b><strong>백금빛 기억나무</strong><small>특별 빛 효과 해금</small></span></div><button className="greenhouse-primary" type="button" onClick={close}>빛나는 기억나무 확인하기</button></>}
      </div>
    </section>}
  </div>
}
