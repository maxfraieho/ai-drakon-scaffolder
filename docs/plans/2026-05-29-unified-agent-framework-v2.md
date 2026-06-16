---
tags: [domain:plan, status:active, format:plan, tier:1]
created: 2026-05-29
updated: 2026-05-29
title: "AI-DRAKON як Developer Tool — Revised Unified Framework Plan"
lang: uk
---

# AI-DRAKON: Developer Tool for Multi-Project Agent Building

> **Для Claude/AGY:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** AI-DRAKON = IDE для розробки LangGraph-агентів для БУДЬ-ЯКОГО проекту.
Розробник малює логіку агента в DRAKON-редакторі → агент виконується автоматично.
Внутрішні агенти (architect, docs, drakon) = вбудовані помічники розробника.

**Core Insight:**
```
DRAKON action node content може бути:
  1. Назва built-in tool  → "search_kb", "send_telegram", "analyze_code"
  2. LLM промпт (природня мова) → "Проаналізуй та визнач загрозу"
graph_loader автоматично розрізняє: є в BUILT_IN_TOOLS? → tool, інакше → LLM call
```

**Storage per project:**
```
projects/{slug}/
  agents/{agent_name}/
    pipeline.drakon.json   ← DRAKON IR (source of truth)
    kb/*.md                ← знання агента
```

**Tech Stack:** Python 3.11, LangGraph, FastAPI, SQLite FTS5, services/shared/,
AGY/Anthropic/OpenAI via llm_client, ai-memory MCP, drakonwidget.js frontend.

---

## Task 1: services/shared/ ✅ DONE (commit e207e18)
graph_loader.py, kb_client.py, llm_client.py, ai_memory.py

---

## Task 2: BUILT_IN_TOOLS registry + llm_node_factory

**Goal:** Глобальний реєстр вбудованих tools + фабрика LLM-нод.
Це серце системи: будь-яка DRAKON-нода виконується через цей механізм.

**Files:**
- Create: `services/shared/built_in_tools.py`
- Create: `services/shared/llm_node.py`
- Modify: `services/shared/graph_loader.py` (додати авто-розрізнення tool vs prompt)

**built_in_tools.py — вбудовані tools (початковий набір):**
```python
from typing import Any

def search_kb(state: dict) -> dict:
    """Пошук в KB поточного проекту."""
    # state["query"] → kb_client.search() → state["kb_results"]
    ...

def analyze_code(state: dict) -> dict:
    """AST-аналіз коду."""
    ...

def generate_ir(state: dict) -> dict:
    """Генерація DRAKON IR з коду."""
    ...

def save_to_project(state: dict) -> dict:
    """Зберегти результат в проект."""
    ...

BUILT_IN_TOOLS: dict[str, Any] = {
    "search_kb":      search_kb,
    "analyze_code":   analyze_code,
    "generate_ir":    generate_ir,
    "save_to_project": save_to_project,
}
```

**llm_node.py — фабрика LLM-нод:**
```python
from services.shared.llm_client import chat

def llm_node_factory(prompt_template: str):
    """Returns LangGraph node function that calls LLM with prompt_template."""
    def node(state: dict) -> dict:
        context = state.get("context", "")
        input_data = state.get("input", state.get("query", ""))
        messages = [{"role": "user", "content": f"{prompt_template}\n\nInput: {input_data}\nContext: {context}"}]
        result = chat(messages)
        return {**state, "output": result, "last_llm_result": result}
    node.__name__ = f"llm_node_{hash(prompt_template) & 0xFFFF:04x}"
    return node
```

**graph_loader.py update — авто-розрізнення:**
```python
from services.shared.built_in_tools import BUILT_IN_TOOLS
from services.shared.llm_node import llm_node_factory

def _resolve_node_fn(content: str, node_registry: dict) -> Any:
    """Tool name → tool fn; anything else → LLM prompt node."""
    if content in node_registry:
        return node_registry[content]
    if content in BUILT_IN_TOOLS:
        return BUILT_IN_TOOLS[content]
    return llm_node_factory(content)  # LLM prompt
```

**Verification:**
```python
from services.shared.built_in_tools import BUILT_IN_TOOLS
from services.shared.llm_node import llm_node_factory
fn = llm_node_factory("Проаналізуй та відповідь")
state = {"input": "test", "context": ""}
# fn(state) should return dict with "output" key
print("tool:", BUILT_IN_TOOLS.keys())
print("llm_node created:", callable(fn))
```

**Commit:** `feat(shared): add built_in_tools registry + llm_node_factory (Task 2)`

---

## Task 3: Per-project pipeline storage API

**Goal:** architect-agent зберігає та виконує pipelines per project+agent.

