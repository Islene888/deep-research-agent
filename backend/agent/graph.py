from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from backend.agent.state import ResearchState, initial_state
from backend.agent.nodes.plan import plan_node
from backend.agent.nodes.search import search_node
from backend.agent.nodes.read import read_node
from backend.agent.nodes.analyze import analyze_node
from backend.agent.nodes.extract import extract_node
from backend.agent.nodes.synthesize import synthesize_node
from backend.agent.nodes.verify import verify_node
from backend.agent.nodes.report import report_node
from backend.services.cache import set_cached_result, make_cache_key

_checkpointer = MemorySaver()


def _route_after_verify(state: ResearchState) -> str:
    return "search" if state.get("weak_sub_questions") else "report"


def _build_graph() -> StateGraph:
    builder = StateGraph(ResearchState)

    builder.add_node("plan", plan_node)
    builder.add_node("search", search_node)
    builder.add_node("read", read_node)
    builder.add_node("analyze", analyze_node)
    builder.add_node("extract", extract_node)
    builder.add_node("synthesize", synthesize_node)
    builder.add_node("verify", verify_node)
    builder.add_node("report", report_node)

    builder.set_entry_point("plan")
    builder.add_edge("plan", "search")
    builder.add_edge("search", "read")
    builder.add_edge("read", "analyze")
    builder.add_edge("analyze", "extract")
    builder.add_edge("extract", "synthesize")
    builder.add_edge("synthesize", "verify")
    builder.add_conditional_edges("verify", _route_after_verify, {"search": "search", "report": "report"})
    builder.add_edge("report", END)

    return builder.compile(checkpointer=_checkpointer)


_graph = _build_graph()
_THREAD = lambda task_id: {"configurable": {"thread_id": task_id}}


async def run_research_agent(task_id: str, question: str) -> dict | None:
    """
    Run the research pipeline. Returns None if paused for HITL review.
    The hitl_pause SSE event is emitted inside plan_node before interrupt().
    """
    config = _THREAD(task_id)
    state = initial_state(task_id=task_id, question=question)
    await _graph.ainvoke(state, config=config)

    snapshot = _graph.get_state(config)
    if snapshot.next:
        # Graph paused at interrupt() — waiting for human approval
        return None

    return _extract_report(snapshot.values, question)


async def resume_research_agent(task_id: str, approved_questions: list[str]) -> dict:
    """Resume a paused graph with user-approved sub-questions."""
    config = _THREAD(task_id)
    await _graph.ainvoke(Command(resume=approved_questions), config=config)

    snapshot = _graph.get_state(config)
    question = snapshot.values.get("question", "")
    report = _extract_report(snapshot.values, question)
    await set_cached_result(make_cache_key(question), report)
    return report


def _extract_report(values: dict, question: str) -> dict:
    report = values.get("report")
    if report is None:
        report = {
            "question": question,
            "executive_summary": "Research could not be completed.",
            "stat_highlights": [],
            "sections": [],
            "sources": [],
            "confidence": "low",
            "sources_count": 0,
            "sub_questions": values.get("sub_questions", []),
        }
    return report
