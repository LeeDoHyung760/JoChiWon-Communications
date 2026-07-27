import type { RequestHandler } from 'express';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const clients = new Map<string, { count: number; resetAt: number }>();

export const recommendationRateLimit: RequestHandler = (req, res, next) => {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const current = clients.get(key);
  const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + WINDOW_MS } : current;
  entry.count += 1;
  clients.set(key, entry);
  res.setHeader('RateLimit-Limit', String(MAX_REQUESTS));
  res.setHeader('RateLimit-Remaining', String(Math.max(0, MAX_REQUESTS - entry.count)));
  if (entry.count > MAX_REQUESTS) return res.status(429).json({ error: '추천 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' });
  next();
};
