---
tags:
  - domain:plan
  - status:active
  - format:plan
created: 2026-05-15
updated: 2026-05-28
tier: 3
title: "План реалізації конвеєра LangGraph"
lang: uk
---

# План реалізації конвеєра LangGraph

> **Для Claude:** НЕОБХІДНИЙ SUB-SKILL: Використовуйте superpowers:executing-plans для реалізації цього плану завдання за завданням.

**Мета:** Додати два конвеєри валідаційного циклу LangGraph до `architect-agent`: Конвеєр A (перетворює вихідний код → DRAKON IR з валідацією Ralph Loop) та Конвеєр B (генерує код з моделі DRAKON IR з циклом валідації синтаксису).

**Архітектура:** Обидва конвеєри живуть у новому модулі `services/architect-agent/pipeline/` як об'єкти LangGraph `StateGraph`. Існуючий аналізатор `PythonAnalyzer` (AST→IR) з `drakon-agent` та функція `ir_validator.validate_ir` перевикористовуються за допомогою трюку з `sys.path`, який вже використовується в `architect_chat.py`. Нові кінцеві точки FastAPI `POST /pipeline/analyze` та `POST /pipeline/generate` приймають запити та повертають `job_id`; `GET /pipeline/status/{job_id}` транслює результати через SSE або повертає фінальні корисні дані (payload).

**Стек технологій:** Python 3.12, FastAPI, LangGraph 0.2.x, radon (цикломатична складність), стандартна бібліотека `ast` (валідація синтаксису для Конвеєра B), існуючий проксі httpx для викликів LLM. Системний Python (новий venv не потрібен).

---

## Завдання 1: Встановлення залежностей

**Файли:**
- Змінити: `services/architect-agent/pyproject.toml`

**Крок 1: Встановити пакети у системний Python на сервері**

```bash
ssh vokov@192.168.3.184 "pip3 install langgraph radon networkx 2>&1 | tail -5"
```

Очікуваний результат: `Successfully installed langgraph-...` тощо. Усі три в одній команді.

**Крок 2: Перевірка**

```bash
ssh vokov@192.168.3.184 "python3 -c 'import langgraph; import radon; import networkx; print(\"OK\")'"
```

Очікуваний результат: `OK`

**Крок 3: Оновити pyproject.toml на сервері**

Додати до `dependencies` у `services/architect-agent/pyproject.toml`:
```toml
    "langgraph>=0.2.0",
    "radon>=6.0.1",
    "networkx>=3.0",
```

**Крок 4: Коміт**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup && git add services/architect-agent/pyproject.toml && git commit -m 'chore: add langgraph, radon, networkx deps to architect-agent'"
```

---

## Завдання 2: Створення скелета модуля конвеєра

**Файли:**
- Створити: `services/architect-agent/pipeline/__init__.py`
- Створити: `services/architect-agent/pipeline/states.py`
- Створити: `services/architect-agent/pipeline/job_store.py`

**Крок 1: Створити `__init__.py` (порожній)**

```python
# pipeline/__init__.py
```

**Крок 2: Створити `states.py` зі схемами TypedDict**

```python
# pipeline/states.py
from typing import TypedDict


class AnalysisState(TypedDict):
    source_code: str
    file_path: str
    cyclomatic_complexity: int
    call_graph: dict
    tree_level: str          # "primitive" | "silhouette" | "branch" | "deep"
    drakon_type: str         # "Primitive" | "Silhouette"
    behavioral_yaml: str
    drakon_ir: list          # список словників IR з PythonAnalyzer або LLM
    validation_errors: list[str]
    iteration_count: int


class VibeCodingState(TypedDict):
    drakon_ir: dict          # одна діаграма DRAKON IR
    description: str
    language: str            # "python" | "typescript" | "javascript"
    generated_code: str
    syntax_errors: list[str]
    iteration_count: int
```

**Крок 3: Створити `job_store.py`**

```python
# pipeline/job_store.py
import uuid
from typing import Literal
from dataclasses import dataclass, field


