import json
from langgraph.types import interrupt
from backend.agent.state import ResearchState
from backend.agent.llm import get_llm_client, extract_json_text
from backend.services.queue import publish_event
from backend.services.events import persist_event
from backend.core.config import get_settings

settings = get_settings()


async def plan_node(state: ResearchState) -> ResearchState:
    event = {"event": "step_start", "step": "plan"}
    await publish_event(state["task_id"], event)
    await persist_event(state["task_id"], event)

    client = get_llm_client()

    prompt = f"""You are a financial research analyst. Break down the following research question into 3-5 specific sub-questions that together will provide a comprehensive answer.

Research question: {state["question"]}

Return a JSON object with this exact format:
{{
  "sub_questions": ["question 1", "question 2", "question 3"]
}}

Focus on: financial data, market dynamics, risk factors, competitive landscape, and forward-looking indicators."""

    response = await client.chat.completions.create(
        model=settings.anthropic_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=1024,
    )

    sub_questions = [state["question"]]  # fallback
    try:
        raw = response.choices[0].message.content or ""
        data = json.loads(extract_json_text(raw))
        sub_questions = data.get("sub_questions", sub_questions)
    except Exception as exc:
        raw = response.choices[0].message.content or ""
        print(f"[plan] JSON parse error: {exc} | raw[:300]={raw[:300]!r}", flush=True)

    # Emit HITL pause — frontend shows editable sub-question list
    hitl_event = {"event": "hitl_pause", "sub_questions": sub_questions}
    await publish_event(state["task_id"], hitl_event)
    await persist_event(state["task_id"], hitl_event)

    # Pause graph; resume value = user-approved sub_questions list
    approved: list[str] = interrupt(sub_questions)
    sub_questions = approved if approved else sub_questions

    event = {"event": "step_done", "step": "plan", "sub_questions": sub_questions}
    await publish_event(state["task_id"], event)
    await persist_event(state["task_id"], event)

    return {
        **state,
        "sub_questions": sub_questions,
        "original_sub_questions": sub_questions,
        "steps_done": state["steps_done"] + 1,
    }
