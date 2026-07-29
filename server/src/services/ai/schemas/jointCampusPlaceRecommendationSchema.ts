import { z } from 'zod';
import { INTEREST_IDS } from '../../interests/interestCatalog.js';

const interestSchema = z.enum(INTEREST_IDS);
const shortText = z.string().trim().min(1).max(200);

export const recommendationUserContextSchema = z.object({
  userId: z.string().trim().min(1).max(100),
  displayName: z.string().trim().min(1).max(30),
  explicitInterests: z.array(interestSchema).max(INTEREST_IDS.length),
  inferredInterests: z.array(z.object({
    id: interestSchema,
    confidence: z.number().min(0).max(1),
  })).max(INTEREST_IDS.length),
  experienceRecords: z.object({
    discoveredPlants: z.array(shortText).max(50).optional(),
    representativePlant: shortText.optional(),
    likedFestivals: z.array(shortText).max(30).optional(),
    likedFestivalBooths: z.array(shortText).max(30).optional(),
    campusActivities: z.array(shortText).max(30).optional(),
  }).optional(),
}).strict();

export const jointCandidatePlaceSchema = z.object({
  placeId: z.string().trim().min(1).max(200),
  name: shortText,
  category: shortText,
  address: z.string().trim().min(1).max(300),
  roadAddress: z.string().trim().max(300).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  placeUrl: z.string().url().max(500).optional(),
  tags: z.array(shortText).max(20),
  isLocalBusiness: z.boolean(),
  source: z.enum(['kakao', 'database', 'admin']),
}).strict();

export const jointCampusRecommendationInputSchema = z.object({
  roomId: z.string().trim().min(1).max(100),
  requester: recommendationUserContextSchema,
  companion: recommendationUserContextSchema,
  sharedKeywords: z.array(interestSchema).max(INTEREST_IDS.length),
  candidatePlaces: z.array(jointCandidatePlaceSchema).min(1).max(30),
  constraints: z.object({
    availableMinutes: z.number().int().positive().max(1440).optional(),
    transportation: z.enum(['walk', 'public_transport', 'car', 'unknown']).optional(),
    budgetPerPerson: z.number().nonnegative().max(10_000_000).optional(),
    preferredMood: z.array(shortText).max(10).optional(),
    avoidActivities: z.array(shortText).max(10).optional(),
  }).strict().optional(),
}).strict();

export const jointCampusRecommendationOutputSchema = z.object({
  recommendationTitle: z.string().trim().min(1).max(100),
  sharedInterestSummary: z.string().trim().min(1).max(300),
  usedExplicitInterests: z.array(interestSchema).max(INTEREST_IDS.length),
  usedInferredInterests: z.array(interestSchema).max(INTEREST_IDS.length),
  route: z.array(z.object({
    placeId: z.string().trim().min(1).max(200),
    order: z.number().int().min(1).max(4),
    recommendedMinutes: z.number().int().positive().max(720),
    reasonForRequester: z.string().trim().min(1).max(250),
    reasonForCompanion: z.string().trim().min(1).max(250),
    sharedReason: z.string().trim().min(1).max(300),
    experienceConnection: z.string().trim().min(1).max(300),
    localEconomyConnection: z.string().trim().min(1).max(300),
  }).strict()).min(1).max(4),
  conversationStarters: z.array(z.string().trim().min(1).max(180)).max(3),
  totalEstimatedMinutes: z.number().int().positive().max(2880),
  routeConcept: z.string().trim().min(1).max(300),
  cautions: z.array(z.string().trim().min(1).max(200)).max(5),
}).strict();

export type RecommendationUserContext = z.infer<typeof recommendationUserContextSchema>;
export type JointCandidatePlace = z.infer<typeof jointCandidatePlaceSchema>;
export type JointCampusPlaceRecommendationInput = z.infer<typeof jointCampusRecommendationInputSchema>;
export type JointCampusPlaceRecommendationResult = z.infer<typeof jointCampusRecommendationOutputSchema>;

export class JointRecommendationError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
    this.name = 'JointRecommendationError';
  }
}

export function validateJointRecommendationResult(
  result: JointCampusPlaceRecommendationResult,
  input: JointCampusPlaceRecommendationInput,
): JointCampusPlaceRecommendationResult {
  const candidates = new Set(input.candidatePlaces.map((place) => place.placeId));
  const routeIds = result.route.map((item) => item.placeId);
  if (routeIds.some((id) => !candidates.has(id))) {
    throw new JointRecommendationError('UNKNOWN_PLACE', '후보에 없는 장소가 포함되었습니다.', 502);
  }
  if (new Set(routeIds).size !== routeIds.length) {
    throw new JointRecommendationError('DUPLICATE_PLACE', '동일한 장소가 중복되었습니다.', 502);
  }
  if (result.route.some((item, index) => item.order !== index + 1)) {
    throw new JointRecommendationError('INVALID_ROUTE_ORDER', '장소 순서는 1부터 연속되어야 합니다.', 502);
  }
  const explicit = new Set([...input.requester.explicitInterests, ...input.companion.explicitInterests]);
  const inferred = new Set([
    ...input.requester.inferredInterests.map(({ id }) => id),
    ...input.companion.inferredInterests.map(({ id }) => id),
  ]);
  if (result.usedExplicitInterests.some((id) => !explicit.has(id)) ||
      result.usedInferredInterests.some((id) => !inferred.has(id))) {
    throw new JointRecommendationError('INVENTED_INTEREST', '입력에 없는 관심사가 사용되었습니다.', 502);
  }
  return {
    ...result,
    totalEstimatedMinutes: result.route.reduce((sum, item) => sum + item.recommendedMinutes, 0),
  };
}
