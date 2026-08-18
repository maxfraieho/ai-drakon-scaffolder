# UI/UX adaptation research — 2026-08-18

## Контекст

- Репозиторій: `ai-drakon-scaffolder`, гілка `main`, commit `7120482ab8c8c055ec9c0418a086df0970e777c3` (`fix(test): attach rejection handler before running fake timers...`).
- Продакшн: `https://aidrakon.tech/`; HTTP-перевірка 2026-08-18, порт не застосовувався.
- Авторизація: GitHub credentials відсутні. Глибокі authenticated flows не перевірені.
- GitNexus: `query()` і `context()` повторно виконані для сторінок/роутів, Astryx navigation і Codegen flow. Індекс цього прогону доступний; знайдено `src/routeTree.gen.ts`, `AstryxSideNav`, `AstryxHeader`, `WorkspaceShell`, `HomePage`, `EditorPage`, `AgentStudioPage`, `PlayPipePage`, `Codegen` flow.
- comet-win: інструменти `comet_connect`/`comet_ask`/`comet_screenshot`/`comet_tabs` відсутні в доступному MCP-наборі. Повторне підключення через CDP `127.0.0.1:19222` також відхилене. Тому screenshot-level visual verification цього прогону не отримана; виконано read-only HTTP/SSR перевірку live routes.
- Перевірені source areas: `src/pages/*.tsx`, `src/routes/*.tsx`, `src/routeTree.gen.ts`, `.lovable/src/routeTree.gen.ts`, `AstryxHeader`, `AstryxSideNav`, `astryx-nav-config`, `WorkspaceShell`, `CodegenPage`, `magic`, `trace`, `sync`.

## Знахідки

### F1 — продакшн shell віддає заголовок `Lovable App`

- Live evidence: `GET https://aidrakon.tech/` → HTTP 200; `<title>Lovable App</title>`, meta description — `A minimalist web page displaying a centered welcome message.`. Видимий SSR text: `AI-DRAKON`, `Схеми`, `NotebookLM`, `Pipelines`, `Агенти`, `⌘K`.
- Проблема: брендований продукт має generic Lovable title/description. Це погіршує вкладку браузера, bookmark, share preview, SEO і довіру користувача.
- Code reference: root/app shell — `src/components/workspace/WorkspaceShell.tsx:313`; production document metadata — не локалізовано через GitNexus (індекс unavailable).
- Доказ доступний через HTTP; screenshot недоступний через agent-workspace failure.

### F2 — legacy navigation містить маршрути поза committed `src/routeTree.gen.ts`

- Live evidence: `/trace` відкривається і показує `Execution Trace`, `Глобальний Trace недоступний`; `/tutorial` відкривається і показує tutorial level 1. Root shell text також містить `🕹️ Tutorial` і `Execution Trace`.
- Код: `AstryxNavItem` `trace` → `/trace` у `src/components/astryx/astryx-nav-config.ts:68`; `WorkspaceShell` додає `tutorial` і `trace` у `src/components/workspace/WorkspaceShell.tsx:88-94`; routes існують у `src/routes/trace.tsx` і `src/routes/tutorial.tsx`.
- `src/routeTree.gen.ts` не містить `TraceRoute`/`TutorialRoute`; `.lovable/src/routeTree.gen.ts` містить їх. Це створює source/Cloudflare build drift і робить навігацію залежною від того, який tree фактично збирається.
- Проблема: локальна route map і production-facing `.lovable` route map не є одним контрактом. Додавання/видалення route може працювати в одному середовищі та бути недоступним в іншому.

### F3 — Codegen flow зупиняється на preview/JSON

- Live evidence: `/codegen` SSR text показує `Генерація коду DRAKON`, form labels і sidebar, але authenticated generation не перевірена.
- Код: `CodegenPage` викликає `generateDrakonCode`, після result рендерить `Псевдокод` і `.drakon JSON` (`src/pages/CodegenPage.tsx:72-108`, `252-319`). Переходу до `DiagramEditorPage`/`/diagram/editor`, імпорту в редактор або export через `drakontechgen` немає.
- Контекст/spec прямо описує missing visual diagram rendering і actual code generation (`CONTEXT.md`, section `Current /codegen Flow` / `Missing`; `specs/000-baseline/spec.md`, section 5 excludes editor UI).
- Проблема: очікуваний user-flow `опис → generated diagram → edit schema → code` обривається на текстовому preview. Користувач не має очевидного наступного кроку після генерації.

