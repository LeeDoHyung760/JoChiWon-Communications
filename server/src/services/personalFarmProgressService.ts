import {
  BEAR_FEED_IDS,BEAR_FEED_SPOT_IDS,FARM_REWARD_IDS,GARDEN_FLOWER_IDS,
  type BearFeedId,type BearFeedSpotId,type FarmRewardId,type GardenFlowerId,type PersonalFarmProgressDto,
} from '../../../shared/personal-farm.js';
import {PersonalFarmProgressModel,type PersonalFarmProgressDocument,type VisitMissionRecord} from '../models/PersonalFarmProgress.js';
import {UserModel} from '../models/User.js';
import type {FlowerInterestRecord} from '../../../shared/flower-interest.js';
import {removeVisitProof,saveVisitProof,type ParsedVisitPhoto} from './visitProofStorage.js';

export const REQUIRED_GARDEN_FLOWER_IDS=['hydrangea','tulip','iris','camellia','sunflower'] as const;
const meaningfulFlower=(record:FlowerInterestRecord)=>record.infoViewCount>=1&&record.totalInfoViewSeconds>=5||record.totalNearbySeconds>=15;

export class PersonalFarmProgressError extends Error {
  constructor(readonly code:string,message:string,readonly status=400){super(message)}
}

const containsAll=<T extends string>(actual:readonly T[],required:readonly T[])=>required.every(value=>actual.includes(value));
const unique=<T extends string>(values:readonly T[])=>[...new Set(values)];
function ensureProgressShape(document:PersonalFarmProgressDocument){
  document.gardenMission??={collectedFlowerIds:[],plantedFlowerIds:[],completed:false,completedFlowerIds:[],requiredFlowerCount:REQUIRED_GARDEN_FLOWER_IDS.length,interestCompleted:false};
  document.gardenMission.collectedFlowerIds??=[];document.gardenMission.plantedFlowerIds??=[];document.gardenMission.completedFlowerIds??=[];
  document.bearMission??={collectedFeedIds:[],completedFeedSpotIds:[],bearFed:false,completed:false};document.bearMission.collectedFeedIds??=[];document.bearMission.completedFeedSpotIds??=[];document.bearMission.bearFed??=false;
  // Older builds could mark the final bear-feeding action before all five
  // feed spots were recorded. Treat that incomplete record as stale so the
  // player can complete the mission again instead of being permanently stuck.
  if(document.bearMission.bearFed===true&&!containsAll(document.bearMission.completedFeedSpotIds,BEAR_FEED_SPOT_IDS)){
    document.bearMission.bearFed=false;
    document.bearMission.bearFedAt=undefined;
  }
  document.farm??={unlocked:false,unlockedRewardIds:[],activeRewardIds:[],bearGrowthStage:'locked'};document.farm.unlockedRewardIds??=[];document.farm.activeRewardIds??=[];document.farm.bearGrowthStage??='locked';
  document.natureChapter??={gardenCompleted:false,bearTreeCompleted:false,completed:false,noticeShown:false};
  document.realVisit??={garden:{status:'locked',metadata:new Map()},bearTree:{status:'locked',metadata:new Map()}};
  document.realVisit.garden??={status:'locked',metadata:new Map()};document.realVisit.bearTree??={status:'locked',metadata:new Map()};
  document.realVisit.garden.metadata??=new Map();document.realVisit.bearTree.metadata??=new Map();
  document.layoutVersion??=1;
  return document;
}

export function applyPersonalFarmUnlockRules(document:PersonalFarmProgressDocument,now=new Date(),flowerInterests:readonly FlowerInterestRecord[]=[]){
  const gardenComplete=containsAll(document.gardenMission.collectedFlowerIds,GARDEN_FLOWER_IDS)&&containsAll(document.gardenMission.plantedFlowerIds,GARDEN_FLOWER_IDS);
  const completedFlowerIds=REQUIRED_GARDEN_FLOWER_IDS.filter(id=>{const record=flowerInterests.find(item=>item.flowerId===id);return Boolean(record&&meaningfulFlower(record))});
  const interestCompleted=completedFlowerIds.length===REQUIRED_GARDEN_FLOWER_IDS.length;
  const bearComplete=containsAll(document.bearMission.completedFeedSpotIds,BEAR_FEED_SPOT_IDS)&&document.bearMission.bearFed===true;
  if(gardenComplete&&!document.gardenMission.completedAt)document.gardenMission.completedAt=now;
  if(bearComplete&&!document.bearMission.completedAt)document.bearMission.completedAt=now;
  document.gardenMission.completed=gardenComplete;
  document.gardenMission.completedFlowerIds=completedFlowerIds;
  document.gardenMission.requiredFlowerCount=REQUIRED_GARDEN_FLOWER_IDS.length;
  if(interestCompleted&&!document.gardenMission.interestCompletedAt)document.gardenMission.interestCompletedAt=now;
  document.gardenMission.interestCompleted=interestCompleted;
  document.bearMission.completed=bearComplete;
  const natureCompleted=interestCompleted&&bearComplete;
  document.natureChapter.gardenCompleted=interestCompleted;
  document.natureChapter.bearTreeCompleted=bearComplete;
  if(natureCompleted&&!document.natureChapter.completedAt)document.natureChapter.completedAt=now;
  document.natureChapter.completed=natureCompleted;
  const rewards:FarmRewardId[]=[];
  if(gardenComplete)rewards.push('flower-garden');
  if(bearComplete)rewards.push('bear-statue');
  if(gardenComplete&&bearComplete)rewards.push('nature-complete-emblem','real-visit-missions-unlocked');
  if(natureCompleted)rewards.push('nature-chapter-complete');
  document.farm.unlocked=gardenComplete&&bearComplete;
  document.farm.unlockedRewardIds=unique(rewards);
  document.farm.activeRewardIds=document.farm.activeRewardIds.filter(reward=>rewards.includes(reward));
  document.farm.bearGrowthStage='locked';
  const visitStatus=natureCompleted?'available':'locked';
  if(document.realVisit.garden.status==='locked')document.realVisit.garden.status=visitStatus;
  if(document.realVisit.bearTree.status==='locked')document.realVisit.bearTree.status=visitStatus;
}

