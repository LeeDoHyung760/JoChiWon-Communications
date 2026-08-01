import '@google/model-viewer';
import type { ModelViewerElement } from '@google/model-viewer';
import Phaser from 'phaser';
import { getPart } from '../../data/assetManifest';
import chungnyeongIdleModel from '../../assets/characters/chungnyeong_idle.glb?url';
import chungnyeongWalkModel from '../../assets/characters/chungnyeong_walk.glb?url';
import chungnyeongRunModel from '../../assets/characters/chungnyeong_run.glb?url';
import girl1Model from '../../assets/characters/girl_metaverse_animated.glb?url';
import boy1Model from '../../assets/characters/boy_metaverse.glb?url';
import clothsModel from '../../assets/characters/men_total.glb?url';
import womenModel from '../../assets/characters/women_total.glb?url';
import type { CharacterModel,CharacterParts } from '../../types';
import type { MotionState } from '../../../shared/socket-events';
import { characterDebugEnabled,characterSettings } from '../character/characterSettings';
import { smoothAngle,yawDegrees } from '../character/characterMotion';

const hex=(color:string)=>Number(color.replace('#','0x'));
const modelByState:{[K in Exclude<CharacterModel,'custom'>]:Record<MotionState,string>}={
  chungnyeong:{idle:chungnyeongIdleModel,walk:chungnyeongWalkModel,run:chungnyeongRunModel},
  girl1:{idle:girl1Model,walk:girl1Model,run:girl1Model},
  boy1:{idle:boy1Model,walk:boy1Model,run:boy1Model},
  cloths:{idle:clothsModel,walk:clothsModel,run:clothsModel},
  women:{idle:womenModel,walk:womenModel,run:womenModel}
};
export const CHARACTER_ANIMATION_CLIP='NlaTrack';
const animationClipByState:{[K in Exclude<CharacterModel,'custom'>]:Record<MotionState,string>}={
  chungnyeong:{idle:'NlaTrack',walk:'NlaTrack',run:'NlaTrack'},
  girl1:{idle:'NlaTrack.002',walk:'NlaTrack.001',run:'NlaTrack'},
  boy1:{idle:'NlaTrack',walk:'NlaTrack.002',run:'NlaTrack.001'},
  cloths:{idle:'standing',walk:'walking',run:'running'},
  women:{idle:'standing',walk:'walking',run:'running'}
};
const femaleMotionDuration:Record<'walk'|'run',number>={walk:2.375,run:1.292};
const motionDurationByModel:{[K in Exclude<CharacterModel,'custom'>]:Record<'walk'|'run',number>}={
  chungnyeong:{...femaleMotionDuration},
  girl1:{...femaleMotionDuration},
  boy1:{...femaleMotionDuration},
  cloths:{walk:1.167,run:.667},
  women:{walk:1.167,run:.667},
};
export const CHARACTER_MODEL_FILES={idle:'chungnyeong_idle.glb',walk:'chungnyeong_walk.glb',run:'chungnyeong_run.glb'} as const;
let lastDebugPublished=0;

function femaleMatchedAnimationTimeScale(model:Exclude<CharacterModel,'custom'>,motionState:MotionState){
  if(motionState==='idle')return 1;
  const configured=motionState==='walk'?characterSettings.walkAnimationTimeScale:characterSettings.runAnimationTimeScale;
  return configured*motionDurationByModel[model][motionState]/femaleMotionDuration[motionState];
}

function playModelAnimation(element:ModelViewerElement,model:Exclude<CharacterModel,'custom'>,motionState:MotionState){
  const clip=animationClipByState[model][motionState],clips=element.availableAnimations;
  if(!clips.length){element.pause();return}
  if(clips.length&&!clips.includes(clip)){console.error(`[Character] ${clip} animation not found. Available animations: ${clips.join(', ')}`);return}
  element.animationName=clip;element.currentTime=0;element.play({repetitions:Infinity,pingpong:false});
}

