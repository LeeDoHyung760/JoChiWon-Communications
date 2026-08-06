# AI 기능 및 사용자 매칭 계산 구조 전수 조사

- 조사 기준: 2026-08-06 현재 로컬 작업 트리 (`main`, 조사 시작 시 추적 파일 변경 없음)
- 조사 범위: `src/`, `server/src/`, `shared/` 및 환경 설정/라우트 연결
- 수행 원칙: 기존 프롬프트·가중치·호출 코드는 변경하지 않았고, 이 보고서 외 파일은 수정하지 않았으며 push하지 않음

## 0. 결론 요약

1. 목표로 한 3개 AI 기능 중 **프로필 AI 성향 요약**과 **정부청사 AI 코스 추천**은 구현돼 있으나, 프로필 요약은 전체 5개 영역이 아니라 공연·먹거리·축제 경험 하네스만 입력한다. 정부 코스는 프로필 완성도 50%를 서버에서 검사하지 않는다.
2. **사람 매칭 결과의 AI 설명**은 하나의 통일된 구조가 아니다. 일반 매칭 점수 API는 서버의 Jaccard/MBTI 공식이 점수와 한 줄 이유를 모두 결정한다. 모집센터 충녕 AI는 서버가 계산한 후보·점수를 도구 결과로 받아 설명하지만, 일반 매칭 배지와 연결되지는 않는다.
3. OpenAI가 일반 사람 매칭 점수나 후보 순위를 직접 결정하는 코드는 확인되지 않았다. 모집센터 AI에도 서버 점수를 바꾸지 말라는 제약과 결과 검증이 있다. 단, 장소 추천 AI는 입력된 후보 중 순서와 설명을 고른다.
4. 현재 사람 매칭 공식은 요청한 6개 도메인 가중치 모델이 아니다. 경험 50/관심사 25/목적 15/MBTI 10(양쪽 경험 데이터가 없으면 관심사 65/목적 25/MBTI 10)이다.
5. 요청한 원본 프로필 영역 중 User DB의 명시적 필드는 `gardenNature`뿐이다. 공연·먹거리·축제는 `experienceHarness`, 동아리는 별도 `Club` 컬렉션 및 클라이언트 신호, 프로젝트는 주로 localStorage에 분산되어 있다. `festivalFood`, `arts`, `clubs`, `collaborationProjects`라는 통합 User 필드는 없다.
6. 레거시/별도 AI가 많이 남아 있다. 조치원/공동캠퍼스 장소 추천, 1:1 대화 장소 추천, 온실 분석·회고, 곰 생태 질의, 프로젝트 장소 아이디어, 모집센터 챗봇이 목표 3개 밖에 존재한다.

## 1. 현재 AI 코드 전수 조사

### 1.1 실제 모델 호출 및 프롬프트

