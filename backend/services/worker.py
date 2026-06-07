import asyncio
import traceback
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from backend.db.session import AsyncSessionLocal
from backend.db.models import Task
from backend.services.queue import dequeue_task, publish_event
from backend.services.ratelimit import decrement_active_quota
from backend.core.config import get_settings
from backend.core.metrics import tasks_active, tasks_total, task_duration

settings = get_settings()


async def process_task(task_id: str) -> None:
    from backend.agent.graph import run_research_agent

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Task).where(Task.id == uuid.UUID(task_id)))
        task = result.scalar_one_or_none()
        if not task or task.status not in ("pending",):
            print(f"[worker] Skipping {task_id}: status={getattr(task, 'status', None)}", flush=True)
            return

        task.status = "running"
        task.started_at = datetime.now(timezone.utc)
        await db.commit()
        tasks_active.inc()
        tasks_total.labels(status="running").inc()
        start_time = asyncio.get_running_loop().time()

    try:
        report = await asyncio.wait_for(
            run_research_agent(task_id, task.question),
            timeout=settings.task_timeout_seconds,
        )

        if report is None:
            # Graph paused for HITL — frontend already received hitl_pause event
            async with AsyncSessionLocal() as db:
                await db.execute(
                    update(Task)
                    .where(Task.id == uuid.UUID(task_id))
                    .values(status="awaiting_approval")
                )
                await db.commit()
            print(f"[worker] Task {task_id} paused for HITL", flush=True)
            return

        await _complete_task(task_id, report, start_time)

    except asyncio.TimeoutError:
        await _fail_task(task_id, "Task timed out")
        await publish_event(task_id, {"event": "error", "message": "Task timed out"})
        tasks_total.labels(status="failed").inc()

    except Exception as e:
        print(f"[worker] Error in task {task_id}: {e}", flush=True)
        traceback.print_exc()
        await _retry_or_fail(task_id, task.retry_count, str(e))
        tasks_total.labels(status="failed").inc()

    finally:
        tasks_active.dec()
        await decrement_active_quota(task.user_id)


async def resume_task(task_id: str, approved_questions: list[str]) -> None:
    """Resume a HITL-paused task. Called directly from the resume API endpoint."""
    from backend.agent.graph import resume_research_agent

    start_time = asyncio.get_running_loop().time()
    tasks_active.inc()
    task = None

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Task).where(Task.id == uuid.UUID(task_id)))
        task = result.scalar_one_or_none()

    try:
        report = await asyncio.wait_for(
            resume_research_agent(task_id, approved_questions),
            timeout=settings.task_timeout_seconds,
        )
        await _complete_task(task_id, report, start_time)
    except Exception as e:
        print(f"[worker] Resume error for {task_id}: {e}", flush=True)
        traceback.print_exc()
        await _fail_task(task_id, str(e))
        await publish_event(task_id, {"event": "error", "message": str(e)})
    finally:
        tasks_active.dec()
        if task:
            await decrement_active_quota(task.user_id)


async def _complete_task(task_id: str, report: dict, start_time: float) -> None:
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(Task)
            .where(Task.id == uuid.UUID(task_id))
            .values(
                status="completed",
                result=report,
                completed_at=datetime.now(timezone.utc),
            )
        )
        await db.commit()
    await publish_event(task_id, {"event": "done", "report": report})
    tasks_total.labels(status="completed").inc()
    task_duration.observe(asyncio.get_running_loop().time() - start_time)


async def _fail_task(task_id: str, error: str) -> None:
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(Task)
            .where(Task.id == uuid.UUID(task_id))
            .values(status="failed", error=error, completed_at=datetime.now(timezone.utc))
        )
        await db.commit()


async def _retry_or_fail(task_id: str, retry_count: int, error: str) -> None:
    from backend.services.queue import enqueue_task
    if retry_count < settings.task_max_retries:
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(Task)
                .where(Task.id == uuid.UUID(task_id))
                .values(status="pending", retry_count=retry_count + 1, error=error)
            )
            await db.commit()
        await asyncio.sleep(2 ** retry_count)
        await enqueue_task(task_id)
    else:
        await _fail_task(task_id, error)
        await publish_event(task_id, {"event": "error", "message": error})


async def run_worker() -> None:
    print(f"[worker] Starting, concurrency={settings.worker_concurrency}", flush=True)
    semaphore = asyncio.Semaphore(settings.worker_concurrency)

    async def handle(task_id: str):
        try:
            async with semaphore:
                await process_task(task_id)
        except Exception as exc:
            print(f"[worker] UNHANDLED in handle({task_id}): {exc}", flush=True)
            traceback.print_exc()

    while True:
        try:
            task_id = await dequeue_task()
            if task_id:
                print(f"[worker] Dequeued task {task_id}", flush=True)
                asyncio.create_task(handle(task_id))
            else:
                await asyncio.sleep(1)
        except Exception as exc:
            print(f"[worker] Loop error: {exc}", flush=True)
            traceback.print_exc()
            await asyncio.sleep(2)
