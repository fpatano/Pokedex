#!/usr/bin/env bash
set -euo pipefail

# M4 Tournament rollback drill
# Usage: bash scripts/tournament-rollback-drill.sh

echo "[drill] 1) validating tournament env"
npm run validate:tournament-env

echo "[drill] 2) simulate tournament enabled"
export TOURNAMENT_VARIANT_ENABLED=true
npm run test -- tests/coach.tournament.route.test.ts

echo "[drill] 3) rollback toggle"
export TOURNAMENT_VARIANT_ENABLED=false

node -e "if (process.env.TOURNAMENT_VARIANT_ENABLED !== 'false') process.exit(1); console.log('[drill] rollback env set')"

echo "[drill] 4) post-rollback smoke"
npm run test -- tests/coach.route.test.ts

echo "[drill] completed"
