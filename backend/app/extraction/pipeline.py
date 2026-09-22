import asyncio
from collections.abc import Callable

from backend.app.config import Settings
from backend.app.llm.client import ModelClient
from backend.app.models import Document, Graph, Sentence, Step


def sentence_rows(sentences: list[Sentence]) -> list[list[str]]:
    """Compact [id, text] pairs: coordinates and DOM data are never sent to the model."""
    return [[s.id, s.text] for s in sentences]


def sections_payload(doc: Document, limit: int) -> list[dict]:
    """Sentences grouped under their section titles, sampled evenly when the text is long."""
    titles = {s.id: s.title for s in doc.sections}
    grouped: dict[str, list[Sentence]] = {}
    for sentence in doc.sentences:
        grouped.setdefault(sentence.section_id, []).append(sentence)
    if sum(len(s.text) for s in doc.sentences) > limit:
        # Keep the opening and closing sentences of every section instead of cutting the end.
        budget = max(300, limit // max(1, len(grouped)))
        for key, candidates in grouped.items():
            picked: dict[str, Sentence] = {}
            used = 0
            for i in range(len(candidates)):
                s = candidates[i // 2] if i % 2 == 0 else candidates[-(i // 2) - 1]
                if s.id in picked or used + len(s.text) > budget:
                    continue
                picked[s.id] = s
                used += len(s.text)
            grouped[key] = [s for s in candidates if s.id in picked]
    return [
        {"title": titles.get(key, ""), "sentences": sentence_rows(items)}
        for key, items in grouped.items()
    ]


def step_rows(steps: list[Step]) -> list[dict]:
    return [
        dict(
            id=s.id,
            parent=s.parent,
            type=s.type,
            label=s.label,
            summary=s.summary,
            anchors=s.anchors,
        )
        for s in steps
    ]


def section_chunks(doc: Document, budget: int) -> list[list[dict]]:
    """Pack consecutive short sections together; split a long section at sentence boundaries."""
    titles = {s.id: s.title for s in doc.sections}
    chunks: list[list[dict]] = []
    current: list[dict] = []
    size = 0
    for section in doc.sections:
        sentences = [s for s in doc.sentences if s.section_id == section.id]
        while sentences:
            part: list[Sentence] = []
            part_size = 0
            while sentences and (not part or part_size + len(sentences[0].text) <= budget):
                part.append(sentences.pop(0))
                part_size += len(part[-1].text)
            if current and size + part_size > budget:
                chunks.append(current)
                current, size = [], 0
            current.append({"title": titles[section.id], "sentences": sentence_rows(part)})
            size += part_size
    if current:
        chunks.append(current)
    return chunks


async def extract(
    doc: Document,
    model: ModelClient,
    config: Settings,
    progress: Callable[[str, int], None] | None = None,
) -> Graph:
    report = progress or (lambda step, value: None)
    report("Esquisse du raisonnement principal", 25)
    graph = await model.generate(
        "skeleton",
        {"title": doc.title, "sections": sections_payload(doc, config.max_input_chars)},
        Graph,
    )
    main_steps = [s for s in graph.steps if s.parent is None]
    parents = {s.id for s in main_steps}

    async def section_extract(index: int, sections: list[dict]) -> tuple[int, Graph]:
        return index, await model.generate(
            "section",
            {"main_flow": step_rows(main_steps), "sections": sections},
            Graph,
        )

    chunks = section_chunks(doc, config.section_chunk_chars)
    report("Détails section par section", 38)
    details = await asyncio.gather(*(section_extract(i, c) for i, c in enumerate(chunks)))
    used = {s.id for s in graph.steps}
    for index, detail in details:
        remap = {s.id: f"section{index}_{s.id}" for s in detail.steps if s.id not in parents}
        for step in detail.steps:
            if step.parent not in parents or step.id in parents:
                continue
            step.id = remap[step.id]
            if step.id not in used:
                graph.steps.append(step)
                used.add(step.id)
        for link in detail.links:
            link.id = f"section{index}_rel_{link.id}"
            link.src = remap.get(link.src, link.src)
            link.dst = remap.get(link.dst, link.dst)
            if link.src in used and link.dst in used:
                graph.links.append(link)
        for term in detail.terms:
            term.step_ids = [remap.get(key, key) for key in term.step_ids]
            if all(key in used for key in term.step_ids):
                graph.terms.append(term)

    anchored = {a for s in graph.steps for a in s.anchors}
    orders = {s.id: s.order for s in doc.sentences}
    near = {orders[a] + d for a in anchored if a in orders for d in (-1, 0, 1)}
    report("Relations entre les sections", 52)
    cross = await model.generate(
        "cross",
        {
            "steps": step_rows(graph.steps),
            "existing_links": [[e.src, e.dst, e.type] for e in graph.links],
            "sentences": sentence_rows([s for s in doc.sentences if s.order in near]),
        },
        Graph,
    )
    ids = {link.id for link in graph.links}
    pairs = {(e.src, e.dst, e.type) for e in graph.links}
    for link in cross.links:
        if (link.src, link.dst, link.type) in pairs or link.src not in used or link.dst not in used:
            continue
        while link.id in ids:
            link.id = "cross_" + link.id
        graph.links.append(link)
        ids.add(link.id)
        pairs.add((link.src, link.dst, link.type))
    return graph
