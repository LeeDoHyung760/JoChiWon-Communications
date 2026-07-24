import { memo,useEffect,useRef,useState } from 'react';
import Phaser from 'phaser';
import { WorldScene } from './scenes/WorldScene';
import { gameEvents } from './events';
import { socket } from './systems/socketClient';
import type { UserProfile } from '../types';
import { CharacterDebugPanel } from '../components/CharacterDebugPanel';
import { LAKE_PARK_SPAWN,VillageMapRenderer } from './renderers/VillageMapRenderer';

export const GameCanvas=memo(function GameCanvas({profile,fullAccess}:{profile:UserProfile;fullAccess:boolean}){
  const ref=useRef<HTMLDivElement>(null),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState('');
  useEffect(()=>{
    if(!ref.current)return;
    let cancelled=false;
    const villageRenderer=new VillageMapRenderer(ref.current,profile);
    void villageRenderer.ready.then(()=>{if(!cancelled)setLoading(false)}).catch(error=>{if(!cancelled)setLoadError(error instanceof Error?error.message:String(error))});
    const enrich=()=>socket.emit('joinMap',{mapId:'town',nickname:profile.nickname,appearance:profile.character,model:profile.model,matchProfile:{mbti:profile.mbti,interests:profile.interests,usagePurposes:profile.usagePurposes,preferredPlaceCategories:profile.preferredPlaceCategories},x:LAKE_PARK_SPAWN.x,y:LAKE_PARK_SPAWN.z});
    socket.once('currentMapUsers',enrich);
    const game=new Phaser.Game({type:Phaser.AUTO,parent:ref.current,width:1100,height:700,transparent:true,backgroundColor:'rgba(0,0,0,0)',dom:{createContainer:true},physics:{default:'arcade'},scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH}});
    game.canvas.classList.add('phaser-world-canvas');
    if(game.domContainer)game.domContainer.style.zIndex='3';
    game.scene.add('world',WorldScene,true,{profile,villageRenderer,fullAccess});
    return()=>{
      cancelled=true;
      socket.off('currentMapUsers',enrich);
      gameEvents.removeAllListeners('show-bubble');
      game.destroy(true);
      villageRenderer.destroy();
    };
  },[profile,fullAccess]);
  return <><div className="game-canvas" ref={ref}/>{loading&&<div className="game-loading" role="status" aria-live="polite"><div className="game-loading-brand"><span>🧑🏻‍🌾</span><div><b>여기 사람 있음</b><small>SEJONG AI METAVERSE</small></div></div><div className="game-loading-center"><i/><span>세종호수공원</span><h1>세종 월드를 준비하고 있어요</h1><p>{loadError||'캐릭터와 월드 데이터를 안전하게 불러오는 중이에요.'}</p><div className="world-loading-tasks"><span>✓ 캐릭터 생성</span><span>✓ 3D 맵 로딩</span><span>● AI 충녕이 초기화</span><span>● Gemini 연결</span><span>● 다른 사용자 동기화</span></div><div className="game-loading-progress"><em/></div></div></div>}<CharacterDebugPanel/></>;
});
