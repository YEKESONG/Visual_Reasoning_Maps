import json

from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.storage.files import Store, digest
from backend.app.tasks.manager import TaskManager


def test_health():
    assert TestClient(app).get("/api/health").json()["status"] == "ok"


def test_atomic_storage(tmp_path):
    s = Store(tmp_path)
    key = digest(b"paper")
    s.write(key, "parsed.json", {"title": "Épreuve"})
    assert s.read(key, "parsed.json")["title"] == "Épreuve"


async def test_sse_replay():
    t = TaskManager()
    key = t.create()
    t.emit(key, "Terminé", 100, "done", doc_id="abc")
    values = [v async for v in t.stream(key)]
    assert json.loads(values[-1]["data"])["doc_id"] == "abc"
    assert len([v async for v in t.stream(key, 0)]) == 1
