import asyncio
from datetime import datetime, timezone

from backend.app.anchoring.sentences import anchor_document
from backend.app.config import Settings
from backend.app.extraction.pipeline import extract
from backend.app.llm.client import ModelClient
from backend.app.models import Document, Flow, Generation, Metadata
from backend.app.storage.files import Store
from backend.app.suggestions.review import review
from backend.app.tasks.manager import TaskManager
from backend.app.validation.checks import patterns, validate_and_repair


async def process(
    doc: Document,
    model: ModelClient,
    config: Settings,
    store: Store,
    tasks: TaskManager,
    task_id: str,
) -> Flow:
    path = store.directory(doc.id) / "source.html"
    html = path.read_text() if doc.kind == "html" else None
    tasks.emit(task_id, "Repérage des phrases", 20)
    doc, html = await asyncio.to_thread(anchor_document, doc, html)
    if html:
        path.write_text(html)
    if len(doc.sentences) < 5:
        raise ValueError(
            "Le document contient moins de cinq phrases exploitables. Choisissez un texte plus complet."
        )
    store.write(doc.id, "parsed.json", doc.model_dump(mode="json"))
    tasks.emit(task_id, "Reconstruction du raisonnement", 35)
    graph = await extract(doc, model, config)
    tasks.emit(task_id, "Vérification des sources et des relations", 65)
    graph, report = await validate_and_repair(graph, doc, model, config)
    store.write(doc.id, "validation_report.json", report)
    tasks.emit(task_id, "Préparation des suggestions", 88)
    suggestions = await review(graph, doc, model)
    now = datetime.now(timezone.utc).isoformat()
    flow = Flow(
        **graph.model_dump(),
        metadata=Metadata(
            id=doc.id, title=doc.title, kind=doc.kind, source_url=doc.source_url, created_at=now
        ),
        patterns=patterns(graph),
        generation=Generation(
            language=config.label_language,
            model=config.llm_model,
            timestamp=now,
            total_tokens=getattr(model, "total_tokens", 0),
            estimated_cost_usd=getattr(model, "cost_usd", None),
        ),
    )
    store.write(doc.id, "suggestions.json", [s.model_dump(mode="json") for s in suggestions])
    # Flow is the completion marker and must be written last.
    store.write(doc.id, "flow.json", flow.model_dump(mode="json"))
    tasks.emit(task_id, "Carte prête", 100, "done", doc_id=doc.id)
    return flow
