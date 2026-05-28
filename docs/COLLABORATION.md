# Claude+AGY Collaboration Guide

## 1. Overview — Claude+AGY Tandem
The AI-DRAKON project utilizes a powerful hybrid multi-agent tandem to execute software engineering tasks efficiently, combining high-quality orchestration with cost-effective implementation.

- **Claude (Sonnet 4.6)** acts as the **orchestrator**: responsible for high-level planning, architectural design, code review, and writing detailed specifications.
- **AGY (Gemini 2.5 Pro running on Android/Termux)** acts as the **executor**: handles concrete code implementation, runs terminal commands, updates task queues, and pushes commits to Git.
- **Q (Human)** acts as the **product owner**: sets product direction, reviews and confirms key decisions, and activates/triggers the AGY executor.
- **Rationale**: This split optimizes costs and token usage. Running complex reasoning via Claude Code can be expensive, whereas Gemini 2.5 Pro via Google Cloud Code on Termux offers high intelligence with a much higher, free-tier execution quota.

---

## 2. Infrastructure
The collaboration is supported by a robust network of distributed servers, proxies, and services:

| Component | Address | Purpose |
|-----------|---------|---------|
| **Claude Code** | OrangePi (`192.168.3.161:3456`) | Main orchestrator agent |
| **AGY CLI** | Termux (`192.168.3.195:8080`) | Gemini execution environment |
| **AGY Proxy** | `https://agy.exodus.pp.ua` | Public API endpoint for Gemini/Claude models |
| **Dev Server** | `192.168.3.184` | Houses Docker containers, background agents, routing proxies |
| **ai-memory** | `192.168.3.184:49374` | Cross-agent session synchronization layer |
| **MemPalace** | `192.168.3.184` (Python-based) | Semantic memory, diary writing, and Knowledge Graph (KG) |
| **NotebookLM** | `192.168.3.234:8002` | Long-term project knowledge base |
| **cloudflared** | OrangePi native | Public secure tunnel exposing internal services |

---

## 3. Three-Layer Memory System
To ensure long-term consistency, operational continuity, and seamless context sharing, the architecture implements a three-layer memory system:

### Layer 1 — Operational Memory (MemPalace)
- **Technology**: Semantic vector search powered by a customized ChromaDB instance.
- **Components**:
  - **Diary**: Individual diaries tracked per agent (`agent: agt-ogy` for AGY, `agent: claude-code` for Claude).
  - **Knowledge Graph (KG)**: A graph-based repository storing structured project facts and relationships.
  - **MemPalace Mine**: Over 1,439 codebase files indexed across 19 drawers.
- **Usage**: Querying context between active sessions, semantic code search, and low-level task tracking.

### Layer 2 — Cross-Agent Sync (ai-memory)
- **Technology**: Rust binary, SQLite FTS5 backend, git-versioned markdown wiki.
- **Automation**: Captured automatically via lifecycle hooks (`SessionStart`/`SessionStop`).
- **AGY Hooks**: Customized shell scripts in Termux (`~/bin/ai-memory-start.sh` and `~/bin/ai-memory-end.sh`) trigger session start/stop events.
- **Endpoints**: `POST /api/sessions` on `http://192.168.3.184:8790` (internal mapping of port `49374`).
- **Web UI**: Access at `http://192.168.3.184:8790/web` or `http://192.168.3.184:49374/web`.
- **Purpose**: Provides zero-friction, automated handoffs between Claude and AGY without requiring manual documentation.

