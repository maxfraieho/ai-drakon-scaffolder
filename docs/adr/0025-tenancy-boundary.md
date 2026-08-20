---
status: proposed
date: 2026-08-20
deciders: Q, platform architecture
spec: specs/005-product-reframing/plan.md
supersedes:
superseded-by:
---

# 0025. Establish the tenant as the primary authorization boundary

## Context

`verifyOwnerAuth` in the Worker accepts three credential types — a shared static
`MCP_API_KEY`, a Worker-issued JWT, and any valid Appwrite JWT — and collapses all
three to the same principal, `role: 'owner'`. Any user who registers becomes an
owner. It guards 12 call sites.

`handleDrakonExecuteDeterministicStatus` performs no authorization at all: it
reads `execution_id` from the query string and proxies to Appwrite with the admin
API key, so anyone holding or guessing an execution id can read that run's output.

Tenancy is elsewhere hardcoded: the Worker matches
`/^\/v1\/agents\/(sonate-solidaire)\/chat$/` — a customer name compiled into a
route regex.

Meanwhile `infrastructure/d1/schema.sql` states the correct law in its own header
comment: every table carries `tenant_id`, and no query may run without
`WHERE tenant_id = ?`. The data model is right; the runtime ignores it.

## Decision

1. `tenant_id` is the Appwrite `teamId`, as the schema already assumes.
2. `verifyOwnerAuth` is replaced by `resolveTenant(request) -> { tenantId, userId,
   roles }` at all 12 call sites. There is no global owner.
3. All D1 access goes through tenant-scoped repositories in `packages/tenancy`
   that make an unscoped query **unrepresentable in the type system** — the law is
   enforced by construction, not by developer discipline.
4. Every route has an integration test proving tenant A cannot read tenant B's
   data. A route without that test does not merge.
5. The shared static `MCP_API_KEY`-as-owner path is retired in favour of
   per-tenant scoped tokens stored as `ZoneSecret`.
6. No tenant identifier appears in source code. `sonate-solidaire`,
   `crisis-bot` and `uav-watcher` become ordinary tenants in their own
   repositories.

## Consequences

Positive: removes the single largest blocker to SaaS; closes an active
authorization gap on the status endpoint; makes audit attribution meaningful.

Negative: the highest-risk change in the whole migration — an error here is a
cross-tenant data leak. It must land with deny-by-default, per-route tests, and a
staged rollout.

Neutral: existing single-user deployments continue to work as a tenant of one.
