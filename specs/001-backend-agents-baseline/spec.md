# Spec 001: Backend Agents Baseline Specification

## 1. Мета та Контекст (Objective & Context)

Ця специфікація є реверс-інженерним бейзлайном для 3 діючих Python FastAPI бекенд-сервісів проекту `ai-drakon-scaffolder`:
- **`drakon-agent`** (порт `8765`) — спеціалізований конвеєр AST-парснгу коду (Python, JS/TS), генерації DRAKON Intermediate Representation (IR), RAG-збагачення з локальної бази знань (BM25), AI-уточнення та валідації схем.
- **`architect-agent`** (порт `8766`) — оркестраційний рівень: управління пайплайнами LangGraph, робота з графами потоків завдань, файлова система проекту, контекстна пам'ять та аналітика агентів.
- **`docs-agent`** (порт `8767`) — підсистема генерації та ведення документації в екосистемі Obsidian Markdown, виконання запитів Obsidian Dataview Query Language (DQL), генерація нотаток із синхронізацією через Git.

---

## 2. Специфікація Поведінки: Given-When-Then

### Конвеєр `POST /analyze` (`drakon-agent`)

#### Сценарій 1: Успішний синтаксичний аналіз та валідація Python-коду
- **Given**: Сервіс `drakon-agent` запущений на порту `8765`, локальна база знань доступна.
- **When**: Клієнт надсилає `POST /analyze` з тілом:
  ```json
  {
    "code": "def process_data(item):\n    if item:\n        return True\n    return False",
    "filename": "service.py",
    "refine": true
  }
  ```
- **Then**:
  1. Запит спрямовується до `PythonAnalyzer().analyze(...)`.
  2. Для кожного згенерованого графа виконується `retrieve_text` (RAG, `top_k=3`).
  3. Граф проходить `refine_ir_safe(raw_ir, kb_ctx)`.
  4. Граф проходить `validate_ir(ir)` з проставленням полів `_valid: true/false`, а також `_errors` та `_warnings` за наявності.
  5. Відповідь повертається зі статусом `200 OK` у форматі `{"filename": "service.py", "diagrams": [...], "count": N}`.

#### Сценарій 2: Маршрутизація до JS/TS аналізатора за розширенням файлу
- **Given**: Клієнт передає вихідний код мовами JavaScript або TypeScript.
- **When**: Клієнт надсилає `POST /analyze` з полем `filename`, що має розширення з набору `{'.js', '.mjs', '.cjs', '.ts', '.mts', '.tsx', '.jsx'}` (наприклад, `index.ts` або `Component.tsx`).
- **Then**:
  1. Запит маршрутизується до `JSAnalyzer().analyze(code, filename)`.
  2. Згенеровані `raw_diagrams` проходять подальший спільний pipeline (RAG, Refine, Validate).
  3. Повертається статус `200 OK`.

#### Сценарій 3: Синтаксична помилка парсингу (ValueError від аналізатора)
- **Given**: Клієнт передає некоректний вихідний код, який викликає `ValueError` в `PythonAnalyzer` або `JSAnalyzer`.
- **When**: Відбувається виклик `POST /analyze`.
- **Then**:
  1. Помилка `ValueError` перехоплюється блоком `try...except ValueError`.
  2. Сервіс піднімає `HTTPException(status_code=400, detail=str(e))`.
  3. Клієнт отримує статус `400 Bad Request` із описом помилки синтаксису в полі `detail`.

#### Сценарій 4: Робота у деградованому режимі при збої бази знань (Graceful Degradation)
- **Given**: Каталог знань відсутній, пошкоджений або `kb_init()` викидає виняток будь-якого типу.
- **When**: Виконується виклик `_ensure_kb()` всередині ендпоінта `POST /analyze`.
- **Then**:
  1. Виняток перехоплюється `except Exception: pass`.
  2. Глобальний прапорець `_kb_ready` залишається `False`.
  3. `retrieve_text()` повертає порожній контекст.
  4. Пайплайн аналізу не падає, а успішно продовжує роботу без RAG-збагачення, повертаючи статус `200 OK`.