| 파일 | 호출 기능 | 사용 프롬프트 요약 | 입력 데이터 | 출력 형식 | 현재 사용 여부 |
|---|---|---|---|---|---|
| `server/src/services/experience/experienceProfile.ts` | 경험 기반 프로필 성향 생성 | 서버 점수·근거만 사용하고 원본 로그 추정/점수 변경 금지 | performance/food/festival의 요약 scores·evidence·sessionSummary | 구조화 JSON: source/title/tags/traits/summary/evidence | 사용 중. 맵 종료 시 `/account/me/experience/map-exit`에서 생성·DB 저장 |
| `server/src/providers/ai/openAIConversationAnalysisProvider.ts` | 1:1 대화에서 합의 활동 추출 | experienceRecords 우선, 실제 상호명 생성 금지, 활동 enum 강제 | 두 참여자의 관심사·목적·장소범주·경험기록, 최근 메시지, 지역, 사용자 요청 | 구조화 대화 분석 JSON | 사용 중. `/direct-rooms/:id/recommendations` |
| 같은 파일의 두 번째 호출 | 후보 장소 추천 문구 | 제공한 place/placeId만 사용, 미확인 사실 금지 | 분석 결과와 서버가 찾은 후보 장소 | 구조화 추천 문구 JSON | 코드 존재. provider 경로에서 사용 |
| `server/src/services/ai/sejongPlaceRecommendationService.ts` + `prompts/sejongPlaceRecommendationPrompt.ts` | 세종/조치원 맞춤 방문 코스 | DB의 active 장소만 사용, routeOrder/총 시간 제약 | 요청 사용자 프로필·조건, 서버 장소 후보 | Responses API 구조화 JSON 코스 | 서버 route `/api/ai/place-recommendations` 활성. 클라이언트 직접 호출은 검색되지 않아 현재 UI 미연결 가능성이 큼 |
| `server/src/services/ai/jointCampusPlaceRecommendationService.ts` + `prompts/jointCampusPlaceRecommendationPrompt.ts` | 1:1 공동캠퍼스 동행 장소 추천 | Kakao 후보 placeId만 사용, 두 사람 공통/개별 취향 반영 | 두 사용자 명시·대화 추론 관심사, sharedKeywords, 후보 장소, 제약 | Responses API 구조화 JSON | 서버 route 활성. `src/services/jointCampusRecommendations.ts` 래퍼는 있으나 호출 컴포넌트가 검색되지 않아 UI 미연결 |
| `server/src/services/ai/governmentCourse.ts` | 정부청사 세종 코스 생성 | 입력 후보 ID만 사용, 선택 장소 우선, 실제 기록 기반 자연스러운 순서 | 허용 장소 최대 12, 선택 ID, 테마, 관심사·경험기록 각 최대 20, 채팅 활동 10, 시간/교통/활동 조건 | 구조화 JSON: title/summary/orderedPlaceIds/reasons | 사용 중. `GovernmentPlanningExperience`가 `/government/course` 호출 |
| `server/src/services/ai/greenhouseExperience.ts` | 온실 경험 종합 분석 | 수집 식물·감정·메모에 근거한 성향/대표 식물/추천 코스 | 온실 진행 데이터와 사용자 답변 | 구조화 `GreenhouseAnalysisResponse` | 사용 중. `greenhouseAi.ts` → `/greenhouse/analyze` |
| 같은 파일의 회고 호출 | 식물별 짧은 AI 회고 | 해당 식물과 사용자 감정/답변에 근거 | 식물, 감정, 질문 답변·메모 | 구조화 회고 JSON | 사용 중. `/greenhouse/reflection` |
| `server/src/services/ai/bearWildlife.ts` | 곰 생태 단서 질의응답 | 제공 단서/발견/판정에 근거해 답변 | 질문, clue, findings, verdict | JSON object `{answer}` | 사용 중. `bearWildlifeAi.ts` → `/bear-wildlife/ask` |
| `server/src/services/ai/projectRoomPlaceSuggestions.ts` | 프로젝트 활동 장소 아이디어 | 세종 및 인근 실제 장소 3~4개 제안 | 프로젝트 제목·요약·설명·태그·활동·기존 장소 | 구조화 JSON places[{name,reason,tags}] | 사용 중. `ProjectRoomInteractions` → `/project-room/place-suggestions` |
| `server/src/services/chungnyeong/chungnyeongHarness.ts` | 모집센터 AI 챗봇/사람·모집 매칭 안내 | 반드시 서버 tool 사용, 서버 matchScore 변경 금지, 근거 없는 카드 금지 | 사용자 메시지, 서버 조회 프로필/후보/모집글/요청 | Responses API 텍스트 + tool calls, 후처리된 카드 | 사용 중. `ChungnyeongConsole`/`chungnyeong.ts` → `/chungnyeong/chat` |

`server/src/services/ai/openaiClient.ts`는 공용 클라이언트 생성기이며 독립 프롬프트는 없다. 실제 호출 API는 `chat.completions.parse`, `chat.completions.create`, `responses.create`, `responses.parse`가 혼재한다.

### 1.2 중복·레거시·fallback 판단

