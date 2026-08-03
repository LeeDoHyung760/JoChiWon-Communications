import { z } from 'zod';

export const chungnyeongIntentSchema = z.enum([
  'FIND_PERSON',
  'FIND_RECRUITMENT',
  'RECOMMEND_ACTIVITY',
  'CHECK_APPLICATION',
  'GUIDE_SPACE',
]);

export const chungnyeongCardSchema = z.object({
  type: z.enum(['person', 'recruitment', 'request', 'space']),
  id: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(240),
  matchScore: z.number().int().min(0).max(100).nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(5),
  actions: z.array(z.enum(['PROFILE', 'CHAT_REQUEST', 'DETAIL', 'PROFILE_REQUEST', 'TRAVEL'])).max(3),
}).strict();

export const chungnyeongResponseSchema = z.object({
  message: z.string().trim().min(1).max(500),
  intent: chungnyeongIntentSchema,
  cards: z.array(chungnyeongCardSchema).max(3),
  suggestedReplies: z.array(z.string().trim().min(1).max(80)).max(3),
}).strict();

export const chungnyeongChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(500),
}).strict();

export type ChungnyeongStructuredResponse = z.infer<typeof chungnyeongResponseSchema>;

