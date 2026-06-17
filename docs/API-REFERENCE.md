---
tags:
  - domain:architecture
  - status:active
  - format:reference
  - diataxis:reference
created: 2026-06-17
updated: 2026-06-17
tier: 2
title: "API Reference — drakon-antigravity-worker + architect-agent-flue"
lang: uk
---

# API Reference

> **Тип документа (Diátaxis): Reference.** Сухий перелік endpoints. Маршрути
> звірені з `cloudflare-worker/worker-mcp-drakon.js` та
> `services/architect-agent-flue/src/index.ts`. Для сценаріїв — [[ONBOARDING]] /
> [[DEPLOYMENT]] / [[TROUBLESHOOTING]].

---

## Авторизація

Захищені endpoints вимагають заголовка:

```
Authorization: Bearer <jwt>
```

JWT отримується через Appwrite SDK: `account.createJWT()`. Воркер валідує
його через `env.JWT_SECRET`. Альтернатива для MCP-клієнтів — статичний
`env.MCP_API_KEY` у тому ж заголовку. GitHub-операції додатково приймають
`X-Github-Token`.

---

# drakon-antigravity-worker (Main Worker)

**Base URL:** `https://drakon-antigravity-worker.maxfraieho.workers.dev`

## Health & Auth

| Метод | Шлях | Опис |
|-------|------|------|
| GET  | `/health` | статус воркера (без auth) |
| POST | `/auth/login` | owner-логін (повертає JWT) |
| GET  | `/auth/github/start` | старт GitHub OAuth |
| GET  | `/auth/github/callback` | callback GitHub OAuth |

## MCP

| Метод | Шлях | Опис |
|-------|------|------|
| GET  | `/mcp` | MCP capabilities / discovery |
| POST | `/mcp` | MCP JSON-RPC (drakon.getdiagram, drakon.deletediagram, drakon.getanalysissummary, drakon.getgitdiagram, github.getfile, …) |

## Notes (Knowledge Base статті)

| Метод | Шлях | Опис |
|-------|------|------|
| GET    | `/v1/notes/list` | список нотаток (`?project=`, `?flat=true`) |
| GET    | `/v1/notes/get` \| `/v1/notes/read` | прочитати нотатку (`?slug=&project=`) |
| GET    | `/v1/notes/graph` | граф нотаток `{ nodes, edges, stats }` |
| POST   | `/v1/notes/commit` | зберегти/оновити нотатку (git) |
| DELETE | `/v1/notes/delete` | видалити нотатку |
| POST   | `/v1/notes/build-semantic-graph` | запустити async-побудову wiki-links |
| GET    | `/v1/notes/semantic-graph-status` | статус async-задачі semantic-graph |

## KB — векторний пошук (Appwrite `kb_embeddings`, CF Workers AI BGE)

| Метод | Шлях | Опис |
|-------|------|------|
| POST | `/v1/kb/index` | проіндексувати KB проєкту в ембединги |
| POST | `/v1/kb/search` | семантичний пошук; body `{ query, top_k? }` → `{ results: [{ slug, title, score, via }] }` |
| POST | `/v1/kb/contribute` | додати статтю до KB |
| GET  | `/v1/kb/list` | перелік проіндексованих записів |

## DRAKON IR

| Метод | Шлях | Опис |
|-------|------|------|
| GET  | `/v1/drakon-ir/list` | список DRAKON IR |
| POST | `/v1/drakon/commit` | зберегти DRAKON-діаграму (git `drn/{id}.json`) |
| POST | `/v1/drakon/validate-ir` | валідація DRAKON IR |

## Codebase analysis

| Метод | Шлях | Опис |
|-------|------|------|
| POST | `/v1/analysis/codebase` | запустити аналіз кодової бази (async job) |
| GET  | `/v1/analysis/jobs` | статус job-ів аналізу |

## GitHub passthrough (`X-Github-Token`)

