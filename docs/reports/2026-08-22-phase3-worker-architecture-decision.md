# Phase 3 — Architecture Decision: Rewrite vs. Strangler for `worker-mcp-drakon.js`

**Date:** 2026-08-22
**Branch:** `phase0-stabilize`
**HEAD:** `09e113da` (verified unchanged by this investigation — read-only throughout)
**Mode:** Fleet-coordinated investigation. No source edited, no migrations, no deploys, no commits, no push.

---

## Fleet roles used

- **Agent A (primary coordinator):** Oracle Claude, via `edgee launch claude --model opus`, two passes — Phase 1 (full 4,865-line direct source read, structural inventory, security/policy analysis, preliminary decomposition read) and Phase 2 (verification pass, reconciliation, final decision).
- **Agent B (route/boundary investigator):** AGY on `.234`, read-only.
- **Agent C (deployment/compatibility investigator):** `agy.exe` on `.30`, read-only.
- **Agent D (security/policy):** folded into Agent A per the coordinator prompt's own fallback clause — no 4th agent spun up separately.
- **Agent M (memory bootstrap):** performed directly by the orchestrator (this session has native `ai-memory` MCP tool access and Markdown memory file access).

## Memory bootstrap summary

- **AI_MEMORY**: sparse — single-word `memory_query` calls for `tenant`, `harness` returned zero hits; this session's own Phase 2/3 work (all done via direct SSH tool calls) was never auto-captured into the local ai-memory instance.
- **MD_MEMORY**: one highly relevant, 69-days-stale file (`project_ai_drakon.md`, dated 2026-06-14) found and used. Key corroborated finding: `drakon-mcp-worker` = confirmed, first-party, as the OLD NAME of `drakon-antigravity-worker` — upgrading a "medium confidence, inferred" conclusion from the earlier deployment-binding audit to a corroborated fact. Also surfaced: `architect-agent-flue` already implements real tenant resolution (Appwrite JWT → `{userId, plan}`), a working precedent this Worker doesn't follow; D1 was previously, deliberately removed from `architect-agent-flue` in favor of Appwrite billing — a prior abandoned D1 attempt in a sibling Worker, worth keeping in mind as a caution signal.

Full memory brief: `/tmp/claude-1000/.../scratchpad/phase3-worker-memory-brief.md` (session-ephemeral; durable content consolidated into project memory `project_ai_drakon.md` and `MEMORY.md`).

---

## Structural inventory (Agent A, Phase 1 — direct read of all 4,865 lines)

- Three-tier file structure: module scope pre-handler (1–2652, 92 functions), the `export default { fetch }` handler itself (2654–4262, containing **20 nested function declarations** at brace-depth 4 between two halves of the route dispatch chain), module scope post-handler (4264–4865, 6 functions + 2 Durable Object classes).
- **Dispatch is a linear if-chain, ~70 conditions** (confirmed: 55 static `path ===`/`startsWith` + 14 dynamic regex/`split` matchers = 69 routes), no router table — order is the only precedence rule. No static-asset fallback exists; unmatched path → 404 JSON.
- Two Durable Object classes (`RoomDO`, `DiagramSyncDO`), both module-scope, both dispatched *before* the try block, both zero-auth, zero-validation, broadcast-everything WebSocket relays.
- MCP registry (24 tools, `getMcpTools()` :1615–2019) and dispatch (`handleMcp` :2027–2235) — a 24-way if-chain, no map. One registry/dispatch drift found: `drakon.savediagram`'s schema doesn't advertise the GitHub-write side effect its dispatch actually performs.
- Four near-identical async-execute-then-poll-then-log-scrape patterns (semantic-graph, codegen, compile, deterministic-engine), all against Appwrite Functions with an admin key, all duplicating the same project-ID/endpoint defaults inline.
- 28 distinct `env.*` variables read (plus 4 more via dynamic `env[key]` access), heavily duplicated inline default chains (e.g. `APPWRITE_PROJECT_ID` fallback written out 12 separate times) — no shared config module.
- `env.D1_DB` (bound in the authoritative Wrangler config since Slice 3.0b) has **zero references anywhere in this file** — bound, unused.
- One piece of shared mutable state in the whole file: `analysisJobs = new Map()` (module-global, unbounded, `/v1/analysis/jobs` returns *every* job in the isolate to any authenticated caller — a real cross-user leak, low severity).

