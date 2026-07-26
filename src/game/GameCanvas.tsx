import { memo,useEffect,useRef,useState } from 'react';
import Phaser from 'phaser';
import { WorldScene } from './scenes/WorldScene';
import { gameEvents } from './events';
import { socket } from './systems/socketClient';
import type { UserProfile } from '../types';
import { CharacterDebugPanel } from '../components/CharacterDebugPanel';
import { LakeParkExperiences } from '../components/LakeParkExperiences';
import { BEAR_PLAY_ZONE_RENDERER_OPTIONS,BEAR_TREE_PARK_RENDERER_OPTIONS,CAMPUS_RENDERER_OPTIONS,GARDEN_RENDERER_OPTIONS,LAKE_PARK_RENDERER_OPTIONS,LAKE_PARK_SPAWN,VillageMapRenderer } from './renderers/VillageMapRenderer';
import type { LakeExperiencePosition,MapId,PortalPosition,WorldInteractionPosition } from '../../shared/socket-events';

const MAP_LOADING_COPY:Record<MapId,{place:string;title:string}>={
  town:{place:'세종호수공원',title:'세종호수공원으로 이동중...'},
  'bear-tree-park':{place:'베어트리파크',title:'베어트리파크로 이동중...'},
  'bear-play-zone':{place:'곰 놀이 공간',title:'곰 놀이 공간으로 이동중...'},
  garden:{place:'수목원',title:'수목원으로 이동중...'},
  campus:{place:'공동캠퍼스',title:'공동캠퍼스로 이동중...'},
  'jochwon-station':{place:'조치원역',title:'조치원역으로 이동중...'},
  'traditional-market':{place:'세종전통시장',title:'세종전통시장으로 이동중...'},
  'jochwon-park':{place:'조치원공원',title:'조치원공원으로 이동중...'},
  'college-street':{place:'대학로',title:'대학로로 이동중...'},
};

