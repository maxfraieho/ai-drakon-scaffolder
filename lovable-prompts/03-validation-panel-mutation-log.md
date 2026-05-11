# Lovable Prompt 3 — ValidationPanel Integration + Mutation Log UI

> Requires Prompts 1 & 2 applied first.
> These components already exist — this prompt integrates them into the Editor.

## What Already Exists (DO NOT rewrite these)

- `src/components/htse/ValidationPanel.tsx` — props: `{ className?, onApplySafe? }`
  - Already reads from `useDiagramStore`, calls `validateIrRemote`, debounce 3s
  - Has its own collapsible trigger with error badge
- `src/store/useDiagramStore.ts` — already has:
  - `mutationLog: MutationLogEntry[]`
  - `mutationQueue: MutationOp[]`
  - `isProcessingMutation: boolean`
  - `lastMutationResult: MutationResult | null`
  - `enqueueMutation(op: MutationOp): void`

## Task 1: Add Right Sidebar to DiagramEditorPage

Find `DiagramEditorPage.tsx` (or the route that renders the DRAKON editor). Add a collapsible right sidebar.

### State

```tsx
const [sidebarOpen, setSidebarOpen] = useState(false);
```

### Layout change — split editor into main + sidebar

```tsx
<div className="flex h-full overflow-hidden">
  {/* Existing canvas — unchanged */}
  <div className="flex-1 min-w-0 overflow-hidden">
    {/* existing diagram editor content here */}
  </div>

  {/* Right sidebar */}
  <div
    className={cn(
      "flex flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-surface)]",
      "transition-[width] duration-200 overflow-hidden flex-shrink-0",
      sidebarOpen ? "w-80" : "w-0"
    )}
    aria-hidden={!sidebarOpen}
  >
    {sidebarOpen && (
      <>
        <ValidationPanel
          className="flex-shrink-0"
          onApplySafe={(ops) => {
            ops.forEach(op => useDiagramStore.getState().enqueueMutation(op));
          }}
        />
        <MutationLogPanel />
      </>
    )}
  </div>
</div>
```

### Sidebar toggle button — add to existing editor toolbar

```tsx
<button
  onClick={() => setSidebarOpen(v => !v)}
  aria-label={sidebarOpen ? "Close validation panel" : "Open validation panel"}
  aria-pressed={sidebarOpen}
  className="p-2 rounded-[var(--radius-sm)]
             hover:bg-[var(--bg-elevated)] transition-colors duration-150
             active:scale-[0.96] transition-transform
             focus-visible:ring-2 focus-visible:ring-amber-400/50"
>
  <ShieldCheckIcon className="w-4 h-4" aria-hidden="true" />
</button>
```

Transition rule: use `transition-[width]` NOT `transition: all`.

---

## Task 2: Create MutationLogPanel component

Create new file: `src/components/htse/MutationLogPanel.tsx`

```tsx
import { useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { useDiagramStore } from '@/store/useDiagramStore';
import { cn } from '@/lib/utils';

export function MutationLogPanel({ className }: { className?: string }) {
  const { mutationLog, isProcessingMutation, mutationQueue } = useDiagramStore();
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={cn("flex flex-col border-t border-[var(--border-subtle)]", className)}>
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        aria-label="Toggle mutation log"
        className="flex items-center justify-between px-3 py-2
                   hover:bg-[var(--bg-elevated)] transition-colors duration-150
                   focus-visible:ring-2 focus-visible:ring-amber-400/50"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">
            Mutation Log
          </span>

          {/* Processing indicator */}
          {isProcessingMutation && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0"
              aria-label="Processing mutation"
              role="status"
            />
          )}

          {/* Queue count */}
          {mutationQueue.length > 0 && (
            <span
              className="text-xs font-mono tabular-nums text-[var(--text-muted)]"
              aria-label={`${mutationQueue.length} mutations queued`}
            >
              +{mutationQueue.length}
            </span>
          )}
        </div>

        <ChevronDownIcon
          className={cn(
            "w-3 h-3 text-[var(--text-muted)]",
            "transition-transform duration-150",
            expanded && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {/* Log entries */}
      {expanded && (
        <div
          className="overflow-y-auto max-h-48 px-3 py-2 space-y-0.5"
          aria-live="polite"
          aria-label="Mutation log entries"
        >
          {mutationLog.length === 0 && (
            <p className="text-xs font-mono text-[var(--text-muted)] py-2 text-center">
              No mutations yet
            </p>
          )}

          {[...mutationLog].reverse().slice(0, 10).map((entry, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 text-xs font-mono py-1.5",
                "border-b border-[var(--border-subtle)] last:border-0"
              )}
            >
              {/* Status dot */}
              <span
                className={cn(
                  "mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0",
                  entry.status === 'applied' ? "bg-green-500" : "bg-red-500"
                )}
                aria-label={entry.status === 'applied' ? 'Applied' : 'Rejected'}
              />

              {/* Op type */}
              <span className="text-[var(--text-muted)] flex-shrink-0 tabular-nums">
                {entry.op.op}
              </span>

              {/* Node ID */}
              {'nodeId' in entry.op && entry.op.nodeId && (
                <span className="truncate text-[var(--text-secondary)] font-mono tabular-nums">
                  {String(entry.op.nodeId).slice(0, 12)}
                </span>
              )}

              {/* Rejection reason */}
              {entry.reason && (
                <span className="truncate text-red-400 flex-1 min-w-0">
                  {entry.reason}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Type for MutationLogEntry

If `MutationLogEntry` type is not yet defined in `src/store/useDiagramStore.ts`, add it:

```ts
type MutationLogEntry = {
  op: MutationOp;
  status: 'applied' | 'rejected';
  reason?: string;
  timestamp: number;
};
```

---

## Quality Checklist

- [ ] Sidebar uses `transition-[width]` NOT `transition: all`
- [ ] Toggle button has `aria-label` + `aria-pressed`
- [ ] Mutation log container has `aria-live="polite"`
- [ ] Processing dot has `role="status"` + `aria-label`
- [ ] All queue/count numbers use `tabular-nums font-mono`
- [ ] All icon buttons have 40×40px hit area (use `p-2` wrapper)
- [ ] Concentric radius: sidebar inner buttons use `--radius-sm` (4px) inside sidebar with no outer radius
- [ ] Decorative icons: `aria-hidden="true"`

## DO NOT change

- `src/components/htse/ValidationPanel.tsx` — use as-is
- `src/store/useDiagramStore.ts` mutation queue logic
- `drakonwidget.js` or diagram rendering
- Any route structure
