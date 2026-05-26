---
title: "DRAKON-as-Runtime for LangGraph Pipelines — Implementation Plan"
type: plan
tags: [drakon, langgraph, pipeline, agent, frontend]
status: active
created: 2026-05-21
updated: 2026-05-26
---

# DRAKON-as-Runtime for LangGraph Pipelines — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** DRAKON IR JSON стає єдиним джерелом правди для LangGraph пайплайнів агентів; нова вкладка `/pipelines` дозволяє переглядати, редагувати та live-моніторити виконання з human-in-the-loop breakpoints.

**Architecture:**
- `pipelines/*.drakon.json` замінює `graphs.py` як визначення пайплайну
- `graph_loader.py` компілює DRAKON IR → LangGraph StateGraph при старті і після PUT
- Frontend `/pipelines`: DRAKON editor + SSE overlay (amber пульс на активному вузлі) + right panel зі state inspector + breakpoint editor

**Tech Stack:** Python 3.11, LangGraph, FastAPI SSE (`sse-starlette`), React 18, TanStack Router, drakonwidget.js, shadcn/ui, TypeScript

---

## Task 1: DRAKON IR файли для Pipeline A та Pipeline B

**Files:**
- Create: `services/architect-agent/pipelines/pipeline_a.drakon.json`
- Create: `services/architect-agent/pipelines/pipeline_b.drakon.json`

**Конвенція маппінгу:**
- DRAKON `action` → LangGraph node; `content` = ім'я функції в NODE_REGISTRY
- DRAKON `question` → conditional_edges; `content` = ім'я функції в ROUTER_REGISTRY; `one` = YES-гілка, `two` = NO-гілка
- DRAKON `header` → entry_point (перший вузол через `one`)
- DRAKON `end` → `END`
- Зворотні ребра (loops): `one` або `two` вказують на ID раннього вузла

**Step 1: Написати pipeline_a.drakon.json**

```json
{
  "name": "Pipeline A — Code → DRAKON IR",
  "items": {
    "1":  {"type": "header",   "content": "Pipeline A",           "one": "2"},
    "2":  {"type": "action",   "content": "measure_cc",           "one": "3"},
    "3":  {"type": "action",   "content": "classify",             "one": "4"},
    "4":  {"type": "question", "content": "route_by_complexity",  "one": "5",  "two": "6"},
    "5":  {"type": "action",   "content": "ast_translate",        "one": "7"},
    "6":  {"type": "action",   "content": "yaml_gen",             "one": "8"},
    "8":  {"type": "action",   "content": "ir_gen",               "one": "7"},
    "7":  {"type": "action",   "content": "validate",             "one": "9"},
    "9":  {"type": "question", "content": "route_after_validate", "one": "10", "two": "8"},
    "10": {"type": "end",      "content": "END"}
  },
  "schema": {
    "state_class": "AnalysisState",
    "node_module": "pipeline.nodes_analysis",
    "router_module": "pipeline.graphs"
  }
}
```

**Step 2: Написати pipeline_b.drakon.json**

```json
{
  "name": "Pipeline B — DRAKON IR → Code",
  "items": {
    "1": {"type": "header",   "content": "Pipeline B",          "one": "2"},
    "2": {"type": "action",   "content": "code_gen",            "one": "3"},
    "3": {"type": "action",   "content": "check_syntax",        "one": "4"},
    "4": {"type": "question", "content": "route_after_syntax",  "one": "5", "two": "2"},
    "5": {"type": "end",      "content": "END"}
  },
  "schema": {
    "state_class": "VibeCodingState",
    "node_module": "pipeline.nodes_vibe",
    "router_module": "pipeline.graphs"
  }
}
```

**Step 3: Перевірити JSON синтаксис**
```bash
python3 -c "import json; json.load(open('services/architect-agent/pipelines/pipeline_a.drakon.json'))" && echo "OK"
python3 -c "import json; json.load(open('services/architect-agent/pipelines/pipeline_b.drakon.json'))" && echo "OK"
```
Expected: `OK` двічі

