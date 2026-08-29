---
status: accepted
date: 2026-08-29
deciders: Q, Claude (verification + implementation), agy .234/.30 (partial implementation)
spec: null
supersedes: null
superseded-by: null
---

# 0027. Atomic self-heal writes and honest data-source separation for live UX-audit defects

## Контекст і формулювання проблеми

Живий UX-аудит (Comet, aidrakon.tech, 2026-08-28) знайшов 5 production-дефектів
(TEST_REPORT.md). Двоє з них виявились не косметичними багами, а симптомами
архітектурних помилок, що варто задокументувати окремо від самого фіксу, щоб
той самий клас помилки не повторився деінде в кодовій базі:

1. **Save нової DRAKON-схеми -> `HTTP 500: UNIQUE constraint failed: harness_specs.id`.**
   Корінь -- `HarnessSpecRepository.upsert()` (`packages/tenancy/src/repositories.ts`)
   робив check-then-act (`get()` -> якщо нема, `create()`), а не атомарний SQL.
   `resolveMcpTenantAndSpec` (`cloudflare-worker/worker-mcp-drakon.js`) викликає
   цей self-heal на кожен MCP-запит без наявного harness-spec-рядка. Два
   майже-одночасні виклики (типовий сценарій при Save) обидва бачили
   "рядка нема" і обидва йшли в `create()` -- другий падав на PRIMARY KEY.
2. **`/agents` показує "No agents found", хоча `/pipelines` показує реальний
   список.** Корінь -- не один зламаний запит, а два РІЗНІ джерела даних під
   одним словом "агенти": `AgentsPage.tsx` тягнув `api.listDrakonIr()`
   (збережені DRAKON-діаграми користувача, порожньо через дефект #1), а
   `/pipelines` тягнув `fetchPipelines()` (попередньо визначені pipeline-конфіги,
   завжди непорожні). Наївне об'єднання джерел ламало б delete/studio-навігацію
   (pipeline-конфіги не мають per-project `slug`).

Ще два дефекти (`/workspace` HTTP 502 без обраного репозиторію, Settings
"GitNexus Status: HTTP 404") -- прості, без архітектурних наслідків: відсутній
guard-clause і виклик неправильного origin відповідно. Записано тут для
повноти обліку, не тому що вимагали рішення з альтернативами.

## Рушії рішення

* Не чіпати бізнес-логіку/tenancy ширше за виявлений дефект (правило сесії).
* Concurrency-безпека без нових залежностей -- D1/SQLite вже підтримує
  `ON CONFLICT`, зайвий інфраструктурний шар не потрібен.
* `/agents` не має мовчки видавати чужі дані за свої (diagram != pipeline) --
  краще показати обидва джерела чесно позначеними, ніж підмінити один тип
  сутності іншим.
* Мінімальний diff, що проходить live-верифікацію на реальному коді
  (перевірено на .184, HEAD `eda65238e` -> `98f95f3f`), не гіпотетичний фікс.

## Розглянуті варіанти

### Дефект #1 (harness_specs race)

* **A. Атомарний `INSERT ... ON CONFLICT(id) DO UPDATE`** -- прибирає TOCTOU-вікно
  повністю на рівні SQL.
* B. Мьютекс/lock на рівні Worker (Durable Object) навколо self-heal-шляху --
  зайва складність і затримка на кожен MCP-виклик заради races, що трапляються
  рідко і мають дешевий SQL-фікс.
* C. Ловити помилку `SQLITE_CONSTRAINT_PRIMARYKEY` і повторити `update()` --
  працює, але лишає гонку відкритою для інших читачів між `INSERT`-провалом і
  retry; ORM-рівня "retry on conflict" гірше за нативний `ON CONFLICT`.

### Дефект #2 (/agents джерело даних)

* **A. Показати обидва джерела окремо позначеними** (`source: "diagram" | "pipeline"`),
  pipeline-картки read-only, ведуть на вже наявний `/pipeline/$id/edit`.
* B. Повністю замінити `listDrakonIr()` на `fetchPipelines()` -- найпростіший diff,
  але ламає `handleDelete`/`handleOpenStudio` (обидва slug-scoped, pipeline-конфіги
  slug не мають) -- відкинуто після виявлення під час реалізації, не заздалегідь.
* C. Прибрати pipeline-дані з `/agents` взагалі, лишити тільки diagram-агентів,
   пояснити порожній стан в UI -- не вирішує реальну плутанину користувача
   (dashboard і далі не показує те, що показує `/pipelines`).

## Підсумок рішення

Дефект #1: обрано **Варіант A** (атомарний `ON CONFLICT`) --
`packages/tenancy/src/repositories.ts:289-306`, `upsert()` спрощено до прямого
виклику `create()` (SQL сам вирішує insert-vs-update).

Дефект #2: обрано **Варіант A** (окремо позначені джерела) --
`src/pages/AgentsPage.tsx`. Global (без `slug`) query тепер збирає й
diagram-агентів, і pipeline-конфіги, тегує `source`; рендер картки гілкується:
pipeline-картки не мають Delete/Settings-кнопок і ведуть на
`/pipeline/$pipelineId/edit` замість studio.

### Наслідки

* Добре, тому що self-heal-шлях (`resolveMcpTenantAndSpec`) тепер безпечний під
  конкурентним навантаженням без зміни свого API чи додаткової інфраструктури.
* Добре, тому що `/agents` більше не приховує реальні pipeline-конфіги від
  користувача, і не видає їх помилково за diagram-агентів.
* Погано, тому що "агент" в цій кодовій базі і далі означає дві різні сутності
  (diagram vs pipeline config) під одним UI-роутом -- цей ADR фіксує це чесно,
  але не усуває першопричину плутанини; повне злиття моделей (якщо колись
  вирішено) -- окремий, більший ADR.
* Погано, тому що `create()`-запит для `harness_specs` тепер завжди виконує
  `ON CONFLICT`-гілку навіть коли рядок точно новий (мікроскопічний, не
  вимірюваний накладний SQL-кошт) -- прийнятний компроміс заради усунення races.

## Додаткова інформація

* Джерело: живий UX-аудит (Comet, aidrakon.tech, 2026-08-28), наданий Q напряму
  в чат сесії, не закомічений окремим файлом TEST_REPORT.md в репо.
* Верифікація: `packages/harness-contract/src/index.ts`, `packages/tenancy/src/index.ts`,
  `infrastructure/d1/schema.sql:76-87` (`harness_specs.id TEXT PRIMARY KEY`,
  підтверджує сумісність з `ON CONFLICT(id)`).
* Коміти: `cbc0cc7d` (дефект #1), `783f3675` (workspace 502), `d0e4f4a2`
  (GitNexus health badge), `98f95f3f` (дефект #2).
* Дефект "TEST_REPORT #3" (`/pipelines` "Редагувати" не відкриває editor) --
  НЕ вирішено. Код (`navigate()`, route tree) виглядає коректним статичним
  аналізом; причина не встановлена, потребує live-репродукції в браузері.
  Лишається відкритим для наступної сесії.
* Не запускались `tsc`/`vitest` для жодного з фіксів -- обидва чекаути (.184,
  свіжий клон на .30), задіяні цієї сесії, без встановлених `node_modules`.
  Верифікація -- ручне читання торкнутих блоків + звірка схеми D1.
