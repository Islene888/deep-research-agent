# FinSight v2 — Intelligent Financial Research Agent
## Product Requirements Document

**Version:** 2.0  
**Author:** Ella Zhao  
**Date:** 2026-06-05  
**Status:** Design

---

## 1. Why v1 Isn't Good Enough

v1 produces a Markdown text wall. That's a research tool from 2022.

The gap between v1 and a product people pay for:

| v1 | v2 |
|---|---|
| Plain Markdown report | Structured, auto-rendered visual report |
| "Done, here's your text" | Live research theater — watch the agent work |
| One-shot answer | Conversation — follow-up, drill down, compare |
| Static output | Interactive charts, expandable citations, exportable |
| Generic layout | Financial-native: stat cards, trend charts, risk matrix |

The benchmark is dr.miromind.ai — users should feel like they hired a research analyst who works in real time, shows their work, and delivers a polished brief.

---

## 2. Product Vision

> **FinSight is a financial research analyst in your browser.**  
> Ask a question. Watch it research in real time. Get a visual brief — not a wall of text.

Target user: an investor, analyst, or founder who needs a 10-minute research brief that would normally take half a day. They care about the **answer**, not the process — but they want to trust the source.

---

## 3. Core Design Principles

**1. Show the work, not just the answer**  
Users trust output more when they see how it was derived. Every search, every article read, every inference made should be visible.

**2. Structure over prose**  
Numbers are numbers. Trends are trends. Risks are risks. Each type of insight should be rendered in its native format — not flattened into a paragraph.

**3. The report builds itself**  
Don't wait until the end to show results. Each section appears as the agent finishes it. The user watches the report assemble in real time.

**4. One question leads to more**  
Good research raises new questions. Every report is a starting point for a follow-up conversation.

---

## 4. Key Features

### 4.1 Live Research Theater

The research view is the core experience. The user watches the agent work through five stages, each with live animation:

```
● Planning          Decomposing question into 4 sub-questions...
  ├─ Q1: NVIDIA data center revenue trends H1 2026
  ├─ Q2: AMD competitive positioning
  ├─ Q3: Supply chain constraints post-tariff
  └─ Q4: Analyst consensus and price targets

● Searching         Finding sources... (12 found)
  ├─ Reuters: NVIDIA Q1 2026 Earnings Beat...
  ├─ Bloomberg: China export controls impact...
  └─ +10 more

● Reading           Extracting content from 12 sources...
  [████████░░] 8/12 articles processed

● Analyzing         Synthesizing findings...
  "Data center demand remains strong despite..."

● Building Report   ▌  (section appears as typed)
```

Each stage has its own animation and live data. The user is never looking at a spinner.

### 4.2 Structured Report with Smart Rendering

The agent produces typed JSON sections. The frontend renders each section type differently:

**`stat_card`** — a key metric  
→ Renders as a highlighted card with label, value, and trend indicator

```
┌─────────────────────────┐
│  Data Center Revenue     │
│  $22.6B  ↑ +427% YoY   │
│  Q1 2026 · Source [3]   │
└─────────────────────────┘
```

**`trend_chart`** — time series data  
→ Renders as an interactive line/bar chart (Recharts)

```
Revenue Growth (Quarterly)
$B  ↑
25 │                    ●
20 │               ●
15 │          ●
10 │    ●  ●
 5 │●
   └─────────────────────→
   Q1'24  Q3'24  Q1'25  Q3'25  Q1'26
```

**`comparison_table`** — multiple entities side by side  
→ Renders as a styled comparison table

```
              NVIDIA    AMD      Intel
Market Cap    $2.8T     $280B    $95B
Data Ctr Rev  $22.6B    $3.7B    $2.1B
YoY Growth    +427%     +115%    -8%
P/E Ratio     38x       48x      22x
```

**`risk_matrix`** — risk factors with severity  
→ Renders as a visual risk list with severity indicator

```
● HIGH    Export control escalation — China revenue at risk ($8B)
● HIGH    Supply chain concentration — TSMC 5nm dependency
● MEDIUM  Margin pressure — custom ASIC competition from hyperscalers
● LOW     Management execution — CFO transition
```

**`timeline`** — chronological events  
→ Renders as a visual timeline

```
Jan 2026  NVIDIA reports record Q3 earnings, stock +12%
Feb 2026  US expands H20 chip export restrictions
Mar 2026  NVIDIA announces Blackwell Ultra production ramp
Apr 2026  AMD launches MI350X, first competitive benchmark
```

