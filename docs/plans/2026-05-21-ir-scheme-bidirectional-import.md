---
title: "DRAKON IR ↔ Scheme Bidirectional Import — Implementation Plan"
type: plan
tags: [drakon, pipeline, agent, ir-format, frontend]
status: active
created: 2026-05-21
updated: 2026-05-26
---

# DRAKON IR ↔ Scheme Bidirectional Import — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable bidirectional import between /pipelines (DRAKON IR JSON) and /diagrams (visual DRAKON editor), using IrDiagram as the single canonical format.

**Architecture:** Extend `IrDiagram` with optional `meta` field for pipeline-specific data. Add "Open in Diagrams" button to PipelineDrakonView that converts IrDiagram → DrakonDiagram → localStorage → navigate /diagrams. Add "Save as Pipeline" button to CanvasToolbar that converts DrakonDiagram → IrDiagram → PUT to architect-agent.

**Tech Stack:** TypeScript/React, TanStack Router, `ir-to-diagram.ts` / `diagram-to-ir.ts` (already in codebase), `upsertDiagramInStorage`, `savePipeline` API.

---

### Task 1: Extend IrDiagram with `meta` field

**Files:**
- Modify: `.lovable/src/lib/htse/ir-types.ts`
- Modify: `src/lib/htse/ir-types.ts`

**Step 1:** In both files, add `meta` to `IrDiagram`:

```typescript
export interface IrDiagramMeta {
  state_class?: string;
  node_module?: string;
  router_module?: string;
  description?: string;
  source?: string;
}

export interface IrDiagram {
  name: string;
  access: "public" | "private";
  params: string[];
  items: Record<string, IrItem>;
  meta?: IrDiagramMeta;  // ADD THIS LINE
}
```

**Step 2:** Verify TypeScript compiles (no errors in the imports of IrDiagram).

**Step 3:** Commit:
```bash
git add .lovable/src/lib/htse/ir-types.ts src/lib/htse/ir-types.ts
git commit -m "feat(ir): add meta field to IrDiagram for pipeline metadata"
```

---

### Task 2: Migrate `graph-pipeline-api.ts` to use IrDiagram

**Files:**
- Modify: `.lovable/src/lib/graph-pipeline-api.ts`
- Modify: `src/lib/graph-pipeline-api.ts`

**Step 1:** Replace `DrakonIR` with `IrDiagram` import and usage in both files:

```typescript
// REMOVE:
// export interface DrakonIRItem { ... }
// export interface DrakonIR { ... }

// ADD at top:
import type { IrDiagram } from "@/lib/htse/ir-types";
export type { IrDiagram };  // re-export for consumers

// UPDATE all uses of DrakonIR → IrDiagram
// listPipelines, getPipeline, savePipeline signatures stay same but type changes:
export async function savePipeline(name: string, ir: IrDiagram): Promise<void> { ... }
```

**Step 2:** Update `PipelinesPage.tsx` and `PipelineDrakonView.tsx` to import `IrDiagram` from `graph-pipeline-api` instead of `DrakonIR`.

**Step 3:** Verify no TypeScript errors. The `ir.items` values have compatible fields (IrItem is a superset of old DrakonIRItem).

**Step 4:** Commit:
```bash
git add .lovable/src/lib/graph-pipeline-api.ts src/lib/graph-pipeline-api.ts
git add .lovable/src/components/pipelines/
git commit -m "feat(pipeline): use IrDiagram as canonical type replacing DrakonIR"
```

---

### Task 3: Migrate .drakon.json files to IrDiagram format (backend)

**Files:**
- Modify: `services/architect-agent/pipelines/*.drakon.json` (all 5 files)

**Step 1:** Run migration script on server (192.168.3.184):
```bash
python3 /tmp/migrate_pipeline_ir.py
```

Script content (`/tmp/migrate_pipeline_ir.py`):
```python
import json, os, glob

PIPELINES = "/home/vokov/workspace/ai-drakon-setup/services/architect-agent/pipelines"

for path in glob.glob(f"{PIPELINES}/*.drakon.json"):
    with open(path) as f:
        d = json.load(f)
    
    # Build meta from schema + extra fields
    meta = {}
    if "schema" in d:
        meta.update(d.pop("schema"))
    if "description" in d:
        meta["description"] = d.pop("description")
    if "source" in d:
        meta["source"] = d.pop("source")
    
    # Add IrDiagram required fields if missing
    if "access" not in d:
        d["access"] = "public"
    if "params" not in d:
        d["params"] = []
    if meta:
        d["meta"] = meta
    
    # Reorder keys: name, access, params, items, meta
    ordered = {
        "name": d["name"],
        "access": d.get("access", "public"),
        "params": d.get("params", []),
        "items": d["items"],
    }
    if meta:
        ordered["meta"] = meta
    
    with open(path, "w") as f:
        json.dump(ordered, f, ensure_ascii=False, indent=2)
    print(f"Migrated: {os.path.basename(path)}")
```

