import { z } from 'zod';
import { INTEREST_IDS } from '../interests/interestCatalog.js';

export const ALLOWED_CHARACTER_IDS = [
  'character_01', 'custom', 'chungnyeong', 'girl1', 'boy1', 'cloths', 'women',
] as const;

const forbiddenDisplayName = /(관리자|운영자|admin|system|카카오)/i;
export const displayNameSchema = z.string().trim().min(2).max(20)
  .refine(value => !forbiddenDisplayName.test(value), '사용할 수 없는 표시 이름입니다.');

export const avatarSchema = z.object({
  characterId: z.enum(ALLOWED_CHARACTER_IDS),
  skinId: z.string().trim().min(1).max(80).optional(),
  hairId: z.string().trim().min(1).max(80).optional(),
  outfitId: z.string().trim().min(1).max(80).optional(),
  accessoryIds: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
  colorOptions: z.record(z.string().max(40), z.string().max(40)).optional(),
}).strict();

export const onboardingSchema = z.object({
  displayName: displayNameSchema,
  avatar: avatarSchema,
  explicitInterests: z.array(z.enum(INTEREST_IDS)).max(INTEREST_IDS.length)
    .transform(values => [...new Set(values)]),
}).strict();

export const birthConfirmationSchema = z.object({
  birthyear: z.string(),
  birthday: z.string(),
  birthdayType: z.enum(['SOLAR', 'LUNAR', 'UNKNOWN']),
  consent: z.literal(true),
}).strict();

