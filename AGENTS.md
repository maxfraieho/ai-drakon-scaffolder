# AI-DRAKON Platform — Agent & Developer Guide

## Project Overview

AI-DRAKON is a platform for DRAKON visual programming: creating, editing, and generating flowchart-based diagrams from natural language or code. The stack is:

- **Frontend**: React + TanStack Router, deployed on Cloudflare Pages
- **Backend logic**: Cloudflare Worker (`drakon-antigravity-worker`) — all authenticated API calls go through it
- **AI functions**: Appwrite Functions (node-22 / python-3.12) on `fra.cloud.appwrite.io`
- **Auth**: Appwrite JWT — stored in `localStorage` as `jwt`

---

## Feature: DRAKON Code Generation (`drakon-codegen`)

### What it does

Generates a valid `.drakon` JSON flowchart from a natural-language function description via LLM. The result can be imported into **DrakonTech Desktop** to produce executable code in the chosen language.

### Supported languages

| Value | Label |
|-------|-------|
| `JS2604` | JavaScript |
| `Lua2604` | Lua |
| `Clj2604` | Clojure |

To add a language, add an entry to `LANGUAGES` in `src/pages/CodegenPage.tsx`.

### Architecture

```
UI (/codegen)
  └─ src/pages/CodegenPage.tsx
       └─ src/lib/codegen/codegenApi.ts
            └─ POST /v1/codegen  →  CF Worker: handleDrakonCodegen()
                                          └─ Appwrite Function: drakon-codegen
                                               └─ LLM (NIM / llm-gateway)
            └─ GET /v1/codegen-status?execution_id=...  →  CF Worker: handleCodegenStatus()
```

### Request / Response

**POST `/v1/codegen`** (requires `Authorization: Bearer <jwt>`)

```json
{
  "description": "Calculate factorial recursively",
  "functionName": "factorial",
  "language": "JS2604",
  "params": "n"
}
```

Response: `{ "execution_id": "...", "status": "accepted" }`

**GET `/v1/codegen-status?execution_id=<id>`**

Response when completed:
```json
{
  "status": "completed",
  "output": {
    "success": true,
    "drakon_json": { "type": "drakon", "items": { ... }, "keywords": {...}, "params": "n" },
    "language": "JS2604",
    "functionName": "factorial"
  }
}
```

### Key files

| File | Purpose |
|------|---------|
| `services/drakon-codegen/src/main.ts` | Appwrite Function — LLM call, JSON extraction, validation |
| `src/pages/CodegenPage.tsx` | React form UI + pseudocode preview |
| `src/routes/codegen.tsx` | TanStack Router file route (`/codegen`) |
| `src/lib/codegen/codegenApi.ts` | API client with async polling |
| `cloudflare-worker/worker-mcp-drakon.js` | CF Worker handlers (`:3363` `handleDrakonCodegen`, `:3424` `handleCodegenStatus`) |
| `public/drakongen.js` | Client-side DRAKON → pseudocode (loaded at runtime) |
| `public/drakontechgen.js` | Client-side DRAKON tech generator (loaded at runtime) |

### Appwrite Function config

| Field | Value |
|-------|-------|
| Function ID | `6a33b6050037a2fff34e` |
| Runtime | `node-22` |
| Entrypoint | `dist/main.js` |
| Build commands | `npm install && npm run build` |
| Timeout | 120 s |
| Provider root | `services/drakon-codegen` |

**Environment variables** (set in Appwrite console):

| Var | Required | Description |
|-----|----------|-------------|
| `NIM_API_KEY` | No | NVIDIA NIM key — if set, uses `integrate.api.nvidia.com` directly with `nvidia/llama-3.3-nemotron-super-49b-v1` |
| `LLM_GATEWAY_URL` | No | Custom LLM gateway URL (default: `https://6a3200cd0006b155c099.fra.appwrite.run`) |
| `LLM_GATEWAY_TOKEN` | No | Auth token for gateway (default: `freecc`) |

### CF Worker env vars

| Var | Value |
|-----|-------|
| `DRAKON_CODEGEN_FUNCTION_ID` | `6a33b6050037a2fff34e` |

Set in `cloudflare-worker/worker-wrangler.toml` under `[vars]`. Deploy with:
```bash
CLOUDFLARE_API_TOKEN=<token> npx wrangler deploy --config cloudflare-worker/worker-wrangler.toml
```

### Appwrite Education plan workaround

Appwrite Education plan **does not persist `responseBody`** for function executions. The function works around this by emitting the result to logs:

```typescript
const encoded = Buffer.from(JSON.stringify(result), "utf-8").toString("base64");
log(`DRAKON_JSON_RESULT:${encoded}`);
```

`handleCodegenStatus()` in the CF Worker extracts it with:
```javascript
const m = logs.match(/DRAKON_JSON_RESULT:([A-Za-z0-9+/=]+)/);
```

If this ever stops working, check that `logs` is not empty in the Appwrite execution response.

### Client-side pseudocode preview

After the `.drakon` JSON is returned, `CodegenPage` tries to call `window.drakongen.toPseudocode()` (loaded from `/public/drakongen.js`) to show a pseudocode preview. This is best-effort — exact compiled code requires importing the `.drakon` file into DrakonTech Desktop.

---

## Feature: Semantic Graph (`semantic-graph`)

Scans all Markdown files in a GitHub repository and uses LLM to build semantic link sections (`## Семантичні зв'язки`) in each note.

### Appwrite Function config