**Files:**
- Create: `services/architect-agent/project_pipeline_route.py`
- Modify: `services/architect-agent/main.py`

**Endpoints:**
```
GET  /projects/{slug}/agents                    → list agents
GET  /projects/{slug}/agents/{name}/pipeline    → get pipeline IR
PUT  /projects/{slug}/agents/{name}/pipeline    → save + hot-compile
POST /projects/{slug}/agents/{name}/execute     → run pipeline (SSE)
GET  /projects/{slug}/agents/{name}/status      → compilation status
```

**Storage:**
```
~/projects/{slug}/agents/{name}/pipeline.drakon.json
~/projects/{slug}/agents/{name}/kb/*.md
```

**Commit:** `feat(architect): per-project agent pipeline API (Task 3)`

---

## Task 4: KB per project

**Goal:** kb_client.py індексує knowledge base конкретного проекту.

**Files:**
- Modify: `services/architect-agent/project_pipeline_route.py`
- Create: `services/architect-agent/project_kb.py`

**API:**
```
POST /projects/{slug}/agents/{name}/kb/index   → re-index docs
POST /projects/{slug}/agents/{name}/kb/search  → query KB
```

**Behavior in built_in_tools.search_kb:**
```python
def search_kb(state: dict) -> dict:
    slug = state.get("project_slug", "")
    kb_dir = Path(f"~/projects/{slug}/agents/{state['agent_name']}/kb").expanduser()
    kb = KBClient(":memory:")
    kb.index_documents(kb_dir)
    results = kb.search(state.get("query", state.get("input", "")))
    return {**state, "kb_results": results, "context": "\n".join(results)}
```

**Commit:** `feat(architect): per-project KB indexing + search (Task 4)`

---

## Task 5: UI — прив'язати /agents до Projects

**Goal:** Коли обраний проект → /agents показує агентів ЦЬОГО проекту.

**Files:**
- Modify: `src/pages/AgentStudioPage.tsx` + `.lovable/`
- Modify: `src/lib/graph-pipeline-api.ts` → use project-scoped URLs

**Change in graph-pipeline-api.ts:**
```typescript
// Було: GET /graph-pipelines
// Стало: GET /projects/{slug}/agents
const BASE = `${agentBaseUrl}/projects/${activeProject?.slug || '_default'}`;
```

**Commit:** `feat(ui): bind /agents page to active project context (Task 5)`

---

## Task 6: Demo — sharon-uav як перший зовнішній проект

**Goal:** Довести що система працює для реального проекту поза ai-drakon.

**Files:**
- Create: `demo/sharon-threat-classifier/pipeline.drakon.json`
- Create: `demo/sharon-threat-classifier/kb/sharon-domain.md`

**Demo pipeline:**
```json
{
  "name": "sharon-threat-classifier",
  "items": {
    "h": {"type": "header", "content": "Threat Classifier", "one": "n1"},
    "n1": {"type": "action", "content": "search_kb", "one": "n2"},
    "n2": {"type": "action",
           "content": "Проаналізуй повідомлення та знайдене в KB. Визнач: є загроза UAV? Рівень 1-5. JSON: {threat: bool, level: int, reason: str}",
           "one": "n3"},
    "n3": {"type": "question", "content": "route_by_threat_level", "one": "n4", "two": "end"},
    "n4": {"type": "action", "content": "save_to_project", "one": "end"},
    "end": {"type": "end"}
  },
  "schema": {"state_class": "ThreatState"}
}
```

**Commit:** `demo(sharon): threat classifier pipeline as first external project demo (Task 6)`

---

## Task 7: Тести

```python
def test_tool_node(): ...        # built-in tool execution
def test_llm_node(): ...         # LLM prompt node creation
def test_mixed_pipeline(): ...   # pipeline with both tools and prompts
def test_project_storage(): ...  # save/load pipeline per project
def test_kb_search_project(): .. # KB search scoped to project
```

---

## Task 8: Документація

Update `docs/COLLABORATION.md`:
- Додати розділ "AI-DRAKON як Developer Tool"
- Описати built_in_tools + llm_node_factory pattern
- Приклад: sharon-threat-classifier

**Commit:** `docs: update COLLABORATION.md — AI-DRAKON developer tool vision (Task 8)`

---

## Семантичні зв'язки
**Цей документ є частиною:** [[plans/_INDEX]]

**Цей документ пов'язаний з:**
- [[plans/2026-05-29-unified-agent-framework]] — наступний розділ (2026 05 29 unified agent framework)
- [[reports/agent-architecture-2026-05-29]] — пов'язаний документ (agent architecture 2026 05 29)