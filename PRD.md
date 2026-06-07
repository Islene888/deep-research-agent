# FinSight — AI-Powered Financial Research Agent
## Product Requirements Document

**Version:** 0.2  
**Author:** Ella Zhao  
**Date:** 2026-06-05  
**Reference:** Miromind Full-Stack Engineer JD + MiroFlow open-source architecture

---

## 1. Background & Motivation

Professional financial research is slow and expensive. An analyst at a hedge fund or consulting firm spends 4–8 hours producing a research report on a company, sector, or macro topic — searching sources, reading reports, cross-referencing data, and synthesizing findings.

**FinSight** automates this workflow using an autonomous AI research agent powered by MiroThinker (via Chutes API). Users submit a financial research question and receive a structured, citation-backed report in under 5 minutes.

**Why this product:**
- Miromind's core strength is deep research and future-event prediction — financial analysis is a natural fit
- The FutureX benchmark (which MiroThinker leads) is heavily weighted toward prediction tasks — exactly what investors need
- Clear B2B monetization: investment firms, analysts, consultants pay for research tools

**Why this demo:**
This project demonstrates the full engineering capability Miromind needs — productizing LLM/Agent capabilities into a reliable, scalable, user-facing product. Built using MiroThinker as the underlying model via Chutes API, matching their actual tech stack.

---

## 2. Target Users

| User | Use Case |
|---|---|
| Buy-side analysts | Quick pre-meeting company research |
| Retail investors | Understand macro trends affecting a stock |
| Consultants | Fast sector landscape reports |
| Founders | Competitive intelligence on market players |

---

## 3. Core User Flow

```
1. User enters a financial research question
   e.g. "What are the key risks for NVIDIA in H2 2026?"
        "How will Fed rate decisions impact tech valuations this year?"
        "Compare OpenAI vs Anthropic market positioning"

2. System queues the task → returns task_id immediately

3. User watches the agent work in real time:
   [Planning]   Breaking into sub-questions...
   [Searching]  Finding sources for "NVIDIA supply chain risks"...
   [Reading]    Analyzing earnings call transcript...
   [Analyzing]  Key finding: margin compression in data center...
   [Synthesizing] Cross-referencing 8 sources...
   [Report]     ✓ Research complete

4. Final output: structured report with:
   - Executive Summary
   - Key Findings (with inline citations)
   - Risk Factors
   - Sources list

5. User can export report or revisit from history
```

---

## 4. Functional Requirements

### 4.1 Research Task Management

| Feature | Description |
|---|---|
| Submit task | POST /api/tasks — question text → task_id |
| Task status | GET /api/tasks/{id} — status, progress, result |
| Task history | GET /api/tasks — past 30 days, paginated |
| Cancel task | DELETE /api/tasks/{id} |
| Result cache | Same question within 24h returns cached result |

**Task states:** `pending` → `running` → `completed` / `failed` / `cancelled`

### 4.2 Research Agent Pipeline

LangGraph state machine with 6 nodes:

```
[Plan] → [Search] → [Read] → [Analyze] → [Synthesize] → [Report]
```

| Node | What it does |
|---|---|
| Plan | Break question into 3–5 targeted sub-questions |
| Search | Google search per sub-question via MCP tool, return top 5 URLs |
| Read | Scrape full content from each URL via MCP tool |
| Analyze | Extract key facts, data points, and arguments per source |
| Synthesize | Cross-reference findings, identify consensus and conflicts |
| Report | Generate final structured report in Markdown with citations |

Each node emits a streaming event. Agent uses MiroThinker's native tool-use format.

### 4.3 MCP Tool Servers

Two MCP tools (stdio protocol):

| Tool | API | Purpose |
|---|---|---|
| `tool-search` | Serper API | Google search — returns top results with snippets |
| `tool-read` | Jina Reader API | Extract clean article text from URL |

### 4.4 Real-Time Streaming (SSE)

`GET /api/tasks/{id}/stream`

