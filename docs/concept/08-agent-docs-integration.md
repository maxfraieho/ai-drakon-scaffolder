---
tags:
  - domain:concept
  - status:active
  - format:guide
created: 2026-05-26
updated: 2026-05-28
tier: 2
title: "08 — Агенти та markdown-база знань: повна інтеграція"
lang: uk
---

# 08 — Агенти та markdown-база знань: повна інтеграція

> Як AI-агенти читають, шукають і використовують проектну документацію у форматі Markdown. Від YAML-шапки файлу до відповіді в чаті агента.

---

## Концепція: Markdown як жива база знань

У AI-DRAKON документи — це не статичні файли для людей. Це **структуровані записи в базі даних**, які агенти можуть запитувати так само, як SQL-таблиці. Принцип: кожен `.md` файл у `docs/` має YAML frontmatter — машиночитаєму шапку, яка перетворює колекцію файлів на індексовану KB.

```
docs/                          ← корінь KB
├── INDEX.md                   ← покажчик (DQL-hint)
├── concept/                   ← концепції, огляди
├── architecture/              ← технічні гайди
├── kb/                        ← специфікації для агентів
├── plans/                     ← плани реалізації
└── agents/agy/                ← скіли AGY-агента
```

Агент ніколи не отримує весь вміст `docs/` в контексті — це сотні тисяч токенів. Натомість він **робить точкові запити** через MCP-інструменти: спочатку знаходить релевантні документи через DQL, потім читає конкретний файл.

---

## YAML frontmatter — схема записів

Кожен документ починається з YAML-блоку між `---`. Це Obsidian Dataview-сумісна схема:

```yaml
---
title: "Назва документу"
type: concept          # concept | architecture | kb | reference | plan | guide
tags: [drakon, agent]  # список тегів для пошуку за #tag
status: active         # active | draft | deprecated
created: 2026-05-26
updated: 2026-05-26
---
```

**Поля для DQL-запитів:**

| Поле | Тип | Опис |
|------|-----|------|
| `title` | string | Заголовок документу |
| `type` | enum | Категорія: concept, architecture, kb, reference, plan, guide |
| `tags` | list | Теги для пошуку через `FROM #tag` |
| `status` | enum | Стан документу |
| `created` | date | Дата створення |
| `updated` | date | Дата останнього оновлення |
| `file.name` | computed | Ім'я файлу без `.md` (додається автоматично) |
| `file.path` | computed | Шлях відносно REPO_ROOT (додається автоматично) |

---

## Стек: від агента до файлу

```
Агент (Claude / goclaw / AGY)
    │  MCP tool call: docs.query / docs.wikilink / docs.backlinks
    ▼
Cloudflare Worker (drakon-antigravity-worker)
    │  DOCS_AGENT_BASE = https://docs-agent.exodus.pp.ua
    │  POST /docs/dataview/query  (або GET /docs/wikilink, /docs/backlinks)
    ▼
docs-agent FastAPI  (192.168.3.184:8767)
    │  services/docs-agent/dataview_route.py
    │  REPO_ROOT = /home/vokov/workspace/ai-drakon-scaffolder
    ▼
docs/ файлова система
    │  rglob("*.md") → читає frontmatter → фільтрує
    ▼
JSON-відповідь → Worker → агент
```

**Клодфлер Worker** — єдина точка входу для всіх MCP-клієнтів. Він не зберігає стан — лише проксіює запит до docs-agent і повертає відповідь. Авторизація: Bearer-токен в запиті від клієнта.

**docs-agent** — FastAPI-сервіс, що фізично читає `docs/*.md` на сервері. Три категорії ендпоінтів:
- `/docs/dataview/query` — DQL-пошук по frontmatter
- `/docs/wikilink` — читання документу за wiki-посиланням  
- `/docs/backlinks` — зворотні посилання (хто посилається на цей документ)

---

## Три MCP-інструменти

### `docs.query` — DQL-пошук по frontmatter

Основний інструмент для навігації KB. Агент описує що шукає, не вказуючи конкретний шлях.

```
Вхід:  { "query": "DQL-рядок" }
Вихід: { "type": "LIST"|"TABLE", "rows": [...], "count": N }
```

**LIST-відповідь:**
```json
{
  "type": "LIST",
  "rows": [
    {"path": "docs/concept/03-architecture.md", "title": "03 — Архітектура системи"},
    {"path": "docs/concept/04-pipelines.md",    "title": "04 — Пайплайни"}
  ],
  "count": 2
}
```

