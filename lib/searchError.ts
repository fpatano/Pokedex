import { PokemonApiError } from './pokemonApi';

export function mapSearchError(error: unknown): { status: number; message: string } {
  if (error instanceof PokemonApiError) {
    switch (error.code) {
      case 'MISCONFIGURED':
        return { status: 500, message: 'Server search configuration is unavailable' };
      case 'TIMEOUT':
        return { status: 504, message: error.message };
      case 'UPSTREAM':
        return { status: 502, message: 'Pokémon service is temporarily unavailable' };
      case 'INVALID_RESPONSE':
        return { status: 502, message: error.message };
      case 'NO_PROVIDER_AVAILABLE':
        return { status: 503, message: error.message };
      default:
        return { status: 500, message: 'Search failed' };
    }
  }

  const message = error instanceof Error ? error.message : 'Search failed';
  return { status: 500, message };
}
