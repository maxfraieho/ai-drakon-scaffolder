# AI-DRAKON Agents Migration Plan: Python/LangGraph to TypeScript/Flue

This document outlines the architecture, mapping, and step-by-step strategy for migrating the AI-DRAKON platform agents from Python (FastAPI/LangGraph) to TypeScript/Flue deployed on Cloudflare Workers.

---

## 1. Flue Framework Summary

**Flue** is a TypeScript-first agent harness framework. The core philosophy is **Agent = Model + Harness**.
- **Harness & Sessions:** A headless runtime environment that manages sandboxing, tool execution, session history, and model interaction.
- **Virtual Sandboxes:** Built-in virtual sandbox (powered by `just-bash`) allows lightweight, high-performance execution on Cloudflare Workers without full Docker/VM containers.
- **Structured Outputs:** Uses schema validation libraries (such as Valibot or Zod) to enforce type-safe structured data responses from LLMs.
- **Provider API:** Allows custom API endpoints (e.g. LLM proxies) using standard protocols like `openai-completions` or custom protocol registers.

---

## 2. Architecture Decision: 1 Worker vs. 3 Workers

> [!TIP]
> **Recommendation: 1 Worker with Routing**

We recommend deploying all three agents (and their workflows) as **one unified Cloudflare Worker** with routing. 

### Rationale:
1. **Shared Configuration & Secrets:** Only one set of Wrangler secrets needs to be managed (`CUSTOM_API_KEY`, `GITHUB_TOKEN`).
2. **Unified Routing:** Flue automatically routes HTTP traffic based on file directories:
   - `POST /agents/drakon/:id` -> `agents/drakon.ts`
   - `POST /agents/architect/:id` -> `agents/architect.ts`
   - `POST /agents/docs/:id` -> `agents/docs.ts`
   - `POST /workflows/pipeline-a` -> `workflows/pipeline-a.ts`
   - `POST /workflows/pipeline-b` -> `workflows/pipeline-b.ts`
3. **Resource Efficiency:** Avoids multiple Cold Starts and stays well within Cloudflare Worker free/hobby plan limits.
4. **Hono Integration:** `src/app.ts` provides a clean, single point of entry to run additional FastAPI-parity routes (e.g., `/health`, `/projects`, `/docs`) alongside the Flue agent endpoints.

---

## 3. Mapping Table: Python Routes -> Flue Agents/Tools

| Service | Python Route | Flue Agent / Workflow / Route | Description / Strategy |
| :--- | :--- | :--- | :--- |
| **drakon-agent** | `POST /analyze` | Tool: `analyze_code` in `agents/drakon.ts` | AST analysis + KB lookup + custom LLM proxy refinement. |
| | `POST /chat` | Route: `POST /agents/drakon/:id` | Natural agent prompt session, handles chat. |
| | `GET /health` | Route: `/health` in `src/app.ts` | Handled via custom Hono app route. |
| | `POST /feedback` | Route: `POST /agents/drakon/:id/feedback` or tool | Custom tool in `agents/drakon.ts`. |
| **architect-agent** | `POST /pipeline/a` | Workflow: `workflows/pipeline-a.ts` | Code -> DRAKON IR. Uses local control flow to replace LangGraph. |
| | `POST /pipeline/b` | Workflow: `workflows/pipeline-b.ts` | DRAKON IR -> Code. Iterative validation and syntax correction. |
| **docs-agent** | `POST /chat` | Route: `POST /agents/docs/:id` | Chat assistant for documents. |
| | `POST /document` | Workflow: `workflows/document-module.ts` | Generates obsidian documentation and commits it to GitHub. |
| | `GET /docs/list` | Route: `GET /docs/list` in `src/app.ts` | Lists files in workspace. |
| | `GET /docs/read` | Route: `GET /docs/read` in `src/app.ts` | Reads file content. |
| | `GET /projects/list` | Route: `GET /projects/list` in `src/app.ts` | Parity with Python projects registry. |
| | `GET /memory/list` | Route: `GET /memory/list` in `src/app.ts` | Parity with Python memory manager. |

---

## 4. LangGraph Replacement Strategy

LangGraph state machines (`StateGraph` + `TypedDict`) are replaced by native **Flue Workflows**.

