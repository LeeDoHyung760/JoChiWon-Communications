import mongoose,{type HydratedDocument,type Types} from 'mongoose';
import {
  BEAR_FEED_IDS,BEAR_FEED_SPOT_IDS,FARM_REWARD_IDS,GARDEN_FLOWER_IDS,
  type BearFeedId,type BearFeedSpotId,type BearGrowthStage,type FarmRewardId,type GardenFlowerId,type VisitMissionStatus,
} from '../../../shared/personal-farm.js';

export interface VisitMissionRecord {
  status:VisitMissionStatus;
  submittedAt?:Date;
  reviewedAt?:Date;
  metadata:Map<string,string>;
}

export interface PersonalFarmProgress {
  userId:Types.ObjectId;
  gardenMission:{collectedFlowerIds:GardenFlowerId[];plantedFlowerIds:GardenFlowerId[];completed:boolean;completedAt?:Date};
  bearMission:{collectedFeedIds:BearFeedId[];completedFeedSpotIds:BearFeedSpotId[];completed:boolean;completedAt?:Date};
  farm:{unlocked:boolean;unlockedRewardIds:FarmRewardId[];activeRewardIds:FarmRewardId[];bearGrowthStage:BearGrowthStage};
  realVisit:{garden:VisitMissionRecord;bearTree:VisitMissionRecord};
  layoutVersion:number;
  createdAt:Date;
  updatedAt:Date;
}

const {Schema}=mongoose;

const visitMissionSchema=new Schema<VisitMissionRecord>({
  status:{type:String,enum:['locked','available','submitted','verified','rejected'],default:'locked',required:true},
  submittedAt:{type:Date},reviewedAt:{type:Date},metadata:{type:Map,of:String,default:()=>new Map<string,string>()},
},{_id:false});

const personalFarmProgressSchema=new Schema<PersonalFarmProgress>({
  userId:{type:Schema.Types.ObjectId,required:true,unique:true,index:true,immutable:true},
  gardenMission:{
    collectedFlowerIds:{type:[String],enum:GARDEN_FLOWER_IDS,default:[]},
    plantedFlowerIds:{type:[String],enum:GARDEN_FLOWER_IDS,default:[]},
    completed:{type:Boolean,default:false},completedAt:{type:Date},
  },
  bearMission:{
    collectedFeedIds:{type:[String],enum:BEAR_FEED_IDS,default:[]},
    completedFeedSpotIds:{type:[String],enum:BEAR_FEED_SPOT_IDS,default:[]},
    completed:{type:Boolean,default:false},completedAt:{type:Date},
  },
  farm:{
    unlocked:{type:Boolean,default:false},
    unlockedRewardIds:{type:[String],enum:FARM_REWARD_IDS,default:[]},
    activeRewardIds:{type:[String],enum:FARM_REWARD_IDS,default:[]},
    bearGrowthStage:{type:String,enum:['locked','cub','young','adult'],default:'locked'},
  },
  realVisit:{garden:{type:visitMissionSchema,default:()=>({})},bearTree:{type:visitMissionSchema,default:()=>({})}},
  layoutVersion:{type:Number,default:1,min:1},
},{timestamps:true,optimisticConcurrency:true});

export type PersonalFarmProgressDocument=HydratedDocument<PersonalFarmProgress>;
export const PersonalFarmProgressModel=mongoose.models.PersonalFarmProgress??mongoose.model<PersonalFarmProgress>('PersonalFarmProgress',personalFarmProgressSchema);
