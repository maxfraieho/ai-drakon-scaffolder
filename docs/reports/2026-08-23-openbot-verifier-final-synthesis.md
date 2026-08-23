# AI-DRAKON Re-Planning Report — Final Synthesis (Round N, local Opus)

**Date:** 2026-08-23
**Author:** local Claude-Opus subagent (Oracle host unavailable until 2026-08-25 09:00 Zurich)
**Canonical target:** `maxfraieho/ai-drakon-scaffolder`, `main` @ `874c479b3a15aa83209149083c1dd063fd2bd98b`
**Mode:** planning-only. Nothing was edited, committed, pushed, deployed, or rotated. No credential was used beyond SSH to the two working clones.
**Prior artifact reconciled:** `docs/reports/2026-08-23-openbot-harnessadapter-revised-plan.md` (41,004 bytes, read in full, DIRECT_SOURCE)

---

## 1. Summary

This round did **not** re-derive the plan. It ran three independent audits against it and reconciled them. The headline result:

**The existing plan survives reconciliation largely intact. Its two stop conditions are re-confirmed. Three of its evidence rows are now corrected, and one new Critical-severity security finding is added that no prior round caught.**

Four substantive outcomes:

1. **New Critical finding (mine, DIRECT_SOURCE, in no prior report):** `/ws/room/*` and `/v1/diagram/*/sync` are dispatched at Worker lines 2641 and 2653 — **before the try block, before the `JWT_SECRET` presence check, before every auth call site** — straight into `RoomDO.fetch` / `DiagramSyncDO.fetch`, both of which require only an `Upgrade: websocket` header and perform **zero authentication and zero tenant binding**. `ROOM_DO` is bound on the live Worker. This is a live, unauthenticated, multi-user collaborative WebSocket surface. It forces a new slice (3.6) and it is the reason the operator's candidate slice list needed a gap at 3.6 filled rather than renumbered away.

2. **Report 1's E3 is wrong as worded, and the existing plan is right.** agy .30 reported "13 `verifyOwnerAuth` call sites, no global gate." There **is** a global positional gate — line 2848, `if (!ownerPayload || ownerPayload.role !== 'owner') return 401` — and it is one of the 13 sites. Existing-plan D12 (positional global gate) stands. The two reports were describing the same code and drawing opposite conclusions; the audit-by-grep missed that one of the call sites *is* the gate.

3. **agy .30's UNKNOWN on `/v1/notes/commit` and `/v1/notes/delete` resolves, and it partially falsifies the existing plan's D14.** Those routes dispatch pre-gate (2737, 2740) but their handlers (`handleNotesCommit` L3532, `handleNotesDelete` L3581) call `verifyOwnerAuth` and 401 on `null`. They are **authenticated but not role-gated** — any Appwrite user with `role:'user'` can commit and delete notes. D14's blanket "pre-gate" framing overstates the exposure for these two routes and understates it in a different way (the danger is privilege level, not absence of auth).

4. **The `llm-as-a-verifier` framework is a scoring/ranking library, not an orchestration framework.** Its entire public surface is `select(...) → VerifierResult` and `track(...) / ProgressTracker → ProgressResult`. It has no run, tenant, spec, verdict, recommendation, or confidence vocabulary. AI-DRAKON's proposed verifier schema is a **wrapper AI-DRAKON must design and own**, not an integration of an existing contract. Upstream provides exactly two things worth taking: the *repeated-evaluation* discipline, and `ProgressTracker`'s genuinely-online prefix-only scoring.

5. **A concrete verifier host is now recommended, not left open: a Python Appwrite Function.** Q raised it mid-round and it is the right answer. The Worker already invokes Appwrite Functions with a POST-execution/GET-status pattern at **four** distinct call-site pairs (DIRECT_SOURCE, verified this pass) — one of which is the deterministic engine itself. A fifth consumer of a fivefold pattern adds no host, no ops runbook, no auth path, and keeps the load off `.184`. **The binding constraint is the Education plan's execution-time limit**, which this codebase already has scar tissue from: the deterministic engine cannot return its result normally and smuggles it out as a base64 log line (`main.ts` L6–7). The MVP is therefore bounded to **N=1, K=4, 3 criteria, capped trajectory ⇒ 12 parallel LLM calls ≈ one round-trip** (§9.8, B1–B4). Online `ProgressTracker` mode is a **poor** fit for this host and is deferred — which is now the *second independent argument* for the same post-run-only MVP boundary §9.6 reached on epistemic grounds. **The actual timeout figure is UNKNOWN and there is no `appwrite.json` in the repo to read it from (X-10).**

**Verdict: BLOCKED_ON_OWNER_DECISIONS, then BLOCKED_ON_DEPLOYMENT_VERIFICATION, then BLOCKED_ON_TEST_BASELINE, then BLOCKED_ON_ORACLE_UNTIL_25.** Full statement in §17.

---

## 2. Fleet and Evidence Context

| Agent | Environment | Covered | Did NOT cover | Tooling constraint |
|---|---|---|---|---|
| agy .30 | Windows laptop, `C:\Users\vokov\Documents\GitHub\ai-drakon-scaffolder` | Worker route/auth matrix (~50 routes sampled), credential exposure, 4-config deployment matrix, D1 wiring, test inventory | Did not trace `/v1/notes/commit|delete`, `/v1/github/*`, `/v1/compiler/n8n*`, `/ws/room/*`, `/v1/diagram/*/sync`; did not read the existing plan doc | **No GitNexus in that environment** — grep/findstr/PowerShell only |
| agy .234 | RPi, reading `.184` clone | Package topology, `harness-contract` vs `RunRequest`, 4-gate reality, `BlobStore` precedent, deterministic-engine execution contract, frontend clients, genericity baseline | Explicitly out of scope: the existing plan doc; live deployment state | None reported |
| Research pass | `.184` local clone of `llm-as-a-verifier` + arxiv + web | Score-token granularity, repeated evaluation, criteria decomposition, best-of-N, progress tracking, cost, calibration, limitations, real-vs-candidate schema | Deeper `llm-as-a-verifier.com/docs/` pages not crawled; GitHub web UI not fetched | — |
| **This pass (local Opus)** | OrangePi, SSH to `.184`, GitNexus MCP | Read the existing plan doc in full; resolved all five of agy .30's UNKNOWNs; re-verified every contested claim at direct source; found the DO/WebSocket hole; verifier schema confirmation | Did **not** attempt live Cloudflare API reads (no working token — carried forward from prior round's L9) | GitNexus transport dropped mid-call once (see §4) |

**What no agent covered this round, and it matters:** nobody re-verified live Cloudflare state. Every `LIVEDEPLOYMENT` row (L1–L8) in the existing plan is carried forward from the 2026-08-22 binding audit and is now **~1 day stale, unconfirmed twice running**.

---

## 3. Current-State Verified Findings — Reconciliation

### 3.1 Where the independent audits CONFIRM the existing plan

| Plan row | Independently confirmed by | My re-verification | Status |
|---|---|---|---|
| D11 — 13 `verifyOwnerAuth` call sites (ADR 0025 + §4.8 say 12) | Report 1 E3 (same 13 line numbers, exactly) | DIRECT_SOURCE: `grep -n "verifyOwnerAuth("` → def at 436, comment at 3604, calls at 2347, 2361, 2698, 2848, 3120, 3533, 3582, 3605, 3723, 3848, 4142, 4625, 4670 = **13** | **CORROBORATED ×3** |
| D15 — `verifyOwnerAuth` fails open when `OWNER_EMAILS` unset | Report 1 E4 | DIRECT_SOURCE L462–470, verbatim: `if (allowedOwners.length === 0 && !hasOwnerLabel) { console.warn(...); return { role: 'owner', ... } }` | **CORROBORATED ×3** |
| D16/D17 — static `MCP_API_KEY = "drakon-mcp-2026"` → unconditional owner, plaintext in two files | Report 1 E5 | DIRECT_SOURCE: `cloudflare-worker/wrangler.toml:8`, `cloudflare-worker/worker-wrangler.toml:8` (plan doc says L7 — **actual is line 8**, trivial correction); grant at L442–444 `return { role: 'owner', sub: 'mcp-agent' }` | **CORROBORATED ×3** |
| D18 — `handleDrakonExecuteDeterministic` forwards client body verbatim | Report 1 E10 | Not re-read this pass; two independent DIRECT_SOURCE reads agree | **CORROBORATED ×2** |
| D20 — engine treats client `gates` as authoritative | Report 1 E11, Report 2 | DIRECT_SOURCE `services/deterministic-engine/src/main.ts` L89–96: destructures `harness_spec` from payload, rejects only `if (!harness_spec || !harness_spec.gates)`, then compiles `harness_spec.gates.safety.blocked_patterns` directly | **CORROBORATED ×4** |
| D25 — `env.D1_DB` referenced nowhere | Report 1 E7 | Accepted on two independent greps | **CORROBORATED ×2** |
| D26 — 6 D1 tables incl. unused `harness_specs` | Report 1 E8 | Accepted on two independent reads | **CORROBORATED ×2** |
| D6 — confidence gate is a hardcoded simulation | Report 2 (quoted the code) | DIRECT_SOURCE `packages/policy-engine/src/index.ts` L146–157, verbatim: `// Simulating LLM confidence score. Deterministic-mocked` / `let score = 0.65;` / `score += 0.15;` | **CORROBORATED ×3** |
| D7 — cost gate consumes `Math.random()`-derived tokens | Report 2 (`llm-node randomness is out of scope`) | Accepted on two independent reads | **CORROBORATED ×2** |
| D9 — `require_human_approval` read by no code | Report 2 (found the disclaimer in **both** package headers) | DIRECT_SOURCE `packages/harness-contract/src/index.ts:17` header comment: `` `gates.safety.require_human_approval` is declared but not read ``; field declared at L53 | **CORROBORATED ×3** |
| D4 — the 4 scaffold packages are not workspace members | Report 2 | DIRECT_SOURCE `pnpm-workspace.yaml`: members are `services/*`, `packages/harness-contract`, `packages/policy-engine`, `packages/storage`, `cloudflare-worker`. `packages/` contains 7 dirs; `codegen`, `drakon-ir`, `spec-kit`, `ui` are **absent from the workspace** | **CORROBORATED ×3** |
| D31 — no `fetch()`-driven route test | Report 1 E9 (14 test files, none call `worker.fetch`/default export) | Accepted on two independent inventories | **CORROBORATED ×2** |
| D32 — `BlobStore` is a good provider-neutral precedent | Report 2 (added: the 4 methods were derived from the 4 actual MinIO call sites, and the interface *documents* what it deliberately excludes) | Accepted | **CORROBORATED ×2, strengthened** |
| D29 — three mutually-incompatible configs named `drakon-antigravity-worker` | Report 1's config matrix (identical field-by-field) | DIRECT_SOURCE `ls`: `cloudflare-worker/worker-wrangler.toml`, `cloudflare-worker/wrangler.toml`, `wrangler-antigravity.jsonc` — three Worker configs, plus a fourth unrelated file (§3.3) | **CORROBORATED ×3** |
| D23 — status route now checks `role === 'owner'` but has no execution_id ACL | Report 1 E6 | Accepted on two independent reads | **CORROBORATED ×2** |
| D33 / genericity baseline | Report 2: zero repo-wide matches for `openbot|agui|copilotkit` outside `node_modules` | Not re-run; single-source | **INFERENCE-grade, single-source** |

### 3.2 Where the audits CONTRADICT each other or the plan — resolved at direct source

**R-1 — "no global gate" (Report 1 E3) vs "positional global gate at L2848" (plan D12).**
**Resolved in favour of the plan.** DIRECT_SOURCE L2848–2851:

```js
      const ownerPayload = await verifyOwnerAuth(request, env);
      if (!ownerPayload || ownerPayload.role !== 'owner') {
        return errorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED');
      }
```

Everything textually after L2851 in the dispatch chain is owner-gated. Report 1 counted 13 call sites and inferred "per-route inline, no central enforcement" — but site #4 of those 13 *is* the central enforcement point. Both observations were correct; one inference was not. **D12 stands. I2 (positional order as the systemic root cause) stands.**

**R-2 — `/v1/notes/commit`, `/v1/notes/delete`: plan D14 says "pre-gate"; Report 1 says UNKNOWN.**
**Resolved, and D14 must be amended.** DIRECT_SOURCE:

- dispatch `POST /v1/notes/commit` at L2737 → `handleNotesCommit(request, env)`
- `handleNotesCommit` at L3532–3534: `const authPayload = await verifyOwnerAuth(request, env); if (!authPayload) return errorResponse('Invalid or expired token', 401);`
- dispatch `DELETE /v1/notes/delete` at L2740 → `handleNotesDelete` at L3581–3583, identical pattern.

So: positionally pre-gate — **true**. Unauthenticated — **false**. The real defect is that these handlers check *authentication* (`!authPayload`) and not *authorization* (`role !== 'owner'`), so a `role:'user'` Appwrite principal can commit and delete notes. This is the **same defect class as `POST /mcp` (D13)**, which checks `if (!owner)` at L2698–2700 and nothing more.

This also reconciles the plan's I1 phrase "dead-code notes auth": commit `5fa22518` appears to have *made that auth live*. At HEAD it is live and reachable. **In source it is a partial fix; on the live edge, per L4, it is not deployed at all.**

**R-3 — `/v1/github/*`, `/v1/compiler/n8n*`: Report 1 UNKNOWN.**
**Resolved: owner-gated.** DIRECT_SOURCE dispatch line numbers — `/v1/github/tree` 2931, `/v1/github/file` 2940, `/v1/github/commit` 2949, `/v1/github/delete` 2960, `/v1/github/branches` 2971, `/v1/compiler/n8n` 4088, `/v1/compiler/n8n/push` 4100 — all **after** the L2848 gate. No additional exposure. (Note: `github.commitfile` remains reachable *via* `POST /mcp` at L2697, which is pre-gate — D13's exposure is unchanged by this.)

**R-4 — `/ws/room/*`, `/v1/diagram/*/sync`: Report 1 UNKNOWN. NEW CRITICAL FINDING.**
**Resolved: no authentication whatsoever.** DIRECT_SOURCE:

- L2641 `if (path.startsWith('/ws/room/'))` → `env.ROOM_DO.idFromName(roomId)` → `stub.fetch(request)`. Returns before the `try {` block at L2664 and before `if (!env.JWT_SECRET)` at L2665.
- L2653 `if (path.startsWith('/v1/diagram/') && path.endsWith('/sync'))` → `env.DIAGRAM_SYNC` → `stub.fetch(request)`. Same position.
- `RoomDO.fetch` (L4730): only check is `if (upgradeHeader !== 'websocket') return 426`. Then `WebSocketPair`, `handleSession(server)`.
- `DiagramSyncDO.fetch` (L4779): same 426 check, then `server.accept(); this.sessions.add(server);` and a message broadcast loop.

Consequences: **any unauthenticated client that knows or guesses a `roomId` or `diagramId` joins the collaborative session and can send messages into it.** There is no tenant, no owner check, no membership check, no rate limit. Room and diagram identifiers are `idFromName(...)` of a path segment — guessable by construction.

Live impact split: per carried-forward L1, the live Worker binds `ROOM_DO` but **not** `DIAGRAM_SYNC`. So `/ws/room/*` is a **live** unauthenticated WebSocket, and `/v1/diagram/*/sync` currently 500s live with `DIAGRAM_SYNC binding missing` — which means fixing the config contradiction (Slice 3.0c) would **activate a second unauthenticated surface** unless 3.6 lands with or before it. That coupling is new and is the single most important ordering consequence of this round.

**R-5 — Report 1's E13 "a 4th wrangler config exists."**
**Confirmed as a file, downgraded in significance.** DIRECT_SOURCE root `wrangler.toml` is 132 bytes, in full:

```toml
name = "drakon-setup-hub"
pages_build_output_dir = "dist"
compatibility_date = "2025-09-24"
compatibility_flags = ["nodejs_compat"]
```

`pages_build_output_dir` makes this a **Cloudflare Pages** project config, a different resource type with a different name. It does **not** compete for `drakon-antigravity-worker`. The plan's D29 count of **three** competing Worker configs is correct and unchanged. Its only planning relevance: any CI rule of the form "exactly one wrangler config per repo" would be wrong; the rule must be "exactly one deployable config **per Worker name**" — which is what the plan's 3.0c invariant already says. **No change to the canonical-config decision.** (Q still owns that decision; see §16.)

**R-6 — `execution_mode` closed union (Report 2) vs plan Adjustment A.**
**Both are right; they are describing the same problem from two ends.** DIRECT_SOURCE `packages/harness-contract/src/index.ts:46`: `execution_mode: 'deterministic' | 'hybrid';`. The plan's Adjustment A already removes `DrakonHarnessSpec` from the adapter signature; Report 2 adds the sharper point that even leaving the spec untouched, this union hardcodes a two-engine world. The synthesis: **`DrakonHarnessSpec` stays frozen and the union stays as-is** (it is the deterministic engine's own config, which is exactly what `runnerConfig` is for), and `RunnerDescriptor.runnerId` becomes the *only* place a runner is named. Report 2's conclusion — "`RunRequest` is a new type, not a refinement" — is adopted verbatim.

