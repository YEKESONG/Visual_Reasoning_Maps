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


async def test_provider_value_error_cannot_echo_secrets(tmp_path, monkeypatch):
    from backend.tests.test_ingest import make_pdf

    path = tmp_path / "fixture.pdf"
    make_pdf(path)
    store = Store(tmp_path / "data")
    tasks = TaskManager()
    key = tasks.create()
    monkeypatch.setattr(main, "store", store)
    monkeypatch.setattr(main, "tasks", tasks)

    async def failing_process(*args):
        raise ValueError("private-provider-message-that-must-not-be-returned")

    monkeypatch.setattr(main, "process", failing_process)
    await main.run_task(key, path.read_bytes())
    last = tasks.events[key][-1]
    assert last["status"] == "error"
    assert "private-provider" not in last["error"]


async def test_explanation_drops_citations_outside_the_passages(tmp_path, monkeypatch):
    from backend.app.ingest.arxiv_html import parse_html
    from backend.app.models import Explanation

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
    await process(doc, CompleteFake(), main.settings, store, tasks, tasks.create())

    class Explainer:
        def __init__(self, *args):
            pass

        async def generate(self, stage, payload, schema):
            assert all(isinstance(row, list) for row in payload["sentences"])
            return Explanation(
                explanation="1. The author states it [p5s1]. 2. Outside [p9s9].",
                anchors=["p5s1", "p9s9"],
            )

    monkeypatch.setattr(main, "store", store)
    monkeypatch.setattr(main, "model_factory", Explainer)
    result = TestClient(main.app).post("/api/docs/fixture/steps/e/explanation").json()
    assert result["explanation"] == "1. The author states it [p5s1]. 2. Outside."
    assert result["anchors"] == ["p5s1"]


def test_failure_messages_name_the_stage_without_provider_text():
    import litellm

    from backend.app.llm.client import StageError

    def failed(stage, cause):
        try:
            raise StageError(stage) from cause
        except StageError as exc:
            return main.failure_message(exc)

    refused = litellm.AuthenticationError(
        message="secret-provider-text", llm_provider="deepseek", model="deepseek-flash"
    )
    message, params = failed("skeleton", refused)
    assert "DEEPSEEK_API_KEY" in message and "secret" not in message and params == {}
    message, params = failed("cross", ValueError("secret-provider-text"))
    assert "{stage}" in message and params == {"stage": "relations entre les sections"}
    assert main.failure_message(ValueError("PDF trop long : limite de 400 pages."))[0].startswith(
        "PDF trop long"
    )
    assert main.failure_message(RuntimeError("secret"))[0] == main.FAILED


async def test_stage_failure_reaches_the_progress_stream(tmp_path, monkeypatch):
    from backend.app.llm.client import StageError
    from backend.tests.test_ingest import make_pdf

    path = tmp_path / "fixture.pdf"
    make_pdf(path)
    tasks = TaskManager()
    key = tasks.create()
    monkeypatch.setattr(main, "store", Store(tmp_path / "data"))
    monkeypatch.setattr(main, "tasks", tasks)

    async def failing_process(*args):
        raise StageError("section") from ValueError("secret")

    monkeypatch.setattr(main, "process", failing_process)
    await main.run_task(key, path.read_bytes())
    client = TestClient(main.app)
    last = client.get(f"/api/tasks/{key}").json()
    assert last["status"] == "error"
    assert last["params"] == {"stage": "détails section par section"}
    assert client.get("/api/tasks/unknown").status_code == 404


def test_health_reports_the_configured_model():
    body = TestClient(main.app).get("/api/health").json()
    assert body["status"] == "ok" and body["model"] == main.settings.llm_model
