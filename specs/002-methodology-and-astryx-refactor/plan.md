# План 002 — Рефакторинг методологічної бази, поглиблений пошук помилок і повний перехід на Astryx

> **Тип документа:** операційний план (Шаблон 6/1 методики), НЕ Given-When-Then spec.
> **Архітектор:** Claude (Opus 4.8), сесія 2026-08-18.
> **Виконавець:** Codex (агент на `.30`, інструменти GitNexus / NotebookLM / Comet MCP).
> **Базовий commit:** `9c7e01bf` (main).
> **Деплой-контекст (незмінний інваріант для всіх задач нижче):**
> - Backend: **Appwrite Cloud** (Auth, DB, Functions: `docs-agent`, `architect-agent`, `drakon-codegen`, `semantic-graph`) + 3 FastAPI-сервіси на dev-сервері `192.168.3.184`, порти `8765`–`8767` (ADR-0001, ADR-0005).
> - Frontend: **Cloudflare Pages**, build з `.lovable/`, домен `aidrakon.tech`; Cloudflare Worker `drakon-antigravity-worker` — auth+proxy (ADR-0002).
> - Жодна задача не пропонує зміну хостингу/стеку без явного обґрунтування, чому поточний недостатній.

---

## 0. БЛОКЕРИ — рішення оператора ПЕРЕД стартом Codex

Ці пункти треба закрити рішенням оператора, інакше частина задач не виконувана або виконується наосліп.

### D-1 — GitNexus НЕ індексує `ai-drakon-scaffolder` (критично)

**Факт (перевірено `mcp__gitnexus__list_repos` + `query` цієї сесії):** живий GitNexus-сервер (`192.168.3.184:4747`) НЕ містить репозиторію `ai-drakon-scaffolder`. `query({repo:"ai-drakon-scaffolder"})` повертає:
`Error: Repository "ai-drakon-scaffolder" not found. Available: Understand-Anything, agent-harness-generator, agent-onboarding-kit, drakon-tech, exodus-infra, kindle-butch-gen, sonate-solidsite, uav-watcher, vydra-swiss-survey, vydra-termux-lab, free-claude-code`.
Локального індексу теж немає: каталог `.gitnexus/` у чекауті відсутній.

**Наслідок:** інструкція CLAUDE.md «MUST run `impact()` before editing any symbol» і конституція §1 (`gitnexus http://192.168.3.184:4747`) — **не виконувані** для цього репо. Будь-який агент, що слідує CLAUDE.md буквально, або впаде, або мовчки пропустить gate.

**Рішення оператора (обрати одне):**
- (a) Переіндексувати: запустити `npx gitnexus analyze` (або `node .gitnexus/run.cjs analyze` після bootstrap) у `~/projects/ai-drakon-scaffolder`, підтвердити, що `list_repos` показує репо, і лише тоді Codex застосовує gitnexus-gates у Task 2/Task 3.
- (b) Формально послабити CLAUDE.md/конституцію: позначити gitnexus-gate як «best-effort, коли індекс присутній», без блокування. Тоді Task 2/Task 3 спираються на пряме читання коду (як цей план).

> Весь Task 2 і Task 3 нижче складено через **пряме читання коду**, бо GitNexus недоступний. Кожне твердження має `файл:рядок`.

### D-2 — Роль Astryx у Task 3: UI-фреймворк поверх бренду

NotebookLM підтвердив, що Astryx — не бренд-рішення і не вибір між палітрами, а дизайн-система/UI-фреймворк/design language: компоненти, токени, теми, патерни та конвенції для узгодженої роботи людей і AI. У джерелі Astryx це сформульовано як **"One system for humans and AI"**; воно також описує **"150+ React components"**, токени кольору/відступів/типографіки/радіусів/тіней і battle-tested патерни навігації, таблиць, detail pages, форм та data-entry flows. Для AI-DRAKON Astryx застосовується **поверх наявної бурштинової ідентичності**: брендове amber треба оформити через тему та похідні токени (зокрема контрастний `--color-on-accent`), а не замінювати випадковим синім.

NotebookLM також підтвердив роль Impeccable як процесного шару для AI coding agents: `/impeccable clarify` покращує UX-копі, `harden` перевіряє помилки/i18n/переповнення/edge cases, `adapt` — адаптивність, `typeset` — шрифти/ієрархію/розміри, а `polish` — фінальне вирівнювання з дизайн-системою та readiness до релізу. Його правила вимагають фіксувати продуктову палітру й компоненти в design context, використовувати токени замість сирих HEX і не вигадувати сторонній стиль. Тому Task 3 — структурне впровадження Astryx-компонентів, токенів, патернів і Impeccable-команд у реальний код; він **не** передбачає A/B-рішення «amber проти Facebook-blue».