const metadataDto=(record:VisitMissionRecord)=>Object.fromEntries(record.metadata??new Map<string,string>());
export function personalFarmProgressDto(document:PersonalFarmProgressDocument):PersonalFarmProgressDto{
  const visit=(record:VisitMissionRecord)=>({status:record.status,submittedAt:record.submittedAt?.toISOString()??null,reviewedAt:record.reviewedAt?.toISOString()??null,metadata:metadataDto(record),file:record.file?{originalName:record.file.originalName,mimeType:record.file.mimeType,size:record.file.size}:null});
  return {
    gardenMission:{collectedFlowerIds:[...document.gardenMission.collectedFlowerIds],plantedFlowerIds:[...document.gardenMission.plantedFlowerIds],completed:document.gardenMission.completed,completedAt:document.gardenMission.completedAt?.toISOString()??null,completedFlowerIds:[...(document.gardenMission.completedFlowerIds??[])],requiredFlowerCount:document.gardenMission.requiredFlowerCount??REQUIRED_GARDEN_FLOWER_IDS.length,interestCompleted:Boolean(document.gardenMission.interestCompleted),interestCompletedAt:document.gardenMission.interestCompletedAt?.toISOString()??null},
    bearMission:{collectedFeedIds:[...document.bearMission.collectedFeedIds],completedFeedSpotIds:[...document.bearMission.completedFeedSpotIds],bearFed:document.bearMission.bearFed===true,bearFedAt:document.bearMission.bearFedAt?.toISOString()??null,completed:document.bearMission.completed,completedAt:document.bearMission.completedAt?.toISOString()??null},
    farm:{unlocked:document.farm.unlocked,unlockedRewardIds:[...document.farm.unlockedRewardIds],activeRewardIds:[...document.farm.activeRewardIds],bearGrowthStage:document.farm.bearGrowthStage},
    natureChapter:{gardenCompleted:Boolean(document.natureChapter.gardenCompleted),bearTreeCompleted:Boolean(document.natureChapter.bearTreeCompleted),completed:Boolean(document.natureChapter.completed),completedAt:document.natureChapter.completedAt?.toISOString()??null,noticeShown:Boolean(document.natureChapter.noticeShown)},
    realVisit:{garden:visit(document.realVisit.garden),bearTree:visit(document.realVisit.bearTree)},layoutVersion:document.layoutVersion,
    createdAt:document.createdAt.toISOString(),updatedAt:document.updatedAt.toISOString(),
  };
}

export async function getOrCreatePersonalFarmProgress(userId:string){
  const document=await PersonalFarmProgressModel.findOneAndUpdate({userId},{$setOnInsert:{userId}},{upsert:true,returnDocument:'after',setDefaultsOnInsert:true});
  if(!document)throw new PersonalFarmProgressError('PROGRESS_NOT_FOUND','Could not create personal farm progress.',500);
  ensureProgressShape(document);
  const user=await UserModel.findById(userId).select('profile.gardenNature.flowerInterests').lean();
  applyPersonalFarmUnlockRules(document,new Date(),(user?.profile?.gardenNature as {flowerInterests?:FlowerInterestRecord[]}|undefined)?.flowerInterests??[]);
  await document.save();
  return document;
}

async function mutate(userId:string,change:(document:PersonalFarmProgressDocument)=>void){const document=await getOrCreatePersonalFarmProgress(userId);change(document);const user=await UserModel.findById(userId).select('profile.gardenNature.flowerInterests').lean();applyPersonalFarmUnlockRules(document,new Date(),(user?.profile?.gardenNature as {flowerInterests?:FlowerInterestRecord[]}|undefined)?.flowerInterests??[]);await document.save();return document}

