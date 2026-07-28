import { Router } from 'express';
import { UserModel } from '../models/User.js';

export const authRouter = Router();

authRouter.get('/kakao', (_req, res) => {
  const url =
    'https://kauth.kakao.com/oauth/authorize?' +
    new URLSearchParams({
      client_id: process.env.KAKAO_REST_API_KEY!,
      redirect_uri: process.env.KAKAO_REDIRECT_URI!,
      response_type: 'code',
    }).toString();

  res.redirect(url);
});

authRouter.get('/kakao/callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({
      message: '인가 코드가 없습니다.',
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
          client_id: process.env.KAKAO_REST_API_KEY!,
          redirect_uri: process.env.KAKAO_REDIRECT_URI!,
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
    new: true,
    upsert: true,
  },
);

const redirectUrl = new URL(
  'http://localhost:5173',
);

redirectUrl.searchParams.set(
  'login',
  'success',
);

redirectUrl.searchParams.set(
  'userId',
  savedUser.id,
);

redirectUrl.searchParams.set(
  'nickname',
  savedUser.nickname,
);

redirectUrl.searchParams.set(
  'profileImage',
  savedUser.profileImage,
);

return res.redirect(
  redirectUrl.toString(),
);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: '카카오 로그인 실패',
    });
  }
});