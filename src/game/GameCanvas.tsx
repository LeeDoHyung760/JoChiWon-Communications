import { memo,useEffect,useRef,useState } from 'react';
import Phaser from 'phaser';
import { WorldScene } from './scenes/WorldScene';
import { gameEvents } from './events';
import { socket } from './systems/socketClient';
import type { UserProfile } from '../types';
import { CharacterDebugPanel } from '../components/CharacterDebugPanel';
import { LakeParkExperiences } from '../components/LakeParkExperiences';
import { GreenhouseExperience } from '../components/GreenhouseExperience';
import { ChungnyeongNotebook } from '../components/ChungnyeongNotebook';
import { NatureDiscoveryGuide } from '../components/NatureDiscoveryGuide';
import { BearTravelStyleExperience } from '../components/BearTravelStyleExperience';
import { BEAR_PLAY_ZONE_RENDERER_OPTIONS,BEAR_TREE_PARK_RENDERER_OPTIONS,CAMPUS_RENDERER_OPTIONS,GARDEN_RENDERER_OPTIONS,LAKE_PARK_RENDERER_OPTIONS,LAKE_PARK_SPAWN,preloadBearTreeParkDownload,VillageMapRenderer } from './renderers/VillageMapRenderer';
import type { BearTreePortalPositions,LakeExperiencePosition,MapId,PortalPosition,RespawnPosition,WorldInteractionPosition } from '../../shared/socket-events';
import { buildExperienceRecommendationProfile,recordMapExperience } from '../services/experienceRecommendationProfile';

const MAP_LOADING_COPY:Record<MapId,{place:string;title:string;description:string;tasks:string[]}>={
  town:{place:'세종호수공원',title:'세종호수공원으로 이동중...',description:'호수 산책로와 다양한 취향 체험을 준비하고 있어요.',tasks:['입장 위치 확인','호수공원 산책로 불러오기','캐릭터 배치','축제·공연 체험 연결','주변 사용자 연결']},
  'bear-tree-park':{place:'베어트리파크',title:'베어트리파크로 이동중...',description:'숲길과 자연 관찰 공간을 준비하고 있어요.',tasks:['숲길 입구 확인','베어트리파크 숲 불러오기','탐험 캐릭터 배치','자연 관찰 기록 연결','주변 탐험가 연결']},
  'bear-play-zone':{place:'베어트리 AI 탐험 연구소',title:'베어트리 AI 탐험 연구소로 이동중...',description:'자연환경 관찰과 여행 행동 분석을 준비하고 있어요.',tasks:['연구소 입구 확인','생태 탐험 공간 불러오기','관찰 지점 연결','여행 행동 분석 준비','탐험 프로필 준비']},
  garden:{place:'수목원',title:'수목원으로 이동중...',description:'정원과 온실의 식물 탐험을 준비하고 있어요.',tasks:['수목원 입구 확인','정원과 온실 불러오기','탐험 캐릭터 배치','식물도감 기록 연결','주변 탐험가 연결']},
  campus:{place:'공동캠퍼스',title:'공동캠퍼스로 이동중...',description:'관심사가 비슷한 이웃과 만날 캠퍼스를 준비하고 있어요.',tasks:['캠퍼스 입구 확인','공동캠퍼스 불러오기','캐릭터 배치','관심사·동아리 연결','다른 사용자 연결']},
  'jochwon-station':{place:'조치원역',title:'조치원역으로 이동중...',description:'세종 여행을 시작할 역 광장을 준비하고 있어요.',tasks:['도착 위치 확인','조치원역 광장 불러오기','캐릭터 배치','지역 이동 정보 연결','주변 사용자 연결']},
  'traditional-market':{place:'세종전통시장',title:'세종전통시장으로 이동중...',description:'먹거리와 골목 상점을 둘러볼 시장을 준비하고 있어요.',tasks:['시장 입구 확인','시장 골목 불러오기','캐릭터 배치','맛집·상점 정보 연결','주변 방문자 연결']},
  'jochwon-park':{place:'조치원공원',title:'조치원공원으로 이동중...',description:'천천히 산책하고 쉴 수 있는 공원을 준비하고 있어요.',tasks:['공원 입구 확인','산책로와 쉼터 불러오기','캐릭터 배치','공원 체험 연결','주변 산책자 연결']},
  'college-street':{place:'대학로',title:'대학로로 이동중...',description:'청년 문화와 개성 있는 가게가 모인 거리를 준비하고 있어요.',tasks:['거리 입구 확인','대학로 상점 불러오기','캐릭터 배치','문화·상점 정보 연결','주변 사용자 연결']},
};

