import { Router } from 'express';
import { z } from 'zod';
import { requireAuthenticatedUser } from '../middleware/authenticatedUser.js';
import { UserModel } from '../models/User.js';

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
    { $set: { profile: parsed.data } },
    { returnDocument: 'after', runValidators: true },
  ).select('profile');
  if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다.' } });
  return res.json({ success: true, data: { profile: user.profile } });
});
