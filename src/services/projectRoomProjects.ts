import type { UserProfile } from '../types';
import { buildAiSejongProfile } from './aiSejongProfile';
import { analyzeBearTravel,loadBearTravelProgress } from './bearTravelStyle';

export interface Project{
  id:string;
  title:string;
  summary:string;
  description:string;
  placeIds:string[];
  activityTypes:string[];
  tags:string[];
  leaderId:string;
  memberIds:string[];
  applicantIds:string[];
  maxMembers:number;
  startDate?:string;
  deadline?:string;
  preferredTraits:string[];
  status:'recruiting'|'planning'|'active'|'completed';
  thumbnail?:string;
  createdAt:string;
  visibility?:'public'|'private';
  sponsorClubId?:string;
  sponsorClubName?:string;
  sponsorClubInterests?:string[];
}

export interface ProjectApplication{
  id:string;
  projectId:string;
  applicantId:string;
  profileSnapshot:{
    festivals:string[];
    activities:string[];
    representativePlant?:string;
    emotionKeywords:string[];
    travelStyle?:string;
    preferredPlaces:string[];
    introduction?:string;
  };
  message?:string;
  status:'pending'|'accepted'|'rejected';
  createdAt:string;
}

export interface AIProjectRecommendation{
  projectId:string;
  matchScore:number;
  reasons:string[];
  commonInterests:string[];
  recommendedRole?:string;
}

const PROJECTS_KEY='sejong-project-room-projects-v1';
const APPLICATIONS_KEY='sejong-project-room-applications-v1';

const seedProjects:Project[]=[
  {id:'garden-photo',title:'수목원 사진 기록 프로젝트',summary:'계절별 식물과 풍경을 사진으로 기록해요.',description:'국립세종수목원을 함께 걸으며 대표 식물과 계절의 변화를 촬영하고 작은 온라인 도감을 완성합니다.',placeIds:['국립세종수목원'],activityTypes:['사진','자연','조사'],tags:['사진','자연','수목원','기록'],leaderId:'초록산책',memberIds:['초록산책','하늘여우'],applicantIds:[],maxMembers:5,startDate:'2026-08-08',deadline:'2026-08-05',preferredTraits:['사진 기록형','여유형','대화 중심'],status:'recruiting',thumbnail:'🌸',createdAt:'2026-07-20T09:00:00.000Z'},
  {id:'night-festival',title:'세종 야간축제 탐방 프로젝트',summary:'공연과 야경을 함께 탐방하고 축제 지도를 만들어요.',description:'호수공원 야간축제의 공연, 먹거리, 포토존을 나누어 조사한 뒤 방문자용 추천 지도를 제작합니다.',placeIds:['세종호수공원'],activityTypes:['축제','탐방','사진'],tags:['야간축제','공연','사진','호수공원'],leaderId:'별빛여행',memberIds:['별빛여행','밤산책'],applicantIds:[],maxMembers:6,startDate:'2026-08-15',deadline:'2026-08-10',preferredTraits:['탐색형','자유형','실행 중심'],status:'recruiting',thumbnail:'🎆',createdAt:'2026-07-22T09:00:00.000Z'},
  {id:'market-culture',title:'전통시장 문화 기록 프로젝트',summary:'상인 인터뷰와 로컬 먹거리를 기록해요.',description:'전통시장의 오래된 가게와 새로운 청년 상점을 찾아 인터뷰하고 세종의 생활문화를 카드뉴스로 남깁니다.',placeIds:['전통시장'],activityTypes:['문화','인터뷰','조사'],tags:['전통시장','문화','인터뷰','먹거리'],leaderId:'시장탐험가',memberIds:['시장탐험가','복숭아소다','기록자'],applicantIds:[],maxMembers:5,startDate:'2026-08-22',deadline:'2026-08-16',preferredTraits:['계획형','대화 중심','실행 중심'],status:'recruiting',thumbnail:'🏮',createdAt:'2026-07-24T09:00:00.000Z'},
];

function readArray<T>(key:string,fallback:T[]){
  try{
    const value=JSON.parse(localStorage.getItem(key)??'null');
    return Array.isArray(value)?value as T[]:fallback;
  }catch{return fallback}
}

