import { describe, expect, it } from 'vitest';
import { buildDecisionCard } from '@/lib/decisionCard/service';

describe('Decision Card deterministic engine v1', () => {
  it('returns one unambiguous readiness state per scenario', () => {
    const response = buildDecisionCard({
      hasDecklist: true,
      hasSideboardPlan: true,
      gamesPlayed: 28,
      winRate: 0.63,
      consistencyScore: 0.81,
      rulesKnowledgeScore: 0.84,
      unresolvedBlockingIssues: [],
    });

    expect(['TOURNAMENT_READY', 'PLAYABLE_NOW', 'NOT_READY_YET']).toContain(response.state);
  });

  it('returns Not Ready Yet with blockers + concrete next actions', () => {
    const response = buildDecisionCard({
      hasDecklist: false,
      hasSideboardPlan: false,
      gamesPlayed: 3,
      winRate: 0.2,
      consistencyScore: 0.3,
      rulesKnowledgeScore: 0.3,
      unresolvedBlockingIssues: ['Unreviewed prize mapping'],
    });

    expect(response.state).toBe('NOT_READY_YET');
    expect(response.blocking_issues.length).toBeGreaterThan(0);
    expect(response.next_actions.length).toBeGreaterThanOrEqual(3);
  });

  it('is deterministic for repeat input', () => {
    const input = {
      hasDecklist: true,
      hasSideboardPlan: false,
      gamesPlayed: 9,
      winRate: 0.48,
      consistencyScore: 0.53,
      rulesKnowledgeScore: 0.59,
      unresolvedBlockingIssues: [],
    };

    const first = buildDecisionCard(input);
    const second = buildDecisionCard(input);

    expect(second).toStrictEqual(first);
  });

  it('canonicalizes partial intake and yields byte-identical deck skeleton', () => {
    const requestA = {
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
        cards: [
          { card_name: ' quick   ball ', count: 1 },
          { card_name: 'Quick Ball', count: 2 },
          { card_name: 'Iono', count: 1 },
        ],
      },
    };

    const requestB = {
      ...requestA,
      collectionIntakePartial: {
        cards: [
          { card_name: 'Iono', count: 1 },
          { card_name: 'Quick Ball', count: 3 },
        ],
      },
    };

    const first = buildDecisionCard(requestA, { includeDeckSkeleton: true });
    const second = buildDecisionCard(requestB, { includeDeckSkeleton: true });

    expect(second.deckSkeleton).toStrictEqual(first.deckSkeleton);
    expect(second.explainability.decision_trace_id).toBe(first.explainability.decision_trace_id);
  });
});
