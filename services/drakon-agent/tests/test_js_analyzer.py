"""Tests for JSAnalyzer — JS/TS → DRAKON IR."""
import pytest
from analyzer.js_analyzer import JSAnalyzer


def test_simple_function():
    code = "function hello(x) { return x + 1; }"
    results = JSAnalyzer().analyze(code, "module.js")
    assert len(results) == 1
    fn = results[0]
    assert fn["name"] == "hello"
    assert fn["params"] == "x"
    assert "end" in fn["items"]


def test_arrow_function_const():
    code = "const add = (a, b) => a + b;"
    results = JSAnalyzer().analyze(code, "module.js")
    assert len(results) == 1
    assert results[0]["name"] == "add"


def test_if_statement_creates_question():
    code = """function check(x) {
      if (x > 0) {
        return x;
      }
      return 0;
    }"""
    results = JSAnalyzer().analyze(code, "module.js")
    assert len(results) == 1
    items = results[0]["items"]
    question_nodes = [v for v in items.values() if v.get("type") == "question"]
    assert len(question_nodes) >= 1
    assert "x > 0" in question_nodes[0]["content"]


def test_typescript_file():
    code = "function greet(name: string): string { return 'Hi ' + name; }"
    results = JSAnalyzer().analyze(code, "module.ts")
    assert len(results) == 1
    assert results[0]["name"] == "greet"


def test_tsx_file():
    code = "const Comp = (props: {x: number}) => { return props.x; };"
    results = JSAnalyzer().analyze(code, "module.tsx")
    assert len(results) == 1


def test_empty_code():
    results = JSAnalyzer().analyze("", "module.js")
    assert results == []


def test_no_functions():
    code = "const x = 42; console.log(x);"
    results = JSAnalyzer().analyze(code, "module.js")
    assert results == []


def test_for_loop_creates_question():
    code = """function sum(arr) {
      let total = 0;
      for (let i = 0; i < arr.length; i++) {
        total += arr[i];
      }
      return total;
    }"""
    results = JSAnalyzer().analyze(code, "module.js")
    assert len(results) == 1
    items = results[0]["items"]
    question_nodes = [v for v in items.values() if v.get("type") == "question"]
    assert len(question_nodes) >= 1


# --- routing tests ---
from fastapi.testclient import TestClient
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app

client = TestClient(app)

def test_route_js_by_filename():
    resp = client.post("/analyze", json={
        "code": "function hello(x) { return x; }",
        "filename": "module.js",
        "refine": False
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 1
    assert data["diagrams"][0]["name"] == "hello"

def test_route_ts_by_filename():
    resp = client.post("/analyze", json={
        "code": "function greet(name: string): string { return name; }",
        "filename": "module.ts",
        "refine": False
    })
    assert resp.status_code == 200
    assert resp.json()["count"] == 1

def test_route_python_still_works():
    resp = client.post("/analyze", json={
        "code": "def hello(x):\n    return x + 1",
        "filename": "module.py",
        "refine": False
    })
    assert resp.status_code == 200
    assert resp.json()["count"] == 1
