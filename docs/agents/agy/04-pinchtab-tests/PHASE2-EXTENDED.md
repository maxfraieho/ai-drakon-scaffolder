---
tags:
  - domain:agent
  - status:active
  - format:plan
created: 2026-05-26
updated: 2026-05-28
tier: 3
title: "AGY Skill 04 — Phase 2 Extended: Full Platform + MCP + Agent Studio"
lang: uk
---

# AGY Skill 04 — Розширене тестування: MCP + Agent Studio + Мануали

> **Розширена фаза.** Повне навантаження на всі пайплайни. MCP-доступ (24 інструменти). 
> Agent Studio: складання логіки через DRAKON-редактор. Документування помилок.
> Результат: мануали по кожному пайплайну + звіт помилок.

---

## Конфігурація

| Параметр | Значення |
|----------|---------|
| Target | `https://ai-drakon-scaffolder.pages.dev/` |
| Credentials | `owner` / `805235io` |
| Worker | `https://drakon-mcp-worker.maxfraieho.workers.dev` |
| MCP endpoint | `https://drakon-mcp-worker.maxfraieho.workers.dev/mcp` |
| Dev server | `192.168.3.184` |
| Architect agent | `:8766` |
| Docs agent | `:8767` |
| Drakon agent | `:8771` |

---

## БЛОК A: MCP Full Access тестування

### A.1 Перевірка MCP health та enumerate tools

```bash
# MCP health
curl -s https://drakon-mcp-worker.maxfraieho.workers.dev/health

# Отримати session ID та список інструментів (24 MCP tools)
SCRIPT=~/.claude/skills/notebooklm-mcp/scripts/notebooklm_mcp.py
# АБО через HTTP:
curl -s -X GET https://drakon-mcp-worker.maxfraieho.workers.dev/mcp \
  -H "Accept: application/json, text/event-stream"
# Зафіксувати mcp-session-id з заголовка відповіді

# Список всіх MCP tools
curl -s -X POST https://drakon-mcp-worker.maxfraieho.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: [SESSION_ID]" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Зафіксувати повний список 24 інструментів. Для кожного — назва та опис.

### A.2 Тести кожної групи MCP-інструментів

#### Група 1: `docs.*` (KB та DQL)

```bash
# docs.query — DQL запит
curl -s -X POST https://drakon-mcp-worker.maxfraieho.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: [SESSION_ID]" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"docs.query","arguments":{"query":"TABLE title, type, status FROM \"docs\" WHERE type = \"concept\" SORT title ASC"}}}'

# Очікується: список концептуальних документів

# docs.read — читання файлу
curl -s -X POST https://drakon-mcp-worker.maxfraieho.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: [SESSION_ID]" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"docs.read","arguments":{"path":"docs/concept/01-vision.md"}}}'

# docs.wikilink — розкриття wikilink
curl -s -X POST https://drakon-mcp-worker.maxfraieho.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: [SESSION_ID]" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"docs.wikilink","arguments":{"title":"01-vision"}}}'

# docs.backlinks — зворотні посилання
curl -s -X POST https://drakon-mcp-worker.maxfraieho.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: [SESSION_ID]" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"docs.backlinks","arguments":{"path":"docs/concept/04-pipelines.md"}}}'
```

#### Група 2: `pipeline.*` (Pipeline A/B)

```bash
# pipeline.analyze — Pipeline A (код → IR)
curl -s -X POST https://drakon-mcp-worker.maxfraieho.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: [SESSION_ID]" \
  -d '{
    "jsonrpc":"2.0","id":10,"method":"tools/call",
    "params":{
      "name":"pipeline.analyze",
      "arguments":{
        "code":"def greet(name):\n    if name:\n        return f\"Hello, {name}\"\n    return \"Hello, World\"",
        "language":"python",
        "file_path":"greet.py"
      }
    }
  }'

# Зафіксувати job_id з відповіді

