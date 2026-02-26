'use client';

import React from 'react';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { shouldApplyResponse } from '@/lib/requestGuard';
import { applyRecommendationMutation, buildGuidedQuery, createDefaultGuidedBuilderState } from '@/lib/uiState';
import type { NormalizedCard, SearchResponse } from '@/lib/types';

function CardThumb({ src, alt }: { src: string; alt: string }) {
  if (!src) return <div className="mb-2 h-44 w-full rounded bg-slate-700" />;
  return <Image src={src} alt={alt} width={245} height={342} unoptimized className="mb-2 h-auto w-full rounded" />;
}

export default function SearchClient() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<NormalizedCard | null>(null);
  const [builderState, setBuilderState] = useState(createDefaultGuidedBuilderState());
  const [uiState, setUiState] = useState({ appliedRecommendationIds: [] as string[] });

  const requestSequenceRef = useRef(0);
  const debouncedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!debouncedQuery) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    const requestId = ++requestSequenceRef.current;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, { signal: controller.signal });
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
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [debouncedQuery]);

  function applyGuidedBuilder() {
    setQuery(buildGuidedQuery(builderState));
  }

  function applyRecommendation(id: string, queryPatch: string) {
    setUiState((prev) => applyRecommendationMutation(prev, id));
    setQuery(queryPatch);
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-4 text-3xl font-bold">Pokémon TCG Finder</h1>

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

      <input
        aria-label="search-query"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded border border-slate-700 bg-slate-800 p-3"
        placeholder="Try: fire attacker 120 damage, psychic ability lock, pikachu"
      />

      {loading && <p className="mt-4 text-slate-300">Searching cards...</p>}
      {error && <p className="mt-4 text-red-400">{error}</p>}
      {!loading && data && data.results.length === 0 && <p className="mt-4 text-slate-300">No cards found.</p>}

      {data && data.optimizationCopy.length > 0 && (
        <section className="mt-6 rounded border border-amber-400/40 bg-slate-900 p-4">
          <h2 className="mb-2 text-lg font-semibold">Optimization Copy</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
            {data.optimizationCopy.map((line) => (
              <li key={line}>{line}</li>
            ))}
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

      {data && data.coolPicks.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-semibold">Cool Picks</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.coolPicks.map((card) => (
              <article key={`cool-${card.id}`} className="rounded border border-emerald-500/40 bg-slate-800 p-3">
                <CardThumb src={card.image} alt={card.name} />
                <p className="font-medium">{card.name}</p>
                <p className="text-sm text-slate-300">{card.types.join(', ') || card.supertype}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {data && data.results.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-semibold">Results</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.results.map((card) => (
              <article key={card.id} className="rounded border border-slate-700 bg-slate-800 p-3">
                <button className="w-full text-left" onClick={() => setSelectedCard(card)}>
                  <CardThumb src={card.image} alt={card.name} />
                  <p className="font-medium">{card.name}</p>
                  <p className="text-sm text-slate-300">{card.setName}</p>
                  <p className="text-xs text-slate-400">{card.types.join(', ') || card.supertype}</p>
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

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
            {selectedCard.abilityText && <p className="mt-2 text-sm text-emerald-300">Ability: {selectedCard.abilityText}</p>}
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
          </div>
        </div>
      )}
    </main>
  );
}
