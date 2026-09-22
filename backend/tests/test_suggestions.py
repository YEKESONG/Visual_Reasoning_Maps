from backend.app.suggestions.review import rule_suggestions
from backend.tests.test_extraction import fixture_graph


def test_unconnected_claim_and_evidence():
    graph = fixture_graph()
    graph.links = []
    result = rule_suggestions(graph)
    assert {"c", "d", "e"} <= {s.target_id for s in result}
    assert all(s.anchors and s.source == "rule" for s in result)
