---
tags:
  - domain:plan
  - status:active
  - format:plan
created: 2026-05-16
updated: 2026-05-28
tier: 3
title: "Спринт 5 — Система керування конвеєрами агентів"
lang: uk
---

# Спринт 5 — Система керування конвеєрами агентів

> **Для Claude:** НЕОБХІДНИЙ SUB-SKILL: Використовуйте superpowers:executing-plans для реалізації цього плану завдання за завданням.

**Мета:** Спільний реєстр конфігурацій конвеєрів (architect-agent) + редактор конвеєрів на основі віджета DRAKON за адресою `/agents/pipeline/:id/edit`.

**Архітектура:** Пакет Python `services/shared/drakon_shared/` (`pip install -e`, спільне віртуальне оточення `venv`) → роутер FastAPI на `architect-agent` → проксі-воркер `/v1/agents/pipeline*` → фронтенд-конвертери TS `PipelineConfig ↔ DrakonDiagram` → `PipelineEditorPage` огортає `DrakonEditor` за допомогою `onSaveOverride`.

**Стек технологій:** Python 3.12, FastAPI, Pydantic v2, hatchling, TypeScript, TanStack Router, DrakonWidget (`drakonwidget.js` — НЕ ЧІПАТИ).

---

## ЗМІНИ ВІДНОСНО ОРИГІНАЛЬНОГО ПЛАНУ Q

- Завдання 1+2 (аудит + pip install LangGraph) **ВИДАЛЕНО** — LangGraph 1.2.0 вже у спільному venv.
- `sys.path.insert` → `pip install -e services/shared/` (один раз у drakon-agent/.venv).
- ReactFlow → **DRAKON widget** для редагування топології (нуль нових залежностей, ідеальна концептуальна узгодженість).
- DrakonEditor отримує проп `onSaveOverride?: (diagram: DrakonDiagram) => Promise<boolean>`.
- architect-agent = центральний реєстр; drakon-agent та docs-agent НЕ потребують pipeline router.
- `agent-studio-data.ts` залишається як fallback, поки API недоступний.

---

## Завдання 1 — services/shared/ Python package

**Файли:**
- Створити: `services/shared/pyproject.toml`
- Створити: `services/shared/drakon_shared/__init__.py`
- Створити: `services/shared/drakon_shared/pipeline_schema.py`
- Створити: `services/shared/drakon_shared/pipeline_manager.py`
- Створити: `services/shared/drakon_shared/pipeline_route.py`

### Крок 1: Структура директорій

```bash
mkdir -p ~/workspace/ai-drakon-setup/services/shared/drakon_shared/configs
```

### Крок 2: pyproject.toml

```toml
# services/shared/pyproject.toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "drakon-shared"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["pydantic>=2.0", "fastapi>=0.111.0"]

[tool.hatch.build.targets.wheel]
packages = ["drakon_shared"]
```

### Крок 3: __init__.py (порожній)

```python
# services/shared/drakon_shared/__init__.py
```

### Крок 4: pipeline_schema.py

```python
# services/shared/drakon_shared/pipeline_schema.py
from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel

NodeType = Literal["action", "decision", "terminator", "loop_start", "loop_end"]
AgentId  = Literal["architect", "drakon", "docs"]


class NodeConfig(BaseModel):
    id:               str
    label:            str
    type:             NodeType
    is_llm:           bool = False
    is_deterministic: bool = False
    prompt_key:       Optional[str] = None
    description:      str = ""


class EdgeConfig(BaseModel):
    from_node: str
    to_node:   str
    label:     Optional[str] = None
    condition: Optional[Literal["yes", "no"]] = None


class PipelineConfig(BaseModel):
    id:             str
    agent_id:       AgentId
    name:           str
    description:    str
    nodes:          list[NodeConfig]
    edges:          list[EdgeConfig]
    max_iterations: int = 3
    version:        int = 1
```

### Крок 5: pipeline_manager.py

