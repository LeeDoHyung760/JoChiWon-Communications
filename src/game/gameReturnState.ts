import type { MapId } from '../../shared/socket-events';

export interface GameReturnState{
  mapId:MapId;
  x:number;
  z:number;
  yaw:number;
}
