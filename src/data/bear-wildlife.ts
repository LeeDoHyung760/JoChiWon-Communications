export type BearClueId='track'|'food'|'den';
export type BearVerdict='반달곰'|'불곰'|'두 곰의 흔적이 섞여 있음';

export type BearClue={
  id:BearClueId;
  icon:string;
  title:string;
  mission:string;
  observations:string[];
  question:string;
  speciesOptions:string[];
  evidenceQuestion:string;
  evidenceOptions:string[];
  fallbackExplanation:string;
};

export type BearFinding={
  clueId:BearClueId;
  species:string;
  evidence:string;
};

export const BEAR_CLUES:BearClue[]=[
  {
    id:'track',
    icon:'🐾',
    title:'발자국 흔적 연구소',
    mission:'두 발자국의 크기, 발톱 자국, 앞발과 뒷발 모양, 보폭을 비교하세요.',
    observations:['크기','발톱 자국','앞발·뒷발 모양','보폭'],
    question:'이 발자국은 어떤 곰의 흔적일까요?',
    speciesOptions:['반달곰','불곰','아직 모르겠어요'],
    evidenceQuestion:'왜 그렇게 판단했나요?',
    evidenceOptions:['발자국이 더 크다','발톱 자국이 길다','발바닥 모양이 다르다'],
    fallbackExplanation:'이 흔적은 불곰일 가능성이 높아요. 몸집이 큰 불곰은 일반적으로 더 크고 깊은 발자국을 남길 수 있지만, 보폭과 주변 흔적도 함께 확인해야 합니다.',
  },
  {
    id:'food',
    icon:'🌰',
    title:'먹이 흔적 연구소',
    mission:'주변의 열매 껍질, 뒤집힌 통나무, 큰 발톱 자국을 차례로 확인하세요.',
    observations:['열매 껍질','뒤집힌 통나무','큰 발톱 자국'],
    question:'누가 이곳에서 먹이를 찾았을까요?',
    speciesOptions:['반달곰','불곰','두 곰 모두 가능'],
    evidenceQuestion:'판단에 가장 중요한 단서는 무엇인가요?',
    evidenceOptions:['도토리와 열매','뒤집힌 통나무','여러 흔적을 함께 봐야 한다'],
    fallbackExplanation:'이 흔적만으로 한 종을 확정하기는 어려워요. 반달곰과 불곰 모두 식물성 먹이와 작은 동물을 먹는 잡식성이므로 다른 흔적과 함께 판단해야 합니다.',
  },
  {
    id:'den',
    icon:'🏔️',
    title:'겨울 보금자리 연구소',
    mission:'좁고 가려진 보금자리 A와 입구가 크고 넓은 보금자리 B를 비교하세요.',
    observations:['A: 좁고 주변이 가려짐','A: 나무 구멍·바위틈','B: 입구와 내부가 넓음','B: 큰 동물이 머물 수 있음'],
    question:'두 보금자리는 어떤 곰에게 더 적합할까요?',
    speciesOptions:['반달곰 A · 불곰 B','반달곰 B · 불곰 A','크기만으로 판단할 수 없음'],
    evidenceQuestion:'왜 그렇게 배치했나요?',
    evidenceOptions:['몸집과 입구 크기를 비교했다','주변의 은폐 환경을 살폈다','크기 외의 흔적도 필요하다'],
    fallbackExplanation:'보금자리 크기만으로 종을 완전히 구분할 수는 없지만 몸집과 주변 환경은 중요한 단서예요. 여러 흔적을 함께 살펴보는 것이 정확한 생태 조사 방법입니다.',
  },
];

export type BearWildlifeProgress={
  completedClues:BearClueId[];
  findings:Partial<Record<BearClueId,BearFinding>>;
  completedAt?:string;
  questionsAsked:number;
  finalVerdict?:BearVerdict;
  report?:string;
};

export const bearProgressKey=(userKey:string)=>`bear-wildlife-comparison-v2:${userKey.trim().toLowerCase()||'guest'}`;

export function loadBearProgress(userKey:string):BearWildlifeProgress{
  try{
    const value=JSON.parse(localStorage.getItem(bearProgressKey(userKey))??'null') as Partial<BearWildlifeProgress>|null;
    const completedClues=Array.isArray(value?.completedClues)
      ?value.completedClues.filter((id):id is BearClueId=>BEAR_CLUES.some(clue=>clue.id===id))
      :[];
    return {
      completedClues,
      findings:value?.findings&&typeof value.findings==='object'?value.findings:{},
      completedAt:completedClues.length===BEAR_CLUES.length&&typeof value?.completedAt==='string'?value.completedAt:undefined,
      questionsAsked:typeof value?.questionsAsked==='number'&&Number.isFinite(value.questionsAsked)?Math.max(0,value.questionsAsked):0,
      finalVerdict:value?.finalVerdict,
      report:typeof value?.report==='string'?value.report:undefined,
    };
  }catch{return {completedClues:[],findings:{},questionsAsked:0}}
}

export function saveBearProgress(userKey:string,progress:BearWildlifeProgress){
  localStorage.setItem(bearProgressKey(userKey),JSON.stringify(progress));
  return progress;
}
