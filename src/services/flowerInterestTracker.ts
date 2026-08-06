import { calculateFlowerInterestScore, type FlowerInterestRecord } from '../../shared/flower-interest';
import { gameEvents } from '../game/events';
import type { PersonalFarmProgressDto } from '../../shared/personal-farm';

type Delta = { eventId: string; flowerId: string; infoViewCount?: number; totalInfoViewSeconds?: number; nearbyVisitCount?: number; totalNearbySeconds?: number; revisitCount?: number };
const API = import.meta.env.VITE_API_BASE_URL ?? '/api';
const FLOWER_ID_BY_PLANT_ID: Record<string, string> = {
  'flower-01':'magnolia','flower-02':'adonis','flower-03':'azalea','flower-04':'hydrangea',
  'flower-05':'tulip','flower-06':'iris','flower-07':'lily','flower-08':'camellia',
  'flower-09':'sunflower','flower-10':'gujeolcho','flower-11':'hibiscus','flower-12':'bird-of-paradise',
  'peach-tree':'peach-tree','red-tree':'maple-tree',
};
const canonicalFlowerId = (id: string) => FLOWER_ID_BY_PLANT_ID[id] ?? id;

export class FlowerInterestTracker {
  private readonly records = new Map<string, FlowerInterestRecord>();
  private readonly pending: Delta[] = [];
  private info?: { flowerId: string; startedAt: number };
  private nearby?: { flowerId: string; startedAt: number; lastEndedAt: number };
  private lastVisited?: string;
  private readonly visitedFlowers = new Set<string>();
  private lastVisitEndedAt = 0;
  private flushTimer?: number;

  constructor(private readonly authenticated: boolean) {}

