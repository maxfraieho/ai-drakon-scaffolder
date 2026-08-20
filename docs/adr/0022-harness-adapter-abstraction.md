---
status: proposed
date: 2026-08-20
deciders: Q, platform architecture
spec: specs/005-product-reframing/plan.md
supersedes:
superseded-by:
---

# 0022. Model executors as HarnessAdapter implementations

## Context

There is exactly one executor, reached through a hardcoded Appwrite Function id
(`DETERMINISTIC_ENGINE_FUNCTION_ID`, with a literal fallback in worker source).
The frontend contains two competing execution paths — `DeterministicPipelineClient`
(POST plus 2.5-second polling) and `startExecution`/`streamExecution` (SSE) —
selected by the build-time flag `VITE_USE_DETERMINISTIC`, so a single deployment
cannot serve both. A product calling itself a *meta*-harness cannot run exactly
one harness.

## Decision

Define `HarnessAdapter` in `packages/harness-adapters`:

    id, capabilities,
    start({ tenantId, runId, taskGraph, spec, knowledge }) -> { executionId }
    poll(executionId) -> RunSnapshot
    resume(executionId, approval) -> void
    cancel(executionId) -> void

`services/harness-deterministic` is implementation #1. The Python FastAPI agents
(`architect-agent`, `docs-agent`, `drakon-agent`) become implementation #2.
Customer-supplied runners become implementation #3.

The frontend keeps one execution path; transport differences (polling vs
streaming) are an adapter concern, selected at runtime rather than at build time.

## Consequences

Positive: new executors need no gateway changes; the two duplicated frontend
paths collapse; BYO-runtime becomes an expansion-revenue feature.

Negative: `RunSnapshot` must be general enough for both polling and streaming
adapters without becoming a lowest-common-denominator type.

Neutral: the Python agents are retained until an adapter exists for them; they
are not deleted as part of this decision.
