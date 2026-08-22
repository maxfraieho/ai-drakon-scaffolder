# Phase 2 Slice 7 — Regenerate TanStack Route Tree

**Date:** 2026-08-21
**Branch:** `phase0-stabilize`
**Base commit:** `b8d98506` (task coordinator's stated base, `5f6c3c2e`, was 2 commits stale — verified real HEAD directly rather than trusting the prompt)

## 1. GitNexus freshness

Verified fresh at `b8d98506` via direct content query (not `list`, which showed the same known stale display-only commit hash `92381ef` as every prior slice): the current-state report's exact latest heading ("What's built (Phase 2, Slices 1-6b)") was present in the graph. No reindex needed — GitNexus had self-healed since the last session's failures (see `feedback_gitnexus_wal_instability` in ai-memory for the full incident history).

## 2. AGY `.234` inspection — incomplete, host resource exhaustion

AGY's inspection did not complete: it started running `npx tsc --noEmit` on `.234` (897MB RAM, weak hardware) to compare generator output, and the session timed out internally (`Error: timeout waiting for response`, `EXIT=1`) partway through. `.234` became unreachable to new SSH connections during this ("Connection timed out during banner exchange") — the host was resource-starved by its own inspection task, not by anything external. Did not retry (would likely repeat the same resource exhaustion) — proceeded on independently-verified evidence instead (see §3).

## 3. Why AGY wasn't strictly needed here

This session has empirically observed the exact same fact AGY was trying to confirm, repeatedly and consistently, across every prior slice this session (Slices 4, 5, 6, 6b, plus the post-Slice-5 fix — 6+ independent observations): a plain `pnpm build` on `.30` regenerates `src/routeTree.gen.ts` with an identical-sized diff (368 insertions / 347 deletions) every single time, and it was reverted each time to keep those slices' diffs focused. That is more than enough repeated, consistent, directly-observed evidence (not a guess, not a single anecdote) to proceed without re-running AGY's check.

## 4. Implementation

Ran `pnpm build` on `.30` (clean baseline first: `git checkout -- src/routeTree.gen.ts`), then staged only the regenerated `src/routeTree.gen.ts` — no manual edits to its content.

## 5. Important correction to a claim repeated in every prior slice report this session

**Every prior Phase 2 slice report (4, 5, 6, 6b) stated that the stale `routeTree.gen.ts` was "the root cause of most of the 13 pre-existing `tsc --noEmit` errors."** This was never actually verified — it was an assumption, repeated forward from slice to slice without re-checking. **It was wrong.**

With the freshly regenerated `routeTree.gen.ts` in place, `tsc --noEmit` produces the **exact same 13 errors, in the same files, at the same line numbers**, as before regeneration. Checked directly: both `/docs` and `/project/new` (the two route paths named in the error messages) are genuinely present in the fresh `routeTree.gen.ts`'s type union.

The real cause, on inspection of the actual error text: these are call sites using **stale or incorrect route references in application code**, not a stale generated file:
- `/docs` is now a *nested* route (`/p/$slug/docs`, a child of the project-scoped `/p/$slug` route), but `AppHeader.tsx`, `DevCycleCommandCenter.tsx`, `DevCyclePanel.tsx`, and `GalleryPage.tsx` still pass the bare top-level literal `"/docs"` — a genuine mismatch between the current route structure and code that was never updated when `/docs` was nested.
- `/project/new` errors are a different shape entirely (`Property 'search' is missing in type ...`) — that route now requires search params the calling code (`ProjectSelector.tsx`, `ProjectsPage.tsx`) isn't providing.
- The remaining errors (`AdrViewer.tsx`'s missing `JSX` namespace, `NewProjectWizard.tsx`'s type mismatch, `usePipelineExecution.ts`'s `Diagram`/`DrakonDiagram` mismatch) are unrelated to routing entirely.

**None of these are fixable by regenerating the route tree.** They are real, separate application-code bugs requiring per-call-site fixes — explicitly out of scope for this slice (routing-drift hygiene only, no UI/component code changes) and out of scope for a "small, isolated" slice generally, given the number of distinct call sites involved.

## 6. Validation

| Check | Result |
|---|---|
| `pnpm test` | 99/99 passed across 12 files, no regressions |
| `pnpm build` | succeeds (this slice's own regeneration step) |
| `npx tsc --noEmit` | 13 errors, unchanged from before this slice — confirmed these are pre-existing application-code issues, not generator staleness |

## 7. Files touched

Only `src/routeTree.gen.ts` (regenerated, not hand-edited).

## 8. Follow-up recommendation

The 13 `tsc --noEmit` errors need their own slice(s) to actually reduce, scoped as real application-code fixes, not route-generation hygiene:
- Update `AppHeader.tsx`, `DevCycleCommandCenter.tsx`, `DevCyclePanel.tsx`, `GalleryPage.tsx` to use the correct nested `/p/$slug/docs` path (or equivalent relative navigation) instead of the stale bare `/docs`.
- Update `ProjectSelector.tsx`, `ProjectsPage.tsx` to supply whatever `search` params `/project/new` now requires.
- `AdrViewer.tsx`, `NewProjectWizard.tsx`, `usePipelineExecution.ts` are unrelated, pre-existing, separate issues.

This should be flagged to the architect for prioritization — it's real type-safety debt, not the "cheap, one-slice cleanup" every prior report (including the plan this task itself was based on) assumed it was.
