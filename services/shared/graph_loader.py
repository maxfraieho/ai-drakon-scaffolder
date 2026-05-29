"""Compile DRAKON IR JSON -> LangGraph StateGraph.
Universal version: accepts registries as parameters instead of hardcoded globals.
"""
import json
from pathlib import Path
from typing import Any

# Built-in tools and LLM node factory (lazy import to avoid circular deps)
_BUILT_IN_TOOLS = None
_LLM_NODE_FACTORY = None
from langgraph.graph import StateGraph, END


def _sanitize_node_name(content: str) -> str:
    import re
    if not content:
        return "empty"
    # Replace any non-alphanumeric, non-underscore, non-hyphen character with underscore
    sanitized = re.sub(r'[^a-zA-Z0-9_\-]', '_', content)
    # limit length to avoid overly long node names
    if len(sanitized) > 64:
        import hashlib
        h = hashlib.md5(content.encode('utf-8')).hexdigest()[:8]
        sanitized = f"{sanitized[:50]}_{h}"
    return sanitized


def _resolve_target(item_id: str, items: dict) -> str:
    if item_id not in items:
        return END
    item = items[item_id]
    if item["type"] == "action":
        return _sanitize_node_name(item["content"])
    if item["type"] == "end":
        return END
    if item["type"] in ("header",):
        return _resolve_target(item.get("one", ""), items)
    return END


def _resolve_node_fn(content: str, node_registry: dict):
    """Tool name -> tool fn; natural language -> LLM prompt node."""
    global _BUILT_IN_TOOLS, _LLM_NODE_FACTORY
    if _BUILT_IN_TOOLS is None:
        from services.shared.built_in_tools import BUILT_IN_TOOLS as _T
        from services.shared.llm_node import llm_node_factory as _F
        _BUILT_IN_TOOLS = _T
        _LLM_NODE_FACTORY = _F
    if content in node_registry:
        return node_registry[content]
    if content in _BUILT_IN_TOOLS:
        return _BUILT_IN_TOOLS[content]
    return _LLM_NODE_FACTORY(content)


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
            fn = _resolve_node_fn(item["content"], node_registry)
            g.add_node(_sanitize_node_name(item["content"]), fn)

    for item in items.values():
        if item["type"] == "header":
            entry = _resolve_target(item.get("one", ""), items)
            if entry != END:
                g.set_entry_point(entry)
            break

    for item in items.values():
        if item["type"] != "action":
            continue
        node_name = _sanitize_node_name(item["content"])
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
