import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchCards } from '@/lib/pokemonApi';

describe('searchCards attack-damage intent ranking', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.CARD_PROVIDER_PRIMARY = 'pokemontcg';
    process.env.ENABLE_POKEMONTCG_FALLBACK = '0';
    process.env.POKEMON_TCG_API_KEY = 'test-key';
  });

  it('surfaces water pokemon with attacks above energy cards for highest-damage query', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: 'e-1', name: 'Basic Water Energy', supertype: 'Energy', types: ['Water'], attacks: [] },
            { id: 'p-1', name: 'Gyarados', supertype: 'Pokémon', types: ['Water'], attacks: [{ name: 'Aqua Tail', damage: '90' }] },
            { id: 'p-2', name: 'Blastoise ex', supertype: 'Pokémon', types: ['Water'], attacks: [{ name: 'Twin Cannons', damage: '140+' }] },
            { id: 'p-3', name: 'Charizard ex', supertype: 'Pokémon', types: ['Fire'], attacks: [{ name: 'Burning Darkness', damage: '180' }] },
          ],
        }),
      })
    );

    const response = await searchCards('water type pokemon highest damage');

    expect(response.query).toBe('water type pokemon highest damage');
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results.slice(0, 2).map((card) => card.id)).toEqual(['p-2', 'p-1']);
    expect(response.results.some((card) => card.id === 'e-1')).toBe(false);
  });
});
