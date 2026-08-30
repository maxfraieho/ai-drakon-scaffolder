# Redesign Brief — Astryx Consistency Pass

Джерело правди: `PLAN.md` + `GENSPARK-PROMPTS.md` (той самий каталог). Ніщо
нижче не додає функціональності поза цими двома документами — тільки
структурує їх для виконання. Компонентний і сторінковий інвентар зібрано з
живого коду (`.184`, HEAD `1eccbb14`), не вигадано.

---

## 1. Ціль (з PLAN.md, без змін)

Довести візуальну узгодженість живого UI (aidrakon.tech) через Astryx-токени,
**не замінюючи** дизайн-систему і **не чіпаючи** бізнес-логіку. Причина:
логічні баги (Save→500, `/agents` порожній, hardcoded `resolveTenant()`,
англомовні сторінки) — окремий, вже задокументований трек
(`WORKFORCE-UI-CONSOLIDATED-PLAN.md` §13, `ADR-0027`), не цей.

## 2. Must build now (в межах PLAN.md "В межах")

1. **Довершити міграцію на Astryx-токени** — не новий стиль, той самий,
   застосований послідовно скрізь.
2. **Дизайн-токени** (кольори, spacing, typography) — вже існують
   (`src/styles/astryx.css`), робота = розширення в тому ж форматі імен,
   не заміна.
3. **Точкові style-фікси** на сторінках з підтвердженою неузгодженістю
   (список нижче, §4).

## 3. Nice to have / поза скоупом (з PLAN.md "Поза межами")

- i18n runtime (укр/англ) — окремий P0-трек, НЕ тут. Дизайн має враховувати
  обидві мови в компонентах (напр. довші англ. рядки не ламають layout), але
  сам переклад — не ця робота.
- Worker-facing спрощений UI — контекст на майбутнє (Промт 3), НЕ будувати
  зараз. Якщо компонент можна спроєктувати з `role`-prop без додаткових
  зусиль — добре, не обов'язково.
- Backend-логіка, tenancy, harness-specs, MCP-tooling — не чіпати взагалі.
- HTTP 500 / `/agents` порожній / `/pipelines` Редагувати — логічні баги,
  окремий трек (`main`, вже частково виправлено — `ADR-0027`).

---

## 4. Affected pages/components (верифіковано з живого UX-аудиту, 2026-08-28)

| Сторінка | Проблема | Тип |
|---|---|---|
| `/architect` | Повністю англомовний UI серед укр. решти | Мовна аномалія (не для Genspark — i18n-трек) |
| `/notebooks` | Змішана мова (форма англ. під укр. заголовком) | Мовна аномалія (не для Genspark) |
| `/trace` | Dev-жаргон навіть у верстці ("4-Gate Control Plane", "RUNTIME · POLICY-ENGINE") | Role-gate/приховування для worker (Промт 3, майбутнє) — НЕ рескін |
| Сторінки без `.astryx-migrated` | Залишкові hardcoded Tailwind-кольори (`bg-gray-950`, `text-slate-400`, `bg-teal-500`, `border-white/10`) замість токенів | **Це головна Must-build-now робота** |

Genspark/Comet-агент має САМ визначити повний перелік сторінок без
`.astryx-migrated` через наданий GitHub-лінк (не вгадувати з цього списку —
він неповний, це лише підтверджені під час одного проходу аудиту приклади).

## 5. Information architecture (поточна, верифікована з `src/routes/`)

Не пропозиція нової IA — угруповання наявних роутів для орієнтації Genspark.
Перегрупування структури навігації **поза скоупом** цього redesign-проходу
(PLAN.md не просить змінювати IA, тільки візуальну консистентність).

- **Публічний вхід:** `/`, `/login`
- **Project workspace** (`/p/$slug/*`): `overview`, `docs`, `settings`,
  `agents`, `automations`, `playpipe`, `playpipe/build`
- **DRAKON-інструментарій:** `/diagrams`, `/diagram/editor`, `/editor/$id`,
  `/pipeline`, `/pipelines`, `/pipeline/$pipelineId/edit`, `/codegen`,
  `/devcycle`, `/trace`
- **Агенти (глобально):** `/agents` (Diagram-агенти + Pipeline-конфіги,
  розведені по `source` — див. `ADR-0027`)
- **Знання:** `/notebooks`, `/knowledge`, `/architect`
- **Робочий простір/файли:** `/workspace`
- **Онбординг:** `/tutorial`
- **Адмін:** `/settings`, `/sync`
- **Інше:** `/gallery`, `/magic`, `/templates`, `/adr`, `/pitch/$diagramId`,
  `/project/new`, `/s/$slug`

