import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { JointCampusRecommendationModel } from '../../models/JointCampusRecommendation.js';
import { ExternalProviderError, type ExternalErrorKind } from '../../providers/types.js';
import {
  buildJointCampusRecommendationInput,
  JOINT_CAMPUS_PLACE_PROMPT_VERSION,
  JOINT_CAMPUS_PLACE_RECOMMENDATION_SYSTEM_PROMPT,
} from './prompts/jointCampusPlaceRecommendationPrompt.js';
import {
  jointCampusRecommendationInputSchema,
  jointCampusRecommendationOutputSchema,
  JointRecommendationError,
  validateJointRecommendationResult,
  type JointCampusPlaceRecommendationInput,
  type JointCampusPlaceRecommendationResult,
} from './schemas/jointCampusPlaceRecommendationSchema.js';
import { getOpenAIClient } from './openaiClient.js';

export interface JointRecommendationGenerator {
  generate(input: JointCampusPlaceRecommendationInput): Promise<JointCampusPlaceRecommendationResult>;
}

function classifyError(error: unknown): ExternalErrorKind {
  if (error instanceof OpenAI.AuthenticationError) return 'authentication';
  if (error instanceof OpenAI.RateLimitError) return 'rate_limit';
  if (error instanceof OpenAI.APIConnectionTimeoutError) return 'timeout';
  if (error instanceof OpenAI.APIConnectionError) return 'network';
  if (error instanceof OpenAI.BadRequestError || error instanceof z.ZodError) return 'response_format';
  return 'unknown';
}

export class OpenAIJointRecommendationGenerator implements JointRecommendationGenerator {
  async generate(input: JointCampusPlaceRecommendationInput): Promise<JointCampusPlaceRecommendationResult> {
    if (!env.OPENAI_MODEL) throw new JointRecommendationError(
      'OPENAI_MODEL_MISSING',
      'OPENAI_MODEL 환경변수가 설정되지 않았습니다.',
      503,
    );
    try {
      const response = await getOpenAIClient().responses.parse({
        model: env.OPENAI_MODEL,
        instructions: JOINT_CAMPUS_PLACE_RECOMMENDATION_SYSTEM_PROMPT,
        input: buildJointCampusRecommendationInput(input),
        store: false,
        max_output_tokens: 2600,
        text: {
          format: zodTextFormat(jointCampusRecommendationOutputSchema, 'joint_campus_place_recommendation'),
        },
      }, { timeout: env.OPENAI_REQUEST_TIMEOUT_MS });
      if (!response.output_parsed) {
        throw new JointRecommendationError(
          'INVALID_MODEL_OUTPUT',
          'OpenAI 응답이 지정된 JSON Schema를 따르지 않습니다.',
          502,
        );
      }
      return jointCampusRecommendationOutputSchema.parse(response.output_parsed);
    } catch (error) {
      if (error instanceof JointRecommendationError) throw error;
      if (error instanceof z.ZodError) {
        throw new JointRecommendationError('INVALID_MODEL_OUTPUT', 'OpenAI 구조화 응답 검증에 실패했습니다.', 502);
      }
      throw new ExternalProviderError('openai', classifyError(error));
    }
  }
}