**Рішення для плану:** зберегти amber AI-DRAKON як брендове джерело кольору та типографічний контекст, а Astryx зробити канонічним UI-шаром. Значення в `src/styles/astryx.css` — поточний кодовий стан, який треба узгодити з брендом у T-231, а не наперед прийнята нова ідентичність. IBM Plex Sans / JetBrains Mono з `src/routes/__root.tsx:125` і legacy-токени `--accent-amber`/`--bg-base` не видаляються до завершення міграції та перевірки контрасту.

### D-3 — Доля orphan-поверхонь `/sync` і паралельних `-flue` сервісів

`/sync` (`src/routes/sync.tsx`) рекламує недоступну функцію і зареєстрований у `routeTree.gen.ts`, але відсутній у навігації. `services/*-flue` — паралельні WIP-копії бекенду (політика техборгу §2 вимагає рішення). Оператор має вирішити: прибрати, позначити `planned`, чи довести до робочого стану (впливає на T-222 і T-207).

---

## Завдання 1 — Рефакторинг методологічної бази

**Стан на зараз (перевірено):** 5 ADR (`docs/adr/0001`–`0005`), 2 baseline specs (`000-baseline` frontend, `001-backend-agents-baseline`), Phase 1–4 done, `debt-and-promotion-policy.md`. Знайдені прогалини: значущі архітектурні рішення без ADR; неузгодженість документації з реальністю індексу; борг порожніх файлів.

### Прогалини ADR (рішення в коді, що відповідають критеріям §2 конституції, але не мають ADR)

| Рішення | Критерій §2 | Де живе зараз | Задача |
|---|---|---|---|
| Дзеркальна синхронізація `src/` ↔ `.lovable/` як build-контракт CF Pages | 4 (межа підсистем) | лише інваріант 2 у `specs/000-baseline/spec.md:104` | T-201 |
| TanStack Start SSR + генерований `routeTree.gen.ts` (корінь F2) | 2, 4 | ніде | T-202 |
| 4-Gate Control Plane / промоція арбітра shadow→blocking | 5 (системний інваріант) | `docs/for-agents/debt-and-promotion-policy.md` (policy, не ADR) | T-203 |
| Astryx як канонічна дизайн-система | 4, 5 | лише CLAUDE.md-нотатка | T-204 (feeds Task 3) |

#### T-201: ADR-0006 «Lovable mirror-sync as CF Pages build contract»
- **Файли:** створити `docs/adr/0006-lovable-mirror-sync-build-contract.md` (шаблон `docs/adr/template.md`, MADR v3.x, наскрізна нумерація).
- **Зміст:** зафіксувати, що CF Pages будує з `.lovable/`, а `src/` — dev source; правило `rsync -av --delete src/ .lovable/src/` перед комітом; наслідок дрейфу (F2). Послатися на `specs/000-baseline/spec.md:104` (інваріант 2) як джерело, не дублювати.
- **AC:** файл існує; секції Context/Decision/Consequences заповнені; згадано commit `9c7e01bf` (F2 root cause: `src/routeTree.gen.ts` не регенерувався з `97990862`); `specs/000-baseline/spec.md` оновлено посиланням на ADR-0006 (див. T-205).

#### T-202: ADR-0007 «TanStack Start SSR + routeTree generation contract»
- **Файли:** `docs/adr/0007-tanstack-start-routetree-contract.md`.
- **Зміст:** вибір TanStack Start/Router як SSR-фреймворку; `routeTree.gen.ts` — генерований артефакт, який ОБИДВА чекаути (`src/` і `.lovable/src/`) мусять мати синхронним; процедура регенерації; чому drift ламає навігацію в одному середовищі (доказ: `src/routeTree.gen.ts` не містив `TraceRoute`/`TutorialRoute`, `.lovable` містив — handoff F2).
- **AC:** ADR фіксує команду регенерації та вимогу CI-перевірки парності (feeds T-206 gate); посилання з ADR-0006.