**Step 4: Commit**
```bash
git add services/architect-agent/pipelines/pipeline_a.drakon.json services/architect-agent/pipelines/pipeline_b.drakon.json
git commit -m "feat(pipelines): add DRAKON IR source files for Pipeline A and B"
```

---

## Task 2: graph_loader.py — DRAKON IR → LangGraph compiler

**Files:**
- Create: `services/architect-agent/pipeline/graph_loader.py`
- Create: `services/architect-agent/pipeline/tests/test_graph_loader.py`

**Step 1: Написати failing test**

```python
# services/architect-agent/pipeline/tests/test_graph_loader.py
import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from pipeline.graph_loader import load_graph_from_file

PIPELINES_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'pipelines')

def test_load_pipeline_a_compiles():
    path = os.path.join(PIPELINES_DIR, 'pipeline_a.drakon.json')
    graph = load_graph_from_file(path)
    assert graph is not None

def test_load_pipeline_b_compiles():
    path = os.path.join(PIPELINES_DIR, 'pipeline_b.drakon.json')
    graph = load_graph_from_file(path)
    assert graph is not None

def test_pipeline_a_has_measure_cc_node():
    path = os.path.join(PIPELINES_DIR, 'pipeline_a.drakon.json')
    graph = load_graph_from_file(path)
    assert 'measure_cc' in graph.nodes
```

**Step 2: Запустити, переконатись що FAIL**
```bash
cd services/architect-agent && python3 -m pytest pipeline/tests/test_graph_loader.py -v 2>&1 | head -20
```
Expected: `ImportError` або `ModuleNotFoundError: graph_loader`

**Step 3: Написати graph_loader.py**

```python
# services/architect-agent/pipeline/graph_loader.py
"""Compile DRAKON IR JSON → LangGraph StateGraph."""
import json, importlib
from pathlib import Path
from typing import Any
from langgraph.graph import StateGraph, END

# Registry: node name → function reference
from .nodes_analysis import (
    measure_cc, classify_complexity as classify,
    ast_translate, yaml_gen_node as yaml_gen,
    ir_gen_node as ir_gen, validate_ir_node as validate,
    code_gen_node as code_gen,
)
from .nodes_vibe import check_syntax
from .graphs import _route_by_complexity, _route_after_validate, _route_after_syntax
from .states import AnalysisState, VibeCodingState

NODE_REGISTRY: dict[str, Any] = {
    "measure_cc": measure_cc,
    "classify": classify,
    "ast_translate": ast_translate,
    "yaml_gen": yaml_gen,
    "ir_gen": ir_gen,
    "validate": validate,
    "code_gen": code_gen,
    "check_syntax": check_syntax,
}

ROUTER_REGISTRY: dict[str, Any] = {
    "route_by_complexity": _route_by_complexity,
    "route_after_validate": _route_after_validate,
    "route_after_syntax": _route_after_syntax,
}

STATE_REGISTRY: dict[str, Any] = {
    "AnalysisState": AnalysisState,
    "VibeCodingState": VibeCodingState,
}


def _resolve_target(item_id: str, items: dict) -> str:
    """Follow chain to first action/end node, return node name or END sentinel."""
    if item_id not in items:
        return END
    item = items[item_id]
    if item["type"] == "action":
        return item["content"]
    if item["type"] == "end":
        return END
    if item["type"] == "header":
        return _resolve_target(item.get("one", ""), items)
    return END


def load_graph_from_ir(ir: dict) -> Any:
    """Build and compile LangGraph graph from DRAKON IR dict."""
    items = ir["items"]
    schema = ir.get("schema", {})
    state_class = STATE_REGISTRY.get(schema.get("state_class", ""), AnalysisState)

    g = StateGraph(state_class)

    # Pass 1: register action nodes
    for item_id, item in items.items():
        if item["type"] == "action":
            fn = NODE_REGISTRY.get(item["content"])
            if fn:
                g.add_node(item["content"], fn)

    # Pass 2: wire edges
    for item_id, item in items.items():
        if item["type"] == "header":
            entry = _resolve_target(item.get("one", ""), items)
            if entry != END:
                g.set_entry_point(entry)

        elif item["type"] == "action":
            next_id = item.get("one", "")
            if not next_id:
                continue
            next_item = items.get(next_id, {})

            if next_item.get("type") == "question":
                # Conditional edges from this action node
                router_fn = ROUTER_REGISTRY.get(next_item["content"])
                if router_fn:
                    yes_target = _resolve_target(next_item.get("one", ""), items)
                    no_target  = _resolve_target(next_item.get("two", ""), items)
                    routing_map = {yes_target: yes_target, no_target: no_target}
                    g.add_conditional_edges(item["content"], router_fn, routing_map)
            else:
                target = _resolve_target(next_id, items)
                if target == END:
                    g.add_edge(item["content"], END)
                else:
                    g.add_edge(item["content"], target)

    return g.compile()


def load_graph_from_file(path: str) -> Any:
    with open(path) as f:
        ir = json.load(f)
    return load_graph_from_ir(ir)
```

