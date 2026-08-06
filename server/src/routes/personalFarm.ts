import {Router,type Response} from 'express';
import {readVisitProof,parseVisitPhoto} from '../services/visitProofStorage.js';
import {z} from 'zod';
import {GARDEN_FLOWER_IDS} from '../../../shared/personal-farm.js';
import {resolveGardenFlowerId} from '../../../shared/garden-flower-assets.js';
import {requireAuthenticatedUser} from '../middleware/authenticatedUser.js';
import {
  PersonalFarmProgressError,collectBearFeed,collectGardenFlower,completeBearFeedSpot,feedBear,getOrCreatePersonalFarmProgress,
  acknowledgeNatureChapterNotice,isBearFeedId,isBearFeedSpotId,isFarmRewardId,isGardenFlowerId,personalFarmProgressDto,plantGardenFlower,removeGardenFlower,setActiveFarmRewards,submitVisitPhoto,
} from '../services/personalFarmProgressService.js';
import {applyFlowerInterestEvents,getFlowerInterests} from '../services/flowerInterestService.js';

export const personalFarmRouter=Router();
personalFarmRouter.use(requireAuthenticatedUser);
const userId=(res:Response)=>res.locals.authenticatedUserId as string;
const send=async(res:Response,operation:()=>Promise<Awaited<ReturnType<typeof getOrCreatePersonalFarmProgress>>>)=>{
  try{return res.json({success:true,data:personalFarmProgressDto(await operation())})}
  catch(error){if(error instanceof PersonalFarmProgressError)return res.status(error.status).json({success:false,error:{code:error.code,message:error.message}});throw error}
};

personalFarmRouter.get('/me/personal-farm',async(_req,res)=>send(res,()=>getOrCreatePersonalFarmProgress(userId(res))));
const flowerInterestEventSchema=z.object({eventId:z.string().uuid(),flowerId:z.enum(GARDEN_FLOWER_IDS),infoViewCount:z.number().min(0).max(100).optional(),totalInfoViewSeconds:z.number().min(0).max(300).optional(),nearbyVisitCount:z.number().min(0).max(100).optional(),totalNearbySeconds:z.number().min(0).max(600).optional(),revisitCount:z.number().min(0).max(100).optional()}).strict();
personalFarmRouter.get('/me/garden/flower-interest',async(_req,res)=>res.json({success:true,data:{flowerInterests:await getFlowerInterests(userId(res))}}));
personalFarmRouter.post('/me/garden/flower-interest',async(req,res)=>{const parsed=z.object({events:z.array(flowerInterestEventSchema).min(1).max(100)}).strict().safeParse(req.body);if(!parsed.success)return res.status(400).json({success:false,error:{code:'INVALID_FLOWER_INTEREST_EVENTS',message:'Invalid flower interest events.'}});const flowerInterests=await applyFlowerInterestEvents(userId(res),parsed.data.events);if(!flowerInterests)return res.status(404).json({success:false,error:{code:'USER_NOT_FOUND',message:'User not found.'}});const progress=await getOrCreatePersonalFarmProgress(userId(res));return res.json({success:true,data:{flowerInterests,personalFarmProgress:personalFarmProgressDto(progress)}})});
personalFarmRouter.post('/me/personal-farm/garden/collect/:flowerId',async(req,res)=>{const value=resolveGardenFlowerId(String(req.params.flowerId));if(!value)return res.status(400).json({success:false,error:{code:'INVALID_FLOWER_ID',message:'Unsupported flower ID.'}});return send(res,()=>collectGardenFlower(userId(res),value))});
personalFarmRouter.post('/me/personal-farm/garden/plant/:flowerId',async(req,res)=>{const value=resolveGardenFlowerId(String(req.params.flowerId));if(!value)return res.status(400).json({success:false,error:{code:'INVALID_FLOWER_ID',message:'Unsupported flower ID.'}});return send(res,()=>plantGardenFlower(userId(res),value))});
personalFarmRouter.delete('/me/personal-farm/garden/plant/:flowerId',async(req,res)=>{const value=resolveGardenFlowerId(String(req.params.flowerId));if(!value)return res.status(400).json({success:false,error:{code:'INVALID_FLOWER_ID',message:'Unsupported flower ID.'}});return send(res,()=>removeGardenFlower(userId(res),value))});
personalFarmRouter.post('/me/personal-farm/bear/collect/:feedId',async(req,res)=>{const value=String(req.params.feedId);if(!isBearFeedId(value))return res.status(400).json({success:false,error:{code:'INVALID_FEED_ID',message:'Unsupported feed ID.'}});return send(res,()=>collectBearFeed(userId(res),value))});
personalFarmRouter.post('/me/personal-farm/bear/feed/:spotId',async(req,res)=>{const value=String(req.params.spotId);if(!isBearFeedSpotId(value))return res.status(400).json({success:false,error:{code:'INVALID_FEED_SPOT_ID',message:'Unsupported feed spot ID.'}});return send(res,()=>completeBearFeedSpot(userId(res),value))});
personalFarmRouter.post('/me/personal-farm/bear/feed',async(_req,res)=>send(res,()=>feedBear(userId(res))));

