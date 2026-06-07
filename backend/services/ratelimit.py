from datetime import datetime, timedelta, timezone
from backend.services.queue import get_redis
from backend.core.config import get_settings

settings = get_settings()


async def check_rate_limit(ip: str) -> bool:
    """Sliding window rate limit: max N requests per minute per IP. Returns True if allowed."""
    r = await get_redis()
    key = f"{settings.RATE_LIMIT_PREFIX}ip:{ip}"
    now = datetime.now(timezone.utc).timestamp()
    window_start = now - 60

    pipe = r.pipeline()
    pipe.zremrangebyscore(key, 0, window_start)
    pipe.zadd(key, {str(now): now})
    pipe.zcard(key)
    pipe.expire(key, 60)
    results = await pipe.execute()

    count = results[2]
    return count <= settings.rate_limit_per_minute


async def check_user_quota(user_id: str) -> tuple[bool, str]:
    """Check daily task limit and concurrent task limit. Returns (allowed, reason)."""
    r = await get_redis()

    daily_key = f"{settings.QUOTA_PREFIX}{user_id}:daily"
    active_key = f"{settings.QUOTA_PREFIX}{user_id}:active"

    pipe = r.pipeline()
    pipe.get(daily_key)
    pipe.get(active_key)
    results = await pipe.execute()

    tasks_today = int(results[0] or 0)
    active_tasks = int(results[1] or 0)

    if tasks_today >= settings.max_tasks_per_day:
        return False, f"Daily limit of {settings.max_tasks_per_day} tasks reached"

    if active_tasks >= settings.max_concurrent_tasks_per_user:
        return False, f"Max {settings.max_concurrent_tasks_per_user} concurrent tasks allowed"

    return True, ""


async def increment_user_quota(user_id: str) -> None:
    r = await get_redis()
    daily_key = f"{settings.QUOTA_PREFIX}{user_id}:daily"
    active_key = f"{settings.QUOTA_PREFIX}{user_id}:active"

    pipe = r.pipeline()
    pipe.incr(daily_key)
    pipe.expire(daily_key, 86400)
    pipe.incr(active_key)
    await pipe.execute()


async def decrement_active_quota(user_id: str) -> None:
    r = await get_redis()
    active_key = f"{settings.QUOTA_PREFIX}{user_id}:active"
    current = await r.get(active_key)
    if current and int(current) > 0:
        await r.decr(active_key)
