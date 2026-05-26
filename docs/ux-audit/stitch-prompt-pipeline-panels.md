---
title: "Stitch Design Prompt — Pipeline Panels (CodeAnalysisPanel + CodeGenerationPanel)"
type: reference
tags: [drakon, pipeline]
status: active
created: 2026-05-26
updated: 2026-05-26
---

# Stitch Design Prompt — Pipeline Panels (CodeAnalysisPanel + CodeGenerationPanel)

Design the **Pipeline Panels** for AI-DRAKON — a right-side drawer that appears on the `/diagrams` page when the user clicks "Аналіз" or "Генерація". These panels let architects trigger AI pipeline jobs and see results inline without leaving the diagram list.

Screenshots of current state are in `import/stitch_pipeline_panels/`.

---

## DESIGN LANGUAGE (inherit from existing app — do not deviate)

```
Background base:     #0a0b0e
Background surface:  #111318
Background elevated: #191c23
Border subtle:       rgba(255,255,255,0.06)
Border default:      rgba(255,255,255,0.10)
Text primary:        rgba(255,255,255,0.92)
Text secondary:      rgba(255,255,255,0.55)
Text muted:          rgba(255,255,255,0.28)
Accent amber:        #f59e0b
Accent amber dim:    rgba(245,158,11,0.15)
Success green:       #22c55e
Error red:           #ef4444
Font UI:             IBM Plex Sans, 12–13px
Font mono:           JetBrains Mono, 11–12px
Radius:              4px buttons/inputs, 0px panel edges
NO gradients. NO shadows. NO glow. NO illustrations.
```

---

## CONTEXT

The panels appear as a right-side drawer on `/diagrams`. The left part (diagram list + toolbar) stays visible. The panel overlays the right ~480px of the screen.

Two separate panels, same structural layout:
- **CodeAnalysisPanel** — triggered by button "Аналіз" in the header area
- **CodeGenerationPanel** — triggered by button "Генерація" in the header area

---

## OVERALL LAYOUT (1440px viewport, panel open)

```
┌──────────────────────────────────────────┬───────────────────────────────────┐
│                                          │  PANEL HEADER                     │
│   DIAGRAMS LIST (unchanged)              ├───────────────────────────────────┤
│                                          │  INPUT SECTION                    │
│   • Diagram 1                            │  (textarea or static info)        │
│   • Diagram 2                            ├───────────────────────────────────┤
│   • ...                                  │  STATUS / RUNNING STATE           │
│                                          ├───────────────────────────────────┤
│                                          │  RESULT SECTION                   │
│                                          │  (scrollable, mono font)          │
│                                          ├───────────────────────────────────┤
│                                          │  ACTION BUTTON                    │
└──────────────────────────────────────────┴───────────────────────────────────┘
  ~960px                                     ~480px
```

---

## PANEL: CodeAnalysisPanel (Аналіз)

### Header
```
┌─────────────────────────────────────────────────────┐
│  ◈ АНАЛІЗ КОДУ                              [×]    │
│  Pipeline A · Code → DRAKON IR                      │
└─────────────────────────────────────────────────────┘
```
- Title: `АНАЛІЗ КОДУ` — IBM Plex Sans, 11px, letter-spacing 0.08em, text-muted uppercase
- Subtitle: `Pipeline A · Code → DRAKON IR` — 12px, text-secondary
- Close button `[×]` — top-right, 24×24px, text-muted, hover: text-primary
- Bottom border: 1px solid border-subtle

### Input Section
```
┌─────────────────────────────────────────────────────┐
│  Код для аналізу                                    │
│ ┌───────────────────────────────────────────────┐   │
│ │  // paste your code here                      │   │
│ │                                               │   │
│ │                                               │   │
│ └───────────────────────────────────────────────┘   │
│  [Запустити аналіз                             →]   │
└─────────────────────────────────────────────────────┘
```
- Label: 11px, text-muted, uppercase, letter-spacing
- Textarea: `background: #0a0b0e`, border: border-default, font-mono 11px, min-height 120px, resize-y
- Button: full width, `background: #f59e0b`, text `#0a0b0e`, bold 12px, uppercase, radius 4px, height 36px