**Step 4: Запустити тести**
```bash
cd services/architect-agent && python3 -m pytest pipeline/tests/test_graph_loader.py -v
```
Expected: 3 PASS

**Step 5: Commit**
```bash
git add services/architect-agent/pipeline/graph_loader.py services/architect-agent/pipeline/tests/test_graph_loader.py
git commit -m "feat(graph_loader): DRAKON IR → LangGraph compiler with node/router registries"
```

---

## Task 3: graph_pipeline_route.py — CRUD + SSE execution + breakpoints

**Files:**
- Create: `services/architect-agent/graph_pipeline_route.py`
- Modify: `services/architect-agent/main.py` (додати include_router)

**Step 1: Написати failing test**

```python
# services/architect-agent/tests/test_graph_pipeline_route.py
from fastapi.testclient import TestClient
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from main import app

client = TestClient(app)

def test_list_pipelines():
    r = client.get("/graph-pipelines")
    assert r.status_code == 200
    data = r.json()
    assert "pipelines" in data
    names = [p["name"] for p in data["pipelines"]]
    assert "pipeline_a" in names
    assert "pipeline_b" in names

def test_get_pipeline_a():
    r = client.get("/graph-pipelines/pipeline_a")
    assert r.status_code == 200
    ir = r.json()
    assert "items" in ir
    assert "1" in ir["items"]
```

**Step 2: Запустити, переконатись що FAIL**
```bash
cd services/architect-agent && python3 -m pytest tests/test_graph_pipeline_route.py -v 2>&1 | head -20
```
Expected: `404` (маршрут не зареєстровано)

**Step 3: Написати graph_pipeline_route.py**

