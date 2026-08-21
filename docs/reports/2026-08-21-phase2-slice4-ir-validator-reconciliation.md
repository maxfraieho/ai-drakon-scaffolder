# Phase 2 Slice 4 — IR Validator Boundary Reconciliation

**Date:** 2026-08-21
**Branch:** `phase0-stabilize`
**Base commit:** `bb8cde19` (refactor(policy-engine): extract 4-gate evaluator from deterministic-engine)
**Scope:** reconcile the inline IR validator in `cloudflare-worker/worker-mcp-drakon.js` with the canonical validator in `src/lib/htse/ir-validator-core.ts`. No general worker rewrite, no Phase 3, no tenancy work, no broad IR conversion redesign.

## 1. Characterization (before any code moved)

Canonical (`src/lib/htse/ir-validator-core.ts`, `validateIrDeterministic`) runs 7 rule categories in this order:
`SCHEMA_REQUIRED_FIELD` (name, items) → `INVALID_ITEM_TYPE` → `MULTIPLE_TERMINAL_CANDIDATE` (+`merge_terminals` autofix) → `DANGLING_POINTER` → `MISSING_HEADER` → `ORPHAN_NODE` (BFS reachability, +`remove_orphan` autofix) → `MISSING_ALT_VECTOR`. `success` is hardcoded `true` regardless of `valid`.

The worker's inlined copy ran only 4 rules: `SCHEMA_REQUIRED_FIELD` x2, `INVALID_ITEM_TYPE`, and a rule named `DANGLING_REFERENCE` (canonical's equivalent is named `DANGLING_POINTER`). It never populated `autofixes` (always `[]`), and had no `MULTIPLE_TERMINAL_CANDIDATE`, `MISSING_HEADER`, `ORPHAN_NODE`, or `MISSING_ALT_VECTOR` checks at all. `success` mirrored `valid` (not hardcoded true).

### Real consumer graph (traced directly, not assumed)

Three independent call chains exist, confirmed by direct grep + read, not by inference:

1. **Worker-internal**, four call sites in `cloudflare-worker/worker-mcp-drakon.js`: `handleDrakonValidateIr` (HTTP `POST /v1/drakon/validate-ir`, raw passthrough), a mutation-rollback check (uses `.valid` only), a diagram-save flow (`validationResult`), and the `drakon.validateir` MCP tool (raw passthrough).
2. **Local/canonical**, one direct caller in `src/`: `src/lib/htse/diagram-to-ir.ts:140` (`convertDiagramToIrWithValidation`), which destructures only `{issues}` from the result — never `.success`.
3. **Remote/UI**, newly discovered via AGY `.234` delegation and independently re-verified: `src/lib/htse/ir-validator-client.ts` (`validateIrRemote`) calls the worker's HTTP endpoint directly; `src/store/useDiagramStore.ts` and `src/components/htse/ValidationPanel.tsx` consume that result. `ValidationPanel.tsx` already has fully-built UI for `result.autofixes` (a "Preview fixes" button/list) that has been dead since it shipped, because the worker never populated `autofixes`. It also renders `issue.code` directly, so the `DANGLING_REFERENCE` → `DANGLING_POINTER` rename is a visible label change. Neither component reads `.success` anywhere.

Grepped across the whole repo (worker call sites, `diagram-to-ir.ts`, `useDiagramStore.ts`, `ValidationPanel.tsx`, and every existing test): nothing anywhere reads `.success` from either validator's result. Only `.valid`, `.issues`, `.autofixes`, and `.normalizedIr` are ever consulted.

## 2. Decision

Adopt canonical's rule set, ordering, and messages wholesale in the worker's inlined copy — this is the "compatibility adapter" outcome named in the slice's own expected-output options, not a rewrite. One deliberate, narrow deviation is kept: `success` is computed as `= valid` (not hardcoded `true`) in the worker's version, because the worker's result is exposed directly as an external HTTP response body and MCP tool result — outside this repo's control — and nothing anywhere in this repo currently depends on the always-true quirk, so there is no reason to import a misleading external contract when the honest one is free.

