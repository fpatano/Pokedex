import type { CoachCanonicalIntake } from '@/lib/coach/contract';

export type ConfidenceLabel = 'high' | 'medium' | 'low';

export const COACH_TRUST_THRESHOLDS = {
  highMin: 0.75,
  mediumMin: 0.45,
} as const;

const CRITICAL_GAP_ORDER = ['objective', 'favoriteTypes'] as const;

type CriticalGapId = (typeof CRITICAL_GAP_ORDER)[number];

const GAP_LABELS: Record<CriticalGapId, string> = {
  objective: 'Add one clear objective (example: "control draw lock plan").',
  favoriteTypes: 'Add at least one favorite type (example: ["Fire"]).',
};

export type MissingSingle = {
  id: CriticalGapId;
  category: 'critical_input';
  label: string;
  confidenceLabel: ConfidenceLabel;
  required: true;
};

export type MissingSinglesExport = {
  format: 'coach-missing-singles.v1';
  generatedFromContract: 'coach-core.v1';
  items: MissingSingle[];
};

export function toConfidenceLabel(confidence: number): ConfidenceLabel {
  if (confidence >= COACH_TRUST_THRESHOLDS.highMin) return 'high';
  if (confidence >= COACH_TRUST_THRESHOLDS.mediumMin) return 'medium';
  return 'low';
}

export function buildMissingSinglesExport(canonical: CoachCanonicalIntake, confidence: number): MissingSinglesExport {
  const seen = new Set<CriticalGapId>();
  const items: MissingSingle[] = [];

  const missingObjective = canonical.objective.trim().length === 0;
  const missingFavoriteTypes = canonical.favoriteTypes.length === 0;

  const gaps: CriticalGapId[] = [];
  if (missingObjective) gaps.push('objective');
  if (missingFavoriteTypes) gaps.push('favoriteTypes');

  for (const id of CRITICAL_GAP_ORDER) {
    if (!gaps.includes(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);

    items.push({
      id,
      category: 'critical_input',
      label: GAP_LABELS[id],
      confidenceLabel: toConfidenceLabel(confidence),
      required: true,
    });
  }

  return {
    format: 'coach-missing-singles.v1',
    generatedFromContract: 'coach-core.v1',
    items,
  };
}