JobStatus = Literal["pending", "running", "done", "error"]


@dataclass
class Job:
    job_id: str
    status: JobStatus = "pending"
    result: dict = field(default_factory=dict)
    error: str = ""


_store: dict[str, Job] = {}


def create_job() -> str:
    jid = str(uuid.uuid4())
    _store[jid] = Job(job_id=jid)
    return jid


def get_job(job_id: str) -> Job | None:
    return _store.get(job_id)


def update_job(job_id: str, status: JobStatus, result: dict = None, error: str = ""):
    job = _store.get(job_id)
    if job:
        job.status = status
        if result is not None:
            job.result = result
        if error:
            job.error = error
```

**Крок 4: Скопіювати файли на сервер**

```bash
scp /home/vokov/workspace/ai-drakon-setup/services/architect-agent/pipeline/__init__.py vokov@192.168.3.184:/home/vokov/workspace/ai-drakon-setup/services/architect-agent/pipeline/
scp /home/vokov/workspace/ai-drakon-setup/services/architect-agent/pipeline/states.py vokov@192.168.3.184:/home/vokov/workspace/ai-drakon-setup/services/architect-agent/pipeline/
scp /home/vokov/workspace/ai-drakon-setup/services/architect-agent/pipeline/job_store.py vokov@192.168.3.184:/home/vokov/workspace/ai-drakon-setup/services/architect-agent/pipeline/
```

**Крок 5: Коміт**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup && git add services/architect-agent/pipeline/ && git commit -m 'feat: pipeline module skeleton with TypedDict states and job store'"
```

---

## Завдання 3: Написання тестів для вузлів Конвеєра A, які не проходять

**Файли:**
- Створити: `services/architect-agent/tests/test_pipeline_a.py`

**Крок 1: Написати файл тестів**

```python
# tests/test_pipeline_a.py
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "drakon-agent"))

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


def test_measure_cc_simple():
    from pipeline.nodes_analysis import measure_cc
    state: AnalysisState = {
        "source_code": SIMPLE_CODE, "file_path": "test.py",
        "cyclomatic_complexity": 0, "call_graph": {}, "tree_level": "",
        "drakon_type": "", "behavioral_yaml": "", "drakon_ir": [],
        "validation_errors": [], "iteration_count": 0,
    }
    result = measure_cc(state)
    assert result["cyclomatic_complexity"] >= 1


def test_classify_primitive():
    from pipeline.nodes_analysis import classify_complexity
    state: AnalysisState = {
        "source_code": "", "file_path": "", "cyclomatic_complexity": 5,
        "call_graph": {}, "tree_level": "", "drakon_type": "",
        "behavioral_yaml": "", "drakon_ir": [], "validation_errors": [], "iteration_count": 0,
    }
    result = classify_complexity(state)
    assert result["tree_level"] == "primitive"
    assert result["drakon_type"] == "Primitive"


def test_classify_silhouette():
    from pipeline.nodes_analysis import classify_complexity
    state: AnalysisState = {
        "source_code": "", "file_path": "", "cyclomatic_complexity": 15,
        "call_graph": {}, "tree_level": "", "drakon_type": "",
        "behavioral_yaml": "", "drakon_ir": [], "validation_errors": [], "iteration_count": 0,
    }
    result = classify_complexity(state)
    assert result["tree_level"] == "silhouette"
    assert result["drakon_type"] == "Silhouette"


def test_ast_translate_produces_valid_ir():
    from pipeline.nodes_analysis import ast_translate
    from validator.ir_validator import validate_ir
    state: AnalysisState = {
        "source_code": SIMPLE_CODE, "file_path": "test.py",
        "cyclomatic_complexity": 1, "call_graph": {}, "tree_level": "primitive",
        "drakon_type": "Primitive", "behavioral_yaml": "", "drakon_ir": [],
        "validation_errors": [], "iteration_count": 0,
    }
    result = ast_translate(state)
    assert len(result["drakon_ir"]) > 0
    for ir in result["drakon_ir"]:
        vr = validate_ir(ir)
        assert vr.valid, f"IR invalid: {vr.errors}"


def test_validate_ir_node_passes_for_valid():
    from pipeline.nodes_analysis import validate_ir_node
    # Використати відомо валідний IR з PythonAnalyzer
    from analyzer.ast_analyzer import PythonAnalyzer
    irs = PythonAnalyzer().analyze(SIMPLE_CODE, "test.py")
    state: AnalysisState = {
        "source_code": SIMPLE_CODE, "file_path": "test.py",
        "cyclomatic_complexity": 1, "call_graph": {}, "tree_level": "primitive",
        "drakon_type": "Primitive", "behavioral_yaml": "", "drakon_ir": irs,
        "validation_errors": [], "iteration_count": 0,
    }
    result = validate_ir_node(state)
    assert result["validation_errors"] == []
```

