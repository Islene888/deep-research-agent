import asyncio
from backend.agent.state import ResearchState, Source
from backend.services.queue import publish_event
from backend.services.events import persist_event
from backend.mcp.search_server import search_web
from backend.core.metrics import tool_calls_total, tool_errors_total

_RETRY_SUFFIX = "statistics data analysis report"


async def search_node(state: ResearchState) -> ResearchState:
    is_retry = state.get("retry_count", 0) > 0
    event = {
        "event": "step_start",
        "step": "search",
        "retry": is_retry,
        "retry_count": state.get("retry_count", 0),
    }
    await publish_event(state["task_id"], event)
    await persist_event(state["task_id"], event)

    if is_retry:
        thinking = {"event": "thinking", "content": f"Re-searching {len(state['sub_questions'])} weak sub-question(s)..."}
        await publish_event(state["task_id"], thinking)
        await persist_event(state["task_id"], thinking)

    tasks = [_search_one(q, state["task_id"]) for q in state["sub_questions"]]
    results_list = await asyncio.gather(*tasks, return_exceptions=True)

    new_sources: list[Source] = []
    new_search_count = 0
    for results in results_list:
        if not isinstance(results, Exception):
            sources, count = results
            new_sources.extend(sources)
            new_search_count += count

    # Deduplicate
    existing_urls: set[str] = {s["url"] for s in state["sources"]}
    unique_new = []
    seen = set(existing_urls)
    for s in new_sources:
        if s["url"] not in seen:
            seen.add(s["url"])
            unique_new.append(s)

    # Merge with existing sources on retry, replace on first run
    if is_retry:
        merged_sources = state["sources"] + unique_new
    else:
        merged_sources = unique_new[:15]

    updated_search_count = state.get("search_count", 0) + new_search_count
    updated_llm_calls = state.get("llm_calls", 0)

    event = {
        "event": "step_done",
        "step": "search",
        "sources_found": len(unique_new),
        "total_sources": len(merged_sources),
        "urls": [s["url"] for s in unique_new],
        "interaction_stats": {
            "search_count": updated_search_count,
            "pages_read": state.get("pages_read", 0),
            "llm_calls": updated_llm_calls,
            "total_tokens": state.get("total_tokens", 0),
        },
    }
    await publish_event(state["task_id"], event)
    await persist_event(state["task_id"], event)

    return {
        **state,
        "sources": merged_sources,
        "search_count": updated_search_count,
        "steps_done": state["steps_done"] + 1,
    }


async def _search_one(query: str, task_id: str) -> tuple[list[Source], int]:
    """Returns (sources, number_of_search_calls_made)."""
    tool_calls_total.labels(tool="search").inc()
    calls = 1
    try:
        event = {"event": "thinking", "content": f"Searching: {query}"}
        await publish_event(task_id, event)
        await persist_event(task_id, event)
        results = await search_web(query, num_results=5)

        # Gap 3: adaptive retry — rewrite query if too few results
        if len(results) < 2:
            retry_query = f"{query} {_RETRY_SUFFIX}"
            event2 = {"event": "thinking", "content": f"Retrying with: {retry_query[:80]}"}
            await publish_event(task_id, event2)
            await persist_event(task_id, event2)
            tool_calls_total.labels(tool="search").inc()
            calls += 1
            retry_results = await search_web(retry_query, num_results=5)
            if len(retry_results) > len(results):
                results = retry_results

        sources = [Source(title=r["title"], url=r["url"], snippet=r.get("snippet", ""), content="") for r in results]
        return sources, calls
    except Exception as e:
        tool_errors_total.labels(tool="search").inc()
        return [], calls