class CandidateOnlyMockGenerator implements JointRecommendationGenerator {
  async generate(input: JointCampusPlaceRecommendationInput): Promise<JointCampusPlaceRecommendationResult> {
    const route = input.candidatePlaces.slice(0, Math.min(2, input.candidatePlaces.length)).map((place, index) => ({
      placeId: place.placeId,
      order: index + 1,
      recommendedMinutes: 60,
      reasonForRequester: '직접 선택한 관심사를 반영한 후보입니다.',
      reasonForCompanion: '동행자의 관심사와 함께 살펴볼 수 있는 후보입니다.',
      sharedReason: '두 사람의 관심사를 함께 이어가기 좋은 실제 후보 장소입니다.',
      experienceConnection: '가상 공동캠퍼스의 관심 기록과 연결됩니다.',
      localEconomyConnection: place.isLocalBusiness
        ? '세종 지역 사업장 방문과 소비로 연결될 수 있습니다.'
        : '주변 지역 상권을 함께 이용할 수 있습니다.',
    }));
    return {
      recommendationTitle: '두 사람의 관심사를 잇는 세종 코스',
      sharedInterestSummary: '명시적 관심사를 우선해 실제 후보 장소를 구성했습니다.',
      usedExplicitInterests: [...new Set([
        ...input.requester.explicitInterests,
        ...input.companion.explicitInterests,
      ])].slice(0, 5),
      usedInferredInterests: [],
      route,
      conversationStarters: ['각자 가장 기대되는 장소와 이유를 이야기해 보세요.'],
      totalEstimatedMinutes: route.reduce((sum, item) => sum + item.recommendedMinutes, 0),
      routeConcept: '관심사를 균형 있게 연결하는 세종 방문 코스',
      cautions: ['방문 전 공식 채널에서 운영 정보를 확인하세요.'],
    };
  }
}

export class JointCampusPlaceRecommendationService {
  constructor(
    private readonly generator: JointRecommendationGenerator =
      env.OPENAI_MOCK_ENABLED ? new CandidateOnlyMockGenerator() : new OpenAIJointRecommendationGenerator(),
  ) {}

  async create(rawInput: unknown): Promise<{
    recommendationId: string;
    data: JointCampusPlaceRecommendationResult;
    isMock?: boolean;
  }> {
    const parsed = jointCampusRecommendationInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const empty = typeof rawInput === 'object' && rawInput !== null &&
        Array.isArray((rawInput as { candidatePlaces?: unknown[] }).candidatePlaces) &&
        (rawInput as { candidatePlaces: unknown[] }).candidatePlaces.length === 0;
      throw new JointRecommendationError(
        empty ? 'CANDIDATE_PLACES_EMPTY' : 'INVALID_INPUT',
        empty ? '실제 장소 후보가 없어 추천을 생성할 수 없습니다.' : parsed.error.issues[0]?.message ?? '잘못된 요청입니다.',
      );
    }

    let generated: JointCampusPlaceRecommendationResult;
    try {
      generated = jointCampusRecommendationOutputSchema.parse(await this.generator.generate(parsed.data));
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new JointRecommendationError('INVALID_MODEL_OUTPUT', 'OpenAI 구조화 응답 검증에 실패했습니다.', 502);
      }
      throw error;
    }
    const result = validateJointRecommendationResult(generated, parsed.data);
    try {
      const saved = await JointCampusRecommendationModel.create({
        roomId: parsed.data.roomId,
        requesterUserId: parsed.data.requester.userId,
        companionUserId: parsed.data.companion.userId,
        promptVersion: JOINT_CAMPUS_PLACE_PROMPT_VERSION,
        modelName: env.OPENAI_MOCK_ENABLED ? 'candidate-only-mock' : env.OPENAI_MODEL,
        inputSummary: {
          requesterExplicitInterests: parsed.data.requester.explicitInterests,
          companionExplicitInterests: parsed.data.companion.explicitInterests,
          requesterInferredInterests: parsed.data.requester.inferredInterests.map(({ id }) => id),
          companionInferredInterests: parsed.data.companion.inferredInterests.map(({ id }) => id),
          candidatePlaceIds: parsed.data.candidatePlaces.map(({ placeId }) => placeId),
        },
        result,
        status: 'success',
      });
      return { recommendationId: saved.id as string, data: result, ...(env.OPENAI_MOCK_ENABLED && { isMock: true }) };
    } catch {
      throw new JointRecommendationError('RECOMMENDATION_SAVE_FAILED', '추천 결과를 저장하지 못했습니다.', 500);
    }
  }
}