> **Примітка:** `test_validate_ir_node_passes_for_valid` імпортує з `analyzer.ast_analyzer`, який знаходиться в `drakon-agent` за допомогою `sys.path`. Це зроблено навмисно — той самий патерн, що й у `architect_chat.py`.

**Крок 2: Запустити тести — очікується ImportError (nodes_analysis ще не існує)**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup/services/architect-agent && python3 -m pytest tests/test_pipeline_a.py -v 2>&1 | head -30"
```

Очікуваний результат: `ImportError: cannot import name 'nodes_analysis'` або `ModuleNotFoundError`

**Крок 3: Закомітити файл тестів**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup && git add services/architect-agent/tests/test_pipeline_a.py && git commit -m 'test: failing tests for Pipeline A nodes'"
```

---

## Завдання 4: Реалізація вузлів Конвеєра A (чисті Python-вузли)

**Файли:**
- Створити: `services/architect-agent/pipeline/nodes_analysis.py`

**Крок 1: Написати `nodes_analysis.py`**

```python
# pipeline/nodes_analysis.py
"""Pipeline A — pure-Python nodes (no LLM calls)."""
import os
import sys

import radon.complexity as radon_cc
import radon.visitors as radon_v

_DRAKON_AGENT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "drakon-agent")
)
if _DRAKON_AGENT not in sys.path:
    sys.path.append(_DRAKON_AGENT)

from analyzer.ast_analyzer import PythonAnalyzer
from validator.ir_validator import validate_ir

from .states import AnalysisState


def measure_cc(state: AnalysisState) -> dict:
    """Measure McCabe Cyclomatic Complexity with radon."""
    code = state["source_code"]
    try:
        results = radon_cc.cc_visit(code)
        if results:
            max_cc = max(r.complexity for r in results)
        else:
            max_cc = 1
    except Exception:
        max_cc = 1
    return {"cyclomatic_complexity": max_cc}


def classify_complexity(state: AnalysisState) -> dict:
    """Map CC score to DRAKON tree level and diagram type."""
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
    """Use existing PythonAnalyzer for low-CC code (CC <= 10)."""
    analyzer = PythonAnalyzer()
    irs = analyzer.analyze(state["source_code"], state["file_path"])
    return {"drakon_ir": irs}


def validate_ir_node(state: AnalysisState) -> dict:
    """Validate all IR dicts, accumulate errors."""
    errors: list[str] = []
    for ir in state["drakon_ir"]:
        result = validate_ir(ir)
        if not result.valid:
            errors.extend([f"{ir.get('name','?')}: {e}" for e in result.errors])
    return {"validation_errors": errors}
```

**Крок 2: Запустити тести — очікується 5 пройдених тестів (PASSED)**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup/services/architect-agent && python3 -m pytest tests/test_pipeline_a.py -v 2>&1"
```

Очікуваний результат: 5 PASSED

**Крок 3: Коміт**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup && git add services/architect-agent/pipeline/nodes_analysis.py && git commit -m 'feat: Pipeline A pure-Python nodes (cc measure, classify, ast_translate, validate)'"
```

