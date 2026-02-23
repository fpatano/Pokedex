const TYPE_TOKENS = [
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
  'colorless'
];

export function buildPokemonTcgQuery(input: string): string {
  const query = input.trim().toLowerCase();
  if (!query) return '*';

  const tokens = query.split(/\s+/).filter(Boolean);
  const clauses: string[] = [];

  for (const token of tokens) {
    if (TYPE_TOKENS.includes(token)) {
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

  return clauses.join(' OR ');
}
