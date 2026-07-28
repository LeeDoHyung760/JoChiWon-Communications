import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import villageModelUrl from '../../assets/maps/sejong-lake-park.glb?url';
import bearTreeParkModelUrl from '../../assets/maps/bear-tree-park-optimized.glb?url';
import bearPlayZoneModelUrl from '../../assets/maps/park-landscape.glb?url';
import gardenModelUrl from '../../assets/maps/garden.glb?url';
import campusModelUrl from '../../assets/maps/campus-optimized.glb?url';
import bearCubModelUrl from '../../assets/characters/bear-cub.glb?url';
import chungnyeongIdleUrl from '../../assets/characters/chungnyeong_idle.glb?url';
import chungnyeongWalkUrl from '../../assets/characters/chungnyeong_walk.glb?url';
import chungnyeongRunUrl from '../../assets/characters/chungnyeong_run.glb?url';
import girlUrl from '../../assets/characters/girl_metaverse_animated.glb?url';
import boyUrl from '../../assets/characters/boy_metaverse.glb?url';
import clothsUrl from '../../assets/characters/cloths_rig.glb?url';
import womenUrl from '../../assets/characters/women_total.glb?url';
import type { CharacterModel,CharacterParts,UserProfile } from '../../types';
import type { BearTreePortalPositions,LakeExperienceId,LakeExperiencePosition,MapId,MotionState,PortalPosition,WorldInteractionPosition } from '../../../shared/socket-events';
import { gameEvents } from '../events';
import { characterSettings } from '../character/characterSettings';
import { applyColorsToThreeScene } from '../../utils/modelColorizer';
import { greenhousePlants,GREENHOUSE_MEMORY_TREE_OBJECT,GREENHOUSE_PLANT_TOTAL,greenhousePlantIdByObjectName } from '../../data/greenhouse-plants';

const WORLD_WIDTH=2400;
const WORLD_HEIGHT=1900;
const CAMERA_ELEVATION=THREE.MathUtils.degToRad(33);
const OVERVIEW_CAMERA_ELEVATION=THREE.MathUtils.degToRad(58);
const GROUND_PROJECTION=Math.sin(CAMERA_ELEVATION);
const CAMERA_DISTANCE=900;
const CHARACTER_HEIGHT=94;
const CHARACTER_GROUND_CLEARANCE=4;
const MAX_STEP_HEIGHT=22;
const MAX_DROP_HEIGHT=180;
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
const GREENHOUSE_OPEN_DISTANCE=210;
const GREENHOUSE_EXIT_DISTANCE=245;
const DEFAULT_BEAR_PHOTO_PORTAL_POSITION={x:1569,z:1525} as const;
const BEAR_PHOTO_STAGE_FRONT_INSET=10;
const BEAR_PHOTO_CAMERA_YAW=0;
const BEAR_PHOTO_STAGE_NAME='tripo_node_816cfa46-0ef3-4a12-be52-0dae3d331bff';
const RENDER_INTERVAL=1/45;
const PORTAL_CHARGE_SECONDS=1;
const BLUE_PORTAL_CHARGE_SECONDS=3;
const CAMERA_ZOOM=1.28;
const MIN_PIXEL_RATIO=1;
const MAX_PIXEL_RATIO=Math.min(window.devicePixelRatio||1,1.25);
let textureAnisotropy=4;
const worldMapDownloads=new Map<string,Promise<void>>();
function preloadWorldMapDownload(url:string,label:string){
  let pending=worldMapDownloads.get(url);
  if(!pending){
    pending=fetch(url,{cache:'force-cache'}).then(response=>{
    if(!response.ok)throw new Error(`${label} preload failed: ${response.status}`);
    return response.arrayBuffer();
    }).then(()=>undefined).catch(error=>{worldMapDownloads.delete(url);throw error});
    worldMapDownloads.set(url,pending);
  }
  return pending;
}
export const preloadCampusDownload=()=>preloadWorldMapDownload(campusModelUrl,'Campus');
export const preloadBearTreeParkDownload=()=>loadModel(bearTreeParkModelUrl).then(()=>undefined);
export const LAKE_PARK_SPAWN:{x:number;z:number;yaw:number}={x:1870,z:1180,yaw:2.1};
export const BEAR_TREE_PARK_SPAWN:{x:number;z:number;yaw:number}={x:1200,z:1610,yaw:Math.PI};
export const BEAR_PLAY_ZONE_SPAWN:{x:number;z:number;yaw:number}={x:1200,z:1570,yaw:Math.PI};
export const GARDEN_SPAWN:{x:number;z:number;yaw:number}={x:1200,z:1180,yaw:Math.PI};
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
type CharacterState={scene:THREE.Object3D;mixer?:THREE.AnimationMixer;action?:THREE.AnimationAction};
type GroundSample={height:number;normal:THREE.Vector3};
type RemoteGroundSample=GroundSample&{x:number;z:number};
type GuidePosition={x:number;z:number;yaw:number};
type GuidePatrolFrame=GuidePosition&{motion:Extract<MotionState,'idle'|'walk'>};
type PortalConfig={x:number;z:number;destination:PortalPosition['destination'];label:string;appearance?:'standing'|'white-circle';fixedPosition?:boolean;theme?:'mint'|'blue'|'orange';chargeSeconds?:number;positionStorageKey?:string;sharedPosition?:boolean};
type InteractionConfig={x:number;z:number;destination:WorldInteractionPosition['destination'];label:string;buttonLabel:string;fixedPosition?:boolean;chargeSeconds?:number};
type LakeExperienceConfig={id:LakeExperienceId;x:number;z:number;label:string;description:string;color:number};
type ResidentConfig={modelUrl:string;x:number;z:number;height:number;yaw:number;stationary?:boolean;patrol?:readonly {x:number;z:number}[];walkSpeed?:number};
type WildlifeClueConfig={id:'track'|'food'|'den';x:number;z:number;icon:string;label:string};
type GreenhouseTarget={id:string;objects:THREE.Object3D[];bounds:THREE.Box3;center:THREE.Vector3;marker:THREE.Sprite;kind:'plant'|'memory-tree'};
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
  wildlifeClues?:WildlifeClueConfig[];
  cameraScreenOffsetY?:number;
  cameraElevationDeg?:number;
  cameraZoom?:number;
  characterHeight?:number;
  mapScaleMultiplier?:number;
  groundFillColor?:number;
  greenhouse?:boolean;
  performanceMode?:boolean;
  simplifiedCollision?:boolean;
  bearPhotoZone?:boolean;
};
export const LAKE_PARK_RENDERER_OPTIONS:WorldMapRendererOptions={modelUrl:villageModelUrl,mapName:'세종호수공원',spawn:LAKE_PARK_SPAWN,guide:true,mapSign:true,overview:true,portal:{...BEAR_TREE_PORTAL_POSITION,destination:'bear-tree-park',label:'베어트리파크',theme:'blue'},fixedPortals:[{...CAMPUS_PORTAL_POSITION,destination:'campus',label:'공동캠퍼스',theme:'blue'}],lakeExperiences:[{id:'central-plaza',x:1150,z:950,label:'축제 취향 부스',description:'끌리는 분위기로 축제 취향을 찾아요',color:0xffffff},{id:'activity-zone',x:1450,z:1080,label:'공연 취향 부스',description:'충녕이와 나의 공연 스타일을 알아봐요',color:0xffffff},{id:'food-shop-zone',x:900,z:1250,label:'미식 취향 부스',description:'맛과 공간 선택으로 여행 스타일을 찾아요',color:0xffffff},{id:'wind-hill',x:350,z:400,label:'세종 추천 코스 게시판',description:'발견한 취향으로 코스를 살펴봐요',color:0xffffff}]};
export const BEAR_TREE_PARK_RENDERER_OPTIONS:WorldMapRendererOptions={modelUrl:bearTreeParkModelUrl,mapName:'베어트리파크',spawn:BEAR_TREE_PARK_SPAWN,portal:{x:1230,z:1553,destination:'town',label:'세종호수공원',theme:'blue',fixedPosition:true,chargeSeconds:3,sharedPosition:false},fixedPortals:[{x:682,z:735,destination:'garden',label:'세종수목원',appearance:'white-circle',fixedPosition:true,chargeSeconds:3}],interaction:{x:1616,z:601,destination:'bear-play-zone',label:'곰 놀이 공간',buttonLabel:'곰 만나기',fixedPosition:true,chargeSeconds:3},cameraZoom:.86,characterHeight:140,groundFillColor:0xead9ad,performanceMode:true,simplifiedCollision:true,bearPhotoZone:true};
export const BEAR_PLAY_ZONE_RENDERER_OPTIONS:WorldMapRendererOptions={modelUrl:bearPlayZoneModelUrl,mapName:'곰 놀이 공간',spawn:BEAR_PLAY_ZONE_SPAWN,interaction:{x:1200,z:1650,destination:'bear-tree-park',label:'베어트리파크',buttonLabel:'베어트리파크로 돌아가기'},resident:{modelUrl:bearCubModelUrl,x:1200,z:1450,height:105,yaw:Math.PI,stationary:true},wildlifeClues:[{id:'track',x:1110,z:1530,icon:'🐾',label:'발자국 흔적'},{id:'food',x:1290,z:1460,icon:'🌰',label:'먹이 흔적'},{id:'den',x:1200,z:1360,icon:'🌲',label:'겨울 보금자리'}],cameraZoom:.86,characterHeight:140,groundFillColor:0xead9ad};
export const GARDEN_RENDERER_OPTIONS:WorldMapRendererOptions={
  modelUrl:gardenModelUrl,
  mapName:'수목원',
  spawn:GARDEN_SPAWN,
  cameraZoom:.86,
  characterHeight:140,
  groundFillColor:0xe3ddbc,
  fixedPortals:[{
    x:1200,
    z:1260,
    destination:'bear-tree-park',
    label:'베어트리파크',
    appearance:'white-circle',
    fixedPosition:true,
    chargeSeconds:3,
  }],
  greenhouse:true,
};
export const CAMPUS_RENDERER_OPTIONS:WorldMapRendererOptions={modelUrl:campusModelUrl,mapName:'공동캠퍼스',spawn:CAMPUS_SPAWN,portal:{x:1120,z:1731,destination:'town',label:'세종호수공원',theme:'blue'},cameraZoom:.77,characterHeight:103,performanceMode:true};
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

