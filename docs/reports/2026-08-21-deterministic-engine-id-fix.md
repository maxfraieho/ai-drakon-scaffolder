# Isolated fix: undefined `id` in deterministic-engine gate evaluation

**Date:** 2026-08-21
**Branch:** `phase0-stabilize`
**Commit:** `3da3c4b6` — `fix(deterministic-engine): resolve undefined id in gate evaluation`
**Scope:** Follow-up to `f648d18f` (tsc resolution fix, see `2026-08-21-deterministic-engine-tsc-fix.md`). Isolated fix only — no Phase 2 contract extraction, no changes to HarnessSpec, GateVerdict, IR conversion, worker code, or package structure.

## Problem

`pnpm --filter deterministic-engine build` (now reaching the compiler after `f648d18f`) failed with:

```
main.ts(247,72): error TS2304: Cannot find name 'id'.
```

## Investigation

Read the enclosing function (confidence-gate / NotebookLM-bridge block, lines ~190-270). The per-node loop consistently identifies the current node as `currentNodeId` throughout the function (`node_id: currentNodeId`, `` `Executing node '${currentNodeId}' ...` `` at line 168) — no variable named bare `id` is declared anywhere in scope.

`git blame` on both lines confirmed the intended fix with high confidence:
- L168 (`currentNodeId` usage) — commit `a300c6e99`, 2026-06-30 01:13:59, maxfraieho
- L247 (the bug) — commit `f6914b4b3`, 2026-06-30 13:05:35, maxfraieho

Same author, same day, `currentNodeId` established first — the NotebookLM log line added later that day is a straightforward copy/typo, not a sign of a differently-intended variable.

## Fix

One line, `services/deterministic-engine/src/main.ts`:

```diff
- context.log(`[NotebookLM Bridge] Fetching context for node ${id} from notebook ${notebookId}...`);
+ context.log(`[NotebookLM Bridge] Fetching context for node ${currentNodeId} from notebook ${notebookId}...`);
```

No suppression (`any`/`@ts-ignore`/artificial declaration) — the actual intended variable was used, per task constraints.

## Validation

| Command | Result |
|---|---|
| `pnpm --filter deterministic-engine build` | Clean, 0 errors. `dist/main.js` regenerated. |
| `pnpm build` (root) | No regression. |
| `pnpm test` (root) | 7 files passed (7), 33 tests passed (33). No regression. |

Only `services/deterministic-engine/src/main.ts` changed — confirmed via `git diff` (single hunk, one line).

## Commit

```
[phase0-stabilize 3da3c4b6] fix(deterministic-engine): resolve undefined id in gate evaluation
 1 file changed, 1 insertion(+), 1 deletion(-)
```

Pushed to `origin/phase0-stabilize`. Confirmed via independent `git ls-remote` from a separate host: `3da3c4b62a58221d0201e06a25a8c08bdde209bc refs/heads/phase0-stabilize`.

## Status

Blocker rank 1 (`f648d18f`) and this `main.ts:247` item (rank 3 in the original Phase 2 validation report) are both resolved. `services/deterministic-engine` now builds cleanly end-to-end. Remaining pre-existing items from the validation report (`HarnessSpec` field drift vs `DrakonHarnessSpec`, 12 pre-existing root `tsc` errors elsewhere, missing test coverage over Phase-2-relevant code) are unchanged. Phase 2 (contract consolidation) has not started.
