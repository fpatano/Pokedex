# Sprint 2 Kickoff v2 — UX Stabilization + Product Delight

## Objective
Move from "technically functional" to "reliably delightful" across Search, Coach, and Collection.

## Gate Order (active)
Pam -> Archy -> Lexy -> Gino -> Andy -> Moss -> Roy -> Tron

## Scope
1. True tab isolation by workflow (Search/Coach/Collection)
2. Top-level status banner system for state clarity
3. Image resilience (fallback + source hygiene)
4. Mobile spacing/interaction polish
5. README visual refresh baseline (Doc + Lexy)

## Acceptance Criteria
- Core workflows are obvious without explanation
- No broken-image icons in normal flows
- Error states include explicit recovery action
- UI tests + build pass
- README includes at least one architecture/flow graphic

## Risks
- Over-correcting with visual complexity
- Regressions in existing journey tests

## First Task Packet
- Owner: Gino
- Task: Implement true tab-based conditional rendering + status banner region + keep contracts unchanged
- Validation: Andy rendered journey + Moss regression + Roy quality review
