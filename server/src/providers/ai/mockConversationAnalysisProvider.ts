import { normalizeValues } from '../../services/matching/similarity.js';
import type { ConversationAnalysis, ConversationMessage, RecommendationCopy, RecommendationUser, PlaceCandidate } from '../../types/recommendation.js';
import type { ConversationAnalysisProvider } from '../types.js';
import { resolveConversationIntent } from '../../services/places/placeIntentRules.js';

const categoryTerms: Record<string, string[]> = { 카페: ['카페', '커피', '디저트', '빵'], 음식점: ['맛집', '밥', '식사', '먹'], 공원: ['산책', '공원', '걷'], 문화시설: ['전시', '공연', '문화', '도서', '책'], 관광명소: ['여행', '사진', '구경'] };
const moodTerms: Record<string, string[]> = { 조용한: ['조용', '차분', '독서', '스터디'], '대화하기 좋은': ['대화', '이야기', '친구', '수다'], 활기찬: ['활기', '시장', '공연'], 자유로운: ['산책', '자유', '걷'] };

export function ruleBasedAnalysis(users: RecommendationUser[], messages: ConversationMessage[], areaName: string): ConversationAnalysis {
  const text = messages.map((item) => item.message).join(' ');
  const interests = users.map((user) => normalizeValues([...(user.experienceRecords??[]),...(user.interests??[])]));
  const sharedInterests = interests.length > 1 ? interests[0].filter((value) => interests.slice(1).every((list) => list.includes(value))) : (interests[0] ?? []);
  const placeCategories = Object.entries(categoryTerms).map(([category, terms]) => ({ category, score: terms.reduce((sum, term) => sum + Number(text.includes(term)), 0) + Number(sharedInterests.some((value) => terms.some((term) => value.includes(term)))) * 2 })).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, 2).map(({ category }) => category);
  const preferredMood = Object.entries(moodTerms).filter(([, terms]) => terms.some((term) => text.includes(term))).map(([mood]) => mood).slice(0, 2);
  const meetingIntent = normalizeValues(users.flatMap((user) => user.usagePurposes ?? user.meetingPurposes ?? []))[0] ?? '';
  return resolveConversationIntent({ sharedInterests, preferredMood, placeCategories, meetingIntent, searchKeywords: placeCategories.slice(0,3).map((category) => `${areaName} ${category}`), summary: `${preferredMood.join(', ')} 분위기에서 ${meetingIntent}에 어울리는 장소를 찾습니다.`,activity:'other',rejectedCategories:[] },messages,areaName);
}

export class MockConversationAnalysisProvider implements ConversationAnalysisProvider {
  async analyze(users: RecommendationUser[], messages: ConversationMessage[], _mapId: string, areaName: string, _userRequest?: string) { return ruleBasedAnalysis(users, messages, areaName); }
  async createCopy(analysis: ConversationAnalysis, places: PlaceCandidate[]): Promise<RecommendationCopy> {
    return { message: `${analysis.preferredMood.join(', ')} 분위기에 어울리는 장소를 찾아봤어요.`, recommendations: places.map((place) => ({ placeId: place.id, reason: `${analysis.placeCategories[0] ?? '원하는 활동'}과 ${analysis.meetingIntent}에 어울리는 장소예요.` })) };
  }
}