# pipeline.status — статус job
curl -s -X POST https://drakon-mcp-worker.maxfraieho.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: [SESSION_ID]" \
  -d '{"jsonrpc":"2.0","id":11,"method":"tools/call","params":{"name":"pipeline.status","arguments":{"job_id":"[JOB_ID]"}}}'

# Чекати завершення (polling кожні 2 сек, макс 30 сек)

# pipeline.generate — Pipeline B (IR → код)
# Взяти IR з попереднього результату і згенерувати JS
curl -s -X POST https://drakon-mcp-worker.maxfraieho.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: [SESSION_ID]" \
  -d '{
    "jsonrpc":"2.0","id":12,"method":"tools/call",
    "params":{
      "name":"pipeline.generate",
      "arguments":{
        "ir":[IR_FROM_PREVIOUS_STEP],
        "target_language":"javascript"
      }
    }
  }'
```

#### Група 3: `diagram.*` (CRUD діаграм)

```bash
# diagram.list — список схем
# diagram.create — створити схему
# diagram.read — читати IR схеми
# diagram.update — оновити IR
# diagram.delete — видалити схему

# Виконати повний CRUD цикл:
# 1. Create
curl -s -X POST https://drakon-mcp-worker.maxfraieho.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: [SESSION_ID]" \
  -d '{"jsonrpc":"2.0","id":20,"method":"tools/call","params":{"name":"diagram.create","arguments":{"title":"MCP Test Diagram","ir":{"nodes":[{"id":"b0","type":"start","title":"START"}],"edges":[]}}}}'

# 2. List — перевірити що з'явилась
# 3. Read — прочитати
# 4. Update — змінити title або IR
# 5. Delete — видалити

# Для кожного виклику: зафіксувати HTTP код та тіло відповіді
```

#### Група 4: `agent.*` (Agent chat)

```bash
# agent.chat — надіслати повідомлення архітектурному агенту
curl -s -X POST https://drakon-mcp-worker.maxfraieho.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: [SESSION_ID]" \
  -d '{
    "jsonrpc":"2.0","id":30,"method":"tools/call",
    "params":{
      "name":"agent.chat",
      "arguments":{
        "agent":"architect",
        "message":"Що таке DRAKON IR? Дай короткий опис.",
        "context":{}
      }
    }
  }'

# Очікування: відповідь від architect-agent (LLM, може зайняти 5-15 сек)
# Зафіксувати: успіх/помилка, час відповіді, якість відповіді
```

#### Результати A: Таблиця MCP coverage

Після всіх тестів заповнити:

| MCP Tool | HTTP Status | Result | Notes |
|----------|------------|--------|-------|
| docs.query | | | |
| docs.read | | | |
| docs.wikilink | | | |
| docs.backlinks | | | |
| pipeline.analyze | | | |
| pipeline.status | | | |
| pipeline.generate | | | |
| diagram.list | | | |
| diagram.create | | | |
| diagram.read | | | |
| diagram.update | | | |
| diagram.delete | | | |
| agent.chat (architect) | | | |
| ... (решта 11 tools) | | | |

---

## БЛОК B: Agent Studio — DRAKON-редактор для логіки агентів

> Мета: через /agents UI — відкрити Agent Studio, перейти у DRAKON-редактор,
> спробувати скласти логіку агента через DRAKON-схему, зберегти.

### B.1 Розвідка /agents

```
pinchtab_navigate("https://ai-drakon-scaffolder.pages.dev/agents")
pinchtab_wait_for_load()
pinchtab_snapshot()
pinchtab_screenshot()
```

Зафіксувати:
- Чи є вкладки (Tabs) в Agent Studio — які?
- Чи є вкладка з DRAKON-редактором для логіки агента?
- Чи є список існуючих агентів/пайплайнів?
- Чи є кнопка "Новий агент" або "New Pipeline"?

### B.2 Тест-кейси для /agents

#### TEST-AGENT-01: Rendering Agent Studio
```
pinchtab_navigate("https://ai-drakon-scaffolder.pages.dev/agents")
pinchtab_wait_for_load()
pinchtab_find("[CHAT_INPUT_SELECTOR]")
# Очікується: поле введення є
pinchtab_find("[AGENT_LIST_SELECTOR или PIPELINE_LIST]")
pinchtab_screenshot()
```

#### TEST-AGENT-02: Chat з агентом через UI
```
pinchtab_click("[CHAT_INPUT_SELECTOR]")
pinchtab_type("Що таке Pipeline A в AI-DRAKON?")
pinchtab_click("[SEND_BUTTON_SELECTOR]")
pinchtab_wait_for_text("Pipeline", timeout=20000)
# Очікується: відповідь архітектурного агента з текстом про Pipeline A
pinchtab_screenshot()
```

#### TEST-AGENT-03: Перехід у DRAKON-редактор логіки агента
```
# Знайти спосіб відкрити DRAKON-редактор для логіки агента.
# Варіанти (перевірити при recon):
# 1. Вкладка "DRAKON Logic" або "Схема" в Agent Studio
# 2. Кнопка "Edit Logic" або "Open in DRAKON"
# 3. Посилання на /diagram/editor або /editor/:id для агента

