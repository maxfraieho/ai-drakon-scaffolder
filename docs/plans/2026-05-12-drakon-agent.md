---
tags:
  - domain:plan
  - status:active
  - format:plan
created: 2026-05-12
updated: 2026-05-28
tier: 3
title: "Агент DRAKON — План реалізації"
lang: uk
---

# DRAKON Agent — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Локальний FastAPI сервіс, що приймає Python код, аналізує AST, збагачує через BM25 + AI агент (proxy:18880), валідує DRAKON IR і зберігає діаграму у ai-drakon через Worker.

**Architecture:** FastAPI мікросервіс на 192.168.3.184:8765. Пайплайн: Python `ast` → raw IR → BM25 контекст з `knowledge/` → AI refinement (proxy:18880) → валідатор → петля виправлень → результат. Нова схема зберігається у MinIO через Worker MCP. Зворотній зв'язок від людини зберігається як `.md` файл у `knowledge/` і автоматично індексується при наступному запиті.

**Tech Stack:** Python 3.12+, FastAPI, uvicorn, rank_bm25, httpx, pydantic v2. Без torch/ML. uv як пакетний менеджер. Структура аналогічна `docs_assistant` з `/opt/free-claude-code/api/docs_assistant/`.

---

## Структура сервісу

```
services/drakon-agent/
├── main.py              # FastAPI app, uvicorn entry point
├── pyproject.toml       # uv deps
├── .env.example
├── knowledge/           # Markdown файли знань — індексуються BM25
│   └── drakon-ir-format.md   # Базові правила DRAKON IR
├── analyzer/
│   ├── __init__.py
│   ├── ast_analyzer.py  # Python ast → raw DRAKON IR
│   └── cfg_builder.py   # Control Flow Graph → items dict
├── knowledge_base/
│   ├── __init__.py
│   ├── ingest.py        # collect .md, chunk, BM25 index
│   └── retrieval.py     # search(query) → chunks
├── ai_refiner/
│   ├── __init__.py
│   ├── refiner.py       # LLM call via proxy:18880
│   └── prompts.py       # system + user prompts
├── validator/
│   ├── __init__.py
│   └── ir_validator.py  # перевірка DRAKON IR формату
├── routes/
│   ├── __init__.py
│   ├── analyze.py       # POST /analyze
│   ├── feedback.py      # POST /feedback
│   └── health.py        # GET /health
└── schemas.py           # Pydantic моделі
```

---

## Task 1: Scaffold + FastAPI skeleton

**Files:**
- Create: `services/drakon-agent/pyproject.toml`
- Create: `services/drakon-agent/main.py`
- Create: `services/drakon-agent/schemas.py`
- Create: `services/drakon-agent/.env.example`
- Create: `services/drakon-agent/knowledge/drakon-ir-format.md`

**Step 1: Створи pyproject.toml**

```toml
[project]
name = "drakon-agent"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.30",
    "pydantic>=2.0",
    "httpx>=0.27",
    "rank-bm25>=0.2.2",
    "python-dotenv>=1.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

**Step 2: Створи main.py**

```python
import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from routes.health import router as health_router
from routes.analyze import router as analyze_router
from routes.feedback import router as feedback_router

