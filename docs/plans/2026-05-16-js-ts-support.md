# JS/TS Support in drakon-agent — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add JavaScript and TypeScript code analysis to drakon-agent, routing by file extension.

**Architecture:** New `analyzer/js_analyzer.py` with `JSAnalyzer` class using tree-sitter. Route `/analyze` detects language from `filename` extension and dispatches to `PythonAnalyzer` or `JSAnalyzer`. Reuses existing `DrakonIR` builder unchanged.

**Tech Stack:** Python 3.12, tree-sitter 0.25, tree-sitter-javascript 0.25, tree-sitter-typescript 0.23, FastAPI, pytest

---

### Task 1: Add tree-sitter to pyproject.toml dependencies

**Files:**
- Modify: `services/drakon-agent/pyproject.toml`

**Step 1: Add deps to pyproject.toml**

```toml
dependencies = [
    "fastapi>=0.111.0",
    "uvicorn[standard]>=0.29.0",
    "rank-bm25>=0.2.2",
    "httpx>=0.27.0",
    "pydantic>=2.0",
    "python-dotenv>=1.0.0",
    "tree-sitter>=0.23",
    "tree-sitter-javascript>=0.23",
    "tree-sitter-typescript>=0.23",
]
```

**Step 2: Commit**

```bash
cd ~/workspace/ai-drakon-setup
git add services/drakon-agent/pyproject.toml
git commit -m "feat(drakon-agent): add tree-sitter deps for JS/TS support"
git push origin main && git push drakon-flow-new main
```

---

### Task 2: Write failing tests for JSAnalyzer

**Files:**
- Create: `services/drakon-agent/tests/test_js_analyzer.py`

**Step 1: Write failing tests**

```python
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
    assert fn["branchId"] == 0


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
```

**Step 2: Run tests to verify they fail**

```bash
cd ~/workspace/ai-drakon-setup/services/drakon-agent
.venv/bin/pytest tests/test_js_analyzer.py -v 2>&1 | head -20
```

Expected: `ModuleNotFoundError: No module named 'analyzer.js_analyzer'`

**Step 3: Commit failing tests**

```bash
git add services/drakon-agent/tests/test_js_analyzer.py
git commit -m "test(drakon-agent): failing tests for JSAnalyzer"
```

---

### Task 3: Implement JSAnalyzer

**Files:**
- Create: `services/drakon-agent/analyzer/js_analyzer.py`

**Step 1: Write minimal implementation**

