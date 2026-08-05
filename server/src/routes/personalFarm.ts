import {Router,type Response} from 'express';
import {z} from 'zod';
import {requireAuthenticatedUser} from '../middleware/authenticatedUser.js';
import {
  PersonalFarmProgressError,collectBearFeed,collectGardenFlower,completeBearFeedSpot,getOrCreatePersonalFarmProgress,
  isBearFeedId,isBearFeedSpotId,isFarmRewardId,isGardenFlowerId,personalFarmProgressDto,plantGardenFlower,setActiveFarmRewards,submitVisitProof,
} from '../services/personalFarmProgressService.js';

export const personalFarmRouter=Router();
personalFarmRouter.use(requireAuthenticatedUser);
const userId=(res:Response)=>res.locals.authenticatedUserId as string;
const send=async(res:Response,operation:()=>Promise<Awaited<ReturnType<typeof getOrCreatePersonalFarmProgress>>>)=>{
  try{return res.json({success:true,data:personalFarmProgressDto(await operation())})}
  catch(error){if(error instanceof PersonalFarmProgressError)return res.status(error.status).json({success:false,error:{code:error.code,message:error.message}});throw error}
};

personalFarmRouter.get('/me/personal-farm',async(_req,res)=>send(res,()=>getOrCreatePersonalFarmProgress(userId(res))));
personalFarmRouter.post('/me/personal-farm/garden/collect/:flowerId',async(req,res)=>{const value=String(req.params.flowerId);if(!isGardenFlowerId(value))return res.status(400).json({success:false,error:{code:'INVALID_FLOWER_ID',message:'Unsupported flower ID.'}});return send(res,()=>collectGardenFlower(userId(res),value))});
personalFarmRouter.post('/me/personal-farm/garden/plant/:flowerId',async(req,res)=>{const value=String(req.params.flowerId);if(!isGardenFlowerId(value))return res.status(400).json({success:false,error:{code:'INVALID_FLOWER_ID',message:'Unsupported flower ID.'}});return send(res,()=>plantGardenFlower(userId(res),value))});
personalFarmRouter.post('/me/personal-farm/bear/collect/:feedId',async(req,res)=>{const value=String(req.params.feedId);if(!isBearFeedId(value))return res.status(400).json({success:false,error:{code:'INVALID_FEED_ID',message:'Unsupported feed ID.'}});return send(res,()=>collectBearFeed(userId(res),value))});
personalFarmRouter.post('/me/personal-farm/bear/feed/:spotId',async(req,res)=>{const value=String(req.params.spotId);if(!isBearFeedSpotId(value))return res.status(400).json({success:false,error:{code:'INVALID_FEED_SPOT_ID',message:'Unsupported feed spot ID.'}});return send(res,()=>completeBearFeedSpot(userId(res),value))});

const activeRewardsSchema=z.object({rewardIds:z.array(z.string()).max(4)}).strict();
personalFarmRouter.patch('/me/personal-farm/rewards/active',async(req,res)=>{const parsed=activeRewardsSchema.safeParse(req.body);if(!parsed.success||parsed.data.rewardIds.some(value=>!isFarmRewardId(value)))return res.status(400).json({success:false,error:{code:'INVALID_REWARD_IDS',message:'Invalid reward ID list.'}});return send(res,()=>setActiveFarmRewards(userId(res),parsed.data.rewardIds.filter(isFarmRewardId)))});

const visitProofSchema=z.object({mission:z.enum(['garden','bearTree']),metadata:z.record(z.string().max(40),z.string().max(300)).default({})}).strict();
personalFarmRouter.post('/me/personal-farm/visit-proof',async(req,res)=>{const parsed=visitProofSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({success:false,error:{code:'INVALID_VISIT_PROOF',message:'Invalid visit-proof metadata.'}});return send(res,()=>submitVisitProof(userId(res),parsed.data.mission,parsed.data.metadata))});
