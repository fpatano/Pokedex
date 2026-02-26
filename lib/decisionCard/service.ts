import { createHash } from 'node:crypto';
import rulesConfig from '@/lib/decisionCard/config.v1.json';
import {
  DECISION_CARD_VERSION,
  type DecisionCardRequest,
  type DecisionCardResponse,
  type DecisionInput,
  type DecisionState,
} from '@/lib/decisionCard/contract';

type RuleOutcome = {
  state: DecisionState;
  passed: boolean;
  score: number;
};

type CanonicalCollectionItem = {
  card_name: string;
  canonical_name: string;
  count: number;
};

type DeckRequirement = {
  card_name: string;
  required_count: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toFixedConfidence(value: number): number {
  return Number(value.toFixed(2));
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function canonicalName(name: string): string {
  return normalizeName(name).toLowerCase();
}

function displayNameFromCanonical(name: string): string {
  return name
    .split(' ')
    .map((part) => (part.length === 0 ? part : part[0].toUpperCase() + part.slice(1)))
    .join(' ');
}

function canonicalizeCollectionIntake(request: DecisionCardRequest): CanonicalCollectionItem[] {
  const cards = request.collectionIntakePartial?.cards ?? [];
  const byName = new Map<string, CanonicalCollectionItem>();

  for (const card of cards) {
    const normalized = normalizeName(card.card_name);
    const canonical = canonicalName(normalized);
    const current = byName.get(canonical);

    if (current) {
      current.count += card.count ?? 1;
    } else {
      byName.set(canonical, {
        card_name: displayNameFromCanonical(canonical),
        canonical_name: canonical,
        count: card.count ?? 1,
      });
    }
  }

  return [...byName.values()].sort((a, b) => {
    const byCanonical = a.canonical_name.localeCompare(b.canonical_name);
    if (byCanonical !== 0) return byCanonical;
    if (b.count !== a.count) return b.count - a.count;
    return a.card_name.localeCompare(b.card_name);
  });
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

function deckTemplateByState(state: DecisionState): { core: DeckRequirement[]; upgrades: DeckRequirement[] } {
  if (state === 'TOURNAMENT_READY') {
    return {
      core: [
        { card_name: 'Quick Ball', required_count: 4 },
        { card_name: 'Professor Research', required_count: 4 },
        { card_name: 'Iono', required_count: 3 },
      ],
      upgrades: [
        { card_name: 'Prime Catcher', required_count: 1 },
        { card_name: 'Rare Candy', required_count: 2 },
      ],
    };
  }

  if (state === 'PLAYABLE_NOW') {
    return {
      core: [
        { card_name: 'Quick Ball', required_count: 4 },
        { card_name: 'Professor Research', required_count: 3 },
        { card_name: 'Iono', required_count: 2 },
      ],
      upgrades: [
        { card_name: 'Prime Catcher', required_count: 1 },
        { card_name: 'Boss\'s Orders', required_count: 2 },
      ],
    };
  }

  return {
    core: [
      { card_name: 'Quick Ball', required_count: 4 },
      { card_name: 'Professor Research', required_count: 2 },
      { card_name: 'Iono', required_count: 1 },
    ],
    upgrades: [
      { card_name: 'Boss\'s Orders', required_count: 2 },
      { card_name: 'Rare Candy', required_count: 2 },
    ],
  };
}

type DeckSkeletonEntry = NonNullable<DecisionCardResponse['deckSkeleton']>['ownedCore'][number];
type DeckSkeletonMissingEntry = NonNullable<DecisionCardResponse['deckSkeleton']>['missingCore'][number];

function buildDeckSkeleton(state: DecisionState, topReasons: DecisionCardResponse['top_reasons'], canonicalCards: CanonicalCollectionItem[]) {
  const intakeByCanonical = new Map(canonicalCards.map((card) => [card.canonical_name, card.count]));
  const reasonPool = [...topReasons].sort((a, b) => a.rank - b.rank || a.reason_code.localeCompare(b.reason_code));
  const { core, upgrades } = deckTemplateByState(state);

  const decorate = (requirements: DeckRequirement[], withActions: boolean): Array<DeckSkeletonEntry | DeckSkeletonMissingEntry> =>
    requirements
      .map((requirement, index): DeckSkeletonEntry | DeckSkeletonMissingEntry => {
        const canonical = canonicalName(requirement.card_name);
        const ownedCount = intakeByCanonical.get(canonical) ?? 0;
        const missingCount = Math.max(0, requirement.required_count - ownedCount);
        const reason = reasonPool[index % reasonPool.length];

        const base = {
          card_name: requirement.card_name,
          required_count: requirement.required_count,
          owned_count: ownedCount,
          missing_count: missingCount,
          reason_code: reason.reason_code,
          reason: reason.reason,
          evidence_ref: reason.evidence_ref,
        };

        if (!withActions || missingCount === 0) return base;
        return {
          ...base,
          action_text: `Acquire ${missingCount}x ${requirement.card_name} to close core gap (${reason.reason_code}).`,
        };
      })
      .sort((a, b) => {
        if (a.missing_count !== b.missing_count) return b.missing_count - a.missing_count;
        if (a.required_count !== b.required_count) return b.required_count - a.required_count;
        return a.card_name.localeCompare(b.card_name);
      });

  const coreRows = decorate(core, true);
  const missingCore = coreRows.filter(
    (row): row is DeckSkeletonMissingEntry => row.missing_count > 0 && 'action_text' in row
  );
  const ownedCore = coreRows.filter((row): row is DeckSkeletonEntry => row.missing_count === 0);

  const optionalUpgrades = decorate(upgrades, false)
    .filter((row): row is DeckSkeletonEntry => !('action_text' in row))
    .sort((a, b) => {
      if (a.missing_count !== b.missing_count) return a.missing_count - b.missing_count;
      if (a.required_count !== b.required_count) return b.required_count - a.required_count;
      return a.card_name.localeCompare(b.card_name);
    });

  return {
    ownedCore,
    missingCore,
    optionalUpgrades,
  };
}

function addGapActionability(baseActions: string[], missingCore: Array<{ card_name: string; missing_count: number; reason_code: string; evidence_ref: string }>): string[] {
  if (missingCore.length === 0) return baseActions;

  const gapSummary = missingCore
    .slice(0, 2)
    .map((item) => `${item.missing_count}x ${item.card_name}`)
    .join(', ');
  const evidenceSummary = missingCore
    .slice(0, 2)
    .map((item) => `${item.reason_code}@${item.evidence_ref}`)
    .join(', ');

  const gapAction = `Close collection gaps: acquire ${gapSummary}. Evidence: ${evidenceSummary}.`;
  if (baseActions.includes(gapAction)) return baseActions;
  return [gapAction, ...baseActions];
}

export function buildDecisionCard(
  requestOrInput: DecisionCardRequest | DecisionInput,
  options?: { includeDeckSkeleton?: boolean; forceDeckSkeletonFailure?: boolean }
): DecisionCardResponse {
  const request: DecisionCardRequest = 'input' in requestOrInput ? requestOrInput : { input: requestOrInput };
  const input = request.input;

  const state = resolveState(input);
  const blockers = state === 'NOT_READY_YET' ? buildBlockingIssues(input) : [];
  const reasons = buildReasons(state, input).slice(0, 3).map((reason, index) => ({
    reason_code: reason.code,
    reason: reason.reason,
    evidence_ref: reason.ref,
    rank: index + 1,
  }));

  const confidence = computeConfidence(state, input, blockers);
  const canonicalCollection = canonicalizeCollectionIntake(request);
  const shouldBuildDeckSkeleton = Boolean(options?.includeDeckSkeleton);

  let deckSkeleton: DecisionCardResponse['deckSkeleton'] | undefined;
  let deckSkeletonFallbackNote: string | undefined;

  if (shouldBuildDeckSkeleton) {
    try {
      if (options?.forceDeckSkeletonFailure) {
        throw new Error('forced deck skeleton failure');
      }
      deckSkeleton = buildDeckSkeleton(state, reasons, canonicalCollection);
    } catch {
      deckSkeletonFallbackNote =
        'Deck skeleton is temporarily unavailable; continue with readiness actions while collection gaps are recalculated.';
    }
  }

  const baseNextActions = buildNextActions(state, input);
  const gapAwareActions = deckSkeleton ? addGapActionability(baseNextActions, deckSkeleton.missingCore) : baseNextActions;
  const nextActions = deckSkeletonFallbackNote ? [deckSkeletonFallbackNote, ...gapAwareActions] : gapAwareActions;

  const decisionTraceId = createHash('sha1')
    .update(
      `${DECISION_CARD_VERSION}|${state}|${JSON.stringify(input)}|${JSON.stringify(reasons)}|${JSON.stringify(nextActions)}|${JSON.stringify(
        canonicalCollection
      )}|${shouldBuildDeckSkeleton ? JSON.stringify(deckSkeleton) : 'deckSkeleton:disabled'}`
    )
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
    ...(deckSkeleton ? { deckSkeleton } : {}),
  };
}
