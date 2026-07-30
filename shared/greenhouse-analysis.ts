export type GreenhouseAnalysisStage=3|7;
export type GreenhouseAnalysisSource='ai'|'fallback';
export type GreenhouseReflectionSource='openai'|'fallback';
export type GreenhouseReflectionEmotion=
  '평온함'|'설렘'|'따뜻함'|'신비로움'|'그리움'|'희망'
  |'기쁨'|'감탄'|'호기심'|'애틋함'|'상쾌함'|'외로움'|'용기'|'아쉬움';
export type GreenhouseReflectionReason='scene'|'change'|'relationship'|'memory';
export type GreenhouseReflectionStyle='visual'|'language'|'inner'|'share';

export interface GreenhousePlantReflectionRequest{
  plantId:string;
  plantName:string;
  plantDescription:string;
  observationPoint:string;
  question:string;
  answer:string;
}

export interface GreenhousePlantReflectionAnalysis{
  emotion:GreenhouseReflectionEmotion;
  reasonCategory:GreenhouseReflectionReason;
  recordStyle:GreenhouseReflectionStyle;
  keywords:string[];
  reflectionTitle:string;
  shortReflection:string;
}

export interface GreenhousePlantReflectionResponse{
  source:GreenhouseReflectionSource;
  analysis:GreenhousePlantReflectionAnalysis;
}

export interface GreenhouseReflectionRecord{
  plantId:string;
  plantName:string;
  emotion:string;
  reasonCategory:'scene'|'change'|'relationship'|'memory';
  reasonText:string;
  recordStyle:'visual'|'language'|'inner'|'share';
  userAnswer?:string;
  keywords?:string[];
  reflectionTitle?:string;
  shortReflection?:string;
}

export interface GreenhouseRuleAnalysis{
  dominantEmotion:string;
  dominantReasonCategory:'scene'|'change'|'relationship'|'memory';
  dominantRecordStyle:'visual'|'language'|'inner'|'share';
  representativePlantId:string;
  representativePlantName:string;
  representativePlantSymbolism:string[];
}

export interface GreenhouseNarrativeAnalysis{
  frequentEmotion:{title:string;description:string};
  natureValue:{title:string;description:string};
  recordStyle:{title:string;description:string};
  representativePlant:{plantId:string;plantName:string;reason:string};
  memoryLetter:string;
}

export interface StoredGreenhouseAnalysis{
  stage:GreenhouseAnalysisStage;
  source:GreenhouseAnalysisSource;
  generatedAt:string;
  analysis:GreenhouseNarrativeAnalysis;
}

export interface GreenhouseAnalysisRequest{
  stage:GreenhouseAnalysisStage;
  records:GreenhouseReflectionRecord[];
  ruleAnalysis:GreenhouseRuleAnalysis;
  previousAnalysis?:GreenhouseNarrativeAnalysis;
}

export interface GreenhouseAnalysisResponse{
  source:GreenhouseAnalysisSource;
  analysis:GreenhouseNarrativeAnalysis;
}