#### T-203: ADR-0008 «4-Gate Control Plane & arbiter shadow→blocking promotion»
- **Файли:** `docs/adr/0008-arbiter-promotion-policy.md`; оновити `docs/for-agents/debt-and-promotion-policy.md` (додати посилання «нормативне джерело — ADR-0008»).
- **Зміст:** підняти інваріант промоції (N≥20 вердиктів, false-positive <10%, ручний огляд, критичний FP → rollback) з advisory-policy у ADR-рівень (конституція критерій 5). Зафіксувати поточний baseline = 0 (`logs/sdd_judge/` відсутній).
- **AC:** ADR-0008 існує; policy-файл посилається на нього; конституція §2 отримує запис-кандидат-інваріант, якщо оператор підтверджує промоцію критеріїв до інваріанта.

#### T-204: ADR-0009 «Astryx as canonical design system» (входить у Task 3)
- **Файли:** `docs/adr/0009-astryx-canonical-design-system.md`.
- **Зміст:** рішення D-2; Astryx = система компонентів/токенів/патернів; співвідношення з legacy-словником `--accent-amber`/`--bg-base`; стратегія Two-Speed (brownfield). Це нормативна шапка для всіх T-23x.
- **AC:** ADR фіксує обране D-2 рішення (a/b); перелічує канонічні токени й класи (`astryx-button`, `astryx-badge`, `data-astryx-theme`); забороняє нові компоненти поза Astryx.

#### T-205: Актуалізація baseline specs після F2/F3/F5
- **Файли:** `specs/000-baseline/spec.md`.
- **Що робити:** (1) додати нотатку в §5 (Out of Scope), що F3 змінив UI-handoff у `src/pages/CodegenPage.tsx` (codegen→editor), але ядро спеки (`src/lib/codegen/codegenApi.ts:47-96`, `generateDrakonCode`) НЕ змінене й лишається чинним as-is; (2) до інваріанта 2 (рядок 104) додати посилання на ADR-0006/0007 і процедуру регенерації routeTree. `specs/001-backend-agents-baseline/spec.md` — UI-фікси його не торкаються, лишити, але перевірити інваріант 1.4 (див. T-226 spec-drift).
- **AC:** spec 000 не суперечить поточному коду; посилання на ADR-0006/0007 присутні; жодних Given-When-Then для codegenApi не переписано (він не змінювався).

#### T-206: Узгодити документацію з реальним станом GitNexus
- **Файли:** `CLAUDE.md`, `.specify/constitution.md` (§1), `docs/for-agents/agent-fleet.md`.
- **Що робити:** за рішенням D-1 — або задокументувати процедуру (пере)індексації як передумову gates, або переформулювати «MUST run impact()» на «коли індекс присутній». `agent-fleet.md:30` уже містить попередження, що GitNexus індексує застарілий `~/workspace`-чекаут — синхронізувати з фактом, що навіть той репо тепер відсутній у списку.
- **AC:** жоден документ не стверджує безумовну доступність gitnexus для цього репо; є явна процедура або явне послаблення.

#### T-207: Погашення боргу порожніх файлів (policy §2)
- **Файли:** `docs/INDEX.md`, `GEMINI.md`.
- **Що робити:** заповнити `docs/INDEX.md` навігатором по `docs/adr`, `docs/for-agents`, `docs/handoff`, `specs/`; для `GEMINI.md` — заповнити або видалити (перевірити `grep -rl GEMINI.md .` на споживачів перед видаленням). Обидва — з власником і датою рішення.
- **AC:** жоден із двох файлів не лишається порожнім без власника; рішення зафіксовано в handoff.

#### T-208: Bootstrap SDD для фічі 002
- **Файли:** `.specify/feature.json`, `specs/002-methodology-and-astryx-refactor/{spec.md,tasks.md}` (за потреби).
- **Що робити:** оновити `feature.json` (branch, spec_dir=002, phase). Якщо оператор веде 002 через повний SDD-цикл — згенерувати `tasks.md` з `- [ ]` пунктів цього плану (для `bin/sdd_verify.sh --gate`).
- **AC:** `bash bin/sdd_verify.sh --gate` бачить консистентний feature.json; незакриті задачі видимі як `- [ ]`.

---

## Завдання 2 — Поглиблений пошук помилок (глибше за F1–F6)

> Frontend перевірено прямим читанням (GitNexus недоступний, D-1). Backend `services/*` свідомо поза GitNexus (`.gitnexusignore` містить `/services/`) — читано напряму. F2/F3/F5 підтверджено як **виправлені** commit `9c7e01bf`; F1/F4/F6 — **не виправлені** (нижче). Далі — НОВІ знахідки.

