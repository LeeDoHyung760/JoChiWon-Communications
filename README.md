# JoChiWon Communications

세종의 가상 공간 체험, 사용자 간 커뮤니케이션, 실제 세종 방문 추천을 연결하는 TypeScript 프로젝트입니다.

현재 구성은 React, Phaser, Express, Socket.IO, MongoDB, Mongoose이며, 실제 장소 검색에는 Kakao Local API, 공동 방문 코스 구성에는 OpenAI Responses API를 사용합니다.

## 실행 방법

```bash
npm install
npm --prefix server install
npm run dev
```

기본 주소:

- 프론트엔드: `http://127.0.0.1:5173`
- 백엔드: `http://localhost:3001`
- 서버 상태: `GET http://localhost:3001/health`
- Provider 상태: `GET http://localhost:3001/api/health/providers`
- Kakao 로그인 진단: `GET http://localhost:3001/api/auth/kakao/diagnostics`

환경변수를 변경하면 실행 중인 서버를 다시 시작해야 합니다.

## 현재 데이터 흐름

```text
카카오 로그인
  ↓
카카오 사용자 정보 조회
  ↓
User MongoDB 저장 또는 갱신
  ↓
백엔드에서 ageGroup 계산
  ↓
최초 온보딩
  ├─ 표시 이름
  ├─ 캐릭터와 아바타 옵션
  └─ 명시적 관심사
  ↓
같은 연령 그룹끼리 1대1 채팅
  ↓
메시지 MongoDB 저장
  ↓
대화 원문이 아닌 임시 관심 키워드만 서버 캐시에 저장
  ↓
Kakao Local API에서 실제 세종 장소 후보 검색
  ↓
OpenAI가 후보 안에서만 공동 코스 구성
  ↓
서버 검증 후 추천 결과 MongoDB 저장
```

## 주요 디렉터리

```text
src/
├─ pages/                         React 화면
├─ components/                    UI 컴포넌트
├─ game/                          Phaser 게임과 Socket.IO 클라이언트
└─ services/
   └─ jointCampusRecommendations.ts

server/src/
├─ index.ts                       Express와 Socket.IO 진입점
├─ middleware/                    인증 처리
├─ models/                        Mongoose 모델
├─ routes/                        REST API
├─ services/
│  ├─ age/                        연령 분류
│  ├─ chat/                       1대1 채팅 정책
│  ├─ interests/                  관심사 추출과 캐시
│  ├─ profile/                    온보딩 검증
│  ├─ places/                     실제 장소 검색
│  └─ ai/                         OpenAI 추천
└─ socket/
   └─ registerSocketHandlers.ts   실시간 채팅 처리
```

## 카카오 로그인과 사용자 저장

카카오 로그인 콜백 구현 파일:

- `server/src/routes/auth.ts`

가능한 경우 다음 정보를 읽습니다.

- Kakao user ID
- 이메일
- 프로필 닉네임
- 프로필 이미지
- 출생 연도
- 생일
- 생일 유형

사용자가 동의하지 않았거나 카카오 계정에 정보가 없을 수 있으므로 출생 정보가 항상 존재한다고 가정하지 않습니다.

정보가 부족하거나 생일 유형이 음력인 경우:

```json
{
  "ageGroup": "unknown",
  "requiresBirthConfirmation": true
}
```

카카오 액세스 토큰과 Client Secret은 MongoDB에 저장하지 않습니다. 출생 연도와 생일 원본도 공개 프로필 응답에 포함하지 않습니다.

로그인 설정 문제는 다음 API로 확인할 수 있습니다.

```http
GET /api/auth/kakao/diagnostics
```

진단 항목:

- REST API Key 설정 여부
- Redirect URI 설정 여부
- Client Secret 설정 여부
- 현재 서버 주소와 Redirect URI 일치 여부
- 인증 쿠키 서명 키 설정 여부
- MongoDB 연결 여부
- Kakao 사용자 저장 문서 수

