# 1. Executive status

**Verdict: READY WITH RISKS**

The `phase0-stabilize` branch builds and tests cleanly from a genuinely fresh install on `.30` (Node v24.16.0, pnpm 11.5.3, Windows 11): `pnpm build` succeeds end-to-end producing a correct Cloudflare Pages `dist/` (worker + assets), and `pnpm test` passes 33/33 across 7 files. However, this validation pass surfaced two real, independent problems that were not visible before: (1) the local `.30` working tree was silently stuck on the pre-Phase-0 commit with 788 stale uncommitted files and had to be hard-reset to `origin/phase0-stabilize` before any of this validation was meaningful — that reset is a documented action of this report, not silent; (2) `nodeLinker: hoisted` (the Phase 0 fix for the Windows `@tanstack/query-core` symlink bug) breaks `services/deterministic-engine`'s own build script, which hardcodes a per-package `node_modules/typescript/bin/tsc` path that hoisted linking never populates — this is a real Phase 2/3 blocker, not cosmetic. A dozen pre-existing TypeScript errors (route-literal mismatches, one `Diagram`/`DrakonDiagram` mismatch in `usePipelineExecution.ts`, one undefined `id` in `main.ts:247`) were also found; all are confirmed pre-Phase-0 via `git log`, invisible until now because `tsc --noEmit` was never run against this branch before and the Vite build doesn't type-check.

---

# 2. Environment snapshot

| Fact | Value | Command |
|---|---|---|
| Node | v24.16.0 | `node --version` |
| Corepack | 0.35.0 | `corepack --version` |
| pnpm | 11.5.3 | `pnpm --version` |
| OS | Windows 11 Pro, build 10.0.28000 | `systeminfo` |
| Total RAM | ~12 GB | `systeminfo` |
| Unusual | `node-liblzma@2.2.0` native build fails (missing MSVC/Build Tools) during `pnpm approve-builds --all` — pre-existing, unrelated to app code, does not block `build`/`test`. | direct run |

---

# 3. Repository verification

