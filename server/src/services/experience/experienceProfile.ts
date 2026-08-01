import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { env } from '../../config/env.js';
import { getOpenAIClient } from '../ai/openaiClient.js';
import type { ExperienceSummary } from './experienceHarness.js';

export const generatedProfileSchema=z.object({tags:z.array(z.string().trim().min(1).max(30)).length(3),summary:z.string().trim().min(1).max(180)}).strict();
export type GeneratedExperienceProfile=z.infer<typeof generatedProfileSchema>;
export type SummaryBundle={performance?:ExperienceSummary;food?:ExperienceSummary;festival?:ExperienceSummary};

const scoreObject=(scores:ExperienceSummary['scores']|Map<string,number>|undefined):Record<string,number>=>scores instanceof Map?Object.fromEntries(scores):scores??{};

export function compactProfileInput(data:SummaryBundle){
  const section=(value:ExperienceSummary|undefined)=>value?{...scoreObject(value.scores),evidence:value.evidence}:undefined;
  return {performance:section(data.performance),food:section(data.food),festival:section(data.festival)};
}

function fallback(data:SummaryBundle):GeneratedExperienceProfile{
  const p=scoreObject(data.performance?.scores),f=scoreObject(data.food?.scores),v=scoreObject(data.festival?.scores);
  const genreLabels:Record<string,string>={musical:'뮤지컬 선호',play:'연극 선호',jazz:'재즈 선호',traditional:'전통공연 선호',classical:'클래식 선호'};
  const favoriteGenre=Object.keys(genreLabels).sort((a,b)=>(p[b]??0)-(p[a]??0))[0];
  const performance=favoriteGenre&&(p[favoriteGenre]??0)>0?genreLabels[favoriteGenre]:(p.immersion??0)>=(p.culture??0)?'공연 몰입형':'문화예술 감상형';
  const food=(f.local??0)>=(f.street??0)&&(f.local??0)>=(f.dessert??0)?'지역 특산물 탐험가':(f.street??0)>=(f.dessert??0)?'야시장 탐색가':'감성 디저트 수집가';
  const festival=(v.participation??0)>=(v.exploration??0)?'축제 참여형':'축제 탐험형';
  return {tags:[performance,food,festival],summary:'문화공연과 세종의 먹거리, 다양한 축제 현장 체험을 자신만의 방식으로 탐색하는 사용자입니다.'};
}

export async function generateExperienceProfile(data:SummaryBundle):Promise<{profile:GeneratedExperienceProfile;source:'openai'|'fallback'}>{
  if(!env.OPENAI_API_KEY||!env.OPENAI_MODEL)return {profile:fallback(data),source:'fallback'};
  try{
    const completion=await getOpenAIClient().chat.completions.parse({model:env.OPENAI_MODEL,max_completion_tokens:400,response_format:zodResponseFormat(generatedProfileSchema,'experience_profile'),messages:[
      {role:'system',content:'당신은 세종 체험 행동 요약으로 사용자 프로필을 만듭니다. 원본 로그를 추측하지 말고 점수와 evidence만 사용하세요. 공연, 먹거리, 축제 순서의 한국어 태그를 정확히 3개 생성하고 한 문장 요약을 작성하세요.'},
      {role:'user',content:JSON.stringify(compactProfileInput(data))},
    ]});
    const parsed=completion.choices[0]?.message.parsed;
    return parsed?{profile:parsed,source:'openai'}:{profile:fallback(data),source:'fallback'};
  }catch{return {profile:fallback(data),source:'fallback'}}
}
