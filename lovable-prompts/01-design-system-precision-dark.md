# Lovable Prompt 1 — App-wide Design System "Precision Dark"

Redesign the entire app with a "Precision Dark" design system — a control-room aesthetic for a technical diagram tool. This is a GLOBAL visual overhaul, not a component-by-component patch.

## Aesthetic Direction

Think: military-grade SCADA interface meets modern IDE. Dark, dense, precise. Every pixel earns its place.

## Color Palette — add to src/index.css as CSS variables

```css
:root {
  /* Backgrounds */
  --bg-base:      #0a0b0e;
  --bg-surface:   #111318;
  --bg-elevated:  #191c23;
  --bg-overlay:   #1e2229;

  /* Borders */
  --border-subtle:  rgba(255,255,255,0.06);
  --border-default: rgba(255,255,255,0.10);
  --border-strong:  rgba(255,255,255,0.18);

  /* Accent — Amber */
  --accent:      #f59e0b;
  --accent-dim:  rgba(245,158,11,0.15);
  --accent-glow: 0 0 12px rgba(245,158,11,0.35);

  /* Semantic */
  --color-error:   #ef4444;
  --color-warning: #f59e0b;
  --color-success: #22c55e;
  --color-info:    #3b82f6;

  /* Text */
  --text-primary:   rgba(255,255,255,0.92);
  --text-secondary: rgba(255,255,255,0.55);
  --text-muted:     rgba(255,255,255,0.30);

  /* Radius tokens */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Shadows — layered, no solid borders */
  --shadow-card:     0 0 0 1px rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.4);
  --shadow-elevated: 0 0 0 1px rgba(255,255,255,0.10), 0 4px 16px rgba(0,0,0,0.6);
}
```

## Typography

- Import `JetBrains Mono` from Google Fonts (weight 400, 500) — for all monospace/code/IDs
- Keep existing sans for prose
- Apply to root: `-webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility`
- All headings: `text-wrap: balance`
- All body paragraphs: `text-wrap: pretty`

## Tailwind config additions (tailwind.config.ts)

- Extend `fontFamily.mono` to include `'JetBrains Mono'`
- Extend `colors` with CSS variable references
- Extend `boxShadow` with `card` and `elevated` values from above

## Apply across the app

1. `<body>` background → `var(--bg-base)`
2. All card/panel surfaces → `var(--bg-surface)` with `var(--shadow-card)` (no solid borders — use box-shadow only)
3. All modals/popovers/dropdowns → `var(--bg-elevated)` with `var(--shadow-elevated)`
4. All primary action buttons → amber accent (`var(--accent)`) with `active:scale-[0.96] transition-transform`
5. All secondary buttons → transparent with `var(--border-default)` border
6. All numeric values (counts, versions, IDs) → `font-variant-numeric: tabular-nums; font-family: 'JetBrains Mono'`
7. Sidebar (if exists): `var(--bg-surface)` with right `1px solid var(--border-subtle)`
8. Navigation links: hover increases text opacity from 0.55 → 0.92 + amber left indicator on active route

## Animation rules

- All interactive state changes use CSS `transition` (not keyframes) — interruptible
- Specify exact properties: `transition-property: opacity, transform, background-color` — NEVER `transition: all`
- Add to index.css:

```css
@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0.01ms !important; }
}
```

- Buttons: `active:scale-[0.96]` with `transition-transform duration-100`

## DO NOT change

- Route structure, component logic, store state
- drakonwidget.js or any diagram rendering code
- API calls or data fetching
