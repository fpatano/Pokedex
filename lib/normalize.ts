import type { NormalizedCard } from './types';

type RawCard = {
  id: string;
  name: string;
  images?: { small?: string; large?: string };
  set?: { name?: string };
  supertype?: string;
  types?: string[];
  hp?: string;
  abilities?: Array<{ text?: string }>;
  attacks?: Array<{ name?: string; damage?: string; text?: string }>;
};

export function normalizeCard(card: RawCard): NormalizedCard {
  return {
    id: card.id,
    name: card.name,
    image: card.images?.small ?? card.images?.large ?? '',
    setName: card.set?.name ?? 'Unknown Set',
    supertype: card.supertype ?? 'Unknown',
    types: card.types ?? [],
    hp: card.hp,
    abilityText: card.abilities?.[0]?.text,
    attacks: (card.attacks ?? []).map((a) => ({
      name: a.name ?? 'Attack',
      damage: a.damage,
      text: a.text,
    })),
  };
}
