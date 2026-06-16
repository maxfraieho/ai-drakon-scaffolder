# Завдання: стратегія повного переходу AI-DRAKON + Garden Bloom у хмару (zero on-prem dependency)

## Контекст і мета

Проєкт AI-DRAKON (DRAKON-компілятор + агентна платформа) і його підкомпонент Garden Bloom
(система управління знаннями: NotebookLM/GitNexus/MemPalace через MCP, семантичний граф
документів) зараз частково залежать від **локальної інфраструктури в домашній мережі**:
один слабкий dev-сервер (Alpine Linux, AMD C-60 CPU 2011 року, 1.5 ГБ RAM, постійний
swap-трешинг) і кілька Android-пристроїв (телефон/планшет AGY), що виступають LLM-проксі.

**Мета:** розробити повну, покрокову стратегію переведення АБСОЛЮТНО ВСІХ необхідних
для роботи проєкту сервісів у хмару — так, щоб вимкнення домашньої мережі/dev-сервера
ніяк не вплинуло на роботу AI-DRAKON і Garden Bloom. Включно з LLM-проксі (зараз це
найслабша точка — кілька різних self-hosted рішень).

Не потрібно зараз імплементувати — потрібна **стратегія/план**: інвентаризація,
класифікація компонентів (cloud-ready / потребує редизайну / потребує заміни),
граф залежностей, фазування міграції, оцінка вартості (бюджет — безкоштовні/дешеві
тіри, проєкт фінансується власним коштом), і конкретний критерій "готово" (можна
вимкнути dev-сервер і нічого не зламається).

---

## Поточний інвентар (все перевірено сьогодні, факти, не припущення)

### Компонент 1: AI-DRAKON (scaffolder, DRAKON-компілятор, агенти)

**Вже в хмарі (підтверджено живим тестом):**
- Frontend: TanStack Router/Start SSR app, деплой на Cloudflare Pages з `.lovable/` build (репо
  `ai-drakon-scaffolder`, GitHub). Автодеплой по push.
- Auth/сесії: Appwrite (`fra.cloud.appwrite.io`, project `6a23420a003a04b4997b`, Education plan).
  GitHub OAuth для логіну (native Appwrite OAuth2Session) + окремий GitHub-репо-конект-флоу
  (через Cloudflare Worker, недавно виправлений popup+postMessage баг).
- Головний proxy/MCP-воркер: `drakon-antigravity-worker.maxfraieho.workers.dev`
  (`cloudflare-worker/worker-mcp-drakon.js`) — обробляє GitHub OAuth callback, MCP tools
  (listdiagrams, savediagram, github.*, docs.*, architect.*, agentchat...), частину
  `/v1/notes/*` маршрутів (list/get/commit/delete/graph) обробляє ВСЕРЕДИНІ себе.
- Три агенти мігровано на **Flue** (TypeScript agent harness) і задеплоєні як окремі
  Cloudflare Workers (підтверджено `/health` → 200 на всіх трьох):
  - `architect-agent-flue.maxfraieho.workers.dev` (Durable Objects `ArchitectJobStore` для
    job-стейту, KV `PIPELINES_KV`+`SESSION_KV`)
  - `docs-agent-flue.maxfraieho.workers.dev` (KV `KNOWLEDGE_BASE`)
  - `drakon-agent-flue.maxfraieho.workers.dev` (KV `KNOWLEDGE_BASE`)
  - Фронтенд (`PatternSuggestionPanel.tsx`, `mcp-client.ts`, `graph-pipeline-api.ts`) звертається
    до них НАПРЯМУ через `*.workers.dev` для чат-функцій агентів.
  - Документ-план міграції: `development/FLUE-MIGRATION-PLAN.md` (мапінг Python routes → Flue,
    LangGraph → native TS control flow в `workflows/*.ts`).

