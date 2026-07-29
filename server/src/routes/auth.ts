import { Router } from 'express';
import type { Response } from 'express';
import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';
import { setAuthSessionCookie } from '../middleware/authenticatedUser.js';
import mongoose from 'mongoose';
import { classifyAgeGroup } from '../services/age/ageClassificationService.js';

export const authRouter = Router();

type KakaoErrorBody = {
  error?: string;
  error_description?: string;
  error_code?: string;
  msg?: string;
  code?: number;
  access_token?: string;
};

const readJson = async (response: globalThis.Response): Promise<KakaoErrorBody> => {
  try {
    return await response.json() as KakaoErrorBody;
  } catch {
    return {};
  }
};

const callbackUrl = (req: { protocol: string; get(name: string): string | undefined }) =>
  `${req.protocol}://${req.get('host') ?? `localhost:${env.PORT}`}/api/auth/kakao/callback`;
const kakaoLoginScopes = () => env.KAKAO_LOGIN_SCOPES
  .split(',')
  .map(scope => scope.trim())
  .filter(Boolean);
const kakaoServiceTerms = () => env.KAKAO_SERVICE_TERMS
  .split(',')
  .map(term => term.trim())
  .filter(Boolean);

const kakaoFailure = (
  res: Response,
  status: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {},
) => res.status(status).json({
  success: false,
  error: {
    code,
    message,
    ...(env.NODE_ENV === 'production' ? {} : { details }),
  },
});

const redirectLoggedInUser = (
  res: Response,
  savedUser: {
    id: string;
    nickname: string;
    profileImage: string;
  },
) => {
  setAuthSessionCookie(res, savedUser.id);
  const redirectUrl = new URL(env.CLIENT_ORIGIN);
  redirectUrl.searchParams.set('login', 'success');
  redirectUrl.searchParams.set('userId', savedUser.id);
  redirectUrl.searchParams.set('nickname', savedUser.nickname);
  redirectUrl.searchParams.set('profileImage', savedUser.profileImage);

  return res.redirect(redirectUrl.toString());
};

authRouter.get('/kakao/diagnostics', async (req, res) => {
  const actualCallbackUrl = callbackUrl(req);
  const databaseReady = mongoose.connection.readyState === 1;
  const savedKakaoUserCount = databaseReady
    ? await UserModel.countDocuments({ authProvider: 'kakao' }).catch(() => null)
    : null;
  return res.json({
    ok: Boolean(env.KAKAO_REST_API_KEY && env.KAKAO_REDIRECT_URI),
    checks: {
      restApiKeyConfigured: Boolean(env.KAKAO_REST_API_KEY),
      redirectUriConfigured: Boolean(env.KAKAO_REDIRECT_URI),
      clientSecretConfigured: Boolean(env.KAKAO_CLIENT_SECRET),
      authSessionSecretConfigured: Boolean(env.AUTH_SESSION_SECRET),
      redirectUriMatchesCurrentServer: env.KAKAO_REDIRECT_URI === actualCallbackUrl,
      databaseConnected: databaseReady,
    },
    database: {
      configuredName: env.MONGODB_DB_NAME,
      connectedName: mongoose.connection.name || null,
      savedKakaoUserCount,
    },
    expected: {
      loginUrl: `${req.protocol}://${req.get('host') ?? `localhost:${env.PORT}`}/api/auth/kakao`,
      callbackUrl: actualCallbackUrl,
      configuredRedirectUri: env.KAKAO_REDIRECT_URI ?? null,
      configuredScopes: kakaoLoginScopes(),
      configuredServiceTerms: kakaoServiceTerms(),
      kakaoConsoleRequirement: '카카오 개발자 콘솔의 Redirect URI와 configuredRedirectUri가 문자 단위로 같아야 합니다.',
    },
  });
});

authRouter.get('/kakao', (req, res) => {
  const clientId = env.KAKAO_REST_API_KEY;
  const redirectUri = env.KAKAO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return kakaoFailure(res, 503, 'KAKAO_CONFIG_MISSING', '카카오 로그인 환경변수가 설정되지 않았습니다.', {
      restApiKeyConfigured: Boolean(clientId),
      redirectUriConfigured: Boolean(redirectUri),
      diagnosticsUrl: `${req.protocol}://${req.get('host')}/api/auth/kakao/diagnostics`,
    });
  }

  const authorizationParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: kakaoLoginScopes().join(','),
  });
  const serviceTerms = kakaoServiceTerms();
  if (serviceTerms.length) authorizationParams.set('service_terms', serviceTerms.join(','));
  const url =
    'https://kauth.kakao.com/oauth/authorize?' +
    authorizationParams.toString();

  res.redirect(url);
});

