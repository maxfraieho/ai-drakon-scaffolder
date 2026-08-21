# 1. Phase 2 slice verdict

**COMPLETE**

Slice 1 (characterization tests for the policy engine) is done: 20 characterization tests were written against `services/deterministic-engine/src/main.ts`'s current behavior, all pass, no production behavior was changed, `pnpm --filter deterministic-engine build`/root `pnpm build`/root `pnpm test` all pass, and one focused commit (`88e70aed`) was created and pushed. A real, previously-undocumented behavior quirk was found in the process (gate blocks do not set `response.success: false`) and is now permanently characterized rather than left as tribal knowledge.

---

# 2. Evidence sources

**GitNexus `.184` evidence** (indexed paths only): read `src/lib/harness/harness-spec.ts` content directly on `.184`; ran `impact` queries for `GateVerdict` (`src/lib/harness/pipeline-client.ts`, upstream impact 12, risk LOW) and `validateHarnessSpec` (`src/lib/harness/harness-spec.ts`, upstream impact **0**, confirming the "zero callers" finding from the earlier inventory still holds) before writing any test code.

**Direct reads of `services/*`** (GitNexus cannot see this path -- `.gitnexusignore` excludes `/services/`, confirmed in a prior verification pass): full read of `services/deterministic-engine/src/main.ts` (409 lines), `package.json`, `tsconfig.json`; `find`/`grep` confirmed no existing test files anywhere under `services/deterministic-engine` and no `require_human_approval` usage outside its type declaration.

**AGY `.234` evidence:** none used this run -- the delegation policy's example tasks (test-framework conventions, existing test utilities, current policy-engine branches) were all resolved directly by reading `main.ts` myself; no bounded task remained worth offloading.

**Commands/tests:** all listed in full in §5.

---

# 3. Scope executed

**Files read:** `services/deterministic-engine/src/main.ts`, `package.json`, `tsconfig.json`; `src/lib/harness/harness-spec.ts`, `src/lib/harness/pipeline-client.ts`; `docs/plans/phase2-boundary-inventory.md` (previously read this session, re-confirmed still current); root `package.json` (to match vitest version).

**Files changed (4, all in `services/deterministic-engine/`):**
- `package.json` -- added `vitest: ^4.1.5` devDependency + `"test": "vitest run"` script
- `tsconfig.json` -- added `"exclude": ["src/__tests__"]`
- `vitest.config.ts` -- new, isolates this package's test run from root's Vite/TanStack config
- `src/__tests__/main.characterization.test.ts` -- new, 20 tests

**Files intentionally not changed:** `src/main.ts` (no production behavior touched), `src/lib/harness/harness-spec.ts`, `src/lib/harness/pipeline-client.ts`, `cloudflare-worker/worker-mcp-drakon.js`, all `packages/*` scaffolds, `pnpm-workspace.yaml` (see below).

**Package registration:** **not changed.** `services/deterministic-engine` was already registered under `pnpm-workspace.yaml`'s existing `packages: [services/*]` glob from Phase 0 -- no new entry was needed for this slice's test location.

---

# 4. Characterization coverage

