# Sprint 2 Packet — UX Stabilization & IA Split (Collection Command Center)

## goal
Ship a functional, low-friction UX shell that separates core workflows and improves reliability perception on first use.

## scope
- Convert top-level nav tabs into true conditional sections:
  - Search tab: search input, results, optimization copy, guided builder
  - Coach tab: coach + decision-card flow only
  - Collection tab: collection command center only
- Add global status banner system for loading/error/success signals.
- Add image fallback behavior when card asset URLs 404.
- Keep existing API contracts stable.

## out_of_scope
- New backend ranking/recommendation logic
- New coach contract revisions
- Major visual rebranding/theme overhaul

## constraints
- Preserve existing tests where behavior is unchanged.
- Add targeted UI tests for tab separation and status banner visibility.
- No destructive data changes.

## acceptance_criteria
1. User can switch between Search/Coach/Collection and only relevant section renders per tab.
2. Search tab remains default on first load.
3. API/JSON failures show readable status banner and do not hard-crash UI.
4. Broken card images render fallback placeholder instead of broken image icon.
5. `npm run test:ui` and `npm run build` pass.

## test_commands
- npm run test:ui
- npm run build

## risk_level
medium

## priority
P0
