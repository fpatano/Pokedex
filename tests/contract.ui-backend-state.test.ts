import { describe, expect, it } from 'vitest';
import { applyRecommendationMutation, buildGuidedQuery, createDefaultGuidedBuilderState } from '@/lib/uiState';
import { searchCards } from '@/lib/pokemonApi';
import { vi } from 'vitest';

describe('P0/P1 contract + idempotent state guardrails', () => {
  it('guided builder emits stable query contract', () => {
    const state = createDefaultGuidedBuilderState();
    expect(buildGuidedQuery(state)).toBe('fire pokemon highest damage 120');
  });

  it('recommendation mutation is idempotent', () => {
    const base = { appliedRecommendationIds: [] as string[] };
    const once = applyRecommendationMutation(base, 'rank-by-damage');
    const twice = applyRecommendationMutation(once, 'rank-by-damage');

    expect(once.appliedRecommendationIds).toEqual(['rank-by-damage']);
    expect(twice).toBe(once);
  });

  it('search response includes UI/backend/state contract fields', async () => {
    process.env.CARD_PROVIDER_PRIMARY = 'pokemontcg';
    process.env.ENABLE_POKEMONTCG_FALLBACK = '0';
    process.env.POKEMON_TCG_API_KEY = 'test-key';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: 'p-1', name: 'Charizard', supertype: 'Pokémon', types: ['Fire'], attacks: [{ name: 'Burn', damage: '180' }] }],
        }),
      })
    );

    const response = await searchCards('charizard');

    expect(response).toMatchObject({
      query: 'charizard',
      results: expect.any(Array),
      coolPicks: expect.any(Array),
      recommendations: expect.any(Array),
      optimizationCopy: expect.any(Array),
    });
  });
});
