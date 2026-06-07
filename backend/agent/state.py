from typing import TypedDict
from backend.agent.schemas import ExtractedData, FinalReport


class Source(TypedDict):
    title: str
    url: str
    snippet: str
    content: str
    credibility_score: float    # 0.0–1.0, set by credibility scorer


class Finding(TypedDict):
    sub_question: str
    key_points: list[str]
    sources: list[int]


class ResearchState(TypedDict):
    task_id: str
    question: str
    sub_questions: list[str]           # current active sub_questions (may be subset on retry)
    original_sub_questions: list[str]  # full set, set once in plan node
    sources: list[Source]
    findings: list[Finding]
    extracted_data: ExtractedData
    report: FinalReport | None
    citations: list[dict]
    error: str
    current_step: str
    steps_done: int
    steps_total: int
    # ── Interaction tracking (for Effective Interaction Scaling display) ──────
    search_count: int      # total search API calls
    pages_read: int        # total URLs successfully read
    llm_calls: int         # total LLM API calls made
    total_tokens: int      # cumulative tokens (input + output)
    # ── Verification / retry loop ─────────────────────────────────────────────
    verification_scores: dict      # sub_question -> score 0-100
    retry_count: int               # how many retry loops have run
    weak_sub_questions: list[str]  # sub-questions flagged for re-search


def initial_state(task_id: str, question: str) -> ResearchState:
    return ResearchState(
        task_id=task_id,
        question=question,
        sub_questions=[],
        original_sub_questions=[],
        sources=[],
        findings=[],
        extracted_data={
            "stat_cards": [], "trends": [], "comparisons": [],
            "risks": [], "timeline_events": [], "key_quotes": [],
        },
        report=None,
        citations=[],
        error="",
        current_step="plan",
        steps_done=0,
        steps_total=8,  # plan/search/read/analyze/extract/synthesize/verify/report
        search_count=0,
        pages_read=0,
        llm_calls=0,
        total_tokens=0,
        verification_scores={},
        retry_count=0,
        weak_sub_questions=[],
    )
