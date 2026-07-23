import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import villageModelUrl from '../../assets/maps/sejong-lake-park.glb?url';
import chungnyeongIdleUrl from '../../assets/characters/chungnyeong_idle.glb?url';
import chungnyeongWalkUrl from '../../assets/characters/chungnyeong_walk.glb?url';
import chungnyeongRunUrl from '../../assets/characters/chungnyeong_run.glb?url';
import girlUrl from '../../assets/characters/girl1_3종.glb?url';
import boyUrl from '../../assets/characters/boy1_3종.glb?url';
import type { CharacterModel,CharacterParts,UserProfile } from '../../types';
import type { MotionState } from '../../../shared/socket-events';
import { gameEvents } from '../events';

const WORLD_WIDTH=2400;
const WORLD_HEIGHT=1900;
const CAMERA_ELEVATION=THREE.MathUtils.degToRad(33);
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
const RENDER_INTERVAL=1/60;
const CAMERA_ZOOM=1.28;
const MIN_PIXEL_RATIO=1;
const MAX_PIXEL_RATIO=Math.min(window.devicePixelRatio||1,1.6);
let textureAnisotropy=4;
export const LAKE_PARK_SPAWN:{x:number;z:number;yaw:number}={x:2000,z:1180,yaw:2.1};
const LAKE_PARK_GUIDE={x:2045,z:1138,yaw:-.78} as const;
const GUIDE_POSITION_KEY='sejong-lake-park-guide-position';

type CharacterState={scene:THREE.Object3D;mixer?:THREE.AnimationMixer;action?:THREE.AnimationAction};
type GroundSample={height:number;normal:THREE.Vector3};
type RemoteGroundSample=GroundSample&{x:number;z:number};
type GuidePosition={x:number;z:number;yaw:number};
type LoadedModel=Awaited<ReturnType<GLTFLoader['loadAsync']>>;
const modelAssetCache=new Map<string,Promise<LoadedModel>>();
const loadModel=(url:string)=>{
  let pending=modelAssetCache.get(url);
  if(!pending){pending=new GLTFLoader().loadAsync(url);modelAssetCache.set(url,pending)}
  return pending;
};

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

