---
tags:
  - domain:plan
  - status:active
  - format:plan
created: 2026-05-16
updated: 2026-05-28
tier: 3
title: "Підтримка JS/TS в drakon-agent — План реалізації"
lang: uk
---

# Підтримка JS/TS в drakon-agent — План реалізації

> **Для Claude:** НЕОБХІДНИЙ SUB-SKILL: Використовуйте superpowers:executing-plans для реалізації цього плану завдання за завданням.

**Мета:** Додати аналіз коду JavaScript та TypeScript до `drakon-agent` з маршрутизацією за розширенням файлу.

**Архітектура:** Новий `analyzer/js_analyzer.py` з класом `JSAnalyzer`, що використовує tree-sitter. Маршрут `/analyze` визначає мову за розширенням `filename` та перенаправляє запит на `PythonAnalyzer` або `JSAnalyzer`. Поточний побудовник `DrakonIR` повторно використовується без змін.

**Стек технологій:** Python 3.12, tree-sitter 0.25, tree-sitter-javascript 0.25, tree-sitter-typescript 0.23, FastAPI, pytest.

---

### Завдання 1: Додавання tree-sitter до залежностей у pyproject.toml

**Файли:**
- Змінити: `services/drakon-agent/pyproject.toml`

**Крок 1: Додати залежності у pyproject.toml**

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

**Крок 2: Коміт**

```bash
cd ~/workspace/ai-drakon-setup
git add services/drakon-agent/pyproject.toml
git commit -m "feat(drakon-agent): add tree-sitter deps for JS/TS support"
git push origin main && git push drakon-flow-new main
```

---

### Завдання 2: Написання тестів для JSAnalyzer, які не проходять

**Файли:**
- Створити: `services/drakon-agent/tests/test_js_analyzer.py`

**Крок 1: Написати тести, що падають**

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

**Крок 2: Запустити тести, щоб перевірити їхнє падіння**

```bash
cd ~/workspace/ai-drakon-setup/services/drakon-agent
.venv/bin/pytest tests/test_js_analyzer.py -v 2>&1 | head -20
```

Очікуваний результат: `ModuleNotFoundError: No module named 'analyzer.js_analyzer'`

**Крок 3: Закомітити тести, що падають**

```bash
git add services/drakon-agent/tests/test_js_analyzer.py
git commit -m "test(drakon-agent): failing tests for JSAnalyzer"
```

---

### Завдання 3: Реалізація JSAnalyzer

**Файли:**
- Створити: `services/drakon-agent/analyzer/js_analyzer.py`

**Крок 1: Написати мінімальну реалізацію**

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

**Крок 2: Запустити тести**

```bash
cd ~/workspace/ai-drakon-setup/services/drakon-agent
.venv/bin/pytest tests/test_js_analyzer.py -v
```

Очікуваний результат: всі 8 тестів проходять (PASS)

**Крок 3: Коміт**

```bash
git add services/drakon-agent/analyzer/js_analyzer.py
git commit -m "feat(drakon-agent): JSAnalyzer — JS/TS → DRAKON IR via tree-sitter"
```

---

### Завдання 4: Підключення маршрутизації за мовою у `/analyze`

**Файли:**
- Змінити: `services/drakon-agent/routes/analyze.py`

**Крок 1: Написати тест для маршрутизації, який падає**

Додати до `tests/test_js_analyzer.py`:

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

**Крок 2: Запустити, щоб побачити падіння**

```bash
.venv/bin/pytest tests/test_js_analyzer.py::test_route_js_by_filename -v
```

Очікуваний результат: FAIL — маршрут використовує `PythonAnalyzer` незалежно від розширення файлу.

**Крок 3: Оновити routes/analyze.py**

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

**Крок 4: Запустити всі тести маршрутизації**

```bash
.venv/bin/pytest tests/test_js_analyzer.py -v -k "route"
```

Очікуваний результат: 3/3 проходять (PASS)

**Крок 5: Запустити повний набір тестів**

```bash
.venv/bin/pytest tests/ -v
```

Очікуваний результат: всі тести проходять (без регресій)

**Крок 6: Коміт**

```bash
git add services/drakon-agent/routes/analyze.py
git commit -m "feat(drakon-agent): route /analyze by file extension — JS/TS/PY"
git push origin main && git push drakon-flow-new main
```

---

### Завдання 5: Перезапуск drakon-agent та димове тестування (smoke test)

**Крок 1: Перезапустити агент**

```bash
pkill -f 'services/drakon-agent/main.py' 2>/dev/null; sleep 1
cd ~/workspace/ai-drakon-setup/services/drakon-agent
REPO_ROOT=~/workspace/ai-drakon-setup PROXY_URL=http://localhost:18880/v1 \
  PROXY_TOKEN=freecc PROXY_MODEL=agent-proxy \
  nohup .venv/bin/python3 main.py > /tmp/drakon-agent.log 2>&1 &
sleep 3
```

**Крок 2: Димове тестування JS через HTTP**

```bash
curl -s http://localhost:8765/analyze \
  -X POST -H "Content-Type: application/json" \
  -d '{"code":"function add(a,b){return a+b;}","filename":"utils.js","refine":false}' \
  | python3 -m json.tool
```

Очікуваний результат: `{"filename":"utils.js","diagrams":[{"name":"add",...}],"count":1}`

**Крок 3: Димове тестування TS**

```bash
curl -s http://localhost:8765/analyze \
  -X POST -H "Content-Type: application/json" \
  -d '{"code":"function greet(name: string): string { return '\''Hi '\'' + name; }","filename":"greet.ts","refine":false}' \
  | python3 -m json.tool
```

Очікуваний результат: `count: 1, name: "greet"`

**Крок 4: Перевірити, що Python все ще працює**

```bash
curl -s http://localhost:8765/analyze \
  -X POST -H "Content-Type: application/json" \
  -d '{"code":"def hello(x):\n    return x+1","filename":"module.py","refine":false}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK:', d['count'])"
```

Очікуваний результат: `OK: 1`

---

### Завдання 6: Оновлення фронтенду — Lovable prompt 39

**Файл:** `lovable-prompts/39-js-ts-support-frontend.md`

Цей промт оновлює `CodeAnalysisPanel` — додає перемикач мови (PY/JS/TS) і передає правильний `filename` при аналізі.

```markdown
# Промпт 39 — Вибір мови JS/TS у CodeAnalysisPanel

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

**Крок 1: Зберегти промт і закомітити**

```bash
# Зберегти файл промту та закомітити
git add lovable-prompts/39-js-ts-support-frontend.md
git commit -m "feat(lovable-39): JS/TS language selector in CodeAnalysisPanel"
git push origin main && git push drakon-flow-new main
```

---

## Семантичні зв'язки

**Цей документ є частиною:** [[plans/_INDEX]]
**Цей документ пов'язаний з:**
- [[concept/02-drakon-primer]] — вступ до мови ДРАКОН