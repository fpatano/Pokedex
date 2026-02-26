# Coach M1 Contract (v1)

Version: `coach-m1.v1`
Route: `POST /api/coach`

## Request

```json
{
  "contractVersion": "coach-m1.v1",
  "prompt": "fire deck highest damage 180",
  "collectionTypes": ["Fire", "Lightning"]
}
```

### Validation
- `contractVersion`: must equal `coach-m1.v1`
- `prompt`: non-empty string, max 240 chars
- `collectionTypes`: optional string array (max 6 entries)

## 200 Response (typed)
Always includes bounded confidence: `0 <= confidence <= 1`.

### Coach mode (high confidence)
```json
{
  "contractVersion": "coach-m1.v1",
  "mode": "coach",
  "confidence": 0.8,
  "message": "...",
  "fallbackReason": null
}
```

### Fallback mode (deterministic low-confidence fallback)
```json
{
  "contractVersion": "coach-m1.v1",
  "mode": "fallback",
  "confidence": 0.2,
  "message": "...",
  "fallbackReason": "LOW_CONFIDENCE"
}
```

Fallback reason enum is currently frozen to one explicit code:
- `LOW_CONFIDENCE`

## 400 Response
```json
{
  "error": "Invalid coach request contract",
  "contractVersion": "coach-m1.v1",
  "code": "INVALID_REQUEST"
}
```

`POST /api/coach` behavior is deterministic for valid/invalid request shapes.
