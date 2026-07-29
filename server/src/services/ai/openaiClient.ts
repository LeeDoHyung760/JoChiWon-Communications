import OpenAI from 'openai';
import { env } from '../../config/env.js';
import { ExternalProviderError } from '../../providers/types.js';

let client: OpenAI | undefined;

export function getOpenAIClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new ExternalProviderError('openai', 'missing_key');
  }
  client ??= new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    timeout: env.OPENAI_TIMEOUT_MS,
    maxRetries: env.OPENAI_MAX_RETRIES,
  });
  return client;
}

