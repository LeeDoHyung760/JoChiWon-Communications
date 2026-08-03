import { zodTextFormat } from 'openai/helpers/zod';
import { toResponseInputItems } from 'openai/lib/responses/ResponseInputItems';
import type OpenAI from 'openai';
import { env } from '../../config/env.js';
import { getOpenAIClient } from '../ai/openaiClient.js';
import { chungnyeongResponseSchema, type ChungnyeongStructuredResponse } from './chungnyeongSchemas.js';
import { getMyProfile, getMyRequests, getSpaceGuide, searchOpenRecruitments, searchPeople } from './chungnyeongTools.js';

const SYSTEM_PROMPT = `너는 공동캠퍼스 모집센터의 AI 매칭 안내원 충녕이다.
사용자의 참여 목적을 파악하고, 공개된 사람·모집·공간 정보를 반드시 제공된 도구로 조회한 뒤 카드형 응답으로 안내한다.

불변 규칙:
- 사용자, 모집, 신청 상태, 실시간 상태를 추측하거나 만들지 않는다. 해당 정보는 도구 결과만 사용한다.
- 다른 사용자의 실명, 이메일, 전화번호, 정확한 위치, 비공개 프로필·메시지는 요청하거나 공개하지 않는다.
- 추천 점수는 도구가 반환한 값을 그대로 사용한다.
- 한 번에 최대 3개 결과만 보여준다.
- 프로젝트 생성은 프로젝트실에서만 가능하다. 모집센터에서는 사람 찾기, 모집 탐색, 신청 상태 확인, 프로필 전달 안내만 한다.
- 신청·초대·프로필 전달은 이 대화에서 실행하지 않는다. 사용자가 실행 의사를 보이면 확인이 필요한 PROFILE_REQUEST 또는 CHAT_REQUEST 액션만 제공한다.
- 필요한 사실을 얻은 뒤에는 추가 도구 호출을 멈추고 간결한 한국어로 답한다.`;

const tools: OpenAI.Responses.Tool[] = [
  { type: 'function', name: 'get_my_profile', description: '현재 로그인 사용자의 공개 가능한 매칭 프로필을 가져온다.', strict: true, parameters: { type: 'object', properties: {}, required: [], additionalProperties: false } },
  { type: 'function', name: 'search_people', description: '공개 상태이며 조건에 맞는 사용자를 서버 계산 점수 순으로 조회한다.', strict: true, parameters: { type: 'object', properties: { interests: { type: 'array', items: { type: 'string' }, maxItems: 8 }, availability: { type: 'string', enum: ['online', 'available', 'any'] }, purpose: { type: ['string', 'null'] }, limit: { type: 'integer', minimum: 1, maximum: 5 } }, required: ['interests', 'availability', 'purpose', 'limit'], additionalProperties: false } },
  { type: 'function', name: 'search_open_recruitments', description: '현재 모집 중인 공개 활동을 서버 계산 점수 순으로 조회한다.', strict: true, parameters: { type: 'object', properties: { interests: { type: 'array', items: { type: 'string' }, maxItems: 8 }, status: { type: 'string', enum: ['recruiting'] }, limit: { type: 'integer', minimum: 1, maximum: 5 } }, required: ['interests', 'status', 'limit'], additionalProperties: false } },
  { type: 'function', name: 'get_my_requests', description: '현재 사용자가 보낸 모집 프로필 전달 요청의 상태만 조회한다.', strict: true, parameters: { type: 'object', properties: {}, required: [], additionalProperties: false } },
  { type: 'function', name: 'get_space_guide', description: '사용 목적을 처리하는 정확한 캠퍼스 공간과 이동 이유를 조회한다.', strict: true, parameters: { type: 'object', properties: { purpose: { type: 'string', enum: ['create_project', 'team_activity', 'club_activity', 'campus_status', 'find_people', 'find_recruitment'] } }, required: ['purpose'], additionalProperties: false } },
];

