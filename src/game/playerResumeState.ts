import type { MapId,PlayerResumeState } from '../../shared/socket-events';

const key=(nickname:string)=>`player-resume-state-v1-${nickname.trim()||'guest'}`;
const validMapIds:Set<MapId>=new Set(['town','arts-center','festival-experience','food-experience','club-street-festival','bear-tree-park','bear-play-zone','garden','campus','student-hall','recruitment-center','project-room','government','government-central-plaza','government-policy-hall','government-observatory','sejong-smart-city','jochwon-station','traditional-market','jochwon-park','college-street']);

export function loadLocalPlayerResumeState(nickname:string):PlayerResumeState|null{
  try{
    const value=JSON.parse(localStorage.getItem(key(nickname))??'null') as Partial<PlayerResumeState>|null;
    return value&&validMapIds.has(value.mapId as MapId)&&Number.isFinite(value.x)&&Number.isFinite(value.z)&&Number.isFinite(value.yaw)
      ?{mapId:value.mapId as MapId,x:value.x!,z:value.z!,yaw:value.yaw!,savedAt:Number.isFinite(value.savedAt)?value.savedAt:0}
      :null;
  }catch{return null}
}

export function saveLocalPlayerResumeState(nickname:string,state:Omit<PlayerResumeState,'savedAt'>){
  localStorage.setItem(key(nickname),JSON.stringify({...state,savedAt:Date.now()}));
}
