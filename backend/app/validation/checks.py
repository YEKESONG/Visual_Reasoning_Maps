import re
from collections import Counter
from collections.abc import Callable

import networkx as nx
from rapidfuzz.fuzz import partial_ratio, ratio

from backend.app.config import Settings
from backend.app.llm.client import ModelClient
from backend.app.models import (
    Critique,
    Document,
    Graph,
    Judgement,
    Pattern,
    RepairPatch,
    Sentence,
)


def directed(graph: Graph) -> nx.DiGraph:
    g = nx.DiGraph()
    g.add_nodes_from(s.id for s in graph.steps)
    g.add_edges_from(
        (e.src, e.dst) for e in graph.links if e.type != "contradict" and e.src in g and e.dst in g
    )
    return g


# Issues that concern the textual support of one item; structural issues do not change it.
TEXTUAL = {"anchor", "semantic", "connective", "contradiction_anchor", "endpoint", "parent"}


def local_checks(graph: Graph, doc: Document, config: Settings) -> list[dict]:
    issues = []

    def issue(kind, target, code, reason):
        issues.append(dict(target_type=kind, target_id=target, code=code, reason=reason))

    sentences = {s.id: s for s in doc.sentences}
    steps = {s.id: s for s in graph.steps}
    for key, count in Counter(s.id for s in graph.steps).items():
        if count > 1:
            issue("step", key, "duplicate_id", "Identifiant d’étape dupliqué.")
    for key, count in Counter(e.id for e in graph.links).items():
        if count > 1:
            issue("link", key, "duplicate_id", "Identifiant de relation dupliqué.")
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
                    "step",
                    step.id,
                    "anchor",
                    "Citation introuvable dans les phrases indiquées ou le document.",
                )
        positions = [sentences[key].order for key in step.anchors if key in sentences]
        step.first_position = min(positions, default=0)
        if step.parent and (step.parent not in steps or steps[step.parent].parent is not None):
            issue("step", step.id, "parent", "Le parent doit être une étape principale existante.")
    for link in graph.links:
        if link.src not in steps or link.dst not in steps or link.src == link.dst:
            issue("link", link.id, "endpoint", "Extrémité manquante ou boucle sur soi-même.")
        if any(key not in sentences for key in link.anchors):
            issue("link", link.id, "anchor", "Phrase de relation inconnue.")
        if link.connective and link.connective.casefold() not in " ".join(
            sentences[a].text.casefold() for a in link.anchors if a in sentences
        ):
            issue("link", link.id, "connective", "Connecteur absent de la source.")
        if link.type == "contradict" and any(
            endpoint in steps and not all(a in sentences for a in steps[endpoint].anchors)
            for endpoint in (link.src, link.dst)
        ):
            issue("link", link.id, "contradiction_anchor", "Les deux côtés doivent être ancrés.")
    main = [s for s in graph.steps if s.parent is None]
    if not 5 <= len(main) <= 12:
        issue("graph", "*", "size", "Le flux principal doit contenir 5 à 12 étapes.")
    for key, count in Counter(s.parent for s in graph.steps if s.parent).items():
        if count > config.max_children:
            issue("step", key, "size", "Trop de sous-étapes ; regrouper les détails.")
    g = directed(graph)
    if not nx.is_directed_acyclic_graph(g):
        issue("graph", "*", "cycle", "Cycle dans les relations orientées.")
    for step in graph.steps:
        if g.degree(step.id) == 0 and step.parent is None:
            issue("step", step.id, "isolated", "Étape isolée du flux principal.")
    main_ids = {s.id for s in main}
    mg = g.subgraph(main_ids)
    if main and not nx.is_weakly_connected(mg):
        issue("graph", "*", "disconnected", "Le flux principal est déconnecté.")
    conclusions = {s.id for s in main if s.type == "conclusion"}
    if not conclusions:
        issue("graph", "*", "conclusion", "Aucune conclusion dans le flux principal.")
    for step in main:
        if step.id not in conclusions and not (nx.descendants(mg, step.id) & conclusions):
            issue("step", step.id, "dead_end", "Cette branche n’atteint aucune conclusion.")
    grounds = {s.id for s in graph.steps if s.type in ("evidence", "premise")}
    # Contradiction edges cannot establish evidence ancestry.
    for step in graph.steps:
        if step.type == "conclusion" and not (nx.ancestors(g, step.id) & grounds):
            issue("step", step.id, "unsupported_conclusion", "Aucune prémisse ni preuve en amont.")
    for term in graph.terms:
        if any(a not in sentences for a in term.anchors) or any(
            s not in steps for s in term.step_ids
        ):
            issue("graph", "*", "term", "Carte terminologique sans ancrage ou étape valide.")
    return issues


