"""Tests for AI-DRAKON unified agent framework."""
import sys
import tempfile
from pathlib import Path
import pytest

# Ensure services directory is in sys.path
sys.path.insert(0, str(Path(__file__).parents[3]))


# ---- Test 1: graph compilation (tool node) ----

def test_tool_node_compiles():
    from services.shared.graph_loader import load_graph_from_ir
    ir = {
        "name": "test",
        "items": {
            "h":   {"type": "header", "content": "Test", "one": "n1"},
            "n1":  {"type": "action", "content": "search_kb", "one": "end"},
            "end": {"type": "end"},
        }
    }
    graph = load_graph_from_ir(ir, {}, {}, {})
    assert graph is not None, "Graph should compile"


# ---- Test 2: LLM prompt node compiles ----

def test_llm_prompt_node_compiles():
    from services.shared.graph_loader import load_graph_from_ir
    ir = {
        "name": "test_llm",
        "items": {
            "h":   {"type": "header", "content": "LLM Test", "one": "n1"},
            "n1":  {"type": "action",
                    "content": "Проаналізуй: є загроза? JSON: {threat: bool}",
                    "one": "end"},
            "end": {"type": "end"},
        }
    }
    graph = load_graph_from_ir(ir, {}, {}, {})
    assert graph is not None, "LLM prompt pipeline should compile"


# ---- Test 3: mixed pipeline (tool + prompt) ----

def test_mixed_pipeline_compiles():
    from services.shared.graph_loader import load_graph_from_ir
    ir = {
        "name": "mixed",
        "items": {
            "h":   {"type": "header", "content": "Mixed", "one": "n1"},
            "n1":  {"type": "action", "content": "search_kb", "one": "n2"},
            "n2":  {"type": "action", "content": "Оціни та відповідь", "one": "end"},
            "end": {"type": "end"},
        }
    }
    graph = load_graph_from_ir(ir, {}, {}, {})
    assert graph is not None


# ---- Test 4: KB search ----

def test_kb_search():
    from services.shared.kb_client import KBClient
    with tempfile.TemporaryDirectory() as tmpdir:
        docs_dir = Path(tmpdir)
        (docs_dir / "test.md").write_text(
            "## UAV Threats\nKamikaze fly at 50-200m. Acoustic signature.\n\n"
            "## Safe\nBirds and wind are safe.", encoding="utf-8"
        )
        kb = KBClient(":memory:")
        n = kb.index_documents(docs_dir)
        assert n > 0, f"Should index sections, got {n}"
        results = kb.search("kamikaze")
        assert len(results) > 0, "Should find results"
        assert "kamikaze" in results[0].lower() or "acoustic" in results[0].lower()


# ---- Test 5: built_in_tools registry ----

def test_built_in_tools_registry():
    from services.shared.built_in_tools import BUILT_IN_TOOLS
    assert "search_kb" in BUILT_IN_TOOLS
    assert "analyze_code" in BUILT_IN_TOOLS
    assert callable(BUILT_IN_TOOLS["search_kb"])


# ---- Test 6: _resolve_node_fn priority ----

def test_resolve_priority():
    from services.shared.graph_loader import _resolve_node_fn
    from services.shared.built_in_tools import BUILT_IN_TOOLS

    # Custom registry takes priority
    custom_fn = lambda s: s
    result = _resolve_node_fn("search_kb", {"search_kb": custom_fn})
    assert result is custom_fn, "Custom registry should take priority"

    # Built-in tool
    result = _resolve_node_fn("search_kb", {})
    assert result is BUILT_IN_TOOLS["search_kb"], "Built-in tool should be resolved"

    # LLM fallback
    result = _resolve_node_fn("Будь-який промпт тут", {})
    assert callable(result), "Unknown content should create LLM node"
    assert "llm_" in result.__name__, f"LLM node name should start with llm_, got {result.__name__}"