### Не виправлені з попереднього раунду (підтверджено кодом)

#### T-220 (F1): production-метадані досі «Lovable App»
- **Файл:рядок:** `src/routes/__root.tsx:86-97` — `title/description/author/og:*/twitter:*` = `Lovable App` / `A minimalist web page...` / `@Lovable`; `og:image`/`twitter:image` вказують на `*.lovable.app` R2-asset. Дзеркало `.lovable/src/routes/__root.tsx` містить те саме (`grep` → 3 збіги «Lovable App»).
- **Дія:** замінити на AI-DRAKON бренд: title `AI-DRAKON Studio`, опис укр./англ., author, `og:title/description/type/image`, `twitter:*`; замінити або прибрати lovable.app зображення на власний OG-asset на `aidrakon.tech`.
- **AC:** `curl https://aidrakon.tech/` → `<title>` не містить «Lovable»; OG/Twitter метадані брендовані; `src` і `.lovable/src` синхронні (`rsync` після зміни).

#### T-221 (F4): `/trace` — чесний, але глухий empty state
- **Файл:рядок:** `src/routes/trace.tsx:24-33` — блок «Глобальний Trace недоступний» без CTA.
- **Дія:** додати inline primary CTA (Astryx `astryx-button primary`) → `/pipelines` («Перейти до Pipelines») і пояснення prerequisite (запустити схему у `PipelineDrakonView`). Astryx-патерн EmptyState (див. Impeccable `/impeccable harden`).
- **AC:** empty state містить робочу кнопку-посилання на `/pipelines`; синхронізовано в `.lovable`.

#### T-222 (F6): `/sync` рекламує недоступну функцію + orphan-route
- **Файл:рядок:** `src/routes/sync.tsx:9-11` — «Функція синхронізації... буде доступна в наступному оновленні». Дрейф: `/sync` присутній у `src/routeTree.gen.ts` (grep → є `SyncRoute`), але відсутній у `NAV_WORKSPACE`/`NAV_SYSTEM` (`WorkspaceShell.tsx:86-100`) і в `ASTRYX_NAV_ITEMS` (`astryx-nav-config.ts:23-96`) — досяжний лише прямим URL.
- **Дія:** за рішенням D-3 — або (a) прибрати route і посилання з breadcrumb (`WorkspaceShell.tsx:109`), або (b) позначити `planned` з чітким виходом до доступної альтернативи (`/pipelines`/`/diagrams`).
- **AC:** немає досяжної поверхні, що обіцяє неіснуючу функцію без виходу; breadcrumb для `/sync` узгоджено з рішенням.

### НОВІ знахідки (frontend)

#### T-223: orphan-код Astryx-shell — `AstryxHeader`/`AstryxSideNav` імпортовані, але не рендеряться
- **Файл:рядок:** `src/components/workspace/WorkspaceShell.tsx:77-78` імпортує `AstryxHeader` і `AstryxSideNav`, але в JSX (рядки 395–860) вони НЕ використовуються — shell рендерить власний bespoke header/nav на `--accent-amber`. Grep `<AstryxHeader|<AstryxSideNav` → лише саме визначення `AstryxHeader.tsx:13`. Тобто повноцінний Astryx-shell (`AstryxHeader.tsx` на `astryx-button`/`astryx-badge`/`--astryx-*`) існує, але **ніколи не монтується**.
- **Дія:** вирішується в Task 3 (T-231 змонтувати, або видалити мертві імпорти). Тут — зафіксувати як debt із власником.
- **AC:** мертві імпорти або задіяні (T-231), або видалені; білд без unused-import попереджень.

#### T-224: неактивний `data-astryx-theme` → Astryx-токени світлої теми недосяжні
- **Файл:рядок:** `src/routes/__root.tsx:118` — `<html lang="en" className="dark">`; `data-astryx-theme` не встановлюється ніде (`grep` → лише селектори в `astryx.css:7,36`). Astryx dark працює лише через alias `.dark` (`astryx.css:36`), але світла Astryx-тема (`[data-astryx-theme="astryx"|"light"]`, `astryx.css:7`) недосяжна.
- **Дія:** у Task 3 (T-230) встановити `data-astryx-theme` синхронно з ThemeProvider.
- **AC:** перемикач теми змінює `data-astryx-theme`; обидві Astryx-теми активуються.