def unique_link_ids(graph: Graph) -> list[dict]:
    """Links and steps share one namespace in issues and suggestions; rename collisions."""
    taken = {s.id for s in graph.steps}
    changes = []
    for index, link in enumerate(graph.links):
        if link.id in taken:
            new = f"rel{index + 1}"
            while new in taken:
                new = "r" + new
            changes.append({"code": "link_renamed", "target_id": link.id, "into": new})
            link.id = new
        taken.add(link.id)
    return changes


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


def compact(sentences: list[Sentence]) -> list[list[str]]:
    return [[s.id, s.text] for s in sentences]


def tidy(graph: Graph, doc: Document) -> list[dict]:
    """Deterministic fixes that do not need a model call."""
    changes = []
    sentences = {s.id: s for s in doc.sentences}
    steps = {s.id: s for s in graph.steps}
    for link in graph.links:
        valid = [a for a in link.anchors if a in sentences]
        if len(valid) != len(link.anchors):
            fallback = [a for k in (link.dst, link.src) if k in steps for a in steps[k].anchors]
            link.anchors = list(dict.fromkeys(valid or [a for a in fallback if a in sentences]))
            changes.append({"code": "link_anchors_replaced", "target_id": link.id})
        text = " ".join(sentences[a].text.casefold() for a in link.anchors if a in sentences)
        connective = link.connective.strip()
        cjk = re.search(r"[\u3000-\u9fff]", connective)
        # Linking words are a few words ("therefore", "as a result", "因此"), never a clause.
        too_long = len(connective.split()) > 4 or len(connective) > (12 if cjk else 30)
        if connective and (connective.casefold() not in text or too_long):
            changes.append(
                {"code": "connective_cleared", "target_id": link.id, "value": link.connective}
            )
            link.connective = ""
    kept = []
    for term in graph.terms:
        term.anchors = [a for a in term.anchors if a in sentences]
        term.step_ids = [k for k in term.step_ids if k in steps]
        if term.anchors and term.step_ids:
            kept.append(term)
        else:
            changes.append({"code": "term_removed", "term": term.term})
    graph.terms = kept
    return changes


def critic_items(graph: Graph, keys: set[tuple[str, str]]) -> list[dict]:
    # Endpoint data prevents judging a relation label in isolation.
    by_id = {s.id: s for s in graph.steps}
    items = [
        {"target_type": "step", "target_id": s.id, "data": s.model_dump(mode="json")}
        for s in graph.steps
        if ("step", s.id) in keys
    ]
    items += [
        {
            "target_type": "link",
            "target_id": e.id,
            "data": e.model_dump(mode="json"),
            "endpoints": [by_id[k].model_dump(mode="json") for k in (e.src, e.dst) if k in by_id],
        }
        for e in graph.links
        if ("link", e.id) in keys
    ]
    return items


async def critique(
    items: list[dict], doc: Document, model: ModelClient
) -> dict[tuple[str, str], Judgement]:
    judgements: dict[tuple[str, str], Judgement] = {}
    for start in range(0, len(items), 20):
        batch = items[start : start + 20]
        needed = {a for item in batch for a in item["data"]["anchors"]}
        for item in batch:
            for endpoint in item.get("endpoints", []):
                needed.update(endpoint["anchors"])
        result = await model.generate(
            "critic",
            {"items": batch, "sentences": compact([s for s in doc.sentences if s.id in needed])},
            Critique,
        )
        wanted = {(i["target_type"], i["target_id"]) for i in batch}
        for j in result.judgements:
            if (j.target_type, j.target_id) in wanted:
                judgements[(j.target_type, j.target_id)] = j
    return judgements


