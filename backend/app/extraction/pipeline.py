import asyncio

from backend.app.config import Settings
from backend.app.llm.client import ModelClient
from backend.app.models import Document, Graph


def sentences_payload(doc: Document, limit: int) -> list[dict]:
    all_sentences = [dict(id=s.id, text=s.text, section=s.section_id) for s in doc.sentences]
    if sum(len(s["text"]) for s in all_sentences) <= limit:
        return all_sentences
    # Keep a bounded view of every section rather than silently truncating the last sections.
    selected = []
    budget = max(300, limit // max(1, len(doc.sections)))
    for section in doc.sections:
        candidates = [s for s in all_sentences if s["section"] == section.id]
        used = 0
        selected_ids = set()
        for i in range(len(candidates)):
            s = candidates[i // 2] if i % 2 == 0 else candidates[-(i // 2) - 1]
            if s["id"] in selected_ids or used + len(s["text"]) > budget:
                continue
            selected.append(s)
            selected_ids.add(s["id"])
            used += len(s["text"])
    return selected


async def extract(doc: Document, model: ModelClient, config: Settings) -> Graph:
    graph = await model.generate(
        "skeleton",
        {"title": doc.title, "sentences": sentences_payload(doc, config.max_input_chars)},
        Graph,
    )
    parents = {s.id for s in graph.steps if s.parent is None}
    chunks = []
    # Split large sections while retaining all sentence IDs for the detail pass.
    for section in doc.sections:
        current = []
        size = 0
        for sentence in [s for s in doc.sentences if s.section_id == section.id]:
            if size + len(sentence.text) > config.max_input_chars and current:
                chunks.append(current)
                current = []
                size = 0
            current.append(dict(id=sentence.id, text=sentence.text))
            size += len(sentence.text)
        if current:
            chunks.append(current)

    async def section_extract(index, sentences):
        return index, await model.generate(
            "section",
            {
                "sentences": sentences,
                "skeleton": graph.model_dump(mode="json"),
                "id_prefix": f"section{index}_",
            },
            Graph,
        )

    details = await asyncio.gather(*(section_extract(i, s) for i, s in enumerate(chunks)))
    used = {s.id for s in graph.steps}
    for index, detail in details:
        remap = {s.id: f"section{index}_{s.id}" for s in detail.steps}
        for step in detail.steps:
            if step.parent not in parents:
                continue
            step.id = remap[step.id]
            if step.id not in used:
                graph.steps.append(step)
                used.add(step.id)
        for link in detail.links:
            link.id = f"section{index}_{link.id}"
            link.src = remap.get(link.src, link.src)
            link.dst = remap.get(link.dst, link.dst)
            if link.src in used and link.dst in used:
                graph.links.append(link)
        for term in detail.terms:
            term.step_ids = [remap.get(key, key) for key in term.step_ids]
            if all(key in used for key in term.step_ids):
                graph.terms.append(term)
    cross = await model.generate(
        "cross",
        {
            "steps": [s.model_dump(mode="json") for s in graph.steps],
            "sentences": sentences_payload(doc, config.max_input_chars),
        },
        Graph,
    )
    ids = {link.id for link in graph.links}
    for link in cross.links:
        if link.id in ids:
            link.id = "cross_" + link.id
        graph.links.append(link)
        ids.add(link.id)
    return graph
