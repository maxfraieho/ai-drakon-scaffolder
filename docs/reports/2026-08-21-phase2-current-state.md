# Phase 2 — Current State (architect briefing)

**Date:** 2026-08-21
**Branch:** `phase0-stabilize`
**HEAD:** `04d52b52`
**Purpose:** single entry point for planning the next slice. Supersedes the individual isolated-fix/verification reports pruned from this directory today — see git history (`docs/reports/2026-08-21-*`, commits `f648d18f`..`04d52b52`) for the full blow-by-blow if needed.

## What's built (Phase 2, Slices 1-5)

- **Slice 1** — characterization tests for `deterministic-engine`'s gate logic (safety net for the extractions below; not itself an architectural boundary).
- **Slice 2 — `packages/harness-contract`**: canonical `DrakonHarnessSpec`, `GateVerdict`, `PipelineEvent` types, no runtime logic. See `2026-08-21-phase2-slice2-harness-contract.md`.
- **Slice 3 — `packages/policy-engine`**: pure, side-effect-free 4-gate evaluator (`safety → policy → confidence → cost`), extracted bit-for-bit from `deterministic-engine`. Preserved quirks: skipped gate → `allowed:true` with no reason; no `Math.random` inside the package (kept in the caller). See `2026-08-21-phase2-slice3-policy-engine.md`.
- **Slice 4 — IR validator reconciliation**: `cloudflare-worker/worker-mcp-drakon.js`'s inline validator now runs the same 7-rule logic as canonical `src/lib/htse/ir-validator-core.ts` (was a 4-rule subset). One deliberate deviation: worker's `success` field = `valid` (canonical hardcodes `true`; nothing in-repo reads `.success` either way). See `2026-08-21-phase2-slice4-ir-validator-reconciliation.md`.
- **Slice 5 — UI visibility layer**: `src/lib/htse/validator-compatibility.ts` (pure `compareValidationResults`, classifies canonical-vs-worker as compatible/adapted/divergent) wired into `ValidationPanel.tsx` — a `data-testid="validator-compat-badge"` badge next to the existing error/warning counts, additive only, no new route/drawer. See `2026-08-21-phase2-slice5-ui-visibility.md`.
- **Post-Slice-5 fix — DiagramEditorPage/useDiagramStore wiring**: the compat badge was unreachable in practice because `DiagramEditorPage.tsx` never populated `useDiagramStore.currentDiagram` (root cause was NOT the two things suspected first — JWT expiry and MinIO 502 — both investigated and ruled out). Now synced for the "open an existing diagram" flow via `useEffect`. **Known gap, not yet fixed:** a brand-new unsaved diagram's live in-widget edits still don't reach the store — `DrakonEditor.tsx` keeps diagram state internally and has no callback that reports full content back out (only `onSaved(id: string)`). See `2026-08-21-diagram-editor-store-sync-fix.md`.

## Planning input already on file

`2026-08-21-phase2-ui-ux-plan-oracle-opus.md` — the original 10-section UI/UX plan (surfaces, Astryx guidance, route strategy, progressive disclosure, suggested implementation order). Slice 5 shipped roughly its steps 1-3 (provenance surface + compatibility badge, folded into the existing `ValidationPanel` rather than a new drawer, since that was the lower-risk/more-additive option). Steps 4-7 are still open:

- Provenance chips in `/trace`, `/pipelines`, `PipelineDrakonView` gate-verdict rendering.
- `/system/boundaries` — read-only Architecture & Runtime Boundaries page (`packages/harness-contract`, `packages/policy-engine`, validator split).
- Workspace diagnostics panel (live compatibility/health widget in the shell).
- `/system/dev-status` — developer-only forensics page, needs a developer-mode gating flag (none exists yet; smallest-viable settings toggle per the plan's own fallback guidance).

## Known infrastructure state (not code bugs, don't re-diagnose these)

- **MinIO**: currently down (502 on diagram save), external, temporary per Q. Confirmed via code read that it does NOT block Validate/the compat badge (save errors are caught and swallowed; the real blocker was the store-wiring gap above, now fixed for existing diagrams).
- **Pipelines list**: "Помилка завантаження списку пайплайнів" reproduces both locally and on production `aidrakon.tech`, independent of repo/auth state — pre-existing, not caused by any Phase 2 slice, not yet root-caused.
- **`src/routeTree.gen.ts`**: stale relative to `src/routes/`; regenerates with a large diff on every local `pnpm build`/dev-server start. Root cause of most of the 13 pre-existing `tsc --noEmit` errors. Never commit the regenerated version as part of a slice's diff — revert it first. Worth its own small slice eventually.
- **Fourth validator flavor**: `services/drakon-agent-flue/lib/ir-validator.ts` returns a differently-shaped result (`{valid, errors[], warnings[]}`), found by the Oracle UI-plan session, not touched by Slice 4 or 5.

## Fleet setup going forward

- **AGY (`192.168.3.234`, `~/.local/bin/agy --mode=plan`)** — grounded, read-only code inspection before any implementation; GitNexus-first (hard rule now in this repo's `AGENTS.md`, added today, survives `gitnexus setup` regeneration).
- **Oracle Cloud Claude (`edgee launch claude --model opus`)** — parallel architecture/planning drafts on self-contained specs; account has a shared session quota (hit the limit once today, resets ~13:20 Europe/Zurich daily-ish — check before relying on it for a time-sensitive task).
- **Comet (browser agent, manual UI testing)** — exploratory/manual verification in a real browser; no DevTools/Network-tab access from its tooling, so root-causing "why did X fail" still needs direct backend/code investigation, not just Comet's own read of the page.
- **`.30` also now runs a native `claude --bg` background session** (Remote Control-enabled, reachable via `https://claude.ai/code/session_01DsJCnD1UG5TZvARK8hGofD` from phone/desktop) in this repo — available for phone-driven follow-up work; **`edgee` is mandatory for any `claude`/tool invocation on `.30`** going forward (matches the existing Oracle/Codex convention), not the raw `claude`/`claude.exe` binary directly.

## Suggested next step

Pick up the UI-UX plan's step 4 (provenance chips in execution/trace surfaces) or step 5 (`/system/boundaries` page) — both are additive, don't touch validator/gate logic, and don't depend on MinIO or Pipelines being fixed. AGY-first inspection of the actual `/trace`/`PipelineDrakonView` current state recommended before committing to either, since the last inspection of those surfaces (Slice 5's inventory) is now a few commits stale.
