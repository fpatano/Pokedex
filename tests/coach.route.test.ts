import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/coach/route';
import { COACH_CORE_CONTRACT_VERSION } from '@/lib/coach/contract';

function buildRequest(body: unknown, headers?: Record<string, string>) {
  return new NextRequest('http://localhost:3000/api/coach', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('/api/coach route (Coach Core M2)', () => {
  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost:3000/api/coach', {
      method: 'POST',
      body: '{bad-json',
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toMatchObject({ code: 'INVALID_REQUEST', contractVersion: COACH_CORE_CONTRACT_VERSION });
  });

  it('returns 400 for invalid request payload', async () => {
    const res = await POST(buildRequest({ contractVersion: 'wrong', intake: {} }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toMatchObject({ code: 'INVALID_REQUEST', contractVersion: COACH_CORE_CONTRACT_VERSION });
  });

  it('returns one coach decision on valid sparse intake', async () => {
    const res = await POST(
      buildRequest({
        contractVersion: COACH_CORE_CONTRACT_VERSION,
        intake: { objective: 'quick damage setup', pace: 'fast', favoriteTypes: ['Fire'] },
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.mode).toBe('coach');
    expect(typeof body.archetype).toBe('string');
    expect(body.confidenceLabel).toMatch(/^(high|medium|low)$/);
    expect(body.plan.horizon).toBe('NEXT_7_DAYS');
    expect(body.plan.steps).toHaveLength(3);
    expect(body.missingSinglesExport.items).toStrictEqual([]);
    expect(body.fallbackReason).toBeNull();
  });

  it('returns deterministic fallback reason on missing critical input', async () => {
    const res = await POST(buildRequest({ contractVersion: COACH_CORE_CONTRACT_VERSION, intake: {} }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      mode: 'fallback',
      fallbackReason: 'MISSING_CRITICAL_INPUT',
      archetype: null,
      confidenceLabel: 'low',
    });
    expect(body.missingSinglesExport.items.map((item: { id: string }) => item.id)).toStrictEqual(['objective', 'favoriteTypes']);
  });

  it('emits minimal trace logging at API boundary', async () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const res = await POST(
      buildRequest(
        { contractVersion: COACH_CORE_CONTRACT_VERSION, intake: { objective: 'control draw lock' } },
        { 'x-trace-id': 'trace-123' }
      )
    );

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalled();
    const payload = spy.mock.calls.map((call) => JSON.stringify(call)).join('\n');
    expect(payload).toContain('trace-123');

    spy.mockRestore();
  });
});
