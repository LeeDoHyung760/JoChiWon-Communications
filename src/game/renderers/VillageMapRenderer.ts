import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import villageModelUrl from '../../assets/maps/sejong-lake-park.glb?url';
import bearTreeParkModelUrl from '../../assets/maps/new-beartree.glb?url';
import bearPlayZoneModelUrl from '../../assets/maps/park-landscape.glb?url';
import gardenModelUrl from '../../assets/maps/garden.glb?url';
import campusModelUrl from '../../assets/maps/new-campus-floor.glb?url';
import studentHallModelUrl from '../../assets/maps/student-hall.glb?url';
import projectRoomModelUrl from '../../assets/maps/project-room.glb?url';
import governmentModelUrl from '../../assets/maps/sejong-gov.glb?url';
import governmentCentralPlazaModelUrl from '../../assets/maps/government-central-plaza.glb?url';
import observatoryModelUrl from '../../assets/maps/observatory-interior.glb?url';
import sejongSmartCityModelUrl from '../../assets/maps/sejong-smartcity-exhibition.glb?url';
import bearCubModelUrl from '../../assets/characters/bear-cub.glb?url';
import grizzlyBearModelUrl from '../../assets/characters/grizzly-bear.glb?url';
import chungnyeongIdleUrl from '../../assets/characters/chungnyeong_idle.glb?url';
import chungnyeongWalkUrl from '../../assets/characters/chungnyeong_walk.glb?url';
import chungnyeongRunUrl from '../../assets/characters/chungnyeong_run.glb?url';
import girlUrl from '../../assets/characters/girl_metaverse_animated.glb?url';
import boyUrl from '../../assets/characters/boy_metaverse.glb?url';
import clothsUrl from '../../assets/characters/men_total.glb?url';
import womenUrl from '../../assets/characters/women_total.glb?url';
import type { CharacterModel,CharacterParts,UserProfile } from '../../types';
import { FIXED_LAKE_RESPAWN,type BearTreePortalPositions,type CampusFeaturePortalId,type CampusFeaturePortalPosition,type CharacterEmote,type LakeExperienceId,type LakeExperiencePosition,type MapId,type MotionState,type PortalPosition,type WorldInteractionPosition } from '../../../shared/socket-events';
import { gameEvents } from '../events';
import { characterSettings } from '../character/characterSettings';
import { applyColorsToThreeScene } from '../../utils/modelColorizer';
import { greenhousePlants,GREENHOUSE_MEMORY_TREE_OBJECT,GREENHOUSE_PLANT_TOTAL,greenhousePlantIdByObjectName } from '../../data/greenhouse-plants';
import { CAMPUS_FRIEND_NPCS } from '../../data/campusNpc';
import { PROJECT_ROOM_NPC } from '../../data/projectRoomNpc';
import { STUDENT_HALL_NPCS } from '../../data/studentHallNpc';
import { PROJECT_ROOM_INTERACTIONS,type ProjectRoomInteractionId } from '../projectRoomInteractions';
import { GOVERNMENT_CENTRAL_PLAZA_WEB_UI,type GovernmentCentralPlazaWebUiId } from '../governmentCentralPlazaWebUi';