export function loadProjectRoomProjects(){
  const saved=readArray<Project>(PROJECTS_KEY,[]);
  if(saved.length){
    let changed=false;
    const projects=saved.map(project=>{
      if(!project.title.includes('여고'))return project;
      const members=[...new Set([project.leaderId,...project.memberIds])];
      while(members.length<3)members.push(`여고 프로젝트 팀원 ${members.length+1}`);
      const next={...project,maxMembers:3,memberIds:members.slice(0,3),status:'active' as const};
      if(project.maxMembers!==next.maxMembers||project.status!==next.status||project.memberIds.join('|')!==next.memberIds.join('|'))changed=true;
      return next;
    });
    if(changed)localStorage.setItem(PROJECTS_KEY,JSON.stringify(projects));
    return projects;
  }
  localStorage.setItem(PROJECTS_KEY,JSON.stringify(seedProjects));
  return seedProjects;
}

export function saveProjectRoomProjects(projects:Project[]){
  localStorage.setItem(PROJECTS_KEY,JSON.stringify(projects));
  window.dispatchEvent(new CustomEvent('project-room-projects-updated'));
}

export function loadProjectApplications(){
  return readArray<ProjectApplication>(APPLICATIONS_KEY,[]);
}

export function saveProjectApplications(applications:ProjectApplication[]){
  localStorage.setItem(APPLICATIONS_KEY,JSON.stringify(applications));
}

function lakeRecord(){
  try{return JSON.parse(localStorage.getItem('sejong-lake-interest-profile-v1')??'null') as {savedContentIds?:unknown;activities?:unknown;likedCourseTitles?:unknown}|null}catch{return null}
}

export function buildProjectProfileSnapshot(profile:UserProfile,introduction=''){
  const ai=buildAiSejongProfile(profile);
  const lake=lakeRecord();
  const bearProgress=loadBearTravelProgress(profile.nickname);
  const bear=bearProgress.result??(bearProgress.route.length?analyzeBearTravel(bearProgress):undefined);
  return {
    festivals:Array.isArray(lake?.savedContentIds)?lake.savedContentIds.filter((item):item is string=>typeof item==='string'):[],
    activities:[...(Array.isArray(lake?.activities)?lake.activities.filter((item):item is string=>typeof item==='string'):[]),...profile.interests],
    representativePlant:ai.representativePlant?.name,
    emotionKeywords:ai.emotionCounts.map(item=>item.label),
    travelStyle:bear?.title??ai.decisionProfile?.title??profile.usagePurposes[0],
    preferredPlaces:[...profile.preferredPlaceCategories,...ai.recommendedCourse],
    introduction:introduction||ai.oneLineAnalysis,
  };
}

const unique=(items:string[])=>[...new Set(items.filter(Boolean))];

export function recommendProjects(projects:Project[],profile:UserProfile):AIProjectRecommendation[]{
  const snapshot=buildProjectProfileSnapshot(profile);
  const signals=unique([...snapshot.activities,...snapshot.festivals,...snapshot.preferredPlaces,...snapshot.emotionKeywords,snapshot.travelStyle??'']).join(' ');
  return projects.filter(project=>project.status==='recruiting').map(project=>{
    const searchable=[project.title,project.summary,...project.tags,...project.activityTypes,...project.placeIds,...project.preferredTraits].join(' ');
    const common=unique([...project.tags,...project.activityTypes].filter(item=>signals.includes(item)||profile.interests.some(interest=>item.includes(interest)||interest.includes(item))));
    let score=58+Math.min(24,common.length*7);
    const reasons:string[]=[];
    if(/사진|기록/.test(signals)&&/사진|기록/.test(searchable)){score+=9;reasons.push('사진과 기록을 선호하는 체험 성향이 프로젝트 활동과 잘 맞아요.')}
    if(/축제|공연|야간/.test(signals)&&/축제|공연|야간/.test(searchable)){score+=10;reasons.push('저장한 축제와 공연 관심사가 프로젝트 주제와 겹쳐요.')}
    if(/자연|식물|수목원|평온/.test(signals)&&/자연|식물|수목원/.test(searchable)){score+=10;reasons.push(`${snapshot.representativePlant??'자연 공간'}에 대한 기록을 프로젝트에서 이어갈 수 있어요.`)}
    if(/시장|먹거리|문화/.test(signals)&&/시장|먹거리|문화/.test(searchable)){score+=8;reasons.push('지역 먹거리와 문화 공간에 대한 관심을 현장 기록으로 확장할 수 있어요.')}
    if(!reasons.length)reasons.push(`${profile.nickname||'사용자'}님의 관심 장소와 함께 활동하려는 목적을 반영했어요.`);
    reasons.push(`${project.placeIds[0]}에서 ${project.activityTypes.slice(0,2).join('·')} 활동을 경험할 수 있어요.`);
    const style=snapshot.travelStyle??'자유형';
    const role=/계획|효율/.test(style)?'일정 관리':/사진|기록/.test(signals)?'사진 기록':/탐색|자유/.test(style)?'현장 탐방':'기록·감상';
    return {projectId:project.id,matchScore:Math.min(98,score),reasons:reasons.slice(0,3),commonInterests:common.slice(0,4),recommendedRole:role};
  }).sort((a,b)=>b.matchScore-a.matchScore).slice(0,3);
}

