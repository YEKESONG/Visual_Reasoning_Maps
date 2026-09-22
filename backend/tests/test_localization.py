from fastapi.testclient import TestClient

import backend.app.main as main
from backend.app.models import Explanation, Flow, Generation, Metadata
from backend.app.storage.files import Store
from backend.app.tasks.manager import TaskManager
from backend.tests.test_extraction import fixture_doc, fixture_graph
from backend.tests.test_ingest import make_pdf


def test_language_is_validated_before_task_creation():
    client = TestClient(main.app)
    response = client.post(
        "/api/tasks", json={"arxiv_url": "https://arxiv.org/html/2404.16130", "language": "de"}
    )
    assert response.status_code == 422
    assert "Langue" in response.json()["detail"]


async def test_language_changes_document_cache_and_stays_request_scoped(tmp_path, monkeypatch):
    path = tmp_path / "source.pdf"
    make_pdf(path)
    body = path.read_bytes()
    received = []

    async def fake_process(doc, model, config, store, tasks, task_id):
        received.append((doc.id, config.label_language))

    store = Store(tmp_path / "data")
    tasks = TaskManager()
    monkeypatch.setattr(main, "store", store)
    monkeypatch.setattr(main, "tasks", tasks)
    monkeypatch.setattr(main, "process", fake_process)
    monkeypatch.setattr(main, "model_factory", lambda *_: None)
    original = main.settings.label_language
    await main.run_task(tasks.create(), body, language="zh")
    await main.run_task(tasks.create(), body, language="en")
    assert received == [(main.document_id(body, "zh"), "zh"), (main.document_id(body, "en"), "en")]
    assert received[0][0] != received[1][0]
    assert main.settings.label_language == original


def test_explanation_language_has_separate_cache(tmp_path, monkeypatch):
    store = Store(tmp_path)
    doc = fixture_doc()
    flow = Flow(
        **fixture_graph().model_dump(),
        metadata=Metadata(
            id=doc.id, title="Fixture", kind="pdf", created_at="2026-09-22T00:00:00Z"
        ),
        generation=Generation(model="fake", timestamp="2026-09-22T00:00:00Z"),
    )
    store.write(doc.id, "parsed.json", doc.model_dump(mode="json"))
    store.write(doc.id, "flow.json", flow.model_dump(mode="json"))
    languages = []

    class Fake:
        def __init__(self, config, *_):
            self.language = config.label_language

        async def generate(self, *_):
            languages.append(self.language)
            return Explanation(explanation=self.language, anchors=["p1s1"])

    monkeypatch.setattr(main, "store", store)
    monkeypatch.setattr(main, "model_factory", Fake)
    client = TestClient(main.app)
    for language in ["zh", "en", "fr", "zh"]:
        response = client.post(
            f"/api/docs/{doc.id}/steps/a/explanation", headers={"X-UI-Language": language}
        )
        assert response.status_code == 200
        assert response.json()["explanation"] == language
    assert languages == ["zh", "en", "fr"]
