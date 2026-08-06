import {Router,type Response} from 'express';
import {readVisitProof,parseVisitPhoto} from '../services/visitProofStorage.js';
import {z} from 'zod';
import {requireAuthenticatedUser} from '../middleware/authenticatedUser.js';
import {
  PersonalFarmProgressError,collectBearFeed,collectGardenFlower,completeBearFeedSpot,feedBear,getOrCreatePersonalFarmProgress,
  acknowledgeNatureChapterNotice,isBearFeedId,isBearFeedSpotId,isFarmRewardId,isGardenFlowerId,personalFarmProgressDto,plantGardenFlower,setActiveFarmRewards,submitVisitPhoto,
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
personalFarmRouter.post('/me/personal-farm/bear/feed',async(_req,res)=>send(res,()=>feedBear(userId(res))));

const activeRewardsSchema=z.object({rewardIds:z.array(z.string()).max(4)}).strict();
personalFarmRouter.patch('/me/personal-farm/rewards/active',async(req,res)=>{const parsed=activeRewardsSchema.safeParse(req.body);if(!parsed.success||parsed.data.rewardIds.some(value=>!isFarmRewardId(value)))return res.status(400).json({success:false,error:{code:'INVALID_REWARD_IDS',message:'Invalid reward ID list.'}});return send(res,()=>setActiveFarmRewards(userId(res),parsed.data.rewardIds.filter(isFarmRewardId)))});

// Metadata-only proof submission is intentionally disabled; photo upload is the only submission path.
personalFarmRouter.post('/me/personal-farm/nature-chapter/notice-seen',async(_req,res)=>send(res,()=>acknowledgeNatureChapterNotice(userId(res))));
personalFarmRouter.post('/me/personal-farm/visit-missions/:placeId/proof',async(req,res)=>{const place=String(req.params.placeId);if(place!=='garden'&&place!=='bearTree')return res.status(400).json({success:false,error:{code:'INVALID_VISIT_PLACE',message:'지원하지 않는 방문 장소입니다.'}});try{const photo=await parseVisitPhoto(req);return send(res,()=>submitVisitPhoto(userId(res),place,photo))}catch(error){const code=error instanceof Error?error.message:'UPLOAD_FAILED';const messages:Record<string,string>={FILE_TOO_LARGE:'사진 크기는 10MB 이하여야 합니다.',INVALID_FILE_TYPE:'JPEG, PNG, WebP 이미지만 등록할 수 있습니다.',FILE_MISSING:'제출할 사진을 선택해 주세요.',INVALID_MULTIPART:'사진 업로드 형식이 올바르지 않습니다.'};return res.status(code==='FILE_TOO_LARGE'?413:400).json({success:false,error:{code,message:messages[code]??'사진 제출에 실패했습니다. 잠시 후 다시 시도해 주세요.'}})}});
personalFarmRouter.get('/me/personal-farm/visit-missions/:placeId/proof',async(req,res)=>{const place=String(req.params.placeId);if(place!=='garden'&&place!=='bearTree')return res.status(400).json({success:false,error:{code:'INVALID_VISIT_PLACE',message:'지원하지 않는 방문 장소입니다.'}});try{const progress=await getOrCreatePersonalFarmProgress(userId(res));const file=progress.realVisit[place].file;if(!file)return res.status(404).json({success:false,error:{code:'VISIT_PROOF_NOT_FOUND',message:'제출한 사진이 없습니다.'}});const content=await readVisitProof(file.storageKey);if(!content)return res.status(404).json({success:false,error:{code:'VISIT_PROOF_NOT_FOUND',message:'제출한 사진을 찾을 수 없습니다.'}});res.type(file.mimeType);return res.send(content)}catch{return res.status(404).json({success:false,error:{code:'VISIT_PROOF_NOT_FOUND',message:'제출한 사진을 찾을 수 없습니다.'}})}});
