import { NextRequest, NextResponse } from 'next/server';
import { getCachedQuery, setCachedQuery } from '@/lib/cache';
import { PokemonApiError, searchCards } from '@/lib/pokemonApi';

function mapSearchError(error: unknown): { status: number; message: string } {
  if (error instanceof PokemonApiError) {
    switch (error.code) {
      case 'MISCONFIGURED':
        return { status: 500, message: 'Server search configuration is unavailable' };
      case 'TIMEOUT':
        return { status: 504, message: error.message };
      case 'UPSTREAM':
        return { status: 502, message: 'Pokémon service is temporarily unavailable' };
      case 'INVALID_RESPONSE':
        return { status: 502, message: error.message };
      default:
        return { status: 500, message: 'Search failed' };
    }
  }

  const message = error instanceof Error ? error.message : 'Search failed';
  return { status: 500, message };
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  const cached = getCachedQuery(query);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const data = await searchCards(query);
    setCachedQuery(query, data);
    return NextResponse.json(data);
  } catch (error) {
    const mapped = mapSearchError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
