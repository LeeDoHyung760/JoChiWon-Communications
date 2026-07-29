import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env.js';
import { requireAuthenticatedUser } from '../middleware/authenticatedUser.js';
import { recommendationRateLimit } from '../middleware/recommendationRateLimit.js';
import { DirectRoomModel } from '../models/DirectRoom.js';
import { UserModel } from '../models/User.js';
import { createPlaceSearchProvider } from '../providers/providerFactory.js';
import { ExternalProviderError } from '../providers/types.js';
import { loadDirectChatPolicy } from '../services/chat/directChatPolicyService.js';
import { conversationInterestCache } from '../services/interests/conversationInterestCache.js';
import { INTEREST_IDS, type InterestId, isInterestId } from '../services/interests/interestCatalog.js';
import { mergeInterests } from '../services/interests/interestMergeService.js';
import { JointCampusPlaceRecommendationService } from '../services/ai/jointCampusPlaceRecommendationService.js';
import { JointRecommendationError } from '../services/ai/schemas/jointCampusPlaceRecommendationSchema.js';

export const jointCampusRecommendationsRouter = Router();
const recommendationService = new JointCampusPlaceRecommendationService();
const placeProvider = createPlaceSearchProvider();
const recentRequests = new Map<string, number>();
const ROOM_COOLDOWN_MS = 30_000;

const requestBodySchema = z.object({
  roomId: z.string().trim().min(1).max(100),
  constraints: z.object({
    availableMinutes: z.number().int().positive().max(1440).optional(),
    transportation: z.enum(['walk', 'public_transport', 'car', 'unknown']).optional(),
    budgetPerPerson: z.number().nonnegative().max(10_000_000).optional(),
    preferredMood: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
    avoidActivities: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  }).strict().optional(),
}).strict();

const queryByInterest: Record<InterestId, string> = {
  plant: '세종 수목원', nature: '세종 자연 명소', festival: '세종 축제',
  photo: '세종 사진 명소', cafe: '세종 카페', food: '세종 맛집',
  culture: '세종 문화시설', performance: '세종 공연장', shopping: '세종 지역 상점',
  workshop: '세종 공방 체험', walking: '세종 산책 공원', activity: '세종 체험',
  study: '세종 도서관', technology: '세종 과학 기술', campus: '세종 공동캠퍼스',
  local_business: '세종 로컬 상점',
};

