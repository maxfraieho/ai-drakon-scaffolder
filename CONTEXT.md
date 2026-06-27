# ai-drakon — Project Context

## What This Is

**ai-drakon** is a web platform for AI-assisted DRAKON diagram design and code generation.
DRAKON is a visual algorithmic language (flowchart notation) originally developed for Soviet space programs.
The platform lets users describe algorithms in natural language → LLM generates a DRAKON diagram (JSON) → the diagram can be edited visually and exported as code.

## Domain Glossary

| Term | Meaning |
|------|---------|
| **DRAKON** | Visual algorithmic language. Diagrams are flowcharts with strict rules. |
| **`.drakon` JSON** | The canonical serialization format for a DRAKON diagram. Must have `type:"drakon"`, `items` object, `keywords` object, `params` string. |
| **items** | Map of node ID → node object. Node "1" is always `end`, node "2" is always the entry `branch`. |
| **branch node** | Entry point of a function. `{type:"branch", branchId:0, one:"NEXT_ID"}` |
| **action node** | A step/statement. `{type:"action", one:"NEXT_ID", content:"description"}` |
| **question node** | A conditional. `{type:"question", one:"YES_ID", two:"NO_ID", content:"condition?"}` |
| **JS2604 / Lua2604 / Clj2604** | DRAKON language variants (JavaScript/Lua/Clojure target) |
| **drakongen.js** | Client-side bundle: converts `.drakon` JSON → pseudocode (human-readable). `window.drakongen.toPseudocode()` |
| **drakontechgen.js** | Client-side bundle: converts `.drakon` JSON → actual source code. `window.drakontechgen.buildGenerator()` |
| **drakonwidget** | Embeddable DRAKON diagram editor (stepan-mitkin/drakonwidget on GitHub). Renders the flowchart visually; can import/export `.drakon` JSON. |
| **drakon-codegen** | Appwrite Function that calls an LLM gateway to generate `.drakon` JSON from a natural-language description. |
| **semantic-graph** | Appwrite Function that builds semantic relationships between DRAKON diagrams. |
| **llm-gateway** | Appwrite Function that proxies LLM calls (NVIDIA NIM / OpenAI compatible). |
| **CF Worker** | `drakon-antigravity-worker` — Cloudflare Worker. Auth layer + proxy to Appwrite functions. Auth: `MCP_API_KEY` (bypass) or Appwrite JWT. |
| **CF Pages** | Frontend deployment. Builds from `.lovable/` directory. Route: `ai-drakon.pages.dev`. |
| **Bloom** | Knowledge gateway — `/knowledge` route shows Gateway zones + `/notebooks` shows NotebookLM notebooks. |
| **Garden MCP** | `garden-mcp.exodus.pp.ua` — serves Knowledge Base notes. |
| **Lovable sync rule** | ALL changes to `src/` must be mirrored to `.lovable/src/`. CF Pages builds from `.lovable/`. |

## Architecture

```
User Browser
  └── CF Pages (ai-drakon.pages.dev) — React + TanStack Router
        ├── /login          — Appwrite auth OR bypass token "drakon-mcp-2026"
        ├── /codegen        — DRAKON JSON generation flow (SEE BELOW)
        ├── /diagrams       — DRAKON diagram editor (drakonwidget embed — PLANNED)
        ├── /knowledge      — Bloom gateway zones
        └── /notebooks      — NotebookLM MCP interface

CF Worker (drakon-antigravity-worker.maxfraieho.workers.dev)
  ├── POST /v1/codegen        → calls Appwrite drakon-codegen function
  ├── GET  /v1/codegen-status → polls execution result from logs
  ├── POST /v1/analyze        → code analysis
  └── verifyOwnerAuth()       — MCP_API_KEY | Worker JWT | Appwrite JWT

Appwrite Cloud (fra.cloud.appwrite.io, project: 6a23420a003a04b4997b)
  ├── drakon-codegen function  — LLM → .drakon JSON
  ├── semantic-graph function  — builds semantic graph
  ├── llm-gateway function     — LLM proxy (6a3200cd0006b155c099.fra.appwrite.run)
  └── Auth — Education plan (JWT expires 15 min; refreshed in codegenApi.ts)
```