```python
# services/shared/drakon_shared/pipeline_manager.py
from __future__ import annotations
import json
from pathlib import Path
from .pipeline_schema import PipelineConfig, AgentId

CONFIGS_DIR = Path(__file__).parent / "configs"
_cache: dict[str, PipelineConfig] = {}


def load_pipeline(pipeline_id: str) -> PipelineConfig:
    if pipeline_id not in _cache:
        path = CONFIGS_DIR / f"{pipeline_id}.json"
        if not path.exists():
            raise FileNotFoundError(f"No config for pipeline: {pipeline_id}")
        _cache[pipeline_id] = PipelineConfig(**json.loads(path.read_text()))
    return _cache[pipeline_id]


def save_pipeline(pipeline_id: str, config: PipelineConfig) -> None:
    path = CONFIGS_DIR / f"{pipeline_id}.json"
    path.write_text(json.dumps(config.model_dump(), indent=2, ensure_ascii=False))
    _cache.pop(pipeline_id, None)


def list_pipelines(agent_id: AgentId | None = None) -> list[PipelineConfig]:
    result = []
    for path in sorted(CONFIGS_DIR.glob("*.json")):
        cfg = load_pipeline(path.stem)
        if agent_id is None or cfg.agent_id == agent_id:
            result.append(cfg)
    return result


def reload_pipeline(pipeline_id: str) -> PipelineConfig:
    _cache.pop(pipeline_id, None)
    return load_pipeline(pipeline_id)


def validate_topology(config: PipelineConfig) -> list[str]:
    errors: list[str] = []
    node_ids = {n.id for n in config.nodes} | {"__start__", "__end__"}

    for edge in config.edges:
        if edge.from_node not in node_ids:
            errors.append(f"Невідомий from_node: {edge.from_node}")
        if edge.to_node not in node_ids:
            errors.append(f"Невідомий to_node: {edge.to_node}")

    reachable: set[str] = {"__start__"}
    changed = True
    while changed:
        changed = False
        for edge in config.edges:
            if edge.from_node in reachable and edge.to_node not in reachable:
                reachable.add(edge.to_node)
                changed = True

    orphans = {n.id for n in config.nodes} - reachable - {"__start__", "__end__"}
    if orphans:
        errors.append(f"Недосяжні вузли: {sorted(orphans)}")
    if "__end__" not in reachable:
        errors.append("END недосяжний від жодного вузла")

    return errors
```

### Крок 6: pipeline_route.py

```python
# services/shared/drakon_shared/pipeline_route.py
from __future__ import annotations
from fastapi import APIRouter, HTTPException
from .pipeline_schema import PipelineConfig, AgentId
from .pipeline_manager import (
    load_pipeline, save_pipeline,
    list_pipelines, reload_pipeline, validate_topology,
)

router = APIRouter(prefix="/v1/agents/pipeline", tags=["pipeline-config"])


@router.get("")
def get_pipelines(agent_id: AgentId | None = None):
    return [p.model_dump() for p in list_pipelines(agent_id)]


@router.get("/{pipeline_id}")
def get_pipeline(pipeline_id: str):
    try:
        return load_pipeline(pipeline_id).model_dump()
    except FileNotFoundError:
        raise HTTPException(404, f"Pipeline not found: {pipeline_id}")


@router.patch("/{pipeline_id}")
def update_pipeline(pipeline_id: str, config: PipelineConfig):
    if config.id != pipeline_id:
        raise HTTPException(400, "pipeline_id mismatch")
    errors = validate_topology(config)
    if errors:
        raise HTTPException(422, {"topology_errors": errors})
    config.version += 1
    save_pipeline(pipeline_id, config)
    return {"ok": True, "version": reload_pipeline(pipeline_id).version}


@router.post("/{pipeline_id}/validate")
def validate_pipeline_route(pipeline_id: str):
    try:
        cfg = load_pipeline(pipeline_id)
    except FileNotFoundError:
        raise HTTPException(404)
    errors = validate_topology(cfg)
    return {"valid": len(errors) == 0, "errors": errors}
```

### Крок 7: pip install -e (ОДИН РАЗ — спільний venv)

```bash
cd ~/workspace/ai-drakon-setup
services/drakon-agent/.venv/bin/pip install -e services/shared/ --quiet
```

**Перевірка (Assert):**

```bash
services/drakon-agent/.venv/bin/python -c \
  "from drakon_shared.pipeline_schema import PipelineConfig; print('✓ drakon_shared OK')"
```

Очікуваний результат: `✓ drakon_shared OK`

### Крок 8: Коміт

```bash
cd ~/workspace/ai-drakon-setup
git add services/shared/
git commit -m "feat(sprint5): drakon_shared package — pipeline schema, manager, route"
git push origin main && git push drakon-flow-new main
```

---

## Завдання 2 — Конфіги JSON пайплайнів (4 файли)

**Файли:** `services/shared/drakon_shared/configs/*.json`

### 2.1 architect-a.json

