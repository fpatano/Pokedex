import { z } from 'zod';

const EnvSchema = z
  .object({
    TOURNAMENT_VARIANT_ENABLED: z.enum(['true', 'false']).optional(),
    TOURNAMENT_REQUEST_TIMEOUT_MS: z.string().optional(),
    TOURNAMENT_MAX_RETRIES: z.string().optional(),
    TOURNAMENT_RETRY_BACKOFF_MS: z.string().optional(),
    TOURNAMENT_RATE_LIMIT_WINDOW_MS: z.string().optional(),
    TOURNAMENT_RATE_LIMIT_MAX: z.string().optional(),
    TOURNAMENT_IDEMPOTENCY_TTL_MS: z.string().optional(),
    TOURNAMENT_CIRCUIT_FAILURE_THRESHOLD: z.string().optional(),
    TOURNAMENT_CIRCUIT_COOLDOWN_MS: z.string().optional(),
  })
  .strict();

function parseIntWithDefault(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export type TournamentRuntimeConfig = {
  enabled: boolean;
  requestTimeoutMs: number;
  maxRetries: number;
  retryBackoffMs: number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  idempotencyTtlMs: number;
  circuitFailureThreshold: number;
  circuitCooldownMs: number;
};

export function resolveTournamentRuntimeConfig(env: NodeJS.ProcessEnv = process.env): TournamentRuntimeConfig {
  const raw = EnvSchema.parse({
    TOURNAMENT_VARIANT_ENABLED: env.TOURNAMENT_VARIANT_ENABLED,
    TOURNAMENT_REQUEST_TIMEOUT_MS: env.TOURNAMENT_REQUEST_TIMEOUT_MS,
    TOURNAMENT_MAX_RETRIES: env.TOURNAMENT_MAX_RETRIES,
    TOURNAMENT_RETRY_BACKOFF_MS: env.TOURNAMENT_RETRY_BACKOFF_MS,
    TOURNAMENT_RATE_LIMIT_WINDOW_MS: env.TOURNAMENT_RATE_LIMIT_WINDOW_MS,
    TOURNAMENT_RATE_LIMIT_MAX: env.TOURNAMENT_RATE_LIMIT_MAX,
    TOURNAMENT_IDEMPOTENCY_TTL_MS: env.TOURNAMENT_IDEMPOTENCY_TTL_MS,
    TOURNAMENT_CIRCUIT_FAILURE_THRESHOLD: env.TOURNAMENT_CIRCUIT_FAILURE_THRESHOLD,
    TOURNAMENT_CIRCUIT_COOLDOWN_MS: env.TOURNAMENT_CIRCUIT_COOLDOWN_MS,
  });

  const cfg: TournamentRuntimeConfig = {
    enabled: raw.TOURNAMENT_VARIANT_ENABLED === 'true',
    requestTimeoutMs: parseIntWithDefault(raw.TOURNAMENT_REQUEST_TIMEOUT_MS, 1200),
    maxRetries: parseIntWithDefault(raw.TOURNAMENT_MAX_RETRIES, 1),
    retryBackoffMs: parseIntWithDefault(raw.TOURNAMENT_RETRY_BACKOFF_MS, 75),
    rateLimitWindowMs: parseIntWithDefault(raw.TOURNAMENT_RATE_LIMIT_WINDOW_MS, 60_000),
    rateLimitMax: parseIntWithDefault(raw.TOURNAMENT_RATE_LIMIT_MAX, 30),
    idempotencyTtlMs: parseIntWithDefault(raw.TOURNAMENT_IDEMPOTENCY_TTL_MS, 300_000),
    circuitFailureThreshold: parseIntWithDefault(raw.TOURNAMENT_CIRCUIT_FAILURE_THRESHOLD, 5),
    circuitCooldownMs: parseIntWithDefault(raw.TOURNAMENT_CIRCUIT_COOLDOWN_MS, 30_000),
  };

  if (cfg.requestTimeoutMs < 200 || cfg.requestTimeoutMs > 10_000) {
    throw new Error('Invalid tournament env: TOURNAMENT_REQUEST_TIMEOUT_MS must be between 200 and 10000');
  }
  if (cfg.maxRetries < 0 || cfg.maxRetries > 3) {
    throw new Error('Invalid tournament env: TOURNAMENT_MAX_RETRIES must be between 0 and 3');
  }
  if (cfg.retryBackoffMs < 0 || cfg.retryBackoffMs > 2_000) {
    throw new Error('Invalid tournament env: TOURNAMENT_RETRY_BACKOFF_MS must be between 0 and 2000');
  }
  if (cfg.rateLimitWindowMs < 1_000 || cfg.rateLimitMax < 1) {
    throw new Error('Invalid tournament env: rate limit bounds are out of range');
  }
  if (cfg.idempotencyTtlMs < cfg.requestTimeoutMs) {
    throw new Error('Invalid tournament env: TOURNAMENT_IDEMPOTENCY_TTL_MS must be >= TOURNAMENT_REQUEST_TIMEOUT_MS');
  }
  if (cfg.circuitFailureThreshold < 1 || cfg.circuitFailureThreshold > 20) {
    throw new Error('Invalid tournament env: TOURNAMENT_CIRCUIT_FAILURE_THRESHOLD must be between 1 and 20');
  }

  return cfg;
}