const WORLD_WIDTH=2400;
const WORLD_HEIGHT=1900;
export const PROJECT_ROOM_WORLD_HEIGHT=2250;
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
const MAP_SIGN_OPEN_DISTANCE=78;
const MAP_SIGN_EXIT_DISTANCE=105;
const PORTAL_OPEN_DISTANCE=62;
const PORTAL_EXIT_DISTANCE=78;
const KEY_PORTAL_OPEN_DISTANCE=100;
const KEY_PORTAL_EXIT_DISTANCE=122;
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
const CAMERA_ZOOM=1.28;
export const WORLD_RENDERER_LAYOUT_TOKEN={};
const MIN_PIXEL_RATIO=1;
const MAX_PIXEL_RATIO=Math.min(window.devicePixelRatio||1,1);
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
export const preloadBearTreeParkDownload=()=>preloadWorldMapDownload(bearTreeParkModelUrl,'Bear Tree Park');
export const LAKE_PARK_SPAWN:{x:number;z:number;yaw:number}={...FIXED_LAKE_RESPAWN};
export const BEAR_TREE_PARK_SPAWN:{x:number;z:number;yaw:number}={x:1200,z:1610,yaw:Math.PI};
export const BEAR_PLAY_ZONE_SPAWN:{x:number;z:number;yaw:number}={x:1200,z:1570,yaw:Math.PI};
export const GARDEN_SPAWN:{x:number;z:number;yaw:number}={x:1200,z:1180,yaw:Math.PI};
export const CAMPUS_SPAWN:{x:number;z:number;yaw:number}={x:1200,z:1500,yaw:Math.PI};
export const STUDENT_HALL_SPAWN:{x:number;z:number;yaw:number}={x:1200,z:1510,yaw:Math.PI};
export const PROJECT_ROOM_SPAWN:{x:number;z:number;yaw:number}={x:1200,z:1550,yaw:Math.PI};
export const GOVERNMENT_SPAWN:{x:number;z:number;yaw:number}={x:1200,z:1500,yaw:Math.PI};
export const GOVERNMENT_CENTRAL_PLAZA_SPAWN:{x:number;z:number;yaw:number}={x:1200,z:1530,yaw:0};
export const GOVERNMENT_OBSERVATORY_SPAWN:{x:number;z:number;yaw:number}={x:1200,z:1380,yaw:Math.PI};
export const SEJONG_SMART_CITY_SPAWN:{x:number;z:number;yaw:number}={x:1200,z:1580,yaw:Math.PI};
export const BEAR_TREE_PORTAL_POSITION={x:2122,z:944} as const;
const CAMPUS_PORTAL_POSITION={x:1178,z:122} as const;
const LAKE_PARK_GUIDE={x:2045,z:1138,yaw:-.78} as const;
const LAKE_GUIDE_INTRO_DURATION_MS=2600;
const LAKE_WELCOME_SEEN_KEY='sejong-lake-tutorial-hidden-v1';
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
type LocalNpcConfig={
  id:string;
  nickname:string;
  status:string;
  x:number;
  z:number;
  yaw:number;
  model:CharacterModel;
  appearance:CharacterParts;
  walkSpeed?:number;
  patrol?:readonly {x:number;z:number}[];
};
type LocalNpcState={
  character:WorldCharacter;
  position:THREE.Vector3;
  normal:THREE.Vector3;
  config:LocalNpcConfig;
  x:number;
  z:number;
  ground:number;
  targetIndex:number;
  blockedSeconds:number;
};
type PortalConfig={x:number;z:number;destination:PortalPosition['destination'];label:string;appearance?:'standing'|'white-circle'|'energy-rift';fixedPosition?:boolean;theme?:'mint'|'blue'|'orange';chargeSeconds?:number;sharedPosition?:boolean};
type InteractionConfig={x:number;z:number;destination:WorldInteractionPosition['destination'];label:string;buttonLabel:string;fixedPosition?:boolean;chargeSeconds?:number};
type LakeExperienceConfig={id:LakeExperienceId;x:number;z:number;label:string;description:string;color:number};
type CampusFeaturePortalConfig={id:CampusFeaturePortalId;x:number;z:number;label:string;description:string;color:number};
type ResidentConfig={modelUrl:string;x:number;z:number;height:number;yaw:number;stationary?:boolean;patrol?:readonly {x:number;z:number}[];walkSpeed?:number};
type WildlifeClueConfig={id:'bearA'|'bearB'|'cave'|'food'|'water';x:number;z:number;icon:string;label:string};
type HabitatResourceId=Extract<WildlifeClueConfig['id'],'cave'|'food'|'water'>;
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
  campusFeaturePortals?:CampusFeaturePortalConfig[];
  interaction?:InteractionConfig;
  lakeExperiences?:LakeExperienceConfig[];
  resident?:ResidentConfig;
  residentDecor?:ResidentConfig[];
  wildlifeClues?:WildlifeClueConfig[];
  cameraScreenOffsetY?:number;
  cameraElevationDeg?:number;
  cameraAzimuthDeg?:number;
  cameraZoom?:number;
  perspectiveCamera?:boolean;
  fixedCameraTarget?:boolean;
  centerInWorldCoordinates?:boolean;
  cameraDistance?:number;
  cameraFov?:number;
  cameraTargetHeight?:number;
  cameraFollowBounds?:{minX?:number;maxX?:number;minZ?:number;maxZ?:number};
  characterHeight?:number;
  mapScaleMultiplier?:number;
  groundFillColor?:number;
  greenhouse?:boolean;
  performanceMode?:boolean;
  balancedTextureQuality?:boolean;
  prioritizeGroundTextures?:boolean;
  performancePixelRatio?:number;
  maxPixelRatio?:number;
  toneMappingExposure?:number;
  lightingIntensityMultiplier?:number;
  sceneBackgroundColor?:THREE.ColorRepresentation;
  geometrySimplificationRatio?:number;
  groundGeometrySimplificationRatio?:number;
  groundingShadows?:boolean;
  simplifiedCollision?:boolean;
  collisionExcludePrefixes?:string[];
  hiddenObjectPrefixes?:string[];
  bearPhotoZone?:boolean;
  projectRoomInteractions?:boolean;
  governmentCentralPlazaWebUi?:boolean;
  observatoryTelescopeInteraction?:boolean;
};
export const LAKE_PARK_RENDERER_OPTIONS:WorldMapRendererOptions={modelUrl:villageModelUrl,mapName:'세종호수공원',spawn:LAKE_PARK_SPAWN,guide:true,mapSign:true,overview:true,cameraZoom:1.12,characterHeight:CHARACTER_HEIGHT,performanceMode:true,balancedTextureQuality:true,performancePixelRatio:1.1,portal:{...BEAR_TREE_PORTAL_POSITION,destination:'bear-tree-park',label:'베어트리파크',theme:'blue',chargeSeconds:3},fixedPortals:[{...CAMPUS_PORTAL_POSITION,destination:'campus',label:'공동캠퍼스',theme:'blue',chargeSeconds:3}],lakeExperiences:[{id:'central-plaza',x:1219,z:1462,label:'축제 부스',description:'끌리는 분위기로 축제 취향을 찾아요',color:0xffffff},{id:'activity-zone',x:603,z:452,label:'공연 부스',description:'충녕이와 나의 공연 스타일을 알아봐요',color:0xffffff},{id:'food-shop-zone',x:491,z:1556,label:'먹거리 부스',description:'맛과 공간 선택으로 여행 스타일을 찾아요',color:0xffffff},{id:'wind-hill',x:1908,z:549,label:'세종 추천 코스 게시판',description:'발견한 취향으로 코스를 살펴봐요',color:0xffffff}]};
export const BEAR_TREE_PARK_RENDERER_OPTIONS:WorldMapRendererOptions={modelUrl:bearTreeParkModelUrl,mapName:'베어트리파크',spawn:BEAR_TREE_PARK_SPAWN,portal:{x:980,z:1580,destination:'town',label:'세종호수공원',theme:'blue',fixedPosition:true,chargeSeconds:3,sharedPosition:false},fixedPortals:[{x:682,z:735,destination:'garden',label:'세종수목원',appearance:'white-circle',fixedPosition:true,chargeSeconds:3}],interaction:{x:1616,z:601,destination:'bear-play-zone',label:'AI 탐험 연구소',buttonLabel:'자연 탐험 시작하기',fixedPosition:true,chargeSeconds:3},cameraZoom:1.12,characterHeight:CHARACTER_HEIGHT,groundFillColor:0xead9ad,performanceMode:true,balancedTextureQuality:true,performancePixelRatio:1.1,simplifiedCollision:true,bearPhotoZone:true};
export const BEAR_PLAY_ZONE_RENDERER_OPTIONS:WorldMapRendererOptions={modelUrl:bearPlayZoneModelUrl,mapName:'AI 탐험 연구소',spawn:BEAR_PLAY_ZONE_SPAWN,interaction:{x:1200,z:1650,destination:'bear-tree-park',label:'베어트리파크',buttonLabel:'탐험 마치고 돌아가기',chargeSeconds:3},resident:{modelUrl:bearCubModelUrl,x:1125,z:1435,height:100,yaw:Math.PI,stationary:true},residentDecor:[{modelUrl:grizzlyBearModelUrl,x:1325,z:1410,height:155,yaw:-Math.PI/2,stationary:true}],wildlifeClues:[{id:'bearA',x:1325,z:1410,icon:'🐻',label:'불곰 조사'},{id:'bearB',x:1125,z:1435,icon:'🐻',label:'반달가슴곰 조사'}],cameraZoom:.86,characterHeight:140,groundFillColor:0xead9ad,performanceMode:true,balancedTextureQuality:true,performancePixelRatio:1.1};
export const GARDEN_RENDERER_OPTIONS:WorldMapRendererOptions={
  modelUrl:gardenModelUrl,
  mapName:'수목원',
  spawn:GARDEN_SPAWN,
  cameraZoom:.86,
  characterHeight:140,
  groundFillColor:0xe3ddbc,
  performanceMode:true,
  balancedTextureQuality:true,
  performancePixelRatio:1.1,
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
export const CAMPUS_RENDERER_OPTIONS:WorldMapRendererOptions={
  modelUrl:campusModelUrl,
  mapName:'공동캠퍼스',
  spawn:CAMPUS_SPAWN,
  portal:{x:1120,z:1731,destination:'town',label:'세종호수공원',theme:'blue',chargeSeconds:3},
  campusFeaturePortals:[
    {id:'people',x:881,z:950,label:'학생회관',description:'친구 추천 · 프로필 · 게시판',color:0x56b28c},
    {id:'clubs',x:450,z:882,label:'동아리관',description:'가입 · 단체 채팅 · 활동',color:0xe9a14b},
    {id:'recruit',x:508,z:1382,label:'모집센터',description:'동행 모집 · 참가 신청',color:0x7f8ed8},
    {id:'government',x:1656,z:1501,label:'프로젝트실',description:'코스 만들기 · 프로젝트 생성',color:0xee7b5b},
  ],
  perspectiveCamera:true,
  fixedCameraTarget:false,
  cameraElevationDeg:25,
  cameraDistance:1100,
  cameraFov:42,
  characterHeight:CHARACTER_HEIGHT,
  performanceMode:true,
  balancedTextureQuality:true,
  performancePixelRatio:1,
  geometrySimplificationRatio:.38,
  groundGeometrySimplificationRatio:.78,
  simplifiedCollision:true,
};
export const STUDENT_HALL_RENDERER_OPTIONS:WorldMapRendererOptions={
  modelUrl:studentHallModelUrl,
  mapName:'학생회관',
  spawn:STUDENT_HALL_SPAWN,
  portal:{
    x:1200,
    z:1660,
    destination:'campus',
    label:'공동캠퍼스',
    appearance:'white-circle',
    theme:'mint',
    fixedPosition:true,
    sharedPosition:false,
  },
  fixedPortals:[
    {x:520,z:1040,destination:'project-room',label:'프로젝트실',appearance:'standing',theme:'mint',fixedPosition:true,sharedPosition:false},
    {x:1880,z:1290,destination:'government',label:'정부청사',appearance:'standing',theme:'blue',fixedPosition:true,sharedPosition:false},
  ],
  campusFeaturePortals:[
    {id:'people',x:655,z:520,label:'AI 추천 보드',description:'나와 비슷한 사람을 추천해요',color:0x4fa980},
    {id:'recruit',x:1745,z:520,label:'모집 게시판',description:'함께할 프로젝트를 찾아요',color:0xd8a45b},
    {id:'clubs',x:1810,z:930,label:'동아리관',description:'관심 있는 동아리를 둘러봐요',color:0x68a36f},
  ],
  perspectiveCamera:true,
  fixedCameraTarget:false,
  cameraElevationDeg:25,
  cameraDistance:1250,
  cameraFov:46,
  characterHeight:CHARACTER_HEIGHT,
  groundFillColor:0xd9d4c9,
  groundingShadows:true,
  performanceMode:true,
  balancedTextureQuality:true,
  performancePixelRatio:1,
};
export const PROJECT_ROOM_RENDERER_OPTIONS:WorldMapRendererOptions={
  modelUrl:projectRoomModelUrl,
  mapName:'프로젝트실',
  spawn:PROJECT_ROOM_SPAWN,
  portal:{x:1200,z:2131,destination:'campus',label:'공동캠퍼스',appearance:'energy-rift',theme:'orange',chargeSeconds:3,fixedPosition:true,sharedPosition:false},
  perspectiveCamera:true,
  fixedCameraTarget:false,
  centerInWorldCoordinates:true,
  projectRoomInteractions:true,
  cameraElevationDeg:25,
  cameraDistance:1880,
  cameraFov:46,
  characterHeight:170,
  groundFillColor:0x484945,
  groundingShadows:true,
  performanceMode:true,
  balancedTextureQuality:true,
  performancePixelRatio:1.1,
};
export const GOVERNMENT_RENDERER_OPTIONS:WorldMapRendererOptions={
  modelUrl:governmentModelUrl,
  mapName:'정부청사',
  spawn:GOVERNMENT_SPAWN,
  portal:{x:1120,z:1731,destination:'campus',label:'공동캠퍼스',theme:'orange',fixedPosition:true,sharedPosition:false},
  fixedPortals:[
    {x:720,z:1010,destination:'government-central-plaza',label:'중앙광장 · AI 세종 추천센터',appearance:'standing',theme:'blue',fixedPosition:true,sharedPosition:false},
    {x:1200,z:760,destination:'government-policy-hall',label:'정책 체험관',appearance:'standing',theme:'mint',fixedPosition:true,sharedPosition:false},
    {x:1680,z:1010,destination:'government-observatory',label:'전망대',appearance:'standing',theme:'orange',fixedPosition:true,sharedPosition:false},
    {x:1200,z:1190,destination:'sejong-smart-city',label:'세종 스마트시티 국가시범도시',appearance:'standing',theme:'blue',fixedPosition:true,sharedPosition:false},
  ],
  cameraElevationDeg:38,
  cameraZoom:1.05,
  characterHeight:CHARACTER_HEIGHT,
  performanceMode:true,
  balancedTextureQuality:true,
  performancePixelRatio:1.1,
};
export const GOVERNMENT_CENTRAL_PLAZA_RENDERER_OPTIONS:WorldMapRendererOptions={
  modelUrl:governmentCentralPlazaModelUrl,
  mapName:'중앙광장',
  spawn:GOVERNMENT_CENTRAL_PLAZA_SPAWN,
  portal:{
    x:1200,
    z:1690,
    destination:'government',
    label:'정부청사로 돌아가기',
    appearance:'white-circle',
    theme:'blue',
    fixedPosition:true,
    sharedPosition:false,
  },
  perspectiveCamera:true,
  fixedCameraTarget:false,
  centerInWorldCoordinates:true,
  cameraElevationDeg:28,
  cameraAzimuthDeg:180,
  cameraDistance:1550,
  cameraFov:46,
  characterHeight:150,
  groundFillColor:0xd9d9d5,
  groundingShadows:true,
  performanceMode:false,
  balancedTextureQuality:false,
  prioritizeGroundTextures:true,
  maxPixelRatio:1.75,
  toneMappingExposure:.9,
  lightingIntensityMultiplier:.78,
  sceneBackgroundColor:'#7899aa',
  simplifiedCollision:true,
  cameraFollowBounds:{maxZ:1530},
  governmentCentralPlazaWebUi:true,
};
export const GOVERNMENT_OBSERVATORY_RENDERER_OPTIONS:WorldMapRendererOptions={
  modelUrl:observatoryModelUrl,
  mapName:'전망대',
  spawn:GOVERNMENT_OBSERVATORY_SPAWN,
  portal:{
    x:1200,
    z:1790,
    destination:'government',
    label:'정부청사로 돌아가기',
    appearance:'white-circle',
    theme:'blue',
    fixedPosition:true,
    sharedPosition:false,
  },
  perspectiveCamera:true,
  fixedCameraTarget:false,
  centerInWorldCoordinates:true,
  cameraElevationDeg:25,
  cameraAzimuthDeg:0,
  cameraDistance:1880,
  cameraFov:46,
  characterHeight:170,
  groundingShadows:true,
  performanceMode:true,
  balancedTextureQuality:true,
  performancePixelRatio:1,
  simplifiedCollision:true,
  collisionExcludePrefixes:['Roof_','Ceiling_'],
  hiddenObjectPrefixes:['Rear_','Entry_'],
  cameraFollowBounds:{minX:900,maxX:1500,minZ:900,maxZ:1380},
  observatoryTelescopeInteraction:true,
};
export const SEJONG_SMART_CITY_RENDERER_OPTIONS:WorldMapRendererOptions={
  modelUrl:sejongSmartCityModelUrl,
  mapName:'세종 스마트시티 국가시범도시',
  spawn:SEJONG_SMART_CITY_SPAWN,
  portal:{
    x:1200,
    z:1690,
    destination:'government',
    label:'정부청사로 돌아가기',
    appearance:'white-circle',
    theme:'blue',
    chargeSeconds:3,
    fixedPosition:true,
    sharedPosition:false,
  },
  perspectiveCamera:true,
  fixedCameraTarget:false,
  centerInWorldCoordinates:true,
  cameraElevationDeg:27,
  cameraAzimuthDeg:180,
  cameraDistance:1650,
  cameraFov:46,
  characterHeight:150,
  groundFillColor:0x686969,
  groundingShadows:true,
  performanceMode:true,
  balancedTextureQuality:true,
  performancePixelRatio:1,
  simplifiedCollision:true,
};
type LoadedModel=Awaited<ReturnType<GLTFLoader['loadAsync']>>;
const modelAssetCache=new Map<string,Promise<LoadedModel>>();
const loadModel=(url:string)=>{
  let pending=modelAssetCache.get(url);
  if(!pending){
    pending=new GLTFLoader().loadAsync(url).catch(error=>{
      modelAssetCache.delete(url);
      throw error;
    });
    modelAssetCache.set(url,pending);
  }
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

function sharpenObjectTextures(object:THREE.Object3D,reduced=false,balanced=false){
  object.traverse(child=>{
    if(!(child instanceof THREE.Mesh))return;
    const materials=Array.isArray(child.material)?child.material:[child.material];
    materials.forEach(material=>{
      for(const value of Object.values(material)){
        if(value instanceof THREE.Texture){
          value.anisotropy=reduced&&!balanced?2:Math.min(balanced?4:textureAnisotropy,textureAnisotropy);
          value.magFilter=THREE.LinearFilter;
          value.minFilter=reduced&&!balanced?THREE.LinearFilter:THREE.LinearMipmapLinearFilter;
          value.generateMipmaps=!reduced||balanced;
          value.needsUpdate=true;
        }
      }
    });
  });
}

function prioritizeGroundTextureQuality(object:THREE.Object3D){
  const candidates:{mesh:THREE.Mesh;footprint:number;flatness:number}[]=[];
  object.updateMatrixWorld(true);
  object.traverse(child=>{
    if(!(child instanceof THREE.Mesh))return;
    const size=new THREE.Box3().setFromObject(child).getSize(new THREE.Vector3());
    candidates.push({mesh:child,footprint:size.x*size.z,flatness:size.y/Math.max(1,size.x,size.z)});
  });
  const ground=candidates.filter(candidate=>candidate.flatness<.16).sort((a,b)=>b.footprint-a.footprint)[0]?.mesh;
  if(!ground)return;
  object.traverse(child=>{
    if(!(child instanceof THREE.Mesh))return;
    const materials=Array.isArray(child.material)?child.material:[child.material];
    materials.forEach(material=>{
      const standard=material as THREE.MeshStandardMaterial;
      if(child===ground){
        for(const value of Object.values(material)){
          if(!(value instanceof THREE.Texture))continue;
          value.anisotropy=textureAnisotropy;
          value.magFilter=THREE.LinearFilter;
          value.minFilter=THREE.LinearMipmapLinearFilter;
          value.generateMipmaps=true;
          value.needsUpdate=true;
        }
      }else{
        // Keep every authored building map so lighting and color stay intact.
        // Lower anisotropy only affects fine detail at oblique angles.
        for(const value of Object.values(material)){
          if(!(value instanceof THREE.Texture))continue;
          value.anisotropy=2;
          value.minFilter=THREE.LinearMipmapLinearFilter;
          value.needsUpdate=true;
        }
        standard.needsUpdate=true;
      }
    });
  });
}

function largestFlatMesh(object:THREE.Object3D){
  const candidates:{mesh:THREE.Mesh;footprint:number;flatness:number}[]=[];
  object.updateMatrixWorld(true);
  object.traverse(child=>{
    if(!(child instanceof THREE.Mesh))return;
    const size=new THREE.Box3().setFromObject(child).getSize(new THREE.Vector3());
    candidates.push({mesh:child,footprint:size.x*size.z,flatness:size.y/Math.max(1,size.x,size.z)});
  });
  return candidates.filter(candidate=>candidate.flatness<.16).sort((a,b)=>b.footprint-a.footprint)[0]?.mesh;
}

async function simplifyMapGeometry(object:THREE.Object3D,ratio:number,groundRatio=ratio){
  const {MeshoptSimplifier}=await import('meshoptimizer');
  await MeshoptSimplifier.ready;
  const meshes:THREE.Mesh[]=[];
  object.updateMatrixWorld(true);
  object.traverse(child=>{if(child instanceof THREE.Mesh)meshes.push(child)});
  const ground=largestFlatMesh(object);
  let before=0,after=0;
  for(const mesh of meshes){
    const geometry=mesh.geometry,index=geometry.index,position=geometry.getAttribute('position');
    if(!index||!position||position.itemSize!==3||position instanceof THREE.InterleavedBufferAttribute)continue;
    const sourceIndices=Uint32Array.from(index.array as ArrayLike<number>);
    const sourcePositions=position.array instanceof Float32Array?position.array:Float32Array.from(position.array as ArrayLike<number>);
    const targetRatio=mesh===ground?groundRatio:ratio;
    if(targetRatio>=.999)continue;
    const targetCount=Math.max(3,Math.floor(sourceIndices.length*targetRatio/3)*3);
    const [simplified]=MeshoptSimplifier.simplify(sourceIndices,sourcePositions,3,targetCount,.01,['LockBorder']);
    before+=sourceIndices.length/3;after+=simplified.length/3;
    geometry.setIndex(new THREE.BufferAttribute(simplified,1));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }
  if(import.meta.env.DEV)console.info('[map geometry simplified]',{before,after,reduction:before?Math.round((1-after/before)*100):0});
}

function savedMapSignPosition(){
  return {...DEFAULT_MAP_SIGN_POSITION};
}

function savedPortalPosition(config:PortalConfig){
  return {x:config.x,z:config.z};
}

function savedInteractionPosition(config:InteractionConfig){
  return {x:config.x,z:config.z};
}

function savedLakeExperiencePosition(config:LakeExperienceConfig){
  return {x:config.x,z:config.z};
}

function savedCampusFeaturePortalPosition(config:CampusFeaturePortalConfig){
  return {...config};
}

const modelConfig:Record<Exclude<CharacterModel,'custom'>,{urls:Record<MotionState,string>;clips:Record<MotionState,string>}>= {
  chungnyeong:{urls:{idle:chungnyeongIdleUrl,walk:chungnyeongWalkUrl,run:chungnyeongRunUrl},clips:{idle:'NlaTrack',walk:'NlaTrack',run:'NlaTrack'}},
  girl1:{urls:{idle:girlUrl,walk:girlUrl,run:girlUrl},clips:{idle:'NlaTrack.002',walk:'NlaTrack.001',run:'NlaTrack'}},
  boy1:{urls:{idle:boyUrl,walk:boyUrl,run:boyUrl},clips:{idle:'NlaTrack',walk:'NlaTrack.002',run:'NlaTrack.001'}},
  cloths:{urls:{idle:clothsUrl,walk:clothsUrl,run:clothsUrl},clips:{idle:'standing',walk:'walking',run:'walking'}},
  women:{urls:{idle:womenUrl,walk:womenUrl,run:womenUrl},clips:{idle:'standing',walk:'walking',run:'running'}}
};
const FEMALE_MOTION_DURATION:Record<'walk'|'run',number>={walk:2.375,run:1.292};
const motionDurationByModel:Partial<Record<Exclude<CharacterModel,'custom'>,Record<'walk'|'run',number>>>={
  cloths:{walk:1.167,run:1.167},
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
    const hipsPosition=name.endsWith('hips.position')||name.includes('bones[hips].position');
    if(!rootPosition&&!hipsPosition)return;
    const values=track.values;
    if(values.length<3)return;
    const firstX=values[0],firstZ=values[2];
    const lastX=values[values.length-3],lastZ=values[values.length-1];
    // The extended models store forward locomotion on mixamorigHips instead
    // of a conventional root bone. Letting that translation loop makes the
    // mesh jump backward at the end of every walk cycle. Preserve vertical
    // hip motion for the gait, but remove only meaningful horizontal drift.
    if(hipsPosition&&Math.hypot(lastX-firstX,lastZ-firstZ)<.05)return;
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
  private emoteActions=new Map<CharacterEmote,THREE.AnimationAction>();
  private activeEmote?:CharacterEmote;
  private activeEmoteLoop=false;
  private active:MotionState='idle';
  private photoAction?:THREE.AnimationAction;
  private photoPoseActive=false;
  private targetQuaternion=new THREE.Quaternion();
  private tiltQuaternion=new THREE.Quaternion();
  private turnQuaternion=new THREE.Quaternion();
  private upVector=new THREE.Vector3(0,1,0);
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
        action?.play();this.root.add(visual);this.states.set('idle',{scene:visual,mixer,action});if(mixer)this.registerExtendedEmotes(gltf,mixer);this.setMotion('idle');return;
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
        this.registerExtendedEmotes(gltf,mixer);
        if(model==='women'||model==='cloths'){
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

  private registerExtendedEmotes(gltf:LoadedModel,mixer:THREE.AnimationMixer){
    if(this.model!=='cloths'&&this.model!=='women')return;
    const names:Record<CharacterEmote,string[]>={
      hi:['hi'],
      clapping:['clapping'],
      talking:this.model==='cloths'?['Talking','talking']:['talking','Talking'],
    };
    (Object.keys(names) as CharacterEmote[]).forEach(emote=>{
      const source=names[emote].map(name=>THREE.AnimationClip.findByName(gltf.animations,name)).find(Boolean);
      if(source)this.emoteActions.set(emote,mixer.clipAction(inPlaceCharacterClip(source)));
    });
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

  setMotion(motion:MotionState,fadeDuration=.12){
    this.active=motion;
    if(this.activeEmote)return;
    const activeState=this.states.get(motion),scenes=new Set([...this.states.values()].map(state=>state.scene));
    scenes.forEach(scene=>{scene.visible=scene===activeState?.scene});
    this.states.forEach((state,key)=>{if(key===motion){state.action?.reset().setEffectiveTimeScale(femaleMatchedWorldTimeScale(this.model as Exclude<CharacterModel,'custom'>,motion)).fadeIn(fadeDuration).play()}else state.action?.fadeOut(fadeDuration)});
  }

  playEmote(emote:CharacterEmote,loop=false){
    const action=this.emoteActions.get(emote);
    if(!action)return false;
    if(this.activeEmote===emote&&this.activeEmoteLoop===loop)return true;
    this.states.forEach(state=>state.action?.fadeOut(.12));
    this.emoteActions.forEach(other=>other.fadeOut(.12));
    action.reset().setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1).fadeIn(.12).play();
    action.clampWhenFinished=!loop;
    this.activeEmote=emote;this.activeEmoteLoop=loop;
    return true;
  }

  stopEmote(){
    if(!this.activeEmote)return;
    this.emoteActions.get(this.activeEmote)?.fadeOut(.34);
    this.activeEmote=undefined;this.activeEmoteLoop=false;
    this.setMotion('idle',.34);
  }

  update(position:THREE.Vector3,normal:THREE.Vector3,yaw:number,motion:MotionState,delta:number){
    if(!this.photoPoseActive&&!this.activeEmote&&motion!==this.active)this.setMotion(motion);
    this.root.position.copy(position);
    this.tiltQuaternion.setFromUnitVectors(this.upVector,normal);
    this.turnQuaternion.setFromAxisAngle(normal,yaw);
    this.targetQuaternion.copy(this.turnQuaternion).multiply(this.tiltQuaternion);
    this.root.quaternion.slerp(this.targetQuaternion,1-Math.exp(-12*delta));
    this.states.get(this.active)?.mixer?.update(delta);
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
  private camera:THREE.OrthographicCamera|THREE.PerspectiveCamera;
  private parent:HTMLElement;
  private width=1;
  private height=1;
  private destroyed=false;
  private mapReady=false;
  private inputLocked=false;
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
  private localNpcs:LocalNpcState[]=[];
  private localNpcNearbyId?:string;
  private focusedLocalNpcId?:string;
  private talkingLocalNpcId?:string;
  private lastLocalNpcScreenPublish=0;
  private guidePosition:GuidePosition={...LAKE_PARK_GUIDE};
  private guideGround=0;
  private worldClockOffset=0;
  private guideNearby=false;
  private guideIntroActive=false;
  private guideIntroStartedAt=0;
  private guideIntroArrived=false;
  private guideIntroStart:{x:number;z:number}={x:LAKE_PARK_GUIDE.x,z:LAKE_PARK_GUIDE.z};
  private guideIntroEnd:{x:number;z:number}={x:LAKE_PARK_SPAWN.x+55,z:LAKE_PARK_SPAWN.z-12};
  private mapSignNearby=false;
  private portalNearby=false;
  private portalEntryArmed=true;
  private portalChargeSeconds=0;
  private portalTravelTriggered=false;
  private interactionNearby=false;
  private interactionEntryArmed=true;
  private interactionChargeSeconds=0;
  private interactionTravelTriggered=false;
  private interactionPosition?:{x:number;z:number};
  private interactionRoot?:THREE.Group;
  private lakeExperienceNearby?:LakeExperienceId;
  private lakeBoothCompletion:Partial<Record<LakeExperienceId,boolean>>={};
  private lakeExperiencePositions=new Map<LakeExperienceId,{x:number;z:number}>();
  private lakeExperienceRoots=new Map<LakeExperienceId,THREE.Group>();
  private campusFeaturePortalRoots=new Map<CampusFeaturePortalId,THREE.Group>();
  private campusFeaturePortalNearby?:CampusFeaturePortalId;
  private projectRoomInteractionNearby?:ProjectRoomInteractionId;
  private projectRoomInteractionOutlines=new Map<ProjectRoomInteractionId,THREE.Box3Helper>();
  private projectRoomInteractionPositions=new Map<ProjectRoomInteractionId,{x:number;z:number;radius:number}>();
  private projectRoomScreenTextures:THREE.CanvasTexture[]=[];
  private projectRoomHologram?:THREE.Group;
  private projectRoomFocus?:ProjectRoomInteractionId;
  private projectRoomKioskView?:{target:THREE.Vector3;camera:THREE.Vector3};
  private projectRoomKioskTransition?:{target:THREE.Vector3;camera:THREE.Vector3;fov:number;elapsed:number};
  private projectRoomKioskScreen?:THREE.Mesh;
  private lastProjectRoomKioskScreenRect?:{left:number;top:number;width:number;height:number};
  private governmentWebUiNearby?:GovernmentCentralPlazaWebUiId;
  private governmentWebUiActive?:GovernmentCentralPlazaWebUiId;
  private governmentWebUiScreens=new Map<GovernmentCentralPlazaWebUiId,THREE.Mesh>();
  private governmentWebUiPositions=new Map<GovernmentCentralPlazaWebUiId,{x:number;z:number;radius:number}>();
  private governmentWebUiViews=new Map<GovernmentCentralPlazaWebUiId,{target:THREE.Vector3;camera:THREE.Vector3;fov:number}>();
  private governmentWebUiOutlines=new Map<GovernmentCentralPlazaWebUiId,THREE.Box3Helper>();
  private governmentWebUiTextures:THREE.CanvasTexture[]=[];
  private governmentWebUiTransition?:{target:THREE.Vector3;camera:THREE.Vector3;fov:number;elapsed:number};
  private lastGovernmentWebUiRect?:{left:number;top:number;width:number;height:number};
  private observatoryTelescopeNearby=false;
  private observatoryTelescopeActive=false;
  private observatoryTelescopePosition?:{x:number;z:number;radius:number};
  private observatoryTelescopeView?:{target:THREE.Vector3;camera:THREE.Vector3};
  private observatoryTelescopeTransition?:{target:THREE.Vector3;camera:THREE.Vector3;fov:number;elapsed:number};
  private observatoryTelescopeOutline?:THREE.Box3Helper;
  private natureChapterCompletion={bear:false,garden:false,photo:false};
  private portalRoot?:THREE.Group;
  private fixedPortalRoots:THREE.Group[]=[];
  private activePortal?:PortalConfig;
  private residentRoot?:THREE.Group;
  private residentDecorRoots:THREE.Group[]=[];
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
  private pendingHabitatResource?:HabitatResourceId;
  private localRenderPosition=new THREE.Vector3();
  private remoteRenderPosition=new THREE.Vector3();
  private followTarget=new THREE.Vector3();
  private boundsCenter=new THREE.Vector3();

  constructor(parent:HTMLElement,profile:UserProfile,private options:WorldMapRendererOptions=LAKE_PARK_RENDERER_OPTIONS){
    options=this.options={...options,wildlifeClues:options.wildlifeClues?.map(config=>({...config}))};
    this.pixelRatio=Math.max(MIN_PIXEL_RATIO,Math.min(window.devicePixelRatio||1,options.maxPixelRatio??MAX_PIXEL_RATIO));
    this.camera=options.perspectiveCamera
      ?new THREE.PerspectiveCamera(options.cameraFov??42,1,.1,5000)
      :new THREE.OrthographicCamera();
    this.parent=parent;
    this.guideIntroActive=!!options.guide&&localStorage.getItem(LAKE_WELCOME_SEEN_KEY)!=='true';
    if(options.performanceMode){this.pixelRatio=Math.min(MAX_PIXEL_RATIO,Math.max(MIN_PIXEL_RATIO,options.performancePixelRatio??1));this.renderInterval=1/30}
    this.localX=options.spawn.x;
    this.localZ=options.spawn.z;
    this.portalPosition=options.portal?savedPortalPosition(options.portal):undefined;
    if(this.portalPosition&&Math.hypot(options.spawn.x-this.portalPosition.x,options.spawn.z-this.portalPosition.z)<PORTAL_EXIT_DISTANCE)this.portalEntryArmed=false;
    this.interactionPosition=options.interaction?savedInteractionPosition(options.interaction):undefined;
    if(this.interactionPosition&&Math.hypot(options.spawn.x-this.interactionPosition.x,options.spawn.z-this.interactionPosition.z)<INTERACTION_EXIT_DISTANCE)this.interactionEntryArmed=false;
    options.lakeExperiences?.forEach(config=>this.lakeExperiencePositions.set(config.id,savedLakeExperiencePosition(config)));
    this.cameraTarget=new THREE.Vector3(options.spawn.x,0,this.worldToSceneZ(options.spawn.z));
    this.renderer=new THREE.WebGLRenderer({antialias:!options.performanceMode,alpha:false,powerPreference:'high-performance'});
    this.renderer.domElement.className='village-map-canvas';
    textureAnisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled=!options.performanceMode||!!options.groundingShadows;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    if(options.groundingShadows){
      this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure=options.toneMappingExposure??1.04;
    }
    this.renderer.sortObjects=true;
    this.scene.background=new THREE.Color(options.sceneBackgroundColor??'#b9d7c2');
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
    const lightingMultiplier=options.lightingIntensityMultiplier??1;
    this.scene.add(new THREE.HemisphereLight(options.groundingShadows?0xffffff:0xf4fbff,options.groundingShadows?0x82947f:0x617760,(options.groundingShadows?1.48:1.8)*lightingMultiplier));
    const sun=new THREE.DirectionalLight(0xfff4dc,(options.groundingShadows?2.3:3.1)*lightingMultiplier);
    const shadowSize=options.groundingShadows?1024:512;
    sun.position.set(1900,1400,1850);sun.target.position.set(WORLD_WIDTH/2,0,WORLD_HEIGHT/2);sun.castShadow=true;sun.shadow.mapSize.set(shadowSize,shadowSize);sun.shadow.camera.near=10;sun.shadow.camera.far=4000;
    sun.shadow.camera.left=-1300;sun.shadow.camera.right=1300;sun.shadow.camera.top=1100;sun.shadow.camera.bottom=-1100;sun.shadow.bias=-.00015;
    if(options.groundingShadows){sun.shadow.normalBias=.65;sun.shadow.radius=2}
    this.scene.add(sun,sun.target);
    this.camera.up.set(0,1,0);this.camera.near=.1;this.camera.far=5000;
    parent.prepend(this.renderer.domElement);
    this.resize();
    this.localCharacter=new WorldCharacter(this.scene,profile.nickname,profile.model,profile.character,options.characterHeight??CHARACTER_HEIGHT);
    if(options.overview)gameEvents.on('map-overview-toggle',this.onMapOverviewToggle);
    if(options.mapName==='베어트리파크')gameEvents.on('nature-chapter-progress-changed',this.onNatureChapterProgressChanged);
    if(options.bearPhotoZone)gameEvents.on('bear-photo-enter',this.onBearPhotoEnter);
    if(options.bearPhotoZone){gameEvents.on('bear-photo-capture',this.onBearPhotoCapture);gameEvents.on('bear-photo-exit',this.onBearPhotoExit)}
    if(options.lakeExperiences){
      gameEvents.on('lake-booth-completion-changed',this.onLakeBoothCompletionChanged);
    }
    if(options.greenhouse){
      this.parent.addEventListener('pointerdown',this.onGreenhousePointerDown);
      gameEvents.on('greenhouse-progress-changed',this.onGreenhouseProgressChanged);
    }
    if(options.wildlifeClues){
      gameEvents.on('habitat-resource-position-set',this.onHabitatResourcePositionSet);
      gameEvents.on('habitat-resource-position-place',this.onHabitatResourcePositionPlace);
      gameEvents.on('habitat-resource-placement-arm',this.onHabitatResourcePlacementArm);
    }
    if(options.campusFeaturePortals){
      gameEvents.on('campus-building-fast-travel',this.onCampusBuildingFastTravel);
    }
    gameEvents.on('game-input-lock',this.onGameInputLock);
    gameEvents.on('local-npc-encounter-focus',this.onLocalNpcEncounterFocus);
    gameEvents.on('local-npc-talking',this.onLocalNpcTalking);
    if(options.projectRoomInteractions)gameEvents.on('project-room-focus-changed',this.onProjectRoomFocusChanged);
    if(options.projectRoomInteractions)gameEvents.on('project-room-kiosk-activate',this.enterProjectRoomKiosk);
    if(options.projectRoomInteractions)window.addEventListener('pointerdown',this.onProjectRoomKioskPointerDown,true);
    if(options.governmentCentralPlazaWebUi)gameEvents.on('government-webui-open',this.enterGovernmentWebUi);
    if(options.governmentCentralPlazaWebUi)gameEvents.on('government-webui-close',this.exitGovernmentWebUi);
    if(options.observatoryTelescopeInteraction)gameEvents.on('observatory-telescope-enter',this.enterObservatoryTelescope);
    if(options.observatoryTelescopeInteraction)gameEvents.on('observatory-telescope-exit',this.exitObservatoryTelescope);
    window.addEventListener('keydown',this.onWorldPortalKeyDown);
    this.ready=this.loadVillage();
  }

  private async loadVillage(){
    try{
      const gltf=await loadModel(this.options.modelUrl);
      if(this.destroyed)return;
      // Cached GLTF scenes are mutable. Always transform a fresh clone so a
      // renderer recreated after HMR or navigation cannot scale the map twice.
      const model=cloneSkeleton(gltf.scene);model.updateMatrixWorld(true);
      if(this.options.geometrySimplificationRatio)await simplifyMapGeometry(model,this.options.geometrySimplificationRatio,this.options.groundGeometrySimplificationRatio);
      sharpenObjectTextures(model,this.options.performanceMode,this.options.balancedTextureQuality);
      if(this.options.prioritizeGroundTextures)prioritizeGroundTextureQuality(model);
      const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
      const scale=Math.min((WORLD_WIDTH-180)/size.x,(WORLD_HEIGHT-120)/size.z)*(this.options.mapScaleMultiplier??1),depthScale=scale/GROUND_PROJECTION;
      const mapCenterZ=this.options.centerInWorldCoordinates?WORLD_HEIGHT/(2*GROUND_PROJECTION):WORLD_HEIGHT/2;
      model.position.set(WORLD_WIDTH/2-center.x*scale,-bounds.min.y*scale,mapCenterZ-center.z*depthScale);model.scale.set(scale,scale,depthScale);
      model.updateMatrixWorld(true);
      this.mapBounds.setFromObject(model);
      const groundMesh=this.options.groundingShadows?largestFlatMesh(model):undefined;
      model.traverse(object=>{if(object instanceof THREE.Mesh){const hidden=this.options.hiddenObjectPrefixes?.some(prefix=>object.name.startsWith(prefix));if(hidden)object.visible=false;object.castShadow=!hidden&&(this.options.groundingShadows?object!==groundMesh:false);object.receiveShadow=this.options.groundingShadows||!this.options.performanceMode;const collisionExcluded=this.options.collisionExcludePrefixes?.some(prefix=>object.name.startsWith(prefix));if(!collisionExcluded&&!hidden){this.mapMeshes.push(object);this.mapMeshBounds.set(object,new THREE.Box3().setFromObject(object))}}});
      if(this.mapMeshes.length>1)this.mapMeshes.forEach(mesh=>{const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];materials.forEach(material=>this.classifyMaterial(material))});
      this.scene.add(model);
      this.mapModel=model;
      if(this.options.projectRoomInteractions){
        this.setupProjectRoomScreens(model);
        this.setupProjectRoomHologram(model);
        this.setupProjectRoomInteractionOutlines(model);
      }
      if(this.options.governmentCentralPlazaWebUi)this.setupGovernmentWebUi(model);
      if(this.options.observatoryTelescopeInteraction)this.setupObservatoryTelescope(model);
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
          this.bearPhotoPortalRoot.userData.natureJourney='photo';
          this.applyNatureJourneyHighlight(this.bearPhotoPortalRoot,'photo');
        }
      }
      if(this.options.greenhouse)this.setupGreenhouse(model);
      const safeSpawn=this.findSafeSpawn(this.localX,this.localZ);
      if(safeSpawn){
        this.localX=safeSpawn.x;this.localZ=safeSpawn.z;
        this.localGround=safeSpawn.ground.height;this.localNormal.copy(safeSpawn.ground.normal);
      }
      if(this.options.guide){
        if(this.guideIntroActive){
          const endX=THREE.MathUtils.clamp(this.localX+55,35,WORLD_WIDTH-35),endZ=THREE.MathUtils.clamp(this.localZ-12,35,WORLD_HEIGHT-35);
          const startX=THREE.MathUtils.clamp(this.localX+175,35,WORLD_WIDTH-35),startZ=THREE.MathUtils.clamp(this.localZ-42,35,WORLD_HEIGHT-35);
          const safeEnd=this.findSafeSpawn(endX,endZ),safeStart=this.findSafeSpawn(startX,startZ);
          this.guideIntroEnd=safeEnd?{x:safeEnd.x,z:safeEnd.z}:{x:endX,z:endZ};
          this.guideIntroStart=safeStart?{x:safeStart.x,z:safeStart.z}:{x:startX,z:startZ};
        }
        const initialGuide=this.guideIntroActive
          ?{...this.guideIntroStart,yaw:Math.atan2(this.guideIntroEnd.x-this.guideIntroStart.x,this.guideIntroEnd.z-this.guideIntroStart.z),motion:'walk' as const}
          :guidePatrolFrame(Date.now()+this.worldClockOffset);
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
      const localNpcConfigs:readonly LocalNpcConfig[]=this.options.mapName==='공동캠퍼스'
        ?CAMPUS_FRIEND_NPCS
        :this.options.mapName==='학생회관'
          ?STUDENT_HALL_NPCS
        :this.options.mapName==='프로젝트실'
          ?[PROJECT_ROOM_NPC]
          :[];
      if(localNpcConfigs.length){
        localNpcConfigs.forEach(npc=>{
          const safeSpawn=this.findSafeSpawn(npc.x,npc.z);
          if(!safeSpawn)return;
          const position=new THREE.Vector3(safeSpawn.x,safeSpawn.ground.height+CHARACTER_GROUND_CLEARANCE,this.worldToSceneZ(safeSpawn.z));
          const normal=safeSpawn.ground.normal.clone();
          const character=new WorldCharacter(
            this.scene,
            `${npc.nickname} · ${this.options.mapName} NPC`,
            npc.model,
            npc.appearance,
            this.options.characterHeight??CHARACTER_HEIGHT,
            !npc.patrol?.length,
          );
          character.update(position,normal,npc.yaw,'idle',0);
          this.localNpcs.push({
            character,
            position,
            normal,
            config:npc,
            x:safeSpawn.x,
            z:safeSpawn.z,
            ground:safeSpawn.ground.height,
            targetIndex:npc.patrol?.length&&Math.hypot(safeSpawn.x-npc.patrol[0].x,safeSpawn.z-npc.patrol[0].z)<25?1:0,
            blockedSeconds:0,
          });
        });
      }
      if(this.options.portal&&this.portalPosition){
        const portalGround=this.sampleExperienceGround(this.portalPosition.x,this.portalPosition.z,true)
          ??this.sampleVisibleSurfaceGround(this.portalPosition.x,this.portalPosition.z)
          ??this.sampleGround(this.portalPosition.x,this.portalPosition.z,0,true);
        this.portalRoot=this.createPortal({...this.options.portal,...this.portalPosition},portalGround?.height??this.localGround);
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
      this.options.campusFeaturePortals?.forEach((original,index)=>{
        const config=savedCampusFeaturePortalPosition(original);
        Object.assign(original,{x:config.x,z:config.z});
        const ground=this.sampleExperienceGround(config.x,config.z,true)??this.sampleVisibleSurfaceGround(config.x,config.z)??this.sampleGround(config.x,config.z,0,true);
        this.campusFeaturePortalRoots.set(config.id,this.createCampusFeaturePortal(config,ground?.height??0,index));
      });
      this.options.wildlifeClues?.forEach((config,index)=>{
        const groundHeight=(this.sampleExperienceGround(config.x,config.z,true)
          ??this.sampleVisibleSurfaceGround(config.x,config.z))?.height
          ??this.localGround;
        const root=this.createInteractionCircle(config,groundHeight);
        root.name=`bear-wildlife-clue-${config.id}`;root.userData.phase=index*Math.PI*.66;root.userData.journeyActive=true;
        const colors=[0xd79b4a,0xc77b4f,0x8c7a65,0x78a665,0x5d9daf];
        const color=new THREE.Color(colors[index%colors.length]);
        for(const key of ['center','ring','middleRing','innerRing','pulseRing'] as const){
          const mesh=root.userData[key] as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
          mesh.material.color.copy(color);
        }
        const light=root.userData.light as THREE.PointLight;light.color.copy(color);light.intensity=4.8;light.distance=210;
        root.userData.clueLabel=this.createWildlifeClueLabel(config,groundHeight,color);
        this.wildlifeClueRoots.set(config.id,root);
      });
      const residentReady=this.options.resident?this.createResident(this.options.resident):Promise.resolve();
      const residentDecorReady=Promise.all((this.options.residentDecor??[]).map((config,index)=>this.createResidentDecor(config,index)));
      const startPosition=new THREE.Vector3(this.localX,this.localGround+CHARACTER_GROUND_CLEARANCE,this.worldToSceneZ(this.localZ));
      this.localCharacter.update(startPosition,this.localNormal,this.options.spawn.yaw,'idle',0);
      await Promise.all([this.localCharacter.ready,this.guideNpc?.ready,...this.localNpcs.map(npc=>npc.character.ready),residentReady,residentDecorReady]);
      if(this.destroyed)return;
      this.followCharacter(startPosition,0,true);
      const restoreVisibility=[this.localCharacter.showAllForWarmup(),this.guideNpc?.showAllForWarmup(),...this.localNpcs.map(npc=>npc.character.showAllForWarmup())].filter((restore):restore is ()=>void=>!!restore);
      try{
        await this.renderer.compileAsync(this.scene,this.camera);
      }catch{
        this.renderer.compile(this.scene,this.camera);
      }finally{
        restoreVisibility.forEach(restore=>restore());
      }
      if(this.destroyed)return;
      this.mapReady=true;
      if(this.guideIntroActive)this.guideIntroStartedAt=performance.now();
      this.render();
      console.log(`[${this.options.mapName} world] unified 3D scene ready`,{meshes:this.mapMeshes.length,scale});
    }catch(error){
      console.error(`[${this.options.mapName} world] GLB load error`,error);
      throw error;
    }
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
    if(visible)this.render();
    if(!visible&&this.guideNearby){this.guideNearby=false;gameEvents.emit('guide-proximity-changed',false)}
    if(!visible&&this.mapSignNearby){this.mapSignNearby=false;gameEvents.emit('map-sign-proximity-changed',false)}
    if(!visible&&this.portalNearby){this.portalNearby=false;this.activePortal=undefined;this.resetPortalCharge();gameEvents.emit('world-portal-proximity-changed',null)}
    if(!visible&&this.interactionNearby){this.interactionNearby=false;this.resetInteractionCharge();gameEvents.emit('world-interaction-proximity-changed',null)}
    if(!visible&&this.campusFeaturePortalNearby){this.campusFeaturePortalNearby=undefined;gameEvents.emit('campus-feature-portal-proximity-changed',null)}
    if(!visible&&this.projectRoomInteractionNearby){this.projectRoomInteractionNearby=undefined;this.projectRoomInteractionOutlines.forEach(outline=>{outline.visible=false});gameEvents.emit('project-room-interaction-proximity-changed',null)}
    if(!visible&&this.governmentWebUiNearby){this.governmentWebUiNearby=undefined;this.governmentWebUiOutlines.forEach(outline=>{outline.visible=false});gameEvents.emit('government-webui-proximity-changed',null)}
    if(!visible&&this.governmentWebUiActive)this.exitGovernmentWebUi();
    if(!visible&&this.observatoryTelescopeNearby){this.observatoryTelescopeNearby=false;if(this.observatoryTelescopeOutline)this.observatoryTelescopeOutline.visible=false;gameEvents.emit('observatory-telescope-proximity-changed',false)}
    if(!visible&&this.observatoryTelescopeActive)this.exitObservatoryTelescope();
    if(!visible&&this.lakeExperienceNearby){this.lakeExperienceNearby=undefined;gameEvents.emit('lake-experience-proximity-changed',null)}
    if(!visible&&this.wildlifeClueNearby){this.wildlifeClueNearby=undefined;gameEvents.emit('bear-clue-proximity-changed',null)}
    if(!visible&&this.options.greenhouse){this.greenhouseTargets.forEach(target=>{target.marker.visible=false});this.greenhouseNearby=undefined;gameEvents.emit('greenhouse-nearby-changed',null)}
    if(!visible&&this.localNpcNearbyId){this.localNpcNearbyId=undefined;gameEvents.emit('local-npc-proximity-changed',null);gameEvents.emit('local-npc-screen-position',null)}
  }
  setWorldClock(serverNow:number){if(Number.isFinite(serverNow))this.worldClockOffset=serverNow-Date.now()}
  setInteractionPosition(_position:WorldInteractionPosition){/* Authored position is fixed. */}
  setLakeExperiencePosition(_position:LakeExperiencePosition,_fallbackGround?:number){/* Authored position is fixed. */}
  setBearTreePortalPositions(_positions:BearTreePortalPositions){/* Authored positions are fixed. */}
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
    gameEvents.emit('bear-photo-captured');
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
    this.residentDecorRoots.forEach(root=>{root.visible=!active});
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
  setCampusFeaturePortalPosition(position:CampusFeaturePortalPosition){
    const config=this.options.campusFeaturePortals?.find(item=>item.id===position.portal);
    if(!config)return;
    // The four verified campus coordinates are fixed in CAMPUS_RENDERER_OPTIONS.
  }
  setPortalPosition(_position:PortalPosition,_sharedUpdate=true){/* Authored position is fixed. */}
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

  private createWorldPortalLabel(label:string,showInteractionKey:boolean){
    const canvas=document.createElement('canvas');canvas.width=720;canvas.height=180;
    const context=canvas.getContext('2d')!;
    context.shadowColor='rgba(20,51,44,.28)';context.shadowBlur=22;
    context.fillStyle='rgba(20,51,44,.94)';context.beginPath();context.roundRect(18,18,684,144,34);context.fill();
    context.shadowBlur=0;context.strokeStyle='#ffffff';context.lineWidth=5;context.stroke();
    context.textAlign='center';context.fillStyle='#ffffff';context.font='900 46px "Noto Sans KR",sans-serif';
    context.fillText(label,360,showInteractionKey?77:105);
    if(showInteractionKey){
      context.fillStyle='#bfe9db';context.font='800 27px "Noto Sans KR",sans-serif';context.fillText('E  포탈 들어가기',360,126);
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=textureAnisotropy;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));
    const compact=this.options.mapName==='베어트리파크'||['세종호수공원','공동캠퍼스','베어트리파크','공연 부스','먹거리 부스','축제 부스','세종 추천 코스 게시판'].includes(label);
    sprite.scale.set(compact?125:250,compact?31:62,1);sprite.renderOrder=120;sprite.frustumCulled=false;
    return sprite;
  }
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
      const label=this.createWorldPortalLabel(config.label,!config.chargeSeconds);
      label.position.set(0,0,112);root.add(label);root.userData.label=label;
      if(this.options.mapName==='베어트리파크'&&config.destination==='garden'){
        root.userData.natureJourney='garden';
        this.applyNatureJourneyHighlight(root,'garden');
      }
      this.scene.add(root);
      return root;
    }
    if(config.appearance==='energy-rift'){
      root.userData.appearance='energy-rift';
      root.userData.groundHeight=groundHeight;

      const additiveMaterial=(color:number,opacity:number)=>new THREE.MeshBasicMaterial({
        color,
        transparent:true,
        opacity,
        depthWrite:false,
        side:THREE.DoubleSide,
        blending:THREE.AdditiveBlending,
        toneMapped:false,
      });
      const portalMaterial=new THREE.ShaderMaterial({
        transparent:true,
        depthWrite:false,
        side:THREE.DoubleSide,
        blending:THREE.AdditiveBlending,
        toneMapped:false,
        uniforms:{uTime:{value:0}},
        vertexShader:`
          varying vec2 vUv;
          void main(){
            vUv=uv;
            gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
          }
        `,
        fragmentShader:`
          uniform float uTime;
          varying vec2 vUv;
          void main(){
            vec2 p=(vUv-.5)*2.;
            float radius=length(p);
            float angle=atan(p.y,p.x);
            float edge=1.-smoothstep(.76,1.,radius);
            float core=1.-smoothstep(.02,.72,radius);
            float spiral=.5+.5*sin(angle*7.-radius*18.+uTime*2.8);
            float ripple=.5+.5*sin(radius*42.-uTime*4.2);
            vec3 deep=vec3(.035,.10,.34);
            vec3 cyan=vec3(.08,.88,1.);
            vec3 violet=vec3(.58,.18,1.);
            vec3 color=mix(deep,mix(violet,cyan,spiral),.46+core*.54);
            color+=cyan*ripple*.18*edge;
            float alpha=edge*(.72+spiral*.2)+core*.16;
            gl_FragColor=vec4(color,alpha);
          }
        `,
      });

      const surface=new THREE.Mesh(new THREE.CircleGeometry(36,96),portalMaterial);
      surface.position.y=58;
      surface.scale.y=1.42;
      surface.position.z=-1.5;
      surface.renderOrder=36;
      root.add(surface);

      const frame=new THREE.Group();
      frame.position.y=58;
      const outerRing=new THREE.Mesh(new THREE.TorusGeometry(39,3.7,16,96),additiveMaterial(0x69efff,.92));
      outerRing.scale.y=1.42;
      const middleRing=new THREE.Mesh(new THREE.TorusGeometry(35.8,1.2,10,96),additiveMaterial(0xa970ff,.84));
      middleRing.scale.y=1.42;
      middleRing.position.z=1.4;
      const innerRing=new THREE.Mesh(new THREE.TorusGeometry(33,0.65,8,96),additiveMaterial(0xffffff,.75));
      innerRing.scale.y=1.42;
      innerRing.position.z=2.3;
      frame.add(outerRing,middleRing,innerRing);
      root.add(frame);

      const shards=new THREE.Group();
      const shardGeometry=new THREE.OctahedronGeometry(1.65,0);
      for(let index=0;index<18;index++){
        const angle=index/18*Math.PI*2;
        const radius=47+(index%3)*3.2;
        const shard=new THREE.Mesh(shardGeometry,additiveMaterial(index%2?0x67ecff:0xb06cff,.82));
        shard.position.set(Math.cos(angle)*radius,58+Math.sin(angle)*radius*1.42,(index%4-1.5)*2.2);
        shard.scale.setScalar(.75+(index%5)*.18);
        shard.rotation.set(angle*.7,angle,angle*1.4);
        shards.add(shard);
      }
      root.add(shards);

      const motes=new THREE.Group();
      const moteGeometry=new THREE.SphereGeometry(1.05,8,6);
      for(let index=0;index<24;index++){
        const angle=index/24*Math.PI*2;
        const mote=new THREE.Mesh(moteGeometry,additiveMaterial(index%3===0?0xffffff:0x66eaff,.72));
        const radius=23+(index%6)*5;
        mote.position.set(Math.cos(angle)*radius,58+Math.sin(angle)*radius*1.38,(index%5-2)*1.8);
        mote.scale.setScalar(.45+(index%4)*.18);
        mote.userData.angle=angle;
        mote.userData.radius=radius;
        mote.userData.speed=.18+(index%5)*.025;
        motes.add(mote);
      }
      root.add(motes);

      const pedestal=new THREE.Group();
      const base=new THREE.Mesh(
        new THREE.CylinderGeometry(49,56,7,64),
        new THREE.MeshStandardMaterial({color:0x151b38,emissive:0x33217b,emissiveIntensity:1.15,metalness:.68,roughness:.26}),
      );
      base.position.y=3.5;
      const baseRing=new THREE.Mesh(new THREE.TorusGeometry(44,2.1,10,64),additiveMaterial(0x68eaff,.88));
      baseRing.rotation.x=Math.PI/2;
      baseRing.position.y=7.2;
      const floorGlow=new THREE.Mesh(new THREE.CircleGeometry(62,64),additiveMaterial(0x6546ff,.18));
      floorGlow.rotation.x=-Math.PI/2;
      floorGlow.position.y=.35;
      pedestal.add(base,baseRing,floorGlow);
      root.add(pedestal);

      const light=new THREE.PointLight(0x6f9dff,5.4,260);
      light.position.set(0,58,22);
      root.add(light);
      const groundLight=new THREE.PointLight(0x8d4fff,2.8,170);
      groundLight.position.set(0,12,8);
      root.add(groundLight);

      const label=this.createWorldPortalLabel(config.label,!config.chargeSeconds);
      label.position.set(0,132,0);
      root.add(label);
      root.userData.label=label;
      root.userData.surface=surface;
      root.userData.portalMaterial=portalMaterial;
      root.userData.frame=frame;
      root.userData.outerRing=outerRing;
      root.userData.middleRing=middleRing;
      root.userData.innerRing=innerRing;
      root.userData.shards=shards;
      root.userData.motes=motes;
      root.userData.baseRing=baseRing;
      root.userData.floorGlow=floorGlow;
      root.userData.light=light;
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
    const label=this.createWorldPortalLabel(config.label,!config.chargeSeconds);
    if(config.destination==='campus')label.position.set(0,62,85);
    else label.position.set(0,118,0);
    root.add(label);root.userData.label=label;
    return root;
  }
  private createCampusFeaturePortal(config:CampusFeaturePortalConfig,groundHeight:number,index:number){
    const root=new THREE.Group();
    root.name=`campus-feature-portal-${config.id}`;
    root.position.set(config.x,groundHeight+.8,this.worldToSceneZ(config.z));
    const circle=new THREE.Group();circle.rotation.x=-Math.PI/2;
    const material=(color:number,opacity:number)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthTest:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    const center=new THREE.Mesh(new THREE.CircleGeometry(55,64),material(config.color,.12));
    const ring=new THREE.Mesh(new THREE.RingGeometry(47,56,64),material(config.color,.98));
    const middleRing=new THREE.Mesh(new THREE.RingGeometry(34,39,64),material(0xffffff,.82));
    const innerRing=new THREE.Mesh(new THREE.RingGeometry(19,24,64),material(config.color,.94));
    const pulseRing=new THREE.Mesh(new THREE.RingGeometry(58,62,64),material(config.color,.5));
    center.position.z=.2;ring.position.z=.4;middleRing.position.z=.6;innerRing.position.z=.8;pulseRing.position.z=.1;
    for(const object of [center,ring,middleRing,innerRing,pulseRing])object.renderOrder=30;
    circle.add(center,ring,middleRing,innerRing,pulseRing);root.add(circle);
    root.userData.center=center;root.userData.ring=ring;root.userData.middleRing=middleRing;root.userData.innerRing=innerRing;root.userData.pulseRing=pulseRing;root.userData.groundHeight=groundHeight;root.userData.phase=index*Math.PI*.5;root.userData.featurePortalId=config.id;
    const light=new THREE.PointLight(config.color,2.4,170);light.position.set(0,34,0);root.add(light);root.userData.light=light;
    const canvas=document.createElement('canvas');canvas.width=720;canvas.height=180;
    const context=canvas.getContext('2d')!;
    context.fillStyle='rgba(20,51,44,.92)';context.beginPath();context.roundRect(18,18,684,144,34);context.fill();
    context.strokeStyle='#ffffff';context.lineWidth=5;context.stroke();
    context.textAlign='center';context.fillStyle='#ffffff';context.font='900 46px "Noto Sans KR",sans-serif';context.fillText(config.label,360,77);
    context.fillStyle='#bfe9db';context.font='800 27px "Noto Sans KR",sans-serif';context.fillText(config.description,360,126);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=textureAnisotropy;
    const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));
    label.position.set(0,105,0);label.scale.set(250,62,1);label.renderOrder=60;root.add(label);root.userData.label=label;
    this.scene.add(root);
    return root;
  }
  private onWorldPortalKeyDown=(event:KeyboardEvent)=>{
    const focused=document.activeElement as HTMLElement|null;
    if(this.observatoryTelescopeActive&&event.key==='Escape'){
      event.preventDefault();
      this.exitObservatoryTelescope();
      return;
    }
    if(this.governmentWebUiActive&&event.key==='Escape'){
      event.preventDefault();
      this.exitGovernmentWebUi();
      return;
    }
    if(this.projectRoomFocus==='project-kiosk'&&event.key==='Escape'){
      event.preventDefault();
      this.exitProjectRoomKiosk();
      return;
    }
    if(event.repeat||this.inputLocked||this.renderer.domElement.style.display==='none'||this.overviewActive||this.bearPhotoMode||(focused&&['INPUT','TEXTAREA','SELECT'].includes(focused.tagName)))return;
    if((event.code==='KeyT'||event.key.toLowerCase()==='t')&&this.pendingHabitatResource){
      event.preventDefault();
      this.onHabitatResourcePositionPlace(this.pendingHabitatResource);
      return;
    }
    if(event.code!=='KeyE')return;
    if(this.observatoryTelescopeNearby){
      event.preventDefault();
      this.enterObservatoryTelescope();
      return;
    }
    if(this.projectRoomInteractionNearby){
      event.preventDefault();
      if(this.projectRoomInteractionNearby==='project-kiosk'){
        this.enterProjectRoomKiosk();
        return;
      }
      gameEvents.emit('project-room-interaction-open',this.projectRoomInteractionNearby);
      return;
    }
    if(this.governmentWebUiNearby){
      event.preventDefault();
      this.enterGovernmentWebUi(this.governmentWebUiNearby);
      return;
    }
    const keyPortal=this.activePortal&&!this.activePortal.chargeSeconds
      ?this.activePortal
      :[
        ...(this.options.portal&&this.portalPosition?[{...this.options.portal,...this.portalPosition}]:[]),
        ...(this.options.fixedPortals??[]),
      ].filter(config=>!config.chargeSeconds)
        .map(config=>({config,distance:Math.hypot(this.localX-config.x,this.localZ-config.z)}))
        .sort((a,b)=>a.distance-b.distance)
        .find(candidate=>candidate.distance<KEY_PORTAL_OPEN_DISTANCE)?.config;
    if(this.portalEntryArmed&&keyPortal){
      event.preventDefault();gameEvents.emit('travel-to-map',keyPortal.destination);return;
    }
    if(this.interactionNearby&&this.options.interaction&&!this.options.interaction.chargeSeconds){
      event.preventDefault();gameEvents.emit('travel-to-map',this.options.interaction.destination);
      return;
    }
    if(this.campusFeaturePortalNearby){
      event.preventDefault();
      if(this.campusFeaturePortalNearby==='people'&&this.options.mapName!=='학생회관')gameEvents.emit('travel-to-map','student-hall');
      else if(this.campusFeaturePortalNearby==='government')gameEvents.emit('travel-to-map','project-room');
      else gameEvents.emit('campus-hub-open',this.campusFeaturePortalNearby);
    }
  };
  private onGameInputLock=(locked:boolean)=>{this.inputLocked=locked};
  private onLocalNpcEncounterFocus=(id:string|null)=>{this.focusedLocalNpcId=id??undefined};
  private onLocalNpcTalking=(id:string|null)=>{this.talkingLocalNpcId=id??undefined};
  private onProjectRoomFocusChanged=(focus?:ProjectRoomInteractionId)=>{
    const wasKiosk=this.projectRoomFocus==='project-kiosk';
    this.projectRoomFocus=focus;
    if(wasKiosk&&focus!=='project-kiosk'){
      this.projectRoomKioskTransition=undefined;
      this.setProjectRoomCharactersVisible(true);
      this.renderer.domElement.style.cursor='';
      this.lastProjectRoomKioskScreenRect=undefined;
      gameEvents.emit('project-room-kiosk-screen-rect',null);
      gameEvents.emit('project-room-kiosk-mode-changed',false);
    }
  };
  private setProjectRoomCharactersVisible(visible:boolean){
    this.localCharacter.root.visible=visible;
    if(this.guideNpc)this.guideNpc.root.visible=visible;
    this.localNpcs.forEach(npc=>{npc.character.root.visible=visible});
    this.remotes.forEach(character=>{character.root.visible=visible});
  }
  private enterProjectRoomKiosk=()=>{
    this.projectRoomFocus='project-kiosk';
    this.setProjectRoomCharactersVisible(false);
    this.renderer.domElement.style.cursor='pointer';
    this.projectRoomKioskTransition={
      target:this.cameraTarget.clone(),
      camera:this.camera.position.clone(),
      fov:this.camera instanceof THREE.PerspectiveCamera?this.camera.fov:35,
      elapsed:0,
    };
    gameEvents.emit('project-room-kiosk-mode-changed',true);
  };
  private exitProjectRoomKiosk=()=>{
    if(this.projectRoomFocus!=='project-kiosk')return;
    this.projectRoomFocus=undefined;
    this.projectRoomKioskTransition=undefined;
    this.setProjectRoomCharactersVisible(true);
    this.renderer.domElement.style.cursor='';
    this.lastProjectRoomKioskScreenRect=undefined;
    gameEvents.emit('project-room-kiosk-screen-rect',null);
    gameEvents.emit('project-room-kiosk-mode-changed',false);
  };
  private projectedMeshScreenRect(mesh:THREE.Mesh){
    mesh.geometry.computeBoundingBox();
    const bounds=mesh.geometry.boundingBox;
    if(!bounds)return undefined;
    mesh.updateWorldMatrix(true,false);
    const canvasBounds=this.renderer.domElement.getBoundingClientRect();
    const corners=[
      [bounds.min.x,bounds.min.y,bounds.min.z],
      [bounds.min.x,bounds.max.y,bounds.min.z],
      [bounds.max.x,bounds.min.y,bounds.min.z],
      [bounds.max.x,bounds.max.y,bounds.min.z],
      [bounds.min.x,bounds.min.y,bounds.max.z],
      [bounds.min.x,bounds.max.y,bounds.max.z],
      [bounds.max.x,bounds.min.y,bounds.max.z],
      [bounds.max.x,bounds.max.y,bounds.max.z],
    ].map(([x,y,z])=>new THREE.Vector3(x,y,z).applyMatrix4(mesh.matrixWorld).project(this.camera));
    const left=canvasBounds.left+(Math.min(...corners.map(point=>point.x))+1)*.5*canvasBounds.width;
    const right=canvasBounds.left+(Math.max(...corners.map(point=>point.x))+1)*.5*canvasBounds.width;
    const top=canvasBounds.top+(1-Math.max(...corners.map(point=>point.y)))*.5*canvasBounds.height;
    const bottom=canvasBounds.top+(1-Math.min(...corners.map(point=>point.y)))*.5*canvasBounds.height;
    return {left,top,width:right-left,height:bottom-top};
  }
  private projectedMeshScreenQuad(mesh:THREE.Mesh){
    mesh.geometry.computeBoundingBox();
    const bounds=mesh.geometry.boundingBox;
    if(!bounds)return undefined;
    mesh.updateWorldMatrix(true,false);
    const canvasBounds=this.renderer.domElement.getBoundingClientRect();
    const toScreen=(point:THREE.Vector3)=>{
      point.applyMatrix4(mesh.matrixWorld).project(this.camera);
      return {x:canvasBounds.left+(point.x+1)*.5*canvasBounds.width,y:canvasBounds.top+(1-point.y)*.5*canvasBounds.height};
    };
    const points=[
      toScreen(new THREE.Vector3(bounds.min.x,bounds.min.y,0)),
      toScreen(new THREE.Vector3(bounds.max.x,bounds.min.y,0)),
      toScreen(new THREE.Vector3(bounds.max.x,bounds.max.y,0)),
      toScreen(new THREE.Vector3(bounds.min.x,bounds.max.y,0)),
    ].sort((a,b)=>a.y-b.y);
    const top=points.slice(0,2).sort((a,b)=>a.x-b.x),bottom=points.slice(2).sort((a,b)=>a.x-b.x);
    return [top[0],top[1],bottom[1],bottom[0]] as const;
  }
  private getProjectRoomKioskScreenRect(){
    if(!this.projectRoomKioskScreen)return undefined;
    return this.projectedMeshScreenRect(this.projectRoomKioskScreen);
  }
  private syncProjectRoomKioskScreenRect(){
    const rect=this.getProjectRoomKioskScreenRect();
    if(!rect)return;
    const previous=this.lastProjectRoomKioskScreenRect;
    if(previous&&Math.abs(previous.left-rect.left)<.75&&Math.abs(previous.top-rect.top)<.75&&Math.abs(previous.width-rect.width)<.75&&Math.abs(previous.height-rect.height)<.75)return;
    this.lastProjectRoomKioskScreenRect=rect;
    gameEvents.emit('project-room-kiosk-screen-rect',rect);
  }
  private onProjectRoomKioskPointerDown=(event:PointerEvent)=>{
    if(this.projectRoomFocus!=='project-kiosk'||!this.projectRoomKioskScreen)return;
    if(event.target instanceof Element&&event.target.closest('.project-room-panel.is-creation'))return;
    const rect=this.getProjectRoomKioskScreenRect();
    if(!rect||event.clientX<rect.left||event.clientX>rect.left+rect.width||event.clientY<rect.top||event.clientY>rect.top+rect.height)return;
    event.preventDefault();
    event.stopPropagation();
    const x=(event.clientX-rect.left)/Math.max(1,rect.width)*512;
    const y=(event.clientY-rect.top)/Math.max(1,rect.height)*900;
    if(x>420&&y<115){this.exitProjectRoomKiosk();return}
    if(y>=250&&y<=400){gameEvents.emit('project-room-kiosk-selection','create');return}
    if(y>=395&&y<=545){gameEvents.emit('project-room-kiosk-selection','board');return}
    if(y>=535&&y<=690)gameEvents.emit('project-room-kiosk-selection','recommendation');
  };
  private createProjectRoomScreenTexture(kind:'board'|'recommendation'|'kiosk'){
    const dimensions=kind==='recommendation'?[1536,448]:kind==='board'?[1024,536]:[512,900];
    const canvas=document.createElement('canvas');
    [canvas.width,canvas.height]=dimensions;
    const context=canvas.getContext('2d')!;
    const width=canvas.width,height=canvas.height;
    const rounded=(x:number,y:number,w:number,h:number,r:number,fill:string,stroke?:string)=>{
      context.beginPath();context.roundRect(x,y,w,h,r);context.fillStyle=fill;context.fill();
      if(stroke){context.strokeStyle=stroke;context.lineWidth=Math.max(2,width/400);context.stroke()}
    };
    const text=(value:string,x:number,y:number,size:number,color:string,weight=700,align:CanvasTextAlign='left')=>{
      context.fillStyle=color;context.font=`${weight} ${size}px "Noto Sans KR","Apple SD Gothic Neo",sans-serif`;
      context.textAlign=align;context.textBaseline='middle';context.fillText(value,x,y);
    };
    const tag=(value:string,x:number,y:number,w:number)=>{
      rounded(x,y,w,30,15,'#e8f6f1');text(value,x+w/2,y+15,14,'#24715f',800,'center');
    };
    context.fillStyle='#f5faf8';context.fillRect(0,0,width,height);
    context.fillStyle='#16a17f';context.fillRect(0,0,width,kind==='kiosk'?14:12);

    if(kind==='recommendation'){
      text('AI PROJECT MATCH',58,52,18,'#20a080',900);
      text('나에게 맞는 프로젝트',58,94,35,'#173f37',900);
      text('체험 기록과 관심사를 바탕으로 추천했어요',width-58,94,18,'#68827a',600,'right');
      const cards=[
        ['94%','수목원 사진 기록','자연 · 사진','기록 큐레이터'],
        ['88%','야간축제 탐방','축제 · 문화','코스 플래너'],
        ['82%','전통시장 문화 기록','조사 · 인터뷰','현장 리서처'],
      ];
      cards.forEach((card,index)=>{
        const x=54+index*494;
        rounded(x,145,450,250,22,'#ffffff','#cfe5dc');
        rounded(x+24,169,72,72,18,index===0?'#dff4e8':index===1?'#eee8fa':'#f9eadf');
        text(index===0?'🌿':index===1?'✨':'📷',x+60,205,32,'#173f37',700,'center');
        text(card[0],x+422,183,27,'#16856c',900,'right');
        text(card[1],x+24,275,24,'#1d463d',900);
        tag(card[2],x+24,309,116);
        text(`추천 역할  ${card[3]}`,x+24,365,15,'#5c756e',700);
      });
    }else if(kind==='board'){
      text('PROJECT BOARD',42,50,17,'#1b8d72',900);
      text('모집 중인 프로젝트',42,92,31,'#173f37',900);
      const cards=[
        ['수목원 사진 기록 프로젝트','사진 · 자연','3/5명'],
        ['세종 야간축제 탐방','축제 · 문화','2/6명'],
        ['전통시장 문화 기록','조사 · 인터뷰','4/6명'],
      ];
      cards.forEach((card,index)=>{
        const y=132+index*123;
        rounded(38,y,width-76,101,18,'#ffffff','#d4e6df');
        rounded(55,y+20,10,61,5,index===0?'#25a47f':index===1?'#8a6ad2':'#d38a53');
        text(card[0],84,y+32,22,'#1e473e',900);
        text(card[1],84,y+67,15,'#648078',700);
        text(card[2],width-60,y+50,18,'#188169',900,'right');
      });
      text('가까이에서 E를 눌러 프로젝트를 확인하세요',width/2,height-28,15,'#668078',700,'center');
    }else{
      const card=(y:number,icon:string,title:string,description:string,primary=false)=>{
        rounded(34,y,width-68,120,20,primary?'#15977c':'#143c35',primary?'#53e5c5':'#2a5b51');
        rounded(52,y+25,70,70,16,primary?'rgba(255,255,255,.14)':'#214d45');
        text(icon,87,y+60,34,'#ffffff',700,'center');
        text(title,144,y+42,22,'#ffffff',900);
        text(description,144,y+73,13,primary?'#d9fff6':'#b2d1c9',600);
        text('›',width-55,y+59,42,'#ffffff',400,'center');
      };
      context.fillStyle='#071f1c';context.fillRect(12,12,width-24,height-24);
      const glow=context.createRadialGradient(width*.68,height*.34,10,width*.68,height*.34,width*.75);
      glow.addColorStop(0,'rgba(14,117,91,.34)');glow.addColorStop(1,'rgba(5,34,29,0)');
      context.fillStyle=glow;context.fillRect(12,12,width-24,height-24);
      text('PROJECT KIOSK',36,62,15,'#68e8cd',900);
      rounded(width-74,34,42,42,11,'#f7fbf9');
      text('×',width-53,55,29,'#173f37',400,'center');
      text('공동캠퍼스 프로젝트실',36,105,15,'#c2ded7',800);
      text('체험 탐험가님, 무엇을 할까요?',36,154,29,'#ffffff',900);
      text('화면에서 원하는 기능을 선택하세요.',36,196,14,'#b0cec6',600);
      context.fillStyle='rgba(108,205,181,.22)';context.fillRect(34,231,width-68,1);
      card(267,'＋','새 프로젝트 만들기','팀원과 활동 계획을 등록해요',true);
      card(407,'📌','모집 프로젝트 보기','참여할 프로젝트를 찾아봐요');
      card(547,'✨','AI 프로젝트 추천','내 기록과 잘 맞는 팀을 확인해요');
      text('화면을 터치하거나 항목을 선택하세요',36,height-54,12,'#9bc3ba',600);
      rounded(width-82,height-78,48,34,9,'#123b34','#3f6e63');
      text('ESC',width-58,height-61,12,'#d8eee8',800,'center');
    }
    const texture=new THREE.CanvasTexture(canvas);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.anisotropy=textureAnisotropy;
    texture.minFilter=THREE.LinearMipmapLinearFilter;
    texture.magFilter=THREE.LinearFilter;
    this.projectRoomScreenTextures.push(texture);
    return texture;
  }
  private setupProjectRoomScreens(model:THREE.Object3D){
    const screens=[
      {anchor:'Idea_Board_Frame',surface:'Idea_Board_Frame',kind:'board' as const,size:[4.18,2.18] as const,position:[.121,0,0] as const,rotationY:Math.PI/2,hide:['Idea_Board_Card_','Idea_Board_Status_','Idea_Board_Title_Line']},
      {anchor:'Project_Screen_Frame',surface:'Project_Screen_Frame',kind:'recommendation' as const,size:[7.35,2.08] as const,position:[0,0,.121] as const,rotationY:0,hide:['Project_Screen_Card_','Project_Screen_Title_Line']},
      {anchor:'Kiosk_Screen_Inner',surface:'Kiosk_Screen_Inner',kind:'kiosk' as const,size:[.79,1.42] as const,position:[0,0,.03] as const,rotationY:0,hide:['Kiosk_Plus_']},
    ];
    screens.forEach(({anchor,surface,kind,size,position,rotationY,hide})=>{
      if(!model.getObjectByName(anchor))return;
      const target=model.getObjectByName(surface);
      if(!(target instanceof THREE.Mesh))return;
      const panel=new THREE.Mesh(new THREE.PlaneGeometry(size[0],size[1]),new THREE.MeshBasicMaterial({
        map:this.createProjectRoomScreenTexture(kind),
        color:0xffffff,
        side:THREE.DoubleSide,
        toneMapped:false,
        polygonOffset:true,
        polygonOffsetFactor:-4,
        polygonOffsetUnits:-4,
      }));
      panel.name=`project-room-live-screen-${kind}`;
      panel.position.set(position[0],position[1],position[2]);
      panel.rotation.y=rotationY;
      panel.renderOrder=5;
      target.add(panel);
      if(kind==='kiosk'){
        this.projectRoomKioskScreen=panel;
        target.updateWorldMatrix(true,false);
        const kioskRoot=model.getObjectByName('Project_Touch_Kiosk')??target;
        const kioskCenter=new THREE.Box3().setFromObject(kioskRoot).getCenter(new THREE.Vector3());
        const screenNormal=new THREE.Vector3(0,0,1).transformDirection(target.matrixWorld).normalize();
        this.projectRoomKioskView={
          target:kioskCenter.clone().add(new THREE.Vector3(0,15,0)),
          camera:kioskCenter.clone().addScaledVector(screenNormal,800).add(new THREE.Vector3(0,65,0)),
        };
      }
      model.traverse(object=>{if(hide.some(prefix=>object.name.startsWith(prefix)))object.visible=false});
    });
  }
  private createGovernmentWebUiTexture(id:GovernmentCentralPlazaWebUiId,label:string,eyebrow:string){
    const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;
    const context=canvas.getContext('2d')!,rounded=(x:number,y:number,w:number,h:number,r:number,fill:string,stroke?:string)=>{
      context.beginPath();context.roundRect(x,y,w,h,r);context.fillStyle=fill;context.fill();
      if(stroke){context.strokeStyle=stroke;context.lineWidth=2;context.stroke()}
    },text=(value:string,x:number,y:number,size:number,color:string,weight=700,align:CanvasTextAlign='left')=>{
      context.font=`${weight} ${size}px "Noto Sans KR",sans-serif`;context.fillStyle=color;context.textAlign=align;context.textBaseline='middle';context.fillText(value,x,y);
    };
    const gradient=context.createLinearGradient(0,0,1280,720);gradient.addColorStop(0,'#071f2b');gradient.addColorStop(.55,'#0b3442');gradient.addColorStop(1,'#102a38');
    context.fillStyle=gradient;context.fillRect(0,0,1280,720);
    context.fillStyle='rgba(67,218,220,.12)';context.beginPath();context.arc(1050,100,360,0,Math.PI*2);context.fill();
    text(eyebrow,58,58,21,'#5ce8e3',900);text(label,58,112,44,'#ffffff',900);text('AI 세종 추천센터',1220,62,21,'#9bcbd0',800,'right');
    context.fillStyle='rgba(123,224,224,.22)';context.fillRect(58,150,1164,2);
    if(id==='experience-analysis'){
      const rows=[['자연·힐링','82%',.82],['문화·전시','67%',.67],['야간 경관','54%',.54]];
      rows.forEach(([name,value,ratio],index)=>{const y=238+index*112;text(String(name),70,y,25,'#d9f4f4',800);rounded(290,y-14,700,28,14,'rgba(255,255,255,.1)');rounded(290,y-14,700*Number(ratio),28,14,index===0?'#48d7c4':index===1?'#5caee9':'#8f88e8');text(String(value),1050,y,25,'#ffffff',900)});
      rounded(70,588,1140,76,18,'rgba(255,255,255,.07)','#2f6671');text('지금까지의 체험 기록을 바탕으로 관심도와 여행 성향을 분석했어요.',110,626,23,'#b8dadd',700);
    }else if(id==='course-recommendation'){
      const cards=[['01','세종수목원','자연 속에서 가볍게 시작'],['02','국립세종박물관','문화와 이야기를 연결'],['03','호수공원 전망대','야경으로 여정을 마무리']];
      cards.forEach(([number,title,copy],index)=>{const x=60+index*397;rounded(x,220,365,330,24,index===0?'#13566a':'rgba(255,255,255,.07)',index===0?'#5de4dd':'#315f69');text(number,x+28,258,22,'#5de4dd',900);text(title,x+28,326,29,'#ffffff',900);text(copy,x+28,378,18,'#b6d7da',600);rounded(x+28,468,150,48,14,index===0?'#41bfae':'#244e59');text(index===0?'추천 96%':'코스 정보',x+103,492,17,'#ffffff',800,'center')});
      text('나의 기록과 현재 선호를 반영한 오늘의 행정도시 코스',640,625,23,'#c7e8e8',700,'center');
    }else{
      const routes=[['도심 행정 투어','정부청사 · 대통령기록관','92%'],['세종 자연 산책','수목원 · 호수공원','88%'],['야간 문화 코스','박물관 · 도시전망대','81%']];
      routes.forEach(([title,places,score],index)=>{const y=214+index*126;rounded(60,y,1160,98,20,'rgba(255,255,255,.075)','#2d6470');rounded(80,y+18,62,62,15,index===0?'#36bda9':index===1?'#4c98d5':'#7c75cf');text(`0${index+1}`,111,y+50,19,'#fff',900,'center');text(title,174,y+34,25,'#ffffff',900);text(places,174,y+67,18,'#a9ced2',600);text(score,1166,y+50,25,'#64e3d8',900,'right')});
      text('관심 있는 코스를 선택하면 상세 동선과 장소 정보를 볼 수 있어요.',60,632,21,'#b7dadd',700);
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=textureAnisotropy;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
    this.governmentWebUiTextures.push(texture);return texture;
  }
  private setupGovernmentWebUi(model:THREE.Object3D){
    // Turn the side displays farther toward the visitor. This keeps their
    // architectural inward angle while exposing the complete screen surface.
    const sideTilt=.36;
    const authoredLeft=model.getObjectByName('WebUI_Surface_Left');
    const authoredRight=model.getObjectByName('WebUI_Surface_Right');
    if(authoredLeft)authoredLeft.rotation.z+=sideTilt;
    if(authoredRight)authoredRight.rotation.z-=sideTilt;
    model.updateMatrixWorld(true);
    const centerSurface=model.getObjectByName('WebUI_Surface_Center');
    const entranceFrontNormal=centerSurface
      ?new THREE.Vector3(0,-1,0).transformDirection(centerSurface.matrixWorld).normalize()
      :new THREE.Vector3(0,0,-1);
    GOVERNMENT_CENTRAL_PLAZA_WEB_UI.forEach((config,index)=>{
      const target=model.getObjectByName(config.objectName);
      if(!(target instanceof THREE.Mesh))return;
      target.geometry.computeBoundingBox();
      const localSize=target.geometry.boundingBox?.getSize(new THREE.Vector3());
      if(!localSize)return;
      const panel=new THREE.Mesh(new THREE.PlaneGeometry(localSize.x*.965,localSize.z*.925),new THREE.MeshBasicMaterial({
        map:this.createGovernmentWebUiTexture(config.id,config.label,config.eyebrow),
        // The authored front faces the glass entrance and central hologram.
        // Keep this single-sided so the web surface can never appear backwards.
        color:0xffffff,side:THREE.FrontSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-5,polygonOffsetUnits:-5,
      }));
      panel.name=`government-live-screen-${config.id}`;
      panel.position.set(0,-localSize.y/2-.012,0);
      // PlaneGeometry is mounted onto the panel's X/Z face. The GLB root's
      // authored axis conversion leaves its in-plane UV basis rotated 180°,
      // so keep the front normal (-Y) and rotate only the displayed content.
      panel.rotation.set(Math.PI/2,0,Math.PI);
      panel.renderOrder=8;
      target.add(panel);
      target.updateWorldMatrix(true,true);
      const bounds=new THREE.Box3().setFromObject(panel),center=bounds.getCenter(new THREE.Vector3());
      const normal=new THREE.Vector3(0,-1,0).transformDirection(target.matrixWorld).normalize();
      const approach=center.clone().addScaledVector(normal,260);
      this.governmentWebUiScreens.set(config.id,panel);
      this.governmentWebUiPositions.set(config.id,{x:approach.x,z:this.sceneToWorldZ(approach.z),radius:index===1?470:420});
      const isCenter=config.id==='course-recommendation';
      // Side displays still read as angled, but the view is biased strongly
      // toward each display normal so neither outer edge is cropped.
      const cameraDirection=isCenter
        ?normal
        :normal.clone().multiplyScalar(.78).addScaledVector(entranceFrontNormal,.22).normalize();
      this.governmentWebUiViews.set(config.id,{
        target:center,
        camera:center.clone().addScaledVector(cameraDirection,isCenter?1120:1380),
        fov:isCenter?36:40,
      });
      const outline=new THREE.Box3Helper(new THREE.Box3().setFromObject(target),index===1?0x65e8ff:0x64dbc8);
      outline.visible=false;outline.renderOrder=90;const material=outline.material as THREE.LineBasicMaterial;material.transparent=true;material.opacity=.9;material.depthTest=false;
      this.scene.add(outline);this.governmentWebUiOutlines.set(config.id,outline);
    });
  }
  private getGovernmentWebUiRect(){
    const screen=this.governmentWebUiActive?this.governmentWebUiScreens.get(this.governmentWebUiActive):undefined;
    if(!screen)return undefined;
    const rect=this.projectedMeshScreenRect(screen),quad=this.projectedMeshScreenQuad(screen);
    return rect&&quad?{...rect,quad}:rect;
  }
  private syncGovernmentWebUiRect(){
    const rect=this.getGovernmentWebUiRect();if(!rect)return;
    const previous=this.lastGovernmentWebUiRect;
    if(previous&&Math.abs(previous.left-rect.left)<.75&&Math.abs(previous.top-rect.top)<.75&&Math.abs(previous.width-rect.width)<.75&&Math.abs(previous.height-rect.height)<.75)return;
    this.lastGovernmentWebUiRect=rect;gameEvents.emit('government-webui-screen-rect',rect);
  }
  private enterGovernmentWebUi=(id?:GovernmentCentralPlazaWebUiId)=>{
    const next=id??this.governmentWebUiNearby;if(!next||!this.governmentWebUiViews.has(next))return;
    this.governmentWebUiActive=next;this.governmentWebUiTransition={target:this.cameraTarget.clone(),camera:this.camera.position.clone(),fov:this.camera instanceof THREE.PerspectiveCamera?this.camera.fov:36,elapsed:0};
    this.governmentWebUiOutlines.forEach(outline=>{outline.visible=false});
    this.setProjectRoomCharactersVisible(false);this.renderer.domElement.style.cursor='pointer';
    gameEvents.emit('government-webui-mode-changed',next);
  };
  private exitGovernmentWebUi=()=>{
    if(!this.governmentWebUiActive)return;
    this.governmentWebUiActive=undefined;this.governmentWebUiTransition=undefined;this.lastGovernmentWebUiRect=undefined;
    this.setProjectRoomCharactersVisible(true);this.renderer.domElement.style.cursor='';
    this.governmentWebUiOutlines.forEach((outline,id)=>{outline.visible=id===this.governmentWebUiNearby});
    gameEvents.emit('government-webui-screen-rect',null);gameEvents.emit('government-webui-mode-changed',null);
  };
  private setupObservatoryTelescope(model:THREE.Object3D){
    const body=model.getObjectByName('Telescope_left_body');
    const lenses=[
      model.getObjectByName('Telescope_left_lens_+1'),
      model.getObjectByName('Telescope_left_lens_-1'),
    ].filter((object):object is THREE.Object3D=>!!object);
    if(!body||!lenses.length)return;
    body.updateWorldMatrix(true,true);
    lenses.forEach(lens=>lens.updateWorldMatrix(true,true));
    const bodyBounds=new THREE.Box3().setFromObject(body);
    const bodyCenter=bodyBounds.getCenter(new THREE.Vector3());
    const lensCenter=lenses.reduce(
      (sum,lens)=>sum.add(new THREE.Box3().setFromObject(lens).getCenter(new THREE.Vector3())),
      new THREE.Vector3(),
    ).multiplyScalar(1/lenses.length);
    const viewDirection=lensCenter.clone().sub(bodyCenter);
    viewDirection.y*=.12;
    viewDirection.normalize();
    const camera=bodyCenter.clone().addScaledVector(viewDirection,-72);
    camera.y+=12;
    const target=bodyCenter.clone().addScaledVector(viewDirection,1450);
    target.y+=8;
    const approach=bodyCenter.clone().addScaledVector(viewDirection,-135);
    this.observatoryTelescopePosition={x:approach.x,z:this.sceneToWorldZ(approach.z),radius:230};
    this.observatoryTelescopeView={camera,target};
    const outlineBounds=bodyBounds.clone();
    lenses.forEach(lens=>outlineBounds.expandByObject(lens));
    const outline=new THREE.Box3Helper(outlineBounds,0x67dcff);
    outline.name='observatory-telescope-outline';
    outline.visible=false;
    outline.renderOrder=90;
    const material=outline.material as THREE.LineBasicMaterial;
    material.transparent=true;
    material.opacity=.9;
    material.depthTest=false;
    this.scene.add(outline);
    this.observatoryTelescopeOutline=outline;
  }
  private enterObservatoryTelescope=()=>{
    if(!this.observatoryTelescopeNearby||!this.observatoryTelescopeView||this.observatoryTelescopeActive)return;
    this.observatoryTelescopeActive=true;
    this.observatoryTelescopeTransition={
      target:this.cameraTarget.clone(),
      camera:this.camera.position.clone(),
      fov:this.camera instanceof THREE.PerspectiveCamera?this.camera.fov:46,
      elapsed:0,
    };
    if(this.observatoryTelescopeOutline)this.observatoryTelescopeOutline.visible=false;
    this.setProjectRoomCharactersVisible(false);
    gameEvents.emit('observatory-telescope-mode-changed',true);
  };
  private exitObservatoryTelescope=()=>{
    if(!this.observatoryTelescopeActive)return;
    this.observatoryTelescopeActive=false;
    this.observatoryTelescopeTransition=undefined;
    this.setProjectRoomCharactersVisible(true);
    if(this.observatoryTelescopeOutline)this.observatoryTelescopeOutline.visible=this.observatoryTelescopeNearby;
    gameEvents.emit('observatory-telescope-mode-changed',false);
  };
  private setupProjectRoomHologram(model:THREE.Object3D){
    const table=model.getObjectByName('Collaboration_Table_Inset');
    if(!table)return;
    const room=table.parent??model;
    const root=new THREE.Group();
    root.name='collaboration-table-hologram';
    root.position.set(table.position.x,1.018,table.position.z);

    const hologramMaterial=(color:number,opacity:number,side:THREE.Side=THREE.DoubleSide)=>new THREE.MeshBasicMaterial({
      color,
      transparent:true,
      opacity,
      depthWrite:false,
      side,
      blending:THREE.AdditiveBlending,
      toneMapped:false,
    });
    const physicalMaterial=(color:number,opacity:number)=>new THREE.MeshStandardMaterial({
      color,
      emissive:color,
      emissiveIntensity:.28,
      transparent:true,
      opacity,
      roughness:.72,
      metalness:.05,
      depthWrite:false,
      side:THREE.DoubleSide,
    });

    const water=new THREE.Mesh(new THREE.CircleGeometry(2.63,96),hologramMaterial(0x087fb2,.3));
    water.rotation.x=-Math.PI/2;
    water.position.y=.025;
    root.add(water);

    const grid=new THREE.GridHelper(5.05,12,0x62ddff,0x188eb5);
    grid.position.y=.04;
    const gridMaterials=Array.isArray(grid.material)?grid.material:[grid.material];
    gridMaterials.forEach(material=>{material.transparent=true;material.opacity=.16;material.depthWrite=false});
    root.add(grid);

    const islandShape=new THREE.Shape();
    islandShape.moveTo(-2.05,-.48);
    islandShape.bezierCurveTo(-2.22,-1.18,-1.34,-1.83,-.55,-1.55);
    islandShape.bezierCurveTo(.05,-1.82,.82,-1.58,1.02,-1.12);
    islandShape.bezierCurveTo(1.48,-1.08,2.18,-.58,1.94,.02);
    islandShape.bezierCurveTo(2.35,.66,1.58,1.35,.88,1.31);
    islandShape.bezierCurveTo(.27,1.74,-.52,1.52,-.77,1.13);
    islandShape.bezierCurveTo(-1.43,1.34,-2.12,.75,-1.82,.2);
    islandShape.bezierCurveTo(-2.14,.02,-2.28,-.2,-2.05,-.48);
    const island=new THREE.Mesh(new THREE.ShapeGeometry(islandShape,18),physicalMaterial(0x45a96e,.92));
    island.rotation.x=-Math.PI/2;
    island.position.y=.075;
    root.add(island);

    const lakeShape=new THREE.Shape();
    lakeShape.moveTo(-.68,-.34);
    lakeShape.bezierCurveTo(-.82,-.78,-.18,-1.03,.15,-.72);
    lakeShape.bezierCurveTo(.6,-.84,.91,-.45,.72,-.12);
    lakeShape.bezierCurveTo(.48,.3,.04,.25,-.17,.49);
    lakeShape.bezierCurveTo(-.56,.42,-.82,.05,-.68,-.34);
    const lake=new THREE.Mesh(new THREE.ShapeGeometry(lakeShape,12),hologramMaterial(0x1bc8ed,.78));
    lake.rotation.x=-Math.PI/2;
    lake.position.y=.095;
    root.add(lake);

    const terrain=[
      {x:-1.35,z:.48,r:.38,color:0x8bd46b},
      {x:-.42,z:.92,r:.31,color:0x75c956},
      {x:.62,z:.77,r:.4,color:0x94d35f},
      {x:1.36,z:.16,r:.34,color:0x55b36f},
      {x:.87,z:-.78,r:.29,color:0x6bc45d},
      {x:-1.26,z:-.88,r:.3,color:0x80c861},
    ];
    terrain.forEach(({x,z,r,color},index)=>{
      const patch=new THREE.Mesh(new THREE.CircleGeometry(r,18),physicalMaterial(color,.9));
      patch.rotation.x=-Math.PI/2;
      patch.position.set(x,.11+index*.002,z);
      patch.scale.z=.72;
      root.add(patch);
    });

    const routePoints=[
      new THREE.Vector3(-1.55,.15,-.55),
      new THREE.Vector3(-.98,.17,.55),
      new THREE.Vector3(-.08,.16,.94),
      new THREE.Vector3(.7,.17,.45),
      new THREE.Vector3(1.35,.16,-.2),
      new THREE.Vector3(.75,.17,-.92),
    ];
    const route=new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(routePoints),72,.025,7,false),
      hologramMaterial(0xff8ca8,.95),
    );
    root.add(route);

    const labels=['호수공원','국립수목원','정부청사','이응다리'];
    const pinPoints=[routePoints[0],routePoints[2],routePoints[4],routePoints[5]];
    pinPoints.forEach((point,index)=>{
      const pin=new THREE.Group();
      pin.position.set(point.x,.15,point.z);
      const stem=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.36,8),hologramMaterial(index===0?0xff71a1:0x61e8ff,.95));
      stem.position.y=.18;
      const head=new THREE.Mesh(new THREE.SphereGeometry(.095,16,12),hologramMaterial(index===0?0xff5b91:0x42dfff,1));
      head.position.y=.4;
      const halo=new THREE.Mesh(new THREE.RingGeometry(.11,.15,24),hologramMaterial(0xc8f8ff,.7));
      halo.rotation.x=-Math.PI/2;
      halo.position.y=.31;
      pin.add(stem,head,halo);

      const canvas=document.createElement('canvas');
      canvas.width=256;canvas.height=72;
      const context=canvas.getContext('2d')!;
      context.fillStyle='rgba(9,78,104,.88)';
      context.beginPath();context.roundRect(5,5,246,62,18);context.fill();
      context.strokeStyle='rgba(101,229,255,.9)';context.lineWidth=3;context.stroke();
      context.fillStyle='#e8fbff';context.font='800 27px "Noto Sans KR","Apple SD Gothic Neo",sans-serif';
      context.textAlign='center';context.textBaseline='middle';context.fillText(labels[index],128,36);
      const texture=new THREE.CanvasTexture(canvas);
      texture.colorSpace=THREE.SRGBColorSpace;
      this.projectRoomScreenTextures.push(texture);
      const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}));
      label.scale.set(.9,.255,1);
      label.position.y=.68;
      pin.add(label);
      root.add(pin);
    });

    const dome=new THREE.Mesh(
      new THREE.CylinderGeometry(2.69,2.69,.52,96,1,true),
      hologramMaterial(0x36cbff,.075,THREE.BackSide),
    );
    dome.position.y=.28;
    root.add(dome);
    const rings=new THREE.Group();
    for(const [radius,y,opacity] of [[2.68,.08,.72],[2.48,.3,.34],[2.25,.55,.2]] as const){
      const ring=new THREE.Mesh(new THREE.RingGeometry(radius-.018,radius+.018,96),hologramMaterial(0x5ee7ff,opacity));
      ring.rotation.x=-Math.PI/2;
      ring.position.y=y;
      rings.add(ring);
    }
    root.add(rings);
    const scan=new THREE.Mesh(new THREE.RingGeometry(.25,2.58,96,1,0,Math.PI*.64),hologramMaterial(0x91efff,.26));
    scan.rotation.x=-Math.PI/2;
    scan.position.y=.2;
    root.add(scan);
    const light=new THREE.PointLight(0x2ecfff,1.7,5.8);
    light.position.y=1.2;
    root.add(light);

    root.userData.scan=scan;
    root.userData.rings=rings;
    root.userData.pins=pinPoints.length;
    room.add(root);
    this.projectRoomHologram=root;
  }
  private updateProjectRoomHologram(){
    const root=this.projectRoomHologram;
    if(!root)return;
    const elapsed=(Date.now()+this.worldClockOffset)/1000;
    const scan=root.userData.scan as THREE.Mesh|undefined;
    const rings=root.userData.rings as THREE.Group|undefined;
    if(scan)scan.rotation.z=elapsed*.38;
    if(rings){
      rings.rotation.y=-elapsed*.08;
      rings.children.forEach((ring,index)=>{
        const pulse=1+Math.sin(elapsed*1.7+index*.85)*.018;
        ring.scale.setScalar(pulse);
      });
    }
    root.children.forEach(child=>{
      if(!(child instanceof THREE.Group)||!child.children.some(item=>item instanceof THREE.Sprite))return;
      const head=child.children.find(item=>item instanceof THREE.Mesh&&item.geometry instanceof THREE.SphereGeometry);
      if(head)head.scale.setScalar(1+Math.sin(elapsed*2.5+child.position.x)*.12);
    });
  }
  private setupProjectRoomInteractionOutlines(model:THREE.Object3D){
    PROJECT_ROOM_INTERACTIONS.forEach(config=>{
      const matches:THREE.Object3D[]=[];
      model.traverse(object=>{
        if(config.objectNames.some(name=>object.name===name||object.name.startsWith(name)))matches.push(object);
      });
      if(!matches.length)return;
      const bounds=new THREE.Box3();
      matches.forEach(object=>bounds.expandByObject(object));
      if(bounds.isEmpty())return;
      const center=bounds.getCenter(new THREE.Vector3());
      const position={x:center.x,z:this.sceneToWorldZ(center.z),radius:config.radius};
      if(config.id==='project-board'){position.x+=185;position.radius=Math.max(position.radius,285)}
      if(config.id==='ai-recommendation-screen'){position.z+=230;position.radius=Math.max(position.radius,330)}
      if(config.id==='project-kiosk'){position.z+=175;position.radius=Math.max(position.radius,320)}
      this.projectRoomInteractionPositions.set(config.id,position);
      const helper=new THREE.Box3Helper(bounds,config.id==='ai-recommendation-screen'?0x55e5ff:0x74f0c9);
      helper.name=`project-room-outline-${config.id}`;
      helper.visible=false;
      helper.renderOrder=90;
      const material=helper.material as THREE.LineBasicMaterial;
      material.transparent=true;
      material.opacity=.82;
      material.depthTest=false;
      this.scene.add(helper);
      this.projectRoomInteractionOutlines.set(config.id,helper);
    });
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
    const label=this.createWorldPortalLabel(config.label,false);
    label.position.set(0,0,112);root.add(label);root.userData.label=label;
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
  private onNatureChapterProgressChanged=(completion:{bear:boolean;garden:boolean;photo:boolean})=>{
    this.natureChapterCompletion=completion;
    if(this.interactionRoot?.userData.natureJourney)this.applyNatureJourneyHighlight(this.interactionRoot,'bear');
    if(this.bearPhotoPortalRoot)this.applyNatureJourneyHighlight(this.bearPhotoPortalRoot,'photo');
    this.fixedPortalRoots.forEach(root=>{
      if(root.userData.natureJourney==='garden')this.applyNatureJourneyHighlight(root,'garden');
    });
  };
  private applyNatureJourneyHighlight(root:THREE.Group,kind:'bear'|'garden'|'photo'){
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
    if(this.options.interaction&&this.interactionPosition&&position.x===this.interactionPosition.x&&position.z===this.interactionPosition.z){
      const label=this.createWorldPortalLabel(this.options.interaction.label,!this.options.interaction.chargeSeconds);
      label.position.set(0,0,112);root.add(label);root.userData.label=label;
    }
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
    const bearLabel=config.id==='bearA'||config.id==='bearB';
    context.shadowColor='rgba(20,35,19,.28)';context.shadowBlur=24;context.fillStyle='rgba(255,255,248,.97)';
    context.beginPath();context.roundRect(18,18,604,238,78);context.fill();
    context.shadowBlur=0;context.strokeStyle=`#${color.getHexString()}`;context.lineWidth=10;context.stroke();
    context.textAlign='center';context.textBaseline='middle';
    if(!bearLabel){context.font='92px "Apple Color Emoji","Noto Color Emoji",sans-serif';context.fillText(config.icon,105,137)}
    if(!bearLabel){context.fillStyle='#73816d';context.font='900 30px "Noto Sans KR",sans-serif';context.fillText('서식 환경 설계 조사',390,97)}
    context.fillStyle='#263b29';context.font='900 48px "Noto Sans KR",sans-serif';context.fillText(config.label,bearLabel?320:390,bearLabel?137:161);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=textureAnisotropy;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));
    sprite.position.set(config.x,groundHeight+105,this.worldToSceneZ(config.z));sprite.scale.set(bearLabel?150:190,bearLabel?55:83,1);sprite.renderOrder=120;sprite.frustumCulled=false;
    this.scene.add(sprite);return sprite;
  }
  private onHabitatResourcePositionSet=(position:{resource:HabitatResourceId;x:number;z:number})=>{
    if(!this.options.wildlifeClues||!Number.isFinite(position.x)||!Number.isFinite(position.z))return;
    const definitions:Record<HabitatResourceId,{icon:string;label:string}>={
      cave:{icon:'🪨',label:'동굴 자원'},food:{icon:'🥕',label:'먹이 공급 지점'},water:{icon:'💧',label:'물가 이용 지점'},
    };
    let config=this.options.wildlifeClues.find(item=>item.id===position.resource);
    if(!config){
      config={id:position.resource,x:position.x,z:position.z,...definitions[position.resource]};
      this.options.wildlifeClues.push(config);
    }
    config.x=Math.max(0,Math.min(WORLD_WIDTH,Math.round(position.x)));
    config.z=Math.max(0,Math.min(WORLD_HEIGHT,Math.round(position.z)));
    if(!this.mapReady)return;
    const ground=(this.sampleExperienceGround(config.x,config.z,true)??this.sampleVisibleSurfaceGround(config.x,config.z))?.height??this.localGround;
    let root=this.wildlifeClueRoots.get(config.id);
    if(!root){
      root=this.createInteractionCircle(config,ground);
      root.name=`bear-wildlife-clue-${config.id}`;root.userData.phase=(this.wildlifeClueRoots.size+1)*Math.PI*.66;root.userData.journeyActive=true;
      const colors:Record<HabitatResourceId,number>={cave:0x8c7a65,food:0x78a665,water:0x5d9daf},color=new THREE.Color(colors[position.resource]);
      for(const key of ['center','ring','middleRing','innerRing','pulseRing'] as const){
        const mesh=root.userData[key] as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
        mesh.material.color.copy(color);
      }
      const light=root.userData.light as THREE.PointLight;light.color.copy(color);light.intensity=4.8;light.distance=210;
      root.userData.clueLabel=this.createWildlifeClueLabel(config,ground,color);
      this.wildlifeClueRoots.set(config.id,root);
    }
    if(root){
      root.position.set(config.x,ground+.8,this.worldToSceneZ(config.z));
      root.userData.groundHeight=ground;
      const label=root.userData.clueLabel as THREE.Sprite|undefined;
      label?.position.set(config.x,ground+105,this.worldToSceneZ(config.z));
    }
    if(this.wildlifeClueNearby===config.id){this.wildlifeClueNearby=undefined;gameEvents.emit('bear-clue-proximity-changed',null)}
    this.render();
  };
  private onHabitatResourcePositionPlace=(resource:HabitatResourceId)=>{
    if(!['cave','food','water'].includes(resource))return;
    this.pendingHabitatResource=undefined;
    const position={resource,x:Math.round(this.localX),z:Math.round(this.localZ)};
    this.onHabitatResourcePositionSet(position);
    gameEvents.emit('habitat-resource-position-saved',position);
  };
  private onHabitatResourcePlacementArm=(resource:HabitatResourceId|null)=>{
    this.pendingHabitatResource=resource&&['cave','food','water'].includes(resource)?resource:undefined;
  };
  private onCampusBuildingFastTravel=(id:CampusFeaturePortalId)=>{
    if(this.renderer.domElement.style.display==='none')return;
    const target=this.options.campusFeaturePortals?.find(config=>config.id===id);
    if(!target)return;
    const spawn=this.findSafeSpawn(target.x,target.z);
    if(!spawn)return;
    this.localX=spawn.x;
    this.localZ=spawn.z;
    this.localGround=spawn.ground.height;
    this.localNormal.copy(spawn.ground.normal);
    this.pendingTeleport={x:spawn.x,z:spawn.z,groundHeight:spawn.ground.height};
  };
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
  private async createResidentDecor(config:ResidentConfig,index:number){
    const gltf=await new GLTFLoader().loadAsync(config.modelUrl);
    if(this.destroyed)return;
    const visual=gltf.scene;visual.updateMatrixWorld(true);sharpenObjectTextures(visual);
    const bounds=new THREE.Box3().setFromObject(visual),size=bounds.getSize(new THREE.Vector3()),scale=config.height/Math.max(size.y,.001);
    visual.scale.setScalar(scale);visual.position.y=-bounds.min.y*scale;
    visual.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=true}});
    const ground=this.sampleGround(config.x,config.z,0,true);if(!ground)return;
    const root=new THREE.Group();root.name=`bear-resident-decor-${index}`;root.position.set(config.x,ground.height+CHARACTER_GROUND_CLEARANCE,this.worldToSceneZ(config.z));root.rotation.y=config.yaw;root.add(visual);this.scene.add(root);this.residentDecorRoots.push(root);
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
      if(root.userData.appearance==='energy-rift'){
        const material=root.userData.portalMaterial as THREE.ShaderMaterial|undefined;
        const frame=root.userData.frame as THREE.Group|undefined;
        const middleRing=root.userData.middleRing as THREE.Mesh|undefined;
        const innerRing=root.userData.innerRing as THREE.Mesh|undefined;
        const shards=root.userData.shards as THREE.Group|undefined;
        const motes=root.userData.motes as THREE.Group|undefined;
        const baseRing=root.userData.baseRing as THREE.Mesh|undefined;
        const floorGlow=root.userData.floorGlow as THREE.Mesh|undefined;
        const light=root.userData.light as THREE.PointLight|undefined;
        if(material)material.uniforms.uTime.value=elapsed;
        if(frame)frame.rotation.z=Math.sin(elapsed*.52)*.045;
        if(middleRing)middleRing.rotation.z=-elapsed*.16;
        if(innerRing)innerRing.rotation.z=elapsed*.22;
        if(shards){
          shards.rotation.z=elapsed*.085;
          shards.children.forEach((shard,index)=>{
            shard.rotation.x+=.006+(index%3)*.002;
            shard.rotation.y-=.008;
          });
        }
        if(motes)motes.children.forEach((mote,index)=>{
          const angle=(mote.userData.angle as number)+elapsed*(mote.userData.speed as number);
          const radius=mote.userData.radius as number;
          mote.position.x=Math.cos(angle)*radius;
          mote.position.y=58+Math.sin(angle)*radius*1.38;
          mote.position.z=Math.sin(elapsed*1.3+index)*4;
        });
        if(baseRing)baseRing.rotation.z=-elapsed*.34;
        if(floorGlow)floorGlow.scale.setScalar(1+Math.sin(elapsed*2.1)*.08);
        if(light)light.intensity=5.1+Math.sin(elapsed*3.2)*.75;
        root.position.y=root.userData.groundHeight as number;
        continue;
      }
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
    const roots=[...this.lakeExperienceRoots.values(),...this.campusFeaturePortalRoots.values(),...this.wildlifeClueRoots.values(),...(this.interactionRoot?[this.interactionRoot]:[]),...(this.bearPhotoPortalRoot?[this.bearPhotoPortalRoot]:[])];
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
    if(this.guideIntroActive){
      const progress=this.guideIntroStartedAt?Math.min(1,(performance.now()-this.guideIntroStartedAt)/LAKE_GUIDE_INTRO_DURATION_MS):0;
      const eased=1-(1-progress)*(1-progress);
      const frame={
        x:THREE.MathUtils.lerp(this.guideIntroStart.x,this.guideIntroEnd.x,eased),
        z:THREE.MathUtils.lerp(this.guideIntroStart.z,this.guideIntroEnd.z,eased),
        yaw:Math.atan2(this.guideIntroEnd.x-this.guideIntroStart.x,this.guideIntroEnd.z-this.guideIntroStart.z),
        motion:(progress<1?'walk':'idle') as Extract<MotionState,'idle'|'walk'>,
      };
      const ground=this.sampleGround(frame.x,frame.z,this.guideGround);
      if(ground){
        this.guideGround=ground.height;
        this.guidePosition={x:frame.x,z:frame.z,yaw:frame.yaw};
        this.guideNpcPosition.set(frame.x,ground.height+CHARACTER_GROUND_CLEARANCE,this.worldToSceneZ(frame.z));
        this.guideNpcNormal.copy(ground.normal);
      }
      this.guideNpc.update(this.guideNpcPosition,this.guideNpcNormal,this.guidePosition.yaw,frame.motion,delta);
      if(progress===1&&!this.guideIntroArrived){
        this.guideIntroArrived=true;
        gameEvents.emit('guide-intro-arrived');
      }
      return;
    }
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

  private updateLocalNpcs(delta:number){
    this.localNpcs.forEach(npc=>{
      if(npc.config.id===this.focusedLocalNpcId){
        const faceLocalYaw=Math.atan2(this.localX-npc.x,this.localZ-npc.z);
        if(npc.config.id===this.talkingLocalNpcId)npc.character.playEmote('talking',true);else npc.character.stopEmote();
        npc.character.update(npc.position,npc.normal,faceLocalYaw,'idle',delta);
        return;
      }
      npc.character.stopEmote();
      const patrol=npc.config.patrol;
      if(!patrol||patrol.length<2){
        npc.character.update(npc.position,npc.normal,npc.config.yaw,'idle',delta);
        return;
      }
      let target=patrol[npc.targetIndex%patrol.length];
      let dx=target.x-npc.x,dz=target.z-npc.z,distance=Math.hypot(dx,dz);
      if(distance<14){
        npc.targetIndex=(npc.targetIndex+1)%patrol.length;
        target=patrol[npc.targetIndex];
        dx=target.x-npc.x;dz=target.z-npc.z;distance=Math.hypot(dx,dz);
      }
      if(distance<.001){
        npc.character.update(npc.position,npc.normal,npc.config.yaw,'idle',delta);
        return;
      }
      const step=Math.min(distance,(npc.config.walkSpeed??48)*delta);
      const targetYaw=Math.atan2(dx,dz);
      let moved=false,movementYaw=targetYaw;
      // When the direct route is blocked, gently steer to either side instead
      // of walking through the collaboration table, stools, or kiosk.
      for(const angleOffset of [0,.38,-.38,.76,-.76,1.14,-1.14]){
        const yaw=targetYaw+angleOffset;
        const nextX=npc.x+Math.sin(yaw)*step;
        const nextZ=npc.z+Math.cos(yaw)*step;
        if(nextX<30||nextX>WORLD_WIDTH-30||nextZ<30||nextZ>this.movementWorldHeight()-30)continue;
        if(Math.hypot(nextX-this.localX,nextZ-this.localZ)<48)continue;
        if(!this.options.simplifiedCollision&&!this.bodyPathClearFrom(npc.x,npc.z,npc.ground,nextX,nextZ))continue;
        const ground=this.sampleGround(nextX,nextZ,npc.ground);
        if(!ground||(!this.options.simplifiedCollision&&!this.spawnSpaceClear(nextX,nextZ,ground.height)))continue;
        npc.x=nextX;npc.z=nextZ;npc.ground=ground.height;npc.normal.copy(ground.normal);
        npc.position.set(nextX,ground.height+CHARACTER_GROUND_CLEARANCE,this.worldToSceneZ(nextZ));
        movementYaw=yaw;moved=true;break;
      }
      if(moved)npc.blockedSeconds=0;
      else{
        npc.blockedSeconds+=delta;
        if(npc.blockedSeconds>1.2){
          npc.targetIndex=(npc.targetIndex+1)%patrol.length;
          npc.blockedSeconds=0;
        }
      }
      npc.character.update(npc.position,npc.normal,movementYaw,moved?'walk':'idle',delta);
    });
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
    if(this.mapBounds.isEmpty()||!(this.camera instanceof THREE.OrthographicCamera))return;
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
  private movementWorldHeight(){return this.options.mapName==='프로젝트실'?PROJECT_ROOM_WORLD_HEIGHT:WORLD_HEIGHT}

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
      const z=Math.max(20,Math.min(this.movementWorldHeight()-20,preferredZ+offsetZ));
      // Choose the walkable surface closest to the map's base level instead of
      // treating a tree canopy or roof as the spawn floor.
      const ground=this.sampleGround(x,z,0,false,1200);
      if(ground&&this.spawnSpaceClear(x,z,ground.height))return {x,z,ground};
    }
    const fallback=this.sampleGround(preferredX,preferredZ,0,true);
    return fallback?{x:preferredX,z:preferredZ,ground:fallback}:undefined;
  }

  private bodyPathClearFrom(startX:number,startZ:number,startGround:number,worldX:number,worldZ:number){
    if(!this.mapMeshes.length)return true;
    const characterHeight=this.options.characterHeight??CHARACTER_HEIGHT;
    const start=new THREE.Vector3(startX,startGround+CHARACTER_GROUND_CLEARANCE+characterHeight*.4,this.worldToSceneZ(startZ));
    const end=new THREE.Vector3(worldX,start.y,this.worldToSceneZ(worldZ)),direction=end.sub(start),distance=direction.length();
    if(distance<.001)return true;
    const pathBounds=new THREE.Box3().setFromPoints([start,start.clone().add(direction)]).expandByScalar(COLLISION_RADIUS);
    const nearbyMeshes=this.mapMeshes.filter(mesh=>this.mapMeshBounds.get(mesh)?.intersectsBox(pathBounds)??true);
    const normalizedDirection=direction.normalize();
    const side=new THREE.Vector3(-normalizedDirection.z,0,normalizedDirection.x).multiplyScalar(COLLISION_RADIUS*.8);
    return [-1,0,1].every(offset=>{
      this.bodyRaycaster.near=2;this.bodyRaycaster.far=distance+COLLISION_RADIUS;
      this.bodyRaycaster.set(start.clone().addScaledVector(side,offset),normalizedDirection);
      const blockingHit=this.bodyRaycaster.intersectObjects(nearbyMeshes,false).find(hit=>{
        if(!hit.face)return false;
        const normal=hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld));
        return Math.abs(normal.y)<.55;
      });
      return !blockingHit;
    });
  }

  private bodyPathClear(worldX:number,worldZ:number){
    if(this.guideNpc&&Math.hypot(worldX-this.guidePosition.x,worldZ-this.guidePosition.z)<42)return false;
    return this.bodyPathClearFrom(this.localX,this.localZ,this.localGround,worldX,worldZ);
  }

  updateLocalCharacter(proposedX:number,proposedZ:number,yaw:number,motion:MotionState,delta:number,jumpHeight=0,emote:CharacterEmote|null=null){
    if(!this.mapReady)return {x:this.localX,z:this.localZ,groundHeight:this.localGround};
    if(this.pendingTeleport){proposedX=this.pendingTeleport.x;proposedZ=this.pendingTeleport.z;if(this.pendingTeleport.groundHeight!==undefined)this.localGround=this.pendingTeleport.groundHeight;this.pendingTeleport=undefined}
    if(this.observatoryTelescopeActive){proposedX=this.localX;proposedZ=this.localZ;motion='idle';jumpHeight=0;emote=null}
    if(this.bearPhotoMode&&this.bearPhotoDestination){
      proposedX=this.bearPhotoDestination.x;proposedZ=this.bearPhotoDestination.z;this.localGround=this.bearPhotoDestination.groundHeight;yaw=BEAR_PHOTO_CAMERA_YAW;motion='idle';jumpHeight=0;
    }
    this.updateResident(delta);
    this.updateGuideNpc(delta);
    this.updateLocalNpcs(delta);
    this.updatePortals();
    this.updateLakeExperienceCircles();
    this.updateProjectRoomHologram();
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
    const closestLocalNpc=this.localNpcs.map(npc=>({npc,distance:Math.hypot(nextX-npc.x,nextZ-npc.z)})).sort((a,b)=>a.distance-b.distance)[0];
    const sameLocalNpc=closestLocalNpc?.npc.config.id===this.localNpcNearbyId;
    const nearbyLocalNpc=closestLocalNpc&&closestLocalNpc.distance<(sameLocalNpc?220:180)?closestLocalNpc.npc:undefined;
    if(nearbyLocalNpc?.config.id!==this.localNpcNearbyId){
      this.localNpcNearbyId=nearbyLocalNpc?.config.id;
      gameEvents.emit('local-npc-proximity-changed',nearbyLocalNpc?{...nearbyLocalNpc.config,x:nearbyLocalNpc.x,z:nearbyLocalNpc.z}:null);
      if(!nearbyLocalNpc)gameEvents.emit('local-npc-screen-position',null);
    }
    if(nearbyLocalNpc&&performance.now()-this.lastLocalNpcScreenPublish>80){
      this.lastLocalNpcScreenPublish=performance.now();
      const projected=nearbyLocalNpc.position.clone().project(this.camera);
      const localProjected=new THREE.Vector3(
        nextX,
        sample.height+CHARACTER_GROUND_CLEARANCE,
        this.worldToSceneZ(nextZ),
      ).project(this.camera);
      const rect=this.renderer.domElement.getBoundingClientRect();
      gameEvents.emit('local-npc-screen-position',{
        id:nearbyLocalNpc.config.id,
        x:rect.left+(projected.x+1)*rect.width/2,
        y:rect.top+(1-projected.y)*rect.height/2,
        localX:rect.left+(localProjected.x+1)*rect.width/2,
        localY:rect.top+(1-localProjected.y)*rect.height/2,
      });
    }
    const focusedLocalNpc=this.focusedLocalNpcId?this.localNpcs.find(npc=>npc.config.id===this.focusedLocalNpcId):undefined;
    if(focusedLocalNpc)yaw=Math.atan2(focusedLocalNpc.x-nextX,focusedLocalNpc.z-nextZ);
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
    if(this.options.wildlifeClues){
      gameEvents.off('habitat-resource-position-set',this.onHabitatResourcePositionSet);
      gameEvents.off('habitat-resource-position-place',this.onHabitatResourcePositionPlace);
      gameEvents.off('habitat-resource-placement-arm',this.onHabitatResourcePlacementArm);
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
    if(!this.portalEntryArmed&&portalCandidates.every(candidate=>candidate.distance>=(candidate.config.chargeSeconds?PORTAL_EXIT_DISTANCE:KEY_PORTAL_EXIT_DISTANCE)))this.portalEntryArmed=true;
    const closestPortal=portalCandidates[0],samePortal=closestPortal?.config.destination===this.activePortal?.destination;
    const activationDistance=closestPortal&&!closestPortal.config.chargeSeconds
      ?(samePortal?KEY_PORTAL_EXIT_DISTANCE:KEY_PORTAL_OPEN_DISTANCE)
      :(samePortal?PORTAL_EXIT_DISTANCE:PORTAL_OPEN_DISTANCE);
    const activePortal=this.portalEntryArmed&&closestPortal&&closestPortal.distance<activationDistance?closestPortal.config:undefined;
    if(activePortal?.destination!==this.activePortal?.destination){
      this.activePortal=activePortal;
      this.portalNearby=!!activePortal;
      this.resetPortalCharge();
      gameEvents.emit('world-portal-proximity-changed',activePortal?{destination:activePortal.destination,label:activePortal.label,theme:activePortal.theme,chargeSeconds:activePortal.chargeSeconds}:null);
    }
    if(activePortal?.chargeSeconds&&!this.portalTravelTriggered){
        const chargeDuration=activePortal.chargeSeconds;
        this.portalChargeSeconds+=delta;
        gameEvents.emit('portal-charge-progress',Math.min(1,this.portalChargeSeconds/chargeDuration));
        if(this.portalChargeSeconds>=chargeDuration){
          this.portalTravelTriggered=true;
          gameEvents.emit('travel-to-map',activePortal.destination);
        }
    }
    if(this.options.interaction&&this.interactionPosition){
      const interactionDistance=Math.hypot(nextX-this.interactionPosition.x,nextZ-this.interactionPosition.z);
      if(!this.interactionEntryArmed&&interactionDistance>=INTERACTION_EXIT_DISTANCE)this.interactionEntryArmed=true;
      const interactionNearby=this.interactionEntryArmed&&interactionDistance<(this.interactionNearby?INTERACTION_EXIT_DISTANCE:INTERACTION_OPEN_DISTANCE);
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
    if(this.options.campusFeaturePortals?.length){
      const closest=this.options.campusFeaturePortals.map(config=>({config,distance:Math.hypot(nextX-config.x,nextZ-config.z)})).sort((a,b)=>a.distance-b.distance)[0];
      const same=closest?.config.id===this.campusFeaturePortalNearby;
      const nearby=closest&&closest.distance<(same?INTERACTION_EXIT_DISTANCE:INTERACTION_OPEN_DISTANCE)?closest.config:undefined;
      if(nearby?.id!==this.campusFeaturePortalNearby){
        this.campusFeaturePortalNearby=nearby?.id;
        this.campusFeaturePortalRoots.forEach((root,id)=>{const label=root.userData.label as THREE.Sprite|undefined;if(label)label.material.opacity=!nearby||id===nearby.id?1:.55});
        gameEvents.emit('campus-feature-portal-proximity-changed',nearby?{id:nearby.id,label:nearby.label,description:nearby.description}:null);
      }
    }
    if(this.options.projectRoomInteractions){
      const closest=PROJECT_ROOM_INTERACTIONS
        .map(config=>{
          const position=this.projectRoomInteractionPositions.get(config.id)??config;
          return {config,position,distance:Math.hypot(nextX-position.x,nextZ-position.z)};
        })
        .sort((a,b)=>a.distance-b.distance)[0];
      const same=closest?.config.id===this.projectRoomInteractionNearby;
      const nearby=closest&&closest.distance<closest.position.radius+(same?40:0)?closest.config:undefined;
      if(nearby?.id!==this.projectRoomInteractionNearby){
        this.projectRoomInteractionNearby=nearby?.id;
        this.projectRoomInteractionOutlines.forEach((outline,id)=>{outline.visible=id===nearby?.id});
        gameEvents.emit('project-room-interaction-proximity-changed',nearby??null);
      }
    }
    if(this.options.observatoryTelescopeInteraction&&this.observatoryTelescopePosition&&!this.observatoryTelescopeActive){
      const distance=Math.hypot(nextX-this.observatoryTelescopePosition.x,nextZ-this.observatoryTelescopePosition.z);
      const nearby=distance<this.observatoryTelescopePosition.radius+(this.observatoryTelescopeNearby?45:0);
      if(nearby!==this.observatoryTelescopeNearby){
        this.observatoryTelescopeNearby=nearby;
        if(this.observatoryTelescopeOutline)this.observatoryTelescopeOutline.visible=nearby;
        gameEvents.emit('observatory-telescope-proximity-changed',nearby);
      }
    }
    if(this.options.governmentCentralPlazaWebUi&&!this.governmentWebUiActive){
      const closest=GOVERNMENT_CENTRAL_PLAZA_WEB_UI.map(config=>{
        const position=this.governmentWebUiPositions.get(config.id);
        return position?{config,position,distance:Math.hypot(nextX-position.x,nextZ-position.z)}:undefined;
      }).filter((candidate):candidate is NonNullable<typeof candidate>=>!!candidate).sort((a,b)=>a.distance-b.distance)[0];
      const same=closest?.config.id===this.governmentWebUiNearby;
      const nearby=closest&&closest.distance<closest.position.radius+(same?45:0)?closest.config:undefined;
      if(nearby?.id!==this.governmentWebUiNearby){
        this.governmentWebUiNearby=nearby?.id;
        this.governmentWebUiOutlines.forEach((outline,id)=>{outline.visible=id===nearby?.id});
        gameEvents.emit('government-webui-proximity-changed',nearby??null);
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
    const groundPosition=this.followTarget.set(nextX,sample.height+CHARACTER_GROUND_CLEARANCE,this.worldToSceneZ(nextZ));
    const position=this.localRenderPosition.copy(groundPosition);position.y+=jumpHeight;
    if(emote)this.localCharacter.playEmote(emote,emote==='talking');else this.localCharacter.stopEmote();
    this.localCharacter.update(position,sample.normal,yaw,motion,delta);
    this.followCharacter(groundPosition,delta);this.adjustQuality(delta);this.renderAccumulator+=delta;if(this.renderAccumulator>=this.renderInterval){this.renderAccumulator%=this.renderInterval;this.render()}
    return {x:nextX,z:nextZ,groundHeight:sample.height};
  }

  updateRemoteCharacter(id:string,name:string,model:CharacterModel,parts:CharacterParts,worldX:number,worldZ:number,yaw:number,motion:MotionState,delta:number,jumpHeight=0,emote:CharacterEmote|null=null){
    let character=this.remotes.get(id);if(!character){character=new WorldCharacter(this.scene,name,model,parts,this.options.characterHeight??CHARACTER_HEIGHT);character.root.visible=!this.bearPhotoMode&&this.projectRoomFocus!=='project-kiosk';this.remotes.set(id,character)}
    const previousGround=this.remoteGrounds.get(id),needsGroundSample=!previousGround||Math.hypot(worldX-previousGround.x,worldZ-previousGround.z)>=4;
    const sampled=needsGroundSample?this.sampleGround(worldX,worldZ,previousGround?.height??0,!previousGround):undefined;
    const ground=sampled?{...sampled,x:worldX,z:worldZ}:previousGround??{height:0,normal:new THREE.Vector3(0,1,0),x:worldX,z:worldZ};
    if(needsGroundSample)this.remoteGrounds.set(id,ground);
    if(emote)character.playEmote(emote,emote==='talking');else character.stopEmote();
    character.update(this.remoteRenderPosition.set(worldX,ground.height+CHARACTER_GROUND_CLEARANCE+jumpHeight,this.worldToSceneZ(worldZ)),ground.normal,yaw,motion,delta);
  }

  removeRemoteCharacter(id:string){this.remotes.get(id)?.destroy();this.remotes.delete(id);this.remoteGrounds.delete(id)}

  movementFromScreen(x:number,z:number){
    const azimuth=THREE.MathUtils.degToRad(this.options.cameraAzimuthDeg??0);
    const cosine=Math.cos(azimuth),sine=Math.sin(azimuth);
    return {x:x*cosine+z*sine,z:-x*sine+z*cosine};
  }

  private followCharacter(position:THREE.Vector3,delta:number,immediate=false){
    if(this.overviewActive){this.showMapOverview();return}
    const target=this.followTarget.copy(position);
    const followBounds=this.options.cameraFollowBounds;
    if(followBounds){
      if(followBounds.minX!==undefined)target.x=Math.max(target.x,followBounds.minX);
      if(followBounds.maxX!==undefined)target.x=Math.min(target.x,followBounds.maxX);
      if(followBounds.minZ!==undefined)target.z=Math.max(target.z,this.worldToSceneZ(followBounds.minZ));
      if(followBounds.maxZ!==undefined)target.z=Math.min(target.z,this.worldToSceneZ(followBounds.maxZ));
    }
    target.y+=this.options.cameraTargetHeight??0;
    target.z-=(this.options.cameraScreenOffsetY??0)/GROUND_PROJECTION;
    if(immediate)this.cameraTarget.copy(target);else this.cameraTarget.lerp(target,1-Math.exp(-5*delta));
    const elevation=THREE.MathUtils.degToRad(this.options.cameraElevationDeg??33);
    if(this.camera instanceof THREE.PerspectiveCamera){
      if(this.observatoryTelescopeActive){
        const view=this.observatoryTelescopeView,transition=this.observatoryTelescopeTransition;
        if(!view)return;
        if(transition){
          transition.elapsed=Math.min(.72,transition.elapsed+delta);
          const progress=transition.elapsed/.72,eased=progress*progress*(3-2*progress);
          this.cameraTarget.lerpVectors(transition.target,view.target,eased);
          this.camera.position.lerpVectors(transition.camera,view.camera,eased);
          this.camera.fov=THREE.MathUtils.lerp(transition.fov,24,eased);
          if(progress>=1)this.observatoryTelescopeTransition=undefined;
        }else{
          this.cameraTarget.copy(view.target);
          this.camera.position.copy(view.camera);
          this.camera.fov=24;
        }
        this.camera.aspect=this.width/Math.max(1,this.height);
        this.camera.lookAt(this.cameraTarget);
        this.camera.updateProjectionMatrix();
        return;
      }
      if(this.governmentWebUiActive){
        const view=this.governmentWebUiViews.get(this.governmentWebUiActive),transition=this.governmentWebUiTransition;
        if(!view)return;
        if(transition){
          transition.elapsed=Math.min(.72,transition.elapsed+delta);
          const progress=transition.elapsed/.72,eased=progress*progress*(3-2*progress);
          this.cameraTarget.lerpVectors(transition.target,view.target,eased);
          this.camera.position.lerpVectors(transition.camera,view.camera,eased);
          this.camera.fov=THREE.MathUtils.lerp(transition.fov,view.fov,progress);
          if(progress>=1)this.governmentWebUiTransition=undefined;
        }else{
          this.cameraTarget.copy(view.target);this.camera.position.copy(view.camera);this.camera.fov=view.fov;
        }
        this.camera.aspect=this.width/Math.max(1,this.height);this.camera.lookAt(this.cameraTarget);this.camera.updateProjectionMatrix();this.syncGovernmentWebUiRect();return;
      }
      if(this.projectRoomFocus==='project-kiosk'){
        const view=this.projectRoomKioskView;
        const target=view?.target??this.followTarget.set(1900,205,this.worldToSceneZ(535));
        const transition=this.projectRoomKioskTransition;
        if(transition){
          transition.elapsed=Math.min(.75,transition.elapsed+delta);
          const progress=transition.elapsed/.75;
          const eased=progress*progress*(3-2*progress);
          this.cameraTarget.lerpVectors(transition.target,target,eased);
          if(progress>=1)this.projectRoomKioskTransition=undefined;
        }else this.cameraTarget.copy(target);
        this.camera.aspect=this.width/Math.max(1,this.height);
        this.camera.fov=transition?THREE.MathUtils.lerp(transition.fov,35,transition.elapsed/.75):35;
        const cameraPosition=view?.camera??this.boundsCenter.set(1900,250,this.worldToSceneZ(535)+430);
        if(transition){
          const progress=transition.elapsed/.75;
          const eased=progress*progress*(3-2*progress);
          this.camera.position.lerpVectors(transition.camera,cameraPosition,eased);
        }else this.camera.position.copy(cameraPosition);
        this.camera.lookAt(this.cameraTarget);
        this.camera.updateProjectionMatrix();
        this.syncProjectRoomKioskScreenRect();
        return;
      }
      if(this.options.fixedCameraTarget&&!this.mapBounds.isEmpty())this.mapBounds.getCenter(this.cameraTarget);
      const distance=this.options.cameraDistance??CAMERA_DISTANCE;
      const azimuth=THREE.MathUtils.degToRad(this.options.cameraAzimuthDeg??0);
      const horizontalDistance=Math.cos(elevation)*distance;
      this.camera.aspect=this.width/Math.max(1,this.height);
      this.camera.fov=this.options.cameraFov??42;
      this.camera.position.set(
        this.cameraTarget.x+Math.sin(azimuth)*horizontalDistance,
        this.cameraTarget.y+Math.sin(elevation)*distance,
        this.cameraTarget.z+Math.cos(azimuth)*horizontalDistance,
      );
      this.camera.lookAt(this.cameraTarget);
      this.camera.updateProjectionMatrix();
      return;
    }
    const groundProjection=Math.max(.1,Math.sin(elevation));
    let zoom=this.options.cameraZoom??CAMERA_ZOOM;
    if(this.bearPhotoMode)zoom=1.48;
    if(!this.mapBounds.isEmpty()){
      const center=this.mapBounds.getCenter(this.boundsCenter),size=this.mapBounds.getSize(new THREE.Vector3());
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
    const azimuth=THREE.MathUtils.degToRad(this.options.cameraAzimuthDeg??0);
    const horizontalDistance=Math.cos(elevation)*CAMERA_DISTANCE;
    this.camera.position.set(
      this.cameraTarget.x+Math.sin(azimuth)*horizontalDistance,
      this.cameraTarget.y+Math.sin(elevation)*CAMERA_DISTANCE,
      this.cameraTarget.z+Math.cos(azimuth)*horizontalDistance,
    );
    this.camera.lookAt(this.cameraTarget);this.camera.updateProjectionMatrix();
  }

  private adjustQuality(delta:number){
    if(delta<=0||delta>.1)return;
    this.qualityElapsed+=delta;this.qualityFrameTime+=delta;this.qualityFrames++;
    if(this.qualityElapsed<2)return;
    const average=this.qualityFrameTime/Math.max(1,this.qualityFrames);
    let next=this.pixelRatio;
    if(average>1/36)next=Math.max(MIN_PIXEL_RATIO,this.pixelRatio-.15);
    else if(average<1/52)next=Math.min(this.options.performanceMode?(this.options.performancePixelRatio??1):(this.options.maxPixelRatio??MAX_PIXEL_RATIO),this.pixelRatio+.1);
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
    if(this.projectRoomInteractionNearby)gameEvents.emit('project-room-interaction-proximity-changed',null);
    if(this.observatoryTelescopeNearby)gameEvents.emit('observatory-telescope-proximity-changed',false);
    if(this.observatoryTelescopeActive)gameEvents.emit('observatory-telescope-mode-changed',false);
    if(this.lakeExperienceNearby)gameEvents.emit('lake-experience-proximity-changed',null);
    if(this.bearPhotoNearby)gameEvents.emit('bear-photo-proximity-changed',false);
    if(this.wildlifeClueNearby)gameEvents.emit('bear-clue-proximity-changed',null);
    if(this.localNpcNearbyId){gameEvents.emit('local-npc-proximity-changed',null);gameEvents.emit('local-npc-screen-position',null)}
    if(this.overviewActive)gameEvents.emit('map-overview-changed',false);
    if(this.options.overview)gameEvents.off('map-overview-toggle',this.onMapOverviewToggle);
    if(this.options.mapName==='베어트리파크')gameEvents.off('nature-chapter-progress-changed',this.onNatureChapterProgressChanged);
    if(this.options.bearPhotoZone)gameEvents.off('bear-photo-enter',this.onBearPhotoEnter);
    if(this.options.bearPhotoZone){gameEvents.off('bear-photo-capture',this.onBearPhotoCapture);gameEvents.off('bear-photo-exit',this.onBearPhotoExit)}
    if(this.options.lakeExperiences){
      gameEvents.off('lake-booth-completion-changed',this.onLakeBoothCompletionChanged);
    }
    if(this.options.greenhouse){
      gameEvents.emit('greenhouse-nearby-changed',null);
      gameEvents.off('greenhouse-progress-changed',this.onGreenhouseProgressChanged);
      this.parent.removeEventListener('pointerdown',this.onGreenhousePointerDown);
    }
    if(this.options.campusFeaturePortals){
      gameEvents.off('campus-building-fast-travel',this.onCampusBuildingFastTravel);
    }
    if(this.options.campusFeaturePortals)gameEvents.emit('campus-feature-portal-proximity-changed',null);
    gameEvents.off('game-input-lock',this.onGameInputLock);
    gameEvents.off('local-npc-encounter-focus',this.onLocalNpcEncounterFocus);
    gameEvents.off('local-npc-talking',this.onLocalNpcTalking);
    if(this.options.projectRoomInteractions)gameEvents.off('project-room-focus-changed',this.onProjectRoomFocusChanged);
    if(this.options.projectRoomInteractions)gameEvents.off('project-room-kiosk-activate',this.enterProjectRoomKiosk);
    if(this.options.projectRoomInteractions)window.removeEventListener('pointerdown',this.onProjectRoomKioskPointerDown,true);
    if(this.options.governmentCentralPlazaWebUi)gameEvents.off('government-webui-open',this.enterGovernmentWebUi);
    if(this.options.governmentCentralPlazaWebUi)gameEvents.off('government-webui-close',this.exitGovernmentWebUi);
    if(this.options.observatoryTelescopeInteraction)gameEvents.off('observatory-telescope-enter',this.enterObservatoryTelescope);
    if(this.options.observatoryTelescopeInteraction)gameEvents.off('observatory-telescope-exit',this.exitObservatoryTelescope);
    window.removeEventListener('keydown',this.onWorldPortalKeyDown);
    this.projectRoomInteractionOutlines.forEach(outline=>{outline.geometry.dispose();(outline.material as THREE.Material).dispose()});
    this.projectRoomInteractionOutlines.clear();
    this.projectRoomInteractionPositions.clear();
    this.projectRoomScreenTextures.forEach(texture=>texture.dispose());
    this.projectRoomScreenTextures=[];
    this.governmentWebUiOutlines.forEach(outline=>{outline.geometry.dispose();(outline.material as THREE.Material).dispose()});
    this.governmentWebUiOutlines.clear();this.governmentWebUiPositions.clear();this.governmentWebUiViews.clear();this.governmentWebUiScreens.clear();
    this.governmentWebUiTextures.forEach(texture=>texture.dispose());this.governmentWebUiTextures=[];
    if(this.observatoryTelescopeOutline){this.observatoryTelescopeOutline.geometry.dispose();(this.observatoryTelescopeOutline.material as THREE.Material).dispose();this.observatoryTelescopeOutline=undefined}
    this.localCharacter?.destroy();this.guideNpc?.destroy();this.localNpcs.forEach(npc=>npc.character.destroy());this.localNpcs=[];this.remotes.forEach(character=>character.destroy());this.remotes.clear();this.remoteGrounds.clear();
    this.scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Points){object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(material=>material.dispose())}if(object instanceof THREE.Sprite){object.material.map?.dispose();object.material.dispose()}});
    this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();
  }
}
