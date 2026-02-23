import type { NormalizedCard } from './types';

function scoreCard(card: NormalizedCard, query: string): number {
  const q = query.toLowerCase();
  let score = 0;

  if (card.name.toLowerCase().includes(q)) score += 4;
  if (card.types.some((t) => q.includes(t.toLowerCase()) || t.toLowerCase().includes(q))) score += 3;
  if ((card.abilityText ?? '').toLowerCase().includes(q)) score += 2;
  if (card.attacks.some((a) => `${a.name} ${a.text ?? ''}`.toLowerCase().includes(q))) score += 2;
  if (card.hp && /\d+/.test(q) && Number(card.hp) >= Number(q.match(/\d+/)?.[0] ?? 0)) score += 1;

  return score;
}

export function pickCoolCards(cards: NormalizedCard[], query: string): NormalizedCard[] {
  const uniqueById = new Map<string, NormalizedCard>();
  for (const card of cards) {
    if (!uniqueById.has(card.id)) uniqueById.set(card.id, card);
  }

  return [...uniqueById.values()]
    .sort((a, b) => scoreCard(b, query) - scoreCard(a, query))
    .slice(0, 3);
}
