import type { NormalizedCard } from '@/lib/types';

export type Recommendation = {
  id: string;
  title: string;
  reason: string;
  queryPatch: string;
};

const ENABLED_RECOMMENDATIONS = /^(1|true|yes|on)$/i.test(process.env.ENABLE_RECOMMENDATIONS ?? '1');
const KILL_SWITCH_ACTIVE = /^(1|true|yes|on)$/i.test(process.env.RECOMMENDATIONS_KILL_SWITCH ?? '0');

function normalizeTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function includesToken(query: string, token: string): boolean {
  return normalizeTokens(query).includes(token.toLowerCase());
}

function topDamage(results: NormalizedCard[]): number {
  const damages = results
    .flatMap((card) => card.attacks)
    .map((attack) => attack.damage ?? '')
    .flatMap((raw) => raw.match(/\d+/g) ?? [])
    .map(Number)
    .filter((value) => Number.isFinite(value));

  return damages.length ? Math.max(...damages) : 0;
}

export function issueRecommendations(query: string, results: NormalizedCard[]): Recommendation[] {
  if (!ENABLED_RECOMMENDATIONS || KILL_SWITCH_ACTIVE) {
    return [];
  }

  const trimmed = query.trim();
  if (!trimmed) return [];

  const recs: Recommendation[] = [];
  const damage = topDamage(results);

  if (!includesToken(trimmed, 'pokemon')) {
    recs.push({
      id: 'narrow-to-pokemon',
      title: 'Narrow to Pokémon cards',
      reason: 'Filters out trainer/energy noise for clearer comparisons.',
      queryPatch: `${trimmed} pokemon`,
    });
  }

  if (damage > 0 && !includesToken(trimmed, 'highest')) {
    recs.push({
      id: 'rank-by-damage',
      title: 'Rank by highest damage',
      reason: `Top hit found is ${damage}. Ranking intent can prioritize heavy hitters first.`,
      queryPatch: `${trimmed} highest damage`,
    });
  }

  if (!normalizeTokens(trimmed).some((t) => ['fire', 'water', 'grass', 'lightning', 'psychic', 'darkness', 'metal', 'dragon', 'fighting', 'colorless'].includes(t))) {
    recs.push({
      id: 'add-energy-type',
      title: 'Add a specific type',
      reason: 'Type constraints improve precision and reduce irrelevant sets.',
      queryPatch: `${trimmed} fire`,
    });
  }

  return recs.sort((a, b) => a.id.localeCompare(b.id));
}

export function buildOptimizationCopy(query: string, recommendations: Recommendation[]): string[] {
  if (recommendations.length === 0) {
    return [`Current query: “${query}”. No extra optimization suggestions right now.`];
  }

  return recommendations.map((rec) => `${rec.title}: ${rec.reason}`);
}