```python
"""JavaScript/TypeScript → DRAKON IR analyzer using tree-sitter."""
from __future__ import annotations

import tree_sitter_javascript as tsjs
import tree_sitter_typescript as tsts
from tree_sitter import Language, Node, Parser

from .cfg_builder import DrakonIR

_JS_LANG = Language(tsjs.language())
_TS_LANG = Language(tsts.language_typescript())
_TSX_LANG = Language(tsts.language_tsx())

_EXT_MAP = {
    ".js": _JS_LANG, ".mjs": _JS_LANG, ".cjs": _JS_LANG,
    ".ts": _TS_LANG, ".mts": _TS_LANG,
    ".tsx": _TSX_LANG, ".jsx": _JS_LANG,
}


def _lang_for(filename: str) -> Language:
    from pathlib import Path
    ext = Path(filename).suffix.lower()
    return _EXT_MAP.get(ext, _JS_LANG)


class _FnTranslator:
    def __init__(self):
        self._ir = DrakonIR()

    def translate(self, name: str, params: str, body: Node | None) -> dict:
        if body is None:
            return self._ir.build("end", name, params)
        first_id, last_id = self._stmts(body.children)
        if last_id:
            self._ir.link_one(last_id, "end")
        entry = first_id or "end"
        return self._ir.build(entry, name, params)

    def _stmts(self, nodes: list[Node]) -> tuple[str | None, str | None]:
        first_id: str | None = None
        prev_id: str | None = None
        for node in nodes:
            if node.type in ("{", "}", "comment", "empty_statement"):
                continue
            fid, lid = self._stmt(node)
            if fid is None:
                continue
            if prev_id:
                self._ir.link_one(prev_id, fid)
            first_id = first_id or fid
            prev_id = lid
        return first_id, prev_id

    def _stmt(self, node: Node) -> tuple[str | None, str | None]:
        t = node.type

        if t in ("if_statement",):
            return self._if(node)

        if t in ("for_statement", "while_statement", "do_statement",
                  "for_in_statement", "for_of_statement"):
            return self._loop(node)

        if t in ("return_statement", "expression_statement", "variable_declaration",
                  "lexical_declaration", "throw_statement", "break_statement",
                  "continue_statement"):
            text = node.text.decode("utf-8", errors="replace").strip()
            nid = self._ir.action(text)
            return nid, nid

        if t == "statement_block":
            return self._stmts(node.children)

        # Fallback: treat as action
        text = node.text.decode("utf-8", errors="replace").strip()
        if not text:
            return None, None
        nid = self._ir.action(text)
        return nid, nid

    def _if(self, node: Node) -> tuple[str, str | None]:
        # condition
        cond_node = node.child_by_field_name("condition")
        cond_text = cond_node.text.decode("utf-8", errors="replace").strip() if cond_node else "?"
        # strip outer parens
        if cond_text.startswith("(") and cond_text.endswith(")"):
            cond_text = cond_text[1:-1]

        qid = self._ir.question(cond_text)

        # consequence (yes/one)
        cons = node.child_by_field_name("consequence")
        yes_first, yes_last = self._stmt(cons) if cons else (None, None)

        # alternative (no/two)
        alt = node.child_by_field_name("alternative")
        no_first, no_last = (None, None)
        if alt:
            # alt may be else_clause wrapping another statement
            inner = alt.child_by_field_name("body") or (alt.children[-1] if alt.children else None)
            if inner:
                no_first, no_last = self._stmt(inner)

        # merge point
        merge_id = self._ir.action("")  # empty placeholder

        if yes_first:
            self._ir.link_one(qid, yes_first)
        else:
            self._ir.link_one(qid, merge_id)

        if no_first:
            self._ir.link_two(qid, no_first)
        else:
            self._ir.link_two(qid, merge_id)

        if yes_last:
            self._ir.link_one(yes_last, merge_id)
        if no_last:
            self._ir.link_one(no_last, merge_id)

        self._ir.strip_empty()
        return qid, merge_id if merge_id in self._ir.items else None

    def _loop(self, node: Node) -> tuple[str, str | None]:
        # Build: question(cond) → body → question again; no → exit
        cond_node = (node.child_by_field_name("condition")
                     or node.child_by_field_name("left"))
        cond_text = cond_node.text.decode("utf-8", errors="replace").strip() if cond_node else "loop"
        if cond_text.startswith("(") and cond_text.endswith(")"):
            cond_text = cond_text[1:-1]

        qid = self._ir.question(cond_text)
        body = node.child_by_field_name("body")
        body_first, body_last = self._stmt(body) if body else (None, None)

        exit_id = self._ir.action("")

        if body_first:
            self._ir.link_one(qid, body_first)
        else:
            self._ir.link_one(qid, qid)  # tight loop

        if body_last:
            self._ir.link_one(body_last, qid)

        self._ir.link_two(qid, exit_id)
        self._ir.strip_empty()
        return qid, exit_id if exit_id in self._ir.items else None


def _extract_name_params(node: Node) -> tuple[str, str]:
    """Extract function name and params string from a function-like node."""
    # name
    name_node = node.child_by_field_name("name")
    if name_node:
        name = name_node.text.decode()
    else:
        name = "<anonymous>"

    # params
    params_node = node.child_by_field_name("parameters")
    if params_node:
        raw = params_node.text.decode()
        # strip outer parens
        if raw.startswith("(") and raw.endswith(")"):
            raw = raw[1:-1]
        params = raw.strip()
    else:
        params = ""

    return name, params


class JSAnalyzer:
    """Analyze JS/TS source code and return list of DRAKON IR dicts."""

    def analyze(self, code: str, filename: str = "module.js") -> list[dict]:
        if not code.strip():
            return []

        lang = _lang_for(filename)
        parser = Parser(lang)
        tree = parser.parse(code.encode("utf-8"))

        results = []
        self._walk(tree.root_node, results)
        return results

    def _walk(self, node: Node, results: list):
        if node.type == "function_declaration":
            name, params = _extract_name_params(node)
            body = node.child_by_field_name("body")
            ir = _FnTranslator().translate(name, params, body)
            results.append(ir)

        elif node.type in ("variable_declarator",):
            # const foo = (x) => ...  or  const foo = function(...) {...}
            name_node = node.child_by_field_name("name")
            value_node = node.child_by_field_name("value")
            if value_node and value_node.type in ("arrow_function", "function"):
                name = name_node.text.decode() if name_node else "<anonymous>"
                params_node = value_node.child_by_field_name("parameters")
                if params_node:
                    raw = params_node.text.decode()
                    params = raw.strip("()")
                else:
                    params = ""
                body = value_node.child_by_field_name("body")
                ir = _FnTranslator().translate(name, params, body)
                results.append(ir)

        elif node.type in ("method_definition", "function_expression"):
            name, params = _extract_name_params(node)
            body = node.child_by_field_name("body")
            ir = _FnTranslator().translate(name, params, body)
            results.append(ir)

        for child in node.children:
            self._walk(child, results)
```

