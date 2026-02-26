import { createHash } from 'node:crypto';
import rulesConfig from '@/lib/decisionCard/config.v1.json';
import {
  DECISION_CARD_VERSION,
  type DecisionCardResponse,
  type DecisionInput,
  type DecisionState,
} from '@/lib/decisionCard/contract';

type RuleOutcome = {
  state: DecisionState;
  passed: boolean;
  score: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toFixedConfidence(value: number): number {
  return Number(value.toFixed(2));
}

function evaluateRules(input: DecisionInput): RuleOutcome[] {
  const c = rulesConfig.rules;

  const tournamentPass =
    input.hasDecklist === c.tournament_ready.requires_decklist &&
    input.hasSideboardPlan === c.tournament_ready.requires_sideboard_plan &&
    input.gamesPlayed >= c.tournament_ready.min_games_played &&
    input.winRate >= c.tournament_ready.min_win_rate &&
    input.consistencyScore >= c.tournament_ready.min_consistency_score &&
    input.rulesKnowledgeScore >= c.tournament_ready.min_rules_knowledge_score &&
    input.unresolvedBlockingIssues.length === 0;

  const playablePass =
    input.hasDecklist === c.playable_now.requires_decklist &&
    input.gamesPlayed >= c.playable_now.min_games_played &&
    input.winRate >= c.playable_now.min_win_rate &&
    input.consistencyScore >= c.playable_now.min_consistency_score &&
    input.rulesKnowledgeScore >= c.playable_now.min_rules_knowledge_score;

  const tournamentScore =
    Number(input.hasDecklist) +
    Number(input.hasSideboardPlan) +
    Number(input.gamesPlayed >= c.tournament_ready.min_games_played) +
    Number(input.winRate >= c.tournament_ready.min_win_rate) +
    Number(input.consistencyScore >= c.tournament_ready.min_consistency_score) +
    Number(input.rulesKnowledgeScore >= c.tournament_ready.min_rules_knowledge_score) +
    Number(input.unresolvedBlockingIssues.length === 0);

  const playableScore =
    Number(input.hasDecklist) +
    Number(input.gamesPlayed >= c.playable_now.min_games_played) +
    Number(input.winRate >= c.playable_now.min_win_rate) +
    Number(input.consistencyScore >= c.playable_now.min_consistency_score) +
    Number(input.rulesKnowledgeScore >= c.playable_now.min_rules_knowledge_score);

  return [
    { state: 'TOURNAMENT_READY', passed: tournamentPass, score: tournamentScore },
    { state: 'PLAYABLE_NOW', passed: playablePass, score: playableScore },
    { state: 'NOT_READY_YET', passed: true, score: 1 },
  ];
}

function resolveState(input: DecisionInput): DecisionState {
  const outcomes = evaluateRules(input);
  const pass = outcomes.find((o) => o.passed && o.state !== 'NOT_READY_YET');
  if (pass) return pass.state;

  const tieOrder = rulesConfig.tie_break_order as DecisionState[];
  const ordered = [...outcomes].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return tieOrder.indexOf(a.state) - tieOrder.indexOf(b.state);
  });

  return ordered[0].state === 'NOT_READY_YET' ? 'NOT_READY_YET' : 'NOT_READY_YET';
}

function buildBlockingIssues(input: DecisionInput): string[] {
  const c = rulesConfig.rules;
  const blockers: string[] = [];

  if (!input.hasDecklist) blockers.push('Missing locked decklist.');
  if (!input.hasSideboardPlan) blockers.push('Missing sideboard plan for tournament rounds.');
  if (input.gamesPlayed < c.playable_now.min_games_played) blockers.push(`Insufficient reps: ${input.gamesPlayed}/${c.playable_now.min_games_played} minimum.`);
  if (input.winRate < c.playable_now.min_win_rate) blockers.push(`Win rate below playable threshold: ${(input.winRate * 100).toFixed(0)}%/${(c.playable_now.min_win_rate * 100).toFixed(0)}%.`);
  if (input.consistencyScore < c.playable_now.min_consistency_score) blockers.push('Consistency score below playable threshold.');
  if (input.rulesKnowledgeScore < c.playable_now.min_rules_knowledge_score) blockers.push('Rules knowledge below playable threshold.');
  blockers.push(...input.unresolvedBlockingIssues.map((issue) => `Unresolved issue: ${issue}`));

  return blockers;
}

