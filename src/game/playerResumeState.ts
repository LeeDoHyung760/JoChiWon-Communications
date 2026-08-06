import type { MapId,PlayerResumeState } from '../../shared/socket-events';
import {normalizeLegacyMapId} from '../../shared/map-ids';

const key=(nickname:string)=>`player-resume-state-v1-${nickname.trim()||'guest'}`;
const validMapIds:Set<MapId>=new Set(['town','arts-center','festival-experience','food-experience','club-street-festival','bear-tree-park','garden','campus','student-hall','recruitment-center','project-room','government','government-central-plaza','government-policy-hall','government-observatory','sejong-smart-city','jochwon-station','traditional-market','jochwon-park','college-street','personal-farm']);

export function loadLocalPlayerResumeState(nickname:string):PlayerResumeState|null{
  try{
    const value=JSON.parse(localStorage.getItem(key(nickname))??'null') as Partial<PlayerResumeState>|null;
    const rawMapId=typeof value?.mapId==='string'?value.mapId:'';const normalized=rawMapId?normalizeLegacyMapId(rawMapId):null;
    return value&&normalized&&validMapIds.has(normalized)&&Number.isFinite(value.x)&&Number.isFinite(value.z)&&Number.isFinite(value.yaw)
      ?{mapId:normalized,x:value.x!,z:value.z!,yaw:value.yaw!,savedAt:Number.isFinite(value.savedAt)?value.savedAt:0}
      :null;
  }catch{return null}
}

export function saveLocalPlayerResumeState(nickname:string,state:Omit<PlayerResumeState,'savedAt'>){
  localStorage.setItem(key(nickname),JSON.stringify({...state,savedAt:Date.now()}));
}
