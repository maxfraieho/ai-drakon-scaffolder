# Google Stitch Prompt — AI-DRAKON Pipeline UI

## Context for Stitch

Design two panels for an expert-facing DRAKON diagramming tool called AI-DRAKON.
The product uses a "Precision Dark" design system: near-black backgrounds (#0a0b0e base, #111318 surface), amber accent (#f59e0b), white text at varying opacity, JetBrains Mono for all code and labels.

The audience is software engineers and technical architects. Density is preferred over spaciousness. No decorative elements. No onboarding copy. Every element must have a function.

---

## Panel 1: Code Analysis Panel ("Аналіз коду")

This panel appears in the right side of the DRAKON diagrams page when the user triggers code analysis. It is a slide-in drawer or collapsible right column (min-width 380px, max-width 480px), not a modal.

**States to design:**

### State A: Input (idle)
- Header: "Аналіз коду" (monospaced, small caps or uppercase tracking)
- Subtext: "Код → DRAKON IR" (muted, 11px)
- Textarea: "Вставте Python-код для аналізу" — monospaced font, dark background, 12px, min 8 lines
- Two fields below textarea: file path input (optional, placeholder "module.py"), language selector (currently only "python", shown as static label, not dropdown — forward-compatible)
- Primary CTA: "Аналізувати" button — amber, full-width or right-aligned, clear
- No other elements in idle state

### State B: Running
- Same layout but textarea + inputs are dimmed/disabled
- Button replaced with: spinner + "Аналізується… Xs" counter (same pattern as existing docs generator)
- A narrow progress area below the button: shows CC score and tree_level as they resolve ("CC: 7, рівень: primitive")

### State C: Done — result
- Result section below the input (the input collapses to show just 2 lines + an expand toggle)
- Result card: shows list of analyzed functions (name + CC score + "valid" / "N помилок")
- Each function row has a "↓ Імпортувати діаграму" action button (small, ghost)
- Errors (if any) shown inline in red under the affected function
- "Новий аналіз" button resets to State A

### State D: Error
- Input area stays visible
- Error message below button: red border card, message text, "Повторити" button

---

## Panel 2: Code Generation Panel ("Генерувати код")

This panel appears inside the diagram editor when a DRAKON diagram is open. It appears as a bottom drawer or bottom panel (height 280px, collapsible), not a full-screen overlay.

**States to design:**

### State A: Config (idle)
- Header: "Генерувати код" (monospaced label)
- Row: language selector — three buttons: "Python" / "TypeScript" / "JavaScript" — segmented control style, amber highlight on active
- Optional: description textarea (1 line, placeholder "Опис поведінки (необов'язково)")
- CTA: "Генерувати" button — amber, right-aligned
- Small note: "Генерація займе 10–30 секунд" in muted text (11px)

### State B: Running
- Header stays, inputs dimmed
- Spinner + elapsed counter in button area
- Optional: "Ітерація 1/3" badge (shows Ralph Loop progress)

### State C: Done — result
- Code block: monospaced, syntax-highlighted (dark bg, lighter text), scrollable, max-height 180px
- Top-right of code block: "Копіювати" button (small, icon + text)
- Below code: "syntax: ✓" or "syntax: N помилок" status badge
- "Перегенерувати" button (ghost, smaller) and "Закрити" (text link)

---

## Layout Constraints

- Both panels must work at 1280px+ viewport without covering the main diagram canvas
- Panel 1 (right column): diagram canvas shrinks to accommodate (flexbox split)
- Panel 2 (bottom drawer): diagram canvas height reduces, canvas stays visible
- Mobile: both panels become full-screen bottom sheets (height 85dvh), diagram hidden behind
- No modals. No blocking overlays. Non-destructive panels that can be dismissed without losing work.

---

## Visual Language (must match existing system)

- Background: #111318 (bg-surface) for panel, #191c23 (bg-elevated) for input areas
- Borders: rgba(255,255,255,0.10) for panel edges, rgba(255,255,255,0.06) for inner dividers
- Text primary: rgba(255,255,255,0.92)
- Text muted: rgba(255,255,255,0.30)
- Accent: #f59e0b — used ONLY for primary CTAs and active states
- Error: #ef4444
- Success: #22c55e
- Code areas: bg #0a0b0e, text rgba(255,255,255,0.80), font JetBrains Mono 12px
- Radius: 4px (sm), 8px (md)
- No gradients. No glow effects on panels (glow is reserved for the amber dot in header brand only).
- No decorative dividers, no section headers with heavy weight — use spacing and subtle borders instead.

---

## What Stitch must NOT produce

- Modals
- Centered dialogs
- Tooltip-heavy interfaces
- Accordion-heavy interfaces
- Wizard/stepper patterns
- Empty state illustrations
- Marketing-style hero text
- Color blocks as decoration
- Rounded corners > 8px on panel containers