app = FastAPI(title="DRAKON Agent", version="0.1.0")
app.include_router(health_router)
app.include_router(analyze_router)
app.include_router(feedback_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8765")), reload=False)
```

**Step 3: Створи schemas.py**

```python
from pydantic import BaseModel, Field
from typing import Any

class AnalyzeRequest(BaseModel):
    code: str = Field(min_length=1, max_length=100_000)
    filename: str = "module.py"
    project_context: str = ""   # напр. "AI proxy router for LLM backends"
    folder_slug: str = ""       # для збереження в ai-drakon
    save_to_drakon: bool = False

class DrakonNode(BaseModel):
    type: str        # branch | action | question | end | output | input
    content: str = ""
    one: str = ""    # next pointer
    two: str = ""    # else/no pointer (для question)
    branchId: int | None = None

class AnalyzeResponse(BaseModel):
    diagram: dict[str, Any]     # { name, params, items }
    validation: dict[str, Any]  # { valid, errors }
    raw_ir: dict[str, Any]      # IR до AI refinement
    knowledge_chunks: int       # скільки контекстних чанків використано
    ai_refined: bool
    saved_to_drakon: bool = False

class FeedbackRequest(BaseModel):
    diagram_id: str
    project: str = "default"
    correction: str = Field(min_length=5, max_length=5000)
    label_overrides: dict[str, str] = {}  # { node_id: "human label" }

class FeedbackResponse(BaseModel):
    saved_to: str   # шлях до .md файлу
```

**Step 4: Створи .env.example**

```
PORT=8765
PROXY_URL=http://localhost:18880
PROXY_TOKEN=freecc
PROXY_MODEL=coding-proxy
KNOWLEDGE_DIR=knowledge
WORKER_URL=https://drakon-mcp-worker.maxfraieho.workers.dev
WORKER_TOKEN=drakon-mcp-2026
```

**Step 5: Створи knowledge/drakon-ir-format.md** (базові правила)

```markdown
# DRAKON IR Format Rules

## Required structure
Every DRAKON Widget diagram MUST contain:
- `name`: string — diagram title
- `params`: string (comma-separated, NOT array)
- `items`: object with node entries

## Required nodes
- `end`: `{ type: 'end' }` — must always exist
- `b0`: `{ type: 'branch', branchId: 0, one: '<first_node_id>' }` — MANDATORY first entry

## Node types
- `branch`: entry point. Fields: branchId (int), one (str)
- `action`: regular step. Fields: content (str), one (str)
- `question`: decision. Fields: content (str), one (yes-branch), two (no-branch)
- `input`: data input. Fields: content (str), one (str)
- `output`: data output / return. Fields: content (str), one (str → usually 'end')
- `end`: terminal. No extra fields.

## Rules
- All `one`/`two` pointers must reference existing node IDs
- No orphan nodes (every node except `b0` must be reachable from `b0`)
- No cycles except through explicit loop_start/loop_end pattern
- `params` must be a string like "arg1, arg2" — NOT an array
- Node IDs: short alphanumeric, e.g. n1, n2, q1, end, b0

## Human-readable labels
- Use domain language, not variable names
- action: imperative verb phrase ("Validate token", "Build response")
- question: yes/no question ("Token valid?", "Slot found?")
- input: what enters ("HTTP POST /v1/chat/completions")
- output: what exits ("Return 401 Unauthorized")
```

**Step 6: Commit**

```bash
git add services/drakon-agent/
git commit -m "feat(drakon-agent): project scaffold, FastAPI skeleton, schemas, knowledge base seed"
```

---

## Task 2: AST Analyzer — Python ast → raw DRAKON IR

**Files:**
- Create: `services/drakon-agent/analyzer/__init__.py`
- Create: `services/drakon-agent/analyzer/cfg_builder.py`
- Create: `services/drakon-agent/analyzer/ast_analyzer.py`

**Концепція:** Traversal через `ast.NodeVisitor`. Кожна функція → окремий DRAKON diagram. Sequential statements → один `action` node. `ast.If` → `question`. `ast.For`/`ast.While` → `action` (спрощено на першій ітерації). `ast.Return` → `output` → `end`.

**Step 1: cfg_builder.py**

```python
"""Convert Python AST function body to raw DRAKON IR items dict."""
import ast
import textwrap
from dataclasses import dataclass, field


@dataclass
class IRBuilder:
    _counter: int = 0
    items: dict = field(default_factory=dict)

    def _id(self, prefix: str = "n") -> str:
        self._counter += 1
        return f"{prefix}{self._counter}"

    def build(self, func_node: ast.FunctionDef | ast.AsyncFunctionDef) -> dict:
        """Return items dict for one function. Always includes b0 and end."""
        self.items = {"end": {"type": "end"}}
        first_id = self._process_stmts(func_node.body, tail="end")
        self.items["b0"] = {"type": "branch", "branchId": 0, "one": first_id}
        return self.items

    def _process_stmts(self, stmts: list, tail: str) -> str:
        """Process list of statements, return ID of first node."""
        if not stmts:
            return tail
        # Group sequential non-branching statements into one action
        groups = []
        buf: list[ast.stmt] = []
        for s in stmts:
            if isinstance(s, (ast.If, ast.For, ast.While, ast.Return,
                               ast.Raise, ast.Try, ast.With)):
                if buf:
                    groups.append(("action", buf))
                    buf = []
                groups.append(("branch", [s]))
            else:
                buf.append(s)
        if buf:
            groups.append(("action", buf))

        # Build nodes back-to-front, threading tail pointer
        current_tail = tail
        for kind, nodes in reversed(groups):
            if kind == "action":
                nid = self._id("n")
                content = "\n".join(
                    textwrap.shorten(ast.unparse(s), width=60, placeholder="…")
                    for s in nodes
                )
                self.items[nid] = {"type": "action", "content": content, "one": current_tail}
                current_tail = nid
            else:
                stmt = nodes[0]
                current_tail = self._process_stmt(stmt, current_tail)
        return current_tail

    def _process_stmt(self, stmt: ast.stmt, tail: str) -> str:
        if isinstance(stmt, ast.If):
            return self._process_if(stmt, tail)
        if isinstance(stmt, (ast.For, ast.While)):
            return self._process_loop(stmt, tail)
        if isinstance(stmt, ast.Return):
            return self._process_return(stmt, tail)
        if isinstance(stmt, ast.Raise):
            nid = self._id("n")
            content = ast.unparse(stmt)[:60]
            self.items[nid] = {"type": "output", "content": content, "one": "end"}
            return nid
        if isinstance(stmt, ast.Try):
            return self._process_try(stmt, tail)
        if isinstance(stmt, ast.With):
            return self._process_with(stmt, tail)
        # Fallback
        nid = self._id("n")
        self.items[nid] = {"type": "action", "content": ast.unparse(stmt)[:60], "one": tail}
        return nid

    def _process_if(self, stmt: ast.If, tail: str) -> str:
        qid = self._id("q")
        yes_first = self._process_stmts(stmt.body, tail)
        no_first = self._process_stmts(stmt.orelse, tail) if stmt.orelse else tail
        cond = textwrap.shorten(ast.unparse(stmt.test), width=50, placeholder="…")
        self.items[qid] = {
            "type": "question", "content": cond + "?",
            "one": yes_first, "two": no_first,
        }
        return qid

    def _process_loop(self, stmt: ast.For | ast.While, tail: str) -> str:
        # Simplified: render as action block (loop body collapsed)
        nid = self._id("n")
        if isinstance(stmt, ast.For):
            header = f"for {ast.unparse(stmt.target)} in {ast.unparse(stmt.iter)}"
        else:
            header = f"while {ast.unparse(stmt.test)}"
        body_summary = "; ".join(
            textwrap.shorten(ast.unparse(s), 40, placeholder="…")
            for s in stmt.body[:3]
        )
        content = f"{header}\n  {body_summary}"
        self.items[nid] = {"type": "action", "content": content[:80], "one": tail}
        return nid

    def _process_return(self, stmt: ast.Return, _tail: str) -> str:
        nid = self._id("n")
        content = ast.unparse(stmt)[:60] if stmt.value else "return"
        self.items[nid] = {"type": "output", "content": content, "one": "end"}
        return nid

    def _process_try(self, stmt: ast.Try, tail: str) -> str:
        # body → synthetic question (exception?) → yes=handlers, no=body_tail
        body_tail = self._process_stmts(stmt.finalbody, tail) if stmt.finalbody else tail
        body_first = self._process_stmts(stmt.body, body_tail)
        qid = self._id("q")
        # handlers
        handler_lines = []
        for h in stmt.handlers:
            exc = ast.unparse(h.type) if h.type else "Exception"
            handler_lines.append(f"except {exc}")
        handler_content = "\n".join(handler_lines) or "except"
        handler_nid = self._id("n")
        self.items[handler_nid] = {"type": "action", "content": handler_content[:60], "one": body_tail}
        self.items[qid] = {
            "type": "question", "content": "Exception raised?",
            "one": handler_nid, "two": body_first,
        }
        return qid

    def _process_with(self, stmt: ast.With, tail: str) -> str:
        enter_nid = self._id("n")
        ctx = ast.unparse(stmt.items[0].context_expr)
        self.items[enter_nid] = {"type": "action", "content": f"Enter context: {ctx}"[:60], "one": ""}
        body_first = self._process_stmts(stmt.body, tail)
        exit_nid = self._id("n")
        self.items[exit_nid] = {"type": "action", "content": f"Exit context: {ctx}"[:60], "one": tail}
        self.items[enter_nid]["one"] = body_first
        # Patch last body node to point to exit
        # Simple: redirect body_first chain end to exit_nid — not trivially available.
        # Approximation: wrap body in action node
        self.items[enter_nid]["one"] = body_first
        return enter_nid
```

**Step 2: ast_analyzer.py**

```python
"""Parse Python source → list of raw DRAKON diagrams (one per function)."""
import ast
from .cfg_builder import IRBuilder


class PythonAnalyzer:
    def analyze(self, code: str, filename: str = "module.py") -> list[dict]:
        """Return list of raw diagram dicts { name, params, items }."""
        try:
            tree = ast.parse(code, filename=filename)
        except SyntaxError as e:
            raise ValueError(f"Syntax error in {filename}: {e}") from e

        diagrams = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                diag = self._function_to_diagram(node)
                if diag:
                    diagrams.append(diag)
        return diagrams

    def _function_to_diagram(self, func: ast.FunctionDef) -> dict:
        params = ", ".join(
            arg.arg + (f": {ast.unparse(arg.annotation)}" if arg.annotation else "")
            for arg in func.args.args
        )
        builder = IRBuilder()
        items = builder.build(func)
        return {
            "name": func.name,
            "params": params,
            "items": items,
        }
```

**Step 3: Запусти quick smoke test**

```bash
cd services/drakon-agent
python3 -c "
from analyzer.ast_analyzer import PythonAnalyzer
code = '''
def greet(name: str) -> str:
    if not name:
        return \"anonymous\"
    return \"Hello \" + name
'''
result = PythonAnalyzer().analyze(code)
import json; print(json.dumps(result[0], indent=2))
"
```

Expected: JSON з `b0`, `q1`, `n2`, `n3`, `end`.

**Step 4: Commit**

```bash
git add services/drakon-agent/analyzer/
git commit -m "feat(drakon-agent): Python AST analyzer, CFG builder → raw DRAKON IR"
```

---

## Task 3: Knowledge Base (BM25 retrieval over knowledge/ .md files)

**Files:**
- Create: `services/drakon-agent/knowledge_base/__init__.py`
- Create: `services/drakon-agent/knowledge_base/ingest.py`
- Create: `services/drakon-agent/knowledge_base/retrieval.py`

Патерн ідентичний `docs_assistant` з free-claude-code. Індекс — JSON файл `data/kb_index/chunks.json`.

**Step 1: ingest.py**

```python
"""Collect *.md from knowledge/, chunk by heading, build BM25 JSON index."""
import hashlib, json, re
from pathlib import Path
import os

KB_DIR = Path(os.getenv("KNOWLEDGE_DIR", "knowledge"))
INDEX_DIR = Path("data/kb_index")
INDEX_PATH = INDEX_DIR / "chunks.json"
CHUNK_WORDS = 300


def _collect_files() -> list[Path]:
    if not KB_DIR.exists():
        return []
    return sorted(KB_DIR.rglob("*.md"))


def _chunk_file(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    # Split by ## headings
    parts = re.split(r'\n(?=#{1,3} )', text)
    chunks = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        lines = part.splitlines()
        title = lines[0].lstrip("#").strip() if lines else path.stem
        chunks.append({
            "title": title,
            "text": part,
            "path": str(path),
            "slug": path.stem,
        })
    return chunks


def build_index() -> dict:
    files = _collect_files()
    all_chunks = []
    for f in files:
        all_chunks.extend(_chunk_file(f))
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    INDEX_PATH.write_text(json.dumps(all_chunks, ensure_ascii=False, indent=2))
    return {"indexed_files": len(files), "indexed_chunks": len(all_chunks)}


def load_chunks() -> list[dict]:
    if not INDEX_PATH.exists():
        build_index()
    return json.loads(INDEX_PATH.read_text())


def is_stale() -> bool:
    if not INDEX_PATH.exists():
        return True
    files = _collect_files()
    if not files:
        return False
    latest_mtime = max(f.stat().st_mtime for f in files)
    return latest_mtime > INDEX_PATH.stat().st_mtime
```

**Step 2: retrieval.py**

```python
"""BM25 search over chunked knowledge base."""
import re
from dataclasses import dataclass
from .ingest import load_chunks, is_stale, build_index


@dataclass
class KBChunk:
    title: str
    text: str
    path: str
    slug: str
    score: float


def _tokenize(text: str) -> list[str]:
    return re.findall(r'\w+', text.lower())


def search(query: str, top_k: int = 5) -> list[KBChunk]:
    if is_stale():
        build_index()
    chunks = load_chunks()
    if not chunks:
        return []
    from rank_bm25 import BM25Okapi
    corpus = [_tokenize(c["text"]) for c in chunks]
    bm25 = BM25Okapi(corpus)
    scores = bm25.get_scores(_tokenize(query))
    max_score = max(scores) if scores.any() else 1.0
    if max_score == 0:
        return []
    results = [
        KBChunk(
            title=c["title"], text=c["text"], path=c["path"],
            slug=c["slug"], score=float(s / max_score),
        )
        for c, s in zip(chunks, scores)
        if s > 0
    ]
    results.sort(key=lambda r: r.score, reverse=True)
    return results[:top_k]
```

**Step 3: Smoke test**

```bash
cd services/drakon-agent
python3 -c "
from knowledge_base.retrieval import search
results = search('DRAKON branch branchId required')
for r in results:
    print(r.score, r.title)
"
```

Expected: `drakon-ir-format` chunk з score > 0.

**Step 4: Commit**

```bash
git add services/drakon-agent/knowledge_base/
git commit -m "feat(drakon-agent): BM25 knowledge base ingest + retrieval"
```

---

## Task 4: AI Refiner — human-readable labels via proxy:18880

**Files:**
- Create: `services/drakon-agent/ai_refiner/__init__.py`
- Create: `services/drakon-agent/ai_refiner/prompts.py`
- Create: `services/drakon-agent/ai_refiner/refiner.py`

**Step 1: prompts.py**

```python
SYSTEM_PROMPT = """You are an expert in DRAKON visual programming language.
Your task is to improve node labels in a DRAKON diagram to be human-readable,
domain-specific, and cognitively clear.

Rules:
- action nodes: short imperative phrase (max 8 words)
- question nodes: yes/no question ending with "?" (max 8 words)
- output nodes: "Return X" or "Send X" (max 8 words)
- input nodes: describe what enters the system
- Preserve technical accuracy — do not invent behavior
- Use project domain language from the context
- Answer ONLY with valid JSON (the improved items dict)
"""


def build_user_prompt(
    func_name: str,
    params: str,
    raw_items: dict,
    kb_context: str,
    project_context: str,
) -> str:
    import json
    return f"""Function: {func_name}({params})
Project context: {project_context or "general Python service"}

Knowledge base context:
{kb_context}

Raw DRAKON IR items (JSON):
{json.dumps(raw_items, ensure_ascii=False, indent=2)}

Return improved items dict as JSON only. Keep all node IDs identical.
Keep type, one, two, branchId fields unchanged. Only improve `content` field text."""
```

**Step 2: refiner.py**

```python
"""Call LLM via proxy:18880 to improve node labels."""
import json, os, logging
import httpx
from .prompts import SYSTEM_PROMPT, build_user_prompt

logger = logging.getLogger(__name__)

PROXY_URL = os.getenv("PROXY_URL", "http://localhost:18880")
PROXY_TOKEN = os.getenv("PROXY_TOKEN", "freecc")
PROXY_MODEL = os.getenv("PROXY_MODEL", "coding-proxy")


async def refine_diagram(
    func_name: str,
    params: str,
    raw_items: dict,
    kb_context: str,
    project_context: str,
) -> dict:
    """Return improved items dict. Falls back to raw_items on any error."""
    user_msg = build_user_prompt(func_name, params, raw_items, kb_context, project_context)
    payload = {
        "model": PROXY_MODEL,
        "max_tokens": 2048,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
    }
    headers = {
        "Authorization": f"Bearer {PROXY_TOKEN}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{PROXY_URL}/v1/chat/completions",
                json=payload, headers=headers,
            )
            resp.raise_for_status()
            text = resp.json()["choices"][0]["message"]["content"].strip()
            # Extract JSON from markdown code block if present
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            improved = json.loads(text)
            # Sanity: keep b0 and end unchanged from original
            improved["b0"] = raw_items["b0"]
            improved["end"] = raw_items["end"]
            return improved
    except Exception as e:
        logger.warning("AI refiner failed (%s), using raw IR", e)
        return raw_items
```

**Step 3: Commit**

```bash
git add services/drakon-agent/ai_refiner/
git commit -m "feat(drakon-agent): AI refiner — human-readable labels via proxy:18880"
```

---

## Task 5: DRAKON IR Validator

**Files:**
- Create: `services/drakon-agent/validator/__init__.py`
- Create: `services/drakon-agent/validator/ir_validator.py`

**Step 1: ir_validator.py**

```python
"""Validate DRAKON IR format. Returns { valid: bool, errors: list[str] }."""


def validate(diagram: dict) -> dict:
    errors: list[str] = []
    items = diagram.get("items", {})

    # 1. Required fields
    if not diagram.get("name"):
        errors.append("Missing diagram.name")
    if not isinstance(diagram.get("params"), str):
        errors.append("diagram.params must be a string, not array")
    if not items:
        errors.append("diagram.items is empty")
        return {"valid": False, "errors": errors}

    # 2. Required nodes
    if "end" not in items:
        errors.append("Missing required 'end' node")
    if "b0" not in items:
        errors.append("Missing required 'b0' (branch) node")
    else:
        b0 = items["b0"]
        if b0.get("type") != "branch":
            errors.append("b0 must have type='branch'")
        if b0.get("branchId") != 0:
            errors.append("b0 must have branchId=0")

    # 3. All pointers reference existing nodes
    all_ids = set(items.keys())
    for nid, node in items.items():
        for ptr_field in ("one", "two"):
            ptr = node.get(ptr_field, "")
            if ptr and ptr not in all_ids:
                errors.append(f"Node '{nid}'.{ptr_field}='{ptr}' references non-existent node")

    # 4. Reachability from b0
    if "b0" in items:
        reachable = _reachable(items, "b0")
        for nid in all_ids:
            if nid not in reachable and nid != "b0":
                errors.append(f"Node '{nid}' is unreachable from b0")

    return {"valid": len(errors) == 0, "errors": errors}


def _reachable(items: dict, start: str) -> set[str]:
    visited: set[str] = set()
    stack = [start]
    while stack:
        nid = stack.pop()
        if nid in visited or nid not in items:
            continue
        visited.add(nid)
        node = items[nid]
        for ptr in (node.get("one", ""), node.get("two", "")):
            if ptr and ptr not in visited:
                stack.append(ptr)
    return visited
```

**Step 2: Smoke test**

```bash
cd services/drakon-agent
python3 -c "
from validator.ir_validator import validate
bad = {'name': 'test', 'params': [], 'items': {'n1': {'type': 'action', 'content': 'x', 'one': 'end'}}}
print(validate(bad))
good = {'name': 'test', 'params': 'x', 'items': {
    'end': {'type': 'end'},
    'b0': {'type': 'branch', 'branchId': 0, 'one': 'n1'},
    'n1': {'type': 'action', 'content': 'Do something', 'one': 'end'},
}}
print(validate(good))
"
```

Expected: bad → `valid: False, errors: [...]`, good → `valid: True, errors: []`.

**Step 3: Commit**

```bash
git add services/drakon-agent/validator/
git commit -m "feat(drakon-agent): DRAKON IR validator — structural correctness checks"
```

---

## Task 6: Routes — /analyze, /feedback, /health

**Files:**
- Create: `services/drakon-agent/routes/__init__.py`
- Create: `services/drakon-agent/routes/health.py`
- Create: `services/drakon-agent/routes/analyze.py`
- Create: `services/drakon-agent/routes/feedback.py`

**Step 1: health.py**

```python
from fastapi import APIRouter
router = APIRouter()

@router.get("/health")
async def health():
    return {"status": "ok", "service": "drakon-agent"}
```

**Step 2: analyze.py** — центральний пайплайн

```python
"""POST /analyze — full pipeline: AST → KB → AI → validate → result."""
import os, json
from fastapi import APIRouter, HTTPException
from starlette.concurrency import run_in_threadpool
from schemas import AnalyzeRequest, AnalyzeResponse
from analyzer.ast_analyzer import PythonAnalyzer
from knowledge_base.retrieval import search
from ai_refiner.refiner import refine_diagram
from validator.ir_validator import validate

router = APIRouter()
_analyzer = PythonAnalyzer()

MAX_REFINE_LOOPS = 3


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_endpoint(req: AnalyzeRequest) -> AnalyzeResponse:
    # 1. AST analysis
    try:
        raw_diagrams = await run_in_threadpool(_analyzer.analyze, req.code, req.filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not raw_diagrams:
        raise HTTPException(status_code=422, detail="No functions found in code")

    # Use first function diagram (можна розширити до вибору по імені)
    raw = raw_diagrams[0]
    raw_ir_snapshot = json.loads(json.dumps(raw))  # deep copy

    # 2. Knowledge base context
    kb_chunks = await run_in_threadpool(search, req.project_context or raw["name"], 4)
    kb_context = "\n\n".join(f"# {c.title}\n{c.text[:400]}" for c in kb_chunks)

    # 3. AI refinement loop
    diagram = dict(raw)
    ai_refined = False
    validation = {"valid": False, "errors": ["not validated yet"]}

    for attempt in range(MAX_REFINE_LOOPS):
        improved_items = await refine_diagram(
            func_name=diagram["name"],
            params=diagram["params"],
            raw_items=diagram["items"],
            kb_context=kb_context,
            project_context=req.project_context,
        )
        diagram["items"] = improved_items
        ai_refined = True

        # 4. Validate
        validation = validate(diagram)
        if validation["valid"]:
            break
        # If invalid, ask AI to fix (pass validation errors as context)
        error_note = "Previous attempt had errors: " + "; ".join(validation["errors"])
        kb_context = error_note + "\n\n" + kb_context

    return AnalyzeResponse(
        diagram=diagram,
        validation=validation,
        raw_ir=raw_ir_snapshot,
        knowledge_chunks=len(kb_chunks),
        ai_refined=ai_refined,
    )
```

**Step 3: feedback.py**

```python
"""POST /feedback — save human correction as .md in knowledge/."""
import os
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter
from schemas import FeedbackRequest, FeedbackResponse

router = APIRouter()
KB_DIR = Path(os.getenv("KNOWLEDGE_DIR", "knowledge"))


@router.post("/feedback", response_model=FeedbackResponse)
async def feedback_endpoint(req: FeedbackRequest) -> FeedbackResponse:
    project_dir = KB_DIR / req.project
    project_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    filename = f"{req.diagram_id}-{ts}.md"
    path = project_dir / filename

    content_parts = [
        f"# Feedback: {req.diagram_id}",
        f"Date: {ts}",
        f"\n## Correction\n{req.correction}",
    ]
    if req.label_overrides:
        import json
        content_parts.append(f"\n## Label Overrides\n```json\n{json.dumps(req.label_overrides, ensure_ascii=False, indent=2)}\n```")

    path.write_text("\n".join(content_parts), encoding="utf-8")

    return FeedbackResponse(saved_to=str(path))
```

**Step 4: Запусти сервіс локально**

```bash
cd services/drakon-agent
uv run python main.py
# In another terminal:
curl -s -X POST http://localhost:8765/analyze \
  -H "Content-Type: application/json" \
  -d '{"code":"def hello(name):\n  if not name:\n    return \"anon\"\n  return name","project_context":"test"}' \
  | python3 -m json.tool | head -40
```

Expected: JSON з `diagram.items`, `validation.valid: true`, `ai_refined: true`.

**Step 5: Commit**

```bash
git add services/drakon-agent/routes/ services/drakon-agent/main.py
git commit -m "feat(drakon-agent): /analyze pipeline, /feedback endpoint, /health"
```

---

## Task 7: Деплой на 192.168.3.184

**Files:**
- Create: `services/drakon-agent/start.sh`
- Create: `services/drakon-agent/README.md`

**Step 1: start.sh**

```bash
#!/bin/sh
set -e
cd "$(dirname "$0")"
[ -f .env ] || cp .env.example .env
uv sync
uv run python main.py
```

```bash
chmod +x services/drakon-agent/start.sh
```

**Step 2: Скопіюй на сервер і запусти**

```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'cd ~/workspace/ai-drakon-setup && git pull && cd services/drakon-agent && bash start.sh &'
```

**Step 3: Перевір що сервіс запустився**

```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  'curl -s http://localhost:8765/health'
```

Expected: `{"status":"ok","service":"drakon-agent"}`

**Step 4: Commit README**

```bash
git add services/drakon-agent/start.sh services/drakon-agent/README.md
git commit -m "feat(drakon-agent): deploy script + README"
```

---

## Task 8: Cloudflare Worker proxy endpoint (опційно)

**Files:**
- Modify: `cloudflare-worker/worker-mcp-drakon.js` — додати `POST /analyze-python` що проксює до сервісу

Потрібно коли frontend хоче викликати аналіз напряму без знання адреси сервісу.

**Step 1: Додай Worker secret**

```bash
echo "http://192.168.3.184:8765" | npx wrangler secret put DRAKON_AGENT_URL
```

**Step 2: Додай endpoint у Worker** (після секції `/mcp`)

```javascript
// In handleRequest() routing:
if (pathname === '/analyze-python' && method === 'POST') {
  return handleAnalyzePython(request, env);
}

async function handleAnalyzePython(request, env) {
  const agentUrl = env.DRAKON_AGENT_URL;
  if (!agentUrl) return new Response('DRAKON_AGENT_URL not configured', { status: 503 });
  const body = await request.json();
  const resp = await fetch(`${agentUrl}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  return new Response(JSON.stringify(data), {
    status: resp.status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
```

**Step 3: Deploy Worker**

```bash
# на локальній машині з /tmp/drakon-deploy/
CLOUDFLARE_API_TOKEN=<token> npx --yes wrangler@latest deploy
```

**Step 4: Commit**

```bash
git add cloudflare-worker/worker-mcp-drakon.js
git commit -m "feat(worker): /analyze-python proxy endpoint → drakon-agent service"
```

---

## Зведений огляд пайплайну

```
UI (ai-drakon-setup.pages.dev)
  ↓ POST /analyze-python { code, filename, project_context }
CF Worker (drakon-mcp-worker.maxfraieho.workers.dev)
  ↓ proxy → http://192.168.3.184:8765/analyze
drakon-agent FastAPI
  ├─ Python ast → raw IR
  ├─ BM25 search in knowledge/ (+ feedback files from previous sessions)
  ├─ AI refinement via proxy:18880 → human-readable labels
  ├─ IR validator → loop up to 3x
  └─ Return { diagram, validation, raw_ir }
  ↓
UI показує діаграму в DrakonEditor
  ↓ Людина переглядає, виправляє
POST /feedback → knowledge/{project}/{id}-{ts}.md
  ↓ Автоматично індексується при наступному /analyze
```

---

## Пріоритет виконання

| Task | Важливість | Час |
|------|-----------|-----|
| 1 — Scaffold | критична | 15 хв |
| 2 — AST Analyzer | критична | 30 хв |
| 3 — Knowledge Base | важлива | 20 хв |
| 4 — AI Refiner | важлива | 20 хв |
| 5 — Validator | важлива | 15 хв |
| 6 — Routes | критична | 25 хв |
| 7 — Deploy | критична | 10 хв |
| 8 — Worker proxy | бажана | 20 хв |

---

## Семантичні зв'язки

**Цей документ є частиною:** [[plans/_INDEX]]
**Цей документ пов'язаний з:**
- [[plans/2026-05-12-multi-agent-drakon-system]] — Мультиагентна система DRAKON — План реалізації