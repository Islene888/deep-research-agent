import hashlib
import json
from backend.services.queue import get_redis
from backend.core.config import get_settings
from backend.core.metrics import cache_hits_total

settings = get_settings()


def make_cache_key(question: str) -> str:
    normalized = question.strip().lower()
    return hashlib.sha256(normalized.encode()).hexdigest()


async def get_cached_result(cache_key: str) -> dict | None:
    r = await get_redis()
    key = f"{settings.CACHE_PREFIX}{cache_key}"
    data = await r.get(key)
    if data:
        cache_hits_total.inc()
        return json.loads(data)
    return None


async def set_cached_result(cache_key: str, result: dict) -> None:
    r = await get_redis()
    key = f"{settings.CACHE_PREFIX}{cache_key}"
    await r.setex(key, settings.result_cache_ttl, json.dumps(result))
