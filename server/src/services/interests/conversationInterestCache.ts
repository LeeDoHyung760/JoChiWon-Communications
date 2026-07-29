import { env } from '../../config/env.js';
import type { InterestId } from './interestCatalog.js';

export interface CachedConversationInterest {
  userId: string;
  roomId: string;
  keywords: Array<{ id: InterestId; confidence: number; source: 'conversation' }>;
  updatedAt: Date;
  expiresAt: Date;
}
export interface ConversationInterestCache {
  get(roomId: string, userId: string): CachedConversationInterest | undefined;
  merge(roomId: string, userId: string, keywords: CachedConversationInterest['keywords']): void;
  cleanup(now?: Date): number;
}

export class MemoryConversationInterestCache implements ConversationInterestCache {
  private readonly entries = new Map<string, CachedConversationInterest>();
  constructor(
    private readonly ttlMs = env.CONVERSATION_INTEREST_CACHE_TTL_MS,
    private readonly maxItems = env.CONVERSATION_INTEREST_CACHE_MAX_ITEMS,
    private readonly clock = () => new Date(),
  ) {}
  private key(roomId: string, userId: string) { return `${roomId}:${userId}`; }
  get(roomId: string, userId: string) {
    const key = this.key(roomId, userId), value = this.entries.get(key);
    if (!value) return undefined;
    if (value.expiresAt.getTime() <= this.clock().getTime()) { this.entries.delete(key); return undefined; }
    return { ...value, keywords: value.keywords.map(item => ({ ...item })) };
  }
  merge(roomId: string, userId: string, keywords: CachedConversationInterest['keywords']) {
    if (!keywords.length) return;
    this.cleanup();
    const now = this.clock(), previous = this.get(roomId, userId);
    const merged = new Map(previous?.keywords.map(item => [item.id, item]) ?? []);
    keywords.forEach(item => {
      const old = merged.get(item.id);
      merged.set(item.id, { ...item, confidence: Math.min(0.95, (old?.confidence ?? 0.35) + 0.15) });
    });
    if (!this.entries.has(this.key(roomId, userId)) && this.entries.size >= this.maxItems) {
      const oldest = [...this.entries.entries()].sort((a, b) => a[1].updatedAt.getTime() - b[1].updatedAt.getTime())[0]?.[0];
      if (oldest) this.entries.delete(oldest);
    }
    this.entries.set(this.key(roomId, userId), {
      roomId, userId, keywords: [...merged.values()], updatedAt: now,
      expiresAt: new Date(now.getTime() + this.ttlMs),
    });
  }
  cleanup(now = this.clock()) {
    let removed = 0;
    this.entries.forEach((value, key) => {
      if (value.expiresAt.getTime() <= now.getTime()) { this.entries.delete(key); removed += 1; }
    });
    return removed;
  }
  get size() { return this.entries.size; }
}
export const conversationInterestCache = new MemoryConversationInterestCache();

