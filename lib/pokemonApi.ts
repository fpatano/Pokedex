import { z } from 'zod';
import { buildPokemonTcgQuery } from './queryParser';
import { normalizeCard } from './normalize';
import { pickCoolCards } from './coolPicks';
import type { SearchResponse, NormalizedCard } from './types';

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
  code: 'TIMEOUT' | 'UPSTREAM' | 'INVALID_RESPONSE' | 'MISCONFIGURED' | 'NO_PROVIDER_AVAILABLE';
  status?: number;

  constructor(code: PokemonApiError['code'], message: string, status?: number) {
    super(message);
    this.name = 'PokemonApiError';
    this.code = code;
    this.status = status;
  }
}

type ProviderName = 'tcgdex' | 'pokemontcg';

type ProviderPolicy = {
  primary: ProviderName;
  fallbacks: ProviderName[];
};

type ProviderRuntimeConfig = {
  tcgdexTimeoutMs: number;
  pokemonTcgTimeoutMs: number;
  maxRetries: number;
  baseRetryDelayMs: number;
  maxRetryDelayMs: number;
  fallbackFailureThreshold: number;
  fallbackSuppressMs: number;
  providerCacheTtlMs: number;
};

type RetryContext = {
  provider: ProviderName;
  endpoint: string;
};

const providerCache = new Map<string, { expiresAt: number; value: unknown }>();

const fallbackCircuit = {
  failures: 0,
  suppressUntil: 0,
};

function parseNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseBooleanEnv(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (raw == null) return fallback;
  return /^(1|true|yes|on)$/i.test(raw);
}

function getRuntimeConfig(): ProviderRuntimeConfig {
  return {
    tcgdexTimeoutMs: parseNumberEnv('TCGDEX_TIMEOUT_MS', 10_000),
    pokemonTcgTimeoutMs: parseNumberEnv('POKEMON_TCG_TIMEOUT_MS', 7_000),
    maxRetries: parseNumberEnv('PROVIDER_MAX_RETRIES', 2),
    baseRetryDelayMs: parseNumberEnv('PROVIDER_RETRY_BASE_DELAY_MS', 200),
    maxRetryDelayMs: parseNumberEnv('PROVIDER_RETRY_MAX_DELAY_MS', 1_500),
    fallbackFailureThreshold: parseNumberEnv('PROVIDER_FALLBACK_FAILURE_THRESHOLD', 3),
    fallbackSuppressMs: parseNumberEnv('PROVIDER_FALLBACK_SUPPRESS_MS', 60_000),
    providerCacheTtlMs: parseNumberEnv('PROVIDER_CACHE_TTL_MS', 60_000),
  };
}

export function getProviderPolicy(): ProviderPolicy {
  const primaryRaw = (process.env.CARD_PROVIDER_PRIMARY ?? 'tcgdex').toLowerCase();
  const primary: ProviderName = primaryRaw === 'pokemontcg' ? 'pokemontcg' : 'tcgdex';

  const fallbacks: ProviderName[] = [];
  if (primary !== 'pokemontcg' && parseBooleanEnv('ENABLE_POKEMONTCG_FALLBACK', false)) {
    fallbacks.push('pokemontcg');
  }

  return { primary, fallbacks };
}

function withTimeoutSignal(timeoutMs: number): { controller: AbortController; timeout: NodeJS.Timeout } {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeout };
}

function backoffDelay(attempt: number, config: ProviderRuntimeConfig): number {
  const exp = config.baseRetryDelayMs * 2 ** attempt;
  const jitter = Math.floor(Math.random() * Math.max(50, config.baseRetryDelayMs));
  return Math.min(config.maxRetryDelayMs, exp + jitter);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status?: number): boolean {
  return status === 408 || status === 429 || (status != null && status >= 500);
}

export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof PokemonApiError)) return false;
  if (error.code === 'TIMEOUT') return true;
  if (error.code !== 'UPSTREAM') return false;
  return isRetryableStatus(error.status);
}

