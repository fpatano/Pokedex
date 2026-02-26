import { describe, expect, it } from 'vitest';
import { buildDecisionCard } from '@/lib/decisionCard/service';

describe('Decision Card journey acceptance mapping', () => {
  it('J4 - transparent ranked rationale with evidence refs', () => {
    const response = buildDecisionCard({
      hasDecklist: true,
      hasSideboardPlan: false,
      gamesPlayed: 14,
      winRate: 0.54,
      consistencyScore: 0.62,
      rulesKnowledgeScore: 0.66,
      unresolvedBlockingIssues: [],
    });

    expect(response.top_reasons).toHaveLength(3);
    expect(response.top_reasons[0].rank).toBe(1);
    expect(response.top_reasons.every((reason) => reason.evidence_ref.length > 0)).toBe(true);
  });

  it('J6 - deterministic tie-break and repeatability', () => {
    const input = {
      hasDecklist: true,
      hasSideboardPlan: false,
      gamesPlayed: 8,
      winRate: 0.45,
      consistencyScore: 0.5,
      rulesKnowledgeScore: 0.55,
      unresolvedBlockingIssues: [],
    };
    const first = buildDecisionCard(input);
    const second = buildDecisionCard(input);
    expect(first).toStrictEqual(second);
  });

  it('J7 - blocked paths are actionable', () => {
    const response = buildDecisionCard({
      hasDecklist: false,
      hasSideboardPlan: false,
      gamesPlayed: 2,
      winRate: 0.25,
      consistencyScore: 0.28,
      rulesKnowledgeScore: 0.32,
      unresolvedBlockingIssues: ['Deck legality unresolved'],
    });

    expect(response.state).toBe('NOT_READY_YET');
    expect(response.blocking_issues.length).toBeGreaterThan(0);
    expect(response.next_actions.length).toBeGreaterThan(0);
  });

  it('J10 - single state returned, never multi-card orchestration', () => {
    const response = buildDecisionCard({
      hasDecklist: true,
      hasSideboardPlan: true,
      gamesPlayed: 30,
      winRate: 0.62,
      consistencyScore: 0.79,
      rulesKnowledgeScore: 0.83,
      unresolvedBlockingIssues: [],
    });

    expect(typeof response.state).toBe('string');
    expect(['TOURNAMENT_READY', 'PLAYABLE_NOW', 'NOT_READY_YET']).toContain(response.state);
  });
});
