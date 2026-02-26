import type { NormalizedCardV1 } from '@/lib/metadata/schema/normalizedCardV1';

/**
 * Back-compat alias for existing consumers.
 * Canonical contract now lives in metadata/schema/normalizedCardV1.ts.
 */
export type NormalizedCard = NormalizedCardV1;

export type Recommendation = {
  id: string;
  title: string;
  reason: string;
  queryPatch: string;
};

export type SearchResponse = {
  query: string;
  results: NormalizedCard[];
  coolPicks: NormalizedCard[];
  recommendations: Recommendation[];
  optimizationCopy: string[];
  meta?: {
    mode: 'live' | 'fallback';
    source?: string;
    message?: string;
    retryable?: boolean;
  };
};
