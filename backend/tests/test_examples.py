from pathlib import Path

from backend.app.models import Document, Flow


def test_demo_anchors_and_source_files():
    for directory in Path("examples").glob("demo-*"):
        flow = Flow.model_validate_json((directory / "flow.json").read_text())
        doc = Document.model_validate_json((directory / "parsed.json").read_text())
        sentences = {s.id: s for s in doc.sentences}
        assert flow.metadata.demo
        assert "no API call" in flow.generation.model
        assert len([s for s in flow.steps if s.parent is None]) == 6
        assert (directory / ("source." + doc.kind)).exists()
        for step in flow.steps:
            assert step.status == "partial"
            assert step.quote in " ".join(sentences[a].text for a in step.anchors)


def test_outdated_example_copies_are_replaced(tmp_path):
    from backend.app.main import sync_examples
    from backend.app.storage.files import Store

    examples = tmp_path / "examples"
    (examples / "demo-a").mkdir(parents=True)
    (examples / "demo-a/flow.json").write_text('{"version": 2}')
    store = Store(tmp_path / "data")
    stale = store.directory("demo-a")
    stale.mkdir()
    (stale / "flow.json").write_text('{"version": 1}')
    (stale / "explanations").mkdir()
    sync_examples(examples, store)
    assert (stale / "flow.json").read_text() == '{"version": 2}'
    assert not (stale / "explanations").exists()
    # An up-to-date copy is left alone.
    (stale / "note.txt").write_text("kept")
    sync_examples(examples, store)
    assert (stale / "note.txt").exists()