export interface AvatarMotionUpdate{targetYaw:number;movementX:number;movementY:number;motionState:MotionState}
export interface AvatarContainer extends Phaser.GameObjects.Container{
  bodyLayer:Phaser.GameObjects.Container;
  limbs:{leftArm:Phaser.GameObjects.Rectangle;rightArm:Phaser.GameObjects.Rectangle;leftLeg:Phaser.GameObjects.Rectangle;rightLeg:Phaser.GameObjects.Rectangle};
  modelElement?:ModelViewerElement;modelVisual?:Phaser.GameObjects.DOMElement;nameLabel?:Phaser.GameObjects.DOMElement;debugGraphics?:Phaser.GameObjects.Graphics;
}

function createNameLabel(scene:Phaser.Scene,name:string,is3d:boolean){
  const element=document.createElement('div');
  element.className='phaser-name-label';
  const status=document.createElement('i'),text=document.createElement('span');
  text.textContent=name;
  element.append(status,text);
  element.style.zIndex='20';
  return scene.add.dom(0,is3d?-142:-92,element).setOrigin(.5).setDepth(2500);
}

export function createAvatar(scene:Phaser.Scene,x:number,y:number,parts:CharacterParts,name:string,scale=1,model:CharacterModel='chungnyeong',renderVisual=true){
  const root=scene.add.container(x,y) as AvatarContainer,bodyLayer=scene.add.container(0,0);
  const skin=hex(getPart('face',parts.face).color),top=hex(getPart('top',parts.top).color),bottom=hex(getPart('bottom',parts.bottom).color),is3d=model!=='custom';
  const legColor=is3d?0x3c3028:bottom,bodyColor=is3d?0xb52d2b:top;
  const shadow=scene.add.ellipse(0,10,is3d?46:38,14,0x192d2a,.22),leftLeg=scene.add.rectangle(-8,0,10,25,legColor).setOrigin(.5,0),rightLeg=scene.add.rectangle(8,0,10,25,legColor).setOrigin(.5,0),body=scene.add.rectangle(0,-22,is3d?38:28,is3d?34:28,bodyColor).setStrokeStyle(2,is3d?0x6e1818:0xffffff,.35),leftArm=scene.add.rectangle(is3d?-25:-20,-22,is3d?11:8,31,is3d?bodyColor:skin).setOrigin(.5,0),rightArm=scene.add.rectangle(is3d?25:20,-22,is3d?11:8,31,is3d?bodyColor:skin).setOrigin(.5,0),face=scene.add.circle(0,is3d?-50:-43,is3d?15:13,skin),hair=scene.add.arc(0,is3d?-55:-47,is3d?16:14,190,350,false,is3d?0x593421:hex(getPart('hair',parts.hair).color)),eyes=scene.add.text(0,is3d?-50:-44,is3d?'• ᴗ •':'• •',{fontSize:'8px',color:'#263238'}).setOrigin(.5),label=renderVisual?createNameLabel(scene,name,is3d):undefined;
  root.nameLabel=label;
  if(is3d&&renderVisual){
    const element=document.createElement('model-viewer') as ModelViewerElement;
    const modelState=modelByState[model as Exclude<CharacterModel,'custom'>];
    element.src=modelState.idle;
    element.alt=`${model} 3D 캐릭터`;
    element.className='phaser-character-model';
    element.setAttribute('interaction-prompt','none');element.setAttribute('shadow-intensity','1');element.setAttribute('environment-image','neutral');element.setAttribute('camera-orbit','0deg 78deg auto');element.setAttribute('animation-name',animationClipByState[model as Exclude<CharacterModel,'custom'>].idle);element.setAttribute('autoplay','')
    Object.assign(element.style,{width:'128px',height:'160px',pointerEvents:'none',background:'transparent'});
    element.addEventListener('load',()=>{const motionState=(root.getData('motionState')??'idle') as MotionState;console.log('[Character] GLB loaded',{src:element.src,availableAnimations:element.availableAnimations});playModelAnimation(element,model as Exclude<CharacterModel,'custom'>,motionState)});
    element.addEventListener('error',event=>console.error('[Character] GLB load error',{src:element.src,event}));
    root.modelElement=element;root.modelVisual=scene.add.dom(0,characterSettings.visualOffsetY,element).setOrigin(.5).setDepth(1000);root.add([shadow,root.modelVisual,...(label?[label]:[])]);
    root.setData('characterModel',model);root.setData('modelSource',modelState.idle);
    if(characterDebugEnabled){root.debugGraphics=scene.add.graphics().setDepth(2000);root.add(root.debugGraphics)}
  }else if(!is3d&&renderVisual){bodyLayer.add([leftLeg,rightLeg,leftArm,rightArm,body,face,hair,eyes]);root.add([shadow,bodyLayer,...(label?[label]:[])])}
  root.bodyLayer=bodyLayer;root.limbs={leftArm,rightArm,leftLeg,rightLeg};root.setData('isChungnyeong',is3d);root.setData('motionState','idle');root.setData('visualYaw',0);root.setData('targetYaw',0);root.setScale(scale).setSize(is3d?80:42,is3d?120:78).setInteractive();return root;
}

