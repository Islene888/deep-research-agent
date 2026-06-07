"""
Extract node: turns raw findings into structured data points.
Runs between analyze and synthesize.
Identifies stat cards, trends, comparisons, risks, timeline events, and key quotes.
"""
import json
from backend.agent.state import ResearchState
from backend.agent.llm import get_llm_client, extract_json_text
from backend.agent.schemas import ExtractedData, StatCard, RiskItem, TimelineEvent, KeyQuote
from backend.services.queue import publish_event
from backend.services.events import persist_event
from backend.core.config import get_settings
from backend.core.metrics import llm_tokens_total

settings = get_settings()

_EXTRACT_SCHEMA = {
    "type": "object",
    "required": ["stat_cards", "risks", "timeline_events", "key_quotes", "has_comparison"],
    "properties": {
        "stat_cards": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["label", "value", "change", "direction"],
                "properties": {
                    "label": {"type": "string"},
                    "value": {"type": "string"},
                    "change": {"type": "string"},
                    "direction": {"type": "string", "enum": ["up", "down", "neutral"]},
                },
            },
            "maxItems": 6,
        },
        "risks": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["severity", "title", "description"],
                "properties": {
                    "severity": {"type": "string", "enum": ["high", "medium", "low"]},
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                },
            },
        },
        "timeline_events": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["date", "event"],
                "properties": {
                    "date": {"type": "string"},
                    "event": {"type": "string"},
                },
            },
        },
        "key_quotes": {
            "type": "array",
            "maxItems": 2,
            "items": {
                "type": "object",
                "required": ["text", "source", "citation_index"],
                "properties": {
                    "text": {"type": "string"},
                    "source": {"type": "string"},
                    "citation_index": {"type": "integer"},
                },
            },
        },
        "has_comparison": {
            "type": "boolean",
            "description": "True if findings compare multiple companies/products",
        },
        "comparison_entities": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Entity names if has_comparison is true",
        },
    },
}


async def extract_node(state: ResearchState) -> ResearchState:
    event = {"event": "step_start", "step": "extract"}
    await publish_event(state["task_id"], event)
    await persist_event(state["task_id"], event)

    client = get_llm_client()

    findings_text = "\n\n".join([
        f"**{f['sub_question']}**\n" + "\n".join(f"- {p}" for p in f["key_points"])
        for f in state["findings"] if f["sub_question"] != "_synthesis"
    ])

    sources_text = "\n".join([
        f"[{i+1}] {s['title']} ({s['url']})"
        for i, s in enumerate(state["sources"])
    ])

    prompt = f"""You are a financial data analyst. Extract all structured data from these research findings.

Research question: {state["question"]}

Findings:
{findings_text}

Sources:
{sources_text}

Extract:
1. **stat_cards**: All key financial metrics (revenue, growth rates, market cap, P/E ratios, etc.)
   - value: exact number with unit (e.g. "$22.6B", "427%", "38x")
   - change: period-over-period change if available (e.g. "+427% YoY", "-8% QoQ")
   - direction: "up" if positive, "down" if negative, "neutral" if unclear

2. **risks**: All risk factors mentioned, each with severity (high/medium/low)

3. **timeline_events**: Any chronological events with specific dates (format: "Month YYYY")

4. **key_quotes**: Up to 2 most impactful direct quotes from sources (executives, analysts, etc.)

5. **has_comparison**: True if findings compare multiple companies or products

Return valid JSON matching the schema. Be precise — only extract what is explicitly stated."""

    thinking = {"event": "thinking", "content": "Extracting structured data points..."}
    await publish_event(state["task_id"], thinking)
    await persist_event(state["task_id"], thinking)

    response = await client.chat.completions.create(
        model=settings.anthropic_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=2000,
    )

    if response.usage:
        llm_tokens_total.labels(type="input").inc(response.usage.prompt_tokens)
        llm_tokens_total.labels(type="output").inc(response.usage.completion_tokens)

    extracted: ExtractedData = _empty_extracted()
    try:
        content = response.choices[0].message.content or ""
        raw = json.loads(extract_json_text(content))
        extracted = ExtractedData(
            stat_cards=[StatCard(**s) for s in raw.get("stat_cards", [])],
            trends=[],
            comparisons=[],
            risks=[RiskItem(**r) for r in raw.get("risks", [])],
            timeline_events=[TimelineEvent(**e) for e in raw.get("timeline_events", [])],
            key_quotes=[KeyQuote(**q) for q in raw.get("key_quotes", [])],
        )
    except Exception as exc:
        content = response.choices[0].message.content or ""
        print(f"[extract] JSON parse error: {exc} | raw[:300]={content[:300]!r}", flush=True)

    event = {
        "event": "step_done",
        "step": "extract",
        "stat_cards_found": len(extracted["stat_cards"]),
        "risks_found": len(extracted["risks"]),
        "timeline_events_found": len(extracted["timeline_events"]),
    }
    await publish_event(state["task_id"], event)
    await persist_event(state["task_id"], event)

    return {**state, "extracted_data": extracted, "steps_done": state["steps_done"] + 1}


def _empty_extracted() -> ExtractedData:
    return ExtractedData(
        stat_cards=[], trends=[], comparisons=[],
        risks=[], timeline_events=[], key_quotes=[],
    )
