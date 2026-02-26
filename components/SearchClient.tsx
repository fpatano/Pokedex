'use client';

import React from 'react';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { shouldApplyResponse } from '@/lib/requestGuard';
import { applyRecommendationMutation, buildGuidedQuery, createDefaultGuidedBuilderState } from '@/lib/uiState';
import type { CoachResponse, NormalizedCard, SearchResponse } from '@/lib/types';

function CardThumb({ src, alt }: { src: string; alt: string }) {
  if (!src) return <div className="mb-2 h-44 w-full rounded bg-slate-700" />;
  return <Image src={src} alt={alt} width={245} height={342} unoptimized className="mb-2 h-auto w-full rounded" />;
}

type CollectionEntry = {
  card: NormalizedCard;
  quantity: number;
};

const DEFAULT_DISCOVERY_QUERY = 'popular pokemon cards';
const COLLECTION_STORAGE_KEY = 'pokedex.collection.v1';

function readCollectionFromStorage(): CollectionEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(COLLECTION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CollectionEntry[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry) => entry?.card?.id && Number.isFinite(entry?.quantity))
      .map((entry) => ({ ...entry, quantity: Math.max(1, Math.floor(entry.quantity)) }));
  } catch {
    return [];
  }
}

async function persistCollection(entries: CollectionEntry[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(entries));
}

