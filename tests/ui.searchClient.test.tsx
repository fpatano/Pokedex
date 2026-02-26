/** @vitest-environment jsdom */
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
});