| Behavior | Covered? | Test/file | Current observed behavior | External dependency? |
|---|---|---|---|---|
| All four gates passing | Yes | "a single benign action node reaches 'done' with all gates allowed" | `success: true`, all 4 verdicts `allowed: true`, `done` event with `nodes_executed: 1` | No |
| Safety rejection | Yes | "blocks a node whose content matches a blocked_patterns regex..." | `gate_blocked(safety)` + `error` pushed, loop halts immediately -- but **`success: true`** (see below) | No |
| Denied capability | Yes | "blocks a capability that is not in allowed_capabilities" | `gate_blocked(policy)`, halts | No |
| Wildcard capability matching | Yes | "allows...via wildcard" + "deny_patterns overrides...via wildcard" | `granted.endsWith(".*")` prefix-matches correctly for both allow and deny | No |
| Confidence below threshold | Yes | "is blocked when critique_max_retries is exhausted..." | Deterministic: score starts 0.65, +0.15/retry, no `Math.random` involved here | No |
| Retry path | Yes | 3 tests: 0-retry pass, 1-retry pass, retry-exhausted block | Retry math is exact and reproducible; confirmed via `toBeCloseTo`/log-count assertions | No |
| Cost/quota rejection | Yes | "blocks the tool node when max_tokens_per_node is below its fixed 200-token cost" | Tool nodes cost a fixed 200 simulated tokens (no randomness); llm-node cost IS random -- not characterized (see §8) | No (tool path); Yes for llm path (unseeded `Math.random`, out of scope) |
| Human-approval requirement | Yes (as a documented gap) | "does NOT pause or require approval even when..." | `require_human_approval` is declared in the type and populated by `createDefaultSpec()`, but `main.ts` never reads it -- confirmed by full-file grep, zero references outside the type. Test asserts no `breakpoint`/`gate_blocked` event occurs. | No |
| Verdict shape | Yes | "every GateVerdict has 'gate' and 'allowed'..." | 4 verdicts per non-blocked node; `score`/`metadata` only populated for confidence gate on `llm` nodes | No |
| Blocked event/state | Yes | Implicit in every gate-block test | Sequence is always `node_start` → `gate_blocked` → `error`; **no `node_done` is ever pushed for a blocked node** | No |
| Malformed input | Yes | 4 tests: invalid JSON, missing `drakon_ir`, missing `harness_spec.gates`, missing referenced node | Each returns the exact 400 payload the code produces, or (for a missing referenced node) a 200 with `success: false` and an `error` event | No |

---

# 5. Validation results