**R-7 — Adapter `resume`/`cancel`.**
**Report 2 corrects the plan by addition, not contradiction.** The plan's `HarnessAdapter` (§3.1 Adjustment A) declares `resume()` and `cancel()`. Report 2 found no resume endpoint on the deterministic path; breakpoints exist in the IR and type but the only `resumeExecution` call in `usePipelineExecution.ts` targets a *different* SSE backend. So for `runnerId=deterministic`, `resume`/`cancel` are **net-new implementation work, not a wrap of existing behavior**, and `descriptor.supportsResume`/`supportsCancel` must both start `false`. The plan did not say this. It should.

**R-8 — deterministic engine transport.**
**Report 2 corrects the architecture picture.** `services/deterministic-engine/src/main.ts` is a **synchronous Appwrite Function**: one POST in, one `{success, events[]}` out, all events computed eagerly, plus a base64-log fallback for the Appwrite Education plan. The poll/async illusion is manufactured **one layer up** in the Worker (`/v1/pipeline/execute-deterministic` → `execution_id`; `/status` polls Appwrite). `descriptor.transport` for this adapter is `'poll'`, and the adapter's seam is the **Worker handlers**, not the engine. Any component diagram that draws the engine as a streaming runner is wrong.

### 3.3 New findings this round not in any prior report

| # | Finding | Source | Severity |
|---|---|---|---|
| **N1** | `/ws/room/*` and `/v1/diagram/*/sync` → Durable Objects with **zero auth, zero tenant**, dispatched before the auth chain even begins. `ROOM_DO` is live. | DIRECT_SOURCE L2641–2663, L4723–4740, L4772–4790 | **Critical** |
| **N2** | Fixing the wrangler-config contradiction (3.0c) would **bind `DIAGRAM_SYNC` and thereby activate a second unauthenticated WebSocket surface** that currently fails closed by accident. | INFERENCE from N1 + carried-forward L1 | **High** |
| **N3** | `verifyOwnerAuth` has a **fourth** owner-granting path nobody has documented: an Appwrite user carrying the label `owner` (`hasOwnerLabel`) is granted `role:'owner'` **regardless of `OWNER_EMAILS`**. The owner surface is: static `MCP_API_KEY`, Worker JWT with `role:'owner'`, Appwrite email in `OWNER_EMAILS`, Appwrite label `owner`, **and** the fail-open branch. Five paths, not the two or three previously enumerated. | DIRECT_SOURCE L441–476 | **Medium-High** |
| **N4** | Plan D17 cites `wrangler.toml` L7 for `MCP_API_KEY`; the actual line is **8** in both files. | DIRECT_SOURCE | Cosmetic (fix the doc) |
| **N5** | `cloudflare-worker` is itself a **registered pnpm workspace member**. Any new adapter package can therefore be imported by the Worker only if it is also registered — Report 2's warning applies with a concrete mechanism. | DIRECT_SOURCE `pnpm-workspace.yaml` | Low, planning-relevant |
| **N6** | `/v1/notes/build-semantic-graph` (dispatch L2743, pre-gate) → `handleNotesBuildSemanticGraph` L3601, which calls `verifyOwnerAuth` at L3605 — same authenticate-but-don't-authorize pattern as commit/delete. Three routes in this defect class, not two. | DIRECT_SOURCE | Medium |
| **N7** | Worker is **4,811 lines** (Report 1 E2) = 171,393 bytes (plan D10). Both correct, same file. | DIRECT_SOURCE `wc -l` | — |

### 3.4 Net effect on the existing plan's evidence matrix

- **Amend D14**: `/v1/notes/commit`, `/v1/notes/delete`, `/v1/notes/build-semantic-graph` are pre-gate **but self-authenticating without a role check** — reclassify from "unauthenticated" to "authenticated, any role", same defect class as D13.
- **Amend D17**: line 8, not line 7.
- **Add D34** (= N1): unauthenticated Durable Object WebSocket surfaces.
- **Add D35** (= N3): five owner-granting paths in `verifyOwnerAuth`.
- **Amend D29 commentary**: the root `wrangler.toml` is a Pages config; the "three competing Worker configs" count is unchanged.
- **Amend Adjustment A**: `supportsResume`/`supportsCancel` start `false` for `deterministic`; `transport: 'poll'`; the adapter seam is the Worker handler pair, not the engine.
- **Everything else in the plan's D-matrix survives unchanged**, most of it now on two to four independent sources.

---

## 4. GitNexus Freshness and Limitations

`mcp__gitnexus__list_repos`, this session (GITNEXUS):

| Repo | Indexed commit | Indexed at | Staleness | Stats |
|---|---|---|---|---|
| `ai-drakon-scaffolder` | `57fe5afac6cd87d7ec4b455892be8cd0534a52b6` | 2026-08-22T18:27:30Z | **⚠️ 4 commits behind HEAD `874c479b`** | 582 files, 4,918 nodes, 10,553 edges, 138 communities, 300 processes, **0 embeddings** |
| `llm-as-a-verifier` | `8db8a114355a9d7fdf9a8d1d5c87f6aeebd18770` | 2026-08-23T04:17:02Z | **none — index == HEAD** | 21 files, 310 nodes, 627 edges, 14 communities, 26 processes, **0 embeddings** |

**Limitations that materially affected this round:**

1. **`ai-drakon-scaffolder` is stale for exactly the code under audit.** It was 3 commits behind at plan-doc time; it is 4 behind now. The 4 missing commits are today's security fixes, the storage package, the Worker wiring, and the plan doc itself. **Every load-bearing claim in §3 was therefore taken from direct source on the `.184` clone, not from GitNexus.** GitNexus was used for orientation (locating `verifyOwnerAuth` at L435–477 and `handleNotesBuildSemanticGraph` at L3600–3658 — both confirmed accurate) and nothing more.

2. **GitNexus transport dropped mid-call this session.** The `query` against `llm-as-a-verifier` returned `MCP server "gitnexus" transport dropped mid-call; response for tool "query" was lost`. This is a **third distinct GitNexus failure mode** on record, alongside the WAL instability and the `Napi::Error … native worker` analyze crash (MEMORY_CONTEXT: `feedback_gitnexus_wal_instability`, `feedback_gitnexus_native_binding_crash`). The query was not retried; direct grep was used instead and produced the answer. **Not blocking; log it.**

3. **`embeddings: 0` on both repos.** Hybrid ranking is running BM25-dominant. Query relevance was visibly weak — the `verifyOwnerAuth` query surfaced `HandleKbIndex` processes at the top and unrelated `GATE_ICONS` constants in definitions. Treat GitNexus ranking on this repo as a locator, not a judgement.

4. **A 4,811-line if/else Worker is close to the worst case for a graph indexer.** There is no router, so route→handler edges are string comparisons inside one giant function. `route_map` was not attempted for that reason; the route inventory in §3 is grep-derived and line-numbered.

**Recommendation (not an action):** reindex `ai-drakon-scaffolder` on `.184` before any implementation slice begins — `docker exec gitnexus-server node /app/gitnexus/dist/cli/index.js analyze /projects/ai-drakon-scaffolder`, after `git pull` in the container-visible clone. Given the native-binding crash history, treat a failed reindex as non-blocking and proceed with a documented staleness note.

---

## 5. LLM-as-a-Verifier Findings

Synthesis of Report 3, spot-checked against the local clone this pass.

**The single most important fact: this is a scoring/ranking library, not an orchestration framework.** DIRECT_SOURCE, the complete result surface:

```python
@dataclass
class VerifierResult:          # llm_verifier/__init__.py:66-92
    index: int                 # winning trajectory index
    best: str                  # the winning trajectory
    scores: list[float]        # per-trajectory mean preference (w_i / c_i)
    n_comparisons: int = 0
    criteria: list[str] = field(default_factory=list)
    @property
    def ranking(self) -> list[int]: ...

@dataclass
class ProgressResult:          # llm_verifier/progress.py:46-60
    steps: List[int]           # 1-indexed checkpoint step numbers
    scores: List[float]        # progress score in [0,1] per checkpoint, mean over K repeats
    per_rep_scores: ...        # raw per-repeat curves, K x len(steps); None where unreadable
```

There is **no** `tenantId`, `runId`, `specId`, `verdict`, `recommendedAction`, `confidence`, `evidenceRefs`, `missingEvidence`, or `uncertaintyNotes` anywhere in the package, the paper, or the site. Report 3 grepped for every one of AI-DRAKON's candidate field names across all fetched sources and found zero hits. **AI-DRAKON's verifier schema is a design AI-DRAKON must own outright.**

**Five things worth taking:**

| # | Upstream mechanism | Source | Worth taking? |
|---|---|---|---|
| V1 | **Repeated evaluation**, K reps per criterion (`n_evaluations`, default 4 in `select`) | DIRECT_SOURCE `__init__.py:123,242,264`; `progress.py:242,339` | **Yes — this is the core discipline.** A single LLM judgement is not evidence; K judgements with dispersion are. |
| V2 | **`ProgressTracker` — genuinely online, prefix-only scoring** with a neutral prompt that never reveals eventual success, explicitly designed to stop hopeless rollouts early | DIRECT_SOURCE `progress.py:313-409`; class docstring `progress.py:326` | **Yes — this is the design idea, and it settles the "can the verifier run mid-run?" question empirically.** |
| V3 | **`per_rep_scores`** — the raw K curves, with `None` where a repeat produced no readable score | DIRECT_SOURCE `progress.py:54-56` | **Yes — this is the raw material for the confidence field upstream doesn't emit.** See §9.5. |
| V4 | Fine-grained reward via a 20-letter (A–T) score-token distribution over `top_logprobs=20` | DIRECT_SOURCE `fine_grained_reward.py:403-466`; EXTERNAL_SOURCE arxiv 2607.05391v1 | **Not initially.** Requires logprob access; excludes closed frontier APIs. A hard dependency AI-DRAKON should not take in an MVP. |
| V5 | Probabilistic Pivot Tournament — O(N·k) pairwise, A/B slot alternation to cancel positional bias | DIRECT_SOURCE `pivot_tournament.py` | **Only if AI-DRAKON does best-of-N.** Irrelevant to single-run post-hoc verification, which is the MVP. |

**Criteria are NOT drop-in compatible.** DIRECT_SOURCE `criteria/`: exactly four files — `TEMPLATE.md`, `swe_bench.md`, `terminal_bench.md`, `medagentbench.md`. Each hand-authored, each with exactly three criteria:

- `swe_bench`: root_cause, code_review, verification
- `terminal_bench`: `{#specification}` Specification Adherence, `{#output_match}` Output Match, `{#error_signals}` Error Signal Detection
- `medagentbench`: query, consistency, structure

AI-DRAKON's candidate set is specification / output / errors / **evidence** / **handoff**. Three overlap conceptually with `terminal_bench`; **"evidence" and "handoff" exist nowhere upstream.** Criteria in this framework are per-domain hand-authored markdown, not a universal set — which means AI-DRAKON inventing its own two is *normal usage*, not a deviation. But **which set to adopt is a product decision, not an engineering one, and Q owns it** (§16, Q-11).

**No confidence field exists upstream, and the paper says so.** EXTERNAL_SOURCE arxiv Appendix A: uncertainty is implicit in the continuous [0,1] score only; adaptive-compute-via-uncertainty is listed as **proposed future work, not implemented**. §9.5 addresses this as a real gap.

**Nothing upstream discusses authorization or advisory-only status.** Report 3 confirmed this absence by direct grep across paper, README, site, and code. AI-DRAKON's "the verifier must never hold authorization" constraint is therefore **entirely AI-DRAKON's own invariant** — there is no upstream guidance to align with and none to conflict with. That is a freedom, and it is also a warning: nothing upstream will stop you from wiring it as an authority.

**Cost shape (DIRECT_SOURCE README):** no wall-clock figures published. One example run: 4,320 verifier calls, 272.5M input tokens (78.8% cached), 32.4M output tokens. Prefix-cache optimization moved cache hit rate 5.2% → 78.4% (~3.4× fewer uncached input tokens). **Implication for AI-DRAKON: prefix-caching is not an optimization, it is a precondition — an online tracker re-scores a growing prefix at every checkpoint, which is the pathological case without it.**

**Domain fit:** Terminal-Bench (shell agents) and SWE-Bench Verified (code editing) are core covered domains — both directly relevant to AI-DRAKON's deterministic pipeline and to a future OpenBot runner's shell work. **No browser-agent benchmark exists anywhere in the framework**, which is precisely the domain OpenBot's `agent-computer` container occupies. UNKNOWN whether the scoring transfers there.

---

## 6. Local Framework Clone and Index Status

DIRECT_SOURCE, verified this pass on `.184`:

| Field | Value |
|---|---|
| Remote URL | `git@github.com:llm-as-a-verifier/llm-as-a-verifier.git` (public mirror `https://github.com/llm-as-a-verifier/llm-as-a-verifier`) |
| Local path | `/home/vokov/projects/llm-as-a-verifier` (dev server `.184`) |
| Branch | `main` |
| HEAD | `8db8a114355a9d7fdf9a8d1d5c87f6aeebd18770`, authored 2026-08-20 00:01:30 -0700 |
| GitNexus indexed commit | `8db8a114355a9d7fdf9a8d1d5c87f6aeebd18770` — **identical to HEAD** |
| Indexed at | 2026-08-23T04:17:02.265Z |
| Freshness | **Fresh. No staleness warning.** |
| Index stats | 21 files, 310 nodes, 627 edges, 14 communities, 26 processes, 0 embeddings |
| Top-level contents | `AGENTS.md CHANGELOG.md CLAUDE.md LICENSE README.md add_new_benchmark.md assets criteria data llm_verifier pyproject.toml requirements.txt scripts` |
| Framework code actually used | `llm_verifier/`, `criteria/`, `scripts/` |

### 6.1 Indexing failure mode encountered and fixed — documented, not glossed

**What happened:** the first two `analyze` runs against this clone **crashed GitNexus silently** — no error surfaced to the caller, no index produced.

**Cause:** `data/` — **349 MB** of ML benchmark trajectory datasets (verified this pass: `du -sh data` → `349M`). These are agent rollout transcripts, not source. Feeding them to the indexer is both useless and, at that volume on this hardware, fatal.

