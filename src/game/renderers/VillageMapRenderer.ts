import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import villageModelUrl from '../../assets/maps/sejong-lake-park.glb?url';
import bearTreeParkModelUrl from '../../assets/maps/bear-tree-park.glb?url';
import bearPlayZoneModelUrl from '../../assets/maps/bear-play-zone.glb?url';
import gardenModelUrl from '../../assets/maps/garden.glb?url';
import campusModelUrl from '../../assets/maps/campus.glb?url';
import bearCubModelUrl from '../../assets/characters/bear-cub.glb?url';
import chungnyeongIdleUrl from '../../assets/characters/chungnyeong_idle.glb?url';
import chungnyeongWalkUrl from '../../assets/characters/chungnyeong_walk.glb?url';
import chungnyeongRunUrl from '../../assets/characters/chungnyeong_run.glb?url';
import girlUrl from '../../assets/characters/girl1_3.glb?url';
import boyUrl from '../../assets/characters/boy1_3.glb?url';
import type { CharacterModel,CharacterParts,UserProfile } from '../../types';
import type { LakeExperienceId,LakeExperiencePosition,MapId,MotionState,PortalPosition,WorldInteractionPosition } from '../../../shared/socket-events';
import { gameEvents } from '../events';

const WORLD_WIDTH=2400;
const WORLD_HEIGHT=1900;
const CAMERA_ELEVATION=THREE.MathUtils.degToRad(33);
const OVERVIEW_CAMERA_ELEVATION=THREE.MathUtils.degToRad(58);
const GROUND_PROJECTION=Math.sin(CAMERA_ELEVATION);
const CAMERA_DISTANCE=900;
const CHARACTER_HEIGHT=94;
const CHARACTER_GROUND_CLEARANCE=4;
const MAX_STEP_HEIGHT=22;
const MIN_WALKABLE_NORMAL=.68;
const COLLISION_RADIUS=16;
const GUIDE_CHARACTER_HEIGHT=132;
const GUIDE_TALK_DISTANCE=145;
const GUIDE_TALK_EXIT_DISTANCE=175;
const GUIDE_WALK_SPEED=58;
const GUIDE_PAUSE_SECONDS=4;
const RESIDENT_WALK_SPEED=34;
const DEFAULT_MAP_SIGN_POSITION={x:2090,z:1185} as const;
const MAP_SIGN_POSITION_KEY='sejong-lake-park-map-sign-position';
const PORTAL_POSITION_KEY_PREFIX='world-portal-position';
const INTERACTION_POSITION_KEY_PREFIX='world-interaction-position';
const LAKE_EXPERIENCE_POSITION_KEY_PREFIX='lake-experience-position';
const MAP_SIGN_OPEN_DISTANCE=78;
const MAP_SIGN_EXIT_DISTANCE=105;
const PORTAL_OPEN_DISTANCE=62;
const PORTAL_EXIT_DISTANCE=78;
const INTERACTION_OPEN_DISTANCE=88;
const INTERACTION_EXIT_DISTANCE=110;
const LAKE_EXPERIENCE_OPEN_DISTANCE=92;
const LAKE_EXPERIENCE_EXIT_DISTANCE=118;
const RENDER_INTERVAL=1/45;
const PORTAL_CHARGE_SECONDS=1;
const CAMERA_ZOOM=1.28;
const MIN_PIXEL_RATIO=1;
const MAX_PIXEL_RATIO=Math.min(window.devicePixelRatio||1,1.25);
let textureAnisotropy=4;
export const LAKE_PARK_SPAWN:{x:number;z:number;yaw:number}={x:1870,z:1180,yaw:2.1};
export const BEAR_TREE_PARK_SPAWN:{x:number;z:number;yaw:number}={x:1200,z:1610,yaw:Math.PI};
export const BEAR_PLAY_ZONE_SPAWN:{x:number;z:number;yaw:number}={x:1200,z:1570,yaw:Math.PI};
export const GARDEN_SPAWN:{x:number;z:number;yaw:number}={x:1200,z:1500,yaw:Math.PI};
export const CAMPUS_SPAWN:{x:number;z:number;yaw:number}={x:1200,z:1500,yaw:Math.PI};
export const BEAR_TREE_PORTAL_POSITION={x:2122,z:944} as const;
const CAMPUS_PORTAL_POSITION={x:2000,z:1180} as const;
const LAKE_PARK_GUIDE={x:2045,z:1138,yaw:-.78} as const;
const GUIDE_PATROL_POINTS=([
  [LAKE_PARK_GUIDE.x,LAKE_PARK_GUIDE.z],[2050,1150],[2000,1150],[2000,750],[1900,750],[1900,500],
  [1400,500],[1400,350],[1350,350],[1350,200],[350,200],[350,250],[300,250],[300,400],[350,400],
  [350,950],[900,950],[700,950],[700,1250],[1050,1250],[1050,1200],[1150,1200],[1150,1150],
  [1250,1150],[1250,900],[1150,900],[1150,950],[1100,950],[1100,1000],[1000,1000],[1000,1100],
  [950,1100],[950,1150],[900,1150],[900,1200],[750,1200],[750,1250],[700,1250],[700,1100],
  [900,1100],[900,1050],[950,1050],[950,950],[1050,950],[1050,900],[1100,900],[1100,800],
  [1150,800],[1150,750],[1300,750],[1300,700],[1400,700],[1400,750],[1550,750],[1550,700],
  [1600,700],[1600,600],[2000,600],[2000,850],[1950,850],[1950,950],[2000,950],[2000,1200],
  [1900,1200],[1900,1250],[1450,1250],[1450,750],[1400,750],[1400,700],[1100,700],[1100,900],
  [700,900],[700,1250],[900,1250],[300,1250],[300,1600],[650,1600],[650,1650],[850,1650],
  [850,1750],[1950,1750],[1950,1650],[1850,1650],[1850,1600],[1800,1600],[1800,1250],
  [2100,1250],[2100,1200],[2050,1200],[2050,1150],
] as const).map(([x,z])=>({x,z}));
const GUIDE_PATROL_STOPS=new Set(['2045,1138','1900,500','1350,200','300,400','350,950','1250,900','1550,700','1950,950','1450,1250','900,1250','300,1600','850,1750','1950,1650','1800,1250','2050,1150']);
const BEAR_PATROL_POINTS=[
  {x:1200,z:1450},{x:1100,z:1450},{x:1050,z:1525},{x:1150,z:1575},
  {x:1300,z:1550},{x:1350,z:1450},{x:1300,z:1375},{x:1150,z:1375},
] as const;