const activeRewardsSchema=z.object({rewardIds:z.array(z.string()).max(4)}).strict();
personalFarmRouter.patch('/me/personal-farm/rewards/active',async(req,res)=>{const parsed=activeRewardsSchema.safeParse(req.body);if(!parsed.success||parsed.data.rewardIds.some(value=>!isFarmRewardId(value)))return res.status(400).json({success:false,error:{code:'INVALID_REWARD_IDS',message:'Invalid reward ID list.'}});return send(res,()=>setActiveFarmRewards(userId(res),parsed.data.rewardIds.filter(isFarmRewardId)))});

// Metadata-only proof submission is intentionally disabled; photo upload is the only submission path.
personalFarmRouter.post('/me/personal-farm/nature-chapter/notice-seen',async(_req,res)=>send(res,()=>acknowledgeNatureChapterNotice(userId(res))));
personalFarmRouter.post('/me/personal-farm/visit-missions/:placeId/proof',async(req,res)=>{const place=String(req.params.placeId);if(place!=='garden'&&place!=='bearTree')return res.status(400).json({success:false,error:{code:'INVALID_VISIT_PLACE',message:'지원하지 않는 방문 장소입니다.'}});try{const photo=await parseVisitPhoto(req);return send(res,()=>submitVisitPhoto(userId(res),place,photo))}catch(error){const code=error instanceof Error?error.message:'UPLOAD_FAILED';const messages:Record<string,string>={FILE_TOO_LARGE:'사진 크기는 10MB 이하여야 합니다.',INVALID_FILE_TYPE:'JPEG, PNG, WebP 이미지만 등록할 수 있습니다.',FILE_MISSING:'제출할 사진을 선택해 주세요.',INVALID_MULTIPART:'사진 업로드 형식이 올바르지 않습니다.'};return res.status(code==='FILE_TOO_LARGE'?413:400).json({success:false,error:{code,message:messages[code]??'사진 제출에 실패했습니다. 잠시 후 다시 시도해 주세요.'}})}});
personalFarmRouter.get('/me/personal-farm/visit-missions/:placeId/proof',async(req,res)=>{const place=String(req.params.placeId);if(place!=='garden'&&place!=='bearTree')return res.status(400).json({success:false,error:{code:'INVALID_VISIT_PLACE',message:'지원하지 않는 방문 장소입니다.'}});try{const progress=await getOrCreatePersonalFarmProgress(userId(res));const file=progress.realVisit[place].file;if(!file)return res.status(404).json({success:false,error:{code:'VISIT_PROOF_NOT_FOUND',message:'제출한 사진이 없습니다.'}});const content=await readVisitProof(file.storageKey);if(!content)return res.status(404).json({success:false,error:{code:'VISIT_PROOF_NOT_FOUND',message:'제출한 사진을 찾을 수 없습니다.'}});res.type(file.mimeType);return res.send(content)}catch{return res.status(404).json({success:false,error:{code:'VISIT_PROOF_NOT_FOUND',message:'제출한 사진을 찾을 수 없습니다.'}})}});
