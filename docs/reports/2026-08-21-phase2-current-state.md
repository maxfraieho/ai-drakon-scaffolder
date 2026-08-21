# Phase 2 — Current State (architect briefing)

**Date:** 2026-08-21
**Branch:** `phase0-stabilize`
**HEAD:** `709da218`
**Purpose:** single entry point for planning the next slice. Supersedes the individual isolated-fix/verification reports pruned from this directory earlier — see git history (`docs/reports/2026-08-21-*`, commits `f648d18f`..`709da218`) for the full blow-by-blow if needed.

## What's built (Phase 2, Slices 1-6)

- **Slice 1** — characterization tests for `deterministic-engine`'s gate logic (safety net for the extractions below; not itself an architectural boundary).
- **Slice 2 — `packages/harness-contract`**: canonical `DrakonHarnessSpec`, `GateVerdict`, `PipelineEvent` types, no runtime logic. See `2026-08-21-phase2-slice2-harness-contract.md`.
- **Slice 3 — `packages/policy-engine`**: pure, side-effect-free 4-gate evaluator (`safety → policy → confidence → cost`), extracted bit-for-bit from `deterministic-engine`. Preserved quirks: skipped gate → `allowed:true` with no reason; no `Math.random` inside the package (kept in the caller). See `2026-08-21-phase2-slice3-policy-engine.md`.
- **Slice 4 — IR validator reconciliation**: `cloudflare-worker/worker-mcp-drakon.js`'s inline validator now runs the same 7-rule logic as canonical `src/lib/htse/ir-validator-core.ts` (was a 4-rule subset). One deliberate deviation: worker's `success` field = `valid` (canonical hardcodes `true`; nothing in-repo reads `.success` either way). See `2026-08-21-phase2-slice4-ir-validator-reconciliation.md`.
- **Slice 5 — UI visibility layer**: `src/lib/htse/validator-compatibility.ts` (pure `compareValidationResults`, classifies canonical-vs-worker as compatible/adapted/divergent) wired into `ValidationPanel.tsx` — a `data-testid="validator-compat-badge"` badge next to the existing error/warning counts, additive only, no new route/drawer. See `2026-08-21-phase2-slice5-ui-visibility.md`.
- **Post-Slice-5 fix — DiagramEditorPage/useDiagramStore wiring**: the compat badge was unreachable in practice because `DiagramEditorPage.tsx` never populated `useDiagramStore.currentDiagram`. Root cause was NOT the two things suspected first (JWT expiry — real, fixed separately; MinIO 502 — investigated, ruled out: the save error is caught and swallowed, doesn't block anything downstream). Now synced for the "open an existing diagram" flow via `useEffect`. **Known gap, not yet fixed:** a brand-new unsaved diagram's live in-widget edits still don't reach the store. See `2026-08-21-diagram-editor-store-sync-fix.md`.
- **Slice 6 — Execution provenance visibility**: new `src/components/harness/ProvenanceChip.tsx` (small presentational label, caller-supplied `label`/`detail`/`title`, no internal architecture-claim enum to drift out of sync). Wired into `GateIndicators.tsx` (after the four gate icons) and `src/routes/trace.tsx` (header subtitle), both labeled `runtime · policy-engine` — corrected an initial wrong assumption that gate verdicts are computed client-side; they're actually streamed from the deterministic-engine service via pipeline events, which internally calls `@ai-drakon/policy-engine`. `EvidenceDrawer.tsx` and `PipelineDrakonView.tsx` were AGY-confirmed as safe next insertion points but deliberately deferred to keep the diff small. See `2026-08-21-phase2-slice6-execution-provenance.md`.

## Planning input already on file

`2026-08-21-phase2-ui-ux-plan-oracle-opus.md` — the original 10-section UI/UX plan (surfaces, Astryx guidance, route strategy, progressive disclosure, suggested implementation order). Slice 5 shipped its steps 1-3 (provenance surface + compatibility badge, folded into the existing `ValidationPanel` rather than a new drawer). Slice 6 shipped a first pass of step 4 (provenance chips), partial — two of four identified surfaces. Still open:

- Finish step 4: `ProvenanceChip` in `EvidenceDrawer.tsx` (header, next to PASSED/BLOCKED) and `PipelineDrakonView.tsx` (toolbar, next to execution status badges) — both are known-safe insertion points from Slice 6's AGY inspection, not yet re-verified against any newer commits.
- `/system/boundaries` — read-only Architecture & Runtime Boundaries page (`packages/harness-contract`, `packages/policy-engine`, validator split).
- Workspace diagnostics panel (live compatibility/health widget in the shell).
- `/system/dev-status` — developer-only forensics page, needs a developer-mode gating flag (none exists yet; smallest-viable settings toggle per the plan's own fallback guidance).

## Known infrastructure state (not code bugs, don't re-diagnose these)

- **MinIO**: was down (502 on diagram save) as of the last check, external, said to be temporary. Confirmed via code read that it does NOT block Validate/the compat badge.
- **Pipelines list**: "Помилка завантаження списку пайплайнів" reproduces both locally and on production `aidrakon.tech`, independent of repo/auth state — pre-existing, not caused by any Phase 2 slice, **still not root-caused**. Blocks live end-to-end testing of `PipelineDrakonView`/`EvidenceDrawer` (and therefore of any future provenance chip added there) — worth its own investigation slice before wiring those two surfaces for real.
- **`src/routeTree.gen.ts`**: stale relative to `src/routes/`; regenerates with a large diff on every local `pnpm build`/dev-server start. Root cause of ~10 of the 13 pre-existing `tsc --noEmit` errors. Never commit the regenerated version as part of a slice's diff — revert it first. Cheap, clean, worth its own small slice — has been deferred every slice so far.
- **GitNexus on `.184`**: hit a 4th distinct failure signature today (`incrementalInProgress` flag stuck after a plain `analyze` reported `EXIT=0`; queries then failed with a "replay shadow pages" error). Fixed with `analyze --force`. `docker restart` alone does NOT fix this variant — see the consolidated decision tree in ai-memory (`feedback_gitnexus_wal_instability`) before re-diagnosing from scratch.
- **Fourth validator flavor**: `services/drakon-agent-flue/lib/ir-validator.ts` returns a differently-shaped result (`{valid, errors[], warnings[]}`), found by the Oracle UI-plan session, not touched by any slice yet.

## Fleet setup going forward

- **AGY (`192.168.3.234`, `~/.local/bin/agy --mode=plan`)** — grounded, read-only code inspection before any implementation; GitNexus-first (hard rule in this repo's `AGENTS.md`, survives `gitnexus setup` regeneration).
- **Oracle Cloud Claude (`edgee launch claude --model opus`)** — used successfully for Slice 6's actual wiring/test implementation (not just planning prose) once given a fully-specified, AGY-grounded spec; session killed by an external timeout before it could self-report, but its file edits on disk were complete and correct — always independently re-verify Oracle's output by direct read + re-running the full validation suite yourself before trusting a self-report. Shared session quota (hit the limit once, resets ~13:20 Europe/Zurich daily-ish).
- **Comet (browser agent, manual UI testing)** — exploratory/manual verification in a real browser; no DevTools/Network-tab access from its tooling, so root-causing "why did X fail" still needs direct backend/code investigation, not just Comet's own read of the page. Comet's own causal guesses (e.g. "MinIO blocks Validate") should be treated as leads, not conclusions — verify against actual code before acting.
- **`.30` background session**: a native `claude --bg` session (Remote Control-enabled, reachable via `https://claude.ai/code/session_01DsJCnD1UG5TZvARK8hGofD` from phone/desktop) is available in this repo for phone-driven follow-up. **`edgee` is mandatory for any `claude`/tool invocation on `.30`** — not the raw `claude.exe` binary directly.

## Suggested next step (priority order)

1. **Finish Slice 6** — wire `ProvenanceChip` into `EvidenceDrawer.tsx` and `PipelineDrakonView.tsx`, same pattern as GateIndicators/trace. Small, low-risk, closes out an already-open slice.
2. **`routeTree.gen.ts` regeneration** — its own tiny slice; clears most of the pre-existing tsc error count. Cheap, has been deferred every slice so far.
3. **`/system/boundaries` page** — larger, new route, from the original UI plan.
4. **Root-cause the Pipelines list failure** — not a UI task; blocks real end-to-end testing of two of the four provenance-chip target surfaces, and blocks live diagram-save testing generally. Worth its own investigation slice.