jointCampusRecommendationsRouter.post(
  '/joint-campus/recommendations',
  recommendationRateLimit,
  requireAuthenticatedUser,
  async (req, res) => {
    try {
      const parsedBody = requestBodySchema.safeParse(req.body);
      if (!parsedBody.success) throw new JointRecommendationError('INVALID_INPUT', '추천 요청 형식이 올바르지 않습니다.');
      const body = parsedBody.data;
      const requesterId = res.locals.authenticatedUserId as string;
      if (!isValidObjectId(requesterId)) throw new JointRecommendationError('UNAUTHENTICATED', '로그인이 필요합니다.', 401);
      const room = await DirectRoomModel.findOne({ roomId: body.roomId, active: true }).lean();
      if (!room) throw new JointRecommendationError('ROOM_NOT_FOUND', '채팅방을 찾을 수 없습니다.', 404);
      const memberIds = room.memberUserIds.map(String);
      if (!memberIds.includes(requesterId)) throw new JointRecommendationError('ROOM_FORBIDDEN', '채팅방 멤버만 요청할 수 있습니다.', 403);
      const companionId = memberIds.find((id) => id !== requesterId);
      if (!companionId) throw new JointRecommendationError('ROOM_INVALID', '1대1 채팅방 정보가 올바르지 않습니다.', 409);
      const policy = await loadDirectChatPolicy(body.roomId, requesterId);
      if (!policy.allowed) {
        throw new JointRecommendationError(
          policy.code,
          policy.code === 'AGE_GROUP_CHAT_RESTRICTED'
            ? '연령 그룹 정책에 따라 이 채팅방에서는 추천을 요청할 수 없습니다.'
            : '채팅방을 이용할 수 없습니다.',
          policy.code === 'ROOM_NOT_FOUND' ? 404 : 403,
        );
      }

      const cooldownKey = `${body.roomId}:${requesterId}`;
      const lastRequest = recentRequests.get(cooldownKey) ?? 0;
      if (Date.now() - lastRequest < ROOM_COOLDOWN_MS) {
        throw new JointRecommendationError('RECOMMENDATION_COOLDOWN', '잠시 후 다시 추천을 요청해 주세요.', 429);
      }

      const users = await UserModel.find({ _id: { $in: [requesterId, companionId] } })
        .select('displayName kakaoName explicitInterests').lean();
      const requester = users.find((user) => String(user._id) === requesterId);
      const companion = users.find((user) => String(user._id) === companionId);
      if (!requester || !companion) throw new JointRecommendationError('USER_NOT_FOUND', '사용자 프로필을 찾을 수 없습니다.', 404);

      const inferredA = conversationInterestCache.get(body.roomId, requesterId)?.keywords ?? [];
      const inferredB = conversationInterestCache.get(body.roomId, companionId)?.keywords ?? [];
      const explicitA = (requester.explicitInterests ?? []).filter(isInterestId);
      const explicitB = (companion.explicitInterests ?? []).filter(isInterestId);
      const mergedA = mergeInterests(explicitA, inferredA);
      const mergedB = mergeInterests(explicitB, inferredB);
      const ordered = [...new Set([...mergedA.combined, ...mergedB.combined])];
      const shared = ordered.filter((id) => mergedA.combined.includes(id) && mergedB.combined.includes(id));
      const interestQueries = (ordered.length ? ordered : INTEREST_IDS.slice(0, 3))
        .slice(0, 5).map((id) => queryByInterest[id]);
      const rawPlaces = await placeProvider.searchKeywords(interestQueries, {
        longitude: 127.289,
        latitude: 36.48,
        radius: env.DEFAULT_SEARCH_RADIUS_METERS,
        size: 15,
      });
      const candidatePlaces = [...new Map(rawPlaces
        .filter((place) => place.source === 'kakao')
        .map((place) => [place.id, {
          placeId: place.id,
          name: place.name,
          category: place.category,
          address: place.address,
          ...(place.roadAddress && { roadAddress: place.roadAddress }),
          latitude: place.latitude,
          longitude: place.longitude,
          ...(place.externalUrl && { placeUrl: place.externalUrl }),
          tags: place.tags ?? [],
          isLocalBusiness: /(카페|음식점|식당|공방|상점|시장)/.test(place.category),
          source: 'kakao' as const,
        }])).values()].slice(0, 30);
      if (!candidatePlaces.length) {
        throw new JointRecommendationError('CANDIDATE_PLACES_EMPTY', '실제 세종 장소 후보를 찾지 못했습니다.', 422);
      }

      recentRequests.set(cooldownKey, Date.now());
      const result = await recommendationService.create({
        roomId: body.roomId,
        requester: {
          userId: requesterId,
          displayName: requester.displayName || requester.kakaoName || '사용자 A',
          explicitInterests: explicitA,
          inferredInterests: inferredA.map(({ id, confidence }) => ({ id, confidence })),
        },
        companion: {
          userId: companionId,
          displayName: companion.displayName || companion.kakaoName || '사용자 B',
          explicitInterests: explicitB,
          inferredInterests: inferredB.map(({ id, confidence }) => ({ id, confidence })),
        },
        sharedKeywords: shared,
        candidatePlaces,
        ...(body.constraints && { constraints: body.constraints }),
      });
      return res.status(201).json({ success: true, ...result });
    } catch (error) {
      if (error instanceof JointRecommendationError) {
        return res.status(error.status).json({ success: false, error: { code: error.code, message: error.message } });
      }
      if (error instanceof ExternalProviderError) {
        const code = error.provider === 'kakao' ? 'PLACE_SEARCH_FAILED' :
          error.kind === 'missing_key' ? 'OPENAI_API_KEY_MISSING' : 'OPENAI_REQUEST_FAILED';
        return res.status(503).json({ success: false, error: { code, message: '외부 서비스 요청에 실패했습니다.' } });
      }
      console.error('[joint recommendation failed]', error instanceof Error ? error.name : 'unknown');
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '추천 요청을 처리하지 못했습니다.' } });
    }
  },
);
