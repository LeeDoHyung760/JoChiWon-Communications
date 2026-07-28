import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../../config/env.js';

const resultSchema=z.object({answer:z.string().trim().min(1).max(700)});
const client=env.OPENAI_API_KEY&&env.AI_PROVIDER!=='mock'?new OpenAI({apiKey:env.OPENAI_API_KEY,timeout:env.OPENAI_TIMEOUT_MS,maxRetries:env.OPENAI_MAX_RETRIES}):null;

const evidence=[
  '반달가슴곰과 불곰의 흔적은 발자국 크기, 발톱 자국, 보폭, 주변 흔적을 함께 비교해야 하며 한 가지 특징만으로 확정할 수 없다.',
  '불곰은 일반적으로 반달가슴곰보다 몸집이 커서 더 크고 깊은 발자국을 남길 수 있지만 개체와 지면 상태에 따라 달라진다.',
  '반달가슴곰과 불곰은 모두 식물성 먹이와 작은 동물을 먹는 잡식성이므로 먹이 흔적만으로 종을 확정하기 어렵다.',
  '보금자리의 크기와 은폐 환경은 몸집과 생활 방식을 추정하는 단서지만 종을 완전히 구분하는 기준은 아니다.',
  '정확한 생태 조사에는 발자국, 먹이, 보금자리와 함께 털, 배설물, 이동 경로 같은 추가 흔적이 필요하다.',
  '야생 곰에게 접근하거나 먹이를 주어서는 안 되며 실제 조우 시 현장 안전 안내를 우선해야 한다.',
];

function fallback(input:{mode:'clue'|'question'|'report';clueId?:string;selected?:string}){
  if(input.mode==='report'){
    if(input.selected==='공동 탐험 완료')return '세 탐험가의 기록을 연결했습니다. 곰은 폭포 가까이에서 물을 마시거나 먹이를 찾은 뒤 동굴 쪽으로 이동했고, 큰 나무에 발톱 흔적을 남긴 것으로 보입니다. 서로 다른 장소의 기록이 모여 숲속 이동 경로가 완성되었습니다.';
    if(input.selected==='불곰')return '조사된 발자국은 크고 발톱 자국이 선명했으며 넓은 동굴형 보금자리 흔적이 확인되었습니다. 이러한 단서를 종합하면 불곰일 가능성이 높습니다. 다만 먹이 흔적만으로는 반달곰과 구분하기 어려우므로 털이나 배설물 같은 추가 흔적이 필요합니다.';
    if(input.selected==='반달곰')return '비교적 작은 발자국과 가려진 보금자리 단서가 확인되었습니다. 먹이 흔적은 두 곰 모두에게 나타날 수 있지만 수집한 단서를 종합하면 반달곰일 가능성이 높습니다. 정확한 판별을 위해 털이나 배설물 같은 추가 흔적이 필요합니다.';
    return '발자국, 먹이, 보금자리에서 서로 다른 특징이 확인되었습니다. 먹이 흔적은 두 곰 모두에게 나타날 수 있고 다른 단서도 한 종으로 일치하지 않아 두 종의 흔적이 섞였을 가능성이 있습니다. 정확한 판별을 위해 털, 배설물, 이동 경로를 추가로 조사해야 합니다.';
  }
  if(input.clueId==='track')return '발자국의 크기와 깊이는 중요한 단서지만 지면 상태와 개체 차이도 고려해야 해요. 발톱 자국, 보폭, 주변 흔적을 함께 비교하면 더 신뢰할 수 있습니다.';
  if(input.clueId==='food')return '반달곰과 불곰은 모두 잡식성이어서 이 먹이 흔적만으로 한 종을 확정하기 어려워요. 다른 장소의 발자국과 보금자리 흔적을 함께 확인해야 합니다.';
  return '보금자리의 크기와 은폐 환경은 중요한 단서지만 이것만으로 종을 확정할 수는 없어요. 몸집과 주변의 여러 흔적을 함께 살펴보는 것이 정확한 조사 방법입니다.';
}

export async function bearWildlifeAnswer(input:{mode:'clue'|'question'|'report';question:string;clueId?:string;selected?:string;findings?:unknown[]}){
  const defaultAnswer=fallback(input);
  if(!client)return defaultAnswer;
  try{
    const completion=await client.chat.completions.create({
      model:env.OPENAI_MODEL,
      max_completion_tokens:500,
      response_format:{type:'json_object'},
      messages:[
        {role:'system',content:`당신은 신중한 야생동물 탐험 해설사입니다. 제공된 근거와 사용자가 수집한 단서만 사용하세요. ${input.selected==='공동 탐험 완료'?'서로 다른 탐험가가 찾은 장소와 단서를 시간 순서로 연결해 3문장의 공동 탐험 이야기를 작성하세요. 종을 단정하지 마세요.':input.mode==='report'?'선택한 최종 판정을 존중하되 불확실성과 추가 조사 필요성을 포함한 3~5문장 연구 보고서를 작성하세요.':'사용자의 선택을 정오답으로 단정하지 말고 관찰 근거의 강점과 한계를 2~3문장으로 설명하세요.'} 시설의 현재 개체 정보나 근거 없는 수치를 추측하지 마세요. JSON {"answer":"..."}로만 답하세요.`},
        {role:'user',content:JSON.stringify({evidence,input})},
      ],
    });
    return resultSchema.parse(JSON.parse(completion.choices[0]?.message.content??'{}')).answer;
  }catch{return defaultAnswer}
}
