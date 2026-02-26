# Milestone B Sprint Lock — Partial Collection Intake + Owned/Missing Deck Skeleton

> Status: **LOCKED FOR IMPLEMENTATION**
> Owner: **Gino**
> Depends on: Milestone A closure (`decision-card-v1` + gate signoff)

## 1) Sprint Objective (single)
Deliver an additive, deterministic **partial collection intake** path that produces a stable **owned/missing deck skeleton** artifact users can act on immediately, without breaking existing search/coach/decision-card contracts.

## 2) Scope Lock

### In scope (only)
1. Add partial collection intake payload support (sparse allowed).
2. Normalize intake deterministically (dedupe/sort/canonicalize names + counts).
3. Produce a new machine-readable artifact: `deckSkeleton` with:
   - `ownedCore[]`
   - `missingCore[]`
   - `optionalUpgrades[]`
4. Ensure missing items map to explicit next actions (carryover actionability).
5. Add journey acceptance coverage for **J8/J9/J10 carry-forward semantics** on this new artifact.
6. Add rollback toggle + variant header for safe disable.

### Out of scope (strict)
- No ranking/model rewrites.
- No tournament telemetry integration.
- No UI redesign beyond minimal rendering needed to expose owned/missing skeleton.
- No multi-deck optimization/orchestration.
- No breaking request/response field removals or renames.

## 3) Ordered Task Breakdown (Gino)
1. **Contract draft (additive only):**
   - Append `collectionIntakePartial` request field (optional).
   - Append `deckSkeleton` response field (optional when feature off, present when on).
2. **Canonicalization layer:**
   - Normalize card identifiers/text; dedupe, stable sort, default counts.
   - Emit deterministic canonical snapshot used by downstream skeleton builder.
3. **Skeleton builder v1:**
   - Generate deterministic `ownedCore`, `missingCore`, `optionalUpgrades` from canonical intake + existing planner outputs.
   - Freeze ordering/tie-break rules.
4. **Actionability bridge:**
   - Every `missingCore` row must include concrete action text + reason/evidence link.
   - Ensure carryover from existing `next_actions` remains intact and references skeleton gaps when relevant.
5. **Route integration + feature flag:**
   - Add runtime toggle `DECK_SKELETON_V1_ENABLED` (default `false` until gate GO).
   - Add response header variant (`x-deck-skeleton-variant: v1|disabled`).
6. **Tests + fixtures:**
   - Contract tests, determinism tests, journey acceptance extensions (J8/J9/J10), route toggle tests, golden fixtures.
7. **Docs + handoff packet update:**
   - Update docs index + root README references.
   - Include validation commands + proof snippets for gate review.

## 4) Acceptance Criteria (journey-gap linked)

### J8 — Explainability parity on new artifact
- `deckSkeleton.missingCore[*].reason_code` and evidence refs are consistent with top reasons/explainability payload.
- No orphan missing-item recommendation without explainability mapping.

### J9 — Deterministic traceability
- Same canonical intake + config => byte-identical `deckSkeleton` and same deterministic trace id behavior.
- Trace id format constraints remain unchanged.

### J10 — Single-plan safety
- Response still returns one plan/state; deck skeleton is supportive detail, not multi-plan orchestration.
- No additional competing decision cards/states emitted.

### Carryover actionability
- If `missingCore.length > 0`, at least one `next_actions[]` item explicitly addresses collection gaps.
- If no gaps, action path does not regress existing readiness actions.

## 5) Test Plan + Gates (Andy / Moss / Roy)

### Validation command set
```bash
npm run test -- \
  tests/decisionCard.contract.test.ts \
  tests/decisionCard.engine.test.ts \
  tests/decisionCard.journeyAcceptance.test.ts \
  tests/decisionCard.route.test.ts \
  tests/decisionCard.deckSkeleton.golden.test.ts
```

### Gate responsibilities
- **Andy (Implementation Gate):**
  - Contract additive check, route toggle behavior, headers, deterministic fixture stability.
  - Verdict: GO only if no contract drift and rollback path proven.
- **Moss (QA Journey Gate):**
  - J8/J9/J10 + carryover actionability scenarios pass with evidence.
  - Verdict: GO only if journey mapping is explicit and reproducible.
- **Roy (Product/Release Gate):**
  - Output is actionable for partial-collection users; no UX ambiguity on owned vs missing.
  - Verdict: GO only if user-facing value is clear with feature toggle safety.

## 6) Additive-Contract Guardrails + Rollback/Safety

### Guardrails
- Never remove/rename existing contract fields.
- New fields optional and backward-compatible.
- Ordering rules frozen and covered by golden tests.
- Deterministic output required under identical input/config.

### Rollback
- Toggle off path: `DECK_SKELETON_V1_ENABLED=false`.
- Disabled mode must return prior behavior with no errors and explicit header `x-deck-skeleton-variant: disabled`.
- Rollback drill required before release signoff.

### Safety checks
- Reject malformed partial intake with existing `INVALID_REQUEST` semantics.
- Cap list sizes and sanitize identifiers to avoid pathologic payloads.
- If skeleton generation fails, degrade gracefully to existing response shape + non-fatal explainability note.

---

## Handoff instruction (immediate)
Gino should implement Tasks 1→7 in order, open PR with validation evidence, then request sequential gate reviews: **Andy → Moss → Roy**.