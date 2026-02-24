# Pokédex MVP (Pokémon TCG Finder)

Lightweight Next.js app for searching real Pokémon TCG cards with a single API endpoint and a simple UI.

## What this release includes

- Next.js 15 + TypeScript + Tailwind
- `GET /api/search?q=...` endpoint
- **Primary provider:** [TCGdex](https://www.tcgdex.net/)
- **Optional fallback provider:** [Pokémon TCG API](https://pokemontcg.io/) (only used when fallback key is configured)
- Normalized response shape for frontend rendering
- Query-level in-memory cache (60s TTL)
- Client-side debounced search + stale-response guard
- "Cool Picks" (up to 3 relevant, non-duplicate cards)
- Tests + lint + build + live verification script

---

## MacBook local setup

### 1) Prerequisites

- macOS with Node.js **22+**
- npm (ships with Node)

```bash
node -v
npm -v
```

### 2) Install

```bash
npm install
```

### 3) Configure env

```bash
cp .env.example .env.local
```

### 4) Run

```bash
npm run dev
```

Open: `http://localhost:3000`

---

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `POKEMON_TCG_API_KEY` | Optional | unset | Enables fallback to Pokémon TCG API if TCGdex fails. If unset, no fallback is attempted. |
| `POKEMON_API_DEBUG` | Optional | `0` | Set to `1`/`true` to log provider diagnostics on server. |

> This app does **not** use mock/fake card data. Responses come from live upstream APIs.

---

## Scripts

- `npm run dev` — run local dev server
- `npm run test` — run Vitest suite
- `npm run lint` — run ESLint
- `npm run build` — build production bundle
- `npm run verify:live` — boot local app on a test port and verify live `/api/search` behavior

### Live verification

```bash
npm run verify:live
```

The script validates:
- `/api/search?q=fire` returns HTTP 200 and non-empty results
- A "largest attack" style query returns data containing a max-attack candidate

---

## Architecture (high-level)

- **UI:** `components/SearchClient.tsx`
  - Debounced input (350ms)
  - Handles loading/error/empty/result states
  - Guards against stale async responses

- **API Route:** `app/api/search/route.ts`
  - Validates `q`
  - Serves cache hit if available
  - Calls `searchCards()` on miss
  - Maps upstream failures to stable HTTP errors

- **Search Service:** `lib/pokemonApi.ts`
  - Tries TCGdex first
  - Falls back to Pokémon TCG API only when `POKEMON_TCG_API_KEY` is set
  - Normalizes both provider payloads to one internal card type

- **Support libs:**
  - `lib/queryParser.ts` (query shaping for Pokémon TCG API)
  - `lib/normalize.ts` (payload normalization)
  - `lib/coolPicks.ts` (relevance + dedupe)
  - `lib/cache.ts` (60s in-memory query cache)

---

## API contract

### Request

`GET /api/search?q=fire attacker 120`

### Success response (`200`)

```json
{
  "query": "fire attacker 120",
  "results": [
    {
      "id": "sv3-27",
      "name": "Charizard",
      "image": "https://...",
      "setName": "Obsidian Flames",
      "supertype": "Pokémon",
      "types": ["Fire"],
      "hp": "180",
      "abilityText": "...",
      "attacks": [
        { "name": "Burning Darkness", "damage": "180", "text": "..." }
      ]
    }
  ],
  "coolPicks": []
}
```

### Error responses

- `400` — missing/empty query (`{"error":"Query is required"}`)
- `502` — upstream unavailable / invalid upstream payload
- `504` — upstream timeout
- `500` — unexpected internal error

---

## Troubleshooting

- **No fallback behavior when TCGdex fails**
  - Confirm `POKEMON_TCG_API_KEY` is set in `.env.local`
  - Restart dev server after env changes

- **`verify:live` fails with empty results**
  - Check internet connectivity (this check is live-upstream dependent)
  - Re-run; upstream availability can vary

- **Image domains or rendering concerns**
  - Current implementation uses `next/image` with `unoptimized` for MVP simplicity

- **Slow or inconsistent responses**
  - Use `POKEMON_API_DEBUG=1` to inspect provider-level logs
  - Remember cache is process-local and expires after 60s