export const collectGardenFlower=(userId:string,flowerId:GardenFlowerId)=>mutate(userId,document=>{if(document.gardenMission.collectedFlowerIds.includes(flowerId))throw new PersonalFarmProgressError('FLOWER_ALREADY_COLLECTED','This flower has already been collected.',409);document.gardenMission.collectedFlowerIds.push(flowerId)});
export const plantGardenFlower=(userId:string,flowerId:GardenFlowerId)=>mutate(userId,document=>{if(!document.gardenMission.collectedFlowerIds.includes(flowerId))throw new PersonalFarmProgressError('FLOWER_NOT_COLLECTED','Collect this flower before planting it.',409);if(document.gardenMission.plantedFlowerIds.includes(flowerId))throw new PersonalFarmProgressError('FLOWER_ALREADY_PLANTED','This flower has already been planted.',409);document.gardenMission.plantedFlowerIds.push(flowerId)});
export const collectBearFeed=(userId:string,feedId:BearFeedId)=>mutate(userId,document=>{if(document.bearMission.collectedFeedIds.includes(feedId))throw new PersonalFarmProgressError('FEED_ALREADY_COLLECTED','This feed has already been collected.',409);document.bearMission.collectedFeedIds.push(feedId)});
export const completeBearFeedSpot=(userId:string,spotId:BearFeedSpotId)=>mutate(userId,document=>{if(document.bearMission.completedFeedSpotIds.includes(spotId))throw new PersonalFarmProgressError('FEED_SPOT_ALREADY_COMPLETED','This feed spot has already been completed.',409);document.bearMission.completedFeedSpotIds.push(spotId)});
export const feedBear=(userId:string)=>mutate(userId,document=>{if(document.bearMission.bearFed)throw new PersonalFarmProgressError('BEAR_ALREADY_FED','The bear has already been fed.',409);if(!containsAll(document.bearMission.completedFeedSpotIds,BEAR_FEED_SPOT_IDS))throw new PersonalFarmProgressError('BEAR_FEED_NOT_READY','Complete all five feed spots before feeding the bear.',409);document.bearMission.bearFed=true;document.bearMission.bearFedAt=new Date()});
export const setActiveFarmRewards=(userId:string,rewardIds:FarmRewardId[])=>mutate(userId,document=>{const next=unique(rewardIds);if(next.some(reward=>!document.farm.unlockedRewardIds.includes(reward)))throw new PersonalFarmProgressError('REWARD_NOT_UNLOCKED','An active reward must be unlocked first.',409);document.farm.activeRewardIds=next});
export const acknowledgeNatureChapterNotice=(userId:string)=>mutate(userId,document=>{if(document.natureChapter.completed)document.natureChapter.noticeShown=true});
export const submitVisitProof=(userId:string,mission:'garden'|'bearTree',metadata:Record<string,string>)=>mutate(userId,document=>{const target=document.realVisit[mission];if(target.status==='locked')throw new PersonalFarmProgressError('VISIT_MISSION_LOCKED','The real-visit mission is still locked.',409);target.status='submitted';target.submittedAt=new Date();target.reviewedAt=undefined;target.metadata=new Map(Object.entries(metadata))});
export async function submitVisitPhoto(userId:string,mission:'garden'|'bearTree',photo:ParsedVisitPhoto){const document=await getOrCreatePersonalFarmProgress(userId);const target=document.realVisit[mission];if(!document.natureChapter.completed)throw new PersonalFarmProgressError('NATURE_CHAPTER_INCOMPLETE','Complete both virtual experiences first.',403);if(target.status!=='available')throw new PersonalFarmProgressError(target.status==='submitted'?'VISIT_PROOF_ALREADY_SUBMITTED':'VISIT_PROOF_NOT_AVAILABLE','This visit mission is not available for submission.',409);const stored=await saveVisitProof(userId,mission,photo);try{target.status='submitted';target.submittedAt=new Date();target.reviewedAt=undefined;target.metadata=new Map();target.file=stored;await document.save();return document}catch(error){await removeVisitProof(stored.storageKey);throw error}}

export const isGardenFlowerId=(value:string):value is GardenFlowerId=>(GARDEN_FLOWER_IDS as readonly string[]).includes(value);
export const isBearFeedId=(value:string):value is BearFeedId=>(BEAR_FEED_IDS as readonly string[]).includes(value);
export const isBearFeedSpotId=(value:string):value is BearFeedSpotId=>(BEAR_FEED_SPOT_IDS as readonly string[]).includes(value);
export const isFarmRewardId=(value:string):value is FarmRewardId=>(FARM_REWARD_IDS as readonly string[]).includes(value);
