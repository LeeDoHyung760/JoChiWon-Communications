import type { CampusFeaturePortalId } from '../../shared/socket-events';

export const CAMPUS_BUILDINGS:Record<CampusFeaturePortalId,{label:string;icon:string;feature:string}>={
  people:{label:'학생회관',icon:'🏫',feature:'AI 친구 추천 · 프로필 · 자유게시판'},
  clubs:{label:'동아리관',icon:'🏠',feature:'동아리 가입 · 단체 채팅 · 동아리 활동'},
  government:{label:'프로젝트실',icon:'💡',feature:'함께 코스 만들기 · 프로젝트 생성'},
  recruit:{label:'모집센터',icon:'📢',feature:'동행 모집 · 참가 신청'},
};

const storageKey=(nickname:string)=>`campus-visited-buildings:${nickname.trim().toLowerCase()||'guest'}`;
const isCampusBuilding=(value:unknown):value is CampusFeaturePortalId=>value==='people'||value==='clubs'||value==='government'||value==='recruit';

export function loadVisitedCampusBuildings(nickname:string):CampusFeaturePortalId[]{
  try{
    const parsed=JSON.parse(localStorage.getItem(storageKey(nickname))??'[]') as unknown;
    return Array.isArray(parsed)?parsed.filter(isCampusBuilding):[];
  }catch{return []}
}

export function recordCampusBuildingVisit(nickname:string,id:CampusFeaturePortalId){
  const visited=loadVisitedCampusBuildings(nickname);
  const next=visited.includes(id)?visited:[...visited,id];
  localStorage.setItem(storageKey(nickname),JSON.stringify(next));
  return next;
}
