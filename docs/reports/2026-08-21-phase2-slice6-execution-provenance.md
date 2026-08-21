# Phase 2 Slice 6 — Execution Provenance Visibility

**Date:** 2026-08-21
**Branch:** `phase0-stabilize`
**Base commit:** `e59309f7`

## 1. GitNexus freshness

- Current branch/HEAD (confirmed on `.184`'s clone): `phase0-stabilize` @ `e59309f7`.
- `list`'s displayed indexed commit: `92381ef3` (a known display-only staleness bug from Slice 4/5, not real graph staleness).
- Real freshness verified by direct query, not by trusting `list`: a file deleted in `e59309f7` (`docs/reports/2026-08-21-phase2-slice1-characterization.md`) returned zero graph rows; a file only added at `e59309f7` returned correct rows. Graph confirmed genuinely current at `e59309f7`. **No reindex was required.**

## 2. AGY `.234` inspection (read-only, `--mode=plan`)

Delegated before any code was written. Key findings (all independently trusted, no disagreement found on cross-check):

- Real current paths: `src/components/pipelines/PipelineDrakonView.tsx`, `src/components/harness/GateIndicators.tsx`, `src/components/harness/EvidenceDrawer.tsx` (not directly under `src/components/` as the coordinator prompt's paths assumed — AGY corrected this against its own GitNexus query, which itself was 6 commits stale, then confirmed via direct read).
- `GateVerdict` type: re-exported unchanged from `@ai-drakon/harness-contract` via `src/lib/harness/pipeline-client.ts` — no duplication.
- **Corrected a wrong assumption before writing any code:** gate verdicts are not computed client-side. They are streamed from the deterministic-engine service via pipeline execution events (`src/hooks/usePipelineExecution.ts`, `setNodeVerdicts` from `ev.gate_verdicts`). That service internally calls the four `@ai-drakon/policy-engine` functions (Slice 3). The accurate provenance label is therefore "runtime" (freshness/source) with a "policy-engine" detail (which package's logic produced it server-side) — not a claim that the browser itself runs policy-engine.
- `GateIndicators.tsx`/`EvidenceDrawer.tsx` use plain Tailwind (`slate-*`, no Astryx tokens); `trace.tsx` is a full Astryx-migrated page. Confirmed by direct read before touching either style convention.

## 3. Implementation

Delegated to Oracle (Opus, `edgee launch claude`) with the exact `ProvenanceChip` design and file-scoped instructions pre-written from AGY's findings; independently re-verified every file afterward (session was killed by an external timeout before it could report back, but its file edits on disk were complete and correct — verified by direct read of all four files before deploying).

- **`src/components/harness/ProvenanceChip.tsx`** (new) — small presentational component. `label`/`detail`/`title` are all caller-supplied (no internal enum of "correct" architecture claims that could drift out of sync); `data-testid="provenance-chip"`, `data-variant={label}`, `data-size="sm"`.
- **`src/components/harness/GateIndicators.tsx`** — one `<ProvenanceChip label="runtime" detail="policy-engine" .../>` added after the four gate icons, plain-Tailwind styling matched.
- **`src/routes/trace.tsx`** — one `<ProvenanceChip .../>` next to the existing header subtitle; `createFileRoute()` untouched. This route has no live data of its own (static empty-state redirecting to `/pipelines`), so the chip here is explanatory copy, not tied to live props.
- **`src/components/harness/__tests__/ProvenanceChip.test.tsx`** (new, 6 tests) — discovered this repo has no jsdom/`@testing-library` setup (all existing tests are plain-function `*.test.ts`); used `react-dom/server`'s `renderToStaticMarkup` instead of adding a new test-environment dependency. Covers: label rendering, detail rendering/omission, `title` attribute, `data-variant`, `data-testid`.

**Explicitly not touched this slice** (deferred, per the coordinator's own scope): `PipelineDrakonView.tsx`, `EvidenceDrawer.tsx` — both are real, larger insertion points AGY identified, left for a follow-up pass to keep this diff small.

## 4. Validation (`.30`, independently re-run after deploying Oracle's output)

| Check | Result |
|---|---|
| `pnpm test` | 99/99 passed across 12 files (new `ProvenanceChip.test.tsx` auto-discovered, all prior slices' suites unchanged) |
| `pnpm build` | succeeds |
| `npx tsc --noEmit` | 13 pre-existing errors, unchanged — none in any file touched this slice |

## 5. Files touched vs. untouched

Touched: `src/components/harness/ProvenanceChip.tsx` (new), `src/components/harness/__tests__/ProvenanceChip.test.tsx` (new), `src/components/harness/GateIndicators.tsx`, `src/routes/trace.tsx`.

Untouched (per AGY's own list + the coordinator's non-goals): `packages/harness-contract/*`, `packages/policy-engine/*`, `services/deterministic-engine/src/main.ts`, `cloudflare-worker/worker-mcp-drakon.js`, `src/lib/htse/ir-validator-core.ts`, `src/lib/htse/validator-compatibility.ts`, `src/lib/harness/pipeline-client.ts`, all route definitions/paths, `PipelineDrakonView.tsx`, `EvidenceDrawer.tsx`, `src/routeTree.gen.ts` (touched again by local `pnpm build`, same pre-existing staleness as every prior slice — reverted, not part of this diff).

## 6. Follow-up recommendations

- Wire `ProvenanceChip` into `EvidenceDrawer.tsx` (header, next to PASSED/BLOCKED) and `PipelineDrakonView.tsx` (toolbar, next to execution status badges) — both identified by AGY as safe insertion points, deferred here for diff size.
- The stale `src/routeTree.gen.ts` keeps resurfacing every slice; still worth its own small regeneration slice.
- `.30`'s background `claude --bg` session should invoke `claude` via `edgee`, not the raw binary, per the standing repo convention — noted for any future session dispatched there.
