import type { MapId } from '../../shared/socket-events';

export interface PersonalFarmPortalAccessContext {
  sourceMapId:MapId;
}

export function canAccessPersonalFarmPortal({sourceMapId}:PersonalFarmPortalAccessContext):boolean {
  return sourceMapId==='bear-tree-park'||sourceMapId==='garden'||sourceMapId==='personal-farm';
}
