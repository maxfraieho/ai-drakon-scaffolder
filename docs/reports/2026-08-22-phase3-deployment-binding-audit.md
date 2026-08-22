# Phase 3 — Pre-Slice 3.1: Deployment Binding Audit

**Date:** 2026-08-22
**Branch:** `phase0-stabilize`
**HEAD:** `2a884328`
**Mode:** Read-only inspection. No source/config files edited. No migrations. No deployments. No commits. No push.

---

## 1. Checkout verification

- Canonical clone (`.184`, `~/projects/ai-drakon-scaffolder`): branch `phase0-stabilize`, HEAD `2a884328e13e644d68ee36a2bc56e535996090d4`, `git status --short` clean except known auto-managed drift (GitNexus SKILL.md ×3, AGENTS.md, CLAUDE.md).
- Slice 0 report (`docs/reports/2026-08-22-phase3-slice0-boundary-inventory.md`) confirmed present.
- Fleet checkouts independently verified at `2a884328` before dispatch: `.234` (`~/agy-work/ai-drakon-scaffolder`), `.30` (`C:\Users\vokov\Documents\GitHub\ai-drakon-scaffolder`), Oracle (`~/projects/ai-drakon-scaffolder`).
- **Second, separate real dev/deploy directory found and used for direct investigation:** `/home/vokov/workspace/ai-drakon-scaffolder` on `.184`. This is a **different checkout on branch `main`, HEAD `44681804`** — not `phase0-stabilize`. It carries real `.env` secrets (including a working `CLOUDFLARE_API_TOKEN`), a `.wrangler/` state directory, and is the directory `AGENTS.md`'s documented deploy command assumes as its working directory. All findings below sourced from this directory (§3 onward, direct evidence) are evidence about **deployment configuration and live Cloudflare state**, which is branch-independent (the wrangler configs are near-identical across `main` and `phase0-stabilize` for the files that matter here — confirmed no drift in the specific files cited). This is flagged explicitly in §9/§13 as a distinct checkout worth reconciling, not something this audit silently normalized away.

## 2. Complete deployment configuration inventory

*Primary source: AGY `.234`, cross-checked directly by the orchestrator against `/home/vokov/workspace/ai-drakon-scaffolder`.*

