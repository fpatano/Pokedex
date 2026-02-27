import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { GET } from '@/app/api/search/route';
import * as pokemonApi from '@/lib/pokemonApi';

function buildRequest(query: string) {
  return new NextRequest(`http://localhost:3000/api/search?q=${encodeURIComponent(query)}`);
}

describe('/api/search route', () => {
  it('returns provider error status/body instead of fallback sample success on upstream outage', async () => {
    vi.spyOn(pokemonApi, 'searchCards').mockRejectedValueOnce(new Error('provider timeout'));

    const res = await GET(buildRequest(`outage-check-${Date.now()}`));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toMatchObject({ error: 'provider timeout' });
  });
});
