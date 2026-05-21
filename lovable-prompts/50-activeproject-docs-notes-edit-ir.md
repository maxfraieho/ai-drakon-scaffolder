# Prompt 50 — Fix activeProject in Docs/Notes + Edit in DRAKON IR button

## Context

Stack: React 18 + Vite + TanStack Router + shadcn/ui + Tailwind.
Critical: every file change must be applied to BOTH `src/` AND `.lovable/src/`.

---

## Fix 1: Docs/Notes/Graph tabs must react to activeProject

### Problem
`src/lib/garden/notesApi.ts` calls `/v1/notes/list`, `/v1/notes/graph` etc. without a `?project=` param.
`src/components/docs/DocsFilesTab.tsx` and `NotesGraphTab.tsx` do not use `useProject()`.
Result: switching active project in ProjectSelector has no effect on Docs/Notes/Graph tabs.

### Fix in `src/lib/garden/notesApi.ts` AND `.lovable/src/lib/garden/notesApi.ts`

Add optional `project?: string` parameter to these functions and append `?project=...` to URLs when truthy:

- `fetchNotesTree(project?: string)` — append `&project=${encodeURIComponent(project)}` to `/v1/notes/list?flat=false`
- `fetchNote(slug: string, project?: string)` — append `&project=${encodeURIComponent(project)}` to `/v1/notes/get?slug=...`
- `fetchNotesGraph(project?: string)` — append `?project=${encodeURIComponent(project)}` to `/v1/notes/graph`
- `saveNote(payload, project?: string)` — add `project` field to the JSON body
- `deleteNote(slug: string, project?: string)` — add `project` field to the JSON body

Only append when `project` is truthy.

### Fix in `src/components/docs/DocsFilesTab.tsx` AND `.lovable/src/components/docs/DocsFilesTab.tsx`

1. Add: `import { useProject } from "@/context/ProjectContext";`
2. Inside component: `const { activeProject } = useProject();`
3. Pass `activeProject?.slug` to every `fetchNotesTree(...)` and `fetchNote(...)` call
4. Add `activeProject?.slug` to useEffect dependency arrays so data re-fetches on project switch

### Fix in `src/components/docs/NotesGraphTab.tsx` AND `.lovable/src/components/docs/NotesGraphTab.tsx`

1. Add: `import { useProject } from "@/context/ProjectContext";`
2. Inside component: `const { activeProject } = useProject();`
3. Pass `activeProject?.slug` to `fetchNotesGraph(...)`
4. Add `activeProject?.slug` to the useEffect dependency array

---

## Fix 2: "Edit in DRAKON IR" button in DiagramsPage

### Goal
When a visual DRAKON diagram is selected in `/diagrams`, a one-click button converts it to IR and opens it in the pipeline IR editor at `/pipelines`, auto-selecting the pipeline by name.

### Changes in `src/pages/DiagramsPage.tsx` AND `.lovable/src/pages/DiagramsPage.tsx`

**Add state:**
```typescript
const [editingAsIr, setEditingAsIr] = useState(false);
```

**Add handler** (after `handleSaveAsPipeline`):
```typescript
const handleEditInIr = async () => {
  if (!selectedDiagram || currentDiagramIsIr) return;
  setEditingAsIr(true);
  try {
    const { convertDiagramToIr } = await import("@/lib/htse/diagram-to-ir");
    const { savePipeline } = await import("@/lib/graph-pipeline-api");
    const irDiagram = convertDiagramToIr(selectedDiagram.diagram);
    const slug = selectedDiagram.name
      .trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    await savePipeline(slug, irDiagram);
    localStorage.setItem("_pending_open_pipeline_name", slug);
    navigate({ to: "/pipelines" });
  } catch (e) {
    toast.error("Помилка: " + (e instanceof Error ? e.message : "unknown"));
  } finally {
    setEditingAsIr(false);
  }
};
```

**Add button** next to the existing "Save as Pipeline" button, visible only when `selectedDiagram && !currentDiagramIsIr`:
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleEditInIr}
  disabled={editingAsIr}
  title="Редагувати як DRAKON IR пайплайн"
>
  {editingAsIr
    ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
    : <FileCode2 className="h-3 w-3 mr-1" />}
  IR
</Button>
```

Add `Loader2, FileCode2` to the lucide-react import.

### Changes in `src/components/pipelines/PipelinesPage.tsx` AND `.lovable/src/components/pipelines/PipelinesPage.tsx`

Existing state: `const [selected, setSelected] = useState<string | null>(null)` and `handleSelect(name)`.

Add `useEffect` that fires once on mount to auto-select pending pipeline:
```typescript
useEffect(() => {
  const pendingName = localStorage.getItem("_pending_open_pipeline_name");
  if (!pendingName) return;
  localStorage.removeItem("_pending_open_pipeline_name");
  // pipelines loads async — try immediately then retry after load
  const trySelect = (list: PipelineInfo[]) => {
    const target = list.find((p) => p.name === pendingName);
    if (target) handleSelect(target.name);
  };
  trySelect(pipelines);
  const t = setTimeout(() => {
    setPipelines((current) => { trySelect(current); return current; });
  }, 900);
  return () => clearTimeout(t);
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

---

## CRITICAL: Dual-path sync rule
Apply ALL changes to BOTH `src/` and `.lovable/src/`.
