# AGY Documentation Agent — Skill

## Purpose

Generate comprehensive technical documentation for the AI-DRAKON platform,
specifically covering **LangGraph agent pipelines**, **DRAKON IR runtime**, and
**frontend component architecture**.

Documentation derives from **real execution semantics**, not just code structure.

---

## Pre-flight (ALWAYS run first)

```
1. mempalace_search("ai-drakon architecture")
2. mempalace_search("LangGraph architect-agent")
3. notebooklm_ask("drn-ai", "What is the LangGraph pipeline architecture?")
4. notebooklm_ask("drn-ai", "How does DRAKON IR map to agent execution?")
```

If MemPalace has fresh data (< 7 days) → use it directly.
If stale → run `02-repo-analyzer` skill first, then return here.

---

## Documentation Pipeline

### Phase 1 — Architecture Extraction
Target files (on 192.168.3.184):
```bash
# Core architecture
~/workspace/ai-drakon-scaffolder/docs/architecture.md
~/workspace/ai-drakon-scaffolder/services/architect-agent/
~/workspace/ai-drakon-scaffolder/services/drakon-agent/
~/workspace/ai-drakon-scaffolder/services/docs-agent/
~/workspace/ai-drakon-scaffolder/cloudflare-worker/worker-mcp-drakon.js
```

Read via SSH. Extract:
- Service responsibilities and API contracts
- LangGraph node definitions and pipeline topology
- DRAKON IR format (items: Record<string, IrItem>)
- MCP tool definitions from worker

### Phase 2 — LangGraph Documentation (PRIORITY)
Document these patterns from `architect-agent`:
- Pipeline definition format (JSON configs in `drn/`)
- Deterministic nodes vs. LLM nodes
- State class structure
- Graph execution flow (start → nodes → END)
- Breakpoints and resume mechanism
- SSE streaming protocol (`/graph-pipelines/{name}/execute/{id}/stream`)

Output: `docs/generated/langgraph-architecture.md`

### Phase 3 — DRAKON IR Documentation
Document from `src/lib/htse/`:
- `IrDiagram` format: `{name, access, params, items: Record<nodeId, IrItem>}`
- `IrItem` types: action | question | select | case | header | end | address | branch | insertion | input | output | shelf | process | timer | duration
- Conversion pipeline: code → AST → raw IR → refined IR → drakonwidget.js
- Validation (`ir-validator-core.ts`)
- Bidirectional conversion (`diagram-to-ir.ts`, `ir-to-diagram.ts`)

Output: `docs/generated/drakon-ir-spec.md`

### Phase 4 — Frontend Component Documentation
Document key components:
```
WorkspaceShell.tsx    — 3-column IDE layout, collapsible panels
DiagramsPage.tsx      — DRAKON editor + IR Sheet (Col1+Col2)
AgentStudioPage.tsx   — DRAKON graph editor (CELESTINE GERONIMO)
PipelinesPage.tsx     — mobile-first: list→ir→chat flow
PipelineChat.tsx      — SSE streaming chat with agents
ProjectContext.tsx    — active project state management
```

Output: `docs/generated/frontend-components.md`

### Phase 5 — Worker API Reference
Extract all routes from `cloudflare-worker/worker-mcp-drakon.js`:
- Group by domain: auth, drakon, analysis, github, projects, notes, pipeline
- Document request/response schemas
- Mark auth requirements

Output: `docs/generated/worker-api-reference.md`

---

## NotebookLM Integration

After generating each doc section:
```bash
notebooklm source add --notebook drn-ai ./docs/generated/<file>.md
```

Then query to enrich:
```bash
notebooklm ask "drn-ai" "Explain the execution flow of this pipeline from a developer perspective"
notebooklm generate report --notebook drn-ai --format study-guide
```

Use NotebookLM response to add "Developer Notes" section to each doc.

---

## Output Standards

All generated docs use this structure:
```markdown
---
title: <component name>
type: generated-docs
generated: <ISO date>
project: ai-drakon-scaffolder
status: draft
---

## Overview
## Architecture
## Key Interfaces / API
## Execution Flow
## Integration Points
## Developer Notes (from NotebookLM)
## Known Issues / TODOs
```

Language: Ukrainian (technical terms in English).

---

## Artifact Storage

- Intermediate: `~/.gemini/antigravity-cli/brain/ai-drakon-docs/`
- Final: `~/workspace/ai-drakon-scaffolder/docs/generated/`
- Git commit after each Phase: `docs: generate <component> documentation [agy]`

---

## MemPalace Indexing (after each Phase)

```python
mempalace_add_drawer(
  wing="ai-drakon",
  room="generated-docs",
  source_file="docs/generated/<file>.md",
  content=<summary 500 words max>
)
```

---

## Report to Claude

After full pipeline completion, send compressed summary:
```
DOCS COMPLETE:
- Phase 1-5: [done/partial/blocked]
- Files: [list of docs/generated/*.md]
- Key findings: [max 5 bullets]
- NotebookLM: [what was added to drn-ai]
- Blockers: [any]
```