  private queue(delta: Omit<Delta, 'eventId'>) {
    this.pending.push({ ...delta, eventId: crypto.randomUUID() });
    const current = this.records.get(delta.flowerId) ?? { flowerId: delta.flowerId as FlowerInterestRecord['flowerId'], infoViewCount: 0, totalInfoViewSeconds: 0, nearbyVisitCount: 0, totalNearbySeconds: 0, revisitCount: 0, interestScore: 0 };
    current.infoViewCount += delta.infoViewCount ?? 0; current.totalInfoViewSeconds += delta.totalInfoViewSeconds ?? 0;
    current.nearbyVisitCount += delta.nearbyVisitCount ?? 0; current.totalNearbySeconds += delta.totalNearbySeconds ?? 0; current.revisitCount += delta.revisitCount ?? 0;
    current.interestScore = calculateFlowerInterestScore(current);
    current.lastInteractedAt = new Date().toISOString(); this.records.set(delta.flowerId, current);
    const snapshot = this.snapshot(); window.dispatchEvent(new CustomEvent('flower-interest-updated', { detail: snapshot })); gameEvents.emit('flower-interest-profile-changed', snapshot);
    if (this.authenticated && !this.flushTimer) this.flushTimer = window.setTimeout(() => void this.flush(), 1500);
  }
  finishInfo(now = Date.now()) {
    if (!this.info) return;
    const seconds = Math.min(300, (now - this.info.startedAt) / 1000);
    if (seconds >= 1) this.queue({ flowerId: this.info.flowerId, totalInfoViewSeconds: seconds });
    this.info = undefined;
  }
  finishNearby(now = Date.now()) {
    if (!this.nearby) return;
    const seconds = Math.min(600, (now - this.nearby.startedAt) / 1000);
    if (seconds >= 2) this.queue({ flowerId: this.nearby.flowerId, totalNearbySeconds: seconds });
    this.lastVisitEndedAt = now;
    this.nearby = undefined;
  }
  observe(flowerId: string) {
    flowerId = canonicalFlowerId(flowerId);
    this.finishInfo();
    this.info = { flowerId, startedAt: Date.now() };
    this.queue({ flowerId, infoViewCount: 1 });
  }
  enter(flowerId: string) {
    flowerId = canonicalFlowerId(flowerId);
    if (this.nearby?.flowerId === flowerId) return;
    this.finishNearby();
    const now = Date.now();
    if (now - this.lastVisitEndedAt < 5000) return;
    const revisit = this.visitedFlowers.has(flowerId) && (now - this.lastVisitEndedAt >= 30000 || this.lastVisited !== flowerId);
    this.nearby = { flowerId, startedAt: now, lastEndedAt: this.lastVisitEndedAt };
    this.queue({ flowerId, nearbyVisitCount: 1, ...(revisit ? { revisitCount: 1 } : {}) });
    this.lastVisited = flowerId;
    this.visitedFlowers.add(flowerId);
  }
  leave() { this.finishNearby(); }
  close() { this.finishInfo(); this.finishNearby(); void this.flush(); }
  discard() { this.pending.length = 0; this.info = undefined; this.nearby = undefined; this.records.clear(); if (this.flushTimer) window.clearTimeout(this.flushTimer); this.flushTimer = undefined; }
  snapshot(): FlowerInterestRecord[] { return [...this.records.values()]; }
  async flush() {
    if (!this.authenticated || !this.pending.length) return;
    const events = this.pending.splice(0, 100);
    this.flushTimer = undefined;
    try {
      const response = await fetch(`${API}/account/me/garden/flower-interest`, { method: 'POST', credentials: 'include', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ events }) });
      if (!response.ok) this.pending.unshift(...events);
      else {
        const body = await response.json() as { data?: { flowerInterests?: FlowerInterestRecord[];personalFarmProgress?:PersonalFarmProgressDto } };
        if(body.data?.personalFarmProgress)window.dispatchEvent(new CustomEvent<PersonalFarmProgressDto>('personal-farm-progress-refresh',{detail:body.data.personalFarmProgress}));
        for (const record of body.data?.flowerInterests ?? []) this.records.set(record.flowerId, record);
        const snapshot = this.snapshot(); window.dispatchEvent(new CustomEvent('flower-interest-updated', { detail: snapshot })); gameEvents.emit('flower-interest-profile-changed', snapshot);
      }
    } catch { this.pending.unshift(...events); }
  }
  async hydrate() {
    if (!this.authenticated) return;
    window.dispatchEvent(new CustomEvent('flower-interest-load-state', { detail: 'loading' }));
    try {
      const response = await fetch(`${API}/account/me/garden/flower-interest`, { credentials: 'include' });
      if (!response.ok) { window.dispatchEvent(new CustomEvent('flower-interest-load-state', { detail: response.status === 401 ? 'expired' : 'error' })); return; }
      const body = await response.json() as { data?: { flowerInterests?: FlowerInterestRecord[] } };
      this.records.clear(); for (const record of body.data?.flowerInterests ?? []) this.records.set(record.flowerId, record);
      const snapshot = this.snapshot(); window.dispatchEvent(new CustomEvent('flower-interest-updated', { detail: snapshot })); gameEvents.emit('flower-interest-profile-changed', snapshot);
      window.dispatchEvent(new CustomEvent('flower-interest-load-state', { detail: 'ready' }));
    } catch { window.dispatchEvent(new CustomEvent('flower-interest-load-state', { detail: 'error' })); }
  }
}

let activeTracker: FlowerInterestTracker | undefined;
export const getFlowerInterestSnapshot = () => activeTracker?.snapshot() ?? [];

export function mountFlowerInterestTracker(authenticated: boolean) {
  const tracker = new FlowerInterestTracker(authenticated);
  activeTracker?.discard(); activeTracker = tracker;
  void tracker.hydrate();
  const observe = (id: string) => tracker.observe(id);
  const nearby = (value: { kind: string; plantId?: string } | null) => value?.kind === 'plant' && value.plantId ? tracker.enter(value.plantId) : tracker.leave();
  const mapLeaving = () => tracker.close();
  const visibility = () => { if (document.hidden) { tracker.finishInfo(); tracker.finishNearby(); void tracker.flush(); } };
  gameEvents.on('greenhouse-observe-plant', observe); gameEvents.on('greenhouse-nearby-changed', nearby); gameEvents.on('map-travel-started', mapLeaving);
  document.addEventListener('visibilitychange', visibility); window.addEventListener('beforeunload', tracker.close.bind(tracker));
  return () => { tracker.close(); if (activeTracker === tracker) activeTracker = undefined; gameEvents.off('greenhouse-observe-plant', observe); gameEvents.off('greenhouse-nearby-changed', nearby); gameEvents.off('map-travel-started', mapLeaving); document.removeEventListener('visibilitychange', visibility); };
}
