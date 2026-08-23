# OpenBot / AI-DRAKON Universal HarnessAdapter — Revised Plan (Opus synthesis, 2026-08-23)

Produced by an Opus-model subagent, GitNexus + direct-source verified against `main`@`4004f6aa63aeedfff2afa69aebdbdff4c0cce940` on the `.184` clone. 42 tool uses, ~150K tokens of reasoning. Nothing was edited, committed, pushed, deployed, or rotated.

---

# 1. EXECUTIVE DECISION

**Verdict: plan approved in revised form. Implementation BLOCKED on two of the architect prompt's own stop conditions, both confirmed as fact, not risk.**

**Stop condition 1 — live deployment/config ownership is unresolved.** Three files declare `name = "drakon-antigravity-worker"` with mutually incompatible bindings; the live Worker's actual bindings match **none of them**; there is no CI deploy and no Worker deploy script; the last Worker deploy was ~52 days before 2026-08-22. Today's security fixes and storage wiring are **committed but not deployed** — the live edge still runs the pre-fix code.

**Stop condition 2 — tests cannot prove behavior preservation for the touched routes.** 73 route-dispatch conditions in the Worker. **Zero route-level tests.** All 33 Worker tests are unit tests of extracted functions (`verifyOwnerAuth`, `validateIrDeterministic`, MinIO wrappers) invoked directly, never through `fetch()`. Architect priority #8 ("extract only after route contract coverage exists") therefore has a coverage baseline of zero.

**Three substantive corrections to the mission's assumptions:**

**(a) The Gemini doc's Phase 1–5 sequence must be rejected as a plan**, though its topology conclusions (adapter+overlay, not fork; AI-DRAKON owns tenancy; Gateway-mediated CEL) are sound and I adopt them. It puts `OpenBotHarnessAdapter` in Sprint 1–2 and policy integration in Sprint 3–4. That builds the adapter against a **client-supplied** `harness_spec` — the exact defect ADR 0020 exists to eliminate — and would bake OpenBot into the platform before the generic seam exists. Its file map is also fiction: `packages/harness-adapters`, `packages/tenancy`, `packages/audit`, `apps/web`, and `services/mcp-server` **do not exist**. Its cited sources are two PDFs (an "Architecture Brief" and a "current dump"), not the repo. Every repo-shaped claim in it is INFERENCE.

**(b) The 4-gate engine is 2 real gates and 2 simulations.** `evaluateConfidenceGate` hardcodes `score = 0.65`, `+0.15` per retry — no model is consulted. The cost gate consumes a token count that `main.ts` produces with `Math.random()`. Gating production OpenBot dispatch on "successful 4-gate evaluation" would gate real container execution on a coin flip. And `gates.safety.require_human_approval` is **declared but read nowhere** — which directly violates the non-negotiable invariant *"Human approval is required for commit/promotion by default."* The invariant is currently unimplementable by the engine that is supposed to enforce it.

**(c) Universality is at genuine risk from the existing plan, not just from OpenBot.** `target-architecture.md` §4.7 types the adapter as `start({ spec: DrakonHarnessSpec })`. `DrakonHarnessSpec.gates.confidence` / `.cost` encode deterministic-engine-specific mock semantics. Every future runner would inherit one executor's spec shape. Honoring the operator's constraint ("keep the universality") requires **adjusting** §4.7 — a runner-neutral `RunRequest` core plus an opaque, descriptor-validated `runnerConfig`. This is the one place I propose changing the existing plan rather than extending it.

**What I did not change:** the Phase 0–6 roadmap, target-architecture §4.1–4.8, and ADRs 0019–0025 stay canonical. OpenBot enters as `runnerId=openbot`, a **consumer** of Phase 3's output, not a reordering of it.

---

# 2. EVIDENCE MATRIX

## DIRECTSOURCE (read at canonical HEAD `4004f6aa`, clone on `.184`)

