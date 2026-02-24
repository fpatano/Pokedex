import { describe, expect, it } from 'vitest';
import { rerankCardsForQuery } from '@/lib/searchRanking';
import type { NormalizedCard } from '@/lib/types';

function card(input: Partial<NormalizedCard>): NormalizedCard {
  return {
    id: input.id ?? 'id',
    name: input.name ?? 'Card',
    image: input.image ?? '',
    setName: input.setName ?? 'Set',
    supertype: input.supertype ?? 'Pokémon',
    types: input.types ?? [],
    hp: input.hp,
    abilityText: input.abilityText,
    attacks: input.attacks ?? [],
  };
}

describe('rerankCardsForQuery', () => {
  it('prioritizes typed pokemon with highest attack damage for damage-ranking intent', () => {
    const cards = [
      card({ id: 'energy', name: 'Basic Water Energy', supertype: 'Energy', types: ['Water'], attacks: [] }),
      card({ id: 'w1', name: 'Water Mon 120', types: ['Water'], attacks: [{ name: 'Splash', damage: '120' }] }),
      card({ id: 'w2', name: 'Water Mon 220', types: ['Water'], attacks: [{ name: 'Tsunami', damage: '220+' }] }),
      card({ id: 'f1', name: 'Fire Mon 300', types: ['Fire'], attacks: [{ name: 'Blast', damage: '300' }] }),
    ];

    const ranked = rerankCardsForQuery(cards, 'water type pokemon highest damage');

    expect(ranked.map((c) => c.id)).toEqual(['w2', 'w1']);
  });

  it('does not alter ordering for non damage-ranking intents', () => {
    const cards = [
      card({ id: 'a', name: 'A' }),
      card({ id: 'b', name: 'B' }),
    ];

    const ranked = rerankCardsForQuery(cards, 'water pokemon');
    expect(ranked.map((c) => c.id)).toEqual(['a', 'b']);
  });
});
