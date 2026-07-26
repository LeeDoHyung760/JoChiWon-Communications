import { useEffect, useRef } from 'react';
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

export function ThreeCharacterPreview({
  src,
  model,
  parts,
  animationName
}: {
  src: string;
  model: CharacterModel;
  parts: CharacterParts;
  animationName?: string | null;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const loadedSceneRef = useRef<Object3D | null>(null);
  const latestPartsRef = useRef(parts);

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
    const scene = new Scene();
    const camera = new PerspectiveCamera(30, 1, 0.01, 100);
    camera.position.set(1.55, 1.05, 2.7);

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(new Color(0xffffff), 0);
    host.appendChild(renderer.domElement);

    scene.add(new HemisphereLight(0xffffff, 0x6f817a, 2.2));
    const keyLight = new DirectionalLight(0xffffff, 3);
    keyLight.position.set(2, 4, 3);
    scene.add(keyLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.5, 0);
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

    new GLTFLoader().load(
      src,
      gltf => {
        if (disposed) return;
        gltf.scene.updateMatrixWorld(true);
        const bounds = new Box3().setFromObject(gltf.scene);
        const size = bounds.getSize(new Vector3());
        const center = bounds.getCenter(new Vector3());
        const previewHeight = model === 'cloths' ? 1.3 : 1.75;
        const scale = previewHeight / Math.max(size.y, 0.001);
        gltf.scene.scale.setScalar(scale);
        gltf.scene.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
        gltf.scene.updateMatrixWorld(true);
        loadedSceneRef.current = gltf.scene;
        applyColorsToThreeScene(gltf.scene, model, latestPartsRef.current);
        scene.add(gltf.scene);

        const clip = animationName === null ? undefined : gltf.animations.find(item => item.name === animationName) ?? gltf.animations[0];
        if (clip) {
          mixer = new AnimationMixer(gltf.scene);
          mixer.clipAction(clip).play();
        }
      },
      undefined,
      error => console.error('[ThreeCharacterPreview] GLB load error', error)
    );

    renderer.setAnimationLoop(() => {
      mixer?.update(clock.getDelta());
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      disposed = true;
      loadedSceneRef.current = null;
      observer.disconnect();
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
  }, [animationName, model, src]);

  return <div ref={hostRef} className="three-character-preview" aria-label={`${model} 3D 미리보기`} />;
}
