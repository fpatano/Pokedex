import { z } from 'zod';
import { buildPokemonTcgQuery } from './queryParser';
import { normalizeCard } from './normalize';
import { pickCoolCards } from './coolPicks';
import type { SearchResponse, NormalizedCard } from './types';

const UPSTREAM_TIMEOUT_MS = 7000;
const TCGDEX_TIMEOUT_MS = 10000;
const COOL_PICKS_PRIMARY_EXCLUSION_COUNT = 8;
const MAX_RESULTS = 24;

const debugEnabled = /^(1|true|yes|on)$/i.test(process.env.POKEMON_API_DEBUG ?? '');

function debugLog(message: string, meta?: Record<string, unknown>) {
  if (!debugEnabled) return;

  if (meta) {
    console.info(`[pokemon-api] ${message}`, meta);
    return;
  }

  console.info(`[pokemon-api] ${message}`);
}

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

const pokemonTcgSchema = z.object({
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

const tcgdexCardListSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string().optional(),
    image: z.string().optional(),
  })
);

const tcgdexCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().optional(),
  set: z.object({ name: z.string().optional() }).optional(),
  category: z.string().optional(),
  types: z.array(z.string()).optional(),
  hp: z.union([z.string(), z.number()]).optional(),
  abilities: z
    .array(
      z.object({
        effect: z.string().optional(),
      })
    )
    .optional(),
  attacks: z
    .array(
      z.object({
        name: z.string().optional(),
        damage: z.union([z.string(), z.number()]).optional(),
        effect: z.string().optional(),
      })
    )
    .optional(),
});

function withTimeoutSignal(timeoutMs: number): { controller: AbortController; timeout: NodeJS.Timeout } {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeout };
}

async function fetchFromPokemonTcg(userQuery: string): Promise<NormalizedCard[]> {
  const apiKey = process.env.POKEMON_TCG_API_KEY;
  if (!apiKey) {
    throw new PokemonApiError('MISCONFIGURED', 'Server missing Pokémon API configuration');
  }

  const q = buildPokemonTcgQuery(userQuery);
  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=${MAX_RESULTS}`;

  const { controller, timeout } = withTimeoutSignal(UPSTREAM_TIMEOUT_MS);
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

  debugLog('Fallback provider response', {
    provider: 'pokemontcg',
    status: res.status,
    query: userQuery,
  });

  if (!res.ok) {
    throw new PokemonApiError('UPSTREAM', `Pokemon TCG API error: ${res.status}`, res.status);
  }

  let payload: z.infer<typeof pokemonTcgSchema>;
  try {
    payload = pokemonTcgSchema.parse(await res.json());
  } catch {
    throw new PokemonApiError('INVALID_RESPONSE', 'Pokémon API returned invalid data');
  }

  return payload.data.map(normalizeCard);
}

function normalizeTcgdexCard(card: z.infer<typeof tcgdexCardSchema>): NormalizedCard {
  return {
    id: card.id,
    name: card.name,
    image: card.image ?? '',
    setName: card.set?.name ?? 'Unknown Set',
    supertype: card.category ?? 'Unknown',
    types: card.types ?? [],
    hp: card.hp != null ? String(card.hp) : undefined,
    abilityText: card.abilities?.[0]?.effect,
    attacks: (card.attacks ?? []).map((attack) => ({
      name: attack.name ?? 'Attack',
      damage: attack.damage != null ? String(attack.damage) : undefined,
      text: attack.effect,
    })),
  };
}

function buildTcgdexTerms(input: string): string[] {
  const tokens = input
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  const stopwords = new Set(['type', 'pokemon', 'largest', 'attack', 'points', 'with', 'and', 'the']);
  const important = [...new Set(tokens.filter((token) => token.length > 2 && !stopwords.has(token)))];

  return [...new Set([input.trim(), ...important])].filter(Boolean);
}

async function tcgdexFetchJson(url: string): Promise<unknown> {
  const { controller, timeout } = withTimeoutSignal(TCGDEX_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      next: { revalidate: 0 },
      signal: controller.signal,
    });

    debugLog('Primary provider response', {
      provider: 'tcgdex',
      status: res.status,
      url,
    });

    if (!res.ok) {
      throw new PokemonApiError('UPSTREAM', `TCGdex API error: ${res.status}`, res.status);
    }

    return await res.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new PokemonApiError('TIMEOUT', 'TCGdex API timed out, please try again');
    }

    if (error instanceof PokemonApiError) {
      throw error;
    }

    throw new PokemonApiError('UPSTREAM', 'TCGdex API request failed');
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFromTcgdex(userQuery: string): Promise<NormalizedCard[]> {
  const terms = buildTcgdexTerms(userQuery);
  const ids = new Set<string>();

  for (const term of terms) {
    const listJson = await tcgdexFetchJson(`https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(term)}`);
    const list = tcgdexCardListSchema.parse(listJson);

    for (const card of list) {
      ids.add(card.id);
      if (ids.size >= MAX_RESULTS) break;
    }

    if (ids.size >= MAX_RESULTS) break;
  }

  if (ids.size === 0) {
    const allJson = await tcgdexFetchJson('https://api.tcgdex.net/v2/en/cards');
    const all = tcgdexCardListSchema.parse(allJson);
    all.slice(0, MAX_RESULTS).forEach((card) => ids.add(card.id));
  }

  const cards = await Promise.all(
    [...ids].slice(0, MAX_RESULTS).map(async (id) => {
      const cardJson = await tcgdexFetchJson(`https://api.tcgdex.net/v2/en/cards/${id}`);
      return tcgdexCardSchema.parse(cardJson);
    })
  );

  return cards.map(normalizeTcgdexCard);
}

export async function searchCards(userQuery: string): Promise<SearchResponse> {
  let results: NormalizedCard[] = [];

  try {
    results = await fetchFromTcgdex(userQuery);
    debugLog('Search completed with primary provider', {
      provider: 'tcgdex',
      resultCount: results.length,
      query: userQuery,
    });
  } catch (primaryError) {
    debugLog('Primary provider failed, trying fallback', {
      provider: 'tcgdex',
      query: userQuery,
      error: primaryError instanceof Error ? primaryError.message : String(primaryError),
      status: primaryError instanceof PokemonApiError ? primaryError.status : undefined,
      code: primaryError instanceof PokemonApiError ? primaryError.code : undefined,
    });

    if (!process.env.POKEMON_TCG_API_KEY) {
      throw primaryError;
    }

    results = await fetchFromPokemonTcg(userQuery);
    debugLog('Search completed with fallback provider', {
      provider: 'pokemontcg',
      resultCount: results.length,
      query: userQuery,
    });
  }

  return {
    query: userQuery,
    results,
    coolPicks: pickCoolCards(results, userQuery, {
      excludedIds: results.slice(0, COOL_PICKS_PRIMARY_EXCLUSION_COUNT).map((card) => card.id),
    }),
  };
}