| Метод | Шлях | Опис |
|-------|------|------|
| GET    | `/v1/github/tree` | дерево репо (`?owner=&repo=&path=&branch=`) |
| GET    | `/v1/github/file` | прочитати файл |
| GET    | `/v1/github/branches` | список гілок |
| POST   | `/v1/github/commit` | коміт файлу |
| DELETE | `/v1/github/delete` | видалити файл |

## Інше

| Метод | Шлях | Опис |
|-------|------|------|
| GET/POST | `/v1/user/config` | конфіг користувача |
| GET  | `/v1/agents/:agentId/chat` | проксі до агента (architect/docs); перевіряє `/health` агента |
| —    | `/v1/agents/pipeline*` | pipeline-проксі до агентів |

---

# architect-agent-flue (Compiler / Ribosome)

**Base URL:** `https://architect-agent-flue.maxfraieho.workers.dev`

| Метод | Шлях | Опис |
|-------|------|------|
| GET  | `/health` | `{ status: "ok", service: "architect-agent-flue" }` |
| GET  | `/me` | tenant (auth + quota middleware) |
| GET  | `/tools` | список доступних tools для рибосоми |
| POST | `/mcp` | MCP JSON-RPC |
| POST | `/compile` | **Ribosome v1**: псевдокод → Flue workflow TS (див. нижче) |
| POST | `/suggest-patterns` | підказки патернів за docs/контекстом |
| POST | `/chat` / `/agents/:agent_id/chat` | чат із агентом |
| POST | `/pipeline/analyze` \| `/pipeline/generate` | pipeline аналіз/генерація |
| GET  | `/pipeline/status/:id` | статус pipeline-задачі |
| GET/PUT | `/graph-pipelines[/:name]` | CRUD graph-пайплайнів |
| POST | `/graph-pipelines/:name/execute` | запуск; `…/execute/:job_id/stream` — SSE |
| GET  | `/kb` · POST `/kb/contribute` · DELETE `/kb/:id` | KB агента |
| *    | `/projects[/:slug[/agents/:agent/…]]` | CRUD проєктів/агентів (auth) |

### POST /compile

Реальний контракт (з `services/architect-agent-flue/src/index.ts`):

```jsonc
// Request body
{
  "pseudocode": "...",        // ОБОВ'ЯЗКОВО (інакше 400)
  "pipelineName": "...",      // ОБОВ'ЯЗКОВО (інакше 400)
  "nodes": [ /* NodeConfig[]: is_llm, is_deterministic, description */ ],
  "target": "flue",           // єдиний активний target
  "llmConfig": { /* з налаштувань UI */ },
  "zoneId": "..."             // опційно: KB-зона → fetchZoneContext (MCP-proxy)
}
// Response: результат compilePseudocode() → код .workflow.ts
// Помилки: 400 (нема pseudocode/pipelineName), 500 (збій рибосоми)
```

> Якщо передано `zoneId`, рибосома підтягує KB-контекст цільового фреймворку
> через `tools/mcp-proxy.ts → fetchZoneContext` (Phase 3, `kb_embeddings`).

---

# docs-agent-flue

**Base URL:** `https://docs-agent-flue.maxfraieho.workers.dev`

| Метод | Шлях | Опис |
|-------|------|------|
| GET  | `/health` | статус |
| POST | `/mcp` | MCP tools `kb_search`, `kb_index` |

---

## Семантичні зв'язки

**Цей документ є частиною:** [[INDEX]]

**Цей документ пов'язаний з:**
- [[ONBOARDING]] — Tutorial: як отримати JWT і покликати endpoints
- [[DEPLOYMENT]] — How-to: деплой воркерів
- [[TROUBLESHOOTING]] — How-to: 401/402/500 на цих маршрутах
- [[ARCHITECTURE-CORE]] — §1 пайплайн компіляції (/compile)
- [[COLLABORATION]] — §11 конфігурація агентів
