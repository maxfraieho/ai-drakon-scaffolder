---
title: "Sharon UAV — Handoff: Підключення до AI-DRAKON Framework"
created: 2026-05-29
tier: 2
lang: uk
---

# Sharon UAV — Handoff для нового розробника

> Цей документ показує **як підключити реальний проект** до AI-DRAKON unified framework.
> Sharon UAV — перший reference implementation.

## Семантичні зв'язки
[[handoff/_INDEX]] [[concept/03-architecture]] [[reports/demo-sharon-uav-2026-05-29]]

---

## 1. Що таке Sharon UAV

Sharon — гіперлокальна AI-система моніторингу повітряних загроз для міст України.

- Слідкує за 8+ Telegram-каналами
- Класифікує загрози за допомогою AI
- Надсилає прицільні сповіщення

**Репозиторій:** `https://github.com/maxfraieho/uav-watcher`
**Dev server:** `192.168.3.184` (Alpine Linux)

---

## 2. Як Sharon підключена до AI-DRAKON

### Крок 1: Визначити slug проекту
```
slug = "sharon-uav"
```

### Крок 2: Описати логіку у DRAKON IR JSON
Файл: `~/projects/sharon-uav/agents/threat-classifier/pipeline.drakon.json`
```json
{
  "name": "threat-classifier",
  "items": {
    "h":   {"type": "header", "content": "Sharon Threat Classifier", "one": "n1"},
    "n1":  {"type": "action", "content": "search_kb", "one": "n2"},
    "n2":  {"type": "action",
             "content": "Classify UAV threat: LOW/MEDIUM/HIGH. Respond JSON: {level, reason}",
             "one": "end"},
    "end": {"type": "end"}
  }
}
```

> `search_kb` → built-in tool (шукає в KB)
> Другий вузол → текст промпту → автоматично стає LLM node

### Крок 3: Завантажити базу знань
```bash
# Через API architect-agent :8766
curl -X POST http://192.168.3.184:8766/projects/sharon-uav/agents/threat-classifier/kb/upload \
  -F "files=@threat_types.md" \
  -F "files=@tactics.md"
```

### Крок 4: Зберегти pipeline
```bash
curl -X PUT http://192.168.3.184:8766/projects/sharon-uav/agents/threat-classifier/pipeline \
  -H "Content-Type: application/json" \
  -d @pipeline.drakon.json
```

### Крок 5: Виконати (SSE stream)
```bash
curl -X POST http://192.168.3.184:8766/projects/sharon-uav/agents/threat-classifier/execute \
  -H "Content-Type: application/json" \
  -d '{"input": "Shahed-136 detected over Kyiv, altitude 150m"}' \
  --no-buffer
```

**SSE output:**
```
data: {"node": "search_kb", "result": "...KB chunks..."}
data: {"node": "threat_classifier", "result": {"level": "HIGH", "reason": "Shahed-136 is kamikaze UAV"}}
data: [DONE]
```

---

## 3. Структура unified framework

```
services/shared/
  graph_loader.py     ← DRAKON IR → LangGraph StateGraph
  kb_client.py        ← SQLite FTS5 (unicode61, кирилиця ✓)
  built_in_tools.py   ← search_kb, analyze_code, generate_ir
  llm_node.py         ← auto LLM node для будь-якого промпту
  llm_client.py       ← AGY / Anthropic / OpenAI
  ai_memory.py        ← ai-memory MCP wrapper
```

**Ключова магія** — `_resolve_node_fn()` в `graph_loader.py`:
```python
# content = "search_kb"  → викликає built-in tool
# content = "Classify..."→ створює LLM node автоматично
# priority: per-agent registry > BUILT_IN_TOOLS > llm_node_factory
fn = _resolve_node_fn(content, node_registry)
```

---

## 4. Запустити тести framework

```bash
cd ~/workspace/ai-drakon-scaffolder/services
python3 -m pytest shared/tests/test_framework.py -v
# Expected: 6/6 PASS
```

---

## 5. API довідка (architect-agent :8766)

| Метод | Endpoint | Опис |
|-------|----------|------|
| GET   | `/projects/{slug}/agents` | список агентів проекту |
| PUT   | `/projects/{slug}/agents/{name}/pipeline` | зберегти IR + компілювати |
| POST  | `/projects/{slug}/agents/{name}/execute` | SSE виконання |
| GET   | `/projects/{slug}/agents/{name}/kb/search?q=...` | пошук по KB |
| POST  | `/projects/{slug}/agents/{name}/kb/upload` | завантажити KB файли |

---

## 6. Підключити свій проект (5 кроків)

1. **Обери slug** — `my-crm`, `hr-bot`, тощо
2. **Опиши логіку** у DRAKON IR JSON (action nodes = tools або LLM prompts)
3. **Завантаж KB** — markdown документи через `/kb/upload`
4. **Виконуй** через `/execute` з SSE стрімінгом
5. **Моніторинг:** `tail -f /var/log/architect-agent.log`

---

## Семантичні зв'язки
[[handoff/_INDEX]] [[concept/03-architecture]] [[reports/demo-sharon-uav-2026-05-29]]
