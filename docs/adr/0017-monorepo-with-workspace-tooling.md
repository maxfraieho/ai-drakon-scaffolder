---
status: proposed
date: 2026-08-20
deciders: Q, platform architecture
spec: specs/005-product-reframing/plan.md
supersedes:
superseded-by:
---

# 0017. Adopt a pnpm + Turborepo monorepo and eliminate the .lovable build mirror

## Context

The root `package.json` was named `workspace-root` but had no workspace tooling.
It delegated `dev`, `build`, and `test` into `.lovable/`, which was a complete
second copy of the application including its own `src/`, `node_modules`,
`vite.config.ts` and `cloudflare-worker/`. The project's `CLAUDE.md` mandated
`rsync -av --delete src/ .lovable/src/` after every source edit, meaning
correctness depended on a human or agent remembering a manual copy step.

Separately, contracts are duplicated across the runtime boundary by hand:
`GateVerdict` in both `src/lib/harness/pipeline-client.ts` and
`services/deterministic-engine/src/main.ts`; `DrakonHarnessSpec` mirrored as
`HarnessSpec` in the engine; DRAKON IR conversion implemented twice (once in
`src/lib/htse/`, once inline in the worker).

## Decision

Adopt a single monorepo with pnpm workspaces and Turborepo, laid out as
`apps/` + `services/` + `packages/` + `infra/` + `adr/` + `specs/` + `docs/`.

Phase 0 (already executed, see `chore(phase0)` commit) deleted `.lovable/` and
made root `src/` the sole build root, and added `pnpm-workspace.yaml` covering
the existing `services/*` packages. Moving `src/` under `apps/web/src/` and
introducing `packages/` for shared contracts is deferred to Phase 2 (Boundary
extraction) — this ADR authorises that follow-on move but does not execute it.

Shared contracts will live in `packages/` and be imported, never copied.

## Consequences

Positive: eliminates an entire class of "shipped stale code" bugs; contract
drift becomes impossible once packages/ lands; cross-cutting changes land
atomically.

Negative: the `.lovable/` and root `src/` trees had already drifted in places
(binary assets, MASTER-CONTEXT.md) and required a manual reconciliation pass
during Phase 0; Cloudflare Pages build configuration needed re-pointing from
`.output/` (TanStack Start/Nitro) rather than the legacy `dist/client` path.

Neutral: Python services remain in-tree under `services/` with their own
`pyproject.toml`, outside the JS workspace graph.
