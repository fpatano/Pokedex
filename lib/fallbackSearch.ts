import { pickCoolCards } from '@/lib/coolPicks';
import { buildOptimizationCopy, issueRecommendations } from '@/lib/recommendations';
import type { NormalizedCard, SearchResponse } from '@/lib/types';

const FALLBACK_RESULTS: NormalizedCard[] = [
  {
    id: 'fallback-sv3-27',
    name: 'Charizard',
    image: 'https://images.pokemontcg.io/base1/4_hires.png',
    setName: 'Obsidian Flames',
    supertype: 'Pokemon',
    types: ['Fire'],
    hp: '180',
    abilityText: 'Burning Darkness support pick',
    attacks: [{ name: 'Burning Darkness', damage: '180', text: 'Fixture fallback sample card.' }],
  },
  {
    id: 'fallback-base-4',
    name: 'Blastoise',
    image: 'https://images.pokemontcg.io/base1/2_hires.png',
    setName: 'Base',
    supertype: 'Pokemon',
    types: ['Water'],
    hp: '100',
    abilityText: undefined,
    attacks: [{ name: 'Hydro Pump', damage: '60', text: 'Fixture fallback sample card.' }],
  },
  {
    id: 'fallback-sv2-52',
    name: 'Pikachu',
    image: 'https://images.pokemontcg.io/base1/58_hires.png',
    setName: 'Paldea Evolved',
    supertype: 'Pokemon',
    types: ['Lightning'],
    hp: '60',
    abilityText: undefined,
    attacks: [{ name: 'Thunder Jolt', damage: '30', text: 'Fixture fallback sample card.' }],
  },
  {
    id: 'fallback-sv1-12',
    name: 'Venusaur',
    image: 'https://images.pokemontcg.io/base1/15_hires.png',
    setName: 'Scarlet & Violet',
    supertype: 'Pokemon',
    types: ['Grass'],
    hp: '150',
    abilityText: undefined,
    attacks: [{ name: 'Solar Beam', damage: '160', text: 'Fixture fallback sample card.' }],
  },
];

export function buildFallbackSearchResponse(query: string, reason: string): SearchResponse {
  const normalizedQuery = query.trim() || 'popular pokemon cards';
  const recommendations = issueRecommendations(normalizedQuery, FALLBACK_RESULTS);

  return {
    query: normalizedQuery,
    results: FALLBACK_RESULTS,
    coolPicks: pickCoolCards(FALLBACK_RESULTS, normalizedQuery),
    recommendations,
    optimizationCopy: buildOptimizationCopy(normalizedQuery, recommendations),
    meta: {
      mode: 'fallback',
      source: 'local-fixture',
      message: reason,
      retryable: true,
    },
  };
}