## 6. Component inventory (верифіковано, `src/components/ui/`)

45 shadcn-стилю примітивів вже в кодовій базі — Genspark працює З НИМИ, не
поверх них: `accordion`, `alert`, `alert-dialog`, `aspect-ratio`, `avatar`,
`badge`, `breadcrumb`, `button`, `calendar`, `card`, `carousel`, `chart`,
`checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `drawer`,
`dropdown-menu`, `form`, `hover-card`, `input`, `input-otp`, `label`,
`menubar`, `navigation-menu`, `pagination`, `popover`, `progress`,
`radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`,
`sidebar`, `skeleton`, `slider`, `sonner`, `switch`, `table`, `tabs`,
`textarea`, `toggle`, `toggle-group`, `tooltip`.

Плюс сторінково-специфічні компоненти, торкнуті цією сесією:
`src/components/agents/NewAgentWizard.tsx`,
`src/components/pipelines/PipelineCommandCenter.tsx`,
`src/components/files/ProjectFileManager.tsx`.

**Правило для Genspark:** розширювати/уніфіковувати варіанти цих
компонентів (Astryx-токенізовані стани), НЕ створювати паралельний набір.

## 7. Visual direction options

PLAN.md вже зробив вибір (не намалювати з нуля) — тут не "які 3 стилі
обрати", а "як довести один існуючий стиль до кінця". Дві тактики виконання,
обидві прийнятні, Genspark/Q обирає:

- **Опція A — token-first:** спочатку розширити/уточнити `--astryx-*`
  токени там, де їх бракує (напр. немає токена для стану "error"/"warning"
  фону — судячи з hardcoded `bg-red-500/10`, `text-rose-100` в
  `AgentsPage.tsx`), потім перепрокинути сторінки на них.
- **Опція B — page-first:** пройтись по кожній сторінці з §4, замінити
  hardcoded кольори на наявні токени напряму, розширювати токени лише коли
  справді бракує відповідника.

Рекомендація (не рішення за Q): Опція A менш ризикована для узгодженості
(один прохід токенів замість розсинхронізованих правок сторінка-за-сторінкою),
але повільніше видає видимий результат. Опція B швидше показує прогрес, вищий
ризик drift.

## 8. Phased plan (implementation-ready)

**Фаза 0 — вже зроблено:** гілка `feature/genspark-astryx-redesign`
створена, `PLAN.md`, `GENSPARK-PROMPTS.md`, `COMET-AGENT-PROMPT.md` готові.

**Фаза 1 — Genspark design-system creation** (Comet-агент,
`COMET-AGENT-PROMPT.md`): заповнити форму, підключити GitHub-репо, `Create`.

**Фаза 2 — брифінг Genspark-чату** (`GENSPARK-PROMPTS.md`, 3 промти
послідовно): межі + токени → причина неузгодженості → worker-контекст.

**Фаза 3 — token gap analysis:** Genspark (або Comet за його вказівкою)
проходить `src/pages/*.tsx`, `src/components/**/*.tsx`, знаходить усі
hardcoded Tailwind-кольори поза `.astryx-migrated`-охопленням, складає
конкретний список файл→рядок (аналогічно тому, як цей документ склав §4).

**Фаза 4 — точкове застосування:** для кожного файлу зі списку Фази 3 —
або додати клас `.astryx-migrated` (якщо весь блок можна безпечно
перемапити), або замінити конкретні hardcoded класи на `--astryx-*`
еквіваленти напряму (де `.astryx-migrated`-bridge не покриває патерн).

**Фаза 5 — візуальна QA:** проти §4-переліку + скріншоти light/dark обох
тем на змінених сторінках.

**Фаза 6 — PR review:** окремий від `main`-треку правок (`ADR-0027`) PR з
цієї гілки; ручне узгодження, якщо файли перетнулись (малоймовірно —
дизайн-фікси й логічні фікси цієї сесії торкались різних файлів здебільшого,
крім `AgentsPage.tsx`, де ADR-0027 вже додав `source`-розрізнення — Genspark
має НЕ чіпати логіку цього файлу, тільки класи).

---

## Explicitly NOT decided here (залишається відкритим, з PLAN.md)

1. Формат виводу Genspark (Figma/CSS-tokens JSON/React-компоненти) — досі
   невідомо, впливає на Фазу 4 виконання.
2. Чи Genspark сам зробить Фазу 3 (gap analysis) автономно через
   GitHub-лінк, чи це має зробити Comet/Claude окремо перед тим, як віддати
   Genspark вже готовий список — залежить від того, що Genspark вміє робити
   з підключеним репо (не перевірено).