```python
# services/architect-agent/graph_pipeline_route.py
"""CRUD + SSE execution for DRAKON-defined LangGraph pipelines."""
import json, asyncio, uuid
from pathlib import Path
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from pipeline.graph_loader import load_graph_from_ir

PIPELINES_DIR = Path(__file__).parent / "pipelines"
router = APIRouter(prefix="/graph-pipelines")

# In-memory execution sessions: {job_id: {status, state, graph_name, interrupt_event, resume_state}}
_sessions: dict[str, dict] = {}


def _list_pipeline_files() -> list[dict]:
    if not PIPELINES_DIR.exists():
        return []
    result = []
    for f in sorted(PIPELINES_DIR.glob("*.drakon.json")):
        try:
            ir = json.loads(f.read_text())
            result.append({"name": f.stem.replace(".drakon", ""), "display_name": ir.get("name", f.stem)})
        except Exception:
            pass
    return result


def _load_ir(name: str) -> dict:
    path = PIPELINES_DIR / f"{name}.drakon.json"
    if not path.exists():
        raise HTTPException(404, f"Pipeline '{name}' not found")
    return json.loads(path.read_text())


@router.get("")
def list_pipelines():
    return {"pipelines": _list_pipeline_files()}


@router.get("/{name}")
def get_pipeline(name: str):
    return _load_ir(name)


class PipelineIR(BaseModel):
    name: str
    items: dict
    schema: dict = {}


@router.put("/{name}")
def update_pipeline(name: str, body: PipelineIR):
    path = PIPELINES_DIR / f"{name}.drakon.json"
    PIPELINES_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(body.dict(), indent=2, ensure_ascii=False))
    # Hot-reload: verify it compiles
    try:
        load_graph_from_ir(body.dict())
    except Exception as e:
        raise HTTPException(422, f"Graph compile error: {e}")
    return {"ok": True, "name": name}


class ExecuteRequest(BaseModel):
    initial_state: dict
    breakpoints: list[str] = []  # node names where to pause


@router.post("/{name}/execute")
def start_execution(name: str, body: ExecuteRequest):
    ir = _load_ir(name)
    job_id = str(uuid.uuid4())
    _sessions[job_id] = {
        "status": "pending",
        "graph_name": name,
        "ir": ir,
        "initial_state": body.initial_state,
        "breakpoints": set(body.breakpoints),
        "current_node": None,
        "current_state": {},
        "interrupt_event": asyncio.Event(),
        "resume_event": asyncio.Event(),
        "resume_state_override": None,
        "events": [],
    }
    return {"job_id": job_id}


async def _run_pipeline(job_id: str):
    session = _sessions[job_id]
    ir = session["ir"]
    try:
        graph = load_graph_from_ir(ir)
        session["status"] = "running"
        initial = session["initial_state"]

        for node_name, state_update in graph.stream(initial):
            session["current_node"] = node_name
            session["current_state"].update(state_update)
            session["events"].append({"event": "node_done", "node": node_name, "state": dict(session["current_state"])})

            if node_name in session["breakpoints"]:
                session["status"] = "breakpoint"
                session["events"].append({"event": "breakpoint", "node": node_name, "state": dict(session["current_state"])})
                # Wait for resume
                session["interrupt_event"].set()
                await session["resume_event"].wait()
                session["resume_event"].clear()
                # Apply state override if provided
                if session["resume_state_override"]:
                    session["current_state"].update(session["resume_state_override"])
                    session["resume_state_override"] = None
                session["status"] = "running"

        session["status"] = "done"
        session["events"].append({"event": "done", "node": None, "state": dict(session["current_state"])})
    except Exception as e:
        session["status"] = "error"
        session["events"].append({"event": "error", "node": None, "error": str(e)})


@router.get("/{name}/execute/{job_id}/stream")
async def stream_execution(name: str, job_id: str, background_tasks: BackgroundTasks):
    if job_id not in _sessions:
        raise HTTPException(404, "Job not found")
    session = _sessions[job_id]

    async def event_generator() -> AsyncGenerator[str, None]:
        # Start execution in background
        task = asyncio.create_task(_run_pipeline(job_id))
        sent_idx = 0
        while True:
            events = session["events"]
            while sent_idx < len(events):
                ev = events[sent_idx]
                yield f"data: {json.dumps(ev)}\n\n"
                sent_idx += 1
            if session["status"] in ("done", "error"):
                break
            await asyncio.sleep(0.1)

    return StreamingResponse(event_generator(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


class ResumeRequest(BaseModel):
    state_override: dict = {}


@router.post("/{name}/execute/{job_id}/resume")
async def resume_execution(name: str, job_id: str, body: ResumeRequest):
    if job_id not in _sessions:
        raise HTTPException(404, "Job not found")
    session = _sessions[job_id]
    if session["status"] != "breakpoint":
        raise HTTPException(400, "Job is not at a breakpoint")
    if body.state_override:
        session["resume_state_override"] = body.state_override
    session["resume_event"].set()
    return {"ok": True}


@router.get("/{name}/execute/{job_id}/state")
def get_job_state(name: str, job_id: str):
    if job_id not in _sessions:
        raise HTTPException(404, "Job not found")
    s = _sessions[job_id]
    return {
        "job_id": job_id,
        "status": s["status"],
        "current_node": s["current_node"],
        "state": s["current_state"],
    }
```

**Step 4: Зареєструвати router в main.py**

Знайти в `services/architect-agent/main.py` блок з `app.include_router` і додати:
```python
from graph_pipeline_route import router as graph_pipeline_router
app.include_router(graph_pipeline_router)
```

**Step 5: Запустити тести**
```bash
cd services/architect-agent && python3 -m pytest tests/test_graph_pipeline_route.py -v
```
Expected: 2 PASS

