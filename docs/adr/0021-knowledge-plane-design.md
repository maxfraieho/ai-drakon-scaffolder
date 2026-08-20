---
status: proposed
date: 2026-08-20
deciders: Q, platform architecture
spec: specs/005-product-reframing/plan.md
supersedes:
superseded-by:
---

# 0021. Unify knowledge sources behind a KnowledgeProvider interface

## Context

Four independent knowledge implementations exist: an in-Worker vector index
(`handleKbIndex`, `handleKbSearch`, with `cosineSimilarity` and `md5Hex`
implemented inline); a NotebookLM bridge (`src/server/notebooklm-mcp.ts`); the
Garden note graph with wikilinks and backlinks (`src/lib/garden/`); and GitNexus
as an external code-intelligence graph. Knowledge zones are modelled in D1
(`knowledge_zones` with `mcp_endpoint_url` and `mcp_auth_secret_ref`) but
retrieval is not tenant-scoped, and nothing links retrieved evidence to the
decisions it informed.

## Decision

Introduce `packages/knowledge` defining a `KnowledgeProvider` interface with
adapters for the vector KB, NotebookLM, GitNexus and Garden notes.

Every indexed chunk carries `tenant_id` and `zone_id`. Every retrieval returns
evidence links (source, locator, score) which are persisted on the run that used
them, so any output can be traced back to the material that grounded it.

Zone credentials continue to follow the `ZoneSecret` pattern: the token lives
encrypted in Appwrite; D1 holds only the reference.

Knowledge packs — curated, versioned zone bundles — become a first-class,
distributable artifact.

## Consequences

Positive: one retrieval contract instead of four; evidence links make gate
verdicts and ADRs defensible; knowledge packs become sellable.

Negative: existing indexes must be re-indexed with tenant and zone attribution;
the Worker's inline vector search will not scale and needs replacing with a
dedicated vector store.

Neutral: NotebookLM must continue to be referred to publicly as "Archivist AI" /
"Knowledge Agent" per existing project compliance constraints.
