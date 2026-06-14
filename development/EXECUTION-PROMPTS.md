---
tags:
  - domain:product
  - status:active
  - format:execution-plan
created: 2026-06-13
updated: 2026-06-13
tier: 2
title: "DRAKON Suite — Послідовні промпти виконання"
lang: uk
---

# DRAKON Suite — Послідовні промпти виконання

> Деталізовані, готові до делегування промпти за [[PRODUCT-STRATEGY]].
> Звірено з кодом через GitNexus 2026-06-13 (ai-drakon @ab51f2c, garden @5526639).
> Кожен промпт — самодостатній: файли, кроки, верифікація, коміт.

## Як виконувати

**Виконавці:** AGY3 (складні TS-задачі, локально на Termux) або Lovable (UI).
**Порядок:** строго за блоками A → B → C → D; усередині блоку — за номерами.
**Обов'язкові правила (для кожного промпта):**
1. Робота локально: `/data/data/com.termux/files/home/workspace/ai-drakon-scaffolder`
   (AGY3) або відповідне репо garden.
2. Після зміни `src/X` → `cp src/X .lovable/src/X` (CF Pages будує з `.lovable/`).
   Файли поза `src/` (services/, development/) — БЕЗ sync.
3. `npx tsc --noEmit` чистий перед комітом.
4. `git add` тільки конкретні файли (не `git add .`).
5. Після push: `~/bin/ai-memory-commit.sh ai-drakon "" 2>/dev/null &`.

**Делегування з OrangePi:**
`ssh -p 8022 u0_a410@192.168.3.204 'bash ~/bin/agy-task.sh "TASK-NNN"'`
+ `run_in_channel:true`, timeout 600000. Спершу додати TASK у `development/TASKS.md` і `git push`.

---

# БЛОК A — ai-drakon P0 (компілятор тримає обіцянку)

> Без цього блоку компілятор генерує код, але без реального палива (KB) і без
> onboarding. Це найвищий пріоритет.

## TASK-224 — Рибосома: згенерований код бере модель з env.PROXY_MODEL

**Контекст (звірено):** `services/architect-agent-flue/tools/ribosome.ts`.
Резолв моделі для САМОГО виклику рибосоми вже коректний (рядки 113-116:
`env.PROXY_MODEL` fallback). Проблема в `RIBOSOME_SYSTEM` (рядки 28-53): промпт
не вказує, що у **згенерованому** коді виклики `llmComplete(...)` мусять брати
модель з `env.PROXY_MODEL`, а не з хардкоду. Через це агент вставляє 'gpt-4o'.

**Файл:** `services/architect-agent-flue/tools/ribosome.ts` (поза src/ — без .lovable sync).

**Зробити:** у константі `RIBOSOME_SYSTEM` додати до блоку "Правила трансляції"
явну вимогу:
```
- вузол :: llm :: → await llmComplete([...messages], env.PROXY_MODEL || 'gemini-2.5-flash', 0.2, undefined, undefined, env)
  МОДЕЛЬ ЗАВЖДИ env.PROXY_MODEL — НІКОЛИ не хардкодь назву моделі (gpt-4o, claude-* тощо).
```
І в розділі "Правила:" додати рядок:
```
- Згенерований код НЕ містить хардкод-назв моделей. Тільки env.PROXY_MODEL.
```

**Верифікація:**
```bash
grep -n "env.PROXY_MODEL" services/architect-agent-flue/tools/ribosome.ts  # ≥2 згадки
# Скомпілювати тестову схему через POST /compile, перевірити що у виводі немає 'gpt-4o'
```
**Коміт:** `fix(ribosome): forbid hardcoded model in generated code — use env.PROXY_MODEL`

---

## TASK-225 — Зони Знань як реальне паливо рибосоми

