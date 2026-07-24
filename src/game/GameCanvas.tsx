import { memo,useEffect,useRef,useState } from 'react';
import Phaser from 'phaser';
import { WorldScene } from './scenes/WorldScene';
import { gameEvents } from './events';
import { socket } from './systems/socketClient';
import type { UserProfile } from '../types';
import { CharacterDebugPanel } from '../components/CharacterDebugPanel';
import { BEAR_PLAY_ZONE_RENDERER_OPTIONS,BEAR_TREE_PARK_RENDERER_OPTIONS,LAKE_PARK_RENDERER_OPTIONS,LAKE_PARK_SPAWN,VillageMapRenderer } from './renderers/VillageMapRenderer';
import type { MapId,PortalPosition,WorldInteractionPosition } from '../../shared/socket-events';

export const GameCanvas=memo(function GameCanvas({profile,fullAccess}:{profile:UserProfile;fullAccess:boolean}){
  const ref=useRef<HTMLDivElement>(null),[loading,setLoading]=useState(true),[loadingTitle,setLoadingTitle]=useState('세종 월드를 준비하고 있어요'),[loadingPlace,setLoadingPlace]=useState('세종호수공원'),[loadError,setLoadError]=useState('');
  useEffect(()=>{
    if(!ref.current)return;
    let cancelled=false;
    const townRenderer=new VillageMapRenderer(ref.current,profile,LAKE_PARK_RENDERER_OPTIONS);
    const worldRenderers:Partial<Record<MapId,VillageMapRenderer>>={town:townRenderer};
    const ensureWorldRenderer=(mapId:MapId)=>{
      const existing=worldRenderers[mapId];if(existing)return existing;
      const options=mapId==='bear-tree-park'?BEAR_TREE_PARK_RENDERER_OPTIONS:mapId==='bear-play-zone'?BEAR_PLAY_ZONE_RENDERER_OPTIONS:undefined;
      if(!options)return;
      const renderer=new VillageMapRenderer(ref.current!,profile,options);renderer.setVisible(false);worldRenderers[mapId]=renderer;
      if(mapId==='bear-play-zone'){
        setLoadingPlace('곰 놀이 공간');setLoadingTitle('빈 공간 체험 이동 중');setLoadError('');setLoading(true);
        void renderer.ready.then(()=>{if(!cancelled)setLoading(false)}).catch(error=>{if(!cancelled)setLoadError(error instanceof Error?error.message:String(error))});
      }
      return renderer;
    };
    const savedPortalPositions=():PortalPosition[]=>[{destination:'bear-tree-park' as const,key:'world-portal-position-bear-tree-park'},{destination:'town' as const,key:'world-portal-position-town'},{destination:'campus' as const,key:'world-portal-position-campus'}].flatMap(({destination,key})=>{try{const saved=JSON.parse(localStorage.getItem(key)??'null') as {x?:number;z?:number}|null;return saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.z)?[{destination,x:saved.x!,z:saved.z!}]:[]}catch{return[]}});
    const savedInteractionPositions=():WorldInteractionPosition[]=>[{destination:'bear-play-zone' as const,key:'world-interaction-position-bear-play-zone'},{destination:'bear-tree-park' as const,key:'world-interaction-position-bear-tree-park'}].flatMap(({destination,key})=>{try{const saved=JSON.parse(localStorage.getItem(key)??'null') as {x?:number;z?:number}|null;return saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.z)?[{destination,x:saved.x!,z:saved.z!}]:[]}catch{return[]}});
    const publishSavedPortalPositions=()=>savedPortalPositions().forEach(position=>socket.emit('savePortalPosition',position));
    const publishSavedInteractionPositions=()=>savedInteractionPositions().forEach(position=>socket.emit('saveInteractionPosition',position));
    const applySharedPortalPositions=(positions:PortalPosition[])=>positions.forEach(position=>Object.values(worldRenderers).forEach(renderer=>renderer?.setPortalPosition(position)));
    const applySharedInteractionPositions=(positions:WorldInteractionPosition[])=>positions.forEach(position=>Object.values(worldRenderers).forEach(renderer=>renderer?.setInteractionPosition(position)));
    socket.on('connect',publishSavedPortalPositions);
    socket.on('connect',publishSavedInteractionPositions);
    socket.on('portalPositionsUpdated',applySharedPortalPositions);
    socket.on('interactionPositionsUpdated',applySharedInteractionPositions);
    if(socket.connected){publishSavedPortalPositions();publishSavedInteractionPositions()}
    void townRenderer.ready.then(()=>{if(!cancelled)setLoading(false)}).catch(error=>{if(!cancelled)setLoadError(error instanceof Error?error.message:String(error))});
    const syncWorldClock=(serverNow:number)=>Object.values(worldRenderers).forEach(renderer=>renderer?.setWorldClock(serverNow));
    const enrich=()=>socket.emit('joinMap',{mapId:'town',nickname:profile.nickname,appearance:profile.character,model:profile.model,matchProfile:{mbti:profile.mbti,interests:profile.interests,usagePurposes:profile.usagePurposes,preferredPlaceCategories:profile.preferredPlaceCategories},x:LAKE_PARK_SPAWN.x,y:LAKE_PARK_SPAWN.z});
    socket.on('worldClock',syncWorldClock);
    socket.once('currentMapUsers',enrich);
    const game=new Phaser.Game({type:Phaser.AUTO,parent:ref.current,width:1100,height:700,transparent:true,backgroundColor:'rgba(0,0,0,0)',dom:{createContainer:true},physics:{default:'arcade'},scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH}});
    game.canvas.classList.add('phaser-world-canvas');
    if(game.domContainer)game.domContainer.style.zIndex='3';
    game.scene.add('world',WorldScene,true,{profile,worldRenderers,ensureWorldRenderer,fullAccess});
    return()=>{
      cancelled=true;
      socket.off('worldClock',syncWorldClock);
      socket.off('currentMapUsers',enrich);
      socket.off('connect',publishSavedPortalPositions);
      socket.off('connect',publishSavedInteractionPositions);
      socket.off('portalPositionsUpdated',applySharedPortalPositions);
      socket.off('interactionPositionsUpdated',applySharedInteractionPositions);
      gameEvents.removeAllListeners('show-bubble');
      game.destroy(true);
      Object.values(worldRenderers).forEach(renderer=>renderer?.destroy());
    };
  },[profile,fullAccess]);
  return <><div className="game-canvas" ref={ref}/>{loading&&<div className="game-loading" role="status" aria-live="polite"><div className="game-loading-brand"><span>🧑🏻‍🌾</span><div><b>여기 사람 있음</b><small>SEJONG AI METAVERSE</small></div></div><div className="game-loading-center"><i/><span>{loadingPlace}</span><h1>{loadingTitle}</h1><p>{loadError||'캐릭터와 월드 데이터를 안전하게 불러오는 중이에요.'}</p><div className="world-loading-tasks"><span>✓ 캐릭터 생성</span><span>✓ 3D 맵 로딩</span><span>● AI 충녕이 초기화</span><span>● Gemini 연결</span><span>● 다른 사용자 동기화</span></div><div className="game-loading-progress"><em/></div></div></div>}<CharacterDebugPanel/></>;
});
