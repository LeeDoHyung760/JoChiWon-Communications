export type GovernmentCentralPlazaWebUiId='experience-analysis'|'course-recommendation'|'course-browser';

export interface GovernmentCentralPlazaWebUiSurface{
  id:GovernmentCentralPlazaWebUiId;
  objectName:string;
  label:string;
  eyebrow:string;
}

export const GOVERNMENT_CENTRAL_PLAZA_WEB_UI:GovernmentCentralPlazaWebUiSurface[]=[
  {id:'experience-analysis',objectName:'WebUI_Surface_Right',label:'프로젝트 가져오기',eyebrow:'01 · PROJECT IMPORT'},
  {id:'course-recommendation',objectName:'WebUI_Surface_Center',label:'AI 여행 일정 확정센터',eyebrow:'02 · AI COURSE PLANNER'},
  {id:'course-browser',objectName:'WebUI_Surface_Left',label:'일정 저장 및 방문',eyebrow:'03 · FINAL APPROVAL'},
];
