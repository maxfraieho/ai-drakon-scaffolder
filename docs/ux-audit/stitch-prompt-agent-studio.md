---
title: "Stitch Design Prompt — Agent Logic Studio"
type: reference
tags: [drakon, agent, frontend]
status: active
created: 2026-05-26
updated: 2026-05-26
---

# Stitch Design Prompt — Agent Logic Studio

Design the **Agent Logic Studio** page for AI-DRAKON — an IDE-like visual programming platform for software architects. This page visualizes and lets engineers edit the internal logic of three AI agents.

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
Purple (decisions):  #a78bfa
Font UI:             IBM Plex Sans, 12–13px
Font mono:           JetBrains Mono, 11–12px
Radius:              4px buttons/inputs, 0px panel edges
NO gradients. NO shadows. NO glow. NO illustrations.
```

---

## PAGE: `/agents`

### Overall Layout (1440px viewport)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Назад   ⚙  АГЕНТНА ЛОГІКА             [Architect] [DRAKON] [Docs]  live● │
├────────────┬────────────────────────────────────────┬────────────────────────┤
│  АГЕНТИ    │                                        │                        │
│  (200px)   │    Pipeline A: Код → DRAKON IR         │   ● ir_gen             │
│            │    LangGraph StateGraph · 7 вузлів     │   (340px, conditional) │
│            │                                        │                        │
│ ● Architect│    ┌─────────────────────────────┐     │                        │
│  Pipeline A│    │ Архітектура пайплайну (Merm) │     │                        │
│  Pipeline B│    │                             │     │                        │
│            │    │  (__start__)                │     │                        │
│  DRAKON    │    │     │                       │     │                        │
│  Аналіз   │    │  measure_cc ●               │     │                        │
│  Генерація │    │     │                       │     │                        │
│            │    │  classify ●                 │     │                        │
│  Docs      │    │     │                       │     │                        │
│  Generator │    │  ast_translate  yaml_gen    │     │                        │
│            │    │     ●               ●       │     │                        │
│ ─────────  │    │     │           ir_gen ●←──┐│     │                        │
│ ВУЗЛИ      │    │  validate        validate  ││     │                        │
│            │    │     │               │──────┘│     │                        │
│ ○ measure  │    │   (__end__)     (__end__)   │     │                        │
│ ○ classify │    └─────────────────────────────┘     │                        │
│ ● ir_gen   │                                        │                        │
│ ○ validate │    ВУЗЛИ З ПРОМПТАМИ                   │                        │
│            │    ┌──────────────────────┐            │                        │
│ ─────────  │    │ yaml_gen  LLM ↗     │            │                        │
│ БАЗА ЗНАНЬ │    │ "Код → YAML опис..." │            │                        │
│ 00-rules   │    └──────────────────────┘            │                        │
│ 01-nodes   │    ┌──────────────────────┐            │                        │
│ 02-ir-fmt  │    │ ir_gen    LLM ↗  ●  │←─selected  │                        │
│ 03-patterns│    │ "YAML → DRAKON IR.." │            │                        │
│            │    └──────────────────────┘            │                        │
│            │    ┌──────────────────────┐            │                        │
│            │    │ code_gen  LLM ↗     │ (Pipeline B)│                       │
│            │    │ "IR → код мовою..." │            │                        │
│            │    └──────────────────────┘            │                        │
└────────────┴────────────────────────────────────────┴────────────────────────┘
```

---

## LEFT SIDEBAR (200px, bg: surface)

**Header section:**
- Title: `⚙ АГЕНТНА ЛОГІКА` — monospace uppercase, 10px, amber, tracking 0.2em
- Three agent tabs across top: `[Architect]` `[DRAKON]` `[Docs]` — small pills, active = amber bg/black text

**Agent section:**
- Each pipeline: name in monospace 11px, icon (→ for Pipeline A, ← for Pipeline B)
- Active pipeline: amber left border 2px, slightly brighter text
- Clickable rows, subtle hover bg

**"ВУЗЛИ" section (context-sensitive):**
- Shows nodes of selected pipeline
- Node names in monospace 11px
- LLM nodes (have prompts): white text + small purple `LLM` badge
- Deterministic nodes: muted text
- Selected: amber left border
- Bullet ○ / ● indicators