```
event: step_start    {"step": "plan"}
event: step_done     {"step": "plan", "sub_questions": ["Q1", "Q2", "Q3"]}
event: step_start    {"step": "search", "query": "NVIDIA H2 2026 risks"}
event: thinking      {"content": "Found 5 sources. Analyzing relevance..."}
event: step_done     {"step": "search", "sources_found": 5}
event: step_start    {"step": "read", "url": "https://..."}
event: step_done     {"step": "analyze"}
event: done          {"report": "## Executive Summary\n...", "citations": [...]}
event: error         {"message": "Search API timeout, retrying..."}
```

**SSE reconnect:** If client disconnects, reconnecting replays all past events for the task from `task_events` table, then resumes live stream.

### 4.5 Rate Limiting & Quota

| Rule | Limit |
|---|---|
| Max concurrent tasks per user | 2 |
| Max tasks per user per day | 20 |
| Max task runtime | 5 minutes (auto-cancel) |
| API rate limit | 10 req/min per IP |

### 4.6 Report Format

```markdown
## Executive Summary
[2-3 sentence overview of key findings]

## Key Findings

### 1. [Finding Title]
[Analysis with inline citation [1]]

### 2. [Finding Title]
...

## Risk Factors
- [Risk 1]
- [Risk 2]

## Sources
[1] Title — URL
[2] Title — URL
```

### 4.7 Observability

**Health check:** `GET /healthz` → `{"status":"ok","redis":"ok","db":"ok","chutes":"ok"}`

**Prometheus metrics at** `GET /metrics`:

| Metric | Type | Description |
|---|---|---|
| `finsight_tasks_total` | Counter | Total tasks by status |
| `finsight_tasks_active` | Gauge | Currently running tasks |
| `finsight_task_duration_seconds` | Histogram | End-to-end task time |
| `finsight_tool_calls_total` | Counter | Tool calls by tool name |
| `finsight_tool_errors_total` | Counter | Tool errors by tool name |
| `finsight_queue_depth` | Gauge | Tasks waiting in queue |
| `finsight_cache_hits_total` | Counter | Result cache hits |
| `finsight_llm_tokens_total` | Counter | Token usage (input/output) |

---

## 5. Non-Functional Requirements

### Performance
- Task submission: p99 < 100ms
- SSE first event: < 2s after task starts
- 50 concurrent active tasks per instance

### Reliability
- Tool call failures: retry 3× with exponential backoff
- Task failures: auto-retry up to 2× 
- Graceful degradation: if `tool-read` fails, continue with search snippets only

### Scalability
- Worker pool size: configurable via `WORKER_CONCURRENCY` env var (default: 10)
- Redis-backed queue enables horizontal worker scaling
- Stateless API layer — multiple instances behind load balancer

---

## 6. Technical Stack

| Layer | Technology | Why |
|---|---|---|
| LLM | MiroThinker-v1.5 via Chutes API | Their own model — direct alignment |
| Agent Orchestration | LangGraph | Multi-step stateful research pipeline |
| MCP Tools | Custom Python MCP servers (stdio) | Matches MiroFlow architecture |
| Backend API | FastAPI (Python 3.12, async) | High-performance, matches Miromind stack |
| Task Queue | Redis + asyncio worker pool | Concurrent task handling, pub/sub for SSE |
| Database | PostgreSQL | Task history, events replay, quotas |
| Caching | Redis (24h TTL) | Avoid re-running identical queries |
| Frontend | Next.js 14 + React + TypeScript | JD requirement, App Router streaming |
| UI | Tailwind CSS + shadcn/ui | Clean professional look |
| Monitoring | Prometheus + Grafana | Production observability |
| Deployment | Docker Compose + K8s manifests | Full production deployment story |

---

## 7. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                      │
│                                                         │
│  / (Home)          Search bar + example questions       │
│  /task/[id]        Live research view (SSE stream)      │
│  /history          Past reports list                    │
│  /report/[id]      Full report with citations           │
└───────────────────────┬─────────────────────────────────┘
                        │ REST + SSE
