# M4 Sprint Lock Handoff Packet — Andy

## Summary
Tournament Build variant is implemented as a toggleable runtime mode over existing `coach-core.v1` contracts (`/api/coach`) with hardening controls, observability, and ops artifacts.

## Contract safety
- No contract drift in request/response body for coach success/fallback paths.
- Tournament mode only adds response header: `x-coach-variant=tournament`.

## What shipped
- Runtime config + env validation for tournament mode
- Tournament hardening: timeout, retries, rate-limit, circuit breaker, idempotency cache
- Structured tournament logs (`tournament_*` events)
- Ops runbook + rollback drill script
- Tests for config and tournament hardening route path

## Files changed
- `app/api/coach/route.ts`
- `lib/coach/runtime.ts`
- `lib/coach/tournamentHardening.ts`
- `lib/coach/observability.ts`
- `tests/coach.runtime.test.ts`
- `tests/coach.tournament.route.test.ts`
- `.env.example`
- `package.json`
- `scripts/validate-tournament-env.mjs`
- `scripts/tournament-rollback-drill.sh`
- `docs/TOURNAMENT-OPS-RUNBOOK.md`

## Validation commands
```bash
npm run validate:tournament-env
npm run test -- tests/coach.runtime.test.ts tests/coach.tournament.route.test.ts tests/coach.contract.test.ts
```

## Demo / repro
1. `export TOURNAMENT_VARIANT_ENABLED=true`
2. POST `/api/coach` valid `coach-core.v1` request
3. Confirm:
   - `200` body conforms to existing contract
   - response header `x-coach-variant: tournament`
4. Send repeated requests from same client until `429` to verify rate-limit.
5. Send same payload with `x-idempotency-key` twice and verify same response.
6. Rollback: set `TOURNAMENT_VARIANT_ENABLED=false` and retest header is `standard`.

## Drill evidence process
Run:
```bash
bash scripts/tournament-rollback-drill.sh
```
Attach terminal output to release ticket.
