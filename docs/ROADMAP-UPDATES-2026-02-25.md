# Roadmap Updates — 2026-02-25

> Docs index: [`docs/README.md`](README.md)

## P0 — Search/Discovery UI State Contract Tightening

### P0-1: Gate Cool Picks to default page load only
**Priority:** P0  
**Goal:** Show Cool Picks only when query is empty.

**Acceptance Criteria**
- Given page load with empty query, Cool Picks section is visible.
- Cool Picks renders exactly **3** cards.
- If fewer than 3 source candidates exist, UI renders min(available, 3) without error.
- No query-entered state displays Cool Picks.

### P0-2: Enforce mutual exclusivity: query results vs Cool Picks
**Priority:** P0  
**Goal:** Once user types a query, only search-result states are shown.

**Acceptance Criteria**
- Given non-empty query, Cool Picks section is not rendered.
- Results state (loading/error/empty/list) is driven exclusively by query search flow.
- Clearing query returns UI to default state where Cool Picks may render.

## P1 — Card Detail Experience

### P1-1: Add card details modal on card click
**Priority:** P1  
**Goal:** Clicking any card opens modal with richer metadata.

**Acceptance Criteria**
- Clicking a card opens modal anchored to selected card identity.
- Modal includes, when present:
  - move/attack names
  - move descriptions/effects
  - attack damage
  - HP
  - retreat cost
  - weakness
  - resistance
  - special ability text
- Modal supports close via X button, backdrop click, and Esc key.
- Missing data follows a defined rendering policy (hide field or show “N/A”), consistently.

### P1-2: Normalize and map metadata fields end-to-end
**Priority:** P1  
**Goal:** Ensure backend/normalization model exposes all required modal fields.

**Acceptance Criteria**
- API response / normalized card model contains fields needed by modal.
- Mapping documentation added (provider payload -> normalized model -> UI field).
- Unit/integration tests cover at least one card with full metadata and one with partial metadata.

## Delivery Sequence (few-at-a-time)
1. **Slice A (P0):** P0-1 + P0-2 together (single UI-state contract pass).
2. **Slice B (P1):** P1-1 shell modal (open/close + selected card wiring + placeholder layout).
3. **Slice C (P1):** P1-2 data mapping + final metadata rendering + tests.
4. **Slice D (hardening):** Regression pass for state transitions and modal accessibility behavior.
