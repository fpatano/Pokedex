import { describe, expect, it, vi } from 'vitest';
import { buildOptimizationCopy, issueRecommendations } from '@/lib/recommendations';
import type { NormalizedCard } from '@/lib/types';

const card = (id: string, damage: string): NormalizedCard => ({
  id,
  name: id,
  image: '',
  setName: 'Set',
  supertype: 'Pokémon',
  types: ['Fire'],
  attacks: [{ name: 'Hit', damage }],
});

describe('recommendation ruleset', () => {
  it('is deterministic for same query/results', () => {
    const results = [card('a', '120'), card('b', '200')];

    const first = issueRecommendations('charizard', results);
    const second = issueRecommendations('charizard', results);

    expect(second).toEqual(first);
    expect(first.map((r) => r.id)).toEqual(['add-energy-type', 'narrow-to-pokemon', 'rank-by-damage']);
  });

  it('returns empty recommendations when kill switch is active', async () => {
    vi.stubEnv('RECOMMENDATIONS_KILL_SWITCH', '1');
    vi.resetModules();
    const mod = await import('@/lib/recommendations');

    const recs = mod.issueRecommendations('charizard', [card('a', '100')]);
    expect(recs).toEqual([]);

    vi.unstubAllEnvs();
  });

  it('builds actionable optimization copy lines', () => {
    const recs = issueRecommendations('charizard', [card('a', '120')]);
    const copy = buildOptimizationCopy('charizard', recs);
    expect(copy.length).toBeGreaterThan(0);
    expect(copy[0]).toContain(':');
  });
});