**Контекст:** `compilePseudocode` (ribosome.ts) зараз не приймає KB-контекст —
рибосома компілює "наосліп". Стратегія: рибосома має читати знання цільового
фреймворку з Зони Знань користувача через MCP-proxy (НЕ connectMcpServer —
stateless Worker; прямий HTTP POST до MCP-сервера зони, див. ARCHITECTURE-CORE §2).

**Файли:**
- `services/architect-agent-flue/tools/ribosome.ts` — додати `kbContext?: string` у `RibosomeInput`, вставляти його в `userPrompt` перед псевдокодом.
- `services/architect-agent-flue/src/index.ts` (або де `POST /compile`) — перед викликом `compilePseudocode` дістати KB: якщо в запиті є `zoneId`, зробити HTTP POST до MCP-сервера зони (запит контексту фреймворку), результат → `kbContext`.
- Новий хелпер `services/architect-agent-flue/tools/mcp-proxy.ts` — функція `fetchZoneContext(env, zoneId, query): Promise<string>` (прямий fetch до endpoint зони з токеном із Appwrite encrypted; токен НЕ в D1/коді).

**Кроки:**
1. Спершу `grep -rn "compilePseudocode\|/compile" services/architect-agent-flue/src/` — знайти точку виклику.
2. Розширити `RibosomeInput` полем `kbContext`.
3. У `compilePseudocode`: якщо `kbContext` є — додати в `userPrompt`:
   `\n\nЗнання цільового фреймворку (використовуй для точності):\n${kbContext}`.
4. Створити `mcp-proxy.ts` з `fetchZoneContext` (прямий POST, Authorization Bearer токен зони).
5. У маршруті `/compile`: прийняти `zoneId`, викликати `fetchZoneContext`, передати в `compilePseudocode`.

**Верифікація:**
```bash
npx tsc --noEmit   # у services/architect-agent-flue
# POST /compile з zoneId → у логах видно, що kbContext непорожній
```
**Коміт:** `feat(ribosome): wire knowledge zone as compilation fuel via MCP-proxy`
**Залежить від:** TASK-224.

---

## TASK-226 — Onboarding 3 кроки + пісочниця з платформною квотою

**Контекст:** новий юзер після реєстрації потрапляє в порожнечу. Потрібна
пісочниця (демо-проект, компіляція на платформній квоті) + 3-кроковий майстер.
Дослідження: майстри >7 кроків втрачають до 50%.

