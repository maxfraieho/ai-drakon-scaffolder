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