| File | Product/runtime | Entrypoint | Compat. date | Env/bindings | Evidence strength |
|---|---|---|---|---|---|
| `wrangler.toml` (root) | Cloudflare Pages | `dist/` (`pages_build_output_dir`) | `2025-09-24`, `nodejs_compat` | `name = "drakon-setup-hub"` — **name field is cosmetic for Pages GitHub-integration projects; the actual Pages project name is set dashboard-side**, confirmed distinct (`ai-drakon-scaffolder`) | direct (file read) |
| `wrangler-antigravity.jsonc` (root) | Cloudflare Worker | `cloudflare-worker/worker-mcp-drakon.js` | `2025-05-10`, `nodejs_compat` flag | `name = "drakon-antigravity-worker"`; `AI` binding; MinIO/Appwrite vars (`MINIO_ENDPOINT`, `MINIO_BUCKET`, `MINIO_ACCESS_KEY` plaintext, `APPWRITE_PROJECT_ID`, `APPWRITE_DATABASE_ID`); comment notes `ARCHITECT_AGENT_URL`/`DOCS_AGENT_URL` "must be set as secrets" | direct — **not referenced by any deploy script; unreferenced-but-present** |
| `cloudflare-worker/wrangler.toml` | Cloudflare Worker | `worker-mcp-drakon.js` | `2024-01-01`, no flags | `name = "drakon-antigravity-worker"`; `account_id = c354ea45a11a1e1c14f1f41fe780cb34`; Durable Objects `ROOM_DO`→`RoomDO`, `DIAGRAM_SYNC`→`DiagramSyncDO`; migrations v1 (RoomDO), v2 (DiagramSyncDO); vars `DRAKON_CODEGEN_FUNCTION_ID`, `MCP_API_KEY` plaintext | direct — **implicit config when running `wrangler` from inside `cloudflare-worker/`** |
| `cloudflare-worker/worker-wrangler.toml` | Cloudflare Worker | `worker-mcp-drakon.js` | `2024-01-01`, no flags | `name = "drakon-antigravity-worker"`; same `account_id`; service bindings `DOCS_AGENT`→`docs-agent-flue`, `ARCHITECT_AGENT`→`architect-agent-flue`; same two vars | direct — **the one AGENTS.md's documented deploy command explicitly names** |
| `services/architect-agent-flue/wrangler.toml` | Cloudflare Worker | `src/index.ts` | `2026-04-01` | `name = "architect-agent-flue"`; KV `PIPELINES_KV`, `SESSION_KV`; DO `JOB_STORE`→`ArchitectJobStore`; **no D1**, despite code (`tools/mcp-proxy.ts:75-84`, `tools/kb-crud.ts`) expecting `env.KB_DB` — throws `"Database binding KB_DB is missing"` at runtime if reached | direct |
| `services/docs-agent-flue/wrangler.toml` | Cloudflare Worker | `src/index.ts` | `2026-04-01` | `name = "docs-agent-flue"`; KV `KNOWLEDGE_BASE` (shared id with drakon-agent-flue, see §8 conflict #4) | direct |
| `services/drakon-agent-flue/wrangler.toml` | Cloudflare Worker | `src/index.ts` | `2026-04-01` | `name = "drakon-agent-flue"`; KV `KNOWLEDGE_BASE` (same id as docs-agent-flue) | direct |
| `package.json` (root) | Pages build/deploy scripts | — | — | `build`: `vite build && prepare-cloudflare-pages.mjs && prepare-cloudflare-functions.mjs`; `deploy:pages`: `wrangler pages deploy dist --functions functions` | direct |
| `.github/workflows/adr-guard.yml`, `sdd-verify.yml` | CI | — | — | Neither performs any build or deploy step — **proves there is no automated Worker or Pages deploy in CI** | direct |
| `infrastructure/d1/schema.sql` | D1 DDL only | — | — | 5 tables (`billing_profiles`, `knowledge_zones`, `agent_configs`, `diagrams`, `pipeline_runs`), all `tenant_id`-scoped, correct indexes — **not referenced by any `[[d1_databases]]` block anywhere** | direct |
| `infrastructure/cloudflare-resources.md` | Documentation stub | — | — | File contains only `#` — empty | direct |

**Redundant/generated, not authoritative:** `.lovable/wrangler.jsonc`, `.lovable/wrangler-antigravity.jsonc`, `.lovable/dist/server/wrangler.json`, `dist/server/wrangler.json`, `services/*/dist/*/wrangler.json`, `services/*/.flue-vite.wrangler.jsonc` — all build-output/tool-generated copies, shadowed by the source-controlled configs above at actual deploy time.

## 3. Deployment command inventory

*Primary source: AGY `.234` + `agy.exe` (`.30`), cross-checked directly against `AGENTS.md`.*

| Path | Command | Directory | Config | Target | Evidence strength |
|---|---|---|---|---|---|
| Pages frontend | `wrangler pages deploy dist --functions functions` | repo root | root `wrangler.toml` (Pages, mostly cosmetic) | `ai-drakon-scaffolder` Pages project | **direct** — `package.json:19` |
| Pages frontend (actual live mechanism) | Cloudflare's own GitHub-integration auto-deploy on push | n/a (Cloudflare-side) | n/a | `ai-drakon-scaffolder` Pages project | **direct** — confirmed live: dashboard showed "49m ago" last-modified matching this session's own just-pushed Slice 8 commit exactly |
| Gateway Worker, documented | `CLOUDFLARE_API_TOKEN=<token> npx wrangler deploy --config cloudflare-worker/worker-wrangler.toml` | repo root | `cloudflare-worker/worker-wrangler.toml` | `drakon-antigravity-worker` | **direct** — `AGENTS.md:111-114`, also referenced `docs/for-agents/sdd-development-methodology.md:278` |
| Gateway Worker, directory-implicit alternative | `wrangler deploy` | `cloudflare-worker/` | `cloudflare-worker/wrangler.toml` (Wrangler's default file-lookup in that directory) | `drakon-antigravity-worker` | **indirect** — nothing documents anyone actually running this form; it exists only because Wrangler would pick it up by convention if invoked bare |
| Gateway Worker, root-jsonc alternative | `wrangler deploy --config wrangler-antigravity.jsonc` | repo root | `wrangler-antigravity.jsonc` | `drakon-antigravity-worker` | **indirect** — no script or doc references this invocation; file appears to be an alternate/earlier draft |
| `architect-agent-flue` | `flue build --target cloudflare && wrangler deploy` (`npm run deploy`) | `services/architect-agent-flue` | `services/architect-agent-flue/wrangler.toml` | `architect-agent-flue` | **direct** — `package.json:8` |
| `docs-agent-flue` | same pattern | `services/docs-agent-flue` | own `wrangler.toml` | `docs-agent-flue` | **direct** |
| `drakon-agent-flue` | same pattern | `services/drakon-agent-flue` | own `wrangler.toml` | `drakon-agent-flue` | **direct** |
| D1 provisioning/schema apply | `wrangler d1 execute <db> --file infrastructure/d1/schema.sql` | repo root | schema file only, **no config declares a target database** | intended: a database named for this project | **unknown** — command form is conventional/inferred, never found written down anywhere in the repo |

**No GitHub Actions workflow deploys anything.** Workers are deployed **manually**; only Pages auto-deploys (via Cloudflare's own dashboard-side Git integration, not a script in this repo).

## 4. Deployed runtime — direct, live evidence (strongest source in this report)

This section supersedes inference from the three delegated investigations wherever they conflict, because it comes from **live queries** (a working Cloudflare API token found in `.env`, cross-checked against phone-dashboard screenshots) rather than repository inference.

**Cloudflare account:** `Maxfraieho@gmail.com`, Account ID `c354ea45a11a1e1c14f1f41fe780cb34`, subdomain `maxfraieho.workers.dev`.

### 4.1 All relevant deployed targets on this account

| Deployed target | Product | Live evidence | Repo config match | Confidence |
|---|---|---|---|---|
| `ai-drakon-scaffolder` (`ai-drakon-scaffolder.pages.dev` + 1 more domain) | Pages | Dashboard: linked to GitHub `maxfraieho/ai-drakon-scaffolder`, "49m ago" = this session's own Slice 8 doc-update push | Root `wrangler.toml` (name field cosmetic for Pages) | **high — this repo's own deploy target, confirmed live** |
| `drakon-antigravity-worker` (`drakon-antigravity-worker.maxfraieho.workers.dev`) | Worker | Dashboard: 52d since last deploy, ~10 "Manually deployed... Wrangler by maxfraieho" versions, 126 invocations/24h at check time. **Direct API read of `/workers/scripts/drakon-antigravity-worker/settings`** (see §4.2) | `cloudflare-worker/wrangler.toml` AND `cloudflare-worker/worker-wrangler.toml` both declare this exact `name` | **high — config-name match is definitive; which of the two files actually produced the live state is not (see §4.3)** |
| `drakon-mcp-worker` (`drakon-mcp-worker.maxfraieho.workers.dev`) | Worker | Dashboard: 52d since last touch, `annotations.workers/triggered_by: "secret"` (last modification was a `wrangler secret put`, not a script upload), 84 requests/24h. **Direct API read** (§4.2) | **No file in the repository declares `name = "drakon-mcp-worker"`.** However, `cloudflare-worker/worker-mcp-drakon.js` **self-identifies as `'drakon-mcp-worker'`** in its own code (User-Agent string and a `service:` field, per Oracle's grep — line-cited as ~325 and ~2241) | **medium — same source file, deployed at some point under a different `--name` override or a since-deleted config; very likely a legacy/pre-rename deployment of the identical codebase** |
| `architect-agent-flue`, `docs-agent-flue`, `drakon-agent-flue` | Workers | Dashboard entries present, ages 55d/2mo/55d | Definitive 1:1 match to `services/*/wrangler.toml` `name` fields | **high** |
| `ai-drakon-setup` | Pages | Dashboard entry present | **Different repository** (`maxfraieho/ai-drakon-setup`) — not this codebase | **out of scope, correctly excluded** |
| `garden-bloom`, `garden-mcp-server`, `sonate-solidsite` | mixed | Dashboard entries present | Different projects entirely, same Cloudflare account | **out of scope, correctly excluded** |

### 4.2 Direct API reads of live Worker bindings (read-only `GET .../workers/scripts/{name}/settings`)

**`drakon-antigravity-worker` — live bindings, verbatim from the API:**
- `compatibility_date: "2024-01-01"`, `compatibility_flags: []` (empty — matches `cloudflare-worker/wrangler.toml`/`worker-wrangler.toml`'s omission of flags; does **not** match `wrangler-antigravity.jsonc`'s `nodejs_compat` flag or its `2025-05-10` date — this is decisive evidence `wrangler-antigravity.jsonc` was never the one actually deployed, or at least not most recently)
- **Secrets** (`secret_text`, values not read): `ADMIN_PASSWORD`, `APPWRITE_API_KEY`, `ARCHITECT_AGENT_URL`, `DOCS_AGENT_URL`, `DRAKON_AGENT_URL`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_TOKEN`, `JWT_SECRET`, `MINIO_SECRET_KEY`, `SEMANTIC_GRAPH_FUNCTION_ID`
- **Plain vars:** `DRAKON_CODEGEN_FUNCTION_ID = "6a33b6050037a2fff34e"`, `MCP_API_KEY = "drakon-mcp-2026"`
- **Durable Object:** `ROOM_DO` → class `RoomDO`, namespace `58bd48cb659d481292fe2bf8bdb433ca`
- **Absent:** `DIAGRAM_SYNC` (declared in `cloudflare-worker/wrangler.toml`'s v2 migration, **not live**), any `[[services]]` binding (declared in `worker-wrangler.toml`, **not live**), any `AI` binding (declared in `wrangler-antigravity.jsonc`, **not live**), any `d1_databases` binding (**confirmed absent, as expected**)

**Interpretation:** `ARCHITECT_AGENT_URL`/`DOCS_AGENT_URL` exist live as **secret URL strings**, not as Cloudflare service bindings. This means the code path that reaches those agents almost certainly does a plain `fetch()` to a URL pulled from `env.ARCHITECT_AGENT_URL`/`env.DOCS_AGENT_URL`, not `env.ARCHITECT_AGENT.fetch()` via a service binding — meaning `worker-wrangler.toml`'s `[[services]]` declarations may be **aspirational/unused** even if that file were the one deployed. (This specific code path was not independently re-verified by re-reading `worker-mcp-drakon.js` in this audit — flagged as an inference in §13, not confirmed.)

**`drakon-mcp-worker` — live bindings, verbatim from the API:**
- `compatibility_date: "2024-01-01"`, `compatibility_flags: []` — same as `drakon-antigravity-worker`
- **Secrets only, smaller set:** `GITHUB_TOKEN`, `JWT_SECRET`, `MCP_API_KEY` (secret_text here — not plaintext like on the other Worker), `MINIO_ACCESS_KEY`, `MINIO_BUCKET`, `MINIO_ENDPOINT`, `MINIO_SECRET_KEY`
- **No** `DRAKON_CODEGEN_FUNCTION_ID`, no `ADMIN_PASSWORD`, no GitHub App OAuth secrets, no `ARCHITECT_AGENT_URL`/`DOCS_AGENT_URL`, no Durable Object, no D1

This smaller, older-shaped secret set (no App-level GitHub OAuth, no agent-URL secrets, `MCP_API_KEY` still secret rather than promoted to plaintext) is consistent with `drakon-mcp-worker` being an **earlier snapshot of the same codebase, deployed under its original/internal self-identified name before a rename to "antigravity"** — not a currently-maintained separate target.

### 4.3 Which one is actually current — first-party evidence

The repository's own `.mcp.json` (committed MCP client configuration, read directly from `/home/vokov/workspace/ai-drakon-scaffolder/.mcp.json`) points explicitly and only at:

```json
"url": "https://drakon-antigravity-worker.maxfraieho.workers.dev/mcp"
```

This is **first-party, non-inferred evidence**: whatever this project's own tooling is configured to talk to, it's `drakon-antigravity-worker`, not `drakon-mcp-worker`. Combined with §4.2's finding that `drakon-mcp-worker`'s last touch was a mere secret rotation rather than a script deploy, **`drakon-antigravity-worker` is the current, intended target; `drakon-mcp-worker` is very likely a legacy/orphaned deployment of the same code under an earlier name**, still receiving some live traffic (84 req/24h at check time) from an unknown/unaudited source — possibly a stale bookmark, an old MCP client config elsewhere, or a monitoring probe. This was **not** further chased down (out of this audit's scope) but should not be deleted or assumed dead without checking who/what is still sending it those 84 requests.

### 4.4 D1 database — already exists

**A D1 database already exists on this account:**

```
name: ai-drakon-saas
uuid: 743d5bb0-d09d-4dcc-8329-8ebae8d533f4
created_at: 2026-06-11T23:01:36.415Z
num_tables: 0
file_size: 81920 bytes (empty — just the SQLite header)
```

This is near-certainly the database Phase 3 is meant to use — the name matches the project's own SaaS naming convention, it was created ~2.5 months ago and never touched since (0 tables, minimum file size), and no other D1 database exists on the account. It is **not bound to any Worker today** (confirmed by the absence of any `d1_databases` entry in §4.2's live settings reads for both `drakon-antigravity-worker` and `drakon-mcp-worker`).

## 5. Source-to-runtime mapping (Section 5)

*Primary source: `agy.exe` (`.30`).*

The codebase does **not** have a single clean topology. It is a composite of:
- **A dynamically-generated Pages Functions Worker** (`dist/_worker.js`), built by `scripts/prepare-cloudflare-functions.mjs` from `src/server.ts`'s SSR handler, serving the frontend.
- **Multiple standalone Workers**: `drakon-antigravity-worker` (the MCP/pipeline gateway, `cloudflare-worker/worker-mcp-drakon.js`), plus three Flue-framework agent Workers (`architect-agent-flue`, `docs-agent-flue`, `drakon-agent-flue`).
- **Workers delegating to Appwrite Functions**: `deterministic-engine`, `drakon-codegen`, `drakon-compiler`, `llm-gateway`, `semantic-graph` — all deployed as Appwrite serverless functions, invoked by the gateway Worker.
- **An unresolved architectural split across three generations**, confirmed by both `agy.exe` and the presence of `docs/adr/0018-appwrite-cloudflare-responsibility-split.md`: (1) legacy Python FastAPI microservices (`services/architect-agent/main.py` etc., dev-server-hosted, ports 8765-8767), (2) Appwrite Functions, (3) newer TypeScript Flue Cloudflare Workers. All three generations have live, non-empty source trees simultaneously.

| Component | Entry file | Deploys as | Evidence |
|---|---|---|---|
| Frontend (UI+SSR) | `src/server.ts:68`, `src/router.tsx:5` | Cloudflare Pages via generated `_worker.js` | `wrangler.toml:1-4`, `scripts/prepare-cloudflare-functions.mjs:102`, `package.json:8` |
| API/MCP gateway | `cloudflare-worker/worker-mcp-drakon.js:2654` | Standalone Worker (`drakon-antigravity-worker`, confirmed live in §4) | `cloudflare-worker/wrangler.toml:1-2` |
| Architect Agent (Flue) | `services/architect-agent-flue/src/index.ts:17` | Standalone Worker + DO `ArchitectJobStore` | `wrangler.toml:1-2,19-22` |
| Docs Agent (Flue) | `services/docs-agent-flue/src/index.ts:14` | Standalone Worker | `wrangler.toml:1-2` |
| Drakon Agent (Flue) | `services/drakon-agent-flue/src/index.ts:10` | Standalone Worker | `wrangler.toml:1-2` |
| Deterministic Engine | `services/deterministic-engine/src/main.ts:59` | Appwrite Function | `package.json:6-7` |
| Drakon Codegen / Compiler / LLM Gateway / Semantic Graph | `services/*/src/main.ts` | Appwrite Functions | respective `package.json` |
| Legacy Python microservices | `services/*/main.py` | Local FastAPI daemons (dev server, not Cloudflare at all) | `main.py:12-45` |

## 6. Configuration conflict register (Section 7)

*Primary source: AGY `.234` and `agy.exe` (`.30`), independently converging on the same top finding; blocking/severity assessment cross-checked against §4's live-truth data.*

| # | Conflict | Files | Classification | Live-data cross-check |
|---|---|---|---|---|
| 1 | **Three configs for `drakon-antigravity-worker`, no one a superset of the others** — `cloudflare-worker/wrangler.toml` (DO bindings), `cloudflare-worker/worker-wrangler.toml` (service bindings), `wrangler-antigravity.jsonc` (AI binding + Minio/Appwrite vars) | all three | **blocking** | §4.2 confirms live state has only `ROOM_DO` (partial match to `wrangler.toml`'s v1-only) and none of the other two files' unique bindings — **live state doesn't fully match any single file** |
| 2 | `package.json`'s `deploy:pages` script passes `--functions functions`, but the build step (`prepare-cloudflare-functions.mjs:29`) deletes the `functions/` directory before writing `dist/_worker.js` | `package.json:19`, `scripts/prepare-cloudflare-functions.mjs:29` | **blocking (for that literal script)** | Not directly live-checkable, but consistent with the fact that Pages actually deploys via Cloudflare's dashboard Git integration (§4.1), not this local script — likely why the script's bug has gone unnoticed |
| 3 | Bare `wrangler deploy` at repo root is ambiguous: root `wrangler.toml` names a Pages project `drakon-setup-hub`, while `wrangler-antigravity.jsonc` (also at root) names a Worker `drakon-antigravity-worker` | `wrangler.toml`, `wrangler-antigravity.jsonc` | **blocking (for that invocation form)** | n/a — no evidence anyone runs bare `wrangler deploy` from root; the documented command (§3) is always `--config`-qualified |
| 4 | Duplicate KV namespace ID shared between `docs-agent-flue` and `drakon-agent-flue` (`KNOWLEDGE_BASE`, same `id`) | both services' `wrangler.toml` | **non-blocking** | not independently re-verified live |
| 5 | `preview_id` equals production `id` for the same Flue services' KV | same files | **non-blocking** | — |
| 6 | **Canonical D1 schema + ADR-0018 exist, zero `[[d1_databases]]` bindings anywhere; `KB_DB` referenced in `architect-agent-flue` code but declared nowhere** | `infrastructure/d1/schema.sql`, `docs/adr/0018-*.md`, all `wrangler*.toml` files, `services/architect-agent-flue/tools/mcp-proxy.ts:75-84` | **unresolved — this is the literal subject of this audit** | §4.4 confirms an actual D1 database (`ai-drakon-saas`) exists and is unbound, resolving half the mystery: infrastructure was provisioned once, then abandoned before wiring |
| 7 | Frontend has two build-time-selected execution paths (`VITE_USE_DETERMINISTIC`), only one carries any spec/gate concept | `src/hooks/usePipelineExecution.ts:50` | **non-blocking** (already documented in Slice 0) | — |
| 8 | `CONTEXT.md`/`MASTER-CONTEXT.md` still describe a `.lovable/`-directory-based Pages build flow, superseded by the direct Vite/TanStack Start pipeline | `CONTEXT.md:27,30`, `.gitignore:67` | **historical** | — |
| 9 | Triplicate agent implementations coexist (Python FastAPI / Appwrite Functions / TypeScript Flue Workers) — in-flight migration, not finished | `services/*-agent/`, `services/*-agent-flue/`, `services/deterministic-engine/` | **unresolved** | — |
| 10 | Required runtime secrets (`JWT_SECRET`, `GARDEN_OWNER_PASSWORD`, agent URLs) are gitignored (`.dev.vars`, `.env`) — fresh clones fail immediately without them | `.gitignore:21,35`, `worker-mcp-drakon.js:2690` | **blocking (for fresh-clone dev setup only, not for the live deployed Worker)** | §4.2 confirms these secrets **are** set live on the account already — this is a dev-onboarding gap, not a production gap |
| 11 | Compatibility dates range from `2024-01-01` to `2026-04-01` across different Workers | various `wrangler.toml` | **harmless** | §4.2 confirms live `drakon-antigravity-worker` runs `2024-01-01` with no flags |
| 12 | Generated `wrangler.json` copies lingering in `dist/`/build-output directories | `dist/server/wrangler.json`, Flue dist copies | **harmless** | — |
| 13 (new, this audit) | **`drakon-mcp-worker` — a live, traffic-receiving Worker with no matching config file anywhere in the repository** | live dashboard/API only, no repo file | **unresolved** | See §4.2-4.3 — likely a pre-rename legacy deployment of `worker-mcp-drakon.js`, not currently a documented/reproducible deploy target |

## 7. D1 binding analysis

Answering the coordinator's Step 6 questions directly, using §4's live evidence as the authoritative source over the delegated agents' repo-only inference:

1. **Which runtime executes D1 queries in the intended Phase 3 path?** None does today — `handleDrakonExecuteDeterministic` (`worker-mcp-drakon.js:4681`) currently delegates entirely to an Appwrite Function (`auth.aidrakon.tech`). D1 has zero call sites anywhere on this path (confirmed independently by all three delegated investigations). The **intended** runtime, per the repo's own architecture (`docs/adr/0018-*.md`) and per which Worker is confirmed live and first-party-referenced (§4.3), is **`drakon-antigravity-worker`**.
2. **Which configuration controls that runtime?** Per `AGENTS.md:111-114`'s documented deploy command, `cloudflare-worker/worker-wrangler.toml`. This is the only one of the three candidate files with **direct, first-party documentation** naming it as the deploy command to run — not just a name match.
3. **Standalone API Worker, Pages Functions, or another service?** Standalone API Worker (`drakon-antigravity-worker`). Pages Functions is ruled out — no `functions/` directory exists in the checked-out source (it's deleted by the build script before Pages deploy), so no Pages Functions runtime currently hosts any of this logic.
4. **Does the current source have any D1 access code already?** No. Confirmed by grep across all three delegated investigations: zero `D1Database` type usage, zero `.prepare()` calls against anything but the unrelated/undeclared `env.KB_DB` in `architect-agent-flue` (a different, unrelated Flue service with its own separate binding gap).
5. **Does the deployed target already have a D1 binding remotely?** **No** — confirmed directly via live API read (§4.2), for both `drakon-antigravity-worker` and `drakon-mcp-worker`.
6. **New database needed, or does an existing one appear intended?** **An existing database appears intended and already exists**: `ai-drakon-saas` (§4.4), unbound, empty, created 2026-06-11. This should very likely be reused rather than a new database created — but that's a judgment call for the architect, not something this audit unilaterally acts on.
7. **Database name/ID evidence:** `ai-drakon-saas`, UUID `743d5bb0-d09d-4dcc-8329-8ebae8d533f4`. No secrets exposed in reaching this — the account ID and database UUID are not sensitive values, and no database *contents* or API token values are reproduced anywhere in this report.
8. **Which environment should receive the binding first?** No `[env.*]` blocks exist in any of the three candidate config files — there is no local/preview/production environment split today, only a single top-level configuration. Binding to `cloudflare-worker/worker-wrangler.toml`'s top level is therefore the only environment that currently exists to bind to; introducing a preview/prod split is a separate, larger decision.
9. **What evidence is still missing before editing configuration is safe?**
   - Confirmation from the architect that `ai-drakon-saas` is indeed the intended database (this audit believes so with high confidence but did not run a schema-content or naming-history check beyond what's in this report).
   - A decision on what happens to the other two `drakon-antigravity-worker` config files (`cloudflare-worker/wrangler.toml`, `wrangler-antigravity.jsonc`) once one is designated authoritative — left as-is, they will keep drifting further from live reality with every future manual deploy that doesn't reconcile them.
   - Resolution (or at least an explicit "leave it alone") for the orphaned `drakon-mcp-worker` target (§4.3) — not blocking for Slice 3.1 itself, but a live, traffic-receiving Cloudflare resource with no source-of-truth is a standing risk regardless.

## 8. Configuration conflict register

See §6 (merged in for clarity — the coordinator's Step 7 output and this audit's Step 8 evaluation draw on the same table).

## 9. Confidence levels — summary

| Finding | Confidence | Basis |
|---|---|---|
| `drakon-antigravity-worker` is the live, current, intended gateway Worker | **high** | Live API read + first-party `.mcp.json` reference, independent of any repo-config inference |
| `cloudflare-worker/worker-wrangler.toml` is the documented-authoritative config | **high** | Direct citation in `AGENTS.md:111-114`, a first-party operational doc, not inferred |
| Live binding state matches **none** of the three candidate config files fully | **high** | Direct API read, §4.2 |
| `ai-drakon-saas` D1 database is the intended target for Phase 3 persistence | **medium-high** | Strong circumstantial match (name, timing, sole D1 db on account) but not confirmed by any first-party doc naming it explicitly |
| `drakon-mcp-worker` is a legacy/pre-rename deployment, safe to disregard for Slice 3.1 planning | **medium** | Circumstantial (smaller/older secret set, no config match, first-party `.mcp.json` points elsewhere) — not verified against deploy history or asked about directly |
| `ARCHITECT_AGENT_URL`/`DOCS_AGENT_URL` are consumed via plain `fetch()`, not Cloudflare service bindings | **low-medium** | Inferred from the secrets' *type* (`secret_text`, i.e. URL string) rather than confirmed by re-reading the actual fetch call sites in `worker-mcp-drakon.js` |
| Second checkout at `/home/vokov/workspace/ai-drakon-scaffolder` (branch `main`) doesn't materially change any wrangler-config finding vs. the `phase0-stabilize` checkouts | **medium** | Spot-checked the specific files cited in this report only; a full diff between the two checkouts' `cloudflare-worker/*` and root wrangler files was not performed |

## 10. Slice 3.1 status evaluation

Answering the coordinator's Step 8 directly:

1. **Can Slice 3.1 safely begin?** **Partially unblocked.** The single biggest original unknown — which config is authoritative — now has a confident, first-party-evidenced answer (`cloudflare-worker/worker-wrangler.toml` / `drakon-antigravity-worker`). What remains genuinely open is a **judgment call for the architect**, not a further investigation: confirm `ai-drakon-saas` is the intended database before binding it.
2. **Must D1 binding be a separate Slice 3.0b?** **Recommended yes**, but narrower than originally feared — not "resolve deployment ownership" (done, this report), just: (a) add `[[d1_databases]]` to `cloudflare-worker/worker-wrangler.toml` pointing at `ai-drakon-saas`, (b) apply `infrastructure/d1/schema.sql` (plus the still-missing `harness_specs` table Slice 0 already flagged) via `wrangler d1 execute`, (c) manually redeploy the Worker (**binding changes are inert until a real `wrangler deploy` runs** — this Worker has no CI, so nothing will pick this up automatically), (d) verify live via another API read exactly like this audit's §4.2, before any application code in Slice 3.1 starts writing to it.
3. **Which config must be edited?** `cloudflare-worker/worker-wrangler.toml`.
4. **Preview deployment required before production binding?** No preview environment exists today (§7.8) — this would need to be introduced as its own small piece of config work if the architect wants a preview gate; not a hard blocker, but worth deciding explicitly rather than defaulting into always-production.
5. **Compatibility window required?** Not for the D1 binding itself (additive, nothing currently reads from it). A compatibility window **is** still needed for the separate, larger Slice 3.2 work (rejecting client-supplied `harnessspec`), as already noted in the Slice 0 report — unrelated to this audit's scope.
6. **Can current local dev safely use a local/remote D1 database?** Not verified in this audit — none of the three delegated investigations confirmed a working local Wrangler/Node toolchain end-to-end (Oracle's own environment hit a `Node <22` block trying to run Wrangler at all, though that's specific to the Oracle VM, not necessarily representative of the actual dev machines `.184`/`.30` used for this project's real work).
7. **Files allowed in the first implementation commit:** `cloudflare-worker/worker-wrangler.toml` (add `[[d1_databases]]` block), `infrastructure/d1/schema.sql` (add `harness_specs` table, additive only), `infrastructure/cloudflare-resources.md` (record the database name/UUID now that it's identified, currently an empty stub).
8. **Files that must remain untouched:** `cloudflare-worker/wrangler.toml` and `wrangler-antigravity.jsonc` (leave the redundant configs alone until the architect decides whether to delete/reconcile them — a separate decision, not silently done here), all `services/*/wrangler.toml`, `cloudflare-worker/worker-mcp-drakon.js` itself (no runtime D1 query code belongs in this slice), all Appwrite config.

## 11. Required next action

Recommend the architect make one explicit decision — confirm `ai-drakon-saas` as the D1 target — and then Slice 3.1 (or a narrow 3.0b sub-step, architect's call on splitting) can proceed with binding + schema application + manual redeploy + live re-verification, following the exact same read-only-verification pattern this audit used.

Separately (not blocking, but worth a ticket): the orphaned `drakon-mcp-worker` target and the redundant `cloudflare-worker/wrangler.toml`/`wrangler-antigravity.jsonc` files should get an explicit disposition at some point — left alone, they will keep silently drifting.

## 12. Files that must remain untouched

Repeated from §10.8 for visibility: `cloudflare-worker/wrangler.toml`, `wrangler-antigravity.jsonc`, all `services/*/wrangler.toml`, `cloudflare-worker/worker-mcp-drakon.js`, all Appwrite infrastructure config. Also: do not touch `drakon-mcp-worker` (the live orphaned Worker) in any way — no deploys to it, no secret rotations, no deletion — until its traffic source is understood.

## 13. Evidence limitations

- This audit combined three independently-delegated read-only investigations (AGY `.234` — Steps 2-3; `agy.exe` on `.30` — Steps 5+7; Oracle Claude via `edgee` — Steps 4/6/8, run twice, once before and once after the orchestrator supplied live Cloudflare dashboard evidence mid-flight) with the orchestrator's own **direct, live Cloudflare API reads** — the strongest evidence class in this report, used to arbitrate every place the three delegates disagreed or could only reach "unknown."
- The orchestrator's live API reads used a Cloudflare API token found in `/home/vokov/workspace/ai-drakon-scaffolder/.env` (root-level `~/.env` on `.184`, second token in that file — the first token there and the repo's own `.env` token were both confirmed dead/invalid via `/user/tokens/verify` before finding the working one). This token's exact scopes were not enumerated beyond confirming it could read Worker settings and list D1 databases — write/deploy capability was never tested (nothing was written).
- The `/home/vokov/workspace/ai-drakon-scaffolder` checkout (branch `main`) was used for direct evidence-gathering in this audit because it's the real directory with working secrets — but it is **not** the `phase0-stabilize` checkout the rest of this session's work has been happening in. The specific files cited (`AGENTS.md`, the three `wrangler*` configs, `.mcp.json`) were spot-checked for drift against the fleet's `phase0-stabilize` findings and found consistent, but a full diff between the two branches was not performed. This is a real discrepancy in the project's own directory structure that the architect should be aware of independent of this audit's specific findings.
- The claim that `ARCHITECT_AGENT_URL`/`DOCS_AGENT_URL` are consumed via `fetch()` rather than service bindings (§4.2) is an inference from binding *type*, not a confirmed re-read of the actual call sites in `worker-mcp-drakon.js` — flagged at low-medium confidence in §9.
- `drakon-mcp-worker`'s exact origin (when it was deployed, by whom, whether it's truly dead or serving some still-relevant traffic) was not investigated beyond what's in §4.2-4.3 — this was explicitly out of scope for a binding-placement audit and is called out as a separate open item, not resolved here.
- No `wrangler dev`/local-D1 testing was performed by anyone in this audit chain — Oracle's attempt was blocked by an unrelated Node version issue on that specific VM; whether `.184`/`.30` (the project's actual working dev machines) can run a local D1 instance was not checked.

---

**No production code was changed.**
**No configuration was changed.**
**No deployment was performed.**
**No commit was created.**
**No push was performed.**