### F4 — `/trace` є чесним, але dead-end empty state

- Live evidence: `/trace` показує `Глобальний Trace недоступний` і пояснення, що trace доступний у `PipelineDrakonView` під час запуску схеми.
- Code reference: `src/routes/trace.tsx:18-30`, component `ExecutionTracePage`.
- Проблема: empty state пояснює обмеження, але не має кнопки/посилання до Pipelines або конкретного запуску. Користувач отримує глухий кут: треба самостійно здогадатися, куди переходити.

### F5 — `/magic` має кнопку `Зберегти в GitHub` без дії

- Live evidence: `/magic` показує `AI-DRAKON Magic`, prompt і кнопку `✨ Створити схему`; result state у незапущеному SSR не видно.
- Code reference: `src/routes/magic.tsx:70-78` генерує через `/api/magic/generate`; `src/routes/magic.tsx:96-99` рендерить `Зберегти в GitHub` без `onClick`, `to`, form submit або save handler.
- Проблема: після успішної генерації користувач бачить affordance, яка не виконує дію. Це прямий UI dead-end і хибна обіцянка persistence.

### F6 — `/sync` advertises unavailable functionality

- Live evidence: `/sync` показує `Синхронізація` і `Функція синхронізації репозиторію буде доступна в наступному оновленні.`
- Code reference: `src/routes/sync.tsx:5-13`, component `SyncPage`.
- Проблема: функція присутня як маршрут/продуктова поверхня, хоча недоступна. Якщо її не можна прибрати, треба позначити статус як planned у навігації/документації або додати зрозумілий вихід до доступної дії.

## Пріоритезовані рекомендації

### Найперше

1. Вирівняти route source of truth: регенерувати й синхронізувати `src/routeTree.gen.ts` та `.lovable/src/routeTree.gen.ts`; перевірити `/trace`, `/tutorial`, `/templates`, `/magic`, `/gallery` у production build.
2. Закрити Codegen handoff: після result додати явну дію `Відкрити в редакторі`/`Редагувати схему`, передаючи `drakon_json`; окремо позначити, що actual source code потребує Desktop.
3. Прибрати або під'єднати `Зберегти в GitHub` у `/magic`; disabled/loading/error state має бути видимим для API failure.

### Середній пріоритет

1. Додати CTA з `/trace` до `/pipelines` і пояснити prerequisite запуску.
2. Замінити `Lovable App` metadata на AI-DRAKON title/description/OG metadata.
3. Привести labels до одного словника: `Схеми` vs `Схеми ДРАКОН`, `Агенти` vs англомовні `Architect`/`Pipelines`/`Codegen`.

### Можна відкласти

1. Візуальне polish empty states після доступу до authenticated browser review.
2. Перегляд legacy `/sync` і `/magic` як окремих product surfaces після рішення щодо їхнього статусу.

## Обмеження доказів

Не перевірені authenticated sidebar interactions, GitHub OAuth, створення diagrams, реальні API errors, polling timeout і screenshot-level layout/accessibility: credentials відсутні, comet-win/CDP недоступні. HTTP/SSR-текст не є заміною візуальному огляду.

## Візуальна верифікація (comet-win)

Comet-win не був доступний у цьому середовищі, тому для F1–F6 немає screenshot-доказів. Нижче — повторна live-перевірка через `GET https://aidrakon.tech/<route>`; твердження про код підтверджені GitNexus або попереднім code evidence.

### F1 — підтверджено live metadata; screenshot відсутній