---

## Завдання 5: Написання тестів для вузлів Конвеєра B, які не проходять

**Файли:**
- Створити: `services/architect-agent/tests/test_pipeline_b.py`

**Крок 1: Написати файл тестів**

```python
# tests/test_pipeline_b.py
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
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
```

**Крок 2: Запустити — очікується ImportError**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup/services/architect-agent && python3 -m pytest tests/test_pipeline_b.py -v 2>&1 | head -20"
```

Очікуваний результат: `ModuleNotFoundError: No module named 'pipeline.nodes_vibe'`

**Крок 3: Коміт**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup && git add services/architect-agent/tests/test_pipeline_b.py && git commit -m 'test: failing tests for Pipeline B syntax check node'"
```

---

## Завдання 6: Реалізація чистого Python-вузла Конвеєра B

**Файли:**
- Створити: `services/architect-agent/pipeline/nodes_vibe.py`

**Крок 1: Написати `nodes_vibe.py`**

```python
# pipeline/nodes_vibe.py
"""Pipeline B — pure-Python nodes."""
import ast

from .states import VibeCodingState


def check_syntax(state: VibeCodingState) -> dict:
    """Validate generated code syntax. Only Python is checked; others pass through."""
    lang = state["language"]
    code = state["generated_code"]
    if lang == "python":
        try:
            ast.parse(code)
            return {"syntax_errors": []}
        except SyntaxError as e:
            return {"syntax_errors": [f"SyntaxError line {e.lineno}: {e.msg}"]}
    # TypeScript/JavaScript: standard library cannot check, pass through for now
    return {"syntax_errors": []}
```

**Крок 2: Запустити тести**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup/services/architect-agent && python3 -m pytest tests/test_pipeline_b.py -v 2>&1"
```

Очікуваний результат: 3 PASSED

**Крок 3: Коміт**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup && git add services/architect-agent/pipeline/nodes_vibe.py && git commit -m 'feat: Pipeline B syntax-check node'"
```

---

## Завдання 7: Реалізація LLM-вузлів для Конвеєра A

**Файли:**
- Змінити: `services/architect-agent/pipeline/nodes_analysis.py`

Вузли LLM використовують той самий шаблон проксі, що й в `architect_chat.py`.

**Крок 1: Додати `yaml_gen_node` та `ir_gen_node` до `nodes_analysis.py`**

Додати в кінець `pipeline/nodes_analysis.py`:

