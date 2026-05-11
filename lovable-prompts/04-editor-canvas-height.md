# Lovable Prompt 4 — Editor: Fix Canvas Height + Mobile Toolbar

**Priority: CRITICAL — apply first**

## Problem
The diagram canvas stops at ~50% viewport height, leaving a large black empty area below. On mobile this makes the editor nearly unusable.

## Fix — canvas container layout

In `DiagramEditorPage.tsx` (or the route that renders the DRAKON editor), find the wrapper that contains the canvas and the bottom node palette toolbar.

Change the canvas wrapper to use all remaining viewport height:

```tsx
{/* Canvas area — must fill all remaining height after header */}
<div className="flex flex-col" style={{ height: 'calc(100dvh - var(--header-h, 96px))' }}>

  {/* The drakon widget canvas — grows to fill space */}
  <div className="flex-1 min-h-0 overflow-hidden">
    {/* existing canvas/drakonwidget component — DO NOT change its internals */}
  </div>

  {/* Bottom node type palette — fixed height, no shrink, horizontal scroll */}
  <div className="flex-shrink-0 overflow-x-auto border-t border-[var(--border-subtle)]
                  bg-[var(--bg-surface)] scrollbar-thin">
    {/* existing node palette here — DO NOT change its contents */}
  </div>

</div>
```

## Critical CSS rules
- Parent: `flex flex-col`
- Canvas child: `flex-1 min-h-0` — `min-h-0` is **required** for flex children to shrink correctly
- Bottom toolbar child: `flex-shrink-0`
- Use `100dvh` (dynamic viewport height) NOT `100vh` — handles mobile browser chrome (address bar)
- Do NOT hardcode pixel heights for the canvas

## Mobile toolbar tap delay fix

Add `touch-action: manipulation` to ALL buttons in the editor toolbars (top toolbar + bottom node palette). This eliminates the 300ms tap delay on mobile browsers.

```tsx
// On each toolbar button:
className="... touch-action-manipulation"
// Or in CSS:
style={{ touchAction: 'manipulation' }}
```

## DO NOT change
- drakonwidget.js internals
- Canvas rendering logic
- Node palette contents
- Save/export functionality