### Running State (SSE streaming)
```
┌─────────────────────────────────────────────────────┐
│  ◉ ВИКОНУЄТЬСЯ   ━━━━━━━━━━━░░░░  12s              │
│                                                     │
│  Pipeline A запущено. Очікуємо результат...         │
└─────────────────────────────────────────────────────┘
```
- `◉` — pulsing amber dot (CSS animation, 1s ease-in-out infinite)
- Progress bar: thin 2px line, amber fill, animated indeterminate
- Timer: `Ns` — mono font, text-secondary, right-aligned
- Message: 12px, text-secondary, italic

### Done State — Result
```
┌─────────────────────────────────────────────────────┐
│  ✓ АНАЛІЗ ЗАВЕРШЕНО                        2m 14s  │
├─────────────────────────────────────────────────────┤
│  DRAKON IR                                          │
│ ┌───────────────────────────────────────────────┐   │
│ │  {                                            │   │
│ │    "nodes": [...],                            │   │
│ │    "edges": [...]                             │   │
│ │  }                                            │   │
│ └───────────────────────────────────────────────┘   │
│  [Копіювати IR]   [Відкрити в редакторі →]          │
└─────────────────────────────────────────────────────┘
```
- `✓` — success green #22c55e
- IR block: `background: #0a0b0e`, border-default, font-mono 11px, max-height 300px, overflow-y auto
- Buttons: secondary style (border: border-default, text-primary) + primary CTA (amber)

### Error State
```
│  ✗ ПОМИЛКА                                          │
│  Сервіс перезапустився. Спробуйте ще раз.           │
│  [Повторити]                                        │
```
- `✗` — error red #ef4444
- Message: 12px, text-secondary

---

## PANEL: CodeGenerationPanel (Генерація)

Same structural layout as CodeAnalysisPanel but:

### Header
```
│  ◈ ГЕНЕРАЦІЯ КОДУ                           [×]   │
│  Pipeline B · DRAKON IR → Code                     │
```

### Input Section
Two fields:
```
┌─────────────────────────────────────────────────────┐
│  Цільова мова                                       │
│  [Python ▼]  (select: Python / TypeScript / Go)     │
│                                                     │
│  Опис задачі (необов'язково)                        │
│ ┌───────────────────────────────────────────────┐   │
│ │  Describe what the code should do...          │   │
│ └───────────────────────────────────────────────┘   │
│  [Згенерувати код                              →]   │
└─────────────────────────────────────────────────────┘
```
- Select: same dark style, amber focus ring 1px
- Textarea: optional, min-height 80px

### Done State — Result
```
│  ✓ КОД ЗГЕНЕРОВАНО                         1m 43s  │
├─────────────────────────────────────────────────────┤
│  Python                                             │
│ ┌───────────────────────────────────────────────┐   │
│ │  def process_order(order_id: str) -> dict:    │   │
│ │      ...                                      │   │
│ └───────────────────────────────────────────────┘   │
│  [Копіювати код]   [Відкрити в Monaco →]            │
```

---

## INTERACTION DETAILS

- Panel slides in from right: `transform: translateX(100%) → translateX(0)`, duration 200ms, ease-out
- Closing: reverse slide, 150ms
- While running: trigger button is disabled, shows spinner inside button
- Panel does NOT close automatically on done — user reads result, then manually closes
- On mobile (<768px): panel takes full width, diagrams list hidden

---

## WHAT NOT TO CHANGE

- Left side (diagram list, toolbar, header) — untouched
- Button positions "Аналіз" / "Генерація" in the header — untouched  
- Routing, auth, API calls — untouched
- The elapsed-time `setInterval` counter — untouched

---

## SCREENSHOTS (current state, for reference)

```
import/stitch_pipeline_panels/01-diagrams-page.jpg       — /diagrams idle
import/stitch_pipeline_panels/02-editor-page.jpg         — /diagram/editor
import/stitch_pipeline_panels/03-code-analysis-panel.jpg — CodeAnalysisPanel open
import/stitch_pipeline_panels/04-code-generation-panel.jpg — CodeGenerationPanel open
```