```python
import json
import os
import re
import httpx

_PROXY_URL = os.getenv("PROXY_URL", "http://localhost:18880/v1")
_PROXY_TOKEN = os.getenv("PROXY_TOKEN", "freecc")
_PROXY_MODEL = os.getenv("PROXY_MODEL", "coding-proxy")
_JSON_RE = re.compile(r"```json\s*(\{.*?\}|\[.*?\])\s*```", re.DOTALL)


def _llm(messages: list[dict]) -> str:
    resp = httpx.post(
        f"{_PROXY_URL}/chat/completions",
        json={"model": _PROXY_MODEL, "messages": messages, "temperature": 0.1},
        headers={"Authorization": f"Bearer {_PROXY_TOKEN}"},
        timeout=120.0,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def yaml_gen_node(state: AnalysisState) -> dict:
    """LLM: source code → C4-Behavioral YAML description."""
    prompt = (
        "Analyze the following Python code and produce a C4-Behavioral YAML that describes "
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


def ir_gen_node(state: AnalysisState) -> dict:
    """LLM: C4-B YAML + source code → DRAKON IR JSON list."""
    prev_errors = state.get("validation_errors", [])
    error_hint = ""
    if prev_errors:
        error_hint = f"\n\nPrevious attempt had validation errors:\n" + "\n".join(prev_errors[:5])

    prompt = (
        "Convert the following C4-Behavioral YAML and source code into a DRAKON IR JSON array. "
        "Each element represents one function/method. Required schema per element:\n"
        '{"name": "func_name", "params": "a, b", "items": {"b0": {"type":"branch","branchId":0,"one":"n1"}, '
        '"n1": {"type":"action","content":"...","one":"end"}, "end": {"type":"end"}}}\n'
        "Rules: single 'end' node, b0 mandatory with branchId:0, question nodes need 'one' (yes) and 'two' (no).\n"
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
        except json.JSONDecodeError:
            pass
    return {"drakon_ir": [], "validation_errors": ["LLM output was not valid JSON"],
            "iteration_count": state.get("iteration_count", 0) + 1}


def code_gen_node(state: VibeCodingState) -> dict:
    """LLM: DRAKON IR → source code in requested language."""
    prev_errors = state.get("syntax_errors", [])
    error_hint = ""
    if prev_errors:
        error_hint = f"\n\nPrevious attempt had syntax errors:\n" + "\n".join(prev_errors[:3])

    ir_str = json.dumps(state["drakon_ir"], indent=2)[:3000]
    prompt = (
        f"Convert the following DRAKON IR diagram into {state['language']} code.\n"
        f"Description: {state.get('description','')}\n"
        "Output ONLY the code in a code fence, no explanations.\n"
        f"{error_hint}\n\n"
        f"DRAKON IR:\n```json\n{ir_str}\n```"
    )
    content = _llm([
        {"role": "system", "content": f"You are a {state['language']} expert. Convert DRAKON IR to clean code."},
        {"role": "user", "content": prompt},
    ])
    # Extract code block
    fence_re = re.compile(r"```(?:\w+)?\s*(.*?)```", re.DOTALL)
    m = fence_re.search(content)
    code = m.group(1).strip() if m else content.strip()
    return {"generated_code": code, "iteration_count": state.get("iteration_count", 0) + 1}
```

> **Примітка:** `code_gen_node` тимчасово розміщено в `nodes_analysis.py`. У майбутньому його слід перемістити до `nodes_vibe.py`, але уникайте передчасного рефакторингу.

**Крок 2: Швидкий димовий тест**

```bash
ssh vokov@192.168.3.184 "python3 -c 'from pipeline.nodes_analysis import yaml_gen_node, ir_gen_node, code_gen_node; print(\"OK\")'"
```

Очікуваний результат: `OK`

**Крок 3: Коміт**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup && git add services/architect-agent/pipeline/nodes_analysis.py && git commit -m 'feat: LLM nodes for Pipeline A (yaml_gen, ir_gen) and Pipeline B (code_gen)'"
```

---

## Завдання 8: Підключення LangGraph StateGraphs

**Файли:**
- Створити: `services/architect-agent/pipeline/graphs.py`

**Крок 1: Написати `graphs.py`**

```python
# pipeline/graphs.py
"""LangGraph StateGraph definitions for Pipeline A and Pipeline B."""
from langgraph.graph import StateGraph, END

from .states import AnalysisState, VibeCodingState
from .nodes_analysis import (
    measure_cc, classify_complexity, ast_translate,
    validate_ir_node, yaml_gen_node, ir_gen_node, code_gen_node,
)
from .nodes_vibe import check_syntax

MAX_ITERATIONS = 3


# ── Pipeline A: Code → DRAKON IR ─────────────────────────────────────────────

def _route_by_complexity(state: AnalysisState) -> str:
    """After classify: primitive → ast_translate, else → yaml_gen."""
    if state["tree_level"] == "primitive":
        return "ast_translate"
    return "yaml_gen"


def _route_after_validate(state: AnalysisState) -> str:
    """After validate: no errors → END, else retry ir_gen (Ralph Loop)."""
    if not state["validation_errors"]:
        return END
    if state["iteration_count"] >= MAX_ITERATIONS:
        return END  # give up, return best effort
    return "ir_gen"


