import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
_DRAKON = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "drakon-agent"))
if _DRAKON not in sys.path:
    sys.path.insert(0, _DRAKON)

import pytest
from pipeline.states import AnalysisState


SIMPLE_CODE = """
def add(a, b):
    return a + b
"""

BRANCHING_CODE = """
def classify(n):
    if n < 0:
        return "negative"
    elif n == 0:
        return "zero"
    else:
        return "positive"
"""


def _blank_state(**overrides) -> AnalysisState:
    base: AnalysisState = {
        "source_code": "", "file_path": "test.py",
        "cyclomatic_complexity": 0, "call_graph": {}, "tree_level": "",
        "drakon_type": "", "behavioral_yaml": "", "drakon_ir": [],
        "validation_errors": [], "iteration_count": 0,
    }
    base.update(overrides)
    return base


def test_measure_cc_simple():
    from pipeline.nodes_analysis import measure_cc
    result = measure_cc(_blank_state(source_code=SIMPLE_CODE))
    assert result["cyclomatic_complexity"] >= 1


def test_classify_primitive():
    from pipeline.nodes_analysis import classify_complexity
    result = classify_complexity(_blank_state(cyclomatic_complexity=5))
    assert result["tree_level"] == "primitive"
    assert result["drakon_type"] == "Primitive"


def test_classify_silhouette():
    from pipeline.nodes_analysis import classify_complexity
    result = classify_complexity(_blank_state(cyclomatic_complexity=15))
    assert result["tree_level"] == "silhouette"
    assert result["drakon_type"] == "Silhouette"


def test_ast_translate_produces_valid_ir():
    from pipeline.nodes_analysis import ast_translate
    from validator.ir_validator import validate_ir
    result = ast_translate(_blank_state(source_code=SIMPLE_CODE, tree_level="primitive"))
    assert len(result["drakon_ir"]) > 0
    for ir in result["drakon_ir"]:
        vr = validate_ir(ir)
        assert vr.valid, f"IR invalid: {vr.errors}"


def test_validate_ir_node_passes_for_valid():
    from pipeline.nodes_analysis import validate_ir_node
    from analyzer.ast_analyzer import PythonAnalyzer
    irs = PythonAnalyzer().analyze(SIMPLE_CODE, "test.py")
    result = validate_ir_node(_blank_state(source_code=SIMPLE_CODE, drakon_ir=irs))
    assert result["validation_errors"] == []



def test_analysis_graph_primitive_end_to_end():
    from pipeline.graphs import analysis_graph
    initial = _blank_state(source_code=SIMPLE_CODE, file_path="test.py")
    final = analysis_graph.invoke(initial)
    assert final["tree_level"] == "primitive"
    assert len(final["drakon_ir"]) > 0
    assert final["validation_errors"] == []
