import asyncio
import re
import shutil
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from sse_starlette.sse import EventSourceResponse
from starlette.datastructures import UploadFile

from backend.app.config import ROOT, settings
from backend.app.ingest.arxiv_html import acquire, arxiv_id
from backend.app.ingest.pdf_grobid import enrich_grobid
from backend.app.ingest.pdf_pymupdf import parse_pdf
from backend.app.llm.client import LLMClient
from backend.app.models import (
    Document,
    Explanation,
    Flow,
    Metadata,
    Sentence,
    Suggestion,
    TaskAccepted,
)
from backend.app.storage.files import Store, digest
from backend.app.tasks.manager import TaskManager
from backend.app.tasks.pipeline import process


@asynccontextmanager
async def lifespan(app: FastAPI):
    for example in (ROOT / "examples").glob("demo-*"):
        destination = store.directory(example.name)
        if example.is_dir() and not destination.exists():
            shutil.copytree(example, destination)
    yield
    for task in tasks.running:
        task.cancel()
    if tasks.running:
        await asyncio.gather(*tasks.running, return_exceptions=True)


app = FastAPI(title="Visual Reasoning Maps", version="0.1.0", lifespan=lifespan)
store = Store(settings.data_dir)
tasks = TaskManager()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "configured": bool(settings.deepseek_api_key.get_secret_value())}


@app.get("/api/tasks/{task_id}/events")
async def events(task_id: str, request: Request):
    if task_id not in tasks.events:
        raise HTTPException(404, "Tâche inconnue ou serveur redémarré. Relancez le traitement.")
    try:
        after = int(request.headers.get("last-event-id", "-1"))
    except ValueError:
        after = -1
    return EventSourceResponse(tasks.stream(task_id, after), ping=10)


# The desktop prototype runs as a single process; locks prevent duplicate writes.


locks: dict[str, asyncio.Lock] = {}
model_factory = LLMClient


def read_doc(doc_id: str, name: str):
    try:
        return store.read(doc_id, name)
    except (ValueError, FileNotFoundError):
        raise HTTPException(404, "Document introuvable.") from None


def requested_language(value: str | None) -> str | None:
    if value is not None and value not in ("auto", "zh", "en", "fr"):
        raise HTTPException(422, "Langue non prise en charge. Choisissez auto, zh, en ou fr.")
    return value


def document_id(body: bytes, language: str | None) -> str:
    return digest(body + (b"\0language:" + language.encode() if language else b""))


async def run_task(
    task_id: str, payload: bytes | str, title: str = "", language: str | None = None
) -> None:
    config = settings.model_copy(update={"label_language": language}) if language else settings
    try:
        if isinstance(payload, bytes):
            doc_id = document_id(payload, language)
            directory = store.directory(doc_id)
            directory.mkdir(parents=True, exist_ok=True)
            path = directory / "source.pdf"
            if not path.exists():
                path.write_bytes(payload)
            tasks.emit(task_id, "Lecture du PDF", 10)
            doc = await asyncio.to_thread(parse_pdf, path, doc_id)
            if title and doc.title == "source":
                doc.title = Path(title).stem
            if settings.grobid_url:
                doc = await enrich_grobid(payload, doc, settings.grobid_url)
        else:
            temp_id = "ingest_" + task_id
            directory = store.directory(temp_id)
            directory.mkdir(parents=True, exist_ok=True)
            tasks.emit(task_id, "Téléchargement depuis arXiv", 5)
            doc, body = await acquire(payload, directory, temp_id)
            doc_id = document_id(body, language)
            doc.id = doc_id
            if doc.kind == "html":
                path = directory / "source.html"
                path.write_text(
                    path.read_text().replace(f"/api/docs/{temp_id}/", f"/api/docs/{doc_id}/")
                )
            destination = store.directory(doc_id)
            if not destination.exists():
                directory.rename(destination)
            else:
                shutil.rmtree(directory)
        async with locks.setdefault(doc_id, asyncio.Lock()):
            if (store.directory(doc_id) / "flow.json").exists():
                tasks.emit(task_id, "Carte retrouvée", 100, "done", doc_id=doc_id)
                return
            model = model_factory(config, store, doc_id)
            await process(doc, model, config, store, tasks, task_id)
    except Exception as exc:
        # Provider errors may contain credentials or full request bodies: never return/log them.
        safe = "Le traitement a échoué. Vérifiez le format du document, la configuration du modèle et la connexion, puis réessayez."
        if type(exc) is ValueError and str(exc) in {
            "PDF protégé. Exportez une copie sans mot de passe.",
            "PDF trop long : limite de 400 pages.",
            "Texte insuffisant. Ce PDF peut être scanné : appliquez une reconnaissance OCR puis réessayez.",
            "Document distant trop volumineux.",
            "Trop de redirections arXiv.",
            "Aucun HTML ni PDF exploitable sur arXiv.",
            "Le document contient moins de cinq phrases exploitables. Choisissez un texte plus complet.",
        }:
            safe = str(exc)
        tasks.emit(task_id, safe, 0, "error", error=safe)


