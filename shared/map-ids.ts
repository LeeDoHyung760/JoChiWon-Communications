import type {MapId} from './socket-events.js';

export const OFFICIAL_MAP_IDS=['personal-farm','town','arts-center','festival-experience','food-experience','club-street-festival','bear-tree-park','garden','campus','student-hall','recruitment-center','project-room','government','government-central-plaza','government-policy-hall','government-observatory','sejong-smart-city','jochwon-station','traditional-market','jochwon-park','college-street'] as const satisfies readonly MapId[];
export function isMapId(value:string):value is MapId{return (OFFICIAL_MAP_IDS as readonly string[]).includes(value)}
export function normalizeLegacyMapId(value:string):MapId{if(value==='bear-play-zone')return 'bear-tree-park';return isMapId(value)?value:'town'}