- 장소 추천 목적이 최소 네 갈래로 중복된다: 일반 세종 코스, 공동캠퍼스 동행 장소, 1:1 대화 장소, 정부청사 코스. 프로젝트 장소 아이디어까지 포함하면 다섯 갈래다.
- 오래된 조치원 중심 로직이 남아 있다. `directRecommendations.ts`는 조치원 중심/역/전통시장/공원/대학가를 기본 구역으로 삼고, `sejongPlaceRecommendationPrompt.ts`도 범용 세종 장소 코스를 별도로 생성한다.
- 꽃 **전용 OpenAI 프롬프트**는 없다. 꽃 관심도는 `shared/flower-interest.ts`의 고정 가중치로 계산된다. 다만 온실 식물 회고/종합 분석 AI가 있어 넓은 의미의 식물 전용 AI는 존재한다.
- 축제먹거리 전용 OpenAI 프롬프트는 없다. 축제·먹거리 이벤트는 서버에서 점수화한 뒤 공통 경험 프로필 프롬프트로 들어간다.
- 기존 챗봇은 모집센터 `chungnyeongHarness.ts`로 남아 있고 실제 UI에서 호출된다. 곰 생태 질의 API도 목표 3개 밖의 분석 API로 실제 호출된다.
- UI 미연결 가능성이 확인된 AI route는 `/api/ai/place-recommendations`와 `/api/ai/joint-campus/recommendations`다. 후자는 클라이언트 서비스 래퍼만 있고 이를 부르는 컴포넌트가 없다.
- mock과 실제 OpenAI는 의도적으로 혼재한다. `AI_PROVIDER=mock`, `auto`에서 키 없음, provider 진단 실패 등에 fallback을 쓴다. 정부/온실/프로젝트/곰/경험 프로필도 각각 결정론 fallback이 있다.
- 주의: `experienceProfile.ts`는 키/모델 유무를 직접 검사하며 `AI_PROVIDER=mock`을 명시적으로 검사하지 않는다. 따라서 mock 모드라도 키와 모델이 있으면 이 경로만 OpenAI를 호출할 가능성이 있다.

## 2. 목표 AI 기능별 현재 연결 상태

### A. 사용자 프로필 AI 성향 요약

- 실제 생성 endpoint: `POST /api/account/me/experience/map-exit`. 조회는 `GET /api/account/me/experience/profile`.
- 호출부: `src/services/experienceHarness.ts`가 arts-center/food-experience/festival-experience 퇴장 시 이벤트 묶음을 전송한다. `AiSejongProfile.tsx`는 저장된 생성 결과를 읽어 표시한다.
- 입력: 세 영역의 **서버 요약 점수, 근거, 세션 요약**. 기본 가입 프로필, gardenNature, 동아리, 프로젝트는 이 AI 생성 입력에 포함되지 않는다.
- 저장: `User.experienceHarness.generatedProfile`에 저장하고, food/festival은 `profileFragments`에도 저장한다. 활동 기록은 최근 100개까지 저장한다.
- 재생성: 처리하지 않은 `sessionId`의 맵 종료마다 재생성한다. `processedSessionIds`로 중복 세션을 막는다. 즉 화면을 열 때마다 생성하는 방식은 아니다.
- 출력: 자유 텍스트가 아닌 구조화 JSON. 단 summary/title/tag 자체는 텍스트 필드다.
- 점수 결정권: 최종 `traits`와 `evidence`는 AI 출력 대신 결정론 결과로 덮어쓴다. AI는 최종 프로필 점수를 직접 결정하지 않는다.
- 별도로 `buildAiSejongProfile`/`buildProfileProgress`가 localStorage와 DB 동기화 자료를 조합해 클라이언트에서 “AI 종합 분석”처럼 보이는 결정론 문구·점수를 만든다. 실제 OpenAI 결과와 UI 계산 결과가 함께 표시되는 구조다.

### B. 사람 매칭 AI 설명

