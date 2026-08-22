# Phase 2 Slice 5 — UI Architecture Visibility Integration

**Date:** 2026-08-21
**Branch:** `phase0-stabilize`
**Base commit:** `c0d68e9a`
**Scope:** integrate validator provenance / canonical-vs-worker compatibility visibility into the existing frontend. No redesign, no new UI framework, no validator/gate logic changes.

## 1. Inspection phase (before editing)

Per the coordinator's mandatory inspection-before-editing requirement, this phase was fully delegated to AGY (`192.168.3.234`, `~/.local/bin/agy --mode=plan`, read-only) after GitNexus was force-reindexed to fresh (commit `92381ef`, confirmed via a direct `validateIrDeterministic` cypher query returning correct line ranges in both `ir-validator-core.ts` and `worker-mcp-drakon.js`). AGY's inventory (independently cross-verified by direct reads of `ValidationPanel.tsx` and `ir-validator-client.ts`, zero drift found) established:

1. **Shell/layout:** `WorkspaceShell` (`src/components/workspace/WorkspaceShell.tsx`) composes `AstryxHeader`, `AstryxSideNav`, and renders `<main>{children}</main>` inside `RootProviders` (`src/routes/__root.tsx`). A new full page needs only a route file in `src/routes/`.
2. **Routes:** TanStack file-based routing, `src/routeTree.gen.ts` generated, `trace.tsx` is the canonical Astryx-migrated example (`bg-[var(--astryx-surface-page)]`, `astryx-button`, `data-testid`/`data-variant`/`data-size` conventions).
3. **HTSE validation surfaces:** `ir-validator-client.ts` (`validateIrRemote`, worker-only), `useDiagramStore.ts:134` (`pushEdit` calls `validateIrRemote`), `ValidationPanel.tsx` (worker-only `runValidation`, existing autofixes UI, `issue.code` rendering) — all confirmed matching Slice 4's report with zero drift.
4. **Execution/trace surfaces:** `/trace`, `/pipelines`, `PipelineDrakonView`, `GateIndicators`, `EvidenceDrawer` — gate verdicts rendered per-node, no existing per-event provenance/attribution concept.
5. **Sheet primitive:** `src/components/ui/sheet.tsx` (Radix-backed), already imported and used twice in `WorkspaceShell` (mobile nav, agent chat drawer).
6. **System/dev pages:** `astryx-nav-config.ts`'s `section: "system"` already has `agents`, `settings`, `sync` entries with a `headerVisible` convention.
7. **Nav config:** `ASTRYX_NAV_ITEMS: AstryxNavItem[]` in `astryx-nav-config.ts`.
8. **Adapter need:** confirmed — `ValidationPanel.tsx` only ever calls the remote/worker validator; the canonical local validator is never invoked side-by-side. A small pure adapter is required to compute compatibility.

Full AGY report: see session output, cross-verified point-by-point above; no disagreements arose between AGY's findings and independent direct reads (the delegation-then-reverify pattern required no escalation this slice).

A parallel Oracle Opus session was launched for the same adapter-drafting sub-task but hit its account session limit before producing output (`EXIT=1`, 0 tokens, resets 13:20 Europe/Zurich) — the utility below was written directly instead, using the same ground truth (AGY's inventory + direct reads + Slice 4's already-documented type shapes), so no work was lost or blocked on this.

## 2. Implementation inventory (written before coding)

**Files touched:**
- `src/lib/htse/validator-compatibility.ts` (new) — why: pure, side-effect-free comparison logic needs its own file per the "small pure helper" finding in inspection point 8; keeps `ValidationPanel.tsx`'s diff to wiring only.
- `src/lib/htse/__tests__/validator-compatibility.test.ts` (new) — why: focused unit coverage for the new pure function, matching the repo's established `__tests__` convention.
- `src/components/htse/ValidationPanel.tsx` (modified, additive only) — why: it is the existing validation result surface (inspection point 3); reusing it satisfies "reuse existing validation result surfaces if possible" and avoids inventing a new drawer/modal system for this pass.

**Untouched, deliberately:**
- `src/lib/htse/ir-validator-core.ts`, `ir-validator-client.ts`, `cloudflare-worker/worker-mcp-drakon.js` — no validator/gate logic changes (explicit non-goal).
- `packages/harness-contract`, `packages/policy-engine` — no semantic changes.
- Execution/trace surfaces (`PipelineDrakonView`, `GateIndicators`, `EvidenceDrawer`) — provenance chips there are explicitly lower priority; deferred (see §5).
- Architecture & Runtime Boundaries page, developer-only status page — deferred (see §5); building them was not needed to ship the highest-value surface, per "prefer shipping the provenance/visibility layer over trying to complete every idea."
- `src/routeTree.gen.ts` — touched again by `pnpm build` (same pre-existing staleness as Slice 4); reverted, not part of this diff.
- `astryx-nav-config.ts` — no new route means no nav entry needed this slice.

