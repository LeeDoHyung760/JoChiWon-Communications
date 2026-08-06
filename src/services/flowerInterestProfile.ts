import type { FlowerInterestRecord } from '../../shared/flower-interest';
import type {GardenFlowerId} from '../../shared/personal-farm';
import {FLOWER_CATALOG} from '../../shared/flower-catalog';

export interface FlowerProfileCard extends FlowerInterestRecord {
  displayName: string;
  meaning: string;
  description: string;
}

export interface FlowerCatalogEntry {
  flowerId:GardenFlowerId;
  plantId:string;
  displayName:string;
  meaning:string;
  description:string;
}

export const flowerCatalog:readonly FlowerCatalogEntry[]=FLOWER_CATALOG.map(entry=>({
  ...entry,
  meaning:entry.meanings.join(', '),
}));

export const flowerCatalogByFlowerId=new Map(flowerCatalog.map(entry=>[entry.flowerId,entry]));
export const flowerCatalogByPlantId=new Map(flowerCatalog.map(entry=>[entry.plantId,entry]));

export function topFlowerInterests(records: FlowerInterestRecord[], limit = 5): FlowerProfileCard[] {
  return records
    .filter((record) => record && typeof record.flowerId === 'string')
    .map((record) => {
      const catalog=flowerCatalogByFlowerId.get(record.flowerId as GardenFlowerId);
      return {...record,displayName:catalog?.displayName??record.flowerId,meaning:catalog?.meaning??'자연과 함께한 기억',description:catalog?.description??'수목원에서 함께한 꽃의 관찰 기록입니다.'};
    })
    .sort((a, b) => b.interestScore - a.interestScore || b.totalInfoViewSeconds - a.totalInfoViewSeconds || b.infoViewCount - a.infoViewCount || a.flowerId.localeCompare(b.flowerId))
    .slice(0, limit);
}

export const formatFlowerSeconds = (seconds: number) => {
  const safe = Math.max(0, Math.round(seconds));
  if (safe < 60) return `${safe}초`;
  return `${Math.floor(safe / 60)}분 ${safe % 60}초`;
};
