# Agent Development Workflow

> Real usage pattern for AI-DRAKON development with Claude Code, goclaw, and Codex.

## Overview

Three agents collaborate in a layered workflow:

```
Claude Code (architect + reviewer)
    ↓ delegates implementation
goclaw (coding agent on 192.168.3.184)
    ↓ uses free-claude-code proxy
NIM models (free NVIDIA GPU inference)
    ↑ Codex (parallel batch tasks)
```

## goclaw Setup

**Config:** `/home/vokov/projects/goclaw/config.json`

```json
{
  "providers": {
    "openai": {
      "api_key": "freecc",
      "api_base": "http://localhost:18880/v1"
    }
  },
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "coding-proxy"
    }
  }
}
```

**Env:** `/home/vokov/projects/goclaw/.env.local`
```
GOCLAW_OPENAI_API_KEY=freecc
GOCLAW_OPENAI_BASE_URL=http://localhost:18880/v1
```

**Available slots** (model= in goclaw):
- `coding-proxy` — code generation (default)
- `fast-proxy` — quick tasks (alias: claude-haiku-3-5)
- `standard-proxy` — balanced (alias: claude-sonnet-4-5)
- `reasoning-proxy` — complex analysis
- `analytics-proxy` — data analysis

## MCP Integration

**MCP config:** `.mcp.json` in repo root (Streamable HTTP)

```json
{
  "mcpServers": {
    "drakon": {
      "type": "streamable-http",
      "url": "https://drakon-mcp-worker.maxfraieho.workers.dev/mcp",
      "headers": { "Authorization": "Bearer drakon-mcp-2026" }
    }
  }
}
```

**Available MCP tools:**
- `drakon.analyzecodebase(owner, repo, branch)` → DRAKON IR for all functions
- `drakon.savediagram(name, ir)` → save to MinIO (requires MINIO_SECRET_KEY)
- `drakon.listdiagrams()` → list saved diagrams
- `drakon.validateir(ir)` → validate IR structure
- `drakon.getdiagram(name)` → fetch saved diagram

## Typical Development Cycle

### 1. Analyze existing code → DRAKON IR

```
Claude Code calls: drakon.analyzecodebase(owner="maxfraieho", repo="free-claude-code-alpine")
→ Returns 83 DRAKON diagrams (Python functions)
→ Claude reviews key diagrams (SlotRouter, HealthRegistry, etc.)
→ Identifies improvement areas
```

### 2. Plan with Claude, implement with goclaw

```
Claude Code: writes implementation plan (docs/plans/YYYY-MM-DD-feature.md)
Claude Code: delegates to goclaw via Telegram or direct API
goclaw: implements using coding-proxy slot
Claude Code: reviews, validates
```

### 3. Batch file changes with Codex

When T1-T5 triggers fire (N≥3 similar files, N≥2 new files):
```bash
codex exec --dangerously-bypass-approvals-and-sandbox "<task prompt>"
```

### 4. Validate via DRAKON

```
After implementation:
drakon.analyzecodebase → check if new functions have good IR
drakon.validateir → validate any manually created IRs
drakon.savediagram → save approved diagrams to MinIO
```

## Python AST Microservice

**Endpoint:** `https://research.exodus.pp.ua`

```bash
# Health check
curl https://research.exodus.pp.ua/health

# Analyze single file
curl -X POST https://research.exodus.pp.ua/analyze \
  -H "Content-Type: application/json" \
  -d '{"source": "def foo(x):\n  if x: return 1\n  return 0", "filename": "foo.py"}'

# Analyze multiple files
curl -X POST https://research.exodus.pp.ua/analyze-files \
  -H "Content-Type: application/json" \
  -d '{"files": [{"path": "module.py", "source": "..."}]}'
```

**DRAKON IR format returned:**
```json
{
  "name": "ClassName.method_name",
  "items": {
    "1": {"type": "terminator", "text": "START", "next": "2"},
    "2": {"type": "decision", "text": "condition?", "yes": "3", "no": "4"},
    "3": {"type": "action", "text": "do_thing()", "next": "5"},
    "4": {"type": "action", "text": "other()", "next": "5"},
    "5": {"type": "terminator", "text": "END", "next": null}
  },
  "complexity": 2
}
```

**Node types:** `terminator`, `action`, `decision`, `loop_start`, `loop_end`, `call`, `branch`

**DRAKON mapping rules (from Gemini research):**
| Python construct | DRAKON node |
|-----------------|-------------|
| `if/elif/else` | decision chain (Common Fate Merge) |
| `for/while` | loop_start + loop_end |
| `break` | action → jumps past loop_end |
| `try/except` | action + synthetic decision (Rightward Degradation) |
| `finally` | convergence action (both paths meet) |
| `with` | collapsed action |
| sequential assignments | single action (Basic Block grouping) |

## UAV Watcher (separate project)

**Repo:** github.com/maxfraieho/uav-watcher (private)
**Server:** 192.168.3.184, `/home/vokov/projects/uav-watcher/`
**Log:** `tail -f /var/log/uav-watcher.log` (OpenRC: uav-watcher)

Monitors Telegram channel -1002187970584 for UAV threats to Олександрія.
Pipeline: Telethon userbot (@jdepardieu) → regex pre-filter → goclaw AI (fast-proxy) → Bot API → Q.

Add channels: edit `config.json` → `rc-service uav-watcher restart`