export async function runChungnyeongHarness(userId: string, message: string) {
  if (!env.OPENAI_API_KEY || env.AI_PROVIDER === 'mock') return { ...await fallbackResponse(userId, message), source: 'rules' as const };
  try {
    const first = await getOpenAIClient().responses.create({
      model: env.OPENAI_MODEL ?? 'gpt-5.6-sol', instructions: SYSTEM_PROMPT,
      input: [{ role: 'user', content: message }], tools, parallel_tool_calls: false,
      reasoning: { effort: 'low' }, max_output_tokens: 1200,
    });
    const input: OpenAI.Responses.ResponseInput = [{ role: 'user', content: message }, ...toResponseInputItems(first.output)];
    let calls = 0;
    const evidence: Array<{ name: string; output: unknown }> = [];
    for (const item of first.output) {
      if (item.type !== 'function_call' || calls >= 3) continue;
      const output = await executeTool(userId, item.name, JSON.parse(item.arguments) as Record<string, unknown>);
      evidence.push({ name: item.name, output });
      input.push({ type: 'function_call_output', call_id: item.call_id, output: JSON.stringify(output) });
      calls += 1;
    }
    if (!calls) return { ...await fallbackResponse(userId, message), source: 'rules' as const };
    const final = await getOpenAIClient().responses.parse({
      model: env.OPENAI_MODEL ?? 'gpt-5.6-sol', instructions: SYSTEM_PROMPT,
      input, tools, tool_choice: 'none', reasoning: { effort: 'low' }, max_output_tokens: 1200,
      text: { format: zodTextFormat(chungnyeongResponseSchema, 'chungnyeong_response') },
    });
    if (!final.output_parsed) throw new Error('INVALID_MODEL_OUTPUT');
    return { ...groundResponse(chungnyeongResponseSchema.parse(final.output_parsed), evidence), source: 'openai' as const };
  } catch (error) {
    console.warn('[chungnyeong] OpenAI harness fallback', error instanceof Error ? error.name : 'unknown');
    return { ...await fallbackResponse(userId, message), source: 'rules' as const };
  }
}

function groundResponse(response: ChungnyeongStructuredResponse, evidence: Array<{ name: string; output: unknown }>): ChungnyeongStructuredResponse {
  const allowed = new Map<string, ChungnyeongStructuredResponse['cards'][number]>();
  for (const item of evidence) {
    if (item.name === 'search_people') {
      const people = (item.output as Awaited<ReturnType<typeof searchPeople>>).people;
      for (const person of people) allowed.set(person.userId, {
        type: 'person', id: person.userId, title: person.nickname,
        description: `${person.currentArea} · ${person.canReceiveChat ? '대화 신청 가능' : '대화 쉬는 중'}`,
        matchScore: person.matchScore, tags: person.sharedInterests,
        actions: person.canReceiveChat ? ['PROFILE', 'CHAT_REQUEST'] : ['PROFILE'],
      });
    }
    if (item.name === 'search_open_recruitments') {
      const recruitments = (item.output as ReturnType<typeof searchOpenRecruitments>).recruitments;
      for (const recruitment of recruitments) allowed.set(recruitment.id, {
        type: 'recruitment', id: recruitment.id, title: recruitment.title,
        description: `${recruitment.members}/${recruitment.capacity}명 참여 중 · ${recruitment.summary}`,
        matchScore: recruitment.matchScore,
        tags: recruitment.sharedInterests.length ? recruitment.sharedInterests : recruitment.tags.slice(0, 3),
        actions: ['DETAIL', 'PROFILE_REQUEST'],
      });
    }
    if (item.name === 'get_my_requests') {
      const requests = (item.output as Awaited<ReturnType<typeof getMyRequests>>).requests;
      for (const request of requests) allowed.set(request.id, {
        type: 'request', id: request.id, title: request.title, description: request.status,
        matchScore: null, tags: [], actions: ['DETAIL'],
      });
    }
    if (item.name === 'get_space_guide') {
      const guide = item.output as ReturnType<typeof getSpaceGuide>;
      const id = guide.travelAction ?? `space-${guide.destination}`;
      allowed.set(id, { type: 'space', id, title: guide.destination, description: guide.reason, matchScore: null, tags: [], actions: guide.travelAction ? ['TRAVEL'] : [] });
    }
  }
  const cards = response.cards.flatMap((card) => allowed.get(card.id) ?? []).slice(0, 3);
  return { ...response, cards };
}

