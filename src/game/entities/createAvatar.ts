import '@google/model-viewer';
import type { ModelViewerElement } from '@google/model-viewer';
import Phaser from 'phaser';
import { getPart } from '../../data/assetManifest';
import chungnyeongIdleModel from '../../assets/characters/chungnyeong_idle.glb?url';
import chungnyeongWalkModel from '../../assets/characters/chungnyeong_walk.glb?url';
import chungnyeongRunModel from '../../assets/characters/chungnyeong_run.glb?url';
import type { CharacterModel,CharacterParts } from '../../types';
import type { MotionState } from '../../../shared/socket-events';
import { characterDebugEnabled,characterSettings } from '../character/characterSettings';
import { smoothAngle,yawDegrees } from '../character/characterMotion';

const hex=(color:string)=>Number(color.replace('#','0x'));
const modelByState:Record<MotionState,string>={idle:chungnyeongIdleModel,walk:chungnyeongWalkModel,run:chungnyeongRunModel};
export const CHARACTER_ANIMATION_CLIP='NlaTrack';
export const CHARACTER_MODEL_FILES={idle:'chungnyeong_idle.glb',walk:'chungnyeong_walk.glb',run:'chungnyeong_run.glb'} as const;
let lastDebugPublished=0;

export interface AvatarMotionUpdate{targetYaw:number;movementX:number;movementY:number;motionState:MotionState}
export interface AvatarContainer extends Phaser.GameObjects.Container{
  bodyLayer:Phaser.GameObjects.Container;
  limbs:{leftArm:Phaser.GameObjects.Rectangle;rightArm:Phaser.GameObjects.Rectangle;leftLeg:Phaser.GameObjects.Rectangle;rightLeg:Phaser.GameObjects.Rectangle};
  modelElement?:ModelViewerElement;modelVisual?:Phaser.GameObjects.DOMElement;debugGraphics?:Phaser.GameObjects.Graphics;
}

export function createAvatar(scene:Phaser.Scene,x:number,y:number,parts:CharacterParts,name:string,scale=1,model:CharacterModel='chungnyeong'){
  const root=scene.add.container(x,y) as AvatarContainer,bodyLayer=scene.add.container(0,0);
  const skin=hex(getPart('face',parts.face).color),top=hex(getPart('top',parts.top).color),bottom=hex(getPart('bottom',parts.bottom).color),is3d=model==='chungnyeong';
  const legColor=is3d?0x3c3028:bottom,bodyColor=is3d?0xb52d2b:top;
  const shadow=scene.add.ellipse(0,10,is3d?46:38,14,0x192d2a,.22),leftLeg=scene.add.rectangle(-8,0,10,25,legColor).setOrigin(.5,0),rightLeg=scene.add.rectangle(8,0,10,25,legColor).setOrigin(.5,0),body=scene.add.rectangle(0,-22,is3d?38:28,is3d?34:28,bodyColor).setStrokeStyle(2,is3d?0x6e1818:0xffffff,.35),leftArm=scene.add.rectangle(is3d?-25:-20,-22,is3d?11:8,31,is3d?bodyColor:skin).setOrigin(.5,0),rightArm=scene.add.rectangle(is3d?25:20,-22,is3d?11:8,31,is3d?bodyColor:skin).setOrigin(.5,0),face=scene.add.circle(0,is3d?-50:-43,is3d?15:13,skin),hair=scene.add.arc(0,is3d?-55:-47,is3d?16:14,190,350,false,is3d?0x593421:hex(getPart('hair',parts.hair).color)),eyes=scene.add.text(0,is3d?-50:-44,is3d?'• ᴗ •':'• •',{fontSize:'8px',color:'#263238'}).setOrigin(.5),label=scene.add.text(0,is3d?-88:-72,name,{fontFamily:'Arial, sans-serif',fontSize:'12px',color:'#173b36',backgroundColor:'#ffffffdd',padding:{x:6,y:3}}).setOrigin(.5);
  if(is3d){
    const element=document.createElement('model-viewer') as ModelViewerElement;element.src=modelByState.idle;element.alt='충녕이 3D 캐릭터';element.className='phaser-chungnyeong-model';
    element.setAttribute('interaction-prompt','none');element.setAttribute('shadow-intensity','1');element.setAttribute('environment-image','neutral');element.setAttribute('camera-orbit','0deg 78deg auto');element.setAttribute('animation-name',CHARACTER_ANIMATION_CLIP);element.setAttribute('autoplay','');
    Object.assign(element.style,{width:'128px',height:'160px',pointerEvents:'none',background:'transparent'});
    element.addEventListener('load',()=>{const clips=element.availableAnimations;console.log('[Character] GLB loaded',{src:element.src,availableAnimations:clips});if(!clips.includes(CHARACTER_ANIMATION_CLIP))console.error(`[Character] ${CHARACTER_ANIMATION_CLIP} animation not found. Available animations: ${clips.join(', ')}`);else{element.animationName=CHARACTER_ANIMATION_CLIP;element.play({repetitions:Infinity,pingpong:false})}});
    element.addEventListener('error',event=>console.error('[Character] GLB load error',{src:element.src,event}));
    root.modelElement=element;root.modelVisual=scene.add.dom(0,characterSettings.visualOffsetY,element).setOrigin(.5).setDepth(1000);root.add([shadow,root.modelVisual,label]);
    if(characterDebugEnabled){root.debugGraphics=scene.add.graphics().setDepth(2000);root.add(root.debugGraphics)}
  }else{bodyLayer.add([leftLeg,rightLeg,leftArm,rightArm,body,face,hair,eyes]);root.add([shadow,bodyLayer,label])}
  root.bodyLayer=bodyLayer;root.limbs={leftArm,rightArm,leftLeg,rightLeg};root.setData('isChungnyeong',is3d);root.setData('motionState','idle');root.setData('visualYaw',0);root.setData('targetYaw',0);root.setScale(scale).setSize(is3d?80:42,is3d?120:78).setInteractive();return root;
}