**Step 6: Перезапустити агента і перевірити вручну**
```bash
sudo rc-service ai-architect-agent restart && sleep 2
curl -s http://localhost:8766/graph-pipelines | python3 -m json.tool
```
Expected: `{"pipelines": [{"name": "pipeline_a", ...}, {"name": "pipeline_b", ...}]}`

**Step 7: Commit**
```bash
git add services/architect-agent/graph_pipeline_route.py services/architect-agent/main.py
git commit -m "feat(api): add /graph-pipelines CRUD + SSE execution + breakpoint resume"
```

---

## Task 4: Frontend — lib/graph-pipeline-api.ts

**Files:**
- Create: `.lovable/src/lib/graph-pipeline-api.ts`
- Mirror:  `src/lib/graph-pipeline-api.ts`

**Step 1: Написати файл**

```typescript
// src/lib/graph-pipeline-api.ts
import { getWorkerUrl } from "@/lib/worker-url";

const BASE = () => getWorkerUrl().replace("/mcp", "") + "/architect";
// Architect agent: http://192.168.3.184:8766 via Worker proxy

export interface PipelineInfo {
  name: string;
  display_name: string;
}

export interface DrakonIR {
  name: string;
  items: Record<string, {
    type: "header" | "action" | "question" | "end";
    content: string;
    one?: string;
    two?: string;
  }>;
  schema?: { state_class?: string };
}

export interface ExecutionEvent {
  event: "node_done" | "breakpoint" | "done" | "error";
  node: string | null;
  state?: Record<string, unknown>;
  error?: string;
}

export async function listPipelines(): Promise<PipelineInfo[]> {
  const r = await fetch(`${BASE()}/graph-pipelines`);
  const data = await r.json();
  return data.pipelines ?? [];
}

export async function getPipeline(name: string): Promise<DrakonIR> {
  const r = await fetch(`${BASE()}/graph-pipelines/${name}`);
  if (!r.ok) throw new Error(`Pipeline ${name} not found`);
  return r.json();
}

export async function savePipeline(name: string, ir: DrakonIR): Promise<void> {
  const r = await fetch(`${BASE()}/graph-pipelines/${name}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ir),
  });
  if (!r.ok) throw new Error(`Save failed: ${r.status}`);
}

export async function startExecution(
  name: string,
  initialState: Record<string, unknown>,
  breakpoints: string[] = []
): Promise<string> {
  const r = await fetch(`${BASE()}/graph-pipelines/${name}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initial_state: initialState, breakpoints }),
  });
  const data = await r.json();
  return data.job_id;
}

export function streamExecution(
  name: string,
  jobId: string,
  onEvent: (ev: ExecutionEvent) => void,
  signal?: AbortSignal
): void {
  const url = `${BASE()}/graph-pipelines/${name}/execute/${jobId}/stream`;
  const es = new EventSource(url);
  es.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data));
      if (JSON.parse(e.data).event === "done" || JSON.parse(e.data).event === "error") {
        es.close();
      }
    } catch { /* skip */ }
  };
  signal?.addEventListener("abort", () => es.close());
}

export async function resumeExecution(
  name: string,
  jobId: string,
  stateOverride: Record<string, unknown> = {}
): Promise<void> {
  await fetch(`${BASE()}/graph-pipelines/${name}/execute/${jobId}/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state_override: stateOverride }),
  });
}
```

**Step 2: Синхронізувати в src/**
```bash
cp .lovable/src/lib/graph-pipeline-api.ts src/lib/graph-pipeline-api.ts
```

**Step 3: Commit**
```bash
git add .lovable/src/lib/graph-pipeline-api.ts src/lib/graph-pipeline-api.ts
git commit -m "feat(api-client): add graph-pipeline-api.ts for CRUD + SSE streaming"
```

---

## Task 5: Frontend — PipelinesPage компоненти

**Files:**
- Create: `.lovable/src/components/pipelines/PipelinesPage.tsx`
- Create: `.lovable/src/components/pipelines/PipelineDrakonView.tsx`
- Create: `.lovable/src/components/pipelines/NodeStateInspector.tsx`
- Mirror all → `src/components/pipelines/`

Ці три компоненти — Lovable prompt (Task 6).

---

## Task 6: Lovable Prompt 49 — /pipelines вкладка

**File:** `lovable-prompts/49-pipelines-drakon-live.md`

Написати Lovable prompt з наступним змістом:

```markdown
# Lovable Prompt 49 — DRAKON Live Pipeline Editor