| Command | Result |
|---|---|
| `pnpm --filter deterministic-engine test` (`vitest run`) | **20 passed (20)**, 0 failed |
| `pnpm --filter deterministic-engine build` (`tsc -p tsconfig.json`) | Clean, exit 0. Verified: `dist/__tests__` does **not** exist after a clean rebuild (confirmed by deleting `dist/` and rebuilding from scratch) -- test files are correctly excluded from the production build output |
| `pnpm build` (root) | Clean, `dist/_worker.js` + `dist/server/index.mjs` + assets, no regression |
| `pnpm test` (root) | **8 files passed (8), 53 tests passed (53)** -- root's vitest run also discovers and runs the new 20 tests (33 pre-existing + 20 new = 53), confirming they integrate cleanly with the existing suite too |
| Lint/typecheck attempted | None run this pass (out of scope for this slice; root `tsc --noEmit`'s 12 pre-existing errors, documented in the earlier validation report, are unrelated to these 4 files and were not re-run) |

**Real behavior discrepancy found while running the tests (not before):** the first test run had 6 failures. Investigation (a standalone `tsx` debug script, not vitest, to rule out test-harness bugs) proved `response.success` stays `true` on every gate block, because `executionError` -- the only input to `success: !executionError` -- is never set by the gate-blocking code path (only by "node not found" and "max loop count"). All 6 failing tests were fixed to assert the real behavior (`success: true` + inspect the `gate_blocked` event), not by changing `main.ts`.

---

# 6. GitNexus and direct-read verification

- **Indexed symbols queried (on `.184`, before writing tests):** `GateVerdict` (`impact`, upstream 12, LOW risk), `validateHarnessSpec` (`impact`, upstream 0)
- **Direct-read-only service files:** `services/deterministic-engine/src/main.ts`, `package.json`, `tsconfig.json` -- GitNexus cannot see any of these; every claim about `main.ts`'s behavior in this report comes from direct reading and from running the actual code, never from a GitNexus query
- **Important impact findings:** `validateHarnessSpec`'s zero-caller status is unchanged since the last check -- still true, still not called anywhere, still not this slice's job to fix (that's ADR-0020/Phase 3 territory)
- **Explicit note, repeated per task instructions:** `/services/` is excluded from GitNexus by `.gitnexusignore` (commit `4c60ef40`, 2026-07-01, predates this migration). No absence-of-visibility for any `services/*` file was ever treated as absence-of-existence or absence-of-use.

---

# 7. Delegation log

| Task | Delegated to .234? | Result | Re-verified? | Used in decision? |
|---|---|---|---|---|
| (none) | No | -- | -- | -- |

No delegation was used this run. All source inspection, GitNexus impact queries, test writing, debugging, validation, diff review, and commit/push were performed directly.

---

# 8. Risks and gaps

- **Missing integration coverage:** "question" node branch selection and LLM-node token-cost simulation both use unseeded `Math.random()` -- explicitly left uncharacterized rather than faked (documented in the test file's own comment block). A future slice could inject a seedable RNG to make these deterministic and testable, but that would be a production-code change, out of scope here.
- **External dependencies:** none block this slice. The NotebookLM "bridge" in the confidence-gate path is already a pure in-process mock (comment: "For deterministic execution, we mock the retrieved context") -- no real network call exists to isolate.
- **Remaining contract drift:** unchanged from the earlier inventory -- `HarnessSpec` (engine) still missing 5 fields vs `DrakonHarnessSpec` (frontend); worker's inline `validateIrDeterministic` still a 4-rule subset of `src/lib/htse/ir-validator-core.ts`. Neither was touched, per this slice's explicit boundary.
- **Root TypeScript debt:** the 12 pre-existing root `tsc --noEmit` errors (documented in the 2026-08-21 Phase 2 validation report) are untouched and unrelated to this slice's 4 files.
- **Newly found, now-documented behavior gap:** `response.success` does not reflect gate-blocked executions. This is now a permanent regression guard (any future change that "fixes" this will make 5 of the 20 new tests fail loudly, which is exactly the point of characterization tests -- it forces that change to be a deliberate, reviewed decision, likely as part of Phase 3's audit/trace work).
- **Nothing here prevents Slice 2.** The characterization suite is in place and green; extraction work can now be measured against it.

---

# 9. Commit and repository state

| Fact | Value |
|---|---|
| Commit hash | `88e70aed3b2cfcb6136ce7a356f17b78a87804e7` |
| Commit message | `test(policy-engine): characterize deterministic gate behavior` |
| Push status | Pushed to `origin/phase0-stabilize`; independently confirmed via `git ls-remote` from a separate host (`.184`) |
| Branch | `phase0-stabilize` |
| Working tree status | Not fully clean: `pnpm-workspace.yaml` has an uncommitted, unintended local diff (pnpm's own `allowBuilds` block, auto-written by an earlier `pnpm approve-builds --all` run in this session -- not related to test/package registration, not staged, not committed, left as-is and reported here transparently rather than silently discarded or force-included). Also present, pre-existing and unrelated: two docs/reports/*.md files from earlier in this session and known stale untracked mojibake-named PDFs/`test_wrangler.jsonc` from an earlier tar-transfer artifact -- none touched. |
| Exact changed files (this commit) | `services/deterministic-engine/package.json`, `services/deterministic-engine/tsconfig.json`, `services/deterministic-engine/vitest.config.ts` (new), `services/deterministic-engine/src/__tests__/main.characterization.test.ts` (new) |

---

# 10. Recommendation for Slice 2

**Create `packages/harness-contract`.**

Reasoning: the characterization suite now exists as a safety net, and the very first real drift it depends on understanding -- `GateVerdict` and `HarnessSpec`/`DrakonHarnessSpec` -- is a pure-type extraction with no runtime logic to preserve (unlike the policy-engine gate loop or the IR validator, both of which have real behavioral nuance the characterization tests just proved is easy to get subtly wrong). Extracting the contract types first, with the frontend's richer `DrakonHarnessSpec` shape as the target and the engine's narrower `HarnessSpec` reconciled against it, unblocks both the eventual `packages/policy-engine` extraction (Slice 3) and the IR-validator reconciliation (Slice 4) without yet touching either's runtime code. It is also the lowest-risk of the three remaining options: a type-only package has nothing a characterization test can regress against except "does it still compile," which `pnpm --filter <consumer> build` already verifies for free.

Not started in this run, per instructions.