## Security/policy analysis (Agent A, folding in Agent D's scope)

Four real, live defects found, none requiring decomposition to fix:

1. **Privilege escalation, not just missing scoping.** `verifyOwnerAuth` (:438–462) has three credential branches; the third (:456–459) promotes **any valid Appwrite JWT** — i.e. any registered end user who can sign up at `auth.aidrakon.tech` — to `role: 'owner'`. No allowlist, no label/team check.
2. **Identity computed, then discarded.** The global gate (:2893) resolves `ownerPayload`, null-checks it, and never reads it again (`grep ownerPayload` = exactly those two lines). All ~38 post-gate routes run with no principal in scope. Same pattern repeats at 4 other call sites (:2372/:2386 are the one exception — real per-user MinIO key scoping).
3. **Authentication bypass in `handleNotesCommit`/`handleNotesDelete`** (:3577–3585, :3632–3640): `verifyJWT` never throws (always returns `null` on failure), so the surrounding `try/catch` is dead code and the return value is discarded — `Authorization: Bearer x` (any non-empty string) passes. Pre-gate, write+delete against the shared knowledge base.
4. **Hardcoded MinIO credentials committed in plaintext** (`getMinioVar` :293–300, commit `69c7976f`) — and this session separately confirmed the secret value is reused as an SSH password elsewhere in this infrastructure (password reuse across systems). Flagged to the architect and to Q directly as an urgent, decomposition-independent action item.

Additional defects found, lower urgency: an authenticated SSRF primitive at `/v1/compiler/n8n/push` (:4157, caller-supplied URL with only `.trim()` validation); an Appwrite query-injection point at :3388 (unsanitised `project` query param interpolated into a query expression string); three GitHub read routes served fully unauthenticated (:2787/:2795/:2803) that can read any private repo the server's PAT can reach; a live Appwrite session JWT embedded in cleartext inside the GitHub OAuth `state` parameter (:2426–2433) — transits GitHub's servers, browser history, and referrer headers.

Single most urgent containment action identified (2-line fix, no decomposition needed): fix the auth-check bug in `handleNotesCommit`/`handleNotesDelete` (§3 above) — complete authentication bypass, write+delete, pre-gate, zero mitigation elsewhere in the request path.

## Preliminary decomposition read (Agent A, Phase 1) — confirmed in Phase 2

**Verdict: cleanly seamed at the leaf level, badly tangled at the trunk.**

Real seams: handlers are pure functions of `(request|args, env, ctx)`; only one shared-mutable-state variable in the whole file (`analysisJobs`, fully contained within the analysis cluster); route clusters map almost 1:1 onto handler clusters; the MCP layer is already an adapter over the same HTTP handlers, not an independent owner; the two Durable Objects are entirely standalone.

Real tangles, ranked by how much each would hurt an extraction attempt: (1) the 20 nested-function block sitting inside `fetch`'s try block — must be hoisted to module scope first, as a no-op, behavior-identical commit, before any route-cluster extraction is even mechanically possible; (2) route order is load-bearing and undocumented — three routes are already dead because of it, and any module split requires deciding a new mount order, which will silently reactivate currently-dead code unless done deliberately; (3) the auth gate is **positional, not declarative** ("authenticated" = "appears below line 2893") — this is the deepest coupling, and because the resolved identity is discarded, a silent auth regression during extraction would not fail any test that currently exists; (4) `env` coupling is wide and duplicated rather than centralized.

## Route/boundary findings (Agent B, AGY `.234`)