**Файли (frontend, src/ → .lovable sync ОБОВ'ЯЗКОВО):**
- Новий `src/components/onboarding/OnboardingWizard.tsx` — модал 3 кроки:
  Крок1 назва простору + шаблон; Крок2 "Підключити GitHub" (поки PAT-поле з
  поміткою, OAuth у TASK-227); Крок3 LLM-провайдер + ключ + кнопка "Пропустити".
- Новий `src/lib/onboarding.ts` — стан `ai_drakon_onboarded_{userId}` у localStorage; хелпери `isOnboarded(userId)`, `markOnboarded(userId)`.
- `src/context/ProjectContext.tsx` — якщо `projects.length === 0 && !isOnboarded` → показати пісочницю (демо-проект із готовою схемою ThreatClassifier) + тригернути майстер.
- Демо-схема: `src/lib/onboarding-demo.ts` — об'єкт Project із прикладом DRAKON IR (ThreatClassifier з ARCHITECTURE-CORE §1.1).

**Копірайт онбордингу — показати ДОСЛІВНО (джерело: [[POSITIONING]]):**
Екран-привітання (перед Кроком 1), заголовок + підзаголовок:
> **DRAKON Suite — AI, за яку відповідає людина.**
> Ти малюєш логіку, яку розумієш. Система компілює її в робочого агента.
> Кожне рішення видиме й затверджуєш ти — нічого не ховається в чорний ящик.

Підписи кроків (короткі, під заголовком кожного кроку):
- Крок 1: «Твій простір. Тут житиме логіка, яку ти контролюєш.»
- Крок 2: «Підключи GitHub — твій код і схеми лишаються твоїми.»
- Крок 3: «Обери модель (або пропусти). Агент виконує — рішення за тобою.»

Кнопка пісочниці + підпис:
> [Спробувати на демо-схемі] — «Подивись, як схема стає кодом — за секунди, без налаштувань.»

Правило: жодного «зробить усе за тебе / автопілот». Меседж — контроль і
підзвітність (див. меседж-тести в POSITIONING.md §7).

**Кроки:**
1. `grep -n "projects.length\|loadProjects" src/context/ProjectContext.tsx` — знайти точку порожнього стану.
2. Створити демо-схему + onboarding helpers.
3. Створити `OnboardingWizard`, підключити в `WorkspaceShell` або layout.
4. Пісочниця: демо-проект доступний readonly, кнопка Compile працює на платформній квоті (без власного ключа — рибосома вже має `env.PROXY_MODEL` fallback).
5. `cp` усіх змінених `src/` у `.lovable/src/`.

**Верифікація:**
```bash
npx tsc --noEmit
grep -rn "OnboardingWizard\|isOnboarded" src/ .lovable/src/   # синхронізовано
# Ручна: новий юзер бачить майстер + демо-схему, може Compile без ключа
```
**Коміт:** `feat(onboarding): 3-step wizard + sandbox demo project with platform quota`
**Залежить від:** TASK-224 (квота/модель), бажано TASK-225.

---

# БЛОК B — Білінг groundwork (Appwrite, без Stripe)

> Готує ґрунт, щоб увімкнути платежі було справою одного TASK пізніше.
> Stripe НЕ вмикаємо зараз (передчасно без користувачів).

## TASK-234a — Мапа лімітів планів + поле періоду

**Контекст (звірено):** `services/architect-agent-flue/src/middleware/quota.ts` —
ліміт хардкод (free=100). Колекція `billing_profiles` має `planType`,
`llmQuotaMonthly`, `llmConsumed`, `updatedAt`. Немає мапи планів і поля для reset.

**Файли:**
- Новий `services/architect-agent-flue/src/lib/plans.ts`:
  ```typescript
  export type PlanType = "free" | "pro" | "enterprise";
  export const PLAN_LIMITS: Record<PlanType, number> = {
    free: 100, pro: 5000, enterprise: 100000,
  };
  ```
- `quota.ts` — при auto-provision і перевірці брати ліміт із `PLAN_LIMITS[profile.planType]` (fallback free), а не з поля документа (поле лишається для override).
- `infrastructure/appwrite/setup.mjs` + `schema.ts` — додати у `billing_profiles` поле `periodStart` (datetime, для місячного reset).

**Кроки:**
1. Створити `plans.ts`.
2. У `quota.ts`: `const limit = PLAN_LIMITS[profile.planType as PlanType] ?? PLAN_LIMITS.free;` — використати `limit` у перевірці `llmConsumed >= limit`.
3. Auto-provision: додати `periodStart: new Date().toISOString()`.
4. Оновити `setup.mjs` (dt("periodStart", false)) + `schema.ts` (BillingProfile interface).

**Верифікація:**
```bash
npx tsc --noEmit
grep -n "PLAN_LIMITS" services/architect-agent-flue/src/middleware/quota.ts
node infrastructure/appwrite/setup.mjs   # ідемпотентно, додає поле
```
**Коміт:** `feat(billing): plan limits map + periodStart field (Stripe-ready groundwork)`

---

## TASK-234b — Cron місячного скидання квоти

**Контекст:** `llmConsumed` ніколи не обнуляється. Потрібен Cron Trigger
Worker-а, що 1-го числа місяця скидає `llmConsumed=0`, `periodStart=now`.

**Файли:**
- `services/architect-agent-flue/wrangler.toml` — додати `[triggers] crons = ["0 0 1 * *"]`.
- `services/architect-agent-flue/src/index.ts` — додати `scheduled(event, env, ctx)` handler: ітерувати `billing_profiles` (Appwrite Databases listDocuments з пагінацією), для кожного `updateDocument({ llmConsumed: 0, periodStart: now })`.

**Верифікація:**
```bash
npx tsc --noEmit
grep -n "scheduled\|crons" services/architect-agent-flue/src/index.ts services/architect-agent-flue/wrangler.toml
# wrangler dev --test-scheduled (локально), або dry-run
```
**Коміт:** `feat(billing): monthly quota reset via Cron trigger`
**Залежить від:** TASK-234a.

> **Stripe (НЕ зараз, окремий майбутній TASK-234c):** webhook `/billing/stripe-webhook`
> з перевіркою підпису → оновлення `planType` через Appwrite Admin client.
> Вмикати, коли з'являться платні користувачі.

---

# БЛОК C — garden-bloom (ролі агентів у UI)

> Garden стабільний і самодостатній. Єдине вартісне зараз — вивести наявні
> ролі Garden-агентів у UI як дії над знаннями.

## TASK-230 — Ролі Garden-агентів (Archivist/TechWriter/Architect) у UI

**Контекст (звірено):** заготовка `Garden-Agent-Service` (FastAPI) з ролями
Archivist (summarize/digest/essay), Tech Writer (docs/API/README),
Architect (taxonomy/review) через `POST /tasks/`. У UI цих дій немає.
Репо: `garden-seedling-stage` (на dev-сервері /home/vokov/projects/garden-seedling-stage).

**Файли (garden репо, src/ → перевірити чи garden має .lovable sync — grep правил у його CLAUDE.md):**
- Новий `src/components/agents/AgentActionsMenu.tsx` — кнопки дій над нотаткою/зоною:
  "Зробити дайджест", "Згенерувати README", "Перевірити таксономію".
- `src/lib/api/` — клієнт до Garden-Agent-Service `POST /tasks/` з полями
  `task_type`, `role`, `input_data` (article_slugs, instructions, output_format),
  `context` (access_zone_id, target_folder).
- Підключити меню у `GardenHeader.tsx` / `EditorPage.tsx`.

**Кроки:**
1. Спершу прочитати `garden-seedling-stage/CLAUDE.md` + `.claude/GARDEN_AGENT_INTEGRATION.md` — точний контракт `POST /tasks/` і URL сервісу.
2. Перевірити чи Garden-Agent-Service піднятий (health). Якщо ні — промпт лише готує UI + клієнт, з фіче-флагом.
3. Створити клієнт + меню, статус задачі (polling `GET /tasks/{id}`).

**Верифікація:**
```bash
npx tsc --noEmit   # у garden репо
grep -rn "AgentActionsMenu\|/tasks/" src/
```
**Коміт:** `feat(agents): expose Archivist/TechWriter/Architect actions in UI`

> Виконувати ТІЛЬКИ після підтвердження Q, що Garden-Agent-Service потрібен у
> продукті зараз (інакше — відкласти, Garden і так дає цінність без цього).

---

# БЛОК D — Лендинг (наратив "два сервіси — один Suite")

> Найнижчий пріоритет: трафік на недоведений продукт марний. Робити, коли
> A+B готові АБО якщо лендинг потрібен для фіксації позиціонування.

## TASK-237 — Лендинг: дві цінності, один Suite

**Контекст (звірено):** `src/pages/LandingPage.tsx` існує в ai-drakon (~339 рядків).
Треба переструктурувати під наратив стратегії §1-2.

**Файл:** `src/pages/LandingPage.tsx` (+ .lovable sync).

**Зробити (спершу прочитати поточний файл!):**
1. Hero: "Намалюй логіку — отримай агента. Збери знання — поділись розумом."
   Дві CTA: "Будувати агентів" (DRAKON) / "Платформа знань" (Garden Bloom).
2. Секція "Два сервіси, одна екосистема" — таблиця з §0 стратегії.
3. Секція "Три сценарії" (тільки Garden / тільки DRAKON / Suite) — §2.
4. Секція "Як це працює" — аналогія ДНК→білок (DRAKON) + Зони+Archivist (Garden).
5. Тарифи — §7 стратегії (Free/Bloom/Builder/Suite).
6. i18n: мінімум UK + EN (garden має EN/UK/FR/DE/IT — звірити patterns).

**Верифікація:**
```bash
npx tsc --noEmit
grep -rn "Suite\|Garden Bloom\|AI-DRAKON" src/pages/LandingPage.tsx .lovable/src/pages/LandingPage.tsx
```
**Коміт:** `feat(landing): two-services-one-suite narrative + pricing`
**Залежить від:** бажано після БЛОКУ A (щоб обіцянки лендингу були правдою).

---

# ХВИЛЯ 2 — Suite-міст + гартування

> Виконувати ПІСЛЯ блоків A+B. Кожен промпт — самодостатній; виконавець
> спершу `grep`/`read` згаданих файлів (індекс GitNexus свіжий, можна
> `mcp__gitnexus__query`). Усі src/ → `.lovable/src/` sync; поза src/ — без.

## TASK-227 — GitHub App + OAuth (заміна PAT для користувачів)

**Контекст:** зараз юзер вставляє PAT (завеликі права, довгоживучий). Ціль:
GitHub App + user-to-server токен → Appwrite encrypted.

**Передумова:** ✅ ВИКОНАНО Q — GitHub App `aidrakon-oauth` зареєстровано (App ID: 4048947).
Secrets `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`
вже виставлені у CF Worker `drakon-antigravity-worker`.
Callback URL: `https://drakon-antigravity-worker.maxfraieho.workers.dev/auth/github/callback`

**!!ВАЖЛИВО!! Системний воркер — `cloudflare-worker/worker-mcp-drakon.js`**
(deployed as `drakon-antigravity-worker`, НЕ `architect-agent-flue`)

**!!IMPORTANT!! Run locally on AGY3 (Termux). Repo: `/data/data/com.termux/files/home/workspace/ai-drakon-scaffolder/`**

**Файли:**
- `cloudflare-worker/worker-mcp-drakon.js` (існуючий системний воркер):
  додати маршрути `GET /auth/github/start` та `GET /auth/github/callback`.
  `/auth/github/start` → redirect на `https://github.com/login/oauth/authorize?client_id=...`
  `/auth/github/callback` → обмін `code` → user token через GitHub API,
  зберегти в Appwrite user_profiles.githubToken (encrypted), redirect назад на `/settings`.
  Деплой: `npx wrangler deploy --config wrangler-antigravity.jsonc` (без tsc!).
- `src/routes/settings.tsx` (+.lovable): у вкладці "Профіль" → секція GitHub:
  замінити "незабаром" на кнопку "Підключити GitHub"
  (href=`https://drakon-antigravity-worker.maxfraieho.workers.dev/auth/github/start`),
  показувати статус ✅ Connected (булеве is_configured, НЕ plaintext токен).
- `infrastructure/appwrite/schema.ts` + `infrastructure/appwrite/setup.mjs`:
  додати поле `githubToken` (encrypted string, type: "string") у `user_profiles`.

**Кроки:**
1. Прочитай `cloudflare-worker/worker-mcp-drakon.js` рядки 1-100 і 2138-2200 — зрозумій routing pattern (fetch handler, маршрути).
2. Знайди `verifyOwnerAuth` (~рядок 188) — для розуміння auth flow.
3. Знайди `githubHeaders` (~рядок 66) — там `env.GITHUB_TOKEN`; залиш як fallback.
4. Додай в кінці fetch handler (перед default 404) маршрути `/auth/github/start` і `/auth/github/callback`.
5. В `user_profiles` (infrastructure/appwrite/schema.ts) додай поле `githubToken`.
6. UI: settings.tsx вкладка "Профіль" — кнопка + статус.
7. Деплой воркера: `cd /data/data/com.termux/files/home/workspace/ai-drakon-scaffolder && npx wrangler deploy --config wrangler-antigravity.jsonc`
8. Sync: `cp src/routes/settings.tsx .lovable/src/routes/settings.tsx`

**Верифікація:**
```bash
curl -s https://drakon-antigravity-worker.maxfraieho.workers.dev/auth/github/start
# має бути redirect 302 → github.com
```

**Коміт:**
```
feat(github): GitHub App OAuth flow + encrypted token storage (TASK-227)
```

**Diary:**
```
SESSION:$(date +%Y-%m-%d)|TASK-227:github-oauth|worker-mcp-drakon+appwrite-schema+settings-ui|commit:<hash>|★★★
```

## TASK-228 — DRAKON→Bloom deep-link з передачею zone-токена

**Контекст:** з `/knowledge` (ai-drakon) має бути кнопка "Відкрити в Bloom",
що веде у bloom.aidrakon.tech з токеном доступу до зони.

**Файли:**
- `src/components/knowledge/KnowledgeZonesList.tsx` (+.lovable): кнопка "Відкрити в Bloom" на картці зони → `https://bloom.aidrakon.tech/zone/{accessCode}` (або з токеном у hash).
- `src/lib/api.ts` (+.lovable): хелпер `buildBloomZoneUrl(zone)`.
- (garden, окремо) перевірити що `bloom.aidrakon.tech/zone/{code}` приймає вхід — `grep -rn "zone/" src/` у garden.

**Кроки:** 1) `grep -n "accessCode\|KnowledgeZone" src/lib/api.ts` — структура зони. 2) Додати кнопку + хелпер. 3) Перевірити garden-приймач.
**Верифікація:** `npx tsc --noEmit`; клік → відкривається зона в Bloom.
**Коміт:** `feat(suite): DRAKON→Bloom deep-link with zone access`

