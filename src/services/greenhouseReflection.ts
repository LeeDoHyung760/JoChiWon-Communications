import type {
  GreenhousePlantReflectionAnalysis,
  GreenhouseReflectionEmotion,
  GreenhouseReflectionReason,
  GreenhouseReflectionStyle,
} from '../../shared/greenhouse-analysis';
import type { PlantDefinition } from '../data/greenhouse-plants';

const QUESTIONS:Record<string,string>={
  'flower-01':'잎보다 먼저 피어난 목련을 보며, 새롭게 시작하고 싶은 일이 떠오르나요?',
  'flower-02':'추위 속에서 먼저 피어난 노란 꽃을 보니 지금 해보고 싶은 일이 있나요?',
  'flower-03':'함께 피어 있는 철쭉을 보며 떠오르는 사람이나 장면이 있나요?',
  'flower-04':'여러 꽃이 모여 있는 모습을 보니 어떤 장면이나 사람이 떠오르나요?',
  'flower-05':'튤립의 색과 단정한 모습을 보며 가장 먼저 든 느낌은 무엇인가요?',
  'flower-06':'붓꽃의 색과 무늬로 지금 마음을 표현한다면 어떤 모습일까요?',
  'flower-07':'은은하게 향기를 전하는 백합을 보며 말없이 전하고 싶은 마음이 있나요?',
  'flower-08':'차가운 계절에 핀 붉은 동백을 보며 떠오르는 온기나 기억이 있나요?',
  'flower-09':'햇빛을 향한 해바라기를 보며 지금 마음이 향하고 싶은 곳은 어디인가요?',
  'flower-10':'조용히 핀 구절초를 보며 생각나는 계절이나 장소가 있나요?',
  'flower-11':'계속 새 꽃을 피우는 무궁화를 보며 다시 시작하고 싶은 일이 있나요?',
  'flower-12':'낯선 새를 닮은 극락조화를 보며 해보고 싶은 새로운 경험이 있나요?',
  'peach-tree':'복숭아꽃을 보며 가장 먼저 떠오른 생각이나 느낌은 무엇인가요?',
  'red-tree':'변해가는 단풍잎의 색을 보며 생각나는 순간이 있나요?',
};

const EMOTION_TERMS:Record<GreenhouseReflectionEmotion,string[]>={
  평온함:['편안','평온','차분','고요','조용','안정','쉬고','여유','평화','잔잔','마음이 놓','안심','힐링','쉼','느긋'],
  설렘:['설레','두근','기대','가보고','해보고','빨리 보고','보고 싶','기다려져','반가','들뜨'],
  따뜻함:['따뜻','포근','다정','가족','친구','함께','같이','햇빛','사람','위로','정겹','고마','감사','든든','정이'],
  신비로움:['신기','신비','낯선','독특','묘하','처음 보','이색','상상','비밀'],
  그리움:['그립','기억','예전','옛날','할머니','할아버지','그때','추억','보고 싶었','생각나','아련','고향'],
  희망:['희망','시작','새로','새로운 일','피어','자라','앞으로','가능','잘될','응원','꿈','회복'],
  기쁨:['기쁘','즐거','행복','신나','재미','웃음','기분 좋','좋아','반갑'],
  감탄:['예쁘','아름답','아름다','멋지','화려','눈부셔','황홀','감탄','대단','놀랍'],
  호기심:['궁금','호기심','알고 싶','왜','어떻게','언제','뭘까','무엇일까','신선'],
  애틋함:['애틋','소중','사랑','아끼','뭉클','찡하','안쓰럽','보듬','지켜주'],
  상쾌함:['상쾌','시원','싱그럽','맑아','개운','청량','산뜻','기분 전환','숨이 트'],
  외로움:['외롭','쓸쓸','고독','혼자인','허전','적막','공허','우울'],
  용기:['용기','용기 내','힘내','해낼','도전','다시 도전','씩씩','당당','견뎌','이겨','두렵지만','해보자'],
  아쉬움:['아쉽','서운','안타깝','슬프','속상','끝나','지나가','시들','떠나','짧아서'],
};
const REASON_TERMS:Record<GreenhouseReflectionReason,string[]>={
  scene:['색','빛','햇빛','햇살','분홍','노랑','붉','밝','모습','풍경','향기','냄새','예쁘','아름','바람','촉감','부드러','맛','열매','소리','그늘','모양','무늬'],
  change:['시작','새로','새로운 일','변화','변해','자라','피어','앞으로','도전','해보고','성장','익어','열리','기다','회복','다시','계절'],
  relationship:['함께','같이','가족','친구','사람','엄마','아빠','할머니','할아버지','누군가','연인','아이','동생','언니','오빠','나누','전하고','선물'],
  memory:['기억','예전','옛날','그때','지난','떠올','생각나','장소','길','고향','추억','어릴 때','학교','집','여행','산책','계절'],
};
const STYLE_TERMS:Record<GreenhouseReflectionStyle,string[]>={
  visual:['사진','장면','보여','풍경','그림','색','모습','눈에','찍고','담고'],
  language:['말','글','문장','적고','쓰고','표현','기록','이름','한마디'],
  inner:['마음','생각','조용','간직','혼자','오래','되새','떠올','기억해'],
  share:['함께','나누','이야기','알려','보여주','가족','친구','사람','전하고','선물','같이'],
};