**Step 2:** Verify each file looks correct (has `access`, `params`, `items`, optional `meta`).

**Step 3:** Test via API: `curl http://localhost:8766/graph-pipelines/pipeline_a` — should return new format.

**Step 4:** Commit:
```bash
cd /home/vokov/workspace/ai-drakon-setup
git add services/architect-agent/pipelines/
git commit -m "feat(pipelines): migrate .drakon.json to IrDiagram canonical format"
git push origin main && git push drakon-diagram-flow main
```

---

### Task 4: Add "Відкрити в Схемах" button in PipelineDrakonView

**Files:**
- Modify: `.lovable/src/components/pipelines/PipelineDrakonView.tsx`
- Modify: `src/components/pipelines/PipelineDrakonView.tsx`

**Step 1:** Add imports at top of file:
```typescript
import { useNavigate } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { convertIrToDiagram } from "@/lib/htse/ir-to-diagram";
import { upsertDiagramInStorage } from "@/lib/diagram-storage";
import type { Diagram } from "@/types/drakon";
```

**Step 2:** Add `navigate` hook inside component:
```typescript
const navigate = useNavigate();
```

**Step 3:** Add handler function:
```typescript
const handleOpenInDiagrams = () => {
  try {
    const drakonDiagram = convertIrToDiagram(ir);
    const diagramId = `pipeline-${pipelineName}`;
    const stored: Diagram = {
      id: diagramId,
      name: ir.name,
      folderId: "__pipelines__",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      diagram: drakonDiagram,
    };
    upsertDiagramInStorage(stored);
    localStorage.setItem("_pending_open_diagram_id", diagramId);
    navigate({ to: "/diagrams" });
  } catch (e) {
    toast.error("Не вдалось конвертувати у схему");
  }
};
```

**Step 4:** Add button to the toolbar row (near Run/Stop buttons):
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleOpenInDiagrams}
  className="font-mono text-[10px] uppercase tracking-wider"
  title="Відкрити в редакторі схем"
>
  <ExternalLink className="h-3 w-3 mr-1.5" />
  Схеми