## TASK-229 — Індикатор здоров'я Зони (Archivist ready/failed/none)

**Файли:**
- `src/lib/api.ts` (+.lovable): `checkZoneHealth(zoneId): Promise<"ready"|"pending"|"failed">` — HTTP до garden-mcp endpoint зони (health/ping Archivist).
- `src/components/knowledge/KnowledgeZonesList.tsx` (+.lovable): бейдж стану на картці (зелений ready / жовтий pending / червоний failed), полінг кожні 30с через TanStack Query.

**Верифікація:** `npx tsc --noEmit`; картки зон показують бейдж.
**Коміт:** `feat(suite): zone health indicator (Archivist status) in /knowledge`

## TASK-232 — Multi-target компіляція (Flue + LangGraph.js)

**Контекст:** `ribosome.ts` має `target` (зараз тільки 'flue'). Додати другий
target з власним системним промптом.

**Файли:**
- `services/architect-agent-flue/tools/ribosome.ts`: винести `RIBOSOME_SYSTEM` у мапу `SYSTEM_BY_TARGET: Record<string,string>` (flue + langgraph-js); у `compilePseudocode` обирати промпт за `target`.
- `src/components/.../CompilerToolbar` (+.lovable, grep знайти): дропдаун вибору target перед Compile.
- маршрут `/compile`: приймати `target`, передавати в рибосому.

