# Lovable Prompt 5 — DiagramsPage: Mission Control Card + Safe Delete

**Priority: HIGH — apply after Prompt 4**

> Requires Prompts 1–3 (design system CSS variables) already applied.

## Problem
Current diagram cards use a generic layout with "Відкрити" and "Видалити" buttons side by side — dangerous on mobile (mis-tap deletes diagram) and visually doesn't match the Mission Control aesthetic.

## Fix — replace diagram card component

In `DiagramsPage.tsx`, find the card rendering for each diagram and replace with:

```tsx
<div
  className="group relative rounded-[var(--radius-md)] bg-[var(--bg-surface)]
             hover:bg-[var(--bg-elevated)] transition-colors duration-150 p-4 cursor-pointer"
  style={{ boxShadow: 'var(--shadow-card)' }}
  onClick={() => navigate({ to: '/diagram/editor', search: { diagramId: diagram.id } })}
  role="button"
  tabIndex={0}
  aria-label={`Відкрити схему ${diagram.name}`}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate({ to: '/diagram/editor', search: { diagramId: diagram.id } }); }}
>
  {/* Header: name + delete icon */}
  <div className="flex items-start justify-between gap-2">
    <h3
      className="font-mono text-sm font-medium text-[var(--text-primary)] leading-snug"
      style={{ textWrap: 'balance' }}
    >
      {diagram.name}
    </h3>

    {/* Delete button — icon only, hidden until hover, requires confirmation */}
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setDeleteTarget(diagram.id); }}
      aria-label={`Видалити ${diagram.name}`}
      className="flex-shrink-0 p-1.5 rounded-[var(--radius-sm)]
                 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10
                 opacity-0 group-hover:opacity-100
                 transition-all duration-150 active:scale-[0.96]
                 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-red-400/50"
      style={{ touchAction: 'manipulation' }}
    >
      <TrashIcon className="w-3.5 h-3.5" aria-hidden="true" />
    </button>
  </div>

  {/* Metadata row */}
  <div
    className="mt-2 flex items-center gap-3 text-xs font-mono text-[var(--text-muted)]"
    style={{ fontVariantNumeric: 'tabular-nums' }}
  >
    <span>
      {formatDistanceToNow(new Date(diagram.createdAt ?? diagram.updatedAt), {
        addSuffix: true,
        locale: uk,
      })}
    </span>
  </div>
</div>
```

## Key changes

| Before | After |
|--------|-------|
| "Відкрити" + "Видалити" buttons side by side | Entire card is clickable (opens diagram) |
| Red "Видалити" button always visible | Trash icon appears only on hover/focus |
| Generic Card shadow | `var(--shadow-card)` — no solid border |
| Plain timestamp | `tabular-nums font-mono` |
| No keyboard support | `onKeyDown` handler for Enter/Space |

## Delete confirmation
Keep the existing `AlertDialog` for delete confirmation — just wire it to `setDeleteTarget(diagram.id)` (or whatever state controls the confirmation dialog). Do NOT delete immediately on click.

## Empty state (when no diagrams)
```tsx
<div className="flex flex-col items-center justify-center py-24 gap-4">
  <span className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--text-muted)]">
    Схем поки немає
  </span>
  <p className="text-sm text-[var(--text-muted)]" style={{ textWrap: 'pretty' }}>
    Натисніть «+ Нова схема» щоб згенерувати першу
  </p>
</div>
```

## DO NOT change
- Data fetching / API calls
- Folder sidebar logic
- Import JSON / Analyze Project functionality
- drakonwidget.js
