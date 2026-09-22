from collections import Counter

import networkx as nx
from rapidfuzz.fuzz import partial_ratio, ratio

from backend.app.config import Settings
from backend.app.llm.client import ModelClient
from backend.app.models import Critique, Document, Graph, Pattern


def directed(graph: Graph) -> nx.DiGraph:
    g = nx.DiGraph()
    g.add_nodes_from(s.id for s in graph.steps)
    g.add_edges_from(
        (e.src, e.dst) for e in graph.links if e.type != "contradict" and e.src in g and e.dst in g
    )
    return g


def local_checks(graph: Graph, doc: Document, config: Settings) -> list[dict]:
    issues = []

    def issue(target, code, reason):
        issues.append(dict(target_id=target, code=code, reason=reason))

    sentences = {s.id: s for s in doc.sentences}
    steps = {s.id: s for s in graph.steps}
    for key, count in Counter(s.id for s in graph.steps).items():
        if count > 1:
            issue(key, "duplicate_id", "Identifiant d’étape dupliqué.")
    for key, count in Counter(e.id for e in graph.links).items():
        if count > 1:
            issue(key, "duplicate_id", "Identifiant de relation dupliqué.")
    for step in graph.steps:
        valid = [key for key in step.anchors if key in sentences]
        source = " ".join(sentences[key].text for key in valid)
        if (
            len(valid) != len(step.anchors)
            or partial_ratio(step.quote.casefold(), source.casefold()) < config.anchor_threshold
        ):
            candidates = sorted(
                (
                    (partial_ratio(step.quote.casefold(), s.text.casefold()), s)
                    for s in doc.sentences
                ),
                key=lambda pair: pair[0],
                reverse=True,
            )
            if candidates and candidates[0][0] >= config.anchor_threshold:
                step.anchors = [candidates[0][1].id]
            else:
                issue(
                    step.id,
                    "anchor",
                    "Citation introuvable dans les phrases indiquées ou le document.",
                )
        positions = [sentences[key].order for key in step.anchors if key in sentences]
        step.first_position = min(positions, default=0)
        if step.parent and (step.parent not in steps or steps[step.parent].parent is not None):
            issue(step.id, "parent", "Le parent doit être une étape principale existante.")
    for link in graph.links:
        if link.src not in steps or link.dst not in steps or link.src == link.dst:
            issue(link.id, "endpoint", "Extrémité manquante ou boucle sur soi-même.")
        if any(key not in sentences for key in link.anchors):
            issue(link.id, "anchor", "Phrase de relation inconnue.")
        if link.connective and link.connective.casefold() not in " ".join(
            sentences[a].text.casefold() for a in link.anchors if a in sentences
        ):
            issue(link.id, "connective", "Connecteur absent de la source.")
        if link.type == "contradict" and any(
            endpoint in steps and not all(a in sentences for a in steps[endpoint].anchors)
            for endpoint in (link.src, link.dst)
        ):
            issue(link.id, "contradiction_anchor", "Les deux côtés doivent être ancrés.")
    main = [s for s in graph.steps if s.parent is None]
    if not 5 <= len(main) <= 12:
        issue("*", "size", "Le flux principal doit contenir 5 à 12 étapes.")
    for key, count in Counter(s.parent for s in graph.steps if s.parent).items():
        if count > config.max_children:
            issue(key, "size", "Trop de sous-étapes ; regrouper les détails.")
    g = directed(graph)
    if not nx.is_directed_acyclic_graph(g):
        issue("*", "cycle", "Cycle dans les relations orientées.")
    for step in graph.steps:
        if g.degree(step.id) == 0 and step.parent is None:
            issue(step.id, "isolated", "Étape isolée du flux principal.")
    main_ids = {s.id for s in main}
    mg = g.subgraph(main_ids)
    if main and not nx.is_weakly_connected(mg):
        issue("*", "disconnected", "Le flux principal est déconnecté.")
    conclusions = {s.id for s in main if s.type == "conclusion"}
    if not conclusions:
        issue("*", "conclusion", "Aucune conclusion dans le flux principal.")
    for step in main:
        if step.id not in conclusions and not (nx.descendants(mg, step.id) & conclusions):
            issue(step.id, "dead_end", "Cette branche n’atteint aucune conclusion.")
    grounds = {s.id for s in graph.steps if s.type in ("evidence", "premise")}
    # Contradiction edges cannot establish evidence ancestry.
    for step in graph.steps:
        if step.type == "conclusion" and not (nx.ancestors(g, step.id) & grounds):
            issue(step.id, "unsupported_conclusion", "Aucune prémisse ni preuve en amont.")
    for term in graph.terms:
        if any(a not in sentences for a in term.anchors) or any(
            s not in steps for s in term.step_ids
        ):
            issue("*", "term", "Carte terminologique sans ancrage ou étape valide.")
    return issues


