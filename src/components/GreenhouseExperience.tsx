import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { BookOpen,Check,ChevronLeft,ChevronRight,ImageOff,Leaf,Lock,MoreVertical,Search,Sparkles,Trash2,X,ZoomIn } from 'lucide-react';
import type { MapId } from '../../shared/socket-events';
import type { GreenhouseAnalysisStage,GreenhousePlantReflectionAnalysis,GreenhouseReflectionSource } from '../../shared/greenhouse-analysis';
import { greenhousePlantById,greenhousePlants } from '../data/greenhouse-plants';
import { gameEvents } from '../game/events';
import { requestGreenhouseAnalysis,requestPlantReflectionAnalysis } from '../services/greenhouseAi';
import { analyzeGreenhouseDiscoveries,compareGreenhouseRecords,createFallbackGreenhouseAnalysis,createFallbackPlantMessage,createGreenhouseCompletionStory,dominantEmotion,GreenhouseProgressService,greenhouseCompletion,greenhouseInputLocked,memoryLeafNeedsGrowth,nextGreenhouseAnalysisStage,normalizeMemoryText,recommendRepresentativePlant,representativePlantExplanation,type GreenhouseProgress,type MemoryLeaf } from '../services/greenhouseProgress';
import { greenhouseReflectionQuestion } from '../services/greenhouseReflection';
import { hasUsablePlantImage,plantGallery } from '../services/plantImages';
import { loadPublicGreenhouseMemories,publishGreenhouseMemory,type PublicGreenhouseMemory } from '../services/publicGreenhouseMemories';
import './GreenhouseExperience.base.css';
import './GreenhouseExperience.css';

