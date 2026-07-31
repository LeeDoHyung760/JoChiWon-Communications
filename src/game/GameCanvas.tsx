import { memo,useEffect,useRef,useState } from 'react';
import Phaser from 'phaser';
import { WorldScene } from './scenes/WorldScene';
import { gameEvents } from './events';
import { socket } from './systems/socketClient';
import type { UserProfile } from '../types';
import { LakeParkExperiences } from '../components/LakeParkExperiences';
import { GreenhouseExperience } from '../components/GreenhouseExperience';
import { ChungnyeongNotebook } from '../components/ChungnyeongNotebook';
import { NatureDiscoveryGuide } from '../components/NatureDiscoveryGuide';
import { BearHabitatDesignExperience } from '../components/BearHabitatDesignExperience';
import { BEAR_PLAY_ZONE_RENDERER_OPTIONS,BEAR_TREE_PARK_RENDERER_OPTIONS,CAMPUS_RENDERER_OPTIONS,GARDEN_RENDERER_OPTIONS,GOVERNMENT_CENTRAL_PLAZA_RENDERER_OPTIONS,GOVERNMENT_OBSERVATORY_RENDERER_OPTIONS,GOVERNMENT_RENDERER_OPTIONS,LAKE_PARK_RENDERER_OPTIONS,LAKE_PARK_SPAWN,preloadBearTreeParkDownload,PROJECT_ROOM_RENDERER_OPTIONS,SEJONG_SMART_CITY_RENDERER_OPTIONS,STUDENT_HALL_RENDERER_OPTIONS,VillageMapRenderer,WORLD_RENDERER_LAYOUT_TOKEN } from './renderers/VillageMapRenderer';
import type { MapId,RespawnPosition } from '../../shared/socket-events';
import { buildExperienceRecommendationProfile,recordMapExperience } from '../services/experienceRecommendationProfile';
import type { GameReturnState } from './gameReturnState';

const MAP_LOADING_COPY:Record<MapId,{place:string;title:string;description:string;tasks:string[]}>={
  town:{place:'세종호수공원',title:'세종호수공원으로 이동중...',description:'호수 산책로와 다양한 취향 체험을 준비하고 있어요.',tasks:['입장 위치 확인','호수공원 산책로 불러오기','캐릭터 배치','축제·공연 체험 연결','주변 사용자 연결']},
  'bear-tree-park':{place:'베어트리파크',title:'베어트리파크로 이동중...',description:'숲길과 자연 관찰 공간을 준비하고 있어요.',tasks:['숲길 입구 확인','베어트리파크 숲 불러오기','탐험 캐릭터 배치','자연 관찰 기록 연결','주변 탐험가 연결']},
  'bear-play-zone':{place:'AI 탐험 연구소',title:'AI 탐험 연구소로 이동중...',description:'두 곰의 특성과 제한된 서식 자원 설계를 준비하고 있어요.',tasks:['연구소 입구 확인','두 곰 조사 카드 준비','동굴·먹이·물가 연결','돌발 상황 생성','의사결정 분석 준비']},
  garden:{place:'수목원',title:'수목원으로 이동중...',description:'정원과 온실의 식물 탐험을 준비하고 있어요.',tasks:['수목원 입구 확인','정원과 온실 불러오기','탐험 캐릭터 배치','식물도감 기록 연결','주변 탐험가 연결']},
  campus:{place:'공동캠퍼스',title:'공동캠퍼스로 이동중...',description:'관심사가 비슷한 이웃과 만날 캠퍼스를 준비하고 있어요.',tasks:['캠퍼스 입구 확인','공동캠퍼스 불러오기','캐릭터 배치','관심사·동아리 연결','다른 사용자 연결']},
  'student-hall':{place:'학생회관',title:'학생회관으로 이동중...',description:'캠퍼스 이웃과 만날 학생회관 로비를 준비하고 있어요.',tasks:['학생회관 입구 확인','학생회관 불러오기','캐릭터 배치','로비 동선 연결','다른 사용자 연결']},
  'project-room':{place:'프로젝트실',title:'프로젝트실로 이동중...',description:'함께 아이디어를 구체화할 프로젝트 공간을 준비하고 있어요.',tasks:['프로젝트실 입구 확인','프로젝트실 불러오기','캐릭터 배치','공동 작업 공간 연결','주변 사용자 연결']},
  government:{place:'정부청사',title:'정부청사로 이동중...',description:'함께 방문할 장소와 코스를 정할 공간을 준비하고 있어요.',tasks:['정부청사 입구 확인','정부청사 불러오기','캐릭터 배치','공동 계획 공간 연결','다른 사용자 연결']},
  'government-central-plaza':{place:'중앙광장',title:'중앙광장으로 이동중...',description:'AI 세종 추천센터와 행정 안내 공간을 준비하고 있어요.',tasks:['중앙광장 입구 확인','중앙광장 GLB 불러오기','캐릭터 배치','AI 추천센터 연결','정부청사 귀환 포탈 연결']},
  'government-policy-hall':{place:'정책 체험관',title:'정책 체험관으로 이동중...',description:'세종의 정책을 살펴보고 의견을 남길 공간을 준비하고 있어요.',tasks:['정책 체험관 입구 확인','행정 체험 공간 구성','캐릭터 배치','정책 안내 연결','정부청사 귀환 동선 연결']},
  'government-observatory':{place:'전망대',title:'전망대로 이동중...',description:'세종의 전경을 한눈에 볼 전망 공간을 준비하고 있어요.',tasks:['전망대 입구 확인','전망 공간 구성','캐릭터 배치','전경 안내 연결','정부청사 귀환 동선 연결']},
  'sejong-smart-city':{place:'세종 스마트시티 국가시범도시',title:'스마트시티로 이동중...',description:'AI와 데이터로 연결된 세종 5-1 생활권 미래 전시관을 준비하고 있어요.',tasks:['전시관 입구 확인','스마트시티 전시관 GLB 불러오기','캐릭터 배치','AI·모빌리티·에너지 전시 연결','정부청사 귀환 포탈 연결']},
  'jochwon-station':{place:'조치원역',title:'조치원역으로 이동중...',description:'세종 여행을 시작할 역 광장을 준비하고 있어요.',tasks:['도착 위치 확인','조치원역 광장 불러오기','캐릭터 배치','지역 이동 정보 연결','주변 사용자 연결']},
  'traditional-market':{place:'세종전통시장',title:'세종전통시장으로 이동중...',description:'먹거리와 골목 상점을 둘러볼 시장을 준비하고 있어요.',tasks:['시장 입구 확인','시장 골목 불러오기','캐릭터 배치','맛집·상점 정보 연결','주변 방문자 연결']},
  'jochwon-park':{place:'조치원공원',title:'조치원공원으로 이동중...',description:'천천히 산책하고 쉴 수 있는 공원을 준비하고 있어요.',tasks:['공원 입구 확인','산책로와 쉼터 불러오기','캐릭터 배치','공원 체험 연결','주변 산책자 연결']},
  'college-street':{place:'대학로',title:'대학로로 이동중...',description:'청년 문화와 개성 있는 가게가 모인 거리를 준비하고 있어요.',tasks:['거리 입구 확인','대학로 상점 불러오기','캐릭터 배치','문화·상점 정보 연결','주변 사용자 연결']},
};