export function animateAvatar(avatar:AvatarContainer,update:AvatarMotionUpdate,deltaSeconds:number){
  const {targetYaw,movementX,movementY,motionState}=update;
  if(avatar.getData('isChungnyeong')){
    const currentYaw=smoothAngle(avatar.getData('visualYaw')??targetYaw,targetYaw,characterSettings.rotationSpeed,deltaSeconds);
    avatar.setData('visualYaw',currentYaw);avatar.setData('targetYaw',targetYaw);
    const element=avatar.modelElement,previous=avatar.getData('motionState') as MotionState,model=avatar.getData('characterModel') as Exclude<CharacterModel,'custom'>;
    if(element){
      const modelState=modelByState[model];
      element.cameraOrbit=`${yawDegrees(-currentYaw+characterSettings.modelForwardOffset)}deg 78deg auto`;
      element.timeScale=femaleMatchedAnimationTimeScale(model,motionState);
      if(previous!==motionState){
        const nextSource=modelState[motionState];avatar.setData('motionState',motionState);
        if(avatar.getData('modelSource')!==nextSource){avatar.setData('modelSource',nextSource);element.src=nextSource}
        else playModelAnimation(element,model,motionState);
      }
    }
    avatar.modelVisual?.setPosition(0,characterSettings.visualOffsetY).setScale(characterSettings.visualScale);
    if(avatar.debugGraphics){
      const graphics=avatar.debugGraphics.clear(),draw=(yaw:number,color:number,length:number)=>{const x=Math.sin(yaw)*length,y=Math.cos(yaw)*length;graphics.lineStyle(3,color,1).lineBetween(0,0,x,y).fillStyle(color,1).fillTriangle(x,y,x+Math.sin(yaw+2.5)*9,y+Math.cos(yaw+2.5)*9,x+Math.sin(yaw-2.5)*9,y+Math.cos(yaw-2.5)*9)};
      draw(currentYaw,0xff4d4d,58);if(movementX||movementY)draw(Math.atan2(movementX,movementY),0x35a7ff,45);
    }
    if(characterDebugEnabled&&!avatar.getData('network-user')&&performance.now()-lastDebugPublished>100){lastDebugPublished=performance.now();window.dispatchEvent(new CustomEvent('character-debug-frame',{detail:{file:model==='girl1'?'girl_metaverse_animated.glb':model==='boy1'?'boy_metaverse.glb':model==='cloths'?'men_total.glb':model==='women'?'women_total.glb':CHARACTER_MODEL_FILES[motionState],position:{x:avatar.x,y:avatar.y},yaw:currentYaw,targetYaw,motionState,clip:animationClipByState[model][motionState],movement:{x:movementX,y:movementY},speed:motionState==='run'?characterSettings.runSpeed:motionState==='walk'?characterSettings.walkSpeed:0,deltaTime:deltaSeconds,availableClips:element?.availableAnimations??[],rootMotionDetected:false}}))}
    return;
  }
  const swing=motionState==='idle'?0:Math.sin(performance.now()*.015)*24;avatar.limbs.leftArm.setAngle(swing);avatar.limbs.rightArm.setAngle(-swing);avatar.limbs.leftLeg.setAngle(-swing*.55);avatar.limbs.rightLeg.setAngle(swing*.55);avatar.bodyLayer.setScale(movementX<0?-1:1,1);
}
