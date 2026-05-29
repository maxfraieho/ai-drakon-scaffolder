"""Built-in tools available to all AI-DRAKON agents across all projects.
Add new tools here to make them available in the DRAKON editor node registry.
"""
from typing import Any
from pathlib import Path


def search_kb(state: dict) -> dict:
    """Search the project knowledge base. Uses state["query"] or state["input"]."""
    from services.shared.kb_client import KBClient
    slug = state.get("project_slug", "_default")
    agent = state.get("agent_name", "default")
    kb_dir = Path(f"/home/vokov/projects/{slug}/agents/{agent}/kb")
    if not kb_dir.exists():
        # fallback: search docs/kb/
        kb_dir = Path("/home/vokov/workspace/ai-drakon-scaffolder/docs/kb")
    kb = KBClient(":memory:")
    if kb_dir.exists():
        kb.index_documents(kb_dir)
    query = state.get("query") or state.get("input", "")
    results = kb.search(query, top_k=5) if query else []
    context = "\n\n".join(results)
    return {**state, "kb_results": results, "context": context}


def analyze_code(state: dict) -> dict:
    """Analyze code using AST. Uses state["input"] as source code."""
    import ast
    source = state.get("input", "")
    try:
        tree = ast.parse(source)
        nodes = [type(n).__name__ for n in ast.walk(tree)]
        summary = f"AST nodes: {len(nodes)}. Types: {set(list(nodes)[:10])}"
    except SyntaxError as e:
        summary = f"Syntax error: {e}"
    return {**state, "code_analysis": summary, "output": summary}


def generate_ir(state: dict) -> dict:
    """Generate minimal DRAKON IR from analysis result."""
    analysis = state.get("code_analysis", state.get("input", ""))
    ir = {
        "name": state.get("agent_name", "generated"),
        "items": {
            "h": {"type": "header", "content": "Generated", "one": "n1"},
            "n1": {"type": "action", "content": analysis[:50], "one": "end"},
            "end": {"type": "end"}
        }
    }
    import json
    return {**state, "generated_ir": ir, "output": json.dumps(ir, ensure_ascii=False)}


def save_to_project(state: dict) -> dict:
    """Save output to project storage."""
    slug = state.get("project_slug", "_default")
    agent = state.get("agent_name", "default")
    output = state.get("output", str(state))
    import json, datetime
    out_dir = Path(f"/home/vokov/projects/{slug}/agents/{agent}/results")
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    out_file = out_dir / f"result_{ts}.json"
    out_file.write_text(json.dumps({"output": output, "state": str(state)[:500]}, ensure_ascii=False))
    return {**state, "saved_to": str(out_file)}


BUILT_IN_TOOLS: dict[str, Any] = {
    "search_kb":      search_kb,
    "analyze_code":   analyze_code,
    "generate_ir":    generate_ir,
    "save_to_project": save_to_project,
}
