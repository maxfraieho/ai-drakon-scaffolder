---
tags: [domain:plan, status:active, format:plan, tier:2]
created: 2026-05-29
updated: 2026-05-29
title: "Unified LangGraph-DRAKON Agent Framework — Implementation Plan"
lang: uk
---

# Unified LangGraph-DRAKON Agent Framework

> **Для Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans

**Goal:** Три агенти (`architect` :8766, `docs` :8767, `drakon` :8765) переходять на єдиний LangGraph-DRAKON фреймворк. Редагування логіки агента в DRAKON-редакторі в `/agents` UI автоматично змінює реальне виконання агента через LangGraph.

**Architecture:**
- `services/shared/` — спільний шар (`graph_loader`, `kb_client`, `llm_client`, `ai_memory`)
- Per-agent `registries.py` — `NODE_REGISTRY` зі специфічними функціями та станами агента
- `pipelines/*.drakon.json` — логіка роботи агента як DRAKON IR (єдине джерело правди)
- `graph_loader(ir, node_registry, router_registry)` → LangGraph `StateGraph` → виконання

**Tech Stack:** Python 3.11, LangGraph, FastAPI, SQLite FTS5, `rank-bm25`, `ai-memory` MCP (POST `/mcp` `memory_query`), `drakonwidget.js` frontend.

---

## ПЛАН РЕАЛІЗАЦІЇ

### Task 1: Створити services/shared/ структуру

Створити спільний пакет `services/shared/` для усунення дублювання коду та брудних хаків на кшталт `sys.path.append`.

#### Створювані файли:
1. **`services/shared/__init__.py`** — маркер пакету.
2. **`services/shared/graph_loader.py`** — перенесений з `architect-agent` компілятор DRAKON IR у LangGraph, модифікований для прийому реєстру як аргументу:
   ```python
   def load_graph_from_ir(
       ir: dict, 
       node_registry: dict, 
       router_registry: dict, 
       state_registry: dict
   ) -> Any:
       # Замість глобальних констант використовує передані реєстри вузлів, роутерів та станів.
   ```
3. **`services/shared/kb_client.py`** — уніфікований клієнт бази знань на основі SQLite FTS5 з токенізатором `unicode61` (для повноцінної підтримки української/кириличної мови). Підтримує:
   - Автоматичне розбиття markdown-файлів за заголовками другого рівня `## `.
   - Повнотекстовий пошук за релевантністю з очищенням запиту.
4. **`services/shared/llm_client.py`** — єдиний HTTP-клієнт для роботи з LLM:
   - Підтримка AGY Proxy (`https://agy.exodus.pp.ua`), Anthropic-сумісних (`/v1/messages`) та OpenAI-сумісних (`/chat/completions`) форматів.
   - Вбудована логіка повторення запитів (retries) при rate-limit, обробка помилок та таймаутів.
5. **`services/shared/ai_memory.py`** — обгортка навколо MCP-інтерфейсу `ai-memory` на dev-сервері (`http://192.168.3.184:49374/mcp`):
   ```python
   def query_memory(query: str, top_k: int = 5) -> list[str]:
       # POST запит JSON-RPC з викликом інструменту memory_query
   ```

---

### Task 2: architect-agent registries.py

Виділити реєстри вузлів та станів з логіки компілятора.
- **Файл:** `services/architect-agent/registries.py`
- **Зміст:** Перенести сюди об'єкти `NODE_REGISTRY`, `ROUTER_REGISTRY`, `STATE_REGISTRY` та відповідні імпорти вузлів.
- **Оновлення `services/architect-agent/pipeline/graph_loader.py`:** Імпортувати реєстри з `registries.py` та викликати спільний `services/shared/graph_loader.py`.

---

### Task 3: docs-agent registries.py + перший pipeline

Перевести `docs-agent` на нову runtime-модель.
- **Файли:**
  - `services/docs-agent/registries.py` — реєстр функцій обробки документації та стану чату.
  - `services/docs-agent/pipelines/docs_pipeline.drakon.json` — перший DRAKON-пайплайн.
- **Мінімальний пайплайн (DRAKON IR):**
  ```
  [Header: Docs Pipeline] ➔ [Action: load_docs_kb] ➔ [Action: search_docs] ➔ [Action: generate_response] ➔ [End]
  ```

---

### Task 4: drakon-agent registries.py + перший pipeline

Перевести найскладніший сервіс аналізу коду на загальний фреймворк.
- **Файли:**
  - `services/drakon-agent/registries.py` — реєстр AST-аналізаторів (`PythonAnalyzer`, `JSAnalyzer`), валідаторів схем та логіки рефайнера.
  - `services/drakon-agent/pipelines/analysis_pipeline.drakon.json` — DRAKON-пайплайн аналізу та генерації IR.
- **Мінімальний пайплайн:**
  ```
  [Header: Analysis Pipeline] ➔ [Action: analyze_code] ➔ [Action: generate_ir] ➔ [Action: validate_ir] ➔ [End]
  ```

---

### Task 5: Оновити всі три main.py

Кожен з мікросервісів при старті та під час роботи має взаємодіяти з пайплайнами:
1. **При старті:** Сканувати локальну директорію `pipelines/*.drakon.json` та завантажувати/компілювати їх через `shared.graph_loader.load_graph_from_ir`.
2. **Маршрут `PUT /graph-pipelines/{name}`:** Дозволити динамічне оновлення пайплайну на льоту (hot-reload) з валідацією компіляції.

---

### Task 6: Оновити architect-agent для hot-reload

Розширити функціональність `architect-agent` (який обслуговує запити фронтенду для редагування та виконання пайплайнів):
- При `PUT /graph-pipelines/{name}` зберегти файл `pipelines/{name}.drakon.json`.
- Запустити тестову компіляцію для валідації графу.
- Додати endpoint `GET /graph-pipelines/{name}/status` для перевірки готовності та валідності скомпільованого графу.

---

### Task 7: Тести

Додати модульні та інтеграційні тести для перевірки працездатності:
1. **`test_graph_loads`:** Перевірити, що `graph_loader` без помилок збирає структури LangGraph для кожного агента.
2. **`test_kb_search`:** Перевірити, що новий `kb_client.py` з SQLite FTS5 коректно шукає як англійські, так і українські терміни.
3. **`test_pipeline_execute`:** Перевірити роботу SSE стрімінгу через `POST /execute` на прикладі тестового запуску.

---

### Task 8: Документація + commit

1. Оновити `docs/COLLABORATION.md` — додати опис уніфікованого LangGraph-DRAKON рантайму, структури реєстрів та принципу hot-reload.
2. Закомітити зміни:
   ```bash
   git commit -m "feat(agents): unified LangGraph-DRAKON framework (TASK-34)"
   ```

---

## Семантичні зв'язки
**Цей документ є частиною:** [[plans/_INDEX]]  
**Пов'язано з:**  
- [[reports/agent-architecture-2026-05-29]] — Аналіз архітектури агентів  
- [[reports/context-search-research-2026-05-29]] — Дослідження контекстного пошуку  
- [[plans/2026-05-21-drakon-langgraph-runtime]] — Рантайм LangGraph  