- 일반 월드/캠퍼스 매칭 후보는 접속 플레이어 목록이며, 각 상대 점수는 `POST /api/matching/score`의 서버 공식이 계산한다. AI가 후보나 순위를 정하지 않는다.
- 이 API의 이유 문구도 AI가 아니라 서버가 공통 경험/관심사/목적 상위 2개로 조립한다.
- 모집센터 검색은 `chungnyeongTools.searchPeople`이 MongoDB에서 후보를 거르고 고정 공식으로 점수화·정렬한다. AI는 tool 결과를 바탕으로 설명/카드를 작성한다.
- AI는 모집센터 matchScore를 변경하지 못하도록 prompt와 grounding 후처리 양쪽에서 제한된다.
- 모집센터 AI에 전달되는 개인정보는 요청자 프로필의 닉네임, 관심사, 이용 목적, 공개 설정, 채팅 가능 상태 및 검색된 후보의 공개 관심사/목적/상태 수준이다. 일반 매칭 계산 API는 두 클라이언트가 보낸 matchProfile 전체를 받지만 OpenAI로 전달하지 않는다.
- 1:1 장소 추천 AI에는 양쪽 닉네임, 관심사, 이용 목적, 선호 장소 범주, 경험 기록과 최근 대화가 전달된다. 이것은 사람 점수 매칭이 아니라 함께 갈 장소 추천이다.
- 현재 “사람 매칭 결과의 이유와 함께할 활동”을 하나의 표준 AI endpoint가 설명하는 구현은 없다.

### C. 정부청사 AI 맞춤형 세종 코스 추천

- endpoint: `POST /api/government/course`; UI: `GovernmentPlanningExperience.tsx`.
- 정부청사 맵/기획 UI에는 연결돼 있으나 **프로필 50% 해금 조건과 연결되지 않았다**. 컴포넌트는 선택 장소가 하나 이상이면 생성 요청을 허용한다.
- 프로필 완성도는 `buildProfileProgress`가 클라이언트에서 `방문 구역 비율×45 + 활동 기록 충족도×55`로 계산하지만, 정부 endpoint는 이 값도 사용자 ID도 받지 않으며 서버 검사도 하지 않는다.
- 입력 프로필 데이터: 기본 profile에서 빌드한 관심사·경험기록, 동행자 matchProfile의 관심사·경험기록, UI 선택 테마/장소, 최근 사용자 채팅, 일정·교통·식사·카페·체험 조건.
- 장소 환각 방지: AI에는 컴포넌트의 12개 고정 후보만 전달되고, 서버가 반환 ID를 allowlist로 다시 필터링한다. 선택 장소 누락 시 서버가 뒤에 보완한다. 따라서 최종 코스에 임의 장소 ID가 들어가지는 않는다.
- 출력: 구조화 JSON이며 장소 순서(`orderedPlaceIds`)와 장소별 이유가 있다. 서버가 시간표가 포함된 `GovernmentCourse.items`로 변환한다.
- 보안/일관성 주의: route 자체는 인증 middleware가 없고 요청 body의 프로필 자료를 신뢰한다. 50% 조건을 서버에서 보장할 수 없는 구조다.

## 3. 장소별 프로필 원본 데이터

| 영역 | 실제 저장 필드 | 데이터 수집 장소 | 현재 프로필 반영 여부 |
|---|---|---|---|
| `festivalFood` | 동일 이름 필드 없음. `experienceHarness.festival.{scores,evidence}`, `.food.{scores,evidence,sessionSummary}`, `profileFragments`, `activityRecords`; 일부 호수공원 관심은 localStorage | festival-experience, food-experience, 호수공원 축제/먹거리 UI | AI 경험 프로필과 클라이언트 종합 프로필에는 반영. 사람 매칭의 독립 도메인으로는 미반영 |
| `gardenNature` | `User.profile.gardenNature.flowerInterests[]` 및 비선택 `processedEventIds`; 온실 전체 경험은 별도 localStorage | garden 꽃 정보/근접 추적, 온실 수집·회고 | 꽃 관심 API/Top 정렬에 반영. 일반 사람 매칭에는 미반영 |
| `arts` | 동일 이름 필드 없음. `experienceHarness.performance.{scores,evidence}` 및 activityRecords | arts-center 포스터/영상/객석/즐겨찾기 | 경험 프로필·클라이언트 문화 점수에 반영. 독립 매칭 도메인 아님 |
| `clubs` | User 필드 없음. 별도 `Club` 문서: category/tags/activity/members/role 등; 클라이언트 `campusProfileSignals` localStorage | club-street-festival, CampusCommunicationHub/ClubRoom | 클라이언트 프로필 relation/culture 등에 일부 반영. 사람 매칭 공식에는 미반영 |
| `collaborationProjects` | User 필드 없음. 프로젝트·지원서는 `sejong-project-room-*-v1` localStorage 중심; Project에 tags/activityTypes/preferredTraits/memberIds, 지원서에 profileSnapshot | project-room | 활동 기록/프로젝트 추천에는 반영. 서버 User 통합 프로필 및 사람 매칭에는 미반영 |