function sharpenObjectTextures(object:THREE.Object3D,reduced=false){
  object.traverse(child=>{
    if(!(child instanceof THREE.Mesh))return;
    const materials=Array.isArray(child.material)?child.material:[child.material];
    materials.forEach(material=>{
      for(const value of Object.values(material)){
        if(value instanceof THREE.Texture){
          value.anisotropy=reduced?2:textureAnisotropy;
          value.magFilter=THREE.LinearFilter;
          value.minFilter=reduced?THREE.LinearFilter:THREE.LinearMipmapLinearFilter;
          value.generateMipmaps=!reduced;
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
    const saved=JSON.parse(localStorage.getItem(config.positionStorageKey??`${PORTAL_POSITION_KEY_PREFIX}-${config.destination}`)??'null') as {x?:number;z?:number}|null;
    if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.z))return {x:saved.x!,z:saved.z!};
  }catch{/* Keep the configured portal position when no valid saved position exists. */}
  return {x:config.x,z:config.z};
}

function savedInteractionPosition(config:InteractionConfig){
  if(config.fixedPosition)return {x:config.x,z:config.z};
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
  girl1:{urls:{idle:girlUrl,walk:girlUrl,run:girlUrl},clips:{idle:'NlaTrack.002',walk:'NlaTrack.001',run:'NlaTrack'}},
  boy1:{urls:{idle:boyUrl,walk:boyUrl,run:boyUrl},clips:{idle:'NlaTrack',walk:'NlaTrack.002',run:'NlaTrack.001'}},
  cloths:{urls:{idle:clothsUrl,walk:clothsUrl,run:clothsUrl},clips:{idle:'root|root|mixamo.com',walk:'root|root|mixamo.com',run:'root|root|mixamo.com'}},
  women:{urls:{idle:womenUrl,walk:womenUrl,run:womenUrl},clips:{idle:'standing',walk:'walking',run:'running'}}
};
const FEMALE_MOTION_DURATION:Record<'walk'|'run',number>={walk:2.375,run:1.292};
const motionDurationByModel:Partial<Record<Exclude<CharacterModel,'custom'>,Record<'walk'|'run',number>>>={
  cloths:{walk:1.433,run:1.433},
  women:{walk:1.167,run:.667},
};

function femaleMatchedWorldTimeScale(model:Exclude<CharacterModel,'custom'>,motion:MotionState){
  if(motion==='idle')return 1;
  const configured=motion==='walk'?characterSettings.walkAnimationTimeScale:characterSettings.runAnimationTimeScale;
  const duration=motionDurationByModel[model]?.[motion];
  return duration?configured*duration/FEMALE_MOTION_DURATION[motion]:configured;
}

function inPlaceCharacterClip(source:THREE.AnimationClip){
  const clip=source.clone();
  clip.tracks.forEach(track=>{
    const name=track.name.toLowerCase();
    const rootPosition=name==='root.position'||name.endsWith('root.x.position')||name.includes('bones[root.x].position');
    if(!rootPosition)return;
    const values=track.values;
    if(values.length<3)return;
    const firstX=values[0],firstZ=values[2];
    for(let index=0;index<values.length;index+=3){values[index]=firstX;values[index+2]=firstZ}
  });
  return clip;
}

const BOY_HEAD_PITCH_CORRECTION:Record<MotionState,number>={idle:15,walk:18,run:32};

function correctedBoyHeadClip(source:THREE.AnimationClip,motion:MotionState){
  const clip=source.clone();
  const correction=new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1,0,0),
    THREE.MathUtils.degToRad(BOY_HEAD_PITCH_CORRECTION[motion])
  );
  clip.tracks.forEach(track=>{
    const name=track.name.toLowerCase();
    if(!name.endsWith('head.quaternion')&&!name.includes('bones[head].quaternion'))return;
    const values=track.values;
    for(let index=0;index<values.length;index+=4){
      const animated=new THREE.Quaternion(values[index],values[index+1],values[index+2],values[index+3]);
      animated.premultiply(correction).normalize();
      values[index]=animated.x;values[index+1]=animated.y;values[index+2]=animated.z;values[index+3]=animated.w;
    }
  });
  return clip;
}

function characterClip(source:THREE.AnimationClip|null|undefined,model:Exclude<CharacterModel,'custom'>,motion:MotionState){
  if(!source)return undefined;
  if(model==='cloths'||model==='women')return inPlaceCharacterClip(source);
  if(model==='boy1')return correctedBoyHeadClip(source,motion);
  return source;
}

class WorldCharacter{
  readonly root=new THREE.Group();
  readonly ready:Promise<void>;
  private nameplate:THREE.Sprite;
  private states=new Map<MotionState,CharacterState>();
  private active:MotionState='idle';
  private photoAction?:THREE.AnimationAction;
  private photoPoseActive=false;
  private targetQuaternion=new THREE.Quaternion();
  private height:number;

  constructor(private scene:THREE.Scene,name:string,private model:CharacterModel,private parts:CharacterParts,height=CHARACTER_HEIGHT,private idleOnly=false){
    this.height=height;
    this.root.name=`world-character-${name}`;
    scene.add(this.root);
    this.nameplate=this.createNameplate(name);this.root.add(this.nameplate);
    if(model==='custom'){this.createFallback(parts);this.ready=Promise.resolve()}
    else this.ready=this.loadModels(model);
  }

  private async loadModels(model:Exclude<CharacterModel,'custom'>){
    const config=modelConfig[model];
    try{
      const femaleReference=model==='cloths'||model==='women'?undefined:await loadModel(girlUrl);
      const sourceAnimation=(gltf:LoadedModel,motion:MotionState)=>{
        const animations=femaleReference?.animations??gltf.animations;
        const clipName=femaleReference?modelConfig.girl1.clips[motion]:config.clips[motion];
        return THREE.AnimationClip.findByName(animations,clipName);
      };
      if(this.idleOnly){
        const gltf=await loadModel(config.urls.idle),visual=cloneSkeleton(gltf.scene);
        applyColorsToThreeScene(visual,model,this.parts);
        sharpenObjectTextures(visual);
        visual.updateMatrixWorld(true);
        const bounds=new THREE.Box3().setFromObject(visual),size=bounds.getSize(new THREE.Vector3()),scale=this.height/Math.max(size.y,.001);
        visual.scale.setScalar(scale);visual.position.y=-bounds.min.y*scale;
        visual.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=false;object.frustumCulled=true}});
        const mixer=gltf.animations.length?new THREE.AnimationMixer(visual):undefined,sourceClip=sourceAnimation(gltf,'idle'),clip=characterClip(sourceClip,model,'idle'),action=mixer&&clip?mixer.clipAction(clip):undefined;
        action?.play();this.root.add(visual);this.states.set('idle',{scene:visual,mixer,action});this.setMotion('idle');return;
      }
      if(new Set(Object.values(config.urls)).size===1){
        const gltf=await loadModel(config.urls.idle),visual=cloneSkeleton(gltf.scene);
        applyColorsToThreeScene(visual,model,this.parts);
        sharpenObjectTextures(visual);
        visual.updateMatrixWorld(true);
        const bounds=new THREE.Box3().setFromObject(visual),size=bounds.getSize(new THREE.Vector3()),scale=this.height/Math.max(size.y,.001);
        visual.scale.setScalar(scale);visual.position.y=-bounds.min.y*scale;
        visual.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=false}});
        const mixer=new THREE.AnimationMixer(visual);this.root.add(visual);
        for(const motion of ['idle','walk','run'] as MotionState[]){const sourceClip=sourceAnimation(gltf,motion);const clip=characterClip(sourceClip,model,motion);const action=clip?mixer.clipAction(clip):undefined;this.states.set(motion,{scene:visual,mixer,action})}
        if(model==='women'){
          const hiSource=THREE.AnimationClip.findByName(gltf.animations,'hi');
          if(hiSource)this.photoAction=mixer.clipAction(inPlaceCharacterClip(hiSource));
        }
        this.setMotion(this.active);return;
      }
      const loadedStates=await Promise.all((['idle','walk','run'] as MotionState[]).map(async motion=>{
        const gltf=await loadModel(config.urls[motion]);
        const visual=cloneSkeleton(gltf.scene);
        applyColorsToThreeScene(visual,model,this.parts);
        sharpenObjectTextures(visual);
        visual.updateMatrixWorld(true);
        const bounds=new THREE.Box3().setFromObject(visual),size=bounds.getSize(new THREE.Vector3()),scale=this.height/Math.max(size.y,.001);
        visual.scale.setScalar(scale);
        visual.position.y=-bounds.min.y*scale;
        visual.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=false;object.frustumCulled=true}});
        const mixer=gltf.animations.length?new THREE.AnimationMixer(visual):undefined;
        const sourceClip=sourceAnimation(gltf,motion);
        const clip=characterClip(sourceClip,model,motion);
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
    if(this.model==='cloths'){
      const action=activeState?.action,mixer=activeState?.mixer;
      this.states.forEach(state=>state.action?.stop());
      if(motion==='idle')mixer?.setTime(0);
      else if(action){action.reset().setEffectiveTimeScale(femaleMatchedWorldTimeScale(this.model,motion)).fadeIn(.1).play()}
      return;
    }
    this.states.forEach((state,key)=>{if(key===motion){state.action?.reset().setEffectiveTimeScale(femaleMatchedWorldTimeScale(this.model as Exclude<CharacterModel,'custom'>,motion)).fadeIn(.12).play()}else state.action?.fadeOut(.12)});
  }

  update(position:THREE.Vector3,normal:THREE.Vector3,yaw:number,motion:MotionState,delta:number){
    if(!this.photoPoseActive&&motion!==this.active)this.setMotion(motion);
    this.root.position.copy(position);
    const tilt=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),normal);
    const turn=new THREE.Quaternion().setFromAxisAngle(normal,yaw);
    this.targetQuaternion.copy(turn).multiply(tilt);
    this.root.quaternion.slerp(this.targetQuaternion,1-Math.exp(-12*delta));
    const mixers=new Set([...this.states.values()].filter(state=>state.scene.visible&&state.mixer).map(state=>state.mixer!));mixers.forEach(mixer=>mixer.update(delta));
  }

  showAllForWarmup(){
    const visibility=[...this.states.values()].map(state=>[state.scene,state.scene.visible] as const);
    visibility.forEach(([visual])=>{visual.visible=true});
    return()=>visibility.forEach(([visual,visible])=>{visual.visible=visible});
  }

  setNameplateVisible(visible:boolean){this.nameplate.visible=visible}

  setPhotoPose(active:boolean){
    if(!this.photoAction)return;
    this.photoPoseActive=active;
    if(active){
      this.states.forEach(state=>state.action?.fadeOut(.12));
      this.photoAction.reset().setLoop(THREE.LoopRepeat,Infinity).fadeIn(.12).play();
    }else{
      this.photoAction.fadeOut(.12);
      this.setMotion('idle');
    }
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
  private renderInterval=RENDER_INTERVAL;
  private mapMeshes:THREE.Mesh[]=[];
  private mapMeshBounds=new Map<THREE.Mesh,THREE.Box3>();
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
  private interactionChargeSeconds=0;
  private interactionTravelTriggered=false;
  private interactionPosition?:{x:number;z:number};
  private interactionRoot?:THREE.Group;
  private lakeExperienceNearby?:LakeExperienceId;
  private lakeBoothCompletion:Partial<Record<LakeExperienceId,boolean>>={};
  private lakeExperiencePositions=new Map<LakeExperienceId,{x:number;z:number}>();
  private lakeExperienceRoots=new Map<LakeExperienceId,THREE.Group>();
  private natureChapterCompletion={bear:false,garden:false};
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
  private greenhouseTargets=new Map<string,GreenhouseTarget>();
  private greenhouseObjectIds=new WeakMap<THREE.Object3D,string>();
  private greenhouseNearby?:GreenhouseTarget;
  private greenhouseCollected=new Set<string>();
  private greenhouseUnlocked=false;
  private greenhouseTreeStage:0|1|2|3=0;
  private greenhouseClock=0;
  private memoryTreeEffect?:THREE.Group;
  private bearPhotoPortalPosition:{x:number;z:number}={...DEFAULT_BEAR_PHOTO_PORTAL_POSITION};
  private bearPhotoPortalRoot?:THREE.Group;
  private bearPhotoDestination?:{x:number;z:number;groundHeight:number};
  private bearPhotoNearby=false;
  private pendingTeleport?:{x:number;z:number;groundHeight?:number};
  private bearPhotoMode=false;
  private bearPhotoReturn?:{x:number;z:number;groundHeight:number};
  private mapModel?:THREE.Object3D;
  private bearPhotoStage?:THREE.Object3D;
  private wildlifeClueRoots=new Map<string,THREE.Group>();
  private wildlifeClueNearby?:string;

  constructor(parent:HTMLElement,profile:UserProfile,private options:WorldMapRendererOptions=LAKE_PARK_RENDERER_OPTIONS){
    this.parent=parent;
    if(options.performanceMode){this.pixelRatio=1;this.renderInterval=1/30}
    this.localX=options.spawn.x;
    this.localZ=options.spawn.z;
    this.portalPosition=options.portal?savedPortalPosition(options.portal):undefined;
    if(this.portalPosition&&Math.hypot(options.spawn.x-this.portalPosition.x,options.spawn.z-this.portalPosition.z)<PORTAL_EXIT_DISTANCE)this.portalEntryArmed=false;
    this.interactionPosition=options.interaction?savedInteractionPosition(options.interaction):undefined;
    options.lakeExperiences?.forEach(config=>this.lakeExperiencePositions.set(config.id,savedLakeExperiencePosition(config)));
    this.cameraTarget=new THREE.Vector3(options.spawn.x,0,this.worldToSceneZ(options.spawn.z));
    this.renderer=new THREE.WebGLRenderer({antialias:!options.performanceMode,alpha:false,powerPreference:'high-performance'});
    this.renderer.domElement.className='village-map-canvas';
    textureAnisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled=!options.performanceMode;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.sortObjects=true;
    this.scene.background=new THREE.Color('#b9d7c2');
    if(options.groundFillColor!==undefined){
      const groundFill=new THREE.Mesh(
        new THREE.PlaneGeometry(8000,8000),
        new THREE.MeshBasicMaterial({color:options.groundFillColor,side:THREE.DoubleSide}),
      );
      groundFill.name='world-ground-extension';
      groundFill.rotation.x=-Math.PI/2;
      groundFill.position.set(WORLD_WIDTH/2,-8,WORLD_HEIGHT/2);
      groundFill.renderOrder=-10;
      this.scene.add(groundFill);
    }
    this.scene.add(new THREE.HemisphereLight(0xf4fbff,0x617760,1.8));
    const sun=new THREE.DirectionalLight(0xfff4dc,3.1);
    const shadowSize=512;
    sun.position.set(1900,1400,1850);sun.target.position.set(WORLD_WIDTH/2,0,WORLD_HEIGHT/2);sun.castShadow=true;sun.shadow.mapSize.set(shadowSize,shadowSize);sun.shadow.camera.near=10;sun.shadow.camera.far=4000;
    sun.shadow.camera.left=-1300;sun.shadow.camera.right=1300;sun.shadow.camera.top=1100;sun.shadow.camera.bottom=-1100;sun.shadow.bias=-.00015;
    this.scene.add(sun,sun.target);
    this.camera.up.set(0,1,0);this.camera.near=.1;this.camera.far=5000;
    parent.prepend(this.renderer.domElement);
    this.resize();
    this.localCharacter=new WorldCharacter(this.scene,profile.nickname,profile.model,profile.character,options.characterHeight??CHARACTER_HEIGHT);
    if(options.overview)gameEvents.on('map-overview-toggle',this.onMapOverviewToggle);
    if(options.portal)gameEvents.on('portal-move-to-player',this.onMovePortalToPlayer);
    if(options.interaction)gameEvents.on('interaction-move-to-player',this.onMoveInteractionToPlayer);
    if(options.mapName==='베어트리파크')gameEvents.on('nature-chapter-progress-changed',this.onNatureChapterProgressChanged);
    if(options.bearPhotoZone)gameEvents.on('bear-photo-enter',this.onBearPhotoEnter);
    if(options.bearPhotoZone){gameEvents.on('bear-photo-capture',this.onBearPhotoCapture);gameEvents.on('bear-photo-exit',this.onBearPhotoExit)}
    if(options.lakeExperiences){
      gameEvents.on('lake-experience-move-to-player',this.onMoveLakeExperienceToPlayer);
      gameEvents.on('lake-booth-completion-changed',this.onLakeBoothCompletionChanged);
    }
    if(options.greenhouse){
      this.parent.addEventListener('pointerdown',this.onGreenhousePointerDown);
      gameEvents.on('greenhouse-progress-changed',this.onGreenhouseProgressChanged);
    }
    this.ready=this.loadVillage();
  }

  private async loadVillage(){
    try{
      const gltf=this.options.modelUrl===bearTreeParkModelUrl?await loadModel(this.options.modelUrl):await new GLTFLoader().loadAsync(this.options.modelUrl);
      if(this.destroyed)return;
      const model=gltf.scene;model.updateMatrixWorld(true);
      sharpenObjectTextures(model,this.options.performanceMode);
      const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
      const scale=Math.min((WORLD_WIDTH-180)/size.x,(WORLD_HEIGHT-120)/size.z)*(this.options.mapScaleMultiplier??1),depthScale=scale/GROUND_PROJECTION;
      model.position.set(WORLD_WIDTH/2-center.x*scale,-bounds.min.y*scale,WORLD_HEIGHT/2-center.z*depthScale);model.scale.set(scale,scale,depthScale);
      model.updateMatrixWorld(true);
      this.mapBounds.setFromObject(model);
      model.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=false;object.receiveShadow=!this.options.performanceMode;this.mapMeshes.push(object);this.mapMeshBounds.set(object,new THREE.Box3().setFromObject(object))}});
      if(this.mapMeshes.length>1)this.mapMeshes.forEach(mesh=>{const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];materials.forEach(material=>this.classifyMaterial(material))});
      this.scene.add(model);
      this.mapModel=model;
      if(this.options.bearPhotoZone){
        localStorage.removeItem('bear-photo-zone-position');
        const photoStage=model.getObjectByName(BEAR_PHOTO_STAGE_NAME);
        if(photoStage){
          this.scene.attach(photoStage);this.bearPhotoStage=photoStage;
          const stageBounds=new THREE.Box3().setFromObject(photoStage),stageCenter=stageBounds.getCenter(new THREE.Vector3());
          const destinationZ=this.sceneToWorldZ(stageBounds.max.z-BEAR_PHOTO_STAGE_FRONT_INSET);
          const stageGround=this.sampleExperienceGround(stageCenter.x,destinationZ,true);
          this.bearPhotoDestination={x:stageCenter.x,z:destinationZ,groundHeight:stageGround?.height??stageBounds.min.y+20};
        }
        const photoPortalGround=this.sampleExperienceGround(this.bearPhotoPortalPosition.x,this.bearPhotoPortalPosition.z);
        if(photoPortalGround){
          this.bearPhotoPortalRoot=this.createLakeExperienceCircle({id:'central-plaza',...this.bearPhotoPortalPosition,label:'곰 가족 포토존',description:'곰 가족과 사진을 찍어요',color:0xff8a24},photoPortalGround.height);
          this.bearPhotoPortalRoot.name='bear-photo-experience-circle-v2';
        }
      }
      if(this.options.greenhouse)this.setupGreenhouse(model);
      const safeSpawn=this.findSafeSpawn(this.localX,this.localZ);
      if(safeSpawn){
        this.localX=safeSpawn.x;this.localZ=safeSpawn.z;
        this.localGround=safeSpawn.ground.height;this.localNormal.copy(safeSpawn.ground.normal);
      }
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
        const ground=this.sampleExperienceGround(position.x,position.z,true)??this.sampleVisibleSurfaceGround(position.x,position.z);
        this.lakeExperienceRoots.set(config.id,this.createLakeExperienceCircle({...config,...position},ground?.height??0));
      });
      this.options.wildlifeClues?.forEach((config,index)=>{
        const groundHeight=(this.sampleExperienceGround(config.x,config.z,true)
          ??this.sampleVisibleSurfaceGround(config.x,config.z))?.height
          ??this.localGround;
        const root=this.createInteractionCircle(config,groundHeight);
        root.name=`bear-wildlife-clue-${config.id}`;root.userData.phase=index*Math.PI*.66;root.userData.journeyActive=true;
        const color=new THREE.Color(index===0?0xf0bd4f:index===1?0xe78042:0x77a86a);
        for(const key of ['center','ring','middleRing','innerRing','pulseRing'] as const){
          const mesh=root.userData[key] as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
          mesh.material.color.copy(color);
        }
        const light=root.userData.light as THREE.PointLight;light.color.copy(color);light.intensity=4.8;light.distance=210;
        root.userData.clueLabel=this.createWildlifeClueLabel(config,groundHeight,color);
        this.wildlifeClueRoots.set(config.id,root);
      });
      const residentReady=this.options.resident?this.createResident(this.options.resident):Promise.resolve();
      const startPosition=new THREE.Vector3(this.localX,this.localGround+CHARACTER_GROUND_CLEARANCE,this.worldToSceneZ(this.localZ));
      this.localCharacter.update(startPosition,this.localNormal,this.options.spawn.yaw,'idle',0);
      await Promise.all([this.localCharacter.ready,this.guideNpc?.ready,residentReady]);
      if(this.destroyed)return;
      this.followCharacter(startPosition,0,true);
      const restoreVisibility=[this.localCharacter.showAllForWarmup(),this.guideNpc?.showAllForWarmup()].filter((restore):restore is ()=>void=>!!restore);
      try{
        await this.renderer.compileAsync(this.scene,this.camera);
      }catch{
        this.renderer.compile(this.scene,this.camera);
      }finally{
        restoreVisibility.forEach(restore=>restore());
      }
      if(this.destroyed)return;
      this.mapReady=true;
      this.render();
      console.log(`[${this.options.mapName} world] unified 3D scene ready`,{meshes:this.mapMeshes.length,scale});
    }catch(error){console.error(`[${this.options.mapName} world] GLB load error`,error)}
  }

  private greenhouseMarkerTexture(label:string,complete=false){
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
    const context=canvas.getContext('2d')!;
    context.shadowColor='rgba(20,60,48,.28)';context.shadowBlur=12;
    context.fillStyle=complete?'#f6c956':'#ffffff';context.beginPath();context.arc(64,64,42,0,Math.PI*2);context.fill();
    context.shadowBlur=0;context.strokeStyle=complete?'#9b7420':'#3d9279';context.lineWidth=6;context.stroke();
    context.font='52px "Segoe UI Emoji",sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillStyle='#245c4d';context.fillText(label,64,67);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
  }

  private setupGreenhouse(model:THREE.Object3D){
    model.updateMatrixWorld(true);
    const byName=new Map<string,THREE.Object3D>();
    model.traverse(object=>byName.set(object.name,object));
    if(import.meta.env.DEV){
      const rows:{name:string;type:string;parent:string;position:string;bounds:string;materials:string}[]=[];
      model.traverse(object=>{
        const box=new THREE.Box3().setFromObject(object),position=object.getWorldPosition(new THREE.Vector3());
        const mesh=object instanceof THREE.Mesh?object:undefined,materials=mesh?(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(item=>item.name).join(', '):'';
        rows.push({name:object.name,type:object.type,parent:object.parent?.name??'-',position:`${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}`,bounds:box.isEmpty()?'-':`${box.min.toArray().map(value=>value.toFixed(1)).join('/')} → ${box.max.toArray().map(value=>value.toFixed(1)).join('/')}`,materials});
      });
      console.groupCollapsed('[수목원 GLB] 실제 오브젝트 구조');console.table(rows);console.groupEnd();
    }
    for(const definition of greenhousePlants){
      const objects=definition.objectNames.map(name=>byName.get(name)??byName.get(THREE.PropertyBinding.sanitizeNodeName(name))).filter((object):object is THREE.Object3D=>!!object);
      if(!objects.length){console.warn('[수목원 식물 매핑 누락]',definition.id,definition.objectNames);continue}
      const bounds=objects.reduce((box,object)=>box.union(new THREE.Box3().setFromObject(object)),new THREE.Box3());
      const center=bounds.getCenter(new THREE.Vector3());center.y=bounds.max.y+34;
      const marker=new THREE.Sprite(new THREE.SpriteMaterial({map:this.greenhouseMarkerTexture('🍃'),transparent:true,depthTest:false,depthWrite:false}));
      marker.name=`greenhouse-marker-${definition.id}`;marker.position.copy(center);marker.scale.set(58,58,1);marker.visible=false;marker.renderOrder=80;this.scene.add(marker);
      const target:GreenhouseTarget={id:definition.id,objects,bounds,center,marker,kind:'plant'};this.greenhouseTargets.set(definition.id,target);
      objects.forEach(object=>{this.greenhouseObjectIds.set(object,definition.id);object.userData.greenhousePlantId=definition.id});
    }
    const treeObject=byName.get(GREENHOUSE_MEMORY_TREE_OBJECT);
    if(treeObject){
      const bounds=new THREE.Box3().setFromObject(treeObject),center=bounds.getCenter(new THREE.Vector3());center.y=bounds.max.y+46;
      const marker=new THREE.Sprite(new THREE.SpriteMaterial({map:this.greenhouseMarkerTexture('🔒'),transparent:true,depthTest:false,depthWrite:false}));
      marker.name='greenhouse-marker-memory-tree';marker.position.copy(center);marker.scale.set(68,68,1);marker.visible=false;marker.renderOrder=80;this.scene.add(marker);
      const target:GreenhouseTarget={id:'memory-tree',objects:[treeObject],bounds,center,marker,kind:'memory-tree'};this.greenhouseTargets.set(target.id,target);this.greenhouseObjectIds.set(treeObject,target.id);treeObject.userData.greenhousePlantId=target.id;
      const effect=new THREE.Group();effect.position.set(center.x,bounds.min.y+25,center.z);effect.visible=false;
      const positions:number[]=[];for(let index=0;index<42;index++){const angle=index/42*Math.PI*2,radius=55+(index%7)*12;positions.push(Math.cos(angle)*radius,(index%6)*18+12,Math.sin(angle)*radius)}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      const particles=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xffd86b,size:9,transparent:true,opacity:.8,depthWrite:false}));
      const rings=new THREE.Group();
      for(let index=0;index<3;index++){
        const ring=new THREE.Mesh(
          new THREE.TorusGeometry(72+index*25,2.2-index*.35,8,72),
          new THREE.MeshBasicMaterial({color:0xffd86b,transparent:true,opacity:.7-index*.12,depthWrite:false,depthTest:false}),
        );
        ring.rotation.x=Math.PI/2;ring.position.y=4+index*3;ring.visible=false;ring.renderOrder=79;rings.add(ring);
      }
      const light=new THREE.PointLight(0xffd875,2.2,300);light.position.y=90;effect.add(particles,rings,light);effect.userData.particles=particles;effect.userData.rings=rings;effect.userData.light=light;this.scene.add(effect);this.memoryTreeEffect=effect;this.applyMemoryTreeStageVisuals();
    }else console.warn('[수목원 기억나무 매핑 누락]',GREENHOUSE_MEMORY_TREE_OBJECT);
    if(import.meta.env.DEV)console.table([...this.greenhouseTargets.values()].map(target=>({plantId:target.id,kind:target.kind,objects:target.objects.map(object=>object.name).join(', '),worldPosition:target.center.toArray().map(value=>value.toFixed(1)).join(', ')})));
  }

  private greenhouseTargetDistance(target:GreenhouseTarget,x:number,sceneZ:number){
    const nearestX=THREE.MathUtils.clamp(x,target.bounds.min.x,target.bounds.max.x);
    const nearestZ=THREE.MathUtils.clamp(sceneZ,target.bounds.min.z,target.bounds.max.z);
    return Math.hypot(x-nearestX,sceneZ-nearestZ);
  }

  private updateGreenhouseProximity(x:number,z:number){
    if(!this.options.greenhouse)return;
    const sceneZ=this.worldToSceneZ(z);
    const ranked=[...this.greenhouseTargets.values()].map(target=>({target,distance:this.greenhouseTargetDistance(target,x,sceneZ)})).sort((a,b)=>a.distance-b.distance);
    ranked.forEach(({target,distance})=>{target.marker.visible=distance<GREENHOUSE_EXIT_DISTANCE});
    const closest=ranked[0];
    const same=closest?.target===this.greenhouseNearby;
    const next=closest&&closest.distance<(same?GREENHOUSE_EXIT_DISTANCE:GREENHOUSE_OPEN_DISTANCE)?closest.target:undefined;
    if(next!==this.greenhouseNearby){
      this.greenhouseNearby=next;
      gameEvents.emit('greenhouse-nearby-changed',next?{kind:next.kind,plantId:next.kind==='plant'?next.id:undefined,distance:Math.round(closest.distance)}:null);
    }
    ranked.forEach(({target,distance})=>{if(distance>=GREENHOUSE_EXIT_DISTANCE)return;const marker=target.marker,pulse=target===this.greenhouseNearby?1+Math.sin(this.greenhouseClock*4)*.08:1;marker.scale.setScalar((target.kind==='memory-tree'?68:58)*pulse);marker.scale.z=1});
  }

  private applyMemoryTreeStageVisuals(){
    if(!this.memoryTreeEffect)return;
    this.memoryTreeEffect.visible=this.greenhouseTreeStage>0;
    const particles=this.memoryTreeEffect.userData.particles as THREE.Points|undefined;
    const rings=this.memoryTreeEffect.userData.rings as THREE.Group|undefined;
    const particleMaterial=particles?.material as THREE.PointsMaterial|undefined;
    const light=this.memoryTreeEffect.userData.light as THREE.PointLight|undefined;
    const stageColor=this.greenhouseTreeStage===3?0xffffff:this.greenhouseTreeStage===2?0xff8fb7:0xffd86b;
    if(particleMaterial){
      particleMaterial.color.setHex(stageColor);
      particleMaterial.size=this.greenhouseTreeStage===3?15:this.greenhouseTreeStage===2?11:8;
      particleMaterial.opacity=this.greenhouseTreeStage===3?1:this.greenhouseTreeStage===2?.95:.65;
      particleMaterial.blending=this.greenhouseTreeStage===3?THREE.AdditiveBlending:THREE.NormalBlending;
      particleMaterial.needsUpdate=true;
    }
    rings?.children.forEach((ring,index)=>{
      ring.visible=index<this.greenhouseTreeStage;
      const material=(ring as THREE.Mesh).material as THREE.MeshBasicMaterial;
      material.color.setHex(stageColor);
      material.opacity=this.greenhouseTreeStage===3?.95:this.greenhouseTreeStage===2?.72:.5;
      material.blending=this.greenhouseTreeStage===3?THREE.AdditiveBlending:THREE.NormalBlending;
      material.needsUpdate=true;
    });
    if(light){
      light.color.setHex(this.greenhouseTreeStage===3?0xfff4c7:this.greenhouseTreeStage===2?0xff9fc4:0xffd875);
      light.intensity=this.greenhouseTreeStage===3?5:this.greenhouseTreeStage===2?3:1.5;
      light.distance=this.greenhouseTreeStage===3?430:this.greenhouseTreeStage===2?380:260;
    }
  }

  private onGreenhouseProgressChanged=({collectedIds,unlocked,blooming=false,complete=false,count}:{collectedIds:string[];unlocked:boolean;blooming?:boolean;complete?:boolean;count?:number})=>{
    this.greenhouseCollected=new Set(collectedIds);this.greenhouseUnlocked=unlocked;
    const collectedCount=Math.max(count??0,collectedIds.length);
    this.greenhouseTreeStage=collectedCount>=GREENHOUSE_PLANT_TOTAL||complete?3:collectedCount>=7||blooming?2:unlocked?1:0;
    for(const target of this.greenhouseTargets.values()){
      const complete=target.kind==='plant'&&this.greenhouseCollected.has(target.id);
      const treeLabel=this.greenhouseTreeStage===3?'✨':this.greenhouseTreeStage===2?'🌸':this.greenhouseTreeStage===1?'🌱':'🔒';
      const label=target.kind==='memory-tree'?treeLabel:(complete?'✓':'🍃');
      const material=target.marker.material;material.map?.dispose();material.map=this.greenhouseMarkerTexture(label,complete||unlocked);material.needsUpdate=true;
    }
    this.applyMemoryTreeStageVisuals();
  };

  private onGreenhousePointerDown=(event:PointerEvent)=>{
    if(!this.mapReady||this.renderer.domElement.style.display==='none')return;
    const rect=this.renderer.domElement.getBoundingClientRect(),pointer=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
    this.raycaster.setFromCamera(pointer,this.camera);
    const candidates=[...this.greenhouseTargets.values()].flatMap(target=>target.objects);
    const hit=this.raycaster.intersectObjects(candidates,true)[0];if(!hit)return;
    let object:THREE.Object3D|null=hit.object,id:string|undefined;
    while(object&&!id){id=this.greenhouseObjectIds.get(object)??object.userData.greenhousePlantId;object=object.parent}
    const target=id?this.greenhouseTargets.get(id):undefined;
    if(import.meta.env.DEV)console.info('[수목원 클릭]',{mesh:hit.object.name,plantId:id??null,distance:target?Math.round(this.greenhouseTargetDistance(target,this.localX,this.worldToSceneZ(this.localZ))):null});
    if(!target)return;
    const distance=this.greenhouseTargetDistance(target,this.localX,this.worldToSceneZ(this.localZ));
    if(distance>=GREENHOUSE_EXIT_DISTANCE)return;
    gameEvents.emit(target.kind==='plant'?'greenhouse-observe-plant':'greenhouse-observe-tree',target.id);
  };

  setVisible(visible:boolean){
    this.renderer.domElement.style.display=visible?'block':'none';
    if(!visible&&this.guideNearby){this.guideNearby=false;gameEvents.emit('guide-proximity-changed',false)}
    if(!visible&&this.mapSignNearby){this.mapSignNearby=false;gameEvents.emit('map-sign-proximity-changed',false)}
    if(!visible&&this.portalNearby){this.portalNearby=false;this.activePortal=undefined;this.resetPortalCharge();gameEvents.emit('world-portal-proximity-changed',null)}
    if(!visible&&this.interactionNearby){this.interactionNearby=false;this.resetInteractionCharge();gameEvents.emit('world-interaction-proximity-changed',null)}
    if(!visible&&this.lakeExperienceNearby){this.lakeExperienceNearby=undefined;gameEvents.emit('lake-experience-proximity-changed',null)}
    if(!visible&&this.wildlifeClueNearby){this.wildlifeClueNearby=undefined;gameEvents.emit('bear-clue-proximity-changed',null)}
    if(!visible&&this.options.greenhouse){this.greenhouseTargets.forEach(target=>{target.marker.visible=false});this.greenhouseNearby=undefined;gameEvents.emit('greenhouse-nearby-changed',null)}
  }
  setWorldClock(serverNow:number){if(Number.isFinite(serverNow))this.worldClockOffset=serverNow-Date.now()}
  setInteractionPosition(position:WorldInteractionPosition){
    if(!this.options.interaction||position.destination!==this.options.interaction.destination)return;
    if(this.options.interaction.fixedPosition)return;
    this.interactionPosition={x:position.x,z:position.z};
    localStorage.setItem(`${INTERACTION_POSITION_KEY_PREFIX}-${position.destination}`,JSON.stringify(this.interactionPosition));
    this.interactionNearby=false;
    this.resetInteractionCharge();
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
    const ground=this.sampleExperienceGround(position.x,position.z,true)??this.sampleVisibleSurfaceGround(position.x,position.z)??(Number.isFinite(fallbackGround)?{height:fallbackGround!,normal:new THREE.Vector3(0,1,0)}:undefined);
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
    if(!config||config.fixedPosition)return;
    const position:PortalPosition={destination:config.destination,x:Math.round(this.localX),z:Math.round(this.localZ)};
    this.setPortalPosition(position,false);
    if(config.sharedPosition!==false)gameEvents.emit('portal-position-changed',position);
  }
  private onMoveInteractionToPlayer=(requestedDestination?:WorldInteractionPosition['destination'])=>{
    if(!this.mapReady||this.renderer.domElement.style.display==='none'||!this.options.interaction)return;
    if(requestedDestination&&requestedDestination!==this.options.interaction.destination)return;
    const position:WorldInteractionPosition={destination:this.options.interaction.destination,x:Math.round(this.localX),z:Math.round(this.localZ)};
    this.setInteractionPosition(position);
    gameEvents.emit('interaction-position-changed',position);
  }
  setBearTreePortalPositions(positions:BearTreePortalPositions){
    if(this.options.mapName!=='베어트리파크')return;
    localStorage.setItem('bear-tree-park-town-portal-position',JSON.stringify(positions.town));
    localStorage.setItem('bear-photo-zone-portal-position',JSON.stringify(positions.photo));
    if(this.options.portal){
      Object.assign(this.options.portal,positions.town);
      this.portalPosition={...positions.town};
      const ground=this.sampleGround(positions.town.x,positions.town.z,this.localGround,true);
      if(this.portalRoot&&ground){this.portalRoot.position.set(positions.town.x,ground.height,this.worldToSceneZ(positions.town.z));this.portalRoot.userData.groundHeight=ground.height}
    }
    this.bearPhotoPortalPosition={...positions.photo};
    const photoGround=this.sampleExperienceGround(positions.photo.x,positions.photo.z);
    if(this.bearPhotoPortalRoot&&photoGround)this.bearPhotoPortalRoot.position.set(positions.photo.x,photoGround.height+.8,this.worldToSceneZ(positions.photo.z));
    this.render();
  }
  private onBearPhotoEnter=()=>{
    if(!this.mapReady||!this.bearPhotoNearby||!this.bearPhotoDestination||this.bearPhotoMode)return;
    const distance=Math.hypot(this.localX-this.bearPhotoPortalPosition.x,this.localZ-this.bearPhotoPortalPosition.z);
    const directionX=distance>0?(this.localX-this.bearPhotoPortalPosition.x)/distance:0;
    const directionZ=distance>0?(this.localZ-this.bearPhotoPortalPosition.z)/distance:1;
    const returnDistance=PORTAL_EXIT_DISTANCE+16;
    const returnX=this.bearPhotoPortalPosition.x+directionX*returnDistance;
    const returnZ=this.bearPhotoPortalPosition.z+directionZ*returnDistance;
    const returnGround=this.sampleExperienceGround(returnX,returnZ)??{height:this.localGround,normal:this.localNormal};
    this.bearPhotoReturn={x:returnX,z:returnZ,groundHeight:returnGround.height};
    this.pendingTeleport={...this.bearPhotoDestination};
    this.bearPhotoNearby=false;
    this.bearPhotoMode=true;
    gameEvents.emit('bear-photo-proximity-changed',false);
    this.setBearPhotoPresentation(true);
    gameEvents.emit('bear-photo-mode-changed',true);
  }
  private onBearPhotoCapture=()=>{
    if(!this.bearPhotoMode)return;
    this.render();
    this.renderer.domElement.toBlob(blob=>{
      if(!blob)return;
      const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`곰-가족-포토존-${Date.now()}.png`;link.click();
      window.setTimeout(()=>URL.revokeObjectURL(link.href),1000);
    },'image/png');
  }
  private setBearPhotoPresentation(active:boolean){
    if(this.mapModel)this.mapModel.visible=!active;
    if(this.bearPhotoStage)this.bearPhotoStage.visible=true;
    this.localCharacter.setNameplateVisible(!active);
    this.localCharacter.setPhotoPose(active);
    if(this.guideNpc)this.guideNpc.root.visible=!active;
    if(this.residentRoot)this.residentRoot.visible=!active;
    this.remotes.forEach(character=>{character.root.visible=!active});
    if(this.portalRoot)this.portalRoot.visible=!active;
    this.fixedPortalRoots.forEach(root=>root.visible=!active);
    if(this.interactionRoot)this.interactionRoot.visible=!active;
    if(this.bearPhotoPortalRoot)this.bearPhotoPortalRoot.visible=!active;
    this.scene.background=new THREE.Color(active?'#f2dfbd':'#b9d7c2');
  }
  private onBearPhotoExit=()=>{
    if(!this.bearPhotoMode)return;
    if(this.bearPhotoReturn)this.pendingTeleport={...this.bearPhotoReturn};
    this.bearPhotoMode=false;this.setBearPhotoPresentation(false);gameEvents.emit('bear-photo-mode-changed',false);
  }
  setPortalPosition(position:PortalPosition,sharedUpdate=true){
    const standardPortal=this.options.portal?.destination===position.destination?this.options.portal:undefined;
    const fixedPortal=this.options.fixedPortals?.find(config=>config.destination===position.destination);
    if(!standardPortal&&!fixedPortal)return;
    const portalConfig=standardPortal??fixedPortal!;
    if(sharedUpdate&&portalConfig.sharedPosition===false)return;
    const nextPosition=portalConfig.fixedPosition?{x:portalConfig.x,z:portalConfig.z}:{x:position.x,z:position.z};
    if(standardPortal)this.portalPosition=nextPosition;
    if(fixedPortal)Object.assign(fixedPortal,nextPosition);
    localStorage.setItem(portalConfig.positionStorageKey??`${PORTAL_POSITION_KEY_PREFIX}-${position.destination}`,JSON.stringify(nextPosition));
    if(!this.mapReady)return;
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
  private resetInteractionCharge(){
    this.interactionChargeSeconds=0;
    this.interactionTravelTriggered=false;
    gameEvents.emit('interaction-charge-progress',0);
  }

  private portalChargeDuration(portal:PortalConfig){return portal.chargeSeconds??(portal.theme==='blue'?BLUE_PORTAL_CHARGE_SECONDS:PORTAL_CHARGE_SECONDS)}
  private createPortal(config:PortalConfig,groundHeight:number){
    const root=new THREE.Group();
    root.name=`world-portal-${config.destination}`;
    root.position.set(config.x,groundHeight+(config.appearance==='white-circle'?.8:0),this.worldToSceneZ(config.z));
    if(config.appearance==='white-circle'){
      root.rotation.x=-Math.PI/2;
      const color=config.theme==='blue'?0x72b9ff:config.theme==='orange'?0xff8a24:0xffffff;
      const material=(opacity:number)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthTest:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
      const center=new THREE.Mesh(new THREE.CircleGeometry(50,64),material(.1));
      const ring=new THREE.Mesh(new THREE.RingGeometry(45,54,64),material(.98));
      const middleRing=new THREE.Mesh(new THREE.RingGeometry(34,38,64),material(.78));
      const innerRing=new THREE.Mesh(new THREE.RingGeometry(18,22,64),material(.9));
      const pulseRing=new THREE.Mesh(new THREE.RingGeometry(55,59,64),material(.48));
      center.position.z=.2;ring.position.z=.4;middleRing.position.z=.6;innerRing.position.z=.8;pulseRing.position.z=.1;
      for(const object of [center,ring,middleRing,innerRing,pulseRing])object.renderOrder=30;
      root.add(center,ring,middleRing,innerRing,pulseRing);
      root.userData.center=center;root.userData.ring=ring;root.userData.middleRing=middleRing;root.userData.innerRing=innerRing;root.userData.pulseRing=pulseRing;
      root.userData.phase=0;root.userData.appearance='white-circle';root.userData.groundHeight=groundHeight;
      const light=new THREE.PointLight(color,2.2,155);light.position.set(0,0,38);root.add(light);
      root.userData.light=light;
      if(this.options.mapName==='베어트리파크'&&config.destination==='garden'){
        root.userData.natureJourney='garden';
        this.applyNatureJourneyHighlight(root,'garden');
      }
      this.scene.add(root);
      return root;
    }
    const blue=config.theme==='blue',orange=config.theme==='orange',ringColor=blue?0x72b9ff:orange?0xffa13d:0x71e5c2,emissiveColor=blue?0x2688ff:orange?0xff6a00:0x2ad8aa,glowColor=blue?0x79c4ff:orange?0xffbd66:0x74f5d0;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(38,6,12,48),new THREE.MeshStandardMaterial({color:ringColor,emissive:emissiveColor,emissiveIntensity:2.4,metalness:.25,roughness:.28}));
    ring.position.y=49;ring.castShadow=true;
    const glow=new THREE.Mesh(new THREE.CircleGeometry(31,48),new THREE.MeshBasicMaterial({color:glowColor,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));
    glow.position.y=49;glow.position.z=-1;
    const base=new THREE.Mesh(new THREE.CylinderGeometry(43,51,8,40),new THREE.MeshStandardMaterial({color:blue?0x203f66:orange?0x6b3518:0x244f48,emissive:blue?0x235f9e:orange?0xb34b11:0x1e7562,emissiveIntensity:.8,roughness:.42}));
    base.position.y=4;root.add(base,ring,glow);root.userData.glow=glow;root.userData.groundHeight=groundHeight;this.scene.add(root);
    const light=new THREE.PointLight(blue?0x7fc5ff:orange?0xffa347:0x76f5d1,3.2,210);light.position.set(0,52,18);root.add(light);
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
    root.userData.center=center;root.userData.ring=ring;root.userData.middleRing=middleRing;root.userData.innerRing=innerRing;root.userData.pulseRing=pulseRing;root.userData.groundHeight=groundHeight;root.userData.phase=config.id==='wind-hill'?Math.PI:0;root.userData.experienceId=config.id;
    const light=new THREE.PointLight(config.color,2.2,155);light.position.set(0,0,38);root.add(light);
    root.userData.light=light;
    this.scene.add(root);
    this.applyLakeJourneyHighlight(root);
    return root;
  }
  private onLakeBoothCompletionChanged=(completion:Partial<Record<LakeExperienceId,boolean>>)=>{
    this.lakeBoothCompletion=completion;
    this.lakeExperienceRoots.forEach(root=>this.applyLakeJourneyHighlight(root));
  };
  private applyLakeJourneyHighlight(root:THREE.Group){
    const id=root.userData.experienceId as LakeExperienceId;
    const guided=id!=='wind-hill',completed=!!this.lakeBoothCompletion[id];
    const color=new THREE.Color(!guided?0xffffff:completed?0x49c879:0xff8a24);
    const parts=['center','ring','middleRing','innerRing','pulseRing'] as const;
    parts.forEach(key=>{
      const mesh=root.userData[key] as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>|undefined;
      mesh?.material.color.copy(color);
    });
    const light=root.userData.light as THREE.PointLight|undefined;
    if(light){light.color.copy(color);light.intensity=guided?(completed?3.4:5.5):2.2;light.distance=guided?230:155}
    root.userData.journeyActive=guided&&!completed;
  }
  private onNatureChapterProgressChanged=(completion:{bear:boolean;garden:boolean})=>{
    this.natureChapterCompletion=completion;
    if(this.interactionRoot?.userData.natureJourney)this.applyNatureJourneyHighlight(this.interactionRoot,'bear');
    this.fixedPortalRoots.forEach(root=>{
      if(root.userData.natureJourney==='garden')this.applyNatureJourneyHighlight(root,'garden');
    });
  };
  private applyNatureJourneyHighlight(root:THREE.Group,kind:'bear'|'garden'){
    const completed=this.natureChapterCompletion[kind],color=new THREE.Color(completed?0x49c879:0xff8a24);
    const parts=['center','ring','middleRing','innerRing','pulseRing'] as const;
    parts.forEach(key=>{
      const mesh=root.userData[key] as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>|undefined;
      mesh?.material.color.copy(color);
    });
    const light=root.userData.light as THREE.PointLight|undefined;
    if(light){light.color.copy(color);light.intensity=completed?3.4:5.5;light.distance=230}
    root.userData.journeyActive=!completed;
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
    root.userData.center=center;root.userData.ring=ring;root.userData.middleRing=middleRing;root.userData.innerRing=innerRing;root.userData.pulseRing=pulseRing;root.userData.groundHeight=groundHeight;root.userData.phase=Math.PI*.5;
    const light=new THREE.PointLight(0xffffff,2.2,155);light.position.set(0,0,38);root.add(light);
    root.userData.light=light;
    if(this.options.mapName==='베어트리파크'){
      root.userData.natureJourney='bear';
      this.applyNatureJourneyHighlight(root,'bear');
    }
    this.scene.add(root);
    return root;
  }
  private createWildlifeClueLabel(config:WildlifeClueConfig,groundHeight:number,color:THREE.Color){
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=280;
    const context=canvas.getContext('2d')!;
    context.shadowColor='rgba(20,35,19,.28)';context.shadowBlur=24;context.fillStyle='rgba(255,255,248,.97)';
    context.beginPath();context.roundRect(18,18,604,238,78);context.fill();
    context.shadowBlur=0;context.strokeStyle=`#${color.getHexString()}`;context.lineWidth=10;context.stroke();
    context.font='92px "Apple Color Emoji","Noto Color Emoji",sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillText(config.icon,105,137);
    context.fillStyle='#73816d';context.font='900 30px "Noto Sans KR",sans-serif';context.fillText('AI 야생 탐험 흔적',390,97);
    context.fillStyle='#263b29';context.font='900 48px "Noto Sans KR",sans-serif';context.fillText(config.label,390,161);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=textureAnisotropy;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));
    sprite.position.set(config.x,groundHeight+105,this.worldToSceneZ(config.z));sprite.scale.set(190,83,1);sprite.renderOrder=120;sprite.frustumCulled=false;
    this.scene.add(sprite);return sprite;
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
    if(!config.stationary&&gltf.animations.length){this.residentMixer=new THREE.AnimationMixer(visual);this.residentMixer.clipAction(gltf.animations[0]).play()}
  }
  private updateResident(delta:number){
    const root=this.residentRoot,config=this.options.resident;
    if(!root||!config||config.stationary)return;
    this.residentMixer?.update(delta);
    const patrol=config.patrol;
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
    const roots=[...this.lakeExperienceRoots.values(),...this.wildlifeClueRoots.values(),...(this.interactionRoot?[this.interactionRoot]:[]),...(this.bearPhotoPortalRoot?[this.bearPhotoPortalRoot]:[])];
    roots.forEach(root=>{
      const phase=root.userData.phase as number,active=!!root.userData.journeyActive,wave=1+Math.sin(elapsed*(active?3.2:2.15)+phase)*(active ? .075 : .035);
      root.scale.setScalar(wave);
      const center=root.userData.center as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
      const innerRing=root.userData.innerRing as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
      const pulseRing=root.userData.pulseRing as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
      const pulse=(elapsed*.55+phase/(Math.PI*2))%1;
      center.material.opacity=.22+(Math.sin(elapsed*1.8+phase)+1)*.055;
      innerRing.rotation.z=elapsed*.35;
      pulseRing.scale.setScalar(1+pulse*.5);
      pulseRing.material.opacity=(active ? .9 : .5)*(1-pulse);
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
  private sceneToWorldZ(sceneZ:number){return WORLD_HEIGHT/2+(sceneZ-WORLD_HEIGHT/2)*GROUND_PROJECTION}

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

  private groundMeshesAt(worldX:number,worldZ:number){
    const sceneZ=this.worldToSceneZ(worldZ);
    return this.mapMeshes.filter(mesh=>{
      const bounds=this.mapMeshBounds.get(mesh);
      return !bounds||(worldX>=bounds.min.x&&worldX<=bounds.max.x&&sceneZ>=bounds.min.z&&sceneZ<=bounds.max.z);
    });
  }

  private sampleExperienceGround(worldX:number,worldZ:number,preferHighest=false):GroundSample|undefined{
    if(!this.mapMeshes.length)return {height:this.localGround,normal:new THREE.Vector3(0,1,0)};
    this.raycaster.near=0;this.raycaster.far=Infinity;
    this.raycaster.set(new THREE.Vector3(worldX,1200,this.worldToSceneZ(worldZ)),new THREE.Vector3(0,-1,0));
    return this.raycaster.intersectObjects(this.groundMeshesAt(worldX,worldZ),false).flatMap(hit=>{
      if(!hit.face)return [];
      const normal=hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld));
      return normal.y>=MIN_WALKABLE_NORMAL&&!this.blockedMaterials.has(this.materialForHit(hit))?[{height:hit.point.y,normal}]:[];
    }).sort((a,b)=>preferHighest?b.height-a.height:a.height-b.height)[0];
  }

  private sampleGround(worldX:number,worldZ:number,currentHeight:number,initial=false,maxStepHeight=MAX_STEP_HEIGHT):GroundSample|undefined{
    if(!this.mapMeshes.length)return {height:currentHeight,normal:new THREE.Vector3(0,1,0)};
    const offsets=initial?[[0,0],[COLLISION_RADIUS,0],[-COLLISION_RADIUS,0],[0,COLLISION_RADIUS],[0,-COLLISION_RADIUS]]:[[0,0]],samples:GroundSample[]=[];
    for(const [index,[offsetX,offsetZ]] of offsets.entries()){
      this.raycaster.near=0;this.raycaster.far=Infinity;
      this.raycaster.set(new THREE.Vector3(worldX+offsetX,1200,this.worldToSceneZ(worldZ+offsetZ)),new THREE.Vector3(0,-1,0));
      const candidates=this.raycaster.intersectObjects(this.groundMeshesAt(worldX+offsetX,worldZ+offsetZ),false).flatMap(hit=>{
        if(!hit.face)return [];
        const normal=hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld));
        return normal.y>=MIN_WALKABLE_NORMAL&&!this.blockedMaterials.has(this.materialForHit(hit))?[{height:hit.point.y,normal}]:[];
      });
      const viable=initial?candidates.sort((a,b)=>b.height-a.height):candidates.filter(sample=>{const heightDelta=sample.height-currentHeight;return heightDelta<=maxStepHeight&&heightDelta>=-MAX_DROP_HEIGHT}).sort((a,b)=>Math.abs(a.height-currentHeight)-Math.abs(b.height-currentHeight));
      if(!viable.length){if(index===0)return;continue}
      samples.push(viable[0]);
    }
    if(samples.length<(initial?3:1))return;
    const height=Math.max(...samples.map(sample=>sample.height));
    if(samples.some(sample=>Math.abs(sample.height-height)>MAX_STEP_HEIGHT))return;
    const normal=samples.reduce((sum,sample)=>sum.add(sample.normal),new THREE.Vector3()).normalize();
    return {height,normal};
  }

  private sampleVisibleSurfaceGround(worldX:number,worldZ:number):GroundSample|undefined{
    if(!this.mapMeshes.length)return {height:this.localGround,normal:new THREE.Vector3(0,1,0)};
    this.raycaster.near=0;this.raycaster.far=Infinity;
    this.raycaster.set(new THREE.Vector3(worldX,1200,this.worldToSceneZ(worldZ)),new THREE.Vector3(0,-1,0));
    const hit=this.raycaster.intersectObjects(this.groundMeshesAt(worldX,worldZ),false).sort((a,b)=>b.point.y-a.point.y)[0];
    return hit?{height:hit.point.y+.15,normal:new THREE.Vector3(0,1,0)}:undefined;
  }

  private spawnSpaceClear(worldX:number,worldZ:number,groundHeight:number){
    this.raycaster.near=4;this.raycaster.far=(this.options.characterHeight??CHARACTER_HEIGHT)+70;
    this.raycaster.set(new THREE.Vector3(worldX,groundHeight+4,this.worldToSceneZ(worldZ)),new THREE.Vector3(0,1,0));
    return this.raycaster.intersectObjects(this.groundMeshesAt(worldX,worldZ),false).length===0;
  }

  private findSafeSpawn(preferredX:number,preferredZ:number){
    const offsets:Array<[number,number]>=[[0,0]];
    for(const radius of [55,90,130,180]){
      for(let index=0;index<16;index++){
        const angle=index/16*Math.PI*2;
        offsets.push([Math.cos(angle)*radius,Math.sin(angle)*radius]);
      }
    }
    for(const [offsetX,offsetZ] of offsets){
      const x=Math.max(20,Math.min(WORLD_WIDTH-20,preferredX+offsetX));
      const z=Math.max(20,Math.min(WORLD_HEIGHT-20,preferredZ+offsetZ));
      // Choose the walkable surface closest to the map's base level instead of
      // treating a tree canopy or roof as the spawn floor.
      const ground=this.sampleGround(x,z,0,false,1200);
      if(ground&&this.spawnSpaceClear(x,z,ground.height))return {x,z,ground};
    }
    const fallback=this.sampleGround(preferredX,preferredZ,0,true);
    return fallback?{x:preferredX,z:preferredZ,ground:fallback}:undefined;
  }

  private bodyPathClear(worldX:number,worldZ:number){
    if(!this.mapMeshes.length)return true;
    if(this.guideNpc&&Math.hypot(worldX-this.guidePosition.x,worldZ-this.guidePosition.z)<42)return false;
    const start=new THREE.Vector3(this.localX,this.localGround+CHARACTER_GROUND_CLEARANCE+CHARACTER_HEIGHT*.4,this.worldToSceneZ(this.localZ));
    const end=new THREE.Vector3(worldX,start.y,this.worldToSceneZ(worldZ)),direction=end.sub(start),distance=direction.length();
    if(distance<.001)return true;
    const pathBounds=new THREE.Box3().setFromPoints([start,start.clone().add(direction)]).expandByScalar(COLLISION_RADIUS);
    const nearbyMeshes=this.mapMeshes.filter(mesh=>this.mapMeshBounds.get(mesh)?.intersectsBox(pathBounds)??true);
    this.bodyRaycaster.near=2;this.bodyRaycaster.far=distance+COLLISION_RADIUS;
    this.bodyRaycaster.set(start,direction.normalize());
    const blockingHit=this.bodyRaycaster.intersectObjects(nearbyMeshes,false).find(hit=>{
      if(!hit.face)return false;
      const normal=hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld));
      return Math.abs(normal.y)<.55;
    });
    return !blockingHit;
  }

  updateLocalCharacter(proposedX:number,proposedZ:number,yaw:number,motion:MotionState,delta:number,jumpHeight=0){
    if(!this.mapReady)return {x:this.localX,z:this.localZ,groundHeight:this.localGround};
    if(this.pendingTeleport){proposedX=this.pendingTeleport.x;proposedZ=this.pendingTeleport.z;if(this.pendingTeleport.groundHeight!==undefined)this.localGround=this.pendingTeleport.groundHeight;this.pendingTeleport=undefined}
    if(this.bearPhotoMode&&this.bearPhotoDestination){
      proposedX=this.bearPhotoDestination.x;proposedZ=this.bearPhotoDestination.z;this.localGround=this.bearPhotoDestination.groundHeight;yaw=BEAR_PHOTO_CAMERA_YAW;motion='idle';jumpHeight=0;
    }
    this.updateResident(delta);
    this.updateGuideNpc(delta);
    this.updatePortals();
    this.updateLakeExperienceCircles();
    if(this.overviewActive){this.showMapOverview();this.renderAccumulator+=delta;if(this.renderAccumulator>=this.renderInterval){this.renderAccumulator%=this.renderInterval;this.render()}return {x:this.localX,z:this.localZ,groundHeight:this.localGround}}
    const positionChanged=Math.hypot(proposedX-this.localX,proposedZ-this.localZ)>.001;
    // Jumping may clear a low obstacle, but must not make roofs count as
    // reachable ground. A larger downward allowance lets a character already
    // stranded on a roof step back onto the real terrain.
    const canCrossBody=jumpHeight>8,reachableHeight=MAX_STEP_HEIGHT;
    const pathClear=(x:number,z:number)=>canCrossBody||this.options.simplifiedCollision||this.bodyPathClear(x,z);
    let nextX=proposedX,nextZ=proposedZ,sample=positionChanged?(pathClear(nextX,nextZ)?this.sampleGround(nextX,nextZ,this.localGround,false,reachableHeight):undefined):{height:this.localGround,normal:this.localNormal};
    if(!sample){nextZ=this.localZ;sample=pathClear(nextX,nextZ)?this.sampleGround(nextX,nextZ,this.localGround,false,reachableHeight):undefined}
    if(!sample){nextX=this.localX;nextZ=proposedZ;sample=pathClear(nextX,nextZ)?this.sampleGround(nextX,nextZ,this.localGround,false,reachableHeight):undefined}
    if(!sample){nextX=this.localX;nextZ=this.localZ;sample={height:this.localGround,normal:this.localNormal}}
    this.localX=nextX;this.localZ=nextZ;this.localGround=sample.height;this.localNormal.copy(sample.normal);
    if(this.options.bearPhotoZone&&this.bearPhotoDestination){
      const photoPortalDistance=Math.hypot(nextX-this.bearPhotoPortalPosition.x,nextZ-this.bearPhotoPortalPosition.z);
      const nearby=!this.bearPhotoMode&&photoPortalDistance<(this.bearPhotoNearby?PORTAL_EXIT_DISTANCE:PORTAL_OPEN_DISTANCE);
      if(nearby!==this.bearPhotoNearby){this.bearPhotoNearby=nearby;gameEvents.emit('bear-photo-proximity-changed',nearby)}
    }
    if(this.options.wildlifeClues?.length){
      const closest=this.options.wildlifeClues.map(config=>({config,distance:Math.hypot(nextX-config.x,nextZ-config.z)})).sort((a,b)=>a.distance-b.distance)[0];
      const nearby=closest&&closest.distance<(closest.config.id===this.wildlifeClueNearby?INTERACTION_EXIT_DISTANCE:INTERACTION_OPEN_DISTANCE)?closest.config.id:undefined;
      if(nearby!==this.wildlifeClueNearby){this.wildlifeClueNearby=nearby;gameEvents.emit('bear-clue-proximity-changed',nearby??null)}
    }
    if(this.options.greenhouse){
      this.greenhouseClock+=delta;this.updateGreenhouseProximity(nextX,nextZ);
      const particles=this.memoryTreeEffect?.userData.particles as THREE.Points|undefined;if(particles)particles.rotation.y+=delta*(this.greenhouseTreeStage===3?.55:this.greenhouseTreeStage===2?.36:.22);
      const rings=this.memoryTreeEffect?.userData.rings as THREE.Group|undefined;
      if(rings){
        rings.rotation.y+=delta*(this.greenhouseTreeStage===3?.65:.3);
        rings.children.forEach((ring,index)=>{const pulse=1+Math.sin(this.greenhouseClock*(2.4+index*.35)+index)*(.025+this.greenhouseTreeStage*.008);ring.scale.setScalar(pulse)});
      }
    }
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
    const activationDistance=closestPortal?.config.theme==='blue'?PORTAL_OPEN_DISTANCE:(samePortal?PORTAL_EXIT_DISTANCE:PORTAL_OPEN_DISTANCE);
    const activePortal=this.portalEntryArmed&&closestPortal&&closestPortal.distance<activationDistance?closestPortal.config:undefined;
    if(activePortal?.destination!==this.activePortal?.destination){
      this.activePortal=activePortal;
      this.portalNearby=!!activePortal;
      this.resetPortalCharge();
      gameEvents.emit('world-portal-proximity-changed',activePortal?{destination:activePortal.destination,label:activePortal.label,theme:activePortal.theme,chargeSeconds:this.portalChargeDuration(activePortal)}:null);
    }
    if(activePortal&&!this.portalTravelTriggered){
        const chargeDuration=this.portalChargeDuration(activePortal);
        this.portalChargeSeconds+=delta;
        gameEvents.emit('portal-charge-progress',Math.min(1,this.portalChargeSeconds/chargeDuration));
        if(this.portalChargeSeconds>=chargeDuration){
          this.portalTravelTriggered=true;
          gameEvents.emit('travel-to-map',activePortal.destination);
        }
    }
    if(this.options.interaction&&this.interactionPosition){
      const interactionDistance=Math.hypot(nextX-this.interactionPosition.x,nextZ-this.interactionPosition.z);
      const interactionNearby=interactionDistance<(this.interactionNearby?INTERACTION_EXIT_DISTANCE:INTERACTION_OPEN_DISTANCE);
      if(interactionNearby!==this.interactionNearby){
        this.interactionNearby=interactionNearby;
        this.resetInteractionCharge();
        gameEvents.emit('world-interaction-proximity-changed',interactionNearby?this.options.interaction:null);
      }
      const chargeDuration=this.options.interaction.chargeSeconds;
      if(interactionNearby&&chargeDuration&&!this.interactionTravelTriggered){
        this.interactionChargeSeconds+=delta;
        gameEvents.emit('interaction-charge-progress',Math.min(1,this.interactionChargeSeconds/chargeDuration));
        if(this.interactionChargeSeconds>=chargeDuration){
          this.interactionTravelTriggered=true;
          gameEvents.emit('travel-to-map',this.options.interaction.destination);
        }
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
    const groundPosition=new THREE.Vector3(nextX,sample.height+CHARACTER_GROUND_CLEARANCE,this.worldToSceneZ(nextZ));
    const position=groundPosition.clone();position.y+=jumpHeight;
    this.localCharacter.update(position,sample.normal,yaw,motion,delta);
    this.followCharacter(groundPosition,delta);this.adjustQuality(delta);this.renderAccumulator+=delta;if(this.renderAccumulator>=this.renderInterval){this.renderAccumulator%=this.renderInterval;this.render()}
    return {x:nextX,z:nextZ,groundHeight:sample.height};
  }

  updateRemoteCharacter(id:string,name:string,model:CharacterModel,parts:CharacterParts,worldX:number,worldZ:number,yaw:number,motion:MotionState,delta:number,jumpHeight=0){
    let character=this.remotes.get(id);if(!character){character=new WorldCharacter(this.scene,name,model,parts,this.options.characterHeight??CHARACTER_HEIGHT);character.root.visible=!this.bearPhotoMode;this.remotes.set(id,character)}
    const previousGround=this.remoteGrounds.get(id),needsGroundSample=!previousGround||Math.hypot(worldX-previousGround.x,worldZ-previousGround.z)>=4;
    const sampled=needsGroundSample?this.sampleGround(worldX,worldZ,previousGround?.height??0,!previousGround):undefined;
    const ground=sampled?{...sampled,x:worldX,z:worldZ}:previousGround??{height:0,normal:new THREE.Vector3(0,1,0),x:worldX,z:worldZ};
    if(needsGroundSample)this.remoteGrounds.set(id,ground);
    character.update(new THREE.Vector3(worldX,ground.height+CHARACTER_GROUND_CLEARANCE+jumpHeight,this.worldToSceneZ(worldZ)),ground.normal,yaw,motion,delta);
  }

  removeRemoteCharacter(id:string){this.remotes.get(id)?.destroy();this.remotes.delete(id);this.remoteGrounds.delete(id)}

  private followCharacter(position:THREE.Vector3,delta:number,immediate=false){
    if(this.overviewActive){this.showMapOverview();return}
    const target=position.clone();
    target.z-=(this.options.cameraScreenOffsetY??0)/GROUND_PROJECTION;
    if(immediate)this.cameraTarget.copy(target);else this.cameraTarget.lerp(target,1-Math.exp(-5*delta));
    const elevation=THREE.MathUtils.degToRad(this.options.cameraElevationDeg??33);
    const groundProjection=Math.max(.1,Math.sin(elevation));
    let zoom=this.options.cameraZoom??CAMERA_ZOOM;
    if(this.bearPhotoMode)zoom=1.48;
    if(!this.mapBounds.isEmpty()){
      const center=this.mapBounds.getCenter(new THREE.Vector3()),size=this.mapBounds.getSize(new THREE.Vector3());
      // Default maps cover the viewport automatically. Maps with an explicit
      // zoom keep that authored framing; their ground extension fills any
      // terrain outside the original GLB boundary without forcing a zoom-in.
      const coverZoom=Math.max(this.width/Math.max(1,size.x),this.height/Math.max(1,size.z*groundProjection));
      if(this.options.cameraZoom===undefined)zoom=Math.max(zoom,coverZoom*1.015);
      const halfWidth=this.width/(2*zoom),groundHalfDepth=this.height/(2*zoom*groundProjection),minX=this.mapBounds.min.x+halfWidth,maxX=this.mapBounds.max.x-halfWidth,minZ=this.mapBounds.min.z+groundHalfDepth,maxZ=this.mapBounds.max.z-groundHalfDepth;
      this.cameraTarget.x=minX<=maxX?THREE.MathUtils.clamp(this.cameraTarget.x,minX,maxX):center.x;
      this.cameraTarget.z=minZ<=maxZ?THREE.MathUtils.clamp(this.cameraTarget.z,minZ,maxZ):center.z;
    }
    this.camera.left=-this.width/(2*zoom);this.camera.right=this.width/(2*zoom);this.camera.top=this.height/(2*zoom);this.camera.bottom=-this.height/(2*zoom);
    this.camera.position.set(this.cameraTarget.x,this.cameraTarget.y+Math.sin(elevation)*CAMERA_DISTANCE,this.cameraTarget.z+Math.cos(elevation)*CAMERA_DISTANCE);
    this.camera.lookAt(this.cameraTarget);this.camera.updateProjectionMatrix();
  }

  private adjustQuality(delta:number){
    if(delta<=0||delta>.1)return;
    this.qualityElapsed+=delta;this.qualityFrameTime+=delta;this.qualityFrames++;
    if(this.qualityElapsed<2)return;
    const average=this.qualityFrameTime/Math.max(1,this.qualityFrames);
    let next=this.pixelRatio;
    if(average>1/36)next=Math.max(MIN_PIXEL_RATIO,this.pixelRatio-.15);
    else if(average<1/52)next=Math.min(this.options.performanceMode?1:MAX_PIXEL_RATIO,this.pixelRatio+.1);
    if(Math.abs(next-this.pixelRatio)>.01){this.pixelRatio=next;this.renderer.setPixelRatio(this.pixelRatio);this.resize(true)}
    this.qualityElapsed=0;this.qualityFrameTime=0;this.qualityFrames=0;
  }

  private resize(force=false){const width=Math.max(1,this.parent.clientWidth),height=Math.max(1,this.parent.clientHeight);if(!force&&width===this.width&&height===this.height)return;this.width=width;this.height=height;this.renderer.setSize(width,height,false)}
  private render(){this.resize();if(!this.destroyed)this.renderer.render(this.scene,this.camera)}

  destroy(){
    if(this.destroyed)return;
    this.destroyed=true;
    if(this.guideNearby)gameEvents.emit('guide-proximity-changed',false);
    if(this.portalNearby)gameEvents.emit('world-portal-proximity-changed',null);
    if(this.interactionNearby)gameEvents.emit('world-interaction-proximity-changed',null);
    if(this.lakeExperienceNearby)gameEvents.emit('lake-experience-proximity-changed',null);
    if(this.bearPhotoNearby)gameEvents.emit('bear-photo-proximity-changed',false);
    if(this.wildlifeClueNearby)gameEvents.emit('bear-clue-proximity-changed',null);
    if(this.overviewActive)gameEvents.emit('map-overview-changed',false);
    if(this.options.overview)gameEvents.off('map-overview-toggle',this.onMapOverviewToggle);
    if(this.options.portal)gameEvents.off('portal-move-to-player',this.onMovePortalToPlayer);
    if(this.options.interaction)gameEvents.off('interaction-move-to-player',this.onMoveInteractionToPlayer);
    if(this.options.mapName==='베어트리파크')gameEvents.off('nature-chapter-progress-changed',this.onNatureChapterProgressChanged);
    if(this.options.bearPhotoZone)gameEvents.off('bear-photo-enter',this.onBearPhotoEnter);
    if(this.options.bearPhotoZone){gameEvents.off('bear-photo-capture',this.onBearPhotoCapture);gameEvents.off('bear-photo-exit',this.onBearPhotoExit)}
    if(this.options.lakeExperiences){
      gameEvents.off('lake-experience-move-to-player',this.onMoveLakeExperienceToPlayer);
      gameEvents.off('lake-booth-completion-changed',this.onLakeBoothCompletionChanged);
    }
    if(this.options.greenhouse){
      gameEvents.emit('greenhouse-nearby-changed',null);
      gameEvents.off('greenhouse-progress-changed',this.onGreenhouseProgressChanged);
      this.parent.removeEventListener('pointerdown',this.onGreenhousePointerDown);
    }
    this.localCharacter?.destroy();this.guideNpc?.destroy();this.remotes.forEach(character=>character.destroy());this.remotes.clear();this.remoteGrounds.clear();
    this.scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Points){object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(material=>material.dispose())}if(object instanceof THREE.Sprite){object.material.map?.dispose();object.material.dispose()}});
    this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();
  }
}
