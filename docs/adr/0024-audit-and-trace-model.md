---
status: proposed
date: 2026-08-20
deciders: Q, platform architecture
spec: specs/005-product-reframing/plan.md
supersedes:
superseded-by:
---

# 0024. Persist an append-only audit log and a replayable run trace

## Context

`infrastructure/appwrite/schema.ts` defines an `audit_log` collection with
correct append-only permissions (create for team members; update and delete for
nobody) and a sketched action vocabulary — `"zone.created"`, `"pipeline.run"`,
`"billing.upgraded"`. Nothing writes to it.

The execution engine computes a `GateVerdict[]` for every node. Those verdicts
are streamed to React state via `setNodeVerdicts` and discarded on page refresh.
D1's `pipeline_runs` records only `status`, `llm_calls`, `input_summary` and
`error` — there is no column for node events, gate verdicts, artifacts or
approvals. A platform whose value proposition is governance currently cannot
prove what it did.

## Decision

Two distinct, complementary stores:

- **Audit log** (Appwrite, append-only): one entry per policy decision, run
  transition, spec change, secret access and approval. Answers *who was allowed
  to do what, and on what authority.* Retained per compliance policy.
- **Run trace** (D1 `run_events`, append-only, ordered by `(run_id, seq)`): every
  `node_start`, `node_done`, `gate_blocked` and `breakpoint` with node id, gate,
  verdict, reason, token count and timestamp. Answers *what actually happened,
  step by step.* Large payloads go to R2 by pointer; retention varies by plan.

`pipeline_runs` gains `spec_id`, `spec_version`, `task_graph_id` and `adr_ref` so
every run is attributable to the decision that authorised it.

## Consequences

Positive: runs become replayable and explainable; gate verdicts survive a
refresh; ADRs can cite the runs they produced; compliance review becomes possible.

Negative: write volume on the hot path; trace storage growth requires a retention
policy from day one, not retrofitted.

Neutral: the existing `GateVerdict` shape is reused as the trace event payload.
