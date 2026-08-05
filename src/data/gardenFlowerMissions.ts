import gardenModelUrl from '../assets/maps/garden.glb?url';
import type {GardenFlowerId} from '../../shared/personal-farm';

export type GardenFlowerMission={id:GardenFlowerId;name:string;modelUrl:string;description:string;season:string;observationPoint:string;worldPosition:{x:number;z:number};rotationY:number;scale:number};

/** 고정 관찰 지점과 서버 flowerId를 한 곳에서 관리한다. 실제 모델은 garden.glb 안의 꽃 표본 노드다. */
export const gardenFlowerMissions:readonly GardenFlowerMission[]=[
  {id:'hydrangea',name:'수국',modelUrl:gardenModelUrl,description:'작은 꽃들이 둥글게 모여 피는 꽃입니다.',season:'여름',observationPoint:'온실 앞 그늘진 화단',worldPosition:{x:980,z:970},rotationY:0,scale:1},
  {id:'tulip',name:'튤립',modelUrl:gardenModelUrl,description:'곧게 올라온 꽃잎이 봄 정원을 장식합니다.',season:'봄',observationPoint:'중앙 정원 동쪽 화단',worldPosition:{x:1190,z:1030},rotationY:0.4,scale:1},
  {id:'iris',name:'붓꽃',modelUrl:gardenModelUrl,description:'가느다란 잎 사이로 독특한 꽃잎이 피어납니다.',season:'초여름',observationPoint:'연못 옆 산책로',worldPosition:{x:1400,z:1120},rotationY:-0.3,scale:1},
  {id:'camellia',name:'동백',modelUrl:gardenModelUrl,description:'짙은 초록 잎과 붉은 꽃이 대비됩니다.',season:'겨울~봄',observationPoint:'온실 서쪽 화단',worldPosition:{x:860,z:1180},rotationY:0.8,scale:1},
  {id:'sunflower',name:'해바라기',modelUrl:gardenModelUrl,description:'햇빛을 향해 고개를 드는 대표적인 꽃입니다.',season:'여름',observationPoint:'입구 남쪽 화단',worldPosition:{x:1120,z:760},rotationY:1.1,scale:1},
];