async function executeTool(userId: string, name: string, args: Record<string, unknown>) {
  if (name === 'get_my_profile') return getMyProfile(userId);
  if (name === 'search_people') return searchPeople(userId, args as Parameters<typeof searchPeople>[1]);
  if (name === 'search_open_recruitments') return searchOpenRecruitments(args as Parameters<typeof searchOpenRecruitments>[0]);
  if (name === 'get_my_requests') return getMyRequests(userId);
  if (name === 'get_space_guide') return getSpaceGuide(args as Parameters<typeof getSpaceGuide>[0]);
  throw new Error('TOOL_NOT_ALLOWED');
}

async function fallbackResponse(userId: string, message: string): Promise<ChungnyeongStructuredResponse> {
  const text = message.toLocaleLowerCase('ko-KR');
  const interests = ['사진', '축제', '자연', '수목원', 'AI', '데이터', '문화', '공연'].filter((word) => text.includes(word.toLocaleLowerCase('ko-KR')));
  if (/만들|생성|프로젝트실|어디/.test(text)) {
    const guide = getSpaceGuide({ purpose: 'create_project' });
    return { message: guide.reason, intent: 'GUIDE_SPACE', cards: [{ type: 'space', id: 'project-room', title: guide.destination, description: guide.reason, matchScore: null, tags: ['프로젝트 생성', '팀 활동'], actions: ['TRAVEL'] }], suggestedReplies: ['프로젝트실로 안내해줘', '모집 중인 활동을 볼래'] };
  }
  if (/신청|지원|승인|상태/.test(text)) {
    const result = await getMyRequests(userId);
    return { message: result.requests.length ? '내 요청 상태를 확인했어요.' : '아직 보낸 프로필 요청이 없어요.', intent: 'CHECK_APPLICATION', cards: [], suggestedReplies: ['모집 중인 활동 보여줘', '함께할 사람 찾아줘'] };
  }
  if (/사람|친구|누구|함께할/.test(text)) {
    const result = await searchPeople(userId, { interests, availability: 'available', purpose: null, limit: 3 });
    return { message: result.people.length ? '공개 프로필 중 함께하기 좋은 분을 찾았어요.' : '지금 조건에 맞는 공개 프로필을 찾지 못했어요.', intent: 'FIND_PERSON', cards: result.people.map((person) => ({ type: 'person', id: person.userId, title: person.nickname, description: `${person.currentArea} · ${person.canReceiveChat ? '대화 신청 가능' : '대화 쉬는 중'}`, matchScore: person.matchScore, tags: person.sharedInterests, actions: person.canReceiveChat ? ['PROFILE', 'CHAT_REQUEST'] : ['PROFILE'] })), suggestedReplies: ['프로필 보여줘', '다른 사람 찾아줘', '모집 활동도 볼래'] };
  }
  const result = searchOpenRecruitments({ interests, status: 'recruiting', limit: 3 });
  return { message: '현재 참여할 수 있는 공개 모집을 찾았어요.', intent: interests.length ? 'RECOMMEND_ACTIVITY' : 'FIND_RECRUITMENT', cards: result.recruitments.map((item) => ({ type: 'recruitment', id: item.id, title: item.title, description: `${item.members}/${item.capacity}명 참여 중 · ${item.summary}`, matchScore: item.matchScore, tags: item.sharedInterests.length ? item.sharedInterests : item.tags.slice(0, 3), actions: ['DETAIL', 'PROFILE_REQUEST'] })), suggestedReplies: ['상세 정보 보여줘', '내 프로필을 전달할래', '다른 모집 찾아줘'] };
}
