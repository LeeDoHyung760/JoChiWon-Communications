import {
  BEAR_FEED_IDS,BEAR_FEED_SPOT_IDS,FARM_REWARD_IDS,GARDEN_FLOWER_IDS,
  type BearFeedId,type BearFeedSpotId,type FarmRewardId,type GardenFlowerId,type PersonalFarmProgressDto,
} from '../../../shared/personal-farm.js';
import {PersonalFarmProgressModel,type PersonalFarmProgressDocument,type VisitMissionRecord} from '../models/PersonalFarmProgress.js';

export class PersonalFarmProgressError extends Error {
  constructor(readonly code:string,message:string,readonly status=400){super(message)}
}

const containsAll=<T extends string>(actual:readonly T[],required:readonly T[])=>required.every(value=>actual.includes(value));
const unique=<T extends string>(values:readonly T[])=>[...new Set(values)];

export function applyPersonalFarmUnlockRules(document:PersonalFarmProgressDocument,now=new Date()){
  const gardenComplete=containsAll(document.gardenMission.collectedFlowerIds,GARDEN_FLOWER_IDS)&&containsAll(document.gardenMission.plantedFlowerIds,GARDEN_FLOWER_IDS);
  const bearComplete=containsAll(document.bearMission.collectedFeedIds,BEAR_FEED_IDS)&&containsAll(document.bearMission.completedFeedSpotIds,BEAR_FEED_SPOT_IDS);
  if(gardenComplete&&!document.gardenMission.completedAt)document.gardenMission.completedAt=now;
  if(bearComplete&&!document.bearMission.completedAt)document.bearMission.completedAt=now;
  document.gardenMission.completed=gardenComplete;
  document.bearMission.completed=bearComplete;
  const rewards:FarmRewardId[]=[];
  if(gardenComplete)rewards.push('flower-garden');
  if(bearComplete)rewards.push('bear-statue');
  if(gardenComplete&&bearComplete)rewards.push('nature-complete-emblem','real-visit-missions-unlocked');
  document.farm.unlocked=gardenComplete&&bearComplete;
  document.farm.unlockedRewardIds=unique(rewards);
  document.farm.activeRewardIds=document.farm.activeRewardIds.filter(reward=>rewards.includes(reward));
  document.farm.bearGrowthStage='locked';
  const visitStatus=gardenComplete&&bearComplete?'available':'locked';
  if(document.realVisit.garden.status==='locked')document.realVisit.garden.status=visitStatus;
  if(document.realVisit.bearTree.status==='locked')document.realVisit.bearTree.status=visitStatus;
}

const metadataDto=(record:VisitMissionRecord)=>Object.fromEntries(record.metadata??new Map<string,string>());
export function personalFarmProgressDto(document:PersonalFarmProgressDocument):PersonalFarmProgressDto{
  const visit=(record:VisitMissionRecord)=>({status:record.status,submittedAt:record.submittedAt?.toISOString()??null,reviewedAt:record.reviewedAt?.toISOString()??null,metadata:metadataDto(record)});
  return {
    gardenMission:{collectedFlowerIds:[...document.gardenMission.collectedFlowerIds],plantedFlowerIds:[...document.gardenMission.plantedFlowerIds],completed:document.gardenMission.completed,completedAt:document.gardenMission.completedAt?.toISOString()??null},
    bearMission:{collectedFeedIds:[...document.bearMission.collectedFeedIds],completedFeedSpotIds:[...document.bearMission.completedFeedSpotIds],completed:document.bearMission.completed,completedAt:document.bearMission.completedAt?.toISOString()??null},
    farm:{unlocked:document.farm.unlocked,unlockedRewardIds:[...document.farm.unlockedRewardIds],activeRewardIds:[...document.farm.activeRewardIds],bearGrowthStage:document.farm.bearGrowthStage},
    realVisit:{garden:visit(document.realVisit.garden),bearTree:visit(document.realVisit.bearTree)},layoutVersion:document.layoutVersion,
    createdAt:document.createdAt.toISOString(),updatedAt:document.updatedAt.toISOString(),
  };
}

