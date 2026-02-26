#!/usr/bin/env node

const int = (name, fallback) => {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be an integer`);
  return parsed;
};

const enabled = process.env.TOURNAMENT_VARIANT_ENABLED ?? 'false';
if (!['true', 'false'].includes(enabled)) {
  throw new Error('TOURNAMENT_VARIANT_ENABLED must be true|false');
}

const timeoutMs = int('TOURNAMENT_REQUEST_TIMEOUT_MS', 1200);
const retries = int('TOURNAMENT_MAX_RETRIES', 1);
const backoffMs = int('TOURNAMENT_RETRY_BACKOFF_MS', 75);
const rateWindow = int('TOURNAMENT_RATE_LIMIT_WINDOW_MS', 60000);
const rateMax = int('TOURNAMENT_RATE_LIMIT_MAX', 30);
const idemTtl = int('TOURNAMENT_IDEMPOTENCY_TTL_MS', 300000);
const circuitFailures = int('TOURNAMENT_CIRCUIT_FAILURE_THRESHOLD', 5);

if (timeoutMs < 200 || timeoutMs > 10000) throw new Error('TOURNAMENT_REQUEST_TIMEOUT_MS out of range');
if (retries < 0 || retries > 3) throw new Error('TOURNAMENT_MAX_RETRIES out of range');
if (backoffMs < 0 || backoffMs > 2000) throw new Error('TOURNAMENT_RETRY_BACKOFF_MS out of range');
if (rateWindow < 1000 || rateMax < 1) throw new Error('Tournament rate limits out of range');
if (idemTtl < timeoutMs) throw new Error('TOURNAMENT_IDEMPOTENCY_TTL_MS must be >= timeout');
if (circuitFailures < 1 || circuitFailures > 20) throw new Error('TOURNAMENT_CIRCUIT_FAILURE_THRESHOLD out of range');

console.log('tournament env validation passed');
