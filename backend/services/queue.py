import json
import asyncio
from redis.asyncio import Redis
from backend.core.config import get_settings
from backend.core.metrics import queue_depth

settings = get_settings()
_redis: Redis | None = None


async def get_redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def enqueue_task(task_id: str) -> None:
    r = await get_redis()
    await r.rpush(settings.QUEUE_KEY, task_id)
    depth = await r.llen(settings.QUEUE_KEY)
    queue_depth.set(depth)


async def dequeue_task(timeout: int = 5) -> str | None:
    r = await get_redis()
    result = await r.lpop(settings.QUEUE_KEY)
    if result:
        depth = await r.llen(settings.QUEUE_KEY)
        queue_depth.set(depth)
        return result
    return None


async def publish_event(task_id: str, event: dict) -> None:
    r = await get_redis()
    channel = f"{settings.PUBSUB_PREFIX}{task_id}"
    await r.publish(channel, json.dumps(event))


async def subscribe_task(task_id: str):
    r = await get_redis()
    pubsub = r.pubsub()
    channel = f"{settings.PUBSUB_PREFIX}{task_id}"
    await pubsub.subscribe(channel)
    return pubsub