def deduplicate(graph: Graph, config: Settings) -> list[dict]:
    changes = []
    embeddings = None
    if config.embedding_model and graph.steps:
        try:
            from sentence_transformers import SentenceTransformer

            embeddings = SentenceTransformer(config.embedding_model).encode(
                [s.summary for s in graph.steps], normalize_embeddings=True
            )
        except Exception:
            changes.append(
                {
                    "code": "embedding_fallback",
                    "reason": "Modèle vectoriel indisponible ; similarité textuelle utilisée.",
                }
            )
    removed = set()
    for i, step in enumerate(graph.steps):
        if step.id in removed:
            continue
        for j, other in enumerate(graph.steps[i + 1 :], i + 1):
            if (
                other.id in removed
                or other.id == step.id
                or (step.type, step.parent) != (other.type, other.parent)
            ):
                continue
            score = (
                float(embeddings[i] @ embeddings[j])
                if embeddings is not None
                else ratio(step.summary, other.summary) / 100
            )
            # Merge only near-identical statements sharing provenance; similarity alone is not enough.
            if score < 0.97 or not set(step.anchors) & set(other.anchors):
                continue
            removed.add(other.id)
            for link in graph.links:
                if link.src == other.id:
                    link.src = step.id
                if link.dst == other.id:
                    link.dst = step.id
            for child in graph.steps:
                if child.parent == other.id:
                    child.parent = step.id
            for term in graph.terms:
                term.step_ids = list(
                    dict.fromkeys(step.id if k == other.id else k for k in term.step_ids)
                )
            changes.append({"code": "merged", "target_id": other.id, "into": step.id})
    graph.steps = [s for s in graph.steps if s.id not in removed]
    return changes


def patterns(graph: Graph) -> list[Pattern]:
    g = directed(graph)
    result = []
    for node in g:
        if g.out_degree(node) > 1:
            result.append(Pattern(type="divergence", step_ids=[node, *g.successors(node)]))
        if g.in_degree(node) > 1:
            result.append(Pattern(type="convergence", step_ids=[*g.predecessors(node), node]))
    types = {"contradict": "contradiction", "refine": "refinement", "cause": "causality"}
    for edge in graph.links:
        if edge.type in types:
            result.append(Pattern(type=types[edge.type], step_ids=[edge.src, edge.dst]))
    for step in graph.steps:
        if step.parent:
            result.append(Pattern(type="refinement", step_ids=[step.parent, step.id]))
    return result