## Мета
Додати вкладку `/pipelines` де DRAKON-схеми є джерелом правди для LangGraph агентів.
Три панелі: ліва (список пайплайнів), центр (DRAKON редактор + live overlay), права (state inspector при breakpoint).

## Крок 1: Маршрут і навігація

Створи `src/routes/pipelines.tsx`:
```tsx
import { createFileRoute } from "@tanstack/react-router";
import { PipelinesPage } from "@/components/pipelines/PipelinesPage";
export const Route = createFileRoute("/pipelines")({
  component: PipelinesPage,
});
```

В `src/components/workspace/WorkspaceShell.tsx` знайди масив з nav items (рядки з `to: "/diagrams"`, `to: "/docs"` etc.) і додай новий елемент:
```tsx
{ to: "/pipelines", label: "Пайплайни", icon: Workflow }
```
Імпортуй `Workflow` з `lucide-react`.

## Крок 2: PipelinesPage.tsx

Створи `src/components/pipelines/PipelinesPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { listPipelines, getPipeline, savePipeline, type PipelineInfo, type DrakonIR } from "@/lib/graph-pipeline-api";
import { PipelineDrakonView } from "./PipelineDrakonView";
import { Workflow, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function PipelinesPage() {
  const [pipelines, setPipelines] = useState<PipelineInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [ir, setIr] = useState<DrakonIR | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listPipelines().then(setPipelines).catch(() => toast.error("Не вдалось завантажити пайплайни"));
  }, []);

  const handleSelect = async (name: string) => {
    setSelected(name);
    setLoading(true);
    try {
      const data = await getPipeline(name);
      setIr(data);
    } catch { toast.error("Помилка завантаження"); }
    finally { setLoading(false); }
  };

  const handleSave = async (updatedIr: DrakonIR) => {
    if (!selected) return;
    await savePipeline(selected, updatedIr);
    setIr(updatedIr);
    toast.success("Пайплайн збережено і перезавантажено");
  };

  return (
    <div className="flex h-full bg-[var(--bg-base)]">
      {/* Left panel — pipeline list */}
      <div className="w-56 shrink-0 border-r border-[var(--border-subtle)] flex flex-col">
        <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--accent-amber)]">Пайплайни</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {pipelines.map(p => (
            <button
              key={p.name}
              onClick={() => handleSelect(p.name)}
              className={`w-full text-left px-3 py-2 rounded font-mono text-[11px] transition-colors ${
                selected === p.name
                  ? "bg-[var(--accent-amber)]/10 text-[var(--accent-amber)] border border-[var(--accent-amber)]/30"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Workflow className="inline h-3 w-3 mr-2 opacity-60" />
              {p.display_name}
            </button>
          ))}
        </div>
      </div>

      {/* Main — DRAKON editor + live */}
      <div className="flex-1 min-w-0">
        {loading && (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)] font-mono text-xs">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Завантаження…
          </div>
        )}
        {!loading && ir && selected && (
          <PipelineDrakonView pipelineName={selected} ir={ir} onSave={handleSave} />
        )}
        {!loading && !ir && (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)] font-mono text-sm">
            Обери пайплайн зліва
          </div>
        )}
      </div>
    </div>
  );
}
```

## Крок 3: PipelineDrakonView.tsx

Створи `src/components/pipelines/PipelineDrakonView.tsx`:

```tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { DrakonEditor } from "@/components/drakon/DrakonEditor";
import { NodeStateInspector } from "./NodeStateInspector";
import { startExecution, streamExecution, resumeExecution, type DrakonIR, type ExecutionEvent } from "@/lib/graph-pipeline-api";
import { Button } from "@/components/ui/button";
import { Play, Pause, StopCircle, Zap } from "lucide-react";
import { toast } from "sonner";