authRouter.get('/demo', async (_req, res) => {
  if (env.NODE_ENV === 'production') {
    return res.status(404).json({
      message: '체험용 로그인은 개발 환경에서만 사용할 수 있습니다.',
    });
  }

  try {
    const savedUser = await UserModel.findOneAndUpdate(
      { kakaoId: 'demo-local-user' },
      {
        $set: {
          nickname: '체험 탐험가',
          profileImage: '',
          authProvider: 'demo',
          lastLoginAt: new Date(),
        },
      },
      {
        returnDocument: 'after',
        upsert: true,
      },
    );

    return redirectLoggedInUser(res, savedUser);
  } catch (error) {
    console.error('[Auth] 체험용 로그인 실패:', error);

    return res.status(500).json({
      message: '체험용 로그인을 시작하지 못했습니다.',
    });
  }
});

authRouter.get('/kakao/callback', async (req, res) => {
  const code = req.query.code;
  const clientId = env.KAKAO_REST_API_KEY;
  const redirectUri = env.KAKAO_REDIRECT_URI;

  if (typeof req.query.error === 'string') {
    return kakaoFailure(res, 400, 'KAKAO_AUTHORIZATION_DENIED', '카카오 인증 단계에서 로그인이 취소되거나 거부되었습니다.', {
      providerError: req.query.error,
      providerDescription: typeof req.query.error_description === 'string' ? req.query.error_description : undefined,
    });
  }

  if (typeof code !== 'string' || !code.trim()) {
    return kakaoFailure(res, 400, 'KAKAO_CODE_MISSING', '카카오 콜백에 인가 코드가 없습니다.', {
      queryKeys: Object.keys(req.query),
    });
  }

  if (!clientId || !redirectUri) {
    return kakaoFailure(res, 503, 'KAKAO_CONFIG_MISSING', '카카오 로그인 환경변수가 설정되지 않았습니다.', {
      restApiKeyConfigured: Boolean(clientId),
      redirectUriConfigured: Boolean(redirectUri),
    });
  }

  try {
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
    });
    if (env.KAKAO_CLIENT_SECRET) tokenBody.set('client_secret', env.KAKAO_CLIENT_SECRET);

    const tokenResponse = await fetch(
      'https://kauth.kakao.com/oauth/token',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded;charset=utf-8',
        },
        body: tokenBody,
      },
    );

    const token = await readJson(tokenResponse);
    if (!tokenResponse.ok || !token.access_token) {
      console.warn('[Auth] Kakao token exchange failed', {
        status: tokenResponse.status,
        providerError: token.error,
        providerCode: token.error_code,
        redirectUriMatchesCurrentServer: redirectUri === callbackUrl(req),
        clientSecretConfigured: Boolean(env.KAKAO_CLIENT_SECRET),
      });
      return kakaoFailure(res, 502, 'KAKAO_TOKEN_EXCHANGE_FAILED', '카카오 인가 코드를 토큰으로 교환하지 못했습니다.', {
        providerStatus: tokenResponse.status,
        providerError: token.error,
        providerDescription: token.error_description,
        providerCode: token.error_code,
        configuredRedirectUri: redirectUri,
        currentCallbackUrl: callbackUrl(req),
        clientSecretConfigured: Boolean(env.KAKAO_CLIENT_SECRET),
      });
    }

    const userResponse = await fetch(
      'https://kapi.kakao.com/v2/user/me',
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      },
    );

   const kakaoUser = await readJson(userResponse) as KakaoErrorBody & {
  id?: number;
  properties?: {
    nickname?: string;
    profile_image?: string;
    thumbnail_image?: string;
  };
  kakao_account?: {
    name?: string;
    name_needs_agreement?: boolean;
    email?: string;
    email_needs_agreement?: boolean;
    is_email_valid?: boolean;
    is_email_verified?: boolean;
    age_range?: string;
    age_range_needs_agreement?: boolean;
    birthyear?: string;
    birthyear_needs_agreement?: boolean;
    birthday?: string;
    birthday_type?: 'SOLAR' | 'LUNAR';
    birthday_needs_agreement?: boolean;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
      thumbnail_image_url?: string;
    };
  };
};