The `DANGLING_REFERENCE` → `DANGLING_POINTER` rename and the newly-populated `autofixes` array are adopted as-is from canonical: confirmed via the same grep that nothing checks the exact old code string or relies on `autofixes` staying empty, so there is no compatibility reason to keep the old behavior. Net effect: `ValidationPanel.tsx`'s dead "Preview fixes" UI starts working for the first time.

## 3. Implementation

- `cloudflare-worker/worker-mcp-drakon.js`: `_normalizeIr` unchanged; `validateIrDeterministic` replaced with the 7-rule canonical logic (same order, same messages), now `export`ed for direct testability. Inline comment documents the reconciliation rationale and the `success` deviation.
- `cloudflare-worker/__tests__/worker-ir-validator.test.ts` (new, 9 tests): mirrors `src/lib/htse/__tests__/ir-validator.test.ts`'s 7 fixtures, imports `validateIrDeterministic` directly from the deployed worker file (not a copy), plus 2 new tests — one for the previously-absent `MISSING_HEADER` rule, one dedicated to the `success = valid` deviation.
- `pnpm-workspace.yaml`: stripped the auto-written, unfilled `allowBuilds:` stub block (pre-existing pnpm artifact unrelated to this slice's logic, blocked `pnpm install`); `onlyBuiltDependencies` list retained.

No changes to `services/deterministic-engine/`, `packages/harness-contract/`, `packages/policy-engine/`, `src/lib/htse/ir-validator-core.ts`, `src/lib/htse/diagram-to-ir.ts`, or `src/lib/htse/ir-validator-client.ts`.

## 4. Validation (all run on `.30`, Windows, Node v24.16.0, pnpm 11.5.3)

| Check | Result |
|---|---|
| `pnpm --filter policy-engine test` | 23/23 passed |
| `pnpm --filter deterministic-engine test` | 20/20 passed, unchanged — confirms Slice 4 did not touch gate semantics |
| `cloudflare-worker/__tests__/worker-ir-validator.test.ts` (direct) | 9/9 passed |
| `pnpm test` (root, full repo) | 85/85 passed across 10 test files — new worker test auto-discovered, canonical `ir-validator.test.ts` (7 tests) and `ir-validator-integration.test.ts` (2 tests) both pass unmodified |
| `pnpm build` (root) | succeeded, `dist/_worker.js` produced |
| `npx tsc --noEmit -p tsconfig.json` | 14 pre-existing errors, **identical set on unmodified `bb8cde19`** (verified by stashing this slice's changes and re-running tsc against the bare base commit) — none touch `cloudflare-worker/`, `packages/policy-engine/`, `services/deterministic-engine/`, or `src/lib/htse/`. Root cause: the committed `src/routeTree.gen.ts` is stale relative to current `src/routes/` (confirmed: `pnpm build` regenerates it with a 715-line diff). Out of Slice 4 scope — not touched, not fixed here — flagged separately below. |

## 5. Out-of-scope finding (flagged, not acted on)

`src/routeTree.gen.ts` (TanStack Router codegen) is stale in the committed tree — a normal `pnpm build` regenerates it with 368 insertions / 347 deletions, and this stale state is the direct cause of at least 10 of the 14 pre-existing `tsc --noEmit` errors (route-union type mismatches for `/docs`, `/project/new`, etc.). This predates Phase 2 entirely (present on unmodified `bb8cde19`) and is unrelated to IR validation. Recommend a small, separate slice to regenerate and commit it — not attempted here to keep this slice's diff minimal and single-purpose.

Separately: `docs/reports/2026-08-21-phase2-slice1-characterization.md` through `2026-08-21-phase2-validation-pass.md` (6 files) were found as untracked-only on `.30`'s working copy — never committed to `phase0-stabilize` despite being referenced as delivered in prior slice reports. Root cause: this working copy's checkout was switched to `main` at some point after those slices (for unrelated `services/architect-agent-flue`/`drakon-agent-flue` work, still present untracked and left untouched), stranding the report files as untracked. Recovered in a separate commit alongside this one (`docs(reports): recover stranded Phase 1-2 slice reports`), not folded into this slice's own commit.

## 6. Non-goals respected

No changes to gate/deterministic-engine semantics. No new imports/bundling step introduced into the worker (still raw inlined JS, per its existing deployment model). No tenancy work. No Phase 3 work. No broad IR conversion redesign — only the validator function's rule body changed.