┌───────────────────────▼─────────────────────────────────┐
│                    FastAPI Backend                       │
│                                                         │
│  POST   /api/tasks              Submit research task    │
│  GET    /api/tasks              List task history       │
│  GET    /api/tasks/{id}         Task status + result    │
│  GET    /api/tasks/{id}/stream  SSE live stream         │
│  DELETE /api/tasks/{id}         Cancel task             │
│  GET    /healthz                Health check            │
│  GET    /metrics                Prometheus metrics      │
└────────┬──────────────────────────────┬─────────────────┘
         │                              │
┌────────▼──────────┐       ┌───────────▼─────────────┐
│     Redis          │       │      PostgreSQL          │
│  · Task queue      │       │  · tasks                 │
│  · Result cache    │       │  · task_events           │
│  · Rate limiting   │       │  · user_quotas           │
│  · SSE pub/sub     │       └─────────────────────────┘
└────────┬──────────┘
         │
┌────────▼──────────────────────────────────────────────┐
│               LangGraph Research Agent                  │
│                                                        │
│  agent/graph.py        StateGraph definition           │
│  agent/state.py        ResearchState dataclass         │
│  agent/nodes/          One file per node               │
│    plan.py             Sub-question decomposition      │
│    search.py           MCP tool-search call            │
│    read.py             MCP tool-read call              │
│    analyze.py          Per-source analysis             │
│    synthesize.py       Cross-reference findings        │
│    report.py           Final report generation         │
│                                                        │
│  mcp/search_server.py  Serper API MCP server           │
│  mcp/read_server.py    Jina Reader MCP server          │
└────────────────────────────────────────────────────────┘
         │
         │ Chutes API (OpenAI-compatible)
┌────────▼──────────────────────────────────────────────┐
│         MiroThinker-v1.5-235B (via chutes.ai)          │
└────────────────────────────────────────────────────────┘
```

---

## 8. Database Schema

```sql
CREATE TABLE tasks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       TEXT NOT NULL,
    question      TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',
    result        JSONB,
    error         TEXT,
    cache_key     TEXT,   -- SHA256(normalized question)
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    started_at    TIMESTAMPTZ,
    completed_at  TIMESTAMPTZ
);

CREATE TABLE task_events (
    id          BIGSERIAL PRIMARY KEY,
    task_id     UUID REFERENCES tasks(id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL,
    data        JSONB NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_quotas (
    user_id         TEXT PRIMARY KEY,
    tasks_today     INT DEFAULT 0,
    active_tasks    INT DEFAULT 0,
    reset_at        TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 day')
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_cache_key ON tasks(cache_key);
CREATE INDEX idx_task_events_task_id ON task_events(task_id);
```

---

## 9. Frontend Pages

### Home (`/`)
- Large search bar with placeholder examples
- "Recent Searches" for returning users  
- 3 example questions to get started

### Research View (`/task/[id]`)
- Left panel: step-by-step progress timeline
  - Each step shows icon + label + status (waiting / running / done)
  - Currently running step shows live "thinking" text streaming
- Right panel: sources being read (card list, live-populating)
- Bottom: report appears section by section as agent writes it
- Top bar: question text + elapsed time + cancel button

### History (`/history`)
- Table: question, date, status, duration, "View Report" button
- Search/filter by date or keyword

### Report (`/report/[id]`)  
- Full markdown report rendered with syntax highlighting
- Citations panel on the right (hover to preview)
- Export to PDF button
- "Research similar topic" button

---

## 10. Development Milestones

| Day | Goal |
|---|---|
| **Day 1** | FastAPI + PostgreSQL + Redis + task queue + /healthz |
| **Day 2** | LangGraph agent + MCP tool servers + Chutes API integration |
| **Day 3** | SSE streaming + SSE reconnect + worker pool |
| **Day 4** | Next.js frontend (Home + Research View) |
| **Day 5** | Rate limiting + caching + Prometheus + Docker Compose |
| **Day 6** | History + Report pages + K8s manifests + README + demo |
