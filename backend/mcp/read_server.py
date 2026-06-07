import httpx
from backend.core.config import get_settings

settings = get_settings()
JINA_URL = "https://r.jina.ai/"


async def read_url(url: str) -> str:
    """Extract clean text from a URL via Jina Reader API."""
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            f"{JINA_URL}{url}",
            headers={
                "Authorization": f"Bearer {settings.jina_api_key}",
                "Accept": "text/plain",
                "X-Return-Format": "text",
            },
        )
        response.raise_for_status()
        return response.text
