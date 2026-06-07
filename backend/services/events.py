"""Persist task events to DB for SSE reconnect replay."""
import uuid
from backend.db.session import AsyncSessionLocal
from backend.db.models import TaskEvent


async def persist_event(task_id: str, data: dict) -> None:
    async with AsyncSessionLocal() as db:
        db.add(TaskEvent(
            task_id=uuid.UUID(task_id),
            event_type=data.get("event", "unknown"),
            data=data,
        ))
        await db.commit()
