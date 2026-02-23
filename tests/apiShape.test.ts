import { describe, expect, it } from 'vitest';
import { normalizeCard } from '@/lib/normalize';

describe('normalizeCard', () => {
  it('normalizes key display fields for ui', () => {
    const card = normalizeCard({
      id: 'xy-1',
      name: 'Pikachu',
      images: { small: 'http://img' },
      set: { name: 'Base' },
      supertype: 'Pokémon',
      types: ['Lightning'],
      hp: '60',
      abilities: [{ text: 'Static' }],
      attacks: [{ name: 'Thunder Jolt', damage: '30', text: 'Flip a coin' }],
    });

    expect(card).toMatchObject({
      id: 'xy-1',
      name: 'Pikachu',
      image: 'http://img',
      setName: 'Base',
      supertype: 'Pokémon',
      types: ['Lightning'],
      hp: '60',
      abilityText: 'Static',
    });
    expect(card.attacks[0]).toMatchObject({ name: 'Thunder Jolt', damage: '30' });
  });
});