**Верифікація:** `npx tsc --noEmit`; компіляція однієї схеми у 2 таргети дає різний коректний код.
**Коміт:** `feat(ribosome): multi-target compilation (flue + langgraph-js)`
**Залежить від:** TASK-225.

## TASK-233 — Цикл авто-перекомпіляції + довгі job через DO

**Контекст:** довгі компіляції впираються в CPU-ліміт Worker (30с). Є
`ArchitectJobStore` DO. Винести компіляцію в job-чергу з полінгом статусу.

**Файли:**
- `services/architect-agent-flue/src/index.ts`: `POST /compile/async` → створює job у `ArchitectJobStore` DO, повертає jobId; `GET /compile/status/:jobId` → статус+результат.
- `src/lib/graph-pipeline-api.ts` (+.lovable): `compileAsync` + полінг статусу.
- (опц.) авто-цикл: зміна схеми → debounce → re-export → /compile/async → preview.

**Верифікація:** `npx tsc --noEmit`; довга компіляція не падає по таймауту.
**Коміт:** `feat(compiler): async compile via ArchitectJobStore DO + status polling`
**Залежить від:** TASK-225.

## TASK-230 — (Garden) ролі агентів у UI — див. БЛОК C вище

## TASK-235 — Bloom→DRAKON "Створити агента з Зони"

