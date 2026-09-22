#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -x .venv/bin/python ]; then echo 'Exécutez scripts/setup.sh.' >&2; exit 1; fi
.venv/bin/python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000 &
backend_pid=$!
(cd frontend && pnpm dev) &
frontend_pid=$!
trap 'kill "$backend_pid" "$frontend_pid" 2>/dev/null || true' EXIT INT TERM
wait