### НОВІ знахідки (backend, `services/*` — пряме читання)

#### T-225: хардкоджений дефолтний секрет в auth аналітики (security)
- **Файл:рядок:** `services/architect-agent/main.py:233` і `:244` — `if auth != f"Bearer {os.getenv('MCP_API_KEY', 'drakon-mcp-2026')}"`. Проблеми: (1) дефолт `drakon-mcp-2026` захардкоджений у git → якщо env не заданий, працює публічно відомий токен (конституція §2 «жодних креденшлів у git»); (2) не constant-time порівняння (timing); (3) `raise HTTPException(status_code=401)` без `detail`.
- **Дія:** прибрати дефолт (вимагати env, інакше `500`/відмова старту); `hmac.compare_digest` для порівняння; додати `detail="unauthorized"`. Однакове виправлення для обох ендпоінтів (`/agents/ss/analytics/questions`, `/agents/ss/analytics/gaps`).
- **AC:** без `MCP_API_KEY` ендпоінти не приймають статичний токен; порівняння constant-time; тест на 401 без валідного токена.

#### T-226: захардкоджений absolute-path fallback (deploy-breakage + spec-drift)
- **Файл:рядок:** `services/architect-agent/main.py:210` — fallback `Path(os.getenv("REPO_ROOT", "/home/vokov/workspace/ai-drakon-scaffolder"))`. Машинно-специфічний шлях; на іншому dev-сервері/Appwrite-контейнері `ANALYTICS_LOG` вкаже в неіснуючий каталог → аналітика тихо порожня.
- **Дія:** прибрати особистий шлях; при відсутності `REPO_ROOT` — обчислити відносно `__file__` (як роблять `main.py:4-10`), або підняти явну помилку конфігурації.
- **AC:** немає рядка `/home/vokov` у сервісі; `ANALYTICS_LOG` резолвиться від `__file__`. Перевірити `grep -rn "/home/vokov\|/home/ubuntu" services/` на інші входження й виправити.

#### T-227: retry в LLM-клієнті лише на HTTP 429, не на мережеві збої
- **Файл:рядок:** `services/shared/llm_client.py:66-85` — цикл `for attempt in range(3)` ретраїть тільки `urllib.error.HTTPError` з `code==429`. `urllib.error.URLError` (таймаут/DNS/reset) не ловиться → перший же транзієнтний мережевий збій піднімає виняток без ретраю, попри 3-спробну обгортку. Це критично для Appwrite Function→proxy викликів через мережу.
- **Дія:** додати `except urllib.error.URLError` (і socket.timeout) у ретрай з backoff; підтвердити з оператором бажану поведінку (ретрай vs fail-fast).
- **AC:** транзієнтний `URLError` ретраїться до 3 разів; тест з мок-таймаутом.

#### T-228: `_ensure_kb` повторно ініціалізує KB на кожен запит при збої
- **Файл:рядок:** `services/drakon-agent/routes/analyze.py:27-34` — при виключенні `kb_init` прапорець `_kb_ready` лишається `False`, тож КОЖЕН наступний `/analyze` знову викликає (потенційно повільний) `kb_init`. Spec 001 сценарій 4 описує «degrade gracefully», але не постійний ретрай. Продуктивна деградація: перший збій KB → кожен запит платить вартість повторної ініціалізації.
- **Дія:** розрізнити «ще не пробували» від «пробували й впало» (напр. `_kb_state in {unloaded, ready, failed}`); при `failed` не ретраїти в межах процесу (або ретраїти з cooldown). Узгодити зі spec 001 сценарій 4 (можливо оновити спеку).
- **AC:** повторний `/analyze` після збою KB не викликає `kb_init` щоразу; поведінка задокументована у spec 001.

#### T-229: CORS `allow_origins=["*"]` на всіх трьох сервісах
- **Файл:рядок:** `drakon-agent/main.py:13`, `architect-agent/main.py:61`, `docs-agent/main.py:43` — wildcard CORS. У поєднанні з bearer-auth аналітикою (T-225) і файловими/memory-ендпоінтами варто звузити до відомих origin (`aidrakon.tech`, worker, localhost dev).
- **Дія:** винести список origin у env; за замовчуванням — дозволені домени, не wildcard. Підтвердити, що CF Worker/Appwrite-виклики не постраждають (server-to-server CORS не застосовується, тож ризик низький — але для браузерних викликів звузити).
- **AC:** origin-и конфігуровані через env; дефолт не `*` для production.