const scoredMatch=<T extends string>(text:string,terms:Record<T,string[]>)=>{
  const ranked=(Object.keys(terms) as T[]).map(key=>({
    key,
    score:terms[key].reduce((total,term)=>total+(text.includes(term)?1:0),0),
  })).sort((a,b)=>b.score-a.score);
  return ranked[0]?.score?ranked[0].key:undefined;
};

const meaningfulKeywords=(answer:string)=>{
  const concepts=[
    {label:'햇빛',terms:['햇빛','햇살']},
    {label:'마음의 안정',terms:['마음이 놓','안심','안정','편안','평온','차분']},
    {label:'휴식',terms:['힐링','쉬고','쉼','여유','느긋']},
    {label:'설렘과 기대',terms:['설레','두근','기대','빨리 보고','기다려져']},
    {label:'따뜻함',terms:['따뜻','포근','온기','정겹']},
    {label:'위로',terms:['위로','든든','힘이 되']},
    {label:'사랑과 행복',terms:['사랑','행복','고마','감사']},
    {label:'기쁨',terms:['기쁘','즐거','신나','재미','웃음','기분 좋']},
    {label:'아름다움에 대한 감탄',terms:['예쁘','아름답','아름다','멋지','화려','눈부셔','황홀','대단']},
    {label:'호기심',terms:['궁금','호기심','알고 싶','왜','어떻게']},
    {label:'신비로운 모습',terms:['신기','신비','묘하','낯선','독특','처음 보']},
    {label:'새로운 시작',terms:['새로','시작','도전','잘될','용기']},
    {label:'성장과 변화',terms:['피어','자라','성장','변화','변해','회복']},
    {label:'함께함',terms:['함께','같이']},
    {label:'가족',terms:['가족','엄마','아빠','할머니','할아버지']},
    {label:'친구',terms:['친구','동생','언니','오빠','연인']},
    {label:'지난 기억',terms:['기억','예전','옛날','그때','추억','어릴 때']},
    {label:'그리움',terms:['그립','아련','쓸쓸','외롭','보고 싶었']},
    {label:'애틋함',terms:['애틋','소중','아끼','뭉클','찡하','안쓰럽']},
    {label:'상쾌함',terms:['상쾌','시원','싱그럽','맑아','개운','청량','산뜻']},
    {label:'외로움',terms:['외롭','쓸쓸','고독','허전','적막','공허','우울']},
    {label:'용기',terms:['용기','힘내','해낼','도전','씩씩','당당','견뎌','이겨']},
    {label:'아쉬움',terms:['아쉽','서운','안타깝','슬프','속상','시들','떠나']},
    {label:'장소와 산책',terms:['장소','길','고향','학교','집','여행','산책']},
    {label:'색과 풍경',terms:['색','풍경','장면','모습','모양','무늬']},
    {label:'향기',terms:['향기','냄새']},
    {label:'바람과 촉감',terms:['바람','촉감','부드러','시원']},
    {label:'열매',terms:['열매','과일','복숭아']},
    {label:'맛',terms:['맛','먹']},
    {label:'기다림',terms:['언제','기다','익을','익는','열릴']},
  ];
  const matched=concepts.filter(concept=>concept.terms.some(term=>answer.includes(term))).map(concept=>concept.label);
  const words=answer.match(/[가-힣A-Za-z0-9]{2,}/g)??[];
  const ignored=['그리고','그래서','하지만','보면서','보니까','보고','있으면','돼서','놓이','같아','느낌','생각','마음이','것처럼','무엇','정말','너무','조금','그냥','받아','일이','나무는','꽃을','식물을'];
  const conceptTerms=concepts.flatMap(concept=>concept.terms);
  const unique=[...new Set(words.filter(word=>!ignored.some(term=>word.includes(term))&&!conceptTerms.some(term=>word.includes(term))))];
  return [...new Set([...matched,...unique])].slice(0,5);
};

