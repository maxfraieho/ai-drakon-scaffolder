---
status: accepted
date: 2026-08-30
deciders: Q, Claude (investigation via Oracle Claude + sequential-thinking + GitNexus)
spec: null
supersedes: null
superseded-by: null
---

# 0028. Consolidate duplicated navigation and unify DRAKON/Workspace diagram sources

## Контекст і формулювання проблеми

Живий UX-прогін редизайну (`design-system/astryx-genspark`, dev-сервер,
2026-08-30) виявив дві архітектурні проблеми поза скоупом ADR-0027
(яке чіпало лише `/agents`):

1. **Навігаційна надлишковість.** `WorkspaceShell` (`src/routes/__root.tsx:176`)
   рендерить одночасно 3-4 nav-поверхні на десктопі: верхній header
   (`AstryxHeader.tsx:52`, з `ASTRYX_NAV_ITEMS`), лівий IconRail
   (`WorkspaceShell.tsx:124-130`, **окремий hardcoded масив**, не з конфіга),
   ліва sidebar (`AstryxSideNav.tsx:19-20`, той самий `ASTRYX_NAV_ITEMS`).
   Один route (`/diagrams`, `/agents`, `/pipelines`) доступний з 3 різних
   UI-елементів одночасно. `/knowledge` присутній лише в IconRail і
   відсутній в `ASTRYX_NAV_ITEMS` -- орфан. IconRail-мітки біологічні
   (logic/mrna/ribosome/protein), header/sidebar -- доменні (Схеми/Агенти/
   Pipelines) для тих самих маршрутів.

2. **DRAKON tab і Workspace tab не бачать одні й ті самі схеми** -- та сама
   класа помилки, що ADR-0027 (два джерела під одним словом). DRAKON tab
   (`/diagrams`, `DiagramsPage.tsx`) читає MinIO/localStorage
   (`readDiagramsFromStorage`, формат `.drakon.json`). Workspace tab
   (`/workspace`, `ProjectFileManager.tsx`) читає GitHub git-tree
   (`fetchNotesTree`/`githubGetFile`, формат `.drakon`, без `.json`).
   `ProjectFileManager.tsx` має нуль викликів `listDiagrams`/
   `readDiagramsFromStorage`; `DiagramsPage.tsx` має нуль викликів
   git-tree API. Схема, закомічена в git через Workspace, фізично не може
   з'явитись у DRAKON tab -- різні джерела, навіть різне розширення файлу.

Додатково знайдено: `src/components/app/AppLayout.tsx` та
`src/components/app/AppHeader.tsx` -- мертвий legacy nav-код (react-router,
проєкт давно на @tanstack), 0 імпортів, підтверджено grep.

Ці проблеми піднімають ширше питання: цільова IA (worker/supervisor
role-gated spaces, ADR-0026, `WORKFORCE-UI-CONSOLIDATED-PLAN.md:144-158`)
вже описана, але поточний flat-nav показує весь Dev Studio беззастережно
-- IA не має рольового виміру взагалі, бо role-gate заблокований на
`resolveTenant()` hardcoded `roles: ['owner']` (`packages/tenancy/src/index.ts:79`,
той самий блокер, що вже задокументований в ADR-0027 і плані).

## Рушії рішення

* Не блокувати видиму, безпечну консолідацію nav на роль-гейті, що ще не
  реалізований (окремий, більший трек).
* Не приховувати розбіжність DRAKON/Workspace мовчки -- показати чесно
  об'єднаним, як зроблено для `/agents` в ADR-0027, а не вигадувати
  фальшиве злиття.
* Мінімізувати ризик: видалення мертвого коду і консолідація конфіга
  nav --低-ризикові зміни без бізнес-логіки; уніфікація diagram-джерел --
  окрема, більш обережна робота (торкається реальних read/write шляхів).

## Підсумок рішення

1. **Nav consolidation.** `ASTRYX_NAV_ITEMS` (`astryx-nav-config.ts`)
   стає єдиним джерелом правди для ВСІХ nav-поверхонь. IconRail більше
   не hardcoded масив -- рендериться з того самого конфіга (чи видаляється
   як окрема поверхня, якщо header+sidebar покривають ті самі маршрути).
   `/knowledge` додається в конфіг або прибирається як недороблений пункт.
2. **Видалення мертвого коду.** `AppLayout.tsx`, `AppHeader.tsx` -- видалити
   повністю (підтверджено 0 імпортів).
3. **Diagram source unification.** DRAKON tab і Workspace tab показують
   об'єднаний список схем (MinIO/localStorage + git-tree), кожен елемент
   позначений джерелом -- той самий патерн, що ADR-0027 `source: "diagram" |
   "pipeline"` для agents. НЕ силувати єдиний формат файлу (`.drakon.json`
   vs `.drakon`) в цьому кроці -- показати обидва, конвертація формату
   поза скоупом.
4. **Role-gate і Worker/Supervisor spaces** лишаються заблокованими на
   `resolveTenant()` membership-lookup -- НЕ вирішується цим ADR, статус
   не змінюється відносно ADR-0027.

### Наслідки

* Добре, тому що nav стає передбачуваним -- один route, одне місце в UI,
  замість 2-3 дублів.
* Добре, тому що DRAKON tab перестає мовчки ховати git-скомічені схеми --
  користувач бачить, що вони є, навіть якщо ще не може редагувати їх з
  того самого UI без розуміння різниці джерел.
* Погано, тому що уніфікація diagram-джерел -- це реальна backend-логіка
  (не CSS), вищий ризик регресії, ніж ADR-0027-подібний UI-фікс, бо тут
  двоє різних API/storage шляхів, а не два query-виклики.
* Погано, тому що видалення IconRail як окремої поверхні (якщо саме so
  вирішено в реалізації) -- втрата швидкого доступу для тих, хто звик до
  нього; компенсується тим, що sidebar покриває ті самі маршрути.

## Додаткова інформація

* Джерело: дослідження через Oracle Claude (`edgee launch claude --model
  opus`, sequential-thinking + GitNexus MCP), 2026-08-30, делеговане
  замість заблокованого локального sequential-thinking (don't-ask-mode
  glitch цієї сесії).
* Пов'язано: ADR-0026 (multi-participant vision), ADR-0027 (той самий
  клас "два джерела під одним словом" фікс, вже застосований для /agents).
* Реалізація: делегується Pi + deepseek-v4-flash на .234 (пріоритет за
  [[feedback_pi_deepseek_priority]]), за SDD-методикою репо
  (`docs/sdd-book/`) -- окремі spec-документи для кожного з 3 пунктів
  вище, окремі PR.
* Не вирішено цим ADR: чи IconRail видаляється повністю, чи мержиться з
  sidebar -- деталь реалізації, не архітектурне рішення.
