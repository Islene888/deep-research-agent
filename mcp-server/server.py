"""
FinSight MCP Server
Exposes financial research capabilities as MCP tools consumable by
Claude Desktop, Claude Code, or any MCP-compatible LLM client.
"""
import asyncio
import os
import json
import httpx
from mcp.server.fastmcp import FastMCP

BACKEND_URL = os.getenv("FINSIGHT_BACKEND_URL", "http://localhost:8000")
MCP_USER_ID = os.getenv("FINSIGHT_MCP_USER_ID", "mcp-agent")
POLL_INTERVAL = 5   # seconds between status checks
MAX_WAIT = 600      # 10 min timeout

mcp = FastMCP(
    "FinSight",
    instructions=(
        "FinSight is an AI-powered financial research agent. "
        "Use `research` to submit a question and receive a structured report. "
        "Use `get_report` to check on a previously submitted task."
    ),
)


# ── Tool 1: research ──────────────────────────────────────────────────────────

@mcp.tool()
async def research(question: str) -> str:
    """
    Submit a financial research question and wait for the complete structured report.

    The agent searches the web, reads sources, analyzes findings, and returns
    a report with executive summary, key findings, risk factors, timeline,
    notable quotes, and stat highlights.

    Args:
        question: A financial research question, e.g.
                  "What is NVIDIA's AI chip revenue growth and competitive moat in 2025?"

    Returns:
        Formatted research report as text.
    """
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{BACKEND_URL}/api/tasks",
            json={"question": question, "user_id": MCP_USER_ID},
        )
        resp.raise_for_status()
        task = resp.json()

    task_id = task["task_id"]
    print(f"[FinSight MCP] Task created: {task_id}", flush=True)

    # Poll until completed or failed
    elapsed = 0
    async with httpx.AsyncClient(timeout=30) as client:
        while elapsed < MAX_WAIT:
            await asyncio.sleep(POLL_INTERVAL)
            elapsed += POLL_INTERVAL

            resp = await client.get(f"{BACKEND_URL}/api/tasks/{task_id}")
            resp.raise_for_status()
            data = resp.json()
            status = data["status"]
            print(f"[FinSight MCP] {task_id} → {status} ({elapsed}s)", flush=True)

            if status == "completed":
                return _format_report(data.get("result") or {}, task_id)
            if status in ("failed", "cancelled"):
                return f"Research failed: {data.get('error', 'unknown error')}"

    return f"Research timed out after {MAX_WAIT}s. task_id={task_id} — call get_report({task_id!r}) later."


# ── Tool 2: get_report ────────────────────────────────────────────────────────

@mcp.tool()
async def get_report(task_id: str) -> str:
    """
    Retrieve the status and result of a previously submitted research task.

    Args:
        task_id: The task ID returned by a prior `research` call.

    Returns:
        Current status, and the full report if completed.
    """
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{BACKEND_URL}/api/tasks/{task_id}")
        if resp.status_code == 404:
            return f"Task {task_id} not found."
        resp.raise_for_status()
        data = resp.json()

    status = data["status"]
    if status == "completed":
        return _format_report(data.get("result") or {}, task_id)
    if status in ("failed", "cancelled"):
        return f"Task {task_id} {status}: {data.get('error', 'no details')}"
    return f"Task {task_id} is still {status}. Call get_report again in a moment."


# ── Tool 3: list_reports ──────────────────────────────────────────────────────

@mcp.tool()
async def list_reports() -> str:
    """
    List recent research tasks submitted via MCP.

    Returns:
        A summary list of recent tasks with status and question.
    """
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{BACKEND_URL}/api/tasks",
            params={"user_id": MCP_USER_ID, "limit": 10},
        )
        resp.raise_for_status()
        tasks = resp.json()

    if not tasks:
        return "No research tasks found."

    lines = ["Recent FinSight research tasks:\n"]
    for t in tasks:
        status_icon = {"completed": "✅", "running": "🔄", "failed": "❌", "pending": "⏳"}.get(t["status"], "•")
        lines.append(f"{status_icon} [{t['task_id'][:8]}…] {t['question'][:80]}")
    return "\n".join(lines)


# ── Formatter ─────────────────────────────────────────────────────────────────

def _format_report(result: dict, task_id: str) -> str:
    if not result:
        return f"Report for task {task_id} is empty."

    parts: list[str] = []

    parts.append(f"# {result.get('question', 'Research Report')}")
    parts.append(f"*task_id: {task_id}*\n")

    summary = result.get("executive_summary", "")
    if summary:
        parts.append(f"## Executive Summary\n{summary}")

    confidence = result.get("confidence", "")
    sources_count = result.get("sources_count", 0)
    if confidence or sources_count:
        parts.append(f"**Confidence:** {confidence.upper()} · **Sources:** {sources_count}")

    # Stat highlights
    stats = result.get("stat_highlights") or []
    if stats:
        parts.append("## Key Metrics")
        for s in stats:
            arrow = "↑" if s.get("direction") == "up" else ("↓" if s.get("direction") == "down" else "→")
            parts.append(f"- **{s['label']}**: {s['value']} {arrow} {s.get('change', '')}")

    # Sections
    sections = result.get("sections") or []
    for sec in sections:
        sec_type = sec.get("type", "text")
        title = sec.get("title", "")
        data = sec.get("data")
        confidence_label = sec.get("confidence", "")

        parts.append(f"\n## {title}" + (f" *(confidence: {confidence_label})*" if confidence_label else ""))

        if sec_type == "text" and isinstance(data, str):
            parts.append(data)

        elif sec_type == "risk_matrix" and isinstance(data, list):
            for r in data:
                sev = r.get("severity", "").upper()
                parts.append(f"- [{sev}] **{r.get('title', '')}**: {r.get('description', '')}")

        elif sec_type == "timeline" and isinstance(data, list):
            for e in data:
                parts.append(f"- **{e.get('date', '')}**: {e.get('event', '')}")

        elif sec_type == "key_quote" and isinstance(data, dict):
            parts.append(f"> \"{data.get('text', '')}\"\n> — *{data.get('source', '')}*")

        elif sec_type == "comparison_table" and isinstance(data, dict):
            entities = data.get("entities", [])
            parts.append("| Metric | " + " | ".join(entities) + " |")
            parts.append("|---|" + "---|" * len(entities))
            for row in data.get("rows", []):
                vals = [str(row.get("values", {}).get(e, "—")) for e in entities]
                parts.append(f"| {row.get('metric', '')} | " + " | ".join(vals) + " |")

        elif isinstance(data, str):
            parts.append(data)

    # Sources
    sources = result.get("sources") or []
    if sources:
        parts.append("\n## Sources")
        for s in sources:
            parts.append(f"[{s.get('index', '')}] [{s.get('title', 'Link')}]({s.get('url', '')})")

    return "\n\n".join(parts)


if __name__ == "__main__":
    mcp.run()
