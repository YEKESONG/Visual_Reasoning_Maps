#!/usr/bin/env python3
"""Launch from any directory using the project virtual environment."""

import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parent
python = root / ".venv" / "bin" / "python"
if not python.exists():
    sys.exit("Exécutez d’abord bash scripts/setup.sh pour installer les dépendances.")
if not (root / "frontend/dist/index.html").exists():
    sys.exit("Interface non construite. Exécutez bash scripts/setup.sh.")
os.chdir(root)
os.execv(
    str(python),
    [
        str(python),
        "-m",
        "uvicorn",
        "backend.app.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        os.environ.get("PORT", "8000"),
    ],
)
