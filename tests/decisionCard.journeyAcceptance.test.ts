import { describe, expect, it } from 'vitest';
import { runJourneyWithArtifacts } from '@/tests/journeyHarness';

describe('Decision Card journey acceptance mapping', () => {
  it('J1 - tournament-ready happy path resolves TOURNAMENT_READY', () => {
    runJourneyWithArtifacts(
      'J1',
      {
        hasDecklist: true,
        hasSideboardPlan: true,
        gamesPlayed: 30,
        winRate: 0.62,
        consistencyScore: 0.79,
        rulesKnowledgeScore: 0.83,
        unresolvedBlockingIssues: [],
      },
      (response) => {
        expect(response.state).toBe('TOURNAMENT_READY');
        expect(response.blocking_issues).toHaveLength(0);
      }
    );
  });

  it('J2 - playable-now path resolves PLAYABLE_NOW and not tournament-ready', () => {
    runJourneyWithArtifacts(
      'J2',
      {
        hasDecklist: true,
        hasSideboardPlan: false,
        gamesPlayed: 10,
        winRate: 0.5,
        consistencyScore: 0.56,
        rulesKnowledgeScore: 0.6,
        unresolvedBlockingIssues: [],
      },
      (response) => {
        expect(response.state).toBe('PLAYABLE_NOW');
        expect(response.state).not.toBe('TOURNAMENT_READY');
      }
    );
  });

  it('J3 - low-readiness path resolves NOT_READY_YET with blockers', () => {
    runJourneyWithArtifacts(
      'J3',
      {
        hasDecklist: false,
        hasSideboardPlan: false,
        gamesPlayed: 2,
        winRate: 0.25,
        consistencyScore: 0.28,
        rulesKnowledgeScore: 0.32,
        unresolvedBlockingIssues: ['Deck legality unresolved'],
      },
      (response) => {
        expect(response.state).toBe('NOT_READY_YET');
        expect(response.blocking_issues.length).toBeGreaterThan(0);
      }
    );
  });

  it('J4 - transparent ranked rationale with evidence refs', () => {
    runJourneyWithArtifacts(
      'J4',
      {
        hasDecklist: true,
        hasSideboardPlan: false,
        gamesPlayed: 14,
        winRate: 0.54,
        consistencyScore: 0.62,
        rulesKnowledgeScore: 0.66,
        unresolvedBlockingIssues: [],
      },
      (response) => {
        expect(response.top_reasons).toHaveLength(3);
        expect(response.top_reasons[0].rank).toBe(1);
        expect(response.top_reasons.every((reason) => reason.evidence_ref.length > 0)).toBe(true);
      }
    );
  });

  it('J5 - confidence output is bounded and two-decimal normalized', () => {
    runJourneyWithArtifacts(
      'J5',
      {
        hasDecklist: true,
        hasSideboardPlan: false,
        gamesPlayed: 10,
        winRate: 0.5,
        consistencyScore: 0.56,
        rulesKnowledgeScore: 0.6,
        unresolvedBlockingIssues: [],
      },
      (response) => {
        expect(response.confidence).toBeGreaterThanOrEqual(0.1);
        expect(response.confidence).toBeLessThanOrEqual(0.95);
        expect(Number(response.confidence.toFixed(2))).toBe(response.confidence);
      }
    );
  });

  it('J6 - deterministic tie-break and repeatability', () => {
    runJourneyWithArtifacts(
      'J6',
      {
        hasDecklist: true,
        hasSideboardPlan: false,
        gamesPlayed: 8,
        winRate: 0.45,
        consistencyScore: 0.5,
        rulesKnowledgeScore: 0.55,
        unresolvedBlockingIssues: [],
      },
      (first) => {
        const second = runJourneyWithArtifacts('J6', {
          hasDecklist: true,
          hasSideboardPlan: false,
          gamesPlayed: 8,
          winRate: 0.45,
          consistencyScore: 0.5,
          rulesKnowledgeScore: 0.55,
          unresolvedBlockingIssues: [],
        }, () => {});
        expect(first).toStrictEqual(second);
      }
    );
  });

  it('J7 - blocked paths are actionable', () => {
    runJourneyWithArtifacts(
      'J7',
      {
        hasDecklist: false,
        hasSideboardPlan: false,
        gamesPlayed: 2,
        winRate: 0.25,
        consistencyScore: 0.28,
        rulesKnowledgeScore: 0.32,
        unresolvedBlockingIssues: ['Deck legality unresolved'],
      },
      (response) => {
        expect(response.state).toBe('NOT_READY_YET');
        expect(response.blocking_issues.length).toBeGreaterThan(0);
        expect(response.next_actions.length).toBeGreaterThan(0);
      }
    );
  });

  it('J8 - explainability payload mirrors top reasons and actions', () => {
    runJourneyWithArtifacts(
      'J8',
      {
        hasDecklist: true,
        hasSideboardPlan: false,
        gamesPlayed: 10,
        winRate: 0.5,
        consistencyScore: 0.56,
        rulesKnowledgeScore: 0.6,
        unresolvedBlockingIssues: [],
      },
      (response) => {
        expect(response.explainability.reason_codes).toStrictEqual(response.top_reasons.map((r) => r.reason_code));
        expect(response.explainability.evidence_refs).toStrictEqual(response.top_reasons.map((r) => r.evidence_ref));
        expect(response.explainability.recommended_next_actions).toStrictEqual(response.next_actions);
      }
    );
  });

  it('J9 - decision trace id is deterministic 16-char hex', () => {
    runJourneyWithArtifacts(
      'J9',
      {
        hasDecklist: true,
        hasSideboardPlan: false,
        gamesPlayed: 10,
        winRate: 0.5,
        consistencyScore: 0.56,
        rulesKnowledgeScore: 0.6,
        unresolvedBlockingIssues: [],
      },
      (response) => {
        expect(response.explainability.decision_trace_id).toMatch(/^[a-f0-9]{16}$/);
        const again = runJourneyWithArtifacts('J9', {
          hasDecklist: true,
          hasSideboardPlan: false,
          gamesPlayed: 10,
          winRate: 0.5,
          consistencyScore: 0.56,
          rulesKnowledgeScore: 0.6,
          unresolvedBlockingIssues: [],
        }, () => {});
        expect(again.explainability.decision_trace_id).toBe(response.explainability.decision_trace_id);
      }
    );
  });

  it('J10 - single state returned, never multi-card orchestration', () => {
    runJourneyWithArtifacts(
      'J10',
      {
        hasDecklist: true,
        hasSideboardPlan: true,
        gamesPlayed: 30,
        winRate: 0.62,
        consistencyScore: 0.79,
        rulesKnowledgeScore: 0.83,
        unresolvedBlockingIssues: [],
      },
      (response) => {
        expect(typeof response.state).toBe('string');
        expect(['TOURNAMENT_READY', 'PLAYABLE_NOW', 'NOT_READY_YET']).toContain(response.state);
      }
    );
  });
});
