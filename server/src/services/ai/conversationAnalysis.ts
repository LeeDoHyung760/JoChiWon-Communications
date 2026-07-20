import type { ConversationAnalysis, ConversationMessage, RecommendationUser } from '../../types/recommendation.js';
import { normalizeValues } from '../matching/similarity.js';

const categoryTerms: Record<string,string[]> = { 카페:['카페','커피','디저트','빵'], 음식점:['맛집','밥','식사','먹'], 공원:['산책','공원','걷'], 문화시설:['전시','공연','문화','독서','책'], 관광명소:['여행','사진','구경'] };
const moodTerms: Record<string,string[]> = { 조용함:['조용','차분','독서','스터디'], '대화하기 좋음':['대화','이야기','친구','수다'], 활기참:['활기','시장','공연'], 여유로움:['산책','여유','걷'] };

export function ruleBasedAnalysis(users: RecommendationUser[], messages: ConversationMessage[], areaName = '조치원'): ConversationAnalysis {
  const safeMessages = messages.slice(-20).map(item => item.message.slice(0, 500));
  const text = safeMessages.join(' ');
  const interests = users.map(user => normalizeValues(user.interests));
  const sharedInterests = interests.length > 1 ? interests[0].filter(value => interests.slice(1).every(list => list.includes(value))) : (interests[0] ?? []);
  const categoryScores = Object.entries(categoryTerms).map(([category, terms]) => ({category, score:terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0) + (sharedInterests.some(value => terms.some(term => value.includes(term))) ? 2 : 0)}));
  const placeCategories = categoryScores.filter(item => item.score > 0).sort((a,b)=>b.score-a.score).slice(0,2).map(item=>item.category);
  if (!placeCategories.length) placeCategories.push(...normalizeValues(users.flatMap(user=>user.preferredPlaceCategories)).slice(0,2));
  if (!placeCategories.length) placeCategories.push('카페');
  const preferredMood = Object.entries(moodTerms).filter(([,terms])=>terms.some(term=>text.includes(term))).map(([mood])=>mood).slice(0,2);
  if (!preferredMood.length) preferredMood.push('대화하기 좋음');
  const purposes = normalizeValues(users.flatMap(user=>user.usagePurposes ?? user.meetingPurposes ?? []));
  const meetingIntent = purposes[0] ?? (text.includes('공부') ? '함께 공부하기' : '가볍게 대화하기');
  return {sharedInterests,preferredMood,placeCategories,meetingIntent,searchKeywords:placeCategories.slice(0,2).map(category=>`${areaName} ${preferredMood[0]} ${category}`)};
}

function isAnalysis(value: unknown): value is ConversationAnalysis {
  if (!value || typeof value !== 'object') return false;
  const item=value as Record<string,unknown>;
  return ['sharedInterests','preferredMood','placeCategories','searchKeywords'].every(key=>Array.isArray(item[key])&&(item[key] as unknown[]).every(v=>typeof v==='string')) && typeof item.meetingIntent==='string';
}

export async function analyzeConversation(users: RecommendationUser[], messages: ConversationMessage[], mapId: string, areaName: string): Promise<ConversationAnalysis> {
  const fallback=ruleBasedAnalysis(users,messages,areaName);
  if (process.env.AI_PROVIDER!=='openai'||!process.env.OPENAI_API_KEY) return fallback;
  const safeUsers=users.map(({nickname,mbti,interests,usagePurposes,meetingPurposes,preferredPlaceCategories})=>({nickname,mbti,interests,usagePurposes:usagePurposes??meetingPurposes,preferredPlaceCategories}));
  const safeMessages=messages.slice(-20).map(({nickname,message})=>({nickname,message:message.slice(0,500)}));
  try {
    const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL??'gpt-4o-mini',response_format:{type:'json_object'},temperature:0.2,messages:[{role:'system',content:'당신은 조치원 장소 검색 의도 분석기입니다. 실제 장소명은 절대 생성하지 말고 카테고리와 검색 키워드만 만드세요. JSON 키는 sharedInterests, preferredMood, placeCategories, meetingIntent, searchKeywords만 사용하세요.'},{role:'user',content:JSON.stringify({users:safeUsers,messages:safeMessages,mapId,areaName})}]})});
    if(!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
    const data=await response.json() as {choices?:Array<{message?:{content?:string}}>};
    const parsed=JSON.parse(data.choices?.[0]?.message?.content??'null') as unknown;
    return isAnalysis(parsed)?parsed:fallback;
  } catch(error) { console.warn('Conversation analysis fallback:',error instanceof Error?error.message:'unknown error'); return fallback; }
}
