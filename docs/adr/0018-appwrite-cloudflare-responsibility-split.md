---
status: proposed
date: 2026-08-20
deciders: Q, platform architecture
spec: specs/005-product-reframing/plan.md
supersedes:
superseded-by:
---

# 0018. Split platform responsibilities between Appwrite and Cloudflare

## Context

`infrastructure/appwrite/schema.ts` already documents an intended split —
Appwrite owns identity, profiles, encrypted secrets and audit; D1 owns
transactional data — and `ZoneSecret` correctly stores only a reference
(`mcp_auth_secret_ref`) in D1 while the token lives encrypted in Appwrite.
`infrastructure/d1/schema.sql` states the matching invariant that every table
carries `tenant_id` and no query may omit it.

This design is sound but is not enforced by any runtime, and responsibilities
have leaked: knowledge indexing exists in both the Worker and the Nitro server
routes; the Worker hand-rolls S3 SigV4 signing; Appwrite project and function
IDs appear as hardcoded literals in worker source.

## Decision

Codify and enforce the split:

- **Appwrite**: identity, sessions, teams, encrypted secrets, append-only
  audit log, billing source of truth, long-running function execution.
- **Cloudflare D1**: specs, ADRs, task graphs, harness specs, runs, run events,
  diagrams, agent configs, knowledge zones — every row tenant-partitioned.
- **Cloudflare Worker**: API gateway, authentication, tenant resolution, policy
  enforcement point, MCP server. Thin and stateless.
- **Cloudflare R2**: blob artifacts, replacing MinIO behind a `BlobStore`
  interface.
- **Durable Objects**: realtime collaboration only (`RoomDO`, `DiagramSyncDO`).

All environment-specific identifiers move to bindings; no hardcoded project or
function IDs remain in source.

## Consequences

Positive: each store is used for what it is good at; secret handling stays
correct by construction; the Worker becomes small enough to reason about.

Negative: migrating MinIO to R2 requires a data move and a compatibility window;
duplicate knowledge implementations must be consolidated, breaking some
internal callers.

Neutral: billing is read from a D1 replica on the hot path for latency, with
Appwrite remaining authoritative.
