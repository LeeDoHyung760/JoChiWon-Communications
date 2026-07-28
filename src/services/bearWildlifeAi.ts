import { API_BASE_URL } from '../config/api';
import type { BearClue } from '../data/bear-wildlife';

async function ask(body:unknown){
  const controller=new AbortController(),timer=window.setTimeout(()=>controller.abort(),10000);
  try{
    const response=await fetch(`${API_BASE_URL}/bear-wildlife/ask`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body),
      signal:controller.signal,
    });
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const result=await response.json() as {answer?:unknown};
    if(typeof result.answer!=='string'||!result.answer.trim())throw new Error('Empty AI answer');
    return result.answer.trim();
  }finally{window.clearTimeout(timer)}
}

export async function requestClueExplanation(clue:BearClue,selected:string){
  try{
    return await ask({mode:'clue',clueId:clue.id,question:clue.question,selected});
  }catch{return clue.fallbackExplanation}
}

const fallbackAnswers=[
  {pattern:/공격|위험|만나/,answer:'반달가슴곰은 야생동물이므로 가까이 다가가거나 먹이를 주면 안 돼요. 야외에서 마주치면 뛰거나 등을 보이지 말고, 거리를 유지하며 현장 안내와 국립공원 안전 수칙을 따라야 합니다.'},
  {pattern:/겨울잠|동면/,answer:'겨울철 먹이가 줄어드는 시기에 활동과 에너지 소비를 낮추기 위한 생존 전략이에요. 시기와 기간은 개체와 기온, 먹이 상황에 따라 달라집니다.'},
  {pattern:/먹|도토리|열매/,answer:'반달가슴곰은 잡식동물이며 도토리와 열매 같은 식물성 먹이를 폭넓게 이용해요. 계절과 서식 환경에 따라 곤충 등 다른 먹이도 먹습니다.'},
  {pattern:/발자국|발/,answer:'곰의 발자국은 넓은 발바닥과 발가락 흔적이 단서가 돼요. 다만 실제 조사에서는 크기, 보행 간격, 주변의 털·배설물 같은 여러 흔적을 함께 확인합니다.'},
];

export async function requestBearAnswer(question:string){
  const fallback=fallbackAnswers.find(item=>item.pattern.test(question))?.answer??'좋은 질문이에요. 지금 가진 반달가슴곰 생태 자료만으로 확실하게 답하기 어려워요. 현장 해설사나 국립공원공단의 최신 안내를 함께 확인해 주세요.';
  try{return await ask({mode:'question',question})}catch{return fallback}
}
