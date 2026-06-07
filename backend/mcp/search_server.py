import httpx
from backend.core.config import get_settings

settings = get_settings()
SERPER_URL = "https://google.serper.dev/search"


async def search_web(query: str, num_results: int = 5) -> list[dict]:
    """Search Google via Serper API. Returns list of {title, url, snippet}."""
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            SERPER_URL,
            headers={
                "X-API-KEY": settings.serper_api_key,
                "Content-Type": "application/json",
            },
            json={"q": query, "num": num_results},
        )
        response.raise_for_status()
        data = response.json()

    results = []
    for item in data.get("organic", []):
        results.append({
            "title": item.get("title", ""),
            "url": item.get("link", ""),
            "snippet": item.get("snippet", ""),
        })
    return results
