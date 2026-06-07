"""Verification node — scores each sub-question and triggers re-search for weak ones."""
import json
from backend.agent.state import ResearchState
from backend.agent.llm import get_llm_client, extract_json_text
from backend.services.queue import publish_event
from backend.services.events import persist_event
from backend.core.config import get_settings
from backend.core.metrics import llm_tokens_total

settings = get_settings()

_SCORE_THRESHOLD = 50
_MAX_RETRIES = 2


async def verify_node(state: ResearchState) -> ResearchState:
    event = {"event": "step_start", "step": "verify"}
    await publish_event(state["task_id"], event)
    await persist_event(state["task_id"], event)

    original_qs = state.get("original_sub_questions") or state["sub_questions"]
    findings_map = {f["sub_question"]: f for f in state["findings"]}
    scores: dict[str, int] = dict(state.get("verification_scores") or {})

    for q in original_qs:
        finding = findings_map.get(q)
        if finding:
            score = _score_finding(finding)
        else:
            score = 0
        scores[q] = score

        score_event = {
            "event": "verification_update",
            "sub_question": q,
            "score": score,
            "has_finding": finding is not None,
        }
        await publish_event(state["task_id"], score_event)
        await persist_event(state["task_id"], score_event)

    # Decide which sub-questions need a retry
    retry_count = state.get("retry_count", 0)
    if retry_count < _MAX_RETRIES:
        weak = [q for q in original_qs if scores.get(q, 0) < _SCORE_THRESHOLD]
    else:
        weak = []

    updated_llm_calls = state.get("llm_calls", 0)

    event = {
        "event": "step_done",
        "step": "verify",
        "scores": scores,
        "weak_count": len(weak),
        "will_retry": len(weak) > 0,
        "retry_count": retry_count,
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
        "verification_scores": scores,
        "weak_sub_questions": weak,
        "sub_questions": weak if weak else original_qs,
        "retry_count": retry_count + (1 if weak else 0),
        "steps_done": state["steps_done"] + 1,
    }


def _score_finding(finding: dict) -> int:
    """Heuristic scoring: key_points count × 20 + source count × 10, capped at 100."""
    key_points = finding.get("key_points") or []
    sources = finding.get("sources") or []
    score = min(len(key_points) * 20 + len(sources) * 10, 100)
    return score