```json
{
  "id": "architect-a",
  "agent_id": "architect",
  "name": "Pipeline A: Код → DRAKON IR",
  "description": "LangGraph StateGraph · Ralph Loop max 3 iter",
  "max_iterations": 3,
  "version": 1,
  "nodes": [
    {"id": "measure_cc",    "label": "measure_cc",         "type": "action",   "is_deterministic": true,  "description": "radon.complexity.cc_visit() — max CC"},
    {"id": "classify",      "label": "classify_complexity", "type": "decision", "is_deterministic": true,  "description": "CC≤10 → AST path, CC>10 → LLM path"},
    {"id": "ast_translate", "label": "ast_translate",       "type": "action",   "is_deterministic": true,  "description": "Python AST → DRAKON IR без LLM"},
    {"id": "yaml_gen",      "label": "yaml_gen",            "type": "action",   "is_llm": true,            "prompt_key": "yaml_gen", "description": "LLM: Python → C4-B YAML"},
    {"id": "ir_gen",        "label": "ir_gen",              "type": "action",   "is_llm": true,            "prompt_key": "ir_gen",   "description": "LLM: YAML → DRAKON IR JSON (Ralph Loop)"},
    {"id": "validate",      "label": "validate",            "type": "action",   "is_deterministic": true,  "description": "ir_validator.py — топологічні правила"}
  ],
  "edges": [
    {"from_node": "__start__",     "to_node": "measure_cc"},
    {"from_node": "measure_cc",    "to_node": "classify"},
    {"from_node": "classify",      "to_node": "ast_translate", "condition": "yes", "label": "CC≤10"},
    {"from_node": "classify",      "to_node": "yaml_gen",      "condition": "no",  "label": "CC>10"},
    {"from_node": "ast_translate", "to_node": "validate"},
    {"from_node": "yaml_gen",      "to_node": "ir_gen"},
    {"from_node": "ir_gen",        "to_node": "validate"},
    {"from_node": "validate",      "to_node": "__end__",  "condition": "yes", "label": "valid"},
    {"from_node": "validate",      "to_node": "ir_gen",   "condition": "no",  "label": "invalid·iter<3"}
  ]
}
```

### 2.2 architect-b.json

```json
{
  "id": "architect-b",
  "agent_id": "architect",
  "name": "Pipeline B: DRAKON IR → Код",
  "description": "LangGraph StateGraph · Syntax Loop max 3 iter",
  "max_iterations": 3,
  "version": 1,
  "nodes": [
    {"id": "code_gen",     "label": "code_gen",     "type": "action", "is_llm": true, "prompt_key": "code_gen",  "description": "LLM: DRAKON IR → код цільовою мовою"},
    {"id": "check_syntax", "label": "check_syntax", "type": "action", "is_deterministic": true, "description": "ast.parse() — перевірка синтаксису"}
  ],
  "edges": [
    {"from_node": "__start__",    "to_node": "code_gen"},
    {"from_node": "code_gen",     "to_node": "check_syntax"},
    {"from_node": "check_syntax", "to_node": "__end__",  "condition": "yes", "label": "valid"},
    {"from_node": "check_syntax", "to_node": "code_gen", "condition": "no",  "label": "err·iter<3"}
  ]
}
```

### 2.3 drakon-analyze.json

```json
{
  "id": "drakon-analyze",
  "agent_id": "drakon",
  "name": "Аналіз Python AST",
  "description": "Детерміністичний транслятор · Python AST → DRAKON IR · без LLM",
  "max_iterations": 1,
  "version": 1,
  "nodes": [
    {"id": "ast_visitor", "label": "PythonAnalyzer", "type": "action", "is_deterministic": true, "description": "ast.NodeVisitor → DRAKON IR вузли та зв'язки"},
    {"id": "validate_ir", "label": "validate_ir",    "type": "action", "is_deterministic": true, "description": "ir_validator.py — топологічні перевірки"}
  ],
  "edges": [
    {"from_node": "__start__",   "to_node": "ast_visitor"},
    {"from_node": "ast_visitor", "to_node": "validate_ir"},
    {"from_node": "validate_ir", "to_node": "__end__"}
  ]
}
```

### 2.4 docs-chat.json

```json
{
  "id": "docs-chat",
  "agent_id": "docs",
  "name": "Docs Q&A Pipeline",
  "description": "BM25 KB retrieval + LLM answer · 2 вузли",
  "max_iterations": 1,
  "version": 1,
  "nodes": [
    {"id": "retrieve_context", "label": "retrieve_context", "type": "action", "is_deterministic": true, "description": "BM25 пошук релевантних фрагментів з KB"},
    {"id": "answer",           "label": "answer",           "type": "action", "is_llm": true, "prompt_key": "answer", "description": "LLM формує відповідь"}
  ],
  "edges": [
    {"from_node": "__start__",        "to_node": "retrieve_context"},
    {"from_node": "retrieve_context", "to_node": "answer"},
    {"from_node": "answer",           "to_node": "__end__"}
  ]
}
```

