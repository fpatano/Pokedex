import { NextRequest, NextResponse } from 'next/server';
import { getCachedQuery, setCachedQuery } from '@/lib/cache';
import { searchCards } from '@/lib/pokemonApi';

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
    const message = error instanceof Error ? error.message : 'Search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