#### Сценарій 5: Пропуск AI Refine та валідації для графів із помилками
- **Given**: Під час аналізу багатофункціонального файлу один із блоків завершився помилкою і містить ключ `"error"` у словнику `raw_ir`.
- **When**: Цикл обробки результатів ітерується по `raw_diagrams`.
- **Then**:
  1. Умова `"error" in raw_ir` спрацьовує як `True`.
  2. Для цього елемента кроки `retrieve_text`, `refine_ir_safe` та `validate_ir` **ігноруються**.
  3. Об'єкт `raw_ir` додається до фінального списку результатів у вихідному вигляді.

---

## 3. Системні Інваріанти (System Invariants)

### Інваріант 1: Спільна конвенція трьох мікросервісів
1. **Ізоляція процесів**: Кожен сервіс є повністю автономним застосунком FastAPI, що стартує у власному процесі через `uvicorn.run(app, host="0.0.0.0", port=PORT)`:
   - `drakon-agent`: порт `8765`
   - `architect-agent`: порт `8766`
   - `docs-agent`: порт `8767`
2. **Обов'язковий `GET /health`**: Кожен сервіс зобов'язаний реалізовувати `GET /health`, який повертає JSON зі статусом `"ok"` та ідентифікатором сервісу.
3. **Обов'язковий `GET /settings`**: Кожен сервіс надає ендпоінт конфігурації середовища, який повертає словник:
   ```json
   {
     "repo_root": "<шлях до кореня>",
     "proxy_url": "<LLM proxy URL>",
     "proxy_model": "<назва моделі>",
     "proxy_protocol": "<openai|anthropic>",
     "agent": "<drakon|architect|docs>"
   }
   ```
4. **Конвенція збереження пам'яті (`/memory/*`)**:
   - `architect-agent` та `docs-agent` реалізують ендпоінти `GET /memory/list`, `GET /memory/get?file=...`, `POST /memory/save` (з обов'язковою синхронізацією/комітом у сховище через `memory_manager`).
   - `drakon-agent` свідомо **не містить** роутера `/memory`, оскільки є функціональним stateless-транслятором AST→IR з окремим навчальним механізмом `POST /feedback`.

### Інваріант 2: GitNexus Backend Exclusion
1. **Повна ізоляція бекенду від графа коду GitNexus**:
   - Файл конфігурації `.gitnexusignore` містить директиву `/services/`.
   - Зафіксовано коммітом `4c60ef4 chore(gitnexus): restrict indexation to src only`.
2. **Архітектурний сенс**: Семантичний індекс кодової бази та Knowledge Graph будуються **виключно** для фронтенд-коду в директорії `src/`. Бекенд-агенти Python не індексуються у семантичному графі GitNexus і доступні агентським інструментам лише через пряме читання файлів / ripgrep. Це запобігає забрудненню семантичного графу службовими Python-скриптами та знижує навантаження на індексатор.

---

## 4. Межі Специфікації (Out of Scope)

Для збереження статусу чистого бейзлайну (Baseline Specification) та згідно з принципом **Two-Speed Adoption (Фаза 3 Brownfield)**, наступні внутрішні реалізації виносяться за межі цього документа та специфікуються за вимогою (on-touch):
- Внутрішня бізнес-логіка та алгоритми графів у `pipeline_route.py`, `graph_pipeline_route.py`, `playpipe_route.py`, `project_pipeline_route.py`.
- Деталі синтаксичного розбору та повна граматика мови запитів у `dataview_route.py` (DQL subset).
- Реалізація SQLite-сховища у `kb_route.py`.
- Логіка серверної побудови графа вікі-посилань (wikilinks graph) у `notes_route.py`.

---
