import { describe, expect, it } from 'vitest';
import fixtures from '@/tests/fixtures/decision-card.deck-skeleton.golden.json';
import type { DecisionCardRequest } from '@/lib/decisionCard/contract';
import { buildDecisionCard } from '@/lib/decisionCard/service';

type Fixture = {
  id: string;
  request: DecisionCardRequest;
};

describe('Decision Card deck skeleton golden fixtures', () => {
  it('emits deterministic owned/missing/upgrade splits with explicit missing actions', () => {
    const suite = fixtures as Fixture[];

    for (const fixture of suite) {
      const first = buildDecisionCard(fixture.request, { includeDeckSkeleton: true });
      const second = buildDecisionCard(fixture.request, { includeDeckSkeleton: true });

      expect(second.deckSkeleton, fixture.id).toStrictEqual(first.deckSkeleton);
      expect(second.explainability.decision_trace_id, fixture.id).toBe(first.explainability.decision_trace_id);
      expect(first.deckSkeleton, fixture.id).toBeTruthy();

      const skeleton = first.deckSkeleton!;
      expect(Array.isArray(skeleton.ownedCore), fixture.id).toBe(true);
      expect(Array.isArray(skeleton.missingCore), fixture.id).toBe(true);
      expect(Array.isArray(skeleton.optionalUpgrades), fixture.id).toBe(true);

      for (const gap of skeleton.missingCore) {
        expect(gap.missing_count, fixture.id).toBeGreaterThan(0);
        expect(gap.action_text.length, fixture.id).toBeGreaterThan(0);
        expect(first.next_actions.some((action) => action.includes('Close collection gaps:')), fixture.id).toBe(true);
      }
    }
  });
});
