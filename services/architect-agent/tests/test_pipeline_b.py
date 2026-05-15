import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from pipeline.states import VibeCodingState

SIMPLE_IR = {
    "name": "add",
    "params": "a, b",
    "items": {
        "b0": {"type": "branch", "branchId": 0, "one": "n1"},
        "n1": {"type": "action", "content": "return a + b", "one": "end"},
        "end": {"type": "end"},
    }
}


def test_syntax_check_valid_python():
    from pipeline.nodes_vibe import check_syntax
    state: VibeCodingState = {
        "drakon_ir": SIMPLE_IR, "description": "", "language": "python",
        "generated_code": "def add(a, b):\n    return a + b\n",
        "syntax_errors": [], "iteration_count": 0,
    }
    result = check_syntax(state)
    assert result["syntax_errors"] == []


def test_syntax_check_invalid_python():
    from pipeline.nodes_vibe import check_syntax
    state: VibeCodingState = {
        "drakon_ir": SIMPLE_IR, "description": "", "language": "python",
        "generated_code": "def add(a b):\n    return a + b\n",
        "syntax_errors": [], "iteration_count": 0,
    }
    result = check_syntax(state)
    assert len(result["syntax_errors"]) > 0


def test_syntax_check_typescript_passthrough():
    from pipeline.nodes_vibe import check_syntax
    state: VibeCodingState = {
        "drakon_ir": SIMPLE_IR, "description": "", "language": "typescript",
        "generated_code": "function add(a: number, b: number): number { return a + b; }",
        "syntax_errors": [], "iteration_count": 0,
    }
    result = check_syntax(state)
    assert result["syntax_errors"] == []
