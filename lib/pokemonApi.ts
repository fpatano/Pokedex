import { z } from 'zod';
import { buildPokemonTcgQuery } from './queryParser';
import { normalizeCard } from './normalize';
import { pickCoolCards } from './coolPicks';
import type { SearchResponse } from './types';

const UPSTREAM_TIMEOUT_MS = 7000;
const COOL_PICKS_PRIMARY_EXCLUSION_COUNT = 8;

export class PokemonApiError extends Error {
  code: 'TIMEOUT' | 'UPSTREAM' | 'INVALID_RESPONSE' | 'MISCONFIGURED';
  status?: number;

  constructor(code: PokemonApiError['code'], message: string, status?: number) {
    super(message);
    this.name = 'PokemonApiError';
    this.code = code;
    this.status = status;
  }
}

const dataSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      images: z.object({ small: z.string().optional(), large: z.string().optional() }).optional(),
      set: z.object({ name: z.string().optional() }).optional(),
      supertype: z.string().optional(),
      types: z.array(z.string()).optional(),
      hp: z.string().optional(),
      abilities: z.array(z.object({ text: z.string().optional() })).optional(),
      attacks: z.array(z.object({ name: z.string().optional(), damage: z.string().optional(), text: z.string().optional() })).optional(),
    })
  )
});

export async function searchCards(userQuery: string): Promise<SearchResponse> {
  const apiKey = process.env.POKEMON_TCG_API_KEY;
  if (!apiKey) {
    throw new PokemonApiError('MISCONFIGURED', 'Server missing Pokémon API configuration');
  }

  const q = buildPokemonTcgQuery(userQuery);
  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=24`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        'X-Api-Key': apiKey,
      },
      next: { revalidate: 0 },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new PokemonApiError('TIMEOUT', 'Pokémon API timed out, please try again');
    }

    throw new PokemonApiError('UPSTREAM', 'Pokémon API request failed');
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new PokemonApiError('UPSTREAM', `Pokemon TCG API error: ${res.status}`, res.status);
  }

  let payload: z.infer<typeof dataSchema>;
  try {
    payload = dataSchema.parse(await res.json());
  } catch {
    throw new PokemonApiError('INVALID_RESPONSE', 'Pokémon API returned invalid data');
  }

  const results = payload.data.map(normalizeCard);

  return {
    query: userQuery,
    results,
    coolPicks: pickCoolCards(results, userQuery, {
      excludedIds: results.slice(0, COOL_PICKS_PRIMARY_EXCLUSION_COUNT).map((card) => card.id),
    }),
  };
}
