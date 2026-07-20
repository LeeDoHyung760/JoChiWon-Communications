import { z } from 'zod';
import { env } from '../../config/env.js';
import type { AddressSearchResult, PlaceCandidate } from '../../types/recommendation.js';
import { ExternalProviderError, type ExternalErrorKind, type PlaceSearchProvider } from '../types.js';

const kakaoPlaceSchema = z.object({
  id: z.string(), place_name: z.string(), category_name: z.string(), address_name: z.string(),
  road_address_name: z.string(), phone: z.string(), place_url: z.string().url(),
  x: z.string(), y: z.string(), distance: z.string(),
});
const keywordResponseSchema = z.object({ documents: z.array(kakaoPlaceSchema) });
const kakaoAddressSchema = z.object({
  address_name: z.string(), x: z.string(), y: z.string(),
  address: z.object({ address_name: z.string(), zip_code: z.string().optional().default('') }).nullable().optional(),
  road_address: z.object({ address_name: z.string(), building_name: z.string(), zone_no: z.string() }).nullable().optional(),
});
const addressResponseSchema = z.object({ documents: z.array(kakaoAddressSchema) });

export class KakaoPlaceProvider implements PlaceSearchProvider {
  constructor() { if (!env.KAKAO_REST_API_KEY) throw new ExternalProviderError('kakao', 'missing_key'); }

  private async request(path: string, params: URLSearchParams): Promise<unknown> {
    const url = new URL(path, env.KAKAO_LOCAL_BASE_URL);
    url.search = params.toString();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.KAKAO_LOCAL_TIMEOUT_MS);
    try {
      const response = await fetch(url, { headers: { Authorization: `KakaoAK ${env.KAKAO_REST_API_KEY}` }, signal: controller.signal });
      if (!response.ok) {
        const kind: ExternalErrorKind = response.status === 401 || response.status === 403 ? 'authentication' : response.status === 429 ? 'rate_limit' : 'unknown';
        let providerCode:string|number|undefined,providerMessage:string|undefined;
        try { const body=await response.json() as {errorType?:string;code?:number;message?:string};providerCode=body.code??body.errorType;providerMessage=body.message?.slice(0,300) } catch { /* invalid error body */ }
        throw new ExternalProviderError('kakao', kind, {status:response.status,providerCode,providerMessage,endpoint:path,query:params.get('query')?.slice(0,env.MAX_RECOMMENDATION_QUERY_LENGTH)});
      }
      return await response.json();
    } catch (error) {
      if (error instanceof ExternalProviderError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') throw new ExternalProviderError('kakao', 'timeout');
      if (error instanceof TypeError) throw new ExternalProviderError('kakao', 'network');
      throw new ExternalProviderError('kakao', 'unknown');
    } finally { clearTimeout(timer); }
  }

  private async keywordRequest(query: string, options: { longitude?: number; latitude?: number; radius?: number; size?: number }): Promise<PlaceCandidate[]> {
    const params = new URLSearchParams({ query, size: String(Math.min(15, Math.max(1, options.size ?? 15))) });
    if (Number.isFinite(options.longitude) && Number.isFinite(options.latitude)) {
      params.set('x', String(options.longitude)); params.set('y', String(options.latitude));
      params.set('radius', String(Math.min(20000, Math.max(0, options.radius ?? env.DEFAULT_SEARCH_RADIUS_METERS))));
      params.set('sort','distance');
    }else params.set('sort','accuracy');
    const parsed = keywordResponseSchema.safeParse(await this.request('/v2/local/search/keyword.json', params));
    if (!parsed.success) throw new ExternalProviderError('kakao', 'response_format');
    return parsed.data.documents.map((item): PlaceCandidate => ({ id: item.id, name: item.place_name.trim(), category: item.category_name.trim(), address: item.address_name.trim(), roadAddress: item.road_address_name.trim(), phone: item.phone.trim(), externalUrl: item.place_url, longitude: Number(item.x), latitude: Number(item.y), distanceMeters: Number(item.distance || 0), source: 'kakao' }));
  }

  async searchPlacesByKeyword(query: string, options: { longitude?: number; latitude?: number; radius?: number; size?: number } = {}): Promise<PlaceCandidate[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length > env.MAX_RECOMMENDATION_QUERY_LENGTH) throw new ExternalProviderError('kakao', 'response_format');
    return [...new Map((await this.keywordRequest(trimmed,options)).filter(place=>place.id&&place.name&&(place.address||place.roadAddress)&&Number.isFinite(place.longitude)&&Number.isFinite(place.latitude)).map(place=>[place.id,place])).values()];
  }

  async searchKeywords(keywords: string[], options = {}) {
    const valid = keywords.map((keyword) => keyword.trim()).filter(Boolean).slice(0, 5);
    if (!valid.length) throw new ExternalProviderError('kakao', 'response_format');
    const results = await Promise.all(valid.map((keyword) => this.searchPlacesByKeyword(keyword, options)));
    const unique=[...new Map(results.flat().map((place) => [place.id, place])).values()];
    const franchises=new Set<string>();
    return unique.filter(place=>{const base=place.name.replace(/\s+(조치원|세종|조치원역|세종시)?점$/,'').trim();if(base===place.name)return true;if(franchises.has(base))return false;franchises.add(base);return true});
  }

  async searchAddress(query: string): Promise<AddressSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length > env.MAX_RECOMMENDATION_QUERY_LENGTH) throw new ExternalProviderError('kakao', 'response_format');
    const parsed = addressResponseSchema.safeParse(await this.request('/v2/local/search/address.json', new URLSearchParams({ query: trimmed, size: '10' })));
    if (!parsed.success) throw new ExternalProviderError('kakao', 'response_format');
    return parsed.data.documents.map((item): AddressSearchResult => ({ address: item.address?.address_name ?? item.address_name, roadAddress: item.road_address?.address_name ?? '', buildingName: item.road_address?.building_name ?? '', postalCode: item.road_address?.zone_no ?? item.address?.zip_code ?? '', longitude: Number(item.x), latitude: Number(item.y), source: 'kakao' })).filter((item) => (item.address || item.roadAddress) && Number.isFinite(item.longitude) && Number.isFinite(item.latitude));
  }
}