type CharacterState={scene:THREE.Object3D;mixer?:THREE.AnimationMixer;action?:THREE.AnimationAction};
type GroundSample={height:number;normal:THREE.Vector3};
type RemoteGroundSample=GroundSample&{x:number;z:number};
type GuidePosition={x:number;z:number;yaw:number};
type GuidePatrolFrame=GuidePosition&{motion:Extract<MotionState,'idle'|'walk'>};
type PortalConfig={x:number;z:number;destination:PortalPosition['destination'];label:string;appearance?:'standing'|'white-circle';fixedPosition?:boolean;theme?:'mint'|'blue'};
type InteractionConfig={x:number;z:number;destination:MapId;label:string;buttonLabel:string};
type LakeExperienceConfig={id:LakeExperienceId;x:number;z:number;label:string;description:string;color:number};
type ResidentConfig={modelUrl:string;x:number;z:number;height:number;yaw:number;patrol?:readonly {x:number;z:number}[];walkSpeed?:number};
export type WorldMapRendererOptions={
  modelUrl:string;
  mapName:string;
  spawn:{x:number;z:number;yaw:number};
  guide?:boolean;
  mapSign?:boolean;
  overview?:boolean;
  portal?:PortalConfig;
  fixedPortals?:PortalConfig[];
  interaction?:InteractionConfig;
  lakeExperiences?:LakeExperienceConfig[];
  resident?:ResidentConfig;
  cameraScreenOffsetY?:number;
};
export const LAKE_PARK_RENDERER_OPTIONS:WorldMapRendererOptions={modelUrl:villageModelUrl,mapName:'세종호수공원',spawn:LAKE_PARK_SPAWN,guide:true,mapSign:true,overview:true,portal:{...BEAR_TREE_PORTAL_POSITION,destination:'bear-tree-park',label:'베어트리파크'},fixedPortals:[{...CAMPUS_PORTAL_POSITION,destination:'campus',label:'공동캠퍼스'}],lakeExperiences:[{id:'central-plaza',x:1150,z:950,label:'중앙광장',description:'오늘의 세종 소식을 만나요',color:0xffffff},{id:'wind-hill',x:350,z:400,label:'바람의 언덕',description:'꽃잎과 함께 소원을 남겨요',color:0xffffff}]};
export const BEAR_TREE_PARK_RENDERER_OPTIONS:WorldMapRendererOptions={modelUrl:bearTreeParkModelUrl,mapName:'베어트리파크',spawn:BEAR_TREE_PARK_SPAWN,portal:{x:BEAR_TREE_PARK_SPAWN.x,z:BEAR_TREE_PARK_SPAWN.z,destination:'town',label:'세종호수공원',theme:'blue'},fixedPortals:[{x:682,z:735,destination:'garden',label:'세종수목원',appearance:'white-circle',fixedPosition:true}],interaction:{x:1910,z:1575,destination:'bear-play-zone',label:'곰 놀이 공간',buttonLabel:'곰 키우기'},cameraScreenOffsetY:90};
export const BEAR_PLAY_ZONE_RENDERER_OPTIONS:WorldMapRendererOptions={modelUrl:bearPlayZoneModelUrl,mapName:'곰 놀이 공간',spawn:BEAR_PLAY_ZONE_SPAWN,interaction:{x:1200,z:1650,destination:'bear-tree-park',label:'베어트리파크',buttonLabel:'베어트리파크로 돌아가기'},resident:{modelUrl:bearCubModelUrl,x:1200,z:1450,height:105,yaw:Math.PI,patrol:BEAR_PATROL_POINTS,walkSpeed:RESIDENT_WALK_SPEED},cameraScreenOffsetY:90};
export const GARDEN_RENDERER_OPTIONS:WorldMapRendererOptions={modelUrl:gardenModelUrl,mapName:'수목원',spawn:GARDEN_SPAWN,interaction:{x:1200,z:1650,destination:'bear-tree-park',label:'베어트리파크',buttonLabel:'베어트리파크로 돌아가기'},cameraScreenOffsetY:90};
export const CAMPUS_RENDERER_OPTIONS:WorldMapRendererOptions={modelUrl:campusModelUrl,mapName:'공동캠퍼스',spawn:CAMPUS_SPAWN,portal:{x:1200,z:1650,destination:'town',label:'세종호수공원'}};
type LoadedModel=Awaited<ReturnType<GLTFLoader['loadAsync']>>;
const modelAssetCache=new Map<string,Promise<LoadedModel>>();
const loadModel=(url:string)=>{
  let pending=modelAssetCache.get(url);
  if(!pending){pending=new GLTFLoader().loadAsync(url);modelAssetCache.set(url,pending)}
  return pending;
};
const guidePatrolLegs=GUIDE_PATROL_POINTS.map((from,index)=>{
  const to=GUIDE_PATROL_POINTS[(index+1)%GUIDE_PATROL_POINTS.length],distance=Math.hypot(to.x-from.x,to.z-from.z);
  const pauseSeconds=GUIDE_PATROL_STOPS.has(`${from.x},${from.z}`)?GUIDE_PAUSE_SECONDS:0;
  return {from,to,distance,pauseSeconds,walkSeconds:distance/GUIDE_WALK_SPEED,yaw:Math.atan2(to.x-from.x,to.z-from.z)};
});
const GUIDE_PATROL_CYCLE_SECONDS=guidePatrolLegs.reduce((total,leg)=>total+leg.pauseSeconds+leg.walkSeconds,0);
function guidePatrolFrame(now:number):GuidePatrolFrame{
  let elapsed=(now/1000)%GUIDE_PATROL_CYCLE_SECONDS;
  for(const leg of guidePatrolLegs){
    if(elapsed<leg.pauseSeconds)return {...leg.from,yaw:leg.yaw,motion:'idle'};
    elapsed-=leg.pauseSeconds;
    if(elapsed<leg.walkSeconds){
      const progress=elapsed/leg.walkSeconds;
      return {x:THREE.MathUtils.lerp(leg.from.x,leg.to.x,progress),z:THREE.MathUtils.lerp(leg.from.z,leg.to.z,progress),yaw:leg.yaw,motion:'walk'};
    }
    elapsed-=leg.walkSeconds;
  }
  return {...LAKE_PARK_GUIDE,motion:'idle'};
}

function sharpenObjectTextures(object:THREE.Object3D){
  object.traverse(child=>{
    if(!(child instanceof THREE.Mesh))return;
    const materials=Array.isArray(child.material)?child.material:[child.material];
    materials.forEach(material=>{
      for(const value of Object.values(material)){
        if(value instanceof THREE.Texture){
          value.anisotropy=textureAnisotropy;
          value.magFilter=THREE.LinearFilter;
          value.minFilter=THREE.LinearMipmapLinearFilter;
          value.needsUpdate=true;
        }
      }
    });
  });
}

function savedMapSignPosition(){
  try{
    const saved=JSON.parse(localStorage.getItem(MAP_SIGN_POSITION_KEY)??'null') as {x?:number;z?:number}|null;
    if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.z))return {x:saved.x!,z:saved.z!};
  }catch{/* Keep the shared fallback when no valid saved position exists. */}
  return {...DEFAULT_MAP_SIGN_POSITION};
}

function savedPortalPosition(config:PortalConfig){
  if(config.fixedPosition)return {x:config.x,z:config.z};
  try{
    const saved=JSON.parse(localStorage.getItem(`${PORTAL_POSITION_KEY_PREFIX}-${config.destination}`)??'null') as {x?:number;z?:number}|null;
    if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.z))return {x:saved.x!,z:saved.z!};
  }catch{/* Keep the configured portal position when no valid saved position exists. */}
  return {x:config.x,z:config.z};
}

function savedInteractionPosition(config:InteractionConfig){
  try{
    const saved=JSON.parse(localStorage.getItem(`${INTERACTION_POSITION_KEY_PREFIX}-${config.destination}`)??'null') as {x?:number;z?:number}|null;
    if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.z))return {x:saved.x!,z:saved.z!};
  }catch{/* Keep the configured interaction position when no valid saved position exists. */}
  return {x:config.x,z:config.z};
}

function savedLakeExperiencePosition(config:LakeExperienceConfig){
  try{
    const saved=JSON.parse(localStorage.getItem(`${LAKE_EXPERIENCE_POSITION_KEY_PREFIX}-${config.id}`)??'null') as {x?:number;z?:number}|null;
    if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.z))return {x:saved.x!,z:saved.z!};
  }catch{/* Keep the configured experience position when no valid saved position exists. */}
  return {x:config.x,z:config.z};
}

const modelConfig:Record<Exclude<CharacterModel,'custom'>,{urls:Record<MotionState,string>;clips:Record<MotionState,string>}>= {
  chungnyeong:{urls:{idle:chungnyeongIdleUrl,walk:chungnyeongWalkUrl,run:chungnyeongRunUrl},clips:{idle:'NlaTrack',walk:'NlaTrack',run:'NlaTrack'}},
  girl1:{urls:{idle:girlUrl,walk:girlUrl,run:girlUrl},clips:{idle:'NlaTrack.001',walk:'NlaTrack',run:'NlaTrack.002'}},
  boy1:{urls:{idle:boyUrl,walk:boyUrl,run:boyUrl},clips:{idle:'NlaTrack.001',walk:'NlaTrack.002',run:'NlaTrack'}}
};

class WorldCharacter{
  readonly root=new THREE.Group();
  readonly ready:Promise<void>;
  private states=new Map<MotionState,CharacterState>();
  private active:MotionState='idle';
  private targetQuaternion=new THREE.Quaternion();
  private height:number;

  constructor(private scene:THREE.Scene,name:string,model:CharacterModel,parts:CharacterParts,height=CHARACTER_HEIGHT,private idleOnly=false){
    this.height=height;
    this.root.name=`world-character-${name}`;
    scene.add(this.root);
    this.root.add(this.createNameplate(name));
    if(model==='custom'){this.createFallback(parts);this.ready=Promise.resolve()}
    else this.ready=this.loadModels(model);
  }

