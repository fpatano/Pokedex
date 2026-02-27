import { NextRequest, NextResponse } from 'next/server';
import { getCachedQuery, setCachedQuery } from '@/lib/cache';
import { searchCards } from '@/lib/pokemonApi';
import { mapSearchError } from '@/lib/searchError';

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