def apply_patch(graph: Graph, patch: Graph) -> set[tuple[str, str]]:
    """Merge a repair: replace by ID, append new items, delete listed items and orphans."""
    changed: set[tuple[str, str]] = set()
    removed = set(getattr(patch, "remove_step_ids", []))
    removed |= {s.id for s in graph.steps if s.parent in removed}
    replacements = {s.id: s for s in patch.steps}
    steps = []
    for step in graph.steps:
        if step.id in removed:
            continue
        if step.id in replacements:
            before = step.model_dump(exclude={"status", "first_position"})
            parent = step.parent
            step = replacements.pop(step.id)
            # A rewritten detail stays under its main step unless the patch moves it elsewhere.
            if step.parent is None and parent is not None:
                step.parent = parent
            if step.model_dump(exclude={"status", "first_position"}) != before:
                changed.add(("step", step.id))
        steps.append(step)
    for step in replacements.values():
        if step.id not in removed:
            steps.append(step)
            changed.add(("step", step.id))
    graph.steps = steps
    removed_links = set(getattr(patch, "remove_link_ids", []))
    link_replacements = {e.id: e for e in patch.links}
    links = []
    for link in graph.links:
        if link.id in removed_links or link.src in removed or link.dst in removed:
            continue
        if link.id in link_replacements:
            before = link.model_dump(exclude={"status"})
            link = link_replacements.pop(link.id)
            if link.model_dump(exclude={"status"}) != before:
                changed.add(("link", link.id))
        links.append(link)
    for link in link_replacements.values():
        if link.id not in removed_links:
            links.append(link)
            changed.add(("link", link.id))
    graph.links = links
    if patch.terms:
        graph.terms = [t for t in graph.terms if t.term not in {x.term for x in patch.terms}]
        graph.terms += patch.terms
    return changed


def repair_payload(graph: Graph, doc: Document, issues: list[dict], config: Settings) -> dict:
    targets = {(i["target_type"], i["target_id"]) for i in issues}
    total = sum(len(s.text) for s in doc.sentences)
    if total <= config.max_input_chars:
        sentences = doc.sentences
    else:
        anchored = {a for s in graph.steps for a in s.anchors}
        orders = {s.id: s.order for s in doc.sentences}
        near = {orders[a] + d for a in anchored if a in orders for d in range(-3, 4)}
        sentences = [s for s in doc.sentences if s.order in near]
    return {
        "issues": issues[:60],
        "steps": [
            dict(id=s.id, parent=s.parent, type=s.type, label=s.label, summary=s.summary)
            for s in graph.steps
        ],
        "links": [[e.id, e.src, e.dst, e.type] for e in graph.links],
        "items": [
            {"target_type": "step", **s.model_dump(mode="json")}
            for s in graph.steps
            if ("step", s.id) in targets
        ]
        + [
            {"target_type": "link", **e.model_dump(mode="json")}
            for e in graph.links
            if ("link", e.id) in targets
        ],
        "sentences": compact(sentences),
    }


async def validate_and_repair(
    graph: Graph,
    doc: Document,
    model: ModelClient,
    config: Settings,
    progress: Callable[[str, int], None] | None = None,
) -> tuple[Graph, dict]:
    report = {"rounds": [], "changes": deduplicate(graph, config), "removed_links": []}
    judgements: dict[tuple[str, str], Judgement] = {}
    for attempt in range(3):
        report["changes"] += unique_link_ids(graph) + tidy(graph, doc)
        issues = local_checks(graph, doc, config)
        keys = {("step", s.id) for s in graph.steps} | {("link", e.id) for e in graph.links}
        pending = keys - set(judgements)
        judgements.update(await critique(critic_items(graph, pending), doc, model))
        missing = keys - set(judgements)
        if missing and missing != pending:
            # Ask once more for items the critic skipped in a long batch.
            judgements.update(await critique(critic_items(graph, missing), doc, model))
        unchecked = []
        for kind, objects in [("step", graph.steps), ("link", graph.links)]:
            for item in objects:
                judgement = judgements.get((kind, item.id))
                item.status = "to_verify"
                if judgement is None:
                    unchecked.append(item.id)
                elif judgement.verdict == "unsupported":
                    issues.append(
                        dict(
                            target_type=kind,
                            target_id=item.id,
                            code="semantic",
                            reason=judgement.reason,
                        )
                    )
                else:
                    item.status = "verified" if judgement.verdict == "supported" else "partial"
        report["rounds"].append(
            {
                "attempt": attempt,
                "issues": issues,
                "unchecked": unchecked,
                "judgements": [j.model_dump(mode="json") for j in judgements.values()],
            }
        )
        if not issues:
            break
        if attempt < 2:
            if progress:
                progress("Correction des éléments signalés", 70 + attempt * 8)
            patch = await model.generate(
                "repair", repair_payload(graph, doc, issues, config), RepairPatch
            )
            for key in apply_patch(graph, patch):
                judgements.pop(key, None)
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
    # Structural gaps stay in the report; the dashed "to verify" frame is about textual support.
    bad = {(i["target_type"], i["target_id"]) for i in issues if i["code"] in TEXTUAL}
    for kind, objects in [("step", graph.steps), ("link", graph.links)]:
        for item in objects:
            if (kind, item.id) in bad:
                item.status = "to_verify"
    report["final_issues"] = final_issues
    report["needs_review"] = any(item.status != "verified" for item in [*graph.steps, *graph.links])
    return graph, report
