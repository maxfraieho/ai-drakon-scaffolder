# План тестування: ai-drakon-scaffolder — поточний інтерфейс (baseline перед workforce-редизайном)

> Формат — під Pi Agent Desktop (плагін pi-puppeteer, модель Qwen Flash). Мета: зафіксувати
> baseline поведінки ІСНУЮЧОГО інтерфейсу (до впровадження workforce-UI з
> `WORKFORCE-UI-CONSOLIDATED-PLAN.md`), щоб після редизайну було з чим порівнювати регресії.
> Маршрути нижче verified через `find src/routes/*.tsx` (GitNexus repo `ai-drakon-scaffolder`,
> 2026-08-28) — не вигадані.

## 1. Загальна інформація

- Цільовий URL: `http://localhost:<PORT>` — визнач після `npm run dev` (vite dev, порт не
  зафіксований у конфізі — lovable-конфіг автовизначає; типово 8080 для vite-tanstack, звір з
  консольним виводом перед стартом тестів).
- Тестовий акаунт: Appwrite JWT-based логін (`/login`) — тестові креденшли надає Q окремо
  (не в репо).
- Папка для скріншотів: `./test-results/screenshots/`
- Viewport: Desktop (1920x1080), Mobile (375x812) — mobile критичний, бо workforce-vision
  цільовий юзер — телефон.

## 2. Тест-кейси

### ТК-01: Головна + маршрутизація верхнього рівня
1. Відкрий `/`.
2. Перевір рендер без помилок консолі (DevTools Console — 0 error).
3. Перевір, що `__root.tsx`-layout (nav/header) присутній.
4. Скріншот: `01_index.png`.
*Очікувано*: HTTP 200, < 3с, консоль чиста.

### ТК-02: Автентифікація (Appwrite JWT)
1. Відкрий `/login`.
2. Спробуй submit з порожніми полями — перевір валідацію.
3. Увійди тестовим акаунтом.
4. Перевір, що JWT осів у `localStorage` (ключ `jwt` — задокументовано в `AGENTS.md`;
   ЦЕ САМЕ ПО СОБІ ВІДОМА ВРАЗЛИВІСТЬ, не баг тесту — просто зафіксуй факт для звіту).
5. Скріншот: `02_login_success.png`.
*Очікувано*: редирект після успішного логіну, токен присутній у `localStorage.jwt`.

### ТК-03: Проєкти/тенант (`/project.new`, `/p.$slug.overview`)
1. Створи новий проєкт через `/project.new`.
2. Перейди на `/p/<slug>/overview` (`p.$slug.overview.tsx`).
3. Перевір, що видно лише ресурси щойно створеного tenant (немає leakage з інших проєктів
   того ж акаунта — прямий functional-тест для `resolveTenant()`/`roles:['owner']`
   поведінки, підтвердженої GitNexus-переглядом коду цієї сесії).
4. Скріншот: `03_project_overview.png`.
*Очікувано*: 200, показані дані лише поточного tenant.

### ТК-04: Агенти (`/p.$slug.agents.index`, `/p.$slug.agents.$agentId.studio`)
1. Відкрий список агентів проєкту.
2. Відкрий studio конкретного агента (перевір усі 8 ролей з `AGENT_ALLOWED_TOOLS`:
   architect, drakon, docs, sonate-solidaire, architect-a, architect-b, drakon-analyze,
   docs-chat — якщо селектор ролі є в UI).
3. Перевір мережеві помилки (4xx/5xx) при завантаженні specs.
4. Скріншот: `04_agent_studio.png` (+ по одному на кожну знайдену роль, якщо UI дозволяє
   перемикати).
*Очікувано*: кожна роль завантажує свій harness spec без 4xx/5xx.

### ТК-05: Діаграми (`/diagrams`, `/diagram.editor`, `/editor.$id`)
1. Відкрий `/diagrams` — список.
2. Відкрий editor конкретної діаграми `/editor/<id>`.
3. Перевір базові дії редактора (zoom, вибір вузла) без JS-помилок.
4. Скріншот: `05_diagram_editor.png`.
*Очікувано*: канвас рендериться, консоль чиста.

### ТК-06: Pipeline (`/pipelines`, `/pipeline.$pipelineId.edit`)
1. Відкрий список пайплайнів.
2. Відкрий editor конкретного pipeline.
3. Перевір запуск/статус (якщо доступний тестовий pipeline) — captures 4xx/5xx.
4. Скріншот: `06_pipeline_edit.png`.
*Очікувано*: 200, немає мережевих помилок при завантаженні станів.

### ТК-07: Docs/Knowledge/ADR (`/p.$slug.docs`, `/knowledge`, `/adr`)
1. Відкрий кожен маршрут по черзі.
2. Перевір рендер контенту (не порожня сторінка).
3. Скріншот на кожен: `07a_docs.png`, `07b_knowledge.png`, `07c_adr.png`.
*Очікувано*: контент присутній, 0 console error.

### ТК-08: Settings (`/settings`, `/p.$slug.settings`)
1. Відкрий обидва варіанти settings (глобальний і проєктний).
2. Перевір форми не ламаються при submit порожніх/невалідних значень.
3. Скріншот: `08_settings.png`.
*Очікувано*: валідація видима, немає silent-fail.

### ТК-09: Automations/Sync/Devcycle (`/p.$slug.automations`, `/sync`, `/devcycle`)
1. Відкрий кожен маршрут.
2. Перевір відсутність необроблених винятків у консолі.
3. Скріншот на кожен.
*Очікувано*: 200 або явний "not configured" стан — не білий екран/crash.

### ТК-10: Mobile viewport pass (регресія найкритичніша для workforce-vision)
1. Перемкни viewport на 375x812.
2. Повтори ТК-01, ТК-02, ТК-04 (найбільш ужиткові для майбутнього worker-facing флоу).
3. Перевір, що nav/header не ламає layout, немає horizontal scroll.
4. Скріншот на кожен: `10a..10c_mobile.png`.
*Очікувано*: no horizontal overflow, елементи керування досяжні (не обрізані).

## 3. Формат фінального звіту

`TEST_REPORT.md`:

1. Таблиця результатів:

   | ID | Назва тесту | Статус (PASS/FAIL) | Скріншот | Коментар |

2. Список дефектів — кроки відтворення + console-логи (лише релевантні рядки, не повний dump).
3. Пріоритет (High/Medium/Low).
4. Окрема секція "Baseline для workforce-редизайну" — які з цих екранів/патернів workforce-план
   планує замінити (звір з `WORKFORCE-UI-CONSOLIDATED-PLAN.md` §7 UI inventory), щоб після
   редизайну було видно, що саме змінилось навмисно, а що — регресія.

## 4. Запуск у Pi Agent Desktop

```
Виконай план тестування з файлу docs/plans/org-workforce-vision-2026-08-24/TEST_PLAN.md.
Використовуй pi-puppeteer, роби скріншоти за планом, після завершення сформуй TEST_REPORT.md
у тій самій папці.
```