---

## Завдання 3 — Структурне впровадження Astryx (поетапна Two-Speed brownfield-міграція)

### Поточний стан Astryx (перевірено)

**Що вже є:**
- Токени й layout primitives: `src/styles/astryx.css` (176 рядків) — `--astryx-*`, теми `[data-astryx-theme="astryx"|"light"|"dark"]`, класи `astryx-button`, `astryx-badge`, `astryx-app-shell-header`, `astryx-top-nav-*`. Значення кольорів/шрифтів — ще не узгоджений із брендом implementation state, не рішення про новий бренд.
- Компоненти: `src/components/astryx/{AstryxHeader,AstryxSideNav,astryx-nav-config}.ts(x)` — альтернативний shell на Astryx-класах.
- Підключення CSS: `src/routes/__root.tsx:16,105-107` (`astryx.css` як stylesheet link); `<html>` використовує IBM Plex Sans / JetBrains Mono (`src/routes/__root.tsx:125`) і поки що не встановлює `data-astryx-theme`.

**Що НЕ так (корінь структурного впровадження):**
1. **Astryx-shell не змонтований** — `WorkspaceShell.tsx:77-78` імпортує `AstryxHeader`/`AstryxSideNav`, але рендерить bespoke UI на legacy-токенах `--accent-amber`/`--bg-base` (T-223).
2. **Жодна сторінка не вживає Astryx** — перевірка GitNexus/прямим читанням показує 0 входжень `astryx-*`/`data-astryx-theme` у всіх 23 файлах `src/pages/*.tsx`: `AgentsPage`, `AgentStudioPage`, `ArchitectPage`, `CodegenPage`, `DiagramEditorPage`, `DiagramsPage`, `EditorPage`, `GalleryPage`, `GardenPage`, `HomePage`, `KnowledgePage`, `LandingPage`, `LoginPage`, `N8NAutomationsPage`, `NotebookLMPage`, `NotFound`, `PipelineEditorPage`, `PlayPipeBuildPage`, `PlayPipePage`, `ProjectNewPage`, `ProjectsPage`, `SettingsPage`, `WorkspacePage`. Класи `astryx-button`/`astryx-badge` вживаються ЛИШЕ у визначеннях Astryx і `AstryxHeader.tsx` (не змонтований).
3. **`data-astryx-theme` не активний** (T-224) — світла Astryx-тема недосяжна.
4. **Два джерела навігації** — `NAV_WORKSPACE`/`NAV_SYSTEM` (`WorkspaceShell.tsx:86-100`, містить `/tutorial 🕹️`, «Схеми») vs `ASTRYX_NAV_ITEMS` (`astryx-nav-config.ts:23-96`, без tutorial, «Схеми ДРАКОН») — дрейф міток і складу.

**Джерела принципів (NotebookLM MCP — Codex звіряє через `chat_ask`):**
- Astryx — notebook `ace65e5c-a580-494b-b352-a25920c16a48`.
- Impeccable: A Design Language for AI Coding Agents — `b4279215-9834-452b-a257-1609904cb0f2`.
- AI-DRAKON Astryx Scaffolder — `62b39d60-ecc0-4ef9-aad6-cedb70fc2d95`.
- ai-drakon_redesign — `e70b6012-2bbf-4181-be83-d3e4af3185b0`.
> Two-Speed Adoption / brownfield: мігрувати поповерхнево, prod лишається робочим на кожному кроці; після кожної зміни `rsync -av --delete src/ .lovable/src/` + перевірка білду `.lovable`.

### Phase 0 — Фундамент (не змінює візуал, розблоковує решту)

#### T-230: активувати `data-astryx-theme`, синхронізований з ThemeProvider
- **Файли:** `src/routes/__root.tsx:118` (+ `src/components/theme-provider.tsx`), дзеркало в `.lovable`.
- **Дія:** встановлювати `data-astryx-theme` на `<html>` синхронно з темою (`dark`→`dark`, `light`→`astryx`). Не ламати наявний `.dark` alias.
- **AC:** обидві Astryx-теми активуються; перемикач теми міняє атрибут; візуал legacy-сторінок не змінюється (токени `--accent-amber` ще діють).

