import { useEffect,useRef,useState } from 'react';
import '@google/model-viewer';
import type { ModelViewerElement } from '@google/model-viewer';

export function WorldModelPreview({src,poster,name}:{src:string;poster:string;name:string}){
  const hostRef=useRef<HTMLDivElement>(null);
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
  useEffect(()=>{
    const host=hostRef.current;
    if(!host)return;
    setStatus('loading');
    const viewer=document.createElement('model-viewer') as ModelViewerElement;
    viewer.src=src;
    viewer.poster=poster;
    viewer.alt=`${name} 3D 월드 모형`;
    viewer.cameraControls=true;
    const centralPlazaFront=name==='정부청사 중앙광장';
    const artsCenterFront=name==='세종예술의전당';
    viewer.autoRotate=!centralPlazaFront&&!artsCenterFront;
    viewer.autoRotateDelay=1200;
    viewer.setAttribute('rotation-per-second','8deg');
    viewer.environmentImage='neutral';
    viewer.shadowIntensity=1;
    viewer.shadowSoftness=.8;
    viewer.loading='eager';
    // The central plaza's official front is the open glass entrance looking
    // through the hologram toward the three administrative Web UI panels.
    viewer.setAttribute('camera-orbit',artsCenterFront?'180deg 62deg auto':'42deg 62deg auto');
    viewer.setAttribute('field-of-view','28deg');
    viewer.setAttribute('interaction-prompt','auto');
    viewer.setAttribute('touch-action','pan-y');
    viewer.addEventListener('load',()=>setStatus('ready'),{once:true});
    viewer.addEventListener('error',()=>setStatus('error'),{once:true});
    host.append(viewer);
    return()=>viewer.remove();
  },[name,poster,src]);
  return <div className={`world-model-preview is-${status}`} ref={hostRef}>
    {status==='loading'&&<div className="world-model-loading"><i/><b>3D 월드를 불러오는 중</b><small>선택한 맵 하나만 불러오고 있어요.</small></div>}
    {status==='error'&&<div className="world-model-error"><span>🗺️</span><b>3D 모형을 불러오지 못했어요.</b><small>월드 입장은 그대로 이용할 수 있습니다.</small></div>}
  </div>;
}
