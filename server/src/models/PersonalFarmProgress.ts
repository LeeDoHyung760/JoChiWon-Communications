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
  file?:{storageKey:string;originalName:string;mimeType:string;size:number};
}

export interface PersonalFarmProgress {
  userId:Types.ObjectId;
  gardenMission:{collectedFlowerIds:GardenFlowerId[];plantedFlowerIds:GardenFlowerId[];completed:boolean;completedAt?:Date;completedFlowerIds:string[];requiredFlowerCount:number;interestCompleted:boolean;interestCompletedAt?:Date};
  bearMission:{collectedFeedIds:BearFeedId[];completedFeedSpotIds:BearFeedSpotId[];bearFed:boolean;bearFedAt?:Date;completed:boolean;completedAt?:Date};
  farm:{unlocked:boolean;unlockedRewardIds:FarmRewardId[];activeRewardIds:FarmRewardId[];bearGrowthStage:BearGrowthStage};
  natureChapter:{gardenCompleted:boolean;bearTreeCompleted:boolean;completed:boolean;completedAt?:Date;noticeShown:boolean};
  realVisit:{garden:VisitMissionRecord;bearTree:VisitMissionRecord};
  layoutVersion:number;
  createdAt:Date;
  updatedAt:Date;
}

const {Schema}=mongoose;

const visitMissionSchema=new Schema<VisitMissionRecord>({
  status:{type:String,enum:['locked','available','submitted','verified','rejected'],default:'locked',required:true},
  submittedAt:{type:Date},reviewedAt:{type:Date},metadata:{type:Map,of:String,default:()=>new Map<string,string>()},
  file:{storageKey:{type:String},originalName:{type:String},mimeType:{type:String,enum:['image/jpeg','image/png','image/webp']},size:{type:Number,min:1}},
},{_id:false});

const personalFarmProgressSchema=new Schema<PersonalFarmProgress>({
  userId:{type:Schema.Types.ObjectId,required:true,unique:true,index:true,immutable:true},
  gardenMission:{
    collectedFlowerIds:{type:[String],enum:GARDEN_FLOWER_IDS,default:[]},
    plantedFlowerIds:{type:[String],enum:GARDEN_FLOWER_IDS,default:[]},
    completed:{type:Boolean,default:false},completedAt:{type:Date},
    completedFlowerIds:{type:[String],default:[]},requiredFlowerCount:{type:Number,default:5,min:1},interestCompleted:{type:Boolean,default:false},interestCompletedAt:{type:Date},
  },
  bearMission:{
    collectedFeedIds:{type:[String],enum:BEAR_FEED_IDS,default:[]},
    completedFeedSpotIds:{type:[String],enum:BEAR_FEED_SPOT_IDS,default:[]},
    bearFed:{type:Boolean,default:false},bearFedAt:{type:Date},completed:{type:Boolean,default:false},completedAt:{type:Date},
  },
  farm:{
    unlocked:{type:Boolean,default:false},
    unlockedRewardIds:{type:[String],enum:FARM_REWARD_IDS,default:[]},
    activeRewardIds:{type:[String],enum:FARM_REWARD_IDS,default:[]},
    bearGrowthStage:{type:String,enum:['locked','cub','young','adult'],default:'locked'},
  },
  natureChapter:{gardenCompleted:{type:Boolean,default:false},bearTreeCompleted:{type:Boolean,default:false},completed:{type:Boolean,default:false},completedAt:{type:Date},noticeShown:{type:Boolean,default:false}},
  realVisit:{garden:{type:visitMissionSchema,default:()=>({})},bearTree:{type:visitMissionSchema,default:()=>({})}},
  layoutVersion:{type:Number,default:1,min:1},
},{timestamps:true,optimisticConcurrency:true});

export type PersonalFarmProgressDocument=HydratedDocument<PersonalFarmProgress>;
export const PersonalFarmProgressModel=mongoose.models.PersonalFarmProgress??mongoose.model<PersonalFarmProgress>('PersonalFarmProgress',personalFarmProgressSchema);
