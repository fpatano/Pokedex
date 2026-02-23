import type { SearchResponse } from './types';

type CacheEntry = {
  expiresAt: number;
  value: SearchResponse;
};

const TTL_MS = 60_000;
const queryCache = new Map<string, CacheEntry>();

export function getCachedQuery(query: string): SearchResponse | null {
  const key = query.trim().toLowerCase();
  const hit = queryCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    queryCache.delete(key);
    return null;
  }
  return hit.value;
}

export function setCachedQuery(query: string, value: SearchResponse): void {
  const key = query.trim().toLowerCase();
  queryCache.set(key, {
    expiresAt: Date.now() + TTL_MS,
    value,
  });
}
