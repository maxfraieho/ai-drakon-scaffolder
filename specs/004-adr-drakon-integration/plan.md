# Операційний план: ADR + DRAKON Integration

**ADR:** [0015-drakon-embedded-adr-documentation](../../docs/adr/0015-drakon-embedded-adr-documentation.md)
**Для виконання:** Codex
**Гілка:** main (від коміту 2a7e2802)
**НЕ трогати:** існуючі ADR 0001–0014 (immutable)

---

## T-401: SVG Export у DrakonEditor

**Файл:** `src/components/drakon/DrakonEditor.tsx`
**Рядки:** після `handleExportPng` (L1071-1082) та `handleExportPseudocode` (L1084-1101)

**Що зробити:**

1. Додати функцію `handleExportSvg`:
   - Викликати `widget.exportCanvas(10000)` → отримати `HTMLCanvasElement`
   - Створити `<svg>` елемент з `<foreignObject>` або конвертувати canvas→SVG через inline `<image>` з base64
   - **Пріоритетний підхід:** Згенерувати чистий SVG з DRAKON JSON diagram data напряму:
     - Прочитати `widget.exportJson()` → parse items
     - Використати layout-інформацію з canvas (позиції іконок) через внутрішній drakonwidget API
     - Якщо чистий SVG неможливий — fallback: `<svg><image xlink:href="data:image/png;base64,..."/></svg>` (embedded raster у SVG контейнері)
   - **Найпростіший MVP:** canvas → PNG base64 → `<svg><image>` wrapper. Це дає SVG-файл з raster всередині. Прийнятний compromise для v1.

2. Додати кнопку в Download-меню (поруч з Export JSON/PNG/Pseudocode):
   ```tsx
   <Button variant="ghost" size="sm" onClick={handleExportSvg}>
     <Download className="h-4 w-4 mr-1" /> SVG
   </Button>
   ```

3. Зберігати файл як `{diagramId}.svg`

**Acceptance criteria:**
- [ ] Кнопка "Export SVG" в toolbar download-секції
- [ ] Скачується .svg файл
- [ ] SVG відкривається в браузері та показує діаграму
- [ ] SVG можна вставити в markdown: `![diagram](./file.svg)`

---

## T-402: ADR Assets Directory та Insert-в-ADR Workflow

**Нові файли:**
- `docs/adr/assets/.gitkeep`

**Що зробити:**

1. Створити `docs/adr/assets/` для SVG-файлів діаграм
2. Конвенція іменування: `{ADR-number}-{diagram-slug}.svg` (напр. `0015-pipeline-flow.svg`)
3. В ADR markdown вставка:
   ```markdown
   ## DRAKON-схема

   ![DRAKON: назва діаграми](./assets/0015-pipeline-flow.svg)

   [▶ Відкрити у редакторі](/studio?diagramId={id})
   ```

**Acceptance criteria:**
- [ ] `docs/adr/assets/` існує з `.gitkeep`
- [ ] README або CONTRIBUTING документує конвенцію іменування SVG

---

## T-403: ADR Immutability Enforcement (Git Hook + CI)

**Нові файли:**
- `scripts/adr-immutability-check.sh`
- `.github/workflows/adr-guard.yml` (або розширення існуючого CI)

**Що зробити:**

1. **Git pre-commit hook** (`scripts/adr-immutability-check.sh`):
   ```bash
   #!/usr/bin/env bash
   # Перевіряє що accepted/deprecated ADR не змінені (крім superseded-by поля)
   # Вхід: staged files з git diff --cached --name-only
   # Логіка:
   #   1. Для кожного зміненого файлу в docs/adr/0*.md
   #   2. Прочитати frontmatter status з HEAD версії
   #   3. Якщо status = "accepted" | "deprecated" | "superseded by *"
   #   4. Дозволити ТІЛЬКИ зміну поля superseded-by
   #   5. Інакше → exit 1 з повідомленням
   ```

