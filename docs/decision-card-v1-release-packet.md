# Decision Card v1 — Milestone A Release Packet

## Changelog
- Added locked Decision Card v1 contract (`decision_card_version: "v1"`) with strict schema validation and backward-compatible request defaults.
- Implemented deterministic readiness engine with ordered rules + deterministic tie-break behavior.
- Added mandatory explainability payload (reason codes, human reasons, evidence refs, confidence basis, blockers, next actions, trace id).
- Added versioned threshold config file (`lib/decisionCard/config.v1.json`).
- Added API route: `POST /api/decision-card`.
- Wired UI rendering in Coach demo panel to show Decision Card state, reasons, blockers, and actions.
- Added deterministic golden fixtures + acceptance tests (J4/J6/J7/J10 mapping).
- Added rollback toggle: `DECISION_CARD_V1_ENABLED=false` => safe conservative response.

## Known Limits (v1)
- Inputs are currently heuristic/demo-derived in UI (from coach + collection context), not from tournament telemetry.
- Rule set is static threshold-based (no adaptive weighting).
- Explainability is deterministic but limited to current input fields.

## Rollback Toggle
- Env var: `DECISION_CARD_V1_ENABLED`
  - `true` (default): v1 engine enabled
  - `false` / `0`: rollback-safe conservative decision response

## Signoff Checklist (proof-linked)
- [x] Contract lock reviewed (`DecisionCardResponseSchema`)  
  Proof: `tests/decisionCard.contract.test.ts` passed in Validation Evidence.
- [x] Determinism verified (repeat input equality)  
  Proof: `tests/decisionCard.engine.test.ts` passed in Validation Evidence.
- [x] Golden fixture suite green (>=3 per state + edge/conflict)  
  Proof: `tests/decisionCard.golden.test.ts` passed in Validation Evidence.
- [x] J4/J6/J7/J10 acceptance tests green  
  Proof: `tests/decisionCard.journeyAcceptance.test.ts` passed in Validation Evidence.
- [x] UI rendering verified (state + reasons + blockers + actions)  
  Proof: `tests/ui.searchClient.test.tsx` passed in Validation Evidence.
- [x] Rollback toggle drill completed  
  Proof: `tests/decisionCard.route.test.ts` validates `DECISION_CARD_V1_ENABLED=true|false` pathing and `x-decision-card-variant` header semantics.
- [ ] No open P0/P1 defects (no issue-tracker artifact included in this packet)

## Milestone A Gate Signoff Artifacts
- Signoff verdict log: [`docs/milestone-a-gate-signoff-2026-02-26.md`](./milestone-a-gate-signoff-2026-02-26.md)

## Validation Evidence
### Command
`npm run test -- tests/decisionCard.route.test.ts`

### Result
- PASS: 1 file, 2 tests
- Verified:
  - `DECISION_CARD_V1_ENABLED=true` → v1 variant/header (`x-decision-card-variant: v1`) and v1 response shape
  - `DECISION_CARD_V1_ENABLED=false` → rollback-safe variant/header (`x-decision-card-variant: rollback-safe-default`) and rollback explainability semantics

### Command
`npm run test -- tests/decisionCard.contract.test.ts tests/decisionCard.engine.test.ts tests/decisionCard.golden.test.ts tests/decisionCard.journeyAcceptance.test.ts`

### Result
- PASS: 4 files, 12 tests
- Includes contract lock, deterministic engine behavior, golden fixtures, and J4/J6/J7/J10 acceptance mapping.

### Command
`npm run test -- tests/ui.searchClient.test.tsx`

### Result
- PASS: 1 file, 5 tests
- Includes UI rendering coverage for Decision Card v1 panel in the vertical slice.
