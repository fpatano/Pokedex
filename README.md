# Pokédex MVP (Pokémon TCG Finder)

A practical MVP web app for Pokémon TCG card discovery.

## Features

- Next.js + TypeScript + Tailwind UI
- Search endpoint at `GET /api/search?q=...`
- Server-side Pokémon TCG API integration (`POKEMON_TCG_API_KEY`)
- Trait-oriented free-text query parser (types, ability/attack keywords, numeric cues, name text)
- Normalized card response shape for UI
- In-memory TTL cache (60s) for repeated search queries
- Frontend search bar with debounced input
- Result grid + loading/error/empty states
- 3 relevant non-duplicate **Cool Picks** per query
- Baseline tests for parser, normalization/API shape, cool-pick dedupe/relevance

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Add env vars:

```bash
cp .env.example .env.local
# then set POKEMON_TCG_API_KEY
```

3. Run dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` - start development server
- `npm run build` - production build
- `npm run start` - serve production build
- `npm run lint` - run ESLint
- `npm run test` - run Vitest test suite

## API Response Shape

`GET /api/search?q=fire attacker 120`

```json
{
  "query": "fire attacker 120",
  "results": [
    {
      "id": "...",
      "name": "...",
      "image": "...",
      "setName": "...",
      "supertype": "Pokémon",
      "types": ["Fire"],
      "hp": "120",
      "abilityText": "...",
      "attacks": [{ "name": "...", "damage": "...", "text": "..." }]
    }
  ],
  "coolPicks": []
}
```

## Notes

- API key stays server-side only and is never exposed to the browser.
- Cache is process-local/in-memory for MVP simplicity.