| # | Fact | Location |
|---|---|---|
| D1 | ADRs 0019–0025 exist; **all seven `status: proposed`**. None accepted. | `docs/adr/0019..0025-*.md` |
| D2 | `packages/` = codegen, drakon-ir, harness-contract, policy-engine, spec-kit, storage, ui. No `harness-adapters`, `tenancy`, `audit`, `knowledge`. | `packages/` |
| D3 | **4 of 7 packages are empty scaffolds** (`export {}`, 135–142 bytes): codegen, drakon-ir, spec-kit, ui. Only harness-contract (2.9 KB), policy-engine (18 KB), storage (17 KB) are real. | byte counts of `packages/*/src` |
| D4 | The 4 scaffolds are **not in `pnpm-workspace.yaml`** — unresolvable as workspace deps. | `pnpm-workspace.yaml` |
| D5 | `DrakonHarnessSpec` is a config DTO, **not** an adapter contract. No `HarnessAdapter`, `RunRequest`, `RunnerDescriptor`, or `RunnerRegistry` type exists anywhere. | `packages/harness-contract/src/index.ts` L27–54 |
| D6 | `evaluateConfidenceGate` is a **simulation**: `let score = 0.65; while (score < minScore && retries < maxRetries) { score += 0.15 }`. Package header states it. | `packages/policy-engine/src/index.ts` L138–170 |
| D7 | Cost gate evaluates a caller-supplied `simulatedTokens`; `main.ts` generates it via `Math.random()`. | `policy-engine/src/index.ts` L180–218 + header L20–22 |
| D8 | Policy gate infers capability by **regex-sniffing node text** (`/gitnexus/i` → `tool.invoke.gitnexus.query`). Not a declared-capability check. | `policy-engine/src/index.ts` L74–108 |
| D9 | `require_human_approval` read by **no code in the repo**. Documented as a preserved gap in two package headers. | `harness-contract` L20–21; `policy-engine` L15–17 |
| D10 | Worker = **171,393 bytes**, 73 route-dispatch conditions, if/else chain, no router. | `cloudflare-worker/worker-mcp-drakon.js` |
| D11 | **13** `verifyOwnerAuth` call sites (ADR 0025 and target-arch §4.8 both say **12**). | grep, whole file |
| D12 | Auth is a **positional global gate** at L2848 (`!ownerPayload \|\| role !== 'owner'` → 401). Everything textually after it is owner-gated; everything before it is not. | L2842–2851 |
| D13 | **`POST /mcp` (L2698) sits before the gate and checks only `if (!owner)`.** `role: 'user'` passes → all 24 MCP tools, incl. `github.commitfile`, reachable by any authenticated Appwrite user. | L2698–2700 |
| D14 | Also pre-gate: `/v1/notes/commit`, `/v1/notes/delete`, `/v1/codegen`, `/v1/compile`, `/v1/drakon-ir/*`, `/v1/user/config`, `/v1/pipeline/stream/:id`, `/v1/agents/sonate-solidaire/chat`. | L2640–2848 |
| D15 | `verifyOwnerAuth` **fails open** when `OWNER_EMAILS`/`OWNER_EMAIL` unset: grants `role:'owner'` to every Appwrite user with a `console.warn`. Deliberate, documented. | L466–470 |
| D16 | Static `MCP_API_KEY` → unconditional `{ role:'owner', sub:'mcp-agent' }`. No tenant, no scope, no expiry. | L441–443 |
| D17 | **`MCP_API_KEY = "drakon-mcp-2026"` committed in plaintext in two files.** | `cloudflare-worker/wrangler.toml` L7; `worker-wrangler.toml` L7 |
| D18 | `handleDrakonExecuteDeterministic` forwards the **entire client body verbatim** to the Appwrite Function. No spec resolution, no validation, no policy evaluation. | L4624–4666 |
| D19 | **Zero occurrences of `harness_spec`, `harnessSpec`, `spec_id`, or `specId` in the entire Worker.** | grep |
| D20 | Engine treats the client's `gates` as authoritative; rejects only if `gates` is absent. ADR 0020's central defect is **live at HEAD**. | `services/deterministic-engine/src/main.ts` L89–96, 113, 176–177, 201–202, 226–227 |
| D21 | Client mints the spec in the browser: `createDefaultSpec(pipelineName)` then POSTs `{drakon_ir, harness_spec, breakpoints}`. | `src/hooks/usePipelineExecution.ts:70`; `src/lib/harness/pipeline-client.ts:41–43` |
| D22 | `validateHarnessSpec` still has **zero call sites** outside its own definition and one test comment. | grep `src/`, `services/` |
| D23 | `handleDrakonExecuteDeterministicStatus` **now checks** `role === 'owner'`. **ADR 0025's claim that it "performs no authorization at all" is STALE.** No tenant scoping, though — any owner reads any `execution_id`. | L4669–4671 |
| D24 | Hardcoded tenant in a route regex still present: `/^\/v1\/agents\/(sonate-solidaire)\/chat$/`. ADR 0025 finding stands. | L2777 region |
| D25 | **`env.D1_DB` referenced nowhere in the Worker.** Zero `.prepare(` calls. No D1 code exists. | grep |
| D26 | D1 schema has **6** tables, all `tenant_id`-scoped: billing_profiles, knowledge_zones, agent_configs, diagrams, pipeline_runs, **harness_specs**. | `infrastructure/d1/schema.sql` (89 L) |
| D27 | **Schema/plan mismatch:** shipped `harness_specs` is keyed `UNIQUE(tenant_id, agent_name, version)` with no `spec_id` column. Target-arch §4.3 step 3 and ADR 0020 both specify `harness_specs(tenant_id, spec_id, version, spec_json)`. | schema L76–89 vs `target-architecture.md` §4.3 |
| D28 | `run_events`, `adrs`, `specs`, `task_graphs` — **none exist**. `pipeline_runs` lacks `spec_id`, `spec_version`, `task_graph_id`, `adr_ref`. ADR 0024 is 100% unimplemented. | schema L62–74 |
| D29 | Three configs claim `drakon-antigravity-worker`, no superset: `wrangler-antigravity.jsonc` (AI binding, MinIO vars, `nodejs_compat`, `2025-05-10`, **no D1**); `worker-wrangler.toml` (**D1** `ai-drakon-saas`, RoomDO, service bindings, `2024-01-01`); `cloudflare-worker/wrangler.toml` (RoomDO + DiagramSyncDO + migrations, **no D1**). | all three |
| D30 | **No Worker deploy script.** `package.json` has only `deploy:pages`. | `package.json:19` |
| D31 | 14 test files repo-wide. Worker: 33 `it()` across 3 files. **All unit-level; no `fetch()`-driven route test exists.** | `find -name "*.test.ts"` |
| D32 | `BlobStore` is genuinely provider-neutral: `get/put/delete/list`. Deliberately minimal, documented. Good precedent for the adapter seam. | `packages/storage/src/types.ts` |
| D33 | Only `services/deterministic-engine` can execute. `services/mcp-server` **does not exist** (13 dirs under `services/`, not including it). | `services/` |

