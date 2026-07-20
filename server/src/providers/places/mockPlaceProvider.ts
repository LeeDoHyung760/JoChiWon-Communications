import mockPlaces from '../../data/mockPlaces.json' with { type: 'json' };
import type { AddressSearchResult, PlaceCandidate } from '../../types/recommendation.js';
import type { PlaceSearchProvider } from '../types.js';

export function normalizePlace(document: Record<string, unknown>): PlaceCandidate {
  return { id: String(document.id ?? ''), name: String(document.place_name ?? document.name ?? ''), category: String(document.category_name ?? document.category ?? ''), address: String(document.address_name ?? document.address ?? ''), roadAddress: String(document.road_address_name ?? document.roadAddress ?? ''), phone: String(document.phone ?? ''), externalUrl: String(document.place_url ?? document.externalUrl ?? ''), longitude: Number(document.x ?? document.longitude ?? 0), latitude: Number(document.y ?? document.latitude ?? 0), distanceMeters: Number(document.distance ?? document.distanceMeters ?? 0), source: document.source === 'kakao' ? 'kakao' : 'mock', tags: Array.isArray(document.tags) ? document.tags as string[] : undefined, intentTypes:Array.isArray(document.intentTypes)?document.intentTypes as PlaceCandidate['intentTypes']:undefined,zoneId:typeof document.zoneId==='string'?document.zoneId:undefined, groupFriendly: document.groupFriendly !== false };
}

export class MockPlaceProvider implements PlaceSearchProvider {
  async searchKeywords(_keywords: string[], _options?: { longitude?: number; latitude?: number; radius?: number; size?: number }) { return (mockPlaces as Array<Record<string, unknown>>).map(normalizePlace); }
  async searchAddress(_query: string): Promise<AddressSearchResult[]> { return []; }
}