### 2.5 Верифікація

```bash
cd ~/workspace/ai-drakon-setup/services
services/drakon-agent/.venv/bin/python -c "
from drakon_shared.pipeline_manager import list_pipelines
for c in list_pipelines():
    print(f'  ✓ {c.id}: {len(c.nodes)} nodes, {len(c.edges)} edges')
"
```

Очікуваний результат:
```
  ✓ architect-a: 6 nodes, 9 edges
  ✓ architect-b: 2 nodes, 4 edges
  ✓ docs-chat: 2 nodes, 3 edges
  ✓ drakon-analyze: 2 nodes, 3 edges
```

### 2.6 Коміт

```bash
cd ~/workspace/ai-drakon-setup
git add services/shared/drakon_shared/configs/
git commit -m "feat(sprint5): pipeline JSON configs for all 4 pipelines"
git push origin main && git push drakon-flow-new main
```

---

## Завдання 3 — Підключення pipeline_config_router до architect-agent

**Файл:** `services/architect-agent/main.py`

**УВАГА:** `pipeline_config_router` (префікс `/v1/agents/pipeline`) — НЕ те саме, що `pipeline_router` (префікс `/pipeline` — запуск). Обидва монтуються разом, не конфліктують.

### Крок 1: Перевірити поточні імпорти

```bash
grep -n "from\|import\|include_router" ~/workspace/ai-drakon-setup/services/architect-agent/main.py
```

### Крок 2: Додати імпорт та include_router

Після рядку `from kb_route import router as kb_router` додати:

```python
from drakon_shared.pipeline_route import router as pipeline_config_router
```

Після `app.include_router(kb_router)` додати:

```python
app.include_router(pipeline_config_router)
```

### Крок 3: Перезапустити architect-agent

```bash
pkill -f "services/architect-agent/main.py" 2>/dev/null; sleep 2
cd ~/workspace/ai-drakon-setup
REPO_ROOT=~/workspace/ai-drakon-setup \
  PROXY_URL=http://localhost:18880/v1 \
  PROXY_TOKEN=freecc \
  PROXY_MODEL=agent-proxy \
  nohup services/drakon-agent/.venv/bin/python \
    services/architect-agent/main.py > /tmp/architect-agent.log 2>&1 &
sleep 3
```

### Крок 4: Димовий тест (smoke test)

```bash
curl -s http://localhost:8766/v1/agents/pipeline | python3 -m json.tool | head -10
```

**Перевірка (Assert):** JSON-масив з 4 елементами. При помилці 500 дивіться: `tail -30 /tmp/architect-agent.log`

### Крок 5: Коміт

```bash
cd ~/workspace/ai-drakon-setup
git add services/architect-agent/main.py
git commit -m "feat(sprint5): mount pipeline_config_router on architect-agent"
git push origin main && git push drakon-flow-new main
```

---

## Завдання 4 — Cloudflare Worker proxy для /v1/agents/pipeline

**Файл:** `cloudflare-worker/worker-mcp-drakon.js`

### Крок 1: Знайти місце вставки

```bash
grep -n "v1/kb/contribute\|v1/pipeline/analyze" \
  ~/workspace/ai-drakon-setup/cloudflare-worker/worker-mcp-drakon.js | head -5
```

### Крок 2: Додати маршрут

Вставити ПЕРЕД рядком з `/v1/kb/contribute` наступний блок:

```javascript
// Pipeline config registry — proxy to architect-agent
if (path.startsWith("/v1/agents/pipeline")) {
  const targetUrl = architectUrl + path + (url.search || "");
  const proxied = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
  });
  return fetch(proxied);
}
```

**ПРИМІТКА:** `architectUrl` вже визначений у Worker як URL архітект-агента.

### Крок 3: Деплой

```bash
cd ~/workspace/ai-drakon-setup
printf 'name = "drakon-mcp-worker"\nmain = "cloudflare-worker/worker-mcp-drakon.js"\ncompatibility_date = "2024-01-01"\naccount_id = "c354ea45a11a1e1c14f1f41fe780cb34"\n' > /tmp/worker-wrangler.toml

CLOUDFLARE_API_TOKEN=$(grep CLOUDFLARE_API_TOKEN .env | cut -d= -f2) \
  npx --yes wrangler@latest deploy \
  --config /tmp/worker-wrangler.toml \
  cloudflare-worker/worker-mcp-drakon.js
```

