import asyncio
import json
from collections.abc import AsyncIterator
from uuid import uuid4


class TaskManager:
    def __init__(self) -> None:
        self.events: dict[str, list[dict]] = {}
        self.signals: dict[str, asyncio.Event] = {}
        self.running: set[asyncio.Task] = set()

    def create(self) -> str:
        task_id = uuid4().hex
        self.events[task_id] = []
        self.signals[task_id] = asyncio.Event()
        self.emit(task_id, "En attente", 0)
        return task_id

    def emit(
        self, task_id: str, step: str, progress: int, status: str = "running", **extra
    ) -> None:
        self.events[task_id].append(dict(step=step, progress=progress, status=status, **extra))
        self.signals[task_id].set()

    async def stream(self, task_id: str, after: int = -1) -> AsyncIterator[dict]:
        index = max(0, after + 1)
        while True:
            self.signals[task_id].clear()
            while index < len(self.events[task_id]):
                value = self.events[task_id][index]
                yield {"id": str(index), "data": json.dumps(value, ensure_ascii=False)}
                index += 1
                if value["status"] in ("done", "error"):
                    return
            if self.events[task_id][-1]["status"] in ("done", "error"):
                return
            await self.signals[task_id].wait()

    def start(self, coroutine) -> None:
        task = asyncio.create_task(coroutine)
        self.running.add(task)
        task.add_done_callback(self.running.discard)
