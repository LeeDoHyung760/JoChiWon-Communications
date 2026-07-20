import { calculateMbtiScore } from './mbtiScore.js';
import { intersection, jaccardSimilarity, normalizeValues } from './similarity.js';

export interface MatchProfile {
  mbti?: string;
  interests?: string[];
  meetingPurposes?: string[];
  usagePurposes?: string[];
  preferredPlaceCategories?: string[];
}

export interface MatchScore {
  totalScore: number;
  interestScore: number;
  purposeScore: number;
  mbtiScore: number;
  sharedInterests: string[];
  sharedPurposes: string[];
  reason: string;
}

export function calculateMatchScore(first: MatchProfile, second: MatchProfile): MatchScore {
  const firstPurposes = normalizeValues(first.usagePurposes ?? first.meetingPurposes);
  const secondPurposes = normalizeValues(second.usagePurposes ?? second.meetingPurposes);
  const sharedInterests = intersection(first.interests ?? [], second.interests ?? []);
  const sharedPurposes = intersection(firstPurposes, secondPurposes);
  const interestScore = Math.round(jaccardSimilarity(first.interests ?? [], second.interests ?? []));
  const purposeScore = Math.round(jaccardSimilarity(firstPurposes, secondPurposes));
  const mbtiScore = Math.round(calculateMbtiScore(first.mbti, second.mbti));
  const totalScore = Math.round(interestScore * .6 + purposeScore * .25 + mbtiScore * .15);
  const subjects = [...sharedInterests, ...sharedPurposes].slice(0, 2);
  const reason = subjects.length
    ? `${subjects.join('와 ')}${sharedInterests.length ? ' 관심사' : ' 이용 목적'}가 일치합니다.`
    : '공개 프로필을 바탕으로 새로운 대화를 시작해 볼 수 있어요.';
  return { totalScore, interestScore, purposeScore, mbtiScore, sharedInterests, sharedPurposes, reason };
}