**Step 2: Run tests**

```bash
cd ~/workspace/ai-drakon-setup/services/drakon-agent
.venv/bin/pytest tests/test_js_analyzer.py -v
```

Expected: all 8 tests PASS

**Step 3: Commit**

```bash
git add services/drakon-agent/analyzer/js_analyzer.py
git commit -m "feat(drakon-agent): JSAnalyzer — JS/TS → DRAKON IR via tree-sitter"
```

---

### Task 4: Wire language routing in /analyze route

**Files:**
- Modify: `services/drakon-agent/routes/analyze.py`

**Step 1: Write failing test for routing**

Add to `tests/test_js_analyzer.py`:

```python
from fastapi.testclient import TestClient
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
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
```

**Step 2: Run to see failure**

```bash
.venv/bin/pytest tests/test_js_analyzer.py::test_route_js_by_filename -v
```

Expected: FAIL — route uses `PythonAnalyzer` regardless of extension

**Step 3: Update routes/analyze.py**

Замінити рядок:
```python
from analyzer.ast_analyzer import PythonAnalyzer
```

На:
```python
from analyzer.ast_analyzer import PythonAnalyzer
from analyzer.js_analyzer import JSAnalyzer

_JS_EXTENSIONS = {".js", ".mjs", ".cjs", ".ts", ".mts", ".tsx", ".jsx"}
```

Замінити блок аналізу в функції `analyze()`:
```python
from pathlib import Path
ext = Path(req.filename or "module.py").suffix.lower()

try:
    if ext in _JS_EXTENSIONS:
        raw_diagrams = JSAnalyzer().analyze(req.code, req.filename or "module.js")
    else:
        raw_diagrams = PythonAnalyzer().analyze(req.code, req.filename or "module.py")
except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e))
```

**Step 4: Run all routing tests**

```bash
.venv/bin/pytest tests/test_js_analyzer.py -v -k "route"
```

Expected: 3/3 PASS

**Step 5: Run full test suite**

```bash
.venv/bin/pytest tests/ -v
```

Expected: all tests PASS (no regressions)

**Step 6: Commit**

```bash
git add services/drakon-agent/routes/analyze.py
git commit -m "feat(drakon-agent): route /analyze by file extension — JS/TS/PY"
git push origin main && git push drakon-flow-new main
```

