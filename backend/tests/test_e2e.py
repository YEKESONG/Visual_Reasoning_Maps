from fastapi.testclient import TestClient

import backend.app.main as main
from backend.app.models import Critique, Graph, Judgement, Suggestions
from backend.app.storage.files import Store
from backend.app.tasks.manager import TaskManager
from backend.app.tasks.pipeline import process
from backend.tests.test_extraction import fixture_graph


class CompleteFake:
    async def generate(self, stage, payload, schema):
        if stage == "skeleton":
            return fixture_graph()
        if stage in ("section", "cross"):
            return Graph(steps=[], links=[])
        if stage == "critic":
            return Critique(
                judgements=[
                    Judgement(
                        target_type=i["target_type"],
                        target_id=i["target_id"],
                        verdict="supported",
                        reason="Source explicite.",
                    )
                    for i in payload["items"]
                ]
            )
        return Suggestions(suggestions=[])


async def test_pipeline_and_read_api(tmp_path, monkeypatch):
    from backend.app.ingest.arxiv_html import parse_html

    html = (
        "<article><h1>Fixture</h1>"
        + "".join(f"<p>{s.quote}</p>" for s in fixture_graph().steps)
        + "</article>"
    )
    doc, html = parse_html(html, "fixture", "https://arxiv.org/html/2404.16130")
    store = Store(tmp_path)
    store.directory(doc.id).mkdir()
    (store.directory(doc.id) / "source.html").write_text(html)
    tasks = TaskManager()
    key = tasks.create()
    await process(doc, CompleteFake(), main.settings, store, tasks, key)
    monkeypatch.setattr(main, "store", store)
    monkeypatch.setattr(main, "tasks", tasks)
    client = TestClient(main.app)
    assert len(client.get("/api/docs").json()) == 1
    assert len(client.get("/api/docs/fixture/sentences").json()) == 5
    assert client.get("/api/docs/fixture/flow").json()["steps"][0]["status"] == "verified"
    assert "done" in client.get(f"/api/tasks/{key}/events").text
    assert "data-sentence" in client.get("/api/docs/fixture/source").text
    assert client.get("/api/docs/nope").status_code == 404


def test_upload_validation():
    client = TestClient(main.app)
    assert client.post("/api/tasks", files={"file": ("x.pdf", b"not pdf")}).status_code == 422
    assert client.post("/api/tasks", json={"arxiv_url": "https://evil.test"}).status_code == 422
    assert client.get("/api/tasks/unknown/events").status_code == 404
