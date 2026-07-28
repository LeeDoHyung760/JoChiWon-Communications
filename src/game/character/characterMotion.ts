import type { Direction,MotionState } from '../../../shared/socket-events';

export interface MovementVector{x:number;y:number}
export interface MovementInput{left:boolean;right:boolean;up:boolean;down:boolean}
export interface FocusedControl{tagName?:string;isContentEditable?:boolean}

export function movementInputBlocked(inputLocked:boolean,focused?:FocusedControl|null):boolean{
  if(inputLocked)return true;
  return ['INPUT','TEXTAREA','SELECT'].includes(focused?.tagName?.toUpperCase()??'')||!!focused?.isContentEditable;
}

export function jumpInputBlocked(inputLocked:boolean,focused?:FocusedControl|null):boolean{
  return movementInputBlocked(inputLocked,focused)||(focused?.tagName?.toUpperCase()??'')==='BUTTON';
}

export function normalizedMovement(input:MovementInput):MovementVector{
  const x=Number(input.right)-Number(input.left),y=Number(input.down)-Number(input.up);
  const length=Math.hypot(x,y);return length?{x:x/length,y:y/length}:{x:0,y:0};
}
// Phaser's fixed top-down camera uses screen/world +X right and +Y down. Yaw 0 therefore means down.
export function movementYaw({x,y}:MovementVector):number{return Math.atan2(x,y)}
export function directionFromMovement({x,y}:MovementVector,last:Direction='down'):Direction{
  if(!x&&!y)return last;return Math.abs(x)>Math.abs(y)?x<0?'left':'right':y<0?'up':'down';
}
export function motionState(movement:MovementVector,running:boolean):MotionState{
  return !movement.x&&!movement.y?'idle':running?'run':'walk';
}
export function shortestAngleDelta(current:number,target:number):number{
  const twoPi=Math.PI*2;let delta=((target-current+Math.PI)%twoPi+twoPi)%twoPi-Math.PI;
  if(delta<=-Math.PI)delta=Math.PI;return delta;
}
export function smoothAngle(current:number,target:number,speed:number,deltaSeconds:number):number{
  return current+shortestAngleDelta(current,target)*(1-Math.exp(-speed*deltaSeconds));
}
export function directionYaw(direction:Direction):number{
  return {down:0,right:Math.PI/2,up:Math.PI,left:-Math.PI/2}[direction];
}
export function yawDegrees(yaw:number):number{return yaw*180/Math.PI}