### Крок 4: Публічний димовий тест

```bash
JWT=$(grep JWT_SECRET ~/workspace/ai-drakon-setup/.env | cut -d= -f2)
curl -s \
  -H "Authorization: Bearer $JWT" \
  "https://drakon-mcp-worker.maxfraieho.workers.dev/v1/agents/pipeline" \
  | python3 -m json.tool | head -10
```

**Перевірка (Assert):** 4 pipeline configs у масиві.

### Крок 5: Коміт

```bash
cd ~/workspace/ai-drakon-setup
git add cloudflare-worker/worker-mcp-drakon.js
git commit -m "feat(sprint5): worker proxy for /v1/agents/pipeline"
git push origin main && git push drakon-flow-new main
```

---

## Завдання 5 — Фронтенд: pipeline-config-api.ts

**Файл:** `src/lib/pipeline-config-api.ts` (та `.lovable/src/lib/pipeline-config-api.ts`)

```typescript
// src/lib/pipeline-config-api.ts
export type NodeType = "action" | "decision" | "terminator" | "loop_start" | "loop_end";
export type AgentId  = "architect" | "drakon" | "docs";

export interface NodeConfig {
  id:               string;
  label:            string;
  type:             NodeType;
  is_llm:           boolean;
  is_deterministic: boolean;
  prompt_key?:      string | null;
  description:      string;
}

export interface EdgeConfig {
  from_node: string;
  to_node:   string;
  label?:    string;
  condition?: "yes" | "no";
}

export interface PipelineConfig {
  id:             string;
  agent_id:       AgentId;
  name:           string;
  description:    string;
  nodes:          NodeConfig[];
  edges:          EdgeConfig[];
  max_iterations: number;
  version:        number;
}

export interface ValidationResult {
  valid:  boolean;
  errors: string[];
}

const worker = () =>
  import.meta.env.VITE_WORKER_URL ??
  "https://drakon-mcp-worker.maxfraieho.workers.dev";

function authHeaders(): HeadersInit {
  const jwt = localStorage.getItem("jwt") ?? "";
  return {
    "Content-Type": "application/json",
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
  };
}

export async function fetchPipelines(agentId?: AgentId): Promise<PipelineConfig[]> {
  const url = new URL(`${worker()}/v1/agents/pipeline`);
  if (agentId) url.searchParams.set("agent_id", agentId);
  const r = await fetch(url.toString(), { headers: authHeaders() });
  if (!r.ok) throw new Error(`fetchPipelines: ${r.status}`);
  return r.json() as Promise<PipelineConfig[]>;
}

export async function fetchPipeline(id: string): Promise<PipelineConfig> {
  const r = await fetch(`${worker()}/v1/agents/pipeline/${id}`, { headers: authHeaders() });
  if (!r.ok) throw new Error(`Pipeline not found: ${id}`);
  return r.json() as Promise<PipelineConfig>;
}

export async function savePipeline(
  config: PipelineConfig,
): Promise<{ ok: boolean; version: number }> {
  const r = await fetch(`${worker()}/v1/agents/pipeline/${config.id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(config),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({})) as { topology_errors?: string[] };
    throw new Error(err.topology_errors?.join("; ") ?? `Save failed: ${r.status}`);
  }
  return r.json() as Promise<{ ok: boolean; version: number }>;
}

export async function validatePipeline(id: string): Promise<ValidationResult> {
  const r = await fetch(`${worker()}/v1/agents/pipeline/${id}/validate`, {
    method: "POST",
    headers: authHeaders(),
  });
  return r.json() as Promise<ValidationResult>;
}
```

**Коміт:**

```bash
cd ~/workspace/ai-drakon-setup
cp src/lib/pipeline-config-api.ts .lovable/src/lib/pipeline-config-api.ts
git add src/lib/pipeline-config-api.ts .lovable/src/lib/pipeline-config-api.ts
git commit -m "feat(sprint5): TypeScript pipeline config API client"
git push origin main && git push drakon-flow-new main
```

---

## Завдання 6 — Фронтенд: pipeline-to-drakon.ts (конвертори)

**Файл:** `src/lib/pipeline-to-drakon.ts` (та `.lovable/src/lib/pipeline-to-drakon.ts`)

**Концепція:**
- `pipelineToIR`: NodeConfig(action/decision) → IrItem(action/question), EdgeConfig → one/two connections.
- `irToPipeline`: зворотньо, зберігаючи metadata (is_llm, prompt_key тощо) з оригінального config.

**DRAKON IR інваріанти (НЕ порушувати):**
- `b0`: entry branch node, `one` → перший вузол.
- `end`: terminal, завжди присутній.
- `one` = YES / down, `two` = NO / right.
- Всі items — `Record<string, DrakonItem>`.

```typescript
// src/lib/pipeline-to-drakon.ts
import type { DrakonDiagram, DrakonItem } from "@/types/drakon";
import type { NodeConfig, PipelineConfig } from "./pipeline-config-api";