**TABLE-відповідь:**
```json
{
  "type": "TABLE",
  "fields": ["title", "type", "status"],
  "rows": [
    {"title": "03 — Архітектура системи", "type": "concept", "status": "active"}
  ],
  "count": 1
}
```

### `docs.wikilink` — читання документу

Після того як `docs.query` повернув список, агент читає конкретний документ.

```
Вхід:  { "link": "concept/03-architecture" }
Вихід: { "frontmatter": {...}, "content": "# 03 — Архітектура..." }
```

Поле `link` — slug без `.md`, відносно `docs/`.

### `docs.backlinks` — зворотні посилання

Знайти всі документи, що посилаються на даний через `[[wiki-link]]`.

```
Вхід:  { "link": "concept/03-architecture" }
Вихід: { "backlinks": ["docs/INDEX.md", "docs/concept/README.md"] }
```

Корисно для побудови контексту: "що ще пов'язано з цим документом?"

---

## DQL — мова запитів

DQL (Dataview Query Language) — підмножина мови Obsidian Dataview. Реалізована в `dataview_route.py` через кастомний regex-парсер на Python.

### Синтаксис

```
LIST [FROM <source>] [WHERE <умова>] [SORT <поле> ASC|DESC] [LIMIT N]
TABLE <поле1>, <поле2> [FROM <source>] [WHERE <умова>] [SORT <поле> ASC|DESC] [LIMIT N]
```

### Джерела (`FROM`)

| Форма | Приклад | Що вибирає |
|-------|---------|-----------|
| `FROM "папка"` | `FROM "docs/concept"` | Всі `.md` файли в папці та підпапках |
| `FROM "файл"` | `FROM "docs/INDEX.md"` | Один конкретний файл |
| `FROM "docs"` | `FROM "docs"` | Вся база знань |
| `FROM #тег` | `FROM #drakon` | Всі документи з тегом `drakon` |

### Умови (`WHERE`)

```
WHERE type = "concept"          # рівність
WHERE status != "deprecated"    # нерівність
WHERE file.name != "INDEX"      # по обчислюваному полю
```

Підтримується одна умова. Складні умови (`AND`, `OR`) — не реалізовано.

### Сортування та ліміт

```
SORT title ASC          # за алфавітом
SORT created DESC       # найновіші спочатку
SORT updated DESC       # нещодавно оновлені
LIMIT 5                 # перші 5 результатів
```

---

## Приклади агентських запитів

### Знайти всі активні плани

```
TABLE title, status FROM "docs/plans" WHERE status = "active" SORT created DESC LIMIT 10
```

Відповідь — таблиця з назвами планів. Агент може потім читати конкретні через `docs.wikilink`.

### Знайти всі документи по архітектурі

```
LIST FROM "docs/architecture" SORT title ASC
```

### Знайти документи з тегом `pipeline`

```
TABLE title, type, updated FROM #pipeline SORT updated DESC LIMIT 5
```

### Знайти всі концепти (не INDEX)

```
TABLE title, type, status FROM "docs" WHERE type = "concept" SORT title ASC
```

(Це саме той запит, що генерує `INDEX.md` через DQL-hint.)

### Знайти KB-документи для агентів

```
LIST FROM "docs/kb" SORT title ASC
```

### Типова двокрокова стратегія агента

**Крок 1** — запит для орієнтації:
```
LIST FROM "docs" WHERE type = "architecture" SORT updated DESC LIMIT 5
```

**Крок 2** — читання конкретного документу через `docs.wikilink`:
```json
{ "link": "architecture/02_drakon_to_langgraph_mapping" }
```

---

## Як docs-agent обробляє запит

```python
# dataview_route.py — спрощений потік:

def dataview_query(req):
    parsed = _parse_dql(req.query)       # 1. Парсинг DQL
    rows = _scan_docs(parsed["source"])  # 2. Сканування файлів
    rows = _apply_where(rows, ...)       # 3. Фільтрація
    rows.sort(...)                       # 4. Сортування
    rows = rows[:limit]                  # 5. Ліміт
    return format_response(rows)        # 6. LIST або TABLE
```