Full 69-route inventory built independently, with file:line for every route and handler. Confirmed the GitHub-route shadowing (three pairs, 100% dead code) and found the same-handler OAuth duplicate pattern (`/auth/github/start`↔`/v1/github/oauth/authorize`, `/auth/github/callback`↔`/v1/github/oauth/callback`) straddling the auth gate in a way that makes the post-gate copies unreachable in practice (GitHub's own redirect never carries an Authorization header).

Nine candidate responsibility clusters identified (Real-Time Sync, Diagram Storage/IR, GitHub Integration, Auth/Profiles, MCP Gateway, KB/Vector Search, Async Appwrite Bridges, Agent Reverse Proxies, Inline Compilers/Ribosomes), with a dependency graph showing the MCP Gateway as the highest-coupling cluster (orchestrates four others).

**First extraction candidate: Cluster 1 (RoomDO + DiagramSyncDO, real-time collaboration/sync, ~115 lines)** — zero coupling to the rest of the file (no MinIO, Appwrite, GitHub, Workers AI, or auth call anywhere in it), a distinct runtime paradigm (stateful Durable Objects vs. the rest of the file's stateless HTTP), lowest blast radius (repointing just the two dispatch lines at 2664–2687 is the entire integration surface).

One new fact surfaced, not in the prior memory brief: a `teamId` field is written on the Appwrite profile document during GitHub OAuth callback (:2536) — flagged by Agent B as potentially complicating the "complete tenant collapse" framing, explicitly left unresolved for the coordinator to reconcile (see below — resolved against: dead field, never read).

## Deployment/compatibility findings (Agent C, `agy.exe` on `.30`)

Confirmed `cloudflare-worker/worker-wrangler.toml` as the authoritative live config (matches `AGENTS.md`'s documented deploy command, matches this session's own Slice 3.0b work). Found two live **runtime failures** in the currently-deployed config, independent of and not caused by anything in this session:

- **`DIAGRAM_SYNC` binding is absent from the authoritative config** → `GET /v1/diagram/:id/sync` returns `500 DIAGRAM_SYNC binding missing` per the committed config. The frontend (`DrakonEditor.tsx:225`) actively opens a WebSocket to exactly this route for collaborative diagram sync — if the live deployment matches the committed config, real-time diagram collaboration is broken in production right now.
- **The Workers AI (`env.AI`) binding is absent** → `/v1/kb/index` and `/v1/kb/search` return `503 Workers AI binding (env.AI) is not configured`.

Also confirmed: dual invocation modes for the Flue agent Workers — three proxy route groups use the CF service binding (with an HTTP fallback), while four other groups (`/v1/agents/pipeline*`, `/v1/playpipe/*`, `/v1/architect/*`) use raw `fetch()` to a URL/hardcoded constant, **bypassing the service binding entirely even though it's bound**. Appwrite Function coupling is confirmed loose/portable (pure REST, no proprietary Worker context). Every client-side reference to the Worker (11+ hardcoded locations across frontend, scripts, and a sibling Worker's own tool code, plus user `localStorage` overrides) independently targets `https://drakon-antigravity-worker.maxfraieho.workers.dev` — no central config exists to repoint any of them.

Rollback/compatibility risk assessment per option, reasoned from this evidence, independently converged with Agent A's own Phase 1 read on **Strangler (Option B)** as the only option scoring well simultaneously on client compatibility and rollback ease.

---

## Reconciliation (Agent A, Phase 2)

**Verification pass, direct re-checks (not recall):** confirmed 8 of the load-bearing claims from B and C's reports against fresh source reads, all held except one immaterial byte-count discrepancy (C's line/byte count was off by exactly one byte per line — a CRLF measurement artifact, no finding depended on it).

**`teamId` resolved against Agent B's caveat.** `teamId: userId` at :2536 is the *only* occurrence of that field in the entire Worker — written once during OAuth callback, never read again by anything (confirmed: `infrastructure/appwrite/schema.ts`'s `Role.team(teamId)` model has zero importers; `services/architect-agent-flue/src/middleware/auth.ts:69` independently recomputes `teamId = user.$id` with an explicit `// teams — потім` ["teams — later"] comment, never reading the profile doc's field). Verdict: dead, aspirational placeholder, same fate as `ownerPayload`. The "complete tenant collapse, zero tenant concept anywhere" finding stands unmodified.

