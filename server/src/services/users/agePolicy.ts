import { canStartDirectChat as canChat, classifyAgeGroup, type AgeGroup } from '../age/ageClassificationService.js';
export type { AgeGroup } from '../age/ageClassificationService.js';

export function ageGroupFromBirthDate(birthDate: string | undefined, now = new Date()): AgeGroup {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return 'unknown';
  return classifyAgeGroup({
    birthyear: birthDate.slice(0, 4),
    birthday: birthDate.slice(5, 7) + birthDate.slice(8, 10),
    birthdayType: 'SOLAR',
    now,
  }).ageGroup;
}

export function canStartDirectChat(first: AgeGroup, second: AgeGroup): boolean {
  return canChat({ ageGroup: first }, { ageGroup: second });
}
