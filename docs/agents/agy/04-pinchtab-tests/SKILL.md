---
title: "AGY Skill 04 — PinchTab Test Plan: Research Phase"
type: guide
tags: [agy, pinchtab, testing, ui, browser-automation]
status: active
created: 2026-05-26
updated: 2026-05-26
---

# AGY Skill 04 — PinchTab Test Plan: Research Phase

> **Дослідницька фаза.** Отримай свіжу документацію, проіндексуй у MemPalace, проконсультуйся з NotebookLM, розроби вичерпний план тестування `https://ai-drakon-scaffolder.pages.dev/` за допомогою PinchTab. Запиши план у файл та поверни Q.

---

## Контекст

AI-DRAKON — це платформа візуального програмування на основі DRAKON з підтримкою AI-агентів.

| Шар | Деталі |
|-----|--------|
| Frontend | React/TypeScript, задеплоєний на Cloudflare Pages |
| Prod URL | `https://ai-drakon-scaffolder.pages.dev/` |
| Dev server | `192.168.3.184` (Alpine Linux) |
| CF Worker | Проксі між фронтом та агентами |
| Агенти | FastAPI :8766 (architect), :8767 (docs), :8771 (drakon) |

**PinchTab** — MCP-інструмент для автоматизації браузера. Запускається на `192.168.3.184`.

---

## Крок 1: Pull свіжих репозиторіїв

```bash
# Scaffolder (документація + фронтенд)
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "cd /home/vokov/workspace/ai-drakon-scaffolder && git pull"

# Setup (backend сервіси) — для розуміння API
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "cd /home/vokov/workspace/ai-drakon-setup && git pull"
```

Очікування: `Already up to date.` або список змінених файлів. Зафіксуй поточний commit hash.

---

## Крок 2: Читання ключової документації

Прочитай ці файли **на dev сервері** або через SSH:

### 2.1 Основні довідники

```bash
# Всі сторінки UI + API-виклики
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "cat /home/vokov/workspace/ai-drakon-scaffolder/docs/ui-pages-reference.md"

# Карта сторінок + маршрути
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "cat /home/vokov/workspace/ai-drakon-scaffolder/docs/concept/README.md"
```

### 2.2 Архітектурні гайди

```bash
# Pipeline A та B
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "cat /home/vokov/workspace/ai-drakon-scaffolder/docs/concept/04-pipelines.md"

# Human-Agent Loop
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "cat /home/vokov/workspace/ai-drakon-scaffolder/docs/concept/05-human-agent-loop.md"

# Агенти та markdown-KB (MCP-інтеграція)
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "cat /home/vokov/workspace/ai-drakon-scaffolder/docs/concept/08-agent-docs-integration.md"
```

### 2.3 LangGraph + Live Tracing (для тестування SSE)

```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "cat /home/vokov/workspace/ai-drakon-scaffolder/docs/architecture/03_live_tracing_protocol.md"
```

### 2.4 Безпека + auth

```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "cat /home/vokov/workspace/ai-drakon-scaffolder/docs/architecture/05_security_and_deployment.md"
```

### 2.5 UX Audit (відомі проблеми та ризики)

```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "cat /home/vokov/workspace/ai-drakon-scaffolder/docs/ux-audit/audit.md"

sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "cat /home/vokov/workspace/ai-drakon-scaffolder/docs/ux-audit/risks.md"
```

### 2.6 DQL-запит: всі довідники та плани

```bash
curl -s -X POST http://192.168.3.184:8767/docs/dataview/query \
  -H "Content-Type: application/json" \
  -d '{"query": "TABLE title, type, status FROM \"docs\" WHERE type = \"reference\" SORT title ASC"}'

curl -s -X POST http://192.168.3.184:8767/docs/dataview/query \
  -H "Content-Type: application/json" \
  -d '{"query": "TABLE title, type, status FROM \"docs\" WHERE type = \"plan\" SORT title ASC LIMIT 10"}'
```

---

## Крок 3: Індексація в MemPalace

Після читання документації оновити MemPalace. Перевір стан:

```
mempalace_status()
mempalace_list_wings()
```

Якщо wing `ai-drakon` вже існує — оновити ключові drawer'и. Якщо ні — створити wing.

### Drawer'и для оновлення/створення:

**Wing: ai-drakon / Room: ui-routes**
```
Drawer: pages-map
Content: Маршрути AI-DRAKON:
  /login — вхід (публічна)
  / → /diagrams (redirect)
  /diagrams — головна, DRAKON Editor + Pipeline A/B ★
  /diagram/editor — повноекранний DRAKON-редактор
  /editor/:id — редактор конкретної схеми
  /agents — Agent Studio (IDE пайплайнів)
  /pipeline/:id/edit — редактор пайплайну
  /pipelines — список/CRUD пайплайнів
  /devcycle — DevCycle (публічна)
  /code — Monaco editor + Pipeline A
  /github — GitHub file browser
  /sync — diff код ↔ DRAKON
  /docs — генерація документації
  /settings — Worker URL, JWT, GitHub token, моделі
  
  AUTH: всі крім /login і /devcycle → redirect /login без JWT
```

