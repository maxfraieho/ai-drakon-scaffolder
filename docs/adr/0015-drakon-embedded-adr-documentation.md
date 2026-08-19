---
status: "proposed"
date: 2026-08-19
deciders: "оператор + Antigravity (архітектор)"
spec: "specs/004-adr-drakon-integration"
supersedes: null
superseded-by: null
---

# 0015. Вбудовування DRAKON-схем у ADR як immutable vector-зображення; часткове запозичення з log4brains

## Контекст і формулювання проблеми

Проєкт має 14 ADR (MADR v3.x) і повноцінний DRAKON-редактор з export-функціоналом. Архітектурні рішення описуються текстом, але логіка рішень (control flow, pipeline sequences, branching) краще передається DRAKON-діаграмами. Як інтегрувати DRAKON-схеми в ADR-записи, зберігаючи immutability-контракт ADR? Чи потрібен зовнішній ADR-інструмент (log4brains)?

## Рушії рішення

* ADR = immutable historical record; accepted ADR НЕ редагується, зміни — через новий ADR із `supersedes`
* DRAKON-редактор (`DrakonEditor.tsx`) експортує **тільки raster PNG** через `widget.exportCanvas()` → `canvas.toDataURL('image/png')` (рядки 1071-1082); SVG export **відсутній**
* ADR має бути self-contained: діаграма зберігається поруч з текстом, не як зовнішнє посилання що може зникнути
* Потрібен deep-link з ADR назад у редактор для інтерактивної версії діаграми
* Log4brains пропонує timeline view, search, SSG — частина цього вже покрита нашим workflow (Copier sdd-universal-template, MADR шаблон, git-based нумерація)

## Розглянуті варіанти

* Повна інтеграція log4brains як ADR-платформи
* Часткове запозичення: ADR timeline/search компонент власної розробки, натхненний log4brains
* Без зовнішніх інструментів: розширення поточного ADR-workflow SVG export + immutability lint

## Підсумок рішення

Обрано **варіант 3 (без log4brains) з елементами варіанту 2**.

### 1. DRAKON-в-ADR механізм

- `DrakonEditor` доповнюється **SVG export** (`handleExportSvg`) через серверний або клієнтський canvas→SVG конвертор (пріоритет: нативний SVG rendering якщо drakonwidget підтримує, fallback — `canvas` snapshot + vectorization через `canvg` inverse або inline SVG generation з JSON)
- Експортований SVG зберігається як `docs/adr/assets/0015-diagram-{slug}.svg` поруч з ADR markdown
- В ADR вставляється: `![DRAKON: назва](./assets/0015-diagram-{slug}.svg)` + deep-link `[▶ Відкрити у редакторі](/studio?diagramId={id})`
- DRAKON-схема **опційна** — не кожен ADR потребує діаграму

### 2. Immutability-контракт

- Git pre-commit hook + CI check: якщо ADR має `status: "accepted"` або `status: "deprecated"` — файл **заборонено змінювати** (лише зміна `superseded-by` при створенні нового ADR)
- SVG-файли в `docs/adr/assets/` з тим самим ADR-префіксом (напр. `0015-*`) підпадають під ту ж заборону
- Зміни рішення → новий ADR з `supersedes: "ADR-0015"`, новий SVG snapshot

### 3. Log4brains — НЕ інтегрувати

**Причини відмови від повної інтеграції:**

| Функція log4brains | Наш аналог | Оцінка |
|---|---|---|
| MADR шаблон | `docs/adr/template.md` (MADR v3.x, UA) | ✅ є |
| CLI `adr new` | Copier sdd-universal-template + ручне створення | ✅ є |
| Auto-metadata з git | Ручний frontmatter (status, date, deciders) | ⚠ бажано автоматизувати |
| SSG timeline + search | **відсутній** | 🔴 запозичити концепт |
| Next.js preview server | Не потрібен — ADR читаються в IDE/GitHub | ✅ не потрібно |
| Flexible naming (без нумерації) | Використовуємо NNNN-нумерацію (послідовну) | ✅ свідомий вибір |
| Monorepo support | Один репо, одна `docs/adr/` | ✅ не потрібно |

**Що запозичити (власна реалізація):**
- `ADRTimelineView` — React-компонент для хронологічного перегляду ADR-записів з фільтрацією за статусом
- Повнотекстовий пошук по ADR (lightweight, через grep по `docs/adr/*.md` або indexing)

### Наслідки

* Добре: ADR стає self-contained документом з візуальним описом архітектурної логіки
* Добре: immutability enforcement через git hook запобігає порушенню ADR-контракту
* Добре: SVG — векторний, масштабується, не деградує; вбудований в markdown без зовнішніх залежностей
* Добре: не додаємо зовнішню залежність (log4brains) з Node.js/Next.js overhead
* Погано: потрібно реалізувати SVG export (drakonwidget не підтримує SVG нативно)
* Погано: ADR timeline/search — додаткова розробка (але простіша за інтеграцію log4brains)

## Плюси і мінуси варіантів

### Повна інтеграція log4brains

* Добре: готовий SSG з timeline і search
* Добре: auto-guessing metadata з git history
* Погано: Next.js dependency для генерації ADR-сайту — зайвий стек поруч з Vite/React
* Погано: flexible naming конфліктує з нашою NNNN-нумерацією
* Погано: не підтримує вбудовування DRAKON SVG нативно — треба все одно дописувати
* Погано: CLI `adr new` дублює Copier workflow

### Часткове запозичення (натхненний log4brains)

* Добре: ADR timeline view та search — цінні UX елементи
* Добре: auto-metadata скрипт (git log → frontmatter) автоматизує ручну роботу
* Погано: потрібно розробити два UI компоненти (timeline + search)

### Без зовнішніх інструментів + SVG export

* Добре: мінімум залежностей
* Добре: повний контроль над immutability-контрактом
* Добре: SVG зберігається в репо як sound engineering practice
* Погано: втрачається auto-metadata з git (можна додати пізніше як скрипт)

## Додаткова інформація

**Evidence:**
- Export тільки PNG: [`DrakonEditor.tsx:1071-1082`](file:///home/vokov/workspace/ai-drakon-scaffolder/src/components/drakon/DrakonEditor.tsx#L1071-L1082) — `handleExportPng` через `widget.exportCanvas(10000)`
- Widget API: [`drakonwidget.d.ts:140`](file:///home/vokov/workspace/ai-drakon-scaffolder/src/types/drakonwidget.d.ts#L140) — `exportCanvas(zoom100: number) => HTMLCanvasElement`, SVG method відсутній
- ADR шаблон: [`template.md`](file:///home/vokov/workspace/ai-drakon-scaffolder/docs/adr/template.md)
- Log4brains дослідження: NotebookLM notebook `ADR_tool` (id: 8cd52562)
- Попередній ADR/SDD research: [`2026-08-18-sdd-adr-integration-research.md`](file:///home/vokov/workspace/ai-drakon-scaffolder/docs/handoff/2026-08-18-sdd-adr-integration-research.md)
- Immutability principle: MADR canonical — accepted ADR is an immutable historical record