## Agent Services (Appwrite Functions)
- **architect-agent** (інтегровано через `env.ARCHITECT_AGENT_URL`):
  * `POST /architect/decompose` — декомпозиція вимог на компоненти.
  * `POST /architect/build-parallel` — запуск паралельної збірки.
  * `GET /architect/playpipe/build/{buildId}/stream` (SSE) — стрім статусів збірки.
  * `POST /architect/playpipe/build/{buildId}/retry` — перезапуск збірки компонента.
  * `POST /architect/playpipe/build/{buildId}/stop` — зупинка збірки.
- **docs-agent** (інтегровано через `env.DOCS_AGENT_URL`):
  * Робота з базою знань та документацією.

*Примітка: Адреси функцій встановлюються в CF Worker через `wrangler secret put ARCHITECT_AGENT_URL` та `wrangler secret put DOCS_AGENT_URL` для уникнення хардкоду доменів на кшталт `architect-agent-flue.maxfraieho.workers.dev`.*

## Current /codegen Flow

1. User fills: function name, params, description, target language
2. `codegenApi.ts` → `POST /v1/codegen` (CF Worker) → `drakon-codegen` Appwrite function
3. Appwrite function: LLM generates `.drakon` JSON → validated → base64-encoded in logs
4. CF Worker polls logs → decodes result → returns `{success, drakon_json, language}`
5. `CodegenPage.tsx` receives result → calls `window.drakongen.toPseudocode()` for preview
6. Shows: pseudocode preview + raw `.drakon` JSON (collapsible)

**Missing**: Visual diagram rendering + actual code generation via `drakontechgen.buildGenerator()`

## Planned: DRAKON Editor Integration

Source: `stepan-mitkin/drakonwidget` (GitHub)
Goal: embed the widget in `/codegen` result area so user can:
- See the generated flowchart visually
- Edit it interactively
- Export to code (JS/Lua/Clojure) via `drakontechgen`
- Import existing `.drakon` JSON files

The `drakonwidget` needs to be built and served from `/public/drakonwidget/`.

## Key Files

| Path | Purpose |
|------|---------|
| `src/pages/CodegenPage.tsx` | Main codegen UI |
| `src/lib/codegen/codegenApi.ts` | API client (CF Worker calls) |
| `src/lib/drakon/pseudocode.ts` | drakongen.js wrapper |
| `src/routes/codegen.tsx` | TanStack Router route |
| `services/drakon-codegen/src/main.ts` | Appwrite function source |
| `cloudflare-worker/worker-mcp-drakon.js` | CF Worker (7000+ lines) |
| `public/drakongen.js` | DRAKON→pseudocode client bundle |
| `public/drakontechgen.js` | DRAKON→code client bundle |
| `.lovable/src/` | Mirror of `src/` — CF Pages builds from here |

## ADRs

### ADR-001: Appwrite Education Plan Workaround
Appwrite Education plan does NOT persist `responseBody` for function executions.
**Decision**: Emit result as `DRAKON_JSON_RESULT:<base64>` in function logs. CF Worker polls logs and decodes.

### ADR-002: JWT Refresh Strategy
Appwrite JWTs expire in 15 min. `codegenApi.ts` calls `account.createJWT()` before each request to get a fresh token.

### ADR-003: Lovable Sync Rule
CF Pages builds from `.lovable/` directory. All `src/` changes must be mirrored to `.lovable/src/`.

### ADR-004: MCP_API_KEY Bypass
Static bypass token `"drakon-mcp-2026"` stored in `localStorage["jwt"]` on login. CF Worker checks `env.MCP_API_KEY === token`.

## Agents Working on This Project

| Agent | Role | Tools |
|-------|------|-------|
| Claude (OrangePi) | Orchestrator, planner, reviewer | This instance |
| Opus 4.8 | Deep implementation, complex features | Via antigravity delegate |
| AGY3 (Poco M6 Pro) | UI tasks, browser automation | SSH to 192.168.3.204 |