async function withRetries<T>(ctx: RetryContext, fn: () => Promise<T>, config: ProviderRuntimeConfig): Promise<{ value: T; retriesUsed: number }> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= config.maxRetries) {
    try {
      const value = await fn();
      return { value, retriesUsed: attempt };
    } catch (error) {
      lastError = error;
      if (attempt >= config.maxRetries || !isRetryableError(error)) {
        throw error;
      }

      const delayMs = backoffDelay(attempt, config);
      debugLog('Retrying provider request', {
        provider: ctx.provider,
        endpoint: ctx.endpoint,
        attempt: attempt + 1,
        maxRetries: config.maxRetries,
        delayMs,
        reason: error instanceof Error ? error.message : String(error),
      });
      await sleep(delayMs);
      attempt += 1;
    }
  }

  throw lastError;
}

function getProviderCache<T>(key: string): T | null {
  const hit = providerCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    providerCache.delete(key);
    return null;
  }
  return hit.value as T;
}

function setProviderCache(key: string, value: unknown, ttlMs: number): void {
  providerCache.set(key, {
    expiresAt: Date.now() + ttlMs,
    value,
  });
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

async function fetchFromPokemonTcg(userQuery: string, config: ProviderRuntimeConfig): Promise<NormalizedCard[]> {
  const apiKey = process.env.POKEMON_TCG_API_KEY;
  if (!apiKey) {
    throw new PokemonApiError('MISCONFIGURED', 'Pokémon TCG fallback is enabled but POKEMON_TCG_API_KEY is missing');
  }

  const q = buildPokemonTcgQuery(userQuery);
  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=${MAX_RESULTS}`;

  const result = await withRetries(
    { provider: 'pokemontcg', endpoint: '/v2/cards' },
    async () => {
      const { controller, timeout } = withTimeoutSignal(config.pokemonTcgTimeoutMs);
      const start = Date.now();
      try {
        const res = await fetch(url, {
          headers: {
            'X-Api-Key': apiKey,
          },
          next: { revalidate: 0 },
          signal: controller.signal,
        });

        const latencyMs = Date.now() - start;
        debugLog('Provider telemetry', { provider: 'pokemontcg', status: res.status, latencyMs, query: userQuery });

        if (!res.ok) {
          throw new PokemonApiError('UPSTREAM', `Pokemon TCG API error: ${res.status}`, res.status);
        }

        return pokemonTcgSchema.parse(await res.json());
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new PokemonApiError('TIMEOUT', 'Pokémon API timed out, please try again');
        }

        if (error instanceof PokemonApiError) {
          throw error;
        }

        if (error instanceof z.ZodError) {
          throw new PokemonApiError('INVALID_RESPONSE', 'Pokémon API returned invalid data');
        }

        throw new PokemonApiError('UPSTREAM', 'Pokémon API request failed');
      } finally {
        clearTimeout(timeout);
      }
    },
    config
  );

  debugLog('Provider completed', {
    provider: 'pokemontcg',
    query: userQuery,
    retriesUsed: result.retriesUsed,
    resultCount: result.value.data.length,
  });

  return result.value.data.map(normalizeCard);
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

async function tcgdexFetchJson(url: string, config: ProviderRuntimeConfig): Promise<unknown> {
  const cacheKey = `tcgdex:${url}`;
  const cached = getProviderCache<unknown>(cacheKey);
  if (cached) {
    debugLog('Provider cache hit', { provider: 'tcgdex', url });
    return cached;
  }

  const result = await withRetries(
    { provider: 'tcgdex', endpoint: url },
    async () => {
      const { controller, timeout } = withTimeoutSignal(config.tcgdexTimeoutMs);
      const start = Date.now();
      try {
        const res = await fetch(url, {
          next: { revalidate: 0 },
          signal: controller.signal,
        });

        const latencyMs = Date.now() - start;
        debugLog('Provider telemetry', { provider: 'tcgdex', status: res.status, latencyMs, url });

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
    },
    config
  );

  debugLog('Provider completed', { provider: 'tcgdex', url, retriesUsed: result.retriesUsed });
  setProviderCache(cacheKey, result.value, config.providerCacheTtlMs);
  return result.value;
}

async function fetchFromTcgdex(userQuery: string, config: ProviderRuntimeConfig): Promise<NormalizedCard[]> {
  const terms = buildTcgdexTerms(userQuery);
  const ids = new Set<string>();

  for (const term of terms) {
    const listJson = await tcgdexFetchJson(`https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(term)}`, config);
    const list = tcgdexCardListSchema.parse(listJson);

    for (const card of list) {
      ids.add(card.id);
      if (ids.size >= MAX_RESULTS) break;
    }

    if (ids.size >= MAX_RESULTS) break;
  }

  if (ids.size === 0) {
    const allJson = await tcgdexFetchJson('https://api.tcgdex.net/v2/en/cards', config);
    const all = tcgdexCardListSchema.parse(allJson);
    all.slice(0, MAX_RESULTS).forEach((card) => ids.add(card.id));
  }

  const cards = await Promise.all(
    [...ids].slice(0, MAX_RESULTS).map(async (id) => {
      const cardJson = await tcgdexFetchJson(`https://api.tcgdex.net/v2/en/cards/${id}`, config);
      return tcgdexCardSchema.parse(cardJson);
    })
  );

  return cards.map(normalizeTcgdexCard);
}