  private async loadModels(model:Exclude<CharacterModel,'custom'>){
    const config=modelConfig[model];
    try{
      if(this.idleOnly){
        const gltf=await loadModel(config.urls.idle),visual=cloneSkeleton(gltf.scene);
        sharpenObjectTextures(visual);
        visual.updateMatrixWorld(true);
        const bounds=new THREE.Box3().setFromObject(visual),size=bounds.getSize(new THREE.Vector3()),scale=this.height/Math.max(size.y,.001);
        visual.scale.setScalar(scale);visual.position.y=-bounds.min.y*scale;
        visual.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=false;object.frustumCulled=true}});
        const mixer=gltf.animations.length?new THREE.AnimationMixer(visual):undefined,clip=THREE.AnimationClip.findByName(gltf.animations,config.clips.idle),action=mixer&&clip?mixer.clipAction(clip):undefined;
        action?.play();this.root.add(visual);this.states.set('idle',{scene:visual,mixer,action});this.setMotion('idle');return;
      }
      if(new Set(Object.values(config.urls)).size===1){
        const gltf=await loadModel(config.urls.idle),visual=cloneSkeleton(gltf.scene);
        sharpenObjectTextures(visual);
        visual.updateMatrixWorld(true);
        const bounds=new THREE.Box3().setFromObject(visual),size=bounds.getSize(new THREE.Vector3()),scale=this.height/Math.max(size.y,.001);
        visual.scale.setScalar(scale);visual.position.y=-bounds.min.y*scale;
        visual.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=false}});
        const mixer=new THREE.AnimationMixer(visual);this.root.add(visual);
        for(const motion of ['idle','walk','run'] as MotionState[]){const clip=THREE.AnimationClip.findByName(gltf.animations,config.clips[motion]);const action=clip?mixer.clipAction(clip):undefined;this.states.set(motion,{scene:visual,mixer,action})}
        this.setMotion(this.active);return;
      }
      const loadedStates=await Promise.all((['idle','walk','run'] as MotionState[]).map(async motion=>{
        const gltf=await loadModel(config.urls[motion]);
        const visual=cloneSkeleton(gltf.scene);
        sharpenObjectTextures(visual);
        visual.updateMatrixWorld(true);
        const bounds=new THREE.Box3().setFromObject(visual),size=bounds.getSize(new THREE.Vector3()),scale=this.height/Math.max(size.y,.001);
        visual.scale.setScalar(scale);
        visual.position.y=-bounds.min.y*scale;
        visual.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=false;object.frustumCulled=true}});
        const mixer=gltf.animations.length?new THREE.AnimationMixer(visual):undefined;
        const clip=THREE.AnimationClip.findByName(gltf.animations,config.clips[motion]);
        const action=mixer&&clip?mixer.clipAction(clip):undefined;
        action?.play();
        visual.visible=motion==='idle';
        return {motion,visual,mixer,action};
      }));
      for(const {motion,visual,mixer,action} of loadedStates){
        this.root.add(visual);
        this.states.set(motion,{scene:visual,mixer,action});
      }
      this.setMotion(this.active);
      }catch(error){console.error('[World character] GLB load error',{model,error});this.createFallback({hair:'',face:'',top:'',bottom:'',shoes:''})}
  }

  private createFallback(_parts:CharacterParts){
    const material=new THREE.MeshStandardMaterial({color:0x3f947d,roughness:.75});
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(24,50,8,16),material);
    body.position.y=55;body.castShadow=true;body.userData.ownedResource=true;
    const head=new THREE.Mesh(new THREE.SphereGeometry(23,20,16),new THREE.MeshStandardMaterial({color:0xf1c7a4,roughness:.8}));
    head.position.y=108;head.castShadow=true;head.userData.ownedResource=true;
    this.root.add(body,head);this.height=132;
  }

  private createNameplate(name:string){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;
    const context=canvas.getContext('2d')!;context.fillStyle='rgba(255,255,255,.97)';context.strokeStyle='rgba(30,77,65,.34)';context.lineWidth=7;
    context.beginPath();context.roundRect(7,7,754,178,89);context.fill();context.stroke();
    context.fillStyle='#42b783';context.beginPath();context.arc(84,96,22,0,Math.PI*2);context.fill();
    context.fillStyle='#173f38';context.font='900 68px "Noto Sans KR", sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillText(name,440,98,570);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=textureAnisotropy;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:true,depthWrite:false}));
    sprite.position.y=this.height+25;sprite.scale.set(this.height>CHARACTER_HEIGHT?138:112,this.height>CHARACTER_HEIGHT?34:28,1);sprite.renderOrder=0;return sprite;
  }

  setMotion(motion:MotionState){
    this.active=motion;
    const activeState=this.states.get(motion),scenes=new Set([...this.states.values()].map(state=>state.scene));
    scenes.forEach(scene=>{scene.visible=scene===activeState?.scene});
    this.states.forEach((state,key)=>{if(key===motion){state.action?.reset().fadeIn(.12).play()}else state.action?.fadeOut(.12)});
  }

  update(position:THREE.Vector3,normal:THREE.Vector3,yaw:number,motion:MotionState,delta:number){
    if(motion!==this.active)this.setMotion(motion);
    this.root.position.copy(position);
    const tilt=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),normal);
    const turn=new THREE.Quaternion().setFromAxisAngle(normal,yaw);
    this.targetQuaternion.copy(turn).multiply(tilt);
    this.root.quaternion.slerp(this.targetQuaternion,1-Math.exp(-12*delta));
    const mixers=new Set([...this.states.values()].filter(state=>state.scene.visible&&state.mixer).map(state=>state.mixer!));mixers.forEach(mixer=>mixer.update(delta));
  }

  warmup(renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.Camera){
    const visibility=[...this.states.values()].map(state=>[state.scene,state.scene.visible] as const);
    visibility.forEach(([visual])=>{visual.visible=true});
    renderer.compile(scene,camera);renderer.render(scene,camera);
    visibility.forEach(([visual,visible])=>{visual.visible=visible});
  }

  destroy(){
    this.scene.remove(this.root);
    this.root.traverse(object=>{if(object instanceof THREE.Mesh&&object.userData.ownedResource){object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(material=>material.dispose())}if(object instanceof THREE.Sprite){object.material.map?.dispose();object.material.dispose()}});
  }
}

export class VillageMapRenderer{
  readonly ready:Promise<void>;
  private renderer:THREE.WebGLRenderer;
  private scene=new THREE.Scene();
  private camera=new THREE.OrthographicCamera();
  private parent:HTMLElement;
  private width=1;
  private height=1;
  private destroyed=false;
  private mapReady=false;
  private renderAccumulator=0;
  private pixelRatio=MAX_PIXEL_RATIO;
  private qualityElapsed=0;
  private qualityFrameTime=0;
  private qualityFrames=0;
  private mapMeshes:THREE.Mesh[]=[];
  private mapBounds=new THREE.Box3();
  private blockedMaterials=new WeakSet<THREE.Material>();
  private raycaster=new THREE.Raycaster();
  private bodyRaycaster=new THREE.Raycaster();
  private localCharacter:WorldCharacter;
  private guideNpc?:WorldCharacter;
  private guideNpcPosition=new THREE.Vector3();
  private guideNpcNormal=new THREE.Vector3(0,1,0);
  private guidePosition:GuidePosition={...LAKE_PARK_GUIDE};
  private guideGround=0;
  private worldClockOffset=0;
  private guideNearby=false;
  private mapSignNearby=false;
  private portalNearby=false;
  private portalEntryArmed=true;
  private portalChargeSeconds=0;
  private portalTravelTriggered=false;
  private interactionNearby=false;
  private interactionPosition?:{x:number;z:number};
  private interactionRoot?:THREE.Group;
  private lakeExperienceNearby?:LakeExperienceId;
  private lakeExperiencePositions=new Map<LakeExperienceId,{x:number;z:number}>();
  private lakeExperienceRoots=new Map<LakeExperienceId,THREE.Group>();
  private portalRoot?:THREE.Group;
  private fixedPortalRoots:THREE.Group[]=[];
  private activePortal?:PortalConfig;
  private residentRoot?:THREE.Group;
  private residentMixer?:THREE.AnimationMixer;
  private residentGround=0;
  private residentX=0;
  private residentZ=0;
  private residentPatrolTarget=1;
  private portalPosition?:{x:number;z:number};
  private overviewActive=false;
  private mapSignPosition=savedMapSignPosition();
  private remotes=new Map<string,WorldCharacter>();
  private remoteGrounds=new Map<string,RemoteGroundSample>();
  private localX:number;
  private localZ:number;
  private localGround=0;
  private localNormal=new THREE.Vector3(0,1,0);
  private cameraTarget:THREE.Vector3;

