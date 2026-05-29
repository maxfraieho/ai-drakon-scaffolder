"""Compile DRAKON IR JSON -> LangGraph StateGraph.
Universal version: accepts registries as parameters instead of hardcoded globals.
"""
import json
from pathlib import Path
from typing import Any
from langgraph.graph import StateGraph, END


def _resolve_target(item_id: str, items: dict) -> str:
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


def load_graph_from_ir(
    ir: dict,
    node_registry: dict[str, Any],
    router_registry: dict[str, Any],
    state_registry: dict[str, Any],
) -> Any:
    """Build and compile LangGraph graph from DRAKON IR + per-agent registries."""
    items = ir["items"]
    schema = ir.get("schema", {})
    default_state = next(iter(state_registry.values())) if state_registry else dict
    state_class = state_registry.get(schema.get("state_class", ""), default_state)

    g = StateGraph(state_class)

    for item in items.values():
        if item["type"] == "action":
            fn = node_registry.get(item["content"])
            if fn:
                g.add_node(item["content"], fn)

    for item in items.values():
        if item["type"] == "header":
            entry = _resolve_target(item.get("one", ""), items)
            if entry != END:
                g.set_entry_point(entry)
            break

    for item in items.values():
        if item["type"] != "action":
            continue
        node_name = item["content"]
        next_id = item.get("one", "")
        if not next_id:
            continue
        next_item = items.get(next_id, {})
        if next_item.get("type") == "question":
            router_fn = router_registry.get(next_item["content"])
            if router_fn:
                yes_target = _resolve_target(next_item.get("one", ""), items)
                no_target = _resolve_target(next_item.get("two", ""), items)
                routing_map = {}
                routing_map[yes_target if yes_target != END else END] = yes_target if yes_target != END else END
                routing_map[no_target if no_target != END else END] = no_target if no_target != END else END
                g.add_conditional_edges(node_name, router_fn, routing_map)
        else:
            target = _resolve_target(next_id, items)
            g.add_edge(node_name, END if target == END else target)

    return g.compile()


def load_graph_from_file(
    path: str,
    node_registry: dict[str, Any],
    router_registry: dict[str, Any],
    state_registry: dict[str, Any],
) -> Any:
    with open(path) as f:
        ir = json.load(f)
    return load_graph_from_ir(ir, node_registry, router_registry, state_registry)
