---
tags:
  - domain:manual
  - status:active
  - format:guide
created: 2026-05-26
updated: 2026-06-01
tier: 2
title: "Мануал: Agent Studio — Редактор логіки агентів"
lang: uk
---

# Мануал: Agent Studio — Редактор логіки агентів

## 1. Концепція Agent Studio

**Agent Studio** — це інтерактивний візуальний простір на платформі **AI-DRAKON**, призначений для проектування, налаштування та управління поведінкою мультиагентної системи. Замість написання складних текстових інструкцій, розробник використовує візуальні **ДРАКОН-схеми**, що базуються на формалізованому DRAKON IR.

---

## 2. Агенти в системі та їхні інтерфейси

Всі агенти об'єднані в єдиний сервіс **architect-agent** (порт **8766**) через LangGraph.

| Agent ID | Роль та відповідальність |
|----------|--------------------------|
| `architect` | Головний архітектор — аналіз, планування, file tools, agent_mode |
| `drakon` | Python/TypeScript → DRAKON IR JSON |
| `docs` | Документознавець — wiki-links, читання та редагування файлів |
| `sonate-solidaire` | Публічний асистент асоціації (без авторизації) |

**API ендпоінти агентів:**
```
GET  /agents/{id}/health
POST /agents/{id}/chat
     body: { "message": "...", "context"?: {}, "agent_mode"?: true }
```

**Через Cloudflare Worker:**
```
POST https://drakon-mcp-worker.maxfraieho.workers.dev/v1/agents/{id}/chat
     Authorization: Bearer <token>   (не потрібен для sonate-solidaire)
```

**File tools (для агентів з agent_mode):**
```
GET  /files/list?path=docs/
GET  /files/read?path=docs/file.md
POST /files/write  { "path": "...", "content": "..." }
POST /files/patch  { "path": "...", "old_string": "...", "new_string": "..." }
POST /files/delete { "path": "..." }
```

---

## 3. Налаштування логіки через ДРАКОН-схеми

Алгоритм поведінки агента описується через JSON-структуру DRAKON IR:
1. **`b0` (branchId:0)** — обов'язкова точка входу.
2. **`action`** — виконання дій (content: опис, one: наступний вузол).
3. **`question`** — логічне розгалуження (content: умова?, one: ТАК, two: НІ).
4. **`end`** — обов'язкова точка завершення.

**Робочий процес:**
* Використовуйте кнопку "Аналізувати" для запуску Pipeline API (`POST /pipeline/analyze`).
* Після успішного аналізу система видає `toast.success` та посилання "Відкрити схему".

---

## 4. MCP-інструменти та ресурси

Для розширеної взаємодії з проектом доступні MCP-інструменти:
* **`files.list`**: Огляд структури проекту.
* **`files.read`**: Читання вмісту файлів для аналізу.
* **`agent.chat`**: Пряма взаємодія з Architect Agent (`POST /chat` з тілом `{"message":"..."}`).

---

## 5. LangGraph pipeline

Кожен агент — це DRAKON IR pipeline що компілюється у LangGraph StateGraph:

```
pipelines/*.drakon.json
  ↓ load_graph_from_ir()   (pipeline/graph_loader.py)
  ↓ NODE_REGISTRY[node_name](state)
  ↓ відповідь через /agents/{id}/chat або SSE через /graph-pipelines/{name}/execute
```

**Доступні pipelines:**
```
GET /graph-pipelines
→ ["drakon-agent", "docs-agent", "sonate-solidaire-agent", "pipeline_a", "pipeline_b", ...]
```

## 6. Поточний стан (2026-06-01)

> ✅ **BUG-6 виправлено** — чат на `/agents` працює через unified endpoint `/agents/{id}/chat`.

| Функція | Статус |
|---------|--------|
| Chat на /agents | ✅ Працює |
| LangGraph pipelines | ✅ Всі агенти уніфіковані |
| File tools для агентів | ✅ `/files/write,patch,delete,read,list` |
| Sonate Solidaire агент | ✅ Публічний, `sonate-solidaire.me/assistant` |

---

## Семантичні зв'язки
**Цей документ є частиною:** [[manuals/_INDEX]]

**Цей документ пов'язаний з:**
- [[manuals/_INDEX]] — переглянути всі документи розділу