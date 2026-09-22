from pathlib import Path

from backend.app.config import Settings
from backend.app.extraction.pipeline import extract
from backend.app.models import Document, Graph, Section, Sentence


def fixture_graph():
    return Graph.model_validate_json((Path(__file__).parent / "fixtures/graph.json").read_text())


def fixture_doc():
    graph = fixture_graph()
    return Document(
        id="fixture",
        title="Fixture",
        kind="html",
        sections=[Section(id="sec1", title="Test")],
        sentences=[
            Sentence(
                id=s.anchors[0], text=s.quote, section_id="sec1", order=i, paragraph_id=f"p{i + 1}"
            )
            for i, s in enumerate(graph.steps)
        ],
    )


class FakeModel:
    def __init__(self):
        self.calls = []

    async def generate(self, stage, payload, schema):
        self.calls.append(stage)
        return fixture_graph() if stage == "skeleton" else Graph(steps=[], links=[])


async def test_three_stages():
    model = FakeModel()
    graph = await extract(fixture_doc(), model, Settings(_env_file=None))
    assert len(graph.steps) == 5
    assert model.calls == ["skeleton", "section", "cross"]
