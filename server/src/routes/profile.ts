import { Router } from 'express';
import { requireAuthenticatedUser } from '../middleware/authenticatedUser.js';
import { UserModel } from '../models/User.js';
import { classifyAgeGroup } from '../services/age/ageClassificationService.js';
import { birthConfirmationSchema, onboardingSchema } from '../services/profile/profileSchemas.js';

export const profileRouter = Router();

profileRouter.put('/onboarding', requireAuthenticatedUser, async (req, res) => {
  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_ONBOARDING', message: parsed.error.issues[0]?.message ?? '온보딩 형식이 올바르지 않습니다.' } });
  }
  const user = await UserModel.findByIdAndUpdate(
    res.locals.authenticatedUserId,
    { $set: { ...parsed.data, onboardingCompleted: true } },
    { returnDocument: 'after', runValidators: true },
  ).select('displayName avatar explicitInterests onboardingCompleted ageGroup adultAt');
  if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다.' } });
  return res.json({
    success: true,
    data: {
      displayName: user.displayName,
      avatar: user.avatar,
      explicitInterests: user.explicitInterests,
      onboardingCompleted: user.onboardingCompleted,
      ageGroup: user.ageGroup,
      adultAt: user.adultAt ?? null,
      requiresBirthConfirmation: user.ageGroup === 'unknown',
    },
  });
});

profileRouter.put('/birth-confirmation', requireAuthenticatedUser, async (req, res) => {
  const parsed = birthConfirmationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_BIRTH_CONFIRMATION', message: parsed.error.issues[0]?.message ?? '생년월일 확인 형식이 올바르지 않습니다.' } });
  }
  const classification = classifyAgeGroup(parsed.data);
  if (classification.reason !== 'CALCULATED') {
    return res.status(400).json({ success: false, error: { code: classification.reason, message: '생년월일을 정확히 확인할 수 없습니다.' } });
  }
  const user = await UserModel.findByIdAndUpdate(
    res.locals.authenticatedUserId,
    { $set: {
      birthInfo: {
        birthyear: parsed.data.birthyear,
        birthday: parsed.data.birthday,
        birthdayType: parsed.data.birthdayType,
      },
      ageGroup: classification.ageGroup,
      adultAt: classification.adultAt,
      ageCheckedAt: new Date(),
      ageSource: 'user_input',
    } },
    { returnDocument: 'after', runValidators: true },
  ).select('ageGroup adultAt ageCheckedAt ageSource');
  if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다.' } });
  return res.json({ success: true, data: {
    ageGroup: user.ageGroup,
    adultAt: user.adultAt ?? null,
    ageCheckedAt: user.ageCheckedAt,
    ageSource: user.ageSource,
  } });
});

profileRouter.get('/users/:userId/public', requireAuthenticatedUser, async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(String(req.params.userId))) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_USER_ID', message: '사용자 ID가 올바르지 않습니다.' } });
  }
  const user = await UserModel.findById(req.params.userId)
    .select('displayName profileImageUrl avatar explicitInterests ageGroup onboardingCompleted')
    .lean();
  if (!user || !user.onboardingCompleted) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: '공개 프로필을 찾을 수 없습니다.' } });
  return res.json({ success: true, data: user });
});

