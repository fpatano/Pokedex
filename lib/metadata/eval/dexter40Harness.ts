import { dexter40Queries, dexterFixtureCards, type DexterQueryFixture } from '@/lib/metadata/eval/dexter40Fixtures';
import { mapTcgdexToNormalizedDraft } from '@/lib/metadata/adapter/tcgdexMapper';
import { normalizeCardMetadata } from '@/lib/metadata/normalizer/metadataNormalizer';
import { validateNormalizedCard } from '@/lib/metadata/validator/normalizedCardValidator';
import type { NormalizedCardV1 } from '@/lib/metadata/schema/normalizedCardV1';

export type DexterQueryResult = {
  id: string;
  query: string;
  passed: boolean;
  matchedCardIds: string[];
};

export type Dexter40Evaluation = {
  totalCards: number;
  mappedCards: number;
  mappingSuccessRate: number;
  validationFailRate: number;
  topFailureReasons: Array<{ code: string; count: number }>;
  totalQueries: number;
  passedQueries: number;
  queryPassRate: number;
  queryResults: DexterQueryResult[];
};

function maxDamage(card: NormalizedCardV1): number {
  const vals = card.attacks.map((attack) => Number.parseInt(attack.damage ?? '0', 10)).filter((n) => Number.isFinite(n));
  return vals.length > 0 ? Math.max(...vals) : 0;
}

function matchExpectation(card: NormalizedCardV1, expectation: DexterQueryFixture['expectAny'][number]): boolean {
  if (expectation.field === 'name') {
    return card.name.toLowerCase().includes(String(expectation.value).toLowerCase());
  }
  if (expectation.field === 'type') {
    const target = String(expectation.value).toLowerCase();
    const aliases: Record<string, string> = { electric: 'lightning', green: 'grass', red: 'fire', blue: 'water' };
    const resolved = aliases[target] ?? target;
    return card.types.some((t) => t.toLowerCase() === resolved);
  }
  if (expectation.field === 'supertype') {
    return card.supertype.toLowerCase() === String(expectation.value).toLowerCase();
  }
  return maxDamage(card) >= Number(expectation.value);
}

function evaluateQuery(cards: NormalizedCardV1[], fixture: DexterQueryFixture): DexterQueryResult {
  const matched = cards.filter((card) => fixture.expectAny.some((expectation) => matchExpectation(card, expectation)));
  return {
    id: fixture.id,
    query: fixture.query,
    passed: matched.length > 0,
    matchedCardIds: matched.map((card) => card.id),
  };
}

export function runDexter40Evaluation(): Dexter40Evaluation {
  const normalized = dexterFixtureCards.map((raw) => normalizeCardMetadata(mapTcgdexToNormalizedDraft(raw)));
  const validations = normalized.map((card) => validateNormalizedCard(card));

  const validCards = validations.filter((result) => result.ok).map((result) => result.card);
  const invalid = validations.filter((result) => !result.ok);

  const reasonCounts = new Map<string, number>();
  invalid.flatMap((entry) => entry.errors).forEach((error) => {
    reasonCounts.set(error.code, (reasonCounts.get(error.code) ?? 0) + 1);
  });

  const queryResults = dexter40Queries.map((q) => evaluateQuery(validCards, q));
  const passedQueries = queryResults.filter((q) => q.passed).length;

  return {
    totalCards: dexterFixtureCards.length,
    mappedCards: normalized.length,
    mappingSuccessRate: normalized.length / dexterFixtureCards.length,
    validationFailRate: invalid.length / normalized.length,
    topFailureReasons: [...reasonCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, count]) => ({ code, count })),
    totalQueries: dexter40Queries.length,
    passedQueries,
    queryPassRate: passedQueries / dexter40Queries.length,
    queryResults,
  };
}
