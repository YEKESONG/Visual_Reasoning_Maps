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


def doc_with(sections: dict[str, list[str]]) -> Document:
    doc = Document(
        id="d",
        title="D",
        kind="pdf",
        sections=[Section(id=f"sec{i}", title=title) for i, title in enumerate(sections, 1)],
    )
    for i, texts in enumerate(sections.values(), 1):
        for j, text in enumerate(texts, 1):
            doc.sentences.append(
                Sentence(
                    id=f"p{i}s{j}",
                    text=text,
                    section_id=f"sec{i}",
                    order=len(doc.sentences),
                    paragraph_id=f"p{i}",
                    bbox=[(1.0, 2.0, 3.0, 4.0)],
                )
            )
    return doc


def test_model_input_is_grouped_by_section_without_geometry():
    from backend.app.extraction.pipeline import sections_payload

    doc = doc_with({"Intro": ["First claim.", "Second claim."], "Method": ["A step."]})
    assert sections_payload(doc, 10_000) == [
        {"title": "Intro", "sentences": [["p1s1", "First claim."], ["p1s2", "Second claim."]]},
        {"title": "Method", "sentences": [["p2s1", "A step."]]},
    ]
    long = doc_with({"A": [f"{i} " + "x" * 200 for i in range(10)], "B": ["y" * 200] * 10})
    sampled = sections_payload(long, 1000)
    # Each section keeps its opening and closing sentences when the text is too long.
    assert [s["sentences"][0][0] for s in sampled] == ["p1s1", "p2s1"]
    assert [s["sentences"][-1][0] for s in sampled] == ["p1s10", "p2s10"]


def test_section_chunks_pack_short_sections_and_split_long_ones():
    from backend.app.extraction.pipeline import section_chunks

    doc = doc_with({"A": ["a" * 30, "b" * 30], "B": ["c" * 30], "C": ["d" * 60] * 3})
    chunks = section_chunks(doc, 100)
    assert [[part["title"] for part in chunk] for chunk in chunks] == [
        ["A", "B"],
        ["C"],
        ["C"],
        ["C"],
    ]


async def test_detail_and_cross_stages_are_merged_conservatively():
    from backend.app.models import Link, Step

    def step(key, parent):
        return Step(
            id=key,
            parent=parent,
            type="evidence",
            label=key,
            summary=key,
            anchors=["p2s1"],
            quote="Une prémisse explicite.",
            confidence=0.5,
        )

    def link(key, src, dst, kind="support"):
        return Link(id=key, src=src, dst=dst, type=kind, anchors=["p2s1"], confidence=0.5)

    payloads = {}

    class Model:
        async def generate(self, stage, payload, schema):
            payloads[stage] = payload
            if stage == "skeleton":
                return fixture_graph()
            if stage == "section":
                return Graph(
                    steps=[step("c1", "b"), step("c2", "missing")], links=[link("l1", "c1", "b")]
                )
            return Graph(
                steps=[],
                links=[
                    link("x1", "a", "b", "refine"),
                    link("x2", "c", "e"),
                    link("x3", "nope", "e"),
                ],
            )

    graph = await extract(fixture_doc(), Model(), Settings(_env_file=None))
    assert [s.id for s in graph.steps if s.parent] == ["section0_c1"]
    ids = {e.id: (e.src, e.dst) for e in graph.links}
    assert ids["section0_l1"] == ("section0_c1", "b")
    # x1 repeats an existing relation and x3 points to an unknown step.
    assert "x2" in ids and "x1" not in ids and "x3" not in ids
    assert len(payloads["section"]["main_flow"]) == 5
    assert ["a", "b", "refine"] in payloads["cross"]["existing_links"]
    assert all(isinstance(row, list) for row in payloads["cross"]["sentences"])


def test_model_output_without_sources_is_dropped_not_fatal():
    graph = Graph.model_validate(
        {
            "steps": [
                {
                    "id": "a",
                    "type": "claim",
                    "label": "L" * 60,
                    "summary": "s",
                    "anchors": ["p1s1"],
                    "quote": "q",
                    "confidence": 1.4,
                },
                {
                    "id": "b",
                    "type": "claim",
                    "label": "B",
                    "summary": "s",
                    "anchors": [],
                    "quote": "q",
                    "confidence": 0.5,
                },
            ],
            "links": [
                {
                    "id": "l",
                    "src": "b",
                    "dst": "a",
                    "type": "support",
                    "anchors": [],
                    "confidence": 0.5,
                }
            ],
            "terms": [{"term": "t", "definition": "d", "anchors": [], "step_ids": ["a"]}],
        }
    )
    assert [s.id for s in graph.steps] == ["a"]
    assert len(graph.steps[0].label) == 40 and graph.steps[0].confidence == 1.0
    # A relation without its own sentence borrows the sentences of its endpoints.
    assert graph.links[0].anchors == ["p1s1"]
    assert graph.terms == []