type View='intro'|'plant'|'first'|'comparison'|'analyzing'|'taste'|'growth'|'book'|'representative'|'memory'|'complete'|null;
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
  const [plantId,setPlantId]=useState<string|null>(null),[reflectionAnswer,setReflectionAnswer]=useState('');
  const [reflectionResult,setReflectionResult]=useState<GreenhousePlantReflectionAnalysis|null>(null),[reflectionSource,setReflectionSource]=useState<GreenhouseReflectionSource>('fallback');
  const [reflectionLoading,setReflectionLoading]=useState(false),[reflectionError,setReflectionError]=useState('');
  const [recordStep,setRecordStep]=useState<'observe'|'answer'>('observe'),[recordUpdateNotice,setRecordUpdateNotice]=useState(false);
  const [skipIntro,setSkipIntro]=useState(false);
  const [message,setMessage]=useState(''),[loadingMessage,setLoadingMessage]=useState(false),[filter,setFilter]=useState<'all'|'flower'|'tree'>('all');
  const [imageFailed,setImageFailed]=useState(false),[imageLoading,setImageLoading]=useState(false),[lightboxIndex,setLightboxIndex]=useState<number|null>(null);
  const modalRef=useRef<HTMLDivElement>(null),previousFocusRef=useRef<HTMLElement|null>(null),memoryExpansionRunRef=useRef(0),reflectionSubmittingRef=useRef(false);
  const [memoryType,setMemoryType]=useState('오늘 가장 기억에 남은 순간'),[memoryText,setMemoryText]=useState(''),[letter,setLetter]=useState(''),[loadingLetter,setLoadingLetter]=useState(false),[selectedLeaf,setSelectedLeaf]=useState<MemoryLeaf|null>(null);
  const [memoryStep,setMemoryStep]=useState<'write'|'creating'|'review'>('write'),[creationStage,setCreationStage]=useState<1|2>(1);
  const [expandingLeafId,setExpandingLeafId]=useState<string|null>(null);
  const [memoryArea,setMemoryArea]=useState<'mine'|'community'>('mine'),[publicMemories,setPublicMemories]=useState<PublicGreenhouseMemory[]>([]),[publicLoading,setPublicLoading]=useState(false),[publicError,setPublicError]=useState(''),[selectedPublicMemory,setSelectedPublicMemory]=useState<PublicGreenhouseMemory|null>(null);
  const [representativeId,setRepresentativeId]=useState<string|null>(null),[representativeMemo,setRepresentativeMemo]=useState('');
  const [analysisStage,setAnalysisStage]=useState<GreenhouseAnalysisStage>(3);
  const completion=greenhouseCompletion(progress),plant=plantId?greenhousePlantById.get(plantId):undefined,discoveries=analyzeGreenhouseDiscoveries(progress.collected);
  const fallbackNarrative=completion.count>=3?createFallbackGreenhouseAnalysis(progress,progress.aiAnalysis?.stage??(completion.count>=7?7:3)):undefined;
  const narrative=progress.aiAnalysis?.analysis??fallbackNarrative;
  const completionStory=completion.complete?createGreenhouseCompletionStory(progress):undefined;
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
  const close=useCallback(()=>{memoryExpansionRunRef.current+=1;setView(null);setSelectedLeaf(null);setSelectedPublicMemory(null);setMemoryStep('write');setCreationStage(1);setExpandingLeafId(null);setLoadingLetter(false)},[]);
  const openMemoryTree=useCallback(()=>{setMemoryArea('mine');setSelectedPublicMemory(null);setView('memory')},[]);
  const growSavedMemory=useCallback(async(existingLeaf:MemoryLeaf)=>{
    const runId=++memoryExpansionRunRef.current;
    setMemoryArea('mine');setSelectedLeaf(null);setSelectedPublicMemory(null);
    setExpandingLeafId(existingLeaf.id);setMemoryText(existingLeaf.originalText);
    setLoadingLetter(true);setMemoryStep('creating');setCreationStage(1);
    await new Promise(resolve=>window.setTimeout(resolve,650));
    if(runId!==memoryExpansionRunRef.current)return;
    setCreationStage(2);
    await new Promise(resolve=>window.setTimeout(resolve,750));
    if(runId!==memoryExpansionRunRef.current)return;
    const base=narrative?.memoryLetter??createFallbackGreenhouseAnalysis(progress,completion.count>=7?7:3).memoryLetter;
    const grownLetter=`${base}\n\n처음 남긴 마음을 이어서: “${normalizeMemoryText(existingLeaf.originalText)}”`;
    setLetter(grownLetter);setLoadingLetter(false);setMemoryStep('review');
  },[completion.count,narrative,progress]);
  const refreshPublicMemories=useCallback(()=>{
    setPublicLoading(true);setPublicError('');
    void loadPublicGreenhouseMemories().then(setPublicMemories).catch(()=>setPublicError('모두의 기억을 불러오지 못했어요. 잠시 후 다시 열어주세요.')).finally(()=>setPublicLoading(false));
  },[]);
  const observePlant=useCallback(async(id:string)=>{
    const definition=greenhousePlantById.get(id);if(!definition)return;
    const saved=progress.collected.find(item=>item.plantId===id);
    const savedMessage=saved?.aiMessage&&!/^안녕, 나는 꽃 \d/.test(saved.aiMessage)?saved.aiMessage:createFallbackPlantMessage(definition);
    const savedReflection=saved?.selectedEmotion&&saved.reasonCategory&&saved.recordStyle&&saved.shortReflection?{
      emotion:saved.selectedEmotion,
      reasonCategory:saved.reasonCategory,
      recordStyle:saved.recordStyle,
      keywords:saved.keywords??[],
      reflectionTitle:saved.reflectionTitle??`${saved.selectedEmotion}이 머문 마음`,
      shortReflection:saved.shortReflection,
    }:null;
    setPlantId(id);setReflectionAnswer((saved?.userAnswer??'').slice(0,100));setReflectionResult(savedReflection);setReflectionSource(saved?.analysisSource??'fallback');setReflectionLoading(false);setReflectionError('');setRecordStep('observe');setMessage(savedMessage??'');setView('plant');
    setImageFailed(false);setImageLoading(Boolean(definition.imageUrl));setLightboxIndex(null);
    if(!saved){setLoadingMessage(false);setMessage(createFallbackPlantMessage(definition))}
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
        const current=service.load();publish(current);
        setSkipIntro(false);
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
  useEffect(()=>{
    if(
      view!=='memory'
      ||memoryArea!=='mine'
      ||memoryStep!=='write'
      ||selectedLeaf
      ||selectedPublicMemory
      ||!completion.blooming
      ||!memoryLeafNeedsGrowth(progress)
    )return;
    const latest=progress.memoryLeaves[0];
    if(latest)void growSavedMemory(latest);
  },[completion.blooming,growSavedMemory,memoryArea,memoryStep,progress,selectedLeaf,selectedPublicMemory,view]);
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
  const hasReflection=Boolean(
    existing
    &&existing.includeInAnalysis!==false
    &&existing.selectedEmotion
    &&existing.reasonCategory
    &&existing.recordStyle
  );
  const analyzeAndStore=async(next:GreenhouseProgress,stage:GreenhouseAnalysisStage)=>{
    setAnalysisStage(stage);setView('analyzing');
    const result=await requestGreenhouseAnalysis(next,stage);
    const analyzed=service.setAiAnalysis(next,{stage,source:result.source,generatedAt:new Date().toISOString(),analysis:result.analysis});
    publish(analyzed);setView(stage===3?'taste':'growth');
  };
  const savePlant=async(
    analysis=reflectionResult,
    source=reflectionSource,
  )=>{
    if(!plant||!analysis||reflectionAnswer.trim().length<2)return;
    const wasNew=!existing;
    const answer=reflectionAnswer.trim().slice(0,100);
    const next=service.collect(progress,plant.id,analysis.emotion,message||createFallbackPlantMessage(plant),undefined,{
      reasonCategory:analysis.reasonCategory,
      reasonText:answer,
      recordStyle:analysis.recordStyle,
      userAnswer:answer,
      keywords:analysis.keywords,
      reflectionTitle:analysis.reflectionTitle,
      shortReflection:analysis.shortReflection,
      analysisSource:source,
      includeInAnalysis:true,
    });publish(next);
    if(!wasNew&&completion.count>=3)setRecordUpdateNotice(true);
    if(wasNew&&completion.count>=3)setRecordUpdateNotice(true);
    const nextAnalysisStage=wasNew?nextGreenhouseAnalysisStage(completion.count,next.collected.length):null;
    if(nextAnalysisStage){await analyzeAndStore(next,nextAnalysisStage);return}
    if(greenhouseCompletion(next).complete&&!completion.complete){setView('complete');return}
    setView(wasNew&&next.collected.length===1?'first':wasNew&&next.collected.length===2?'comparison':'book');
  };
  const analyzeAndSavePlant=async()=>{
    if(!plant||reflectionAnswer.trim().length<2||reflectionSubmittingRef.current)return;
    reflectionSubmittingRef.current=true;
    setReflectionLoading(true);setReflectionError('');setReflectionResult(null);
    try{
      const result=await requestPlantReflectionAnalysis(plant.id,reflectionAnswer);
      setReflectionResult(result.analysis);setReflectionSource(result.source);
      await savePlant(result.analysis,result.source);
    }catch{
      setReflectionError('마음을 기록하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }finally{
      reflectionSubmittingRef.current=false;
      setReflectionLoading(false);
    }
  };
  const saveDiscoveryOnly=async()=>{
    if(!plant||completion.count<3)return;
    const wasNew=!existing;
    const next=service.collectDiscovery(progress,plant.id,message||createFallbackPlantMessage(plant));publish(next);
    const nextAnalysisStage=wasNew?nextGreenhouseAnalysisStage(completion.count,next.collected.length):null;
    if(nextAnalysisStage){await analyzeAndStore(next,nextAnalysisStage);return}
    setView(greenhouseCompletion(next).complete&&!completion.complete?'complete':'book');
  };
  const deletePlantReflection=()=>{
    if(!plant||!hasReflection)return;
    const confirmed=window.confirm(`${plant.displayName}의 마음 기록을 삭제할까요?\n\n작성한 답변과 함께 식물도감에서도 삭제됩니다.`);
    if(!confirmed)return;
    const next=service.removePlant(progress,plant.id);
    publish(next);
    setReflectionAnswer('');
    setReflectionResult(null);
    setReflectionSource('fallback');
    setReflectionError('');
    setRecordUpdateNotice(true);
    setView('book');
  };
  const generateLetter=async()=>{
    if(memoryText.trim().length<2)return;
    setLoadingLetter(true);setMemoryStep('creating');setCreationStage(1);
    const normalized=normalizeMemoryText(memoryText);setMemoryText(normalized);
    await new Promise(resolve=>window.setTimeout(resolve,650));
    setCreationStage(2);
    await new Promise(resolve=>window.setTimeout(resolve,750));
    const base=narrative?.memoryLetter??createFallbackGreenhouseAnalysis(progress,completion.count>=7?7:3).memoryLetter;
    const createdLetter=`${base}\n\n오늘 내가 덧붙인 마음: “${normalized}”`;
    setLetter(createdLetter);setLoadingLetter(false);setMemoryStep('review');
  };
  const expandLatestMemory=async()=>{
    const existingLeaf=progress.memoryLeaves[0];
    setView('memory');setMemoryArea('mine');setSelectedLeaf(null);setSelectedPublicMemory(null);
    if(!existingLeaf){setMemoryStep('write');return}
    await growSavedMemory(existingLeaf);
  };
  const saveLeaf=()=>{
    if(!letter)return;
    const existingLeaf=expandingLeafId?progress.memoryLeaves.find(item=>item.id===expandingLeafId):undefined;
    const leaf:MemoryLeaf={
      id:existingLeaf?.id??crypto.randomUUID(),
      createdAt:existingLeaf?.createdAt??new Date().toISOString(),
      originalText:existingLeaf?.originalText??memoryText.trim(),
      aiLetter:letter,
      analysisStage:progress.aiAnalysis?.stage??(completion.count>=7?7:3),
      dominantEmotion:dominantEmotion(progress.collected),
      collectedPlantIds:progress.collected.map(item=>item.plantId),
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
    const recommended=recommendRepresentativePlant(progress.collected,discoveries);
    setRepresentativeId(progress.representativePlant?.plantId??recommended??null);
    setRepresentativeMemo(progress.representativePlant?.memo??(recommended?representativePlantExplanation(recommended,discoveries):''));
    setView('representative');
  };
  const saveRepresentative=()=>{
    if(!representativeId)return;
    const memo=representativeMemo||representativePlantExplanation(representativeId,discoveries);
    publish(service.selectRepresentative(progress,representativeId,memo));setView('memory');
  };
  const visiblePlants=greenhousePlants.filter(item=>filter==='all'||filter==='flower'&&item.category==='flower'||filter==='tree'&&item.category!=='flower');
  const comparisonPlants=progress.collected.slice(-2);
  const needsRepresentative=completion.count>=3&&!progress.representativePlant;
  const nextTarget=completion.count<3?3:needsRepresentative?3:completion.count<7?7:14;
  const nextGoal=completion.count<3?'나에 대한 발견':needsRepresentative?'대표 식물 확정':completion.count<7?'더 선명한 발견':'수목원 완전 탐험';

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
        {view==='intro'&&<><div className="greenhouse-hero-icon">🌿</div><small>수목원 마음 기록</small><h2>식물 3종과 짧게 대화해 보세요</h2><p className="greenhouse-intro-lead">식물을 보고 떠오른 마음을 한 문장으로 남기면<br/>나만의 자연 기록을 만들어 드려요.</p><div className="greenhouse-entry-guide greenhouse-entry-guide-simple"><span><b>1</b><i>🍃</i><strong>식물 보기</strong><small>가까이 가서 E를 눌러요.</small></span><span><b>2</b><i>💬</i><strong>한 문장 답하기</strong><small>AI 질문에 짧게 답해요.</small></span><span><b>3</b><i>✨</i><strong>내 결과 보기</strong><small>3개를 기록하면 열려요.</small></span></div><div className="greenhouse-intro-actions"><label className="greenhouse-intro-skip"><input type="checkbox" checked={skipIntro} onChange={event=>setSkipIntro(event.target.checked)}/><span>다시 안 보기</span></label><button className="greenhouse-primary greenhouse-intro-start" type="button" onClick={()=>{if(skipIntro)publish(service.save({...progress,introSeen:true}));close()}}>첫 식물 찾기</button></div></>}
        {view==='plant'&&plant&&<>
          {recordStep==='observe'?<div className="greenhouse-plant-layout">
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
              <div className="greenhouse-knowledge-grid">
                {plant.nameStory&&<article><small>📖 이름 이야기</small><p>{plant.nameStory}</p></article>}
                {plant.habitat&&<article><small>🌿 사는 곳</small><p>{plant.habitat}</p></article>}
                {plant.everydayStory&&<article><small>🏡 생활 속 식물</small><p>{plant.everydayStory}</p></article>}
                {plant.comparisonTip&&<article><small>🔎 닮은 식물 구별법</small><p>{plant.comparisonTip}</p></article>}
              </div>
              <div className="greenhouse-observation"><Search size={18}/><div><b>관찰 포인트</b><ul>{(plant.observationPoints?.length?plant.observationPoints:[plant.observationPoint].filter(Boolean) as string[]).map(item=><li key={item}>{item}</li>)}</ul></div></div>
              <div className="greenhouse-ai-message"><Search size={17}/><div><small>충녕이의 관찰 가이드</small>{loadingMessage?<p className="greenhouse-skeleton">관찰 가이드를 준비하고 있어요…</p>:<p>{message}</p>}</div></div>
              {plant.emotionBridge&&<p className="greenhouse-emotion-bridge"><Leaf size={16}/><span>{plant.emotionBridge}</span></p>}
              <h3>{hasReflection?'이 식물에 남긴 마음':'이 식물을 보며 가장 먼저 떠오른 감정은 무엇인가요?'}</h3>
              {hasReflection
                ?<div className="greenhouse-existing-reflection"><Sparkles size={16}/><div><small>저장된 마음 기록</small><strong>{existing?.reflectionTitle??`${existing?.selectedEmotion}이 머문 마음`}</strong><p>{existing?.shortReflection??existing?.userAnswer??existing?.reasonText}</p></div></div>
                :existing&&<p className="greenhouse-saved-note"><Check size={14}/> 발견은 도감에 저장되어 있어요. 원하면 마음 기록을 더할 수 있어요.</p>}
            </div>
          </div>:<section className="greenhouse-reflection">
            <header><span style={{background:plant.fallbackColor}}>🌱</span><div><small>AI와 한 번 기록 · 100자 이내</small><h2>{plant.displayName}의 마음 기록</h2></div></header>
            <div className="greenhouse-ai-question"><Sparkles size={18}/><div><small>{plant.displayName}의 질문</small><h3>{greenhouseReflectionQuestion(plant)}</h3></div></div>
            <p>정답은 없어요. 가장 먼저 떠오른 생각이나 느낌을 짧게 적어주세요.</p>
            <label className="greenhouse-reflection-input">
              <span className="sr-only">{plant.displayName}을 보며 떠오른 마음</span>
              <textarea
                maxLength={100}
                value={reflectionAnswer}
                disabled={reflectionLoading}
                onChange={event=>{setReflectionAnswer(event.target.value);setReflectionResult(null);setReflectionError('')}}
                onKeyDown={event=>event.stopPropagation()}
                onKeyUp={event=>event.stopPropagation()}
                placeholder="예: 햇빛을 받아 따뜻해 보이고, 새로운 일이 시작될 것 같아요."
                autoFocus
              />
              <small>{reflectionAnswer.length} / 100</small>
            </label>
            {reflectionLoading&&<div className="greenhouse-reflection-analyzing" role="status"><i/><span><b>마음을 살펴보고 있어요</b><small>답변에서 감정과 그 이유, 기록 성향을 정리하는 중이에요.</small></span></div>}
            {reflectionResult&&!reflectionLoading&&<div className="greenhouse-selection-response greenhouse-ai-reflection-result"><Sparkles size={16}/><div><small>AI가 발견한 마음</small><strong>{reflectionResult.reflectionTitle}</strong><p>{reflectionResult.shortReflection}</p></div></div>}
            {reflectionError&&<p className="greenhouse-reflection-error">{reflectionError}</p>}
          </section>}
          <div className="greenhouse-actions">
            <button type="button" onClick={()=>recordStep==='observe'?close():setRecordStep('observe')}>{recordStep==='observe'?'닫기':'이전'}</button>
            {recordStep==='observe'&&completion.count>=3&&!existing&&<button type="button" className="greenhouse-discovery-only" onClick={saveDiscoveryOnly}>발견만 저장하기</button>}
            {recordStep==='observe'&&hasReflection
              ?<button className="greenhouse-remove-reflection" type="button" onClick={deletePlantReflection}><Trash2 size={16}/>마음 기록 삭제하기</button>
              :recordStep==='observe'?<button className="greenhouse-primary greenhouse-save-button" type="button" disabled={loadingMessage} onClick={()=>{setReflectionResult(null);setReflectionError('');setRecordStep('answer')}}>AI와 마음 기록하기</button>
              :<button className="greenhouse-primary" type="button" disabled={reflectionAnswer.trim().length<2||reflectionLoading} onClick={()=>void analyzeAndSavePlant()}>{reflectionLoading?'분석하고 저장하는 중…':'이 마음 기록하기'}</button>}
          </div>
          {lightboxIndex!==null&&plantGallery(plant)[lightboxIndex]&&<div className="greenhouse-lightbox" role="dialog" aria-modal="true" aria-label={`${plant.displayName} 사진 확대 보기`} onMouseDown={event=>{if(event.target===event.currentTarget)setLightboxIndex(null)}}>
            <button type="button" className="greenhouse-lightbox-close" onClick={()=>setLightboxIndex(null)} aria-label="확대 보기 닫기"><X/></button>
            <img src={plantGallery(plant)[lightboxIndex].url} alt={plantGallery(plant)[lightboxIndex].alt}/>
            {plantGallery(plant).length>1&&<><button type="button" className="greenhouse-lightbox-prev" onClick={()=>setLightboxIndex((lightboxIndex-1+plantGallery(plant).length)%plantGallery(plant).length)} aria-label="이전 사진"><ChevronLeft/></button><button type="button" className="greenhouse-lightbox-next" onClick={()=>setLightboxIndex((lightboxIndex+1)%plantGallery(plant).length)} aria-label="다음 사진"><ChevronRight/></button><span>{lightboxIndex+1} / {plantGallery(plant).length}</span></>}
          </div>}
        </>}
        {view==='first'&&<><div className="greenhouse-hero-icon">🌱</div><small>첫 번째 AI 마음 기록</small><h2>첫 번째 마음 기록을 남겼어요</h2>{progress.collected.at(-1)?.shortReflection&&<div className="greenhouse-selection-response greenhouse-ai-reflection-result greenhouse-first-reflection"><Sparkles size={16}/><div><small>AI가 발견한 마음</small><strong>{progress.collected.at(-1)?.reflectionTitle??`${progress.collected.at(-1)?.selectedEmotion}이 머문 마음`}</strong><p>{progress.collected.at(-1)?.shortReflection}</p></div></div>}<p>짧은 답변에서 발견한 감정과 이유, 기록 성향이 원문과 함께 도감에 저장됐어요.</p><button className="greenhouse-primary" type="button" onClick={close}>다음 식물 찾기</button></>}
        {view==='comparison'&&<><div className="greenhouse-hero-icon">🌿</div><small>두 번째 마음 기록 · 중간 발견</small><h2>두 마음의 공통점과 차이를 발견했어요</h2><p className="greenhouse-comparison-lead">아직 유형을 정하지 않고, 마음이 시작된 장면을 함께 살펴봐요.</p><div className="greenhouse-comparison-cards">{comparisonPlants.map((entry,index)=>{const item=greenhousePlantById.get(entry.plantId);return <div key={entry.plantId}><span>{index+1}</span><b>{item?.displayName}</b><em>{entry.selectedEmotion??'발견'}</em><small>{entry.reasonText}</small></div>})}</div><p className="greenhouse-comparison-summary">{compareGreenhouseRecords(comparisonPlants[0],comparisonPlants[1])}<br/>이제 한 식물만 더 기록하면 나에 대한 네 가지 발견을 만날 수 있어요.</p><button className="greenhouse-primary greenhouse-comparison-next" type="button" onClick={close}>세 번째 식물 찾기</button></>}
        {view==='analyzing'&&<><div className="greenhouse-memory-orbit"><Leaf/><i/><i/><i/></div><small>{analysisStage}종 기록 분석</small><h2>{analysisStage===3?'나에 대한 발견을 만들고 있어요':'기존 발견을 더 선명하게 확장하고 있어요'}</h2>{reflectionResult&&<p className="greenhouse-analysis-last-reflection">“{reflectionResult.shortReflection}”</p>}<p>각 답변에서 추출한 감정·이유·기록 방식과 대표 식물 후보를 바탕으로 문장을 다듬는 중이에요.</p><div className="greenhouse-creation-steps"><span className="done"><b>1</b><em>규칙 분석 완료</em></span><i/><span className="active"><b>2</b><em>AI 문장 해석</em></span></div></>}
        {view==='taste'&&narrative&&<><div className="greenhouse-hero-icon">✨</div><small>{progress.aiAnalysis?.stage===7?'7종 기록 · 더 선명해진 발견':'세 번째 마음 기록 · 기본 발견'}</small><h2>수목원에서 발견한 내 기록</h2><p>코드가 계산한 분석 근거를 바탕으로 기록의 의미를 자연스러운 문장으로 해석했어요.</p><span className={`greenhouse-analysis-source ${progress.aiAnalysis?.source==='ai'?'ai':'fallback'}`}>{progress.aiAnalysis?.source==='ai'?'AI 해석 결과':'안전한 기본 결과'}</span><div className="greenhouse-discoveries">
          <article><small>01 · 내가 자주 찾는 감정</small><h3>{narrative.frequentEmotion.title}</h3><p>{narrative.frequentEmotion.description}</p></article>
          <article><small>02 · 자연에서 중요하게 보는 가치</small><h3>{narrative.natureValue.title}</h3><p>{narrative.natureValue.description}</p></article>
          <article><small>03 · 나의 기록 방식</small><h3>{narrative.recordStyle.title}</h3><p>{narrative.recordStyle.description}</p></article>
          <article><small>04 · 나를 닮은 대표 식물</small><h3>{narrative.representativePlant.plantName}</h3><p>{narrative.representativePlant.reason}</p></article>
        </div><blockquote className="greenhouse-analysis-letter"><b>기억나무 기본 편지</b>{narrative.memoryLetter}</blockquote><div className="greenhouse-seed-notice"><span>🌱</span><div><b>규칙 분석이 추천한 대표 식물을 확인해 주세요</b><small>추천을 그대로 확정하거나 다른 식물로 바꿀 수 있어요.</small></div></div><button className="greenhouse-primary greenhouse-representative-open" type="button" onClick={openRepresentative}>대표 식물 확인하기</button></>}
        {view==='growth'&&narrative&&<><div className="greenhouse-unlock">🌳🌸</div><small>7종 탐험 달성 · 더 선명해진 발견</small><h2>기억나무에 꽃이 피었어요</h2><p>기존 결과의 핵심 방향을 유지하면서 새 기록을 반영해 문장과 편지를 확장했어요.</p><span className={`greenhouse-analysis-source ${progress.aiAnalysis?.source==='ai'?'ai':'fallback'}`}>{progress.aiAnalysis?.source==='ai'?'AI 확장 결과':'안전한 기본 확장'}</span><div className="greenhouse-growth-discoveries"><span><b>{narrative.frequentEmotion.title}</b>{narrative.frequentEmotion.description}</span><span><b>{narrative.natureValue.title}</b>{narrative.natureValue.description}</span><span><b>{narrative.recordStyle.title}</b>{narrative.recordStyle.description}</span></div><blockquote className="greenhouse-analysis-letter"><b>확장된 기억나무 편지</b>{narrative.memoryLetter}</blockquote><button className="greenhouse-primary" type="button" onClick={()=>void expandLatestMemory()}>{progress.memoryLeaves.length?'내 기억에도 반영하기':'내 기억 남기기'}</button></>}
        {view==='book'&&<><header className="greenhouse-book-head greenhouse-book-head-simple"><div><small>수목원 식물 기록</small><h2>식물도감</h2></div><strong>{completion.count} / {completion.total}</strong></header><div className="greenhouse-progress"><i style={{width:`${completion.ratio*100}%`}}/></div>
          {recordUpdateNotice&&<button type="button" className="greenhouse-update-notice" onClick={()=>setRecordUpdateNotice(false)}><Sparkles size={15}/>새로운 기록을 반영해 ‘내 기록’이 조금 더 선명해졌어요.<X size={13}/></button>}
          <div className="greenhouse-book-next"><span>{completion.complete?'✨':needsRepresentative?'🌱':'🍃'}</span><div><small>다음 목표</small><b>{completion.complete?'14종 기록을 모두 완성했어요':needsRepresentative?'대표 식물을 선택해 주세요':`${nextGoal}까지 ${nextTarget-completion.count}종 남았어요`}</b></div><strong>{completion.complete?'완료':needsRepresentative?'선택':`${completion.count}/${nextTarget}`}</strong></div>
          <div className="greenhouse-book-highlights">
            {completion.analysisUnlocked&&narrative?<section className="greenhouse-nature-result greenhouse-book-result"><Sparkles/><div><small>나의 발견 · {progress.aiAnalysis?.source==='ai'?'AI 해석':'기본 결과'}</small><h3>{narrative.frequentEmotion.title}</h3><button type="button" onClick={()=>setView('taste')}>발견 보기</button></div></section>:<section className="greenhouse-analysis-locked"><Lock size={16}/><span>{Math.max(0,3-completion.count)}종을 더 기록하면 내 발견이 열려요.</span></section>}
            {completion.representativeUnlocked&&<section className="greenhouse-representative-summary greenhouse-book-representative"><div><small>대표 식물</small><b>{progress.representativePlant?greenhousePlantById.get(progress.representativePlant.plantId)?.displayName:'아직 선택하지 않았어요'}</b></div><button type="button" onClick={openRepresentative}>{progress.representativePlant?'변경':'선택'}</button></section>}
          </div>
          <div className="greenhouse-filters">{(['all','flower','tree'] as const).map(value=><button type="button" className={filter===value?'active':''} onClick={()=>setFilter(value)} key={value}>{value==='all'?'전체':value==='flower'?'꽃':'나무'}</button>)}</div><div className="greenhouse-grid greenhouse-book-grid">{visiblePlants.map(item=>{const saved=progress.collected.find(entry=>entry.plantId===item.id);return <button type="button" key={item.id} className={saved?'collected':'locked'} onClick={()=>saved&&void observePlant(item.id)}><span style={saved?{background:item.fallbackColor}:undefined}>{saved?'🌱':'?'}</span><div><small>{item.category==='flower'?'꽃':'나무'}</small><b>{saved?item.displayName:'아직 발견 전'}</b>{saved&&<em>{saved.selectedEmotion??'마음 기록'}</em>}</div>{saved?<Check size={16}/>:<Lock size={14}/>}</button>})}</div></>}
        {view==='representative'&&<><div className="greenhouse-hero-icon">🌱</div><small>네 번째 발견 · 나를 닮은 대표 식물</small><h2>추천 식물을 확인해 주세요</h2><p>기록한 감정·이유·기록 방식을 바탕으로 추천했어요. 다른 식물을 고르면 설명도 함께 달라져요.</p><div className="greenhouse-representative-grid">{progress.collected.filter(entry=>entry.selectedEmotion).map(entry=>{const item=greenhousePlantById.get(entry.plantId);if(!item)return null;const recommended=entry.plantId===recommendRepresentativePlant(progress.collected,discoveries);return <button type="button" key={entry.plantId} className={representativeId===entry.plantId?'active':''} onClick={()=>{setRepresentativeId(entry.plantId);setRepresentativeMemo(representativePlantExplanation(entry.plantId,discoveries))}}><span style={{background:item.fallbackColor}}>🌱</span><b>{item.displayName}</b><small>{recommended?'규칙 분석 추천':entry.selectedEmotion}</small>{representativeId===entry.plantId&&<Check size={15}/>}</button>})}</div><div className="greenhouse-representative-reason"><b>이 식물이 나와 닮은 이유</b><p>{representativeId===narrative?.representativePlant.plantId?narrative.representativePlant.reason:representativeId?representativePlantExplanation(representativeId,discoveries):''}</p></div><div className="greenhouse-actions greenhouse-representative-actions"><button type="button" onClick={()=>setView('book')}>나중에 확정</button><button className="greenhouse-primary" type="button" disabled={!representativeId} onClick={saveRepresentative}>대표 식물 확정하기</button></div></>}
        {view==='memory'&&<><div className={`greenhouse-memory-symbol ${completion.unlocked?'awake':''} ${completion.complete?'radiant':completion.blooming?'blooming':'sprout'}`}>{completion.complete?'✨🌳✨':completion.blooming?'🌳🌸':'🌱'}</div><small>{completion.complete?'기억나무 3단계 · 완전 탐험':completion.blooming?'기억나무 2단계 해금':completion.unlocked?'기억나무 1단계 해금':'발견할수록 함께 성장하는 기억나무'}</small><h2>{completion.complete?'완전히 빛나는 기억나무':completion.blooming?'꽃이 핀 기억나무':'새싹 기억나무'}</h2>{!completion.unlocked?<>{completion.count<3?<><p>식물 3종에서 AI 질문에 짧게 답하면 내 기록이 열려요.</p><div className="greenhouse-locked-progress"><Lock/><b>{completion.count} / 3</b><span>개의 마음 기록을 모았어요.</span></div><button className="greenhouse-primary" type="button" onClick={()=>setView('book')}>식물도감 확인하기</button></>:<><p>추천된 대표 식물을 확인하면 새싹 기억나무가 깨어나요.</p><button className="greenhouse-primary" type="button" onClick={openRepresentative}>대표 식물 확인하기</button></>}</>:<>
          {memoryStep==='write'&&!selectedLeaf&&!selectedPublicMemory&&<nav className="greenhouse-memory-audience-tabs" aria-label="기억나무 보기">
            <button type="button" className={memoryArea==='mine'?'active':''} onClick={()=>setMemoryArea('mine')}>🌱 내 기억</button>
            <button type="button" className={memoryArea==='community'?'active':''} onClick={()=>setMemoryArea('community')}>🌳 모두의 기억 <small>{publicMemories.length}</small></button>
          </nav>}
          {memoryStep==='write'&&memoryArea==='mine'&&<section className="greenhouse-memory-write">
            {narrative&&<blockquote className="greenhouse-analysis-letter"><b>{completion.complete?'14종 기록으로 완성된 편지':progress.aiAnalysis?.stage===7?'7종 기록으로 확장된 편지':'세 기록으로 만든 기본 편지'}</b>{completionStory?.finalLetter??narrative.memoryLetter}</blockquote>}
            <div className="greenhouse-memory-write-head"><span>✍️</span><div><small>STEP 1 · 오늘의 마음</small><h3>기억하고 싶은 이야기를 적어주세요</h3></div></div>
            <div className="greenhouse-memory-tabs">{Object.keys(memoryPlaceholders).map(item=><button type="button" className={memoryType===item?'active':''} onClick={()=>setMemoryType(item)} key={item}>{item}</button>)}</div>
            <textarea maxLength={500} value={memoryText} onChange={event=>setMemoryText(event.target.value)} onKeyDown={event=>event.stopPropagation()} onKeyUp={event=>event.stopPropagation()} placeholder={memoryPlaceholders[memoryType]}/>
            <button className="greenhouse-primary greenhouse-memory-create" type="button" disabled={memoryText.trim().length<2||loadingLetter} onClick={generateLetter}>기억 문장 만들기</button>
            <small className="greenhouse-memory-help">작성한 글을 저장된 기억나무 편지에 덧붙여 나만의 기억 잎으로 남겨요.</small>
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
            <details className="greenhouse-letter-menu"><summary aria-label="기억 편지 메뉴"><MoreVertical size={18}/></summary><button type="button" onClick={()=>{if(window.confirm('이 기억의 잎을 삭제할까요?')){publish(service.deleteMemoryLeaf(progress,selectedLeaf.id));setSelectedLeaf(null)}}}><Trash2 size={14}/> 이 기억 삭제</button></details>
            <article className="greenhouse-paper"><time>{date(selectedLeaf.createdAt)}</time><h2>{selectedLeaf.dominantEmotion}의 기억</h2><Leaf className="greenhouse-paper-leaf"/><h3>미래의 나에게</h3><blockquote>“{normalizeMemoryText(selectedLeaf.originalText)}”</blockquote><hr/><p className="greenhouse-paper-letter">{selectedLeaf.aiLetter}</p><hr/><section><b>오늘 발견한 식물</b><div className="greenhouse-letter-plants">{foundPlants.map(item=><span key={item.id}>{item.imageUrl?<img src={item.thumbnailUrl??item.imageUrl} alt="" loading="lazy"/>:<i style={{background:item.fallbackColor}}>🌱</i>}<small>{item.displayName}</small></span>)}</div></section><section className="greenhouse-letter-emotion"><b>오늘의 감정</b><span>✨ {selectedLeaf.dominantEmotion}</span></section></article>
            <button className="greenhouse-primary greenhouse-letter-return" type="button" onClick={()=>setSelectedLeaf(null)}>기억나무로 돌아가기</button>
          </div>})()}
          {selectedPublicMemory&&<div className="greenhouse-leaf-detail greenhouse-public-leaf-detail">
            <article className="greenhouse-paper"><time>{date(selectedPublicMemory.createdAt)} · {selectedPublicMemory.nickname}</time><h2>{selectedPublicMemory.dominantEmotion}의 기억</h2><Leaf className="greenhouse-paper-leaf"/><h3>수목원에 남긴 마음</h3><blockquote>“{normalizeMemoryText(selectedPublicMemory.originalText)}”</blockquote><hr/><p className="greenhouse-paper-letter">{selectedPublicMemory.aiLetter}</p><hr/><section><b>함께 발견한 식물</b><div className="greenhouse-public-plant-names">{selectedPublicMemory.plantNames.slice(0,5).map(item=><span key={item}>🌱 {item}</span>)}</div></section><section className="greenhouse-letter-emotion"><b>대표 감정</b><span>✨ {selectedPublicMemory.dominantEmotion}</span></section></article>
            <button className="greenhouse-primary greenhouse-letter-return" type="button" onClick={()=>setSelectedPublicMemory(null)}>모두의 기억으로 돌아가기</button>
          </div>}
        </>}</>}
        {view==='complete'&&completionStory&&<><div className="greenhouse-completion-burst" aria-hidden="true">{Array.from({length:12},(_,index)=><i key={index}>✦</i>)}</div><div className="greenhouse-unlock greenhouse-final-tree">✨🌳✨</div><small>14종 완전 탐험 달성 · 기억나무 완성</small><h2>나의 자연 기록이 완성됐어요</h2><div className="greenhouse-completion-journey">{completionStory.stages.map(stage=><span key={stage.count}><b>{stage.count}종</b><small>{stage.label}</small><strong>{stage.emotion}</strong></span>)}</div><blockquote className="greenhouse-analysis-letter greenhouse-final-letter"><b>최종 완성 편지</b>{completionStory.finalLetter}</blockquote><section className="greenhouse-nature-declaration"><small>나의 자연 선언문</small><strong>“{completionStory.declaration}”</strong><em>🏅 14종 완전 탐험</em></section><button className="greenhouse-primary" type="button" onClick={openMemoryTree}>완성된 기억나무 확인하기</button></>}
      </div>
    </section>}
  </div>
}