**"БАЗА ЗНАНЬ" section:**
- List of KB files for selected agent
- Filename in monospace 10px, muted
- Clickable → opens in bottom KB drawer
- Hover: slight bg highlight

---

## MAIN AREA (flex-1, bg: base)

**Header bar (h-10, bg: surface, border-bottom):**
- Pipeline name: `Pipeline A: Код → DRAKON IR` — white, 13px IBM Plex Sans
- Description: `LangGraph StateGraph · 7 вузлів · Ralph Loop (max 3 iter)` — muted, 11px mono
- Right: `live ●` green indicator

**Mermaid graph panel (h-[280px], bg: elevated, border-radius 4px, margin):**
- Dark-themed Mermaid diagram
- Override node colors: action nodes = #191c23 with rgba(255,255,255,0.1) border
- Decision edges (dashed): amber color  
- Start/End: filled darker
- Loop-back edge: amber dashed
- Small, compact, read-only, centered
- Label: `ГРАФ ПАЙПЛАЙНУ` — muted monospace uppercase, 10px, above chart

**"ВУЗЛИ З ПРОМПТАМИ" section (below graph):**
- Sub-label: `ВУЗЛИ З LLM-ПРОМПТАМИ` — muted mono 10px uppercase
- Card per LLM node:
  - Left: node name in amber mono + `LLM` purple badge
  - Body: first 60 chars of prompt in muted italic mono 10px, truncated with `...`
  - Right: `→` chevron, entire card clickable
  - Hover: amber border left 2px
  - Selected: amber bg dim, border amber

---

## RIGHT PANEL (340px, bg: surface, border-left, conditional — appears on node select)

**Header (h-10, border-bottom):**
- `●` amber dot + node name in mono 12px white
- Type badge: `action` in muted mono 9px pill
- `×` close button right

**Prompt section:**
- Label: `СИСТЕМНИЙ ПРОМПТ` — muted mono 10px uppercase, tracking
- Dark code editor area (bg: elevated, border, border-radius 4px):
  - Full-width textarea, monospace 11px, min-h-[200px]
  - Amber text color for prompt text
  - Placeholder: "Промпт відсутній (детерміністичний вузол)"
  - Scrollable
- Char count bottom-right: `1.2k chars` in muted 9px

**Params section (divider):**
- Label: `ПАРАМЕТРИ ВУЗЛА` — muted mono 10px uppercase
- `Опис:` — muted label + text below in 11px white
- Read-only params if any (key: value pairs in mono)

**Save button:**
- Full-width, bg amber, text black, mono uppercase 11px
- `ЗБЕРЕГТИ ПРОМПТ`
- Below: `Збережено 2 хв тому` — success green, 10px mono, appears after save

**Status:**
- `Статус агента:` — muted label + `● live` green or `○ offline` red
- Agent URL in muted mono 9px

---

## KB DRAWER (bottom, collapsible, h-[200px])

**Trigger bar:**
- `▼ БАЗА ЗНАНЬ` in muted mono 10px uppercase + filename when open
- `[Редагувати]` button right
- Collapses/expands on click

**Content (when open):**
- Left: file list as scrollable nav (80px), active = amber
- Right: markdown content rendered in monospace, muted, scrollable
- When editing: textarea replaces content, `[Зберегти]` amber btn appears

---

## STATES TO DESIGN

1. **Default** — no node selected, graph visible, node list below
2. **Node selected** — right panel open, selected node highlighted in graph  
3. **Editing prompt** — textarea active in right panel
4. **Saved** — success flash, "Збережено" appears
5. **KB drawer open** — bottom panel expands, main area shrinks

---

## KEY VISUAL DECISIONS

- The Mermaid graph uses **dark override CSS**: all node fills replaced with `#191c23`, text `rgba(255,255,255,0.8)`, edges `rgba(255,255,255,0.3)`, decision edges amber `#f59e0b`
- The "ВУЗЛИ З ПРОМПТАМИ" cards are the **primary interaction surface** — more prominent than the graph
- Right panel appears with **subtle slide-in** (translate-x animation, 150ms)
- The graph is **informational only** — shows the flow, but clicking happens on the cards below
- No modal dialogs. Everything inline in panels.
