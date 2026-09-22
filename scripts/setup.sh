#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
PYTHON_BIN="${PYTHON_BIN:-python3}"
"$PYTHON_BIN" -c 'import sys; assert sys.version_info >= (3, 12), "Python 3.12 ou supérieur requis par les versions verrouillées."'
node -e 'if(Number(process.versions.node.split(".")[0])<22)throw Error("Node.js 22+ requis")'
if ! command -v pnpm >/dev/null 2>&1; then
  echo 'Installez pnpm 11 : npm install -g pnpm@11.19.0' >&2
  exit 1
fi
if [ ! -d .venv ]; then "$PYTHON_BIN" -m venv .venv; fi
.venv/bin/python -m pip install -r requirements.lock
if [ ! -f .env ]; then cp .env.example .env; fi
(cd frontend && pnpm install --frozen-lockfile && pnpm build)
echo 'Installation terminée. Ajoutez éventuellement la clé dans .env puis lancez : python3 run.py'
