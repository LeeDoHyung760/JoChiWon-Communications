export type ProjectRoomInteractionId='project-board'|'ai-recommendation-screen'|'project-kiosk'|'collaboration-table';

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
    label:'새 프로젝트 만들기',
    radius:2.6*METRE,
    radiusMeters:2.6,
    x:1915,
    z:470,
    objectNames:['Kiosk_Screen_Inner'],
  },
];