## User MongoDB 모델

파일:

- `server/src/models/User.ts`

주요 필드:

```ts
{
  kakaoId: string;
  email?: string;
  displayName?: string;
  profileImageUrl?: string;
  avatar: {
    characterId: string;
    skinId?: string;
    hairId?: string;
    outfitId?: string;
    accessoryIds?: string[];
    colorOptions?: Record<string, string>;
  };
  birthInfo: {
    birthyear?: string;
    birthday?: string;
    birthdayType?: "SOLAR" | "LUNAR" | "UNKNOWN";
  };
  ageGroup: "adult" | "minor" | "unknown";
  adultAt?: Date;
  ageCheckedAt?: Date;
  ageSource: "kakao_account" | "user_input" | "unknown";
  explicitInterests: string[];
  onboardingCompleted: boolean;
}
```

`kakaoId`에는 unique index가 적용됩니다. 생년월일과 이메일은 기본 조회에서 제외되는 비공개 필드입니다.

## MongoDB에 저장되는 데이터

현재 `server/src/models`의 Mongoose 모델을 기준으로 다음 데이터가 MongoDB에 저장됩니다. 아래 컬렉션 이름은 Mongoose가 실제 DB에서 복수형·소문자로 변환할 수 있으므로 논리적인 모델 이름을 기준으로 적었습니다.

### 1. User

모델:

- `server/src/models/User.ts`

저장 내용:

- Kakao 사용자 고유 ID
- 이메일
- 카카오 닉네임과 프로필 이미지
- 온보딩 표시 이름
- 선택한 캐릭터와 아바타 옵션
- 출생 연도, 생일, 생일 유형
- 계산된 `ageGroup`
- 성인이 되는 날짜 `adultAt`
- 마지막 연령 확인 시각과 연령 정보 출처
- 사용자가 직접 선택한 명시적 관심사
- 온보딩 완료 여부
- 기존 프로필 정보
  - 닉네임
  - MBTI
  - 관심사와 이용 목적
  - 선호 장소 카테고리
  - 기록 공개 여부
  - 채팅 허용 여부
  - 기존 캐릭터 꾸미기 데이터
- 마지막으로 저장된 게임 위치
  - 맵 ID
  - X/Z 좌표
  - 방향
  - 저장 시각
- 인증 Provider와 마지막 로그인 시각
- `createdAt`, `updatedAt`

주의:

- 이메일과 생년월일은 비공개 필드이며 기본 User 조회에서 제외됩니다.
- 다른 사용자의 공개 프로필에서는 출생 연도와 생일을 반환하지 않습니다.
- Kakao 액세스 토큰과 Client Secret은 저장하지 않습니다.

### 2. DirectRoom

모델:

- `server/src/models/DirectRoom.ts`

저장 내용:

- 1대1 채팅방 UUID 문자열 `roomId`
- 참여 사용자 ObjectId 2개
- 방 활성 상태
- `createdAt`, `updatedAt`

참여자 두 명이 서로 다른 User인지 Mongoose 검증을 수행합니다. 방을 만들기 전에도 두 사용자의 최신 연령 그룹을 조회하여 정책을 통과한 경우에만 저장합니다.

### 3. DirectMessage

모델:

- `server/src/models/DirectMessage.ts`

저장 내용:

- 메시지 UUID `messageId`
- 채팅방 ID
- 보낸 사용자 ObjectId
- 메시지 내용
- 메시지 유형
- 실제 전송 시각
- `createdAt`, `updatedAt`

메시지는 최대 500자로 제한됩니다. DB 저장이 성공한 뒤에만 Socket.IO로 상대방에게 전송됩니다.

### 4. JointCampusRecommendation

모델:

- `server/src/models/JointCampusRecommendation.ts`

저장 내용:

- 추천을 요청한 1대1 채팅방 ID
- 요청자와 동행자 User ObjectId
- 사용한 프롬프트 버전
- 사용한 OpenAI 모델명
- 추천 입력 요약
  - 요청자와 동행자의 명시적 관심사
  - 요청자와 동행자의 임시 추론 관심사 ID
  - Kakao가 반환한 실제 후보 장소 ID 목록
- 검증이 끝난 추천 결과
  - 추천 제목
  - 공동 관심사 요약
  - 실제 사용한 명시·추론 관심사
  - 방문 순서와 장소별 추천 이유
  - 각 사용자에게 맞는 이유
  - 가상 체험 연결 설명
  - 지역경제 연결 설명
  - 대화 주제
  - 전체 예상 시간
  - 코스 콘셉트
  - 주의사항
- 처리 상태
- `createdAt`, `updatedAt`

여기에는 채팅 원문, 이메일, 생년월일, Kakao ID, 액세스 토큰, OpenAI API 키를 저장하지 않습니다.

### 5. AiPlaceRecommendation

모델:

- `server/src/models/AiPlaceRecommendation.ts`

단일 사용자 또는 선택적 동행자용 기존 세종 장소 추천 결과를 저장합니다.

저장 내용:

- 요청자와 선택적 동행자 User ObjectId
- 프롬프트 버전과 모델명
- 사용자 관심사·희망 활동·후보 장소 ID 요약
- 추천 제목과 사용자 요약
- 공동 관심사와 대화 주제
- 장소별 순서, 체류 시간, 추천 이유
- 가상 체험과 지역경제 연결 설명
- 전체 예상 시간과 코스 콘셉트
- 주의사항
- `createdAt`, `updatedAt`

### 6. CommunityPost

모델:

- `server/src/models/CommunityPost.ts`

기존 커뮤니티 기능에서 다음 항목을 저장합니다.

- 게시물 ID
- 작성자 표시값
- 제목과 본문
- 카테고리
- 좋아요 수와 좋아요 사용자 목록
- 댓글 작성자, 내용, 작성 시각
- 게시물 작성 시각

### 7. CampusFeaturePortal

모델:

- `server/src/models/CampusFeaturePortal.ts`

공동캠퍼스 기능 포털의 위치를 저장합니다.

- 포털 종류
- X/Z 좌표
- `createdAt`, `updatedAt`

### 8. WorldRespawnPosition

모델:

- `server/src/models/WorldRespawnPosition.ts`

월드 기본 재시작 위치를 저장합니다.

- 맵 ID
- X/Z 좌표
- 바라보는 방향
- `createdAt`, `updatedAt`

## 아직 DB에 저장되지 않는 기능

- 식물도감 진행 데이터
- 발견한 식물 목록
- 대표 식물
- 식물 성장 기록
- 프런트의 공동캠퍼스 추천 결과 표시 상태
- 메모리에서만 유지되는 일부 기존 게임 방 상태

식물도감은 현재 프런트 서비스 중심 구조이므로, 완전한 서버 동기화를 위해서는 별도의 식물도감 Mongoose 모델과 인증 기반 저장·조회 API가 추가로 필요합니다.

## 연령 계산

구현 파일:

- `server/src/services/age/ageClassificationService.ts`
- 이전 호출부 호환용: `server/src/services/users/agePolicy.ts`

기준 상수:

```ts
export const ADULT_AGE_THRESHOLD = 19;
```

정책:

- 정확히 만 19세가 된 시점부터 `adult`
- 만 19세 생일 전이면 `minor`
- 출생 연도 또는 생일 누락은 `unknown`
- 잘못된 형식, 존재하지 않는 날짜, 미래 출생일은 `unknown`
- 120년보다 오래된 비정상 출생 연도는 `unknown`
- 음력은 양력으로 임의 계산하지 않고 `unknown`
- `birthdayType`이 명확한 `SOLAR`인 경우에만 계산