export function greenhouseReflectionQuestion(plant:PlantDefinition){
  return QUESTIONS[plant.id]??`${plant.displayName}을 보며 가장 먼저 떠오른 생각이나 느낌은 무엇인가요?`;
}

export function fallbackPlantReflection(plant:PlantDefinition,answer:string):GreenhousePlantReflectionAnalysis{
  const text=answer.trim();
  const sensoryFruit=['맛','먹','열매','과일','익을','익는'].some(term=>text.includes(term))
    ||text.includes('복숭아')&&['언제','맛','먹','열'].some(term=>text.includes(term));
  if(sensoryFruit){
    const isPeach=text.includes('복숭아')||plant.id==='peach-tree';
    return {
      emotion:'설렘',
      reasonCategory:'scene',
      recordStyle:'language',
      keywords:meaningfulKeywords(text),
      reflectionTitle:'열매를 기다리는 호기심과 설렘',
      shortReflection:isPeach?'복숭아가 열리는 시기와 맛을 떠올리며, 꽃보다 열매에 관심이 머물렀어요.':'열매가 맺히는 시기와 맛을 떠올리며, 식물의 결실에 관심이 머물렀어요.',
    };
  }
  const emotion=scoredMatch(text,EMOTION_TERMS)
    ??(['궁금','언제','어떻게','왜','?'].some(term=>text.includes(term))?'호기심'
      :['좋아','좋다','기분 좋'].some(term=>text.includes(term))?'기쁨'
      :['예뻐','예쁘','아름다','멋져'].some(term=>text.includes(term))?'감탄':'평온함');
  const reasonCategory=scoredMatch(text,REASON_TERMS)??'scene';
  const recordStyle=scoredMatch(text,STYLE_TERMS)??'language';
  const reasonPhrase={
    scene:'눈앞의 색과 분위기',
    change:'변화와 새로운 시작',
    relationship:'함께하고 싶은 사람과 장면',
    memory:'지난 시간과 익숙한 기억',
  }[reasonCategory];
  const keywords=meaningfulKeywords(text);
  const evidence=keywords.slice(0,2).join('과 ');
  return {
    emotion,
    reasonCategory,
    recordStyle,
    keywords,
    reflectionTitle:`${reasonPhrase}에 머문 ${emotion}`,
    shortReflection:evidence?`${evidence}에 관한 표현에서 ${emotion}의 마음이 느껴져요.`:`작성한 문장에서 ${emotion}의 마음이 느껴져요.`,
  };
}
