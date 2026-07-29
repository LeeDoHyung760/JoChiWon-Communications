export const ADULT_AGE_THRESHOLD = 19;
export type AgeGroup = 'adult' | 'minor' | 'unknown';
export type BirthdayType = 'SOLAR' | 'LUNAR' | 'UNKNOWN';
export type AgeClassificationReason =
  | 'CALCULATED' | 'MISSING_BIRTHYEAR' | 'MISSING_BIRTHDAY'
  | 'INVALID_FORMAT' | 'UNSUPPORTED_LUNAR_DATE';

export interface AgeClassification {
  ageGroup: AgeGroup;
  adultAt: Date | null;
  reason: AgeClassificationReason;
}

const unknown = (reason: Exclude<AgeClassificationReason, 'CALCULATED'>): AgeClassification =>
  ({ ageGroup: 'unknown', adultAt: null, reason });

export function classifyAgeGroup(input: {
  birthyear?: string;
  birthday?: string;
  birthdayType?: BirthdayType;
  now?: Date;
}): AgeClassification {
  if (!input.birthyear) return unknown('MISSING_BIRTHYEAR');
  if (!input.birthday) return unknown('MISSING_BIRTHDAY');
  if (input.birthdayType === 'LUNAR') return unknown('UNSUPPORTED_LUNAR_DATE');
  if (input.birthdayType !== 'SOLAR') return unknown('INVALID_FORMAT');
  if (!/^\d{4}$/.test(input.birthyear) || !/^\d{4}$/.test(input.birthday)) return unknown('INVALID_FORMAT');
  const year = Number(input.birthyear), month = Number(input.birthday.slice(0, 2)), day = Number(input.birthday.slice(2));
  const now = input.now ?? new Date();
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (
    birth.getUTCFullYear() !== year || birth.getUTCMonth() !== month - 1 ||
    birth.getUTCDate() !== day || year < now.getUTCFullYear() - 120 ||
    birth.getTime() > now.getTime()
  ) return unknown('INVALID_FORMAT');
  const adultAt = new Date(Date.UTC(year + ADULT_AGE_THRESHOLD, month - 1, day));
  return { ageGroup: now.getTime() >= adultAt.getTime() ? 'adult' : 'minor', adultAt, reason: 'CALCULATED' };
}

export function canStartDirectChat(
  userA: { ageGroup: AgeGroup },
  userB: { ageGroup: AgeGroup },
): boolean {
  return userA.ageGroup !== 'unknown' && userA.ageGroup === userB.ageGroup;
}