async def validate_and_repair(
    graph: Graph, doc: Document, model: ModelClient, config: Settings
) -> tuple[Graph, dict]:
    report = {"rounds": [], "changes": deduplicate(graph, config), "removed_links": []}
    for attempt in range(3):
        issues = local_checks(graph, doc, config)
        # Batch bounded critics; endpoint data prevents judging link labels in isolation.
        by_id = {s.id: s for s in graph.steps}
        items = [
            {"target_type": "step", "target_id": s.id, "data": s.model_dump(mode="json")}
            for s in graph.steps
        ]
        items += [
            {
                "target_type": "link",
                "target_id": e.id,
                "data": e.model_dump(mode="json"),
                "endpoints": [
                    by_id[k].model_dump(mode="json") for k in (e.src, e.dst) if k in by_id
                ],
            }
            for e in graph.links
        ]
        judgements = {}
        for start in range(0, len(items), 20):
            batch = items[start : start + 20]
            needed = {a for item in batch for a in item["data"]["anchors"]}
            for item in batch:
                for endpoint in item.get("endpoints", []):
                    needed.update(endpoint["anchors"])
            critique = await model.generate(
                "critic",
                {
                    "items": batch,
                    "sentences": [
                        s.model_dump(mode="json") for s in doc.sentences if s.id in needed
                    ],
                },
                Critique,
            )
            for j in critique.judgements:
                judgements[(j.target_type, j.target_id)] = j
        for kind, objects in [("step", graph.steps), ("link", graph.links)]:
            for item in objects:
                judgement = judgements.get((kind, item.id))
                item.status = "to_verify"
                if not judgement or judgement.verdict == "unsupported":
                    issues.append(
                        dict(
                            target_id=item.id,
                            code="semantic",
                            reason=judgement.reason
                            if judgement
                            else "Vérification sémantique manquante.",
                        )
                    )
                else:
                    item.status = "verified" if judgement.verdict == "supported" else "partial"
        report["rounds"].append(
            {
                "attempt": attempt,
                "issues": issues,
                "judgements": [j.model_dump(mode="json") for j in judgements.values()],
            }
        )
        if not issues:
            break
        if attempt < 2:
            graph = await model.generate(
                "skeleton",
                {
                    "title": doc.title,
                    "sentences": [s.model_dump(mode="json") for s in doc.sentences],
                    "graph": graph.model_dump(mode="json"),
                    "repair_issues": issues,
                },
                Graph,
            )
    # Keep the renderable result well formed even when both repairs fail.
    seen = set()
    kept_steps = []
    for step in graph.steps:
        if step.id in seen:
            report["changes"].append({"code": "removed_duplicate_step", "target_id": step.id})
        else:
            kept_steps.append(step)
            seen.add(step.id)
    graph.steps = kept_steps
    by_id = {s.id: s for s in graph.steps}
    invalid_parents = {
        s.id
        for s in graph.steps
        if s.parent and (s.parent not in by_id or by_id[s.parent].parent is not None)
    }
    for step in graph.steps:
        if step.id in invalid_parents:
            report["changes"].append(
                {"code": "cleared_parent", "target_id": step.id, "parent": step.parent}
            )
            step.parent = None
            step.status = "to_verify"
    valid = set(by_id)
    kept_links = []
    seen_links = set()
    for link in graph.links:
        if (
            link.id in seen_links
            or link.src not in valid
            or link.dst not in valid
            or link.src == link.dst
        ):
            report["removed_links"].append(link.model_dump(mode="json"))
        else:
            kept_links.append(link)
            seen_links.add(link.id)
    graph.links = kept_links
    while not nx.is_directed_acyclic_graph(directed(graph)):
        cycle = nx.find_cycle(directed(graph))
        edge = min(
            (e for e in graph.links if e.type != "contradict" and (e.src, e.dst) in cycle),
            key=lambda e: e.confidence,
        )
        report["removed_links"].append(edge.model_dump(mode="json"))
        graph.links.remove(edge)
    valid_sentences = {s.id for s in doc.sentences}
    graph.terms = [
        t for t in graph.terms if set(t.anchors) <= valid_sentences and set(t.step_ids) <= valid
    ]
    final_issues = local_checks(graph, doc, config)
    issues = report["rounds"][-1]["issues"] + final_issues
    bad = {i["target_id"] for i in issues}
    for item in [*graph.steps, *graph.links]:
        if "*" in bad or item.id in bad:
            item.status = "to_verify"
    report["final_issues"] = final_issues
    report["needs_review"] = any(item.status != "verified" for item in [*graph.steps, *graph.links])
    return graph, report
