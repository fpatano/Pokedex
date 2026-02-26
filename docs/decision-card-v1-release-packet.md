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

## Signoff Checklist
- [ ] Contract lock reviewed (`DecisionCardResponseSchema`)
- [ ] Determinism verified (repeat input equality)
- [ ] Golden fixture suite green (>=3 per state + edge/conflict)
- [ ] J4/J6/J7/J10 acceptance tests green
- [ ] UI rendering verified (state + reasons + blockers + actions)
- [ ] Rollback toggle drill completed
- [ ] No open P0/P1 defects