**Файли (garden репо):**
- кнопка у налаштуваннях зони "Створити агента" → `https://aidrakon.tech/pipelines/new?zoneId={id}&zoneToken={…}`.
- (ai-drakon) `src/routes/pipelines.tsx` (+.lovable): приймати `zoneId` з query, передвибрати зону як джерело знань рибосоми.

**Верифікація:** `npx tsc --noEmit` обидва репо; флоу зона→агент працює.
**Коміт:** `feat(suite): Bloom→DRAKON create-agent-from-zone`
**Залежить від:** TASK-225, TASK-228.

## TASK-236 — Єдиний обмін токенами (SSO Suite)

**Контекст:** owner-token Bloom ↔ zone-secret DRAKON. Єдина точка обміну,
щоб не передавати токени в URL.

**Файли:**
- `services/architect-agent-flue/src/routes/token-exchange.ts` (новий): `POST /suite/token-exchange` — приймає сесію Appwrite, повертає короткоживучий zone-токен (HMAC-JWT, як `generateJWT` у worker-mcp-drakon.js).
- garden Worker: приймати цей токен для доступу до зони.

**Верифікація:** `npx tsc --noEmit`; токен не світиться в URL/UI.
**Коміт:** `feat(suite): unified token exchange (SSO between Bloom and DRAKON)`
**Залежить від:** TASK-227, TASK-228.