function lastGuidePosition():GuidePosition{
  try{
    const saved=JSON.parse(localStorage.getItem(GUIDE_POSITION_KEY)??'null') as Partial<GuidePosition>|null;
    if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.z)&&Number.isFinite(saved.yaw)&&saved.x!>=40&&saved.x!<=WORLD_WIDTH-40&&saved.z!>=40&&saved.z!<=WORLD_HEIGHT-40)return {x:saved.x!,z:saved.z!,yaw:saved.yaw!};
  }catch{/* Fall back to the original sign-side position. */}
  return {...LAKE_PARK_GUIDE};
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
    }catch(error){console.error('[World character] GLB load error',{model,error});this.createFallback({hair:'',face:'',top:'',bottom:''})}
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
  private guidePosition=lastGuidePosition();
  private guideNearby=false;
  private remotes=new Map<string,WorldCharacter>();
  private remoteGrounds=new Map<string,RemoteGroundSample>();
  private localX=LAKE_PARK_SPAWN.x;
  private localZ=LAKE_PARK_SPAWN.z;
  private localGround=0;
  private localNormal=new THREE.Vector3(0,1,0);
  private cameraTarget=new THREE.Vector3(LAKE_PARK_SPAWN.x,0,this.worldToSceneZ(LAKE_PARK_SPAWN.z));

  constructor(parent:HTMLElement,profile:UserProfile){
    this.parent=parent;
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
    const shadowSize=window.innerWidth>=800&&this.renderer.capabilities.maxTextureSize>=8192?1024:512;
    sun.position.set(1900,1400,1850);sun.target.position.set(WORLD_WIDTH/2,0,WORLD_HEIGHT/2);sun.castShadow=true;sun.shadow.mapSize.set(shadowSize,shadowSize);sun.shadow.camera.near=10;sun.shadow.camera.far=4000;
    sun.shadow.camera.left=-1300;sun.shadow.camera.right=1300;sun.shadow.camera.top=1100;sun.shadow.camera.bottom=-1100;sun.shadow.bias=-.00015;
    this.scene.add(sun,sun.target);
    this.camera.up.set(0,1,0);this.camera.near=.1;this.camera.far=5000;
    parent.prepend(this.renderer.domElement);
    this.resize();
    this.localCharacter=new WorldCharacter(this.scene,profile.nickname,profile.model,profile.character);
    this.ready=this.loadVillage();
  }

  private async loadVillage(){
    try{
      const gltf=await new GLTFLoader().loadAsync(villageModelUrl);
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
      const guideGround=this.sampleGround(this.guidePosition.x,this.guidePosition.z,0,true);
      if(guideGround){
        this.guideNpcPosition.set(this.guidePosition.x,guideGround.height+CHARACTER_GROUND_CLEARANCE,this.worldToSceneZ(this.guidePosition.z));
        this.guideNpcNormal.copy(guideGround.normal);
        this.guideNpc=new WorldCharacter(this.scene,'충녕이 · 안내 NPC','chungnyeong',{hair:'',face:'',top:'',bottom:''},GUIDE_CHARACTER_HEIGHT,true);
        this.guideNpc.update(this.guideNpcPosition,this.guideNpcNormal,this.guidePosition.yaw,'idle',0);
      }
      const startPosition=new THREE.Vector3(this.localX,this.localGround+CHARACTER_GROUND_CLEARANCE,this.worldToSceneZ(this.localZ));
      this.localCharacter.update(startPosition,this.localNormal,LAKE_PARK_SPAWN.yaw,'idle',0);
      await Promise.all([this.localCharacter.ready,this.guideNpc?.ready]);
      if(this.destroyed)return;
      this.mapReady=true;
      this.followCharacter(startPosition,0,true);
      this.localCharacter.warmup(this.renderer,this.scene,this.camera);
      this.guideNpc?.warmup(this.renderer,this.scene,this.camera);
      this.render();
      console.log('[Sejong Lake Park world] unified 3D scene ready',{meshes:this.mapMeshes.length,scale});
    }catch(error){console.error('[Sejong Lake Park world] GLB load error',error)}
  }

  setVisible(visible:boolean){this.renderer.domElement.style.display=visible?'block':'none'}
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
    const positionChanged=Math.hypot(proposedX-this.localX,proposedZ-this.localZ)>.001;
    let nextX=proposedX,nextZ=proposedZ,sample=positionChanged?(this.bodyPathClear(nextX,nextZ)?this.sampleGround(nextX,nextZ,this.localGround):undefined):{height:this.localGround,normal:this.localNormal};
    if(!sample){nextZ=this.localZ;sample=this.bodyPathClear(nextX,nextZ)?this.sampleGround(nextX,nextZ,this.localGround):undefined}
    if(!sample){nextX=this.localX;nextZ=proposedZ;sample=this.bodyPathClear(nextX,nextZ)?this.sampleGround(nextX,nextZ,this.localGround):undefined}
    if(!sample){nextX=this.localX;nextZ=this.localZ;sample={height:this.localGround,normal:this.localNormal}}
    this.localX=nextX;this.localZ=nextZ;this.localGround=sample.height;this.localNormal.copy(sample.normal);
    const guideDistance=Math.hypot(nextX-this.guidePosition.x,nextZ-this.guidePosition.z);
    const guideNearby=guideDistance<(this.guideNearby?GUIDE_TALK_EXIT_DISTANCE:GUIDE_TALK_DISTANCE);
    if(guideNearby!==this.guideNearby){this.guideNearby=guideNearby;gameEvents.emit('guide-proximity-changed',guideNearby)}
    const position=new THREE.Vector3(nextX,sample.height+CHARACTER_GROUND_CLEARANCE,this.worldToSceneZ(nextZ));
    this.localCharacter.update(position,sample.normal,yaw,motion,delta);
    this.guideNpc?.update(this.guideNpcPosition,this.guideNpcNormal,this.guidePosition.yaw,'idle',delta);
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
    if(immediate)this.cameraTarget.copy(position);else this.cameraTarget.lerp(position,1-Math.exp(-5*delta));
    if(!this.mapBounds.isEmpty()){
      const center=this.mapBounds.getCenter(new THREE.Vector3()),halfWidth=this.width/(2*CAMERA_ZOOM),groundHalfDepth=this.height/(2*CAMERA_ZOOM*GROUND_PROJECTION),minX=this.mapBounds.min.x+halfWidth,maxX=this.mapBounds.max.x-halfWidth,minZ=this.mapBounds.min.z+groundHalfDepth,maxZ=this.mapBounds.max.z-groundHalfDepth;
      this.cameraTarget.x=minX<=maxX?THREE.MathUtils.clamp(this.cameraTarget.x,minX,maxX):center.x;
      this.cameraTarget.z=minZ<=maxZ?THREE.MathUtils.clamp(this.cameraTarget.z,minZ,maxZ):center.z;
    }
    this.camera.left=-this.width/(2*CAMERA_ZOOM);this.camera.right=this.width/(2*CAMERA_ZOOM);this.camera.top=this.height/(2*CAMERA_ZOOM);this.camera.bottom=-this.height/(2*CAMERA_ZOOM);
    this.camera.position.set(this.cameraTarget.x,Math.sin(CAMERA_ELEVATION)*CAMERA_DISTANCE,this.cameraTarget.z+Math.cos(CAMERA_ELEVATION)*CAMERA_DISTANCE);
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
    this.destroyed=true;this.localCharacter.destroy();this.guideNpc?.destroy();this.remotes.forEach(character=>character.destroy());this.remotes.clear();this.remoteGrounds.clear();
    this.scene.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(material=>material.dispose())}});
    this.renderer.dispose();this.renderer.domElement.remove();
  }
}