const rendererOptionsFor=(mapId:MapId)=>mapId==='town'?LAKE_PARK_RENDERER_OPTIONS:mapId==='bear-tree-park'?BEAR_TREE_PARK_RENDERER_OPTIONS:mapId==='bear-play-zone'?BEAR_PLAY_ZONE_RENDERER_OPTIONS:mapId==='garden'?GARDEN_RENDERER_OPTIONS:mapId==='campus'?CAMPUS_RENDERER_OPTIONS:mapId==='student-hall'?STUDENT_HALL_RENDERER_OPTIONS:mapId==='project-room'?PROJECT_ROOM_RENDERER_OPTIONS:mapId==='government'?GOVERNMENT_RENDERER_OPTIONS:mapId==='government-central-plaza'?GOVERNMENT_CENTRAL_PLAZA_RENDERER_OPTIONS:mapId==='government-observatory'?GOVERNMENT_OBSERVATORY_RENDERER_OPTIONS:mapId==='sejong-smart-city'?SEJONG_SMART_CITY_RENDERER_OPTIONS:undefined;

export const GameCanvas=memo(function GameCanvas({profile,returnState}:{profile:UserProfile;returnState?:GameReturnState}){
  const [entrySpawn,setEntrySpawn]=useState<RespawnPosition|undefined>(()=>returnState);
  const ref=useRef<HTMLDivElement>(null),[loading,setLoading]=useState(true),[loadingMapId,setLoadingMapId]=useState<MapId>(()=>returnState?.mapId??'town'),[loadError,setLoadError]=useState('');
  const loadingCopy=MAP_LOADING_COPY[loadingMapId];
  useEffect(()=>{
    if(returnState){setEntrySpawn(returnState);return}
    let active=true,settled=false,fallbackTimer=0;
    const finish=(position:RespawnPosition)=>{if(!active||settled)return;settled=true;window.clearTimeout(fallbackTimer);setEntrySpawn(position)};
    const resolveRespawn=()=>socket.emit('getRespawnPosition',finish);
    // Remote shared servers can need more than a local round trip.
    fallbackTimer=window.setTimeout(()=>finish(LAKE_PARK_SPAWN),5000);
    socket.on('connect',resolveRespawn);
    if(socket.connected)resolveRespawn();else socket.connect();
    return()=>{active=false;window.clearTimeout(fallbackTimer);socket.off('connect',resolveRespawn)};
  },[returnState]);
  useEffect(()=>{
    if(!ref.current||!entrySpawn)return;
    let cancelled=false,mapTravelActive=false,gardenReleaseTimer=0;
    const preloadIdleHandles:number[]=[];
    const initialMapId=returnState?.mapId??'town',initialOptions=rendererOptionsFor(initialMapId);
    const initialRenderer=initialOptions?new VillageMapRenderer(ref.current,profile,{...initialOptions,spawn:entrySpawn}):undefined;
    const worldRenderers:Partial<Record<MapId,VillageMapRenderer>>=initialRenderer?{[initialMapId]:initialRenderer}:{};
    const ensureWorldRenderer=(mapId:MapId)=>{
      const existing=worldRenderers[mapId];if(existing)return existing;
      const options=rendererOptionsFor(mapId);
      if(!options)return;
      const renderer=new VillageMapRenderer(ref.current!,profile,options);renderer.setVisible(false);worldRenderers[mapId]=renderer;
      return renderer;
    };
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
    gameEvents.on('map-travel-started',showMapTravelLoading);
    gameEvents.on('map-travel-complete',hideMapTravelLoading);
    gameEvents.on('map-travel-failed',showMapTravelError);
    void (initialRenderer?.ready??Promise.resolve()).then(()=>{
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
    const enrich=()=>socket.emit('joinMap',{mapId:initialMapId,nickname:profile.nickname,appearance:profile.character,model:profile.model,matchProfile:recommendationProfile(),x:entrySpawn.x,y:entrySpawn.z});
    const experienceChanged=()=>publishRecommendationProfile();
    const mapExperienceChanged=(mapId:MapId)=>{
      recordMapExperience(profile.nickname,mapId);
      publishRecommendationProfile();
      // Keep only the active WebGL world. Retaining the lake renderer while
      // loading the bear park and research lab can exhaust the GPU context.
      Object.entries(worldRenderers).forEach(([storedMapId,renderer])=>{
        if(storedMapId===mapId||!renderer)return;
        renderer.setVisible(false);
        renderer.destroy();
        delete worldRenderers[storedMapId as MapId];
      });
    };
    socket.on('worldClock',syncWorldClock);
    socket.once('currentMapUsers',enrich);
    window.addEventListener('sejong-lake-interest-updated',experienceChanged);
    gameEvents.on('greenhouse-progress-changed',experienceChanged);
    gameEvents.on('bear-wildlife-progress-changed',experienceChanged);
    gameEvents.on('bear-travel-style-changed',experienceChanged);
    gameEvents.on('bear-habitat-decision-changed',experienceChanged);
    gameEvents.on('map-travel-complete',mapExperienceChanged);
    const game=new Phaser.Game({type:Phaser.CANVAS,parent:ref.current,width:1100,height:700,transparent:true,backgroundColor:'rgba(0,0,0,0)',render:{antialias:false,roundPixels:true},dom:{createContainer:true},physics:{default:'arcade'},scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH}});
    game.canvas.classList.add('phaser-world-canvas');
    if(game.domContainer)game.domContainer.style.zIndex='3';
    game.scene.add('world',WorldScene,true,{profile,mapId:initialMapId,worldRenderers,ensureWorldRenderer,initialSpawn:entrySpawn});
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
      gameEvents.off('bear-habitat-decision-changed',experienceChanged);
      gameEvents.off('map-travel-complete',mapExperienceChanged);
      gameEvents.off('map-travel-started',showMapTravelLoading);
      gameEvents.off('map-travel-complete',hideMapTravelLoading);
      gameEvents.off('map-travel-failed',showMapTravelError);
      gameEvents.removeAllListeners('show-bubble');
      game.destroy(true);
      Object.values(worldRenderers).forEach(renderer=>renderer?.destroy());
    };
  },[profile,entrySpawn,returnState,WORLD_RENDERER_LAYOUT_TOKEN]);
  return <><div className="game-canvas" ref={ref}/>{loading&&<div className="game-loading" role="status" aria-live="polite"><div className="game-loading-brand"><span>🧑🏻‍🌾</span><div><b>세종한바퀴</b><small>세종 소통형 체험 공간</small></div></div><div className="game-loading-center"><i/><span>{loadingCopy.place}</span><h1>{loadingCopy.title}</h1><p>{loadError||loadingCopy.description}</p><div className="world-loading-tasks">{loadingCopy.tasks.map((task,index)=><span key={task}>{index===0?'✓':'●'} {task}</span>)}</div><div className="game-loading-progress"><em/></div></div></div>}<ChungnyeongNotebook profile={profile}/><LakeParkExperiences/><NatureDiscoveryGuide userKey={profile.nickname}/><BearHabitatDesignExperience userKey={profile.nickname} mapId={loadingMapId}/><GreenhouseExperience userKey={profile.nickname}/></>;
});