**Досі залежить від локального dev-сервера (192.168.3.184) — ПОТРЕБУЄ МІГРАЦІЇ:**
- `/v1/notes/build-semantic-graph` (і ймовірно інші `/notes/*` деталі) — Flue-версія
  `docs-agent-flue` ще НЕ має цього маршруту (підтверджено: 404 при прямому тесті,
  і в `FLUE-MIGRATION-PLAN.md` мапінг-таблиці цього маршруту просто немає — фіча
  з'явилась пізніше плану міграції). Реальний бекенд зараз — Python/FastAPI
  `services/docs-agent/main.py` (OpenRC-сервіс `ai-docs-agent`, порт 8767) на
  dev-сервері, з власним `semantic_graph.py` (LLM-екстракція зв'язків через
  `services/shared/llm_client.py`).
- `services/drakon-agent` (Python/FastAPI, OpenRC `ai-drakon-agent`, порт 8765,
  LangGraph-based) — частково дублює функціонал `drakon-agent-flue`, але є окремим
  кодом, що сьогодні я реанімував (його робоча директорія була видалена після
  перейменування репо `ai-drakon-setup`→`ai-drakon-scaffolder`, ніхто не оновив
  `/etc/init.d/`; також виявлено несумісність `numpy>=2` з древнім CPU сервера —
  довелось пінити `numpy==1.26.4`).
- `services/architect-agent` (Python, OpenRC `ai-architect-agent`) — аналогічна Python
  версія поряд із `architect-agent-flue`. Невідомо, наскільки активно ще використовується
  vs Flue-версія — потребує перевірки в межах стратегії.
- **GitNexus** (індексація кодової бази, граф символів/зв'язків) — Docker-контейнери
  `gitnexus-server` (порт 4747, Node.js) + `gitnexus-web` (порт 4173) на dev-сервері,
  публікуються через `gitnexus.exodus.pp.ua`. Сьогодні падав через нестачу RAM під час
  повного реіндексу (1.5 ГБ хост, лише 76 МБ вільно в момент краху). Це episodically
  крихкий, ресурсоємний, stateful Node.js-процес — найскладніший кандидат для переносу
  (Cloudflare Workers не підтримують довготривалі stateful контейнери).
- **ai-memory** (cross-session knowledge/handoffs для агентів) — сервер на dev-сервері
  (`192.168.3.184:49374`), MCP `sse`-транспорт.
- **OpenDesign** (генерація UI) — `192.168.3.184:7460`, nginx + Docker.

### Компонент 2: Garden Bloom (knowledge zones, MCP-доступ до баз знань)

- NotebookLM MCP — `notebooklm.exodus.pp.ua:8002`, працює на Raspberry Pi 3B
  (FastMCP streamable-http), 104 ноутбуки. Залежить від **особистого Google-акаунту**
  (compliance-ризик уже відомий — публічний UI має називати це "Archivist AI", не
  "NotebookLM").
- MemPalace (знаннєвий граф документації, "wings"/"drawers") — окремий сервіс,
  розташування потребує уточнення в межах стратегії (вже не використовується на
  цьому OrangePi-хості за поточним CLAUDE.md, але використовується в інших проєктах).
- GitNexus — спільний з Компонентом 1 (та сама індексація обслуговує обидва).
- `garden-mcp.exodus.pp.ua` (Cloudflare Worker, вже в хмарі) — Zone access, KV
  `3fbc4a87aa36480cb661b2b93fe01aa5`, CF Zone `2b728671b7aebb5ad742bc4e5acd4a9b`.
- `/knowledge` і `/notebooks` сторінки фронтенду (`GardenPage.tsx` й суміжні) —
  фронтенд вже в хмарі (Cloudflare Pages), але дані тягнуться частково з локального
  docs-agent (див. вище), частково з хмарних MCP.

### LLM-проксі — найбільший хаос, кілька паралельних self-hosted рішень

Зараз існує МІНІМУМ 4 різні шляхи виклику LLM, усі або повністю, або частково
прив'язані до локальної мережі:

1. **AGY phone** (Android/Termux, 192.168.3.25) — тунель `agy.exodus.pp.ua`/
   `agy.aidrakon.tech`. Найкрихкіший: фізичний телефон, гасне екран → SSH/тунель мертвий
   (сьогодні саме це зламало TASK-238 GitHub OAuth флоу через 401 від Appwrite —
   опосередковано, бо `account.createJWT()` падав через інший канал, але показово).
2. **AGY3 tablet** (192.168.3.204) — тунель `agy3.exodus.pp.ua`. Той самий клас ризику
   (Android-пристрій, що має бути завжди увімкнений і розблокований).
3. **Aegis Relay / `free-claude-code`** (`/opt/free-claude-code` на dev-сервері) —
   найзріліший проксі (failover між NVIDIA NIM/OpenRouter/DeepSeek/LM Studio/
   llama.cpp/Ollama, Telegram-керування, web UI), але запущений **на тому самому
   слабкому dev-сервері** (`free-claude-code` сервіс, порт 8082 Anthropic-формат;
   `free-claude-code-proxy`, порт 18880 OpenAI-формат). Тунелі `claude-proxy.exodus.pp.ua`
   і `openai-proxy.exodus.pp.ua` ведуть саме сюди.
4. Окремий локальний OpenAI-сумісний проксі на порту 19195 (127.0.0.1-only,
   `PROXY_TOKEN=agy3`, `PROXY_MODEL=gemini-2.5-flash`) — використовується `ai-docs-agent`
   через власний `.env`; походження/призначення цього окремого проксі (хто його
   підтримує, чи це ще один шар над Aegis Relay) — **невідомо, потребує з'ясування
   в межах стратегії**.

Сьогодні виявлено системний баг: OpenRC-директива `environment="..."` у
`/etc/init.d/` НЕ передає змінні в процес (перевірено на 4 сервісах) — більшість
сервісів насправді конфігуруються через власні `.env`-файли (`python-dotenv`), а
не через OpenRC. Це ознака general operational fragility self-hosted шару, а не
єдиний інцидент.

---

## Інструмент: GitNexus (ОБОВ'ЯЗКОВО використати перед висновками)

Репозиторій `ai-drakon-scaffolder` вже проіндексований у GitNexus і **актуальний**
(реіндексовано сьогодні, 2026-06-16, на commit `b4bc5c2`): 8,484 nodes | 15,308 edges |
209 clusters | 300 flows. MCP-сервер: `mcp__gitnexus__*` (query/context/impact/
list_repos), або HTTP `https://gitnexus.exodus.pp.ua/api/mcp`.

**Перед тим, як писати стратегію** — використай `gitnexus_query`/`gitnexus_context`,
щоб самостійно перевірити деталі вище (напр. чи дійсно `docs-agent-flue` не має
`/notes/*` маршрутів, чи є інші виклики `services/shared/llm_client.py` крім
`notes_route.py`, яка реальна структура `architect-agent` vs `architect-agent-flue`)
замість сліпо довіряти опису в цьому промті — опис може мати неточності чи бути
застарілим відносно коду. Якщо GitNexus попереджає про staleness — це означає
проблему з MCP-з'єднанням, а не з самим індексом (індекс свіжий), повідом про це
окремо, не намагайся "обійти" мовчки.

## Що треба отримати від тебе (Opus 4.8)

1. **Повна інвентаризація й класифікація** кожного компонента вище:
   `cloud-ready` (вже в хмарі, нічого не робити) / `needs-migration` (є хмарний
   еквівалент, треба домалювати фічі — напр. `/notes/*` у `docs-agent-flue`) /
   `needs-redesign` (немає прямого хмарного еквівалента, треба вибрати нову
   архітектуру — напр. GitNexus).
2. **Стратегія заміни LLM-проксі шару**: чи можна повністю прибрати self-hosted
   relay і дозволити Cloudflare Workers напряму викликати провайдерів (NVIDIA NIM/
   OpenRouter/DeepSeek API через `fetch()` з Worker, без жодного локального
   посередника)? Чи потрібен централізований cloud-native gateway (напр. Cloudflare
   AI Gateway, або **Appwrite Function** з тим самим failover-функціоналом, що зараз
   має Aegis Relay)? Дай конкретну рекомендацію з тредофами — але див. ОБОВ'ЯЗКОВУ
   вимогу нижче щодо ролі Appwrite.
3. **GitNexus**: запропонуй або (а) спосіб зробити це stateless/serverless-сумісним
   (якщо технічно можливо для графової індексації кодової бази), або (б) конкретного
   керованого хмарного хостера для stateful Node.js-контейнера. **Appwrite Functions/
   Sites — кандидат №1, розглянь його першим і детально** (персистентний сторедж,
   ліміти виконання, чи підходить для довготривалої індексації); інші варіанти
   (Railway, Fly.io) — лише як fallback, якщо Appwrite технічно не підходить, з
   явним поясненням чому.
4. **Garden Bloom MCP-сервіси** (NotebookLM-проксі, MemPalace) — стратегія для
   кожного, **з пріоритетом на перенесення логіки в Appwrite Functions** там, де
   це технічно можливо; provider-bound частини (напр. Google-акаунт для NotebookLM),
   які неможливо перенести, лишити як є, але прибрати залежність від конкретного
   фізичного Raspberry Pi (запускати виклик до Google API з Appwrite Function, а не
   з RPi).
5. **Фазований план міграції** з порядком (що першим, що залежить від чого),
   кожна фаза з критерієм верифікації ("як перевірити, що ця фаза дійшла до прод
   без регресій").
6. **Фінальний критерій "готово"**: явний список того, що має лишитись ПОВНІСТЮ
   вимкненим/непотрібним на dev-сервері (192.168.3.184) і обох Android-пристроях
   (AGY phone, AGY3 tablet) після завершення міграції.
7. Врахуй вже існуючі інвестиції (не пропонуй їх відкидати без причини): Appwrite
   (auth вже працює), Cloudflare Workers/Pages (фронтенд + 3 Flue-агенти вже живі),
   Flue framework (частково прийнятий), GitHub як джерело істини для документів/коду.

## ОБОВ'ЯЗКОВА вимога: Appwrite — основна хмарна платформа для backend-логіки

Власник проєкту явно вимагає: **Appwrite має бути використаний** як основний
кандидат для розміщення backend-логіки, що зараз живе на Python-сервісах
dev-сервера (docs-agent semantic-graph, drakon-agent, architect-agent — там, де
вони ще потрібні поза Flue-воркерами) і для LLM-проксі шару, а НЕ просто
залишений як auth-провайдер. Appwrite Education plan вже активний
(`fra.cloud.appwrite.io`, project `6a23420a003a04b4997b`) — використовуй це як
дану, не як гіпотезу.

Для кожного компонента, що потребує міграції, явно оціни: "чи можна розмістити
це в Appwrite Functions/Sites/Databases?" ПЕРШИМ, перш ніж пропонувати Cloudflare
Workers чи сторонній хостинг як альтернативу. Якщо Appwrite технічно не підходить
для конкретного випадку (напр. через ліміти виконання функції, відсутність
підтримки потрібної мови/runtime, або справжню архітектурну невідповідність) —
це треба чітко аргументувати, а не просто обрати Cloudflare за замовчуванням.

## Формат відповіді

Структурований план (розділи відповідно до пунктів 1–7 вище). Там, де є кілька
валідних варіантів з реальними тредофами — назви їх явно і дай рекомендацію з
обґрунтуванням, не мовчазно вибирай один варіант.
