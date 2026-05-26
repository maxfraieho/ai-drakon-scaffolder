---
title: "AGY Repo Analyzer — Skill"
type: guide
tags: [drakon, python, agy]
status: active
created: 2026-05-26
updated: 2026-05-26
---

# AGY Repo Analyzer — Skill

## Purpose

Index the `ai-drakon-scaffolder` codebase into MemPalace and NotebookLM `drn-ai`.
Run this skill when MemPalace data is stale or a new feature sprint is complete.

---

## Trigger Conditions

Run this skill when:
- More than 7 days since last indexing
- New Lovable/AGY commits landed (check `git log --oneline -5`)
- `mempalace_search("ai-drakon")` returns < 5 results
- Claude or Q explicitly requests re-indexing

---

## Phase 1 — Git State Check

```bash
ssh vokov@192.168.3.184 "cd ~/workspace/ai-drakon-scaffolder && git log --oneline -10 && git status --short"
```

Record: last commit hash, date, changed files.

---

## Phase 2 — codetomd Bundle

```bash
ssh vokov@192.168.3.184 "cd ~/workspace/ai-drakon-scaffolder && python3 scripts/codetomd/codetomd.py"
# Interactive: set root=. , output=scratch/project_code.md
# Then copy to local:
scp vokov@192.168.3.184:~/workspace/ai-drakon-scaffolder/scratch/project_code.md ~/.gemini/antigravity-cli/scratch/
```

Skip directories (add to codetomd ignore): `.lovable`, `node_modules`, `dist`, `.git`, `src/components/ui`

---

## Phase 3 — MemPalace Indexing (Selective)

Index by room, NOT as one giant chunk:

### Room: source-worker
```python
# cloudflare-worker/worker-mcp-drakon.js — route map summary
# Already indexed by Claude — CHECK FIRST with mempalace_search
```

### Room: source-services
For each service (`drakon-agent`, `architect-agent`, `docs-agent`):
- Read `main.py` and key routes
- Add drawer: wing=ai-drakon, room=source-services

### Room: source-lib
Key files: `api.ts`, `graph-pipeline-api.ts`, `htse/ir-types.ts`, `context/ProjectContext.tsx`

### Room: source-routes
Frontend routes summary + WorkspaceShell layout

### Room: docs
`architecture.md`, `agent-workflow.md`, generated docs

**BEFORE adding: always run `mempalace_check_duplicate()` first.**

---

## Phase 4 — NotebookLM Sources Update

Add new/changed files to `drn-ai` notebook:
```bash
# Add architecture docs
notebooklm source add --notebook drn-ai ~/workspace/ai-drakon-scaffolder/docs/architecture.md
notebooklm source add --notebook drn-ai ~/workspace/ai-drakon-scaffolder/docs/agent-workflow.md

# Add generated code bundle (condensed)
notebooklm source add --notebook drn-ai ~/.gemini/antigravity-cli/scratch/project_code.md

# Wait for processing
notebooklm source wait --notebook drn-ai --all --timeout 120
```

---

## Phase 5 — Semantic Verification

Query MemPalace to confirm indexing:
```python
results = mempalace_search("ai-drakon LangGraph architect-agent")
assert len(results) >= 3, "Indexing incomplete"

results = mempalace_search("DRAKON IR IrDiagram items")
assert len(results) >= 2, "IR types not indexed"
```

Query NotebookLM to confirm knowledge:
```bash
notebooklm ask "drn-ai" "What is the DRAKON IR format?" --json
# Expect: mention of IrDiagram, IrItem types, items Record
```

---

## Report Format

```
INDEXING COMPLETE:
- Commits covered: [hash range]
- MemPalace drawers added: [count] in rooms [list]
- NotebookLM drn-ai: [sources added]
- Verification: [passed/failed]
- Next recommended action: run 01-docs-agent
```
