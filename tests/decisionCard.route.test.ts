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
    delete process.env.DECK_SKELETON_V1_ENABLED;
  });

  it('returns v1 response shape when DECISION_CARD_V1_ENABLED=true', async () => {
    process.env.DECISION_CARD_V1_ENABLED = 'true';

    const res = await POST(buildRequest({ input: {} }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('x-decision-card-variant')).toBe('v1');
    expect(res.headers.get('x-deck-skeleton-variant')).toBe('disabled');
    expect(body.decision_card_version).toBe(DECISION_CARD_VERSION);
    expect(body.state).toMatch(/^(TOURNAMENT_READY|PLAYABLE_NOW|NOT_READY_YET)$/);
    expect(body.explainability?.confidence_basis).not.toBe('rollback_toggle_active');
    expect(body.deckSkeleton).toBeUndefined();
  });

  it('returns rollback-safe response and rollback variant header when DECISION_CARD_V1_ENABLED=false', async () => {
    process.env.DECISION_CARD_V1_ENABLED = 'false';

    const res = await POST(buildRequest({ input: {} }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('x-decision-card-variant')).toBe('rollback-safe-default');
    expect(res.headers.get('x-deck-skeleton-variant')).toBe('disabled');
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

  it('keeps x-deck-skeleton-variant aligned to emitted body capability for all toggle combinations', async () => {
    const cases = [
      {
        decisionEnabled: true,
        deckEnabled: false,
        expectedHeader: 'disabled',
        expectDeckSkeleton: false,
      },
      {
        decisionEnabled: true,
        deckEnabled: true,
        expectedHeader: 'v1',
        expectDeckSkeleton: true,
      },
      {
        decisionEnabled: false,
        deckEnabled: false,
        expectedHeader: 'disabled',
        expectDeckSkeleton: false,
      },
      {
        decisionEnabled: false,
        deckEnabled: true,
        expectedHeader: 'disabled',
        expectDeckSkeleton: false,
      },
    ] as const;

    for (const testCase of cases) {
      process.env.DECISION_CARD_V1_ENABLED = testCase.decisionEnabled ? 'true' : 'false';
      process.env.DECK_SKELETON_V1_ENABLED = testCase.deckEnabled ? 'true' : 'false';

      const res = await POST(buildRequest({ input: {} }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(res.headers.get('x-deck-skeleton-variant')).toBe(testCase.expectedHeader);

      if (testCase.expectDeckSkeleton) {
        expect(body.deckSkeleton).toBeTruthy();
      } else {
        expect(body.deckSkeleton).toBeUndefined();
      }
    }
  });

  it('emits deck skeleton + variant header when DECK_SKELETON_V1_ENABLED=true', async () => {
    process.env.DECISION_CARD_V1_ENABLED = 'true';
    process.env.DECK_SKELETON_V1_ENABLED = 'true';

    const res = await POST(
      buildRequest({
        input: {
          hasDecklist: true,
          hasSideboardPlan: false,
          gamesPlayed: 10,
          winRate: 0.5,
          consistencyScore: 0.56,
          rulesKnowledgeScore: 0.6,
          unresolvedBlockingIssues: [],
        },
        collectionIntakePartial: {
          cards: [{ card_name: 'Quick Ball', count: 4 }],
        },
      })
    );
    const body = await res.json();

    expect(res.headers.get('x-deck-skeleton-variant')).toBe('v1');
    expect(body.deckSkeleton).toBeTruthy();
    expect(Array.isArray(body.deckSkeleton.missingCore)).toBe(true);
  });
});
