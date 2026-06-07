from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "FinSight"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://finsight:finsight@localhost:5432/finsight"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Anthropic Claude API
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-haiku-4-5-20251001"

    # Chutes API (fallback / legacy)
    chutes_api_key: str = ""
    chutes_base_url: str = "https://llm.chutes.ai/v1"
    chutes_model: str = "deepseek-ai/DeepSeek-V3.2-TEE"

    # MCP Tool APIs
    serper_api_key: str = ""        # Google search
    jina_api_key: str = ""          # Web reader

    # Worker
    worker_concurrency: int = 10
    task_timeout_seconds: int = 300  # 5 min max per task
    task_max_retries: int = 2

    # Rate limiting
    rate_limit_per_minute: int = 10         # per IP
    max_tasks_per_day: int = 20             # per user
    max_concurrent_tasks_per_user: int = 2

    # Cache
    result_cache_ttl: int = 86400    # 24 hours

    # Redis keys
    QUEUE_KEY: str = "finsight:task_queue"
    CACHE_PREFIX: str = "finsight:cache:"
    RATE_LIMIT_PREFIX: str = "finsight:rl:"
    QUOTA_PREFIX: str = "finsight:quota:"
    PUBSUB_PREFIX: str = "finsight:stream:"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