---

### Task 5: Restart drakon-agent + smoke test

**Step 1: Restart agent**

```bash
pkill -f 'services/drakon-agent/main.py' 2>/dev/null; sleep 1
cd ~/workspace/ai-drakon-setup/services/drakon-agent
REPO_ROOT=~/workspace/ai-drakon-setup PROXY_URL=http://localhost:18880/v1 \
  PROXY_TOKEN=freecc PROXY_MODEL=agent-proxy \
  nohup .venv/bin/python3 main.py > /tmp/drakon-agent.log 2>&1 &
sleep 3
```

**Step 2: Smoke test JS via HTTP**

```bash
curl -s http://localhost:8765/analyze \
  -X POST -H "Content-Type: application/json" \
  -d '{"code":"function add(a,b){return a+b;}","filename":"utils.js","refine":false}' \
  | python3 -m json.tool
```

Expected: `{"filename":"utils.js","diagrams":[{"name":"add",...}],"count":1}`

**Step 3: Smoke test TS**

```bash
curl -s http://localhost:8765/analyze \
  -X POST -H "Content-Type: application/json" \
  -d '{"code":"function greet(name: string): string { return '\''Hi '\'' + name; }","filename":"greet.ts","refine":false}' \
  | python3 -m json.tool
```

Expected: `count: 1, name: "greet"`

**Step 4: Verify Python still works**

```bash
curl -s http://localhost:8765/analyze \
  -X POST -H "Content-Type: application/json" \
  -d '{"code":"def hello(x):\n    return x+1","filename":"module.py","refine":false}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK:', d['count'])"
```

Expected: `OK: 1`

---

### Task 6: Update frontend — Lovable prompt 39

**File:** `lovable-prompts/39-js-ts-support-frontend.md`

Цей промт оновлює CodeAnalysisPanel — додає перемикач мови (PY/JS/TS) і передає правильний `filename` при аналізі.

```markdown
# Prompt 39 — JS/TS language selector in CodeAnalysisPanel

## Мета
CodeAnalysisPanel має перемикач PY/JS/TS/TSX. При виборі мови змінюється `filename` у запиті до `/v1/pipeline/analyze`.

## Зміни в CodeAnalysisPanel.tsx

### 1. Додати стан мови
\`\`\`typescript
type Lang = "python" | "javascript" | "typescript" | "tsx";
const [lang, setLang] = useState<Lang>("python");

const LANG_EXT: Record<Lang, string> = {
  python: "module.py",
  javascript: "module.js",
  typescript: "module.ts",
  tsx: "module.tsx",
};
\`\`\`

### 2. Передати filename у запиті аналізу
У submit handler — замінити або додати `filename` у тіло запиту:
\`\`\`typescript
body: JSON.stringify({
  code,
  filename: LANG_EXT[lang],
  refine: true,
})
\`\`\`

### 3. Перемикач мов у header панелі (поряд з назвою)
\`\`\`tsx
<div className="flex gap-1">
  {(["python","javascript","typescript","tsx"] as Lang[]).map(l => (
    <button
      key={l}
      onClick={() => setLang(l)}
      className={cn(
        "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase transition-colors",
        lang === l
          ? "bg-[var(--accent-amber)] text-[var(--bg-base)]"
          : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
      )}
    >
      {l === "python" ? "PY" : l === "javascript" ? "JS" : l === "typescript" ? "TS" : "TSX"}
    </button>
  ))}
</div>
\`\`\`

## Що НЕ чіпати
- SSE streaming логіка — без змін
- Save to KB — без змін
- Monaco Editor у CodeGenerationPanel — без змін
```

**Step 1: Зберегти промт і закомітити**

```bash
# Save prompt file and commit
git add lovable-prompts/39-js-ts-support-frontend.md
git commit -m "feat(lovable-39): JS/TS language selector in CodeAnalysisPanel"
git push origin main && git push drakon-flow-new main
```
