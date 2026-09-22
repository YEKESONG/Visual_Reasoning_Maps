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
            message = "Rien dans la carte n’appuie cette affirmation : précisez dans le texte sur quoi elle repose."
        elif step.type == "evidence" and not outbound:
            message = "Cette observation n’appuie aucune étape de la carte : indiquez dans le texte quelle affirmation elle soutient."
        elif step.type == "conclusion" and step.status != "verified":
            message = "Vérifiez que la conclusion ne va pas plus loin que les éléments cités."
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
                    message="Vérifiez si le texte répond à cette tension. Une contradiction relevée n’est pas forcément une erreur.",
                    anchors=edge.anchors,
                    source="rule",
                )
            )
    return results


async def review(
    graph: Graph, doc: Document, model: ModelClient, limit: int = 180000
) -> list[Suggestion]:
    result = rule_suggestions(graph)
    sentences = doc.sentences
    if sum(len(s.text) for s in sentences) > limit:
        anchored = {a for s in graph.steps for a in s.anchors}
        orders = {s.id: s.order for s in sentences}
        near = {orders[a] + d for a in anchored if a in orders for d in range(-2, 3)}
        sentences = [s for s in sentences if s.order in near]
    critique = await model.generate(
        "suggestions",
        {
            "steps": [
                s.model_dump(mode="json", exclude={"confidence", "first_position"})
                for s in graph.steps
            ],
            "links": [
                e.model_dump(mode="json", exclude={"confidence", "anchors"}) for e in graph.links
            ],
            "sentences": [[s.id, s.text] for s in sentences],
        },
        Suggestions,
    )
    targets = {
        "step": {s.id: s.anchors for s in graph.steps},
        "link": {e.id: e.anchors for e in graph.links},
    }
    known = {s.id for s in doc.sentences}
    for suggestion in critique.suggestions:
        anchors = targets[suggestion.target_type].get(suggestion.target_id)
        if anchors is None:
            continue
        suggestion.anchors = [a for a in suggestion.anchors if a in known] or anchors
        suggestion.source = "llm"
        result.append(suggestion)
    return result
