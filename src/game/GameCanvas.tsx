import { memo,useEffect,useRef,useState } from 'react';
import Phaser from 'phaser';
import { WorldScene } from './scenes/WorldScene';
import { gameEvents } from './events';
import { socket } from './systems/socketClient';
import type { UserProfile } from '../types';
import { CharacterDebugPanel } from '../components/CharacterDebugPanel';
import { LakeParkExperiences } from '../components/LakeParkExperiences';
import { GreenhouseExperience } from '../components/GreenhouseExperience';
import { BEAR_PLAY_ZONE_RENDERER_OPTIONS,BEAR_TREE_PARK_RENDERER_OPTIONS,CAMPUS_RENDERER_OPTIONS,GARDEN_RENDERER_OPTIONS,LAKE_PARK_RENDERER_OPTIONS,LAKE_PARK_SPAWN,preloadBearTreeParkDownload,VillageMapRenderer } from './renderers/VillageMapRenderer';
import type { LakeExperiencePosition,MapId,PortalPosition,RespawnPosition,WorldInteractionPosition } from '../../shared/socket-events';
import { buildExperienceRecommendationProfile,recordMapExperience } from '../services/experienceRecommendationProfile';

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
  const storageKey=`sejong-respawn-position:${profile.nickname}`;
  const [entrySpawn,setEntrySpawn]=useState<RespawnPosition>();
  const ref=useRef<HTMLDivElement>(null),[loading,setLoading]=useState(true),[loadingTitle,setLoadingTitle]=useState('세종호수공원을 준비하고 있어요'),[loadingPlace,setLoadingPlace]=useState('세종호수공원'),[loadError,setLoadError]=useState('');
  useEffect(()=>{
    let active=true,settled=false,fallbackTimer=0;
    const finish=(position:RespawnPosition)=>{if(!active||settled)return;settled=true;window.clearTimeout(fallbackTimer);setEntrySpawn(position)};
    const resolveRespawn=()=>{
      let legacy:RespawnPosition|undefined;
      try{const saved=JSON.parse(localStorage.getItem(storageKey)??'null') as Partial<RespawnPosition>|null;if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.z))legacy={x:saved.x!,z:saved.z!,yaw:Number.isFinite(saved.yaw)?saved.yaw!:LAKE_PARK_SPAWN.yaw}}catch{/* Use the shared server position. */}
      if(legacy){
        finish(legacy);
        socket.emit('saveRespawnPosition',legacy,result=>{if(result.ok)localStorage.removeItem(storageKey)});
      }else socket.emit('getRespawnPosition',finish);
    };
    fallbackTimer=window.setTimeout(()=>finish(LAKE_PARK_SPAWN),700);
    socket.on('connect',resolveRespawn);
    if(socket.connected)resolveRespawn();else socket.connect();
    return()=>{active=false;window.clearTimeout(fallbackTimer);socket.off('connect',resolveRespawn)};
  },[storageKey]);
  useEffect(()=>{
    if(!ref.current||!entrySpawn)return;
    let cancelled=false,mapTravelActive=false;
    const preloadIdleHandles:number[]=[];
    const townRenderer=new VillageMapRenderer(ref.current,profile,{...LAKE_PARK_RENDERER_OPTIONS,spawn:entrySpawn});
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
    const saveMovedInteractionPosition=(position:WorldInteractionPosition)=>socket.emit('saveInteractionPosition',position);
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
    gameEvents.on('interaction-position-changed',saveMovedInteractionPosition);
    gameEvents.on('map-travel-started',showMapTravelLoading);
    gameEvents.on('map-travel-complete',hideMapTravelLoading);
    gameEvents.on('map-travel-failed',showMapTravelError);
    if(socket.connected){publishSavedPortalPositions();publishSavedInteractionPositions();publishSavedLakeExperiencePositions()}
    void townRenderer.ready.then(()=>{
      if(cancelled)return;
      setLoading(false);
      const preloadNextMap=()=>{
        if(cancelled)return;
        void preloadBearTreeParkDownload().catch(error=>console.warn('[bear tree park preload] download failed',error));
      };
      preloadIdleHandles.push(window.requestIdleCallback(preloadNextMap,{timeout:1800}));
    }).catch(error=>{if(!cancelled)setLoadError(error instanceof Error?error.message:String(error))});
    const syncWorldClock=(serverNow:number)=>Object.values(worldRenderers).forEach(renderer=>renderer?.setWorldClock(serverNow));
    const recommendationProfile=()=>buildExperienceRecommendationProfile(profile);
    const publishRecommendationProfile=()=>socket.emit('updateMatchProfile',recommendationProfile());
    const enrich=()=>socket.emit('joinMap',{mapId:'town',nickname:profile.nickname,appearance:profile.character,model:profile.model,matchProfile:recommendationProfile(),x:entrySpawn.x,y:entrySpawn.z});
    const experienceChanged=()=>publishRecommendationProfile();
    const mapExperienceChanged=(mapId:MapId)=>{recordMapExperience(profile.nickname,mapId);publishRecommendationProfile()};
    socket.on('worldClock',syncWorldClock);
    socket.once('currentMapUsers',enrich);
    window.addEventListener('sejong-lake-interest-updated',experienceChanged);
    gameEvents.on('greenhouse-progress-changed',experienceChanged);
    gameEvents.on('map-travel-complete',mapExperienceChanged);
    const game=new Phaser.Game({type:Phaser.AUTO,parent:ref.current,width:1100,height:700,transparent:true,backgroundColor:'rgba(0,0,0,0)',dom:{createContainer:true},physics:{default:'arcade'},scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH}});
    game.canvas.classList.add('phaser-world-canvas');
    if(game.domContainer)game.domContainer.style.zIndex='3';
    game.scene.add('world',WorldScene,true,{profile,worldRenderers,ensureWorldRenderer,initialSpawn:entrySpawn});
    gameEvents.emit('game-input-lock',true);
    return()=>{
      cancelled=true;
      preloadIdleHandles.forEach(handle=>window.cancelIdleCallback(handle));
      socket.off('worldClock',syncWorldClock);
      socket.off('currentMapUsers',enrich);
      window.removeEventListener('sejong-lake-interest-updated',experienceChanged);
      gameEvents.off('greenhouse-progress-changed',experienceChanged);
      gameEvents.off('map-travel-complete',mapExperienceChanged);
      socket.off('connect',publishSavedPortalPositions);
      socket.off('connect',publishSavedInteractionPositions);
      socket.off('connect',publishSavedLakeExperiencePositions);
      socket.off('portalPositionsUpdated',applySharedPortalPositions);
      socket.off('interactionPositionsUpdated',applySharedInteractionPositions);
      socket.off('lakeExperiencePositionsUpdated',applySharedLakeExperiencePositions);
      gameEvents.off('lake-experience-position-changed',saveMovedLakeExperiencePosition);
      gameEvents.off('portal-position-changed',saveMovedPortalPosition);
      gameEvents.off('interaction-position-changed',saveMovedInteractionPosition);
      gameEvents.off('map-travel-started',showMapTravelLoading);
      gameEvents.off('map-travel-complete',hideMapTravelLoading);
      gameEvents.off('map-travel-failed',showMapTravelError);
      gameEvents.removeAllListeners('show-bubble');
      game.destroy(true);
      Object.values(worldRenderers).forEach(renderer=>renderer?.destroy());
    };
  },[profile,entrySpawn]);
  return <><div className="game-canvas" ref={ref}/>{loading&&<div className="game-loading" role="status" aria-live="polite"><div className="game-loading-brand"><span>🧑🏻‍🌾</span><div><b>세종한바퀴</b><small>세종 소통형 체험 공간</small></div></div><div className="game-loading-center"><i/><span>{loadingPlace}</span><h1>{loadingTitle}</h1><p>{loadError||'호수공원의 지도와 캐릭터를 불러오는 중이에요. 잠시만 기다려 주세요.'}</p><div className="world-loading-tasks"><span>✓ 시작 위치 준비</span><span>● 호수공원 불러오기</span><span>● 캐릭터 배치</span><span>● 체험 기록 연결</span><span>● 다른 사용자 연결</span></div><div className="game-loading-progress"><em/></div></div></div>}<LakeParkExperiences/><GreenhouseExperience userKey={profile.nickname}/><CharacterDebugPanel/></>;
});