def build_analysis_graph() -> StateGraph:
    g = StateGraph(AnalysisState)

    g.add_node("measure_cc", measure_cc)
    g.add_node("classify", classify_complexity)
    g.add_node("ast_translate", ast_translate)
    g.add_node("yaml_gen", yaml_gen_node)
    g.add_node("ir_gen", ir_gen_node)
    g.add_node("validate", validate_ir_node)

    g.set_entry_point("measure_cc")
    g.add_edge("measure_cc", "classify")
    g.add_conditional_edges("classify", _route_by_complexity,
                            {"ast_translate": "ast_translate", "yaml_gen": "yaml_gen"})
    g.add_edge("ast_translate", "validate")
    g.add_edge("yaml_gen", "ir_gen")
    g.add_edge("ir_gen", "validate")
    g.add_conditional_edges("validate", _route_after_validate,
                            {END: END, "ir_gen": "ir_gen"})

    return g.compile()


# ── Pipeline B: DRAKON IR → Code ─────────────────────────────────────────────

def _route_after_syntax(state: VibeCodingState) -> str:
    """After check_syntax: no errors → END, else retry code_gen."""
    if not state["syntax_errors"]:
        return END
    if state["iteration_count"] >= MAX_ITERATIONS:
        return END
    return "code_gen"


def build_vibe_graph() -> StateGraph:
    g = StateGraph(VibeCodingState)

    g.add_node("code_gen", code_gen_node)
    g.add_node("check_syntax", check_syntax)

    g.set_entry_point("code_gen")
    g.add_edge("code_gen", "check_syntax")
    g.add_conditional_edges("check_syntax", _route_after_syntax,
                            {END: END, "code_gen": "code_gen"})

    return g.compile()


# Singletons — compiled once at import time
analysis_graph = build_analysis_graph()
vibe_graph = build_vibe_graph()
```

**Крок 2: Швидкий тест компіляції графа**

```bash
ssh vokov@192.168.3.184 "python3 -c 'from pipeline.graphs import analysis_graph, vibe_graph; print(\"Graphs OK\")'"
```

Очікуваний результат: `Graphs OK`

**Крок 3: Коміт**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup && git add services/architect-agent/pipeline/graphs.py && git commit -m 'feat: LangGraph StateGraphs for Pipeline A (analysis) and B (vibe-coding)'"
```

---

## Завдання 9: Написання інтеграційного тесту для повного Конвеєра A (швидкий шлях)

**Файли:**
- Змінити: `services/architect-agent/tests/test_pipeline_a.py`

**Крок 1: Додати інтеграційний тест графа**

Додати в кінець `tests/test_pipeline_a.py`:

```python
def test_analysis_graph_primitive_end_to_end():
    """Pipeline A on a simple function should produce valid IR without LLM."""
    from pipeline.graphs import analysis_graph
    initial: AnalysisState = {
        "source_code": SIMPLE_CODE, "file_path": "test.py",
        "cyclomatic_complexity": 0, "call_graph": {}, "tree_level": "",
        "drakon_type": "", "behavioral_yaml": "", "drakon_ir": [],
        "validation_errors": [], "iteration_count": 0,
    }
    final = analysis_graph.invoke(initial)
    assert final["tree_level"] == "primitive"
    assert len(final["drakon_ir"]) > 0
    assert final["validation_errors"] == []
```

**Крок 2: Запустити**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup/services/architect-agent && python3 -m pytest tests/test_pipeline_a.py::test_analysis_graph_primitive_end_to_end -v 2>&1"
```

Очікуваний результат: PASSED

**Крок 3: Запустити всі тести Конвеєра A**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup/services/architect-agent && python3 -m pytest tests/test_pipeline_a.py -v 2>&1"
```

Очікуваний результат: Усі PASSED (5 unit + 1 integration = 6)

