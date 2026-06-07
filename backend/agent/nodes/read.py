import asyncio
from backend.agent.state import ResearchState
from backend.services.queue import publish_event
from backend.services.events import persist_event
from backend.services.credibility import score_sources
from backend.mcp.read_server import read_url
from backend.core.metrics import tool_calls_total, tool_errors_total

MAX_CONTENT_LENGTH = 8000
READ_CONCURRENCY = 5


async def read_node(state: ResearchState) -> ResearchState:
    event = {"event": "step_start", "step": "read"}
    await publish_event(state["task_id"], event)
    await persist_event(state["task_id"], event)

    # On retry: only read sources that don't have content yet
    is_retry = state.get("retry_count", 0) > 0
    sources = list(state["sources"])
    unread_indices = [i for i, s in enumerate(sources) if not s.get("content")]

    if not unread_indices:
        # All sources already read — skip
        event = {
            "event": "step_done",
            "step": "read",
            "sources_read": sum(1 for s in sources if s["content"]),
            "sources": [{"title": s["title"], "url": s["url"], "credibility_score": s.get("credibility_score", 0.5)} for s in sources],
            "interaction_stats": {
                "search_count": state.get("search_count", 0),
                "pages_read": state.get("pages_read", 0),
                "llm_calls": state.get("llm_calls", 0),
                "total_tokens": state.get("total_tokens", 0),
            },
        }
        await publish_event(state["task_id"], event)
        await persist_event(state["task_id"], event)
        return {**state, "steps_done": state["steps_done"] + 1}

    semaphore = asyncio.Semaphore(READ_CONCURRENCY)
    tasks = [_read_one(sources[i], state["task_id"], semaphore) for i in unread_indices]
    contents = await asyncio.gather(*tasks, return_exceptions=True)

    pages_newly_read = 0
    for idx, (orig_idx, content) in enumerate(zip(unread_indices, contents)):
        if not isinstance(content, Exception) and content:
            sources[orig_idx] = {**sources[orig_idx], "content": content[:MAX_CONTENT_LENGTH]}
            pages_newly_read += 1
        elif not sources[orig_idx].get("content") and sources[orig_idx]["snippet"]:
            sources[orig_idx] = {**sources[orig_idx], "content": sources[orig_idx]["snippet"]}

    sources = score_sources(sources)
    updated_pages_read = state.get("pages_read", 0) + pages_newly_read

    readable = sum(1 for s in sources if s["content"])
    event = {
        "event": "step_done",
        "step": "read",
        "sources_read": readable,
        "sources": [{"title": s["title"], "url": s["url"], "credibility_score": s["credibility_score"]} for s in sources],
        "interaction_stats": {
            "search_count": state.get("search_count", 0),
            "pages_read": updated_pages_read,
            "llm_calls": state.get("llm_calls", 0),
            "total_tokens": state.get("total_tokens", 0),
        },
    }
    await publish_event(state["task_id"], event)
    await persist_event(state["task_id"], event)

    return {**state, "sources": sources, "pages_read": updated_pages_read, "steps_done": state["steps_done"] + 1}


async def _read_one(source: dict, task_id: str, semaphore: asyncio.Semaphore) -> str:
    async with semaphore:
        tool_calls_total.labels(tool="read").inc()
        try:
            event = {"event": "thinking", "content": f"Reading: {source['url']}"}
            await publish_event(task_id, event)
            await persist_event(task_id, event)
            return await read_url(source["url"])
        except Exception:
            tool_errors_total.labels(tool="read").inc()
            return ""
