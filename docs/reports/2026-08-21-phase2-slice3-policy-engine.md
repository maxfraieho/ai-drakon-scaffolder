# 1. Slice 3 verdict

**COMPLETE**

`packages/policy-engine` was created (activating the inert scaffold), populated with the four pure gate-evaluation functions plus `capabilityMatches`, all extracted verbatim from `services/deterministic-engine/src/main.ts`. All 20 Slice 1 characterization tests pass **unmodified**, both standalone and through root's full suite -- the strongest available proof the extraction preserved exact behavior. 23 new package-level unit tests were added. Root build/test are green (9 files, 76 tests). One focused commit (`bb8cde19`) was pushed. GitNexus freshness was proven both pre- and post-edit on `.184`, with a real (unrelated) infra incident along the way: post-edit reindex failed 4 times with a WAL-shadow-orphan silent-stop signature (distinct from the memory-pressure signature seen earlier this session); the known fix (`--wal-checkpoint-threshold 67108864`, documented in a pre-existing memory note) resolved it on the first retry with that flag.

---

# 2. Evidence sources

**GitNexus `.184` evidence:** pre-edit branch/HEAD verification, pre-edit `impact` queries on `GateVerdict`/`DrakonHarnessSpec`/`PipelineEvent`, pre-edit confirmation that `packages/harness-contract` and `docs/plans/phase2-boundary-inventory.md` are indexed, post-edit reindex (after resolving a real WAL-shadow infra failure), post-edit `impact` query on the new `evaluateSafetyGate` export, post-edit `cypher` confirmation of all new `packages/policy-engine/*` files being indexed.

**Direct reads of `services/*`:** full read of `services/deterministic-engine/src/main.ts` (395 lines, current Slice-2-era state), `package.json`, `tsconfig.json` -- all direct, since `/services/` is excluded from GitNexus by `.gitnexusignore`.

**AGY `.234` evidence:** mandatory delegated read-only gate-responsibility inventory (exact task text used, see §7), independently re-verified against a direct read of the same file on the primary checkout -- no disagreement.

**Commands/tests:** all listed in full in §6.

---

# 3. Scope executed

**Files read:** `services/deterministic-engine/{src/main.ts,package.json,tsconfig.json,src/__tests__/main.characterization.test.ts}`, `packages/harness-contract/{src/index.ts,package.json}`, `packages/policy-engine/{package.json,README.md,src/index.ts}` (the existing placeholder scaffold), `docs/plans/phase2-boundary-inventory.md` (previously read, re-confirmed still current).

**Files changed (9):**
- `packages/policy-engine/{README.md,package.json,src/index.ts}` -- placeholder replaced with real implementation
- `packages/policy-engine/vitest.config.ts` (new) -- isolates from root's Vite/TanStack config, same pattern as Slice 1's `deterministic-engine/vitest.config.ts`
- `packages/policy-engine/src/__tests__/policy-engine.test.ts` (new) -- 23 unit tests
- `pnpm-workspace.yaml` -- `packages/policy-engine` added to the `packages:` list
- `pnpm-lock.yaml` -- lockfile update for the new package's real devDependencies
- `services/deterministic-engine/package.json` -- `@ai-drakon/policy-engine: workspace:*` added
- `services/deterministic-engine/src/main.ts` -- four inline gate blocks replaced with calls into the extracted functions