  constructor(parent:HTMLElement,profile:UserProfile,private options:WorldMapRendererOptions=LAKE_PARK_RENDERER_OPTIONS){
    this.parent=parent;
    this.localX=options.spawn.x;
    this.localZ=options.spawn.z;
    this.portalPosition=options.portal?savedPortalPosition(options.portal):undefined;
    if(this.portalPosition&&Math.hypot(options.spawn.x-this.portalPosition.x,options.spawn.z-this.portalPosition.z)<PORTAL_EXIT_DISTANCE)this.portalEntryArmed=false;
    this.interactionPosition=options.interaction?savedInteractionPosition(options.interaction):undefined;
    options.lakeExperiences?.forEach(config=>this.lakeExperiencePositions.set(config.id,savedLakeExperiencePosition(config)));
    this.cameraTarget=new THREE.Vector3(options.spawn.x,0,this.worldToSceneZ(options.spawn.z));
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.domElement.className='village-map-canvas';
    textureAnisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.sortObjects=true;
    this.scene.background=new THREE.Color('#b9d7c2');
    this.scene.add(new THREE.HemisphereLight(0xf4fbff,0x617760,1.8));
    const sun=new THREE.DirectionalLight(0xfff4dc,3.1);
    const shadowSize=512;
    sun.position.set(1900,1400,1850);sun.target.position.set(WORLD_WIDTH/2,0,WORLD_HEIGHT/2);sun.castShadow=true;sun.shadow.mapSize.set(shadowSize,shadowSize);sun.shadow.camera.near=10;sun.shadow.camera.far=4000;
    sun.shadow.camera.left=-1300;sun.shadow.camera.right=1300;sun.shadow.camera.top=1100;sun.shadow.camera.bottom=-1100;sun.shadow.bias=-.00015;
    this.scene.add(sun,sun.target);
    this.camera.up.set(0,1,0);this.camera.near=.1;this.camera.far=5000;
    parent.prepend(this.renderer.domElement);
    this.resize();
    this.localCharacter=new WorldCharacter(this.scene,profile.nickname,profile.model,profile.character);
    if(options.overview)gameEvents.on('map-overview-toggle',this.onMapOverviewToggle);
    if(options.portal)gameEvents.on('portal-move-to-player',this.onMovePortalToPlayer);
    if(options.lakeExperiences)gameEvents.on('lake-experience-move-to-player',this.onMoveLakeExperienceToPlayer);
    this.ready=this.loadVillage();
  }

