/** @vitest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SearchClient from '@/components/SearchClient';

vi.mock('next/image', () => ({
  default: (props: { alt?: string; [key: string]: unknown }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt ?? ''} />;
  },
}));

describe('SearchClient UI vertical slice', () => {
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
              abilityText: 'Heat up',
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

    fireEvent.click(screen.getByRole('button', { name: /use builder query/i }));
    const input = screen.getByLabelText('search-query') as HTMLInputElement;

    await waitFor(() => {
      expect(input.value).toBe('fire pokemon highest damage 120');
    });

    await waitFor(() => {
      expect(screen.getByText('Charizard')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Charizard'));
    expect(screen.getByRole('dialog', { name: 'card-detail-modal' })).toBeTruthy();
    expect(screen.getByText(/Damage: 180/i)).toBeTruthy();
  });
});
