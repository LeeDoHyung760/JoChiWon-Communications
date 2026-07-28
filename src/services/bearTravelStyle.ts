export type BearTravelPoint='waterfall'|'cave'|'tree';
export type BearTravelResult={
  title:string;
  movement:'계획형'|'자유형';
  pace:'여유형'|'효율형';
  activity:string;
  companion:'함께 관람형'|'독립 탐험 후 합류형'|'주도형'|'배려형';
  information:'꼼꼼한 정보형'|'핵심 정보형';
  description:string;
  route:BearTravelPoint[];
  completedAt:string;
};
export type BearTravelProgress={
  route:BearTravelPoint[];
  choices:Partial<Record<BearTravelPoint,string>>;
  dwellSeconds:Partial<Record<BearTravelPoint,number>>;
  photoCaptured:boolean;
  companionChoice?:string;
  result?:BearTravelResult;
};

const key=(userKey:string)=>`bear-travel-style-v2:${userKey.trim().toLowerCase()||'guest'}`;
export const emptyBearTravelProgress=():BearTravelProgress=>({route:[],choices:{},dwellSeconds:{},photoCaptured:false});
export function loadBearTravelProgress(userKey:string):BearTravelProgress{
  try{
    const value=JSON.parse(localStorage.getItem(key(userKey))??'null') as BearTravelProgress|null;
    return value&&Array.isArray(value.route)&&value.choices?{...emptyBearTravelProgress(),...value}:emptyBearTravelProgress();
  }catch{return emptyBearTravelProgress()}
}
export function saveBearTravelProgress(userKey:string,progress:BearTravelProgress){
  localStorage.setItem(key(userKey),JSON.stringify(progress));
  window.dispatchEvent(new CustomEvent('bear-travel-style-updated'));
}

type ActivityKind='사진형'|'탐색형'|'학습형'|'휴식형';
const activityTags:Record<string,ActivityKind>={
  photo:'사진형',poses:'사진형',explore:'탐색형',deep:'탐색형',info:'학습형',observe:'학습형',rest:'휴식형',scenery:'휴식형',
};
export function analyzeBearTravel(progress:BearTravelProgress):BearTravelResult{
  const scores:Record<ActivityKind,number>={'사진형':0,'탐색형':0,'학습형':0,'휴식형':0};
  Object.values(progress.choices).forEach(choice=>{const tag=activityTags[choice];if(tag)scores[tag]++});
  if(progress.photoCaptured)scores['사진형']+=2;
  const ranked=(Object.entries(scores) as Array<[ActivityKind,number]>).sort((a,b)=>b[1]-a[1]),activity=ranked.filter(([,score])=>score===ranked[0][1]).slice(0,2).map(([name])=>name.replace('형','')).join('·')+'형';
  const average=Object.values(progress.dwellSeconds).reduce((sum,value)=>sum+value,0)/Math.max(1,Object.keys(progress.dwellSeconds).length);
  const pace:BearTravelResult['pace']=average>=18||Object.values(progress.choices).some(value=>value==='rest'||value==='scenery'||value==='observe')?'여유형':'효율형';
  const movement:BearTravelResult['movement']=progress.route.join(',')==='waterfall,cave,tree'?'계획형':'자유형';
  const companionMap:Record<string,BearTravelResult['companion']>={wait:'배려형',return:'독립 탐험 후 합류형',lead:'주도형',rejoin:'함께 관람형'};
  const companion=companionMap[progress.companionChoice??'rejoin']??'함께 관람형';
  const information=Object.values(progress.choices).filter(value=>value==='info'||value==='observe'||value==='deep').length>=2?'꼼꼼한 정보형':'핵심 정보형';
  const title=`${movement==='자유형'?'자유로운':'차근차근'} ${activity.replace('형','')} 탐험가`;
  const depth=pace==='여유형'?'마음에 든 장소에 머물며 깊게 경험하는':'여러 장소의 핵심을 빠르게 발견하는';
  return {title,movement,pace,activity,companion,information,route:progress.route,completedAt:new Date().toISOString(),description:`${movement==='자유형'?'정해진 순서보다 눈에 끌리는 장소를 먼저 방문하고':'계획한 흐름을 따라 장소를 빠짐없이 살피고'}, ${depth} 여행이 잘 맞습니다.`};
}