export function createProjectApplication(project:Project,profile:UserProfile,message:string,applications:ProjectApplication[]){
  if(applications.some(item=>item.projectId===project.id&&item.applicantId===profile.nickname))return applications;
  const application:ProjectApplication={
    id:`application-${Date.now()}`,
    projectId:project.id,
    applicantId:profile.nickname,
    profileSnapshot:buildProjectProfileSnapshot(profile,message),
    message,
    status:'pending',
    createdAt:new Date().toISOString(),
  };
  return [application,...applications];
}

export function suggestProjectCopy(place:string,purpose:string,activityTypes:string[]=[]){
  const normalizedPlace=place.trim(),normalizedPurpose=purpose.trim().replace(/[.!?]+$/,'');
  const context=`${normalizedPurpose} ${activityTypes.join(' ')}`;
  const focus=/인터뷰/.test(context)?'이야기 기록단':/사진/.test(context)?'사진 기록단':/축제/.test(context)?'축제 탐방단':/조사/.test(context)?'현장 조사단':/코스|기획/.test(context)?'로컬 기획단':'함께 활동단';
  const shortPlace=normalizedPlace.replace('국립세종','').replace(/^세종시?\s*/,'').trim()||normalizedPlace;
  const activityCopy=activityTypes.length?activityTypes.slice(0,3).join('·'):'현장 탐방';
  const tags=unique([...activityTypes,/식물|자연|수목원/.test(`${normalizedPlace} ${normalizedPurpose}`)?'자연':'문화',shortPlace,'기록']);
  return {
    title:`${shortPlace} ${focus}`.trim(),
    summary:`${normalizedPlace}에서 ${activityCopy} 활동을 하며 ${normalizedPurpose||'새로운 장소와 이야기를 함께 발견하고 기록하는'} 프로젝트입니다.`,
    tags,
  };
}

export function suggestProjectTraits(place:string,purpose:string,activityTypes:string[]=[]){
  const context=`${place} ${purpose} ${activityTypes.join(' ')}`;
  const suggested:string[]=[];
  if(/사진|영상|기록/.test(context))suggested.push('사진 기록형');
  if(/탐방|자연|산책|여행/.test(context))suggested.push('탐색형');
  if(/조사|기획|제작|일정|지도/.test(context))suggested.push('계획형');
  if(/축제|공연|체험/.test(context))suggested.push('자유형');
  if(/휴식|여유|산책|자연/.test(context))suggested.push('여유형');
  if(/코스|관리|정리|완성/.test(context))suggested.push('효율형');
  if(/인터뷰|문화|이야기|소통/.test(context))suggested.push('대화 중심');
  if(/조사|실행|탐방|제작|기록/.test(context))suggested.push('실행 중심');
  return unique(suggested).slice(0,4).length?unique(suggested).slice(0,4):['실행 중심','대화 중심'];
}