2. **CI перевірка** (`.github/workflows/adr-guard.yml`):
   - Trigger: push/PR на `docs/adr/**`
   - Дія: порівняти diff з main, перевірити що accepted ADR не модифіковані
   - Також перевіряти SVG assets: `docs/adr/assets/{NNNN}-*.svg` де ADR NNNN accepted → SVG не змінюється

3. Інтеграція з git hooks (через `.husky/` або `scripts/install-hooks.sh`)

**Acceptance criteria:**
- [ ] `scripts/adr-immutability-check.sh` існує, виконуваний, протестований
- [ ] Спроба змінити accepted ADR → hook блокує з зрозумілим повідомленням
- [ ] Зміна `superseded-by` поля в accepted ADR → дозволено
- [ ] CI workflow проходить на PR що не чіпає accepted ADRs
- [ ] CI workflow fail на PR що модифікує accepted ADR

---

## T-404: ADR Timeline View компонент

**Нові файли:**
- `src/components/adr/AdrTimelineView.tsx`
- `src/lib/adr/parser.ts`
- `src/routes/adr.tsx` (або інтеграція в існуючий docs view)

**Що зробити:**

1. **ADR Parser** (`src/lib/adr/parser.ts`):
   - Парсити frontmatter (yaml) з ADR markdown файлів
   - Витягувати: status, date, deciders, supersedes, superseded-by, title (з H1)
   - Повертати `AdrRecord[]`

2. **Timeline View** (`src/components/adr/AdrTimelineView.tsx`):
   - Вертикальний timeline по даті
   - Кольорове кодування статусу: proposed (жовтий), accepted (зелений), deprecated (сірий), superseded (перекреслений)
   - Клік → перехід на ADR markdown
   - Фільтр за статусом
   - Показувати supersedes/superseded-by зв'язки як стрілки

3. **Інтеграція з роутером:**
   - Route: `/adr` або `/docs/adr`
   - Sidebar навігація

4. **Search** (простий):
   - Input поле у Timeline View
   - Фільтрація по title та body тексту
   - Client-side grep (файли вже в bundle або fetch з API)

**Acceptance criteria:**
- [ ] `/adr` route відображає timeline всіх 15 ADR
- [ ] Фільтр за статусом працює
- [ ] Клік по ADR → показує повний markdown
- [ ] Search фільтрує по тексту
- [ ] Supersedes/superseded-by зв'язки видимі

---

## T-405: ADR Viewer з вбудованою DRAKON-схемою

**Нові файли:**
- `src/components/adr/AdrViewer.tsx`

**Що зробити:**

1. Markdown renderer для ADR з підтримкою:
   - SVG inline rendering (не посилання а вбудований preview)
   - Deep-link кнопка `[▶ Відкрити у редакторі]` → навігація в DrakonEditor з діаграмою
   - Frontmatter відображається як badge-рядок (status, date, deciders)

2. Immutability indicator:
   - Якщо status = accepted → жовтий банер "⚠ Цей ADR прийнятий і не підлягає редагуванню"
   - Якщо superseded → link на заміщуючий ADR

**Acceptance criteria:**
- [ ] ADR відображається з frontmatter badges
- [ ] SVG діаграма рендериться inline
- [ ] Deep-link веде в редактор з правильною діаграмою
- [ ] Immutability banner для accepted ADR

---

## Порядок виконання

```
T-401 (SVG Export) ─────┐
                        ├─→ T-402 (Assets Dir) ─→ T-405 (ADR Viewer)
T-403 (Immutability) ───┘
                        └─→ T-404 (Timeline)
```

T-401 і T-403 паралельні. T-402 після T-401. T-404 і T-405 після T-402.

---

## Поза scope (свідомо виключено)

- **Log4brains інтеграція** — відхилено в ADR-0015
- **Auto-metadata з git history** — nice-to-have, не блокує; може бути окремий ADR пізніше
- **Нативний SVG rendering в drakonwidget** — upstream PR; fallback (canvas→PNG→SVG wrapper) достатній для MVP
- **ADR creation wizard в UI** — поки що ручне створення файлів; workflow через Copier template