**Sharper correction found during reconciliation, not present in either B or C:** `verifyOwnerAuth` does *not* uniformly flatten every credential to a contentless `{role:'owner'}` as B's §1.4 summary implies — the Appwrite-JWT branch specifically preserves `sub`/`email`. The actual defect is narrower and cheaper to fix than "rebuild identity from scratch": identity is correctly resolved, then discarded one line later at the single call site that matters (:2893–2894). Net effect on the product is the same either way; the fix location differs and is smaller than it first appears.

**Ten items in the formal contradiction ledger**, eight resolved with reasoning (see full ledger in the source Phase 2 transcript — condensed above), two left **explicitly unresolved**, out of this read-only investigation's reach:

- **DIAGRAM_SYNC live-vs-config divergence** — cannot be resolved from the repository alone; needs a live `wrangler deployments`/Cloudflare-dashboard check to know whether production actually matches the committed config or is running an older, complete one.
- **Legacy OAuth route callers** (:4189/:4193) — no in-repo caller found; whether any external GitHub App is still configured to redirect there is unknown from source alone.

---

## Option scoring

Rubric: 5 = best outcome on every dimension. For Security/Migration/Compatibility risk columns specifically: **5 = lowest risk**, 1 = highest risk.

| Option | Security risk | Migration risk | Compatibility risk | Rollback | Testability | Observability | Governance speed | Maintainability | Deployment complexity | Behavior preservation |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| A — Big-bang rewrite | 2 | 1 | 1 | 2 | 2 | 3 | 1 | 4 | 2 | 1 |
| **B — Strangler** | **4** | **5** | **5** | **5** | **4** | **4** | **4** | **5** | **3** | **5** |
| C — New gateway beside old | 3 | 2 | 2 | 4 | 4 | 3 | 2 | 3 | 2 | 3 |
| D — No decomposition | 2 | 5 | 5 | 4 | 1 | 2 | 5 | 1 | 5 | 4 |

(Full evidence citation per score in the source transcript — every score above is tied to a specific file:line or cross-report finding, not intuition.)

---

## Decision