  private async loadVillage(){
    try{
      const gltf=await new GLTFLoader().loadAsync(this.options.modelUrl);
      if(this.destroyed)return;
      const model=gltf.scene;model.updateMatrixWorld(true);
      sharpenObjectTextures(model);
      const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
      const scale=Math.min((WORLD_WIDTH-180)/size.x,(WORLD_HEIGHT-120)/size.z),depthScale=scale/GROUND_PROJECTION;
      model.position.set(WORLD_WIDTH/2-center.x*scale,-bounds.min.y*scale,WORLD_HEIGHT/2-center.z*depthScale);model.scale.set(scale,scale,depthScale);
      model.updateMatrixWorld(true);
      this.mapBounds.setFromObject(model);
      model.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=false;object.receiveShadow=true;this.mapMeshes.push(object)}});
      if(this.mapMeshes.length>1)this.mapMeshes.forEach(mesh=>{const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];materials.forEach(material=>this.classifyMaterial(material))});
      this.scene.add(model);
      const spawn=this.sampleGround(this.localX,this.localZ,0,true);if(spawn){this.localGround=spawn.height;this.localNormal.copy(spawn.normal)}
      if(this.options.guide){
        const initialGuide=guidePatrolFrame(Date.now()+this.worldClockOffset);
        this.guidePosition={x:initialGuide.x,z:initialGuide.z,yaw:initialGuide.yaw};
        const guideGround=this.sampleGround(this.guidePosition.x,this.guidePosition.z,0,true);
        if(guideGround){
          this.guideGround=guideGround.height;
          this.guideNpcPosition.set(this.guidePosition.x,guideGround.height+CHARACTER_GROUND_CLEARANCE,this.worldToSceneZ(this.guidePosition.z));
          this.guideNpcNormal.copy(guideGround.normal);
          this.guideNpc=new WorldCharacter(this.scene,'충녕이 · 안내 NPC','chungnyeong',{hair:'',face:'',top:'',bottom:'',shoes:''},GUIDE_CHARACTER_HEIGHT);
          this.guideNpc.update(this.guideNpcPosition,this.guideNpcNormal,this.guidePosition.yaw,initialGuide.motion,0);
        }
      }
      if(this.options.portal&&this.portalPosition){
        const portalGround=this.sampleGround(this.portalPosition.x,this.portalPosition.z,0,true);
        if(portalGround)this.portalRoot=this.createPortal({...this.options.portal,...this.portalPosition},portalGround.height);
      }
      this.options.fixedPortals?.forEach(config=>{
        Object.assign(config,savedPortalPosition(config));
        const portalGround=config.appearance==='white-circle'
          ?this.sampleExperienceGround(config.x,config.z,true)
          :this.sampleGround(config.x,config.z,0,true);
        this.fixedPortalRoots.push(this.createPortal(config,portalGround?.height??0));
      });
      if(this.options.interaction&&this.interactionPosition){
        const interactionGround=this.sampleExperienceGround(this.interactionPosition.x,this.interactionPosition.z);
        if(interactionGround)this.interactionRoot=this.createInteractionCircle(this.interactionPosition,interactionGround.height);
      }
      this.options.lakeExperiences?.forEach(config=>{
        const position=this.lakeExperiencePositions.get(config.id)??config;
        const ground=this.sampleExperienceGround(position.x,position.z);
        if(ground)this.lakeExperienceRoots.set(config.id,this.createLakeExperienceCircle({...config,...position},ground.height));
      });
      const residentReady=this.options.resident?this.createResident(this.options.resident):Promise.resolve();
      const startPosition=new THREE.Vector3(this.localX,this.localGround+CHARACTER_GROUND_CLEARANCE,this.worldToSceneZ(this.localZ));
      this.localCharacter.update(startPosition,this.localNormal,this.options.spawn.yaw,'idle',0);
      await Promise.all([this.localCharacter.ready,this.guideNpc?.ready,residentReady]);
      if(this.destroyed)return;
      this.mapReady=true;
      this.followCharacter(startPosition,0,true);
      this.localCharacter.warmup(this.renderer,this.scene,this.camera);
      this.guideNpc?.warmup(this.renderer,this.scene,this.camera);
      this.render();
      console.log(`[${this.options.mapName} world] unified 3D scene ready`,{meshes:this.mapMeshes.length,scale});
    }catch(error){console.error(`[${this.options.mapName} world] GLB load error`,error)}
  }

  setVisible(visible:boolean){
    this.renderer.domElement.style.display=visible?'block':'none';
    if(!visible&&this.guideNearby){this.guideNearby=false;gameEvents.emit('guide-proximity-changed',false)}
    if(!visible&&this.mapSignNearby){this.mapSignNearby=false;gameEvents.emit('map-sign-proximity-changed',false)}
    if(!visible&&this.portalNearby){this.portalNearby=false;this.activePortal=undefined;this.resetPortalCharge();gameEvents.emit('world-portal-proximity-changed',null)}
    if(!visible&&this.interactionNearby){this.interactionNearby=false;gameEvents.emit('world-interaction-proximity-changed',null)}
    if(!visible&&this.lakeExperienceNearby){this.lakeExperienceNearby=undefined;gameEvents.emit('lake-experience-proximity-changed',null)}
  }
  setWorldClock(serverNow:number){if(Number.isFinite(serverNow))this.worldClockOffset=serverNow-Date.now()}
  setInteractionPosition(position:WorldInteractionPosition){
    if(!this.options.interaction||position.destination!==this.options.interaction.destination)return;
    this.interactionPosition={x:position.x,z:position.z};
    localStorage.setItem(`${INTERACTION_POSITION_KEY_PREFIX}-${position.destination}`,JSON.stringify(this.interactionPosition));
    this.interactionNearby=false;
    gameEvents.emit('world-interaction-proximity-changed',null);
    if(!this.mapReady)return;
    const ground=this.sampleExperienceGround(position.x,position.z);
    if(!ground)return;
    if(this.interactionRoot){
      this.interactionRoot.position.set(position.x,ground.height+.8,this.worldToSceneZ(position.z));
      this.interactionRoot.userData.groundHeight=ground.height;
    }else this.interactionRoot=this.createInteractionCircle(position,ground.height);
    this.render();
  }
  setLakeExperiencePosition(position:LakeExperiencePosition,fallbackGround?:number){
    const config=this.options.lakeExperiences?.find(item=>item.id===position.experience);
    if(!config)return;
    const next={x:position.x,z:position.z};
    this.lakeExperiencePositions.set(position.experience,next);
    localStorage.setItem(`${LAKE_EXPERIENCE_POSITION_KEY_PREFIX}-${position.experience}`,JSON.stringify(next));
    this.lakeExperienceNearby=undefined;
    gameEvents.emit('lake-experience-proximity-changed',null);
    if(!this.mapReady)return;
    const ground=this.sampleExperienceGround(position.x,position.z)??(Number.isFinite(fallbackGround)?{height:fallbackGround!,normal:new THREE.Vector3(0,1,0)}:undefined);
    if(!ground)return;
    const root=this.lakeExperienceRoots.get(position.experience);
    if(root){
      root.position.set(position.x,ground.height+.8,this.worldToSceneZ(position.z));
      root.userData.groundHeight=ground.height;
    }else this.lakeExperienceRoots.set(position.experience,this.createLakeExperienceCircle({...config,...position},ground.height));
    this.render();
  }
  private onMoveLakeExperienceToPlayer=(experience:LakeExperienceId)=>{
    if(!this.options.lakeExperiences?.some(config=>config.id===experience)||!this.mapReady)return;
    const position:LakeExperiencePosition={experience,x:Math.round(this.localX),z:Math.round(this.localZ)};
    this.setLakeExperiencePosition(position,this.localGround);
    gameEvents.emit('lake-experience-position-changed',position);
  }
  private onMovePortalToPlayer=(requestedDestination?:PortalPosition['destination'])=>{
    if(!this.mapReady||this.renderer.domElement.style.display==='none')return;
    const config=requestedDestination
      ?[this.options.portal,...(this.options.fixedPortals??[])].find(portal=>portal?.destination===requestedDestination)
      :this.options.portal;
    if(!config)return;
    const position:PortalPosition={destination:config.destination,x:Math.round(this.localX),z:Math.round(this.localZ)};
    this.setPortalPosition(position);
    gameEvents.emit('portal-position-changed',position);
  }
  setPortalPosition(position:PortalPosition){
    const standardPortal=this.options.portal?.destination===position.destination?this.options.portal:undefined;
    const fixedPortal=this.options.fixedPortals?.find(config=>config.destination===position.destination);
    if(!standardPortal&&!fixedPortal)return;
    const nextPosition=fixedPortal?.fixedPosition?{x:fixedPortal.x,z:fixedPortal.z}:{x:position.x,z:position.z};
    if(standardPortal)this.portalPosition=nextPosition;
    if(fixedPortal)Object.assign(fixedPortal,nextPosition);
    localStorage.setItem(`${PORTAL_POSITION_KEY_PREFIX}-${position.destination}`,JSON.stringify(nextPosition));
    if(!this.mapReady)return;
    const portalConfig=standardPortal??fixedPortal;
    const ground=portalConfig?.appearance==='white-circle'
      ?this.sampleExperienceGround(nextPosition.x,nextPosition.z,true)
      :this.sampleGround(nextPosition.x,nextPosition.z,this.localGround,true);
    if(!ground&&standardPortal)return;
    const groundHeight=ground?.height??this.localGround;
    const root=standardPortal?this.portalRoot:this.fixedPortalRoots.find(portal=>portal.name===`world-portal-${position.destination}`);
    if(root){
      root.position.set(nextPosition.x,groundHeight+(root.userData.appearance==='white-circle'?.8:0),this.worldToSceneZ(nextPosition.z));
      root.userData.groundHeight=groundHeight;
    }else if(standardPortal)this.portalRoot=this.createPortal({...standardPortal,...nextPosition},groundHeight);
    else if(fixedPortal)this.fixedPortalRoots.push(this.createPortal({...fixedPortal,...nextPosition},groundHeight));
    this.activePortal=undefined;
    this.portalNearby=false;
    this.portalEntryArmed=false;
    this.resetPortalCharge();
    gameEvents.emit('world-portal-proximity-changed',null);
    this.render();
  }
  private resetPortalCharge(){
    this.portalChargeSeconds=0;
    this.portalTravelTriggered=false;
    gameEvents.emit('portal-charge-progress',0);
  }
  private createPortal(config:PortalConfig,groundHeight:number){
    const root=new THREE.Group();
    root.name=`world-portal-${config.destination}`;
    root.position.set(config.x,groundHeight+(config.appearance==='white-circle'?.8:0),this.worldToSceneZ(config.z));
    if(config.appearance==='white-circle'){
      root.rotation.x=-Math.PI/2;
      const material=(opacity:number)=>new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity,depthTest:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
      const center=new THREE.Mesh(new THREE.CircleGeometry(50,64),material(.1));
      const ring=new THREE.Mesh(new THREE.RingGeometry(45,54,64),material(.98));
      const middleRing=new THREE.Mesh(new THREE.RingGeometry(34,38,64),material(.78));
      const innerRing=new THREE.Mesh(new THREE.RingGeometry(18,22,64),material(.9));
      const pulseRing=new THREE.Mesh(new THREE.RingGeometry(55,59,64),material(.48));
      center.position.z=.2;ring.position.z=.4;middleRing.position.z=.6;innerRing.position.z=.8;pulseRing.position.z=.1;
      for(const object of [center,ring,middleRing,innerRing,pulseRing])object.renderOrder=30;
      root.add(center,ring,middleRing,innerRing,pulseRing);
      root.userData.center=center;root.userData.innerRing=innerRing;root.userData.pulseRing=pulseRing;
      root.userData.phase=0;root.userData.appearance='white-circle';root.userData.groundHeight=groundHeight;
      const light=new THREE.PointLight(0xffffff,2.2,155);light.position.set(0,0,38);root.add(light);
      this.scene.add(root);
      return root;
    }
    const blue=config.theme==='blue',ringColor=blue?0x72b9ff:0x71e5c2,emissiveColor=blue?0x2688ff:0x2ad8aa,glowColor=blue?0x79c4ff:0x74f5d0;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(38,6,12,48),new THREE.MeshStandardMaterial({color:ringColor,emissive:emissiveColor,emissiveIntensity:2.4,metalness:.25,roughness:.28}));
    ring.position.y=49;ring.castShadow=true;
    const glow=new THREE.Mesh(new THREE.CircleGeometry(31,48),new THREE.MeshBasicMaterial({color:glowColor,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));
    glow.position.y=49;glow.position.z=-1;
    const base=new THREE.Mesh(new THREE.CylinderGeometry(43,51,8,40),new THREE.MeshStandardMaterial({color:blue?0x203f66:0x244f48,emissive:blue?0x235f9e:0x1e7562,emissiveIntensity:.8,roughness:.42}));
    base.position.y=4;root.add(base,ring,glow);root.userData.glow=glow;root.userData.groundHeight=groundHeight;this.scene.add(root);
    const light=new THREE.PointLight(blue?0x7fc5ff:0x76f5d1,3.2,210);light.position.set(0,52,18);root.add(light);
    return root;
  }
  private createLakeExperienceCircle(config:LakeExperienceConfig,groundHeight:number){
    const root=new THREE.Group();
    root.name=`lake-experience-${config.id}`;
    root.position.set(config.x,groundHeight+.8,this.worldToSceneZ(config.z));
    root.rotation.x=-Math.PI/2;
    const material=(color:number,opacity:number)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthTest:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    const center=new THREE.Mesh(new THREE.CircleGeometry(50,64),material(config.color,.08));
    const ring=new THREE.Mesh(new THREE.RingGeometry(45,54,64),material(config.color,.98));
    const middleRing=new THREE.Mesh(new THREE.RingGeometry(34,38,64),material(0xffffff,.78));
    const innerRing=new THREE.Mesh(new THREE.RingGeometry(18,22,64),material(config.color,.9));
    const pulseRing=new THREE.Mesh(new THREE.RingGeometry(55,59,64),material(config.color,.48));
    center.position.z=.2;ring.position.z=.4;middleRing.position.z=.6;innerRing.position.z=.8;pulseRing.position.z=.1;
    for(const object of [center,ring,middleRing,innerRing,pulseRing])object.renderOrder=30;
    root.add(center,ring,middleRing,innerRing,pulseRing);
    root.userData.center=center;root.userData.ring=ring;root.userData.innerRing=innerRing;root.userData.pulseRing=pulseRing;root.userData.groundHeight=groundHeight;root.userData.phase=config.id==='wind-hill'?Math.PI:0;
    const light=new THREE.PointLight(config.color,2.2,155);light.position.set(0,0,38);root.add(light);
    this.scene.add(root);
    return root;
  }
  private createInteractionCircle(position:{x:number;z:number},groundHeight:number){
    const root=new THREE.Group();
    root.name='world-interaction-circle';
    root.position.set(position.x,groundHeight+.8,this.worldToSceneZ(position.z));
    root.rotation.x=-Math.PI/2;
    const material=(opacity:number)=>new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity,depthTest:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    const center=new THREE.Mesh(new THREE.CircleGeometry(50,64),material(.08));
    const ring=new THREE.Mesh(new THREE.RingGeometry(45,54,64),material(.98));
    const middleRing=new THREE.Mesh(new THREE.RingGeometry(34,38,64),material(.78));
    const innerRing=new THREE.Mesh(new THREE.RingGeometry(18,22,64),material(.9));
    const pulseRing=new THREE.Mesh(new THREE.RingGeometry(55,59,64),material(.48));
    center.position.z=.2;ring.position.z=.4;middleRing.position.z=.6;innerRing.position.z=.8;pulseRing.position.z=.1;
    for(const object of [center,ring,middleRing,innerRing,pulseRing])object.renderOrder=30;
    root.add(center,ring,middleRing,innerRing,pulseRing);
    root.userData.center=center;root.userData.innerRing=innerRing;root.userData.pulseRing=pulseRing;root.userData.groundHeight=groundHeight;root.userData.phase=Math.PI*.5;
    const light=new THREE.PointLight(0xffffff,2.2,155);light.position.set(0,0,38);root.add(light);
    this.scene.add(root);
    return root;
  }
  private async createResident(config:ResidentConfig){
    const gltf=await new GLTFLoader().loadAsync(config.modelUrl);
    if(this.destroyed)return;
    const visual=gltf.scene;visual.updateMatrixWorld(true);sharpenObjectTextures(visual);
    const bounds=new THREE.Box3().setFromObject(visual),size=bounds.getSize(new THREE.Vector3()),scale=config.height/Math.max(size.y,.001);
    visual.scale.setScalar(scale);visual.position.y=-bounds.min.y*scale;
    visual.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=true}});
    const ground=this.sampleGround(config.x,config.z,0,true);if(!ground)return;
    const root=new THREE.Group();root.name='bear-cub-resident';root.position.set(config.x,ground.height+CHARACTER_GROUND_CLEARANCE,this.worldToSceneZ(config.z));root.rotation.y=config.yaw;root.add(visual);this.scene.add(root);this.residentRoot=root;
    this.residentX=config.x;this.residentZ=config.z;this.residentGround=ground.height;
    if(gltf.animations.length){this.residentMixer=new THREE.AnimationMixer(visual);this.residentMixer.clipAction(gltf.animations[0]).play()}
  }
  private updateResident(delta:number){
    this.residentMixer?.update(delta);
    const root=this.residentRoot,config=this.options.resident,patrol=config?.patrol;
    if(!root||!config||!patrol||patrol.length<2)return;
    const target=patrol[this.residentPatrolTarget%patrol.length],dx=target.x-this.residentX,dz=target.z-this.residentZ,distance=Math.hypot(dx,dz);
    if(distance<1){
      this.residentX=target.x;this.residentZ=target.z;this.residentPatrolTarget=(this.residentPatrolTarget+1)%patrol.length;return;
    }
    const step=Math.min(distance,(config.walkSpeed??RESIDENT_WALK_SPEED)*delta),nextX=this.residentX+dx/distance*step,nextZ=this.residentZ+dz/distance*step;
    const ground=this.sampleGround(nextX,nextZ,this.residentGround);
    if(!ground){this.residentPatrolTarget=(this.residentPatrolTarget+1)%patrol.length;return}
    this.residentX=nextX;this.residentZ=nextZ;this.residentGround=ground.height;
    root.position.set(nextX,ground.height+CHARACTER_GROUND_CLEARANCE,this.worldToSceneZ(nextZ));
    root.rotation.y=config.yaw+Math.atan2(dx,dz);
  }
  private updatePortals(){
    const elapsed=(Date.now()+this.worldClockOffset)/1000;
    for(const root of [this.portalRoot,...this.fixedPortalRoots]){
      if(!root)continue;
      if(root.userData.appearance==='white-circle'){
        const phase=root.userData.phase as number,pulse=(elapsed*.55+phase/(Math.PI*2))%1;
        root.scale.setScalar(1+Math.sin(elapsed*2.15+phase)*.035);
        const center=root.userData.center as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
        const innerRing=root.userData.innerRing as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
        const pulseRing=root.userData.pulseRing as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
        center.material.opacity=.22+(Math.sin(elapsed*1.8+phase)+1)*.055;
        innerRing.rotation.z=elapsed*.35;
        pulseRing.scale.setScalar(1+pulse*.5);
        pulseRing.material.opacity=.5*(1-pulse);
        continue;
      }
      root.rotation.y=Math.sin(elapsed*.8)*.12;
      const glow=root.userData.glow as THREE.Object3D|undefined,pulse=1+Math.sin(elapsed*2.8)*.08;
      glow?.scale.setScalar(pulse);
      root.position.y=(root.userData.groundHeight as number)+Math.sin(elapsed*2.2)*2.2;
    }
  }
  private updateLakeExperienceCircles(){
    const elapsed=(Date.now()+this.worldClockOffset)/1000;
    const roots=[...this.lakeExperienceRoots.values(),...(this.interactionRoot?[this.interactionRoot]:[])];
    roots.forEach(root=>{
      const phase=root.userData.phase as number,wave=1+Math.sin(elapsed*2.15+phase)*0.035;
      root.scale.setScalar(wave);
      const center=root.userData.center as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
      const innerRing=root.userData.innerRing as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
      const pulseRing=root.userData.pulseRing as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
      const pulse=(elapsed*.55+phase/(Math.PI*2))%1;
      center.material.opacity=.22+(Math.sin(elapsed*1.8+phase)+1)*.055;
      innerRing.rotation.z=elapsed*.35;
      pulseRing.scale.setScalar(1+pulse*.5);
      pulseRing.material.opacity=.5*(1-pulse);
    });
  }
  private updateGuideNpc(delta:number){
    if(!this.guideNpc)return;
    const frame=guidePatrolFrame(Date.now()+this.worldClockOffset);
    const ground=this.sampleGround(frame.x,frame.z,this.guideGround);
    if(ground){
      this.guideGround=ground.height;
      this.guidePosition={x:frame.x,z:frame.z,yaw:frame.yaw};
      this.guideNpcPosition.set(frame.x,ground.height+CHARACTER_GROUND_CLEARANCE,this.worldToSceneZ(frame.z));
      this.guideNpcNormal.copy(ground.normal);
    }
    this.guideNpc.update(this.guideNpcPosition,this.guideNpcNormal,this.guidePosition.yaw,frame.motion,delta);
  }
  private onMapOverviewToggle=(active:boolean)=>{
    this.overviewActive=active;
    if(active)this.showMapOverview();
    else{
      this.camera.up.set(0,1,0);
      const position=new THREE.Vector3(this.localX,this.localGround+CHARACTER_GROUND_CLEARANCE,this.worldToSceneZ(this.localZ));
      this.followCharacter(position,0,true);
    }
    gameEvents.emit('map-overview-changed',active);
    this.render();
  }
  private showMapOverview(){
    if(this.mapBounds.isEmpty())return;
    const center=this.mapBounds.getCenter(new THREE.Vector3()),size=this.mapBounds.getSize(new THREE.Vector3()),aspect=this.width/Math.max(this.height,1);
    const projectedDepth=size.z*Math.sin(OVERVIEW_CAMERA_ELEVATION)+size.y*Math.cos(OVERVIEW_CAMERA_ELEVATION);
    const halfHeight=Math.max(projectedDepth/2+110,(size.x/2+110)/aspect),halfWidth=halfHeight*aspect;
    this.camera.left=-halfWidth;this.camera.right=halfWidth;this.camera.top=halfHeight;this.camera.bottom=-halfHeight;
    this.camera.up.set(0,1,0);
    this.camera.position.set(center.x,center.y+Math.sin(OVERVIEW_CAMERA_ELEVATION)*2200,center.z+Math.cos(OVERVIEW_CAMERA_ELEVATION)*2200);
    this.camera.lookAt(center);this.camera.updateProjectionMatrix();
  }
  private worldToSceneZ(worldZ:number){return WORLD_HEIGHT/2+(worldZ-WORLD_HEIGHT/2)/GROUND_PROJECTION}

  private classifyMaterial(material:THREE.Material){
    const map=(material as THREE.MeshStandardMaterial).map,image=map?.image as CanvasImageSource|undefined;if(!image)return;
    try{
      const canvas=document.createElement('canvas');canvas.width=8;canvas.height=8;const context=canvas.getContext('2d',{willReadFrequently:true})!;context.drawImage(image,0,0,8,8);
      const pixels=context.getImageData(0,0,8,8).data;let red=0,green=0,blue=0,count=0;
      for(let index=0;index<pixels.length;index+=4){if(pixels[index+3]<40)continue;red+=pixels[index];green+=pixels[index+1];blue+=pixels[index+2];count++}
      if(count&&blue/count>95&&blue>red*1.18&&blue>green*1.08)this.blockedMaterials.add(material);
    }catch{/* Texture sampling is an optional fallback when the GLB has no semantic water tags. */}
  }

  private materialForHit(hit:THREE.Intersection){const mesh=hit.object as THREE.Mesh,materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];return materials[hit.face?.materialIndex??0]??materials[0]}

  private sampleExperienceGround(worldX:number,worldZ:number,preferHighest=false):GroundSample|undefined{
    if(!this.mapMeshes.length)return {height:this.localGround,normal:new THREE.Vector3(0,1,0)};
    this.raycaster.near=0;this.raycaster.far=Infinity;
    this.raycaster.set(new THREE.Vector3(worldX,1200,this.worldToSceneZ(worldZ)),new THREE.Vector3(0,-1,0));
    return this.raycaster.intersectObjects(this.mapMeshes,false).flatMap(hit=>{
      if(!hit.face)return [];
      const normal=hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld));
      return normal.y>=MIN_WALKABLE_NORMAL&&!this.blockedMaterials.has(this.materialForHit(hit))?[{height:hit.point.y,normal}]:[];
    }).sort((a,b)=>preferHighest?b.height-a.height:a.height-b.height)[0];
  }

  private sampleGround(worldX:number,worldZ:number,currentHeight:number,initial=false):GroundSample|undefined{
    if(!this.mapMeshes.length)return {height:currentHeight,normal:new THREE.Vector3(0,1,0)};
    const offsets=initial?[[0,0],[COLLISION_RADIUS,0],[-COLLISION_RADIUS,0],[0,COLLISION_RADIUS],[0,-COLLISION_RADIUS]]:[[0,0]],samples:GroundSample[]=[];
    for(const [index,[offsetX,offsetZ]] of offsets.entries()){
      this.raycaster.near=0;this.raycaster.far=Infinity;
      this.raycaster.set(new THREE.Vector3(worldX+offsetX,1200,this.worldToSceneZ(worldZ+offsetZ)),new THREE.Vector3(0,-1,0));
      const candidates=this.raycaster.intersectObjects(this.mapMeshes,false).flatMap(hit=>{
        if(!hit.face)return [];
        const normal=hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld));
        return normal.y>=MIN_WALKABLE_NORMAL&&!this.blockedMaterials.has(this.materialForHit(hit))?[{height:hit.point.y,normal}]:[];
      });
      const viable=initial?candidates.sort((a,b)=>b.height-a.height):candidates.filter(sample=>Math.abs(sample.height-currentHeight)<=MAX_STEP_HEIGHT).sort((a,b)=>Math.abs(a.height-currentHeight)-Math.abs(b.height-currentHeight));
      if(!viable.length){if(index===0)return;continue}
      samples.push(viable[0]);
    }
    if(samples.length<(initial?3:1))return;
    const height=Math.max(...samples.map(sample=>sample.height));
    if(samples.some(sample=>Math.abs(sample.height-height)>MAX_STEP_HEIGHT))return;
    const normal=samples.reduce((sum,sample)=>sum.add(sample.normal),new THREE.Vector3()).normalize();
    return {height,normal};
  }

  private bodyPathClear(worldX:number,worldZ:number){
    if(!this.mapMeshes.length)return true;
    if(this.guideNpc&&Math.hypot(worldX-this.guidePosition.x,worldZ-this.guidePosition.z)<42)return false;
    const start=new THREE.Vector3(this.localX,this.localGround+CHARACTER_GROUND_CLEARANCE+CHARACTER_HEIGHT*.4,this.worldToSceneZ(this.localZ));
    const end=new THREE.Vector3(worldX,start.y,this.worldToSceneZ(worldZ)),direction=end.sub(start),distance=direction.length();
    if(distance<.001)return true;
    this.bodyRaycaster.near=2;this.bodyRaycaster.far=distance+COLLISION_RADIUS;
    this.bodyRaycaster.set(start,direction.normalize());
    const blockingHit=this.bodyRaycaster.intersectObjects(this.mapMeshes,false).find(hit=>{
      if(!hit.face)return false;
      const normal=hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld));
      return Math.abs(normal.y)<.55;
    });
    return !blockingHit;
  }

  updateLocalCharacter(proposedX:number,proposedZ:number,yaw:number,motion:MotionState,delta:number){
    if(!this.mapReady)return {x:this.localX,z:this.localZ,groundHeight:this.localGround};
    this.updateResident(delta);
    this.updateGuideNpc(delta);
    this.updatePortals();
    this.updateLakeExperienceCircles();
    if(this.overviewActive){this.showMapOverview();this.renderAccumulator+=delta;if(this.renderAccumulator>=RENDER_INTERVAL){this.renderAccumulator%=RENDER_INTERVAL;this.render()}return {x:this.localX,z:this.localZ,groundHeight:this.localGround}}
    const positionChanged=Math.hypot(proposedX-this.localX,proposedZ-this.localZ)>.001;
    let nextX=proposedX,nextZ=proposedZ,sample=positionChanged?(this.bodyPathClear(nextX,nextZ)?this.sampleGround(nextX,nextZ,this.localGround):undefined):{height:this.localGround,normal:this.localNormal};
    if(!sample){nextZ=this.localZ;sample=this.bodyPathClear(nextX,nextZ)?this.sampleGround(nextX,nextZ,this.localGround):undefined}
    if(!sample){nextX=this.localX;nextZ=proposedZ;sample=this.bodyPathClear(nextX,nextZ)?this.sampleGround(nextX,nextZ,this.localGround):undefined}
    if(!sample){nextX=this.localX;nextZ=this.localZ;sample={height:this.localGround,normal:this.localNormal}}
    this.localX=nextX;this.localZ=nextZ;this.localGround=sample.height;this.localNormal.copy(sample.normal);
    if(this.options.guide){
      const guideDistance=Math.hypot(nextX-this.guidePosition.x,nextZ-this.guidePosition.z);
      const guideNearby=guideDistance<(this.guideNearby?GUIDE_TALK_EXIT_DISTANCE:GUIDE_TALK_DISTANCE);
      if(guideNearby!==this.guideNearby){this.guideNearby=guideNearby;gameEvents.emit('guide-proximity-changed',guideNearby)}
    }
    if(this.options.mapSign){
      const mapSignDistance=Math.hypot(nextX-this.mapSignPosition.x,nextZ-this.mapSignPosition.z);
      const mapSignNearby=mapSignDistance<(this.mapSignNearby?MAP_SIGN_EXIT_DISTANCE:MAP_SIGN_OPEN_DISTANCE);
      if(mapSignNearby!==this.mapSignNearby){
        this.mapSignNearby=mapSignNearby;
        gameEvents.emit('map-sign-proximity-changed',mapSignNearby);
      }
    }
    const portalCandidates=[
      ...(this.options.portal&&this.portalPosition?[{...this.options.portal,...this.portalPosition}]:[]),
      ...(this.options.fixedPortals??[]),
    ].map(config=>({config,distance:Math.hypot(nextX-config.x,nextZ-config.z)})).sort((a,b)=>a.distance-b.distance);
    if(!this.portalEntryArmed&&portalCandidates.every(candidate=>candidate.distance>=PORTAL_EXIT_DISTANCE))this.portalEntryArmed=true;
    const closestPortal=portalCandidates[0],samePortal=closestPortal?.config.destination===this.activePortal?.destination;
    const activePortal=this.portalEntryArmed&&closestPortal&&closestPortal.distance<(samePortal?PORTAL_EXIT_DISTANCE:PORTAL_OPEN_DISTANCE)?closestPortal.config:undefined;
    if(activePortal?.destination!==this.activePortal?.destination){
      this.activePortal=activePortal;
      this.portalNearby=!!activePortal;
      this.resetPortalCharge();
      gameEvents.emit('world-portal-proximity-changed',activePortal?{destination:activePortal.destination,label:activePortal.label}:null);
    }
    if(activePortal&&!this.portalTravelTriggered){
        this.portalChargeSeconds+=delta;
        gameEvents.emit('portal-charge-progress',Math.min(1,this.portalChargeSeconds/PORTAL_CHARGE_SECONDS));
        if(this.portalChargeSeconds>=PORTAL_CHARGE_SECONDS){
          this.portalTravelTriggered=true;
          gameEvents.emit('travel-to-map',activePortal.destination);
        }
    }
    if(this.options.interaction&&this.interactionPosition){
      const interactionDistance=Math.hypot(nextX-this.interactionPosition.x,nextZ-this.interactionPosition.z);
      const interactionNearby=interactionDistance<(this.interactionNearby?INTERACTION_EXIT_DISTANCE:INTERACTION_OPEN_DISTANCE);
      if(interactionNearby!==this.interactionNearby){
        this.interactionNearby=interactionNearby;
        gameEvents.emit('world-interaction-proximity-changed',interactionNearby?this.options.interaction:null);
      }
    }
    if(this.options.lakeExperiences?.length){
      const closest=this.options.lakeExperiences.map(config=>{const position=this.lakeExperiencePositions.get(config.id)??config;return {config,distance:Math.hypot(nextX-position.x,nextZ-position.z)}}).sort((a,b)=>a.distance-b.distance)[0];
      const same=closest?.config.id===this.lakeExperienceNearby;
      const nearby=closest&&closest.distance<(same?LAKE_EXPERIENCE_EXIT_DISTANCE:LAKE_EXPERIENCE_OPEN_DISTANCE)?closest.config:undefined;
      if(nearby?.id!==this.lakeExperienceNearby){
        this.lakeExperienceNearby=nearby?.id;
        gameEvents.emit('lake-experience-proximity-changed',nearby?{id:nearby.id,label:nearby.label,description:nearby.description}:null);
      }
    }
    const position=new THREE.Vector3(nextX,sample.height+CHARACTER_GROUND_CLEARANCE,this.worldToSceneZ(nextZ));
    this.localCharacter.update(position,sample.normal,yaw,motion,delta);
    this.followCharacter(position,delta);this.adjustQuality(delta);this.renderAccumulator+=delta;if(this.renderAccumulator>=RENDER_INTERVAL){this.renderAccumulator%=RENDER_INTERVAL;this.render()}
    return {x:nextX,z:nextZ,groundHeight:sample.height};
  }

  updateRemoteCharacter(id:string,name:string,model:CharacterModel,parts:CharacterParts,worldX:number,worldZ:number,yaw:number,motion:MotionState,delta:number){
    let character=this.remotes.get(id);if(!character){character=new WorldCharacter(this.scene,name,model,parts);this.remotes.set(id,character)}
    const previousGround=this.remoteGrounds.get(id),needsGroundSample=!previousGround||Math.hypot(worldX-previousGround.x,worldZ-previousGround.z)>=4;
    const sampled=needsGroundSample?this.sampleGround(worldX,worldZ,previousGround?.height??0,!previousGround):undefined;
    const ground=sampled?{...sampled,x:worldX,z:worldZ}:previousGround??{height:0,normal:new THREE.Vector3(0,1,0),x:worldX,z:worldZ};
    if(needsGroundSample)this.remoteGrounds.set(id,ground);
    character.update(new THREE.Vector3(worldX,ground.height+CHARACTER_GROUND_CLEARANCE,this.worldToSceneZ(worldZ)),ground.normal,yaw,motion,delta);
  }

  removeRemoteCharacter(id:string){this.remotes.get(id)?.destroy();this.remotes.delete(id);this.remoteGrounds.delete(id)}

  private followCharacter(position:THREE.Vector3,delta:number,immediate=false){
    if(this.overviewActive){this.showMapOverview();return}
    const target=position.clone();
    target.z-=(this.options.cameraScreenOffsetY??0)/GROUND_PROJECTION;
    if(immediate)this.cameraTarget.copy(target);else this.cameraTarget.lerp(target,1-Math.exp(-5*delta));
    if(!this.mapBounds.isEmpty()){
      const center=this.mapBounds.getCenter(new THREE.Vector3()),halfWidth=this.width/(2*CAMERA_ZOOM),groundHalfDepth=this.height/(2*CAMERA_ZOOM*GROUND_PROJECTION),minX=this.mapBounds.min.x+halfWidth,maxX=this.mapBounds.max.x-halfWidth,minZ=this.mapBounds.min.z+groundHalfDepth,maxZ=this.mapBounds.max.z-groundHalfDepth;
      this.cameraTarget.x=minX<=maxX?THREE.MathUtils.clamp(this.cameraTarget.x,minX,maxX):center.x;
      this.cameraTarget.z=minZ<=maxZ?THREE.MathUtils.clamp(this.cameraTarget.z,minZ,maxZ):center.z;
    }
    this.camera.left=-this.width/(2*CAMERA_ZOOM);this.camera.right=this.width/(2*CAMERA_ZOOM);this.camera.top=this.height/(2*CAMERA_ZOOM);this.camera.bottom=-this.height/(2*CAMERA_ZOOM);
    this.camera.position.set(this.cameraTarget.x,this.cameraTarget.y+Math.sin(CAMERA_ELEVATION)*CAMERA_DISTANCE,this.cameraTarget.z+Math.cos(CAMERA_ELEVATION)*CAMERA_DISTANCE);
    this.camera.lookAt(this.cameraTarget);this.camera.updateProjectionMatrix();
  }

  private adjustQuality(delta:number){
    if(delta<=0||delta>.1)return;
    this.qualityElapsed+=delta;this.qualityFrameTime+=delta;this.qualityFrames++;
    if(this.qualityElapsed<2)return;
    const average=this.qualityFrameTime/Math.max(1,this.qualityFrames);
    let next=this.pixelRatio;
    if(average>1/36)next=Math.max(MIN_PIXEL_RATIO,this.pixelRatio-.15);
    else if(average<1/52)next=Math.min(MAX_PIXEL_RATIO,this.pixelRatio+.1);
    if(Math.abs(next-this.pixelRatio)>.01){this.pixelRatio=next;this.renderer.setPixelRatio(this.pixelRatio);this.resize(true)}
    this.qualityElapsed=0;this.qualityFrameTime=0;this.qualityFrames=0;
  }

  private resize(force=false){const width=Math.max(1,this.parent.clientWidth),height=Math.max(1,this.parent.clientHeight);if(!force&&width===this.width&&height===this.height)return;this.width=width;this.height=height;this.renderer.setSize(width,height,false)}
  private render(){this.resize();if(!this.destroyed)this.renderer.render(this.scene,this.camera)}

  destroy(){
    if(this.guideNearby)gameEvents.emit('guide-proximity-changed',false);
    if(this.portalNearby)gameEvents.emit('world-portal-proximity-changed',null);
    if(this.interactionNearby)gameEvents.emit('world-interaction-proximity-changed',null);
    if(this.lakeExperienceNearby)gameEvents.emit('lake-experience-proximity-changed',null);
    if(this.overviewActive)gameEvents.emit('map-overview-changed',false);
    if(this.options.overview)gameEvents.off('map-overview-toggle',this.onMapOverviewToggle);
    if(this.options.portal)gameEvents.off('portal-move-to-player',this.onMovePortalToPlayer);
    if(this.options.lakeExperiences)gameEvents.off('lake-experience-move-to-player',this.onMoveLakeExperienceToPlayer);
    this.destroyed=true;this.localCharacter.destroy();this.guideNpc?.destroy();this.remotes.forEach(character=>character.destroy());this.remotes.clear();this.remoteGrounds.clear();
    this.scene.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(material=>material.dispose())}});
    this.renderer.dispose();this.renderer.domElement.remove();
  }
}
