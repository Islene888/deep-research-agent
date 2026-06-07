from fastapi import APIRouter
from fastapi.responses import JSONResponse, PlainTextResponse
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from sqlalchemy import text

from backend.services.queue import get_redis
from backend.db.session import engine

router = APIRouter(tags=["ops"])


@router.get("/healthz")
async def health():
    checks: dict[str, str] = {"status": "ok", "redis": "ok", "db": "ok"}

    try:
        r = await get_redis()
        await r.ping()
    except Exception as e:
        checks["redis"] = f"error: {e}"
        checks["status"] = "degraded"

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        checks["db"] = f"error: {e}"
        checks["status"] = "degraded"

    status_code = 200 if checks["status"] == "ok" else 503
    return JSONResponse(content=checks, status_code=status_code)


@router.get("/metrics", response_class=PlainTextResponse)
async def metrics():
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)
