# AI-DRAKON Platform — Agent & Developer Guide

## Project Overview

AI-DRAKON is a platform for DRAKON visual programming: creating, editing, and generating flowchart-based diagrams from natural language or code. The stack is:

- **Frontend**: React + TanStack Router, deployed on Cloudflare Pages (builds from `.lovable/`)
- **Backend logic**: Cloudflare Worker (`drakon-antigravity-worker`) — all authenticated API calls go through it
- **AI functions**: Appwrite Functions (node-22 / python-3.12) on `fra.cloud.appwrite.io`
- **Auth**: Appwrite JWT — stored in `localStorage` as `jwt`

**Critical sync rule**: after every change to `src/`, copy the file to `.lovable/src/` and commit both. Cloudflare Pages builds from `.lovable/`.

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

To add a language, add an entry to `LANGUAGES` in `src/pages/CodegenPage.tsx` (and sync to `.lovable/src/pages/CodegenPage.tsx`).

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

Routes are file-based under `src/routes/`. After adding a new route file, **manually update `routeTree.gen.ts`** in both `src/` and `.lovable/src/` — add:
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

After editing, sync: `cp src/components/workspace/WorkspaceShell.tsx .lovable/src/components/workspace/WorkspaceShell.tsx`
