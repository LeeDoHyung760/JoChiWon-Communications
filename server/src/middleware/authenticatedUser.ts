import { createHmac, timingSafeEqual } from 'node:crypto';
import type { RequestHandler, Response } from 'express';
import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';

const COOKIE_NAME = 'jochwon_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function signature(value: string): string {
  return createHmac('sha256', env.AUTH_SESSION_SECRET ?? '').update(value).digest('base64url');
}

export function createAuthSessionToken(userId: string): string | undefined {
  if (!env.AUTH_SESSION_SECRET) return undefined;
  const payload = Buffer.from(JSON.stringify({
    userId,
    expiresAt: Date.now() + MAX_AGE_SECONDS * 1000,
  })).toString('base64url');
  return `${payload}.${signature(payload)}`;
}

export function setAuthSessionCookie(res: Response, userId: string): void {
  const token = createAuthSessionToken(userId);
  if (!token) return;
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: MAX_AGE_SECONDS * 1000,
  });
}

function readCookie(header: string | undefined): string | undefined {
  return header?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
}

export function verifyAuthSessionToken(token: string): string | undefined {
  if (!env.AUTH_SESSION_SECRET) return undefined;
  const [payload, supplied] = token.split('.');
  if (!payload || !supplied) return undefined;
  const expected = signature(payload);
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return undefined;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      userId?: unknown;
      expiresAt?: unknown;
    };
    return typeof value.userId === 'string' &&
      typeof value.expiresAt === 'number' &&
      value.expiresAt > Date.now()
      ? value.userId
      : undefined;
  } catch {
    return undefined;
  }
}

export function authenticatedUserIdFromCookie(cookieHeader: string | undefined): string | undefined {
  return verifyAuthSessionToken(readCookie(cookieHeader) ?? '');
}

export const requireAuthenticatedUser: RequestHandler = async (req, res, next) => {
  if (!env.AUTH_SESSION_SECRET) {
    return res.status(503).json({ success: false, error: { code: 'AUTH_NOT_CONFIGURED', message: 'AUTH_SESSION_SECRET가 설정되지 않았습니다.' } });
  }
  const userId = authenticatedUserIdFromCookie(req.headers.cookie);
  if (!userId) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: '로그인이 필요합니다.' } });
  }
  const exists = await UserModel.exists({ _id: userId }).catch(() => null);
  if (!exists) {
    return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: '사용자 프로필을 찾을 수 없습니다.' } });
  }
  res.locals.authenticatedUserId = userId;
  return next();
};
