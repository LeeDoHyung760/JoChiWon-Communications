import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { env } from '../../config/env.js';
import { getOpenAIClient } from '../ai/openaiClient.js';
import type { ExperienceSummary } from './experienceHarness.js';

const profileTraitSchema=z.object({key:z.string().trim().min(1).max(60),label:z.string().trim().min(1).max(40),score:z.number().min(0).max(100),confidence:z.number().min(0).max(1)}).strict();
export const generatedProfileSchema=z.object({source:z.string().trim().min(1).max(60),title:z.string().trim().min(1).max(80),tags:z.array(z.string().trim().min(1).max(30)).length(3),traits:z.array(profileTraitSchema).min(1).max(8),summary:z.string().trim().min(1).max(180),evidence:z.array(z.string().trim().min(1).max(160)).max(12)}).strict();
export type GeneratedExperienceProfile=z.infer<typeof generatedProfileSchema>;
export type SummaryBundle={performance?:ExperienceSummary;food?:ExperienceSummary;festival?:ExperienceSummary};

const scoreObject=(scores:ExperienceSummary['scores']|Map<string,number>|undefined):Record<string,number>=>scores instanceof Map?Object.fromEntries(scores):scores??{};

export function compactProfileInput(data:SummaryBundle){
  const section=(value:ExperienceSummary|undefined)=>value?{...scoreObject(value.scores),evidence:value.evidence}:undefined;
  return {performance:section(data.performance),food:section(data.food),festival:section(data.festival)};
}

function fallback(data:SummaryBundle):GeneratedExperienceProfile{
  const p=scoreObject(data.performance?.scores),f=scoreObject(data.food?.scores),v=scoreObject(data.festival?.scores);
  const hasLocalFoodInterest=(f.peachInterest??0)>0||(f.seasonalProduceInterest??0)>0||(f.producerStoryInterest??0)>0||(f.localSpecialtyInterest??0)>0;
  if(hasLocalFoodInterest){
    const viewed=data.food?.sessionSummary?.localFoodsViewed??0;
    return {source:'sejong_food_trucks',title:'조치원 복숭아와 세종 지역 농산물에 관심이 높습니다.',tags:['조치원 복숭아','제철 농산물','생산 이야기'],traits:[
      {key:'peach_interest',label:'조치원 복숭아 관심',score:f.peachInterest??0,confidence:Math.min(.95,.5+viewed*.1)},
      {key:'seasonal_produce_interest',label:'제철 농산물 관심',score:f.seasonalProduceInterest??0,confidence:Math.min(.92,.45+viewed*.1)},
      {key:'producer_story_interest',label:'생산지·농가 관심',score:f.producerStoryInterest??0,confidence:Math.min(.92,.45+viewed*.1)},
    ],summary:'음식을 소비하는 것보다 지역 특산물과 생산 이야기에 관심을 보이는 성향입니다.',evidence:data.food?.evidence??[]};
  }
  const genreLabels:Record<string,string>={musical:'뮤지컬 선호',play:'연극 선호',jazz:'재즈 선호',traditional:'전통공연 선호',classical:'클래식 선호'};
  const favoriteGenre=Object.keys(genreLabels).sort((a,b)=>(p[b]??0)-(p[a]??0))[0];
  const genreScore=favoriteGenre?p[favoriteGenre]??0:0;
  const performance=favoriteGenre&&genreScore>0?(genreScore>=15?genreLabels[favoriteGenre]:`최근 ${genreLabels[favoriteGenre].replace(' 선호',' 공연에 높은 몰입')}`):(p.immersion??0)>=(p.culture??0)?'최근 공연에 높은 몰입':'문화예술 탐색 중';
  const food=(f.local??0)>=(f.street??0)&&(f.local??0)>=(f.dessert??0)?'지역 특산물 탐험가':(f.street??0)>=(f.dessert??0)?'야시장 탐색가':'감성 디저트 수집가';
  const festival=(v.participation??0)>=(v.exploration??0)?'축제 참여형':'축제 탐험형';
  const festivalTraits=[{key:'night_festival_interest',label:'야간 축제 관심',score:v.nightFestivalInterest??0,confidence:Math.min(.95,.45+(data.festival?.sessionSummary?.festivalsViewed??0)*.06)},{key:'visit_planning',label:'방문 계획 성향',score:v.planningStyle??0,confidence:Math.min(.92,.45+(data.festival?.sessionSummary?.informationFocus?.length??0)*.08)},{key:'festival_exploration',label:'축제 탐색 성향',score:v.festivalExploration??0,confidence:Math.min(.9,.42+(data.festival?.sessionSummary?.festivalsViewed??0)*.05)}];
  const hasFestival=(data.festival?.sessionSummary?.festivalsViewed??0)>0,title=hasFestival?'세종의 밤과 축제를 살피는 계획형 탐험가':'문화예술과 세종을 탐색하는 체험가';
  return {source:hasFestival?'sejong_festival_booth':'integrated_experience',title,tags:[performance,food,festival],traits:festivalTraits,summary:hasFestival?'관심 있는 축제를 비교하고 일정과 이동 정보를 확인한 뒤 방문을 결정하는 편이에요.':'문화공연과 세종의 먹거리, 다양한 축제 현장 체험을 자신만의 방식으로 탐색하는 사용자입니다.',evidence:data.festival?.evidence??[]};
}

export async function generateExperienceProfile(data:SummaryBundle):Promise<{profile:GeneratedExperienceProfile;source:'openai'|'fallback'}>{
  if(!env.OPENAI_API_KEY||!env.OPENAI_MODEL)return {profile:fallback(data),source:'fallback'};
  try{
    const completion=await getOpenAIClient().chat.completions.parse({model:env.OPENAI_MODEL,max_completion_tokens:400,response_format:zodResponseFormat(generatedProfileSchema,'experience_profile'),messages:[
      {role:'system',content:'당신은 서버가 정제한 세종 체험 요약을 자연어 프로필로 표현합니다. 원본 로그를 추측하거나 점수·confidence를 변경하지 말고 제공된 scores와 evidence만 사용하세요. source, title, 한국어 tags 3개, traits, summary, evidence를 생성하세요. traits의 score는 서버 점수를 그대로 쓰고 confidence는 행동량이 적으면 낮게 표현하세요.'},
      {role:'user',content:JSON.stringify(compactProfileInput(data))},
    ]});
    const parsed=completion.choices[0]?.message.parsed;
    if(!parsed)return {profile:fallback(data),source:'fallback'};
    const deterministic=fallback(data);
    const localFoodProfile=deterministic.source==='sejong_food_trucks';
    return {profile:{...parsed,source:deterministic.source,title:localFoodProfile?deterministic.title:parsed.title,tags:localFoodProfile?deterministic.tags:[deterministic.tags[0],parsed.tags[1],parsed.tags[2]],summary:localFoodProfile?deterministic.summary:parsed.summary,traits:deterministic.traits,evidence:deterministic.evidence},source:'openai'};
  }catch{return {profile:fallback(data),source:'fallback'}}
}