pinchtab_snapshot()
# Знайти selector для переходу в DRAKON-редактор

# Клікнути на відповідний елемент
pinchtab_click("[DRAKON_LOGIC_SELECTOR]")
pinchtab_wait_for_load()
pinchtab_screenshot()

# Перевірити що DRAKON-редактор відкрито
pinchtab_find("#drakon-widget-container, .drakon-canvas, canvas")
# Очікується: DRAKON-редактор активний
```

#### TEST-AGENT-04: Створення нового агента з DRAKON-логікою
```
# Клікнути "Новий агент" або "New Pipeline"
pinchtab_click("[NEW_AGENT_BUTTON_SELECTOR]")
pinchtab_wait(1000)
pinchtab_snapshot()

# Якщо відкрився wizard/form — заповнити:
pinchtab_fill("[AGENT_NAME_INPUT]", "Test Agent DRAKON")
# Вибрати тип агента (architect/docs/drakon)

# Спробувати відкрити DRAKON-редактор для цього агента
# та додати хоча б один вузол схеми через UI

pinchtab_screenshot()
```

#### TEST-AGENT-05: DRAKON схема — додавання вузлів через UI
```
# В DRAKON-редакторі (якщо відкрито для агента):

# Спробувати додати action-вузол
# Механізм залежить від DRAKON Widget:
# - drag-and-drop з палітри
# - контекстне меню
# - клавіатурні скорочення

pinchtab_snapshot()
# Знайти палітру вузлів або toolbar додавання

# Документувати: чи можна через UI додати вузол, з'єднати, зберегти?
# Якщо ні — зафіксувати як known gap
pinchtab_screenshot()
```

---

## БЛОК C: Тести всіх пайплайнів через /pipelines

### C.1 Список та CRUD пайплайнів

```
pinchtab_navigate("https://ai-drakon-scaffolder.pages.dev/pipelines")
pinchtab_wait_for_load()
pinchtab_snapshot()
pinchtab_screenshot()
```

#### TEST-PIPELINE-01: Empty state або список
```
# Якщо немає пайплайнів — перевірити empty state
# Якщо є — перелічити назви
pinchtab_find("[PIPELINE_LIST_ITEM]")
```

#### TEST-PIPELINE-02: Створити новий пайплайн
```
pinchtab_click("[NEW_PIPELINE_BUTTON]")
pinchtab_wait(1000)
pinchtab_snapshot()

# Заповнити форму:
pinchtab_fill("[PIPELINE_NAME_INPUT]", "Test Pipeline Alpha")
# Вибрати тип (якщо є selector)
pinchtab_click("[CREATE_PIPELINE_SUBMIT]")
pinchtab_wait(1000)