## GITHISTORY

| # | Fact |
|---|---|
| G1 | HEAD `4004f6aa` on `main`; clean except known auto-managed drift (3 GitNexus SKILL.md, AGENTS.md, CLAUDE.md). |
| G2 | Today's chain: `5fa22518` security fixes → `cb13066a` storage pkg → `3fb67364` worker wiring → `4004f6aa` merge. |
| G3 | `09e113da phase3: bind D1 for antigravity worker bootstrap` added the D1 binding to `worker-wrangler.toml`. **No code consumes it** (D25) and it is **not live** (L1). |
| G4 | GitNexus index is at `57fe5afa`, **3 commits behind HEAD** — stale for exactly today's security + storage work. All findings above verified against direct source. |

## LIVEDEPLOYMENT

| # | Fact | Source |
|---|---|---|
| L1 | Live `drakon-antigravity-worker`: `compatibility_date 2024-01-01`, **no flags**, DO `ROOM_DO` only. **No D1. No service bindings. No AI binding. No `DIAGRAM_SYNC`.** Live matches no single config file. | Prior direct CF API read, `docs/reports/2026-08-22-phase3-deployment-binding-audit.md` §4.2 |
| L2 | Live plaintext var `MCP_API_KEY = "drakon-mcp-2026"`. | Same, §4.2 |
| L3 | ~52 days since last Worker deploy; ~10 manual Wrangler versions; 126 req/24h. **No CI deploys anything.** | Same, §3–4 |
| L4 | **Today's security fixes and storage wiring are NOT deployed.** Both reports state it explicitly: *"the security fixes aren't deployed"*, *"No Worker deployment... only a `--dry-run`."* | `2026-08-22-security-fix-and-minio-s1-coordination-report.md` §14; `2026-08-22-slice-s2-storage-wiring.md` §16 |
| L5 | D1 `ai-drakon-saas` (`743d5bb0-d09d-4dcc-8329-8ebae8d533f4`) exists, **0 tables**, unbound. | Binding audit §4.4 |
| L6 | Orphan Worker `drakon-mcp-worker` — same source, earlier name — still serving **84 req/24h from an unidentified caller**. `MCP_API_KEY` is `secret_text` there, not plaintext. | Binding audit §4.2–4.3 |
| L7 | Second checkout `/home/vokov/workspace/ai-drakon-scaffolder` on `.184`, branch `main` @ `44681804`, carries real `.env` secrets and `.wrangler/` state. This is the directory `AGENTS.md`'s deploy command assumes. **Not** the audited clone. | Binding audit §1, §13 |
| L8 | MinIO credential `vokov` **compromised, removed from source, NOT rotated at provider**. | Security report §14, "COMPROMISED, unchanged" |
| L9 | I attempted a live re-verification of L1/L4 this session. Both CF tokens (repo `.env`, root `~/.env`) returned `{"code":10000,"message":"Authentication error"}`. **L1–L6 are therefore carried forward from the 2026-08-22 audit, not re-confirmed today.** | this session |

## INFERENCE