**Risks considered:**
- Running canonical validation client-side alongside every remote call: negligible cost (pure sync JS, no network), only on the existing 3s-debounced trigger — no new perf surface.
- Client (`ir-validator-client.ts`) and canonical (`ir-validator-core.ts`) `ValidationResult` types are separately declared (not shared) but structurally identical (confirmed by direct read of both files) — TypeScript structural typing accepts one where the other is expected with no cast; `tsc --noEmit` confirms this compiles cleanly.
- `ValidationPanel.tsx` does not use Astryx page-level token classes (it's a small embedded panel using plain shadcn `Badge`/`Button`, not `astryx-button`/`astryx-badge`) — the new badge matches the file's own existing local convention (`Badge variant=...`) rather than importing page-level Astryx classes into an embedded component, for internal consistency; `data-testid`/`data-variant` were still added per the repo-wide semantic-selector convention.

**Diff minimality:** 2 new files (one pure function ~65 lines, one test file), one existing file touched with 3 small additive edits (imports, one state hook, 3 lines in `runValidation`, one new conditional badge block) — no existing logic branches removed or restructured.

## 3. What ships in this slice

`ValidationPanel.tsx`'s existing validate cycle now also runs the canonical validator (`validateIrDeterministic` from `ir-validator-core.ts`) on the same IR used for the remote/worker call, and classifies the relationship via the new `compareValidationResults` utility into one of three states:

- **compatible** — `valid` agrees and issue sets match exactly.
- **adapted** — `valid` agrees, only non-error-level (warning) issues differ.
- **divergent** — `valid` disagrees, or an error-severity issue is present on one side and not the other.

A compact badge (`data-testid="validator-compat-badge"`, `data-variant={state}`) renders next to the existing error/warning count badges in the panel's trigger button, with a native `title` tooltip giving a one-line explanation and, for adapted/divergent, the count of issues only-in-canonical / only-in-worker. This directly answers the UX requirements: which validator produced the result (worker/runtime, stated in the tooltip), whether it's compatible/adapted/divergent, without adding a new page, route, or modal system.

## 4. Validation

| Check | Result |
|---|---|
| `validator-compatibility.test.ts` (direct) | 8/8 passed |
| `pnpm test` (root, full repo) | 93/93 passed across 11 files (new test auto-discovered; all 4 prior slices' suites unchanged) |
| `pnpm build` (root) | succeeded |
| `npx tsc --noEmit` | 14 pre-existing errors — **confirmed byte-identical with and without this slice's `ValidationPanel.tsx` change** (verified by stashing the change and re-running tsc); one of the 14 (`src/routes/adr.tsx`) wasn't listed in Slice 4's baseline but is confirmed pre-existing here too (same stale-`routeTree.gen.ts` root cause), not new work |

## 5. Deferred follow-up (explicit, not attempted here)

- Provenance chips in `/trace`, `/pipelines`, `PipelineDrakonView` gate-verdict rendering (plan §2 item 2 / priority 2's execution-surface half).
- Architecture & Runtime Boundaries read-only page (`/system/boundaries`) explaining `packages/harness-contract` and `packages/policy-engine` (plan §2 item 3 / priority 3).
- Developer-only status page (plan §2 item 5 / priority 4), including a developer-mode gating flag — no such flag currently exists in the repo; would need the smallest-viable settings-based toggle per the coordinator's own fallback guidance.
- The stale `src/routeTree.gen.ts` (pre-existing since at least Slice 4, root cause of most of the 14 tsc errors) — recommend a small, separate slice to regenerate and commit it.
- `services/drakon-agent-flue/lib/ir-validator.ts`'s fourth validator flavor (found by the earlier parallel Oracle UI-plan session, not touched by Slice 4 or 5) remains unreconciled.

## 6. GitNexus

Reindexed on `.184` (`analyze --force --wal-checkpoint-threshold 67108864`) before AGY's inspection phase, confirmed fresh via direct cypher query. Not re-reindexed after this slice's commit within this report (should be re-run post-push per the standing "reindex after every push" rule); the next session/agent touching this repo should verify `list`'s `Commit` field matches HEAD before relying on query results.
