"""Pipeline A — pure-Python nodes (no LLM calls)."""
import os
import sys
import importlib.util

_DRAKON_AGENT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "drakon-agent")
)

# Load drakon-agent modules directly from their file paths to avoid
# namespace collision with the local 'analyzer' package.
def _load_drakon_module(rel_path: str, module_name: str):
    """Load a module from drakon-agent by absolute file path."""
    path = os.path.join(_DRAKON_AGENT, rel_path)
    spec = importlib.util.spec_from_file_location(module_name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules.setdefault(module_name, mod)
    spec.loader.exec_module(mod)
    return mod


def _get_python_analyzer():
    # Ensure analyzer package is loaded from drakon-agent (not local stub)
    if "analyzer" not in sys.modules or not hasattr(sys.modules["analyzer"], "ast_analyzer"):
        _load_drakon_module("analyzer/__init__.py", "analyzer")
    if "analyzer.ast_analyzer" not in sys.modules:
        _load_drakon_module("analyzer/ast_analyzer.py", "analyzer.ast_analyzer")
    if "analyzer.cfg_builder" not in sys.modules:
        _load_drakon_module("analyzer/cfg_builder.py", "analyzer.cfg_builder")
    mod = sys.modules["analyzer.ast_analyzer"]
    return mod.PythonAnalyzer


def _get_validate_ir():
    if "validator" not in sys.modules:
        _load_drakon_module("validator/__init__.py", "validator")
    if "validator.ir_validator" not in sys.modules:
        _load_drakon_module("validator/ir_validator.py", "validator.ir_validator")
    mod = sys.modules["validator.ir_validator"]
    return mod.validate_ir


from .states import AnalysisState


def measure_cc(state: AnalysisState) -> dict:
    import radon.complexity as radon_cc
    code = state["source_code"]
    try:
        results = radon_cc.cc_visit(code)
        max_cc = max((r.complexity for r in results), default=1)
    except Exception:
        max_cc = 1
    return {"cyclomatic_complexity": max_cc}


def classify_complexity(state: AnalysisState) -> dict:
    cc = state["cyclomatic_complexity"]
    if cc <= 10:
        return {"tree_level": "primitive", "drakon_type": "Primitive"}
    elif cc <= 20:
        return {"tree_level": "silhouette", "drakon_type": "Silhouette"}
    elif cc <= 50:
        return {"tree_level": "branch", "drakon_type": "Silhouette"}
    else:
        return {"tree_level": "deep", "drakon_type": "Silhouette"}


def ast_translate(state: AnalysisState) -> dict:
    PythonAnalyzer = _get_python_analyzer()
    analyzer = PythonAnalyzer()
    irs = analyzer.analyze(state["source_code"], state["file_path"])
    return {"drakon_ir": irs}


def validate_ir_node(state: AnalysisState) -> dict:
    validate_ir = _get_validate_ir()
    errors: list[str] = []
    for ir in state["drakon_ir"]:
        result = validate_ir(ir)
        if not result.valid:
            errors.extend([f"{ir.get('name','?')}: {e}" for e in result.errors])
    return {"validation_errors": errors}

# ── LLM-powered nodes ─────────────────────────────────────────────────────────
import json
import re
import httpx
import os as _os

_PROXY_URL = _os.getenv("PROXY_URL", "http://localhost:18880/v1")
_PROXY_TOKEN = _os.getenv("PROXY_TOKEN", "freecc")
_PROXY_MODEL = _os.getenv("PROXY_MODEL", "coding-proxy")
_PROXY_PROTOCOL = _os.getenv("PROXY_PROTOCOL", "openai")
_JSON_RE = re.compile(r"```json\s*(\{.*?\}|\[.*?\])\s*```", re.DOTALL)


def _llm(messages: list) -> str:
    if _PROXY_PROTOCOL == "anthropic":
        system_msg = next((m["content"] for m in messages if m["role"] == "system"), "")
        user_msgs = [{"role": m["role"], "content": m["content"]} for m in messages if m["role"] != "system"]
        resp = httpx.post(
            f"{_PROXY_URL}/messages",
            json={"model": _PROXY_MODEL, "system": system_msg, "messages": user_msgs, "max_tokens": 4096},
            headers={"x-api-key": _PROXY_TOKEN, "anthropic-version": "2023-06-01"},
            timeout=120.0,
        )
        resp.raise_for_status()
        return resp.json()["content"][0]["text"]
    else:
        resp = httpx.post(
            f"{_PROXY_URL}/chat/completions",
            json={"model": _PROXY_MODEL, "messages": messages, "temperature": 0.1},
            headers={"Authorization": f"Bearer {_PROXY_TOKEN}"},
            timeout=120.0,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


def yaml_gen_node(state: "AnalysisState") -> dict:
    prompt = (
        "Analyze the following Python code and produce a C4-Behavioral YAML describing "
        "its logical flow, actors, actions, and decision points. "
        "Output ONLY the YAML block in a ```yaml ... ``` fence.\n\n"
        f"File: {state['file_path']}\n"
        f"Complexity level: {state['tree_level']} (CC={state['cyclomatic_complexity']})\n\n"
        f"```python\n{state['source_code'][:4000]}\n```"
    )
    content = _llm([
        {"role": "system", "content": "You are a software architect. Produce concise C4-Behavioral YAML."},
        {"role": "user", "content": prompt},
    ])
    return {"behavioral_yaml": content}


def ir_gen_node(state: "AnalysisState") -> dict:
    prev_errors = state.get("validation_errors", [])
    error_hint = ""
    if prev_errors:
        error_hint = "\n\nPrevious attempt had validation errors:\n" + "\n".join(prev_errors[:5])

    prompt = (
        "Convert the following C4-Behavioral YAML and source code into a DRAKON IR JSON array. "
        "Each element represents one function/method. Required schema per element:\n"
        '{"name": "func_name", "params": "a, b", "items": {"b0": {"type":"branch","branchId":0,"one":"n1"}, '
        '"n1": {"type":"action","content":"...","one":"end"}, "end": {"type":"end"}}}\n'
        "Rules: single end node, b0 mandatory with branchId:0, question nodes need one (yes) and two (no).\n"
        "Output ONLY a ```json [...] ``` block.\n"
        f"{error_hint}\n\n"
        f"YAML:\n{state['behavioral_yaml'][:2000]}\n\n"
        f"Source:\n```python\n{state['source_code'][:3000]}\n```"
    )
    content = _llm([
        {"role": "system", "content": "You are a DRAKON diagram expert. Output valid DRAKON IR JSON only."},
        {"role": "user", "content": prompt},
    ])
    m = _JSON_RE.search(content)
    if m:
        try:
            irs = json.loads(m.group(1))
            if isinstance(irs, dict):
                irs = [irs]
            return {"drakon_ir": irs, "iteration_count": state.get("iteration_count", 0) + 1}
        except (json.JSONDecodeError, ValueError):
            pass
    return {
        "drakon_ir": [],
        "validation_errors": ["LLM output was not valid JSON"],
        "iteration_count": state.get("iteration_count", 0) + 1,
    }


def code_gen_node(state: "VibeCodingState") -> dict:
    from .states import VibeCodingState as _VCS  # noqa: F401 — for type reference only
    prev_errors = state.get("syntax_errors", [])
    error_hint = ""
    if prev_errors:
        error_hint = "\n\nPrevious attempt had syntax errors:\n" + "\n".join(prev_errors[:3])

    ir_str = json.dumps(state["drakon_ir"], indent=2)[:3000]
    prompt = (
        f"Convert the following DRAKON IR diagram into {state['language']} code.\n"
        f"Description: {state.get('description', '')}\n"
        "Output ONLY the code in a code fence, no explanations.\n"
        f"{error_hint}\n\n"
        f"DRAKON IR:\n```json\n{ir_str}\n```"
    )
    content = _llm([
        {"role": "system", "content": f"You are a {state['language']} expert. Convert DRAKON IR to clean code."},
        {"role": "user", "content": prompt},
    ])
    fence_re = re.compile(r"```(?:\w+)?\s*(.*?)```", re.DOTALL)
    m = fence_re.search(content)
    code = m.group(1).strip() if m else content.strip()
    return {"generated_code": code, "iteration_count": state.get("iteration_count", 0) + 1}
