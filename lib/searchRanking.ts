import type { NormalizedCard } from './types';

type QueryIntent = {
  wantsAttackDamageRanking: boolean;
  requiredTypes: string[];
};

const TYPE_TOKENS = ['grass', 'fire', 'water', 'lightning', 'psychic', 'fighting', 'darkness', 'metal', 'dragon', 'fairy', 'colorless'];

const ATTACK_DAMAGE_INTENT_PATTERNS = [
  /highest\s+damage/i,
  /largest\s+attack/i,
  /max(?:imum)?\s+damage/i,
  /strongest\s+attack/i,
  /most\s+damage/i,
];

function parseDamageValue(raw?: string): number {
  if (!raw) return Number.NEGATIVE_INFINITY;
  const nums = raw.match(/\d+/g);
  if (!nums?.length) return Number.NEGATIVE_INFINITY;
  return Math.max(...nums.map((n) => Number(n)).filter((n) => Number.isFinite(n)));
}

function maxAttackDamage(card: NormalizedCard): number {
  return Math.max(...card.attacks.map((attack) => parseDamageValue(attack.damage)), Number.NEGATIVE_INFINITY);
}

function isPokemonCard(card: NormalizedCard): boolean {
  return card.supertype.toLowerCase().includes('pok');
}

function hasType(card: NormalizedCard, t: string): boolean {
  return card.types.some((type) => type.toLowerCase() === t);
}

export function analyzeQueryIntent(query: string): QueryIntent {
  const lowered = query.toLowerCase();
  const requiredTypes = TYPE_TOKENS.filter((type) => new RegExp(`\\b${type}\\b`, 'i').test(lowered));
  const wantsAttackDamageRanking = ATTACK_DAMAGE_INTENT_PATTERNS.some((re) => re.test(query));

  return {
    wantsAttackDamageRanking,
    requiredTypes,
  };
}

export function rerankCardsForQuery(cards: NormalizedCard[], query: string): NormalizedCard[] {
  const intent = analyzeQueryIntent(query);
  if (!intent.wantsAttackDamageRanking) {
    return cards;
  }

  const ranked = cards
    .filter((card) => {
      if (!isPokemonCard(card)) return false;
      if (card.attacks.length === 0) return false;
      if (intent.requiredTypes.length > 0 && !intent.requiredTypes.some((t) => hasType(card, t))) return false;
      return true;
    })
    .map((card, idx) => ({ card, idx, maxDamage: maxAttackDamage(card) }))
    .filter(({ maxDamage }) => Number.isFinite(maxDamage))
    .sort((a, b) => {
      if (b.maxDamage !== a.maxDamage) return b.maxDamage - a.maxDamage;
      return a.idx - b.idx;
    })
    .map(({ card }) => card);

  if (ranked.length === 0) {
    return cards;
  }

  return ranked;
}

export function getCardMaxAttackDamage(card: NormalizedCard): number {
  return maxAttackDamage(card);
}
