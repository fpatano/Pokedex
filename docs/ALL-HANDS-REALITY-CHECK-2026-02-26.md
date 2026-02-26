# All-Hands Reality Check — 2026-02-26

## Directive from Frank (binding)
This is **not** fake-it-till-you-make-it.

- No shipping for appearance.
- No masking core failures with default values.
- No treating degraded states as acceptable substitutes for intended behavior.
- If it is not doing what it is intended to do, it must be fixed.

## Team Commitment (unanimous)
Pam, Archy, Lexy, Gino, Andy, Moss, Roy, Dexter, Doc, Tron:

1. **Function over facade**
   - UX polish cannot be used to hide functional failure.
2. **No default-value laundering**
   - Fallback/default/sample data is allowed only for explicit diagnostics, never as a production stand-in for core success paths.
3. **Truthful state signaling**
   - When upstream fails, UI must clearly state failure and recovery actions.
4. **Definition of done updated**
   - Feature is done only when intended behavior works in real conditions.
5. **Gate enforcement**
   - Any gate may fail work that substitutes visuals/defaults for core correctness.

## Immediate enforcement changes
- Block release if fallback path appears in primary flow without explicit outage condition.
- Block release if sample/default payload is presented as normal recommendation content.
- Require evidence of live-path success before calling a task complete.

## Single-line principle
**If it doesn’t work as intended, it is not done.**