function buildReasons(state: DecisionState, input: DecisionInput): { code: string; reason: string; ref: string }[] {
  const reasons: { code: string; reason: string; ref: string }[] = [];

  reasons.push({ code: 'R_DECKLIST', reason: input.hasDecklist ? 'Decklist is locked and ready for repetition.' : 'Decklist is not locked yet.', ref: 'input.hasDecklist' });
  reasons.push({ code: 'R_REPS', reason: `Games played: ${input.gamesPlayed}.`, ref: 'input.gamesPlayed' });
  reasons.push({ code: 'R_WINRATE', reason: `Observed win rate: ${(input.winRate * 100).toFixed(0)}%.`, ref: 'input.winRate' });
  reasons.push({ code: 'R_CONSISTENCY', reason: `Consistency score: ${input.consistencyScore.toFixed(2)}.`, ref: 'input.consistencyScore' });
  reasons.push({ code: 'R_RULES', reason: `Rules knowledge score: ${input.rulesKnowledgeScore.toFixed(2)}.`, ref: 'input.rulesKnowledgeScore' });
  reasons.push({ code: 'R_SIDEBOARD', reason: input.hasSideboardPlan ? 'Sideboard plan is documented.' : 'Sideboard plan missing.', ref: 'input.hasSideboardPlan' });
  reasons.push({ code: 'R_BLOCKERS', reason: input.unresolvedBlockingIssues.length === 0 ? 'No unresolved blockers recorded.' : `${input.unresolvedBlockingIssues.length} unresolved blocker(s).`, ref: 'input.unresolvedBlockingIssues' });

  const statePriority: Record<DecisionState, string[]> = {
    TOURNAMENT_READY: ['R_WINRATE', 'R_CONSISTENCY', 'R_RULES', 'R_REPS', 'R_SIDEBOARD', 'R_DECKLIST', 'R_BLOCKERS'],
    PLAYABLE_NOW: ['R_REPS', 'R_WINRATE', 'R_CONSISTENCY', 'R_DECKLIST', 'R_RULES', 'R_BLOCKERS', 'R_SIDEBOARD'],
    NOT_READY_YET: ['R_BLOCKERS', 'R_DECKLIST', 'R_REPS', 'R_WINRATE', 'R_CONSISTENCY', 'R_RULES', 'R_SIDEBOARD'],
  };

  const order = statePriority[state];
  return reasons.sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
}

function buildNextActions(state: DecisionState, input: DecisionInput): string[] {
  if (state === 'TOURNAMENT_READY') {
    return ['Run two match-length rehearsal sets with timer.', 'Submit list and sideboard notes to tournament tracker.', 'Prepare mulligan and opener plan for top 3 matchups.'];
  }

  if (state === 'PLAYABLE_NOW') {
    return ['Increase reps to 25+ games before event lock.', 'Document sideboard plan for common matchups.', 'Lift consistency and rules scores via focused drills.'];
  }

  const actions = [
    !input.hasDecklist ? 'Lock a 60-card decklist and stop churn for 10 games.' : 'Review locked decklist for dead draws.',
    input.gamesPlayed < 8 ? 'Play at least 8 structured practice games.' : 'Play another 10 structured practice games.',
    input.winRate < 0.45 ? 'Target >45% win rate in controlled testing before queueing events.' : 'Stabilize win rate over 20+ games.',
  ];

  return actions;
}

function computeConfidence(state: DecisionState, input: DecisionInput, blockers: string[]): number {
  const base = rulesConfig.confidence.base[state];
  const signalCoverage = Number(input.gamesPlayed > 0) + Number(input.winRate > 0) + Number(input.consistencyScore > 0) + Number(input.rulesKnowledgeScore > 0);
  const fullSignalBonus = signalCoverage === 4 ? rulesConfig.confidence.bonus_full_signal_coverage : 0;
  const penalty = blockers.length * rulesConfig.confidence.penalty_per_blocker;
  return toFixedConfidence(clamp(base + fullSignalBonus - penalty, rulesConfig.confidence.min, rulesConfig.confidence.max));
}

export function buildDecisionCard(input: DecisionInput): DecisionCardResponse {
  const state = resolveState(input);
  const blockers = state === 'NOT_READY_YET' ? buildBlockingIssues(input) : [];
  const reasons = buildReasons(state, input).slice(0, 3).map((reason, index) => ({
    reason_code: reason.code,
    reason: reason.reason,
    evidence_ref: reason.ref,
    rank: index + 1,
  }));

  const nextActions = buildNextActions(state, input);
  const confidence = computeConfidence(state, input, blockers);
  const decisionTraceId = createHash('sha1')
    .update(`${DECISION_CARD_VERSION}|${state}|${JSON.stringify(input)}|${JSON.stringify(reasons)}|${JSON.stringify(nextActions)}`)
    .digest('hex')
    .slice(0, 16);

  return {
    decision_card_version: DECISION_CARD_VERSION,
    state,
    confidence,
    top_reasons: reasons,
    blocking_issues: blockers,
    next_actions: nextActions,
    explainability: {
      reason_codes: reasons.map((r) => r.reason_code),
      human_reasons: reasons.map((r) => r.reason),
      evidence_refs: reasons.map((r) => r.evidence_ref),
      confidence_basis: `base=${rulesConfig.confidence.base[state].toFixed(2)}, blockers=${blockers.length}, signal_coverage=${['gamesPlayed', 'winRate', 'consistencyScore', 'rulesKnowledgeScore'].filter((k) => Number(input[k as keyof DecisionInput]) > 0).length}/4`,
      blocked_by: blockers,
      recommended_next_actions: nextActions,
      decision_trace_id: decisionTraceId,
    },
  };
}
