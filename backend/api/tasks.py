import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import Task
from backend.db.session import get_db
from backend.services.cache import make_cache_key, get_cached_result, set_cached_result
from backend.services.queue import enqueue_task
from backend.services.ratelimit import check_rate_limit, check_user_quota, increment_user_quota
from backend.core.metrics import tasks_total

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000)
    user_id: str = Field(..., min_length=1, max_length=128)


class TaskResponse(BaseModel):
    task_id: str
    status: str
    question: str
    progress: dict | None = None
    result: dict | None = None
    error: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(
    body: TaskCreate,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # Rate limit by IP
    ip = request.client.host
    if not await check_rate_limit(ip):
        raise HTTPException(429, "Rate limit exceeded. Try again in a minute.")

    # User quota
    allowed, reason = await check_user_quota(body.user_id)
    if not allowed:
        raise HTTPException(429, reason)

    # Check result cache
    cache_key = make_cache_key(body.question)
    cached = await get_cached_result(cache_key)
    if cached:
        # Return a synthetic completed task from cache
        task = Task(
            id=uuid.uuid4(),
            user_id=body.user_id,
            question=body.question,
            status="completed",
            result=cached,
            cache_key=cache_key,
            created_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
        )
        db.add(task)
        await db.commit()
        await db.refresh(task)
        tasks_total.labels(status="cache_hit").inc()
        return _to_response(task)

    # Create task
    task = Task(
        user_id=body.user_id,
        question=body.question,
        status="pending",
        cache_key=cache_key,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)

    await increment_user_quota(body.user_id)
    await enqueue_task(str(task.id))
    tasks_total.labels(status="pending").inc()

    return _to_response(task)


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    user_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 20,
    offset: int = 0,
):
    result = await db.execute(
        select(Task)
        .where(Task.user_id == user_id)
        .order_by(Task.created_at.desc())
        .limit(min(limit, 100))
        .offset(offset)
    )
    return [_to_response(t) for t in result.scalars()]


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, db: Annotated[AsyncSession, Depends(get_db)]):
    task = await _get_or_404(task_id, db)
    return _to_response(task)


class ResumeRequest(BaseModel):
    sub_questions: list[str] = Field(..., min_length=1, max_length=10)


@router.post("/{task_id}/resume", response_model=TaskResponse)
async def resume_task(
    task_id: str,
    body: ResumeRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    task = await _get_or_404(task_id, db)
    if task.status != "awaiting_approval":
        raise HTTPException(400, f"Task is not awaiting approval (status={task.status})")

    await db.execute(
        update(Task)
        .where(Task.id == task.id)
        .values(status="running")
    )
    await db.commit()
    await db.refresh(task)

    # Resume runs in background; caller polls SSE or GET /{task_id}
    import asyncio
    from backend.services.worker import resume_task as _resume
    asyncio.create_task(_resume(task_id, body.sub_questions))

    return _to_response(task)


@router.delete("/{task_id}", status_code=204)
async def cancel_task(task_id: str, db: Annotated[AsyncSession, Depends(get_db)]):
    task = await _get_or_404(task_id, db)
    if task.status not in ("pending", "running"):
        raise HTTPException(400, "Task is already completed or cancelled")
    await db.execute(
        update(Task)
        .where(Task.id == task.id)
        .values(status="cancelled", completed_at=datetime.now(timezone.utc))
    )
    await db.commit()


async def _get_or_404(task_id: str, db: AsyncSession) -> Task:
    try:
        uid = uuid.UUID(task_id)
    except ValueError:
        raise HTTPException(400, "Invalid task ID")
    result = await db.execute(select(Task).where(Task.id == uid))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    return task


def _to_response(task: Task) -> TaskResponse:
    return TaskResponse(
        task_id=str(task.id),
        status=task.status,
        question=task.question,
        result=task.result,
        error=task.error,
        created_at=task.created_at,
        started_at=task.started_at,
        completed_at=task.completed_at,
    )
