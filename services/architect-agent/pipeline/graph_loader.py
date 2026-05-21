"""Compile DRAKON IR JSON → LangGraph StateGraph."""
import json
from pathlib import Path
from typing import Any
from langgraph.graph import StateGraph, END

from .nodes_analysis import (
    measure_cc,
    classify_complexity as classify,
    ast_translate,
    yaml_gen_node as yaml_gen,
    ir_gen_node as ir_gen,
    validate_ir_node as validate,
    code_gen_node as code_gen,
)
from .nodes_vibe import check_syntax
from .graphs import _route_by_complexity, _route_after_validate, _route_after_syntax
from .states import AnalysisState, VibeCodingState

NODE_REGISTRY: dict[str, Any] = {
    "measure_cc": measure_cc,
    "classify": classify,
    "ast_translate": ast_translate,
    "yaml_gen": yaml_gen,
    "ir_gen": ir_gen,
    "validate": validate,
    "code_gen": code_gen,
    "check_syntax": check_syntax,
}

ROUTER_REGISTRY: dict[str, Any] = {
    "route_by_complexity": _route_by_complexity,
    "route_after_validate": _route_after_validate,
    "route_after_syntax": _route_after_syntax,
}

STATE_REGISTRY: dict[str, Any] = {
    "AnalysisState": AnalysisState,
    "VibeCodingState": VibeCodingState,
}


def _resolve_target(item_id: str, items: dict) -> str:
    """Follow chain to first action/end node; return node content or END sentinel."""
    if item_id not in items:
        return END
    item = items[item_id]
    if item["type"] == "action":
        return item["content"]
    if item["type"] == "end":
        return END
    if item["type"] in ("header",):
        return _resolve_target(item.get("one", ""), items)
    return END


def load_graph_from_ir(ir: dict) -> Any:
    """Build and compile LangGraph graph from DRAKON IR dict."""
    items = ir["items"]
    schema = ir.get("schema", {})
    state_class = STATE_REGISTRY.get(schema.get("state_class", ""), AnalysisState)

    g = StateGraph(state_class)

    # Pass 1: register action nodes
    for item in items.values():
        if item["type"] == "action":
            fn = NODE_REGISTRY.get(item["content"])
            if fn:
                g.add_node(item["content"], fn)

    # Pass 2: set entry point from header
    for item in items.values():
        if item["type"] == "header":
            entry = _resolve_target(item.get("one", ""), items)
            if entry != END:
                g.set_entry_point(entry)
            break

    # Pass 3: wire edges from action nodes
    for item in items.values():
        if item["type"] != "action":
            continue
        node_name = item["content"]
        next_id = item.get("one", "")
        if not next_id:
            continue

        next_item = items.get(next_id, {})

        if next_item.get("type") == "question":
            router_fn = ROUTER_REGISTRY.get(next_item["content"])
            if router_fn:
                yes_target = _resolve_target(next_item.get("one", ""), items)
                no_target = _resolve_target(next_item.get("two", ""), items)
                routing_map = {}
                if yes_target != END:
                    routing_map[yes_target] = yes_target
                else:
                    routing_map[END] = END
                if no_target != END:
                    routing_map[no_target] = no_target
                else:
                    routing_map[END] = END
                g.add_conditional_edges(node_name, router_fn, routing_map)
        else:
            target = _resolve_target(next_id, items)
            if target == END:
                g.add_edge(node_name, END)
            else:
                g.add_edge(node_name, target)

    return g.compile()


def load_graph_from_file(path: str) -> Any:
    with open(path) as f:
        ir = json.load(f)
    return load_graph_from_ir(ir)
