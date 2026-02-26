# Interface UX Meeting — 2026-02-26

## Attendees
- Tron (facilitator)
- Lexy (UX)
- Dexter (research)
- Archy (architecture)

## 1:1 with Lexy — sentiment + progress readout
**Lexy’s take:**
- Progress is real but uneven.
- Reliability patches helped trust, but the product still has “split personality” moments (live mode works, fallback mode feels like a different product).
- Current visuals are a good start, but they are **scaffolding graphics**, not yet “delight” graphics.

**Lexy confidence:** Medium-positive.
- Green on velocity.
- Yellow on polish consistency.
- Red on fallback narrative clarity when upstream is unstable.

## Dexter research summary (requested)
Dexter reviewed UX and README visual guidance references and distilled practical standards:

1. **Visibility of system status** and clear recovery action should be explicit at all times (Nielsen/NNG).
2. Keep interaction model simple: one primary job per view; avoid cognitive overload from mixed contexts.
3. README visuals should provide proof, not decoration:
   - architecture map
   - UX flow map
   - short real usage capture (GIF/video)
4. Prefer stable, repo-hosted visual assets and readable markdown structure (GitHub docs conventions + relative assets).

## Archy review on Dexter findings
Archy agrees and adds:
- We should treat fallback as a **transport state**, not a content mode.
- Cache should not preserve fallback responses as if they were canonical success.
- UI should show provenance (“live source” vs “degraded fallback”) with deterministic retry policy.
- Site/readme graphics should be versioned artifacts with ownership and acceptance criteria.

## Joint recommendation (Lexy + Archy)
### Product UX
1. Separate success and degraded modes clearly:
   - live result cards = normal UI
   - degraded mode = explicit banner + minimal fixture area + hard retry CTA
2. Never let fallback visuals masquerade as normal recommended content.
3. Add a small “data source chip” near result headers (`Live: tcgdex` / `Degraded: local fixture`).
4. Keep card placeholders, but reduce ambiguity with label (“Image unavailable from source”).

### README + graphics
1. Keep current SVGs but add **real product captures**:
   - Search happy path screenshot
   - Coach happy path screenshot
   - Collection workflow screenshot
2. Add one short user-journey GIF (10–20s) showing search -> detail -> add to collection.
3. Add captions under each visual that explain user value, not implementation details.

## Sprint direction (post-meeting)
- Priority A: fallback/live behavior clarity in product UI.
- Priority B: visual proof pack for README and site.
- Priority C: refine spacing/hierarchy on mobile.

## Decision
Proceed with Sprint 2 continuation under gate order:
Pam -> Archy -> Lexy -> Gino -> Andy -> Moss -> Roy -> Tron
