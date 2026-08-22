# Phase 2 Slice 8 — Route Contract Migration

**Date:** 2026-08-22
**Branch:** `phase0-stabilize`
**Base commit:** `52eb6685`

## 1. Mandatory first phase

- Branch/HEAD confirmed on `.184`: `phase0-stabilize` @ `52eb6685` (one commit behind, pulled first).
- Working tree: only the known auto-managed GitNexus SKILL.md/CLAUDE.md drift + an unrelated `services/architect-agent-flue`/`drakon-agent-flue` untracked dir (not mine, untouched).
- **Baseline `tsc --noEmit` captured before any edit** — 13 errors, categorized:
  - **10 route-related** (in scope): `AppHeader.tsx:117,179`, `DevCycleCommandCenter.tsx:120`, `DevCyclePanel.tsx:62`, `GalleryPage.tsx:100,120`, `PipelineEditorPage.tsx:306`, `ProjectSelector.tsx:338`, `ProjectsPage.tsx:176,200`.
  - **3 non-route** (out of scope, untouched): `AdrViewer.tsx:69` (JSX namespace), `NewProjectWizard.tsx:148` (unrelated type), `usePipelineExecution.ts:78` (`Diagram`/`DrakonDiagram` mismatch).

## 2. GitNexus freshness — real infrastructure incident this slice

Initial check found the graph genuinely stale (missing Slice 7 content). Reindexing repeatedly hit the "replay shadow pages under read-only mode" failure — confirmed via a corrected exit-code-capture method (a `cmd | tail; echo $?` pattern in this session's own verification habit had been masking `tail`'s exit code as the real command's; fixed going forward). `docker restart` and `analyze --force` alone did **not** fix it, even combined, across 3 separate retries. The actual fix: `clean --lbug-sidecars --force` (a targeted GitNexus subcommand, distinct from `analyze --force`'s own inline cleanup) — found 8 accumulated quarantined WAL sidecar files (not just the 2 `analyze` was removing on its own), deleted them, and `analyze --force` then completed cleanly (`REAL_EXIT=0`, full index, direct query confirmed fresh). Both fixes recorded in ai-memory for future incidents.

## 3. AGY `.234` inspection — did not complete (host constraint, not a blocker)

AGY's own inspection plan included running `tsc --noEmit` on its own 897MB-RAM host to independently verify the error list; this timed out internally both times it was attempted this session (Slice 7 and Slice 8), and the host briefly refused new SSH connections under its own load. Given the baseline `tsc` output was already captured directly on a real build host (`.30`) beforehand, this did not block progress — proceeded by reading the 7 offending files directly myself, cross-checking each against its actual current route file (`src/routes/*.tsx`) rather than delegating that reading to AGY. Recorded as a standing constraint in ai-memory: never ask this AGY instance to run `tsc` itself; hand it a pre-captured baseline instead.

## 4. Root-cause findings per offending route (verified by reading the actual route files, not assumed)

- **`/docs`**: no longer a top-level route. The only route is `/p/$slug/docs` (`src/routes/p.$slug.docs.tsx`), project-scoped, requires a `slug` param.
- **`/project/new`**: `src/routes/project.new.tsx` declares `validateSearch: (search) => ({ template: search.template as string | undefined })` — because the returned object always has a `template` key (even if its value is `undefined`), TanStack Router treats `search` as a required prop on `Link`/`navigate`, not optional. Passing `search={{ template: undefined }}` satisfies it.
- **`/s/${item.id}`** (GalleryPage.tsx): the real route is `/s/$slug` (`src/routes/s.$slug.tsx`), param name `slug`, not `id`.
- **`/pitch/${config.name}`** (PipelineEditorPage.tsx): the real route is `/pitch/$diagramId` (`src/routes/pitch.$diagramId.tsx`); confirmed `config.name` is semantically the right value (both identify "which pipeline"), not a guess.
- **`ViewRoute` type** (`DevCycleContext.tsx`, consumed by `DevCycleCommandCenter.tsx` and indirectly `DevCyclePanel.tsx`): declared `"/docs"` as a possible value but **zero** `DevStep` in the file ever actually used it (confirmed by grep across the whole 201-line file) — genuinely dead, safe to remove from the type.

