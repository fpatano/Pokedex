import { describe, expect, it } from 'vitest';
import fixtures from '@/tests/fixtures/decision-card.golden.json';
import { DecisionCardResponseSchema, type DecisionState } from '@/lib/decisionCard/contract';
import { buildDecisionCard } from '@/lib/decisionCard/service';

type Fixture = {
  id: string;
  input: Parameters<typeof buildDecisionCard>[0];
  expectedState: DecisionState;
};

describe('Decision Card golden fixtures', () => {
  it('matches expected state and explainability guarantees across fixture pack', () => {
    const suite = fixtures as Fixture[];

    expect(suite.length).toBeGreaterThanOrEqual(11);

    for (const fixture of suite) {
      const response = buildDecisionCard(fixture.input);
      expect(response.state, fixture.id).toBe(fixture.expectedState);
      expect(response.top_reasons.length, fixture.id).toBeGreaterThanOrEqual(3);
      expect(new Set(response.top_reasons.map((r) => r.evidence_ref)).size, fixture.id).toBeGreaterThanOrEqual(3);
      expect(response.explainability.decision_trace_id.length, fixture.id).toBe(16);
      DecisionCardResponseSchema.parse(response);
    }
  });

  it('contains >=3 fixtures per state bucket', () => {
    const suite = fixtures as Fixture[];
    const counts = suite.reduce<Record<string, number>>((acc, fixture) => {
      acc[fixture.expectedState] = (acc[fixture.expectedState] ?? 0) + 1;
      return acc;
    }, {});

    expect(counts.TOURNAMENT_READY).toBeGreaterThanOrEqual(3);
    expect(counts.PLAYABLE_NOW).toBeGreaterThanOrEqual(3);
    expect(counts.NOT_READY_YET).toBeGreaterThanOrEqual(3);
  });
});
