---
tags:
  - domain:architecture
  - status:canonical
  - format:spec
created: 2026-06-01
updated: 2026-06-01
tier: 1
title: "Архітектура агентів AI-DRAKON — Unified LangGraph"
lang: uk
---

# Архітектура агентів AI-DRAKON

## Єдиний сервіс

Всі агенти об'єднані в **architect-agent** (`192.168.3.184:8766`).
Публічний доступ через Cloudflare Worker: `drakon-antigravity-worker.maxfraieho.workers.dev`.

```
Frontend (sonate-solidaire.me / ai-drakon UI)
    ↓
Cloudflare Worker  drakon-antigravity-worker.maxfraieho.workers.dev
    ↓  /v1/agents/{id}/chat
architect-agent  192.168.3.184:8766
    ↓  pipeline/graph_loader.py
LangGraph StateGraph (компільований з DRAKON IR JSON)
    ↓  NODE_REGISTRY[node_name](state)
відповідь
```

---

## Агенти

| Agent ID | Призначення | Pipeline | Auth |
|----------|-------------|----------|------|
| `architect` | Архітектор, file tools, agent_mode | `/chat` (sync) | Bearer |
| `drakon` | Python → DRAKON IR JSON | `drakon-agent.drakon.json` | Bearer |
| `docs` | Документознавець, wiki-links, file ops | `docs-agent.drakon.json` | Bearer |
| `sonate-solidaire` | Публічний асистент Sonate Solidaire | `sonate-solidaire-agent.drakon.json` | **Public** |

---

## Ендпоінти

```http
GET  /agents/{id}/health
POST /agents/{id}/chat
     Content-Type: application/json
     { "message": "...", "context"?: {}, "agent_mode"?: true }

GET  /graph-pipelines
POST /graph-pipelines/{name}/execute     → { job_id }
GET  /graph-pipelines/{name}/execute/{job_id}/stream  → SSE
```

---

## LangGraph Pipeline

DRAKON IR JSON → `graph_loader.py` → `StateGraph` → виконання:

```python
# Структура DRAKON IR
{
  "name": "agent-name",
  "schema": {"state_class": "SSAgentState"},
  "items": {
    "h0": {"type": "header", "one": "n1"},
    "n1": {"type": "action", "content": "node_function_name", "one": "n2"},
    "end": {"type": "end"}
  }
}

# NODE_REGISTRY (pipeline/graph_loader.py)
NODE_REGISTRY = {
    "ss_detect_audience": ss_detect_audience,
    "ss_load_kb": ss_load_kb,
    "ss_format_prompt": ss_format_prompt,
    "llm_call_with_system": llm_call_with_system,
    "ss_format_response": ss_format_response,
    # ... всі ноди
}
```

**Pipelines (файли):** `services/architect-agent/pipelines/*.drakon.json`

---

## File Tools

Всі агенти з `agent_mode: true` можуть маніпулювати файлами:

```http
GET  /files/list?path=docs/
GET  /files/read?path=docs/file.md&max_chars=8000
POST /files/write   { "path": "...", "content": "...", "create_dirs": true }
POST /files/patch   { "path": "...", "old_string": "...", "new_string": "..." }
POST /files/delete  { "path": "..." }
```

Базовий каталог: `REPO_ROOT` (env var, дефолт — корінь репозиторію).

---

## Sonate Solidaire Agent

Особливості:
- **Публічний** — без авторизації через Worker
- **KB з sonate-solidaire.me** — `nodes_ss.py` читає `https://sonate-solidaire.me/kb/kb-{audience}.md`
- **Routing по аудиторії** — `ss_detect_audience` → events / musicians / partners / general
- **Local fallback** — `services/architect-agent/kb/sonate-solidaire/` (для dev/offline)

```
sonate-solidsite/public/kb/    ← джерело правди (git repo)
    ↓ Cloudflare Pages
https://sonate-solidaire.me/kb/kb-events.md
    ↓ HTTP GET at runtime
architect-agent nodes_ss.py
```

---

## Семантичні зв'язки

- [[architecture/_INDEX]] — Індекс архітектурних документів
- [[manuals/manual-agent-studio]] — Практичний мануал Agent Studio
- [[architecture/02_drakon_to_langgraph_mapping]] — Специфікація DRAKON → LangGraph
