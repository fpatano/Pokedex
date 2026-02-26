/** @vitest-environment jsdom */
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SearchClient from '@/components/SearchClient';

vi.mock('next/image', () => ({
  default: (props: { alt?: string; [key: string]: unknown }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt ?? ''} />;
  },
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SearchClient UI vertical slice', () => {
  it('supports collection CRUD from results and modal with deterministic duplicate increment', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          query: 'charizard',
          results: [
            {
              id: 'p-1',
              name: 'Charizard',
              image: '',
              setName: 'Base',
              supertype: 'Pokémon',
              types: ['Fire'],
              hp: '180',
              abilityText: undefined,
              attacks: [{ name: 'Burn', damage: '180', text: 'Strong hit' }],
            },
          ],
          coolPicks: [],
          recommendations: [],
          optimizationCopy: [],
        }),
      })
    );

    render(<SearchClient />);

    fireEvent.change(screen.getByLabelText('search-query'), { target: { value: 'charizard' } });

    await waitFor(() => {
      expect(screen.getByText('Results')).toBeTruthy();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /add to collection/i })[0]);

    await waitFor(() => {
      expect(screen.getByText('Total cards saved: 1')).toBeTruthy();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /add to collection/i })[0]);

    await waitFor(() => {
      expect(screen.getByText('Total cards saved: 2')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /view details/i }));
    const modal = screen.getByRole('dialog', { name: 'card-detail-modal' });
    fireEvent.click(within(modal).getByRole('button', { name: /add to collection/i }));

    await waitFor(() => {
      expect(screen.getByText('Total cards saved: 3')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(screen.getByText('Total cards saved: 0')).toBeTruthy();
      expect(screen.getByText(/No cards in collection match this filter/i)).toBeTruthy();
    });
  });

  it('toggles collection-aware query assist without mutating user input', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: 'popular pokemon cards',
          results: [],
          coolPicks: [
            {
              id: 'p-2',
              name: 'Blastoise',
              image: '',
              setName: 'Base',
              supertype: 'Pokémon',
              types: ['Water'],
              hp: '120',
              abilityText: undefined,
              attacks: [{ name: 'Hydro Pump', damage: '90', text: 'Splash' }],
            },
          ],
          recommendations: [],
          optimizationCopy: [],
        }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          query: 'charizard',
          results: [],
          coolPicks: [],
          recommendations: [],
          optimizationCopy: [],
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    render(<SearchClient />);

    await waitFor(() => {
      expect(screen.getByText(/Collection Query Assist/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: /add to collection/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /add to collection/i }));

    await waitFor(() => {
      expect(screen.getByText('Total cards saved: 1')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /enable assist/i }));

    await waitFor(() => {
      expect(screen.getByText(/Active assist query context: Water/i)).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('search-query'), { target: { value: 'charizard' } });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/search?q=charizard%20synergy%20with%20Water', expect.anything());
      expect((screen.getByLabelText('search-query') as HTMLInputElement).value).toBe('charizard');
    });

    fireEvent.click(screen.getByRole('button', { name: /disable assist/i }));
    expect(screen.getByText(/OFF: Search runs without collection context/i)).toBeTruthy();
  });
  it('loads default cool picks on first paint and labels fallback mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        query: 'popular pokemon cards',
        results: [],
        coolPicks: [
          {
            id: 'fallback-sv2-52',
            name: 'Pikachu',
            image: '',
            setName: 'Paldea Evolved',
            supertype: 'Pokemon',
            types: ['Lightning'],
            hp: '60',
            abilityText: undefined,
            attacks: [{ name: 'Thunder Jolt', damage: '30', text: 'sample' }],
          },
        ],
        recommendations: [],
        optimizationCopy: [],
        meta: { mode: 'fallback', message: 'Pokémon service is temporarily unavailable' },
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<SearchClient />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/search?q=popular%20pokemon%20cards', expect.anything());
      expect(screen.getByText(/Pokédex Search/i)).toBeTruthy();
      expect(screen.getByText(/Search cards/i)).toBeTruthy();
      expect(screen.getByText(/Cool Picks \(default\)/i)).toBeTruthy();
      expect(screen.getByText(/Fallback mode/i)).toBeTruthy();
    });
  });

  it('supports guided builder and card detail modal clarity', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          query: 'fire pokemon highest damage 120',
          results: [
            {
              id: 'p-1',
              name: 'Charizard',
              image: '',
              setName: 'Base',
              supertype: 'Pokémon',
              types: ['Fire'],
              hp: '180',
              abilityText: undefined,
              attacks: [{ name: 'Burn', damage: '180', text: 'Strong hit' }],
            },
          ],
          coolPicks: [],
          recommendations: [{ id: 'rank-by-damage', title: 'Rank by highest damage', reason: 'Reason', queryPatch: 'fire highest damage' }],
          optimizationCopy: ['Rank by highest damage: Reason'],
        }),
      })
    );

    render(<SearchClient />);

    fireEvent.click(screen.getAllByRole('button', { name: /use builder query/i })[0]);
    const input = screen.getByLabelText('search-query') as HTMLInputElement;

    await waitFor(() => {
      expect(input.value).toBe('fire pokemon highest damage 120');
    });

    await waitFor(() => {
      expect(screen.getByText('Charizard')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /view details/i }));
    expect(screen.getByRole('dialog', { name: 'card-detail-modal' })).toBeTruthy();
    expect(screen.getByText(/Set:/i)).toBeTruthy();
    expect(screen.getByText(/Type:/i)).toBeTruthy();
    expect(screen.getByText(/HP:/i)).toBeTruthy();
    expect(screen.getByText(/Ability: N\/A/i)).toBeTruthy();
    expect(screen.getByText(/Damage: 180/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog', { name: 'card-detail-modal' })).toBeNull();
  });

  it('demos coach-core happy path + deterministic fallback from UI', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.startsWith('/api/search')) {
        return {
          ok: true,
          json: async () => ({ query: 'popular pokemon cards', results: [], coolPicks: [], recommendations: [], optimizationCopy: [] }),
        };
      }

      if (url === '/api/coach' && init?.method === 'POST') {
        const parsed = JSON.parse(String(init.body));

        if (parsed.intake?.objective === 'fire deck highest damage 180') {
          return {
            ok: true,
            json: async () => ({
              contractVersion: 'coach-core.v1',
              mode: 'coach',
              confidence: 0.8,
              archetype: 'AGGRO_TEMPO',
              rationale: ['Fast pace preference maps to AGGRO_TEMPO.'],
              canonicalIntake: {
                objective: 'fire deck highest damage 180',
                objectiveKeywords: ['damage', 'fire', 'highest'],
                favoriteTypes: ['fire'],
                pace: 'balanced',
                budget: 'mid',
                experience: 'novice',
                hasCriticalInput: true,
              },
              plan: {
                horizon: 'NEXT_7_DAYS',
                title: 'AGGRO_TEMPO playable-now plan',
                steps: ['step one', 'step two', 'step three'],
                rationale: 'plan rationale',
              },
              fallbackReason: null,
            }),
          };
        }

        return {
          ok: true,
          json: async () => ({
            contractVersion: 'coach-core.v1',
            mode: 'fallback',
            confidence: 0.3,
            archetype: null,
            rationale: ['Fallback triggered: missing critical intent fields (objective or favoriteTypes).'],
            canonicalIntake: {
              objective: '',
              objectiveKeywords: [],
              favoriteTypes: [],
              pace: 'balanced',
              budget: 'mid',
              experience: 'novice',
              hasCriticalInput: false,
            },
            plan: {
              horizon: 'NEXT_7_DAYS',
              title: 'MIDRANGE_TOOLBOX playable-now plan',
              steps: ['step one', 'step two', 'step three'],
              rationale: 'plan rationale',
            },
            fallbackReason: 'MISSING_CRITICAL_INPUT',
          }),
        };
      }

      throw new Error(`unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<SearchClient />);

    fireEvent.click(screen.getByRole('button', { name: /run happy path/i }));

    await waitFor(() => {
      const coachCall = fetchMock.mock.calls.find(([url]) => url === '/api/coach');
      expect(coachCall).toBeTruthy();
      const body = JSON.parse(String(coachCall?.[1]?.body));
      expect(body).toMatchObject({
        contractVersion: 'coach-core.v1',
        intake: { objective: 'fire deck highest damage 180' },
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Mode:/i)).toBeTruthy();
      expect(screen.getByText(/Archetype:/i)).toBeTruthy();
      expect(screen.getByText(/Plan title/i)).toBeTruthy();
      expect(screen.getByText(/AGGRO_TEMPO playable-now plan/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /run fallback path/i }));

    await waitFor(() => {
      expect(screen.getByText(/Mode:/i)).toBeTruthy();
      expect(screen.getByText(/Fallback explanation/i)).toBeTruthy();
      expect(screen.getByText(/Next action:/i)).toBeTruthy();
    });
  });
});
