# Tournament Variant Ops Runbook (M4 Sprint Lock)

## Scope
Tournament Build variant for `/api/coach` using existing `coach-core.v1` contracts.

## Toggle controls
- Enable: `TOURNAMENT_VARIANT_ENABLED=true`
- Disable (safe default): `TOURNAMENT_VARIANT_ENABLED=false` (or unset)

No code changes required for toggle/rollback.

## Required env validation
Run:
```bash
npm run validate:tournament-env
```

## Critical hardening controls
- `TOURNAMENT_REQUEST_TIMEOUT_MS` (default `1200`)
- `TOURNAMENT_MAX_RETRIES` (default `1`)
- `TOURNAMENT_RATE_LIMIT_WINDOW_MS` / `TOURNAMENT_RATE_LIMIT_MAX`
- `TOURNAMENT_IDEMPOTENCY_TTL_MS`
- `TOURNAMENT_CIRCUIT_FAILURE_THRESHOLD` / `TOURNAMENT_CIRCUIT_COOLDOWN_MS`

## SLO indicators
- Success rate on tournament path (2xx / total)
- p95 response latency (`tournament_success` logs)
- Rate limit rejection rate (`tournament_rate_limited`)
- Retry/error rates (`tournament_retry`, `tournament_failure`)
- Circuit open events (`tournament_circuit_open`)

## Alert hooks
Alert on sustained:
- `tournament_failure` > 2% over 5m
- `tournament_circuit_open` > 0 over 5m
- `tournament_rate_limited` spike > baseline + 3σ

## Incident triage
1. Confirm variant status (`TOURNAMENT_VARIANT_ENABLED`).
2. Inspect structured logs for `traceId` and event spikes.
3. If circuit is open or failures persist, **rollback toggle**:
   - set `TOURNAMENT_VARIANT_ENABLED=false`
   - restart app
4. Re-run smoke tests (`npm run test -- tests/coach.tournament.route.test.ts`).

## Rollback
Immediate rollback is env-only:
```bash
export TOURNAMENT_VARIANT_ENABLED=false
npm run build && npm run start
```

## Post-incident
- Capture offending trace IDs
- Save hardening metrics snapshot
- File follow-up against retry/timeout thresholds if needed