| Field | Value |
|-------|-------|
| Function ID | `6a32155a00077735bcf6` |
| Runtime | `node-22` |
| Entrypoint | `dist/main.js` |
| Build commands | `npm install && npm run build` |
| Timeout | 300 s |
| Provider root | `services/semantic-graph` |

### Key behaviour

- Scans **all** `.md` files in the repo root (not just `docs/`), excludes `node_modules/`, `dist/`, etc.
- Prioritises `docs/` > README > top-level > deeply nested (to fit LLM context)
- Fetches top 150 files by priority before calling LLM
- Writes `## Семантичні зв'язки` sections back to GitHub via `PUT` when `apply: true`
- Dry-run default: pass `{ "apply": true }` to write changes

---

## Routing rules (TanStack Router)

Routes are file-based under `src/routes/`. After adding a new route file, **manually update `routeTree.gen.ts`** in `src/` — add:
1. The `import` near the top
2. A `const XxxRoute = XxxRouteImport.update({ id: '/xxx', path: '/xxx', getParentRoute: () => rootRouteImport } as any)` block
3. `XxxRoute: XxxRoute,` in `rootRouteChildren`
4. `/xxx` entries in all `FileRouteTypes` interface blocks (`FileRoutesByFullPath`, `FileRoutesByTo`, `FileRoutesById`, union literals)

The Vite plugin regenerates `routeTree.gen.ts` during `npm run dev`, but **not** during Cloudflare Pages CI build — the committed file is used as-is.

---

## Navigation

Navigation items live in `src/components/workspace/WorkspaceShell.tsx`:
- `NAV_WORKSPACE` array — sidebar links
- `getBreadcrumb()` — maps path prefixes to breadcrumb labels
- `iconRailItems` — icon rail on the left

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **ai-drakon-scaffolder** (4053 symbols, 9554 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/ai-drakon-scaffolder/context` | Codebase overview, check index freshness |
| `gitnexus://repo/ai-drakon-scaffolder/clusters` | All functional areas |
| `gitnexus://repo/ai-drakon-scaffolder/processes` | All execution flows |
| `gitnexus://repo/ai-drakon-scaffolder/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

## GitNexus-First Rule for Agents (ЗАКОН — added 2026-08-21)

**ПЕРЕД читанням будь-якого файлу цього репозиторію** (Read/cat/grep напряму,
без винятків для Gemini/AGY чи Codex) — спочатку `query`/`context`/`cypher`
через GitNexus MCP:

```
query({search_query: "...", repo: "ai-drakon-scaffolder"})
```

Тільки якщо GitNexus не дав релевантного результату (порожньо / target: N/A) —
читати файл напряму через `Read(file, offset)`.

**Перед серйозною роботою (рефакторинг, нова фіча, UI-інтеграція)** — перевірити
свіжість індексу: `gitnexus://repo/ai-drakon-scaffolder/context` або
`list` (CLI) → звірити `Commit` з `git log -1`. Якщо застарілий — `analyze --force`
до початку роботи, не після.

Це правило рівнозначно застосовується і до Gemini/antigravity-cli (AGY),
і до Claude Code, і до Codex — незалежно від того, який агент читає цей файл.

## Feature: Chrome DevTools Protocol (CDP) Laptop Tunnel

### Architecture
- **Windows Laptop IP**: `100.68.179.102` (via Tailscale) / `192.168.3.30` (local LAN)
- **Local Forwarding Port**: `19222` (mapped to remote Chrome CDP `9222`)
- **Systemd User Service**: `chrome-tunnel.service` keeps the SSH tunnel alive automatically in the background.

### Managing the Tunnel
The tunnel runs as a user-level Systemd service under user `vokov`.
- **Status**: `systemctl --user status chrome-tunnel.service`
- **Restart**: `systemctl --user restart chrome-tunnel.service`
- **Logs**: `journalctl --user -u chrome-tunnel.service -n 50`

### Browser Automation / CDP Control
If the `chrome-win` MCP server fails or returns `EOF` (due to cached connection errors in the session), you can use raw WebSocket CDP controls directly over `http://127.0.0.1:19222`.
- Active tabs list: `http://127.0.0.1:19222/json`
- Open new tab: `PUT http://127.0.0.1:19222/json/new?URL`
- Connect to tab `webSocketDebuggerUrl` via Python's `websocket-client` library. **Important**: Always pass `suppress_origin=True` to `websocket.create_connection` to bypass Chrome origin security checks.

## ОБОВ'ЯЗКОВІ ПРАВИЛА ДЛЯ АГЕНТІВ (Orange Pi PC2)

### ЗАБОРОНЕНО локально на orange pi:
- npm install / npm i / bun install
- tsc / npx tsc / npm exec tsc
- yarn / pnpm install
- будь-який build-процес

### НАТОМІСТЬ — тільки через SSH:
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-scaffolder && npx tsc --noEmit"
ssh vokov@192.168.3.184 "cd /home/vokov/workspace/ai-drakon-scaffolder && npm install <package>"

Причина: Orange Pi має лише 1GB RAM. Локальний tsc/npm вбиває процес агента через swap thrashing.

### NotebookLM & GitNexus Copilot Protocol
- Для складного рефакторингу, розробки фіч або архітектурних рев'ю обов'язково активувати скіл `notebooklm-gitnexus-copilot`.
- Згенеровувати PDF артефакт проекту через `/home/vokov/resume/run_md_service.sh --batch --source <path> --output <pdf_path> --structure-only`.
- Ініціалізувати записник у NotebookLM MCP (`notebooks_create`), підключати PDF та посилання GitNexus (`gitnexus://repo/...`), консультуватися з агентом NotebookLM (`chat_ask`).

