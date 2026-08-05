export const GARDEN_FLOWER_IDS=['tulip','sunflower','hydrangea','camellia','iris'] as const;
export type GardenFlowerId=typeof GARDEN_FLOWER_IDS[number];

export const BEAR_FEED_IDS=['apple','carrot','acorn'] as const;
export type BearFeedId=typeof BEAR_FEED_IDS[number];

export const BEAR_FEED_SPOT_IDS=['BEAR_FEED_SPOT_01','BEAR_FEED_SPOT_02','BEAR_FEED_SPOT_03','BEAR_FEED_SPOT_04','BEAR_FEED_SPOT_05'] as const;
export type BearFeedSpotId=typeof BEAR_FEED_SPOT_IDS[number];

export const FARM_REWARD_IDS=['flower-garden','bear-statue','nature-complete-emblem','real-visit-missions-unlocked'] as const;
export type FarmRewardId=typeof FARM_REWARD_IDS[number];

export type BearGrowthStage='locked'|'cub'|'young'|'adult';
export type VisitMissionStatus='locked'|'available'|'submitted'|'verified'|'rejected';

export interface VisitMissionDto {
  status:VisitMissionStatus;
  submittedAt:string|null;
  reviewedAt:string|null;
  metadata:Record<string,string>;
}

export interface PersonalFarmProgressDto {
  gardenMission:{collectedFlowerIds:GardenFlowerId[];plantedFlowerIds:GardenFlowerId[];completed:boolean;completedAt:string|null};
  bearMission:{collectedFeedIds:BearFeedId[];completedFeedSpotIds:BearFeedSpotId[];completed:boolean;completedAt:string|null};
  farm:{unlocked:boolean;unlockedRewardIds:FarmRewardId[];activeRewardIds:FarmRewardId[];bearGrowthStage:BearGrowthStage};
  realVisit:{garden:VisitMissionDto;bearTree:VisitMissionDto};
  layoutVersion:number;
  createdAt:string;
  updatedAt:string;
}
