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
