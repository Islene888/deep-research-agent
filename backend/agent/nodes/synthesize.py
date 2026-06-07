from backend.agent.state import ResearchState
from backend.agent.llm import get_llm_client
from backend.services.queue import publish_event
from backend.services.events import persist_event
from backend.core.config import get_settings
from backend.core.metrics import llm_tokens_total

settings = get_settings()


async def synthesize_node(state: ResearchState) -> ResearchState:
    event = {"event": "step_start", "step": "synthesize"}
    await publish_event(state["task_id"], event)
    await persist_event(state["task_id"], event)

    findings = state["findings"]
    if not findings:
        event = {"event": "step_done", "step": "synthesize"}
        await publish_event(state["task_id"], event)
        await persist_event(state["task_id"], event)
        return {**state, "steps_done": state["steps_done"] + 1}

    client = get_llm_client()
    findings_text = "\n\n".join([
        f"**{f['sub_question']}**\n" + "\n".join(f"- {p}" for p in f["key_points"])
        for f in findings
    ])

    prompt = f"""You are a senior financial analyst synthesizing research findings.

Original question: {state["question"]}

Findings:
{findings_text}

Identify:
1. The 3-5 most important insights that directly answer the original question
2. Any conflicts or tensions between findings
3. Key risks and uncertainties

Be specific and data-driven."""

    thinking_event = {"event": "thinking", "content": "Cross-referencing findings..."}
    await publish_event(state["task_id"], thinking_event)
    await persist_event(state["task_id"], thinking_event)

    response = await client.chat.completions.create(
        model=settings.anthropic_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=1200,
    )

    if response.usage:
        llm_tokens_total.labels(type="input").inc(response.usage.prompt_tokens)
        llm_tokens_total.labels(type="output").inc(response.usage.completion_tokens)

    synthesis_text = (response.choices[0].message.content or "").strip()
    updated_findings = list(findings) + [{
        "sub_question": "_synthesis",
        "key_points": [synthesis_text],
        "sources": [],
    }]

    event = {"event": "step_done", "step": "synthesize"}
    await publish_event(state["task_id"], event)
    await persist_event(state["task_id"], event)

    return {**state, "findings": updated_findings, "steps_done": state["steps_done"] + 1}
