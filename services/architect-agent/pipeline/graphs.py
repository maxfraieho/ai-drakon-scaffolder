"""LangGraph StateGraph definitions for Pipeline A and Pipeline B."""
from langgraph.graph import StateGraph, END

from .states import AnalysisState, VibeCodingState
from .nodes_analysis import (
    measure_cc, classify_complexity, ast_translate,
    validate_ir_node, yaml_gen_node, ir_gen_node, code_gen_node,
)
from .nodes_vibe import check_syntax

MAX_ITERATIONS = 3


# ── Pipeline A: Code → DRAKON IR ─────────────────────────────────────────────

def _route_by_complexity(state: AnalysisState) -> str:
    if state["tree_level"] == "primitive":
        return "ast_translate"
    return "yaml_gen"


def _route_after_validate(state: AnalysisState) -> str:
    if not state["validation_errors"]:
        return END
    if state["iteration_count"] >= MAX_ITERATIONS:
        return END
    return "ir_gen"


def build_analysis_graph():
    g = StateGraph(AnalysisState)

    g.add_node("measure_cc", measure_cc)
    g.add_node("classify", classify_complexity)
    g.add_node("ast_translate", ast_translate)
    g.add_node("yaml_gen", yaml_gen_node)
    g.add_node("ir_gen", ir_gen_node)
    g.add_node("validate", validate_ir_node)

    g.set_entry_point("measure_cc")
    g.add_edge("measure_cc", "classify")
    g.add_conditional_edges(
        "classify",
        _route_by_complexity,
        {"ast_translate": "ast_translate", "yaml_gen": "yaml_gen"},
    )
    g.add_edge("ast_translate", "validate")
    g.add_edge("yaml_gen", "ir_gen")
    g.add_edge("ir_gen", "validate")
    g.add_conditional_edges(
        "validate",
        _route_after_validate,
        {END: END, "ir_gen": "ir_gen"},
    )

    return g.compile()


# ── Pipeline B: DRAKON IR → Code ─────────────────────────────────────────────

def _route_after_syntax(state: VibeCodingState) -> str:
    if not state["syntax_errors"]:
        return END
    if state["iteration_count"] >= MAX_ITERATIONS:
        return END
    return "code_gen"


def build_vibe_graph():
    g = StateGraph(VibeCodingState)

    g.add_node("code_gen", code_gen_node)
    g.add_node("check_syntax", check_syntax)

    g.set_entry_point("code_gen")
    g.add_edge("code_gen", "check_syntax")
    g.add_conditional_edges(
        "check_syntax",
        _route_after_syntax,
        {END: END, "code_gen": "code_gen"},
    )

    return g.compile()


# Singletons — compiled once at import time
analysis_graph = build_analysis_graph()
vibe_graph = build_vibe_graph()
