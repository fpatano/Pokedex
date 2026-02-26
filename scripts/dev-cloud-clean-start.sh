#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

echo "[dev-cloud-clean-start] checking port $PORT"
if command -v lsof >/dev/null 2>&1; then
  PIDS="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$PIDS" ]]; then
    echo "[dev-cloud-clean-start] stopping process(es) on :$PORT -> $PIDS"
    kill $PIDS || true
    sleep 1
    # best-effort hard stop if still present
    PIDS_AFTER="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$PIDS_AFTER" ]]; then
      echo "[dev-cloud-clean-start] force-stopping stubborn process(es): $PIDS_AFTER"
      kill -9 $PIDS_AFTER || true
    fi
  fi
else
  echo "[dev-cloud-clean-start] lsof not found; skipping automatic port cleanup"
fi

if command -v pkill >/dev/null 2>&1; then
  # Fallback: catch detached Next dev listeners that may not be returned by lsof in all environments.
  pkill -f "next dev --hostname 0.0.0.0 --port $PORT" >/dev/null 2>&1 || true
  sleep 0.5
fi

if [[ -d .next ]]; then
  echo "[dev-cloud-clean-start] removing stale .next artifacts"
  rm -rf .next
fi

echo "[dev-cloud-clean-start] clean completed (.next removed, port $PORT freed)"
