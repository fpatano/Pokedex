import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/decision-card/route';
import { DECISION_CARD_VERSION } from '@/lib/decisionCard/contract';

function buildRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/decision-card', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('/api/decision-card route rollback toggle semantics', () => {
  afterEach(() => {
    delete process.env.DECISION_CARD_V1_ENABLED;
  });

  it('returns v1 response shape when DECISION_CARD_V1_ENABLED=true', async () => {
    process.env.DECISION_CARD_V1_ENABLED = 'true';

    const res = await POST(buildRequest({ input: {} }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('x-decision-card-variant')).toBe('v1');
    expect(body.decision_card_version).toBe(DECISION_CARD_VERSION);
    expect(body.state).toMatch(/^(READY|NEEDS_WORK|NOT_READY_YET)$/);
    expect(body.explainability?.confidence_basis).not.toBe('rollback_toggle_active');
  });

  it('returns rollback-safe response and rollback variant header when DECISION_CARD_V1_ENABLED=false', async () => {
    process.env.DECISION_CARD_V1_ENABLED = 'false';

    const res = await POST(buildRequest({ input: {} }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('x-decision-card-variant')).toBe('rollback-safe-default');
    expect(body).toMatchObject({
      decision_card_version: DECISION_CARD_VERSION,
      state: 'NOT_READY_YET',
      explainability: {
        confidence_basis: 'rollback_toggle_active',
        decision_trace_id: 'rollback-v1-safe',
      },
    });
    expect(body.top_reasons[0]).toMatchObject({ reason_code: 'ROLLBACK_ACTIVE' });
  });
});