export const GameCanvas=memo(function GameCanvas({profile}:{profile:UserProfile}){
  const ref=useRef<HTMLDivElement>(null),[loading,setLoading]=useState(true),[loadingTitle,setLoadingTitle]=useState('체험 공간을 준비하고 있어요'),[loadingPlace,setLoadingPlace]=useState('세종호수공원'),[loadError,setLoadError]=useState('');
  useEffect(()=>{
    if(!ref.current)return;
    let cancelled=false,mapTravelActive=false,preloadIdle:number|undefined;
    const townRenderer=new VillageMapRenderer(ref.current,profile,LAKE_PARK_RENDERER_OPTIONS);
    const worldRenderers:Partial<Record<MapId,VillageMapRenderer>>={town:townRenderer};
    const ensureWorldRenderer=(mapId:MapId)=>{
      const existing=worldRenderers[mapId];if(existing)return existing;
      const options=mapId==='bear-tree-park'?BEAR_TREE_PARK_RENDERER_OPTIONS:mapId==='bear-play-zone'?BEAR_PLAY_ZONE_RENDERER_OPTIONS:mapId==='garden'?GARDEN_RENDERER_OPTIONS:mapId==='campus'?CAMPUS_RENDERER_OPTIONS:undefined;
      if(!options)return;
      const renderer=new VillageMapRenderer(ref.current!,profile,options);renderer.setVisible(false);worldRenderers[mapId]=renderer;
      return renderer;
    };
    const savedPortalPositions=():PortalPosition[]=>[{destination:'bear-tree-park' as const,key:'world-portal-position-bear-tree-park'},{destination:'town' as const,key:'world-portal-position-town'},{destination:'campus' as const,key:'world-portal-position-campus'}].flatMap(({destination,key})=>{try{const saved=JSON.parse(localStorage.getItem(key)??'null') as {x?:number;z?:number}|null;return saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.z)?[{destination,x:saved.x!,z:saved.z!}]:[]}catch{return[]}});
    const savedInteractionPositions=():WorldInteractionPosition[]=>[{destination:'bear-play-zone' as const,key:'world-interaction-position-bear-play-zone'},{destination:'bear-tree-park' as const,key:'world-interaction-position-bear-tree-park'}].flatMap(({destination,key})=>{try{const saved=JSON.parse(localStorage.getItem(key)??'null') as {x?:number;z?:number}|null;return saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.z)?[{destination,x:saved.x!,z:saved.z!}]:[]}catch{return[]}});
    const savedLakeExperiencePositions=():LakeExperiencePosition[]=>[{experience:'central-plaza' as const,key:'lake-experience-position-central-plaza'},{experience:'wind-hill' as const,key:'lake-experience-position-wind-hill'}].flatMap(({experience,key})=>{try{const saved=JSON.parse(localStorage.getItem(key)??'null') as {x?:number;z?:number}|null;return saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.z)?[{experience,x:saved.x!,z:saved.z!}]:[]}catch{return[]}});
    const publishSavedPortalPositions=()=>savedPortalPositions().forEach(position=>socket.emit('savePortalPosition',position));
    const publishSavedInteractionPositions=()=>savedInteractionPositions().forEach(position=>socket.emit('saveInteractionPosition',position));
    const publishSavedLakeExperiencePositions=()=>savedLakeExperiencePositions().forEach(position=>socket.emit('saveLakeExperiencePosition',position));
    const applySharedPortalPositions=(positions:PortalPosition[])=>positions.forEach(position=>Object.values(worldRenderers).forEach(renderer=>renderer?.setPortalPosition(position)));
    const applySharedInteractionPositions=(positions:WorldInteractionPosition[])=>positions.forEach(position=>Object.values(worldRenderers).forEach(renderer=>renderer?.setInteractionPosition(position)));
    const applySharedLakeExperiencePositions=(positions:LakeExperiencePosition[])=>positions.forEach(position=>townRenderer.setLakeExperiencePosition(position));
    const saveMovedLakeExperiencePosition=(position:LakeExperiencePosition)=>socket.emit('saveLakeExperiencePosition',position);
    const saveMovedPortalPosition=(position:PortalPosition)=>socket.emit('savePortalPosition',position);
    const showMapTravelLoading=(mapId:MapId)=>{mapTravelActive=true;const copy=MAP_LOADING_COPY[mapId];setLoadingPlace(copy.place);setLoadingTitle(copy.title);setLoadError('');setLoading(true)};
    const hideMapTravelLoading=()=>{if(!mapTravelActive)return;mapTravelActive=false;setLoading(false)};
    const showMapTravelError=({message}:{message:string})=>{if(!mapTravelActive)return;mapTravelActive=false;setLoadError(message);setLoading(false)};
    socket.on('connect',publishSavedPortalPositions);
    socket.on('connect',publishSavedInteractionPositions);
    socket.on('connect',publishSavedLakeExperiencePositions);
    socket.on('portalPositionsUpdated',applySharedPortalPositions);
    socket.on('interactionPositionsUpdated',applySharedInteractionPositions);
    socket.on('lakeExperiencePositionsUpdated',applySharedLakeExperiencePositions);
    gameEvents.on('lake-experience-position-changed',saveMovedLakeExperiencePosition);
    gameEvents.on('portal-position-changed',saveMovedPortalPosition);
    gameEvents.on('map-travel-started',showMapTravelLoading);
    gameEvents.on('map-travel-complete',hideMapTravelLoading);
    gameEvents.on('map-travel-failed',showMapTravelError);
    if(socket.connected){publishSavedPortalPositions();publishSavedInteractionPositions();publishSavedLakeExperiencePositions()}
    void townRenderer.ready.then(()=>{
      if(cancelled)return;
      setLoading(false);
      const preloadBearTreePark=()=>{if(!cancelled)ensureWorldRenderer('bear-tree-park')};
      preloadIdle=window.requestIdleCallback(preloadBearTreePark,{timeout:1800});
    }).catch(error=>{if(!cancelled)setLoadError(error instanceof Error?error.message:String(error))});
    const syncWorldClock=(serverNow:number)=>Object.values(worldRenderers).forEach(renderer=>renderer?.setWorldClock(serverNow));
    const enrich=()=>socket.emit('joinMap',{mapId:'town',nickname:profile.nickname,appearance:profile.character,model:profile.model,matchProfile:{mbti:profile.mbti,interests:profile.interests,usagePurposes:profile.usagePurposes,preferredPlaceCategories:profile.preferredPlaceCategories},x:LAKE_PARK_SPAWN.x,y:LAKE_PARK_SPAWN.z});
    socket.on('worldClock',syncWorldClock);
    socket.once('currentMapUsers',enrich);
    const game=new Phaser.Game({type:Phaser.AUTO,parent:ref.current,width:1100,height:700,transparent:true,backgroundColor:'rgba(0,0,0,0)',dom:{createContainer:true},physics:{default:'arcade'},scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH}});
    game.canvas.classList.add('phaser-world-canvas');
    if(game.domContainer)game.domContainer.style.zIndex='3';
    game.scene.add('world',WorldScene,true,{profile,worldRenderers,ensureWorldRenderer});
    return()=>{
      cancelled=true;
      if(preloadIdle!==undefined)window.cancelIdleCallback(preloadIdle);
      socket.off('worldClock',syncWorldClock);
      socket.off('currentMapUsers',enrich);
      socket.off('connect',publishSavedPortalPositions);
      socket.off('connect',publishSavedInteractionPositions);
      socket.off('connect',publishSavedLakeExperiencePositions);
      socket.off('portalPositionsUpdated',applySharedPortalPositions);
      socket.off('interactionPositionsUpdated',applySharedInteractionPositions);
      socket.off('lakeExperiencePositionsUpdated',applySharedLakeExperiencePositions);
      gameEvents.off('lake-experience-position-changed',saveMovedLakeExperiencePosition);
      gameEvents.off('portal-position-changed',saveMovedPortalPosition);
      gameEvents.off('map-travel-started',showMapTravelLoading);
      gameEvents.off('map-travel-complete',hideMapTravelLoading);
      gameEvents.off('map-travel-failed',showMapTravelError);
      gameEvents.removeAllListeners('show-bubble');
      game.destroy(true);
      Object.values(worldRenderers).forEach(renderer=>renderer?.destroy());
    };
  },[profile]);
  return <><div className="game-canvas" ref={ref}/>{loading&&<div className="game-loading" role="status" aria-live="polite"><div className="game-loading-brand"><span>🧑🏻‍🌾</span><div><b>여기 사람 있음</b><small>SEJONG AI METAVERSE</small></div></div><div className="game-loading-center"><i/><span>{loadingPlace}</span><h1>{loadingTitle}</h1><p>{loadError||'캐릭터와 월드 데이터를 안전하게 불러오는 중이에요.'}</p><div className="world-loading-tasks"><span>✓ 캐릭터 생성</span><span>✓ 3D 맵 로딩</span><span>● AI 충녕이 초기화</span><span>● Gemini 연결</span><span>● 다른 사용자 동기화</span></div><div className="game-loading-progress"><em/></div></div></div>}<LakeParkExperiences/><CharacterDebugPanel/></>;
});
