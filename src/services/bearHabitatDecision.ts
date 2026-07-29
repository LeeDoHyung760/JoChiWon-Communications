export type HabitatResearchPoint='bearA'|'bearB'|'cave'|'food'|'water';
export type HabitatResource='cave'|'food'|'water';
export type HabitatMapPosition={x:number;z:number};
export type CaveAllocation='bearA'|'bearB'|'shared'|'time_split';
export type FoodPolicy='bearA'|'bearB'|'shared'|'time_split';
export type WaterPolicy='bearA'|'bearB'|'shared'|'time_split';
export type DecisionCriterion='need'|'safety'|'fairness'|'efficiency'|'adaptability';

export type HabitatDecisionResult={
  title:'균형 설계형'|'안전 우선형'|'효율 운영형'|'공정 균형형'|'상황 적응형';
  criteria:Array<{id:DecisionCriterion;label:string;score:number}>;
  response:string;
  interpretation:string;
  courseStrategy:string;
  mapAnalysis:string;
  completedAt:string;
};

export type BearHabitatProgress={
  researchOrder:HabitatResearchPoint[];
  researchedBears:Array<'bearA'|'bearB'>;
  designBearOrder:Array<'bearA'|'bearB'>;
  caveAllocation?:CaveAllocation;
  foodPolicy?:FoodPolicy;
  waterPolicy?:WaterPolicy;
  resourcePositions:Partial<Record<HabitatResource,HabitatMapPosition>>;
  placementOrder:HabitatResource[];
  placementChanges:number;
  result?:HabitatDecisionResult;
};

const storageKey=(userKey:string)=>`bear-habitat-design-v4:${userKey.trim().toLowerCase()||'guest'}`;
export const emptyBearHabitatProgress=():BearHabitatProgress=>({researchOrder:[],researchedBears:[],designBearOrder:[],resourcePositions:{},placementOrder:[],placementChanges:0});

export function loadBearHabitatProgress(userKey:string):BearHabitatProgress{
  try{
    const value=JSON.parse(localStorage.getItem(storageKey(userKey))??'null') as BearHabitatProgress|null;
    return value&&Array.isArray(value.researchOrder)&&Array.isArray(value.researchedBears)
      ?{...emptyBearHabitatProgress(),...value}
      :emptyBearHabitatProgress();
  }catch{return emptyBearHabitatProgress()}
}

export function saveBearHabitatProgress(userKey:string,progress:BearHabitatProgress){
  localStorage.setItem(storageKey(userKey),JSON.stringify(progress));
  window.dispatchEvent(new CustomEvent('bear-habitat-decision-updated'));
}

const labels:Record<DecisionCriterion,string>={need:'필요',safety:'안전',fairness:'공정',efficiency:'효율',adaptability:'적응'};
type Scores=Record<DecisionCriterion,number>;
const add=(scores:Scores,values:Partial<Scores>)=>Object.entries(values).forEach(([key,value])=>{scores[key as DecisionCriterion]+=value??0});