</Button>
```

**Step 5:** Verify: clicking button saves diagram to localStorage and navigates to /diagrams.

**Step 6:** Commit:
```bash
git add .lovable/src/components/pipelines/PipelineDrakonView.tsx
git add src/components/pipelines/PipelineDrakonView.tsx
git commit -m "feat(pipelines): add 'Open in Diagrams' button — converts IR to visual scheme"
```

---

### Task 5: Auto-select imported diagram in DiagramsPage

**Files:**
- Modify: `.lovable/src/pages/DiagramsPage.tsx`
- Modify: `src/pages/DiagramsPage.tsx`

**Step 1:** In `DiagramsPage`, add `useEffect` that runs after diagrams load, reads localStorage flag, and auto-selects:

```typescript
// Add near other useEffects (after diagrams state is set):
useEffect(() => {
  const pendingId = localStorage.getItem("_pending_open_diagram_id");
  if (!pendingId) return;
  localStorage.removeItem("_pending_open_diagram_id");
  
  const all = readDiagramsFromStorage();
  const target = all.find((d) => d.id === pendingId);
  if (target) {
    // Switch to local view mode and select the diagram
    setViewMode("local");
    setSelectedFolderSlug("__pipelines__");
    setSelectedDiagram(target);
  }
}, []);  // runs once on mount
```

**Step 2:** Ensure the `"__pipelines__"` folder is handled — it might need to be added to the folders list if it's not already there. Add a virtual folder display for pipeline-imported diagrams:

```typescript
// In the folders list display, add:
// Virtual folder for pipeline imports (only if exists)
const pipelineDiagrams = readDiagramsFromStorage().filter(d => d.folderId === "__pipelines__");
```

Actually, for simplicity: set `folderId` to the default folder slug (`"general"`) instead of `"__pipelines__"`. Then auto-select just finds the diagram in the default folder.

**Step 3:** Verify: after clicking "Схеми" in /pipelines, the diagram appears selected and visible in /diagrams.

**Step 4:** Commit:
```bash
git add .lovable/src/pages/DiagramsPage.tsx src/pages/DiagramsPage.tsx
git commit -m "feat(diagrams): auto-select imported pipeline diagram on navigation"
```

---

### Task 6: Add "Зберегти як пайплайн" to CanvasToolbar + DiagramsPage

**Files:**
- Modify: `.lovable/src/components/workspace/CanvasToolbar.tsx`
- Modify: `src/components/workspace/CanvasToolbar.tsx`
- Modify: `.lovable/src/pages/DiagramsPage.tsx`
- Modify: `src/pages/DiagramsPage.tsx`

**Step 1:** Add `onSaveAsPipeline?: () => void` prop to `CanvasToolbarProps`:
```typescript
interface CanvasToolbarProps {
  // ... existing props ...
  onSaveAsPipeline?: () => void;
}
```

**Step 2:** Add button in CanvasToolbar JSX (after existing buttons):
```tsx
{onSaveAsPipeline && (
  <button
    type="button"
    onClick={onSaveAsPipeline}
    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--accent-amber)] hover:border-[var(--accent-amber)]/50 transition-colors"
    title="Зберегти як пайплайн"
  >
    <Download className="h-2.5 w-2.5" />
    Пайплайн
  </button>
)}
```

Add `Download` to the lucide-react import.

**Step 3:** In `DiagramsPage.tsx`, add state for the save pipeline modal:
```typescript
const [savePipelineOpen, setSavePipelineOpen] = useState(false);
const [pipelineName, setPipelineName] = useState("");
const [savingPipeline, setSavingPipeline] = useState(false);
```

**Step 4:** Add `handleSaveAsPipeline` function in DiagramsPage:
```typescript
const handleSaveAsPipeline = async () => {
  if (!selectedDiagram || !pipelineName.trim()) return;
  setSavingPipeline(true);
  try {
    const { convertDiagramToIr } = await import("@/lib/htse/diagram-to-ir");
    const { savePipeline } = await import("@/lib/graph-pipeline-api");
    const irDiagram = convertDiagramToIr(selectedDiagram.diagram);
    // Slugify name for API
    const slug = pipelineName.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    await savePipeline(slug, irDiagram);
    setSavePipelineOpen(false);
    setPipelineName("");
    toast.success(`Пайплайн "${slug}" збережено`);
    navigate({ to: "/pipelines" });
  } catch (e) {
    toast.error("Помилка збереження: " + (e instanceof Error ? e.message : "unknown"));
  } finally {
    setSavingPipeline(false);
  }
};
```

**Step 5:** Add modal JSX in DiagramsPage render:
```tsx
<Dialog open={savePipelineOpen} onOpenChange={setSavePipelineOpen}>
  <DialogContent className="sm:max-w-sm">
    <DialogHeader>
      <DialogTitle className="font-mono text-sm">Зберегти як пайплайн</DialogTitle>
    </DialogHeader>
    <div className="py-4">
      <Input
        placeholder="назва_пайплайну"
        value={pipelineName}
        onChange={(e) => setPipelineName(e.target.value)}
        className="font-mono text-sm"
        onKeyDown={(e) => e.key === "Enter" && handleSaveAsPipeline()}
      />
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setSavePipelineOpen(false)}>Скасувати</Button>
      <Button onClick={handleSaveAsPipeline} disabled={!pipelineName.trim() || savingPipeline}>
        {savingPipeline ? "Збереження…" : "Зберегти"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Step 6:** Pass `onSaveAsPipeline` to CanvasToolbar:
```tsx
<CanvasToolbar
  ...existingProps...
  onSaveAsPipeline={selectedDiagram && !currentDiagramIsIr ? () => setSavePipelineOpen(true) : undefined}
/>
```

**Step 7:** Verify end-to-end:
- Open diagram in /diagrams
- Click "Пайплайн" button in toolbar
- Enter name in modal
- Confirm → navigate to /pipelines → new pipeline appears in list

**Step 8:** Commit:
```bash
git add .lovable/src/components/workspace/CanvasToolbar.tsx src/components/workspace/CanvasToolbar.tsx
git add .lovable/src/pages/DiagramsPage.tsx src/pages/DiagramsPage.tsx
git commit -m "feat(diagrams): add 'Save as Pipeline' button — converts visual scheme to DRAKON IR"
git push origin main && git push drakon-diagram-flow main
```

---

### Task 7: End-to-end test and final push

**Step 1:** Test flow A (Pipeline → Diagrams):
1. Go to `/pipelines`
2. Select "Sharon LangGraph Pipeline"
3. Click "Схеми" button
4. Verify: navigated to /diagrams, Sharon diagram selected, nodes visible

**Step 2:** Test flow B (Diagrams → Pipeline):
1. Edit the Sharon diagram in /diagrams
2. Click "Пайплайн" in CanvasToolbar
3. Enter `sharon_consultant_graph_v2`
4. Verify: navigate to /pipelines, new pipeline in list, can be executed

**Step 3:** Test pipeline execution still works after format migration:
```bash
curl http://localhost:8766/graph-pipelines/pipeline_a
curl -X POST http://localhost:8766/graph-pipelines/pipeline_a/execute \
  -H "Content-Type: application/json" -d '{"code":"def hello(): return 42"}'
```

**Step 4:** Final commit:
```bash
git push origin main && git push drakon-diagram-flow main
```
