# MiroMind 岗位对齐分析

> 这个文件是项目的北极星文档。所有功能决策都应优先对照这里的 JD 要求。

---

## 目标公司：MiroMind

- **官网**: https://www.miromind.ai/
- **地点**: Redwood City, CA（+ Singapore 办公室）
- **定位**: "General Purpose Solver" — 第一家以**可验证正确性**为核心的 AI 公司
- **创始人**: 陈天桥（盛大游戏创始人）
- **团队**: 80%+ PhD 研究员

### 核心技术方向

MiroMind 的模型 **MiroThinker** 的核心创新是 **Effective Interaction Scaling（有效交互缩放）**：

> 不靠扩大模型参数，不靠拉长 Context，而是**提升每一次推理+工具调用的质量**

- MiroThinker-H1：一次任务最多 **600 次工具调用**，256K context window
- 训练四阶段：structured planning → contextual reasoning → tool interaction → answer summarization
- 用强化学习训练 agent 如何在环境反馈中纠错、迭代
- MiroThinker-1.5：30B 参数达到千亿级性能，成本 1/20
- 旗舰产品 MiroThinker-H1 是 **Heavy-Duty Research Agent**，超越 OpenAI/Anthropic/Google DeepMind

---

## 目标岗位：Full-Stack Engineer

**Tech Stack 标签**: Python / Golang / TypeScript · React / Next.js · LLM / Agent / MCP · Kubernetes / Docker

### Responsibilities（职责）

1. Build full-stack AI product capabilities around **LLM / Multimodal / Agent**: UI, backend APIs, **task orchestration, state management**, and service integration
2. Build application infrastructure for model deployment: **Prompt / Skills / MCP / Tools integration**, bridging experimental capabilities to stable product delivery
3. Build scalable backend services: auth, quota, caching, async tasks, data pipelines, service governance, **canary releases**, monitoring, and on-call troubleshooting
4. Drive AI-native engineering: adopt vibe coding tools, explore **Harness Engineering, Agentic Workflow, and Human-in-the-loop practices** in real production
5. Productize complex AI scenarios: translate research capabilities into stable user-facing experiences, continuously optimizing performance, cost, and delivery quality

### Qualifications（要求）

1. Strong full-stack: **Python / Golang / TypeScript**; end-to-end business system delivery
2. Solid backend: API design, auth, task scheduling, **async processing, caching, logging, service governance, microservice architecture**
3. Frontend: **React / Next.js** / Vue
4. **LLM application engineering**: Prompt, Tool Use, Skills, MCP, Workflow / Agent patterns
5. Data storage: **MySQL / PostgreSQL + Redis** / MongoDB; vector retrieval a plus
6. **Git, Docker, CI/CD, Kubernetes**; monitoring with **Prometheus / Grafana**

### Bonus Points（加分项）⭐

1. Shipped AI products, **Agents, Copilots, workflow systems**, or multimodal apps
2. Familiar with **MCP ecosystem**, Skills / Tools / Plugin / Function Calling
3. Hands-on with Harness Engineering, **Human-in-the-loop**, or **Agentic Coding Workflow**
4. Open-source contributions, tech blog, papers, or talks

---

## 项目对齐矩阵

| JD 要求 | 本项目实现 | 文件位置 | 状态 |
|---|---|---|---|
| LLM Agent pipeline | 7 节点 LangGraph StateGraph | `backend/agent/graph.py` | ✅ |
| Task orchestration + state management | LangGraph MemorySaver checkpoint | `backend/agent/graph.py` | ✅ |
| **Human-in-the-loop** (Bonus) | `interrupt()` + `Command(resume=)` HITL | `backend/agent/nodes/plan.py` | ✅ |
| **MCP ecosystem** (Bonus) | FastMCP server, 3 tools | `mcp-server/server.py` | ✅ |
| Backend APIs | FastAPI, REST, SSE streaming | `backend/api/` | ✅ |
| Auth / quota / rate limiting | IP rate limit + user quota | `backend/services/ratelimit.py` | ✅ |
| Async task processing | Redis queue + async worker | `backend/services/worker.py` | ✅ |
| Caching | Redis result cache + TTL | `backend/services/cache.py` | ✅ |
| React / Next.js frontend | Next.js 14, TypeScript, Tailwind | `frontend/` | ✅ |
| PostgreSQL | SQLAlchemy async ORM | `backend/db/` | ✅ |
| Redis | Pub/sub + queue + cache | `backend/services/` | ✅ |
| Docker | Multi-service docker-compose | `docker-compose.yml` | ✅ |
| Kubernetes | K8s manifests | `k8s/` | ✅ |
| Prometheus / Grafana | Full metrics + dashboards | `backend/core/metrics.py` | ✅ |
| Real-time streaming | SSE event stream | `backend/api/stream.py` | ✅ |
| Structured report output | 8 section types w/ charts | `backend/agent/nodes/report.py` | ✅ |
| Recharts data viz | Area/Bar/Radar/Pie charts | `frontend/components/sections/` | ✅ |

