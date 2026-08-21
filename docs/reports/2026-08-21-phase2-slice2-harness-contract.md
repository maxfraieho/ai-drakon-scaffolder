# 1. Slice 2 verdict

**COMPLETE**

`packages/harness-contract` was created (activating the inert Phase 2-prep scaffold), populated with the three duplicated types (`DrakonHarnessSpec`, `GateVerdict`, `PipelineEvent`), and adopted by all three expected consumers. All Slice 1 characterization tests still pass unmodified, root build/test are green, `tsc --noEmit` shows the exact same pre-existing error set (zero new errors). One focused commit (`47bc478c`) was pushed. Two real implementation snags were hit and fixed along the way (workspace linking requires an explicit `dependencies` entry, not just a source import; pnpm auto-writes an unrelated `allowBuilds` scaffold on every install) -- both are documented below, neither ended up in the commit as noise.

---

# 2. Working tree hygiene

**Initial status:** dirty. Two categories of unrelated pre-existing diffs were found before any Slice 2 edit was made:

1. A large set of `M`-marked files with `0 insertions(+) 0 deletions(-)` (CRLF-only noise, pre-existing on this `.30` checkout from earlier in the session) -- left untouched, not staged, not part of this report's concern beyond noting they exist.
2. **A real, substantive diff:** `pnpm-lock.yaml` (54 lines) -- the lockfile update that adding `vitest` in Slice 1 required, which was never committed with Slice 1 (an oversight in that slice). This was **not unrelated to this work** (Slice 2 also needs a correct lockfile to add a new workspace package against), so it was committed separately and immediately, *before* starting Slice 2 proper: commit `a447790f`, `chore(deps): update pnpm-lock.yaml for vitest devDependency added in 88e70aed`, pushed independently.
3. `pnpm-workspace.yaml` had an uncommitted `allowBuilds` block (pnpm's own auto-written scaffold from an earlier `pnpm approve-builds --all` run) -- confirmed **not** related to package/test wiring. Excluded from staging both times it reappeared (see §9 for the full story -- pnpm re-writes this block on every `pnpm install` while any build script remains ignored, so it had to be stripped a second time immediately before the final commit, without an intervening reinstall, to avoid re-triggering it a third time).
4. `src/routeTree.gen.ts` (368/347 lines) -- TanStack Router's auto-regenerated route tree, a build artifact that changes on every `pnpm build`/`pnpm dev` run. Left untouched and unstaged; not something to "fix," it will keep regenerating identically.
5. Various pre-existing untracked mojibake-named PDF files and `test_wrangler.jsonc`, both already known artifacts from an earlier session's file-transfer issue, unrelated to any slice. Left untouched.

**Final cleanliness of this slice's commit:** exactly 9 files, all directly attributable to the harness-contract extraction (verified via `git diff --cached --stat` before committing). No CRLF noise, no `allowBuilds` block, no `routeTree.gen.ts`, no unrelated docs.

---

# 3. Contract inventory

Built from a combination of direct reads (`.184`-indexed files) and a delegated-then-independently-re-verified pass by AGY `.234` (see §8 for the split). Full per-field table (AGY `.234`'s output, spot-checked against direct reads of both files -- no disagreements found):

| Type / symbol | Old location(s) | New location | Differences found | Decision |
|---|---|---|---|---|
| `DrakonHarnessSpec` | `src/lib/harness/harness-spec.ts` (sole definition) | `packages/harness-contract/src/index.ts` | N/A -- not duplicated, just under-shared (11 upstream consumers per GitNexus `impact`, all via re-export, all LOW risk) | Adopted as-is, unmodified, as the canonical shape (richer than the engine's local type) |
| Engine `HarnessSpec` | `services/deterministic-engine/src/main.ts` (local, unexported) | *retired* | Missing 5 top-level fields vs `DrakonHarnessSpec` (`$schema`, `description`, `mcp_servers`, `permissions`, `runtime`); `resources` optional instead of required. All `gates.*` sub-fields identical. | Deleted; `main.ts` now imports `DrakonHarnessSpec` directly. Confirmed compile-time-only change (no object literal in `main.ts` needs to satisfy the stricter shape) |
| `GateVerdict` | `src/lib/harness/pipeline-client.ts` **and** `services/deterministic-engine/src/main.ts` (two identical definitions) | `packages/harness-contract/src/index.ts` | Cosmetic only (single vs double quotes in the `gate` union literal) -- semantically byte-identical | Consolidated; both sides re-export/import the shared type |
| `PipelineEvent` | `src/lib/harness/pipeline-client.ts` **and** `services/deterministic-engine/src/main.ts` (two identical definitions) | `packages/harness-contract/src/index.ts` | Cosmetic only (quote style) -- semantically byte-identical. Not explicitly named in the task's "at minimum" list, but directly embeds `GateVerdict[]` and is the wire contract between engine and frontend, so included per "any related nested gate/config types" | Consolidated alongside `GateVerdict` |
| `gates.confidence` / `gates.policy` / `gates.cost` / `gates.safety` (nested) | Identical on both sides in both old locations | Carried inside `DrakonHarnessSpec.gates` | None -- fully identical shape, all four sub-objects | Moved as part of `DrakonHarnessSpec`, not separately |
| `gates.safety.require_human_approval` | Declared both sides | Carried inside `DrakonHarnessSpec.gates.safety` | Present, type-identical, **zero runtime references** in `main.ts` (grep-confirmed: exactly 1 match repo-wide, the type declaration itself) | Preserved exactly as an unenforced field -- not wired in, not removed, per explicit task instruction |
| `validateHarnessSpec` | `src/lib/harness/harness-spec.ts` | *unchanged, stayed put* | N/A -- not duplicated (GitNexus `impact`: 0 upstream callers, confirmed both before and after this slice) | Intentionally left behind -- a function, not a pure type, and per task scope this slice moves types only |
| `createDefaultSpec` | `src/lib/harness/harness-spec.ts` | *unchanged, stayed put* | N/A | Same reasoning -- stays local, references the re-exported `DrakonHarnessSpec` type |
| `DrakonNode` / `DrakonIr` (engine-local IR shapes) | `services/deterministic-engine/src/main.ts` | *unchanged, stayed put* | Frontend-only-adjacent but genuinely engine-specific, not imported/duplicated by any frontend file | Correctly left engine-local -- not part of the harness contract |

---

# 4. Package implementation

**Files created:** none new at the filesystem level -- the Phase 2-prep scaffold (`packages/harness-contract/{package.json,README.md,src/index.ts}`) already existed and was reused as instructed.

**Files changed:**
- `packages/harness-contract/src/index.ts`: placeholder replaced with the three real type definitions (`DrakonHarnessSpec`, `GateVerdict`, `PipelineEvent`) plus a header comment documenting scope and the known unenforced-field gaps.
- `packages/harness-contract/README.md`: updated from "scaffold only" to describe actual contents, consumers, and explicit scope boundary (types only, no runtime logic this slice).
- `packages/harness-contract/package.json`: **unchanged** -- the scaffold's `name`/`main`/`types` fields were already correct.

**Public exports:** exactly three named types -- `DrakonHarnessSpec`, `GateVerdict`, `PipelineEvent`. No default export, no runtime code, no speculative exports (`validateHarnessSpec`/`createDefaultSpec` deliberately not moved here).

**Workspace/package wiring changes:**
- `pnpm-workspace.yaml`: added `- 'packages/harness-contract'` to the `packages:` list (previously only `services/*`). No other scaffold (`policy-engine`, `drakon-ir`, `spec-kit`, `storage`, `codegen`, `ui`) was touched or activated.
- `package.json` (root): added `"@ai-drakon/harness-contract": "workspace:*"` to `dependencies`.
- `services/deterministic-engine/package.json`: same, added as a `workspace:*` dependency.

**Scaffold reuse:** yes, the existing inert Phase 2-prep scaffold was used as instructed, not recreated from scratch.

---

# 5. Consumer migration

| Consumer | Changed? | Why | Build/test impact |
|---|---|---|---|
| `src/lib/harness/harness-spec.ts` | Yes | `DrakonHarnessSpec` interface body replaced with `export type { DrakonHarnessSpec } from '@ai-drakon/harness-contract'`. `validateHarnessSpec`/`createDefaultSpec` untouched. | None -- re-export preserves the exact same public shape at this file's boundary |
| `src/lib/harness/pipeline-client.ts` | Yes | `GateVerdict`/`PipelineEvent` bodies replaced with re-exports from the new package. `PipelineClientOptions` and `DeterministicPipelineClient` class untouched. | None |
| `services/deterministic-engine/src/main.ts` | Yes | Local `HarnessSpec`/`GateVerdict`/`PipelineEvent` declarations removed; now imports all three from `@ai-drakon/harness-contract`. One usage site updated (`payload.harness_spec?: DrakonHarnessSpec` instead of the old local type). No other line in the gate-evaluation logic touched. | `tsc -p tsconfig.json` clean; 20/20 characterization tests still pass unmodified |
| 11 indirect frontend consumers (`usePipelineExecution.ts`, `AgentStudioPage.tsx`, `PipelineDrakonView.tsx`, `GateIndicators.tsx`, `EvidenceDrawer.tsx`, `ExecutionPanel.tsx`, `s.$slug.tsx`, `pitch.$diagramId.tsx`, `DiagramsPage.tsx`, `PipelinesPage.tsx`, and the transitive chain GitNexus's `impact` query surfaced) | **No** | They import `DrakonHarnessSpec`/`GateVerdict`/`PipelineEvent` from `harness-spec.ts`/`pipeline-client.ts`, both of which now re-export the identical named types from the new package -- their import paths and the types they receive are unchanged | Root `pnpm build` succeeded with zero changes to any of these files, confirming the re-export boundary holds |

No consumer outside this list was touched.

---

# 6. Validation

| Command | Result |
|---|---|
| `pnpm --filter deterministic-engine test` | **20 passed (20)**, unmodified from Slice 1 |
| `pnpm --filter deterministic-engine build` | Clean, `dist/main.js` regenerated |
| `pnpm build` (root) | Clean, `dist/_worker.js` + `dist/server/index.mjs` + assets, no regression |
| `pnpm test` (root) | **8 files passed (8), 53 tests passed (53)** |
| Extra: `tsc --noEmit -p tsconfig.json` (root) | Same **12 pre-existing errors**, same files, same lines, as the 2026-08-21 Phase 2 validation report -- confirmed line-for-line identical output before and after this slice's changes. Zero new errors from the `DrakonHarnessSpec` type-strictness change in `main.ts`. |

All four validation passes were re-run a second time after the `pnpm-workspace.yaml` `allowBuilds`-noise cleanup (§9), to avoid trusting a state that predated the final committed file content.

---

# 7. Behavior-preservation check

All four Slice 1-characterized behaviors are **unchanged**, confirmed by the unmodified 20-test characterization suite passing without any edits to the test file itself:

- **Gate-blocked `success: true`:** unchanged -- `executionError` is still only set by "node not found" / "max loop count", still not set by gate blocks. Verified by the safety/policy/confidence/cost block tests, all still green.
- **Unused `require_human_approval`:** unchanged -- still zero runtime references (re-confirmed by grep, both directly and via AGY's independent pass, §8). The field's *type* moved location but its *enforcement status* (none) did not change.
- **Verdict shape:** unchanged -- `GateVerdict`'s fields, optionality, and per-gate population rules (`score`/`metadata` only on `llm`-node confidence verdicts) are identical; the type is now imported rather than locally declared, but the runtime object literals that populate `GateVerdict` in `main.ts` were not touched at all.
- **Blocked-event sequence:** unchanged -- `node_start` → `gate_blocked` → `error`, no `node_done` for a blocked node. Not touched.

---

# 8. GitNexus vs direct-read evidence

**Indexed files verified via GitNexus (`.184`, reindexed to `HEAD=88e70aed` before this slice began, confirmed via `lastCommit` HTTP check):**
- `impact` query on `DrakonHarnessSpec` (`src/lib/harness/harness-spec.ts`): **11 upstream consumers, LOW risk**, direct importers `src/hooks/usePipelineExecution.ts` and `src/lib/harness/pipeline-client.ts`, full depth-1/2/3 list captured and used to size the "11 indirect consumers, zero touched" claim in §5.
- `impact` query on `GateVerdict` (`src/lib/harness/pipeline-client.ts`, run in a prior session pass, re-confirmed still valid since neither file had changed): 12 upstream, LOW risk.
- Read `src/lib/harness/harness-spec.ts` and `src/lib/harness/pipeline-client.ts` directly (content, not just GitNexus metadata) to build the exact re-export edits.

**Service files verified by direct read (GitNexus cannot see `/services/`, per `.gitnexusignore`):**
- `services/deterministic-engine/src/main.ts` (full file, 409 lines) -- read directly, edited directly, re-read to confirm the diff.
- `services/deterministic-engine/package.json`, `tsconfig.json` -- read directly (unchanged this slice beyond the new `dependencies` entry).
- `require_human_approval` grep -- run directly on `.184`'s checkout (`grep -c`, result: 1, the type declaration only) **and** independently by AGY `.234` on its own checkout (same result, same conclusion) -- no disagreement.

**AGY `.234` delegation, and re-verification:** delegated the full field-by-field comparison table (Step 1 of this slice) to AGY `.234` in `--mode=plan` (read-only, tool-enforced). Its output was cross-checked against: (a) my own direct reads of both `harness-spec.ts` and `main.ts`, (b) an independent `grep -c 'require_human_approval'` run directly on `.184`, and (c) an independent `grep -rl 'HarnessSpec\|GateVerdict' services/` run directly on `.184` confirming AGY's "no other service defines these types" claim. All three checks matched AGY's report exactly -- no `.184`-vs-`.234` disagreement occurred, so rule 5 (".184 wins on disagreement") was never invoked.

**Important impact finding:** `validateHarnessSpec` still has 0 upstream callers (GitNexus `impact`, checked in a prior pass and structurally unaffected by this slice since the function itself was not moved) -- confirms constraint 5 ("do not wire validateHarnessSpec into runtime yet") was not violated, and that this remains true after the slice, not just before it.

---

# 9. Commit and branch state

| Fact | Value |
|---|---|
| Commit hash (Slice 2) | `47bc478c4c6123bf6cca529949fccde50b4d4bce` |
| Commit message | `refactor(harness-contract): extract shared harness types` |
| Preceding hygiene commit | `a447790f` -- `chore(deps): update pnpm-lock.yaml for vitest devDependency added in 88e70aed` (Slice 1 residual, see §2) |
| Push status | Both commits pushed to `origin/phase0-stabilize`; independently confirmed via `git ls-remote` from `.184` after each push |
| Branch | `phase0-stabilize` |
| Exact changed files (Slice 2 commit only) | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `packages/harness-contract/{src/index.ts,README.md}`, `services/deterministic-engine/{package.json,src/main.ts}`, `src/lib/harness/{harness-spec.ts,pipeline-client.ts}` -- 9 files |
| Working tree after commit | Not fully clean -- same pre-existing CRLF noise, `routeTree.gen.ts` auto-regeneration, and unrelated untracked files noted in §2 remain, none staged or committed |
| Note on a real snag hit mid-slice | Editing `package.json`/`services/deterministic-engine/package.json` via a Node script changed root `package.json`'s file mode from `100755` to `100644` (visible in the commit as a mode-change line) -- an artifact of `fs.writeFileSync` not preserving the original executable bit. Harmless on Windows/NTFS where this bit is largely vestigial; noted here rather than silently left unexplained. |
| Note on `allowBuilds` scaffold | `pnpm-workspace.yaml`'s `allowBuilds` block (unrelated pnpm auto-write, see §2) reappeared a second time after a `pnpm install` run during this slice's own validation cycle. It was stripped again immediately before the final commit, without re-running `pnpm install` afterward (confirmed the existing `node_modules/@ai-drakon/harness-contract` symlink was still intact from the prior install, so no re-validation of linking was needed) -- all four validation commands in §6 were re-run against this exact final, clean file content. |

---

# 10. Recommendation for Slice 3

**Create `packages/policy-engine`.**

Reasoning: the contract boundary now exists and is proven stable (types extracted, all consumers compiling, characterization suite untouched and green). The next highest-value, still-boundable slice is extracting the four-gate evaluator loop itself out of `services/deterministic-engine/src/main.ts` into `packages/policy-engine`, now that it has both (a) a shared type it can depend on without re-declaring, and (b) a 20-test characterization suite that will catch any accidental behavior drift during the extraction -- exactly the safety net this two-slice sequence was built to produce. The IR-validator reconciliation is a reasonable alternative, but the policy-engine extraction is more directly enabled by what Slice 2 just finished (a contract to import) and is explicitly named as the next step in the boundary inventory's own sequencing.

Not started in this run, per instructions.