카카오 로그인 시 매번 다시 계산하므로 기존 미성년자가 만 19세가 된 이후 로그인하면 `adult`로 갱신됩니다.

## 성인과 미성년자의 1대1 채팅 차단

공통 판정 함수:

- `server/src/services/age/ageClassificationService.ts`

```ts
canStartDirectChat(
  userA: { ageGroup: AgeGroup },
  userB: { ageGroup: AgeGroup }
): boolean
```

허용:

| 사용자 A | 사용자 B | 결과 |
|---|---|---|
| adult | adult | 허용 |
| minor | minor | 허용 |

차단:

| 사용자 A | 사용자 B | 결과 |
|---|---|---|
| adult | minor | 차단 |
| adult | unknown | 차단 |
| minor | unknown | 차단 |
| unknown | unknown | 차단 |

DB 조회와 정책 적용 파일:

- `server/src/services/chat/directChatPolicyService.ts`
- `server/src/socket/registerSocketHandlers.ts`

### 차단 시점

연령 검사는 프런트 버튼에만 의존하지 않습니다.

1. 1대1 채팅 요청 생성
2. 상대방의 요청 수락
3. 1대1 채팅방 생성 직전
4. Socket.IO 메시지 전송 직전
5. 공동캠퍼스 장소 추천 요청 직전

각 단계에서 클라이언트가 보낸 `ageGroup`을 사용하지 않고 MongoDB의 최신 User 문서를 다시 조회합니다. 기존 방이라도 사용자의 연령 그룹이 변경되거나 `unknown`이 되면 메시지 전송이 차단됩니다.

Socket 연결의 사용자 ID는 인증 미들웨어가 서명된 쿠키에서 설정한 `socket.data.userId`만 사용합니다.

차단 응답은 상대방의 구체적인 연령을 공개하지 않습니다.

```json
{
  "success": false,
  "error": {
    "code": "AGE_GROUP_CHAT_RESTRICTED",
    "message": "연령 그룹 정책에 따라 1대1 채팅을 이용할 수 없습니다."
  }
}
```

## 온보딩 API

### 온보딩 저장

```http
PUT /api/profile/onboarding
Content-Type: application/json
Cookie: auth_session=...
```

```json
{
  "displayName": "도형",
  "avatar": {
    "characterId": "character_01",
    "skinId": "skin_02",
    "hairId": "hair_03",
    "outfitId": "outfit_01",
    "accessoryIds": ["acc_glasses"]
  },
  "explicitInterests": ["plant", "festival", "photo", "cafe"]
}
```

검증 파일:

- `server/src/services/profile/profileSchemas.ts`

이 API는 body의 `userId`나 `kakaoId`를 받지 않습니다. 인증 쿠키에서 현재 User ID를 가져옵니다.

### 생년월일 별도 확인

```http
PUT /api/profile/birth-confirmation
```

```json
{
  "birthyear": "2005",
  "birthday": "0721",
  "birthdayType": "SOLAR",
  "consent": true
}
```

원본 생년월일은 응답하지 않고 다음 상태만 반환합니다.

```json
{
  "success": true,
  "data": {
    "ageGroup": "adult",
    "adultAt": "2024-07-21T00:00:00.000Z",
    "ageSource": "user_input"
  }
}
```

## 관심사 저장 정책

관심사 목록:

- `server/src/services/interests/interestCatalog.ts`

### 명시적 관심사

사용자가 온보딩에서 직접 선택한 관심사입니다.

- MongoDB User 문서에 저장
- 허용된 ID만 저장
- 중복 제거
- AI 추천에서 최우선 사용

### 대화 추론 관심사

대화에서 규칙 기반으로 추출한 임시 관심사입니다.

관련 파일:

- `server/src/services/interests/interestKeywordExtractor.ts`
- `server/src/services/interests/conversationInterestCache.ts`
- `server/src/services/interests/interestMergeService.ts`

정책:

