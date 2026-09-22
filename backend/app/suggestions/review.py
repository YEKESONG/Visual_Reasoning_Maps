from backend.app.llm.client import ModelClient
from backend.app.models import Document, Graph, Suggestion, Suggestions


def rule_suggestions(graph: Graph) -> list[Suggestion]:
    results = []
    for step in graph.steps:
        inbound = [
            e for e in graph.links if e.dst == step.id and e.type in ("support", "cause", "refine")
        ]
        outbound = [
            e for e in graph.links if e.src == step.id and e.type in ("support", "cause", "refine")
        ]
        message = None
        category = "support"
        if step.type in ("claim", "conclusion") and not inbound:
            message = "Ajoutez une justification explicite et indiquez quelle preuve soutient cette affirmation."
        elif step.type == "evidence" and not outbound:
            message = "Expliquez quelle affirmation cette observation permet de soutenir."
        elif step.type == "conclusion" and step.status != "verified":
            message = (
                "Vérifiez que la portée de la conclusion ne dépasse pas celle des éléments cités."
            )
        if message:
            results.append(
                Suggestion(
                    target_type="step",
                    target_id=step.id,
                    category=category,
                    severity="warning",
                    message=message,
                    anchors=step.anchors,
                    source="rule",
                )
            )
    for edge in graph.links:
        if edge.type == "contradict":
            results.append(
                Suggestion(
                    target_type="link",
                    target_id=edge.id,
                    category="objection",
                    severity="info",
                    message="Vérifiez si le texte répond explicitement à cette tension ; la présence d’une contradiction ne constitue pas à elle seule une erreur.",
                    anchors=edge.anchors,
                    source="rule",
                )
            )
    return results


async def review(graph: Graph, doc: Document, model: ModelClient) -> list[Suggestion]:
    result = rule_suggestions(graph)
    critique = await model.generate(
        "suggestions",
        {
            "graph": graph.model_dump(mode="json"),
            "sentences": [s.model_dump(mode="json") for s in doc.sentences],
        },
        Suggestions,
    )
    ids = {"step": {s.id for s in graph.steps}, "link": {e.id for e in graph.links}}
    sentences = {s.id for s in doc.sentences}
    for suggestion in critique.suggestions:
        if (
            suggestion.target_id in ids[suggestion.target_type]
            and set(suggestion.anchors) <= sentences
        ):
            suggestion.source = "llm"
            result.append(suggestion)
    return result