export function pipelineToIR(config: PipelineConfig): DrakonDiagram {
  const items: Record<string, DrakonItem> = {};
  const nodeToItem = new Map<string, string>();
  let counter = 0;

  for (const node of config.nodes) {
    const prefix = node.type === "decision" ? "q" : "n";
    nodeToItem.set(node.id, `${prefix}${++counter}`);
  }
  nodeToItem.set("__end__", "end");

  const startEdge = config.edges.find((e) => e.from_node === "__start__");
  const firstItemId = startEdge ? (nodeToItem.get(startEdge.to_node) ?? "end") : "end";

  items["b0"] = { type: "header", content: config.name, branchId: "0", one: firstItemId };

  for (const node of config.nodes) {
    const itemId = nodeToItem.get(node.id)!;
    items[itemId] = {
      type: node.type === "decision" ? "question" : "action",
      content: node.label,
    };
  }

  items["end"] = { type: "end", content: "" };

  for (const edge of config.edges) {
    if (edge.from_node === "__start__") continue;
    const fromId = nodeToItem.get(edge.from_node);
    if (!fromId || !items[fromId]) continue;
    const toId = edge.to_node === "__end__" ? "end" : nodeToItem.get(edge.to_node);
    if (!toId) continue;
    if (edge.condition === "no") {
      items[fromId] = { ...items[fromId], two: toId };
    } else {
      items[fromId] = { ...items[fromId], one: toId };
    }
  }

  return { name: config.name, access: "write", items };
}

