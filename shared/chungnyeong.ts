export type ChungnyeongIntent =
  | 'FIND_PERSON'
  | 'FIND_RECRUITMENT'
  | 'RECOMMEND_ACTIVITY'
  | 'CHECK_APPLICATION'
  | 'GUIDE_SPACE';

export type ChungnyeongCard = {
  type: 'person' | 'recruitment' | 'request' | 'space';
  id: string;
  title: string;
  description: string;
  matchScore: number | null;
  tags: string[];
  actions: Array<'PROFILE' | 'CHAT_REQUEST' | 'DETAIL' | 'PROFILE_REQUEST' | 'TRAVEL'>;
};

export type ChungnyeongChatResponse = {
  message: string;
  intent: ChungnyeongIntent;
  cards: ChungnyeongCard[];
  suggestedReplies: string[];
  source: 'openai' | 'rules';
};

