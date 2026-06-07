"""
Report node: assembles the final structured report from all prior node outputs.
Outputs a FinalReport JSON — not Markdown.
Each section is typed so the frontend can render it appropriately.
"""
import json
from backend.agent.state import ResearchState
from backend.agent.llm import get_llm_client, extract_json_text
from backend.agent.schemas import (
    FinalReport, ReportSection, StatCard,
)
from backend.services.queue import publish_event
from backend.services.events import persist_event
from backend.core.config import get_settings
from backend.core.metrics import llm_tokens_total

settings = get_settings()


async def report_node(state: ResearchState) -> ResearchState:
    event = {"event": "step_start", "step": "report"}
    await publish_event(state["task_id"], event)
    await persist_event(state["task_id"], event)

    client = get_llm_client()
    extracted = state.get("extracted_data", {})
    citations = [
        {"index": i + 1, "title": s["title"], "url": s["url"]}
        for i, s in enumerate(state["sources"]) if s.get("url")
    ]

    findings_text = "\n\n".join([
        f"**{f['sub_question']}**\n" + "\n".join(f"- {p}" for p in f["key_points"])
        for f in state["findings"] if f["sub_question"] != "_synthesis"
    ])
    synthesis = next(
        (f["key_points"][0] for f in state["findings"] if f["sub_question"] == "_synthesis"), ""
    )
    citations_text = "\n".join([f"[{c['index']}] {c['title']} — {c['url']}" for c in citations])

    # ── 1. Generate executive summary + text sections ────────────────────────
    thinking = {"event": "thinking", "content": "Writing executive summary..."}
    await publish_event(state["task_id"], thinking)
    await persist_event(state["task_id"], thinking)

    prose_prompt = f"""You are a senior financial research analyst writing a research brief.

Question: {state["question"]}

Findings:
{findings_text}

Synthesis:
{synthesis}

Sources:
{citations_text}

Write a JSON object with:
{{
  "executive_summary": "2-3 sentence answer to the question",
  "key_findings": [
    {{
      "title": "Finding title (5-8 words)",
      "analysis": "2-3 sentence analysis with inline citations [1][2]",
      "citations": [1, 2]
    }}
  ],
  "conclusion": "1-2 sentence conclusion"
}}

Be direct and data-driven. Use inline citations [N] wherever possible."""

    prose_response = await client.chat.completions.create(
        model=settings.anthropic_model,
        messages=[{"role": "user", "content": prose_prompt}],
        temperature=0.4,
        max_tokens=2000,
    )

    if prose_response.usage:
        llm_tokens_total.labels(type="input").inc(prose_response.usage.prompt_tokens)
        llm_tokens_total.labels(type="output").inc(prose_response.usage.completion_tokens)

    prose_data = {}
    try:
        raw = prose_response.choices[0].message.content or ""
        prose_data = json.loads(extract_json_text(raw))
    except Exception as exc:
        raw = prose_response.choices[0].message.content or ""
        print(f"[report] prose JSON parse error: {exc} | raw[:300]={raw[:300]!r}", flush=True)
        prose_data = {
            "executive_summary": synthesis[:300] if synthesis else "Research complete.",
            "key_findings": [],
            "conclusion": "",
        }

    # ── 2. Generate chart sections (trend + comparison) ──────────────────────
    thinking2 = {"event": "thinking", "content": "Generating charts and data tables..."}
    await publish_event(state["task_id"], thinking2)
    await persist_event(state["task_id"], thinking2)

    chart_prompt = f"""You are a financial data analyst. Extract structured visualization data from these research findings.

Question: {state["question"]}

Findings (use ONLY numbers explicitly stated here — never fabricate):
{findings_text[:3000]}

Return a JSON object. Set a field to null if you lack real data for it.

{{
  "trend_chart": {{
    "title": "e.g. Revenue Growth (2021-2024)",
    "x_label": "Period",
    "y_label": "Metric name",
    "unit": "e.g. $B or % or x",
    "series": [
      {{"label": "2021", "value": 12.3}},
      {{"label": "2022", "value": 18.7}}
    ]
  }},
  "comparison_table": {{
    "title": "e.g. Competitive Landscape",
    "entities": ["Entity A", "Entity B", "Entity C"],
    "rows": [
      {{"metric": "Revenue", "values": {{"Entity A": "$10B", "Entity B": "$8B", "Entity C": "$6B"}}}},
      {{"metric": "Growth Rate", "values": {{"Entity A": "42%", "Entity B": "28%", "Entity C": "15%"}}}}
    ]
  }},
  "market_share": {{
    "title": "Market Share Breakdown",
    "slices": [
      {{"label": "Company A", "value": 42}},
      {{"label": "Company B", "value": 28}}
    ]
  }}
}}

Rules:
- trend_chart: only if you have 3+ real time-series data points with actual numbers
- comparison_table: only if comparing 2+ entities across 3+ metrics with real numbers
- market_share: only if explicit market share percentages are stated (must sum to ~100)
- Return null for any field you cannot populate with real research data"""

    chart_response = await client.chat.completions.create(
        model=settings.anthropic_model,
        messages=[{"role": "user", "content": chart_prompt}],
        temperature=0.1,
        max_tokens=2000,
    )

    if chart_response.usage:
        llm_tokens_total.labels(type="input").inc(chart_response.usage.prompt_tokens)
        llm_tokens_total.labels(type="output").inc(chart_response.usage.completion_tokens)

    chart_data = {}
    try:
        raw = chart_response.choices[0].message.content or ""
        chart_data = json.loads(extract_json_text(raw)) or {}
    except Exception as exc:
        raw = chart_response.choices[0].message.content or ""
        print(f"[report] chart JSON parse error: {exc} | raw[:300]={raw[:300]!r}", flush=True)

    # ── 3. Assemble sections in priority order ───────────────────────────────
    sections: list[ReportSection] = []

    async def _emit_section(sec: ReportSection) -> None:
        idx = len(sections)
        sections.append(sec)
        evt = {"event": "section_ready", "section": sec, "section_index": idx}
        await publish_event(state["task_id"], evt)
        await persist_event(state["task_id"], evt)

    # Comparison table first (most visual impact)
    ct = chart_data.get("comparison_table")
    if ct and ct.get("entities") and ct.get("rows") and len(ct["rows"]) >= 2:
        await _emit_section(ReportSection(
            type="comparison_table",
            title=ct.get("title", "Competitive Comparison"),
            data={"entities": ct["entities"], "rows": ct["rows"]},
            citations=[],
            confidence="high",
        ))

    # Trend chart
    tc = chart_data.get("trend_chart")
    if tc and tc.get("series") and len(tc["series"]) >= 3:
        await _emit_section(ReportSection(
            type="trend_chart",
            title=tc.get("title", "Trend Analysis"),
            data={
                "x_label": tc.get("x_label", "Period"),
                "y_label": tc.get("y_label", "Value"),
                "unit": tc.get("unit", ""),
                "series": tc["series"],
            },
            citations=[],
            confidence="high",
        ))

    # Market share pie (stored as comparison_table with special flag for frontend)
    ms = chart_data.get("market_share")
    if ms and ms.get("slices") and len(ms["slices"]) >= 2:
        total = sum(s.get("value", 0) for s in ms["slices"])
        if total > 0:
            await _emit_section(ReportSection(
                type="market_share",
                title=ms.get("title", "Market Share"),
                data={"slices": ms["slices"]},
                citations=[],
                confidence="high",
            ))

    # Text findings
    for finding in prose_data.get("key_findings", []):
        await _emit_section(ReportSection(
            type="text",
            title=finding.get("title", "Finding"),
            data=finding.get("analysis", ""),
            citations=finding.get("citations", []),
            confidence=_compute_confidence(len(finding.get("citations", []))),
        ))

    # Risk matrix (from extract node)
    risks = extracted.get("risks", [])
    if risks:
        await _emit_section(ReportSection(
            type="risk_matrix",
            title="Risk Factors",
            data=risks,
            citations=[],
            confidence="high",
        ))

    # Timeline (from extract node)
    timeline = extracted.get("timeline_events", [])
    if len(timeline) >= 2:
        await _emit_section(ReportSection(
            type="timeline",
            title="Key Events",
            data=sorted(timeline, key=lambda e: e["date"]),
            citations=[],
            confidence="high",
        ))

    # Key quotes (from extract node)
    for quote in extracted.get("key_quotes", []):
        await _emit_section(ReportSection(
            type="key_quote",
            title="Notable Quote",
            data=quote,
            citations=[quote.get("citation_index", 0)],
            confidence="high",
        ))

    # Conclusion text
    if prose_data.get("conclusion"):
        await _emit_section(ReportSection(
            type="text",
            title="Conclusion",
            data=prose_data["conclusion"],
            citations=[],
            confidence="medium",
        ))

    # ── 4. Top stat highlights ───────────────────────────────────────────────
    stat_highlights: list[StatCard] = extracted.get("stat_cards", [])[:3]

    # ── 5. Overall confidence ────────────────────────────────────────────────
    overall_confidence = _overall_confidence(
        sources_count=len(citations),
        findings_count=len(state["findings"]),
        has_stats=len(stat_highlights) > 0,
    )

    # ── 6. Assemble final report ─────────────────────────────────────────────
    report = FinalReport(
        question=state["question"],
        executive_summary=prose_data.get("executive_summary", ""),
        stat_highlights=stat_highlights,
        sections=sections,
        sources=citations,
        confidence=overall_confidence,
        sources_count=len(citations),
        sub_questions=state["sub_questions"],
    )

    event = {"event": "step_done", "step": "report", "sections_count": len(sections)}
    await publish_event(state["task_id"], event)
    await persist_event(state["task_id"], event)

    return {**state, "report": report, "citations": citations, "steps_done": state["steps_done"] + 1}


def _compute_confidence(citation_count: int) -> str:
    if citation_count >= 3:
        return "high"
    if citation_count >= 1:
        return "medium"
    return "low"


def _overall_confidence(sources_count: int, findings_count: int, has_stats: bool) -> str:
    score = 0
    if sources_count >= 8:
        score += 2
    elif sources_count >= 4:
        score += 1
    if findings_count >= 3:
        score += 2
    elif findings_count >= 1:
        score += 1
    if has_stats:
        score += 1
    if score >= 4:
        return "high"
    if score >= 2:
        return "medium"
    return "low"