#### T-231: бренд-тема Astryx і узгодження токенів (ADR-0009 / T-204)
- **Файли:** `src/styles/astryx.css`, `src/styles.css`; дзеркала.
- **Дія:** за D-2 оформити amber AI-DRAKON через Astryx theme/token layer: узгодити `--astryx-color-brand*`, surface/text/border tokens, шрифти й похідні контрастні значення; де потрібно, створити явний міст `--accent-amber` → Astryx tokens. Не вводити A/B вибір палітри. Перевірити правила Impeccable щодо токенізації, контрасту й відсутності gray text на кольоровому фоні; зафіксувати канонічні назви в ADR-0009.
- **AC:** один канонічний набір Astryx-токенів, що зберігає amber-ідентичність; похідні токени мають коректний контраст; legacy-змінні або alias-нуться на Astryx, або мають план видалення.

#### T-232: єдине джерело навігації
- **Файли:** `src/components/astryx/astryx-nav-config.ts`, `src/components/workspace/WorkspaceShell.tsx`.
- **Дія:** зробити `ASTRYX_NAV_ITEMS` єдиним джерелом; `WorkspaceShell` споживає його замість локальних `NAV_WORKSPACE`/`NAV_SYSTEM`. Узгодити мітки (обрати «Схеми ДРАКОН» або «Схеми» — один словник; вирішити долю `/tutorial 🕹️`, відсутнього в Astryx-конфізі). Узгодити з рішенням D-3 щодо `/sync`.
- **AC:** одна конфігурація навігації; немає дублю міток; `/trace`,`/tutorial`,`/codegen` мають узгоджений `headerVisible`.

### Phase 1 — App Shell на Astryx (найбільший ризик, робити за flag)

#### T-233: змонтувати `AstryxHeader` + `AstryxSideNav` у `WorkspaceShell`
- **Файли:** `src/components/workspace/WorkspaceShell.tsx` (замінити bespoke header рядки 398–633 і aside 686–703 на `<AstryxHeader>`/`<AstryxSideNav>`), передати наявні хендлери (`onOpenCmd`, `onOpenAgentChat`, `onLogout`, `toggleTheme`). Зберегти Evidence-drawer, IconRail, MobileNavigationDock, CommandPalette.
- **Ризик:** ВИСОКИЙ — shell на кожній авторизованій сторінці. Робити за feature-flag (env/localStorage `astryx_shell`), щоб можна було відкотити без деплою; лишити legacy-гілку до підтвердження.
- **Дія:** переконатися, що `AstryxHeader`/`AstryxSideNav` покривають ProjectSelector, breadcrumb, agent-chat, theme, logout, mobile Sheet. Доповнити компоненти відсутнім (напр. `AstryxSideNav` наразі не рендериться взагалі — перевірити його вміст перед монтуванням). Прогнати `/impeccable adapt` для responsive shell і `/impeccable harden` для keyboard/focus, empty/error та overflow states.
- **AC:** за flag=on усі авторизовані маршрути показують Astryx-shell без регресій (навігація, cmd-palette ⌘K, вихід, mobile-dock, evidence-drawer); flag=off → legacy. Vitest 33/33 зелені; білд `.lovable` успішний.

#### T-234: прибрати мертвий legacy-shell після підтвердження
- **Файли:** `WorkspaceShell.tsx`.
- **Дія:** ПІСЛЯ того як оператор підтвердив T-233 на `aidrakon.tech`, видалити legacy-гілку і flag. Це незворотнє видалення production-UI — виконувати лише за явним «go» оператора (політика техборгу §2, паралельний production-код).
- **AC:** один shell; немає мертвого коду; flag прибрано; підтвердження оператора зафіксовано в handoff.

### Phase 2 — Поповерхнева міграція сторінок (низький ризик, ітеративно)

> Порядок за трафіком/ризиком: спершу прості статичні, далі складні редактори. Кожна сторінка — окремий крок з `rsync` і білд-перевіркою. Prod не ламається, бо токени сумісні (Phase 0).

#### T-235: хвиля 1 — прості/статичні поверхні
- **Файли:** `src/routes/trace.tsx` (разом із T-221 CTA), `src/routes/sync.tsx` (T-222), `src/pages/{NotFound,SettingsPage,GalleryPage,GardenPage}.tsx`.
- **Дія:** перевести сирі Tailwind/legacy-класи на `astryx-button`/`astryx-badge`/Card-патерни й Astryx-токени; додати `data-variant`/`data-size`/`data-testid` (agent-readiness, вимога CLAUDE.md Astryx-секції). Прогнати `/impeccable harden` для empty/error/overflow станів і `/impeccable polish` для узгодження з Astryx без зміни amber-бренду.
- **AC:** кожна сторінка вживає Astryx-класи; `data-*` семантичні атрибути присутні; візуальна регресія перевірена (Comet screenshot, коли доступний).

