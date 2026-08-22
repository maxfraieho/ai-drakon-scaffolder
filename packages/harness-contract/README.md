# @ai-drakon/harness-contract

Canonical shared TypeScript types for the harness spec and the 4-Gate
Control Plane verdict/event contract -- `DrakonHarnessSpec`, `GateVerdict`,
`PipelineEvent`. Single source of truth, consolidating what was previously
duplicated between `src/lib/harness/{harness-spec.ts,pipeline-client.ts}`
and `services/deterministic-engine/src/main.ts`.

**Status:** active as of Phase 2 Slice 2 (`refactor(harness-contract):
extract shared harness types`). `src/lib/harness/harness-spec.ts` and
`src/lib/harness/pipeline-client.ts` re-export these types from here so
every existing downstream import path keeps working unchanged.
`services/deterministic-engine/src/main.ts` imports directly from this
package.

**Scope:** types only, no runtime logic. `validateHarnessSpec` and
`createDefaultSpec` remain in `src/lib/harness/harness-spec.ts` for now --
see `docs/plans/phase2-boundary-inventory.md` for what moves in later
slices (`packages/policy-engine`, IR validator reconciliation).
