from fastapi import FastAPI, HTTPException, Request
from sse_starlette.sse import EventSourceResponse

from backend.app.config import settings
from backend.app.storage.files import Store
from backend.app.tasks.manager import TaskManager

app = FastAPI(title="Visual Reasoning Maps", version="0.1.0")
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
