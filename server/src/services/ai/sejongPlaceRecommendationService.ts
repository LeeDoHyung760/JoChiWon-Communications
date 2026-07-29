import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { AiPlaceRecommendationModel } from '../../models/AiPlaceRecommendation.js';
import { ExternalProviderError, type ExternalErrorKind } from '../../providers/types.js';
import {
  buildSejongPlaceRecommendationInput,
  SEJONG_PLACE_PROMPT_VERSION,
  SEJONG_PLACE_RECOMMENDATION_SYSTEM_PROMPT,
} from './prompts/sejongPlaceRecommendationPrompt.js';
import { getOpenAIClient } from './openaiClient.js';
import {
  placeRecommendationInputSchema,
  placeRecommendationOutputSchema,
  RecommendationValidationError,
  validateCandidatePlaces,
  type PlaceRecommendationInput,
  type PlaceRecommendationResult,
  type SavedPlaceRecommendationResponse,
} from './schemas/placeRecommendationSchema.js';

export interface PlaceRecommendationGenerator {
  generate(input: PlaceRecommendationInput): Promise<PlaceRecommendationResult>;
}

export interface PlaceRecommendationStore {
  save(
    input: PlaceRecommendationInput,
    result: PlaceRecommendationResult,
    requesterUserId: string,
    promptVersion: string,
    modelName: string,
  ): Promise<string>;
}

function classifyOpenAIError(error: unknown): ExternalErrorKind {
  if (error instanceof OpenAI.AuthenticationError) return 'authentication';
  if (error instanceof OpenAI.RateLimitError) return 'rate_limit';
  if (error instanceof OpenAI.APIConnectionTimeoutError) return 'timeout';
  if (error instanceof OpenAI.APIConnectionError) return 'network';
  if (error instanceof OpenAI.BadRequestError || error instanceof z.ZodError) return 'response_format';
  return 'unknown';
}

export class OpenAIPlaceRecommendationGenerator implements PlaceRecommendationGenerator {
  async generate(input: PlaceRecommendationInput): Promise<PlaceRecommendationResult> {
    if (!env.OPENAI_MODEL) throw new Error('OPENAI_MODEL_NOT_CONFIGURED');
    try {
      const response = await getOpenAIClient().responses.parse({
        model: env.OPENAI_MODEL,
        instructions: SEJONG_PLACE_RECOMMENDATION_SYSTEM_PROMPT,
        input: buildSejongPlaceRecommendationInput(input),
        max_output_tokens: 2400,
        text: {
          format: zodTextFormat(placeRecommendationOutputSchema, 'sejong_place_recommendation'),
        },
      });
      if (!response.output_parsed) {
        throw new RecommendationValidationError(
          'INVALID_MODEL_OUTPUT',
          'OpenAI 응답이 지정된 JSON Schema를 따르지 않습니다.',
        );
      }
      return placeRecommendationOutputSchema.parse(response.output_parsed);
    } catch (error) {
      if (error instanceof RecommendationValidationError) throw error;
      throw new ExternalProviderError('openai', classifyOpenAIError(error));
    }
  }
}

const mongoStore: PlaceRecommendationStore = {
  async save(input, result, requesterUserId, promptVersion, modelName) {
    const document = await AiPlaceRecommendationModel.create({
      requesterUserId,
      companionUserId: input.companion?.userId,
      promptVersion,
      modelName,
      inputSummary: {
        requesterInterests: input.requester.interests,
        companionInterests: input.companion?.interests ?? [],
        sharedInterests: input.conversationSummary?.sharedInterests ?? [],
        wantedActivities: input.conversationSummary?.wantedActivities ?? [],
        candidatePlaceIds: input.candidatePlaces.map((place) => place.placeId),
      },
      ...result,
    });
    return document.id as string;
  },
};

export class RecommendationPersistenceError extends Error {
  constructor() {
    super('추천 결과를 저장하지 못했습니다.');
    this.name = 'RecommendationPersistenceError';
  }
}

export class SejongPlaceRecommendationService {
  constructor(
    private readonly generator: PlaceRecommendationGenerator = new OpenAIPlaceRecommendationGenerator(),
    private readonly store: PlaceRecommendationStore = mongoStore,
  ) {}

  async create(
    rawInput: unknown,
    authenticatedRequesterUserId: string,
  ): Promise<SavedPlaceRecommendationResponse> {
    const parsed = placeRecommendationInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const emptyCandidates =
        typeof rawInput === 'object' &&
        rawInput !== null &&
        Array.isArray((rawInput as { candidatePlaces?: unknown }).candidatePlaces) &&
        (rawInput as { candidatePlaces: unknown[] }).candidatePlaces.length === 0;
      throw new RecommendationValidationError(
        emptyCandidates ? 'CANDIDATE_PLACES_EMPTY' : 'INVALID_INPUT',
        emptyCandidates
          ? 'candidatePlaces는 최소 1개 이상이어야 합니다.'
          : `추천 요청 형식이 올바르지 않습니다: ${parsed.error.issues[0]?.message ?? 'invalid input'}`,
      );
    }

    const input: PlaceRecommendationInput = {
      ...parsed.data,
      requester: { ...parsed.data.requester, userId: authenticatedRequesterUserId },
    };
    let result: PlaceRecommendationResult;
    try {
      result = placeRecommendationOutputSchema.parse(await this.generator.generate(input));
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new RecommendationValidationError(
          'INVALID_MODEL_OUTPUT',
          'OpenAI 응답이 지정된 JSON Schema를 따르지 않습니다.',
        );
      }
      throw error;
    }
    validateCandidatePlaces(result, input.candidatePlaces);

    try {
      const recommendationId = await this.store.save(
        input,
        result,
        authenticatedRequesterUserId,
        env.OPENAI_PROMPT_VERSION || SEJONG_PLACE_PROMPT_VERSION,
        env.OPENAI_MODEL!,
      );
      return { recommendationId, data: result };
    } catch {
      throw new RecommendationPersistenceError();
    }
  }
}
