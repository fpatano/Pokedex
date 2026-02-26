import type { CoachResponse } from '@/lib/coach/contract';
import type { TournamentRuntimeConfig } from '@/lib/coach/runtime';

type CacheEntry = { expiresAt: number; response: CoachResponse };
type RateLimitEntry = { startedAt: number; count: number };

type CircuitState = {
  consecutiveFailures: number;
  openUntilMs: number;
};

const idempotencyCache = new Map<string, CacheEntry>();
const rateLimit = new Map<string, RateLimitEntry>();
const circuit: CircuitState = { consecutiveFailures: 0, openUntilMs: 0 };

function now(): number {
  return Date.now();
}

function sweepMaps(timestamp: number): void {
  for (const [key, value] of idempotencyCache.entries()) {
    if (value.expiresAt <= timestamp) idempotencyCache.delete(key);
  }
}

export function getIdempotentResponse(cacheKey: string, timestamp = now()): CoachResponse | null {
  sweepMaps(timestamp);
  const hit = idempotencyCache.get(cacheKey);
  if (!hit) return null;
  if (hit.expiresAt <= timestamp) {
    idempotencyCache.delete(cacheKey);
    return null;
  }
  return hit.response;
}

export function setIdempotentResponse(cacheKey: string, response: CoachResponse, ttlMs: number, timestamp = now()): void {
  idempotencyCache.set(cacheKey, {
    response,
    expiresAt: timestamp + ttlMs,
  });
}

export function consumeRateLimitToken(clientKey: string, cfg: TournamentRuntimeConfig, timestamp = now()): boolean {
  const current = rateLimit.get(clientKey);
  if (!current || timestamp - current.startedAt >= cfg.rateLimitWindowMs) {
    rateLimit.set(clientKey, { startedAt: timestamp, count: 1 });
    return true;
  }

  if (current.count >= cfg.rateLimitMax) {
    return false;
  }

  current.count += 1;
  rateLimit.set(clientKey, current);
  return true;
}

export function isCircuitOpen(timestamp = now()): boolean {
  return circuit.openUntilMs > timestamp;
}

export function markTournamentSuccess(): void {
  circuit.consecutiveFailures = 0;
  circuit.openUntilMs = 0;
}

export function markTournamentFailure(cfg: TournamentRuntimeConfig, timestamp = now()): void {
  circuit.consecutiveFailures += 1;
  if (circuit.consecutiveFailures >= cfg.circuitFailureThreshold) {
    circuit.openUntilMs = timestamp + cfg.circuitCooldownMs;
    circuit.consecutiveFailures = 0;
  }
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error('TOURNAMENT_TIMEOUT')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function wait(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function resetTournamentHardeningState(): void {
  idempotencyCache.clear();
  rateLimit.clear();
  circuit.consecutiveFailures = 0;
  circuit.openUntilMs = 0;
}
