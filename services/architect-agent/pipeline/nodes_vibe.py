"""Pipeline B — pure-Python nodes."""
import ast as _ast

from .states import VibeCodingState


def check_syntax(state: VibeCodingState) -> dict:
    """Validate generated code syntax. Only Python is checked; others pass through."""
    lang = state["language"]
    code = state["generated_code"]
    if lang == "python":
        try:
            _ast.parse(code)
            return {"syntax_errors": []}
        except SyntaxError as e:
            return {"syntax_errors": [f"SyntaxError line {e.lineno}: {e.msg}"]}
    return {"syntax_errors": []}