```text
Decision:
STRANGLER

Confidence:
HIGH

Should Phase 3 build against the current Worker:
TEMPORARILY

Reason:
Client coupling is the binding constraint, not code quality. Every client —
.mcp.json, src/lib/worker-url.ts, settings-storage.ts, DrakonEditor.tsx,
codegenApi.ts, notesApi.ts, usePipelineExecution.ts, AgentChatPanel.tsx,
docs-agent-flue/tools/kb-search.ts, test-mcp.mjs, save-diagrams.mjs — hardcodes
drakon-antigravity-worker.maxfraieho.workers.dev independently, plus user
localStorage overrides. No central config exists to repoint. That eliminates
"new gateway beside old" outright and makes a big-bang rewrite unacceptably
risky against 69 route branches and 24 MCP tool dispatchers, an untyped
4,865-line file, and no existing test suite.

D is rejected on security, not aesthetics. Four defects are live right now and
D leaves every one in place while adding volume: privilege escalation where any
valid Appwrite JWT is promoted to role:'owner'; identity computed then
discarded at the global gate (ownerPayload never read past its null check);
three GitHub read routes served publicly while their authenticated duplicates
are 100% unreachable dead code; hardcoded MinIO credentials in source.

B is the only option scoring >=4 on migration, compatibility, rollback and
behavior preservation simultaneously, and the only one that permits in-place
security fixes on day one without waiting on any extraction.

Immediate consequence:
Worker stays the sole ingress. Phase 3 governance work lands inside it, but
strictly behind the auth gate and behind a newly introduced per-request
identity object derived from verifyOwnerAuth's already-available sub field.
Four in-place fixes precede any extraction:
  1. Rotate MinIO credentials, drop the literal fallback (getMinioVar :293-300).
  2. Delete the pre-gate GitHub read routes (2787-2808); their authenticated
     twins (2976-3021) become live — verify no client depends on the
     unauthenticated versions first.
  3. Stop promoting arbitrary Appwrite JWTs to role:'owner'; propagate sub
     instead of discarding ownerPayload.
  4. Reconcile worker-wrangler.toml: restore DIAGRAM_SYNC and the AI binding,
     consume or remove the unused D1_DB binding — gated on resolving the
     DIAGRAM_SYNC live-vs-config question first.

Deferred consequence:
Multi-tenancy. teamId and the appwrite/schema.ts Role.team model are both
dead. Real tenancy touches MinIO key layout, Appwrite permissions, and every
Flue service; out of scope until identity propagation exists at the ingress.
Also deferred: consolidating the Flue invocation tiers onto service bindings;
decommissioning the legacy drakon-mcp-worker deployment; retiring the SSE
poll bridge.

First extraction:
Cluster 1 — real-time collaboration (RoomDO + DiagramSyncDO) into a dedicated
Worker. Zero coupling to the rest of the file; DIAGRAM_SYNC is absent from the
live config, so per the committed config half of this cluster may already be
non-functional in production — if confirmed, extracting it carries near-zero
user-visible risk while simultaneously fixing the outage.
Fallback if that resolves the other way: extract the Eve/n8n/AST compiler
cluster instead (~500-800 lines, pure functions, no runtime risk) — preserve
the template-literal string-escaping when moving it.

Must not extract yet:
  - MCP protocol gateway — highest coupling, orchestrates four other clusters.
  - Auth/user-profile cluster — it IS the auth gate; must be fixed in place
    before it can be moved, or the escalation bug propagates into a new
    service boundary.
  - GitHub integration — coupled to the auth cluster for OAuth tokens, and
    carries two live defects that must be fixed first, not carried forward.
  - Diagram storage — blocked on the MinIO credential rotation.

Exit criteria for major decomposition:
  [ ] MinIO credentials rotated, no literal secret remains in the repo.
  [ ] Pre-gate GitHub read routes removed; authenticated twins confirmed
      reachable and covered by a test.
  [ ] verifyOwnerAuth no longer promotes arbitrary Appwrite JWTs to owner;
      identity propagated into at least the MinIO and Appwrite call paths.
  [ ] Single authoritative wrangler config — DIAGRAM_SYNC and AI binding
      restored, D1_DB consumed or removed, the two redundant config files
      deleted or explicitly marked dead.
  [ ] Contract tests covering all 69 route branches at status-code and
      auth-outcome level — current regression baseline is zero.
  [ ] Client URL resolution centralized through one module; the 10+ other
      hardcoded fallbacks import from it, not repeat it.
  [ ] DIAGRAM_SYNC live-vs-config contradiction resolved (dashboard/deploy check).
  [ ] Legacy OAuth route contradiction resolved (fixed or removed).
  [ ] Structured per-route logging at the ingress.
  [ ] Cluster 1 extracted and running one full release cycle without regression.
```

---

## Evidence limitations

- Two contradictions explicitly unresolved (DIAGRAM_SYNC live-vs-config, legacy OAuth route callers) — both require a live Cloudflare dashboard/`wrangler deployments` check outside this investigation's read-only repo-only scope.
- Oracle's own environment (Node v20.x) cannot run live Wrangler commands, so no delegate in this investigation independently verified live binding state for this specific question (distinct from the earlier deployment-binding-audit's live API reads, which predate this session's Slice 3.0b work and haven't been re-run since).
- The MD5-via-WebCrypto usage flagged by Agent A (`md5Hex` :3145, `crypto.subtle.digest('MD5', …)`) is outside the WebCrypto spec — whether the Cloudflare Workers runtime actually accepts this call was not verified at runtime by anyone in this investigation.
- Whether `github.com/maxfraieho/ai-drakon-scaffolder` has ever been public (relevant to how seriously to treat the committed MinIO/credential disclosure) was not determinable in this investigation's environment (`gh` not installed on the host doing that analysis).

---

**No production code was changed. No migrations created. No deployment performed. No commit created. No push performed.**
