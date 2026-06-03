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
from .nodes_agents import (
    drakon_load_kb, drakon_format_prompt, drakon_parse_result,
    docs_load_kb, docs_format_prompt,
)
from .nodes_ss import (
    ss_detect_audience, ss_load_kb, ss_format_prompt, ss_format_response,
    ss_log_analytics,
)
from .graphs import _route_by_complexity, _route_after_validate, _route_after_syntax
from .states import AnalysisState, VibeCodingState, DrakonAgentState, DocsAgentState, SSAgentState


def llm_call_node(state: dict) -> dict:
    """Universal LLM call node — reads 'llm_prompt' from state."""
    import httpx, os
    proxy_url = os.getenv("PROXY_URL", "http://localhost:18880/v1")
    proxy_token = os.getenv("PROXY_TOKEN", "freecc") or "freecc"
    proxy_model = os.getenv("PROXY_MODEL", "coding-proxy")
    resp = httpx.post(f"{proxy_url}/chat/completions",
        json={"model": proxy_model, "messages": [
            {"role": "user", "content": state.get("llm_prompt", "")}
        ], "temperature": 0.1},
        headers={"Authorization": f"Bearer {proxy_token}"},
        timeout=120.0)
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    return {"llm_reply": content}


def llm_call_with_system(state: dict) -> dict:
    """LLM call that uses 'ss_system' from state as system prompt."""
    import httpx, os
    proxy_url = os.getenv("PROXY_URL", "http://localhost:18880/v1")
    proxy_token = os.getenv("PROXY_TOKEN", "freecc") or "freecc"
    proxy_model = os.getenv("PROXY_MODEL", "coding-proxy")
    system = state.get("ss_system", "")
    prompt = state.get("llm_prompt", "")
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    resp = httpx.post(f"{proxy_url}/chat/completions",
        json={"model": proxy_model, "messages": messages, "temperature": 0.2},
        headers={"Authorization": f"Bearer {proxy_token}"},
        timeout=120.0)
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    return {"llm_reply": content}


NODE_REGISTRY: dict[str, Any] = {
    "measure_cc": measure_cc,
    "classify": classify,
    "ast_translate": ast_translate,
    "yaml_gen": yaml_gen,
    "ir_gen": ir_gen,
    "validate": validate,
    "code_gen": code_gen,
    "check_syntax": check_syntax,
    "drakon_load_kb": drakon_load_kb,
    "drakon_format_prompt": drakon_format_prompt,
    "drakon_parse_result": drakon_parse_result,
    "docs_load_kb": docs_load_kb,
    "docs_format_prompt": docs_format_prompt,
    "llm_call": llm_call_node,
    "llm_call_with_system": llm_call_with_system,
    "ss_detect_audience": ss_detect_audience,
    "ss_load_kb": ss_load_kb,
    "ss_format_prompt": ss_format_prompt,
    "ss_format_response": ss_format_response,
    "ss_log_analytics": ss_log_analytics,
}

ROUTER_REGISTRY: dict[str, Any] = {
    "route_by_complexity": _route_by_complexity,
    "route_after_validate": _route_after_validate,
    "route_after_syntax": _route_after_syntax,
}

STATE_REGISTRY: dict[str, Any] = {
    "AnalysisState": AnalysisState,
    "VibeCodingState": VibeCodingState,
    "DrakonAgentState": DrakonAgentState,
    "DocsAgentState": DocsAgentState,
    "SSAgentState": SSAgentState,
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
