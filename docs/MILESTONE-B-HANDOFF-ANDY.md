# Milestone B Handoff Packet — Andy (Implementation Gate)

## Scope delivered
- Additive request field: `collectionIntakePartial` (optional)
- Additive response field: `deckSkeleton` (optional, gated)
  - `ownedCore[]`
  - `missingCore[]`
  - `optionalUpgrades[]`
- Deterministic canonicalization for partial intake:
  - normalize card names (trim/collapse spaces + lowercase canonical key)
  - dedupe by canonical name
  - default count to `1`
  - stable sorting
- Deterministic deck skeleton builder with frozen ordering/tie-breaks
- Carryover actionability bridge:
  - each `missingCore` item has `action_text` + explainability mapping (`reason_code`, `evidence_ref`)
  - `next_actions` prepends explicit collection-gap action when gaps exist
- Route integration + rollback controls:
  - env toggle: `DECK_SKELETON_V1_ENABLED` (default disabled)
  - header: `x-deck-skeleton-variant: v1|disabled`
- No breaking contract removals/renames
- Failure safety: if skeleton generation errors, response degrades gracefully to base shape + non-fatal next-action note

## Validation command
```bash
npm run test -- \
  tests/decisionCard.contract.test.ts \
  tests/decisionCard.engine.test.ts \
  tests/decisionCard.journeyAcceptance.test.ts \
  tests/decisionCard.route.test.ts \
  tests/decisionCard.deckSkeleton.golden.test.ts
```

## Validation output (pass)
- Test Files: **5 passed (5)**
- Tests: **24 passed (24)**
- Key checks:
  - contract/additive request-response
  - deterministic canonical intake + trace id stability
  - J8/J9/J10 journey coverage with skeleton assertions
  - route toggle/header semantics
  - deck skeleton golden stability
  - graceful fallback when skeleton builder fails (non-fatal note, no contract break)

## Gate checklist for Andy
1. Verify additive-only contract drift (request/response strictness preserved)
2. Verify `DECK_SKELETON_V1_ENABLED=false` returns prior body shape + `x-deck-skeleton-variant: disabled`
3. Verify `DECK_SKELETON_V1_ENABLED=true` includes `deckSkeleton` + `x-deck-skeleton-variant: v1`
4. Verify deterministic output via repeated runs on canonical-equivalent intake
5. Verify rollback path unaffected for `DECISION_CARD_V1_ENABLED=false`

## Notes
- Deck skeleton is supportive detail only; single `state` plan invariant remains unchanged.
- No ranking/model rewrite, no tournament telemetry changes, no UI redesign scope expansion.
