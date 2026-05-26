---
title: "Prompt 27: Pipeline UI — Code Analysis + Code Generation panels"
type: reference
tags: [drakon, pipeline, security, cloudflare, frontend]
status: active
created: 2026-05-26
updated: 2026-05-26
---

# Prompt 27: Pipeline UI — Code Analysis + Code Generation panels

## What to implement

Two new UI panels that connect to the existing backend pipeline endpoints:
- `POST /v1/pipeline/analyze` → Pipeline A (code → DRAKON IR)
- `POST /v1/pipeline/generate` → Pipeline B (DRAKON IR → code)
- `GET /v1/pipeline/status/{job_id}` → poll job result

Both endpoints require JWT auth. The Worker proxies them. Pattern is identical to the existing docs generator job flow in `src/routes/docs.tsx`.

---

## File 1: `src/lib/pipeline-api.ts` (NEW)

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

## File 2: `src/components/pipeline/CodeAnalysisPanel.tsx` (NEW)

This panel appears as a right-side collapsible column in DiagramsPage.

Props:
```typescript
interface CodeAnalysisPanelProps {
  open: boolean;
  onClose: () => void;
  onImportIr: (ir: { name: string; params: string; items: Record<string, unknown> }) => void;
}
```

Behavior:
- Has a textarea for Python source code (monospaced, min 8 rows, resizable)
- Has a text input for file path (placeholder "module.py", optional)
- Has an "Аналізувати" button (primary, amber)
- When running: button shows spinner + elapsed counter (same `setInterval` pattern as docs.tsx)
- On done: show a list of analyzed functions — each as a row: `function_name (CC: N) ✓` or `function_name — N помилок`
- Each valid function row has a ghost "↓ Імпортувати" button that calls `onImportIr(ir)`
- On error: red message + "Повторити" button
- "Новий аналіз" button after done resets the panel

Poll logic: `setInterval(3000)` on job status while running — same pattern as docs.tsx useEffect.

Layout: `flex flex-col h-full bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] w-[380px] shrink-0`

Header: `"Аналіз коду"` label (uppercase tracking, monospaced, muted) + close button (X icon, ghost)

Use JetBrains Mono (class `font-mono`) for code textarea and function names in results.

---

## File 3: `src/components/pipeline/CodeGenerationPanel.tsx` (NEW)

This panel appears as a bottom collapsible drawer in the diagram editor area.

Props:
```typescript
interface CodeGenerationPanelProps {
  open: boolean;
  onClose: () => void;
  diagramIr: object | null;  // current diagram's IR
}
```

Behavior:
- Has a segmented language selector: "Python" | "TypeScript" | "JavaScript" (buttons, amber highlight on active, default "python")
- Has an optional description textarea (1 row, placeholder "Опис поведінки (необов'язково)")
- Has a "Генерувати" button (primary, amber) — disabled if `diagramIr` is null
- When running: spinner + elapsed counter + optional "Ітерація N/3" badge (show `result.iterations` from intermediate polls if available, or just show spinner)
- On done: show a code block:
  - `<pre><code>` with class `font-mono text-xs bg-[var(--bg-base)] p-3 rounded overflow-auto max-h-[200px] w-full`
  - "Копіювати" button (icon + text, ghost, top-right)
  - Status badge: `syntax: ✓` (green) or `syntax: N помилок` (red)
  - "Перегенерувати" button (ghost, small) + "Закрити" text link
- On error: red message + "Повторити" button

Poll logic: same `setInterval(3000)` pattern.

Layout: `flex flex-col bg-[var(--bg-surface)] border-t border-[var(--border-subtle)]` with fixed height `h-[280px]` when open, collapsible via animation.

Header: `"Генерувати код"` label + language active indicator + close button.

---

## Changes to `src/pages/DiagramsPage.tsx`

1. Import `CodeAnalysisPanel` and `CodeGenerationPanel`
2. Add state:
   ```typescript
   const [analysisOpen, setAnalysisOpen] = useState(false);
   const [generationOpen, setGenerationOpen] = useState(false);
   ```
3. In the diagram list/toolbar area, add two ghost buttons:
   ```tsx
   <Button variant="ghost" size="sm" onClick={() => setAnalysisOpen(true)}>
     <ScanCode className="h-4 w-4 mr-1.5" /> Аналізувати код
   </Button>
   <Button variant="ghost" size="sm" onClick={() => setGenerationOpen(true)} disabled={!selectedDiagram}>
     <Code2 className="h-4 w-4 mr-1.5" /> Генерувати код
   </Button>
   ```
   Use lucide-react icons: `ScanSearch` for analysis, `Code2` for generation.

4. Wrap the main content area in a flex row when `analysisOpen`:
   ```tsx
   <div className="flex flex-1 min-h-0">
     <div className="flex-1 min-w-0">
       {/* existing diagram content */}
     </div>
     {analysisOpen && (
       <CodeAnalysisPanel
         open={analysisOpen}
         onClose={() => setAnalysisOpen(false)}
         onImportIr={(ir) => { /* import ir as new diagram */ }}
       />
     )}
   </div>
   ```

5. Wrap the diagram editor area in a flex column when `generationOpen`:
   ```tsx
   <div className="flex flex-col flex-1 min-h-0">
     <div className="flex-1 min-h-0">
       {/* existing editor */}
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

For `onImportIr`: call `upsertDiagramInStorage` (already used in DiagramsPage) with the imported IR, then call `setSelectedDiagram` to open it.

---

## Cleanup change: "Файли" tab → remove

In `src/routes/docs.tsx`:
1. Remove the `"files"` option from the `docsTab` type: change to `"generator" | "notes" | "graph"`
2. Remove `<TabsTrigger value="files">` and `<TabsContent value="files">`
3. Remove the `DocsFilesTab` import if no longer used elsewhere
4. In `NotesTab.tsx`, add a search input above the sidebar tree:
   - Add `const [sidebarSearch, setSidebarSearch] = useState("")` 
   - Add an `<Input>` with `placeholder="Пошук…"` at the top of the sidebar (above the tree, below the "Документи" header and toolbar buttons)
   - Pass `sidebarSearch` as a filter to `SidebarTreeNode` — the `SidebarTreeNode` already supports a `searchQuery` prop pattern based on DocsFilesTab (implement same `nodeMatchesSearch` logic inline or extract to a shared util)
   - Add total note count: `<span className="text-[10px] text-muted-foreground">{flattenTree(tree).length} документів</span>` next to the search input

This migration moves the only unique feature of "Файли" (search + count) into the sidebar where editing is also possible, eliminating the tab-switch teleportation issue.

---

## DO NOT change

- AppHeader navigation structure
- Precision Dark design tokens
- NoteEditor keyboard shortcuts
- The graph tab and its handleGraphNodeClick → focusSlug flow
- The docs generator tab
- Any agent chat panel code
