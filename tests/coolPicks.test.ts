import { describe, expect, it } from 'vitest';
import { pickCoolCards } from '@/lib/coolPicks';
import type { NormalizedCard } from '@/lib/types';

const base = (id: string, name: string, types: string[], abilityText = ''): NormalizedCard => ({
  id,
  name,
  image: '',
  setName: 'Set',
  supertype: 'Pokémon',
  types,
  abilityText,
  attacks: [],
});

describe('pickCoolCards', () => {
  it('returns max 3 unique cards', () => {
    const cards = [
      base('1', 'Charizard', ['Fire'], 'Burning darkness'),
      base('1', 'Charizard Duplicate', ['Fire']),
      base('2', 'Arcanine', ['Fire']),
      base('3', 'Moltres', ['Fire']),
      base('4', 'Squirtle', ['Water']),
    ];

    const picks = pickCoolCards(cards, 'fire burn');
    expect(picks).toHaveLength(3);
    expect(new Set(picks.map((c) => c.id)).size).toBe(3);
  });
});
