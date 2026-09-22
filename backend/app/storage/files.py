import hashlib
import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any


def digest(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


class Store:
    def __init__(self, root: Path):
        self.root = root
        root.mkdir(parents=True, exist_ok=True)

    def directory(self, doc_id: str) -> Path:
        if not re.fullmatch(r"[a-zA-Z0-9_-]{1,80}", doc_id):
            raise ValueError("Identifiant invalide.")
        return self.root / doc_id

    def write(self, doc_id: str, name: str, value: Any) -> None:
        path = self.directory(doc_id) / name
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=path.parent)
        try:
            with os.fdopen(fd, "w") as handle:
                json.dump(value, handle, ensure_ascii=False, indent=2)
            os.replace(tmp, path)
        finally:
            if os.path.exists(tmp):
                os.unlink(tmp)

    def read(self, doc_id: str, name: str) -> Any:
        return json.loads((self.directory(doc_id) / name).read_text())

    def list_docs(self) -> list[dict]:
        docs = []
        for path in self.root.glob("*/flow.json"):
            try:
                docs.append(json.loads(path.read_text())["metadata"])
            except (ValueError, KeyError):
                continue
        return sorted(docs, key=lambda x: x.get("created_at", ""), reverse=True)
