export type QueryIntent = {
  wantsAttackDamageRanking: boolean;
  requiredTypes: string[];
};

export const TYPE_TOKENS = [
  'grass',
  'fire',
  'water',
  'lightning',
  'psychic',
  'fighting',
  'darkness',
  'metal',
  'dragon',
  'fairy',
  'colorless',
] as const;

export const ATTACK_DAMAGE_INTENT_PATTERNS = [
  /highest\s+damage/i,
  /largest\s+attack/i,
  /max(?:imum)?\s+damage/i,
  /strongest\s+attack/i,
  /most\s+damage/i,
] as const;

export function analyzeQueryIntent(query: string): QueryIntent {
  const lowered = query.toLowerCase();
  const requiredTypes = TYPE_TOKENS.filter((type) => new RegExp(`\\b${type}\\b`, 'i').test(lowered));
  const wantsAttackDamageRanking = ATTACK_DAMAGE_INTENT_PATTERNS.some((re) => re.test(query));

  return {
    wantsAttackDamageRanking,
    requiredTypes: [...requiredTypes],
  };
}