function markFallbackFailure(config: ProviderRuntimeConfig): void {
  fallbackCircuit.failures += 1;
  if (fallbackCircuit.failures >= config.fallbackFailureThreshold) {
    fallbackCircuit.suppressUntil = Date.now() + config.fallbackSuppressMs;
  }
}

function markFallbackSuccess(): void {
  fallbackCircuit.failures = 0;
  fallbackCircuit.suppressUntil = 0;
}

function canUseFallback(): boolean {
  return Date.now() >= fallbackCircuit.suppressUntil;
}

export async function searchCards(userQuery: string): Promise<SearchResponse> {
  const policy = getProviderPolicy();
  const config = getRuntimeConfig();
  const providers: ProviderName[] = [policy.primary, ...policy.fallbacks.filter((provider) => provider !== policy.primary)];

  let lastError: unknown = new PokemonApiError('NO_PROVIDER_AVAILABLE', 'No provider was attempted');

  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index];
    const isFallback = index > 0;

    if (isFallback && !canUseFallback()) {
      debugLog('Fallback temporarily suppressed by circuit', {
        provider,
        suppressUntil: fallbackCircuit.suppressUntil,
      });
      continue;
    }

    try {
      const results = provider === 'tcgdex' ? await fetchFromTcgdex(userQuery, config) : await fetchFromPokemonTcg(userQuery, config);
      if (isFallback) {
        markFallbackSuccess();
      }

      return {
        query: userQuery,
        results,
        coolPicks: pickCoolCards(results, userQuery, {
          excludedIds: results.slice(0, COOL_PICKS_PRIMARY_EXCLUSION_COUNT).map((card) => card.id),
        }),
      };
    } catch (error) {
      lastError = error;

      if (isFallback) {
        markFallbackFailure(config);
      }

      debugLog('Provider failed', {
        provider,
        query: userQuery,
        fallback: isFallback,
        error: error instanceof Error ? error.message : String(error),
        code: error instanceof PokemonApiError ? error.code : undefined,
        status: error instanceof PokemonApiError ? error.status : undefined,
      });
    }
  }

  if (policy.fallbacks.length > 0 && !canUseFallback()) {
    throw new PokemonApiError('UPSTREAM', 'Fallback provider temporarily suppressed after repeated failures');
  }

  if (lastError instanceof PokemonApiError) {
    throw lastError;
  }

  throw new PokemonApiError('UPSTREAM', 'No provider could satisfy this request');
}
