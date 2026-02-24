import { afterEach, describe, expect, it } from 'vitest';
import { getProviderPolicy, isRetryableError, PokemonApiError } from '@/lib/pokemonApi';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('provider policy', () => {
  it('defaults to tcgdex with no fallback', () => {
    delete process.env.CARD_PROVIDER_PRIMARY;
    delete process.env.ENABLE_POKEMONTCG_FALLBACK;

    const policy = getProviderPolicy();
    expect(policy).toEqual({ primary: 'tcgdex', fallbacks: [] });
  });

  it('enables pokemontcg fallback only when flag is on', () => {
    process.env.CARD_PROVIDER_PRIMARY = 'tcgdex';
    process.env.ENABLE_POKEMONTCG_FALLBACK = 'true';

    const policy = getProviderPolicy();
    expect(policy).toEqual({ primary: 'tcgdex', fallbacks: ['pokemontcg'] });
  });

  it('supports explicit pokemontcg primary', () => {
    process.env.CARD_PROVIDER_PRIMARY = 'pokemontcg';
    process.env.ENABLE_POKEMONTCG_FALLBACK = 'true';

    const policy = getProviderPolicy();
    expect(policy).toEqual({ primary: 'pokemontcg', fallbacks: [] });
  });
});

describe('retry eligibility', () => {
  it('retries timeout and retryable upstream statuses', () => {
    expect(isRetryableError(new PokemonApiError('TIMEOUT', 'timeout'))).toBe(true);
    expect(isRetryableError(new PokemonApiError('UPSTREAM', 'rate limited', 429))).toBe(true);
    expect(isRetryableError(new PokemonApiError('UPSTREAM', 'server error', 503))).toBe(true);
  });

  it('does not retry non-retryable errors', () => {
    expect(isRetryableError(new PokemonApiError('INVALID_RESPONSE', 'bad payload'))).toBe(false);
    expect(isRetryableError(new PokemonApiError('UPSTREAM', 'bad request', 400))).toBe(false);
    expect(isRetryableError(new Error('oops'))).toBe(false);
  });
});
