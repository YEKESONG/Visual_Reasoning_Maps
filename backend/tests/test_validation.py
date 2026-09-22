import pytest

from backend.app.config import Settings
from backend.app.models import Critique, Judgement, Link
from backend.app.validation.checks import local_checks, validate_and_repair
from backend.tests.test_extraction import fixture_doc, fixture_graph


def codes(graph):
    return {i["code"] for i in local_checks(graph, fixture_doc(), Settings(_env_file=None))}


def test_quote_fallback():
    graph = fixture_graph()
    graph.steps[0].anchors = ["bad"]
    assert "anchor" not in codes(graph)
    assert graph.steps[0].anchors == ["p1s1"]


def test_invalid_quote():
    graph = fixture_graph()
    graph.steps[0].quote = "XYZ inexistante 9327"
    assert "anchor" in codes(graph)


def test_cycles():
    graph = fixture_graph()
    graph.links.append(
        Link(id="back", src="e", dst="a", type="support", anchors=["p1s1"], confidence=0.1)
    )
    assert "cycle" in codes(graph)


def test_contradictions_do_not_make_cycles():
    graph = fixture_graph()
    graph.links.append(
        Link(id="back", src="e", dst="a", type="contradict", anchors=["p1s1"], confidence=0.1)
    )
    assert "cycle" not in codes(graph)


def test_disconnected_dead_end():
    graph = fixture_graph()
    graph.links = graph.links[:-1]
    assert {"disconnected", "dead_end", "unsupported_conclusion"} <= codes(graph)


@pytest.mark.parametrize(
    "change,code",
    [
        (lambda g: setattr(g.steps[0], "parent", "bad"), "parent"),
        (lambda g: g.steps.pop(), "endpoint"),
        (lambda g: setattr(g.links[0], "anchors", ["bad"]), "anchor"),
        (lambda g: setattr(g.links[0], "connective", "inexistant"), "connective"),
        (lambda g: g.steps.append(g.steps[0].model_copy()), "duplicate_id"),
        (lambda g: setattr(g.steps[-1], "type", "claim"), "conclusion"),
    ],
)
def test_constraints(change, code):
    graph = fixture_graph()
    change(graph)
    assert code in codes(graph)


class Critic:
    def __init__(self):
        self.repairs = 0

    async def generate(self, stage, payload, schema):
        if stage == "critic":
            return Critique(
                judgements=[
                    Judgement(
                        target_type=i["target_type"],
                        target_id=i["target_id"],
                        verdict="unsupported",
                        reason="Non démontré.",
                    )
                    for i in payload["items"]
                ]
            )
        self.repairs += 1
        return fixture_graph()


async def test_two_repairs_and_uncertainty():
    critic = Critic()
    graph, report = await validate_and_repair(
        fixture_graph(), fixture_doc(), critic, Settings(_env_file=None)
    )
    assert critic.repairs == 2
    assert len(report["rounds"]) == 3
    assert all(s.status == "to_verify" for s in graph.steps)