export const GameCanvas=memo(function GameCanvas({profile}:{profile:UserProfile}){
  const [entrySpawn,setEntrySpawn]=useState<RespawnPosition>();
  const ref=useRef<HTMLDivElement>(null),[loading,setLoading]=useState(true),[loadingMapId,setLoadingMapId]=useState<MapId>('town'),[loadError,setLoadError]=useState('');
  const loadingCopy=MAP_LOADING_COPY[loadingMapId];
  useEffect(()=>{
    let active=true,settled=false,fallbackTimer=0;
    const finish=(position:RespawnPosition)=>{if(!active||settled)return;settled=true;window.clearTimeout(fallbackTimer);setEntrySpawn(position)};
    const resolveRespawn=()=>socket.emit('getRespawnPosition',finish);
    // Remote shared servers can need more than a local round trip.
    fallbackTimer=window.setTimeout(()=>finish(LAKE_PARK_SPAWN),5000);
    socket.on('connect',resolveRespawn);
    if(socket.connected)resolveRespawn();else socket.connect();
    return()=>{active=false;window.clearTimeout(fallbackTimer);socket.off('connect',resolveRespawn)};
  },[]);
  useEffect(()=>{
    if(!ref.current||!entrySpawn)return;
    let cancelled=false,mapTravelActive=false,gardenReleaseTimer=0;
    let sharedPortalPositions:PortalPosition[]=[];
    let sharedBearTreePortalPositions:BearTreePortalPositions|undefined;
    const preloadIdleHandles:number[]=[];
    const townRenderer=new VillageMapRenderer(ref.current,profile,{...LAKE_PARK_RENDERER_OPTIONS,spawn:entrySpawn});
    const worldRenderers:Partial<Record<MapId,VillageMapRenderer>>={town:townRenderer};
    const ensureWorldRenderer=(mapId:MapId)=>{
      const existing=worldRenderers[mapId];if(existing)return existing;
      const options=mapId==='bear-tree-park'?BEAR_TREE_PARK_RENDERER_OPTIONS:mapId==='bear-play-zone'?BEAR_PLAY_ZONE_RENDERER_OPTIONS:mapId==='garden'?GARDEN_RENDERER_OPTIONS:mapId==='campus'?CAMPUS_RENDERER_OPTIONS:undefined;
      if(!options)return;
      const renderer=new VillageMapRenderer(ref.current!,profile,options);renderer.setVisible(false);worldRenderers[mapId]=renderer;
      sharedPortalPositions.forEach(position=>renderer.setPortalPosition(position));
      if(mapId==='bear-tree-park'&&sharedBearTreePortalPositions)renderer.setBearTreePortalPositions(sharedBearTreePortalPositions);
      return renderer;
    };
    const applySharedPortalPositions=(positions:PortalPosition[])=>{sharedPortalPositions=positions;positions.forEach(position=>Object.values(worldRenderers).forEach(renderer=>renderer?.setPortalPosition(position)))};
    const applyBearTreePortalPositions=(positions:BearTreePortalPositions)=>{sharedBearTreePortalPositions=positions;worldRenderers['bear-tree-park']?.setBearTreePortalPositions(positions)};
    const applySharedInteractionPositions=(positions:WorldInteractionPosition[])=>positions.forEach(position=>Object.values(worldRenderers).forEach(renderer=>renderer?.setInteractionPosition(position)));
    const applySharedLakeExperiencePositions=(positions:LakeExperiencePosition[])=>positions.forEach(position=>townRenderer.setLakeExperiencePosition(position));
    const showMapTravelLoading=(mapId:MapId)=>{
      mapTravelActive=true;setLoadingMapId(mapId);setLoadError('');setLoading(true);
      window.clearTimeout(gardenReleaseTimer);
      if(mapId==='bear-tree-park'&&worldRenderers.garden){
        gardenReleaseTimer=window.setTimeout(()=>{
          const gardenRenderer=worldRenderers.garden;
          if(!gardenRenderer)return;
          gardenRenderer.setVisible(false);
          gardenRenderer.destroy();
          delete worldRenderers.garden;
        },160);
      }
    };
    const hideMapTravelLoading=()=>{if(!mapTravelActive)return;mapTravelActive=false;setLoading(false)};
    const showMapTravelError=({message}:{message:string})=>{if(!mapTravelActive)return;mapTravelActive=false;setLoadError(message);setLoading(false)};
    socket.on('portalPositionsUpdated',applySharedPortalPositions);
    socket.on('bearTreePortalPositionsUpdated',applyBearTreePortalPositions);
    socket.on('interactionPositionsUpdated',applySharedInteractionPositions);
    socket.on('lakeExperiencePositionsUpdated',applySharedLakeExperiencePositions);
    gameEvents.on('map-travel-started',showMapTravelLoading);
    gameEvents.on('map-travel-complete',hideMapTravelLoading);
    gameEvents.on('map-travel-failed',showMapTravelError);
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
    const mapExperienceChanged=(mapId:MapId)=>{
      recordMapExperience(profile.nickname,mapId);
      publishRecommendationProfile();
      // Fallback cleanup for non-portal exits. The normal garden → Bear Tree
      // Park path releases the heavy renderer behind the loading overlay.
      if(mapId!=='garden'&&worldRenderers.garden){
        worldRenderers.garden.destroy();
        delete worldRenderers.garden;
      }
    };
    socket.on('worldClock',syncWorldClock);
    socket.once('currentMapUsers',enrich);
    window.addEventListener('sejong-lake-interest-updated',experienceChanged);
    gameEvents.on('greenhouse-progress-changed',experienceChanged);
    gameEvents.on('bear-wildlife-progress-changed',experienceChanged);
    gameEvents.on('bear-travel-style-changed',experienceChanged);
    gameEvents.on('map-travel-complete',mapExperienceChanged);
    const game=new Phaser.Game({type:Phaser.AUTO,parent:ref.current,width:1100,height:700,transparent:true,backgroundColor:'rgba(0,0,0,0)',dom:{createContainer:true},physics:{default:'arcade'},scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH}});
    game.canvas.classList.add('phaser-world-canvas');
    if(game.domContainer)game.domContainer.style.zIndex='3';
    game.scene.add('world',WorldScene,true,{profile,worldRenderers,ensureWorldRenderer,initialSpawn:entrySpawn});
    return()=>{
      cancelled=true;
      window.clearTimeout(gardenReleaseTimer);
      preloadIdleHandles.forEach(handle=>window.cancelIdleCallback(handle));
      socket.off('worldClock',syncWorldClock);
      socket.off('currentMapUsers',enrich);
      window.removeEventListener('sejong-lake-interest-updated',experienceChanged);
      gameEvents.off('greenhouse-progress-changed',experienceChanged);
      gameEvents.off('bear-wildlife-progress-changed',experienceChanged);
      gameEvents.off('bear-travel-style-changed',experienceChanged);
      gameEvents.off('map-travel-complete',mapExperienceChanged);
      socket.off('portalPositionsUpdated',applySharedPortalPositions);
      socket.off('bearTreePortalPositionsUpdated',applyBearTreePortalPositions);
      socket.off('interactionPositionsUpdated',applySharedInteractionPositions);
      socket.off('lakeExperiencePositionsUpdated',applySharedLakeExperiencePositions);
      gameEvents.off('map-travel-started',showMapTravelLoading);
      gameEvents.off('map-travel-complete',hideMapTravelLoading);
      gameEvents.off('map-travel-failed',showMapTravelError);
      gameEvents.removeAllListeners('show-bubble');
      game.destroy(true);
      Object.values(worldRenderers).forEach(renderer=>renderer?.destroy());
    };
  },[profile,entrySpawn]);
  return <><div className="game-canvas" ref={ref}/>{loading&&<div className="game-loading" role="status" aria-live="polite"><div className="game-loading-brand"><span>🧑🏻‍🌾</span><div><b>세종한바퀴</b><small>세종 소통형 체험 공간</small></div></div><div className="game-loading-center"><i/><span>{loadingCopy.place}</span><h1>{loadingCopy.title}</h1><p>{loadError||loadingCopy.description}</p><div className="world-loading-tasks">{loadingCopy.tasks.map((task,index)=><span key={task}>{index===0?'✓':'●'} {task}</span>)}</div><div className="game-loading-progress"><em/></div></div></div>}<ChungnyeongNotebook profile={profile}/><LakeParkExperiences/><NatureDiscoveryGuide userKey={profile.nickname}/><BearTravelStyleExperience userKey={profile.nickname} mapId={loadingMapId}/><GreenhouseExperience userKey={profile.nickname}/><CharacterDebugPanel/></>;
});