@app.post("/api/tasks", response_model=TaskAccepted, status_code=202)
async def create_task(request: Request):
    content_type = request.headers.get("content-type", "")
    title = ""
    language = None
    if "application/json" in content_type:
        try:
            body = await request.json()
            payload = body["arxiv_url"]
            language = requested_language(body.get("language"))
            arxiv_id(payload)
        except (ValueError, KeyError, TypeError):
            raise HTTPException(422, "Fournissez un lien HTTPS arxiv.org/html/… valide.") from None
    elif "multipart/form-data" in content_type:
        async with request.form(
            max_files=1, max_fields=2, max_part_size=settings.max_upload_bytes
        ) as form:
            file = form.get("file")
            if not isinstance(file, UploadFile):
                raise HTTPException(422, "Sélectionnez un fichier PDF.")
            payload = await file.read(settings.max_upload_bytes + 1)
            title = file.filename or "Document"
            language = requested_language(form.get("language"))
        if len(payload) > settings.max_upload_bytes:
            raise HTTPException(413, "Le PDF dépasse la limite de 30 Mo.")
        if not payload.startswith(b"%PDF"):
            raise HTTPException(422, "Ce fichier n’est pas un PDF valide.")
        doc_id = document_id(payload, language)
        if (store.directory(doc_id) / "flow.json").exists():
            return TaskAccepted(doc_id=doc_id)
    else:
        raise HTTPException(415, "Envoyez un PDF ou un lien arXiv au format JSON.")
    if (
        model_factory is LLMClient
        and settings.llm_model.startswith("deepseek/")
        and not settings.deepseek_api_key.get_secret_value()
    ):
        raise HTTPException(
            503,
            "Renseignez DEEPSEEK_API_KEY dans .env et redémarrez. Vous pouvez explorer la démonstration sans clé.",
        )
    task_id = tasks.create()
    tasks.start(run_task(task_id, payload, title, language))
    return TaskAccepted(task_id=task_id)


@app.get("/api/docs", response_model=list[Metadata])
def list_docs():
    return store.list_docs()


@app.get("/api/docs/{doc_id}", response_model=Document)
def document(doc_id: str):
    return read_doc(doc_id, "parsed.json")


@app.get("/api/docs/{doc_id}/flow", response_model=Flow)
def flow(doc_id: str):
    return read_doc(doc_id, "flow.json")


@app.get("/api/docs/{doc_id}/sentences", response_model=list[Sentence])
def sentences(doc_id: str):
    return read_doc(doc_id, "parsed.json")["sentences"]


@app.get("/api/docs/{doc_id}/suggestions", response_model=list[Suggestion])
def suggestions(doc_id: str):
    return read_doc(doc_id, "suggestions.json")


@app.get("/api/docs/{doc_id}/source")
def source(doc_id: str):
    doc = read_doc(doc_id, "parsed.json")
    path = store.directory(doc_id) / ("source.pdf" if doc["kind"] == "pdf" else "source.html")
    if not path.exists():
        raise HTTPException(404, "Source non disponible.")
    headers = {
        "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'",
        "X-Content-Type-Options": "nosniff",
    }
    return FileResponse(
        path, media_type="application/pdf" if doc["kind"] == "pdf" else "text/html", headers=headers
    )


@app.get("/api/docs/{doc_id}/assets/{name}")
def asset(doc_id: str, name: str):
    read_doc(doc_id, "parsed.json")
    if not re.fullmatch(r"\d+\.(css|png|jpg|jpeg|gif|svg|webp)", name):
        raise HTTPException(404)
    path = store.directory(doc_id) / "assets" / name
    if not path.exists():
        raise HTTPException(404)
    return FileResponse(
        path,
        headers={
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "sandbox; default-src 'none'",
        },
    )


@app.post("/api/docs/{doc_id}/steps/{step_id}/explanation", response_model=Explanation)
async def explanation(doc_id: str, step_id: str, request: Request):
    language = requested_language(request.headers.get("x-ui-language"))
    config = settings.model_copy(update={"label_language": language}) if language else settings
    graph = Flow.model_validate(read_doc(doc_id, "flow.json"))
    step = next((s for s in graph.steps if s.id == step_id), None)
    if not step:
        raise HTTPException(404, "Étape inconnue.")
    key = document_id(step_id.encode(), language)
    async with locks.setdefault(f"{doc_id}_{key}", asyncio.Lock()):
        try:
            return store.read(doc_id, f"explanations/{key}.json")
        except FileNotFoundError:
            pass
        doc = Document.model_validate(read_doc(doc_id, "parsed.json"))
        upstream = {e.src for e in graph.links if e.dst == step_id and e.type != "contradict"}
        parents = [s for s in graph.steps if s.id in upstream]
        needed = set(step.anchors) | {a for s in parents for a in s.anchors}
        if graph.metadata.demo:
            result = Explanation(
                explanation=step.summary
                + "\n\nDémonstration éditoriale : consultez les passages cités pour vérifier cette interprétation.",
                anchors=step.anchors,
            )
        else:
            try:
                result = await model_factory(config, store, doc_id).generate(
                    "explanation",
                    {
                        "step": step.model_dump(mode="json"),
                        "upstream": [s.model_dump(mode="json") for s in parents],
                        "sentences": [
                            s.model_dump(mode="json") for s in doc.sentences if s.id in needed
                        ],
                    },
                    Explanation,
                )
            except Exception:
                raise HTTPException(
                    503,
                    "Explication indisponible. Vérifiez la configuration du modèle et réessayez.",
                ) from None
            if not set(result.anchors) <= needed:
                raise HTTPException(
                    502, "L’explication contient des références non valides. Réessayez."
                )
        store.write(doc_id, f"explanations/{key}.json", result.model_dump(mode="json"))
        return result


@app.get("/{path:path}", include_in_schema=False)
def frontend(path: str):
    if path.startswith("api/"):
        raise HTTPException(404, "Route API inconnue.")

    dist = ROOT / "frontend/dist"
    candidate = (dist / path).resolve()
    if candidate.is_relative_to(dist.resolve()) and candidate.is_file():
        return FileResponse(candidate)
    if (dist / "index.html").exists():
        return FileResponse(dist / "index.html")
    raise HTTPException(503, "Interface non construite. Exécutez scripts/setup.sh.")
