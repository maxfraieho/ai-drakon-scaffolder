# Phase 2 Slice 6b — Complete Execution Provenance Wiring

**Date:** 2026-08-21
**Branch:** `phase0-stabilize`
**Base commit:** `5f6c3c2e`

## 1. GitNexus freshness

Verified fresh at exact HEAD before any work, via direct content query (not `list`, which again showed a stale display-only commit hash, `92381ef` — same known bug as every prior slice): queried `docs/reports/2026-08-21-phase2-current-state.md`'s node names and got back the exact heading text from the latest edit ("Suggested next step (priority order)"). No reindex needed.

Also hit and root-caused a **new GitNexus failure signature** while re-verifying earlier in this session: a plain (non-`--force`) `analyze` reported a fake success because of a shell scripting bug on my end (`cmd | tail | ...; echo $?` captures `tail`'s exit code, not the real command's). The real exit code was 1. GitNexus self-healed on its own before this slice's AGY delegation (query worked again without further intervention). Memory updated with the corrected diagnostic procedure.

## 2. AGY `.234` inspection (read-only, `--mode=plan`)

Delegated before any code was written. **Caught a real problem the coordinator's own instructions would have missed:**

- `EvidenceDrawer.tsx`: `runtime · policy-engine` is accurate — the drawer shows specific 4-gate verdicts, genuinely evaluated by `@ai-drakon/policy-engine` inside `deterministic-engine` and streamed via execution events. Insertion point: `DrawerHeader`, next to `<DrawerTitle>`.
- `PipelineDrakonView.tsx` toolbar: **the same label would be INACCURATE here.** The toolbar's status badge (`IDLE`/`RUNNING`/`DONE`/`ERROR`) reflects overall pipeline workflow orchestration (LangGraph or the deterministic runner via `usePipelineExecution`, which doesn't expose which engine is active to the view layer), not gate-rule evaluation — labeling it `policy-engine` would falsely conflate graph lifecycle with gate logic. AGY also flagged **high duplication risk**: `GateIndicators` (which already carries a `runtime · policy-engine` chip, from Slice 6) is already rendered per-node inside this same view, so a second chip in the toolbar would be redundant even where accurate.

## 3. Implementation

Given AGY's finding, this slice intentionally does **less** than the coordinator prompt's literal scope, not more:

- **`src/components/harness/EvidenceDrawer.tsx`** — one `<ProvenanceChip label="runtime" detail="policy-engine" .../>` added to the header row, next to `DrawerTitle`. Same vocabulary as Slice 6, no new taxonomy.
- **`src/components/pipelines/PipelineDrakonView.tsx`** — **not touched.** Adding a chip to its toolbar would ship an inaccurate label and a redundant one. Proper provenance for this surface needs `usePipelineExecution` to actually expose which engine is active (`langgraph` vs `deterministic`) — real plumbing work, out of "smallest safe way" scope for a completion pass, and out of this slice's own non-goals (no backend/hook changes).

## 4. Validation (`.30`)

| Check | Result |
|---|---|
| `pnpm test` | 99/99 passed across 12 files (no new test needed — `ProvenanceChip` is already covered; `EvidenceDrawer.tsx` has no existing test file to update) |
| `pnpm build` | succeeds |
| `npx tsc --noEmit` | 13 pre-existing errors, unchanged — none in `EvidenceDrawer.tsx` |

## 5. Files touched vs. untouched

Touched: `src/components/harness/EvidenceDrawer.tsx`.

Untouched: everything AGY listed (`packages/harness-contract/*`, `packages/policy-engine/*`, `services/deterministic-engine/*`, `cloudflare-worker/worker-mcp-drakon.js`, `src/lib/htse/ir-validator-core.ts`, `src/lib/htse/validator-compatibility.ts`, `src/lib/harness/pipeline-client.ts`, `src/lib/graph-pipeline-api.ts`, `src/routeTree.gen.ts`, all route files), plus `src/components/pipelines/PipelineDrakonView.tsx` (deliberately, per §2-3 above) and `src/components/harness/GateIndicators.tsx` / `src/routes/trace.tsx` (already correct from Slice 6, no changes needed).

## 6. Follow-up recommendation

Before adding any provenance chip to `PipelineDrakonView.tsx`'s toolbar, `usePipelineExecution` needs to expose which execution engine is actually driving a given run (it currently only reads `VITE_USE_DETERMINISTIC` internally). That's real hook/data-plumbing work — a distinct, larger slice, not a completion pass.
