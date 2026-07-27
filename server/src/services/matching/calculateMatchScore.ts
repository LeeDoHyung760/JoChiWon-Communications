import { calculateMbtiScore } from './mbtiScore.js';
import { intersection, jaccardSimilarity, normalizeValues } from './similarity.js';

export interface MatchProfile {
  mbti?: string;
  interests?: string[];
  meetingPurposes?: string[];
  usagePurposes?: string[];
  preferredPlaceCategories?: string[];
  experienceRecords?: string[];
}

export interface MatchScore {
  totalScore: number;
  interestScore: number;
  purposeScore: number;
  experienceScore: number;
  mbtiScore: number;
  sharedInterests: string[];
  sharedPurposes: string[];
  sharedExperienceRecords: string[];
  reason: string;
}

export function calculateMatchScore(first: MatchProfile, second: MatchProfile): MatchScore {
  const firstPurposes = normalizeValues(first.usagePurposes ?? first.meetingPurposes);
  const secondPurposes = normalizeValues(second.usagePurposes ?? second.meetingPurposes);
  const sharedInterests = intersection(first.interests ?? [], second.interests ?? []);
  const sharedPurposes = intersection(firstPurposes, secondPurposes);
  const sharedExperienceRecords = intersection(first.experienceRecords ?? [], second.experienceRecords ?? []);
  const interestScore = Math.round(jaccardSimilarity(first.interests ?? [], second.interests ?? []));
  const purposeScore = Math.round(jaccardSimilarity(firstPurposes, secondPurposes));
  const experienceScore = Math.round(jaccardSimilarity(first.experienceRecords ?? [], second.experienceRecords ?? []));
  const mbtiScore = Math.round(calculateMbtiScore(first.mbti, second.mbti));
  const hasExperience=Boolean(first.experienceRecords?.length&&second.experienceRecords?.length);
  const totalScore = Math.round(hasExperience
    ?experienceScore*.5+interestScore*.25+purposeScore*.15+mbtiScore*.1
    :interestScore*.65+purposeScore*.25+mbtiScore*.1);
  const subjects = [...sharedExperienceRecords, ...sharedInterests, ...sharedPurposes].slice(0, 2);
  const reason = subjects.length
    ? `${subjects.join('와 ')}${sharedExperienceRecords.length?' 체험 기록':sharedInterests.length?' 관심사':' 장소 선택 기준'}이 일치합니다.`
    : '공개 프로필을 바탕으로 새로운 대화를 시작해 볼 수 있어요.';
  return { totalScore, interestScore, purposeScore, experienceScore, mbtiScore, sharedInterests, sharedPurposes, sharedExperienceRecords, reason };
}
