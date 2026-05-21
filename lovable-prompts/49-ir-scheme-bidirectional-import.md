# Prompt 45 — DRAKON IR ↔ Scheme Bidirectional Import

## Context

Implement bidirectional import between /pipelines tab (DRAKON IR JSON) and /diagrams tab (visual DRAKON editor).

Conversion functions already exist:
- `convertIrToDiagram(ir: IrDiagram): DrakonDiagram` — from `@/lib/htse/ir-to-diagram`
- `convertDiagramToIr(diagram: DrakonDiagram): IrDiagram` — from `@/lib/htse/diagram-to-ir`

---

## Change 1: Add `meta` to IrDiagram (ir-types.ts)

In `src/lib/htse/ir-types.ts` AND `.lovable/src/lib/htse/ir-types.ts`, add before the `IrDiagram` interface:

```typescript
export interface IrDiagramMeta {
  state_class?: string;
  node_module?: string;
  router_module?: string;
  description?: string;
  source?: string;
}
```

And add to `IrDiagram`:
```typescript
export interface IrDiagram {
  name: string;
  access: "public" | "private";
  params: string[];
  items: Record<string, IrItem>;
  meta?: IrDiagramMeta;  // ADD THIS
}
```

---

## Change 2: Update graph-pipeline-api.ts to use IrDiagram

In `src/lib/graph-pipeline-api.ts` AND `.lovable/src/lib/graph-pipeline-api.ts`:

1. Remove the `DrakonIRItem` and `DrakonIR` interfaces
2. Add import: `import type { IrDiagram } from "@/lib/htse/ir-types";`
3. Re-export: `export type { IrDiagram };`
4. Update `savePipeline` signature: `async function savePipeline(name: string, ir: IrDiagram)`
5. Update `getPipeline` return type: `Promise<IrDiagram>`

Update consumers:
- In `PipelinesPage.tsx`: change `DrakonIR` → `IrDiagram` import (from `graph-pipeline-api`)
- In `PipelineDrakonView.tsx`: change `DrakonIR` → `IrDiagram` import

---

## Change 3: "Open in Diagrams" button — PipelineDrakonView.tsx

In `src/components/pipelines/PipelineDrakonView.tsx` AND `.lovable/src/components/pipelines/PipelineDrakonView.tsx`:

**Add imports:**
```typescript
import { useNavigate } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { convertIrToDiagram } from "@/lib/htse/ir-to-diagram";
import { upsertDiagramInStorage } from "@/lib/diagram-storage";
import type { Diagram } from "@/types/drakon";
```

**Add inside component:**
```typescript
const navigate = useNavigate();

const handleOpenInDiagrams = () => {
  try {
    const drakonDiagram = convertIrToDiagram(ir);
    const diagramId = `pipeline-${pipelineName}`;
    const stored: Diagram = {
      id: diagramId,
      name: ir.name,
      folderId: "general",
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

**Add button in the toolbar row** (next to Run/Stop buttons):
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleOpenInDiagrams}
  title="Відкрити у редакторі схем"
>
  <ExternalLink className="h-3 w-3 mr-1" />
  Схеми
</Button>
```

---

## Change 4: Auto-select imported diagram — DiagramsPage.tsx

In `src/pages/DiagramsPage.tsx` AND `.lovable/src/pages/DiagramsPage.tsx`:

Add `useEffect` (after existing effects) that fires once on mount:
```typescript
useEffect(() => {
  const pendingId = localStorage.getItem("_pending_open_diagram_id");
  if (!pendingId) return;
  localStorage.removeItem("_pending_open_diagram_id");
  const all = readDiagramsFromStorage();
  const target = all.find((d) => d.id === pendingId);
  if (target) {
    setViewMode("local");
    setSelectedDiagram(target);
  }
}, []); // runs once on mount
```

---

## Change 5: "Save as Pipeline" — CanvasToolbar + DiagramsPage

### CanvasToolbar.tsx (src/ AND .lovable/src/)

Add to `CanvasToolbarProps`:
```typescript
onSaveAsPipeline?: () => void;
```

Add `Download` to lucide-react import.

Add button in toolbar JSX:
```tsx
{onSaveAsPipeline && (
  <button
    type="button"
    onClick={onSaveAsPipeline}
    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--accent-amber)] hover:border-[var(--accent-amber)]/50 transition-colors"
    title="Зберегти схему як DRAKON-пайплайн"
  >
    <Download className="h-2.5 w-2.5" />
    Пайплайн
  </button>
)}
```

### DiagramsPage.tsx (src/ AND .lovable/src/)

Add state:
```typescript
const [savePipelineOpen, setSavePipelineOpen] = useState(false);
const [pipelineNameInput, setPipelineNameInput] = useState("");
const [savingPipeline, setSavingPipeline] = useState(false);
```

Add handler:
```typescript
const handleSaveAsPipeline = async () => {
  if (!selectedDiagram || !pipelineNameInput.trim()) return;
  setSavingPipeline(true);
  try {
    const { convertDiagramToIr } = await import("@/lib/htse/diagram-to-ir");
    const { savePipeline } = await import("@/lib/graph-pipeline-api");
    const irDiagram = convertDiagramToIr(selectedDiagram.diagram);
    const slug = pipelineNameInput.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    await savePipeline(slug, irDiagram);
    setSavePipelineOpen(false);
    setPipelineNameInput("");
    toast.success(`Пайплайн "${slug}" збережено`);
    navigate({ to: "/pipelines" });
  } catch (e) {
    toast.error("Помилка: " + (e instanceof Error ? e.message : "unknown"));
  } finally {
    setSavingPipeline(false);
  }
};
```

Add modal in JSX (e.g., before closing `</div>`):
```tsx
<Dialog open={savePipelineOpen} onOpenChange={setSavePipelineOpen}>
  <DialogContent className="sm:max-w-sm">
    <DialogHeader>
      <DialogTitle className="font-mono text-sm">Зберегти як пайплайн</DialogTitle>
    </DialogHeader>
    <div className="py-4">
      <Input
        placeholder="назва_пайплайну"
        value={pipelineNameInput}
        onChange={(e) => setPipelineNameInput(e.target.value)}
        className="font-mono text-sm"
        onKeyDown={(e) => e.key === "Enter" && handleSaveAsPipeline()}
        autoFocus
      />
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setSavePipelineOpen(false)}>Скасувати</Button>
      <Button onClick={handleSaveAsPipeline} disabled={!pipelineNameInput.trim() || savingPipeline}>
        {savingPipeline ? "Збереження…" : "Зберегти"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Pass prop to CanvasToolbar (find existing `<CanvasToolbar` in render and add):
```tsx
onSaveAsPipeline={selectedDiagram && !currentDiagramIsIr ? () => setSavePipelineOpen(true) : undefined}
```

---

## CRITICAL: Dual-path sync rule
ALL changes must be applied to BOTH:
- `src/` (root)  
- `.lovable/src/` (Lovable build source)

Apply every file change to both paths.