## TASK-234c — Stripe webhook (вмикати КОЛИ є платні користувачі)

**Файли:**
- `services/architect-agent-flue/src/routes/stripe-webhook.ts` (новий): `POST /billing/stripe-webhook` — перевірка підпису Stripe → оновлення `planType` у `billing_profiles` через Appwrite Admin client.
- `src/routes/settings.tsx` (+.lovable): сторінка `/settings/billing` з вибором плану + Stripe Checkout.

**Передумова Q:** Stripe акаунт, ключі → CF secrets.
**Верифікація:** `npx tsc --noEmit`; test webhook → planType оновлюється.
**Коміт:** `feat(billing): Stripe webhook → plan upgrade`
**Залежить від:** TASK-234a/b. **НЕ робити, доки немає попиту.**

---

## Зведена черговість

```
A (P0): TASK-224 ✅ → TASK-225 → TASK-226        ← компілятор тримає обіцянку
B (P0-гігієна): TASK-234a → TASK-234b            ← білінг-ґрунт (без Stripe)
C (P1, за згодою Q): TASK-230                     ← ролі Garden-агентів
D (P1-P3): TASK-237                               ← лендинг (після A)
Хвиля 2 (Suite+гартування): TASK-227 → 228 → 229 → 232 → 233 → 235 → 236
Останнє (за попитом): TASK-234c (Stripe)
```

Принцип: спершу A+B (цінність окремих сервісів), потім Хвиля 2 (міст Suite),
Stripe — лише коли з'являться платні користувачі.

## Семантичні зв'язки

- [[PRODUCT-STRATEGY]] — джерело пріоритетів і TASK-номерів
- [[ARCHITECTURE-CORE]] — контракт компілятора (рибосома, псевдокод)
- `AI Platform Settings Architecture Research.md` — n8n/GitHub/безпека
