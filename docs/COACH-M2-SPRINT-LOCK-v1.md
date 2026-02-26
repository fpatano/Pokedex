# Coach Core M2 Sprint Lock (v1)

Version: `coach-core.v1`  
Route: `POST /api/coach`

## Locked Request Contract

```json
{
  "contractVersion": "coach-core.v1",
  "intake": {
    "objective": "quick attack damage plan",
    "favoriteTypes": ["Fire"],
    "pace": "fast",
    "budget": "mid",
    "experience": "novice"
  }
}
```

- Sparse intake is allowed; all fields in `intake` are optional.
- Canonical normalization fills deterministic defaults:
  - `pace=balanced`, `budget=mid`, `experience=novice`
  - `favoriteTypes` lowercased + deduped + sorted
  - `objectiveKeywords` tokenized + sorted

## Locked Response Contract

Every 200 response returns **exactly one plan** (single format + horizon `NEXT_7_DAYS`).

### Coach mode
- `mode=coach`
- `archetype` is exactly one enum value
- `fallbackReason=null`

### Fallback mode
- `mode=fallback`
- `archetype=null`
- `fallbackReason` in:
  - `MISSING_CRITICAL_INPUT`

Both modes include:
- bounded `confidence` in `[0,1]`
- deterministic `rationale[]`
- `canonicalIntake`
- exactly one `plan`

## Determinism & Tie-break Rules

- Rule-weight map is static and deterministic.
- Archetype tie-break order is frozen:
  1. `AGGRO_TEMPO`
  2. `MIDRANGE_TOOLBOX`
  3. `CONTROL_ENGINE`
- Same payload/config yields byte-identical output in tests.

## Fallback/Error States

- Missing critical intent (`objective` empty and no `favoriteTypes`) => `MISSING_CRITICAL_INPUT`
- Any request with critical input returns `mode=coach` (no LOW_CONFIDENCE branch in M2 contract)
- Invalid request shape/version => HTTP 400 `INVALID_REQUEST`

## Gate Demo

```bash
npm run demo:coach-core
```

## Validation Pack

- Unit + contract + route + golden + determinism tests:

```bash
npx vitest run tests/coach.contract.test.ts tests/coach.route.test.ts tests/coach.golden.test.ts
```