| # | Inference | Basis | Confidence |
|---|---|---|---|
| I1 | The live edge is running **known-vulnerable** code: Appwrite-JWT owner promotion, dead-code notes auth, hardcoded MinIO fallback. | L3+L4+G2 | High |
| I2 | The positional gate (D12) is the **systemic** cause, not the individual bypasses. Any route added above L2848 is silently under-authorized. Root cause: authorization is a side effect of source-line order in a 4,800-line if/else chain. | D12–D14 | High |
| I3 | `MCP_API_KEY` (D17/L2) is a **second compromised credential**, equal in severity to the MinIO one and not yet on any remediation list. Committed plaintext + unconditional owner + no expiry + reachable pre-gate at `/mcp` (D13). | D13+D16+D17+L2 | High |
| I4 | OpenBot's `agents.yaml`/`/admin/plugins` MCP registration would point at `POST /mcp` — which today grants **all 24 tools to any authenticated user** and cannot express a tenant. The Gemini doc's Phase 3 is not implementable against the current surface. | D13+D33 | High |
| I5 | The Gemini doc read a *PDF dump*, not the repo (sources #1, #6). Its four phantom packages are ADR *decisions* (0022, 0024, 0025) misread as shipped state — the names match the ADRs verbatim. | doc §sources vs D2 | High |
| I6 | `worker-wrangler.toml` is the most recent *intent* (G3, most bindings, named by `AGENTS.md`), but `wrangler-antigravity.jsonc` holds MinIO/AI vars the others lack. Neither is a superset → picking either silently drops live bindings. | D29+L1 | Medium-high |
| I7 | External OpenBot research items 1–7 (see appendix) are consistent with, and unrefuted by, everything in this repo. The overlay-not-fork conclusion is safe to adopt. | prior research + D32 precedent | Medium |

## UNKNOWN

| # | Open |
|---|---|
| U1 | **Which wrangler config produced the live Worker.** Live matches none (L1). Unresolvable from the repo. |
| U2 | Whether HEAD has been deployed since the 2026-08-22 audit. No working CF token (L9). **Must be re-checked before any implementation.** |
| U3 | Which checkout is canonical for deploy — `~/projects` (audited) or `~/workspace` @ `44681804` with the real secrets (L7). |
| U4 | Who sends `drakon-mcp-worker` 84 req/24h (L6). |
| U5 | Whether the compromised `MCP_API_KEY` has been used by an unauthorized party. No audit log exists to answer this (D28). |
| U6 | gVisor performance under concurrency; exact CEL selector-granularity schema. Unverified upstream, per the prior investigator. |
| U7 | Whether OpenBot will be self-hosted on `.184` (a machine already flagged "no parallel heavy processes") or elsewhere. No capacity plan exists. |
| U8 | Whether ADRs 0019–0025 being `proposed` (D1) means Q has actually accepted these decisions. |

---

# 3. REVISED ARCHITECTURE AND SLICE PLAN

## 3.1 Architecture adjustments (three, all explicit)

**Adjustment A — split the adapter contract to protect universality.** Replaces `target-architecture.md` §4.7's single `spec: DrakonHarnessSpec` parameter. Requires an amendment to ADR 0022.

```ts
// runner-neutral. no runner may add a field here.
interface RunRequest {
  tenantId: string;              // Appwrite teamId, ADR 0025
  runId: string;
  specId: string;                // server-resolved; never client-supplied
  specVersion: string;
  taskGraph: DrakonIR;
  capabilities: string[];        // resolved grant, deny-by-default
  quotas: { maxTokens: number; maxWallClockSeconds: number };
  knowledge: KnowledgeHandle[];  // references only, never credentials
  grant: GrantHandle;            // opaque, short-TTL, server-issued
  runnerConfig: unknown;         // opaque; validated against descriptor.configSchema
}

interface RunnerDescriptor {
  runnerId: string;              // "deterministic" | "openbot" | ...
  capabilities: string[];
  configSchema: JSONSchema;      // runner-specific config lives HERE, not in RunRequest
  transport: 'poll' | 'stream';
  supportsResume: boolean;
  supportsCancel: boolean;
}

interface HarnessAdapter {
  readonly descriptor: RunnerDescriptor;
  start(req: RunRequest): Promise<{ executionId: string }>;
  poll(executionId: string): Promise<RunSnapshot>;
  resume(executionId: string, approval: ApprovalDecision): Promise<void>;
  cancel(executionId: string): Promise<void>;
}
```

Universality test, enforceable in CI: **`RunRequest` must not contain the substring `openbot`, `agui`, `copilotkit`, or `drakonHarnessSpec`.** All OpenBot specifics — `COMPUTER_RUNTIME`, `agents.yaml` selectors, CEL — live in `runnerConfig` behind `configSchema`. Second enforcement: no adapter package may be imported by any Worker module other than the registry.

**Adjustment B — gates must declare their own trust class.** D6/D7 mean two of four gates are simulations. Rather than silently keep them:

```ts
type GateTrust = 'enforcing' | 'simulated';
// safety: 'enforcing' | policy: 'enforcing' | confidence: 'simulated' | cost: 'simulated'
```

A run may not dispatch to any runner with **side effects outside a sandbox** if a `simulated` gate is the only thing standing between it and that effect. Prevents the "coin-flip gates a real container" failure. Deny-by-default is preserved and made honest instead of decorative.

**Adjustment C — the human-approval invariant needs an owner.** `require_human_approval` is read nowhere (D9). It cannot be enforced by the deterministic engine without redesign. **Proposal: move enforcement to the Worker PEP** — it is the only component present on every path, and it is the component the architect prompt already designates as authoritative. Approval becomes a PEP-level pre-dispatch check against the resolved spec, not an engine feature. This is a real design change and I am flagging it rather than assuming it.

## 3.2 Slice plan

Numbering continues the repo's existing Phase 3 (last shipped: S2 storage wiring). Roadmap Phases 0–6 in `docs/plans/ai-drakon-saas-architecture.md` are unchanged; these slices populate Phase 3–4.

---

### **Slice 3.0c — Deployment & credential custody. BLOCKING. Non-code.**
*Clears stop condition 1. Nothing below may start until this closes.*

Decisions required from Q (I must not make these):
1. **One** wrangler config for `drakon-antigravity-worker`; the other two deleted or renamed `*.disabled`. Must be a superset of live bindings (L1) plus D1.
2. Confirm `ai-drakon-saas` as the D1 target (binding audit §11 already asked; still open).
3. Canonical deploy checkout: `~/projects` or `~/workspace` (U3).
4. **Rotate MinIO credential** at provider (L8).
5. **Rotate `MCP_API_KEY`** and promote to `secret_text` (I3). Currently plaintext in two committed files and live.
6. Disposition of orphan `drakon-mcp-worker` after identifying its 84 req/24h caller (U4/L6).
7. A working CF API token (U2 — I could not verify live state today).

Validation: `npx wrangler deploy --config <chosen> --dry-run --outdir /tmp/x`; then live `GET /workers/scripts/drakon-antigravity-worker/settings` diffed against the chosen config. Rollback: none needed — no code changes.
**Invariant added:** exactly one deployable config per Worker name, checked in CI.

---

### **Slice 3.1 — Route contract characterization harness.**
*Clears stop condition 2. Prerequisite for every slice below and for architect priority #8.*

Build a `fetch()`-level test harness with a mocked `env`. For all 73 route conditions record, as characterization (**preserve current behavior including the bugs**): method, path, no-auth status, `MCP_API_KEY` status, `role:'user'` status, `role:'owner'` status. Produces a machine-readable auth matrix that becomes the regression baseline.

Explicitly asserts the current defects so a fix shows as an intentional diff: `POST /mcp` accepts `role:'user'` (D13); `OWNER_EMAILS`-unset fails open (D15); `/v1/notes/commit` pre-gate (D14).

- **Files:** create `cloudflare-worker/__tests__/route-contract.test.ts`, `cloudflare-worker/__tests__/helpers/mock-env.ts`, `docs/contracts/worker-route-auth-matrix.md`. **No source file touched.**
- **Validation:** `pnpm test` — 115 existing pass, ~73 new pass.
- **Rollback:** delete the new files.
- **Invariant:** a route without a matrix row does not merge.

---

### **Slice 3.2 — Replace the positional gate with an explicit auth table.**
*Fixes I2, the systemic cause.*

Convert the L2848 positional gate into a declarative `ROUTE_AUTH` table keyed by method+path, consulted **before** dispatch. Behavior-preserving per the 3.1 matrix, except three deliberate, individually-flagged diffs: `POST /mcp` requires `role:'owner'` until tenant filtering lands (Slice 4.2); `OWNER_EMAILS` unset → deny + loud log (removes the fail-open, D15); `/v1/notes/commit|delete` gated.

- **Files:** modify `cloudflare-worker/worker-mcp-drakon.js` (dispatcher region only, ~L2640–2860); update `route-contract.test.ts` with the 3 intentional diffs.
- **Validation:** `pnpm test`; every non-flagged row byte-identical to the 3.1 baseline.
- **Rollback:** `git revert`; single commit, no schema, no config.
- **Invariant:** authorization never depends on source-line position.

---

### **Slice 3.3 — D1 binding + `resolveTenant` + tenant-scoped repositories.**
*ADR 0025. Highest-risk slice in the plan.*

Apply `schema.sql` to `ai-drakon-saas`. Bind D1. Add `packages/tenancy` — the name ADR 0025 already specifies — exporting `resolveTenant(request) → {tenantId, userId, roles}` and a repository layer where **an unscoped query is unrepresentable in the type system** (ADR 0025 §3: enforced by construction, not discipline).

Migrate all **13** call sites (not 12 — D11; ADR 0025 and target-arch §4.8 both need amending). Retire the static-`MCP_API_KEY`-as-owner path (D16, ADR 0025 §5). Retire the `sonate-solidaire` route regex (D24, ADR 0025 §6).

- **Files:** create `packages/tenancy/{package.json,src/index.ts,src/repositories.ts,src/__tests__/}`; modify `pnpm-workspace.yaml` (add `packages/tenancy` — and D4's four unlisted scaffolds), `worker-mcp-drakon.js` (13 sites), the chosen wrangler config.
- **Validation:** per ADR 0025 §4, **every route needs a test proving tenant A cannot read tenant B's data — a route without that test does not merge.** Plus the full 3.1 matrix re-run.
- **Rollback:** revert code; **D1 rows are one-way** — schema apply is `CREATE TABLE IF NOT EXISTS` into an empty DB, so re-runnable, but any data written after is not.
- **Invariant:** no unscoped tenant query; no global owner.

---

### **Slice 3.4 — Server-resident spec resolution.**
*ADR 0020. The defect is live (D18–D22).*

Worker resolves the spec by id from D1, calls `validateHarnessSpec` (**first call site in the codebase's history**, D22), evaluates policy, then dispatches. Dual-accept for one release per ADR 0020's mitigation: `harness_spec` in body → accepted **with a deprecation warning and an audit entry**; then rejected with 400.

**Blocked on a schema contradiction (D27):** shipped `harness_specs` is keyed on `agent_name`, the plan specifies `spec_id`. Requires either a migration adding `spec_id`, or an ADR-0020 amendment adopting `(agent_name, version)` as the identity. **Q decides — I will not resolve this by assumption.**

- **Files:** modify `worker-mcp-drakon.js` (`handleDrakonExecuteDeterministic`, L4624–4666), `services/deterministic-engine/src/main.ts` (L89–96 — stop reading `harness_spec` from payload), `src/hooks/usePipelineExecution.ts` (L70 — stop calling `createDefaultSpec`), `src/lib/harness/pipeline-client.ts` (L41–43 — send `specId`); create `infrastructure/d1/migrations/00X-*.sql` if Q chooses `spec_id`.
- **Validation:** `services/deterministic-engine/src/__tests__/main.characterization.test.ts` must still pass (it characterizes current behavior); new tests for resolve-by-id, reject-body-spec, dual-accept warning.
- **Rollback:** feature-flag the dual-accept phase so the reject step is a one-line revert.
- **Invariant:** server-side spec resolution by id/version; no raw client policy authority.

---

### **Slice 3.5 — Generic runner registry. No OpenBot code.**
*Architect priority #2. Genericity gate.*

Create the contracts from Adjustment A **and two descriptors** — `deterministic` (wrapping today's Appwrite Function, per architect priority #7 "keep deterministic/legacy as compatibility adapters") and a **paper-only** `byo-http` descriptor. Two independent implementers of the interface before any third is written; this is what proves the seam is real rather than an OpenBot-shaped hole.

- **Files:** modify `packages/harness-contract/src/index.ts` (add `RunRequest`, `RunnerDescriptor`, `HarnessAdapter`, `RunSnapshot`, `ApprovalDecision`, `GrantHandle`, `GateTrust` — **additive; `DrakonHarnessSpec` unchanged**); create `packages/harness-runtime/` (registry + `RunnerDescriptor` validation), `packages/harness-adapter-deterministic/`; modify `pnpm-workspace.yaml`.

  **Naming contradiction — Q must resolve (do not assume):** ADR 0022 says `packages/harness-adapters`; the shipped package is `packages/harness-contract`. Options: (a) amend ADR 0022 to the shipped name + `harness-runtime` + `harness-adapter-*`; (b) rename to match the ADR. Opus recommends (a) — `harness-contract` is already published, imported by `policy-engine`, and semantically more precise. **Not its call to make.**
- **Validation:** `pnpm test`; CI check that `RunRequest` contains no runner-specific identifier; deterministic adapter reproduces `main.characterization.test.ts` byte-for-byte.
- **Rollback:** revert; nothing consumes the registry yet.
- **Invariant:** every execution is tenant-bound and run-bound; no runner-specific field in the neutral contract.

---

### **Slice 3.6 — `OpenBotHarnessAdapter`. Third implementation.**
*Architect priority #3. Only now is OpenBot introduced.*

Implements `HarnessAdapter` with `runnerId = "openbot"`. Contains: server-side grant issuance (short-TTL, capability-scoped, per-run, never in a prompt or transcript); AG-UI ID normalization — **emit `TEXT_MESSAGE_END`, mint a fresh UUID `message_id`, emit `TEXT_MESSAGE_START` before every `TOOL_CALL_START`** (ag-ui#1037); AG-UI SSE → `RunSnapshot` event mapping; `HUMAN_IN_THE_LOOP` → the existing breakpoint/`resumeExecution` mechanism (target-arch §4.3 step 8). OpenBot itself: **official image + config overlay** (`agents.yaml`, `.env`, CEL). No fork.

- **Files:** create `packages/harness-adapter-openbot/` (adapter, grant issuer, AG-UI normalizer, tests), `infrastructure/openbot/{docker-compose.yml,agents.yaml,cel/}`, `docs/adr/0026-openbot-as-first-external-runner.md`.
- **Validation:** unit test asserting **N tool calls → N distinct `message_id`s** (the #1037 regression); grant-issuance test asserting no credential appears in any `RunRequest` field, prompt, or emitted event; the Slice 3.5 CI genericity check must still pass.
- **Rollback:** the registry makes this removable without touching any other runner — that is the seam's whole purpose.
- **Invariant:** every tool call has a unique event/message identity; no credential in prompt/browser/transcript; no direct browser→OpenBot control bypassing the Gateway.

---

### **Slice 4.1 — `run_events` + audit log.** ADR 0024, currently 0% implemented (D28). Append-only D1 `run_events(run_id, tenant_id, seq, ...)`; first writer to the Appwrite `audit_log` collection. **Retention policy required from day one, not retrofitted** (ADR 0024's own stated negative).

### **Slice 4.2 — Tenant-filtered MCP surface.** ADR 0019. `tools/list` returns only what the tenant's resolved spec grants; `tools/call` re-checks and writes audit. **This is the slice OpenBot's `/admin/plugins` registration actually depends on** (I4). Deliberately last among the enforcement slices — architect priority #6, and consistent with *"do not extract the MCP gateway first; it has the highest coupling."*

### **Slice 4.3 — UI: OpenBot-first but generic.** Architect priority #4. Registry-driven runner picker, run timeline, gate indicators (**showing `GateTrust`**, per Adjustment B), evidence drawer, approval, provenance chip. Collapses the `VITE_USE_DETERMINISTIC` build-time fork (D-adjacent, ADR 0022) into one runtime path.

## 3.3 Dependency order — and a hazard in the architect's own priority list

```
3.0c ──► 3.1 ──► 3.2 ──► 3.3 ──► 3.4 ──► 3.5 ──► 3.6 ──► 4.1 ──► 4.2 ──► 4.3
(deploy) (tests) (auth)  (tenant) (spec)  (registry)(openbot)(audit) (mcp)  (ui)
```

**Hazard, surfaced not resolved:** the architect's priorities put `OpenBotHarnessAdapter` **with server-side grant issuance** at #3, but persistence at #5, tenant-filtered MCP at #6, and tenancy only implicitly in the invariants. A grant cannot be scoped without tenant identity (3.3), cannot be spec-derived without server-resident specs (3.4), and cannot be audited without an audit log (4.1). Implementing #3 before those three yields a grant that is a bearer token with no tenant, no policy derivation, and no revocation trail — which would violate three non-negotiable invariants at once. **Opus's ordering satisfies the architect's stated invariants; it does not match the architect's stated priority numbering. Flagged, not silently reordered.**

---

# 4. EXACT FILE BOUNDARY

## Must not be touched by any slice
- `docs/adr/0001`–`0025` — amendments only via a **new** ADR or an explicit `supersedes` header. `scripts/adr-immutability-check.sh` enforces this.
- `src/lib/htse/ir-validator-core.ts`, `packages/drakon-ir` — IR semantics out of scope.
- `services/deterministic-engine/src/__tests__/main.characterization.test.ts` — the behavior-preservation oracle for 3.4/3.5. Changing it destroys the only proof available.
- `packages/storage/**` — shipped and wired today. Frozen.
- `.claude/skills/**`, `AGENTS.md`, `CLAUDE.md` — auto-managed drift (G1).
- `/home/vokov/workspace/ai-drakon-scaffolder` — the *other* checkout with real secrets (L7). Until U3 is resolved, read-only.

## Modified, by slice
| Slice | Files |
|---|---|
| 3.0c | none (config decision + credential rotation only) |
| 3.1 | none — new test files only |
| 3.2 | `cloudflare-worker/worker-mcp-drakon.js` (dispatcher ~L2640–2860) |
| 3.3 | `worker-mcp-drakon.js` (13 auth sites), `pnpm-workspace.yaml`, chosen wrangler config |
| 3.4 | `worker-mcp-drakon.js` (L4624–4666), `services/deterministic-engine/src/main.ts` (L89–96, 113, 176–177, 201–202, 226–227), `src/hooks/usePipelineExecution.ts` (L70), `src/lib/harness/pipeline-client.ts` (L41–43) |
| 3.5 | `packages/harness-contract/src/index.ts` (**additive only**), `pnpm-workspace.yaml` |
| 3.6 | none existing — all new |

## Created
```
cloudflare-worker/__tests__/route-contract.test.ts
cloudflare-worker/__tests__/helpers/mock-env.ts
docs/contracts/worker-route-auth-matrix.md
packages/tenancy/{package.json,src/index.ts,src/repositories.ts,src/__tests__/}
packages/harness-runtime/{package.json,src/registry.ts,src/__tests__/}
packages/harness-adapter-deterministic/{package.json,src/index.ts,src/__tests__/}
packages/harness-adapter-openbot/{package.json,src/{index,grant,agui-normalize}.ts,src/__tests__/}
infrastructure/openbot/{docker-compose.yml,agents.yaml,cel/}
infrastructure/d1/migrations/00X-*.sql        # only if Q chooses spec_id (D27)
docs/adr/0026-openbot-as-first-external-runner.md
```

## Deleted / disabled
- Two of three `drakon-antigravity-worker` wrangler configs (3.0c, **Q's choice which**).
- `getMinioVar` hardcoded fallback — already removed in `5fa22518`; provider-side rotation still pending (L8).

## Validation commands
```bash
# baseline, must be green before any slice
cd /home/vokov/projects/ai-drakon-scaffolder && pnpm install && pnpm test && pnpm run build

# per slice
pnpm test                                                     # 115 existing + new, all green
pnpm --filter @ai-drakon/policy-engine test                   # gate semantics unchanged
pnpm --filter @ai-drakon/harness-contract build               # additive-only type check
npx wrangler deploy --config <chosen> --dry-run --outdir /tmp/dryrun
node scripts/check-runrequest-genericity.mjs                  # new, slice 3.5
bash scripts/adr-immutability-check.sh
git diff --stat main...HEAD                                   # must match the slice's file boundary exactly

# after 3.0c only, with a working token
curl -s .../workers/scripts/drakon-antigravity-worker/settings -H "Authorization: Bearer $TOK"
```

## Rollback
Slices 3.1, 3.2, 3.5, 3.6 are pure `git revert` — no schema, no config, no live state. Slice 3.3 reverts in code but **the D1 schema apply is a one-way door** (target DB is currently empty, so re-runnable — that window closes on first write). Slice 3.4 must ship its dual-accept phase behind a flag so the reject-with-400 step is one line to undo. Slice 3.0c is the only irreversible item: **credential rotation cannot be undone and will break anything still using the old MinIO key or `drakon-mcp-2026` — including, possibly, whatever is sending `drakon-mcp-worker` 84 req/24h (U4). Identify that caller before rotating.**

---

# 5. RISKS AND UNRESOLVED QUESTIONS

## Contradictions — surfaced, deliberately unresolved

| # | Contradiction | Sides | Why not resolved silently |
|---|---|---|---|
| C1 | Package naming | ADR 0022 → `packages/harness-adapters`; shipped → `packages/harness-contract` | An ADR amendment is Q's call |
| C2 | Spec identity | Shipped `harness_specs UNIQUE(tenant_id, agent_name, version)` (D27) vs ADR 0020 / target-arch §4.3 `spec_id` | Migration vs ADR amendment — a schema one-way door |
| C3 | Call-site count | ADR 0025 + §4.8 say 12; actual is 13 (D11) | Small, but it means the ADR was written against a different tree; a doc fix, not a silent one |
| C4 | Status-route authz | ADR 0025: "performs no authorization at all"; actual: enforces `role==='owner'` (D23) | ADR is stale. Tenant scoping is still genuinely absent — a partial fix, not a full one |
| C5 | Gate reality | Product claims a governing 4-gate plane; two gates are simulations (D6/D7) | Adjustment B proposes labeling; **making confidence/cost real is a separate, unscoped project** |
| C6 | Human approval | Invariant: "required for commit/promotion by default"; code: read nowhere (D9) | Adjustment C proposes PEP ownership. Real design change |
| C7 | Priority ordering | Architect #3 (grant issuance) precedes tenancy/spec/audit | §3.3. Following the numbering would breach three invariants |
| C8 | Table count | Binding audit says 5 D1 tables; actual is 6 — `harness_specs` added since | Drift indicator: the audit is ~1 day old and already stale. Re-verify before 3.3 |
| C9 | `require_human_approval` in default spec | `createDefaultSpec` populates it (per characterization test comment L391); nothing reads it | The system has been making itself a promise since 2026-06-30 (target-arch §4.3 note) and never kept it |

## Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **Live edge runs known-vulnerable code** (I1/L4). Fixed in source, undeployed. | **Critical** | 3.0c. Until then, assume every fixed defect is live-exploitable |
| R2 | **`MCP_API_KEY = "drakon-mcp-2026"` — plaintext, committed, live, unconditional owner, reachable pre-gate** (D13/D16/D17/L2). Not on any remediation list. | **Critical** | Add to 3.0c alongside MinIO. **Treat as compromised now.** |
| R3 | MinIO credential compromised, not rotated (L8) | High | 3.0c |
| R4 | Cross-tenant leak during 3.3 — ADR 0025's own "highest-risk change in the whole migration" | High | Per-route tenant-isolation tests, deny-by-default, staged rollout — ADR 0025 §4 already mandates this |
| R5 | Deploying the wrong config **silently drops live bindings** — none is a superset (D29/L1) | High | 3.0c must produce a superset; verify live post-deploy |
| R6 | AI-DRAKON becomes OpenBot-shaped despite the constraint | High | Adjustment A + the CI genericity check + two non-OpenBot descriptors before the OpenBot one (3.5 before 3.6) |
| R7 | Simulated gates authorize real container execution (C5) | High | Adjustment B; refuse sandbox-escaping side effects behind a `simulated` gate |
| R8 | Refactoring a 4,800-line if/else with zero route tests | High | 3.1 is unconditionally first. Non-negotiable |
| R9 | Orphan `drakon-mcp-worker`, 84 req/24h, unidentified caller, same source (L6) | Medium | Identify before rotating credentials — rotation may break it |
| R10 | Two divergent checkouts (L7/U3) | Medium | 3.0c decision 3 |
| R11 | GitNexus index 3 commits stale (G4); reindex has known WAL/native-binding instability | Low | All findings here verified against direct source. Reindex `.184` clone before implementation |
| R12 | `.184` capacity for a self-hosted OpenBot + gVisor (U7) | Medium | Capacity plan before 3.6 |
| R13 | Four workspace-unregistered scaffold packages (D3/D4) may be silently imported and resolve to `{}` | Low | 3.3 registers them or deletes them — Chesterton's fence: find out why they exist first |

## Questions requiring Q's decision before implementation

1. **Which wrangler config is canonical?** (U1/D29) — blocks everything.
2. **Confirm `ai-drakon-saas` as the D1 target?** (L5) — asked in the binding audit §11, still unanswered.
3. **`~/projects` or `~/workspace` as the deploy checkout?** (U3)
4. **Authorize rotation of MinIO *and* `MCP_API_KEY`?** (L8/R2)
5. **C2: migrate `harness_specs` to `spec_id`, or amend ADR 0020?**
6. **C1: amend ADR 0022 to the shipped naming, or rename the package?**
7. **C6: does the Worker PEP own human-approval enforcement?**
8. **Are ADRs 0019–0025 accepted?** All seven are `status: proposed` (D1/U8). This plan treats them as binding — if they are still drafts, the whole target is provisional.
9. **A working Cloudflare API token** (U2/L9) — could not re-verify live state today.
10. **Where does OpenBot run?** (U7)

---

**Nothing was edited, committed, pushed, deployed, or rotated. No credential was used beyond two read-only `GET`s that both failed authentication. Implementation only after explicit approval — and, per the architect prompt's own stop conditions, only after items 1–4 above are closed.**

---

# APPENDIX — External OpenBot/AG-UI research (from a separate read-only investigation, not repo-scoped)

1. **Architecture:** OpenBot (github.com/CopilotKit/openbot) isolates agents into per-agent `agent-computer` containers (own Chromium profile, `/workspace` volume, shell). A `Supervisor` component orchestrates container lifecycle via `COMPUTER_SUPERVISOR_URL`; gVisor sandboxing toggled via `COMPUTER_RUNTIME=runsc`. Docker Compose services: Supervisor, Gateway (policy mediator), API Server (3001), Dashboard (3010), Postgres+pgvector.
2. **AG-UI protocol:** SSE/WebSocket JSON events, SCREAMING_SNAKE_CASE: `RUN_STARTED` (threadId, runId), `RUN_FINISHED`, `RUN_ERROR`, `TOOL_CALL_START/CONTENT/END`, `TEXT_MESSAGE_START/CONTENT/END`, `STATE_DELTA` (JSON patches), `STATE_SNAPSHOT`, `HUMAN_IN_THE_LOOP`.
3. **Issue #1037** (ag-ui-protocol/ag-ui) is real: CopilotKit's `useLazyToolRenderer` groups tool events by `parent_message_id` but only renders `message.toolCalls[0]` — reusing one `message_id` across multiple tool calls drops all but the first card. Fix: emit `TEXT_MESSAGE_END`, generate a new UUID `message_id`, emit `TEXT_MESSAGE_START` before each `TOOL_CALL_START`.
4. **CEL enforcement** happens in OpenBot's centralized Gateway (fail-closed), not unmediated inside the agent container — inspects `tool.name`/`intent`/`page.url`/shell commands, configured via `agents.yaml`.
5. **Multi-tenancy** is early-alpha; default is single-tenant/dev mode (`OPENBOT_DEV_NO_AUTH`), minimal native tenant RBAC — production needs external OIDC/OAuth bridging, meaning an external system (AI-DRAKON) genuinely does need to own tenant identity.
6. **Deployment:** "official unmodified Docker image + config overlay (agents.yaml, .env, CEL policies)" is the standard supported pattern — forking not required unless touching internal supervisor/gateway core.
7. **Pluggability:** "Bring any AG-UI agent" is real — remote agents register via `remote-ag-ui` endpoints in `agents.yaml`. Real admin routes: `/admin/plugins` (MCP server/grant/skill management), `/admin/audit` (allowed/refused action logs).
Unverified: gVisor performance under concurrency, exact CEL selector-granularity schema (not fully published in open alpha docs).
