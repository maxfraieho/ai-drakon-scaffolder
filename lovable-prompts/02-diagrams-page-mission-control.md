# Lovable Prompt 2 — DiagramsPage "Mission Control" Redesign

> Requires Prompt 1 (design system CSS variables) to be applied first.

Redesign the diagrams list page (likely `src/pages/DiagramsPage.tsx` or the route that renders the list of DRAKON diagrams) with a "Mission Control" aesthetic.

## Layout Structure

```
┌──────────────────────────────────────────────────────┐
│  HEADER BAR — bg-elevated, border-bottom             │
│  [DIAGRAMS]        [Search…]        [N total] [+ New]│
├──────────────────────────────────────────────────────┤
│  LEVEL TABS: ALL | L1 | L2 | L3                      │
├──────────────────────────────────────────────────────┤
│  CARD GRID (2-3 columns on desktop, 1 on mobile)     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ [L1] Name   │  │ [L2] Name   │  │ [L3] Name   │  │
│  │ id · nodes  │  │ id · nodes  │  │ id · nodes  │  │
│  │ 2h ago      │  │ 3d ago      │  │ 1w ago      │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└──────────────────────────────────────────────────────┘
```

## Header Bar

```tsx
<header className="flex items-center justify-between px-6 py-3
                   border-b border-[var(--border-subtle)]
                   bg-[var(--bg-elevated)]">
  <span className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
    Diagrams
  </span>
  <input
    placeholder="Search diagrams…"
    className="bg-transparent border-0 border-b border-[var(--border-default)]
               text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
               focus:outline-none focus:border-[var(--accent)] px-2 py-1 w-48"
  />
  <div className="flex items-center gap-3">
    <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
      {diagrams.length} diagrams
    </span>
    <button
      className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)]
                 text-black text-xs font-medium
                 active:scale-[0.96] transition-transform duration-100
                 focus-visible:ring-2 focus-visible:ring-amber-400/50"
      aria-label="Create new diagram"
    >
      + New
    </button>
  </div>
</header>
```

## Level Filter Tabs

```tsx
{['ALL', 'L1', 'L2', 'L3'].map(level => (
  <button
    key={level}
    className={cn(
      "font-mono text-xs uppercase tracking-wider px-4 py-2 border-b-2 transition-colors duration-150",
      activeLevel === level
        ? "border-[var(--accent)] text-[var(--text-primary)]"
        : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
    )}
    aria-pressed={activeLevel === level}
  >
    {level}
  </button>
))}
```

## Diagram Card

```tsx
<div
  className="group relative rounded-[var(--radius-md)] bg-[var(--bg-surface)]
             hover:bg-[var(--bg-elevated)] transition-colors duration-150
             p-4 cursor-pointer"
  style={{ boxShadow: 'var(--shadow-card)' }}
>
  {/* Level badge */}
  <span className="level-badge" data-level={diagram.level}>
    {diagram.level}
  </span>

  {/* Name */}
  <h3 className="mt-2 font-mono text-sm font-medium text-[var(--text-primary)]"
      style={{ textWrap: 'balance' }}>
    {diagram.name}
  </h3>

  {/* Metadata */}
  <div className="mt-2 flex items-center gap-3 text-xs font-mono text-[var(--text-muted)]"
       style={{ fontVariantNumeric: 'tabular-nums' }}>
    <span>{diagram.id.slice(0, 8)}</span>
    <span aria-label={`${diagram.nodeCount} nodes`}>{diagram.nodeCount}n</span>
    <span>{formatRelativeTime(diagram.updatedAt)}</span>
  </div>

  {/* Actions — revealed on hover */}
  <div className="absolute top-3 right-3 flex gap-1
                  opacity-0 group-hover:opacity-100
                  transition-opacity duration-150">
    <button aria-label={`Edit ${diagram.name}`}
            className="p-2 rounded-[var(--radius-sm)] hover:bg-[var(--bg-overlay)]
                       active:scale-[0.96] transition-transform
                       focus-visible:ring-2 focus-visible:ring-amber-400/50">
      <PencilIcon className="w-3.5 h-3.5" aria-hidden="true" />
    </button>
    <button aria-label={`Delete ${diagram.name}`}
            className="p-2 rounded-[var(--radius-sm)] hover:bg-red-500/10
                       active:scale-[0.96] transition-transform
                       focus-visible:ring-2 focus-visible:ring-red-400/50">
      <TrashIcon className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
    </button>
  </div>
</div>
```

## Level Badge CSS — add to src/index.css

```css
.level-badge {
  display: inline-block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}
.level-badge[data-level="L1"] {
  background: var(--accent);
  color: #000;
}
.level-badge[data-level="L2"] {
  background: #3b82f6;
  color: #fff;
}
.level-badge[data-level="L3"] {
  background: var(--bg-overlay);
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
}
```

## Staggered Entry Animation

```tsx
{diagrams.map((diagram, i) => (
  <div
    key={diagram.id}
    className="animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both"
    style={{ animationDelay: `${i * 60}ms` }}
  >
    <DiagramCard diagram={diagram} />
  </div>
))}
```

## Empty State

```tsx
{diagrams.length === 0 && (
  <div className="flex flex-col items-center justify-center py-24 gap-4">
    <span className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--text-muted)]">
      No diagrams found
    </span>
    <p className="text-sm text-[var(--text-muted)]">
      Create your first diagram to begin
    </p>
    <button className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--accent)]
                       text-black text-sm font-medium
                       active:scale-[0.96] transition-transform">
      Create Diagram
    </button>
  </div>
)}
```

## Accessibility Checklist

- All icon buttons: `aria-label` describing the action
- Level tabs: `aria-pressed` for current state
- Card grid: use `role="list"` + `role="listitem"` or semantic `<ul><li>`
- All hit areas minimum 40×40px (icon buttons use `p-2` wrapper)
- Focus ring: `focus-visible:ring-2 focus-visible:ring-amber-400/50` on every interactive element
- Decorative icons: `aria-hidden="true"`

## Concentric Radius Rule

- Card outer: `--radius-md` (8px)
- Action buttons inside card: `--radius-sm` (4px) = 8px - 4px padding gap ✓

## DO NOT change

- Data fetching / API calls
- Router navigation logic
- drakonwidget.js