export function irToPipeline(
  diagram: DrakonDiagram,
  original: PipelineConfig,
): PipelineConfig {
  const nodes: NodeConfig[] = [];
  const edges = [];
  const byLabel = new Map(original.nodes.map((n) => [n.label, n]));
  const itemToNode = new Map<string, string>();

  for (const [itemId, item] of Object.entries(diagram.items)) {
    if (itemId === "b0" || itemId === "end" || item.type === "end") continue;
    const orig = byLabel.get(item.content);
    const nodeId = orig?.id ?? slugify(item.content);
    itemToNode.set(itemId, nodeId);
    nodes.push({
      id:               nodeId,
      label:            item.content,
      type:             item.type === "question" ? "decision" : "action",
      is_llm:           orig?.is_llm ?? false,
      is_deterministic: orig?.is_deterministic ?? true,
      prompt_key:       orig?.prompt_key ?? null,
      description:      orig?.description ?? "",
    });
  }

  const b0 = diagram.items["b0"];
  if (b0?.one && b0.one !== "end") {
    const first = itemToNode.get(b0.one);
    if (first) edges.push({ from_node: "__start__", to_node: first });
  }

  for (const [itemId, item] of Object.entries(diagram.items)) {
    if (itemId === "b0") continue;
    const from = itemToNode.get(itemId);
    if (!from) continue;
    const isQ = item.type === "question";
    if (item.one) {
      const to = item.one === "end" ? "__end__" : itemToNode.get(item.one);
      if (to) edges.push({ from_node: from, to_node: to, ...(isQ ? { condition: "yes" as const, label: "yes" } : {}) });
    }
    if (item.two) {
      const to = item.two === "end" ? "__end__" : itemToNode.get(item.two);
      if (to) edges.push({ from_node: from, to_node: to, condition: "no" as const, label: "no" });
    }
  }

  return { ...original, nodes, edges };
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
```

**Коміт:**

```bash
cd ~/workspace/ai-drakon-setup
cp src/lib/pipeline-to-drakon.ts .lovable/src/lib/pipeline-to-drakon.ts
git add src/lib/pipeline-to-drakon.ts .lovable/src/lib/pipeline-to-drakon.ts
git commit -m "feat(sprint5): PipelineConfig <-> DrakonDiagram converters"
git push origin main && git push drakon-flow-new main
```

---

## Промпт Lovable 40 — Редактор конвеєрів (віджет DRAKON)

**Зберегти в:** `lovable-prompts/40-pipeline-editor.md`  
**Застосувати:** вставити текст у Lovable chat

### Мета
Додати `/agents/pipeline/:id/edit` — редактор топології пайплайну на основі існуючого DrakonEditor з кастомним збереженням через PATCH `/v1/agents/pipeline/:id`.

### Нові файли
- `src/routes/pipeline-editor.tsx` — TanStack Router route
- `src/pages/PipelineEditorPage.tsx` — сторінка

### Зміни в існуючих файлах
- `src/components/drakon/DrakonEditor.tsx` — додати prop `onSaveOverride`
- `src/__root.tsx` — hideChrome для `/agents/pipeline/`

### 1. DrakonEditor — додати onSaveOverride

В `DrakonEditorProps` інтерфейс (~рядок 66) додати:
```typescript
onSaveOverride?: (diagram: DrakonDiagram) => Promise<boolean>;
```

У функції handleSave (де викликається `widgetRef.current?.exportJson()`) на самому початку додати:
```typescript
if (onSaveOverride && widgetRef.current) {
  const jsonString = widgetRef.current.exportJson();
  if (!jsonString) return;
  const diagram = JSON.parse(jsonString) as DrakonDiagram;
  await onSaveOverride(diagram);
  return;
}
// ... далі існуючий код збереження
```

### 2. src/routes/pipeline-editor.tsx

```typescript
import { createFileRoute } from "@tanstack/react-router";
import PipelineEditorPage from "@/pages/PipelineEditorPage";

export const Route = createFileRoute("/agents/pipeline/$pipelineId/edit")({
  component: PipelineEditorPage,
});
```

### 3. src/pages/PipelineEditorPage.tsx

```typescript
import { useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { DrakonEditor } from "@/components/drakon/DrakonEditor";
import type { DrakonDiagram } from "@/types/drakon";
import {
  fetchPipeline, savePipeline, validatePipeline,
  type PipelineConfig,
} from "@/lib/pipeline-config-api";
import { pipelineToIR, irToPipeline } from "@/lib/pipeline-to-drakon";

export default function PipelineEditorPage() {
  const { pipelineId } = useParams({ strict: false }) as { pipelineId?: string };
  const [config, setConfig] = useState<PipelineConfig | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!pipelineId) return;
    fetchPipeline(pipelineId)
      .then(setConfig)
      .catch(() => toast.error("Pipeline не знайдено"));
  }, [pipelineId]);

  const handleSaveOverride = async (diagram: DrakonDiagram): Promise<boolean> => {
    if (!config) return false;
    setErrors([]);
    try {
      const updated = irToPipeline(diagram, config);
      const result = await savePipeline(updated);
      setConfig((c) => (c ? { ...c, version: result.version } : c));
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Помилка збереження";
      setErrors([msg]);
      toast.error(msg);
      return false;
    }
  };

  const handleValidate = async () => {
    if (!pipelineId) return;
    const res = await validatePipeline(pipelineId);
    setErrors(res.errors);
    if (res.valid) toast.success("Топологія валідна ✓");
    else toast.error(`${res.errors.length} помилок топології`);
  };

  if (!config) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-base)] font-mono text-sm text-[var(--text-secondary)]">
        Завантаження пайплайну…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--bg-base)] antialiased">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3">
        <Link
          to="/agents"
          className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] active:scale-[0.96] active:transition-transform active:duration-75"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Агенти
        </Link>
        <span className="mx-1 text-[var(--border-subtle)]">·</span>
        <span className="font-mono text-xs text-[var(--text-secondary)]">{config.name}</span>
        <span className="ml-auto font-mono text-[10px] tabular-nums text-[var(--text-tertiary)]">
          v{config.version}
        </span>
        <button
          type="button"
          onClick={handleValidate}
          className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] active:scale-[0.96] active:transition-transform active:duration-75"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Validate
        </button>
      </div>

      {errors.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-1 border-b border-[var(--border-subtle)] bg-red-950/30 px-3 py-1.5">
          {errors.map((e, i) => (
            <span key={i} className="font-mono text-[11px] text-red-400">{e}</span>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1">
        <DrakonEditor
          diagram={pipelineToIR(config)}
          diagramId={`pipeline-${config.id}`}
          isNew={false}
          onSaveOverride={handleSaveOverride}
          className="h-full"
        />
      </div>
    </div>
  );
}
```

### 4. hideChrome у __root.tsx

В масиві або перевірці, де додається hideChrome — додати:
```typescript
pathname.startsWith("/agents/pipeline/")
```

### 5. AgentStudioPage — Edit кнопки в AgentSidebar

У списку пайплайнів (AgentSidebar), для кожного pipeline.id додати посилання:
```typescript
<Link
  to="/agents/pipeline/$pipelineId/edit"
  params={{ pipelineId: pipeline.id }}
  className="inline-flex h-7 items-center gap-1 rounded px-2 font-mono text-[10px] uppercase tracking-wider text-[var(--accent-amber)] opacity-60 transition-opacity hover:opacity-100 active:scale-[0.96] active:transition-transform active:duration-75"
>
  Edit
</Link>
```

## Дизайн-система
> Використовувати тільки CSS var токени. Hex не хардкодити.
> JetBrains Mono на всіх елементах тулбару.

### Контрольний список make-interfaces
- [ ] `antialiased` на кореневому `div`
- [ ] `tabular-nums` на `v{config.version}`
- [ ] `active:scale-[0.96] transition-transform duration-75` на всіх кнопках
- [ ] ≥ 40px hit area (h-8 мінімум)
- [ ] `transition-colors` (не `transition-all`)

### ВАЖЛИВО: Синхронізація після змін
Скопіюй `src/` до `.lovable/src/`. CF Pages будує з `.lovable/src/`.

---

## Завдання 7 — Зберегти промт + верифікація

### 7.1 Зберегти lovable-prompts/40-pipeline-editor.md

```bash
# Зберегти вміст секції "Промпт Lovable 40" у файл
# git add + commit + push на обидва репозиторії
cd ~/workspace/ai-drakon-setup
git add lovable-prompts/40-pipeline-editor.md docs/plans/2026-05-16-sprint5-pipeline-mgmt.md
git commit -m "docs(sprint5): plan + lovable prompt 40"
git push origin main && git push drakon-flow-new main
```

### 7.2 Застосувати промт у Lovable → Верифікація через PinchTab

Після того як Lovable виконає і CF Pages задеплоїть:

```bash
# Список вкладок
# mcp__pinchtab__pinchtab_list_tabs()

# Скріншот /agents (перевірити наявність Edit кнопок)
sshpass -p '805235io.' ssh vokov@192.168.3.184 \
  'curl -s -H "Authorization: Bearer 0117419fcfb5de5d82220c1f9da8de97" \
   "http://localhost:9867/screenshot?raw=true&tabId=TAB_ID&format=jpeg&quality=88" \
   -o ~/workspace/ai-drakon-setup/import/sprint5_verify/agents_edit.jpg'

# Навігація до /agents/pipeline/architect-a/edit
# mcp__pinchtab__pinchtab_navigate(url="https://ai-drakon-setup.pages.dev/agents/pipeline/architect-a/edit")

# Скріншот editor
sshpass -p '805235io.' ssh vokov@192.168.3.184 \
  'curl -s -H "Authorization: Bearer 0117419fcfb5de5d82220c1f9da8de97" \
   "http://localhost:9867/screenshot?raw=true&tabId=TAB_ID&format=jpeg&quality=88" \
   -o ~/workspace/ai-drakon-setup/import/sprint5_verify/pipeline_editor.jpg'
```

**Контрольний список перевірок (Assert):**
- [ ] `/agents` — Edit кнопки біля кожного pipeline.
- [ ] `/agents/pipeline/architect-a/edit` — DRAKON editor завантажується з architect-a схемою.
- [ ] Toolbar: Back · Pipeline A: Код → DRAKON IR · v1 · Validate.
- [ ] Save (кнопка в DrakonEditor toolbar) → toast "Пайплайн збережено" → версія у toolbar збільшується.

---

## Після Спринту 5 — повернення до Спринту 4 (Підтримка JS/TS)

**План:** `docs/plans/2026-05-16-js-ts-support.md`  
**Статус завдань 1-6:** всі ⏳

**ВАЖЛИВО:** tree-sitter 0.25.2 + tree-sitter-javascript/typescript вже встановлені у `.venv` вручну. Завдання 1 — лише прописати у `pyproject.toml`.

---

## Семантичні зв'язки

**Цей документ є частиною:** [[plans/_INDEX]]
**Цей документ пов'язаний з:**
- [[plans/2026-05-15-langgraph-pipeline]] — план реалізації конвеєра LangGraph
- [[ux-audit/stitch-prompt-agent-studio]] — аудит та промпт інтерфейсу студії агентів
**Читати далі:** [[plans/2026-05-21-ir-scheme-bidirectional-import]]