`GET /` повернув `200`. HTML містить `<title>Lovable App</title>`, generic description `A minimalist web page displaying a centered welcome message.`, author `Lovable`, OG/Twitter metadata з `Lovable App`. SSR shell одночасно містить `AI-DRAKON`, `Схеми`, `NotebookLM`, `Pipelines`, `Агенти`, `⌘K`. Знахідку підтверджено; візуальне розташування metadata/branding не перевірено.

### F2 — підтверджено route/navigation drift кодом; screenshot відсутній

`GET /trace` і `GET /tutorial` повернули `200` та відображають navigation. GitNexus підтвердив `src/routeTree.gen.ts` і legacy route references; попереднє code evidence підтверджує різницю між `src/routeTree.gen.ts` та `.lovable/src/routeTree.gen.ts`. Знахідку уточнено: live routes доступні текстово, але source/build route contract лишається розбіжним.

### F3 — підтверджено partial Codegen flow; screenshot відсутній

`GET /codegen` повернув `200` і SSR labels: `Генерація коду DRAKON`, `Опис функції`, `Назва функції`, `Мова`, `Параметри (через кому)`, `Згенерувати код`. GitNexus підтвердив `generateDrakonCode` і Codegen page flow; code evidence показує pseudocode/`.drakon JSON` preview без явного editor handoff. Authenticated generation і post-generation state не перевірені.

### F4 — підтверджено dead-end empty state; screenshot відсутній

`GET /trace` повернув `200` і текст `Глобальний Trace недоступний`, з поясненням про `PipelineDrakonView` та `Запустіть пайплайн`. CTA до конкретного pipeline не видно в SSR-тексті. Знахідку підтверджено текстово; layout і keyboard behavior не перевірені.

### F5 — code-confirmed, live result state не досягнуто

`GET /magic` повернув `200` і показав `AI-DRAKON Magic`, prompt та `✨ Створити схему`; результатний стан не доступний без виконання генерації. Попереднє code evidence підтверджує `Зберегти в GitHub` без handler/link у result state. Знахідка не спростована, але її runtime-візуалізація не підтверджена.

### F6 — підтверджено live

`GET /sync` повернув `200` і відображає `Синхронізація` та `Функція синхронізації репозиторію буде доступна в наступному оновленні.`. Знахідку підтверджено; screenshot відсутній.

## Відповідність Astryx framework

NotebookLM-блокноти `Astryx` і `Impeccable: A Design Language for AI Coding Agents` прочитані через summaries і targeted `chat_ask` запити.

| Знахідка | Astryx/Impeccable guidance | Відповідність |
|---|---|---|
| F1 branding/metadata | Centralized theme/brand tokens; coherent global `TopNav`; product-specific title, description, OG metadata. | Не відповідає: production metadata лишається Lovable. |
| F2 route/navigation drift | Router-driven active state; `AppShell`/`TopNav`/`MobileNav`; route changes must preserve navigation contract. | Не відповідає: source і `.lovable` route trees розходяться. |
| F3 Codegen dead end | Wizard: explicit `TextInput`/`TextArea` → `Card` preview → external canvas/editor; explicit back/cancel/next action; async Banner/Toast feedback. | Частково: input і preview є; явний editor handoff не підтверджений. |
| F4 empty Trace | `EmptyState`/`Card`, explanation, illustration/typography tokens, inline primary CTA. | Частково: explanation є; CTA до Pipelines/запуску відсутній. |
| F5 unclear/dead CTA | Active-verb labels; `Button` for labeled actions; every action must execute or expose disabled/planned state. | Не відповідає за code evidence: `Зберегти в GitHub` без дії. |
| F6 unavailable feature | Empty/planned state needs clear context and next step; avoid dead-end surfaces. | Частково: planned status пояснено, вихід до доступної альтернативи відсутній. |

Astryx chat recommendations: `/impeccable clarify` для CTA, `/impeccable harden` для empty/error states, `/impeccable adapt` для responsive navigation, `/impeccable polish` і `/impeccable typeset` для final consistency. Для Codegen acceptance criteria: explicit labels на кшталт `Згенерувати flowchart`, `Відкрити в редакторі`, `Назад до preview`; loading/error feedback; явний `Cancel and Restart` або equivalent escape.
