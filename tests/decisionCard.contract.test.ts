import { describe, expect, it } from 'vitest';
import {
  DecisionCardRequestSchema,
  DecisionCardResponseSchema,
  DECISION_CARD_VERSION,
} from '@/lib/decisionCard/contract';
import { buildDecisionCard } from '@/lib/decisionCard/service';

describe('Decision Card v1 contract lock', () => {
  it('applies backward-compatible defaults for sparse request input', () => {
    const parsed = DecisionCardRequestSchema.parse({ input: {} });
    expect(parsed.input.gamesPlayed).toBe(0);
    expect(parsed.input.hasDecklist).toBe(false);
  });

  it('returns locked version + mandatory explainability payload', () => {
    const response = buildDecisionCard({
      hasDecklist: true,
      hasSideboardPlan: false,
      gamesPlayed: 10,
      winRate: 0.5,
      consistencyScore: 0.57,
      rulesKnowledgeScore: 0.58,
      unresolvedBlockingIssues: [],
    });

    expect(response.decision_card_version).toBe(DECISION_CARD_VERSION);
    expect(response.explainability.reason_codes.length).toBeGreaterThanOrEqual(3);
    expect(response.explainability.evidence_refs.length).toBeGreaterThanOrEqual(3);
    expect(DecisionCardResponseSchema.parse(response)).toBeTruthy();
  });

  it('accepts additive partial collection intake field', () => {
    const parsed = DecisionCardRequestSchema.parse({
      input: {},
      collectionIntakePartial: {
        cards: [{ card_name: ' Quick Ball ' }, { card_name: 'Iono', count: 2 }],
      },
    });

    expect(parsed.collectionIntakePartial?.cards[0].count).toBe(1);
  });

  it('enforces strict request shape', () => {
    const invalid = DecisionCardRequestSchema.safeParse({
      input: {
        gamesPlayed: 8,
        unknownField: true,
      },
    });

    expect(invalid.success).toBe(false);
  });
});