### 세부 이벤트 확인

- 장소 방문 횟수: `recordProfileVisit`는 mapId별 최초 1회만 저장하므로 실제 횟수를 보존하지 않는다. 꽃 `nearbyVisitCount`와 음식/축제 세부 이벤트에는 반복 횟수가 있다.
- 체류 시간: 공연 watch/browse/sit, 음식 dwell/card active duration, 축제 상세 duration, 꽃 정보/근접 초를 저장한다.
- 재방문 횟수: 꽃 `revisitCount`, 음식 `revisit`/`food_reopen`이 있다. 일반 장소/프로필 구역 재방문 수는 없다.
- 상호작용 횟수: 경험 이벤트와 꽃 count로 영역별 저장되지만, 전 영역 공통 표준 필드는 없다.
- 비활성 시간: 꽃 tracker는 `visibilitychange` 때 열린 구간을 닫아 숨김 시간 누적을 줄인다. 반면 공통 경험 하네스는 `Date.now()` 구간을 사용하고 visibility/idle 제외 처리가 검색되지 않아 비활성 시간이 포함될 수 있다. 음식의 `activeDurationSec`는 UI가 제공하지만 전 영역 공통 idle 정책은 아니다.
- 꽃 Top 5: `flowerInterestProfile.ts`/꽃 관심 응답이 `interestScore` 순으로 활용한다. 점수는 정보 열기 3, 정보 1초 0.5, 근접 진입 1, 근접 1초 0.2, 재방문 2의 합이다.
- 꽃말: 꽃 카탈로그/GLB 메타데이터 표시에는 있으나 `FlowerInterestRecord`와 User DB에는 저장하지 않는다. AI/매칭 입력에도 직접 포함되지 않는다.
- 축제 유형: festival event의 `categories`, section/filter/save 및 집계 scores/evidence로 수집한다.
- 음식 유형: truck(local/street/dessert), itemType, categories, tags, section, 검색/저장/재열기 등으로 수집한다.
- 예술 장르: performanceId를 서버 장르 맵으로 변환해 점수·근거로 저장한다.
- 동아리 분야: Club `category`, `tags`, `activity`에 존재한다.
- 프로젝트 관심 분야: Project `tags`, `activityTypes`, `placeIds`, `preferredTraits`에 존재한다.
- 희망 역할: 통합 User 필드는 없다. 프로젝트 추천이 신호를 보고 `recommendedRole`을 즉석 생성하고, 지원서 `profileSnapshot`에는 소개/스타일이 저장된다.
- 협업 성향: `preferredTraits`, 기본 usagePurposes/MBTI, 프로젝트 snapshot의 style 표현으로 흩어져 있으며 정규화된 DB 필드는 없다.

AI에는 원본 이벤트 로그를 그대로 보내지 않는다. 경험 프로필 AI에는 서버가 `scoreMapExit`으로 만든 점수·근거·세션 요약을 보낸다. 정부 코스에는 클라이언트가 조합한 관심사/경험기록 문자열을 보낸다. 단, 온실/곰 AI는 해당 기능의 사용자 답변·메모·단서 같은 비교적 원본에 가까운 자료를 보낸다. 프로젝트 전체에 하나의 서버 통합 프로필을 생성해 모든 AI가 공유하는 구조는 아니다.

## 4. 사람 매칭 계산 전수 조사

### 4.1 일반 매칭 공식 (`calculateMatchScore.ts`)

양쪽 모두 `experienceRecords`가 있을 때:

| 계산 요소 | 현재 가중치 | 계산 방식 | 최대 기여 점수 |
|---|---:|---|---:|
| 경험 기록 유사도 | 50% | 문자열 집합 Jaccard × 100 | 50 |
| 관심사 유사도 | 25% | 문자열 집합 Jaccard × 100 | 25 |
| 이용/모임 목적 유사도 | 15% | usagePurposes, 없으면 meetingPurposes의 Jaccard | 15 |
| MBTI | 10% | 같은 차원 수 0~4를 35/50/70/85/100으로 매핑; 유효하지 않으면 50 | 10 |

둘 중 하나라도 경험 기록이 없을 때:

| 계산 요소 | 현재 가중치 | 계산 방식 | 최대 기여 점수 |
|---|---:|---|---:|
| 관심사 유사도 | 65% | Jaccard | 65 |
| 이용/모임 목적 유사도 | 25% | Jaccard | 25 |
| MBTI | 10% | 위와 동일 | 10 |
| 경험 기록 | 0% | 계산값은 반환하지만 총점에서 제외 | 0 |

### 4.2 요청한 세부 요소의 실제 반영

| 요청 요소 | 현재 상태 |
|---|---|
| 축제먹거리 유사도 | 독립 계산 없음. 두 사용자 `interests`/`experienceRecords` 문자열이 우연히 같을 때만 간접 반영 |
| 자연꽃 취향 유사도 | `gardenNature.flowerInterests`를 읽지 않음. 간접 문자열만 가능 |
| 예술 취향 유사도 | performance 점수/장르를 직접 읽지 않음. 간접 문자열만 가능 |
| 동아리 관심 유사도 | Club 가입/category/tags를 읽지 않음 |
| 프로젝트 관심 분야 유사도 | 프로젝트/지원서 데이터를 읽지 않음 |
| 프로젝트 역할 보완도 | 없음 |
| 협업 방식 유사/보완도 | 없음 |
| 선호 모임 규모 | 필드와 계산 없음 |
| 장소 행동 데이터 | `experienceRecords` 문자열 집합만 50%로 사용. 방문 횟수·체류·재방문 강도는 직접 사용하지 않음 |

### 4.3 필수 확인사항 답변

1. 전체 점수는 입력 하위 점수 0~100의 가중합을 반올림하므로 결과적으로 0~100이다.
2. 선택되는 두 공식 모두 가중치 합은 100이다.
3. 빈 배열은 Jaccard 0점이다. MBTI가 없거나 잘못되면 중립 50점이다.
4. 경험 영역만 특별 취급한다. 양쪽 중 한쪽이라도 없으면 경험 50을 제거하고 관심 25→65, 목적 15→25로 재배분한다. 다른 빈 영역은 재배분하지 않는다.
5. 일반 점수/후보 순위에 AI는 개입하지 않는다. 모집센터에서도 서버가 후보·점수·순위를 정하고 AI는 설명한다.
6. 일반 점수 API는 순위를 만들지 않아 동점 규칙이 없다. 모집센터는 점수 내림차순만 있고 2차 키가 없어 동점은 DB 반환 순서에 의존한다.
7. 일반 매칭과 모집센터 검색 모두 최소 프로필 완성도 조건이 없다.
8. 모집센터는 `_id != userId`로 자기 자신을 제외한다. 일반 `/matching/score`는 임의 두 프로필을 계산할 뿐 자기 자신 검사가 없다. 접속자 UI에서는 상대 플레이어를 대상으로 호출한다.
9. 이미 같은 프로젝트인 사용자를 제외하는 로직은 없다.
10. 모집센터는 `recordVisibility != private`만 제외하고 `chatEnabled`/availability 조건을 일부 적용한다. 별도 차단 목록 검사는 없다. 반면 1:1 **장소 추천** route는 roomStore 차단 관계를 검사하지만 사람 후보 매칭과는 별개다.

### 4.4 별도 “AI 적합도” 표기의 비-AI 계산

