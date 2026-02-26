import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/coach/route';
import { COACH_CORE_CONTRACT_VERSION, CoachErrorResponseSchema, CoachResponseSchema } from '@/lib/coach/contract';
import { resetTournamentHardeningState } from '@/lib/coach/tournamentHardening';
import * as coachService from '@/lib/coach/service';

function buildRequest(body: unknown, headers?: Record<string, string>) {
  return new NextRequest('http://localhost:3000/api/coach', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('/api/coach tournament variant hardening', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    process.env.TOURNAMENT_VARIANT_ENABLED = 'true';
    process.env.TOURNAMENT_RATE_LIMIT_MAX = '1';
    process.env.TOURNAMENT_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.TOURNAMENT_REQUEST_TIMEOUT_MS = '1200';
    process.env.TOURNAMENT_MAX_RETRIES = '0';
    resetTournamentHardeningState();
  });

  it('returns tournament variant header and coach response when enabled', async () => {
    const res = await POST(
      buildRequest({
        contractVersion: COACH_CORE_CONTRACT_VERSION,
        intake: { objective: 'fast setup', favoriteTypes: ['Fire'] },
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('x-coach-variant')).toBe('tournament');
    const body = await res.json();
    expect(body.mode).toBe('coach');
    expect(body.meta).toBeUndefined();
    expect(CoachResponseSchema.parse(body)).toBeTruthy();
  });

  it('enforces rate limit in tournament path with strict body + header error class', async () => {
    const payload = {
      contractVersion: COACH_CORE_CONTRACT_VERSION,
      intake: { objective: 'fast setup', favoriteTypes: ['Fire'] },
    };

    const first = await POST(buildRequest(payload, { 'x-forwarded-for': 'client-a' }));
    const second = await POST(buildRequest(payload, { 'x-forwarded-for': 'client-a' }));

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(second.headers.get('x-coach-error-class')).toBe('rate_limited');

    const body = await second.json();
    expect(body).toMatchObject({
      code: 'INVALID_REQUEST',
      contractVersion: COACH_CORE_CONTRACT_VERSION,
    });
    expect(CoachErrorResponseSchema.parse(body)).toBeTruthy();
    expect(body.legacyCode).toBeUndefined();
  });

  it('serves cached response for same idempotency key + payload', async () => {
    process.env.TOURNAMENT_RATE_LIMIT_MAX = '10';
    resetTournamentHardeningState();

    const payload = {
      contractVersion: COACH_CORE_CONTRACT_VERSION,
      intake: { objective: 'control draw lock', favoriteTypes: ['Psychic'] },
    };

    const first = await POST(buildRequest(payload, { 'x-idempotency-key': 'idem-1', 'x-forwarded-for': 'client-b' }));
    const second = await POST(buildRequest(payload, { 'x-idempotency-key': 'idem-1', 'x-forwarded-for': 'client-b' }));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const body1 = await first.json();
    const body2 = await second.json();
    expect(body2).toStrictEqual(body1);
  });

  it('maps tournament availability failures to strict INVALID_REQUEST body + 503 + header class', async () => {
    process.env.TOURNAMENT_RATE_LIMIT_MAX = '10';
    process.env.TOURNAMENT_MAX_RETRIES = '0';
    process.env.TOURNAMENT_CIRCUIT_FAILURE_THRESHOLD = '1';
    resetTournamentHardeningState();

    vi.spyOn(coachService, 'buildCoachResponse').mockImplementation(() => {
      throw new Error('forced failure');
    });

    const payload = {
      contractVersion: COACH_CORE_CONTRACT_VERSION,
      intake: { objective: 'fast setup', favoriteTypes: ['Fire'] },
    };

    const res = await POST(buildRequest(payload, { 'x-forwarded-for': 'client-c' }));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(res.headers.get('x-coach-error-class')).toBe('tournament_unavailable');
    expect(body.code).toBe('INVALID_REQUEST');
    expect(CoachErrorResponseSchema.parse(body)).toBeTruthy();
    expect(body.legacyCode).toBeUndefined();
    expect(body.meta).toBeUndefined();
  });
});
