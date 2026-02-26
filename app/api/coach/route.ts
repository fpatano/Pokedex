import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  CoachErrorResponseSchema,
  CoachRequestSchema,
  COACH_CORE_CONTRACT_VERSION,
  type CoachResponse,
} from '@/lib/coach/contract';
import { buildCoachResponse } from '@/lib/coach/service';
import { logTournamentEvent } from '@/lib/coach/observability';
import { resolveTournamentRuntimeConfig } from '@/lib/coach/runtime';
import {
  consumeRateLimitToken,
  getIdempotentResponse,
  isCircuitOpen,
  markTournamentFailure,
  markTournamentSuccess,
  setIdempotentResponse,
  wait,
  withTimeout,
} from '@/lib/coach/tournamentHardening';

function trace(event: string, data: Record<string, unknown>) {
  // Minimal trace logging for deterministic gate verification.
  console.info(`[coach-core] ${event}`, data);
}

function tournamentErrorResponse(status: 429 | 503, error: string, errorClass: 'rate_limited' | 'tournament_unavailable') {
  const body = CoachErrorResponseSchema.parse({
    error,
    contractVersion: COACH_CORE_CONTRACT_VERSION,
    code: 'INVALID_REQUEST',
  });

  return NextResponse.json(body, {
    status,
    headers: {
      'x-coach-variant': 'tournament',
      'x-coach-error-class': errorClass,
    },
  });
}

export async function POST(req: NextRequest) {
  const traceId = req.headers.get('x-trace-id') ?? 'no-trace-id';
  const runtime = resolveTournamentRuntimeConfig();
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    trace('invalid_json', { traceId });
    return NextResponse.json(
      {
        error: 'Invalid JSON body',
        contractVersion: COACH_CORE_CONTRACT_VERSION,
        code: 'INVALID_REQUEST',
      },
      { status: 400 }
    );
  }

  const parsed = CoachRequestSchema.safeParse(body);

  if (!parsed.success) {
    trace('invalid_contract', { traceId });
    return NextResponse.json(
      {
        error: 'Invalid coach request contract',
        contractVersion: COACH_CORE_CONTRACT_VERSION,
        code: 'INVALID_REQUEST',
      },
      { status: 400 }
    );
  }

  if (!runtime.enabled) {
    const response = buildCoachResponse(parsed.data);
    trace('response', {
      traceId,
      mode: response.mode,
      confidence: response.confidence,
      confidenceLabel: response.confidenceLabel,
      missingSingles: response.missingSinglesExport.items.length,
      fallbackReason: response.fallbackReason,
      archetype: response.archetype,
      variant: 'standard',
    });
    return NextResponse.json(response, { status: 200, headers: { 'x-coach-variant': 'standard' } });
  }

  const clientKey = req.headers.get('x-forwarded-for') ?? traceId;
  if (!consumeRateLimitToken(clientKey, runtime)) {
    logTournamentEvent('tournament_rate_limited', { traceId, clientKey, errorClass: 'rate_limited' });
    return tournamentErrorResponse(429, 'Rate limit exceeded for tournament variant', 'rate_limited');
  }

  if (isCircuitOpen()) {
    logTournamentEvent('tournament_circuit_open', { traceId, errorClass: 'tournament_unavailable' });
    return tournamentErrorResponse(503, 'Tournament path temporarily unavailable', 'tournament_unavailable');
  }

  const idempotencyKey = req.headers.get('x-idempotency-key');
  const payloadHash = createHash('sha256').update(JSON.stringify(parsed.data)).digest('hex');
  const cacheKey = idempotencyKey ? `${idempotencyKey}:${payloadHash}` : '';

  if (cacheKey) {
    const cached = getIdempotentResponse(cacheKey);
    if (cached) {
      logTournamentEvent('tournament_idempotency_hit', { traceId });
      return NextResponse.json(cached, { status: 200, headers: { 'x-coach-variant': 'tournament' } });
    }
  }

  logTournamentEvent('tournament_request', { traceId, timeoutMs: runtime.requestTimeoutMs, maxRetries: runtime.maxRetries });

  let lastError: unknown = null;
  const attempts = runtime.maxRetries + 1;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response: CoachResponse = await withTimeout(Promise.resolve(buildCoachResponse(parsed.data)), runtime.requestTimeoutMs);
      markTournamentSuccess();

      if (cacheKey) {
        setIdempotentResponse(cacheKey, response, runtime.idempotencyTtlMs);
      }

      logTournamentEvent('tournament_success', { traceId, attempt, mode: response.mode, confidence: response.confidence });

      return NextResponse.json(response, { status: 200, headers: { 'x-coach-variant': 'tournament' } });
    } catch (error) {
      lastError = error;
      markTournamentFailure(runtime);
      if (attempt < attempts) {
        logTournamentEvent('tournament_retry', { traceId, attempt, reason: error instanceof Error ? error.message : 'UNKNOWN' });
        await wait(runtime.retryBackoffMs);
        continue;
      }
    }
  }

  logTournamentEvent('tournament_failure', {
    traceId,
    reason: lastError instanceof Error ? lastError.message : 'UNKNOWN',
    errorClass: 'tournament_unavailable',
  });

  return tournamentErrorResponse(503, 'Tournament request failed after retries', 'tournament_unavailable');
}