Rather than declaring abstract graphs, nodes, and conditional edges, we write **standard TypeScript control flow** inside `run(...)` in `src/workflows/*.ts`.

### Example (Pipeline A Mapping):
- **LangGraph Node Graph:** `measure_cc` -> `classify` -> `ast_translate` / `yaml_gen` -> `validate` -> loop back to `ir_gen` if invalid.
- **Flue Workflow Implementation:**
```typescript
export async function run({ init, payload }: FlueContext) {
  const harness = await init(architectAgent);
  const session = await harness.session();
  
  // 1. measure_cc node
  const cc = measureComplexity(payload.code);
  
  // 2. classify complexity node
  const isPrimitive = cc < 5;
  
  let ir;
  if (isPrimitive) {
    // 3. ast_translate node
    ir = astTranslate(payload.code);
  } else {
    // 3. yaml_gen & ir_gen nodes
    const yaml = await session.prompt(`Generate behavioral YAML for ${payload.code}`);
    ir = await session.prompt(`Convert YAML to DRAKON IR:\n${yaml.text}`);
  }
  
  // 4. validate (iterative loop)
  let iteration = 0;
  while (iteration < 3) {
    const validation = validateIr(ir);
    if (validation.valid) break;
    
    // 5. Re-generate / correct IR based on errors
    ir = await session.prompt(`Fix these validation errors in the IR: ${validation.errors.join(", ")}`);
    iteration++;
  }
  
  return ir;
}
```

---

## 5. Cloudflare Workers wrangler.toml Structure

A single `wrangler.toml` (or `wrangler.jsonc`) registers the compiled Flue routes and binds Durable Objects for SQLite-backed session persistence.

```toml
name = "ai-drakon-flue"
main = "dist/index.js"
compatibility_date = "2026-04-01"
compatibility_flags = ["nodejs_compat"]

[durable_objects]
bindings = [
  { name = "FLUE_REGISTRY", class_name = "FlueRegistry" },
  { name = "FLUE_DRAKON_AGENT", class_name = "FlueDrakonAgent" },
  { name = "FLUE_ARCHITECT_AGENT", class_name = "FlueArchitectAgent" },
  { name = "FLUE_DOCS_AGENT", class_name = "FlueDocsAgent" }
]

[[migrations]]
tag = "v1"
new_sqlite_classes = [
  "FlueRegistry",
  "FlueDrakonAgent",
  "FlueArchitectAgent",
  "FlueDocsAgent"
]
```

---

## 6. LLM Provider Proxy Configuration

To route all LLM calls to the OpenAI-compatible proxy at `https://agy3.exodus.pp.ua/v1`, we configure a custom provider in `src/app.ts` using Flue's `registerProvider` API.

```typescript
import { registerProvider } from '@flue/runtime';

// Register the custom proxy as a provider named "custom"
registerProvider('custom', {
  api: 'openai-completions',
  baseUrl: 'https://agy3.exodus.pp.ua/v1',
  apiKey: process.env.CUSTOM_API_KEY || 'dummy-key',
});
```

Agents then request this model via the specifier:
```typescript
export default createAgent(() => ({
  model: 'custom/gemini-2.5-flash',
  instructions: '...',
}));
```

---

## 7. Step-by-Step Migration Order

1. **Phase 1: Setup & `drakon-agent` PoC (First)**
   - Initialize Flue in the TS/Worker environment.
   - Replicate the `/analyze` and `/chat` routes in `drakon-agent-flue`.
   - Setup custom proxy provider connections.
2. **Phase 2: `docs-agent`**
   - Rebuild document generation `/document` workflow.
   - Port filesystem read/write, listing, and Git commit functions into custom Hono route handlers inside `src/app.ts`.
3. **Phase 3: `architect-agent`**
   - Replace LangGraph pipelines with TS workflows.
   - Port validation logic and complex AST analyzers to TS.

---

## 8. Estimated Effort Per Agent

| Agent | Estimated Effort | Key Complexity |
| :--- | :--- | :--- |
| **drakon-agent** | 2-3 Days | Replicating Python/JS AST parser in TypeScript. |
| **docs-agent** | 2-3 Days | Implementing file system hooks and Git/GitHub API calls on Cloudflare. |
| **architect-agent** | 4-5 Days | Rewriting LangGraph state machines into TS workflows; verifying loop corrections. |
