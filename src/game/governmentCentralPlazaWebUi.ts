export type GovernmentCentralPlazaWebUiId='experience-analysis'|'course-recommendation'|'course-browser';

export interface GovernmentCentralPlazaWebUiSurface{
  id:GovernmentCentralPlazaWebUiId;
  objectName:string;
  label:string;
  eyebrow:string;
}

export const GOVERNMENT_CENTRAL_PLAZA_WEB_UI:GovernmentCentralPlazaWebUiSurface[]=[
  {id:'experience-analysis',objectName:'WebUI_Surface_Right',label:'체험 데이터 분석',eyebrow:'EXPERIENCE DATA'},
  {id:'course-recommendation',objectName:'WebUI_Surface_Center',label:'여행코스 추천',eyebrow:'AI COURSE CENTER'},
  {id:'course-browser',objectName:'WebUI_Surface_Left',label:'추천 코스 둘러보기',eyebrow:'RECOMMENDED COURSES'},
];