export default function SearchClient() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<NormalizedCard | null>(null);
  const [builderState, setBuilderState] = useState(createDefaultGuidedBuilderState());
  const [uiState, setUiState] = useState({ appliedRecommendationIds: [] as string[] });
  const [retryNonce, setRetryNonce] = useState(0);
  const [coachPrompt, setCoachPrompt] = useState('fire deck highest damage 180');
  const [coachResult, setCoachResult] = useState<CoachResponse | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  const [collection, setCollection] = useState<CollectionEntry[]>([]);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [collectionNameFilter, setCollectionNameFilter] = useState('');
  const [collectionTypeFilter, setCollectionTypeFilter] = useState('all');
  const [collectionAssistEnabled, setCollectionAssistEnabled] = useState(false);
  const [pendingCardIds, setPendingCardIds] = useState<string[]>([]);

  const requestSequenceRef = useRef(0);
  const debouncedQuery = useMemo(() => query.trim(), [query]);
  const hasUserQuery = debouncedQuery.length > 0;
  const activeBaseQuery = hasUserQuery ? debouncedQuery : DEFAULT_DISCOVERY_QUERY;

  const collectionTypeHints = useMemo(() => {
    const counts = new Map<string, number>();
    collection.forEach((entry) => {
      entry.card.types.forEach((type) => {
        counts.set(type, (counts.get(type) ?? 0) + entry.quantity);
      });
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type)
      .slice(0, 3);
  }, [collection]);

  const assistedQuery = useMemo(() => {
    if (!collectionAssistEnabled || collectionTypeHints.length === 0) return activeBaseQuery;
    return `${activeBaseQuery} synergy with ${collectionTypeHints.join(' ')}`;
  }, [activeBaseQuery, collectionAssistEnabled, collectionTypeHints]);

  useEffect(() => {
    setCollection(readCollectionFromStorage());
  }, []);

  useEffect(() => {
    const requestId = ++requestSequenceRef.current;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(assistedQuery)}`, { signal: controller.signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Search failed');

        if (shouldApplyResponse(requestId, requestSequenceRef.current)) setData(json as SearchResponse);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;

        if (shouldApplyResponse(requestId, requestSequenceRef.current)) {
          setData(null);
          setError(e instanceof Error ? e.message : 'Unknown error');
        }
      } finally {
        if (shouldApplyResponse(requestId, requestSequenceRef.current)) setLoading(false);
      }
    }, hasUserQuery ? 350 : 0);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [assistedQuery, hasUserQuery, retryNonce]);

  async function runCoachDemo(prompt: string) {
    setCoachLoading(true);
    setCoachError(null);

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contractVersion: 'coach-core.v1',
          intake: {
            objective: prompt,
            favoriteTypes: collectionTypeHints,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Coach request failed');
      setCoachResult(json as CoachResponse);
    } catch (e) {
      setCoachResult(null);
      setCoachError(e instanceof Error ? e.message : 'Coach request failed');
    } finally {
      setCoachLoading(false);
    }
  }

  function applyGuidedBuilder() {
    setQuery(buildGuidedQuery(builderState));
  }

  function applyRecommendation(id: string, queryPatch: string) {
    setUiState((prev) => applyRecommendationMutation(prev, id));
    setQuery(queryPatch);
  }

  async function applyCollectionChange(cardId: string, update: (prev: CollectionEntry[]) => CollectionEntry[]) {
    if (pendingCardIds.includes(cardId)) return;

    setPendingCardIds((prev) => [...prev, cardId]);
    setCollectionError(null);

    let previousSnapshot: CollectionEntry[] = [];
    let nextSnapshot: CollectionEntry[] = [];

    setCollection((prev) => {
      previousSnapshot = prev;
      nextSnapshot = update(prev);
      return nextSnapshot;
    });

    try {
      await persistCollection(nextSnapshot);
    } catch {
      setCollection(previousSnapshot);
      setCollectionError('Collection update failed. Your previous state was restored.');
    } finally {
      setPendingCardIds((prev) => prev.filter((id) => id !== cardId));
    }
  }

  async function addToCollection(card: NormalizedCard) {
    await applyCollectionChange(card.id, (prev) => {
      const existing = prev.find((entry) => entry.card.id === card.id);
      if (existing) {
        return prev.map((entry) => (entry.card.id === card.id ? { ...entry, quantity: entry.quantity + 1 } : entry));
      }

      return [...prev, { card, quantity: 1 }];
    });
  }

  async function updateCollectionQuantity(cardId: string, quantity: number) {
    await applyCollectionChange(cardId, (prev) => {
      if (quantity <= 0) {
        return prev.filter((entry) => entry.card.id !== cardId);
      }

      return prev.map((entry) => (entry.card.id === cardId ? { ...entry, quantity } : entry));
    });
  }

  const normalizedNameFilter = collectionNameFilter.trim().toLowerCase();
  const allCollectionTypes = useMemo(() => {
    return Array.from(
      new Set(
        collection
          .flatMap((entry) => entry.card.types)
          .filter((type) => type && type.trim().length > 0)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [collection]);

  const filteredCollection = useMemo(() => {
    return collection.filter((entry) => {
      const nameMatch = normalizedNameFilter.length === 0 || entry.card.name.toLowerCase().includes(normalizedNameFilter);
      const typeMatch = collectionTypeFilter === 'all' || entry.card.types.includes(collectionTypeFilter);
      return nameMatch && typeMatch;
    });
  }, [collection, normalizedNameFilter, collectionTypeFilter]);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-2 text-3xl font-bold">Pokédex Search</h1>
      <p className="mb-4 text-sm text-slate-300">Find Pokémon TCG cards, then open card details for set/type/hp/ability/attacks.</p>

      <section className="mb-4 rounded border border-violet-500/40 bg-slate-900 p-4" data-testid="coach-demo">
        <h2 className="text-lg font-semibold">Coach Core Demo (v1)</h2>
        <p className="mb-2 text-sm text-slate-300">Demo coach-core contract via <code>/api/coach</code>: deterministic archetype + plan, or explicit fallback when critical intake is missing.</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              const happyPrompt = 'fire deck highest damage 180';
              setCoachPrompt(happyPrompt);
              void runCoachDemo(happyPrompt);
            }}
            className="rounded border border-violet-400/60 px-2 py-1 text-xs hover:bg-violet-400/10"
          >
            Run Happy Path
          </button>
          <button
            onClick={() => {
              const fallbackPrompt = 'help me';
              setCoachPrompt(fallbackPrompt);
              void runCoachDemo(fallbackPrompt);
            }}
            className="rounded border border-amber-400/60 px-2 py-1 text-xs hover:bg-amber-400/10"
          >
            Run Fallback Path
          </button>
        </div>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-slate-300">Coach prompt</span>
          <input
            value={coachPrompt}
            onChange={(e) => setCoachPrompt(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-800 p-2"
          />
        </label>
        <button
          onClick={() => void runCoachDemo(coachPrompt)}
          className="mt-2 rounded bg-violet-600 px-3 py-2 text-sm font-semibold hover:bg-violet-500"
          disabled={coachLoading}
        >
          {coachLoading ? 'Running coach...' : 'Run Coach Request'}
        </button>
        {coachError && <p className="mt-2 text-sm text-red-400">{coachError}</p>}
        {coachResult && (
          <div className="mt-3 space-y-3 rounded border border-slate-700 bg-slate-800 p-3 text-sm">
            <div className="grid gap-1 sm:grid-cols-2">
              <p>Mode: <span className="font-medium">{coachResult.mode}</span></p>
              <p>Confidence: <span className="font-medium">{coachResult.confidence.toFixed(2)}</span></p>
              <p className="break-all">Contract: <span className="font-medium">{coachResult.contractVersion}</span></p>
              <p>Archetype: <span className="font-medium">{coachResult.archetype ?? 'none (fallback)'}</span></p>
            </div>

            <div>
              <p className="text-slate-300">Plan title</p>
              <p className="font-medium leading-snug">{coachResult.plan.title}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-200">
                {coachResult.plan.steps.map((step) => (
                  <li key={step} className="leading-snug break-words">{step}</li>
                ))}
              </ol>
            </div>

            <div>
              <p className="text-slate-300">Rationale</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-200">
                {coachResult.rationale.map((line) => (
                  <li key={line} className="leading-snug break-words">{line}</li>
                ))}
              </ul>
            </div>

            {coachResult.mode === 'fallback' && (
              <div className="rounded border border-amber-500/60 bg-amber-950/30 p-2 text-amber-200">
                <p className="font-semibold">Fallback explanation</p>
                <p>
                  {coachResult.fallbackReason === 'MISSING_CRITICAL_INPUT'
                    ? 'Missing critical intake (objective or favorite types). Add one clear goal to unlock a locked coach recommendation.'
                    : `Fallback reason: ${coachResult.fallbackReason}`}
                </p>
                <p className="mt-1 text-amber-100">Next action: enter a specific objective (example: &quot;control draw lock plan&quot;) and rerun.</p>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="mb-4 rounded border border-emerald-500/40 bg-slate-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Collection Query Assist</h2>
            <p className="text-sm text-slate-300">
              {collectionAssistEnabled
                ? `ON: Biasing search toward your collection context (${collectionTypeHints.join(', ') || 'no type context yet'}).`
                : 'OFF: Search runs without collection context.'}
            </p>
          </div>
          <button
            onClick={() => setCollectionAssistEnabled((value) => !value)}
            className="rounded border border-emerald-400/50 px-3 py-2 text-sm font-semibold hover:bg-emerald-400/10"
          >
            {collectionAssistEnabled ? 'Disable Assist' : 'Enable Assist'}
          </button>
        </div>
        {collectionAssistEnabled && collectionTypeHints.length > 0 && (
          <p className="mt-2 text-xs text-emerald-300">Active assist query context: {collectionTypeHints.join(', ')}</p>
        )}
      </section>

      <section className="mb-5 rounded border border-indigo-500/40 bg-slate-900 p-4">
        <h2 className="text-lg font-semibold">Guided Builder (v1)</h2>
        <p className="mb-3 text-sm text-slate-300">Build a focused query in 3 steps.</p>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block text-slate-300">Type</span>
            <select
              value={builderState.pokemonType}
              onChange={(e) => setBuilderState((s) => ({ ...s, pokemonType: e.target.value }))}
              className="w-full rounded border border-slate-700 bg-slate-800 p-2"
            >
              {['fire', 'water', 'grass', 'lightning', 'psychic', 'fighting'].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-300">Goal</span>
            <select
              value={builderState.goal}
              onChange={(e) => setBuilderState((s) => ({ ...s, goal: e.target.value as typeof s.goal }))}
              className="w-full rounded border border-slate-700 bg-slate-800 p-2"
            >
              <option value="highest damage">Highest damage</option>
              <option value="ability lock">Ability lock</option>
              <option value="budget">Budget</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-300">Min Damage</span>
            <input
              type="number"
              value={builderState.minDamage}
              onChange={(e) => setBuilderState((s) => ({ ...s, minDamage: Number(e.target.value || 0) }))}
              className="w-full rounded border border-slate-700 bg-slate-800 p-2"
            />
          </label>
          <button onClick={applyGuidedBuilder} className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold hover:bg-indigo-500">
            Use Builder Query
          </button>
        </div>
      </section>

      <label htmlFor="search-query" className="mb-2 mt-4 block text-sm font-medium text-slate-200">
        Search cards
      </label>
      <input
        id="search-query"
        aria-label="search-query"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded border border-slate-700 bg-slate-800 p-3"
        placeholder="Try: fire attacker 120 damage, psychic ability lock, pikachu"
      />
      {collectionAssistEnabled && (
        <p className="mt-2 text-xs text-emerald-300">Running assisted query context (input unchanged): {assistedQuery}</p>
      )}

      {loading && <p className="mt-4 text-slate-300">Searching cards...</p>}
      {error && <p className="mt-4 text-red-400">{error}</p>}
      {!loading && data && data.results.length === 0 && <p className="mt-4 text-slate-300">No cards found.</p>}

      {data?.meta?.mode === 'fallback' && (
        <section className="mt-4 rounded border border-amber-500/50 bg-amber-950/30 p-3 text-sm text-amber-200">
          <p className="font-semibold">Fallback mode: showing local sample cards for testing.</p>
          <p>{data.meta.message ?? 'Live Pokémon services are temporarily unavailable.'}</p>
          <button
            onClick={() => setRetryNonce((n) => n + 1)}
            className="mt-2 rounded border border-amber-300/70 px-2 py-1 text-xs hover:bg-amber-400/10"
          >
            Retry live data
          </button>
        </section>
      )}

      {data && data.optimizationCopy.length > 0 && (
        <section className="mt-6 rounded border border-amber-400/40 bg-slate-900 p-4">
          <h2 className="mb-2 text-lg font-semibold">Optimization Copy</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
            {data.optimizationCopy.map((line) => (
              <li key={line}>{line}</li>
            ))}
            {collectionAssistEnabled && collectionTypeHints.length > 0 && <li>Collection assist bias active: {collectionTypeHints.join(', ')}</li>}
          </ul>
          {data.recommendations.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.recommendations.map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => applyRecommendation(rec.id, rec.queryPatch)}
                  disabled={uiState.appliedRecommendationIds.includes(rec.id)}
                  className="rounded border border-amber-400/50 px-2 py-1 text-xs hover:bg-amber-400/10 disabled:opacity-50"
                >
                  Apply: {rec.title}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {data && !hasUserQuery && data.coolPicks.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-semibold">Cool Picks (default)</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.coolPicks.map((card) => (
              <article key={`cool-${card.id}`} className="rounded border border-emerald-500/40 bg-slate-800 p-3">
                <CardThumb src={card.image} alt={card.name} />
                <p className="font-medium">{card.name}</p>
                <p className="text-sm text-slate-300">{card.types.join(', ') || card.supertype}</p>
                <button
                  onClick={() => addToCollection(card)}
                  disabled={pendingCardIds.includes(card.id)}
                  className="mt-2 rounded border border-emerald-400/50 px-2 py-1 text-xs hover:bg-emerald-400/10 disabled:opacity-50"
                >
                  {pendingCardIds.includes(card.id) ? 'Saving...' : 'Add to Collection'}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {data && hasUserQuery && data.results.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-semibold">Results</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.results.map((card) => (
              <article key={card.id} data-testid="card" className="rounded border border-slate-700 bg-slate-800 p-3">
                <button className="w-full text-left" onClick={() => setSelectedCard(card)} aria-label="View Details">
                  <CardThumb src={card.image} alt={card.name} />
                  <p className="font-medium">{card.name}</p>
                  <p className="text-sm text-slate-300">{card.setName}</p>
                  <p className="text-xs text-slate-400">{card.types.join(', ') || card.supertype}</p>
                  <p className="mt-2 text-xs font-semibold text-indigo-300">View Details</p>
                </button>
                <button
                  onClick={() => addToCollection(card)}
                  disabled={pendingCardIds.includes(card.id)}
                  className="mt-2 w-full rounded border border-emerald-400/50 px-2 py-1 text-xs hover:bg-emerald-400/10 disabled:opacity-50"
                >
                  {pendingCardIds.includes(card.id) ? 'Saving...' : 'Add to Collection'}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 rounded border border-cyan-500/40 bg-slate-900 p-4">
        <h2 className="text-lg font-semibold">Collection Command Center</h2>
        <p className="mb-3 text-sm text-slate-300">Saved cards with quantity controls and quick filtering.</p>

        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={collectionNameFilter}
            onChange={(e) => setCollectionNameFilter(e.target.value)}
            placeholder="Filter by card name"
            className="rounded border border-slate-700 bg-slate-800 p-2 text-sm"
          />
          <select
            value={collectionTypeFilter}
            onChange={(e) => setCollectionTypeFilter(e.target.value)}
            className="rounded border border-slate-700 bg-slate-800 p-2 text-sm"
          >
            <option value="all">All types</option>
            {allCollectionTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <p className="self-center text-sm text-slate-300">Total cards saved: {collection.reduce((sum, entry) => sum + entry.quantity, 0)}</p>
        </div>

        {collectionError && <p className="mt-3 text-sm text-red-400">{collectionError}</p>}

        {filteredCollection.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No cards in collection match this filter.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {filteredCollection.map((entry) => (
              <article key={`collection-${entry.card.id}`} className="rounded border border-slate-700 bg-slate-800 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{entry.card.name}</p>
                    <p className="text-xs text-slate-400">{entry.card.types.join(', ') || entry.card.supertype}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCollectionQuantity(entry.card.id, entry.quantity - 1)}
                      disabled={pendingCardIds.includes(entry.card.id)}
                      className="rounded border border-slate-500 px-2 py-1 text-xs disabled:opacity-50"
                    >
                      -
                    </button>
                    <span className="min-w-8 text-center text-sm">{entry.quantity}</span>
                    <button
                      onClick={() => updateCollectionQuantity(entry.card.id, entry.quantity + 1)}
                      disabled={pendingCardIds.includes(entry.card.id)}
                      className="rounded border border-slate-500 px-2 py-1 text-xs disabled:opacity-50"
                    >
                      +
                    </button>
                    <button
                      onClick={() => updateCollectionQuantity(entry.card.id, 0)}
                      disabled={pendingCardIds.includes(entry.card.id)}
                      className="rounded border border-red-400/70 px-2 py-1 text-xs text-red-300 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedCard && (
        <div role="dialog" aria-label="card-detail-modal" className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded border border-slate-600 bg-slate-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xl font-semibold">{selectedCard.name}</h3>
              <button onClick={() => setSelectedCard(null)} className="rounded border border-slate-500 px-2 py-1 text-xs">
                Close
              </button>
            </div>
            <p className="text-sm text-slate-300">Set: {selectedCard.setName}</p>
            <p className="text-sm text-slate-300">Type: {selectedCard.types.join(', ') || selectedCard.supertype}</p>
            <p className="text-sm text-slate-300">HP: {selectedCard.hp ?? 'N/A'}</p>
            <p className="mt-2 text-sm text-emerald-300">Ability: {selectedCard.abilityText || 'N/A'}</p>
            <div className="mt-3">
              <h4 className="font-medium">Attacks</h4>
              {selectedCard.attacks.length === 0 ? (
                <p className="text-sm text-slate-400">No attacks listed.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {selectedCard.attacks.map((attack) => (
                    <li key={`${selectedCard.id}-${attack.name}-${attack.damage}`} className="rounded border border-slate-700 p-2">
                      <p className="font-medium">{attack.name || 'Unnamed attack'}</p>
                      <p className="text-slate-300">Damage: {attack.damage || '—'}</p>
                      {attack.text && <p className="text-slate-400">{attack.text}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              onClick={() => addToCollection(selectedCard)}
              disabled={pendingCardIds.includes(selectedCard.id)}
              className="mt-4 rounded border border-emerald-400/60 px-3 py-2 text-sm font-semibold hover:bg-emerald-400/10 disabled:opacity-50"
            >
              {pendingCardIds.includes(selectedCard.id) ? 'Saving...' : 'Add to Collection'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
