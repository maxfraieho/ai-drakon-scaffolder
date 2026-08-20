---
status: proposed
date: 2026-08-20
deciders: Q, platform architecture
spec: specs/005-product-reframing/plan.md
supersedes:
superseded-by:
---

# 0023. Promote the LLM proxy to a governed model-router primitive

## Context

`services/llm-gateway` (TypeScript) and `services/llm-proxy` (Python) exist as
incidental plumbing, with a third path through `services/shared/llm_client.py`.
`TeamSettings` already models `llmProvider: "proxy" | "anthropic" | "openai"` and
an optional `proxyUrl`, and `BillingProfile` already carries `llmQuotaMonthly` and
`llmConsumed` against the `PLAN_LIMITS` table — but nothing increments consumption
and nothing enforces a quota. `DrakonHarnessSpec.permissions` declares
`max_tokens_per_hour` and `max_tokens_per_node` that no router honours.

## Decision

Consolidate into `services/model-router`, a platform primitive behind the Policy
Plane. It accepts `{ tenantId, specId, nodeId, capability }`, resolves the
provider from `TeamSettings`, enforces the spec's token permissions and the
tenant's plan quota before the call, meters actual consumption into
`BillingProfile.llmConsumed` after it, and emits a trace event for every call.

Model and provider selection is a **policy field**, not an environment variable.
Per-tenant bring-your-own-key is supported through the `ZoneSecret` pattern.

## Consequences

Positive: cost control and model governance become enforceable and auditable;
provider changes stop being deployments; billing integrity becomes possible.

Negative: adds a hop on the hottest path — the router must be edge-local and
must fail closed on quota, which will surface as user-visible refusals.

Neutral: the existing proxy endpoint remains a supported provider option.
