import { useEffect,useState } from 'react';
import { X } from 'lucide-react';
import { gameEvents } from '../game/events';
import observatoryPanorama from '../assets/maps/observatory-sejong-panorama.png';
import './ObservatoryTelescopeInteraction.css';

export function ObservatoryTelescopeInteraction({active}:{active:boolean}){
  const [nearby,setNearby]=useState(false);
  const [viewing,setViewing]=useState(false);

  useEffect(()=>{
    const proximity=(next:boolean)=>setNearby(next);
    const mode=(next:boolean)=>setViewing(next);
    gameEvents.on('observatory-telescope-proximity-changed',proximity);
    gameEvents.on('observatory-telescope-mode-changed',mode);
    return()=>{
      gameEvents.off('observatory-telescope-proximity-changed',proximity);
      gameEvents.off('observatory-telescope-mode-changed',mode);
    };
  },[]);

  useEffect(()=>{
    if(active)return;
    setNearby(false);
    setViewing(false);
    gameEvents.emit('observatory-telescope-exit');
  },[active]);

  return <>
    {active&&nearby&&!viewing&&
      <button className="observatory-telescope-prompt" type="button" onClick={()=>gameEvents.emit('observatory-telescope-enter')}>
        <span>🔭</span>
        <div><small>전망 망원경</small><b>세종시 전경 확대해서 보기</b></div>
        <kbd>E</kbd>
      </button>}
    {active&&viewing&&<>
      <div className="observatory-telescope-active-marker" aria-hidden="true"/>
      <div className="observatory-telescope-view" aria-label="망원경으로 보는 세종시 전경">
        <div className="observatory-telescope-lens is-left" style={{backgroundImage:`url(${observatoryPanorama})`}}/>
        <div className="observatory-telescope-lens is-right" style={{backgroundImage:`url(${observatoryPanorama})`}}/>
      </div>
      <section className="observatory-telescope-controls">
        <div><span>🔭</span><p><small>SEJONG PANORAMA</small><b>세종시 전망 망원경</b></p></div>
        <button type="button" onClick={()=>gameEvents.emit('observatory-telescope-exit')}><X size={16}/> 관람 종료 <kbd>Esc</kbd></button>
      </section>
    </>}
  </>;
}
