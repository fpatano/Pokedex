import { describe, expect, it } from 'vitest';
import { PokemonApiError } from '@/lib/pokemonApi';
import { mapSearchError } from '@/lib/searchError';

describe('mapSearchError', () => {
  it('maps provider timeout and upstream errors', () => {
    expect(mapSearchError(new PokemonApiError('TIMEOUT', 'timed out'))).toEqual({ status: 504, message: 'timed out' });
    expect(mapSearchError(new PokemonApiError('UPSTREAM', 'upstream fail'))).toEqual({
      status: 502,
      message: 'Pokémon service is temporarily unavailable',
    });
  });

  it('maps no provider available to 503', () => {
    expect(mapSearchError(new PokemonApiError('NO_PROVIDER_AVAILABLE', 'No provider was attempted'))).toEqual({
      status: 503,
      message: 'No provider was attempted',
    });
  });
});
