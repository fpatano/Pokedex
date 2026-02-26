import {
  COACH_CORE_CONTRACT_VERSION,
  type CoachArchetype,
  type CoachCanonicalIntake,
  type CoachIntake,
  type CoachPlan,
  type CoachRequest,
  type CoachResponse,
} from '@/lib/coach/contract';

const TOPIC_TOKENS = ['damage', 'attack', 'setup', 'consistency', 'control', 'tempo', 'draw', 'budget'] as const;

const ARCHETYPE_PRIORITY: CoachArchetype[] = ['AGGRO_TEMPO', 'MIDRANGE_TOOLBOX', 'CONTROL_ENGINE'];

const ARCHETYPE_BASE_WEIGHTS: Record<CoachArchetype, number> = {
  AGGRO_TEMPO: 0.3,
  MIDRANGE_TOOLBOX: 0.3,
  CONTROL_ENGINE: 0.3,
};

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function normalizeKeywords(objective: string): string[] {
  const normalized = objective
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  return Array.from(new Set(normalized)).sort();
}

export function normalizeIntake(intake: CoachIntake): CoachCanonicalIntake {
  const objective = intake.objective?.trim() ?? '';
  const objectiveKeywords = normalizeKeywords(objective).filter((token) => {
    return token.length >= 4 || TOPIC_TOKENS.includes(token as (typeof TOPIC_TOKENS)[number]);
  });

  const favoriteTypes = Array.from(new Set((intake.favoriteTypes ?? []).map((value) => value.trim().toLowerCase())))
    .filter(Boolean)
    .sort();

  const canonical: CoachCanonicalIntake = {
    objective,
    objectiveKeywords,
    favoriteTypes,
    pace: intake.pace ?? 'balanced',
    budget: intake.budget ?? 'mid',
    experience: intake.experience ?? 'novice',
    hasCriticalInput: objective.length > 0 || favoriteTypes.length > 0,
  };

  return canonical;
}

function keywordScore(keywords: string[], bucket: string[]): number {
  const matched = keywords.filter((token) => bucket.includes(token)).length;
  return matched > 0 ? Math.min(0.25, matched * 0.08) : 0;
}

export function resolveArchetype(canonical: CoachCanonicalIntake): {
  archetype: CoachArchetype;
  confidence: number;
  rationale: string[];
} {
  const scores: Record<CoachArchetype, number> = {
    ...ARCHETYPE_BASE_WEIGHTS,
  };

  const rationale: string[] = [];

  if (canonical.pace === 'fast') {
    scores.AGGRO_TEMPO += 0.3;
    rationale.push('Fast pace preference maps to AGGRO_TEMPO.');
  }
  if (canonical.pace === 'control') {
    scores.CONTROL_ENGINE += 0.3;
    rationale.push('Control pace preference maps to CONTROL_ENGINE.');
  }

  if (canonical.budget === 'low') {
    scores.MIDRANGE_TOOLBOX += 0.15;
    rationale.push('Low budget preference favors MIDRANGE_TOOLBOX flexibility.');
  }

  if (canonical.experience === 'advanced') {
    scores.CONTROL_ENGINE += 0.12;
    rationale.push('Advanced experience supports CONTROL_ENGINE complexity.');
  }

  if (canonical.favoriteTypes.length > 0) {
    scores.AGGRO_TEMPO += 0.08;
    scores.MIDRANGE_TOOLBOX += 0.08;
    rationale.push('Provided favorite types improves archetype fit confidence.');
  }

  scores.AGGRO_TEMPO += keywordScore(canonical.objectiveKeywords, ['damage', 'attack', 'tempo', 'quick', 'fast']);
  scores.MIDRANGE_TOOLBOX += keywordScore(canonical.objectiveKeywords, ['consistency', 'setup', 'budget', 'adapt']);
  scores.CONTROL_ENGINE += keywordScore(canonical.objectiveKeywords, ['control', 'deny', 'draw', 'lock']);

  const ordered = [...ARCHETYPE_PRIORITY].sort((left, right) => {
    if (scores[right] !== scores[left]) return scores[right] - scores[left];
    return ARCHETYPE_PRIORITY.indexOf(left) - ARCHETYPE_PRIORITY.indexOf(right);
  });

  const best = ordered[0];
  const second = ordered[1];
  const delta = Math.max(0, scores[best] - scores[second]);
  const confidence = clamp(0.45 + delta + (canonical.hasCriticalInput ? 0.12 : -0.12));

  if (rationale.length === 0) {
    rationale.push('Used deterministic baseline weighting due to sparse intent signals.');
  }

  rationale.push(`Archetype ranking: ${ordered.map((item) => `${item}:${scores[item].toFixed(2)}`).join(' > ')}.`);

  return {
    archetype: best,
    confidence,
    rationale,
  };
}

export function buildPlayableNowPlan(archetype: CoachArchetype, canonical: CoachCanonicalIntake): CoachPlan {
  const typeHint = canonical.favoriteTypes[0] ?? 'your strongest available type';

  const baseStepsByArchetype: Record<CoachArchetype, string[]> = {
    AGGRO_TEMPO: [
      `Build a 60-card tempo shell around ${typeHint} with 2 primary attackers and 1 low-cost finisher.`,
      'Play 5 solo test hands; mulligan for early pressure and record average first-attack turn.',
      'Cut 2 slow cards and add 2 consistency cards if first attack happens later than turn 2.',
    ],
    MIDRANGE_TOOLBOX: [
      `Start with a balanced ${typeHint} list: 2 flexible attackers, 1 utility pivot, and broad trainers.`,
      'Run 3 matchup simulations (aggro/midrange/control) and note dead cards in each.',
      'Swap 2 least-used slots for matchup tech and rerun one simulation per matchup.',
    ],
    CONTROL_ENGINE: [
      `Build a control core with ${typeHint} support: 1 win condition, 2 disruption lines, and draw engine.`,
      'Test sequencing over 4 games; track turns where disruption blocked opponent setup.',
      'Tune counts by removing 1 redundant disruption card for 1 extra draw/recovery option.',
    ],
  };

  return {
    horizon: 'NEXT_7_DAYS',
    title: `${archetype} playable-now plan`,
    steps: baseStepsByArchetype[archetype],
    rationale: `Plan optimized for ${canonical.pace} pace, ${canonical.budget} budget, and ${canonical.experience} experience level.`,
  };
}

export function buildCoachResponse(request: CoachRequest): CoachResponse {
  const canonicalIntake = normalizeIntake(request.intake);
  const resolved = resolveArchetype(canonicalIntake);
  const plan = buildPlayableNowPlan(resolved.archetype, canonicalIntake);

  if (!canonicalIntake.hasCriticalInput) {
    return {
      contractVersion: COACH_CORE_CONTRACT_VERSION,
      mode: 'fallback',
      confidence: clamp(Math.min(resolved.confidence, 0.3)),
      archetype: null,
      rationale: ['Fallback triggered: missing critical intent fields (objective or favoriteTypes).', ...resolved.rationale],
      canonicalIntake,
      plan,
      fallbackReason: 'MISSING_CRITICAL_INPUT',
    };
  }

  return {
    contractVersion: COACH_CORE_CONTRACT_VERSION,
    mode: 'coach',
    confidence: resolved.confidence,
    archetype: resolved.archetype,
    rationale: resolved.rationale,
    canonicalIntake,
    plan,
    fallbackReason: null,
  };
}