### Layer 3 — Knowledge Base (NotebookLM)
- **Technology**: Google's NotebookLM wrapped with a custom `notebooklm-py` service.
- **Notebooks**:
  - `drn-ai` (ID: `6139067a-5776-4b29-8869-7c9f9aed475c`) — Main codebase knowledge base.
  - `AI-Memory` (ID: `9386840e-d2e2-4c16-996a-a13f87898667`) — Agent memory research and setup.
  - `Codebase Analysis` (ID: `2521c922-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) — Deep structural codebase insights.
- **Usage**: Deep contextual Q&A regarding project structure, generating high-level summaries/podcasts, and indexing human-curated knowledge.

---

## 4. Task Coordination Protocol (TASKS.md)
The formal coordination between the orchestrator (Claude) and the executor (AGY) is managed through a single source of truth file: `development/TASKS.md`.

### The Coordination Workflow
1. **Planning**: Claude writes down the exact tasks, specifying sequential steps, target files, exact commands, and verification criteria.
2. **Commit**: Claude commits and pushes the updated `TASKS.md` to `origin/main`.
3. **Execution**: The human product owner (Q) triggers AGY on Termux: `"виконай TASK-N"`.
4. **Implementation**: AGY parses `TASKS.md`, marks the active task as `[~]`, executes it step by step, and verifies correctness.
5. **Completion**: AGY marks the task as `[x]`, writes a transaction to the MemPalace diary, commits, and pushes changes to git.
6. **Verification**: Claude pulls the repository and verifies completion using `git log` or by reading the `mempalace` diary of `agt-ogy`.

### Task Specification Format
```markdown
### TASK-N: [Title]
```
```
[ ] TASK-N
  META: Context, objectives, and rationale
  STEP 1: Precise command or code edit description
  STEP 2: Subsequent action steps
  VERIFY: Test commands and expected output validation
  DIARY: SESSION:date|TASK-N:short-title|DONE|details|***
```
```

---

## 5. AGY Proxy — Endpoints and Models
AGY Proxy runs locally on Termux and is exposed via a secure Cloudflare tunnel to act as a dual-protocol gateway.

- **Public Base URL**: `https://agy.exodus.pp.ua`
- **Local Base URL**: `http://192.168.3.195:8080`
- **GitHub Repository**: [maxfraieho/antigravity-claude-proxy](https://github.com/maxfraieho/antigravity-claude-proxy)

### Available Endpoints
- `POST /v1/messages` — Anthropic-compatible API.
- `POST /v1/chat/completions` — OpenAI-compatible API (custom implementation in this fork).
- `GET /health` — Health check, status of Google accounts, and live rate limit quotas.
- `GET /v1/models` — List of active models.

### Primary Supported Models
- `gemini-2.5-pro` — Best reasoning capability (ideal for complex code writing and planning).
- `gemini-2.5-flash` — Very fast (ideal for quick commands and light editing, higher rate limits).
- `gemini-3.5-flash-medium` — Optimized medium speed reasoning model.
- `claude-sonnet-4-6` — Exposes Claude Sonnet 4.6 via the premium MAX account rotation.
- `claude-opus-4-6-thinking` — Extended thinking mode.

---

## 6. Claude Code Skills System
Claude Code operates with a set of modular skills located in `~/.claude/skills/` that extend its environment capability.

### Core Active Skills
- `notebooklm-mcp` — Directly query or add new text sources to NotebookLM notebooks.
- `session-current` — Tracks and displays details of the current active session.
- `agy-termux` — Quick workflow reference for AGY (SSH details, API endpoints, verify checklists).

### Mandatory Skill Activation Sequence (MSAS)
Before starting any significant work, the orchestrator evaluates all available skills. For every skill, it decides `YES` or `NO` with a short rationale and triggers all `YES` skills using the `Skill()` tool to set up the context.

---

## 7. Cloudflare Infrastructure
All developer endpoints and microservices are exposed securely using a native Cloudflare tunnel.

- **Tunnel ID**: `7c2d896d-2c77-4486-af56-ef30969ca942` (running natively on OrangePi)
- **Configuration Path**: `/etc/cloudflared/config.yml`

### Public Service Directory
- `agy.exodus.pp.ua` ➔ Termux AGY proxy (`:8080`)
- `claude.exodus.pp.ua` ➔ Raspberry Pi 3B Claude Code (`:3456`)
- `claude2.exodus.pp.ua` ➔ OrangePi Claude Code (`:3456`)
- `drakon-agent.exodus.pp.ua` ➔ Dev Server Drakon Agent (`:8765`)
- `architect-agent.exodus.pp.ua` ➔ Dev Server Architect Agent (`:8766`)
- `docs-agent.exodus.pp.ua` ➔ Dev Server Docs Agent (`:8767`)
- `openai-proxy.exodus.pp.ua` ➔ Free Nvidia NIM Proxy (`:18880`)
- `garden-mcp.exodus.pp.ua` ➔ MCP server endpoint (`:8081`)
- `notebooklm.exodus.pp.ua` ➔ NotebookLM MCP server (`:8002`)
- `ssh.exodus.pp.ua` ➔ Secure SSH tunnel mapping (`:22`)

---

## 8. AI-DRAKON Agents Configuration
The frontend application (`ai-drakon-scaffolder`) hosts three specialized background agents whose LLM configurations can be customized in the Settings panel:

- **Architect Agent** ➔ Configured to **AGY (`gemini-2.5-pro`)** [ACTIVE ✅]
- **DRAKON Logic Agent** ➔ Configured to **openai-proxy (NIM)** [Needs update to AGY]
- **Docs Agent** ➔ Configured to **openai-proxy (NIM)** [Needs update to AGY]

To update an agent to use the AGY tandem:
1. Open the UI Settings panel.
2. Select **LLM Provider** ➔ **Protocol**: `AGY`.
3. Set **Base URL**: `https://agy.exodus.pp.ua`.
4. Save and restart the agent workspace.

---

## 9. Roadmap — Scaling

### Phase 1 (Complete ✅)
- Dual-protocol AGY proxy supporting OpenAI and Anthropic formats.
- Stable Cloudflare tunnel exposure for Termux.
- Automated `ai-memory` session capture and synchronization.
- Structured task queues (`TASKS.md`) for cross-agent coordination.
- UI LLM-provider settings updated to support AGY proxy.

### Phase 2 (Next Steps 🚀)
- Transition all three scaffolding agents (Architect, DRAKON, Docs) to use AGY as the primary reasoning LLM.
- Install native `ai-memory` hooks on OrangePi to capture Claude Code sessions automatically.
- Write an `ai-memory` MCP server (`memory_query`, `memory_write_page`) for Claude Code.
- Update `free-claude-code-proxy` on `192.168.3.184` to list `agy-tunnel` with automatic fallback to Nvidia NIM models when rate-limited.
- Implement advanced Google account rotation and quote management for AGY.

### Phase 3 (Future Vision 🌌)
- Fully automated task worker: Claude pushes a `TASKS.md` change, a webhook triggers AGY, AGY auto-executes, verifies, and commits/pushes results without human intervention.
- Cross-session semantic search directly integrated into Claude's prompt context.
- Auto-syncing NotebookLM: after every successful Claude session, the summary is compiled and uploaded as a source to the `drn-ai` notebook.
- Distributing execution across a swarm of multiple parallel Android/Termux devices.
