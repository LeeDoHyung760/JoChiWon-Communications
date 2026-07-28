export type BearClue={
  id:'track'|'food'|'den';
  icon:string;
  title:string;
  question:string;
  options:string[];
  answer:number;
  fallbackExplanation:string;
};

export const BEAR_CLUES:BearClue[]=[
  {
    id:'track',
    icon:'🐾',
    title:'흙길에 남은 발자국',
    question:'이 발자국은 무슨 동물의 흔적일까요?',
    options:['반달가슴곰','고라니','멧돼지'],
    answer:0,
    fallbackExplanation:'넓은 발바닥과 발가락이 함께 찍힌 흔적은 곰 발자국의 중요한 단서예요. 실제 야외에서는 발자국 하나만으로 단정하지 않고 크기와 보행 흔적, 주변 환경을 함께 살펴봅니다.',
  },
  {
    id:'food',
    icon:'🌰',
    title:'나무 아래 남은 먹이 흔적',
    question:'반달가슴곰이 주로 찾는 먹이는 무엇일까요?',
    options:['도토리·열매 같은 식물성 먹이','물고기만','고기만'],
    answer:0,
    fallbackExplanation:'반달가슴곰은 여러 먹이를 먹는 잡식동물이지만 도토리와 열매 같은 식물성 먹이를 폭넓게 이용해요. 계절과 서식 환경에 따라 먹이 구성은 달라질 수 있습니다.',
  },
  {
    id:'den',
    icon:'🌲',
    title:'낙엽이 모인 겨울 보금자리',
    question:'반달가슴곰은 왜 겨울잠을 잘까요?',
    options:['먹이가 부족한 계절에 에너지를 아끼기 위해','밤이 무서워서','털 색을 바꾸기 위해'],
    answer:0,
    fallbackExplanation:'겨울에는 먹이를 구하기 어려워져 활동을 줄이고 저장한 에너지를 아끼는 것이 생존에 유리해요. 동면 시기와 방식은 개체와 날씨에 따라 달라질 수 있습니다.',
  },
];

export const bearProgressKey=(userKey:string)=>`bear-wildlife-progress-v1:${userKey.trim().toLowerCase()||'guest'}`;

export type BearWildlifeProgress={
  completedClues:string[];
  completedAt?:string;
  questionsAsked:number;
};

export function loadBearProgress(userKey:string):BearWildlifeProgress{
  try{
    const value=JSON.parse(localStorage.getItem(bearProgressKey(userKey))??'null') as Partial<BearWildlifeProgress>|null;
    return {
      completedClues:Array.isArray(value?.completedClues)?value.completedClues.filter((id):id is string=>typeof id==='string'&&BEAR_CLUES.some(clue=>clue.id===id)):[],
      completedAt:typeof value?.completedAt==='string'?value.completedAt:undefined,
      questionsAsked:typeof value?.questionsAsked==='number'&&Number.isFinite(value.questionsAsked)?Math.max(0,value.questionsAsked):0,
    };
  }catch{return {completedClues:[],questionsAsked:0}}
}

export function saveBearProgress(userKey:string,progress:BearWildlifeProgress){
  localStorage.setItem(bearProgressKey(userKey),JSON.stringify(progress));
  return progress;
}
