import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../../config/env.js';

const resultSchema=z.object({answer:z.string().trim().min(1).max(700)});
const client=env.OPENAI_API_KEY&&env.AI_PROVIDER!=='mock'?new OpenAI({apiKey:env.OPENAI_API_KEY,timeout:env.OPENAI_TIMEOUT_MS,maxRetries:env.OPENAI_MAX_RETRIES}):null;
const habitatDecisionTypes=new Set(['균형 설계형','안전 우선형','효율 운영형','공정 균형형','상황 적응형']);

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
    if(input.selected&&habitatDecisionTypes.has(input.selected))return `맵에서 불곰과 반달가슴곰의 위치를 먼저 확인한 뒤 잠자리·먹이·물가의 실제 위치와 이용 방식을 함께 설계했습니다. ${input.selected}답게 한 가지 선택만 고집하기보다 두 곰의 필요와 자원 사이의 거리, 이동 동선을 함께 고려하는 판단 구조가 보입니다.`;
    if(input.selected==='여행 스타일 분석')return '정해진 순서보다 관심이 가는 자연환경을 먼저 살피고, 인상적인 장소에서는 충분히 머물며 기록하는 여행 방식이 잘 맞습니다. 관찰과 이동을 스스로 조절하는 성향이 보여 산책 경로와 포토스팟을 함께 경험할 수 있는 세종의 여유로운 자연 코스를 추천합니다. 동행할 때는 각자의 관람 속도를 존중하면서 다시 합류할 지점을 정하면 만족도가 높겠습니다.';
    if(input.selected==='공동 탐험 완료')return '오늘의 이동 경로는 폭포에서 동굴을 지나 큰 나무로 이어집니다. 물가의 곰 털, 동굴 앞 발자국, 나무의 발톱 자국이 발견되어 탐험에 성공했습니다. 여러 장소의 흔적을 함께 살피면 한 가지 단서만 볼 때보다 동물의 이동과 행동을 더 신중하게 추정할 수 있습니다.';
    if(input.selected==='불곰')return '조사된 발자국은 크고 발톱 자국이 선명했으며 넓은 동굴형 보금자리 흔적이 확인되었습니다. 이러한 단서를 종합하면 불곰일 가능성이 높습니다. 다만 먹이 흔적만으로는 반달곰과 구분하기 어려우므로 털이나 배설물 같은 추가 흔적이 필요합니다.';
    if(input.selected==='반달곰')return '비교적 작은 발자국과 가려진 보금자리 단서가 확인되었습니다. 먹이 흔적은 두 곰 모두에게 나타날 수 있지만 수집한 단서를 종합하면 반달곰일 가능성이 높습니다. 정확한 판별을 위해 털이나 배설물 같은 추가 흔적이 필요합니다.';
    return '발자국, 먹이, 보금자리에서 서로 다른 특징이 확인되었습니다. 먹이 흔적은 두 곰 모두에게 나타날 수 있고 다른 단서도 한 종으로 일치하지 않아 두 종의 흔적이 섞였을 가능성이 있습니다. 정확한 판별을 위해 털, 배설물, 이동 경로를 추가로 조사해야 합니다.';
  }
  if(input.clueId==='waterfall')return '물가의 털은 곰이 물을 마시거나 먹이를 찾으며 지나갔을 가능성을 보여줍니다. 이 단서만으로 이동 방향을 확정할 수 없으므로 다음 장소의 흔적이 필요합니다.';
  if(input.clueId==='cave')return '동굴 앞 발자국이 더해져 물가와 은신 장소 사이의 이동 가능성이 보입니다. 발톱 자국이 남을 만한 큰 나무 주변을 추가로 확인해야 합니다.';
  if(input.clueId==='tree')return '나무의 발톱 자국까지 연결되어 세 장소 사이의 이동 경로를 비교할 수 있습니다. 흔적은 가능성을 보여주는 자료이므로 종이나 행동을 단정하지 않는 것이 중요합니다.';
  if(input.clueId==='track')return '발자국의 크기와 깊이는 중요한 단서지만 지면 상태와 개체 차이도 고려해야 해요. 발톱 자국, 보폭, 주변 흔적을 함께 비교하면 더 신뢰할 수 있습니다.';
  if(input.clueId==='food')return '반달곰과 불곰은 모두 잡식성이어서 이 먹이 흔적만으로 한 종을 확정하기 어려워요. 다른 장소의 발자국과 보금자리 흔적을 함께 확인해야 합니다.';
  return '보금자리의 크기와 은폐 환경은 중요한 단서지만 이것만으로 종을 확정할 수는 없어요. 몸집과 주변의 여러 흔적을 함께 살펴보는 것이 정확한 조사 방법입니다.';
}

export async function bearWildlifeAnswer(input:{mode:'clue'|'question'|'report';question:string;clueId?:string;selected?:string;findings?:unknown[]}){
  const defaultAnswer=fallback(input);
  if(!client)return defaultAnswer;
  try{
    const completion=await client.chat.completions.create({
      model:env.OPENAI_MODEL ?? '',
      max_completion_tokens:500,
      response_format:{type:'json_object'},
      messages:[
        {role:'system',content:`당신은 신중한 여행 행동 분석가입니다. 제공된 관찰 기록만 사용하세요. ${input.selected&&habitatDecisionTypes.has(input.selected)?'맵 좌표에서 불곰·반달가슴곰과 잠자리·먹이·물가 사이의 거리, 세 자원의 분산 정도, 자원 이용 정책, 먹이 감소 후 계획 변경 여부를 함께 해석하세요. 사용자가 안전·필요·공정·효율·상황 적응 중 무엇을 어떤 배치 행동으로 우선했는지 2~3문장으로 설명하세요. 좌표 숫자를 나열하거나 성격을 단정하지 마세요.':input.selected==='여행 스타일 분석'?'방문 순서, 체류 시간, 장소별 선택, 사진 행동, 동행 선택을 종합해 사용자의 여행 방식을 2문장으로 설명하고 세종 자연 장소 추천 근거를 1문장으로 작성하세요. 성격을 단정하거나 점수를 노출하지 마세요.':input.selected==='공동 탐험 완료'?'오늘의 이동 경로, 발견한 단서, 탐험 성공 여부, 한 줄 생태 해설이 드러나는 3~4문장의 공동 탐험 보고서를 작성하세요. 종을 단정하지 마세요.':input.mode==='report'?'선택한 최종 판정을 존중하되 불확실성과 추가 조사 필요성을 포함한 3~5문장 연구 보고서를 작성하세요.':'현재 단서의 의미와 한계, 다음 조사 방향을 2~3문장으로 설명하세요.'} 시설의 현재 개체 정보나 근거 없는 수치를 추측하지 마세요. JSON {"answer":"..."}로만 답하세요.`},
        {role:'user',content:JSON.stringify({evidence,input})},
      ],
    });
    return resultSchema.parse(JSON.parse(completion.choices[0]?.message.content??'{}')).answer;
  }catch{return defaultAnswer}
}