interface Props {
  pipelineName: string;
  ir: DrakonIR;
  onSave: (ir: DrakonIR) => Promise<void>;
}

export function PipelineDrakonView({ pipelineName, ir, onSave }: Props) {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "breakpoint" | "done" | "error">("idle");
  const [breakpointState, setBreakpointState] = useState<Record<string, unknown>>({});
  const [breakpointNode, setBreakpointNode] = useState<string | null>(null);
  const [breakpoints, setBreakpoints] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  const handleRun = async () => {
    try {
      const jid = await startExecution(pipelineName, {}, Array.from(breakpoints));
      setJobId(jid);
      setStatus("running");
      abortRef.current = new AbortController();
      streamExecution(pipelineName, jid, (ev: ExecutionEvent) => {
        if (ev.event === "node_done") setActiveNode(ev.node);
        if (ev.event === "breakpoint") {
          setStatus("breakpoint");
          setBreakpointNode(ev.node);
          setBreakpointState(ev.state ?? {});
        }
        if (ev.event === "done") { setStatus("done"); setActiveNode(null); toast.success("Пайплайн завершено"); }
        if (ev.event === "error") { setStatus("error"); setActiveNode(null); toast.error(ev.error ?? "Помилка"); }
      }, abortRef.current.signal);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleResume = async (stateOverride: Record<string, unknown>) => {
    if (!jobId || !breakpointNode) return;
    setStatus("running");
    await resumeExecution(pipelineName, jobId, stateOverride);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setStatus("idle");
    setActiveNode(null);
    setJobId(null);
  };

  // Build diagram with active-node metadata for overlay
  const irWithOverlay = {
    ...ir,
    _activeNode: activeNode,
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mr-2">{pipelineName}</span>
        {status === "idle" || status === "done" || status === "error" ? (
          <Button size="sm" onClick={handleRun} className="h-7 bg-[var(--accent-amber)] text-black hover:brightness-110 text-[11px] font-mono">
            <Play className="h-3 w-3 mr-1" /> Запустити
          </Button>
        ) : status === "running" ? (
          <Button size="sm" variant="destructive" onClick={handleStop} className="h-7 text-[11px] font-mono">
            <StopCircle className="h-3 w-3 mr-1" /> Зупинити
          </Button>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <span className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded border ${
            status === "running" ? "border-[var(--accent-amber)] text-[var(--accent-amber)] animate-pulse" :
            status === "breakpoint" ? "border-yellow-500 text-yellow-500" :
            status === "done" ? "border-green-500 text-green-500" :
            status === "error" ? "border-red-500 text-red-500" :
            "border-[var(--border-subtle)] text-[var(--text-muted)]"
          }`}>
            {status}
          </span>
          {activeNode && <span className="font-mono text-[10px] text-[var(--text-secondary)]">→ {activeNode}</span>}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* DRAKON editor — main area */}
        <div className="flex-1 min-w-0 relative">
          <DrakonEditor
            diagram={ir}
            diagramId={`pipeline-${pipelineName}`}
            onSaveOverride={async (d) => { await onSave(d as unknown as DrakonIR); return true; }}
          />
          {/* Live node highlight overlay */}
          {activeNode && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute bottom-4 left-4 bg-[var(--bg-base)]/90 border border-[var(--accent-amber)] rounded px-3 py-1.5 font-mono text-[11px] text-[var(--accent-amber)] flex items-center gap-2">
                <Zap className="h-3 w-3 animate-pulse" />
                ACTIVE: {activeNode}
              </div>
            </div>
          )}
        </div>

        {/* Right panel — state inspector (shown during breakpoint) */}
        {status === "breakpoint" && breakpointNode && (
          <NodeStateInspector
            nodeName={breakpointNode}
            state={breakpointState}
            onResume={handleResume}
            className="w-80 shrink-0"
          />
        )}
      </div>
    </div>
  );
}
```

## Крок 4: NodeStateInspector.tsx

Створи `src/components/pipelines/NodeStateInspector.tsx`:

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Play, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  nodeName: string;
  state: Record<string, unknown>;
  onResume: (stateOverride: Record<string, unknown>) => void;
  className?: string;
}

export function NodeStateInspector({ nodeName, state, onResume, className }: Props) {
  const [stateJson, setStateJson] = useState(() => JSON.stringify(state, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleResume = () => {
    try {
      const override = JSON.parse(stateJson);
      setJsonError(null);
      onResume(override);
    } catch (e: any) {
      setJsonError(e.message);
    }
  };

  const handleResumeNoChange = () => onResume({});

  return (
    <div className={cn("flex flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-surface)]", className)}>
      <div className="px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]">
        <span className="font-mono text-[10px] uppercase tracking-widest text-yellow-500">BREAKPOINT</span>
        <div className="font-mono text-[11px] text-[var(--text-primary)] mt-0.5">@ {nodeName}</div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-3 gap-2 min-h-0">
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">State (редагується)</span>
        <Textarea
          value={stateJson}
          onChange={(e) => setStateJson(e.target.value)}
          className="flex-1 resize-none font-mono text-[10px] bg-[var(--bg-base)] border-[var(--border-subtle)] min-h-0"
          spellCheck={false}
        />
        {jsonError && (
          <div className="flex items-center gap-1 text-red-400 text-[10px] font-mono">
            <AlertTriangle className="h-3 w-3" /> {jsonError}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-[var(--border-subtle)] flex flex-col gap-1.5">
        <Button onClick={handleResume} className="w-full h-7 bg-[var(--accent-amber)] text-black text-[11px] font-mono hover:brightness-110">
          <Play className="h-3 w-3 mr-1" /> Продовжити зі змінами
        </Button>
        <Button onClick={handleResumeNoChange} variant="outline" className="w-full h-7 text-[11px] font-mono border-[var(--border-subtle)]">
          Продовжити без змін
        </Button>
      </div>
    </div>
  );
}
```

## Важливо
- Не чіпай `drakonwidget.js`
- `DrakonEditor` може не мати `onSaveOverride` — якщо немає, замість нього використай `onSaved` з POST до `/graph-pipelines/{name}`
- EventSource не працює через Worker proxy — можливо треба прямий URL агента; в такому випадку використай `getAgentBaseUrl("architect")` з `agent-api.ts`
```

**Step 1: Написати prompt файл**
```bash
# Зберегти вміст prompt в lovable-prompts/49-pipelines-drakon-live.md
```

**Step 2: Передати в Lovable і виконати**

**Step 3: Після Lovable — синхронізувати src/**
```bash
for f in .lovable/src/components/pipelines/*.tsx .lovable/src/routes/pipelines.tsx .lovable/src/lib/graph-pipeline-api.ts; do
  dst="${f#.lovable/}"
  mkdir -p "$(dirname "$dst")"
  cp "$f" "$dst"
done
```

**Step 4: Commit**
```bash
git add .lovable/src/ src/ lovable-prompts/49-pipelines-drakon-live.md
git commit -m "feat(pipelines): /pipelines route — DRAKON editor + live execution + breakpoints"
```

---

## Task 7: Перевірка end-to-end

**Step 1: Перевірити backend**
```bash
curl -s http://localhost:8766/graph-pipelines | python3 -m json.tool
curl -s http://localhost:8766/graph-pipelines/pipeline_a | python3 -m json.tool | head -20
```
Expected: JSON з `items` що містить 10 вузлів

**Step 2: Push до обох remote**
```bash
git push origin main && git push drakon-diagram-flow main
```

**Step 3: Відкрити CF Pages (або local dev) і перейти на /pipelines**
- Бачимо ліву панель з "Pipeline A" і "Pipeline B"
- Клікаємо — відкривається DRAKON схема
- Натискаємо "Запустити" — статус змінюється на RUNNING з amber пульсом

---

## Summary

| Задача | Файли | Складність |
|--------|-------|-----------|
| DRAKON IR JSON файли | 2 нових | Низька |
| graph_loader.py | 1 новий + тести | Середня |
| graph_pipeline_route.py | 1 новий + main.py | Висока |
| graph-pipeline-api.ts | 1 новий | Низька |
| PipelinesPage + компоненти | 3 нових + route | Середня |
| Lovable prompt 49 | 1 новий | — |

