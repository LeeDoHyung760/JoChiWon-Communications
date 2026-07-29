import { z } from 'zod';

const shortText = z.string().trim().min(1).max(200);
const textList = z.array(shortText).max(30);

export const recommendationUserProfileSchema = z.object({
  userId: z.string().trim().min(1).max(100),
  interests: textList,
  currentNeeds: textList,
  campusInterests: textList,
  plantProfile: z.object({
    representativePlant: shortText.optional(),
    discoveredPlants: textList,
    completionRate: z.number().finite().min(0).max(100),
  }),
  festivalProfile: z.object({
    visitedFestivals: textList,
    likedBooths: textList,
    likedActivities: textList,
  }),
});

export const candidatePlaceSchema = z.object({
  placeId: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(200),
  address: z.string().trim().min(1).max(300),
  roadAddress: z.string().trim().min(1).max(300).optional(),
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
  tags: textList,
  isLocalBusiness: z.boolean(),
  description: z.string().trim().min(1).max(500).optional(),
  source: z.enum(['kakao', 'database', 'admin']),
});

export const placeRecommendationInputSchema = z.object({
  requester: recommendationUserProfileSchema,
  companion: recommendationUserProfileSchema.optional(),
  conversationSummary: z.object({
    sharedInterests: textList,
    wantedActivities: textList,
    avoidActivities: textList,
    preferredMood: textList,
    availableMinutes: z.number().int().positive().max(1440).optional(),
    transportation: z.enum(['walk', 'public_transport', 'car', 'unknown']).optional(),
    budgetPerPerson: z.number().finite().nonnegative().optional(),
    additionalConditions: textList.optional(),
  }).optional(),
  candidatePlaces: z.array(candidatePlaceSchema).min(1).max(50),
}).strict();

export const placeRecommendationOutputSchema = z.object({
  recommendationTitle: z.string().trim().min(1).max(100),
  userSummary: z.string().trim().min(1).max(300),
  sharedInterests: z.array(z.string().trim().min(1).max(100)).max(10),
  conversationStarters: z.array(z.string().trim().min(1).max(150)).max(3),
  route: z.array(z.object({
    placeId: z.string().trim().min(1).max(200),
    order: z.number().int().positive().max(4),
    recommendedMinutes: z.number().int().positive().max(720),
    reason: z.string().trim().min(1).max(300),
    experienceConnection: z.string().trim().min(1).max(300),
    localEconomyConnection: z.string().trim().min(1).max(300),
  })).min(1).max(4),
  totalEstimatedMinutes: z.number().int().positive().max(1440),
  routeConcept: z.string().trim().min(1).max(300),
  cautions: z.array(z.string().trim().min(1).max(200)).max(5),
}).strict();

export type PlaceRecommendationInput = z.infer<typeof placeRecommendationInputSchema>;
export type CandidatePlace = z.infer<typeof candidatePlaceSchema>;
export type PlaceRecommendationResult = z.infer<typeof placeRecommendationOutputSchema>;

export interface SavedPlaceRecommendationResponse {
  recommendationId: string;
  data: PlaceRecommendationResult;
  isMock?: boolean;
}

export class RecommendationValidationError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_INPUT'
      | 'CANDIDATE_PLACES_EMPTY'
      | 'UNKNOWN_PLACE'
      | 'DUPLICATE_PLACE'
      | 'INVALID_ROUTE_ORDER'
      | 'INVALID_TOTAL_MINUTES'
      | 'INVALID_MODEL_OUTPUT',
    message: string,
  ) {
    super(message);
    this.name = 'RecommendationValidationError';
  }
}

export function validateCandidatePlaces(
  result: PlaceRecommendationResult,
  candidates: CandidatePlace[],
): void {
  const candidateIds = new Set(candidates.map((place) => place.placeId));
  const routeIds = result.route.map((item) => item.placeId);
  if (routeIds.some((id) => !candidateIds.has(id))) {
    throw new RecommendationValidationError('UNKNOWN_PLACE', '모델이 후보 목록에 없는 장소를 반환했습니다.');
  }
  if (new Set(routeIds).size !== routeIds.length) {
    throw new RecommendationValidationError('DUPLICATE_PLACE', '모델이 같은 장소를 중복으로 반환했습니다.');
  }
  if (result.route.some((item, index) => item.order !== index + 1)) {
    throw new RecommendationValidationError('INVALID_ROUTE_ORDER', '추천 장소 순서가 1부터 연속되지 않습니다.');
  }
  const total = result.route.reduce((sum, item) => sum + item.recommendedMinutes, 0);
  if (result.totalEstimatedMinutes !== total) {
    throw new RecommendationValidationError('INVALID_TOTAL_MINUTES', '전체 예상 시간이 장소별 체류 시간 합계와 다릅니다.');
  }
}

