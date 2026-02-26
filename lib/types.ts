import type { NormalizedCardV1 } from '@/lib/metadata/schema/normalizedCardV1';

/**
 * Back-compat alias for existing consumers.
 * Canonical contract now lives in metadata/schema/normalizedCardV1.ts.
 */
export type NormalizedCard = NormalizedCardV1;

export type SearchResponse = {
  query: string;
  results: NormalizedCard[];
  coolPicks: NormalizedCard[];
};