- `projectRoomProjects.ts`의 프로젝트 추천은 기본 58점에 공통 관심 최대 24점 및 키워드 정규식 보너스(사진/기록 9, 축제/공연/야간 10, 자연 10, 시장/먹거리/문화 8)를 더해 최대 98로 정렬한다. OpenAI 호출이 아니지만 UI에서 AI 적합도로 표현된다.
- 모집센터 fallback UI도 접속자 공통 관심 수와 배열 index로 95 이하 점수를 만든다. 서버 일반 매칭 공식과 다른 점수 체계다.
- 따라서 현재 화면의 “매칭/AI 적합도”는 단일한 계산 정의가 아니다.

## 5. 권장 최종 가중치와 비교 (수정 없음)

| 권장 도메인 | 권장 가중치 | 현재 직접 가중치 | 차이 |
|---|---:|---:|---|
| festivalFood | 15 | 0 | 독립 프로필/유사도 없음 |
| gardenNature | 15 | 0 | DB 원본은 있으나 matcher 미사용 |
| arts | 15 | 0 | 경험 하네스는 있으나 matcher 미사용 |
| clubs | 20 | 0 | 별도 Club 데이터와 matcher 미연결 |
| collaborationProjects | 30 | 0 | 관심·역할·협업 보완 공식 없음 |
| placeBehavior | 5 | 명목상 experienceRecords 50 | 현재는 행동 강도 대신 문자열 Jaccard이며 범위·의미가 권장안과 다름 |

권장안 합은 100이다. 현재 공식도 합은 100이지만 도메인 의미가 전혀 다르므로 숫자만 치환할 수 없다. 먼저 다섯 영역의 정규화 타입, 누락값 정책, 역할 보완도, 행동 집계 DTO를 정의하고 서버 통합 프로필을 만든 뒤 비교 가능한 상태로 만드는 작업이 필요하다.

## 6. 최종 3개 기능으로 통일할 때의 정리 우선순위 (이번 조사에서는 미수정)

1. 서버에 5개 영역 + placeBehavior의 읽기 전용 통합 프로필 DTO를 정의하고 현재 분산 저장소에서 어떻게 채울지 결정한다.
2. 일반 사람 매칭의 단일 권위 계산기를 정하고, 프로젝트 추천/모집센터 fallback/일반 배지의 서로 다른 “AI 적합도” 명칭과 점수를 구분한다.
3. AI 사람 설명은 서버 계산 결과와 공개 가능한 요약만 받아 이유·함께할 활동만 작성하도록 하고, 점수/순위 필드는 서버 값으로 강제 덮어쓴다.
4. 정부 코스 endpoint에 인증과 서버 측 50% 완성도 검사를 붙일 설계를 확정한다. 현재 클라이언트 완성도는 localStorage 의존이라 서버가 신뢰할 수 없다.
5. 통합 후 목표 밖 AI(온실, 곰, 프로젝트 장소, 범용/공동캠퍼스/조치원 추천, 모집센터 챗봇)의 유지·흡수·폐기 여부를 호출 그래프 기준으로 결정한다. 이번 단계에서는 어떤 프롬프트도 삭제하지 않았다.

## 7. 핵심 근거 파일

- AI 환경/fallback: `server/src/config/env.ts`, `server/src/providers/providerFactory.ts`
- 프로필 생성/저장: `server/src/services/experience/experienceProfile.ts`, `server/src/routes/account.ts`, `server/src/models/User.ts`
- 일반 매칭: `server/src/services/matching/calculateMatchScore.ts`, `similarity.ts`, `mbtiScore.ts`, `server/src/routes/api.ts`
- 모집센터 매칭: `server/src/services/chungnyeong/chungnyeongTools.ts`, `chungnyeongHarness.ts`
- 정부 코스: `server/src/services/ai/governmentCourse.ts`, `src/components/GovernmentPlanningExperience.tsx`
- 프로필 완성도/클라이언트 통합: `src/services/profileProgress.ts`, `src/services/aiSejongProfile.ts`
- 꽃 행동: `shared/flower-interest.ts`, `src/services/flowerInterestTracker.ts`, `server/src/services/flowerInterestService.ts`
- 공연/먹거리/축제: `server/src/services/experience/experienceHarness.ts`, `src/services/experienceHarness.ts`
- 동아리/프로젝트: `server/src/models/Club.ts`, `src/services/campusProfileSignals.ts`, `src/services/projectRoomProjects.ts`
