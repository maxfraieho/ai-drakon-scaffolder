# Isolated fix: deterministic-engine tsc resolution under hoisted pnpm linker

**Date:** 2026-08-21
**Branch:** `phase0-stabilize`
**Commit:** `f648d18f` — `fix(deterministic-engine): resolve tsc under hoisted pnpm linker`
**Scope:** Follow-up to blocker rank 1 in `docs/reports/2026-08-21-phase2-validation-pass.md`. Isolated fix only — no Phase 2 contract extraction, no unrelated TypeScript fixes, no root package-manager strategy change.

## Problem

`pnpm-workspace.yaml` sets `nodeLinker: hoisted`, so all dependencies resolve into the root `node_modules/` only. `services/deterministic-engine/package.json`'s build script hardcoded a package-relative path:

```
"build": "node node_modules/typescript/bin/tsc"
```

That path never exists under hoisted linking (`Test-Path services/deterministic-engine/node_modules` → `False`), so `pnpm --filter deterministic-engine build` failed with `Cannot find module '...\node_modules\typescript\bin\tsc'`.

## Fix

One line, `services/deterministic-engine/package.json`:

```diff
- "build": "node node_modules/typescript/bin/tsc",
+ "build": "tsc -p tsconfig.json",
```

Verified root `node_modules/.bin/tsc.cmd` exists (`True`) before applying — under `pnpm run`/`pnpm --filter`, pnpm always prepends the effective `node_modules/.bin` (root's, under hoisted mode) to `PATH`, so a bare `tsc` invocation resolves correctly without any new dependency.

Only `package.json` changed — confirmed via `git diff` and `git status` (all other `M` entries in the working tree are pre-existing CRLF-only noise unrelated to this fix, confirmed in the prior validation report).

## Validation

| Command | Result |
|---|---|
| `pnpm --filter deterministic-engine build` | `tsc` now resolves and runs (script-path blocker gone). Fails only on the already-documented pre-existing bug `main.ts(247,72): TS2304: Cannot find name 'id'` — explicitly out of scope for this task, not touched |
| `pnpm build` (root) | `✓ built in 14.69s`, no regression |
| `pnpm test` (root) | 7 files passed (7), 33 tests passed (33), no regression |

## Commit

```
[phase0-stabilize f648d18f] fix(deterministic-engine): resolve tsc under hoisted pnpm linker
 1 file changed, 1 insertion(+), 1 deletion(-)
```

Pushed to `origin/phase0-stabilize`, confirmed via independent `git ls-remote` from a separate host: `f648d18f4b05896d71750323acd628d1a8b06260 refs/heads/phase0-stabilize`.

## Status

Blocker rank 1 from the Phase 2 validation report is resolved. Remaining pre-existing issues (rank 2–7 in that report — `HarnessSpec` field drift, `main.ts:247` undefined `id`, 12 pre-existing `tsc` errors elsewhere, missing test coverage over Phase-2-relevant code) are unchanged and still apply. Phase 2 (contract consolidation) has not started.