**Крок 4: Коміт**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup && git add services/architect-agent/tests/test_pipeline_a.py && git commit -m 'test: end-to-end Pipeline A integration test (primitive path, no LLM)'"
```

---

## Завдання 10: Додавання кінцевих точок API FastAPI для конвеєрів

**Файли:**
- Створити: `services/architect-agent/pipeline_route.py`
- Змінити: `services/architect-agent/main.py`

**Крок 1: Написати `pipeline_route.py`**

```python
# pipeline_route.py
"""FastAPI router for /pipeline/* endpoints."""
import asyncio
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from pipeline.graphs import analysis_graph, vibe_graph
from pipeline.states import AnalysisState, VibeCodingState
from pipeline.job_store import create_job, get_job, update_job

router = APIRouter(prefix="/pipeline")
_executor = ThreadPoolExecutor(max_workers=4)


class AnalyzeRequest(BaseModel):
    source_code: str
    file_path: str = "module.py"


class GenerateRequest(BaseModel):
    drakon_ir: dict
    description: str = ""
    language: str = "python"


@router.post("/analyze")
async def analyze(req: AnalyzeRequest):
    """Start Pipeline A job. Returns job_id immediately."""
    job_id = create_job()
    update_job(job_id, "running")

    def run():
        try:
            initial: AnalysisState = {
                "source_code": req.source_code,
                "file_path": req.file_path,
                "cyclomatic_complexity": 0,
                "call_graph": {},
                "tree_level": "",
                "drakon_type": "",
                "behavioral_yaml": "",
                "drakon_ir": [],
                "validation_errors": [],
                "iteration_count": 0,
            }
            final = analysis_graph.invoke(initial)
            update_job(job_id, "done", result={
                "drakon_ir": final["drakon_ir"],
                "tree_level": final["tree_level"],
                "cyclomatic_complexity": final["cyclomatic_complexity"],
                "validation_errors": final["validation_errors"],
            })
        except Exception as e:
            update_job(job_id, "error", error=str(e))

    asyncio.get_event_loop().run_in_executor(_executor, run)
    return {"job_id": job_id}


@router.post("/generate")
async def generate(req: GenerateRequest):
    """Start Pipeline B job. Returns job_id immediately."""
    job_id = create_job()
    update_job(job_id, "running")

    def run():
        try:
            initial: VibeCodingState = {
                "drakon_ir": req.drakon_ir,
                "description": req.description,
                "language": req.language,
                "generated_code": "",
                "syntax_errors": [],
                "iteration_count": 0,
            }
            final = vibe_graph.invoke(initial)
            update_job(job_id, "done", result={
                "code": final["generated_code"],
                "language": final["language"],
                "syntax_errors": final["syntax_errors"],
                "iterations": final["iteration_count"],
            })
        except Exception as e:
            update_job(job_id, "error", error=str(e))

    asyncio.get_event_loop().run_in_executor(_executor, run)
    return {"job_id": job_id}


