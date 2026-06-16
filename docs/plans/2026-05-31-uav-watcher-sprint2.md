# UAV-Watcher Sprint 2 — Implementation Plan (PAUSED)

> **Status:** PAUSED at TASK-107. Transitioning to Sonate Solidaire project.
> **Resume:** Run `bash ~/bin/delegate-agy.sh "TASK-107"` after Sonate Solidaire phase.

**Goal:** AGY phone works as developer/tester INSIDE ai-drakon browser UI, completing full development cycle for uav-watcher test project.

**Architecture:** AGY phone → mcp-aws.py → RPi Chromium → ai-drakon UI → DRAKON/Architect agents → AGY proxy (agy.exodus.pp.ua) → gemini-2.5-flash

**Tech Stack:** TanStack Router, React, Cloudflare Pages, CDP WebSocket, mcp-aws.py, AGY proxy

---

## Current State (2026-05-31)

### Completed (Sprint 1)
- TASK-90 ✅ MobileNavigationDock in WorkspaceShell
- TASK-99 ✅ Code page no-token fallback UI  
- TASK-100 ✅ DRAKON agent tested — receives code, proxy was misconfigured (fixed)
- TASK-102 ✅ OpenDesign review — service on 192.168.3.184:7459 (not RPi)
- TASK-103 ✅ Sprint 1 report → docs/uav-watcher-analysis/sprint1-report.md
- TASK-104 ✅ AGY proxy set for drakon/architect/docs agents
- TASK-105 ✅ OpenDesign 16 models (18880 proxy slots exposed)
- TASK-106 ✅ GitHub PAT set → Code section shows uav-watcher file tree

### Pending (Sprint 2)
- **TASK-107** [ ] Code→DRAKON full cycle (browse uav_watcher.py → DRAKON agent → diagram)
- **TASK-108** [ ] Architect+DRAKON for 3 key flows: Threat Detection, AllClear, Sharon
- **TASK-109** [ ] Sprint 2 UX audit + problem-map update

### Infrastructure Status
| Service | Host | Port | Status |
|---------|------|------|--------|
| ai-drakon frontend | CF Pages | - | ✅ |
| DRAKON agent | 192.168.3.184 | 8765 | ✅ |
| AGY proxy | agy.exodus.pp.ua | 443 | ✅ |
| OpenDesign | 192.168.3.184 | 7459 | ✅ 16 models |
| agent-workspace | 192.168.3.234 RPi | CDP:38587 | ✅ |
| GitHub PAT | browser localStorage | - | ✅ |

### Key Technical Lessons
1. React textarea CDP: must use `HTMLTextAreaElement.prototype` setter (not Input)
2. AGY phone timeouts on: typing large code + waiting 12s for LLM response
3. Browser tasks must be ATOMIC: 1 screenshot/click per task, not full workflows
4. `drakon.settings` = single JSON key in localStorage (not separate keys)
5. OpenDesign runs Docker, rootfs read-only → patch via Dockerfile rebuild

### Known Issues
- TASK-101: Pipeline editor typing timeout (browser automation limitation)
- Notes section empty — no Create UI
- DRAKON diagram UTF-8 encoding corruption in names
- Pipeline scenarios lack preview cards

## Resume Instructions

After Sonate Solidaire phase, continue with:
```bash
# Pull latest
git pull origin main

# TASK-107: Full Code→DRAKON cycle
bash ~/bin/delegate-agy.sh "TASK-107"

# After completion:
bash ~/bin/delegate-agy.sh "TASK-108"
bash ~/bin/delegate-agy.sh "TASK-109"
```

## Семантичні зв'язки
**Цей документ є частиною:** [[plans/_INDEX]]

**Цей документ пов'язаний з:**
- [[plans/2026-06-16-semantic-knowledge-graph-TASKS]] — наступний розділ (2026 06 16 semantic knowledge graph TASKS)