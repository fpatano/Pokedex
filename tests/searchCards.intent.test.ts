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

  it('uses a broader tcgdex candidate pool and can surface high-damage cards past the first 24 IDs', async () => {
    process.env.CARD_PROVIDER_PRIMARY = 'tcgdex';

    const typeList = Array.from({ length: 40 }, (_, i) => ({
      id: i === 30 ? 'w-top' : `w-${i + 1}`,
      name: `Water ${i + 1}`,
      image: `img-${i + 1}`,
    }));

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/cards?types=Water&category=Pokemon')) {
          return {
            ok: true,
            status: 200,
            json: async () => typeList,
          };
        }

        if (url.includes('/cards?name=')) {
          return {
            ok: true,
            status: 200,
            json: async () => [],
          };
        }

        const id = url.split('/').pop() ?? 'unknown';
        const numeric = Number((id.match(/\d+/)?.[0] ?? '1'));
        const damage = id === 'w-top' ? '320' : String(40 + numeric);

        return {
          ok: true,
          status: 200,
          json: async () => ({
            id,
            name: id,
            category: 'Pokemon',
            types: ['Water'],
            attacks: [{ name: 'Hit', damage }],
          }),
        };
      })
    );

    const response = await searchCards('water type pokemon highest damage');

    expect(response.results).toHaveLength(24);
    expect(response.results[0]?.id).toBe('w-top');
  });
});