---

## 产品 Roadmap（按 JD 优先级排序）

### P0 — 直接对应 JD 必答题
- [x] **HITL Human-in-the-loop** — `interrupt()` + `Command(resume=)` + 前端审核卡片
- [x] **MCP Server** — FastMCP 暴露 research/get_report/list_reports 工具
- [x] **Agentic Workflow** — 7 节点 LangGraph pipeline
- [x] **State management** — MemorySaver checkpoint，支持 interrupt/resume
- [x] **Monitoring** — Prometheus metrics + Grafana dashboards

### P1 — 体现产品完整度
- [x] 结构化报告（8 种 section 类型）
- [x] 实时 SSE streaming
- [x] 前端 Radar Chart / Pie Chart / Area+Bar Chart
- [x] Export to Markdown
- [x] Source credibility scoring

### P2 — 提升"不是 toy"的质感
- [x] 首页 Feature Cards + Tech Stack badges
- [x] History 页面带搜索和统计
- [x] ComparisonTable 最优/最劣高亮
- [ ] **Report 内容质量** — 确保 LLM 实际生成 chart sections（已改 report.py）
- [ ] **向量检索** — JD 提到 "vector retrieval knowledge a plus"，可加 pgvector
- [ ] **Canary releases** — JD 提到，可在 k8s 中加 canary deployment 示例

### P3 — 锦上添花
- [ ] 用户登录 / Auth（目前只有匿名 user_id）
- [ ] 报告对比 (Compare two reports side by side)
- [ ] WebSocket 替代 SSE（更稳定的双向连接）

---

## 面试话术参考

### 如何介绍这个项目（30秒版）

> "I built a production-grade deep research agent using LangGraph's multi-agent pipeline — it orchestrates 7 specialized nodes (plan, search, read, analyze, extract, synthesize, report) with real-time SSE streaming. The key feature is Human-in-the-loop: the agent pauses after planning and lets users review and edit sub-questions before proceeding, implemented with LangGraph's native interrupt() and MemorySaver checkpointer. I also built an MCP server so the agent's capabilities can be consumed directly by Claude Desktop."

### 为什么和 MiroMind 的方向契合

> "MiroMind's core thesis is Effective Interaction Scaling — improving quality at each interaction step rather than just scaling parameters. My project demonstrates exactly this: at each pipeline node, the agent is designed to make high-quality, targeted tool calls (Serper for search, Jina for reading), and the HITL checkpoint ensures the research direction is human-verified before expensive downstream work begins. This mirrors the verification-centric philosophy of MiroThinker-H1."

---

## 关键文件索引

```
deep-research-agent/
├── backend/
│   ├── agent/
│   │   ├── graph.py          # LangGraph StateGraph + MemorySaver (核心)
│   │   ├── nodes/
│   │   │   ├── plan.py       # HITL interrupt() 实现
│   │   │   ├── report.py     # Chart section 生成（含 LLM chart call）
│   │   │   └── extract.py    # Structured data extraction
│   │   └── schemas.py        # 所有数据类型定义
│   ├── api/
│   │   ├── tasks.py          # REST API + /resume endpoint
│   │   └── stream.py         # SSE real-time streaming
│   └── services/
│       ├── worker.py         # Async task worker + resume_task
│       ├── cache.py          # Redis caching
│       └── ratelimit.py      # Rate limiting + user quota
├── frontend/
│   ├── app/
│   │   ├── page.tsx          # Homepage with Feature Cards
│   │   ├── history/          # History with search + stats
│   │   └── research/[id]/    # Research page + HITL approval card
│   ├── components/sections/
│   │   ├── TrendChartSection.tsx      # Area/Bar chart toggle
│   │   ├── ComparisonTableSection.tsx # Table + Radar chart toggle
│   │   └── MarketShareSection.tsx     # Donut pie chart
│   └── lib/
│       ├── useResearchStream.ts  # SSE hook + HITL state
│       └── export.ts             # Markdown export
├── mcp-server/
│   └── server.py             # FastMCP server (Claude Desktop)
└── k8s/                      # Kubernetes manifests
```
