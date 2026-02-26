import type { NormalizedCard } from './types';
import { normalizeCardMetadata } from '@/lib/metadata/normalizer/metadataNormalizer';

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
  return normalizeCardMetadata({
    id: card.id,
    name: card.name,
    image: card.images?.small ?? card.images?.large,
    setName: card.set?.name,
    supertype: card.supertype,
    types: card.types,
    hp: card.hp,
    abilityText: card.abilities?.[0]?.text,
    attacks: (card.attacks ?? []).map((a) => ({
      name: a.name ?? '',
      damage: a.damage,
      text: a.text,
    })),
  });
}
