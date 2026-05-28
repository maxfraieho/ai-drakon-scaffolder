---
tags:
  - domain:ux
  - status:active
  - format:report
created: 2026-05-26
updated: 2026-05-28
tier: 3
title: "Промпт 27: Інтерфейс пайплайну"
lang: uk
---

# Промпт 27: Інтерфейс пайплайну — Панелі аналізу та генерації коду

## Що необхідно реалізувати

Дві нові панелі інтерфейсу користувача (UI), які підключаються до існуючих кінцевих точок пайплайну на бекенді:
- `POST /v1/pipeline/analyze` → Pipeline A (код → DRAKON IR)
- `POST /v1/pipeline/generate` → Pipeline B (DRAKON IR → код)
- `GET /v1/pipeline/status/{job_id}` → опитування результату виконання завдання

Обидва ендпоінти вимагають авторизації JWT. Воркер виконує їхнє проксіювання. Патерн ідентичний до існуючого процесу генератора документів у `src/routes/docs.tsx`.

---

## Файл 1: `src/lib/pipeline-api.ts` (НОВИЙ)

```typescript
const workerUrl = () =>
  (typeof window !== "undefined" && (window as any).__ENV_WORKER_URL__) ||
  import.meta.env.VITE_WORKER_URL ||
  "https://drakon-mcp-worker.maxfraieho.workers.dev";

function authHeaders(): Record<string, string> {
  const jwt = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;
  return {
    "Content-Type": "application/json",
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
  };
}

export interface PipelineJob {
  job_id: string;
}

export interface AnalyzeResult {
  drakon_ir: Array<{
    name: string;
    params: string;
    items: Record<string, unknown>;
    error?: string;
  }>;
  tree_level: string;
  cyclomatic_complexity: number;
  validation_errors: string[];
}

export interface GenerateResult {
  code: string;
  language: string;
  syntax_errors: string[];
  iterations: number;
}

export interface JobStatus<T = unknown> {
  job_id: string;
  status: "pending" | "running" | "done" | "error";
  result: T;
  error: string;
}

export async function startAnalysis(source_code: string, file_path = "module.py"): Promise<PipelineJob> {
  const res = await fetch(`${workerUrl()}/v1/pipeline/analyze`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ source_code, file_path }),
  });
  if (!res.ok) throw new Error(`analyze HTTP ${res.status}`);
  return res.json();
}

export async function startGeneration(drakon_ir: object, language: string, description = ""): Promise<PipelineJob> {
  const res = await fetch(`${workerUrl()}/v1/pipeline/generate`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ drakon_ir, description, language }),
  });
  if (!res.ok) throw new Error(`generate HTTP ${res.status}`);
  return res.json();
}

export async function pollJob<T = unknown>(job_id: string): Promise<JobStatus<T>> {
  const res = await fetch(`${workerUrl()}/v1/pipeline/status/${job_id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`status HTTP ${res.status}`);
  return res.json();
}
```

---

## Файл 2: `src/components/pipeline/CodeAnalysisPanel.tsx` (НОВИЙ)

Ця панель відображається як права бічна колонка, що згортається, на сторінці DiagramsPage.

Властивості (Props):
```typescript
interface CodeAnalysisPanelProps {
  open: boolean;
  onClose: () => void;
  onImportIr: (ir: { name: string; params: string; items: Record<string, unknown> }) => void;
}
```

Поведінка:
- Містить текстову область (textarea) для вихідного коду Python (моноширинний шрифт, мінімум 8 рядків, можливість зміни розміру).
- Містить текстове поле для шляху до файлу (placeholder "module.py", необов'язкове).
- Містить кнопку "Аналізувати" (первинна, колір amber).
- Під час виконання: на кнопці відображається індикатор завантаження (spinner) + лічильник витраченого часу (аналогічно до патерну `setInterval` у docs.tsx).
- Після завершення: відображається список проаналізованих функцій, кожна у вигляді окремого рядка: `function_name (CC: N) ✓` або `function_name — N помилок`.
- Кожен рядок із валідною функцією має ghost-кнопку "↓ Імпортувати", яка викликає `onImportIr(ir)`.
- У разі помилки: червоне повідомлення про помилку + кнопка "Повторити".
- Кнопка "Новий аналіз" після завершення скидає стан панелі.

Логіка опитування (polling): `setInterval(3000)` для статусу завдання під час виконання — аналогічно до патерну useEffect у docs.tsx.

Макет: `flex flex-col h-full bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] w-[380px] shrink-0`

Заголовок: Мітка `"Аналіз коду"` (у верхньому регістрі, трекінг, моноширинний, приглушений) + кнопка закриття (іконка X, ghost).

Використовуйте JetBrains Mono (клас `font-mono`) для текстової області коду та назв функцій у результатах.

---

## Файл 3: `src/components/pipeline/CodeGenerationPanel.tsx` (НОВИЙ)

Ця панель відображається як нижній висувний ящик (drawer), що згортається, в області редактора діаграм.

Властивості (Props):
```typescript
interface CodeGenerationPanelProps {
  open: boolean;
  onClose: () => void;
  diagramIr: object | null;  // IR поточної діаграми
}
```

Поведінка:
- Містить сегментований перемикач мови: "Python" | "TypeScript" | "JavaScript" (кнопки, виділення amber для активної мови, за замовчуванням "python").
- Містить необов'язкову текстову область опису (1 рядок, placeholder "Опис поведінки (необов'язково)").
- Містить кнопку "Генерувати" (первинна, колір amber) — заблокована, якщо `diagramIr` дорівнює null.
- Під час виконання: spinner + лічильник витраченого часу + необов'язковий бейдж "Ітерація N/3" (показує `result.iterations` з проміжних відповідей опитування, якщо доступно).
- Після завершення: відображається блок коду:
  - `<pre><code>` з класом `font-mono text-xs bg-[var(--bg-base)] p-3 rounded overflow-auto max-h-[200px] w-full`.
  - Кнопка "Копіювати" (іконка + текст, ghost, у правому верхньому кутку).
  - Бейдж статусу: `syntax: ✓` (зелений) або `syntax: N помилок` (червоний).
  - Кнопка "Перегенерувати" (ghost, маленька) + текстове посилання "Закрити".
- У разі помилки: червоне повідомлення про помилку + кнопка "Повторити".

Логіка опитування (polling): такий самий патерн `setInterval(3000)`.

Макет: `flex flex-col bg-[var(--bg-surface)] border-t border-[var(--border-subtle)]` з фіксованою висотою `h-[280px]` у відкритому стані, з анімацією згортання.

Заголовок: Мітка `"Генерувати код"` + індикатор активної мови + кнопка закриття.

---

## Зміни у `src/pages/DiagramsPage.tsx`

1. Імпортуйте `CodeAnalysisPanel` та `CodeGenerationPanel`.
2. Додайте стан:
   ```typescript
   const [analysisOpen, setAnalysisOpen] = useState(false);
   const [generationOpen, setGenerationOpen] = useState(false);
   ```
3. В області списку діаграм / панелі інструментів додайте дві ghost-кнопки:
   ```tsx
   <Button variant="ghost" size="sm" onClick={() => setAnalysisOpen(true)}>
     <ScanCode className="h-4 w-4 mr-1.5" /> Аналізувати код
   </Button>
   <Button variant="ghost" size="sm" onClick={() => setGenerationOpen(true)} disabled={!selectedDiagram}>
     <Code2 className="h-4 w-4 mr-1.5" /> Генерувати код
   </Button>
   ```
   Використовуйте іконки з lucide-react: `ScanSearch` для аналізу, `Code2` для генерації.

4. Обгорніть основну контентну область у flex-рядок, коли `analysisOpen`:
   ```tsx
   <div className="flex flex-1 min-h-0">
     <div className="flex-1 min-w-0">
       {/* існуючий контент діаграм */}
     </div>
     {analysisOpen && (
       <CodeAnalysisPanel
         open={analysisOpen}
         onClose={() => setAnalysisOpen(false)}
         onImportIr={(ir) => { /* імпортувати ir як нову діаграму */ }}
       />
     )}
   </div>
   ```

5. Обгорніть область редактора діаграм у flex-колонку, коли `generationOpen`:
   ```tsx
   <div className="flex flex-col flex-1 min-h-0">
     <div className="flex-1 min-h-0">
       {/* існуючий редактор */}
     </div>
     {generationOpen && selectedDiagram && (
       <CodeGenerationPanel
         open={generationOpen}
         onClose={() => setGenerationOpen(false)}
         diagramIr={selectedDiagram.items ?? null}
       />
     )}
   </div>
   ```

Для `onImportIr`: викликайте `upsertDiagramInStorage` (яка вже використовується в DiagramsPage) з імпортованим IR, а потім викликайте `setSelectedDiagram` для її відкриття.

---

## Очищення: видалення вкладки "Файли"

У `src/routes/docs.tsx`:
1. Видаліть опцію `"files"` із типу `docsTab`: змініть на `"generator" | "notes" | "graph"`.
2. Видаліть `<TabsTrigger value="files">` та `<TabsContent value="files">`.
3. Видаліть імпорт `DocsFilesTab`, якщо він більше ніде не використовується.
4. У `NotesTab.tsx` додайте поле пошуку над деревом сайдбару:
   - Додайте `const [sidebarSearch, setSidebarSearch] = useState("")`.
   - Додайте `<Input>` з `placeholder="Пошук…"` у верхній частині сайдбару (над деревом, під заголовком "Документи" та кнопками панелі інструментів).
   - Передайте `sidebarSearch` як фільтр у `SidebarTreeNode` — цей компонент уже підтримує патерн пропсу `searchQuery` на основі DocsFilesTab (реалізуйте таку ж логіку `nodeMatchesSearch` інлайново або винесіть у спільну утиліту).
   - Додайте загальний лічильник нотаток: `<span className="text-[10px] text-muted-foreground">{flattenTree(tree).length} документів</span>` поруч із полем пошуку.

Ця міграція переносить єдину унікальну функцію вкладки "Файли" (пошук + лічильник) у сайдбар, де також можливе редагування, усуваючи проблему незручного перемикання вкладки.

---

## НЕ змінювати

- Структуру навігації `AppHeader`
- Токени дизайну Precision Dark
- Гарячі клавіші `NoteEditor`
- Вкладку графу та її логіку `handleGraphNodeClick` → `focusSlug` → "Документи"
- Вкладку генератора документів
- Будь-який код панелі чату з агентами

---

## Семантичні зв'язки

**Цей документ є частиною:** [[ux-audit/_INDEX]]
**Цей документ пов'язаний з:**
- [[ux-audit/audit]] — UI/UX Аудит платформи AI-DRAKON
- [[ux-audit/stitch-prompt]] — Промпт для склеювання (Stitch) інтерфейсу
**Читати далі:** [[ux-audit/risks]]
