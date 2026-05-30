# MemPalace-First Methodology — Implementation Plan

> **For AGY3:** Execute TASK-61 → TASK-67 sequentially. Each task has exact files and commands.

**Goal:** Distribute MemPalace vector search across all agents (Claude, AGY, AGY3) so each searches locally before reading files — saves 5-10x tokens.

**Architecture:** Distributed local MemPalace per agent. ai-memory as event bus (Commit event). Post-commit: agent notifies ai-memory → all agents re-pull + re-index changed files.

**Tech:** mempalace Python, ai-memory HTTP, bash scripts, .mempalace.json config.

---

### TASK-61: Create ai-memory-commit.sh

**Files:**
- Create: `~/bin/ai-memory-commit.sh` on ALL devices (OrangePi + AGY phone + AGY3)

**Script content:**
```bash
#!/bin/bash
# Usage: ai-memory-commit.sh <project-slug> "<file1,file2>"
PROJECT=${1:-unknown}
FILES=${2:-}
curl -s "http://192.168.3.184:49374/hook?event=Commit&project=${PROJECT}&files=${FILES}" > /dev/null
```

**Deploy:** create script locally on AGY3 first, then SSH-copy to AGY phone and OrangePi.

**Verification:** `~/bin/ai-memory-commit.sh ai-drakon "test.ts" && echo OK`

---

### TASK-62: ai-memory server — Commit event handler

**Step 1:** Find server code:
```bash
find /home/vokov -name "*.py" | xargs grep -l "SessionStart\|event=" 2>/dev/null | head -5
```

**Step 2:** Add Commit handler:
1. Parse `project` and `files` query params
2. Project path registry: `{"ai-drakon": "/home/vokov/workspace/ai-drakon-scaffolder", "uav-watcher": "/home/vokov/projects/uav-watcher"}`
3. Run: `git -C <path> pull`
4. Run: `~/bin/mp-index.sh <project> <path> <files>`

**Verification:** POST Commit event → check mempalace search returns updated result.

---

### TASK-63: Create mp-index.sh

**Files:**
- Create: `~/bin/mp-index.sh` on ALL devices

**Script content:**
```bash
#!/bin/bash
# Usage: mp-index.sh <wing> <project-path> [file1,file2,...]
WING=$1
PROJECT_PATH=$2
FILES=$3
cd "$PROJECT_PATH" || exit 1
if [ -z "$FILES" ]; then
    python3 -m mempalace index . --wing "$WING" --config .mempalace.json
else
    IFS=',' read -ra FILE_LIST <<< "$FILES"
    for f in "${FILE_LIST[@]}"; do
        [ -f "$f" ] && python3 -m mempalace index "$f" --wing "$WING"
    done
fi
```

**Verification:**
```bash
~/bin/mp-index.sh ai-drakon ~/workspace/ai-drakon-scaffolder
python3 -m mempalace search "AgentChatPanel" --wing ai-drakon | head -5
```

---

### TASK-64: .mempalace.json for ai-drakon

**File:** `/home/vokov/workspace/ai-drakon-scaffolder/.mempalace.json`

```json
{
  "wing": "ai-drakon",
  "index": [
    "src/**/*.{ts,tsx}",
    "services/**/*.py",
    "docs/**/*.md",
    "development/TASKS.md",
    "development/SYNC_METHODOLOGY.md",
    "HANDOFF.md",
    "package.json"
  ],
  "exclude": [".env*", "node_modules/", "*.lock", "dist/", ".lovable/"],
  "chunk_by": "function"
}
```

Commit + initial index: `~/bin/mp-index.sh ai-drakon ~/workspace/ai-drakon-scaffolder`

---

### TASK-65: .mempalace.json for uav-watcher

**File:** `/home/vokov/projects/uav-watcher/.mempalace.json`

```json
{
  "wing": "uav-watcher",
  "index": ["*.py", "docs/**/*.md", "HANDOFF.md"],
  "exclude": [".env*", "__pycache__/", "*.pyc", "config.json"],
  "chunk_by": "function"
}
```

Commit + initial index: `~/bin/mp-index.sh uav-watcher /home/vokov/projects/uav-watcher`

---

### TASK-66: agy-task.sh — add MemPalace-first rule

**Files:** `~/bin/agy-task.sh` on AGY3 AND AGY phone

Add to the task prompt (before task execution instructions):

```
MEMPALACE-FIRST RULE (mandatory):
Before reading ANY project file:
  1. python3 -m mempalace search "<what you need>" --wing <project-slug>
  2. If found: read only that section (targeted read with offset+limit)
  3. If not found: read full file (exception only), then:
     ~/bin/ai-memory-commit.sh <project-slug> "<file>"
After git push: ALWAYS run:
  ~/bin/ai-memory-commit.sh <project-slug> "<comma-separated-changed-files>"
```

---

### TASK-67: SYNC_METHODOLOGY.md — MemPalace section

**File:** `/home/vokov/workspace/ai-drakon-scaffolder/development/SYNC_METHODOLOGY.md`

Add section "## MemPalace-First Lookup" covering:
- Core rule: search before read, 5-10x token savings
- Registered projects: ai-drakon, uav-watcher (with wing names)
- Commit flow: git push + ai-memory-commit.sh + all agents re-index
- Each agent has own local MemPalace (independent, coordinated via ai-memory)

Commit: `git commit -m "docs: add MemPalace-first methodology section (TASK-67)"`

**Diary:** `"SESSION:2026-05-30|TASK-61..67:mempalace-first-methodology|DONE|all-agents|★★★"`
(agent: agt-ogy3)