- MongoDB User 프로필에 저장하지 않음
- localStorage에 저장하지 않음
- 채팅 원문을 캐시에 저장하지 않음
- `roomId + userId`를 캐시 키로 사용
- 기본 TTL 30분
- 최대 캐시 항목 수 제한
- 반복 언급 시 confidence 증가
- 명시적 관심사보다 낮은 우선순위로 사용
- 서버 재시작 시 삭제되어도 되는 임시 데이터

## 채팅방과 메시지 저장

Mongoose 모델:

- `server/src/models/DirectRoom.ts`
- `server/src/models/DirectMessage.ts`

Socket.IO 처리:

- `server/src/socket/registerSocketHandlers.ts`


## 공동캠퍼스 OpenAI 추천

API:

```http
POST /api/ai/joint-campus/recommendations
```

라우트:

- `server/src/routes/jointCampusRecommendations.ts`

서비스:

- `server/src/services/ai/jointCampusPlaceRecommendationService.ts`

저장 모델:

- `server/src/models/JointCampusRecommendation.ts`

OpenAI 클라이언트:

- `server/src/services/ai/openaiClient.ts`

Structured Output 스키마와 후처리 검증:

- `server/src/services/ai/schemas/jointCampusPlaceRecommendationSchema.ts`

## OpenAI 프롬프트를 작성한 파일

공동캠퍼스 두 사용자용 시스템 프롬프트는 다음 파일에 있습니다.

```text
server/src/services/ai/prompts/jointCampusPlaceRecommendationPrompt.ts
```

이 파일에는 다음 항목이 들어 있습니다.

- `JOINT_CAMPUS_PLACE_PROMPT_VERSION`
- `JOINT_CAMPUS_PLACE_RECOMMENDATION_SYSTEM_PROMPT`
- `buildJointCampusRecommendationInput`

프롬프트 버전:

```ts
export const JOINT_CAMPUS_PLACE_PROMPT_VERSION = "1.0.0";
```

프롬프트의 핵심 지침:

- `candidatePlaces` 안의 장소만 선택
- 존재하지 않는 장소를 만들지 않음
- 운영시간, 가격, 주소를 추측하지 않음
- 명시적 관심사를 추론 관심사보다 우선
- 두 사용자의 관심사를 균형 있게 반영
- 식물도감과 축제 체험 연결 이유 작성
- 지역 사업장 후보가 있으면 지역경제와 연결
- 생년월일, 이메일, 성별, 건강, 정치 성향 등을 언급하거나 추론하지 않음
- 채팅 원문을 인용하지 않음
- 장소 최대 4개
- 대화 주제 최대 3개
- 반드시 JSON Schema 형식으로 응답

기존 단일 사용자용 세종 장소 추천 프롬프트는 별도 파일에 있습니다.

```text
server/src/services/ai/prompts/sejongPlaceRecommendationPrompt.ts
```

관련 서비스와 스키마:

```text
server/src/services/ai/sejongPlaceRecommendationService.ts
server/src/services/ai/schemas/placeRecommendationSchema.ts
server/src/models/AiPlaceRecommendation.ts
server/src/routes/placeRecommendations.ts
```

## 공동 추천 처리 순서

```text
1. 인증 쿠키에서 requesterUserId 확인
2. DirectRoom DB에서 요청자의 멤버십 확인
3. 상대방 User ID 조회
4. 두 User의 최신 ageGroup 재검증
5. 두 User의 explicitInterests 조회
6. 서버 캐시에서 inferredInterests 조회
7. 명시적 관심사를 우선하여 관심사 병합
8. 기존 Kakao Place Provider로 실제 세종 후보 검색
9. 후보가 없으면 OpenAI를 호출하지 않고 오류 반환
10. 후보와 비식별 사용자 컨텍스트를 OpenAI에 전달
11. Structured Output 검증
12. 후보 외 ID, 중복, 순서, 장소 수, 관심사 출처 검증
13. totalEstimatedMinutes를 서버에서 재계산
14. 검증 성공 결과만 MongoDB 저장
15. recommendationId와 결과 반환
```

