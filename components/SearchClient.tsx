'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import type { SearchResponse } from '@/lib/types';

function CardThumb({ src, alt }: { src: string; alt: string }) {
  if (!src) {
    return <div className="mb-2 h-44 w-full rounded bg-slate-700" />;
  }

  return <Image src={src} alt={alt} width={245} height={342} unoptimized className="mb-2 h-auto w-full rounded" />;
}

export default function SearchClient() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!debouncedQuery) {
      setData(null);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error ?? 'Search failed');
        }

        setData(json as SearchResponse);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [debouncedQuery]);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-4 text-3xl font-bold">Pokémon TCG Finder</h1>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded border border-slate-700 bg-slate-800 p-3"
        placeholder="Try: fire attacker 120 damage, psychic ability lock, pikachu"
      />

      {loading && <p className="mt-4 text-slate-300">Searching cards...</p>}
      {error && <p className="mt-4 text-red-400">{error}</p>}
      {!loading && data && data.results.length === 0 && <p className="mt-4 text-slate-300">No cards found.</p>}

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
                <CardThumb src={card.image} alt={card.name} />
                <p className="font-medium">{card.name}</p>
                <p className="text-sm text-slate-300">{card.setName}</p>
                <p className="text-xs text-slate-400">{card.types.join(', ') || card.supertype}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
