import { Router } from 'express';
import type { Response } from 'express';
import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';

export const authRouter = Router();

const redirectLoggedInUser = (
  res: Response,
  savedUser: {
    id: string;
    nickname: string;
    profileImage: string;
  },
) => {
  const redirectUrl = new URL(env.CLIENT_ORIGIN);
  redirectUrl.searchParams.set('login', 'success');
  redirectUrl.searchParams.set('userId', savedUser.id);
  redirectUrl.searchParams.set('nickname', savedUser.nickname);
  redirectUrl.searchParams.set('profileImage', savedUser.profileImage);

  return res.redirect(redirectUrl.toString());
};

authRouter.get('/kakao', (_req, res) => {
  const clientId = process.env.KAKAO_REST_API_KEY?.trim();
  const redirectUri = process.env.KAKAO_REDIRECT_URI?.trim();

  if (!clientId || !redirectUri) {
    return res.status(503).json({
      message:
        '카카오 로그인 키가 설정되지 않았습니다. 로컬에서는 체험용 로그인을 이용해주세요.',
    });
  }

  const url =
    'https://kauth.kakao.com/oauth/authorize?' +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
    }).toString();

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
        },
        $setOnInsert: {
          createdAt: new Date(),
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
  const clientId = process.env.KAKAO_REST_API_KEY?.trim();
  const redirectUri = process.env.KAKAO_REDIRECT_URI?.trim();

  if (!code) {
    return res.status(400).json({
      message: '인가 코드가 없습니다.',
    });
  }

  if (!clientId || !redirectUri) {
    return res.status(503).json({
      message: '카카오 로그인 환경변수가 설정되지 않았습니다.',
    });
  }

  try {
    const tokenResponse = await fetch(
      'https://kauth.kakao.com/oauth/token',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded;charset=utf-8',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          redirect_uri: redirectUri,
          code: String(code),
        }),
      },
    );

    const token = await tokenResponse.json();

    const userResponse = await fetch(
      'https://kapi.kakao.com/v2/user/me',
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      },
    );

   const kakaoUser = await userResponse.json() as {
  id?: number;
  properties?: {
    nickname?: string;
    profile_image?: string;
    thumbnail_image?: string;
  };
  kakao_account?: {
    profile?: {
      nickname?: string;
      profile_image_url?: string;
      thumbnail_image_url?: string;
    };
  };
};

if (!kakaoUser.id) {
  return res.status(502).json({
    message: '카카오 사용자 정보를 불러오지 못했습니다.',
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

const savedUser = await UserModel.findOneAndUpdate(
  {
    kakaoId,
  },
  {
    $set: {
      nickname,
      profileImage,
    },
    $setOnInsert: {
      createdAt: new Date(),
    },
  },
  {
    returnDocument: 'after',
    upsert: true,
  },
);

return redirectLoggedInUser(res, savedUser);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: '카카오 로그인 실패',
    });
  }
});
