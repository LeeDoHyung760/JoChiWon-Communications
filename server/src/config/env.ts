import '../loadEnv.js';
import { z } from 'zod';

const optionalSecret = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === ''
      ? undefined
      : value,
  z.string().trim().min(1).optional(),
);

const numberFromEnv = (
  name: string,
  fallback: number,
  min: number,
  max: number,
) =>
  z.preprocess(
    (value) =>
      value === undefined || value === ''
        ? fallback
        : Number(value),
    z
      .number({ error: `${name} must be a number` })
      .finite()
      .int()
      .min(min)
      .max(max),
  );

const booleanFromEnv = z.preprocess(
  (value) =>
    value === undefined || value === ''
      ? 'true'
      : value,
  z
    .enum(['true', 'false'])
    .transform((value) => value === 'true'),
);

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: numberFromEnv('PORT', 3001, 1, 65535),

  CLIENT_ORIGIN: z
    .string()
    .url()
    .default('http://localhost:5173'),

  MONGODB_URI: optionalSecret,

  MONGODB_DB_NAME: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .default('jochwon'),

  AI_PROVIDER: z
    .enum(['auto', 'mock', 'openai'])
    .default('auto'),

  PLACE_PROVIDER: z
    .enum(['auto', 'mock', 'kakao'])
    .default('auto'),

  OPENAI_API_KEY: optionalSecret,

  AUTH_SESSION_SECRET: optionalSecret,

  OPENAI_MODEL: z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === ''
        ? undefined
        : value,
    z.string().trim().min(1).optional(),
  ),

  OPENAI_PROMPT_VERSION: z.string().trim().min(1).default('1.0.0'),

  OPENAI_TIMEOUT_MS: numberFromEnv(
    'OPENAI_TIMEOUT_MS',
    15000,
    1000,
    120000,
  ),

  OPENAI_MAX_RETRIES: numberFromEnv(
    'OPENAI_MAX_RETRIES',
    1,
    0,
    10,
  ),

  KAKAO_REST_API_KEY: optionalSecret,

  KAKAO_REDIRECT_URI: z.string().url().optional(),

  KAKAO_CLIENT_SECRET: optionalSecret,

  KAKAO_LOGIN_SCOPES: z
    .string()
    .trim()
    .min(1)
    .default('account_email,birthyear,birthday'),

  KAKAO_SERVICE_TERMS: z
    .string()
    .trim()
    .default('user_age_check'),

  KAKAO_LOCAL_BASE_URL: z
    .string()
    .url()
    .default('https://dapi.kakao.com'),

  KAKAO_LOCAL_TIMEOUT_MS: numberFromEnv(
    'KAKAO_LOCAL_TIMEOUT_MS',
    10000,
    1000,
    120000,
  ),

  SEJONG_API_KEY: optionalSecret,

  SEJONG_FESTIVAL_API_URL: z
    .string()
    .url()
    .default(
      'http://apis.data.go.kr/5690000/sjFestival/sj_00000360',
    ),

  SEJONG_API_TIMEOUT_MS: numberFromEnv(
    'SEJONG_API_TIMEOUT_MS',
    10000,
    1000,
    120000,
  ),

  TOUR_API_KEY: optionalSecret,

  TOUR_API_URL: z
    .string()
    .url()
    .default(
      'http://apis.data.go.kr/B551011/KorService2/searchFestival2',
    ),

  DEFAULT_SEARCH_REGION: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .default('조치원'),

  DEFAULT_SEARCH_RADIUS_METERS: numberFromEnv(
    'DEFAULT_SEARCH_RADIUS_METERS',
    5000,
    0,
    20000,
  ),

  RECOMMENDATION_RESULT_LIMIT: numberFromEnv(
    'RECOMMENDATION_RESULT_LIMIT',
    3,
    1,
    15,
  ),

  MAX_RECOMMENDATION_QUERY_LENGTH: numberFromEnv(
    'MAX_RECOMMENDATION_QUERY_LENGTH',
    300,
    1,
    1000,
  ),

  MAX_ANALYSIS_MESSAGES: numberFromEnv(
    'MAX_ANALYSIS_MESSAGES',
    20,
    1,
    100,
  ),

  CONVERSATION_INTEREST_CACHE_TTL_MS: numberFromEnv(
    'CONVERSATION_INTEREST_CACHE_TTL_MS', 1_800_000, 1_000, 86_400_000,
  ),

  CONVERSATION_INTEREST_CACHE_MAX_ITEMS: numberFromEnv(
    'CONVERSATION_INTEREST_CACHE_MAX_ITEMS', 1_000, 1, 100_000,
  ),

  OPENAI_REQUEST_TIMEOUT_MS: numberFromEnv(
    'OPENAI_REQUEST_TIMEOUT_MS', 20_000, 1_000, 120_000,
  ),

  OPENAI_MOCK_ENABLED: z.preprocess(
    value => value === undefined || value === '' ? 'false' : value,
    z.enum(['true', 'false']).transform(value => value === 'true'),
  ),

  ALLOW_MOCK_FALLBACK: booleanFromEnv,
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map(
      (issue) =>
        `${issue.path.join('.')}: ${issue.message}`,
    )
    .join('; ');

  throw new Error(
    `Invalid server environment: ${details}`,
  );
}

export const env = parsed.data;

export type AiProviderMode = typeof env.AI_PROVIDER;
export type PlaceProviderMode = typeof env.PLACE_PROVIDER;