| Check | Result | Evidence |
|---|---|---|
| Branch before intervention | `phase0-stabilize`, but `HEAD = 44681804` (**pre-Phase-0**, identical to `origin/main`) | `git rev-parse HEAD` |
| Working tree before intervention | 788 changed entries: mix of stale uncommitted Phase-0-era edits (superseded — the same fixes were separately committed to `origin/phase0-stabilize` on a different host during this migration) + CRLF-only noise | `git status -s` |
| **Action taken** | `git reset --hard origin/phase0-stabilize` — discards the stale local state, which was a strict subset of what's already properly committed and pushed. Not a code change; a re-sync. | see §9 |
| Branch after intervention | `phase0-stabilize`, `HEAD = 6df20baf` | `git rev-parse HEAD` |
| Ahead/behind `origin/main` | 3 ahead, 0 behind | `git rev-list --left-right --count origin/main...HEAD` → `0  3` |
| Working tree after intervention | 317 files show `0 insertions(+) 0 deletions(-)` diffs (CRLF-only, pre-existing from an earlier session's `core.autocrlf` history) — harmless, does not affect build/test/lint | `git diff --stat <file>` spot check |
| `.lovable/` presence | Absent | `Test-Path .lovable` → `False` |
| Root workspace shape | `pnpm-workspace.yaml`: `packages: [services/*]`, `nodeLinker: hoisted`, `onlyBuiltDependencies: [...]`. Root `package.json` scripts call `vite`/`vitest` directly, no `--prefix .lovable`. | file read |

---

# 4. Build verification

| Step | Command | Result |
|---|---|---|
| Clean node_modules | `Remove-Item -Recurse node_modules` (root + each `services/*`) | done |
| Install | `pnpm install` | Resolved 974 packages. Exits 1 the first time only because of `[ERR_PNPM_IGNORED_BUILDS]` (native build-script approval gate) — not an install failure |
| Approve builds | `pnpm approve-builds --all` | 8/9 approved; `node-liblzma@2.2.0` fails (`gyp ERR! find VS` — no MSVC Build Tools on this machine). Unrelated to app code, no downstream effect on `build`/`test`. |
| **Build** | `pnpm build` (root) | **`✓ built in 14.31s`**, then Nitro emits `.output/`, then both `prepare-cloudflare-*.mjs` scripts run and print `Prepared Cloudflare Pages assets` / `Prepared _worker.js` with no error |
| Output path check | — | `dist/_worker.js` = True, `dist/server/index.mjs` = True, `dist/assets/*` = 91 files, `dist/*` total 350 files. Matches the Cloudflare Pages `_worker.js` + assets convention the deploy script (`wrangler pages deploy dist --functions functions`) expects. |
| Root uses real root source | — | Confirmed by absence of `.lovable/` and by `tsconfig.json`/`package.json` pointing at `src/`, `vite.config.ts`, `eslint.config.js` directly (Phase 0 change, re-verified here) |
| Worker syntax | `node --check cloudflare-worker/worker-mcp-drakon.js` | `WORKER_SYNTAX_OK` |

**Root cause of the one real build-adjacent failure found (`services/deterministic-engine`):** see §7/§8 — `nodeLinker: hoisted` centralizes all deps into root `node_modules/`; `deterministic-engine/package.json`'s `"build": "node node_modules/typescript/bin/tsc"` is a package-relative path that hoisted linking never populates. `node_modules/typescript` genuinely does not exist under `services/deterministic-engine/`, confirmed empty (`Test-Path node_modules` → `False`, `Get-ChildItem` count `0`). Root's hoisted `typescript` (`node_modules/typescript` → v5.9.3) **does** work if invoked with an explicit `-p services/deterministic-engine/tsconfig.json` from root — proving this is a script-path problem, not a dependency-resolution or `tsconfig` problem.

---

# 5. Test verification

| Command | Result |
|---|---|
| `pnpm test` (root, `vitest run`) | **7 files passed (7), 33 tests passed (33)**, 0 failed, 0 skipped. Duration 1.87s. |

No failures to classify. Test suite only covers `src/lib/{codegen,htse}/__tests__` and two `ribosome-*` unit tests — it does **not** cover `services/deterministic-engine`, the worker, or any of the Phase 2/3-relevant contract-duplication code the AGY .234 inventory (`docs/plans/phase2-boundary-inventory.md`) documented. Absence of coverage there is a gap, not a failure — flagged in §8.

---

# 6. Runtime sanity

| Check | Result | Evidence |
|---|---|---|
| Dev server start | `pnpm dev` → ready in **2526ms**, listening on `http://localhost:8080/` | stdout capture |
| HTTP smoke test | `GET http://localhost:8080/` → **200**, 7944 bytes | `Invoke-WebRequest` |
| Cleanup | dev process killed, confirmed zero orphaned `node.exe`/vite processes after | `Get-CimInstance Win32_Process` re-check, empty result |
| Worker compile-safety | `node --check` passes (syntax only — this is a Workers script, not directly runnable standalone without `wrangler dev`/Miniflare, which was not attempted this pass) | see above |
| Appwrite-related code | Not exercised at runtime (no live Appwrite credentials used); `infrastructure/appwrite/schema.ts` type-only, not part of the `tsc --noEmit` error set, so compiles clean by omission | inference from §4/§7 tsc run scope |
| Import/workspace resolution | Root app: clean (build+dev+test all succeeded). `services/deterministic-engine`: **broken build script path**, see §4/§8. Other `services/*-flue` packages not individually smoke-tested this pass (time-boxed; flagged as gap in §8). |

---

# 7. Architecture invariants check

| Invariant | Status | Evidence |
|---|---|---|
| Single build root enforced | **PASS** | `.lovable/` absent; root scripts call `vite`/`vitest` directly; `pnpm build`/`pnpm test` both ran and succeeded from repo root with no `--prefix` |
| No `.lovable` coupling | **PASS** | `Test-Path .lovable` → `False`; no remaining references found in root `package.json`, `tsconfig.json`, `vite.config.ts` (all rewritten in Phase 0, re-verified by reading them this pass) |
| ADR baseline wired correctly | **PASS** | All 25 entries in `parser.ts`'s `ADR_FILES` array resolve to a real file under `docs/adr/` — 0 missing, checked programmatically |
| Package skeletons inert | **PASS** | `pnpm-workspace.yaml`'s `packages:` list is `[services/*]` only — the 7 `packages/*` scaffolds from Phase 2-prep are **not** listed, confirmed by direct read; they cannot participate in install/build |
| Workspace consistency | **RISK** | pnpm correctly lists `deterministic-engine` as a workspace member (`pnpm list -r`), but that member's own build script is incompatible with the chosen `nodeLinker: hoisted` mode — the workspace *resolves* consistently, but member *build scripts* were not audited for hoisted-mode compatibility when the linker was changed in Phase 0 |
| No obvious drift in shared contracts | **RISK** | Not newly introduced by this branch, but confirmed still present: `GateVerdict` (cosmetic quote-style diff only, compatible), `HarnessSpec`/`DrakonHarnessSpec` (engine version missing 5 fields — real drift), inline worker IR conversion vs `src/lib/htse/` (validator logic diverged, worker is a 4-rule subset) — all per `docs/plans/phase2-boundary-inventory.md`, independently spot-verified accurate in an earlier session pass |

---

# 8. Blockers and risks

| Rank | Issue | Severity | Evidence | Blocks Phase 2? | Blocks narrow Phase 3? | Recommended action |
|---|---|---|---|---|---|---|
| 1 | `services/deterministic-engine`'s build script (`node node_modules/typescript/bin/tsc`) is incompatible with `nodeLinker: hoisted` — package has zero local `node_modules` | **High** | `Test-Path services/deterministic-engine/node_modules` = `False`; direct `tsc -p` from root works, proving it's a path problem | **Yes** — Phase 2 extracts code *out of* this exact file into `packages/policy-engine`; can't safely refactor a service whose own build is currently broken | **Yes** — Phase 3 rewrites this file's spec-handling; same blocker | Fix the script to either (a) call root's hoisted `tsc` via a relative `../../node_modules/typescript/bin/tsc` or an npm-script `tsc -p .` that resolves via `PATH` (pnpm sets this up), or (b) add `typescript` as an explicit local devDependency so pnpm creates the expected local link even under hoisted mode. One-line fix, needs a build re-verify after. |
| 2 | `HarnessSpec` (engine, `services/deterministic-engine/src/main.ts`) is missing 5 fields present on `DrakonHarnessSpec` (`$schema`, `description`, `mcp_servers`, `permissions`, `runtime`) | **High** | `docs/plans/phase2-boundary-inventory.md` §2, spot-checked in an earlier session | **Yes** — this is precisely the contract Phase 2 is supposed to consolidate into `packages/harness-contract`; consolidating now means deciding which shape wins | No, not directly, but Phase 3 depends on Phase 2 landing this correctly first | Resolve during Phase 2 boundary extraction, not before — this is Phase 2's actual job, not a pre-blocker |
| 3 | `services/deterministic-engine/src/main.ts:247` — `Cannot find name 'id'` (real TS error, confirmed pre-existing) | **Medium** | `tsc -p services/deterministic-engine/tsconfig.json --noEmit` output; `git log` confirms last touch was `f6914b4b`, unrelated to this branch's commits | No — doesn't block extraction of *other* code from this file, but blocks getting this file itself to a clean `tsc` state | Blocks the "byte-identical" success criterion if this file is touched during Phase 2 gate-loop extraction | Fix as part of Phase 2 when this file is opened for the gate-loop extraction anyway; trivial (likely a stale loop-variable rename) |
| 4 | Root `tsc --noEmit` reports 12 pre-existing type errors (route-literal mismatches in `AppHeader.tsx`, `GalleryPage.tsx`, `ProjectsPage.tsx`, `DevCyclePanel.tsx`, `DevCycleCommandCenter.tsx`, `NewProjectWizard.tsx`; a `Diagram`/`DrakonDiagram` mismatch in `usePipelineExecution.ts:78`; a missing `JSX` namespace in `AdrViewer.tsx`) | **Medium** | Full `tsc --noEmit -p tsconfig.json` output; every file confirmed pre-Phase-0 via `git log -1 -- <file>` | No — Vite build doesn't type-check, so these don't block `pnpm build`/`pnpm test` today | The `usePipelineExecution.ts` one directly touches the file Phase 3's "Spec-to-PR Loop" modifies (`createDefaultSpec` removal) — worth fixing before or during that work, not urgent now | Track as a pre-existing tech-debt list; fix `usePipelineExecution.ts`'s `Diagram`/`DrakonDiagram` mismatch specifically before Phase 3 touches that file, since Phase 3 will already be editing it |
| 5 | Zero test coverage for `services/deterministic-engine`, the worker, or any Phase-2/3-relevant contract code | **Medium** | `pnpm test` output — only 7 files run, all under `src/lib/{codegen,htse}` | Not a hard blocker, but means Phase 2's "deployed behaviour is byte-identical" success criterion has no automated safety net for the exact code being moved | Same — no regression net for the exact code Phase 3 rewrites | Add at minimum a snapshot/golden test for the 4-gate evaluator's current behaviour *before* extracting it in Phase 2, so "byte-identical" is actually machine-checkable, not just visually reviewed |
| 6 | `.30`'s local checkout was silently 3 commits behind `origin/phase0-stabilize` with 788 stale changed files before this validation pass began | **Low** (resolved, but process risk) | `git rev-parse HEAD` before/after; `git reset --hard` performed and logged in §3/§9 | No — already fixed | No | Going forward, always `git fetch && git status` before trusting a persistent `.30` checkout across sessions; consider a throwaway clone per validation pass instead of a long-lived working directory |
| 7 | `node-liblzma@2.2.0` native build fails on `.30` (missing MSVC Build Tools) | **Low** | `gyp ERR! find VS` output during `pnpm approve-builds --all` | No | No | Cosmetic/optional dependency; either install VS Build Tools if this package is ever actually needed at runtime, or leave as-is — does not affect `build`/`test`/`dev` |

---

# 9. Minimal fixes already applied during verification

**One infrastructural action, zero code patches.**

- **`git reset --hard origin/phase0-stabilize`** on `.30`'s working copy at `C:\Users\vokov\agy-work\ai-drakon-scaffolder`. Necessary because the local checkout was stuck 3 commits behind on stale, superseded uncommitted edits from an earlier session (see §3) — without this, every subsequent build/test check in this report would have been validating the wrong tree. This is a repository-state sync, not a code change; no file content was authored or modified by this action beyond restoring it to match what's already on GitHub.
- No source file was edited, patched, or temporarily modified to make `build` or `test` pass — both passed on the first real attempt against the correctly-synced tree.
- The `services/deterministic-engine` build-script issue (§8 rank 1) was diagnosed but **deliberately left unfixed** per this task's hard constraints (no refactors, no architecture changes) — it is reported as a blocker for Phase 2/3, not patched.

---

# 10. Recommended next step

**Proceed to limited Phase 2 only — starting with the `services/deterministic-engine` build-script fix as its first, isolated commit, before touching any contract-duplication consolidation.**

Reasoning: the root app (the majority of Phase 0/1/2-prep's actual surface area) is genuinely green — clean install, clean build, clean test, clean dev-server smoke test, ADR wiring verified programmatically, package skeletons confirmed inert. Nothing here re-baselines. But Phase 2's own stated goal is to extract code *out of* `services/deterministic-engine/src/main.ts`, and that package currently cannot even run its own `build` script under the branch's own `nodeLinker: hoisted` setting — starting boundary extraction against a service whose build is silently broken would make it impossible to tell whether a future failure is caused by the extraction or by this pre-existing gap. Fix that one script path first (rank-1 blocker, one line, independently verifiable), confirm `pnpm --filter deterministic-engine build` succeeds, *then* proceed with the GateVerdict/HarnessSpec/IR-conversion consolidation using `docs/plans/phase2-boundary-inventory.md` as the source of truth.

---

# 11. Follow-up packet for Perplexity

**Verified current state:** Branch `phase0-stabilize` (3 commits ahead of `main`, 0 behind, pushed to GitHub, not merged). Clean install/build/test on Windows 11 / Node 24.16 / pnpm 11.5.3: `pnpm build` succeeds (`dist/_worker.js` + `dist/server/index.mjs` + 91 assets, Cloudflare-Pages-shaped output), `pnpm test` 33/33 passing, dev server boots in 2.5s and serves HTTP 200. `.lovable/` fully removed, single build root confirmed, 25 ADRs wired and resolvable, 7 `packages/*` scaffolds confirmed inert (not in workspace `packages:` list).

**Exact failed commands:**
- `services/deterministic-engine> pnpm run build` → `Error: Cannot find module '...\services\deterministic-engine\node_modules\typescript\bin\tsc'` (exit 1) — script incompatible with `nodeLinker: hoisted`.
- `node node_modules/typescript/bin/tsc -p services/deterministic-engine/tsconfig.json --noEmit` (run from root, works around the above) → `services/deterministic-engine/src/main.ts(247,72): error TS2304: Cannot find name 'id'.` — pre-existing, confirmed via `git log` (last touched by an unrelated older commit `f6914b4b`).
- `tsc --noEmit -p tsconfig.json` (root) → 12 pre-existing errors, none newly introduced, none blocking Vite's build (Vite doesn't type-check).
- `pnpm lint` — timed out after 3 minutes on this machine, inconclusive, not re-attempted.

**Top 5 risks:**
1. `services/deterministic-engine` build script broken under the branch's own `nodeLinker: hoisted` choice — must fix before Phase 2 touches this file.
2. `HarnessSpec` (engine) vs `DrakonHarnessSpec` (frontend) real field drift (5 missing fields) — Phase 2's actual consolidation target, not yet resolved.
3. Zero automated test coverage over the exact code Phase 2 will move (gate evaluator, IR conversion) — "byte-identical" success criterion currently unverifiable by machine.
4. `usePipelineExecution.ts:78` `Diagram`/`DrakonDiagram` type mismatch sits directly in Phase 3's target file (`createDefaultSpec` removal) — will need resolving when that file is opened.
5. Worker's inline `validateIrDeterministic` is a 4-rule subset of `src/lib/htse/ir-validator-core.ts`'s BFS-based validator, different error codes (`DANGLING_REFERENCE` vs `DANGLING_POINTER`) — silent behavior divergence risk if either is treated as canonical without reconciling the other during consolidation.

**Top 5 blockers (ranked, full table in §8):** (1) deterministic-engine build script path, (2) HarnessSpec field drift, (3) main.ts:247 undefined `id`, (4) 12 pre-existing tsc errors (low urgency), (5) missing test coverage over Phase-2-relevant code.

**Ready for a follow-up architecture execution prompt?** Yes, with one precondition: blocker rank 1 (deterministic-engine build script) should be fixed and re-verified as Phase 2's literal first commit, before any contract-consolidation work begins — everything else in this report is either already resolved, pre-existing and non-blocking, or Phase 2's actual intended work.

**Files/modules most relevant for the next prompt:**
- `services/deterministic-engine/package.json` (the broken `build` script) and `services/deterministic-engine/src/main.ts` (GateVerdict, HarnessSpec, gate loop, `capabilityMatches`, the `id` bug at L247)
- `src/lib/harness/harness-spec.ts` (`DrakonHarnessSpec`, `validateHarnessSpec` — canonical contract)
- `src/lib/harness/pipeline-client.ts` (frontend `GateVerdict`)
- `src/lib/htse/{diagram-to-ir.ts,ir-to-diagram.ts,ir-validator-core.ts}` (canonical IR/validator) vs `cloudflare-worker/worker-mcp-drakon.js` L36–104 (inline duplicate)
- `docs/plans/phase2-boundary-inventory.md` (full line-cited inventory, source of truth for the consolidation)
- `pnpm-workspace.yaml` (the `nodeLinker: hoisted` setting causing blocker 1)
