export type ProjectRoomKioskInteractionId='project-kiosk'|'lobby-kiosk-1'|'lobby-kiosk-2';
export type ProjectRoomInteractionId='project-board'|'ai-recommendation-screen'|ProjectRoomKioskInteractionId|'collaboration-table';

export const isProjectRoomKioskInteraction=(id:ProjectRoomInteractionId|undefined):id is ProjectRoomKioskInteractionId=>
  id==='project-kiosk'||id==='lobby-kiosk-1'||id==='lobby-kiosk-2';

export interface ProjectRoomInteraction{
  id:ProjectRoomInteractionId;
  label:string;
  radius:number;
  radiusMeters:number;
  x:number;
  z:number;
  objectNames:string[];
}

const METRE=123;

export const PROJECT_ROOM_INTERACTIONS:ProjectRoomInteraction[]=[
  {
    id:'collaboration-table',
    label:'협업 테이블에서 코스 편집',
    radius:4.2*METRE,
    radiusMeters:4.2,
    x:1200,
    z:1010,
    objectNames:['Collaboration_Table_Top','Collaboration_Table_Inset'],
  },
  {
    id:'project-board',
    label:'모집 프로젝트 보기',
    radius:2*METRE,
    radiusMeters:2,
    x:300,
    z:685,
    objectNames:['Idea_Board_Frame'],
  },
  {
    id:'ai-recommendation-screen',
    label:'나에게 맞는 프로젝트 보기',
    radius:2.5*METRE,
    radiusMeters:2.5,
    x:1200,
    z:390,
    objectNames:['Project_Screen_Frame'],
  },
  {
    id:'project-kiosk',
    label:'키오스크 사용하기',
    radius:2.6*METRE,
    radiusMeters:2.6,
    x:1915,
    z:470,
    objectNames:['Kiosk_Screen_Inner'],
  },
  {
    id:'lobby-kiosk-1',
    label:'키오스크 사용하기',
    radius:2.6*METRE,
    radiusMeters:2.6,
    x:1200,
    z:1040,
    objectNames:['Lobby_Kiosk_Screen'],
  },
  {
    id:'lobby-kiosk-2',
    label:'키오스크 사용하기',
    radius:2.6*METRE,
    radiusMeters:2.6,
    x:1500,
    z:1040,
    objectNames:['Lobby_Kiosk_Screen_2'],
  },
];