export function analyzeBearHabitat(progress:BearHabitatProgress):HabitatDecisionResult{
  const scores:Scores={need:0,safety:0,fairness:0,efficiency:0,adaptability:0};
  const cave:Record<CaveAllocation,Partial<Scores>>={
    bearA:{need:3,efficiency:1},bearB:{need:4,safety:4},shared:{fairness:4,safety:1},time_split:{safety:4,fairness:2},
  };
  const food:Record<FoodPolicy,Partial<Scores>>={
    bearA:{need:4,efficiency:1},bearB:{need:4,efficiency:1},shared:{fairness:5,efficiency:1},time_split:{safety:3,fairness:3,efficiency:1},
  };
  const water:Record<WaterPolicy,Partial<Scores>>={
    bearA:{need:4,efficiency:1},bearB:{need:4,safety:1},shared:{fairness:5},time_split:{safety:4,fairness:2},
  };
  if(progress.caveAllocation)add(scores,cave[progress.caveAllocation]);
  if(progress.foodPolicy)add(scores,food[progress.foodPolicy]);
  if(progress.waterPolicy)add(scores,water[progress.waterPolicy]);
  if(progress.placementChanges)add(scores,{adaptability:Math.min(7,progress.placementChanges*3)});
  const bearPositions={bearA:{x:1325,z:1410},bearB:{x:1125,z:1435}};
  const distance=(a:HabitatMapPosition,b:HabitatMapPosition)=>Math.hypot(a.x-b.x,a.z-b.z);
  const positioned=(Object.entries(progress.resourcePositions) as Array<[HabitatResource,HabitatMapPosition]>).filter((entry):entry is [HabitatResource,HabitatMapPosition]=>Number.isFinite(entry[1]?.x)&&Number.isFinite(entry[1]?.z));
  const layoutDistances=positioned.map(([resource,position])=>({
    resource,position,bearA:Math.round(distance(position,bearPositions.bearA)),bearB:Math.round(distance(position,bearPositions.bearB)),
  }));
  const pairDistances=positioned.flatMap(([,position],index)=>positioned.slice(index+1).map(([,other])=>distance(position,other)));
  const averageSpread=pairDistances.length?pairDistances.reduce((sum,value)=>sum+value,0)/pairDistances.length:0;
  if(positioned.length===3){
    if(averageSpread<420)add(scores,{efficiency:3});
    else if(averageSpread>800)add(scores,{safety:2,adaptability:1});
    else add(scores,{fairness:2,adaptability:1});
    const caveDistance=layoutDistances.find(item=>item.resource==='cave');
    if(progress.caveAllocation==='bearB'&&caveDistance&&caveDistance.bearB<caveDistance.bearA)add(scores,{safety:2,need:1});
    const waterDistance=layoutDistances.find(item=>item.resource==='water');
    if(progress.waterPolicy==='bearA'&&waterDistance&&waterDistance.bearA<waterDistance.bearB)add(scores,{need:2});
    if(progress.waterPolicy==='bearB'&&waterDistance&&waterDistance.bearB<waterDistance.bearA)add(scores,{need:2});
  }
  const ranked=(Object.entries(scores) as Array<[DecisionCriterion,number]>).sort((a,b)=>b[1]-a[1]);
  const topThree=ranked.slice(0,3),topTotal=Math.max(1,topThree.reduce((sum,[,score])=>sum+score,0));
  const criteria=topThree.map(([id,score],index)=>({
    id,label:labels[id],score:index<2?Math.round(score/topTotal*100):0,
  }));
  criteria[2].score=100-criteria[0].score-criteria[1].score;
  const spread=ranked[0][1]-ranked[2][1];
  const title:HabitatDecisionResult['title']=progress.placementChanges>=2
    ?'상황 적응형'
    :spread<=2
      ?'균형 설계형'
      :ranked[0][0]==='safety'
        ?'안전 우선형'
        :ranked[0][0]==='efficiency'
          ?'효율 운영형'
          :ranked[0][0]==='fairness'
            ?'공정 균형형'
            :'균형 설계형';
  const response=progress.placementChanges
    ?`전체 동선을 살핀 뒤 자원 위치를 ${progress.placementChanges}회 다시 조정함`
    :'처음 정한 자원 배치 기준을 일관되게 유지함';
  const interpretation=title==='안전 우선형'
    ?'대상의 불안과 충돌 가능성을 먼저 줄인 뒤 이용 방식을 정하는 사람입니다.'
    :title==='효율 운영형'
      ?'제한된 자원을 집중하고 동선을 단순하게 구성해 운영 효율을 높이는 사람입니다.'
      :title==='공정 균형형'
        ?'두 대상이 자원을 이용할 기회를 고르게 확보하도록 배분하는 사람입니다.'
        :title==='상황 적응형'
          ?'대상을 먼저 이해하고, 새로운 조건이 생기면 기존 계획을 현실적으로 다시 설계하는 사람입니다.'
          :'필요와 안전, 공정성을 함께 살피며 제한된 자원을 균형 있게 배분하는 사람입니다.';
  const courseStrategy=title==='안전 우선형'
    ?'이동이 단순하고 혼잡도가 낮은 코스'
    :title==='효율 운영형'
      ?'짧은 동선에 여러 장소가 연결된 코스'
      :title==='상황 적응형'
        ?'필수 장소와 대체 장소가 함께 있는 유연한 코스'
        :'자연·문화·먹거리가 고르게 포함된 코스';
  const closestSummary=layoutDistances.map(item=>`${item.resource==='cave'?'잠자리':item.resource==='food'?'먹이':'물가'}는 ${item.bearA<=item.bearB?'불곰':'반달가슴곰'} 쪽에 더 가깝게 배치`).join(', ');
  const firstDesignedBear=progress.designBearOrder[0]==='bearA'?'불곰':progress.designBearOrder[0]==='bearB'?'반달가슴곰':'';
  const mapAnalysis=positioned.length===3
    ?`${firstDesignedBear?`${firstDesignedBear}의 환경을 먼저 고려한 뒤 `:''}${closestSummary}했습니다. 세 자원을 ${averageSpread<420?'한 동선에 모아 운영 효율을 높이는':averageSpread>800?'서로 떨어뜨려 충돌 가능성을 낮추는':'두 곰 사이에 분산해 균형을 맞추는'} 구조입니다.`
    :'자원 배치 위치가 아직 완성되지 않았습니다.';
  return {title,criteria,response,interpretation,courseStrategy,mapAnalysis,completedAt:new Date().toISOString()};
}
