# Lovable Prompt 7 — Editor Canvas: Full Viewport Height Fix (Retry)

**Priority: CRITICAL — Prompt 4 was applied but canvas still only fills ~50% of screen**

## What's still wrong

`DiagramEditorPage.tsx` — there is a large black empty area below the diagram canvas. The canvas renders and works, but stops at roughly half the viewport height. The rest is unused black space.

## Root cause

`flex-1` only works when EVERY ancestor in the chain has an explicit height. If any parent is missing `height` or uses `min-height` instead of `height`, the flex child cannot grow to fill it.

## Fix — trace and fix the full ancestor chain in `DiagramEditorPage.tsx`

**Step 1:** Find the outermost wrapper element of the editor page. It is probably something like:

```tsx
<div className="flex flex-col h-full ...">
```

Change it to explicitly use the dynamic viewport height:

```tsx
<div className="flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
```

**Step 2:** The header/toolbar bar must be `flex-shrink-0` so it doesn't grow.

**Step 3:** The area between the header and the bottom of the viewport must be:

```tsx
<div className="flex-1 min-h-0 flex overflow-hidden">
```

`min-h-0` is **required** — without it flex children default to `min-height: auto` and refuse to shrink.

**Step 4:** Inside that, the canvas wrapper must be:

```tsx
<div className="flex-1 min-h-0 flex flex-col overflow-hidden">
```

**Step 5:** The drakon canvas element (the actual widget container) must be:

```tsx
<div className="flex-1 min-h-0 overflow-hidden">
  {/* drakon widget — DO NOT touch internals */}
</div>
```

**Step 6:** The bottom node palette must be:

```tsx
<div className="flex-shrink-0 overflow-x-auto border-t border-[var(--border-subtle)]">
  {/* node buttons — DO NOT change contents */}
</div>
```

## Complete target structure

```tsx
// DiagramEditorPage.tsx — outermost return:
<div className="flex flex-col overflow-hidden" style={{ height: '100dvh' }}>

  {/* Top toolbar — does not grow */}
  <div className="flex-shrink-0 flex items-center gap-2 px-3 h-12
                  border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
    {/* existing toolbar buttons — DO NOT change */}
  </div>

  {/* Content row — fills all remaining height */}
  <div className="flex-1 min-h-0 flex overflow-hidden">

    {/* Canvas column */}
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

      {/* Drakon widget canvas */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* existing drakon canvas element — DO NOT change */}
      </div>

      {/* Bottom node palette */}
      <div className="flex-shrink-0 overflow-x-auto
                      border-t border-[var(--border-subtle)]
                      bg-[var(--bg-surface)] scrollbar-thin">
        {/* existing node palette — DO NOT change */}
      </div>

    </div>

    {/* Right sidebar (if sidebarOpen) — DO NOT change */}
    {/* ... */}

  </div>

</div>
```

## Critical rules

| Rule | Reason |
|------|--------|
| `style={{ height: '100dvh' }}` on root | `100dvh` accounts for mobile browser chrome (address bar shrinking) |
| `overflow-hidden` on every flex container | Prevents content from escaping its boundary |
| `min-h-0` on every flex child that should grow/shrink | Without this, flex children won't shrink below their natural size |
| `flex-shrink-0` on fixed-height elements | Toolbar and palette must not be stolen height |
| Never `min-h-screen` or `h-full` on the root | These don't work reliably with mobile viewports |

## DO NOT change

- drakonwidget.js or any canvas rendering logic
- The node palette contents (just its container)
- Save, export, undo/redo button logic
- The right sidebar content (ValidationPanel, MutationLogPanel)
- Any data fetching or diagram loading
