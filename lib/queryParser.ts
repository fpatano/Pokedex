import { analyzeQueryIntent, TYPE_TOKENS } from './queryIntent';

const TYPE_TOKEN_SET = new Set(TYPE_TOKENS);

export function buildPokemonTcgQuery(input: string): string {
  const query = input.trim().toLowerCase();
  if (!query) return '*';

  const tokens = query.split(/\s+/).filter(Boolean);
  const clauses: string[] = [];

  for (const token of tokens) {
    if (TYPE_TOKEN_SET.has(token as (typeof TYPE_TOKENS)[number])) {
      clauses.push(`types:${token}`);
      continue;
    }

    if (/^\d+$/.test(token)) {
      clauses.push(`hp:[${token} TO *]`);
      clauses.push(`attacks.damage:*${token}*`);
      continue;
    }

    if (token.length <= 2) {
      clauses.push(`name:*${token}*`);
      continue;
    }

    clauses.push(`name:*${token}*`);
    clauses.push(`attacks.text:*${token}*`);
    clauses.push(`abilities.text:*${token}*`);
  }

  const baseQuery = clauses.join(' OR ');
  const intent = analyzeQueryIntent(input);

  if (!intent.wantsAttackDamageRanking) {
    return baseQuery;
  }

  return `(${baseQuery}) AND supertype:pokemon AND attacks.name:*`;
}
