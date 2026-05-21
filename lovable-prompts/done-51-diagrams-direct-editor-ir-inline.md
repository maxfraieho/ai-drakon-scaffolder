# Prompt 51 — DiagramsPage: Direct Editor + IR Inline + Full-height Layout Fix

## Context
Stack: React 18 + Vite + TanStack Router + shadcn/ui + Tailwind.
Critical: every change must be applied to BOTH `src/` AND `.lovable/src/`.

---

## Goal
1. Clicking a diagram → opens immediately in DrakonEditor (not DrakonViewer preview)
2. DrakonEditor fills full available height — no fixed 500px canvas
3. IR button in toolbar → opens Sheet with PipelineDrakonView
4. Docs/Notes page fits viewport — no scrolling to reach settings

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
Delete the `openInEditor` function (it navigated to `/diagram/editor`).

### 1c. Add IR sheet state
```typescript
const [irSheetOpen, setIrSheetOpen] = useState(false);
const [irSheetIr, setIrSheetIr] = useState<IrDiagram | null>(null);
```
Add: `import type { IrDiagram } from "@/lib/graph-pipeline-api";`
Add: `import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";`
Add: `import { PipelineDrakonView } from "@/components/pipelines/PipelineDrakonView";`

### 1d. Add handleEditInIr
```typescript
const handleEditInIr = async () => {
  if (!selectedDiagram || currentDiagramIsIr) return;
  try {
    const { convertDiagramToIr } = await import("@/lib/htse/diagram-to-ir");
    const ir = convertDiagramToIr(selectedDiagram.diagram);
    setIrSheetIr(ir);
    setIrSheetOpen(true);
  } catch {
    toast.error("Помилка конвертації IR");
  }
};
```

### 1e. Replace DrakonViewer JSX with DrakonEditor
Find `<DrakonViewer ... />` and replace with:
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

The section element wrapping the editor (right panel) must be:
```tsx
<section className="flex flex-1 min-w-0 flex-col overflow-hidden">
```
And the div directly wrapping DrakonEditor must be:
```tsx
<div className="flex flex-1 min-h-0 flex-col overflow-hidden">
```

### 1f. Update CanvasToolbar props
- Remove: `onEdit={...openInEditor...}`
- Add: `onEditInIr={selectedDiagram && !currentDiagramIsIr ? handleEditInIr : undefined}`

### 1g. Add IR Sheet
```tsx
<Sheet open={irSheetOpen} onOpenChange={setIrSheetOpen}>
  <SheetContent side="right" className="w-full sm:max-w-3xl p-0 flex flex-col">
    <SheetHeader className="px-4 pt-4 pb-2 border-b shrink-0">
      <SheetTitle className="font-mono text-sm">
        IR — {selectedDiagram?.name}
      </SheetTitle>
    </SheetHeader>
    <div className="flex-1 min-h-0 overflow-auto">
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

Add to interface:
```typescript
onEditInIr?: () => void;
```
Add to destructured props: `onEditInIr`

Remove `onEdit` prop and its button entirely.

Add button (visible when `onEditInIr` provided):
```tsx
{onEditInIr && (
  <Button variant="outline" size="sm" onClick={onEditInIr} title="DRAKON IR">
    <FileCode2 className="h-3 w-3 mr-1" />
    IR
  </Button>
)}
```
Add `FileCode2` to lucide-react import.

---

## Change 3: DrakonEditor — full-height layout, toolbar at bottom

In `src/components/drakon/DrakonEditor.tsx` AND `.lovable/src/components/drakon/DrakonEditor.tsx`:

### 3a. Remove `height` prop
The `height?: number` prop (default 500) is no longer needed. Remove it from the interface and the destructuring. The editor must fill its container via CSS flex.

### 3b. Fix outer wrapper
The outer `<div className="space-y-3 ...">` must become:
```tsx
<div className={cn('flex flex-col h-full', className)}>
```

### 3c. Top toolbar — shrink-0
The first toolbar div (`<div className="flex flex-wrap items-center gap-2">`) must have `shrink-0`:
```tsx
<div className="flex flex-wrap items-center gap-2 shrink-0 border-b pb-1">
```

### 3d. Canvas area — flex-1
The `<div className="flex flex-col gap-2">` that wraps canvas + bottom icon toolbar must become:
```tsx
<div className="flex flex-col flex-1 min-h-0 gap-2">
```

The canvas container `<div className="relative" ...>` with `style={{ height }}` must become:
```tsx
<div className="relative flex-1 min-h-0">
```
Remove `style={{ height }}` — the canvas fills flex space.

The overlay loader div `style={{ height }}` → remove inline style, use `className="absolute inset-0"`.

The drakon-container: `style={{ height, minHeight: 300 }}` → `className="drakon-container rounded-lg border overflow-hidden h-full"` and remove `style`.

### 3e. Bottom icon toolbar — shrink-0
The `{/* Bottom toolbar with icon buttons */}` div must have `shrink-0`:
```tsx
<div className="w-full overflow-x-auto border rounded-lg bg-background shrink-0">
```

### 3f. Widget render height
In the widget init/render code, when `rect.height` is used:
```typescript
const renderH = Math.max(rect.height, 300); // was: Math.max(rect.height, height)
```
Replace all references to the `height` variable/prop with `rect.height` or `300` as minimum.

---

## Change 4: docs.tsx — fit viewport, no scroll

In `src/routes/docs.tsx` AND `.lovable/src/routes/docs.tsx`:

### 4a. Root div
Change `<div className="min-h-[100dvh] bg-background">` to:
```tsx
<div className="flex h-full flex-col overflow-hidden bg-background">
```

### 4b. Inner content div (contains Tabs)
Wrap the Tabs component so the tab panels are height-constrained:
```tsx
<div className="flex flex-1 min-h-0 flex-col overflow-hidden px-4 pb-4">
  <Tabs ...>
    <TabsList className="shrink-0 ...">...</TabsList>
    <div className="flex-1 min-h-0 overflow-y-auto mt-2">
      <TabsContent ...>...</TabsContent>
      {/* other TabsContent */}
    </div>
  </Tabs>
</div>
```

The tab content panels (Docs files tree, Notes list, Graph) should use `h-full overflow-auto` so they scroll internally, not the whole page.

---

## CRITICAL: Dual-path sync rule
Apply ALL changes to BOTH `src/` and `.lovable/src/`.
