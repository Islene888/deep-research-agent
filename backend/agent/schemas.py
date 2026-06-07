"""
Typed schemas for the structured report output.
The frontend renders each section type differently — this is the contract.
"""
from typing import TypedDict, Literal


# ── Section data types ────────────────────────────────────────────────────────

class StatCard(TypedDict):
    label: str          # "Data Center Revenue"
    value: str          # "$22.6B"
    change: str         # "+427% YoY"  (empty string if not available)
    direction: str      # "up" | "down" | "neutral"


class TrendPoint(TypedDict):
    label: str          # "Q1 2026"
    value: float


class TrendChart(TypedDict):
    x_label: str
    y_label: str
    unit: str           # "$B", "%", "x"
    series: list[TrendPoint]


class ComparisonRow(TypedDict):
    metric: str
    values: dict[str, str]   # {"NVIDIA": "$22.6B", "AMD": "$3.7B"}


class ComparisonTable(TypedDict):
    entities: list[str]
    rows: list[ComparisonRow]


class RiskItem(TypedDict):
    severity: Literal["high", "medium", "low"]
    title: str
    description: str


class TimelineEvent(TypedDict):
    date: str
    event: str


class KeyQuote(TypedDict):
    text: str
    source: str
    citation_index: int


# ── Report section ────────────────────────────────────────────────────────────

class ReportSection(TypedDict):
    type: Literal[
        "stat_card", "trend_chart", "comparison_table",
        "risk_matrix", "timeline", "text", "key_quote", "market_share"
    ]
    title: str
    data: StatCard | TrendChart | ComparisonTable | list[RiskItem] | list[TimelineEvent] | str | KeyQuote | dict
    citations: list[int]
    confidence: Literal["low", "medium", "high"]


# ── Extracted structured data (output of extract node) ───────────────────────

class ExtractedData(TypedDict):
    stat_cards: list[StatCard]
    trends: list[TrendChart]
    comparisons: list[ComparisonTable]
    risks: list[RiskItem]
    timeline_events: list[TimelineEvent]
    key_quotes: list[KeyQuote]


# ── Final report ─────────────────────────────────────────────────────────────

class FinalReport(TypedDict):
    question: str
    executive_summary: str
    stat_highlights: list[StatCard]     # top 3 numbers for the header
    sections: list[ReportSection]
    sources: list[dict]
    confidence: Literal["low", "medium", "high"]
    sources_count: int
    sub_questions: list[str]
