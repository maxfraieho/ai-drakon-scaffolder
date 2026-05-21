# Prompt 51 — DiagramsPage: Direct Editor + IR Inline + Wheel Zoom

## Context
Stack: React 18 + Vite + TanStack Router + shadcn/ui + Tailwind.
Critical: every change must be applied to BOTH `src/` AND `.lovable/src/`.

---

## Goal
When a diagram is selected in DiagramsPage — open it immediately in DrakonEditor (not DrakonViewer preview). No "Edit" navigation to `/diagram/editor`. The editor lives inline in the right panel.

---

## Change 1: DiagramsPage — replace DrakonViewer with DrakonEditor inline

In `src/pages/DiagramsPage.tsx` AND `.lovable/src/pages/DiagramsPage.tsx`:

### 1a. Replace import
Remove:
```typescript
import { DrakonViewer } from "@/components/drakon/DrakonViewer";
```
Add:
```typescript
import { DrakonEditor } from "@/components/drakon/DrakonEditor";
```

### 1b. Remove openInEditor — no longer needed
Delete the `openInEditor` function entirely (it navigated to `/diagram/editor`).

### 1c. Add IR sheet state
```typescript
const [irSheetOpen, setIrSheetOpen] = useState(false);
const [irSheetIr, setIrSheetIr] = useState<IrDiagram | null>(null);
```
Add import: `import type { IrDiagram } from "@/lib/graph-pipeline-api";`
Add import: `import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";`
Add import: `import { PipelineDrakonView } from "@/components/pipelines/PipelineDrakonView";`

### 1d. Add handleEditInIr handler
```typescript
const handleEditInIr = async () => {
  if (!selectedDiagram || currentDiagramIsIr) return;
  try {
    const { convertDiagramToIr } = await import("@/lib/htse/diagram-to-ir");
    const ir = convertDiagramToIr(selectedDiagram.diagram);
    setIrSheetIr(ir);
    setIrSheetOpen(true);
  } catch (e) {
    toast.error("Помилка конвертації IR");
  }
};
```

### 1e. Replace DrakonViewer JSX with DrakonEditor
Find the JSX block that renders `<DrakonViewer ... />` and replace it with:
```tsx
<DrakonEditor
  key={selectedDiagram.id}
  diagram={selectedDiagram.diagram as unknown as import("@/types/drakonwidget").DrakonDiagram}
  diagramId={selectedDiagram.id}
  onSaveOverride={async (diagram) => {
    const updated = {
      ...selectedDiagram,
      diagram: diagram as unknown as typeof selectedDiagram.diagram,
      updatedAt: new Date().toISOString(),
    };
    upsertDiagramInStorage(updated);
    setSelectedDiagram(updated);
    return true;
  }}
/>
```

### 1f. Update CanvasToolbar props
Change the `onEdit` prop:
- Remove: `onEdit={selectedDiagram && !currentDiagramIsIr ? () => openInEditor(selectedDiagram) : undefined}`
- Add: `onEditInIr={selectedDiagram && !currentDiagramIsIr ? handleEditInIr : undefined}`

### 1g. Add IR Sheet after the existing Save Pipeline Dialog
```tsx
<Sheet open={irSheetOpen} onOpenChange={setIrSheetOpen}>
  <SheetContent side="right" className="w-full sm:max-w-3xl p-0 flex flex-col">
    <SheetHeader className="px-4 pt-4 pb-2 border-b">
      <SheetTitle className="font-mono text-sm">
        IR — {selectedDiagram?.name}
      </SheetTitle>
    </SheetHeader>
    <div className="flex-1 overflow-auto">
      {irSheetIr && (
        <PipelineDrakonView
          ir={irSheetIr}
          pipelineName={selectedDiagram?.name ?? ""}
          onIrChange={(updated) => setIrSheetIr(updated)}
        />
      )}
    </div>
  </SheetContent>
</Sheet>
```

---

## Change 2: CanvasToolbar — add onEditInIr prop

In `src/components/workspace/CanvasToolbar.tsx` AND `.lovable/src/components/workspace/CanvasToolbar.tsx`:

### 2a. Add to CanvasToolbarProps interface
```typescript
onEditInIr?: () => void;
```

### 2b. Add to destructured props
```typescript
onEditInIr,
```

### 2c. Replace existing onEdit button with onEditInIr button
Find the button that calls `onEdit` (currently shows "Edit" or pencil icon) and change it to:
```tsx
{onEditInIr && (
  <Button
    variant="outline"
    size="sm"
    onClick={onEditInIr}
    title="Переглянути/редагувати як DRAKON IR"
  >
    <FileCode2 className="h-3 w-3 mr-1" />
    IR
  </Button>
)}
```
Add `FileCode2` to lucide-react imports.
Remove `onEdit` and its button entirely from props and JSX.

---

## Change 3: DrakonViewer — mouse wheel zoom

In `src/components/drakon/DrakonViewer.tsx` AND `.lovable/src/components/drakon/DrakonViewer.tsx`:

Add `useCallback` to imports if not present.

Add wheel handler after existing zoom functions:
```typescript
const handleWheel = useCallback((e: WheelEvent) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
  const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta));
  if (newZoom === zoom) return;
  setZoom(newZoom);
  widgetRef.current?.setZoom(newZoom);
  fullscreenWidgetRef.current?.setZoom(newZoom);
}, [zoom]);
```

Attach to container div (the div with `ref={containerRef}`) via useEffect:
```typescript
useEffect(() => {
  const el = containerRef.current;
  if (!el) return;
  el.addEventListener("wheel", handleWheel, { passive: false });
  return () => el.removeEventListener("wheel", handleWheel);
}, [handleWheel]);
```

---

## Change 4: DrakonEditor — mouse wheel zoom

In `src/components/drakon/DrakonEditor.tsx` AND `.lovable/src/components/drakon/DrakonEditor.tsx`:

Find the widget container div (the main canvas area, not the toolbar). Add a wheel useEffect similar to DrakonViewer:

```typescript
useEffect(() => {
  const el = /* ref to widget container div */;
  if (!el) return;
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const STEP = 2000;
    const MIN = 4000;
    const MAX = 30000;
    setZoomLevel((prev) => {
      const next = e.deltaY > 0
        ? Math.max(MIN, prev - STEP)
        : Math.min(MAX, prev + STEP);
      widget?.setZoom(next);
      return next;
    });
  };
  el.addEventListener("wheel", handleWheel, { passive: false });
  return () => el.removeEventListener("wheel", handleWheel);
}, [widget]);
```

Use the existing ref that wraps the widget canvas area (look for the div that has the widget rendered into it).

---

## CRITICAL: Dual-path sync rule
Apply ALL changes to BOTH `src/` and `.lovable/src/`.