## 5. Ambiguous call sites (per the coordinator's own request to flag these, not silently resolve)

- **`AppHeader.tsx`'s global nav "Документація" item** (`{ to: "/docs", ... }` in the top-level `NAV` array): this is the app's global chrome header, with no project `$slug` in scope at that point — there is no single correct project to link to. **Resolved conservatively: removed the nav entry** (and its now-unused `FileText` icon import) rather than inventing a fallback/redirect mechanism (e.g. "last active project" or a project-picker) — that would be new product behavior, out of scope for a route-contract-migration slice.
- **`DevCycleCommandCenter.tsx:120` still fails after this slice — newly surfaced, not newly caused.** Removing `/docs` from the `ViewRoute` union revealed that `"/github"` (also in that same union, and *actively used* by real `DevStep`s, unlike `/docs`) is **also** not a valid route — no `src/routes/*github*` file exists. TypeScript only ever reported one invalid union member at a time, so this was already broken before this slice; fixing `/docs` just unmasked it. Confirmed `/agents` and `/devcycle` (the union's other two members) both do have real route files, so this is isolated to `/github`. **Not fixed here** — the steps using it have `actionText: "Open Repository"`, suggesting a GitHub-file-browser view was intended, but no such standalone route currently exists (`GitHubPanel` is embedded contextually inside `DiagramEditorPage`, not its own route) and inventing a destination would be a product decision, not a mechanical route-contract fix.

## 6. Implementation (7 files)

- `src/components/app/AppHeader.tsx` — removed the `/docs` nav entry + type union member + unused `FileText` import.
- `src/context/DevCycleContext.tsx` — removed dead `"/docs"` from the `ViewRoute` type union.
- `src/components/workspace/DevCyclePanel.tsx` — `openReview()` now branches explicitly: `navigate({ to: "/p/$slug/docs", params: { slug: activeProject.slug } })` when `activeProject.hasDocs`, else `navigate({ to: "/diagrams" })`.
- `src/pages/GalleryPage.tsx` — both `Link`s: `to="/s/$slug" params={{ slug: item.id }}`.
- `src/pages/PipelineEditorPage.tsx` — `to="/pitch/$diagramId" params={{ diagramId: config.name }}`.
- `src/components/workspace/ProjectSelector.tsx` — `Link to="/project/new" search={{ template: undefined }}`.
- `src/pages/ProjectsPage.tsx` — both `navigate` calls: `{ to: "/project/new", search: { template: undefined } }`.

No manual `to` string interpolation left in any touched file — all dynamic segments now go through `params`, all search requirements through `search`, per the coordinator's explicit constraint.

## 7. Validation

| Check | Result |
|---|---|
| `pnpm test` | 99/99 passed across 12 files, no regressions |
| `pnpm build` | succeeds |
| `npx tsc --noEmit` | **9 of 10** route-related errors resolved. Remaining: 3 non-route (unchanged, out of scope) + 1 route-related (`DevCycleCommandCenter.tsx:120`, now failing on `/github` instead of `/docs` — pre-existing, newly surfaced, see §5) |

## 8. Files touched vs. untouched

Touched: the 7 files listed in §6.

Untouched: `src/routeTree.gen.ts` (touched again by local `pnpm build`, same pre-existing behavior as every prior slice — reverted, not part of this diff), `AdrViewer.tsx`, `NewProjectWizard.tsx`, `usePipelineExecution.ts` (the 3 confirmed non-route errors), all route definition files under `src/routes/` (read for evidence, never edited), `packages/*`, `services/deterministic-engine/*`, the worker, all validator files.

## 9. Follow-up recommendations

- **`/github` destination decision** — needs a product call: either restore a standalone `/github` route (repository file browser as its own page) or repoint the two `REFACTORING_STEPS` entries using it to something that exists today (e.g. open `GitHubPanel` within the current diagram editor context). Not mechanical, needs input.
- Recommend re-running `tsc --noEmit` after that decision lands — this slice reduced the *route-contract* error count from 10 to 1, but did not (and was never scoped to) touch the 3 unrelated errors.