export function animateAvatar(avatar:AvatarContainer,update:AvatarMotionUpdate,deltaSeconds:number){
  const {targetYaw,movementX,movementY,motionState}=update;
  if(avatar.getData('isChungnyeong')){
    const currentYaw=smoothAngle(avatar.getData('visualYaw')??targetYaw,targetYaw,characterSettings.rotationSpeed,deltaSeconds);
    avatar.setData('visualYaw',currentYaw);avatar.setData('targetYaw',targetYaw);
    const element=avatar.modelElement,previous=avatar.getData('motionState') as MotionState;
    if(element){
      element.cameraOrbit=`${yawDegrees(-currentYaw+characterSettings.modelForwardOffset)}deg 78deg auto`;
      element.timeScale=motionState==='walk'?characterSettings.walkAnimationTimeScale:motionState==='run'?characterSettings.runAnimationTimeScale:1;
      if(previous!==motionState){element.src=modelByState[motionState];avatar.setData('motionState',motionState)}
    }
    avatar.modelVisual?.setPosition(0,characterSettings.visualOffsetY).setScale(characterSettings.visualScale);
    if(avatar.debugGraphics){
      const graphics=avatar.debugGraphics.clear(),draw=(yaw:number,color:number,length:number)=>{const x=Math.sin(yaw)*length,y=Math.cos(yaw)*length;graphics.lineStyle(3,color,1).lineBetween(0,0,x,y).fillStyle(color,1).fillTriangle(x,y,x+Math.sin(yaw+2.5)*9,y+Math.cos(yaw+2.5)*9,x+Math.sin(yaw-2.5)*9,y+Math.cos(yaw-2.5)*9)};
      draw(currentYaw,0xff4d4d,58);if(movementX||movementY)draw(Math.atan2(movementX,movementY),0x35a7ff,45);
    }
    if(characterDebugEnabled&&!avatar.getData('network-user')&&performance.now()-lastDebugPublished>100){lastDebugPublished=performance.now();window.dispatchEvent(new CustomEvent('character-debug-frame',{detail:{file:CHARACTER_MODEL_FILES[motionState],position:{x:avatar.x,y:avatar.y},yaw:currentYaw,targetYaw,motionState,clip:CHARACTER_ANIMATION_CLIP,movement:{x:movementX,y:movementY},speed:motionState==='run'?characterSettings.runSpeed:motionState==='walk'?characterSettings.walkSpeed:0,deltaTime:deltaSeconds,availableClips:[CHARACTER_ANIMATION_CLIP],rootMotionDetected:false}}))}
    return;
  }
  const swing=motionState==='idle'?0:Math.sin(performance.now()*.015)*24;avatar.limbs.leftArm.setAngle(swing);avatar.limbs.rightArm.setAngle(-swing);avatar.limbs.leftLeg.setAngle(-swing*.55);avatar.limbs.rightLeg.setAngle(swing*.55);avatar.bodyLayer.setScale(movementX<0?-1:1,1);
}
