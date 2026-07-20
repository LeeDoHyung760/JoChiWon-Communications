# 여기 사람 있음

React + Phaser + Express + Socket.IO 기반 조치원 메타버스입니다. 사용자 매칭은 자체 점수 알고리즘으로 처리하고, 대화 분석/추천 문장은 OpenAI, 실제 장소 검색은 Kakao Local REST API를 선택적으로 사용합니다.

## 실행

```bash
npm install
copy server\.env.example server\.env
npm run dev
```

기본값은 API 키가 전혀 필요 없는 Mock 모드입니다. 웹은 `http://localhost:5173`, 서버는 `http://localhost:3001`에서 실행됩니다.

## 환경 변수

`server/.env.example`을 `server/.env`로 복사해 설정합니다. `.env`는 Git에서 제외되며 키는 서버에서만 읽습니다.

```env
OPENAI_API_KEY=
KAKAO_REST_API_KEY=
AI_PROVIDER=mock
PLACE_PROVIDER=mock
```

- Mock 시연: `AI_PROVIDER=mock`, `PLACE_PROVIDER=mock`
- 실제 연동: `AI_PROVIDER=openai`, `PLACE_PROVIDER=kakao`로 변경하고 각 키 입력
- OpenAI 키: [OpenAI API Keys](https://platform.openai.com/api-keys)
- Kakao REST API 키: [Kakao Developers](https://developers.kakao.com/)에서 앱 생성 후 **앱 키 > REST API 키** 확인

OpenAI와 Kakao 중 하나만 실제 공급자로 설정하는 혼합 모드도 가능합니다. 키가 비어 있거나 외부 API가 실패하면 자동으로 규칙 기반 분석과 `server/src/data/mockPlaces.json`을 사용합니다.

## 추천 및 개인정보 보호

사용자가 **충녕이에게 장소 추천받기**를 누르고 동의한 경우에만 최근 메시지 최대 20개가 서버로 전송됩니다. 이메일, 카카오 ID 등 불필요한 개인정보는 보내지 않습니다. 서버 로그에는 전체 채팅 원문이나 API 키를 기록하지 않습니다.

매칭은 관심사 Jaccard 60%, 이용 목적 Jaccard 25%, MBTI 참고 15%로 계산합니다. 장소는 카테고리 35%, 공통 관심사 25%, 검색어 관련성 20%, 거리 10%, 그룹 적합성 10%로 계산해 상위 3개만 보여줍니다. OpenAI는 장소를 만들지 않고 Kakao/Mock에서 선정된 장소에 대한 문장만 작성합니다.

## API

- `POST /api/matching/score`
- `POST /api/ai/analyze-conversation`
- `POST /api/places/search`
- `POST /api/recommendations/generate`
- `POST /api/recommendations/from-chat`

## 검증

```bash
npm run build
```

Mock UI 확인은 `npm run dev` 후 프로필에서 관심사·이용 목적·선호 장소를 선택하고, 게임 화면의 충녕이 버튼에서 동의 → 로딩 → 추천 카드 → 투표/다른 장소 추천 흐름을 확인합니다.
