import { Router } from 'express';
import { z } from 'zod';
import { requireAuthenticatedUser } from '../middleware/authenticatedUser.js';
import { UserModel } from '../models/User.js';
import { buildPersistedActivity,mapExitSchema,scoreMapExit } from '../services/experience/experienceHarness.js';
import { generateExperienceProfile } from '../services/experience/experienceProfile.js';

const shortList = z.array(z.string().trim().min(1).max(50)).max(30);
const characterSchema = z.object({
  hair: z.string().trim().min(1).max(80),
  hairStyle: z.enum(['hair1', 'hair2', 'both']).optional(),
  topStyle: z.enum(['style1', 'style2']).optional(),
  bottomStyle: z.enum(['style1', 'style2']).optional(),
  shoesStyle: z.enum(['style1', 'style2']).optional(),
  outfitStyle: z.enum(['outfit1', 'outfit2']).optional(),
  face: z.string().trim().min(1).max(80),
  top: z.string().trim().min(1).max(80),
  topLayer: z.string().trim().max(80).optional(),
  bottom: z.string().trim().min(1).max(80),
  shoes: z.string().trim().min(1).max(80),
  accessory: z.string().trim().max(80).optional(),
});
const profileSchema = z.object({
  nickname: z.string().trim().min(1).max(30),
  residence: z.string().trim().min(1).max(30).optional(),
  sejongVisitExperience: z.string().trim().min(1).max(30).optional(),
  mbti: z.string().trim().max(10),
  interests: shortList,
  usagePurposes: shortList,
  preferredPlaceCategories: shortList,
  recordVisibility: z.enum(['public', 'private']).default('public'),
  chatEnabled: z.boolean().default(true),
  model: z.enum(['custom', 'chungnyeong', 'girl1', 'boy1', 'cloths', 'women']),
  character: characterSchema,
}).strict();

export const accountRouter = Router();
accountRouter.use(requireAuthenticatedUser);

accountRouter.get('/me', async (_req, res) => {
  const user = await UserModel.findById(res.locals.authenticatedUserId)
    .select('nickname profileImage displayName profileImageUrl avatar explicitInterests onboardingCompleted ageGroup adultAt ageSource profile lastPosition')
    .lean();
  if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다.' } });
  return res.json({
    success: true,
    data: {
      userId: String(user._id),
      kakaoNickname: user.nickname,
      profileImage: user.profileImage,
      ageGroup: user.ageGroup,
      displayName: user.displayName,
      profileImageUrl: user.profileImageUrl,
      avatar: user.avatar,
      explicitInterests: user.explicitInterests,
      onboardingCompleted: user.onboardingCompleted,
      requiresBirthConfirmation: user.ageGroup === 'unknown',
      adultAt: user.adultAt ?? null,
      ageSource: user.ageSource,
      profile: user.profile ?? null,
      lastPosition: user.lastPosition?.mapId ? user.lastPosition : null,
    },
  });
});

accountRouter.put('/me/profile', async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_PROFILE', message: parsed.error.issues[0]?.message ?? '프로필 형식이 올바르지 않습니다.' } });
  }
  const user = await UserModel.findByIdAndUpdate(
    res.locals.authenticatedUserId,
    { $set: { profile: parsed.data, onboardingCompleted: true } },
    { returnDocument: 'after', runValidators: true },
  ).select('profile');
  if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다.' } });
  return res.json({ success: true, data: { profile: user.profile } });
});

accountRouter.post('/me/experience/map-exit',async(req,res)=>{
  const parsed=mapExitSchema.safeParse(req.body);
  if(!parsed.success)return res.status(400).json({success:false,error:{code:'INVALID_EXPERIENCE_LOG',message:parsed.error.issues[0]?.message??'행동 기록 형식이 올바르지 않습니다.'}});
  const user=await UserModel.findById(res.locals.authenticatedUserId).select('+experienceHarness.processedSessionIds experienceHarness');
  if(!user)return res.status(404).json({success:false,error:{code:'USER_NOT_FOUND',message:'사용자를 찾을 수 없습니다.'}});
  const harness=(user.get('experienceHarness')??{}) as any;
  if((harness.processedSessionIds??[]).includes(parsed.data.sessionId))return res.json({success:true,data:{duplicate:true,profile:harness.generatedProfile??null,activityRecords:harness.activityRecords??[]}});
  const summary=scoreMapExit(parsed.data),key=parsed.data.mapId==='arts-center'?'performance':parsed.data.mapId==='food-experience'?'food':'festival';
  const previous=harness[key] as {scores?:Map<string,number>|Record<string,number>;evidence?:string[]}|undefined;
  const previousScores=previous?.scores instanceof Map?Object.fromEntries(previous.scores):previous?.scores??{};
  harness[key]={scores:Object.entries(summary.scores).reduce<Record<string,number>>((scores,[name,value])=>{scores[name]=Math.min(100,(previousScores[name]??0)+value);return scores},{...previousScores}),evidence:[...(previous?.evidence??[]),...summary.evidence].filter((value,index,all)=>all.indexOf(value)===index).slice(-20),sessionSummary:summary.sessionSummary};
  const bundle={performance:harness.performance,food:harness.food,festival:harness.festival};
  const generated=await generateExperienceProfile(bundle);
  harness.processedSessionIds=[...(harness.processedSessionIds??[]),parsed.data.sessionId].slice(-50);
  harness.generatedProfile={...generated.profile,generatorSource:generated.source,updatedAt:new Date()};
  const activityRecord=buildPersistedActivity(parsed.data,summary);
  if(activityRecord)harness.activityRecords=[...(harness.activityRecords??[]).filter((record:any)=>record?.id!==activityRecord.id),activityRecord].slice(-100);
  if(key==='festival'||key==='food'){const source=key==='food'?'sejong_food_trucks':'sejong_festival_booth';harness.profileFragments=[...(harness.profileFragments??[]).filter((fragment:any)=>fragment?.source!==source),{...generated.profile,source,scores:summary.scores,sessionSummary:summary.sessionSummary,evidence:summary.evidence,updatedAt:new Date()}].slice(-12)}
  user.set('experienceHarness',harness);await user.save();
  return res.json({success:true,data:{summary,profile:harness.generatedProfile,profileFragments:harness.profileFragments??[],activityRecords:harness.activityRecords??[]}});
});

accountRouter.get('/me/experience/profile',async(_req,res)=>{
  const user=await UserModel.findById(res.locals.authenticatedUserId).select('experienceHarness.generatedProfile experienceHarness.activityRecords').lean();
  if(!user)return res.status(404).json({success:false,error:{code:'USER_NOT_FOUND',message:'사용자를 찾을 수 없습니다.'}});
  return res.json({success:true,data:{profile:(user as any).experienceHarness?.generatedProfile??null,activityRecords:(user as any).experienceHarness?.activityRecords??[]}});
});