**Files intentionally not changed:** `packages/harness-contract/*` (Slice 2's boundary, untouched), the Worker, any auth/tenancy code, `validateHarnessSpec`, root `package.json` (nothing outside the engine consumes `policy-engine` directly), any `HarnessSpec`/`GateVerdict`/`PipelineEvent` shape.

**Package registration:** `packages/policy-engine` added to `pnpm-workspace.yaml`; `@ai-drakon/policy-engine` added as a dependency **only** to `services/deterministic-engine/package.json` (not root), since root itself never imports it.

---

# 4. Contract inventory (internal, per the mandatory first phase)

## 4.1 Four gate responsibilities

| Gate | Current location (pre-extraction) | Pure? | What moved | What stayed in `main.ts` |
|---|---|---|---|---|
| **Safety** | `main.ts` L110-118 (regex pre-compile), L163-178 (evaluation) | Yes, fully | Regex-matching logic → `evaluateSafetyGate(nodeContent, safetyRegexes)` | Regex compilation (has a `context.error` side effect on invalid pattern) |
| **Policy/capability** | `main.ts` L44-51 (`capabilityMatches`), L180-218 | Yes, fully | Capability deduction + allow/deny matching → `evaluatePolicyGate({...})`, `capabilityMatches` moved alongside | Nothing -- no side effects in the original block |
| **Confidence/retry** | `main.ts` L220-268 | Mixed | Retry math only → `evaluateConfidenceGate({...})`, returns an `attempts` trace so the exact per-retry log line can be replayed | NotebookLM context-injection mock + its 2 `context.log` calls (never depended on the retry math); the per-retry log line itself |
| **Cost/quota** | `main.ts` L270-297 | Mixed | Limit/warn-threshold check only → `evaluateCostGate({...})` | Token-count computation (`Math.random()` for `llm` nodes, fixed 200 for `tool` nodes) -- inherently non-deterministic, can't be "pure"; `totalTokens` accumulation; the warning log line |

## 4.2 Orchestration that must remain in `main.ts`

Node traversal (`while` loop, terminal/breakpoint checks), all `context.log`/`context.error` calls, event pushing (`node_start`/`node_done`/`gate_blocked`/`error`/`done`/`breakpoint`), `sleep(150)` latency simulation, transition logic (`question`/`select`/`address` node handling, itself `Math.random()`-driven for `question` nodes), the base64 `DETERMINISTIC_ENGINE_RESULT` log fallback, and the top-level try/catch + HTTP response shaping.

## 4.3 Import-cycle check

`packages/policy-engine` depends only on `GateVerdict` from `@ai-drakon/harness-contract` (Slice 2's package, itself dependency-free). `services/deterministic-engine` depends on both `@ai-drakon/harness-contract` and `@ai-drakon/policy-engine`. No cycle: `policy-engine → harness-contract`, `deterministic-engine → {harness-contract, policy-engine}`, nothing points back.

This inventory was cross-checked against fresh GitNexus results (for the two indexed dependencies), direct reads of `services/deterministic-engine`, and the independently-re-verified AGY `.234` report (§7) before any code was written, per the mandatory pre-extraction gate.

---

# 5. Package implementation

**Files created:** `packages/policy-engine/{vitest.config.ts,src/__tests__/policy-engine.test.ts}` (new); the existing scaffold (`package.json`, `README.md`, `src/index.ts`) was reused and populated, not recreated.

**Exports:** `capabilityMatches`, `evaluateSafetyGate`, `evaluatePolicyGate`, `evaluateConfidenceGate` (+ `ConfidenceGateInput`/`ConfidenceAttempt`/`ConfidenceGateResult` types), `evaluateCostGate` (+ `CostGateInput`/`CostGateResult` types), `PolicyGateInput` type. No default export, no speculative surface.

**Dependencies:** `@ai-drakon/harness-contract` (for `GateVerdict`) only. No React, Vite, Worker APIs, Appwrite SDKs, NotebookLM, network, or filesystem imports -- verified by direct inspection of every import statement in `src/index.ts`.

**Wiring:** `pnpm-workspace.yaml`'s `packages:` list gained one entry (`packages/policy-engine`); no other scaffold (`drakon-ir`, `spec-kit`, `storage`, `codegen`, `ui`) was touched or activated.

---

# 6. Validation

| Command | Result |
|---|---|
| `pnpm --filter policy-engine test` | **23 passed (23)** |
| `pnpm --filter deterministic-engine test` | **20 passed (20)**, unmodified from Slice 1 -- the extraction is behaviorally transparent through the full `main()` orchestration path |
| `pnpm --filter deterministic-engine build` | Clean, `dist/main.js` regenerated |
| `pnpm build` (root) | Clean, no regression |
| `pnpm test` (root) | **9 files passed (9), 76 tests passed (76)** (53 pre-existing + 23 new) |
| Extra: `tsc --noEmit -p tsconfig.json` (root) | Same 20-line / 12-error output as the prior two slices -- zero new errors |

---

# 7. Delegation log

| Task | Delegated to .234? | Result | Re-verified? | Used in decision? |
|---|---|---|---|---|
| Read-only inventory of the four gate responsibilities, helper functions, I/O shapes, and exact file/line ranges (mandatory delegation, exact task text from the coordinator prompt) | Yes, AGY `.234`, `--mode=plan` (read-only, tool-enforced) | Full four-gate breakdown with file:line ranges, inputs/outputs/side-effects/dependencies/determinism per gate, and confirmation the `policy-engine` scaffold was still an empty placeholder at inventory time. Confirmed its own checkout was on HEAD `47bc478c` before reading (matched expected pre-edit HEAD) | **Yes** -- cross-checked every gate's line range and behavior claim against a direct read of the same `main.ts` on the primary (`.184`) checkout; no disagreement found | Yes -- used to confirm the pure/orchestration split boundary before writing `packages/policy-engine/src/index.ts` |

No other delegation was used. Rule 5 (`.184` wins on disagreement) was never invoked since no disagreement occurred.

---

# 8. Risks and gaps

- **Non-deterministic paths remain uncharacterized, by design:** LLM-node token cost (`Math.random()`) and "question" node branch selection are still computed in `main.ts`, not covered by either the characterization suite or the new unit tests. Not a gap introduced by this slice -- inherited from Slice 1's own documented scope.
- **`require_human_approval` still unenforced:** confirmed unchanged -- `evaluateSafetyGate` never reads it, matching the original. Explicitly out of scope per this slice's non-goals.
- **`response.success: true` on gate-blocked executions:** confirmed unchanged (verified by the unmodified characterization suite passing). Not touched.
- **`GateVerdict`/`DrakonHarnessSpec` field drift** (documented in the Slice 2 report) is unaffected by this slice -- the contract itself wasn't touched, only its consumer (the gate loop) was reorganized.
- **GitNexus infra instability** (unrelated to the code change itself) consumed real time this slice: 4 failed post-edit reindex attempts before the known `--wal-checkpoint-threshold` fix resolved it. Documented in `feedback_gitnexus_native_binding_crash.md`/`feedback_gitnexus_wal_instability.md` with a consolidated decision tree for future occurrences. Q separately raised whether GitNexus's canonical instance should move off `.184` (1.5G RAM) onto `.30` (12G RAM) given repeated instability across this session -- a reasonable option, explicitly deferred as its own deliberate task, not decided or executed here.
- **Nothing here blocks Slice 4.**

---

# 9. Commit and repository state

| Fact | Value |
|---|---|
| Commit hash | `bb8cde19e2fd107e0dc8ff062ed555a5cc919c3c` |
| Commit message | `refactor(policy-engine): extract 4-gate evaluator from deterministic-engine` |
| Push status | Pushed to `origin/phase0-stabilize`; independently confirmed via a fresh GitNexus reindex on a separate host (`.184`) whose `lastCommit` now matches exactly |
| Branch | `phase0-stabilize` |
| Exact changed files | `packages/policy-engine/{README.md,package.json,src/index.ts,vitest.config.ts,src/__tests__/policy-engine.test.ts}`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `services/deterministic-engine/{package.json,src/main.ts}` -- 9 files |
| GitNexus post-edit freshness | Proven: `indexedAt: 2026-08-21T08:03:27Z`, `lastCommit: bb8cde19...` (exact match), all 5 new `packages/policy-engine/*` files confirmed indexed via `cypher`, `impact` on the new `evaluateSafetyGate` export resolves to the correct new file with `risk: LOW` |

---

# 10. Recommendation for Slice 4

**Reconcile IR validator.**

Reasoning: with the contract (Slice 2) and the policy/gate evaluator (Slice 3) both extracted and characterization-backed, the next-highest-value remaining duplication from the original inventory is the IR conversion/validation logic split between `src/lib/htse/{diagram-to-ir.ts,ir-to-diagram.ts,ir-validator-core.ts}` and the inline worker copy in `cloudflare-worker/worker-mcp-drakon.js` (a genuinely diverged pair, unlike `GateVerdict`/`PipelineEvent` which were only cosmetically different -- the worker's `validateIrDeterministic` is a 4-rule subset missing BFS orphan detection and using a different error code). This is a bigger, riskier slice than either Slice 2 or 3 (it touches the Worker, which nothing in Phase 2 has touched yet) and should get its own dedicated characterization pass on the worker's inline logic before any extraction begins -- but it's the natural next boundary, not `packages/policy-engine`-adjacent work, and not yet started here.

Not started in this run, per instructions.
