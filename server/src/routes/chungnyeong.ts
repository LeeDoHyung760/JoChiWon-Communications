import { Router } from 'express';
import { requireAuthenticatedUser } from '../middleware/authenticatedUser.js';
import { chungnyeongChatRequestSchema } from '../services/chungnyeong/chungnyeongSchemas.js';
import { runChungnyeongHarness } from '../services/chungnyeong/chungnyeongHarness.js';
import { sendProfileRequest } from '../services/chungnyeong/chungnyeongTools.js';
import { z } from 'zod';

export const chungnyeongRouter = Router();

chungnyeongRouter.post('/chat', requireAuthenticatedUser, async (req, res) => {
  const body = chungnyeongChatRequestSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: '1~500자의 질문을 입력해 주세요.' } });
  const userId = res.locals.authenticatedUserId as string;
  const result = await runChungnyeongHarness(userId, body.data.message);
  return res.json({ success: true, ...result });
});

const profileRequestSchema = z.object({
  recruitmentId: z.string().trim().min(1).max(100),
  message: z.string().trim().min(1).max(300),
}).strict();

chungnyeongRouter.post('/profile-requests', requireAuthenticatedUser, async (req, res) => {
  const body = profileRequestSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: '프로필 전달 요청 형식이 올바르지 않습니다.' } });
  try {
    const request = await sendProfileRequest(res.locals.authenticatedUserId as string, body.data);
    return res.status(201).json({ success: true, request });
  } catch (error) {
    if (error instanceof Error && error.message === 'RECRUITMENT_NOT_FOUND') return res.status(404).json({ success: false, error: { code: 'RECRUITMENT_NOT_FOUND', message: '모집글을 찾을 수 없습니다.' } });
    throw error;
  }
});
