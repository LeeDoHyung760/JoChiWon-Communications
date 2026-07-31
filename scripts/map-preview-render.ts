import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const host=document.querySelector<HTMLDivElement>('#preview')!;
const model=new URLSearchParams(location.search).get('model');
if(!model)throw new Error('model query parameter is required');

const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
renderer.setPixelRatio(1);
renderer.setSize(1280,800,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.08;
host.append(renderer.domElement);

const scene=new THREE.Scene();
scene.background=new THREE.Color('#172b28');
scene.add(new THREE.HemisphereLight(0xf5fff9,0x445751,2.15));
const sun=new THREE.DirectionalLight(0xfff2d8,3.35);
sun.position.set(-3,5,4);
scene.add(sun);

const loader=new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const gltf=await loader.loadAsync(`/src/assets/maps/${model}`);
const root=gltf.scene;
scene.add(root);
root.updateMatrixWorld(true);

const bounds=new THREE.Box3().setFromObject(root);
const center=bounds.getCenter(new THREE.Vector3());
const size=bounds.getSize(new THREE.Vector3());
const polar=THREE.MathUtils.degToRad(62);
const azimuth=THREE.MathUtils.degToRad(42);
const direction=new THREE.Vector3(
  Math.sin(polar)*Math.sin(azimuth),
  Math.cos(polar),
  Math.sin(polar)*Math.cos(azimuth),
).normalize();
const camera=new THREE.OrthographicCamera();
camera.position.copy(center).addScaledVector(direction,Math.max(size.x,size.y,size.z)*3);
camera.lookAt(center);
camera.updateMatrixWorld(true);

const corners=[
  [bounds.min.x,bounds.min.y,bounds.min.z],[bounds.min.x,bounds.min.y,bounds.max.z],
  [bounds.min.x,bounds.max.y,bounds.min.z],[bounds.min.x,bounds.max.y,bounds.max.z],
  [bounds.max.x,bounds.min.y,bounds.min.z],[bounds.max.x,bounds.min.y,bounds.max.z],
  [bounds.max.x,bounds.max.y,bounds.min.z],[bounds.max.x,bounds.max.y,bounds.max.z],
].map(([x,y,z])=>new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
const width=Math.max(...corners.map(point=>point.x))-Math.min(...corners.map(point=>point.x));
const height=Math.max(...corners.map(point=>point.y))-Math.min(...corners.map(point=>point.y));
const halfHeight=Math.max(height*.54,width/1.6*.54);
camera.left=-halfHeight*1.6;
camera.right=halfHeight*1.6;
camera.top=halfHeight;
camera.bottom=-halfHeight;
camera.near=.01;
camera.far=Math.max(size.x,size.y,size.z)*8;
camera.updateProjectionMatrix();
renderer.render(scene,camera);
document.body.dataset.ready='true';
