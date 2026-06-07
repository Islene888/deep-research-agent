import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import get_settings
from backend.db.session import init_db
from backend.api import tasks, stream, health
from backend.services.worker import run_worker

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    worker_task = asyncio.create_task(run_worker())
    yield
    worker_task.cancel()


app = FastAPI(
    title="FinSight API",
    description="AI-powered financial research agent",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router)
app.include_router(stream.router)
app.include_router(health.router)