**Wing: ai-drakon / Room: ui-routes**
```
Drawer: auth-flow
Content: JWT зберігається в localStorage через hasClientJwt().
  /login → POST /v1/auth/login → отримує JWT → localStorage.
  Всі API-виклики додають Authorization: Bearer <jwt>.
  Після logout → redirect /login.
```

**Wing: ai-drakon / Room: source-agents**
```
Drawer: api-endpoints
Content: Worker проксі URL (з /settings).
  POST /v1/pipeline/analyze — Pipeline A (код→IR)
  POST /v1/pipeline/generate — Pipeline B (IR→код)
  GET /v1/pipeline/status/:id — статус job
  GET/POST/PUT/DELETE /v1/pipelines — CRUD пайплайнів
  GET/POST /v1/diagrams — CRUD діаграм
  POST /v1/agents/chat — Agent Studio chat
  POST /v1/docs/generate — docs-agent
  GET /v1/github/files — GitHub файли
```

---

## Крок 4: Консультація з NotebookLM drn-ai

Використай MCP сервер NotebookLM для отримання додаткового контексту про платформу.

**MCP endpoint:** `http://192.168.3.234:8002/mcp`  
**Notebook ID:** `6139067a-5776-4b29-8869-7c9f9aed475c`  
**Script:** `~/.claude/skills/notebooklm-mcp/scripts/notebooklm_mcp.py`

```bash
SCRIPT=~/.claude/skills/notebooklm-mcp/scripts/notebooklm_mcp.py

# Перевір список джерел
python3 $SCRIPT list-sources 6139067a-5776-4b29-8869-7c9f9aed475c
```

Після отримання списку джерел — зафіксуй які документи вже проіндексовано в NotebookLM.

---

## Крок 5: Перевірка live стану платформи

Перед написанням плану — перевір що платформа живе:

```bash
# Перевір CF Pages (через curl, не PinchTab)
curl -s -o /dev/null -w "%{http_code}" https://ai-drakon-scaffolder.pages.dev/

# Перевір Worker (якщо знаєш URL з MemPalace)
# curl -s https://<worker-url>/health

# Перевір агентів на dev server
curl -s http://192.168.3.184:8766/health
curl -s http://192.168.3.184:8767/health
curl -s http://192.168.3.184:8771/health

# PinchTab health
```

Зафіксуй які сервіси відповідають, які ні.

---

## Крок 6: Розробка плану тестування

На основі всієї зібраної інформації розроби **детальний план тестування** зі структурою нижче.

### Структура плану

#### A. Auth + Protected Routes (пріоритет 1)

Для кожного тест-кейсу:
- **ID**: TEST-AUTH-01, TEST-AUTH-02, ...
- **Назва**: коротко що тестується
- **Передумови**: стан браузера до тесту (чистий localStorage, або є JWT)
- **Кроки**: точні дії через PinchTab (`pinchtab_navigate`, `pinchtab_fill`, `pinchtab_click`, etc.)
- **Очікуваний результат**: URL, наявність елементів, текст
- **Перевірка**: як перевірити (screenshot + `pinchtab_snapshot` або `pinchtab_get_text`)

Тест-кейси мінімум:
- TEST-AUTH-01: Відкрити `/` без JWT → redirect `/login`
- TEST-AUTH-02: Відкрити `/diagrams` без JWT → redirect `/login`
- TEST-AUTH-03: Логін з валідними кредами → redirect `/diagrams`, JWT в localStorage
- TEST-AUTH-04: Логін з невалідними кредами → error message на сторінці
- TEST-AUTH-05: Після логіну відкрити `/settings` → доступно без redirect

#### B. Головна сторінка /diagrams (пріоритет 1)

- TEST-DIAG-01: Сторінка завантажується, DiagramsLeftPanel видний
- TEST-DIAG-02: Ліва панель — список схем або empty state
- TEST-DIAG-03: CodeAnalysisPanel (Pipeline A) видна ліворуч
- TEST-DIAG-04: CodeGenerationPanel (Pipeline B) видна праворуч
- TEST-DIAG-05: DrakonEditor відображається в центрі
- TEST-DIAG-06: Кнопка "Нова схема" присутня в лівій панелі

#### C. Pipeline A: Код → IR (пріоритет 1)

- TEST-PIPE-A-01: Вставити Python-код у CodeAnalysisPanel
- TEST-PIPE-A-02: Натиснути "Analyze" → починається job
- TEST-PIPE-A-03: Polling статусу job (індикатор прогресу видний)
- TEST-PIPE-A-04: По завершенні — IR JSON з'являється в DrakonIrPanel
- TEST-PIPE-A-05: DrakonEditor оновлюється з новою схемою

#### D. /settings — Конфігурація (пріоритет 1)

- TEST-SETT-01: Сторінка завантажується
- TEST-SETT-02: Worker URL поле присутнє + показує поточне значення
- TEST-SETT-03: JWT поле присутнє
- TEST-SETT-04: GitHub token поле присутнє
- TEST-SETT-05: LLM model selector присутній
- TEST-SETT-06: Зміна Worker URL → збереження → перезавантаження → значення збереглося

