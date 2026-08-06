import { GARDEN_FLOWER_IDS, type GardenFlowerId } from './personal-farm.js';

export interface FlowerInterestRecord {
  flowerId: GardenFlowerId;
  infoViewCount: number;
  totalInfoViewSeconds: number;
  nearbyVisitCount: number;
  totalNearbySeconds: number;
  revisitCount: number;
  interestScore: number;
  lastInteractedAt?: string;
}

export interface FlowerInterestDelta {
  eventId:string;
  flowerId:GardenFlowerId;
  infoViewCount?:number;
  totalInfoViewSeconds?:number;
  nearbyVisitCount?:number;
  totalNearbySeconds?:number;
  revisitCount?:number;
}

export interface GardenNatureProfile {
  flowerInterests:FlowerInterestRecord[];
}

export const FLOWER_INTEREST_WEIGHTS = {
  infoViewOpen: 3,
  infoViewSecond: 0.5,
  nearbyEnter: 1,
  nearbySecond: 0.2,
  revisit: 2,
} as const;

export const isGardenFlowerId = (value: unknown): value is GardenFlowerId =>
  typeof value === 'string' && (GARDEN_FLOWER_IDS as readonly string[]).includes(value);

export const calculateFlowerInterestScore = (record: Pick<FlowerInterestRecord, 'infoViewCount' | 'totalInfoViewSeconds' | 'nearbyVisitCount' | 'totalNearbySeconds' | 'revisitCount'>): number =>
  record.infoViewCount * FLOWER_INTEREST_WEIGHTS.infoViewOpen +
  record.totalInfoViewSeconds * FLOWER_INTEREST_WEIGHTS.infoViewSecond +
  record.nearbyVisitCount * FLOWER_INTEREST_WEIGHTS.nearbyEnter +
  record.totalNearbySeconds * FLOWER_INTEREST_WEIGHTS.nearbySecond +
  record.revisitCount * FLOWER_INTEREST_WEIGHTS.revisit;
