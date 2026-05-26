---
title: "Stitch Design Prompt — Diagrams Page"
type: reference
tags: [drakon, frontend]
status: active
created: 2026-05-26
updated: 2026-05-26
---

Design a complete workspace shell and two runtime panels for AI-DRAKON — a DRAKON visual algorithm engineering platform used by software architects. This is an IDE-like engineering workspace, not a SaaS dashboard.

---

## DESIGN LANGUAGE (strict — do not deviate)

Background base: #0a0b0e
Background surface: #111318
Background elevated (inputs, code areas): #191c23
Border subtle: rgba(255,255,255,0.08)
Border default: rgba(255,255,255,0.12)
Text primary: rgba(255,255,255,0.92)
Text secondary: rgba(255,255,255,0.55)
Text muted: rgba(255,255,255,0.28)
Accent amber: #f59e0b — ONLY for primary CTAs, active states, running indicators
Error: #ef4444
Success: #22c55e
Code text: rgba(180,220,160,0.90)
Font UI: IBM Plex Sans, 12–13px
Font code/labels: JetBrains Mono, 11–12px
Border radius: 4px on buttons/inputs, 0px on panels
No gradients. No shadows. No glow. No illustrations. No rounded corners > 4px on containers.

---

## WORKSPACE SHELL

The workspace is a persistent IDE-like environment. The diagram canvas is always visible. Navigation never hides the canvas.

### Layout structure (viewport 1440px+)

```
┌─────────────────────────────────────────────────────────────────┐
│  TOP BAR (32px)                                                 │
├────┬──────────────┬──────────────────────────────┬─────────────┤
│    │              │                              │             │
│ I  │   LEFT       │     DIAGRAM CANVAS           │   RIGHT     │
│ C  │   PANEL      │     (DrakonWidget)           │   PANEL     │
│ O  │   220px      │     flex-1                   │   380px     │
│ N  │              │                              │  (optional) │
│    │              │                              │             │
│ R  │              │                              │             │
│ A  │              │                              │             │
│ I  │              │──────────────────────────────┤             │
│ L  │              │   BOTTOM DRAWER (280px)      │             │
│ 40 │              │   (optional, collapsible)    │             │
└────┴──────────────┴──────────────────────────────┴─────────────┘
```

---

### TOP BAR (height 32px)

- Left: amber dot (6px) + "AI·DRAKON" monospaced uppercase 11px + separator + breadcrumb "process_data.py / calculate_path" muted
- Right: global search icon (ghost, 20px) + settings icon + user avatar placeholder
- Background: #111318, border-bottom 1px rgba(255,255,255,0.08)

---

### ICON RAIL (width 40px)

Vertical column, bg #111318, border-right 1px rgba(255,255,255,0.08).

Icons (20px, ghost by default, amber when section active):
- Top group: diagrams icon (grid), notes icon (text lines), graph icon (nodes)
- Separator
- Bottom group: agent icon (cpu/sparkle), settings icon (gear)

Hover: icon bg rgba(255,255,255,0.05), tooltip label appears right

---

### LEFT PANEL (width 220px, collapsible to 0)

The panel shows content for the currently active icon rail section.

**Section A — Diagrams**
- Header row (28px): "DIAGRAMS" monospaced 10px uppercase muted left, "+" ghost icon right
- Search input (24px): bg #191c23, placeholder "filter…", font-mono 11px
- Diagram list (each row 28px, border-bottom rgba(255,255,255,0.05)):
  · Active diagram: left border 2px amber, text primary, bg rgba(245,158,11,0.06)
  · Inactive: text secondary, hover bg rgba(255,255,255,0.03)
  · Each row: diagram name monospaced 11px + small CC badge "CC:4" muted right

**Section B — Notes**
- Header row: "NOTES" + count badge + search input (same pattern)
- File tree: expandable folders, monospaced 11px, indent 12px per level
- Active note: amber left border
- Node icons: folder (▶/▼), note (─)

**Section C — Graph**
- Mini knowledge graph preview (node dots + lines)
- "Open full graph" text link at bottom

---

### DIAGRAM CANVAS (flex-1, full height between top bar and bottom)

- Background: #0a0b0e (base)
- DrakonWidget renders here (do not overlay)
- Canvas toolbar (top-right overlay, 32px height):
  · Group of ghost buttons: zoom +/-, fit, reset
  · Separator
  · "Аналізувати код" button (ghost, ScanSearch icon + text)
  · "Генерувати код" button (ghost, Code2 icon + text, disabled if no diagram selected)
