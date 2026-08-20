---
status: proposed
date: 2026-08-20
deciders: Q, platform architecture
spec: specs/005-product-reframing/plan.md
supersedes:
superseded-by:
---

# 0020. Server-resident harness specs and an extracted policy engine

## Context

This is the most serious structural defect in the codebase.

`src/hooks/usePipelineExecution.ts:69` calls `createDefaultSpec(pipelineName)`
in the browser. `src/lib/harness/pipeline-client.ts` then POSTs
`{ drakon_ir, harness_spec, breakpoints }` to the Worker, which forwards the body
verbatim to an Appwrite Function. `services/deterministic-engine/src/main.ts`
destructures `harness_spec` from that payload and treats its `gates` as
authoritative — rejecting the request only if `gates` is absent.

Consequently every quota, capability allowlist, deny pattern, blocked regex and
human-approval requirement is chosen by the caller they are meant to constrain.
`validateHarnessSpec` exists in `src/lib/harness/harness-spec.ts` and has zero
call sites anywhere in the repository.

## Decision

1. Harness specs are stored in D1 as `harness_specs(tenant_id, spec_id, version,
   spec_json)` and are immutable per version.
2. Requests carry `spec_id` only. A request body containing `harness_spec` is
   **rejected with 400**, not ignored.
3. The Worker is the Policy Enforcement Point: it resolves the spec, calls
   `validateHarnessSpec` at ingress, and evaluates policy before dispatch.
4. The gate evaluator — the four gates in their existing order (safety → policy →
   confidence → cost) and the `capabilityMatches` wildcard matcher — is extracted
   from `services/deterministic-engine/src/main.ts` into `packages/policy-engine`
   as a pure, unit-tested library.
5. Evaluation is deny-by-default.

## Consequences

Positive: the product's central claim becomes true; the gates become testable in
isolation for the first time; the same engine can serve every harness adapter.

Negative: every existing client breaks. Mitigation: ship `spec_id` support first,
dual-accept for one release with a deprecation warning and an audit entry on each
legacy call, then reject.

Neutral: the four-gate semantics are preserved exactly; this ADR changes where
the policy comes from, not what it means.