@router.get("/status/{job_id}")
def status(job_id: str):
    """Poll job status. Returns {status, result} when done."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job_id": job.job_id, "status": job.status,
            "result": job.result, "error": job.error}
```

**Крок 2: Зареєструвати роутер в `main.py`**

Додати після існуючого рядка `app.include_router(files_router)`:

```python
from pipeline_route import router as pipeline_router
app.include_router(pipeline_router)
```

**Крок 3: Скопіювати на сервер та перезапустити**

```bash
scp /home/vokov/workspace/ai-drakon-setup/services/architect-agent/pipeline_route.py vokov@192.168.3.184:/home/vokov/workspace/ai-drakon-setup/services/architect-agent/
ssh vokov@192.168.3.184 "sudo systemctl restart architect-agent 2>/dev/null || true; sleep 2 && curl -s http://localhost:8766/health"
```

Очікуваний результат: `{"status":"ok","service":"architect-agent",...}`

**Крок 4: Димовий тест нової кінцевої точки**

```bash
ssh vokov@192.168.3.184 "curl -s -X POST http://localhost:8766/pipeline/analyze -H 'Content-Type: application/json' -d '{\"source_code\": \"def add(a,b):\\n    return a+b\", \"file_path\": \"test.py\"}'"
```

Очікуваний результат: `{"job_id": "...uuid..."}`

**Крок 5: Коміт**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup && git add services/architect-agent/pipeline_route.py services/architect-agent/main.py && git commit -m 'feat: /pipeline/analyze, /pipeline/generate, /pipeline/status endpoints'"
```

---

## Завдання 11: Маршрути проксі-воркера для кінцевих точок конвеєрів

**Файли:**
- Змінити: `cloudflare-worker/src/index.ts` (або там, де визначено маршрути)

Воркер (Worker) має проксіювати `/v1/pipeline/*` → `architect-agent:8766/pipeline/*` з авторизацією JWT, так само як і для існуючих маршрутів агентів.

**Крок 1: Прочитати поточну маршрутизацію воркера**

```bash
grep -n 'architect\|8766\|pipeline' /home/vokov/workspace/ai-drakon-setup/cloudflare-worker/src/index.ts | head -20
```

**Крок 2: Додати маршрути конвеєрів за існуючим шаблоном**

Знайдіть блок, який маршрутизує на `architect-agent`, та додайте:

```typescript
if (path.startsWith("/v1/pipeline/")) {
  return proxyToAgent(request, env, "http://ARCHITECT_AGENT_URL/pipeline/" + path.slice("/v1/pipeline/".length), requiresAuth(request));
}
```

(Пристосуйте до реальних назв функцій, знайдених на Кроці 1.)

**Крок 3: Деплой воркера**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup/cloudflare-worker && npx wrangler deploy 2>&1 | tail -5"
```

**Крок 4: Закомітити зміни воркера**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup && git add cloudflare-worker/ && git commit -m 'feat: Worker proxy routes for /v1/pipeline/*'"
```

---

## Завдання 12: Пуш усіх комітів на обидва репозиторії

**Крок 1: Пуш в origin**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup && git push origin main 2>&1"
```

**Крок 2: Пуш у drakon-flow**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup && git push drakon-flow main 2>&1"
```

**Крок 3: Перевірка**

```bash
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-setup && git log --oneline -6"
```

---

## Завдання 13: Написання промпту Lovable для UI конвеєрів

**Файл:** `lovable-prompts/27-pipeline-ui.md`

Дивіться окремий документ — цей промпт вказує Lovable додати:
1. **Тригер аналізу** у `DiagramsPage.tsx`: кнопка "Аналізувати" → `POST /v1/pipeline/analyze` → опитування `/v1/pipeline/status/{id}` → відкриває результат у візуалізаторі DRAKON.
2. **Панель Vibe-coding** у новому маршруті/вкладці: вибір DRAKON IR + текстове поле опису + вибір мови → `POST /v1/pipeline/generate` → відображає згенерований код із кнопкою копіювання.

Цей промпт пишеться ПІСЛЯ завершення завдань 1-12 та верифікації працездатності кінцевих точок бекенду.

---

## Контрольний список верифікації

Перед тим як оголосити план виконаним, перевірте кожен пункт:

- [ ] `python3 -c 'import langgraph; import radon; import networkx'` → OK
- [ ] `pytest tests/test_pipeline_a.py -v` → 6 PASSED
- [ ] `pytest tests/test_pipeline_b.py -v` → 3 PASSED
- [ ] `curl http://localhost:8766/pipeline/analyze ...` → повертає `job_id`
- [ ] `curl http://localhost:8766/pipeline/status/{id}` → згодом `"status":"done"`
- [ ] `git log --oneline -8` → показує 6+ комітів із цього плану
- [ ] `git push origin main && git push drakon-flow main` → обидва репозиторії оновлені

---

## Семантичні зв'язки
**Цей документ є частиною:** [[plans/_INDEX]]

**Цей документ пов'язаний з:**
- [[plans/2026-05-16-js-ts-support]] — наступний розділ (2026 05 16 js ts support)