**Fix applied:** a `.gitnexusignore` was written at the repo root containing exactly one line:

```
data/
```

**Result:** the third `analyze` succeeded — 21 files, 310 nodes, 627 edges, 14 communities, 26 processes, index commit == HEAD.

**Why this is worth recording rather than dropping:** it is a **fourth** GitNexus failure mode, distinct from the WAL instability and the `Napi::Error` native-worker crash, and it is the only one with a clean, cheap, general remedy. The generalizable rule: **before indexing any repo that ships datasets, fixtures, or model artifacts, `du -sh` the top-level dirs and `.gitnexusignore` anything over ~50 MB that is not source.** That rule belongs in `exodus-infra/services/raspberry-pi/README.md` — flagged as a proposal, not written (planning-only round).

**Standing caveat:** `.gitnexusignore` is a local, untracked file on `.184`. It is not in the upstream repo. A fresh clone elsewhere will hit the same crash. UNKNOWN whether it is backed up anywhere.

---

## 7. Revised Universal Execution Architecture

Reconciled against R-7 and R-8 (Report 2's corrections to the deterministic contract) and against N1 (the DO surfaces the previous diagram omitted entirely).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ BROWSER / UI                                                                 │
│  runner picker (registry-driven) · run timeline · gate indicators (+GateTrust)│
│  evidence drawer · approval prompt · provenance chip · verifier panel        │
│  NOTE: today two build-time paths behind VITE_USE_DETERMINISTIC (Report 2).  │
│        Collapses to one runtime path at Slice 4.5.                           │
└───────────────┬──────────────────────────────────────────────┬───────────────┘
                │ HTTPS                                        │ WebSocket
                │                                              │
┌───────────────▼──────────────────────────────────────────────▼───────────────┐
│ WORKER / API GATEWAY  (cloudflare-worker/worker-mcp-drakon.js, 4,811 lines)  │
│                                                                              │
│  ⚠ TODAY: WS paths at L2641/L2653 SHORT-CIRCUIT EVERYTHING BELOW.            │
│    /ws/room/* → ROOM_DO.fetch        — no auth, no tenant  [N1, LIVE]        │
│    /v1/diagram/*/sync → DIAGRAM_SYNC — no auth, no tenant  [N1, 500s live]   │
│    TARGET: both must pass tenant resolution + membership before the DO stub. │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ ROUTE_AUTH table (Slice 3.2) — declarative, consulted BEFORE dispatch   │  │
│  │ replaces the positional gate at L2848 [D12/I2, confirmed this round]    │  │
│  └───────────────┬────────────────────────────────────────────────────────┘  │
│  ┌───────────────▼──────────┐  ┌──────────────────────────────────────────┐  │
│  │ TENANT RESOLVER (3.3)    │  │ SPEC RESOLVER (3.4)                      │  │
│  │ resolveTenant(request)   │  │ specId+version → D1 → validateHarnessSpec│  │
│  │ → {tenantId,userId,roles}│  │ ⚠ TODAY: client mints spec in browser    │  │
│  │ replaces 5 owner paths   │  │   [D18/D21/D22, corroborated ×4]         │  │
│  │ incl. fail-open [D35/N3] │  └────────────────┬─────────────────────────┘  │
│  └──────────────────────────┘                   │                            │
│  ┌──────────────────────────────────────────────▼─────────────────────────┐  │
│  │ POLICY ENGINE (packages/policy-engine) — THE ONLY AUTHORIZATION PLANE  │  │
│  │  safety   : ENFORCING  (real regex)                                    │  │
│  │  policy   : ENFORCING  (real, but capability inferred by text-sniffing)│  │
│  │  confidence: SIMULATED (score=0.65, +0.15/retry — hardcoded) [D6 ×3]   │  │
│  │  cost      : SIMULATED (real math over Math.random() input) [D7 ×2]    │  │
│  │  → each verdict carries GateTrust: 'enforcing' | 'simulated'           │  │
│  └──────────────────────────────────────────────┬─────────────────────────┘  │
│  ┌──────────────────────────────────────────────▼─────────────────────────┐  │
│  │ HUMAN-APPROVAL PEP  ← enforcement lives HERE, not in the engine        │  │
│  │  reads spec.gates.safety.require_human_approval — read by NO code today│  │
│  │  [D9, corroborated ×3]. Blocks dispatch. Emits an approval-required    │  │
│  │  RunSnapshot. THE VERIFIER NEVER SUBSTITUTES FOR THIS.                 │  │
│  └──────────────────────────────────────────────┬─────────────────────────┘  │
│  ┌──────────────────────────────────────────────▼─────────────────────────┐  │
│  │ RUNNER REGISTRY (packages/harness-runtime)                             │  │
│  │  runnerId → HarnessAdapter; validates runnerConfig vs configSchema     │  │
│  │  ONLY module permitted to import an adapter package (CI-enforced)      │  │
│  └────┬─────────────────────┬──────────────────────┬──────────────────────┘  │
└───────┼─────────────────────┼──────────────────────┼─────────────────────────┘
        │                     │                      │
┌───────▼─────────┐  ┌────────▼────────┐  ┌──────────▼───────────┐
│ DETERMINISTIC   │  │ BYO-HTTP        │  │ OPENBOT ADAPTER      │
│ ADAPTER         │  │ ADAPTER         │  │ (Slice 3.7)          │
│ transport:'poll'│  │ transport:'poll'│  │ transport:'stream'   │
│ supportsResume: │  │ trivial 2nd impl│  │ AG-UI SSE→RunSnapshot│
│   FALSE  [R-7]  │  │ proves the seam │  │ #1037 msg-id fix     │
│ supportsCancel: │  │ generalizes     │  │ grant issuer         │
│   FALSE  [R-7]  │  └─────────────────┘  └──────────┬───────────┘
│                 │                                   │
│ start() = today's Worker POST handler               │ Gateway-mediated only.
│ poll()  = today's status handler (Appwrite poll)    │ No browser→OpenBot.
│   ↓                                                 │
│ Appwrite Function: SYNCHRONOUS request/response.    │
│ POST {drakon_ir,harness_spec,breakpoints}           │
│ → single {success, events[]}, computed EAGERLY.     │
│ NOT a stream. The async illusion is Worker-side.    │
│ [R-8, Report 2 DIRECT_SOURCE]                       │
└─────────────────────────────────────────────────────┘
        │
┌───────▼──────────────────────────────────────────────────────────────────────┐
│ MCP BOUNDARY  (POST /mcp, L2697)                                             │
│  ⚠ TODAY pre-gate, checks only `if (!owner)` → role:'user' reaches all 24    │
│    tools incl. github.commitfile [D13, confirmed]. Same defect class as the  │
│    three /v1/notes/* handlers [R-2, N6].                                     │
│  TARGET (Slice 4.4): tools/list filtered by the tenant's resolved grant;     │
│    tools/call re-checks and writes audit.                                    │
└──────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────┐
│ AUDIT / EVIDENCE STORAGE                                                     │
│  D1 run_events(run_id, tenant_id, seq, ...) append-only — 0% built [D28]     │
│  Appwrite audit_log collection — no writer exists                            │
│  packages/storage BlobStore (get/put/delete/list) — SHIPPED, FROZEN [D32]    │
│  RunSnapshot persistence (Slice 4.0) is the prerequisite for ALL verifier work│
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │  reads persisted trace ONLY
┌───────────────────────────────▼──────────────────────────────────────────────┐
│ TRAJECTORY VERIFIER  (advisory plane — NO authorization, ever)               │
│  HOST: Python Appwrite Function, sibling to services/deterministic-engine.   │
│  Worker invokes via POST /v1/functions/{id}/executions + GET .../{execId} —  │
│  the SAME pattern already used at 4 call-site pairs (L3634/3673, 3756/3795,  │
│  3886/3925, 4645/4684). No new host, no new ops surface. [§9.8, H1-H4]       │
│  ⚠ Education-plan execution-time limit is the binding constraint. MVP bounds:│
│    N=1 (no Best-of-N/tournament), K=4 parallel, 3 criteria, capped trajectory│
│    → 12 LLM calls ≈ 1 round-trip. Reuse the base64-log result channel the    │
│    deterministic engine already needs on this plan (main.ts L6-7, L323).     │
│  post-run first (4.2), online prefix-scoring later (4.3, ProgressTracker-    │
│  shaped) — and online is a POOR fit for this host: many small invocations    │
│  per run, each re-sending a longer prefix. Likely needs a different model.   │
│  Emits VerificationResult with its OWN confidence field derived from         │
│  K-repeat dispersion — upstream has none [V3, arxiv Appendix A].             │
│  MAY: annotate, rank, recommend, request human review, veto AUTO-retry.      │
│  MAY NOT: set GateVerdict.allowed, satisfy require_human_approval, widen a   │
│  grant, or cause any side effect the policy plane has not already permitted. │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Three architectural facts this diagram changes from the previous round:**

1. The WebSocket/Durable-Object lane exists and bypasses the entire policy stack (N1). It was absent from every prior diagram.
2. The deterministic runner is a **synchronous function behind a Worker-manufactured poll façade** (R-8). The adapter seam is the Worker handler pair `handleDrakonExecuteDeterministic` / `handleDrakonExecuteDeterministicStatus`, not `main.ts`.
3. `resume`/`cancel` are **not** wraps of existing behavior for the deterministic runner (R-7); both descriptor flags start `false`, and the `HarnessAdapter` interface must tolerate that.

---

## 8. Contract and Schema Proposal

Adopting Report 2's core conclusion: **`DrakonHarnessSpec` is not `RunRequest`, is not a draft of it, and must not be modified.** It is the deterministic engine's static per-agent config document, it is consumed by shipped code, and its `runtime.execution_mode: 'deterministic' | 'hybrid'` union is *correct in its own scope* — that union describes how the deterministic engine walks the IR, not which runner is executing. Freezing it is what makes the new contract safe.

All of the following are **purely additive exports in `packages/harness-contract/src/index.ts`**.

```ts
// ─── Runner-neutral. CI-enforced: no runner name may appear in this type. ───
interface RunRequest<TConfig = unknown> {     // generic per Report 2
  tenantId: string;                 // Appwrite teamId (ADR 0025)
  runId: string;                    // replayable run identity
  specId: string;                   // SERVER-resolved; never client-supplied
  specVersion: string;
  taskGraph: DrakonIR;
  capabilities: string[];           // resolved grant, deny-by-default
  quotas: { maxTokens: number; maxWallClockSeconds: number };
  knowledge: KnowledgeHandle[];     // references only, never credentials
  grant: GrantHandle;               // opaque, short-TTL, server-issued
  runnerConfig: TConfig;            // validated against descriptor.configSchema
}

// For the deterministic runner: TConfig = DrakonHarnessSpec.
// The spec becomes CARGO inside runnerConfig — never part of the neutral core.
type DeterministicRunRequest = RunRequest<DrakonHarnessSpec>;

interface RunnerDescriptor {
  runnerId: string;                 // the ONLY place a runner is named
  capabilities: string[];
  configSchema: JSONSchema;
  transport: 'poll' | 'stream';
  supportsResume: boolean;          // deterministic: FALSE at introduction [R-7]
  supportsCancel: boolean;          // deterministic: FALSE at introduction [R-7]
}

interface HarnessAdapter<TConfig = unknown> {
  readonly descriptor: RunnerDescriptor;
  start(req: RunRequest<TConfig>): Promise<{ executionId: string }>;
  poll(executionId: string): Promise<RunSnapshot>;
  resume?(executionId: string, approval: ApprovalDecision): Promise<void>;  // OPTIONAL
  cancel?(executionId: string): Promise<void>;                              // OPTIONAL
}

type GateTrust = 'enforcing' | 'simulated';
// safety: enforcing | policy: enforcing | confidence: simulated | cost: simulated
```

**Six deltas from the existing plan's Adjustment A, each with a reason:**

| # | Delta | Reason |
|---|---|---|
| 1 | `RunRequest<TConfig = unknown>` instead of `runnerConfig: unknown` | Report 2: bare `unknown` defeats type safety at every call site. The generic keeps the neutral core neutral while letting the deterministic adapter be fully typed. |
| 2 | `resume`/`cancel` become **optional methods** | R-7: neither exists for the deterministic runner. A required method that every adapter stubs with `throw` is a lie in the type system. Optional + descriptor flags tell the truth. |
| 3 | `DrakonHarnessSpec` explicitly **frozen and reused as `TConfig`** | Report 2: it is shipped, imported, and correct in scope. Reuse beats redesign. |
| 4 | `execution_mode` union **left alone** | R-6: it is the deterministic engine's own config. Widening it would leak runner identity into a place that should not know about runners. `RunnerDescriptor.runnerId` is the single naming authority. |
| 5 | `transport: 'poll'` for the deterministic adapter, seam at the **Worker handlers** | R-8: the engine is synchronous; the Worker manufactures the async façade. |
| 6 | `GateTrust` emitted on every `GateVerdict`, and surfaced in the UI | D6/D7 corroborated ×3 and ×2. A UI that shows four green gates when two are hardcoded is misinformation. |

**Interface-minimality discipline, from Report 2's `BlobStore` lesson:** `BlobStore` has exactly 4 methods because it was derived from exactly 4 real call sites, and its doc comment names what it deliberately excludes (HEAD, multipart, presign, tagging). Apply the same rule: **before writing `HarnessAdapter`, enumerate the actual current invocation call sites of the deterministic path** — `handleDrakonExecuteDeterministic` (L4624–4666), `handleDrakonExecuteDeterministicStatus` (L4669–4715), `DeterministicPipelineClient.execute`, `usePipelineExecution.runPipeline` — and admit no method that none of them needs today.

**Two CI checks (both trivially wireable — Report 2 confirmed the repo baseline is clean of `openbot|agui|copilotkit`):**

- **Genericity:** the source text of the `RunRequest` / `RunnerDescriptor` / `HarnessAdapter` declarations must not contain `openbot`, `agui`, `copilotkit`, or `drakonHarnessSpec`.
- **Isolation:** no module outside `packages/harness-runtime` may import from `packages/harness-adapter-*`.

**Workspace registration (N5, Report 2):** every new package — `harness-runtime`, `harness-adapter-deterministic`, `harness-adapter-openbot`, `tenancy` — must be added to `pnpm-workspace.yaml`. Four existing packages (`codegen`, `drakon-ir`, `spec-kit`, `ui`) prove the failure mode: unregistered, unresolvable, silently absent. `cloudflare-worker` *is* registered, so the Worker can consume registered packages.

**Migration cost, per Report 2:** moderate, not invasive. `DeterministicPipelineClient.execute` already does start → `execution_id` → poll internally — it is structurally a `HarnessAdapter`, just untyped. Wrapping `{drakonIr, harnessSpec, breakpoints}` into `taskGraph` + `runnerConfig` requires no state-machine change.

---

## 9. Verifier Integration Design

Everything in this section is **AI-DRAKON's own design**, because §5 established that upstream provides no orchestration vocabulary. Where a design element derives from something real upstream, it is cited; where it does not, it is marked as an AI-DRAKON addition.

### 9.1 Schema

```ts
// ─── AI-DRAKON ADDITION. No upstream equivalent. ───
interface VerificationInput {
  tenantId: string;
  runId: string;
  specId: string;
  specVersion: string;
  trajectory: PersistedRunEvent[];    // read from run_events. NEVER from live memory.
  criteriaSetId: string;              // which hand-authored criteria file. Q owns the set.
  mode: 'post_run' | 'online_prefix';
  prefixThroughSeq?: number;          // online only: highest event seq the verifier saw
}

interface EvidenceRef {               // AI-DRAKON ADDITION
  kind: 'run_event' | 'gate_verdict' | 'blob' | 'node_output';
  runId: string;
  seq?: number;                       // run_events.seq — the citation
  blobKey?: string;                   // packages/storage BlobStore key
  nodeId?: string;
}

interface Uncertainty {               // AI-DRAKON ADDITION. Upstream has NO confidence field.
  nRepeats: number;                   // K — upstream `n_evaluations` [V1]
  meanScore: number;                  // upstream returns only this
  scoreStdDev: number;                // derived from per_rep_scores [V3]
  scoreRange: [number, number];
  unreadableRepeats: number;          // upstream per_rep_scores None entries [V3]
  confidence: number;                 // [0,1], AI-DRAKON formula — see 9.5
  degradedReason?: 'high_variance' | 'unreadable_repeats' | 'insufficient_evidence'
                 | 'prefix_too_short' | 'no_logprobs';
}

interface VerificationCriterionResult {   // AI-DRAKON ADDITION
  criterionId: string;
  score: number;                      // [0,1] — the one thing upstream really returns
  uncertainty: Uncertainty;
  evidenceRefs: EvidenceRef[];        // MUST be non-empty or the result is 'uncertain'
  missingEvidence: string[];
  rationale: string;                  // UNTRUSTED prose. Display only. Never parsed.
}

interface EvaluationTrace {           // AI-DRAKON ADDITION — reproducibility record
  verifierModel: string;
  criteriaSetId: string;
  criteriaSetHash: string;
  promptTemplateHash: string;
  nRepeats: number;
  usedLogprobs: boolean;              // false in MVP [V4 deferred]
  startedAt: string; finishedAt: string;
  inputTokens: number; cachedInputTokens: number; outputTokens: number;
}

type VerifierDecision =               // AI-DRAKON ADDITION — advisory vocabulary
  | 'continue' | 'retry' | 'replan' | 'human_review' | 'stop';

interface VerificationResult {        // AI-DRAKON ADDITION
  tenantId: string; runId: string; specId: string; specVersion: string;
  mode: 'post_run' | 'online_prefix';
  results: VerificationCriterionResult[];
  overallConfidence: number;          // min(), not mean() — see 9.5
  verdict: 'pass' | 'fail' | 'uncertain';
  recommendation: VerifierDecision;   // RECOMMENDATION. Never an authorization.
  authorityDisclaimer: 'advisory_only';   // literal, structural, non-optional
  trace: EvaluationTrace;
  createdAt: string;
}
```

**Naming discipline, from Report 2's contradiction (2):** `VerificationResult` **is not** a `GateVerdict` and must never be assignable to one. The existing "confidence gate" is 100% arithmetic mock (D6, corroborated ×3); a real LLM verifier landing next to a mock called "confidence" is a conflation waiting to happen. **Different type name, different table, different UI affordance, different colour.** The verifier never writes to the gate plane's storage.

### 9.2 Can `TrajectoryVerifier` be added without breaking the deterministic policy boundary?

**Yes, and only under four structural constraints — not four policies. Enforce them in types and CI, or the boundary is decoration.**

1. **Read-only over persisted state.** `VerificationInput.trajectory` is `PersistedRunEvent[]` read from `run_events`. The verifier has no handle to the live execution, no gate object, no dispatch path. This is why **Slice 4.0 (RunSnapshot persistence) + 4.1 (audit/run_events) are hard prerequisites** — there is currently nothing to read (D28: `run_events` does not exist, ADR 0024 is 0% implemented).
2. **No write path into the policy plane.** `packages/policy-engine` must not import the verifier package, and the verifier must not export anything assignable to `GateVerdict`. CI: same isolation check as the adapter registry.
3. **`recommendation` is consumed by a policy-owned reducer, never executed directly.** The verifier emits `VerifierDecision`; a component inside the policy boundary decides what, if anything, that causes. §9.4 gives the reducer.
4. **The verifier can only narrow, never widen.** It may cause a run to stop, pause, or ask for a human. It may never cause a run to proceed that the policy plane blocked, satisfy `require_human_approval`, or add a capability to a grant. Stated as an invariant in §14 (SI-9).

### 9.3 Trusted evidence vs untrusted observation

| Class | Contents | Rule |
|---|---|---|
| **TRUSTED EVIDENCE** | `run_events` rows (append-only, server-written, `seq`-ordered); `GateVerdict`s from `policy-engine`; `BlobStore` objects by key; server-resolved `specId`/`specVersion`; `EvaluationTrace` metadata | May be cited by `EvidenceRef`. May drive automated behavior. Server-authored, tamper-evident by append-only construction. |
| **UNTRUSTED OBSERVATION** | Everything the verifier model emits: `rationale`, any narrative summary, any claim about what the agent "intended"; agent self-reports inside the trajectory | Display only. **Never parsed for control flow.** Never a substitute for an `EvidenceRef`. |

Upstream backs this directly. `criteria/terminal_bench.md:5`, DIRECT_SOURCE, verbatim:

> **IMPORTANT:** Focus on TERMINAL OUTPUT as ground truth. Do NOT trust the agent's self-assessment or claims of success. Agents often claim success when the terminal shows errors.

The framework's own criteria authors independently arrived at the same trusted/untrusted split. **Enforcement rule: a `VerificationCriterionResult` with an empty `evidenceRefs` array is coerced to `verdict: 'uncertain'` regardless of its score.** An unsupported high score is not a pass; it is a hallucination that scored well.

### 9.4 When does the verifier trigger continue / retry / replan / human_review / stop?

The verifier **recommends**. A policy-owned reducer decides. The reducer:

| Recommendation | Verifier emits when | Reducer may do | Reducer must NOT do |
|---|---|---|---|
| `continue` | all criteria ≥ threshold, `overallConfidence` ≥ floor, evidence present | nothing (the run proceeds on the policy plane's own authority) | treat this as an authorization to skip any gate |
| `retry` | ≥1 criterion below threshold, high confidence in the failure, failure is transient-shaped (error signal, truncated output) | trigger **at most one** automatic retry **if and only if** every gate on the retry path is `GateTrust: 'enforcing'` and retry budget remains | auto-retry behind a `simulated` gate (Adjustment B); retry more than the spec's budget |
| `replan` | ≥1 criterion below threshold with high confidence, failure is structural (specification adherence failed) | surface to the UI as a suggestion; write an audit entry | mutate the task graph autonomously |
| `human_review` | `overallConfidence` below floor; OR high inter-repeat variance; OR `missingEvidence` non-empty; OR criteria disagree sharply | pause the run, emit an approval-required `RunSnapshot`, notify | resolve itself by waiting or timing out into `continue` |
| `stop` | a safety-adjacent criterion fails with high confidence | halt the run; write audit | delete or roll back anything (that is a separate, human-authorized action) |

**Two hard rules over that table.**

- **`human_review` is a floor, not a ceiling.** If `spec.gates.safety.require_human_approval` names this operation, human approval is required *whatever* the verifier says — including `continue` with confidence 1.0. The PEP (§7) owns that; the verifier cannot discharge it. This is the direct application of the invariant that D9 shows is currently unimplemented.
- **`retry` is the only recommendation that may cause an automatic side effect, and only behind enforcing gates.** Everything else is advisory-to-a-human. This keeps the "verifier-driven side effects cannot precede persisted trace + human approval enforcement + deterministic policy boundary + explicit uncertainty handling" constraint structurally true rather than aspirational.

### 9.5 Bounding hallucination and score instability — the real gap

**The gap, stated plainly:** upstream emits **no confidence or uncertainty field at all.** Report 3 confirmed it in code and in the paper: uncertainty is implicit in the [0,1] score, and adaptive-compute-via-uncertainty is listed in arxiv Appendix A as *proposed future work, not implemented*. If AI-DRAKON takes the library at face value, it gets a number with no error bar and no way to distinguish "0.62, all four repeats agreed" from "0.62, repeats were 0.95/0.10/0.92/0.51." Those are opposite situations.

**AI-DRAKON must build its own. Five mechanisms, four of them grounded in something upstream actually has.**

**M1 — Dispersion-derived confidence (the primary mechanism).** Grounded in V3: `ProgressResult.per_rep_scores` already returns the raw K curves, with `None` where a repeat produced no readable score (DIRECT_SOURCE `progress.py:54-56`). Upstream computes the mean and discards the spread. **AI-DRAKON keeps the spread.**

```
confidence = clamp01( (1 - 2*stdDev(per_rep_scores)) * (readableRepeats / K) )
```

Both factors are load-bearing. Wide disagreement across repeats → low confidence. Unreadable repeats (the model failed to emit a parseable score) → proportional penalty. `K ≥ 4`, matching upstream's `select` default. **`K = 1` is forbidden** — it makes `stdDev` undefined and the confidence field meaningless, and it is the configuration most likely to be chosen for cost reasons. Enforce `K >= 4` at the type boundary and reject `n_evaluations: 1` at runtime.

**M2 — Evidence-grounding requirement.** From §9.3: empty `evidenceRefs` → coerced to `uncertain`. This is the single strongest anti-hallucination lever available, because it is structural. A model that scores confidently without citing a `run_events.seq` is producing exactly the pattern `criteria/terminal_bench.md:5` warns about.

**M3 — `overallConfidence = min(criterion confidences)`, not mean.** Averaging hides one collapsed criterion behind four solid ones. The weakest criterion governs. Cheap, and it fails in the safe direction.

**M4 — Deterministic replay via `EvaluationTrace`.** Record model, criteria-set hash, prompt-template hash, K, and whether logprobs were used. A verdict that cannot be reproduced cannot be audited, and an unauditable advisory system will eventually be trusted as an authority by accident.

**M5 — Confidence floor is a spec field, per-tenant, not a constant.** Below the floor, `human_review` is mandatory. Making it a spec field means tightening it is a config change, not a deploy — which matters given the deploy situation in §12.

**Explicitly deferred: V4, the logprob-based fine-grained reward.** `top_logprobs=20` over a 20-letter A–T score-token distribution (DIRECT_SOURCE `fine_grained_reward.py:403-466`) is the paper's headline mechanism and it produces genuinely better-calibrated scores. It also **excludes any model provider that does not expose logprobs** — which the paper itself flags as limitation #1 in Appendix A. Taking that dependency in an MVP would couple AI-DRAKON's verifier to a provider choice before anyone has decided one. **M1 gives a usable confidence signal with no logprob dependency.** Revisit V4 after the MVP, with Oracle, as a calibration upgrade — and note that M1 and V4 compose: dispersion across repeats and within-repeat token distribution are different signals.

### 9.6 Can it run online mid-run?

**Yes — and this is not speculative.** DIRECT_SOURCE `llm_verifier/progress.py:313-409`: `ProgressTracker` scores a run **step-by-step as it happens**, seeing only the prefix so far, using a prompt explicitly written never to reveal whether the trajectory eventually succeeded. Its stated purpose is to "stop hopeless rollouts early." The class docstring shows the intended construction (`progress.py:326`):

```python
tracker = llm_verifier.ProgressTracker(problem, n_evaluations=4)
```

Note `n_evaluations=4` in the framework's own example — the K≥4 discipline of M1 matches upstream's own documented usage.

**But online mode is sequenced second, not first, for four reasons:**

1. It needs `run_events` to be streaming-readable, which needs 4.0 and 4.1 to have landed.
2. Prefix-only scoring is *noisier by construction* — early prefixes carry little signal, which means `prefix_too_short` degradation must exist and be respected before it can drive anything.
3. Cost. §5 gives the shape: one example upstream run was 4,320 verifier calls / 272.5M input tokens, and prefix-caching moved the hit rate 5.2% → 78.4%. An online tracker re-scores a growing prefix at every checkpoint — the pathological case. **Prefix-caching is a precondition for online mode, not an optimization.**
4. The MVP's value is mostly captured post-run. Online mode's marginal value is early termination, which only pays once runs are long and expensive enough to be worth killing — a condition nobody has measured yet for AI-DRAKON.

### 9.7 Minimal post-run MVP

**Slice 4.2. Six things, no more:**

1. Read a completed run's `run_events` from D1 by `(tenantId, runId)`.
2. **Host the actual `llm_verifier` library in a Python Appwrite Function** — see §9.9. The Worker invokes it with the same POST-execution / GET-status pattern it already uses four times over.
3. Score against **one** hand-authored criteria file (`criteria/ai-drakon-deterministic.md`, AI-DRAKON-authored, modelled on upstream `criteria/TEMPLATE.md`), K = 4, **no logprobs**, **N = 1** (no Best-of-N, no tournament — see §9.9's timeout budget).
4. Emit `VerificationResult` with M1 confidence, M2 evidence-grounding, M3 min-aggregation.
5. Persist it to its own table, keyed `(tenantId, runId, verifierVersion)`. **Never** into a gate table.
6. Render it in the UI evidence drawer as **advisory**, visually distinct from gate verdicts, `authorityDisclaimer` shown, not inferred.

**Zero automated side effects in the MVP.** No retry, no replan, no stop. The MVP's only job is to demonstrate that the scores are worth acting on **before** anything acts on them. Side effects arrive at 4.3, gated on evidence from 4.2 that the confidence signal is calibrated.

**Scoped to post-run only, and now for two independent reasons.** The first was epistemic (§9.6: online prefix scoring is noisier, and its value — early termination — is unmeasured). The second is now infrastructural: an Appwrite Function's execution model fits an invoke-once-per-completed-run workload and fits online per-checkpoint scoring badly (§9.9). **Two independent arguments converging on the same MVP boundary is the strongest form this decision has had.**

### 9.8 Hosting: Python Appwrite Function — recommended, with an explicit timeout ceiling

Q has raised a concrete hosting answer, and it is the right one. **Recommendation: host the `llm_verifier` library in a Python Appwrite Function, invoked by the Worker.** Not as a hypothetical — as the default for Slice 4.2 unless the sizing work in this section says otherwise.

**Why it is the right fit — four grounded reasons, not one:**

| # | Reason | Evidence |
|---|---|---|
| H1 | **The pattern already exists and is proven in this codebase.** The Worker invokes Appwrite Functions via `POST https://auth.aidrakon.tech/v1/functions/{functionId}/executions` then polls `GET .../executions/{executionId}` — at **four** distinct call-site pairs: L3634/L3673, L3756/L3795, L3886/L3925, and L4645/L4684 (the deterministic engine's own pair). | DIRECT_SOURCE, `cloudflare-worker/worker-mcp-drakon.js`, verified this pass |
| H2 | **Four existing instances clears the abstraction threshold.** The project's own rule is three real examples before extracting. A fifth consumer of an already-fivefold pattern is the *cheapest possible* new execution target — it adds no deployment surface, no new ops runbook, no new auth path, no new network boundary. | INFERENCE from H1 |
| H3 | **`llm_verifier` is a Python library and Appwrite Functions have a Python runtime.** Report 3 established the framework is pure Python (`llm_verifier/`, `pyproject.toml`, `requirements.txt`). Every alternative — a standalone service on `.184`, a container, a Worker-side reimplementation — either adds an ops surface or requires reimplementing the library in TypeScript. Reimplementation is the worst option: it would fork the scoring semantics from upstream on day one. | DIRECT_SOURCE (repo layout) + coordinator input |
| H4 | **`.184` capacity is already a standing constraint.** A standalone Python verifier service would land on the machine already flagged "no parallel heavy processes" and already contested by a possible OpenBot host (U7/Q-10). Appwrite Functions move that load off `.184` entirely. | MEMORY_CONTEXT `feedback_server_resources` + U7 |

**The real risk, stated precisely: execution-time limits, tighter on the Education plan.**

This is not a hypothetical constraint for this codebase — **the deterministic engine already carries scar tissue from Appwrite Education-plan limits.** DIRECT_SOURCE, `services/deterministic-engine/src/main.ts` L6–7, verbatim header comment:

```
// the Education plan. We emit the result as a single base64 log line:
//   DETERMINISTIC_ENGINE_RESULT:<base64>
```

The engine cannot return its result through the normal response channel on this plan and smuggles it out through a base64-encoded log line instead (`Buffer.from(JSON.stringify(response)).toString("base64")`, L323). It also carries a hard `maxLoops = 200` safety bound (L109). **A Python verifier function will inherit both problems — a constrained result channel and a hard wall-clock ceiling — and must be designed for them from the first line, not patched afterwards.**

**Why this specifically threatens the verifier and not the engine:** the engine's work is local computation over an IR. The verifier's work is **K sequential-or-parallel LLM round-trips per criterion**, and if Best-of-N is enabled, the Probabilistic Pivot Tournament adds O(N·k) *pairwise* comparisons on top (DIRECT_SOURCE `llm_verifier/pivot_tournament.py`; `select(..., n_evaluations=4)` default at `__init__.py:123`). Concretely: Best-of-5 with K=4 is not four LLM calls, it is on the order of **dozens** of round-trips, each bounded by provider latency rather than by anything AI-DRAKON controls. That is the shape that blows a function timeout.

**Sizing discipline for the MVP — four hard bounds, all of them cheap:**

| Bound | MVP value | Why |
|---|---|---|
| **B1 — N (candidates)** | **N = 1.** No Best-of-N. No tournament. | Removes the O(N·k) pairwise term entirely. Best-of-N is only meaningful once multiple candidate runs exist per task, which is a registry-era capability anyway (V5, §5). |
| **B2 — K (repeats)** | **K = 4**, the upstream `select` default and the value in `ProgressTracker`'s own docstring example. | K=4 is the floor for M1's dispersion confidence to mean anything; §9.5 forbids K=1. Run the four repeats **in parallel** — upstream already does this (`ThreadPoolExecutor(max_workers=min(max_workers, n_evaluations))`, DIRECT_SOURCE `progress.py:304`), so wall-clock is ~one round-trip, not four. |
| **B3 — criteria count** | **3**, matching every upstream criteria file (`swe_bench`, `terminal_bench`, `medagentbench` each have exactly three). | Total LLM calls = 3 criteria × 4 repeats = **12, fully parallelizable to ~1 round-trip of wall-clock.** That fits comfortably inside any plausible function timeout. |
| **B4 — trajectory size cap** | Cap `run_events` passed per invocation; truncate-with-marker beyond it. | Input token volume drives both latency and cost. Upstream's reference run used 272.5M input tokens (78.8% cached); an unbounded trajectory is an unbounded prompt. |

**With B1–B4 the MVP is 12 parallel LLM calls per completed run.** That is a defensible fit for a synchronous Appwrite Function. **Without B1 it is not** — and B1 is the bound most likely to be quietly relaxed by whoever ships Best-of-N later, so it should be enforced in the function's own input validation, not merely documented.

**Three engineering consequences that must land in the design, not the backlog:**

1. **Reuse the base64-log result channel from day one.** The deterministic engine already proves the normal response path is unreliable on this plan. A `TRAJECTORY_VERIFIER_RESULT:<base64>` log line, mirroring `DETERMINISTIC_ENGINE_RESULT:`, costs nothing and avoids rediscovering the same limitation. Reuse the Worker's existing log-parsing helper rather than writing a second one.
2. **Design for chunked/async invocation as the escape hatch, even if the MVP does not use it.** If B1–B4 turn out to be too generous against the real Education-plan ceiling, the fallback is one function invocation *per criterion* (3 small invocations instead of 1 medium one), aggregated Worker-side. Structure the function's input so that split is a parameter change, not a rewrite.
3. **Measure the actual ceiling before committing.** The Education-plan function timeout is **UNKNOWN** to this report — it was not verified, and it cannot be verified from the repo (there is no `appwrite.json` anywhere in the tree; function configuration lives outside version control — itself a finding, see X-10). **A single timed dry-run invocation of a trivial Python function on this account settles it, and that measurement should precede any 4.2 implementation.**

**Why this makes online mode (4.3) a worse fit, decisively.** `ProgressTracker` scores at *every checkpoint* of a run, on a *growing prefix*, and its value is *low-latency early termination* (DIRECT_SOURCE `progress.py:313-409`). Against an Appwrite Function that means: many invocations per run instead of one, each with function cold-start and invoke/poll overhead in the loop, each re-sending a longer prefix, and the whole point — killing a bad run early — undermined by the latency of the mechanism doing the killing. **This is an infrastructure argument for the same MVP boundary §9.6 reached on epistemic grounds.** If online tracking is eventually wanted, it likely needs a *different* execution model (a persistent worker, or Worker-side invocation with aggressive prefix-caching), and that is a Slice 4.3 design question for Oracle — not something to force into the 4.2 hosting decision.

**What Q still owns here:** the hosting recommendation is mine to make and I am making it. But the function's identity, deployment, and secret configuration (which model provider, which API key, where the function config lives given there is no `appwrite.json`) are deployment decisions on the not-allowed list — **Q-17, §16.**

### 9.9 Deferred until after Oracle returns

| Item | Why it needs Oracle |
|---|---|
| Which criteria set AI-DRAKON adopts | Product decision with long-lived consequences; upstream offers no universal set (§5). Q + Oracle. |
| V4 logprob fine-grained reward | Couples the platform to a provider capability. Needs a model-provider decision first. |
| **Best-of-N / Probabilistic Pivot Tournament (V5)** | Only meaningful once multiple candidate runs exist per task — a runner-registry-era capability. **And now also the single bound (B1) that keeps the MVP inside an Appwrite Function's execution window (§9.8). Re-enabling it is a hosting decision, not just a feature decision.** |
| **A different execution model for online tracking** | §9.8: `ProgressTracker`'s many-small-invocations pattern fits Appwrite Functions badly. If online mode is wanted, it likely needs a persistent worker or Worker-side invocation with aggressive prefix-caching. Oracle designs this at 4.3. |
| Calibration study: does M1's dispersion confidence actually predict correctness on AI-DRAKON runs? | Needs real run data from 4.2 plus analysis capacity. **This is the study that decides whether 4.3 is safe to build.** |
| Whether verifier scores transfer to browser-agent trajectories (OpenBot's domain) | UNKNOWN — no browser benchmark exists upstream (§5). Genuinely open research. |

---

## 10. Updated Slice Sequence

**Two ordering laws, restated and now structurally justified:**

- **The OpenBot slice cannot precede** trusted tenant identity (3.3) + server-resident spec (3.4) + generic runner contract (3.5) + scoped grant + replayable run identity. A grant issued before tenancy is a bearer token with no tenant, no policy derivation, and no revocation trail.
- **Verifier-driven side effects cannot precede** persisted trace (4.0/4.1) + human-approval enforcement (3.4 PEP) + a deterministic policy boundary (3.2/3.3) + explicit uncertainty handling (4.2).

**Changes to the operator's candidate sequence — three, each forced by evidence:**

1. **3.6 is filled, not renumbered.** The candidate list left 3.6 unlabelled with OpenBot at 3.7. N1 supplies the missing slice: **3.6 = WebSocket / Durable-Object authentication and tenant binding.** It must land before or with 3.0c, because 3.0c's config fix would bind `DIAGRAM_SYNC` and activate a second unauthenticated surface (N2).
2. **Tenant-filtered MCP moves from 4.4 to a hard prerequisite of 3.7.** The candidate sequence puts tenant-MCP at 4.4, *after* OpenBot at 3.7. But OpenBot registers its tools via `/admin/plugins` pointing at `POST /mcp` — which today grants all 24 tools to any authenticated user (D13) and cannot express a tenant. Shipping 3.7 before the MCP surface is tenant-filtered means shipping an external runner onto a surface that cannot scope it. **Flagged as a contradiction (§15 X-7), with a recommendation, not a unilateral reorder.**
3. **4.0 precedes 4.1.** Adopted from the candidate list, and correct: `RunSnapshot` is the shape; `run_events` is the storage. Shape first.

**Sequence:**

```
3.0c ─┬─► 3.1 ──► 3.2 ──► 3.3 ──► 3.4 ──► 3.5 ──► [4.4 tenant-MCP] ──► 3.7 ──► 4.0 ──► 4.1 ──► 4.2 ──► 4.3 ──► 4.5
      └─► 3.6 (must not lag 3.0c — see N2)
```

---

### Slice 3.0c — Deployment and credential custody. **BLOCKING. Non-code.**

| | |
|---|---|
| **Objective** | Close stop condition 1: one canonical Worker config, one canonical checkout, credentials rotated, a working CF token. |
| **Prerequisite** | Q's decisions only (§16 Q-1 … Q-7). |
| **Exact files** | None modified by an agent. Q chooses which of the three `drakon-antigravity-worker` configs survives; the other two are renamed `*.disabled`. Root `wrangler.toml` (`drakon-setup-hub`, a Pages config — R-5) is **out of scope and untouched**. |
| **Must not touch** | All source. Root `wrangler.toml`. `/home/vokov/workspace/ai-drakon-scaffolder` (the *other* checkout, carries real `.env` secrets — read-only until Q-3 resolves). |
| **Tests** | `npx wrangler deploy --config <chosen> --dry-run --outdir /tmp/dryrun`; then live `GET /workers/scripts/drakon-antigravity-worker/settings` diffed against the chosen config. |
| **Security invariant** | Exactly one deployable config per Worker **name** (not per repo — R-5). Chosen config must be a **superset** of live bindings; none of the three is today (D29 + L1). |
| **Rollback** | Config rename: trivial. **Credential rotation is irreversible** and will break any consumer of the old MinIO key or `drakon-mcp-2026` — possibly including whatever sends `drakon-mcp-worker` 84 req/24h (U4/L6). **Identify that caller first.** |
| **Deployment impact** | This *is* the deployment slice. First Worker deploy in ~52 days. Will ship today's committed-but-undeployed security fixes and storage wiring to the live edge. **⚠ It will also bind `DIAGRAM_SYNC` and activate an unauthenticated WebSocket surface (N2) unless 3.6 lands with it.** |
| **Quota impact** | Negligible compute. Requires a working CF API token — both tokens tried last round returned `{"code":10000,"message":"Authentication error"}`. |
| **Agent** | **Q only.** No agent may choose a config or rotate a credential. |
| **Oracle dependency** | None. |
| **Implement before the 25th?** | **NO** — this is deployment + credential rotation, on the explicit not-allowed list. Requires separate explicit approval regardless of date. |

---

### Slice 3.1 — Route-contract characterization harness

| | |
|---|---|
| **Objective** | Close stop condition 2. A `fetch()`-level test recording, for every route condition: method, path, and status under {no auth, `MCP_API_KEY`, `role:'user'`, `role:'owner'`}. **Characterization — preserves current behavior including the bugs.** |
| **Prerequisite** | None. Can start immediately. |
| **Exact files** | Create `cloudflare-worker/__tests__/route-contract.test.ts`, `cloudflare-worker/__tests__/helpers/mock-env.ts`, `docs/contracts/worker-route-auth-matrix.md`. **No source file touched.** |
| **Must not touch** | Every source file. `services/deterministic-engine/src/__tests__/main.characterization.test.ts`. |
| **Tests** | This slice *is* tests. Must assert, as intentional current-state rows: `POST /mcp` accepts `role:'user'` (D13); `OWNER_EMAILS` unset fails open (D15); Appwrite `owner` **label** grants owner (**N3 — new, not in the plan**); `/v1/notes/commit|delete|build-semantic-graph` accept `role:'user'` (R-2, N6 — **corrects D14**); `/ws/room/*` and `/v1/diagram/*/sync` accept **no auth at all** (**N1 — new**); `/v1/github/*` and `/v1/compiler/n8n*` require owner (R-3). |
| **Security invariant** | A route without a matrix row does not merge. |
| **Rollback** | Delete three new files. |
| **Deployment impact** | None. Test-only. |
| **Quota impact** | Low. `pnpm test` on `.184` — one process, not parallel with anything heavy. |
| **Agent** | agy .30 (already has the route inventory in working memory) or agy .234. |
| **Oracle dependency** | None. |
| **Implement before the 25th?** | **YES** — test design and authoring are on the allowed list. Recommended as the first thing to build. |

---

### Slice 3.2 — Replace the positional gate with a declarative `ROUTE_AUTH` table

| | |
|---|---|
| **Objective** | Fix I2, the systemic cause: authorization is currently a side effect of source-line order (D12, re-confirmed this round). |
| **Prerequisite** | 3.1 green. Non-negotiable — refactoring a 4,811-line if/else chain with zero route tests is R8. |
| **Exact files** | Modify `cloudflare-worker/worker-mcp-drakon.js`, dispatcher region ~L2640–2860 **plus L2641/L2653** (the pre-try WS short-circuits must be brought under the table — N1). Update `route-contract.test.ts` with the intentional diffs. |
| **Must not touch** | Any handler body. Any other package. |
| **Tests** | Every non-flagged 3.1 row byte-identical. Flagged intentional diffs: `POST /mcp` → `role:'owner'`; `OWNER_EMAILS` unset → **deny + loud log** (removes the fail-open, D15); `/v1/notes/commit|delete|build-semantic-graph` → `role:'owner'` (R-2/N6); Appwrite `owner` **label** path made explicit and testable (N3). |
| **Security invariant** | **Authorization never depends on source-line position.** No route reachable before the auth table is consulted. |
| **Rollback** | `git revert`. Single commit, no schema, no config. |
| **Deployment impact** | Requires a deploy to take effect. Until 3.0c, this is source-only improvement — **the live edge keeps the old behavior.** |
| **Quota impact** | Low. |
| **Agent** | agy .30 (owns the route inventory) with agy .234 reviewing against the 3.1 matrix. |
| **Oracle dependency** | None. |
| **Implement before the 25th?** | **Design and test-authoring yes. Source modification — no**, per §12: this edits a live-serving file with security semantics. Needs explicit approval. |

---

### Slice 3.3 — D1 binding + `resolveTenant` + tenant-scoped repositories

| | |
|---|---|
| **Objective** | ADR 0025. Real tenant identity. Retire all five owner-granting paths (D35/N3) in favour of resolved tenancy. |
| **Prerequisite** | 3.0c (config + D1 target confirmed), 3.2 (declarative auth table to migrate). |
| **Exact files** | Create `packages/tenancy/{package.json,src/index.ts,src/repositories.ts,src/__tests__/}`. Modify `pnpm-workspace.yaml` (add `packages/tenancy`; decide the fate of the four unregistered scaffolds — D4/N5), `worker-mcp-drakon.js` (**13** sites — D11, corroborated ×3; ADR 0025 and §4.8 both say 12 and must be amended), the chosen wrangler config. Apply `infrastructure/d1/schema.sql`. |
| **Must not touch** | `packages/storage/**` (shipped, frozen). `packages/drakon-ir`, `src/lib/htse/ir-validator-core.ts`. ADRs 0001–0025 (amend only via a new ADR with `supersedes`). |
| **Tests** | Per ADR 0025 §4: **every route needs a test proving tenant A cannot read tenant B's data — a route without that test does not merge.** Plus a full 3.1 matrix re-run. |
| **Security invariant** | An unscoped tenant query is **unrepresentable in the type system** (ADR 0025 §3 — by construction, not by discipline). No global owner. |
| **Rollback** | Code reverts. **The D1 schema apply is a one-way door** — currently `CREATE TABLE IF NOT EXISTS` into an empty DB (L5: 0 tables), so re-runnable, but that window closes on the first write. |
| **Deployment impact** | Config change + first real D1 use. Highest-risk deploy in the plan. |
| **Quota impact** | Medium. D1 operations, schema apply. |
| **Agent** | agy .234 (contract discipline) for `packages/tenancy`; agy .30 for the 13 Worker call sites; **Oracle review before merge.** |
| **Oracle dependency** | **Yes — recommended.** ADR 0025 calls this the highest-risk change in the whole migration. |
| **Implement before the 25th?** | **NO.** Blocked on 3.0c *and* on the schema one-way door *and* Oracle review is genuinely wanted here. |

---

### Slice 3.4 — Server-resident spec resolution + human-approval PEP

| | |
|---|---|
| **Objective** | ADR 0020 — the defect is live (D18/D20/D21/D22, corroborated ×2–×4). **Plus Adjustment C:** give `require_human_approval` an owner. It has been declared and unread since 2026-06-30 (D9/C9). |
| **Prerequisite** | 3.3 (tenant identity — a spec cannot be resolved without a tenant). |
| **Exact files** | Modify `worker-mcp-drakon.js` (`handleDrakonExecuteDeterministic` L4624–4666; add the PEP check pre-dispatch), `services/deterministic-engine/src/main.ts` (L89–96 — stop reading `harness_spec` from the payload), `src/hooks/usePipelineExecution.ts` (L70 — stop calling `createDefaultSpec`), `src/lib/harness/pipeline-client.ts` (L41–43 — send `specId`). Create `infrastructure/d1/migrations/00X-*.sql` **only if Q chooses `spec_id`** (Q-5). |
| **Must not touch** | `services/deterministic-engine/src/__tests__/main.characterization.test.ts` — **the only behavior-preservation oracle that exists.** Changing it destroys the proof. |
| **Tests** | The characterization test must still pass unmodified. New: resolve-by-id; reject body-supplied spec; dual-accept deprecation warning; **PEP blocks dispatch when `require_human_approval` matches** (first test of that field in the project's history). |
| **Security invariant** | Server-side spec resolution by id/version. No client policy authority. **Human approval enforced at the PEP, on every path.** |
| **Rollback** | Dual-accept behind a feature flag so the reject-with-400 step is a one-line revert. |
| **Deployment impact** | Worker + Appwrite Function + frontend all change together. Coordinated deploy. |
| **Quota impact** | Medium. |
| **Agent** | agy .234 (engine + contract), agy .30 (Worker + frontend). |
| **Oracle dependency** | **Yes for the PEP design** — Adjustment C is a real architectural change (relocating an invariant's enforcement point), and it is exactly the kind of decision Oracle exists for. |
| **Implement before the 25th?** | **NO.** Blocked on 3.3, on Q-5 (the `spec_id` schema contradiction), and Oracle-wanted for the PEP. |

---

### Slice 3.5 — Generic runner registry. **No OpenBot code.**

| | |
|---|---|
| **Objective** | The genericity gate. Land the §8 contracts plus **two** independent implementations — `deterministic` and `byo-http` — before any third exists. Two implementers is what proves the seam is a seam and not an OpenBot-shaped hole. |
| **Prerequisite** | 3.4 (server-resident specs — the registry must dispatch a `RunRequest` whose `specId` means something). |
| **Exact files** | Modify `packages/harness-contract/src/index.ts` — **additive only**: `RunRequest<TConfig>`, `RunnerDescriptor`, `HarnessAdapter<TConfig>`, `RunSnapshot`, `ApprovalDecision`, `GrantHandle`, `KnowledgeHandle`, `GateTrust`. Create `packages/harness-runtime/` (registry + descriptor validation), `packages/harness-adapter-deterministic/`, `packages/harness-adapter-byo-http/`. Modify `pnpm-workspace.yaml` (N5 — four unregistered packages prove what happens otherwise). |
| **Must not touch** | `DrakonHarnessSpec` (frozen — Report 2, §8). `execution_mode`'s union (R-6). `packages/policy-engine`. `packages/storage`. |
| **Tests** | A shared `harnessAdapterContractTests(adapterFactory)` suite (Report 2's proposal) run against **both** adapters. `harness-contract.test.ts` type-surface scan. `adapter-registry.test.ts` cross-import isolation. CI genericity check (no `openbot|agui|copilotkit|drakonHarnessSpec` in the neutral types) — baseline confirmed clean by Report 2. **The deterministic adapter must reproduce `main.characterization.test.ts` byte-for-byte.** |
| **Security invariant** | Every execution is tenant-bound and run-bound. No runner-specific field in the neutral contract. Only the registry may import an adapter. |
| **Rollback** | `git revert`. Nothing consumes the registry yet. |
| **Deployment impact** | None until something dispatches through it. |
| **Quota impact** | Low. |
| **Agent** | **agy .234** — it did the contract/genericity audit and holds the `BlobStore`-minimality discipline. |
| **Oracle dependency** | Optional. Worth an Oracle review of the contract surface before it becomes load-bearing, since it is hard to change later. |
| **Implement before the 25th?** | **Design and test-design yes. Package creation — recommend waiting**, because the package-naming contradiction (Q-6, ADR 0022 `harness-adapters` vs shipped `harness-contract`) must resolve first or the names get baked in wrong. |

---

### Slice 3.6 — WebSocket / Durable-Object authentication and tenant binding **(NEW — forced by N1)**

| | |
|---|---|
| **Objective** | Close the unauthenticated DO surface. `/ws/room/*` and `/v1/diagram/*/sync` must resolve a tenant and verify membership **before** reaching a DO stub. |
| **Prerequisite** | 3.1 (a characterization row proving today's no-auth behavior). Ideally 3.3 for real tenancy — but an interim auth check must not wait for it if 3.0c ships first. |
| **Exact files** | Modify `worker-mcp-drakon.js` L2641–2663 (move both short-circuits **inside** the auth path); optionally `RoomDO.fetch` L4730 and `DiagramSyncDO.fetch` L4779 (defence in depth: the DO should also refuse an unauthenticated upgrade, not rely solely on the Worker). Update the chosen wrangler config only if `DIAGRAM_SYNC` binding changes. |
| **Must not touch** | The WebSocket session/broadcast logic itself — this slice adds a gate, it does not touch collaboration semantics (Chesterton's fence: nobody has yet explained why these were placed pre-auth). |
| **Tests** | Extend `route-contract.test.ts`: unauthenticated upgrade → 401 (not 426, not 101); authenticated non-member → 403; member → 101. Test both DOs. |
| **Security invariant** | **No Durable Object is reachable without tenant resolution and membership.** Room and diagram ids are `idFromName(pathSegment)` — guessable by construction, so identifier secrecy is not a control. |
| **Rollback** | `git revert`. But note: reverting **re-opens a live hole**. |
| **Deployment impact** | Must deploy. **Coupled to 3.0c:** whichever config Q picks, if it binds `DIAGRAM_SYNC`, that surface goes live at the same moment. **3.6 must not lag 3.0c.** |
| **Quota impact** | Low. |
| **Agent** | agy .30 (Worker surgery). |
| **Oracle dependency** | None — this is a straightforward missing-gate fix. |
| **Implement before the 25th?** | **Design and tests yes. The source fix — Q should decide urgency**, because this is a live unauthenticated surface and the normal "wait for Oracle" posture may be the wrong trade here. **Surfaced as Q-12.** |

---

### Slice 4.4 (pulled forward) — Tenant-filtered MCP surface

| | |
|---|---|
| **Objective** | ADR 0019. `tools/list` returns only what the tenant's resolved spec grants; `tools/call` re-checks and writes an audit entry. |
| **Prerequisite** | 3.3 (tenant), 3.4 (resolved spec → grant derivation). |
| **Exact files** | `worker-mcp-drakon.js` — the `POST /mcp` handler (L2697+) and `handleMcp`. |
| **Must not touch** | The 24 tool implementations themselves. This slice filters; it does not change tools. |
| **Tests** | Tenant A's `tools/list` omits tenant B's tools. `tools/call` on an ungranted tool → 403 + audit row. Full 3.1 matrix re-run. |
| **Security invariant** | The MCP surface can express a tenant. No tool reachable outside a resolved grant. |
| **Rollback** | `git revert`. |
| **Deployment impact** | Deploy required. |
| **Quota impact** | Low. |
| **Agent** | agy .30. |
| **Oracle dependency** | Optional. |
| **Implement before the 25th?** | **NO** — blocked on 3.3/3.4. |
| **Ordering note** | **Pulled forward from the candidate list's position 4.4 to sit before 3.7.** OpenBot's `/admin/plugins` registration targets this surface (I4). Shipping OpenBot first means registering an external runner against a surface that cannot scope it. **§15 X-7 — Q's call, not mine.** |

---

### Slice 3.7 — `OpenBotHarnessAdapter`. Third implementation.

| | |
|---|---|
| **Objective** | Introduce OpenBot as `runnerId = "openbot"` — a **consumer** of the registry, never a reordering of it. |
| **Prerequisite** | 3.3 + 3.4 + 3.5 + 4.4 (per the ordering note above), and a capacity plan for wherever OpenBot runs. |
| **Exact files** | Create `packages/harness-adapter-openbot/{src/index.ts,src/grant.ts,src/agui-normalize.ts,src/__tests__/}`, `infrastructure/openbot/{docker-compose.yml,agents.yaml,cel/}`, `docs/adr/0026-openbot-as-first-external-runner.md`. Modify `pnpm-workspace.yaml`. |
| **Must not touch** | Any neutral contract type. Any other adapter. `packages/policy-engine`. |
| **Tests** | **N tool calls → N distinct `message_id`s** (the ag-ui#1037 regression: emit `TEXT_MESSAGE_END`, mint a fresh UUID `message_id`, emit `TEXT_MESSAGE_START` before every `TOOL_CALL_START`). Grant-issuance test asserting no credential appears in any `RunRequest` field, prompt, or emitted event. The 3.5 genericity CI check must still pass. |
| **Security invariant** | Every tool call has a unique event/message identity. No credential in prompt, browser, or transcript. **No direct browser → OpenBot control path bypassing the Gateway.** Grants are short-TTL, capability-scoped, per-run, server-issued. |
| **Rollback** | The registry makes this removable without touching any other runner — that is the seam's entire purpose. |
| **Deployment impact** | New infrastructure. Container hosting decision required (Q-10). |
| **Quota impact** | **High and unresolved.** If `.184` hosts it, that machine is already flagged "no parallel heavy processes" (MEMORY_CONTEXT `feedback_server_resources`) and gVisor (`COMPUTER_RUNTIME=runsc`) adds overhead. **No capacity plan exists** (U7). |
| **Agent** | agy .234 (adapter + contract conformance), agy .30 (infrastructure overlay). **Oracle for ADR 0026.** |
| **Oracle dependency** | **Yes** — a new ADR introducing an external runner is exactly Oracle's remit. |
| **Implement before the 25th?** | **NO.** Four prerequisite slices, an unwritten ADR, an unmade hosting decision, and no capacity plan. |

---

### Slice 4.0 — `RunSnapshot` + evidence shape

| | |
|---|---|
| **Objective** | Define the canonical run-observation record every adapter emits and every consumer reads. **The prerequisite for all verifier work.** |
| **Prerequisite** | 3.5 (the registry defines who produces snapshots). |
| **Exact files** | `packages/harness-contract/src/index.ts` (additive: `RunSnapshot`, `PersistedRunEvent`, `EvidenceRef`); both adapters emit it. |
| **Must not touch** | `DrakonHarnessSpec`. `GateVerdict`'s shape (add `trust: GateTrust`, do not restructure). |
| **Tests** | Both adapters produce schema-valid snapshots. Deterministic adapter's snapshot sequence matches the characterization test's event list. |
| **Security invariant** | A snapshot carries `tenantId` + `runId` or it is invalid. No credential field, ever — enforce with a field-name denylist test. |
| **Rollback** | `git revert`. |
| **Deployment impact** | None standalone. |
| **Quota impact** | Low. |
| **Agent** | agy .234. |
| **Oracle dependency** | Optional. |
| **Implement before the 25th?** | **Design yes** (pure schema work, on the allowed list). Code — after 3.5. |

---

### Slice 4.1 — `run_events` + audit log

| | |
|---|---|
| **Objective** | ADR 0024, currently **0% implemented** (D28). Append-only D1 `run_events(run_id, tenant_id, seq, ...)`; first writer to the Appwrite `audit_log` collection. |
| **Prerequisite** | 3.3 (tenant), 4.0 (snapshot shape). |
| **Exact files** | `infrastructure/d1/migrations/00X-run-events.sql`; a repository in `packages/tenancy`; Worker write path. |
| **Must not touch** | Existing D1 tables. |
| **Tests** | Append-only enforced (no UPDATE/DELETE path exists). Tenant-scoped reads. Seq monotonic per run. Retention policy present. |
| **Security invariant** | Audit is append-only and tenant-scoped. **Retention policy defined from day one, not retrofitted** — ADR 0024's own stated negative. |
| **Rollback** | **Schema is a one-way door once written to.** |
| **Deployment impact** | D1 migration. |
| **Quota impact** | Medium-growing. D1 row volume scales with run count × events. Retention is a cost control, not just a compliance control. |
| **Agent** | agy .234. |
| **Oracle dependency** | **Yes for the retention policy** — a durability + cost + compliance trade. |
| **Implement before the 25th?** | **NO** — D1 production migration is explicitly on the not-allowed list. |

---

### Slice 4.2 — Post-run `TrajectoryVerifier` (MVP, zero side effects)

| | |
|---|---|
| **Objective** | §9.7's six items. Score completed runs, emit `VerificationResult`, display as advisory. **No automated action.** **Hosted as a Python Appwrite Function (§9.8)** — the `llm_verifier` library runs there; the Worker invokes and polls it using the pattern it already uses four times. |
| **Prerequisite** | 4.1 (there is nothing to read without `run_events`), Q's criteria-set decision (Q-11), and **a measured Appwrite Education-plan function timeout (Q-17 / §9.8 consequence 3) — one timed dry-run invocation settles it and must precede implementation.** |
| **Exact files** | Create `services/trajectory-verifier/` — **a Python Appwrite Function, sibling to `services/deterministic-engine/`**, wrapping the `llm_verifier` library (`requirements.txt` pinning it, `main.py` entrypoint, `src/uncertainty.py` for M1, `src/criteria_loader.py`). Create `criteria/ai-drakon-deterministic.md` (AI-DRAKON-authored, modelled on upstream `criteria/TEMPLATE.md`, **exactly 3 criteria** per B3). Create a D1 migration for the verification-results table, a Worker invoke/poll handler pair mirroring L4645/L4684, and a UI evidence-drawer panel. **Note:** `pnpm-workspace.yaml` includes `services/*` — a Python service in that tree needs checking that pnpm does not choke on a package-json-less directory. |
| **Must not touch** | **`packages/policy-engine` — not one line.** No `GateVerdict`. No gate table. The isolation is the design. `services/deterministic-engine/` — the new function is a sibling, never a modification. |
| **Tests** | `K=1` rejected at the boundary (M1). Empty `evidenceRefs` → coerced to `uncertain` (M2). `overallConfidence == min(...)`, not mean (M3). `EvaluationTrace` complete and reproducible (M4). **A test asserting `VerificationResult` is not assignable to `GateVerdict`.** **Plus, forced by §9.8: the function rejects `N > 1` in its own input validation (B1); asserts ≤ 3 criteria (B3); enforces the trajectory-size cap (B4); and a timing test asserting a full K=4 × 3-criteria invocation completes inside the measured timeout with margin.** |
| **Security invariant** | **SI-9 (§14): the verifier has no authorization capability.** No write path into the policy plane. `authorityDisclaimer: 'advisory_only'` is a required literal field, not a comment. **New function ⇒ new secret surface: the model-provider API key lives in Appwrite Function secrets, never in the repo, never in a `RunRequest`, never in an emitted event — and given SI-7's live violation (`MCP_API_KEY` plaintext in two committed files), this is exactly the mistake this project has already made once.** |
| **Rollback** | `git revert` + drop the (new, isolated) table + delete the Appwrite Function. Nothing else reads it. |
| **Deployment impact** | **New Appwrite Function deployment** — a new deployable artifact, though on infrastructure Q already operates. No new host, no new ops runbook, no new network boundary (H1/H2/H4). |
| **Quota impact** | **Bounded by design, and that is the point of B1–B4.** MVP = 3 criteria × K=4 = **12 LLM calls per completed run, parallelizable to ~1 round-trip** (upstream already parallelizes repeats — `ThreadPoolExecutor`, `progress.py:304`). Contrast upstream's reference benchmark run: 4,320 calls / 272.5M input tokens. **A per-run token ceiling must still be set before the first call.** Appwrite Function execution quota is additional and **UNKNOWN** on the Education plan. |
| **Agent** | Claude/Opus for the uncertainty design (the novel part — upstream has no confidence field); agy .234 for implementation, since it already holds the deterministic-engine Appwrite-Function contract knowledge. |
| **Oracle dependency** | **Yes for criteria-set selection** (Q-11) and for the calibration study design. **Not for the hosting decision — §9.8 recommends the Appwrite Python Function outright.** |
| **Implement before the 25th?** | **NO** — blocked on 4.1, Q-11, and Q-17. **Allowed now:** drafting the criteria file, the `VerificationResult` schema, the M1 uncertainty formula, and the B1–B4 bounds (documentation + design). **Also allowed now and recommended: the timed dry-run measuring the Education-plan function timeout** — it is a read-only capability probe with a trivial throwaway function, and every sizing decision in §9.8 currently rests on an UNKNOWN it would close. **Confirm with Q first, since it deploys a (disposable) function.** |

---

### Slice 4.3 — Verifier-driven retry / replan + online prefix mode

| | |
|---|---|
| **Objective** | Let verifier output cause bounded, policy-mediated effects. Add `ProgressTracker`-shaped online prefix scoring. |
| **Prerequisite** | 4.2 shipped, **a calibration study showing M1's confidence actually predicts correctness on AI-DRAKON runs**, and **an execution-model decision for online mode (§9.8/§9.9)**. Without the calibration study this slice automates a number nobody has validated. Without the execution-model decision it automates it on infrastructure that fits the workload badly. |
| **Exact files** | A reducer **inside** the policy boundary (`packages/policy-engine` or a new `packages/run-supervisor` — Q decides); streaming read of `run_events`; prefix-cache configuration. **Online mode likely needs a host other than a per-checkpoint Appwrite Function invocation — see §9.8.** |
| **Must not touch** | The verifier package's read-only posture. The verifier still cannot act; the reducer acts. |
| **Tests** | Auto-retry is refused when any gate on the retry path is `GateTrust: 'simulated'` (Adjustment B). `human_review` cannot be discharged by any verifier output. Retry budget is bounded and spec-derived. `prefix_too_short` degrades to `uncertain`. |
| **Security invariant** | **The verifier can only narrow, never widen** (SI-9). `require_human_approval` is unsatisfiable by any automated path. |
| **Rollback** | Feature-flag every side effect. Flag off = 4.2 behavior. |
| **Deployment impact** | Behavioral change to live runs. Staged rollout. **Plus, plausibly, a new execution target if online mode cannot live in an Appwrite Function — which would re-open the `.184` capacity question (U7/Q-10) that §9.8's H4 avoided for 4.2.** |
| **Quota impact** | **Highest in the plan, and structurally worse than 4.2 in three ways at once:** online mode re-scores a growing prefix at every checkpoint (many invocations per run, not one); each invocation re-sends a longer prompt; and if B1's `N = 1` bound is relaxed to enable Best-of-N, the O(N·k) pairwise tournament term returns on top. **Prefix-caching is a precondition, not an optimization** (§5: 5.2% → 78.4% hit rate, ~3.4× fewer uncached input tokens). |
| **Agent** | Oracle for design; agy .234 for implementation. |
| **Oracle dependency** | **Yes, hard** — and now on two counts: the side-effect reducer, and the online-mode execution model. |
| **Implement before the 25th?** | **NO.** |

---

### Slice 4.5 — Generic, registry-driven UI

| | |
|---|---|
| **Objective** | One runtime path. Collapse the build-time `VITE_USE_DETERMINISTIC` fork (Report 2: two parallel code paths exist today). Runner picker, run timeline, **gate indicators showing `GateTrust`**, evidence drawer, approval prompt, provenance chip, verifier panel. |
| **Prerequisite** | 3.5 (registry), 4.0 (snapshot), 4.2 (verifier results to show). |
| **Exact files** | `src/hooks/usePipelineExecution.ts` (collapse the two paths), `src/lib/harness/pipeline-client.ts`, `src/components/harness/{GateIndicators,EvidenceDrawer}.tsx`, new runner-picker and verifier-panel components. |
| **Must not touch** | Adapter packages. The UI consumes the registry; it does not know runner names. |
| **Tests** | The UI renders a runner it has no specific code for (drive it with `byo-http`). `simulated` gates are visually distinct from `enforcing`. Verifier output is visually distinct from gate verdicts. |
| **Security invariant** | **The UI must never present a `simulated` gate as an enforcing one, and never present verifier advice as authorization.** Misrepresentation in the UI is a security property here, not a cosmetic one. |
| **Rollback** | `git revert`; the env-flag path can be restored. |
| **Deployment impact** | Pages deploy. Remember the `.lovable/` mirror rule for this repo family (MEMORY_CONTEXT `feedback_lovable_sync`) — **verify whether it applies to this repo before assuming.** |
| **Quota impact** | Low. |
| **Agent** | agy .30 (frontend) with a design review. |
| **Oracle dependency** | Optional. |
| **Implement before the 25th?** | **NO** — depends on 3.5/4.0/4.2. |

---

## 11. Agent Assignment Matrix

| Slice | Primary | Secondary / review | Rationale |
|---|---|---|---|
| 3.0c | **Q only** | — | Config choice + credential rotation. No agent may decide or execute. |
| 3.1 | agy .30 | agy .234 cross-checks the matrix | .30 built the route inventory and holds it. Test-only, zero blast radius. |
| 3.2 | agy .30 | agy .234 against the 3.1 baseline | Worker surgery in the region .30 already mapped. |
| 3.3 | agy .234 (`packages/tenancy`) | agy .30 (13 Worker sites); **Oracle pre-merge** | .234 demonstrated contract discipline; ADR 0025 calls this the highest-risk change in the migration. |
| 3.4 | agy .234 (engine + contract) | agy .30 (Worker + frontend); **Oracle for the PEP** | Split across engine/Worker/frontend; the PEP relocation is an architectural decision. |
| 3.5 | **agy .234** | Claude/Opus reviews the contract surface | .234 did the genericity audit and holds the `BlobStore`-minimality lesson. |
| 3.6 | agy .30 | — | Localized Worker fix in .30's region. |
| 4.4 | agy .30 | agy .234 for grant derivation | MCP handler lives in the Worker. |
| 3.7 | agy .234 (adapter) | agy .30 (infra overlay); **Oracle for ADR 0026** | Contract conformance is the risk; the ADR is Oracle's remit. |
| 4.0 | agy .234 | — | Pure schema work. |
| 4.1 | agy .234 | **Oracle for retention policy** | D1 migration + a durability/cost/compliance trade. |
| 4.2 | **Claude/Opus** (uncertainty design) | agy .234 (implementation); **Oracle for criteria set** | M1–M5 are novel — upstream has no confidence field at all. This is the genuinely new design work in the plan. **Implementation goes to .234 specifically because it already holds the deterministic-engine Appwrite-Function contract knowledge, and 4.2 is the same invoke/poll shape (§9.8).** |
| 4.3 | **Oracle** (design) | agy .234 (implementation) | First slice where an LLM judgement causes an automated effect. |
| 4.5 | agy .30 | design review | Frontend. |

**Standing constraints (MEMORY_CONTEXT):** no parallel heavy processes on `.184`; no multiple simultaneous `run_in_background` tasks; git commit messages over SSH always via `git commit -F file`, never inline `-m`; `pkill -f` over SSH can self-match — use `ps aux | grep '[b]racket'`.

---

## 12. Quota-Aware Execution Plan

### Allowed now (no further approval)

| Activity | Status this round |
|---|---|
| Read-only source audit on either clone | **Done** — this report |
| Design and schema drafting (§8, §9) | **Done** |
| Research (framework, paper, docs) | **Done** — Report 3 + spot-checks |
| Local cloning and local GitNexus indexing | **Done** — `llm-as-a-verifier` cloned + indexed |
| Test **design** (naming, cases, matrices — not execution against live) | **Available** — Slice 3.1's full case list is specified in §10 |
| Documentation | **This document** |

### Blocked pending separate explicit approval

| Activity | Which slice | Why |
|---|---|---|
| Any Worker deployment | 3.0c and every deploying slice after | First deploy in ~52 days; live matches no config file |
| Credential rotation (MinIO, `MCP_API_KEY`) | 3.0c | Irreversible; may break the unidentified `drakon-mcp-worker` caller (U4) |
| Any live mutation (CF API writes, Appwrite writes) | 3.0c, 3.3 | — |
| D1 production migration | 3.3, 4.1, 4.2 | One-way door once written to |
| OpenBot deployment | 3.7 | No hosting decision, no capacity plan |
| Heavy `.184` processes | 3.7, 4.2, 4.3 | Standing rule; `.184` is a weak host |
| Real-secret checkout experiments | anything touching `/home/vokov/workspace/ai-drakon-scaffolder` | Carries real `.env`; read-only until Q-3 |
| **Appwrite Function deployment (incl. the throwaway timing probe)** | 4.2 | *New with the hosting decision.* Deploying anything — even a disposable Python function to measure the Education-plan timeout — is a deployment. **Recommended and cheap, but needs Q's nod: Q-17.** |
| **Source modification of `worker-mcp-drakon.js`** | 3.2, 3.6, 4.4 | *My addition:* it is the live-serving security-critical file. Even undeployed edits accumulate un-reviewed risk while the deploy path is unresolved. |

### DEFERRED_UNTIL_25 — see §13

### Quota shape of the verifier work — flagged early, deliberately

Upstream reference point (DIRECT_SOURCE README): one benchmark run = 4,320 verifier calls, 272.5M input tokens (78.8% cached), 32.4M output tokens. AI-DRAKON's MVP is far smaller — **3 criteria × K=4 = 12 LLM calls per completed run, parallelizable to roughly one round-trip of wall-clock** (bounds B1–B4, §9.8). But the **online** mode in 4.3 re-scores a growing prefix at every checkpoint, which is the shape that produced those numbers. **A per-run token ceiling and a prefix-cache configuration must exist before the first verifier call is made in anger.** Given that the Oracle host lost an entire 83-request run to a quota limit earlier today, this is not a theoretical concern.

**Second quota axis, new with the hosting decision: Appwrite Function execution quota and wall-clock limit on the Education plan — both UNKNOWN.** The deterministic engine already carries a workaround for this plan's constraints (base64-log result channel, `main.ts` L6–7). §9.8's entire sizing argument rests on a timeout figure nobody has measured. **The single highest-value cheap action available right now is a timed dry-run invocation of a throwaway Python function to establish that number** — read-only in effect, disposable, and it closes the UNKNOWN that every 4.2 sizing decision depends on. It does deploy a function, so it needs Q's nod (Q-17), but it is orders of magnitude cheaper than discovering the limit during implementation.

---

## 13. Oracle-Deferred Items (DEFERRED_UNTIL_25)

| # | Item | Why Oracle |
|---|---|---|
| O-1 | Live Cloudflare state: which config produced the live Worker; whether `JWT_SECRET`/`APPWRITE_API_KEY`/MinIO secret are set as Worker secrets; whether `OWNER_EMAILS` is set live; whether HEAD has been deployed since 2026-08-22 | Needs a working CF token; both tokens failed last round (L9). **Not strictly Oracle-dependent** — a working token unblocks it sooner. |
| O-2 | ADR 0026 (OpenBot as first external runner) | New ADR introducing an external runner |
| O-3 | Human-approval PEP relocation (Adjustment C) | Relocating an invariant's enforcement point is an architectural decision |
| O-4 | Which verifier criteria set AI-DRAKON adopts | Product decision; upstream offers no universal set (§5). Q + Oracle. |
| O-5 | Calibration study design: does M1 dispersion-confidence predict correctness on AI-DRAKON runs? | **This study gates whether 4.3 is safe to build at all.** |
| O-6 | V4 logprob fine-grained reward adoption | Couples the platform to a model-provider capability |
| O-7 | `run_events` retention policy | Durability × cost × compliance |
| O-8 | Whether verifier scores transfer to browser-agent trajectories | No browser benchmark exists upstream. Genuinely open. |
| O-9 | Pre-merge review of Slice 3.3 | ADR 0025's own "highest-risk change in the whole migration" |
| O-10 | `.184` capacity plan for OpenBot + gVisor | U7, unchanged from last round |

**Explicitly NOT Oracle-deferred:** the verifier **hosting** decision. §9.8 recommends a Python Appwrite Function outright, grounded in four verified call-site pairs of an existing pattern in this codebase. Q can act on that without waiting for the 25th. What still needs Oracle is *which criteria* (O-4), *whether the confidence signal is calibrated* (O-5), and *what execution model online mode would need* — not *where the post-run MVP runs*.

---

## 14. Security and Trust Invariants

Restated, each with its status **as verified this round**.

| # | Invariant | Status at HEAD `874c479b` | Evidence |
|---|---|---|---|
| SI-1 | Authorization never depends on source-line position | **VIOLATED** | Positional gate L2848 confirmed; three `/v1/notes/*` handlers and `POST /mcp` sit above it (R-1, R-2, N6) |
| SI-2 | No route is reachable without an auth decision | **VIOLATED** | `/ws/room/*`, `/v1/diagram/*/sync` reach Durable Objects with zero auth; `/ws/room/*` is **live** (N1) |
| SI-3 | Every execution is tenant-bound | **VIOLATED** | No tenancy exists; five owner-granting paths incl. fail-open (D15, N3); `env.D1_DB` referenced nowhere (D25) |
| SI-4 | Specs are server-resident; clients never supply policy | **VIOLATED** | Client mints spec in the browser (D21); Worker forwards body verbatim (D18); engine trusts client `gates` (D20) |
| SI-5 | Human approval required for commit/promotion by default | **UNIMPLEMENTABLE TODAY** | `require_human_approval` declared and read by **no code** (D9 ×3). Adjustment C proposes the PEP as owner. |
| SI-6 | Gates that block must be real | **HALF VIOLATED** | safety + policy enforcing; confidence hardcoded `0.65 / +0.15` (D6 ×3); cost consumes `Math.random()` (D7 ×2) |
| SI-7 | No credential in prompt, browser, or transcript | **VIOLATED IN SOURCE** | `MCP_API_KEY = "drakon-mcp-2026"` plaintext, `wrangler.toml:8` and `worker-wrangler.toml:8`, granting unconditional owner (D16/D17/E5, ×3) |
| SI-8 | Exactly one deployable config per Worker name | **VIOLATED** | Three configs claim `drakon-antigravity-worker`; live matches none (D29 + L1). Root `wrangler.toml` is a Pages config and does **not** count (R-5) |
| SI-9 | **The verifier has no authorization capability — it may narrow, never widen** | **NOT YET APPLICABLE** (no verifier exists) | Proposed in §9.2; must be enforced structurally (no import path, no assignability to `GateVerdict`, `authorityDisclaimer` as a required literal) |
| SI-10 | Every tool call has a unique event/message identity | **NOT YET APPLICABLE** | ag-ui#1037; enforced in 3.7 |
| SI-11 | Audit is append-only and tenant-scoped, with day-one retention | **NOT IMPLEMENTED** | `run_events` does not exist; ADR 0024 is 0% (D28) |
| SI-12 | The UI never presents a simulated gate as enforcing, or advice as authorization | **CURRENTLY VIOLATED IN SPIRIT** | `GateIndicators.tsx` / `EvidenceDrawer.tsx` render four gates with no trust distinction; two are mocks |

**Eight of twelve invariants are violated or unimplementable at canonical HEAD.** That is the honest state, and it is why the ordering laws in §10 are not negotiable.

---

## 15. Contradictions Requiring Owner Decision

Carried forward from the plan doc (C1–C9), plus new ones from this round (X-1 … X-9).

| # | Contradiction | Sides | Status after this round |
|---|---|---|---|
| C1 | Package naming | ADR 0022 → `packages/harness-adapters`; shipped → `packages/harness-contract` | **OPEN.** Blocks 3.5 — names get baked in. Prior recommendation: amend the ADR. **Not mine to decide.** |
| C2 | Spec identity | Shipped `harness_specs UNIQUE(tenant_id, agent_name, version)` vs ADR 0020 / §4.3 `spec_id` | **OPEN.** Blocks 3.4. Migration vs ADR amendment; a schema one-way door. |
| C3 | Call-site count | ADR 0025 + §4.8 say 12; actual is 13 | **CLOSED on fact** — 13, confirmed ×3 this round. The ADR needs a doc fix; that it was written against a different tree is the real signal. |
| C4 | Status-route authz | ADR 0025 says "no authorization at all"; actual enforces `role==='owner'` | **CLOSED on fact** — ADR stale (D23/E6 ×2). Tenant scoping genuinely still absent. |
| C5 | Gate reality | Product claims a governing 4-gate plane; two are simulations | **OPEN.** Adjustment B (label with `GateTrust`) is a mitigation, not a fix. **Making confidence/cost real is a separate unscoped project.** |
| C6 | Human approval ownership | Invariant demands it; no code reads the field | **OPEN.** Adjustment C proposes the Worker PEP. Real design change → Oracle (O-3). |
| C7 | Priority ordering | Architect's #3 (grant issuance) precedes tenancy/spec/audit | **OPEN and now sharper** — see X-7. |
| C8 | D1 table count | Binding audit said 5; actual is 6 | **CLOSED on fact** — 6, `harness_specs` added since. Drift indicator: the audit aged into staleness in ~1 day. |
| C9 | `require_human_approval` in the default spec | `createDefaultSpec` populates it; nothing reads it | **OPEN.** The system has been making itself this promise since 2026-06-30. |
| **X-1** | **"No global gate" (Report 1 E3) vs "positional gate at L2848" (plan D12)** | Two independent audits, opposite conclusions | **RESOLVED by me at direct source: the gate exists.** D12 stands, E3's inference is withdrawn. Q should know two audits disagreed on a load-bearing security fact — that is a process signal about grep-only auditing. |
| **X-2** | **`/v1/notes/commit|delete` — plan D14 says pre-gate/unauthenticated; Report 1 says UNKNOWN** | — | **RESOLVED: both handlers self-authenticate but do not role-check.** D14 must be amended: reclassify as "authenticated, any role", same class as D13. **Q should confirm the amended wording before the ADRs cite it.** |
| **X-3** | **`/ws/room/*` and `/v1/diagram/*/sync` are unauthenticated** | No prior report; NEW | **OPEN — decision needed.** This is a live hole with a guessable identifier. Q must decide urgency vs the normal wait-for-Oracle posture (→ Q-12). |
| **X-4** | **The 4th wrangler config (`drakon-setup-hub`)** | Report 1 E13 flagged it as changing the config picture | **RESOLVED: it does not.** It is a Pages config (`pages_build_output_dir`), a different resource with a different name. **No change to the canonical-config decision — but the CI invariant must be "one per Worker name", not "one per repo".** |
| **X-5** | **Verifier criteria mismatch** | AI-DRAKON's candidate set (specification/output/errors/**evidence**/**handoff**) vs upstream's per-benchmark 3-criterion files; "evidence" and "handoff" exist nowhere upstream | **OPEN — genuinely Q's call.** Criteria are hand-authored per domain upstream, so inventing AI-DRAKON's own is normal usage. But *which* criteria is a product decision with long-lived consequences: it defines what "a good run" means for this platform. → Q-11, O-4. |
| **X-6** | **`resume`/`cancel` in the adapter contract** | Plan declares them required; Report 2 found neither exists for the deterministic runner | **RESOLVED by design (§8): make them optional + descriptor flags `false`.** Q should confirm, since it changes the published interface shape. |
| **X-7** | **Tenant-MCP ordering** | Candidate sequence puts tenant-filtered MCP at 4.4, *after* OpenBot at 3.7; but OpenBot's `/admin/plugins` registers against `POST /mcp`, which cannot express a tenant (I4/D13) | **OPEN.** I recommend pulling 4.4 before 3.7 and have sequenced it that way in §10 — **but flagged, not silently reordered**, exactly as the previous round flagged C7. |
| **X-8** | **Verifier authority framing** | AI-DRAKON's "advisory-only, never authorization" invariant vs upstream's total silence on authorization | **RESOLVED as fact: there is no upstream position to align or conflict with.** The constraint is AI-DRAKON's alone. Q should know this is an unbacked local invention — correct in my judgement, but nothing external validates it, and nothing upstream will stop a future contributor from wiring the verifier as an authority. **SI-9 must be structural, not documentary.** |
| **X-9** | **Appwrite `owner` label as a fifth owner path (N3)** | Not documented in any ADR, report, or plan | **OPEN.** Is label-based owner grant intended? If yes it needs an ADR; if no it is an undocumented privilege-escalation path. → Q-13. |
| **X-10** | **Appwrite Function configuration is not in version control** | The Worker invokes Appwrite Functions at four call-site pairs, and the deterministic engine *is* one — yet there is **no `appwrite.json` anywhere in the repo** (verified: `find . -name appwrite.json` → zero results outside `node_modules`) | **OPEN — newly surfaced by the hosting decision.** Function ids, runtimes, timeouts, memory, and secrets live entirely outside the tree. This is the same class of defect as SI-8 (three competing wrangler configs): **the deployed reality of a component is not derivable from the repo.** It blocked this report from answering the one question §9.8's sizing rests on — the Education-plan execution timeout — and it will block Slice 4.2 the same way. **Recommend Q authorize checking in an `appwrite.json`** as part of, or before, 4.2. → Q-17. |

---

## 16. Open Questions for Q — decisions I must not make

| # | Question | Blocks |
|---|---|---|
| Q-1 | **Which of the three `drakon-antigravity-worker` configs is canonical?** None is a superset of live. | Everything |
| Q-2 | Confirm `ai-drakon-saas` as the D1 target? (asked in the binding audit §11, still unanswered) | 3.3 |
| Q-3 | Canonical deploy checkout — `~/projects` or `~/workspace` @ `44681804` (which holds the real secrets)? | 3.0c |
| Q-4 | Authorize rotation of **both** MinIO and `MCP_API_KEY`? Identify the `drakon-mcp-worker` caller first (84 req/24h). | 3.0c |
| Q-5 | C2: migrate `harness_specs` to `spec_id`, or amend ADR 0020 to `(agent_name, version)`? | 3.4 |
| Q-6 | C1: amend ADR 0022 to the shipped naming, or rename the package? | 3.5 |
| Q-7 | C6: does the Worker PEP own human-approval enforcement? | 3.4 |
| Q-8 | **Are ADRs 0019–0025 accepted?** All seven are `status: proposed`. If they are still drafts, the entire target is provisional. | Everything |
| Q-9 | A working Cloudflare API token. | O-1, 3.0c |
| Q-10 | Where does OpenBot run? No capacity plan exists. | 3.7 |
| Q-11 | **Which verifier criteria set?** Upstream has no universal set; "evidence" and "handoff" are AI-DRAKON inventions. (X-5) | 4.2 |
| Q-12 | **`/ws/room/*` is a live unauthenticated WebSocket (N1). Fix it out-of-band now, or hold it in sequence behind 3.0c/3.1?** | 3.6 |
| Q-13 | **Is the Appwrite `owner`-label grant path intended (N3)?** If yes → ADR. If no → undocumented escalation path. | 3.2, 3.3 |
| Q-14 | Confirm the amended D14 wording (X-2) before any ADR cites it. | 3.1, 3.2 |
| Q-15 | Confirm optional `resume`/`cancel` (X-6). | 3.5 |
| Q-16 | Confirm pulling tenant-MCP before OpenBot (X-7). | 3.7 |
| Q-17 | **Confirm the Python Appwrite Function as the verifier host (§9.8 recommends it), and authorize (a) a timed dry-run to measure the Education-plan function timeout, (b) checking an `appwrite.json` into the repo (X-10), and (c) which model provider + where its API key lives.** | 4.2 |

---

## 17. Stop Conditions

| # | Stop condition | Status |
|---|---|---|
| **SC-1** | **Live deployment / config ownership unresolved** | **TRIGGERED — unchanged, and now worse.** Three configs, live matches none, no CI deploy, no Worker deploy script, ~52 days since last deploy, today's security fixes committed but undeployed. **New this round (N2):** resolving it will *activate* a second unauthenticated WebSocket surface unless 3.6 ships alongside. Additionally, live state could not be re-verified for the second round running (no working CF token) — every `LIVEDEPLOYMENT` row is ~1 day stale and twice-unconfirmed. |
| **SC-2** | **Tests cannot prove behavior preservation** | **TRIGGERED — unchanged.** 4,811-line Worker, 73 route-dispatch conditions, 14 test files, **zero** invoking `worker.fetch` or the default export. Coverage baseline for the routes about to be refactored is zero. |
| **SC-3** | **A security invariant is violated on the live edge** | **NEWLY TRIGGERED THIS ROUND.** `/ws/room/*` reaches `RoomDO` with zero authentication and zero tenant binding; `ROOM_DO` is bound live; room ids are `idFromName(pathSegment)` and therefore guessable. This was not known in any prior round. It is independent of SC-1 (it is a source defect, not a deploy defect) and independent of SC-2 (no test would have caught it, since no test exercises those paths). |
| **SC-4** | Contract/schema ambiguity blocking implementation | **TRIGGERED, narrowly.** Q-5 (`spec_id` vs `agent_name`) blocks 3.4; Q-6 (package naming) blocks 3.5. Both are single decisions, not investigations. |
| **SC-5** | Oracle-dependent design decisions outstanding | **TRIGGERED, low severity.** O-2 … O-8. **Does not block 3.1**, which is the only slice recommended for immediate work. |
| **SC-6** | Evidence base insufficient to plan | **NOT TRIGGERED.** Three independent audits plus this reconciliation. Most load-bearing facts now carry two to four independent sources. The evidence base is the strongest it has been. |
| **SC-7** | Agent capacity exhausted | **NOT TRIGGERED for planning.** Oracle is out until 2026-08-25 09:00 Zurich, but the local-Opus path produced this deliverable. **Will trigger for 3.3/3.4/3.7/4.3**, which genuinely want Oracle. |

**Newly triggered beyond the two already known: SC-3, and marginally SC-4/SC-5.**

---

## FINAL VERDICT

**BLOCKED_ON_OWNER_DECISIONS** *(strongest)*
Seventeen decisions in §16, of which Q-1, Q-8, and Q-12 block essentially everything. Q-8 is the deepest: if ADRs 0019–0025 are still drafts rather than accepted decisions, the entire target architecture this plan serves is provisional and every slice below 3.5 is built on an unratified foundation. **Q-17 (verifier hosting) is the one owner decision that is genuinely ready to close today** — §9.8 makes the recommendation, and the only thing needed from Q is a nod plus authorization for a cheap timing probe.

**BLOCKED_ON_DEPLOYMENT_VERIFICATION**
SC-1. Three configs, live matching none, and — for the second consecutive round — no working Cloudflare token to re-verify. Every live fact is carried forward, twice unconfirmed. Compounded by N2: the fix activates a new unauthenticated surface.

**BLOCKED_ON_TEST_BASELINE**
SC-2. Zero route-level coverage across 73 dispatch conditions in a 4,811-line file about to be restructured. Slice 3.1 clears this and is the one slice implementable today.

**BLOCKED_ON_ORACLE_UNTIL_25**
O-2 … O-8, and pre-merge review of 3.3. Lowest-priority blocker: it constrains slices 3.3 onward, none of which are reachable before the earlier blockers clear anyway. **The Oracle outage is not on the critical path this round.**

---

## Required Repository Table

| Repo | Local path | Branch | HEAD | GitNexus indexed commit | Freshness | Notes |
|---|---|---|---|---|---|---|
| `ai-drakon-scaffolder` | `/home/vokov/projects/ai-drakon-scaffolder` (`.184`) · `C:\Users\vokov\Documents\GitHub\ai-drakon-scaffolder` (`.30`) · GitNexus container `/projects/ai-drakon-scaffolder` | `main` | `874c479b3a15aa83209149083c1dd063fd2bd98b` (2026-08-23 06:43:56 +0300) | `57fe5afac6cd87d7ec4b455892be8cd0534a52b6`, indexed 2026-08-22T18:27:30Z | **⚠️ STALE — 4 commits behind** | 582 files / 4,918 nodes / 10,553 edges / 138 communities / 300 processes / **0 embeddings**. Both working clones synced to canonical HEAD (`.30` re-synced this session after a stale remote-tracking-ref artifact made it look 38 commits ahead). Working tree dirty on `.184` with known auto-managed drift only: `AGENTS.md`, `CLAUDE.md`, 3× `.claude/skills/gitnexus/*/SKILL.md`. **All load-bearing findings in this report were taken from direct source, not from the stale index.** Recommend reindexing before implementation; treat a native-binding crash as non-blocking. |
| `llm-as-a-verifier` | `/home/vokov/projects/llm-as-a-verifier` (`.184`) · GitNexus container `/projects/llm-as-a-verifier` | `main` | `8db8a114355a9d7fdf9a8d1d5c87f6aeebd18770` (2026-08-20 00:01:30 -0700) | `8db8a114355a9d7fdf9a8d1d5c87f6aeebd18770`, indexed 2026-08-23T04:17:02Z | **FRESH — index == HEAD, no staleness** | Remote `git@github.com:llm-as-a-verifier/llm-as-a-verifier.git`. 21 files / 310 nodes / 627 edges / 14 communities / 26 processes / **0 embeddings**. `data/` (**349 MB** of benchmark trajectory datasets) crashed the indexer **twice, silently**; fixed by a root `.gitnexusignore` containing the single line `data/`, after which analyze succeeded. That ignore file is **local and untracked** — a fresh clone elsewhere will hit the same crash. Framework code lives in `llm_verifier/`, `criteria/`, `scripts/`. Read-only reference; **AI-DRAKON takes design ideas from it, not a dependency**, in the MVP. |

---

*Produced by a local Claude-Opus subagent on 2026-08-23 while the Oracle host was unavailable. Planning-only: nothing was edited, committed, pushed, deployed, or rotated. No credential was used beyond SSH access to the two working clones. Every claim above is labelled DIRECT_SOURCE, GITNEXUS, EXTERNAL_SOURCE, MEMORY_CONTEXT, INFERENCE, UNKNOWN, or DEFERRED_UNTIL_25 at its point of use or in the table row that carries it.*