#### T-236: хвиля 2 — робочі сторінки середньої складності
- **Файли:** `src/pages/{CodegenPage,DiagramsPage,AgentsPage,ArchitectPage,NotebookLMPage,PipelineEditorPage,ProjectsPage,KnowledgePage}.tsx`.
- **Дія:** як T-235; для CodegenPage зберегти F3-handoff (codegen→editor), не регресувати. Прогнати `/impeccable clarify` для copy, `/impeccable typeset` для ієрархії та `/impeccable polish` для alignment із Astryx.
- **AC:** Astryx-патерни; F3 не зламано; vitest зелений.

#### T-237: хвиля 3 — складні редактори/канвас
- **Файли:** `src/pages/{DiagramEditorPage,EditorPage,WorkspacePage,PlayPipePage,PlayPipeBuildPage,AgentStudioPage}.tsx`, `src/components/drakon/DrakonEditor.tsx` (вживає WorkspaceShell/astryx).
- **Дія:** обережно — тут drakonwidget/канвас; мігрувати обгортки/панелі/toolbar на Astryx, НЕ чіпати логіку канвасу (поза Astryx-scope). Застосувати `/impeccable adapt`, `/impeccable harden`, `/impeccable polish` і `/impeccable typeset` до оболонки, toolbar та станів, не до diagram semantics.
- **AC:** обрамлення на Astryx; канвас-функціональність не регресує; ручний тест drag/draw.

#### T-238: publiч/landing/login
- **Файли:** `src/pages/{LandingPage,LoginPage}.tsx`, `src/routes/{index.tsx,login.tsx}` (hideChrome-гілка `__root.tsx:161-164`).
- **Дія:** привести до Astryx з урахуванням D-2 amber-теми; ці поверхні поза WorkspaceShell. `/impeccable clarify` і `/impeccable polish` мають зберігати AI-DRAKON voice та не вводити сторонню палітру.
- **AC:** брендовано; узгоджено з T-220 метаданими.

### Phase 3 — Прибирання й enforcement

#### T-239: видалити legacy-токени та закріпити Astryx-only
- **Файли:** `src/styles.css` (legacy `--accent-amber` тощо), `src/styles/drakon.css`, lint-конфіг.
- **Дія:** після міграції всіх сторінок — прибрати або alias-нути legacy-токени; додати lint/CI-правило проти сирих hex/несанкціонованих класів поза Astryx (enforcement ADR-0009), але дозволити брендове amber лише через канонічні theme tokens. Закріпити Impeccable design context (`PRODUCT.md`/`DESIGN.md` або еквівалент у репозиторії), щоб AI-агенти не вигадували іншу палітру. Оновити CLAUDE.md Astryx-секцію під фактичний стан.
- **AC:** grep legacy-токенів у `src/pages` = 0 (крім явних alias); CI ловить нові non-Astryx компоненти; `rsync src/ .lovable/src/` виконано; білд зелений.

---

## Порядок виконання (рекомендація архітектора)

1. **Спершу — D-1, D-2, D-3** (рішення оператора). Без D-1 Task 2/3 gitnexus-gates фіктивні; без D-2 Phase 0 Astryx блокований.
2. **Task 1** ADR-и (T-201..T-204) — дешеві, розблоковують спільну мову; паралельно T-207 борг.
3. **Task 2** — T-220/T-221/T-222 (F1/F4/F6, швидко) + backend security T-223..T-229 (T-225 security — пріоритет).
4. **Task 3** — Phase 0 (T-230..T-232) → Phase 1 за flag (T-233, найризиковіше) → Phase 2 хвилями → Phase 3.
5. Після кожної зміни `src/`: `rsync -av --delete src/ .lovable/src/`, `vitest`, білд `.lovable`. Не комітити без `bash bin/sdd_verify.sh --gate`.

## Незворотні кроки — тільки за явним «go» оператора
- T-234 (видалення legacy-shell), T-239 (видалення legacy-токенів), T-222(a)/D-3 (видалення `/sync` route), T-207 (видалення `GEMINI.md`), доля `-flue` сервісів. Політика техборгу §2: паралельний production-код не видаляється без owner-підтвердження + regression evidence.
