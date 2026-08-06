import {BEAR_FEED_SPOT_IDS,GARDEN_PLANTABLE_FLOWER_IDS,FARM_REWARD_IDS,type BearFeedId,type BearFeedSpotId,type GardenFlowerId,type PersonalFarmProgressDto} from '../../shared/personal-farm';

export interface ProgressRepository {
  get():Promise<PersonalFarmProgressDto>;
  collectFlower(id:GardenFlowerId):Promise<PersonalFarmProgressDto>;
  plantFlower(id:GardenFlowerId):Promise<PersonalFarmProgressDto>;
  removeFlower(id:GardenFlowerId):Promise<PersonalFarmProgressDto>;
  collectFeed(id:BearFeedId):Promise<PersonalFarmProgressDto>;
  completeFeedSpot(id:BearFeedSpotId):Promise<PersonalFarmProgressDto>;
  feedBear():Promise<PersonalFarmProgressDto>;
  submitVisit(placeId:'garden'|'bearTree'):Promise<PersonalFarmProgressDto>;
}

const now=()=>new Date().toISOString();
export function createEmptyProgress():PersonalFarmProgressDto{
  const timestamp=now();
  return {gardenMission:{collectedFlowerIds:[],plantedFlowerIds:[],completed:false,completedAt:null,completedFlowerIds:[],requiredFlowerCount:5,interestCompleted:false,interestCompletedAt:null},bearMission:{collectedFeedIds:[],completedFeedSpotIds:[],bearFed:false,bearFedAt:null,completed:false,completedAt:null},farm:{unlocked:false,unlockedRewardIds:[],activeRewardIds:[],bearGrowthStage:'locked'},natureChapter:{gardenCompleted:false,bearTreeCompleted:false,completed:false,completedAt:null,noticeShown:false},realVisit:{garden:{status:'locked',submittedAt:null,reviewedAt:null,metadata:{},file:null},bearTree:{status:'locked',submittedAt:null,reviewedAt:null,metadata:{},file:null}},layoutVersion:1,createdAt:timestamp,updatedAt:timestamp};
}
function derive(progress:PersonalFarmProgressDto):PersonalFarmProgressDto{
  const gardenComplete=['hydrangea','tulip','iris','camellia','sunflower'].every(id=>progress.gardenMission.collectedFlowerIds.includes(id as GardenFlowerId))&&progress.gardenMission.plantedFlowerIds.length===5;
  const bearComplete=BEAR_FEED_SPOT_IDS.every(id=>progress.bearMission.completedFeedSpotIds.includes(id))&&progress.bearMission.bearFed;
  progress.gardenMission.completedFlowerIds=[...progress.gardenMission.collectedFlowerIds];
  progress.gardenMission.interestCompleted=gardenComplete;
  progress.gardenMission.completed=gardenComplete;
  progress.bearMission.completed=bearComplete;
  progress.natureChapter.gardenCompleted=gardenComplete;
  progress.natureChapter.bearTreeCompleted=bearComplete;
  progress.natureChapter.completed=gardenComplete&&bearComplete;
  const rewards=progress.farm.unlockedRewardIds;
  const add=(id:typeof FARM_REWARD_IDS[number])=>{if(!rewards.includes(id))rewards.push(id)};
  if(gardenComplete)add('flower-garden');
  if(bearComplete)add('bear-statue');
  if(progress.natureChapter.completed){add('nature-complete-emblem');add('real-visit-missions-unlocked');add('nature-chapter-complete');}
  progress.farm.unlocked=gardenComplete&&bearComplete;
  if(progress.natureChapter.completed){if(progress.realVisit.garden.status==='locked')progress.realVisit.garden.status='available';if(progress.realVisit.bearTree.status==='locked')progress.realVisit.bearTree.status='available';}
  progress.updatedAt=now();
  return progress;
}

export class MemoryProgressRepository implements ProgressRepository {
  private progress=createEmptyProgress();
  get(){return Promise.resolve(derive(this.progress));}
  private update(mutator:(progress:PersonalFarmProgressDto)=>void){mutator(this.progress);return Promise.resolve(derive(this.progress));}
  collectFlower(id:GardenFlowerId){return this.update(progress=>{if(!progress.gardenMission.collectedFlowerIds.includes(id))progress.gardenMission.collectedFlowerIds.push(id);});}
  plantFlower(id:GardenFlowerId){return this.update(progress=>{if(!(GARDEN_PLANTABLE_FLOWER_IDS as readonly string[]).includes(id)||!progress.gardenMission.collectedFlowerIds.includes(id)||progress.gardenMission.plantedFlowerIds.includes(id)||progress.gardenMission.plantedFlowerIds.length>=5)return;progress.gardenMission.plantedFlowerIds.push(id);});}
  removeFlower(id:GardenFlowerId){return this.update(progress=>{progress.gardenMission.plantedFlowerIds=progress.gardenMission.plantedFlowerIds.filter(value=>value!==id);});}
  collectFeed(id:BearFeedId){return this.update(progress=>{if(!progress.bearMission.collectedFeedIds.includes(id))progress.bearMission.collectedFeedIds.push(id);});}
  completeFeedSpot(id:BearFeedSpotId){return this.update(progress=>{if(!progress.bearMission.completedFeedSpotIds.includes(id))progress.bearMission.completedFeedSpotIds.push(id);});}
  feedBear(){return this.update(progress=>{if(BEAR_FEED_SPOT_IDS.every(id=>progress.bearMission.completedFeedSpotIds.includes(id)))progress.bearMission.bearFed=true;});}
  submitVisit(placeId:'garden'|'bearTree'){return this.update(progress=>{if(progress.natureChapter.completed&&progress.realVisit[placeId].status==='available'){progress.realVisit[placeId].status='submitted';progress.realVisit[placeId].submittedAt=now();}});}
  reset(){this.progress=createEmptyProgress();}
}

export class MongoProgressRepository implements ProgressRepository {
  constructor(private readonly request:(path:string,init?:RequestInit)=>Promise<PersonalFarmProgressDto>){ }
  get(){return this.request('');}
  collectFlower(id:GardenFlowerId){return this.request(`/garden/collect/${encodeURIComponent(id)}`,{method:'POST'});}
  plantFlower(id:GardenFlowerId){return this.request(`/garden/plant/${encodeURIComponent(id)}`,{method:'POST'});}
  removeFlower(id:GardenFlowerId){return this.request(`/garden/plant/${encodeURIComponent(id)}`,{method:'DELETE'});}
  collectFeed(id:BearFeedId){return this.request(`/bear/collect/${encodeURIComponent(id)}`,{method:'POST'});}
  completeFeedSpot(id:BearFeedSpotId){return this.request(`/bear/feed/${encodeURIComponent(id)}`,{method:'POST'});}
  feedBear(){return this.request('/bear/feed',{method:'POST'});}
  submitVisit(placeId:'garden'|'bearTree'){return this.request(`/visit-missions/${placeId}/proof`,{method:'POST'});}
}

export class ProgressService {
  constructor(private readonly repository:ProgressRepository){ }
  get(){return this.repository.get();}
  collectFlower(id:GardenFlowerId){return this.repository.collectFlower(id);}
  plantFlower(id:GardenFlowerId){return this.repository.plantFlower(id);}
  removeFlower(id:GardenFlowerId){return this.repository.removeFlower(id);}
  collectFeed(id:BearFeedId){return this.repository.collectFeed(id);}
  completeFeedSpot(id:BearFeedSpotId){return this.repository.completeFeedSpot(id);}
  feedBear(){return this.repository.feedBear();}
}
