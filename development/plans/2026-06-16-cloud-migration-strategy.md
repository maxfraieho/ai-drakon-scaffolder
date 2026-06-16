# Стратегія повного переходу AI-DRAKON + Garden Bloom у хмару (zero on-prem dependency)

> **Дата:** 2026-06-16
> **Автор:** Opus 4.8 (за завданням `development/prompts/2026-06-16-opus-cloud-migration-strategy.md`)
> **Статус:** стратегія/план (НЕ імплементація). Скоуп зафіксовано.
> **Джерело істини коду:** GitNexus-індекс `ai-drakon-scaffolder` @ commit `b4bc5c2` (свіжий).

---

## Мета

Перевести всі **runtime**-залежності продукту AI-DRAKON + Garden Bloom у хмару так, щоб
вимкнення домашнього dev-сервера `192.168.3.184` і обох Android-пристроїв (AGY phone,
AGY3 tablet) **ніяк не вплинуло** на роботу продукту. Appwrite (Education plan,
`fra.cloud.appwrite.io`, project `6a23420a003a04b4997b`) — основна хмарна платформа
для backend-логіки, не лише auth-провайдер.

---

## Звірка фактів з GitNexus (виконано перед висновками)

| Твердження | Статус | Доказ |
|---|---|---|
| `docs-agent-flue` не має `/notes/build-semantic-graph` | ✅ підтверджено | `build_semantic_graph` існує ТІЛЬКИ у Python `services/docs-agent/notes_route.py:468` + `semantic_graph.py`. |
| CF-воркер обробляє notes "сам" | ⚠️ уточнено | `handleNotesBuildSemanticGraph` (`worker-mcp-drakon.js:2893`) — **тонкий проксі**: `fetch(\`${DOCS_AGENT_URL}/notes/build-semantic-graph\`)` (timeout 120s). Жорстка прив'язка до dev-сервера. |
| LLM-виклики лише з `notes_route.py` | ❌ спростовано | LLM-шар розповсюджений через `services/shared/` (`llm_node.py`, `built_in_tools.py:search_kb`) у трьох Python-агентах (`architect-agent/pipeline/graph_loader.py`, `drakon-agent/ai_refiner/refiner.py`, `docs-agent`). |
| `architect-agent` дублює `architect-agent-flue` | ✅ підтверджено | Python `pipeline/graphs.py` (LangGraph) + `job_store.py` ↔ Flue `tools/graph-pipelines.ts:executePipelineSSE` + `lib/job-store.ts` (Durable Object). Flue-версія попереду (SSE+DO). |
| drakon KB-retrieval вже на Flue | ✅ знахідка | `drakon-agent-flue/lib/kb-retriever.ts` (клас `BM25`, `loadKB`) — TS-порт Python `drakon-agent/knowledge_base/retrieval.py`. |

---

## Скоуп (зафіксовано з власником проєкту)

### Поза скоупом — лишається локальним dev-tooling (продукт НЕ торкається)

- **GitNexus** — індексація кодової бази для розробки.
- **MemPalace** — знаннєвий граф документації для розробки.
- **ai-memory** (`:49374`) — cross-session handoffs агентів-розробників.
- **OpenDesign** (`:7460`) — за замовчуванням dev-tool (підтвердити у Фазі 0).

Вимкнення dev-сервера їх стосується, але **не стосується критерію «готово»**, бо продукт
їх не використовує у runtime. Наслідок: `docs-agent/gitnexus_route.py:generate_docs`
(тягне з GitNexus) — dev/doc-generation фіча, не user-runtime шлях. Перевірити лише, що
`generate_docs` не висить на користувацькому ендпоінті фронтенду.

### У скоупі міграції (Appwrite-first)

