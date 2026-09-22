"""Export the backend contract before pnpm types."""

import json
from pathlib import Path

from backend.app.main import app

Path("frontend/openapi.json").write_text(json.dumps(app.openapi(), indent=2) + "\n")