#### E. /agents — Agent Studio (пріоритет 2)

- TEST-AGENT-01: Сторінка завантажується
- TEST-AGENT-02: Chat інтерфейс присутній
- TEST-AGENT-03: Відправити повідомлення → відповідь агента з'являється
- TEST-AGENT-04: Список пайплайнів в Agent Studio

#### F. /pipelines — Список пайплайнів (пріоритет 2)

- TEST-PIPE-01: Сторінка завантажується
- TEST-PIPE-02: Empty state або список пайплайнів
- TEST-PIPE-03: Кнопка "New pipeline" присутня

#### G. /docs — Генерація документації (пріоритет 2)

- TEST-DOCS-01: Сторінка завантажується
- TEST-DOCS-02: DQL query поле присутнє
- TEST-DOCS-03: Виконати DQL-запит → результат відображається

#### H. /code — Monaco Editor (пріоритет 2)

- TEST-CODE-01: Сторінка завантажується
- TEST-CODE-02: Monaco editor відображається
- TEST-CODE-03: Введення Python коду

#### I. /github — GitHub Browser (пріоритет 3)

- TEST-GH-01: Сторінка завантажується (без GitHub token — показує інструкцію)
- TEST-GH-02: Якщо GitHub token є — показує файли репо

#### J. /sync — Diff View (пріоритет 3)

- TEST-SYNC-01: Сторінка завантажується
- TEST-SYNC-02: UI для порівняння код ↔ DRAKON

#### K. Навігація та стан між сторінками (пріоритет 2)

- TEST-NAV-01: Навігація між /diagrams → /agents → /settings без logout
- TEST-NAV-02: JWT зберігається після навігації
- TEST-NAV-03: Browser back/forward зберігає стан

#### L. Помилки та граничні випадки (пріоритет 2)

- TEST-ERR-01: Відкрити `/editor/nonexistent-id` → відповідна помилка або empty state
- TEST-ERR-02: Відкрити `/pipeline/nonexistent-id/edit` → відповідна помилка
- TEST-ERR-03: Pipeline A з порожнім кодом → validation error

---

## Крок 7: Запис плану у файл

Зберегти план у файл:

```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 \
  "cat > /home/vokov/workspace/ai-drakon-scaffolder/docs/plans/2026-05-26-pinchtab-test-plan.md" << 'PLAN_EOF'
[ТУТ ВЕСЬ ПЛАН З ДЕТАЛЬНИМИ КРОКАМИ]
PLAN_EOF
```

**Формат файлу:**
```markdown
---
title: "PinchTab Test Plan — AI-DRAKON Platform"
type: plan
tags: [testing, pinchtab, browser-automation, ui]
status: active
created: 2026-05-26
updated: 2026-05-26
---

# PinchTab Test Plan — AI-DRAKON Platform

> Target: https://ai-drakon-scaffolder.pages.dev/
> Tool: PinchTab browser automation MCP (192.168.3.184)

## Передумови
[що потрібно: кред, Worker URL, etc.]

## Тест-кейси
[Всі TEST-* згруповані за категоріями, з точними PinchTab командами]

## Порядок виконання
[Пріоритет 1 → 2 → 3, total estimated time]
```

Після запису — commit в git:

```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 "
  cd /home/vokov/workspace/ai-drakon-scaffolder &&
  git add docs/plans/2026-05-26-pinchtab-test-plan.md &&
  git commit -m 'feat(plans): add PinchTab test plan for CF Pages deployment'
"
```

Якщо є можливість push — push:
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 "
  cd /home/vokov/workspace/ai-drakon-scaffolder && git push
"
```

---

## Крок 8: Відповідь Q

Після виконання всіх кроків — надай Q:

1. **Стан репозиторіїв**: commit hash, що змінилося
2. **Стан сервісів**: які health endpoints відповідають (HTTP коди)
3. **MemPalace**: які drawer'и оновлено / створено
4. **NotebookLM**: які джерела вже є в drn-ai
5. **Знайдені ризики** (з ux-audit/risks.md і власних спостережень)
6. **Питання до Q**: які кредентіали використовувати для логіну, чи є тестовий акаунт
7. **Шлях до плану**: `/home/vokov/workspace/ai-drakon-scaffolder/docs/plans/2026-05-26-pinchtab-test-plan.md`
8. **Короткий зміст плану**: скільки тест-кейсів, які категорії, де найбільше ризиків

---

## Чекліст

- [ ] git pull на обох репозиторіях (scaffolder + setup)
- [ ] Прочитані: ui-pages-reference, pipelines, architecture/03, architecture/05, ux-audit
- [ ] DQL-запити до docs-agent виконані
- [ ] MemPalace drawer'и оновлено (ui-routes, auth-flow, api-endpoints)
- [ ] NotebookLM drn-ai джерела перевірені
- [ ] HTTP health checks всіх сервісів виконані
- [ ] Файл плану збережений та закомічений
- [ ] Відповідь Q з усіма 8 пунктами надана