| # | Компонент | Клас | Дія |
|---|---|---|---|
| 1 | LLM-проксі шар (Aegis Relay `free-claude-code` + AGY phone/tablet + :19195) | 🔴 → Appwrite | Єдина `llm-gateway` Function: failover NIM→OpenRouter→DeepSeek, Anthropic+OpenAI формати, ключі в env. |
| 2 | docs-agent **semantic-graph** (Python `notes_route.py`+`semantic_graph.py`) | 🔴 redesign | Async-job у Appwrite: 1 invocation/документ→Appwrite DB; `handleNotesBuildSemanticGraph` перемкнути з проксі-на-dev → виклик Appwrite. |
| 3 | Python `drakon-agent` / `architect-agent` | 🟡 | Звірити паритет з `*-flue` (KB+refiner і SSE+DO вже портовані), фронтенд лише на Flue, OpenRC stop. |
| 4 | NotebookLM-проксі (RPi 3B) | 🔴 | Логіка → Appwrite Function; Google-акаунт = єдина provider-залежність (виклик з Appwrite, не з RPi); публічний UI = "Archivist AI". |
| 5 | OpenDesign | 🟡/❓ | Якщо runtime → керований контейнер; якщо dev-tool → лишити локально. Уточнити у Фазі 0. |

### Вже в хмарі (cloud-ready, нічого не робити)

- Frontend (TanStack/Start SSR, Cloudflare Pages, автодеплой по push).
- Auth/сесії — Appwrite OAuth (GitHub).
- `worker-mcp-drakon.js` (MCP/OAuth/notes CRUD) — окрім ребра semantic-graph (п.2).
- Три Flue-агенти: `architect-agent-flue`, `drakon-agent-flue`, `docs-agent-flue` (`/health`=200).
- `garden-mcp.exodus.pp.ua` (CF Worker, Zone access).

---

## Appwrite: ліміти студентської акції (GitHub Student Pack)

**Education plan = 2 проєкти, кожен з лімітами Pro** (мінус email-підтримка), безкоштовно
до випуску. На проєкт:

| Ресурс | Pro/проєкт | Достатність для ai-drakon |
|---|---|---|
| **Compute** | **1 000 GB-год/міс** | 🔑 binding-обмежувач. При 512 МБ/функцію ≈ 2 000 год wall-time/міс ≈ 720K LLM-викликів по 10с. Запас великий. |
| Function executions | 3.5M/міс | Не обмежує. |
| Build timeout | 45 хв | OK. |
| Функцій на проєкт | Необмежено | Усі агенти + gateway в одному проєкті. |
| Bandwidth | 2 ТБ/міс | OK. |
| Storage | 150 ГБ | OK. |
| DB reads / writes | 1 750K / 750K /міс | Стежити за writes під час масового реіндексу графа. |
| Realtime | 500 конектів | OK. |
| Overage | автодокупівля до budget cap | — |

**Не підтверджено — перевірити в Console:** макс **execution timeout функції** (дефолт ~15с,
стеля ймовірно 900с). Прямо визначає дизайн semantic-graph-job. НЕ приймати як факт.

**Висновок:** одного Pro-проєкту вистачає з запасом. Рекомендація — **прод в одному проєкті**,
**другий проєкт = staging/preview** для безпечних one-way-door переходів (окремий контур
секретів/даних).

---

## Стратегія LLM-проксі шару

Поточний хаос: 4 шляхи (AGY phone, AGY3 tablet, Aegis Relay на dev-сервері, :19195),
усі прив'язані до LAN. Граф підтвердив виклики через `services/shared/` з трьох агентів.

**Рекомендація — два рівні, жодного self-hosted relay:**

1. **Канонічний gateway = Appwrite Function `llm-gateway`** — порт failover-логіки Aegis Relay
   у `fetch()`-каскад (NIM→OpenRouter→DeepSeek), обидва формати (Anthropic+OpenAI як зараз
   :8082/:18880), ключі провайдерів в env-змінних функції.
2. **CF AI Gateway** перед провайдерами — кеш/аналітика/rate-limit/retry (опційно, дешево).

**Тредоф (названо явно):** три Flue-агенти вже в Cloudflare. Виклик у Appwrite Function за
LLM = cross-cloud хоп (+латентність). Опції:
- **(A)** Єдиний Appwrite-gateway для ВСІХ. Плюс: одне джерело істини/ключів, повна
  відповідність вимозі. Мінус: зайвий хоп для Worker-агентів.
