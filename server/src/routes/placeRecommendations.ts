import { Router } from 'express';
import { recommendationRateLimit } from '../middleware/recommendationRateLimit.js';
import { requireAuthenticatedUser } from '../middleware/authenticatedUser.js';
import { ExternalProviderError } from '../providers/types.js';
import {
  RecommendationPersistenceError,
  SejongPlaceRecommendationService,
} from '../services/ai/sejongPlaceRecommendationService.js';
import { RecommendationValidationError } from '../services/ai/schemas/placeRecommendationSchema.js';

export const placeRecommendationsRouter = Router();
const service = new SejongPlaceRecommendationService();

placeRecommendationsRouter.post(
  '/place-recommendations',
  recommendationRateLimit,
  requireAuthenticatedUser,
  async (req, res) => {
    try {
      const result = await service.create(req.body, res.locals.authenticatedUserId as string);
      return res.status(201).json({ success: true, ...result });
    } catch (error) {
      if (error instanceof RecommendationValidationError) {
        const status = error.code === 'UNKNOWN_PLACE' || error.code === 'DUPLICATE_PLACE' ||
          error.code === 'INVALID_ROUTE_ORDER' || error.code === 'INVALID_TOTAL_MINUTES' ||
          error.code === 'INVALID_MODEL_OUTPUT' ? 502 : 400;
        return res.status(status).json({ success: false, error: { code: error.code, message: error.message } });
      }
      if (error instanceof ExternalProviderError) {
        const code = error.kind === 'missing_key' ? 'OPENAI_API_KEY_MISSING' : 'OPENAI_REQUEST_FAILED';
        return res.status(503).json({ success: false, error: { code, message: error.kind === 'missing_key' ? 'OPENAI_API_KEY가 설정되지 않았습니다.' : 'OpenAI 추천 생성에 실패했습니다.' } });
      }
      if (error instanceof RecommendationPersistenceError) {
        return res.status(500).json({ success: false, error: { code: 'RECOMMENDATION_SAVE_FAILED', message: error.message } });
      }
      if (error instanceof Error && error.message === 'OPENAI_MODEL_NOT_CONFIGURED') {
        return res.status(503).json({ success: false, error: { code: 'OPENAI_MODEL_MISSING', message: 'OPENAI_MODEL이 설정되지 않았습니다.' } });
      }
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '추천 요청을 처리하지 못했습니다.' } });
    }
  },
);

