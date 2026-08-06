import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import gardenModelUrl from '../assets/maps/garden.glb?url';
import { greenhousePlantById } from '../data/greenhouse-plants';
import type { GardenFlowerId } from '../../shared/personal-farm';

let sourceScenePromise: Promise<THREE.Object3D> | undefined;
const loadSourceScene = () => sourceScenePromise ??= new Promise<THREE.Object3D>((resolve, reject) => {
  new GLTFLoader().load(gardenModelUrl, (gltf) => resolve(gltf.scene), undefined, reject);
});

export async function createFlowerObjectById(flowerId: GardenFlowerId): Promise<THREE.Object3D> {
  const definition = greenhousePlantById.get(({ hydrangea: 'flower-04', tulip: 'flower-05', iris: 'flower-06', camellia: 'flower-08', sunflower: 'flower-09' } as const)[flowerId]);
  if (!definition) throw new Error(`Unknown flower asset: ${flowerId}`);
  const source = await loadSourceScene();
  const sourceObject = definition.objectNames.map((name) => source.getObjectByName(name)).find((object): object is THREE.Object3D => Boolean(object));
  if (!sourceObject) throw new Error(`Missing flower asset node: ${flowerId}`);
  return cloneSkeleton(sourceObject);
}