- **(B)** Гібрид: Appwrite-gateway для не-Worker коду; Flue-Workers б'ють провайдерів напряму
  через CF AI Gateway з тими самими ключами. Плюс: мінімальна латентність. Мінус: ключі у
  двох місцях.

**Рекомендація: (A) на старті** (простота + єдність + відповідність вимозі), міграція на (B)
лише якщо виміряна латентність стане проблемою.

---

## Фазовий план

| Фаза | Що | Критерій без регресій |
|---|---|---|
| **0. Інвентар** | Execution-timeout у Console; призначення :19195; паритет Python vs Flue; статус OpenDesign (runtime/dev); чи `generate_docs` висить на user-ендпоінті | Усі ❓ закриті фактами. |
| **1. LLM-gateway → Appwrite** | Failover-Function (staging→прод); перемкнути всіх клієнтів | `free-claude-code` stop 24 год, агенти відповідають; **AGY phone/tablet можна вимикати**. |
| **2. semantic-graph → Appwrite (redesign)** | `semantic_graph.py` як async-job: 1 invocation/документ→Appwrite DB (обхід timeout); `handleNotesBuildSemanticGraph` з проксі-на-dev → виклик Appwrite | Граф ідентичний поточному на тест-корпусі; воркер не б'є `DOCS_AGENT_URL`. |
| **3. Вимкнути Python drakon/architect-agent** | Звірити паритет з `*-flue`; фронтенд лише на Flue; OpenRC stop | Чат + pipeline SSE лише через Flue — нема регресій. |
| **4. NotebookLM-проксі → Appwrite** | Логіка → Appwrite Function; Google-виклик з хмари | `/notebooks` віддає дані без RPi. |
| **5. OpenDesign** | За результатом Фази 0 | Прод не б'є `:7460` (або визнано dev-tool). |

Правило переходу: не вимикати жоден Python/dev-сервіс, поки хмарний еквівалент не
відпрацював у прод ≥24 год без регресій. Відкат = знову ввімкнути OpenRC-сервіс.

---

## Критерій «готово»

Вимкнення **dev-сервера 192.168.3.184** + **AGY phone** + **AGY3 tablet** не ламає продукт.

**НЕ має лишитись у прод-контурі:** `ai-docs-agent` (:8767), `ai-drakon-agent` (:8765),
`ai-architect-agent`, `free-claude-code` (:8082), `free-claude-code-proxy` (:18880),
проксі :19195, RPi-NotebookLM.

**Дозволено лишити на dev-сервері** (dev-only, продукт не торкається): GitNexus, MemPalace,
ai-memory, [OpenDesign — за Фазою 0].

**Тест приймання:** фізично вимкнути dev-сервер + обидва Android → пройти e2e:
логін (Appwrite OAuth) → чат з кожним з 3 агентів → pipeline SSE → `/notes/build-semantic-graph`
→ `/knowledge` + `/notebooks`. Усе зелене = «готово».

---

## Врахування існуючих інвестицій

- **Appwrite** — підвищується з auth-провайдера до основного backend-хоста.
- **Cloudflare Workers/Pages** — frontend + 3 Flue-агенти (цільова архітектура).
- **Flue** — стандарт для агентів; Python-версії виводяться, не переписуються наново.
- **GitHub** — джерело істини для коду/документів.
- **CF AI Gateway** — тонкий шар спостереження/кешу перед провайдерами.

---

## Відкриті ❓ до Фази 0 (імплементація, не стратегія)

1. Макс execution-timeout функції у Console (визначає дизайн semantic-graph-job).
2. Призначення проксі :19195 (ймовірно зайвий шар над Aegis Relay).
3. Паритет Python `architect/drakon-agent` vs Flue-версій.
4. OpenDesign — runtime-залежність продукту чи dev-tool.
5. Чи `docs-agent/gitnexus_route.py:generate_docs` висить на user-ендпоінті фронтенду.

---

## Джерела (Appwrite ліміти)

- https://appwrite.io/blog/post/announcing-appwrite-education-program
- https://appwrite.io/education
- https://appwrite.io/pricing
- https://appwrite.io/docs/advanced/platform/pro