export async function getOrCreatePersonalFarmProgress(userId:string){
  const document=await PersonalFarmProgressModel.findOneAndUpdate({userId},{$setOnInsert:{userId}},{upsert:true,returnDocument:'after',setDefaultsOnInsert:true});
  if(!document)throw new PersonalFarmProgressError('PROGRESS_NOT_FOUND','Could not create personal farm progress.',500);
  applyPersonalFarmUnlockRules(document);
  await document.save();
  return document;
}

async function mutate(userId:string,change:(document:PersonalFarmProgressDocument)=>void){const document=await getOrCreatePersonalFarmProgress(userId);change(document);applyPersonalFarmUnlockRules(document);await document.save();return document}

export const collectGardenFlower=(userId:string,flowerId:GardenFlowerId)=>mutate(userId,document=>{if(document.gardenMission.collectedFlowerIds.includes(flowerId))throw new PersonalFarmProgressError('FLOWER_ALREADY_COLLECTED','This flower has already been collected.',409);document.gardenMission.collectedFlowerIds.push(flowerId)});
export const plantGardenFlower=(userId:string,flowerId:GardenFlowerId)=>mutate(userId,document=>{if(!document.gardenMission.collectedFlowerIds.includes(flowerId))throw new PersonalFarmProgressError('FLOWER_NOT_COLLECTED','Collect this flower before planting it.',409);if(document.gardenMission.plantedFlowerIds.includes(flowerId))throw new PersonalFarmProgressError('FLOWER_ALREADY_PLANTED','This flower has already been planted.',409);document.gardenMission.plantedFlowerIds.push(flowerId)});
export const collectBearFeed=(userId:string,feedId:BearFeedId)=>mutate(userId,document=>{if(document.bearMission.collectedFeedIds.includes(feedId))throw new PersonalFarmProgressError('FEED_ALREADY_COLLECTED','This feed has already been collected.',409);document.bearMission.collectedFeedIds.push(feedId)});
export const completeBearFeedSpot=(userId:string,spotId:BearFeedSpotId)=>mutate(userId,document=>{if(!document.bearMission.collectedFeedIds.length)throw new PersonalFarmProgressError('FEED_NOT_COLLECTED','Collect bear feed before using a feed spot.',409);if(document.bearMission.completedFeedSpotIds.includes(spotId))throw new PersonalFarmProgressError('FEED_SPOT_ALREADY_COMPLETED','This feed spot has already been completed.',409);document.bearMission.completedFeedSpotIds.push(spotId)});
export const setActiveFarmRewards=(userId:string,rewardIds:FarmRewardId[])=>mutate(userId,document=>{const next=unique(rewardIds);if(next.some(reward=>!document.farm.unlockedRewardIds.includes(reward)))throw new PersonalFarmProgressError('REWARD_NOT_UNLOCKED','An active reward must be unlocked first.',409);document.farm.activeRewardIds=next});
export const submitVisitProof=(userId:string,mission:'garden'|'bearTree',metadata:Record<string,string>)=>mutate(userId,document=>{const target=document.realVisit[mission];if(target.status==='locked')throw new PersonalFarmProgressError('VISIT_MISSION_LOCKED','The real-visit mission is still locked.',409);target.status='submitted';target.submittedAt=new Date();target.reviewedAt=undefined;target.metadata=new Map(Object.entries(metadata))});

export const isGardenFlowerId=(value:string):value is GardenFlowerId=>(GARDEN_FLOWER_IDS as readonly string[]).includes(value);
export const isBearFeedId=(value:string):value is BearFeedId=>(BEAR_FEED_IDS as readonly string[]).includes(value);
export const isBearFeedSpotId=(value:string):value is BearFeedSpotId=>(BEAR_FEED_SPOT_IDS as readonly string[]).includes(value);
export const isFarmRewardId=(value:string):value is FarmRewardId=>(FARM_REWARD_IDS as readonly string[]).includes(value);
