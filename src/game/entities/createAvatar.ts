import '@google/model-viewer';
import Phaser from 'phaser';
import { getPart } from '../../data/assetManifest';
import chungnyeongIdleModel from '../../assets/characters/chungnyeong_idle.glb?url';
import chungnyeongWalkModel from '../../assets/characters/chungnyeong_walk.glb?url';
import chungnyeongRunModel from '../../assets/characters/chungnyeong_run.glb?url';
import type { CharacterModel,CharacterParts } from '../../types';
const hex=(c:string)=>Number(c.replace('#','0x'));
const chungnyeongModelByState = {
  idle: chungnyeongIdleModel,
  walk: chungnyeongWalkModel,
  run: chungnyeongRunModel,
} as const;
export interface AvatarContainer extends Phaser.GameObjects.Container { bodyLayer:Phaser.GameObjects.Container; limbs:{leftArm:Phaser.GameObjects.Rectangle;rightArm:Phaser.GameObjects.Rectangle;leftLeg:Phaser.GameObjects.Rectangle;rightLeg:Phaser.GameObjects.Rectangle} }
export function createAvatar(scene:Phaser.Scene,x:number,y:number,parts:CharacterParts,name:string,scale=1,model:CharacterModel='custom'){
 const root=scene.add.container(x,y) as AvatarContainer;const bodyLayer=scene.add.container(0,0);const skin=hex(getPart('face',parts.face).color),top=hex(getPart('top',parts.top).color),bottom=hex(getPart('bottom',parts.bottom).color);
 const isChungnyeong=model==='chungnyeong',legColor=isChungnyeong?0x3c3028:bottom,bodyColor=isChungnyeong?0xb52d2b:top;
 const shadow=scene.add.ellipse(0,10,isChungnyeong?46:38,14,0x192d2a,.22),leftLeg=scene.add.rectangle(-8,0,10,25,legColor).setOrigin(.5,0),rightLeg=scene.add.rectangle(8,0,10,25,legColor).setOrigin(.5,0),body=scene.add.rectangle(0,-22,isChungnyeong?38:28,isChungnyeong?34:28,bodyColor).setStrokeStyle(2,isChungnyeong?0x6e1818:0xffffff,.35),leftArm=scene.add.rectangle(isChungnyeong?-25:-20,-22,isChungnyeong?11:8,31,isChungnyeong?bodyColor:skin).setOrigin(.5,0),rightArm=scene.add.rectangle(isChungnyeong?25:20,-22,isChungnyeong?11:8,31,isChungnyeong?bodyColor:skin).setOrigin(.5,0),face=scene.add.circle(0,isChungnyeong?-50:-43,isChungnyeong?15:13,skin),hair=scene.add.arc(0,isChungnyeong?-55:-47,isChungnyeong?16:14,190,350,false,isChungnyeong?0x593421:hex(getPart('hair',parts.hair).color)),eyes=scene.add.text(0,isChungnyeong?-50:-44,isChungnyeong?'• ᴗ •':'• •',{fontSize:isChungnyeong?'8px':'8px',color:'#263238'}).setOrigin(.5),label=scene.add.text(0,isChungnyeong?-88:-72,name,{fontFamily:'Arial, sans-serif',fontSize:'12px',color:'#173b36',backgroundColor:'#ffffffdd',padding:{x:6,y:3}}).setOrigin(.5);
 const extras:Phaser.GameObjects.GameObject[]=[];let domAvatar:Phaser.GameObjects.DOMElement|undefined;let modelEl:HTMLElement|undefined;
 if(isChungnyeong){
   extras.push(scene.add.rectangle(0,-37,30,5,0x5a3522),scene.add.circle(0,-69,8,0x5a3522),scene.add.rectangle(0,-76,8,10,0x5a3522),scene.add.circle(-17,-29,6,0xb48b2b).setStrokeStyle(2,0x6d4d0f),scene.add.circle(17,-29,6,0xb48b2b).setStrokeStyle(2,0x6d4d0f));
   modelEl=document.createElement('model-viewer');
   modelEl.src=chungnyeongModelByState.idle;
   modelEl.alt='충녕이 3D 캐릭터';
   modelEl.setAttribute('camera-controls','');
   modelEl.setAttribute('disable-zoom','');
   modelEl.setAttribute('interaction-prompt','none');
   modelEl.setAttribute('shadow-intensity','1');
   modelEl.setAttribute('environment-image','neutral');
   modelEl.setAttribute('camera-orbit','25deg 78deg auto');
   modelEl.setAttribute('animation-name','NlaTrack');
   modelEl.setAttribute('animation-loop','true');
   modelEl.setAttribute('animation-crossfade-duration','150');
   modelEl.className='phaser-chungnyeong-model';
   modelEl.style.width='128px';
   modelEl.style.height='160px';
   modelEl.style.pointerEvents='none';
   modelEl.addEventListener('load',()=>{
     const viewer=(modelEl as any);
     console.log('[Chungnyeong model loaded] availableAnimations', viewer.availableAnimations);
     if(viewer.availableAnimations?.length){
       viewer.animationName='NlaTrack';
     }
   });
   domAvatar=scene.add.dom(0,-45,modelEl).setOrigin(0.5,0.5).setDepth(1000);
 }
 if(isChungnyeong){root.add([shadow,domAvatar!,label]);}else{bodyLayer.add([leftLeg,rightLeg,leftArm,rightArm,body,...extras,face,hair,eyes]);root.add([shadow,bodyLayer,label]);}
 root.bodyLayer=bodyLayer;root.limbs={leftArm,rightArm,leftLeg,rightLeg};root.setData('isChungnyeong',isChungnyeong);root.setData('modelViewer',modelEl);root.setData('animationState','idle');root.setData('currentDirection','down');root.setData('isMoving',false);root.setData('moveStartTime',0);root.setScale(scale).setSize(isChungnyeong?80:42,isChungnyeong?120:78).setInteractive();return root;
}
export function animateAvatar(avatar:AvatarContainer,isMoving:boolean,time:number,direction:DirectionLike='down'){
  if(avatar.getData('isChungnyeong')){
    const prevMoving=avatar.getData('isMoving') as boolean;
    const prevDirection=avatar.getData('currentDirection') as DirectionLike;
    const prevState=avatar.getData('animationState') as string;
    if(isMoving && !prevMoving){avatar.setData('moveStartTime',time)}
    avatar.setData('isMoving',isMoving);
    avatar.setData('currentDirection',direction);
    const start=avatar.getData('moveStartTime') as number;
    const elapsed=isMoving?Math.max(0,time-start):0;
    const nextState=isMoving?elapsed>=1500?'run':'walk':'idle';
    if(nextState!==prevState||direction!==prevDirection){
      avatar.setData('animationState',nextState);
      const modelEl=avatar.getData('modelViewer') as HTMLElement|undefined;
      if(modelEl?.tagName==='MODEL-VIEWER'){
        const nextModelSrc=chungnyeongModelByState[nextState];
        if(modelEl.getAttribute('src')!==nextModelSrc){
          modelEl.setAttribute('src',nextModelSrc);
        }
        modelEl.setAttribute('animation-name','NlaTrack');
        modelEl.setAttribute('animation-loop','true');
        modelEl.setAttribute('animation-crossfade-duration','150');
        const orbit=direction==='down'?'25deg 78deg auto':direction==='left'?'-90deg 78deg auto':direction==='right'?'90deg 78deg auto':'180deg 78deg auto';
        modelEl.setAttribute('camera-orbit',orbit);
      }
    }
    avatar.bodyLayer.setScale(direction==='left'?-1:1,1);
    return;
  }
  const swing=isMoving?Math.sin(time*.015)*24:0;avatar.limbs.leftArm.setAngle(swing);avatar.limbs.rightArm.setAngle(-swing);avatar.limbs.leftLeg.setAngle(-swing*.55);avatar.limbs.rightLeg.setAngle(swing*.55);avatar.bodyLayer.setScale(direction==='left'?-1:1,1)
}
type DirectionLike='up'|'down'|'left'|'right';
