import { API_BASE_URL } from '../config/api';
import type { BearClue,BearFinding,BearVerdict } from '../data/bear-wildlife';

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

export async function requestClueExplanation(clue:BearClue,finding:BearFinding){
  try{
    return await ask({mode:'clue',clueId:clue.id,question:clue.question,selected:finding.species,findings:[finding]});
  }catch{return clue.fallbackExplanation}
}

const reportFallbacks:Record<BearVerdict,string>={
  반달곰:'조사 결과, 비교적 작은 발자국과 가려진 보금자리 단서가 확인되었습니다. 먹이 흔적은 두 곰 모두에게 나타날 수 있지만, 수집한 단서를 종합하면 반달곰일 가능성이 높습니다. 다만 정확한 판별을 위해 털이나 배설물 같은 추가 흔적이 필요합니다.',
  불곰:'조사된 발자국은 크고 발톱 자국이 선명했으며 넓은 동굴형 보금자리 흔적이 확인되었습니다. 이러한 단서를 종합하면 불곰일 가능성이 높습니다. 다만 먹이 흔적만으로는 반달곰과 구분하기 어려우므로 털이나 배설물 같은 추가 흔적이 필요합니다.',
  '두 곰의 흔적이 섞여 있음':'발자국, 먹이, 보금자리에서 서로 다른 특징이 확인되었습니다. 먹이 흔적은 두 곰 모두에게 나타날 수 있고 다른 단서도 한 종으로 일치하지 않아 두 종의 흔적이 섞였을 가능성이 있습니다. 정확한 판별을 위해 털, 배설물, 이동 경로를 추가로 조사해야 합니다.',
};

export async function requestResearchReport(findings:BearFinding[],verdict:BearVerdict){
  const fallback=reportFallbacks[verdict];
  try{
    return await ask({mode:'report',question:'수집한 단서를 바탕으로 반달곰·불곰 비교 연구 보고서를 작성해 주세요.',selected:verdict,findings});
  }catch{return fallback}
}