OpenAI에 전달하지 않는 정보:

- 이메일
- Kakao ID
- 출생 연도
- 생일
- 연령 그룹
- 카카오 액세스 토큰
- 채팅 원문

사용자 ID는 프롬프트 문자열을 만들 때 `사용자 A`, `사용자 B`로 대체합니다. OpenAI Responses 요청에는 `store: false`가 적용됩니다.

## 추천 요청 예시

```http
POST /api/ai/joint-campus/recommendations
Content-Type: application/json
Cookie: auth_session=...
```

```json
{
  "roomId": "direct-room-id",
  "constraints": {
    "availableMinutes": 180,
    "transportation": "public_transport",
    "budgetPerPerson": 30000,
    "preferredMood": ["조용한", "사진 찍기 좋은"],
    "avoidActivities": ["장시간 걷기"]
  }
}
```

응답 예시:

```json
{
  "success": true,
  "recommendationId": "mongodb-document-id",
  "data": {
    "recommendationTitle": "식물과 사진을 잇는 세종 나들이",
    "sharedInterestSummary": "두 사용자의 명시적 관심사를 우선 반영했습니다.",
    "usedExplicitInterests": ["plant", "photo"],
    "usedInferredInterests": ["cafe"],
    "route": [
      {
        "placeId": "kakao-place-id",
        "order": 1,
        "recommendedMinutes": 60,
        "reasonForRequester": "식물 관심사를 반영했습니다.",
        "reasonForCompanion": "사진 관심사를 반영했습니다.",
        "sharedReason": "자연을 살펴보며 사진을 찍기 좋은 장소입니다.",
        "experienceConnection": "식물도감 체험과 연결됩니다.",
        "localEconomyConnection": "세종 지역 상권 방문으로 이어질 수 있습니다."
      }
    ],
    "conversationStarters": [
      "가상 식물도감에서 가장 기억에 남은 식물을 이야기해 보세요."
    ],
    "totalEstimatedMinutes": 60,
    "routeConcept": "자연 체험과 지역 상권을 연결하는 코스",
    "cautions": [
      "방문 전 공식 채널에서 운영 정보를 확인하세요."
    ]
  }
}
```

## 테스트와 빌드

테스트 범위:

- 만 19세 경계 계산
- 누락된 출생 정보
- 미래 및 잘못된 날짜
- 음력 날짜 미계산
- 성인·미성년자·unknown 채팅 정책
- 관심 키워드 추출
- 원문 미저장
- 캐시 TTL과 최대 크기
- 후보 외 장소 차단
- 중복 장소 차단
- 잘못된 순서 차단
- 모델이 만든 임의 관심사 차단
- 빈 후보 입력 차단
- 민감 정보가 포함된 AI 입력 차단
- OpenAI API 키 누락 오류

## 아직 연결되지 않은 부분

- 공동캠퍼스 화면의 추천 버튼과 결과 UI는 아직 API에 직접 연결되지 않았습니다.
- `src/services/jointCampusRecommendations.ts`에 요청 함수만 준비돼 있습니다.
- 식물도감은 아직 완전한 MongoDB 모델/API로 이전되지 않았습니다.
- AI 입력의 `experienceRecords` 확장 구조는 있지만 실제 식물도감 DB 문서와 연결하는 작업이 남았습니다.
- 실제 Socket.IO 클라이언트를 실행하는 연령 우회 통합 테스트는 추가 보강이 필요합니다.
- 운영 환경의 관심사 캐시는 메모리 Map 대신 Redis 사용을 권장합니다.
- `DirectRoom.roomId`는 기존 프로젝트 구조를 유지하기 위해 MongoDB ObjectId가 아니라 UUID 문자열입니다.

