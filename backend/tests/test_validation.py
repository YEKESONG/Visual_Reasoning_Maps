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


class UnchangedRepair:
    def __init__(self, graph):
        self.graph = graph

    async def generate(self, stage, payload, schema):
        if stage == "critic":
            return Critique(judgements=[])
        return self.graph.model_copy(deep=True)


async def test_failed_repairs_still_produce_renderable_graph():
    import networkx as nx

    from backend.app.validation.checks import directed

    graph = fixture_graph()
    graph.steps[0].parent = "missing"
    graph.steps.append(graph.steps[1].model_copy())
    graph.links.extend(
        [
            graph.links[0].model_copy(),
            Link(
                id="missing", src="bad", dst="a", type="support", anchors=["p1s1"], confidence=0.8
            ),
            Link(id="back", src="e", dst="a", type="support", anchors=["p1s1"], confidence=0.01),
            Link(id="self", src="a", dst="a", type="contradict", anchors=["p1s1"], confidence=0.7),
        ]
    )
    result, report = await validate_and_repair(
        graph, fixture_doc(), UnchangedRepair(graph), Settings(_env_file=None)
    )
    assert nx.is_directed_acyclic_graph(directed(result))
    assert len({s.id for s in result.steps}) == len(result.steps)
    assert len({e.id for e in result.links}) == len(result.links)
    assert result.steps[0].parent is None
    assert {e["id"] for e in report["removed_links"]} >= {"missing", "back", "self"}
    assert all(s.status == "to_verify" for s in result.steps)
    assert len(report["rounds"]) == 3


def test_deduplicate_requires_shared_provenance():
    from backend.app.validation.checks import deduplicate

    graph = fixture_graph()
    twin = graph.steps[0].model_copy(update={"id": "twin", "anchors": ["p2s1"]})
    graph.steps.append(twin)
    assert deduplicate(graph, Settings(_env_file=None)) == []
    twin.anchors = graph.steps[0].anchors
    changes = deduplicate(graph, Settings(_env_file=None))
    assert changes[0]["target_id"] == "twin"
    assert len(graph.steps) == 5


class Supportive:
    """Critic that supports everything and a repair stage that changes nothing."""

    def __init__(self, skip_first_pass=False):
        self.calls = []
        self.skip_first_pass = skip_first_pass

    async def generate(self, stage, payload, schema):
        self.calls.append(stage)
        if stage == "critic":
            items = payload["items"]
            if self.skip_first_pass and self.calls.count("critic") == 1:
                items = items[:1]
            return Critique(
                judgements=[
                    Judgement(
                        target_type=i["target_type"],
                        target_id=i["target_id"],
                        verdict="supported",
                        reason="Explicite.",
                    )
                    for i in items
                ]
            )
        from backend.app.models import RepairPatch

        return RepairPatch(steps=[], links=[])


async def test_structural_gaps_do_not_hide_textual_support():
    graph = fixture_graph()
    graph.links = graph.links[:-1]
    result, report = await validate_and_repair(
        graph, fixture_doc(), Supportive(), Settings(_env_file=None)
    )
    # The map has a dead end and no path to the conclusion, but every quote is supported.
    assert {"dead_end", "disconnected"} <= {i["code"] for i in report["final_issues"]}
    assert all(s.status == "verified" for s in result.steps)


async def test_critic_is_asked_again_for_skipped_items():
    critic = Supportive(skip_first_pass=True)
    result, report = await validate_and_repair(
        fixture_graph(), fixture_doc(), critic, Settings(_env_file=None)
    )
    assert critic.calls == ["critic", "critic"]
    assert report["rounds"][0]["unchecked"] == []
    assert all(item.status == "verified" for item in [*result.steps, *result.links])


def test_issues_name_the_kind_of_item():
    graph = fixture_graph()
    graph.links[0].anchors = ["bad"]
    issues = local_checks(graph, fixture_doc(), Settings(_env_file=None))
    assert {"target_type": "link", "target_id": "ab", "code": "anchor"}.items() <= next(
        i for i in issues if i["code"] == "anchor"
    ).items()


def test_patch_keeps_parents_and_reports_real_changes():
    from backend.app.models import RepairPatch
    from backend.app.validation.checks import apply_patch

    graph = fixture_graph()
    child = graph.steps[2].model_copy(update={"id": "child", "parent": "b"})
    graph.steps.append(child)
    graph.links.append(
        Link(id="cb", src="child", dst="b", type="support", anchors=["p3s1"], confidence=0.5)
    )
    rewritten = child.model_copy(update={"parent": None, "summary": "Reformulé."})
    unchanged = graph.steps[0].model_copy()
    new_link = Link(id="n1", src="a", dst="e", type="support", anchors=["p5s1"], confidence=0.5)
    changed = apply_patch(
        graph,
        RepairPatch(steps=[rewritten, unchanged], links=[new_link], remove_step_ids=["c"]),
    )
    # The rewritten detail stays under its main step; resending an unchanged step is ignored.
    assert next(s for s in graph.steps if s.id == "child").parent == "b"
    assert changed == {("step", "child"), ("link", "n1")}
    assert "c" not in {s.id for s in graph.steps}
    assert not any("c" in (e.src, e.dst) for e in graph.links)


def test_deterministic_fixes_before_any_model_call():
    from backend.app.models import TermCard
    from backend.app.validation.checks import tidy, unique_link_ids

    graph = fixture_graph()
    graph.links[1].connective = "therefore"
    graph.links[2].anchors = ["missing"]
    graph.links[3].id = "a"
    graph.terms = [TermCard(term="t", definition="d", anchors=["p1s1"], step_ids=["gone"])]
    changes = unique_link_ids(graph) + tidy(graph, fixture_doc())
    assert graph.links[1].connective == ""
    assert graph.links[2].anchors == ["p4s1", "p3s1"]
    assert graph.links[3].id != "a"
    assert graph.terms == []
    assert {c["code"] for c in changes} == {
        "link_renamed",
        "connective_cleared",
        "link_anchors_replaced",
        "term_removed",
    }


def test_connective_that_is_a_clause_is_cleared():
    from backend.app.validation.checks import tidy

    graph = fixture_graph()
    graph.links[1].connective = "Une observation mesurée"
    graph.links[2].connective = "un argument limité"
    tidy(graph, fixture_doc())
    # Three words found in the source are kept; the rule only drops long clauses.
    assert graph.links[1].connective == "Une observation mesurée"
    graph.links[1].connective = "Une observation mesurée que rien ne contredit ici"
    tidy(graph, fixture_doc())
    assert graph.links[1].connective == ""