**`_scan_docs`** — ключова функція. Обходить `REPO_ROOT/docs/**/*.md`, для кожного файлу:
1. Читає перші N байт (до закриваючого `---`)
2. Парсить YAML через `yaml.safe_load`
3. Додає `file.name` та `file.path` як обчислювані поля
4. Повертає dict або `None` (якщо немає frontmatter)

**REPO_ROOT** резолвиться з `.env` файлу в директорії сервісу:
```
REPO_ROOT=/home/vokov/workspace/ai-drakon-scaffolder
```

Таким чином `docs/` = `/home/vokov/workspace/ai-drakon-scaffolder/docs/` — та сама директорія, що в git.

---

## Інтеграція з AI-DRAKON фреймворком

### MCP-клієнти, що мають доступ

| Клієнт | Доступ | Сценарій використання |
|--------|--------|----------------------|
| Claude Code | через MCP server (Worker) | Читання архітектури перед кодом |
| goclaw | через MCP server (Worker) | Автономна розробка з контекстом |
| AGY (Antigravity CLI) | через MCP server (Worker) | 5-фазний docs pipeline (Skill 01) |
| architect-agent | опосередковано | Не викликає прямо (поки) |

### Роль у Pipeline A/B

Поточний стан: Pipeline A (код → IR) та Pipeline B (IR → код) не роблять DQL-запитів автоматично. Агент-орхестратор отримує KB через системний промпт (`docs/kb/01-drakon-ir-spec.md`).

**Плановий Phase 2:** перед генерацією IR агент зробить запит:
```
LIST FROM "docs" WHERE type = "kb" SORT title ASC
```
...та додасть знайдені документи до контексту як "предметні знання проекту".

### Роль у Human-Agent Loop

Розробник може зберегти нотатку через `docs-agent` (`POST /notes/write`), і вона одразу стає доступною через DQL. Це замикає петлю зворотного зв'язку:

```
Розробник пише нотатку
    → зберігається в docs/ + git commit
    → доступна через DQL на наступний запит агента
    → агент враховує її в наступному пайплайні
```

### Зв'язок з wikilinks

Документи можуть містити `[[wiki-посилання]]` одне на одного. Граф цих посилань (`/docs/graph` у frontend) відображає структуру знань. `docs.backlinks` дозволяє агенту знайти, які документи залежать від поточного — важливо при оновленні специфікацій.

---

## Оновлення бази знань

### Вручну (через git)
1. Додати `.md` файл у `docs/` з правильним YAML frontmatter
2. `git add` + `git commit` + `git push` до `ai-drakon-scaffolder`
3. На сервері: `git pull` в `/home/vokov/workspace/ai-drakon-scaffolder/`
4. Файл одразу доступний через DQL (docs-agent читає з диску, не кешує)

### Через docs-agent API
```
POST /document    — генерує документацію модуля через LLM + зберігає в docs/
POST /notes/write — зберігає довільну нотатку в docs/
```
Обидва ендпоінти роблять `git add + commit + push` автоматично.

### Через AGY (Skill 01)
AGY `01-docs-agent` skill запускає 5-фазний pipeline: аналіз репо → генерація документів → збереження через API → індексація в MemPalace → синхронізація з NotebookLM.

---

## Обмеження поточної реалізації

| Обмеження | Деталь |
|-----------|--------|
| WHERE — одна умова | `AND`/`OR` не підтримується |
| FROM #tag — точне співпадання | `#drakon` ≠ `#drakon-agent` |
| Немає повнотекстового пошуку | Тільки по frontmatter-полях |
| Немає кешування | Кожен запит читає файли з диску |
| REPO_ROOT — локальний шлях | При переносі сервера треба оновити `.env` |

---

## Швидка довідка для агента

```
# Вся база знань, тільки активні, топ-10 нових:
TABLE title, type FROM "docs" WHERE status = "active" SORT updated DESC LIMIT 10

# Всі концепти:
LIST FROM "docs/concept" SORT title ASC

# Всі плани у статусі active:
TABLE title, status FROM "docs/plans" WHERE status = "active"

# За тегом:
LIST FROM #pipeline LIMIT 5

# Читання конкретного документу (після LIST-запиту):
docs.wikilink("architecture/03_live_tracing_protocol")
```

---

## Семантичні зв'язки
**Цей документ є частиною:** [[concept/_INDEX]]
**Цей документ пов'язаний з:**
- [[06-knowledge-base]] — інтегрована база знань предметної області