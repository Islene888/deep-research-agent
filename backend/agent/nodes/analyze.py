import json
import asyncio
from backend.agent.state import ResearchState, Finding
from backend.agent.llm import get_llm_client, extract_json_text
from backend.services.queue import publish_event
from backend.services.events import persist_event
from backend.core.config import get_settings
from backend.core.metrics import llm_tokens_total

settings = get_settings()


async def analyze_node(state: ResearchState) -> ResearchState:
    event = {"event": "step_start", "step": "analyze"}
    await publish_event(state["task_id"], event)
    await persist_event(state["task_id"], event)

    client = get_llm_client()
    tasks = [_analyze_question(q, state, client) for q in state["sub_questions"]]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    new_findings: list[Finding] = [f for f in results if not isinstance(f, Exception) and f is not None]

    # On retry: merge with existing findings (keep strong questions' findings)
    is_retry = state.get("retry_count", 0) > 0
    if is_retry:
        retried_questions = set(state["sub_questions"])
        preserved = [
            f for f in state["findings"]
            if f["sub_question"] not in retried_questions and f["sub_question"] != "_synthesis"
        ]
        merged_findings = preserved + new_findings
    else:
        merged_findings = new_findings

    # Track LLM calls (one per sub-question)
    updated_llm_calls = state.get("llm_calls", 0) + len(state["sub_questions"])

    event = {
        "event": "step_done",
        "step": "analyze",
        "findings_count": len(merged_findings),
        "interaction_stats": {
            "search_count": state.get("search_count", 0),
            "pages_read": state.get("pages_read", 0),
            "llm_calls": updated_llm_calls,
            "total_tokens": state.get("total_tokens", 0),
        },
    }
    await publish_event(state["task_id"], event)
    await persist_event(state["task_id"], event)

    return {
        **state,
        "findings": merged_findings,
        "llm_calls": updated_llm_calls,
        "steps_done": state["steps_done"] + 1,
    }


async def _analyze_question(question: str, state: ResearchState, client) -> Finding | None:
    relevant = [
        s for s in state["sources"]
        if s["content"] and any(kw.lower() in s["content"].lower() for kw in question.lower().split()[:3])
    ][:5] or [s for s in state["sources"] if s["content"]][:3]

    if not relevant:
        return None

    sources_text = "\n\n".join([
        f"[Source {i+1}] {s['title']}\n{s['content'][:2000]}"
        for i, s in enumerate(relevant)
    ])

    prompt = f"""You are a senior financial analyst. Based on the sources below, answer this sub-question:

Sub-question: {question}

Sources:
{sources_text}

Return a JSON object:
{{
  "key_points": ["point 1", "point 2", "point 3"],
  "source_indices": [1, 2]
}}

Extract 2-4 specific, data-backed key points. Reference source numbers."""

    event = {"event": "thinking", "content": f"Analyzing: {question}"}
    await publish_event(state["task_id"], event)
    await persist_event(state["task_id"], event)

    response = await client.chat.completions.create(
        model=settings.anthropic_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=1024,
    )

    if response.usage:
        llm_tokens_total.labels(type="input").inc(response.usage.prompt_tokens)
        llm_tokens_total.labels(type="output").inc(response.usage.completion_tokens)

    try:
        raw = response.choices[0].message.content or ""
        data = json.loads(extract_json_text(raw))
        src_indices = [i - 1 for i in data.get("source_indices", []) if 0 < i <= len(relevant)]
        return Finding(sub_question=question, key_points=data.get("key_points", []), sources=src_indices)
    except Exception as exc:
        raw = response.choices[0].message.content or ""
        print(f"[analyze] JSON parse error: {exc} | raw[:300]={raw[:300]!r}", flush=True)
        return None