- Active diagram name shown in canvas toolbar left: monospaced 11px muted

---

## PANEL 1: Code Analysis ("Аналіз коду")

Right-side panel, 380px wide, full height (top bar to bottom).
Triggered by "Аналізувати код" button.

### Frame 1.1 — IDLE
- Header (40px): "АНАЛІЗ КОДУ" monospaced uppercase 10px left + "Код → IR" muted 10px right + ✕ ghost button
- Divider 1px subtle
- Code textarea: bg #191c23, border rgba(255,255,255,0.08), JetBrains Mono 11px, min 8 lines, placeholder "# Вставте Python-код"
- File path input (24px): bg #191c23, placeholder "module.py", monospace 11px
- Language row: static label "python" uppercase muted 10px monospaced
- CTA: "Аналізувати" full-width button, bg #f59e0b, text #000, height 36px, JetBrains Mono bold

### Frame 1.2 — RUNNING
- Textarea + inputs: opacity 0.4, non-interactive
- Button replaced: amber spinner 14px + "Аналізується… 12s" monospaced muted
- Status line (bg #191c23, border-left 2px amber, 28px height): "CC: 7 · рівень: primitive" monospaced 11px

### Frame 1.3 — DONE
- Input section collapses: shows 2 lines of code + "↕ розгорнути" text link
- "РЕЗУЛЬТАТ" label: uppercase monospaced muted 10px
- Function list (each row 32px, border-bottom subtle):
  · Left: function name JetBrains Mono 12px
  · Middle: "CC: 4" muted 10px
  · Right: "✓ valid" #22c55e or "2 помилки" #ef4444 (chip, 10px)
  · Far right: "↓ Імпортувати" ghost button (visible on hover only)
- Errors inline: below affected row, red text 11px monospaced, indented
- Footer: "Новий аналіз" ghost full-width, border-top subtle

### Frame 1.4 — ERROR
- Textarea stays
- Error card: border-left 3px #ef4444, bg #191c23, message 12px red, "Повторити" ghost right

---

## PANEL 2: Code Generation ("Генерувати код")

Bottom drawer, full width of diagram canvas area (not covering left panel), height 280px.
Triggered by "Генерувати код" button.

### Frame 2.1 — IDLE
- Header (40px): "ГЕНЕРУВАТИ КОД" monospaced uppercase 10px left + language active badge + ✕ ghost right
- Language selector: 3 segments ["Python" | "TypeScript" | "JavaScript"], active = bg #f59e0b text #000, inactive = ghost, height 28px, border 1px rgba(255,255,255,0.10)
- Description input: 1 row bg #191c23, placeholder "Опис поведінки (необов'язково)"
- Footer: muted hint "10–30 секунд" left, "Генерувати" amber button right (34px)

### Frame 2.2 — RUNNING
- Inputs opacity 0.4
- Button area: spinner + "Генерується… 8s" + amber badge "ітерація 1/3" (bg rgba(245,158,11,0.12), border 1px amber, monospaced 10px)

### Frame 2.3 — DONE
- Code block: bg #0a0b0e, border 1px rgba(255,255,255,0.08), radius 4px, max-height 160px, scroll-y
- Code text: JetBrains Mono 11px, rgba(180,220,160,0.90)
- Top-right: "⎘ Копіювати" ghost button monospaced 11px
- Footer: left = syntax chip ("syntax: ✓" green / "syntax: 2 помилок" red), right = "Перегенерувати" ghost + "Закрити" text link

---

## KEY WORKSPACE STATES TO DESIGN

**State 1: Workspace idle — diagrams section open**
Left panel shows diagram list. Canvas shows open diagram. No right panel, no bottom drawer.

**State 2: Analysis panel open (right)**
Right panel at 380px. Canvas shrinks to accommodate (flex layout). Left panel may collapse to icon rail.

**State 3: Analysis done + diagram imported**
Right panel shows results. Left panel diagram list updated with new entry (amber left border = active).

**State 4: Generation panel open (bottom)**
Bottom drawer 280px. Canvas height reduces. Right panel may be closed.

**State 5: Notes accessible from left panel**
Left panel shows notes tree. Canvas still visible with open diagram. No navigation away.

---

## CONSTRAINTS

- No modals. No page navigation. Canvas always visible.
- Notes and diagrams coexist in left panel (different sections, not pages).
- Mobile: not in scope for this design.
- Icon rail always visible, even when left panel collapsed.
- Bottom drawer width = canvas width only (does not extend under left panel).
- Right analysis panel width = 380px fixed; canvas flex-shrinks.