if (!userResponse.ok || !kakaoUser.id) {
  console.warn('[Auth] Kakao user profile failed', {
    status: userResponse.status,
    providerCode: kakaoUser.code,
  });
  return kakaoFailure(res, 502, 'KAKAO_USER_PROFILE_FAILED', '카카오 사용자 정보를 불러오지 못했습니다.', {
    providerStatus: userResponse.status,
    providerCode: kakaoUser.code,
    providerMessage: kakaoUser.msg,
  });
}

const kakaoId = String(kakaoUser.id);

const nickname =
  kakaoUser.kakao_account?.profile?.nickname ??
  kakaoUser.properties?.nickname ??
  '카카오 사용자';

const profileImage =
  kakaoUser.kakao_account?.profile?.profile_image_url ??
  kakaoUser.properties?.profile_image ??
  kakaoUser.kakao_account?.profile?.thumbnail_image_url ??
  kakaoUser.properties?.thumbnail_image ??
  '';

const birthyear = kakaoUser.kakao_account?.birthyear;
const birthday = kakaoUser.kakao_account?.birthday;
const birthdayType = kakaoUser.kakao_account?.birthday_type ?? 'UNKNOWN';
const existingUser = await UserModel.findOne({ kakaoId })
  .select('+birthInfo.birthyear +birthInfo.birthday +birthInfo.birthdayType ageSource')
  .lean();
const useConfirmedBirth = (!birthyear || !birthday) && existingUser?.ageSource === 'user_input';
const effectiveBirthyear = useConfirmedBirth ? existingUser.birthInfo?.birthyear : birthyear;
const effectiveBirthday = useConfirmedBirth ? existingUser.birthInfo?.birthday : birthday;
const effectiveBirthdayType = useConfirmedBirth
  ? existingUser.birthInfo?.birthdayType ?? 'UNKNOWN'
  : birthdayType;
const ageClassification = classifyAgeGroup({
  birthyear: effectiveBirthyear ?? undefined,
  birthday: effectiveBirthday ?? undefined,
  birthdayType: effectiveBirthdayType,
});
const birthDate = /^\d{4}$/.test(birthyear ?? '') && /^\d{4}$/.test(birthday ?? '')
  ? `${birthyear}-${birthday!.slice(0, 2)}-${birthday!.slice(2)}`
  : undefined;

const savedUser = await UserModel.findOneAndUpdate(
  {
    kakaoId,
  },
  {
    $set: {
      nickname,
      profileImage,
      profileImageUrl: profileImage,
      ...(kakaoUser.kakao_account?.email && kakaoUser.kakao_account.is_email_valid !== false
        ? { email: kakaoUser.kakao_account.email }
        : {}),
      ...(kakaoUser.kakao_account?.name ? { kakaoName: kakaoUser.kakao_account.name } : {}),
      ...(birthDate ? { birthDate } : {}),
      ...(kakaoUser.kakao_account?.birthday_type ? { birthdayType: kakaoUser.kakao_account.birthday_type } : {}),
      ...(!useConfirmedBirth ? { birthInfo: {
        ...(birthyear ? { birthyear } : {}),
        ...(birthday ? { birthday } : {}),
        birthdayType,
      } } : {}),
      ageGroup: ageClassification.ageGroup,
      ...(ageClassification.adultAt ? { adultAt: ageClassification.adultAt } : {}),
      ageCheckedAt: new Date(),
      ageSource: ageClassification.reason === 'CALCULATED'
        ? useConfirmedBirth ? 'user_input' : 'kakao_account'
        : 'unknown',
      authProvider: 'kakao',
      lastLoginAt: new Date(),
    },
    ...(ageClassification.adultAt ? {} : { $unset: { adultAt: 1 } }),
  },
  {
    returnDocument: 'after',
    upsert: true,
    runValidators: true,
  },
);

console.info('[Auth] Kakao user saved', {
  userId: savedUser.id,
  database: mongoose.connection.name,
  isNewLogin: savedUser.lastLoginAt instanceof Date,
  ageGroup: savedUser.ageGroup,
  ageReason: ageClassification.reason,
  personalScopesComplete: Boolean(kakaoUser.kakao_account?.email && birthyear && birthday),
});

return redirectLoggedInUser(res, savedUser);
  } catch (error) {
    console.error('[Auth] Kakao callback failed', {
      errorName: error instanceof Error ? error.name : 'unknown',
    });
    return kakaoFailure(res, 502, 'KAKAO_NETWORK_OR_DATABASE_FAILED', '카카오 로그인 처리 중 네트워크 또는 데이터베이스 오류가 발생했습니다.', {
      errorName: error instanceof Error ? error.name : 'unknown',
    });
  }
});
