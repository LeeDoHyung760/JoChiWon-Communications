import { useEffect, useRef, useState } from 'react';
import {
  AnimationMixer,
  Box3,
  Clock,
  Color,
  DirectionalLight,
  HemisphereLight,
  Object3D,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { applyColorsToThreeScene } from '../utils/modelColorizer';
import type { CharacterModel, CharacterParts } from '../types';

const PREVIEW_CHARACTER_HEIGHT=1.3;

export function ThreeCharacterPreview({
  src,
  model,
  parts,
  animationName,
  animationTime
}: {
  src: string;
  model: CharacterModel;
  parts: CharacterParts;
  animationName?: string | null;
  animationTime?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const loadedSceneRef = useRef<Object3D | null>(null);
  const latestPartsRef = useRef(parts);
  const [previewError,setPreviewError]=useState(false);

  useEffect(() => {
    latestPartsRef.current = parts;
    if (loadedSceneRef.current) {
      applyColorsToThreeScene(loadedSceneRef.current, model, parts);
    }
  }, [model, parts]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    setPreviewError(false);
    const scene = new Scene();
    const camera = new PerspectiveCamera(30, 1, 0.01, 100);
    camera.position.set(1.55, PREVIEW_CHARACTER_HEIGHT*.56, 2.7);

    let renderer:WebGLRenderer;
    try{
      renderer = new WebGLRenderer({ antialias: true, alpha: true });
    }catch(error){
      console.error('[ThreeCharacterPreview] WebGL renderer error',error);
      setPreviewError(true);
      return;
    }
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.setClearColor(new Color(0xffffff), 0);
    host.appendChild(renderer.domElement);

    scene.add(new HemisphereLight(0xffffff, 0x6f817a, 2.2));
    const keyLight = new DirectionalLight(0xffffff, 3);
    keyLight.position.set(2, 4, 3);
    scene.add(keyLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, PREVIEW_CHARACTER_HEIGHT*.5, 0);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 1.5;
    controls.maxDistance = 5;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.6;

    let mixer: AnimationMixer | undefined;
    const clock = new Clock();
    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    let inViewport=true;
    const visibilityObserver=new IntersectionObserver(entries=>{
      inViewport=entries[0]?.isIntersecting??true;
    },{rootMargin:'80px'});
    visibilityObserver.observe(host);

    new GLTFLoader().load(
      src,
      gltf => {
        if (disposed) return;
        gltf.scene.updateMatrixWorld(true);
        const bounds = new Box3().setFromObject(gltf.scene);
        const size = bounds.getSize(new Vector3());
        const center = bounds.getCenter(new Vector3());
        // 캐주얼형의 화면상 크기를 세 모델의 공통 기준으로 사용한다.
        const previewHeight = PREVIEW_CHARACTER_HEIGHT;
        const scale = previewHeight / Math.max(size.y, 0.001);
        gltf.scene.scale.setScalar(scale);
        gltf.scene.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
        gltf.scene.updateMatrixWorld(true);
        controls.target.set(0,previewHeight*.5,0);
        camera.position.y=previewHeight*.56;
        controls.update();
        loadedSceneRef.current = gltf.scene;
        applyColorsToThreeScene(gltf.scene, model, latestPartsRef.current);
        scene.add(gltf.scene);

        const clip = animationName === null ? undefined : gltf.animations.find(item => item.name === animationName) ?? gltf.animations[0];
        if (clip) {
          mixer = new AnimationMixer(gltf.scene);
          mixer.clipAction(clip).play();
          if (animationTime !== undefined) mixer.setTime(animationTime);
        }
      },
      undefined,
      error => {
        console.error('[ThreeCharacterPreview] GLB load error', error);
        if(!disposed)setPreviewError(true);
      }
    );

    let lastRender=0;
    renderer.setAnimationLoop(time => {
      if(document.hidden||!inViewport||time-lastRender<1000/30)return;
      const delta=Math.min((time-lastRender)/1000,.05);
      lastRender=time;
      if (animationTime === undefined) mixer?.update(delta||clock.getDelta());
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      disposed = true;
      loadedSceneRef.current = null;
      observer.disconnect();
      visibilityObserver.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      scene.traverse(object => {
        if (!('isMesh' in object)) return;
        const mesh = object as any;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material: any) => material?.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [animationName, animationTime, model, src]);

  return <div ref={hostRef} className={`three-character-preview ${previewError?'has-error':''}`} aria-label={`${model} 3D 미리보기`}>{previewError&&<div className="three-character-preview-fallback"><span>🧑🏻</span><b>미리보기를 불러오지 못했어요.</b><small>캐릭터 선택과 저장은 그대로 할 수 있어요.</small></div>}</div>;
}