**`text`** — analysis paragraphs  
→ Renders as clean prose with inline citation links [1]

**`key_quote`** — important excerpts  
→ Renders as a styled blockquote with source

> "We see no signs of demand softening in the data center segment. Hyperscaler capex commitments for AI infrastructure remain at record levels."  
> — NVIDIA CFO, Q1 2026 Earnings Call [4]

### 4.3 Report Structure

Every report follows a consistent structure:

```
[Header]
  Title + question
  Confidence score (Low / Medium / High)
  Generated: 2 min 34 sec · 11 sources · 4 sub-questions

[Executive Summary]
  3 stat cards (most important numbers)
  2-sentence summary

[Key Findings]
  Finding 1: [title]
    → text analysis
    → supporting chart or table if applicable
    → inline citations

  Finding 2...
  Finding 3...

[Risk Factors]
  risk_matrix

[Timeline] (if temporal events found)
  timeline

[Conclusion]
  text

[Sources]
  Expandable list, each with domain, title, and excerpt preview
```

### 4.4 Follow-up Conversation

After the report, a text input appears: **"Ask a follow-up question"**

```
┌────────────────────────────────────────────────────────┐
│  You researched: NVIDIA risks in H2 2026               │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ "How does AMD's MI350X compare in benchmark?"   │  │
│  │ "What's the impact if H20 ban extends to B20?"  │  │
│  │ "Show me analyst price targets"                 │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  [Ask follow-up ↵]                                     │
└────────────────────────────────────────────────────────┘
```

The agent uses the previous research context + new sub-questions. Answers are faster (reuses cached sources).

### 4.5 Confidence Scoring

Each finding gets a confidence score based on:
- Number of independent sources confirming it
- Recency of sources (last 30 days = higher)
- Source credibility (Reuters/Bloomberg > unknown blog)

```
Finding: NVIDIA data center demand remains strong
Confidence: HIGH ██████████ 
Sources: 4 confirming · Reuters, Bloomberg, Seeking Alpha, NVIDIA IR
```

### 4.6 Report Actions

Top-right of every report:
- **Export PDF** — print-ready version of the visual report
- **Share link** — read-only public URL for this report
- **Research more** — start a new related question

---

## 5. Technical Architecture (Delta from v1)

### 5.1 Agent Output: Structured JSON

The `report` node no longer outputs Markdown. It outputs structured JSON:

```typescript
interface ReportSection {
  type: "stat_card" | "trend_chart" | "comparison_table" | 
        "risk_matrix" | "timeline" | "text" | "key_quote"
  title: string
  data: StatCard | TrendChart | ComparisonTable | RiskMatrix | Timeline | string
  citations: number[]  // indices into sources array
  confidence: "low" | "medium" | "high"
}

interface Report {
  question: string
  executive_summary: string
  stat_highlights: StatCard[]   // top 3 numbers
  sections: ReportSection[]
  sources: Source[]
  generated_at: string
  duration_seconds: number
  confidence: "low" | "medium" | "high"
}
```

### 5.2 New Agent Node: `extract`

Between `analyze` and `synthesize`, a new `extract` node runs structured data extraction:

```
[Plan] → [Search] → [Read] → [Analyze] → [Extract] → [Synthesize] → [Report]
```

The `extract` node takes raw findings and:
1. Identifies all numbers, percentages, dates with context
2. Detects comparison patterns ("X vs Y")
3. Detects temporal sequences (timelines)
4. Classifies each as a typed data point

This structured data feeds into the report node for typed section generation.

### 5.3 Frontend: Section-by-Section Streaming

The SSE stream now sends partial report sections:

```
event: section_ready  {"type": "stat_card", "data": {...}}
event: section_ready  {"type": "trend_chart", "data": {...}}
event: section_ready  {"type": "text", "section_index": 0, "data": "..."}
event: done           {"report": {...}}
```

The frontend renders each section as it arrives. The report visually "builds itself."

### 5.4 Frontend Tech Stack

| Component | Library |
|---|---|
| Framework | Next.js 14 App Router + TypeScript |
| Charts | Recharts (line, bar, composed) |
| UI | Tailwind CSS + shadcn/ui |
| Markdown | react-markdown + rehype-highlight |
| Streaming | Native EventSource API |
| Animation | Framer Motion (step transitions, section reveal) |
| PDF Export | react-pdf or browser print |

