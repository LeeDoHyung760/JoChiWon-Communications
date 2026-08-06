import type { FlowerInterestRecord } from '../../shared/flower-interest';
import { gardenFlowerMissions } from '../data/gardenFlowerMissions';

export interface FlowerProfileCard extends FlowerInterestRecord {
  displayName: string;
  meaning: string;
  description: string;
}

const meanings: Record<string, string> = {
  hydrangea: '진심, 변덕, 인내',
  tulip: '사랑, 고백, 열정',
  iris: '좋은 소식, 희망',
  camellia: '애정, 겸손, 자랑',
  sunflower: '숭배, 기다림, 밝은 마음',
};

export function topFlowerInterests(records: FlowerInterestRecord[], limit = 5): FlowerProfileCard[] {
  return records
    .filter((record) => record && typeof record.flowerId === 'string')
    .map((record) => {
      const mission = gardenFlowerMissions.find((item) => item.id === record.flowerId);
      return { ...record, displayName: mission?.name ?? record.flowerId, meaning: meanings[record.flowerId] ?? '자연과 함께한 기억', description: mission?.description ?? '수목원에서 남긴 꽃의 관심 기록입니다.' };
    })
    .sort((a, b) => b.interestScore - a.interestScore || b.totalInfoViewSeconds - a.totalInfoViewSeconds || b.infoViewCount - a.infoViewCount || a.flowerId.localeCompare(b.flowerId))
    .slice(0, limit);
}

export const formatFlowerSeconds = (seconds: number) => {
  const safe = Math.max(0, Math.round(seconds));
  if (safe < 60) return `${safe}초`;
  return `${Math.floor(safe / 60)}분 ${safe % 60}초`;
};

