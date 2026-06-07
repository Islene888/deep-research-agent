from prometheus_client import Counter, Gauge, Histogram

tasks_total = Counter(
    "finsight_tasks_total",
    "Total tasks submitted",
    ["status"],
)

tasks_active = Gauge(
    "finsight_tasks_active",
    "Currently running tasks",
)

task_duration = Histogram(
    "finsight_task_duration_seconds",
    "End-to-end task duration",
    buckets=[10, 30, 60, 120, 180, 300, 600],
)

tool_calls_total = Counter(
    "finsight_tool_calls_total",
    "MCP tool calls",
    ["tool"],
)

tool_errors_total = Counter(
    "finsight_tool_errors_total",
    "MCP tool errors",
    ["tool"],
)

queue_depth = Gauge(
    "finsight_queue_depth",
    "Tasks waiting in queue",
)

cache_hits_total = Counter(
    "finsight_cache_hits_total",
    "Result cache hits",
)

llm_tokens_total = Counter(
    "finsight_llm_tokens_total",
    "LLM token usage",
    ["type"],  # input / output
)
