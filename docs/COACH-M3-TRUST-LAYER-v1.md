# Coach Core M3 Trust Layer (additive on `coach-core.v1`)

Route: `POST /api/coach`  
Base contract version remains: `coach-core.v1`

## Scope

M3 adds non-breaking trust visibility fields and deterministic gap export:

1. `confidenceLabel` on responses (`high|medium|low`)
2. `missingSinglesExport` machine-readable gap payload

No model/ranking logic changes were made.

## New Additive Fields

### `confidenceLabel`
Derived strictly from existing numeric `confidence`:

- `high` if `confidence >= 0.75`
- `medium` if `confidence >= 0.45` and `< 0.75`
- `low` if `< 0.45`

### `missingSinglesExport`
Deterministic export payload:

- `format`: `coach-missing-singles.v1`
- `generatedFromContract`: `coach-core.v1`
- `items`: ordered, deduped list of missing critical singles

Single item format:

```json
{
  "id": "objective",
  "category": "critical_input",
  "label": "Add one clear objective (example: \"control draw lock plan\").",
  "confidenceLabel": "low",
  "required": true
}
```

Ordered IDs are frozen: `objective`, then `favoriteTypes`.

## Sample Response (fallback with gaps)

```json
{
  "contractVersion": "coach-core.v1",
  "mode": "fallback",
  "confidence": 0.3,
  "confidenceLabel": "low",
  "archetype": null,
  "rationale": ["Fallback triggered: missing critical intent fields (objective or favoriteTypes)."],
  "canonicalIntake": {
    "objective": "",
    "objectiveKeywords": [],
    "favoriteTypes": [],
    "pace": "balanced",
    "budget": "mid",
    "experience": "novice",
    "hasCriticalInput": false
  },
  "plan": {
    "horizon": "NEXT_7_DAYS",
    "title": "MIDRANGE_TOOLBOX playable-now plan",
    "steps": ["...", "...", "..."],
    "rationale": "..."
  },
  "missingSinglesExport": {
    "format": "coach-missing-singles.v1",
    "generatedFromContract": "coach-core.v1",
    "items": [
      {
        "id": "objective",
        "category": "critical_input",
        "label": "Add one clear objective (example: \"control draw lock plan\").",
        "confidenceLabel": "low",
        "required": true
      },
      {
        "id": "favoriteTypes",
        "category": "critical_input",
        "label": "Add at least one favorite type (example: [\"Fire\"]).",
        "confidenceLabel": "low",
        "required": true
      }
    ]
  },
  "fallbackReason": "MISSING_CRITICAL_INPUT"
}
```

## Compatibility

M2 clients remain compatible: existing fields and modes are unchanged; M3 only appends fields.
