import asyncio
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from backend.db.models import Task, TaskEvent
from backend.db.session import get_db
from backend.services.queue import subscribe_task

router = APIRouter(prefix="/api/tasks", tags=["stream"])

# Events that signal the stream is finished
_TERMINAL_EVENTS = {"done", "error"}


@router.get("/{task_id}/stream")
async def stream_task(task_id: str, db: Annotated[AsyncSession, Depends(get_db)]):
    try:
        uid = uuid.UUID(task_id)
    except ValueError:
        raise HTTPException(400, "Invalid task ID")

    result = await db.execute(select(Task).where(Task.id == uid))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")

    if task.status == "completed":
        return StreamingResponse(
            _replay_completed(uid, task.result, db),
            media_type="text/event-stream",
            headers=_sse_headers(),
        )

    if task.status in ("failed", "cancelled"):
        return StreamingResponse(
            _terminal_error(task.error),
            media_type="text/event-stream",
            headers=_sse_headers(),
        )

    return StreamingResponse(
        _live_stream(task_id, uid, db),
        media_type="text/event-stream",
        headers=_sse_headers(),
    )


async def _replay_completed(uid: uuid.UUID, result: dict, db: AsyncSession):
    """Replay all persisted events for a completed task, then emit done."""
    events_result = await db.execute(
        select(TaskEvent)
        .where(TaskEvent.task_id == uid)
        .order_by(TaskEvent.created_at)
    )
    for event in events_result.scalars():
        yield _sse(event.data)

    if result:
        yield _sse({"event": "done", "report": result})


async def _terminal_error(error: str | None):
    yield _sse({"event": "error", "message": error or "Task failed"})


async def _live_stream(task_id: str, uid: uuid.UUID, db: AsyncSession):
    """
    1. Replay already-persisted events (SSE reconnect support).
    2. Subscribe to Redis pub/sub for live events.
    3. Emit heartbeat every 15s to keep connection alive through proxies.
    """
    # Replay past events
    events_result = await db.execute(
        select(TaskEvent)
        .where(TaskEvent.task_id == uid)
        .order_by(TaskEvent.created_at)
    )
    for event in events_result.scalars():
        yield _sse(event.data)

    # Subscribe and stream
    pubsub = await subscribe_task(task_id)
    try:
        while True:
            try:
                message = await asyncio.wait_for(
                    pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0),
                    timeout=15,
                )
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"
                continue

            if message and message["type"] == "message":
                data = json.loads(message["data"])
                yield _sse(data)
                if data.get("event") in _TERMINAL_EVENTS:
                    break
    finally:
        await pubsub.unsubscribe()
        await pubsub.aclose()


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


def _sse_headers() -> dict:
    return {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",       # disable nginx buffering
        "Connection": "keep-alive",
    }