### 5.5 Source Credibility Scoring

```python
TIER_1 = ["reuters.com", "bloomberg.com", "ft.com", "wsj.com", "sec.gov"]
TIER_2 = ["seekingalpha.com", "cnbc.com", "marketwatch.com", "fool.com"]
TIER_3 = ["*"]  # everything else

def score_source(url: str, published_date: datetime) -> float:
    domain_score = 1.0 if tier_1 else 0.7 if tier_2 else 0.4
    recency_score = max(0.3, 1.0 - (days_old / 365))
    return domain_score * recency_score
```

Used to compute per-finding confidence level.

---

## 6. Frontend Pages

### Home (`/`)
- Large centered search bar
- 3-5 example questions as chips:
  - "What are NVIDIA's key risks in H2 2026?"
  - "Compare OpenAI vs Anthropic market positioning"
  - "Impact of Fed rate cuts on tech valuations"
- Recent reports (if user has history)

### Research View (`/research/[id]`)

Split layout:

```
┌───────────────────────────┬──────────────────────────────┐
│  LEFT: Process Panel      │  RIGHT: Report Panel          │
│  (fixed 280px)            │  (flex, scrollable)           │
│                           │                               │
│  ● Planning      ✓        │  [Building...]                │
│  ● Searching     ✓        │                               │
│    └ 11 sources found     │  ┌────────────┐ ┌──────────┐ │
│  ● Reading       ✓        │  │ $22.6B     │ │ +427%    │ │
│  ● Analyzing     ✓        │  │ DC Revenue │ │ YoY      │ │
│  ● Extracting    ↻        │  └────────────┘ └──────────┘ │
│  ● Building      ···      │                               │
│                           │  [chart animating in...]      │
│  Sources (11)             │                               │
│  ├ reuters.com ●●●        │  ### Key Findings             │
│  ├ bloomberg ●●●          │  ▌ (typing animation)         │
│  ├ nvidia.com ●●          │                               │
│  └ +8 more                │                               │
└───────────────────────────┴──────────────────────────────┘
```

- Left panel: step timeline + sources as they're read (with credibility dots)
- Right panel: report sections appear one by one as agent finishes each
- Each section has a subtle fade-in animation

### Report (`/report/[id]`)

Full-screen polished report view:
- Header with question, confidence badge, metadata
- Stat cards row
- Sections rendered by type
- Expandable sources panel
- Actions: Export / Share / Follow-up

### History (`/history`)

Card grid of past reports:
- Title (truncated question)
- Date + duration
- Confidence badge
- Top stat (first stat_card value)
- "Continue research" button

---

## 7. Upgraded Development Plan

| Day | Goal |
|---|---|
| **Day 1** | Backend foundation (done ✓) + bug fixes (done ✓) |
| **Day 2** | Add `extract` node · Upgrade `report` node to JSON output · New Report schema |
| **Day 3** | SSE section streaming · Source credibility scorer · Follow-up conversation API |
| **Day 4** | Next.js setup · Live Research Theater (left panel + step animation) |
| **Day 5** | Report renderer: stat cards, charts (Recharts), risk matrix, timeline |
| **Day 6** | Text sections + citations · Follow-up input · History page |
| **Day 7** | PDF export · Polish animations · Docker Compose end-to-end test · README + demo recording |

---

## 8. What This Demonstrates to Miromind

| Miromind JD Requirement | How This Demo Shows It |
|---|---|
| "Build full-stack AI product capabilities: UI, backend APIs, task orchestration, state management" | End-to-end: LangGraph agent → FastAPI → SSE → structured React rendering |
| "Productize complex AI scenarios: translate research into stable user-facing experiences" | Raw LLM output → typed JSON → auto-rendered visual report |
| "LLM application engineering: Prompt, Tool Use, Skills, MCP, Workflow/Agent patterns" | 7-node LangGraph pipeline with typed state, MCP tools, structured output |
| "Build scalable backend services: async tasks, caching, service governance, monitoring" | Redis queue, 24h cache, rate limiting, Prometheus, retry logic |
| "Frontend proficiency: React / Next.js" | Streaming SSE → live section rendering, Recharts, Framer Motion |
| "MCP ecosystem, Function Calling" | MiroThinker via Chutes API with tool use |
| "Shipped AI products, Agents" | FinSight: a real product users would pay for |

The demo answers the implicit interview question:  
**"Can you take what our research team builds and turn it into a product?"**  
The answer is a live URL.
