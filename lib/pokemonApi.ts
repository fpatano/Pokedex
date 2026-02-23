import { z } from 'zod';
import { buildPokemonTcgQuery } from './queryParser';
import { normalizeCard } from './normalize';
import { pickCoolCards } from './coolPicks';
import type { SearchResponse } from './types';

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
  if (!apiKey) throw new Error('Missing POKEMON_TCG_API_KEY');

  const q = buildPokemonTcgQuery(userQuery);
  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=24`;

  const res = await fetch(url, {
    headers: {
      'X-Api-Key': apiKey,
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Pokemon TCG API error: ${res.status}`);
  }

  const payload = dataSchema.parse(await res.json());
  const results = payload.data.map(normalizeCard);

  return {
    query: userQuery,
    results,
    coolPicks: pickCoolCards(results, userQuery),
  };
}