pinchtab_screenshot()
# Перевірити що пайплайн з'явився в списку
```

#### TEST-PIPELINE-03: Відкрити редактор пайплайну
```
pinchtab_navigate("https://ai-drakon-scaffolder.pages.dev/pipelines")
pinchtab_wait_for_load()
# Знайти перший пайплайн і клікнути "Edit"
pinchtab_click("[FIRST_PIPELINE_EDIT_LINK]")
# Це має привести на /pipeline/:id/edit
pinchtab_wait_for_url("**/pipeline/**")
pinchtab_snapshot()
pinchtab_screenshot()
```

#### TEST-PIPELINE-04: Редактор пайплайну — DRAKON компонент
```
# На /pipeline/:id/edit — чи є DRAKON-редактор?
pinchtab_find("#drakon-widget-container, .drakon-canvas")
# Якщо є — спробувати взаємодіяти
# Якщо ні — зафіксувати що редактор пайплайну не використовує DRAKON Widget

pinchtab_screenshot()
```

---

## БЛОК D: Документація помилок (Error Catalog)

Під час виконання всіх тестів — документувати кожну помилку.

### Шаблон запису помилки
```
### BUG-[N]: [короткий опис]
- **Тест**: TEST-XXXXX
- **URL**: [url коли виникла]
- **Дія**: [що робив]
- **Очікування**: [що мало статися]
- **Факт**: [що сталося]
- **Screenshot**: [ім'я файлу]
- **Severity**: CRITICAL / HIGH / MEDIUM / LOW
- **Категорія**: Auth / UI / Pipeline / MCP / Agent / Navigation
```

### Відомі ймовірні проблеми (pre-emptive)

| Зона | Ймовірна проблема | Як перевірити |
|------|------------------|-|
| Agent Studio | DRAKON-редактор для логіки агента може не існувати | recon /agents |
| Pipeline A | Monaco Editor — введення коду через PinchTab складне | pinchtab_eval з monaco API |
| MCP | Частина з 24 tools може повертати 401/403 | перевірити auth header |
| /docs | DQL UI може не бути реалізований в frontend | recon /docs |
| Settings | `data-testid` атрибутів може не бути | recon /settings |
| Локалізація | Деякі рядки можуть бути англійськими | перевірити всі кнопки |
| HTSE Validation | ValidationPanel може не показувати chips | recon /diagrams з open schema |

---

## БЛОК E: Мануали по пайплайнах

Після тестування — написати по одному мануалу на кожен пайплайн.
Зберегти в `/home/vokov/workspace/ai-drakon-scaffolder/docs/plans/`.

> **Мова мануалів: ВИКЛЮЧНО УКРАЇНСЬКА.** Всі чотири мануали пишуться повністю українською мовою — заголовки, опис, приклади, коментарі. Технічні терміни (MCP, DRAKON, IR, JWT, CRUD, API) залишати як є — вони є загальноприйнятими абревіатурами.

### Мануал 1: Pipeline A (Код → DRAKON IR)

**Файл:** `docs/plans/manual-pipeline-a.md`

Написати повністю українською. Структура:

```markdown
# Мануал: Pipeline A — Код → DRAKON IR

## Призначення
[Навіщо використовується. Коли запускати. Яку задачу вирішує для розробника.]

## Задіяні агенти
- Architect Agent (порт 8766) — основний виконавець
- [інші якщо є]

## Налаштування логіки агента
[Як агент приймає рішення. Що в system prompt. Які параметри налаштовуються через /settings.]

## Запуск через інтерфейс (покрокова інструкція)
1. Відкрити /diagrams або /code
2. [точні назви кнопок — з recon]
3. ...

## Запуск через MCP (для розробників)
[shell команди з реальними прикладами]

## Очікуваний результат
[Що має з'явитись в UI та в IR після успішного виконання]

## Типові помилки та вирішення
[Заповнити з каталогу помилок — конкретні помилки знайдені під час тестування]
```

### Мануал 2: Pipeline B (DRAKON IR → Код)

**Файл:** `docs/plans/manual-pipeline-b.md`

Написати повністю українською. Структура аналогічна Мануалу 1. Додатково:

```markdown
# Мануал: Pipeline B — DRAKON IR → Код

## Призначення
## Задіяні агенти
## Підтримувані мови виводу
[Python, JavaScript, — що реально підтримується, перевірити під час тестування]
## Налаштування
## Запуск через інтерфейс
## Запуск через MCP
## Очікуваний результат
## Типові помилки
```

### Мануал 3: Agent Studio — Логіка агента через DRAKON

**Файл:** `docs/plans/manual-agent-studio.md`

Написати повністю українською. Це найважливіший мануал — описати реальний стан функціональності.

```markdown
# Мануал: Agent Studio — Налаштування логіки агента

## Призначення
[Що таке Agent Studio. Навіщо DRAKON-редактор для логіки агента.]

## Агенти в системі
- Architect (порт 8766): [роль, відповідальність]
- Docs (порт 8767): [роль]
- Drakon (порт 8771): [роль]

## Як налаштувати логіку через DRAKON-редактор
[Якщо функціональність реалізована — покрокова інструкція]
[Якщо НЕ реалізована — чесно написати: "На момент тестування X функція не реалізована.
 Обхідний шлях: ..."]

## Налаштування системного промпту агента
## Тестування агента в чаті Agent Studio
## Відомі обмеження та баги
[Конкретні BUG-N з каталогу]
```

### Мануал 4: MCP-доступ для агентів

**Файл:** `docs/plans/manual-mcp-access.md`

Написати повністю українською.

```markdown
# Мануал: MCP — повний доступ (24 інструменти)

## Авторизація та підключення
## Повний список інструментів
[Таблиця: назва, призначення, параметри, приклад виклику — з реальних результатів тестування]
## Групи інструментів
- docs.* — робота з KB
- pipeline.* — Pipeline A/B
- diagram.* — CRUD схем
- agent.* — взаємодія з агентами
## Обмеження та відомі проблеми
```

---

## Порядок виконання

```
[Auth + recon] → [БЛОК A: MCP (всі 24 tools)]
              → [БЛОК B: Agent Studio + DRAKON]
              → [БЛОК C: Pipelines CRUD]
              → [БЛОК D: Catalog помилок]
              → [БЛОК E: Записати 4 мануали]
              → [Commit + push всього]
```

Орієнтовний час: 1.5–3 години (MCP tools + LLM latency + documentation).

---

## Commit після завершення

```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 "
  cd /home/vokov/workspace/ai-drakon-scaffolder &&
  git add docs/plans/manual-pipeline-a.md \
          docs/plans/manual-pipeline-b.md \
          docs/plans/manual-agent-studio.md \
          docs/plans/manual-mcp-access.md \
          docs/plans/pinchtab-test-results-extended-2026-05-26.md &&
  git commit -m 'docs: add pipeline manuals + extended PinchTab test results' &&
  git push
"
```

---

## Примітка AGY

Очікуй **багато помилок** в зоні Agent Studio та DRAKON-редактора для логіки агентів — ця частина, найімовірніше, ще не повністю реалізована у frontend. **Не зупиняйся на помилках** — документуй кожну в Bug Catalog і продовжуй з наступним тестом. Мета фази — максимальне покриття та чесна картина стану платформи, не ідеальні результати.

---

## Семантичні зв'язки

**Цей документ є частиною:** [[agents/agy/04-pinchtab-tests/_INDEX]]
**Цей документ пов'язаний з:**
- [[04-pinchtab-tests/SKILL]] — навичка запусків тестів PinchTab
- [[04-pinchtab-tests/PHASE2-EXECUTION]] — виконання тестів PinchTab Phase 2
- [[04-pinchtab-tests/PINCHTAB-ACCESS]] — доступ до PinchTab
- [[2026-05-26-pinchtab-test-plan]] — загальний план тестів PinchTab
**Читати далі:** [[04-pinchtab-tests/PINCHTAB-ACCESS]]
