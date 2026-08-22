---
status: proposed
date: 2026-08-20
deciders: Q, platform architecture
spec: specs/005-product-reframing/plan.md
supersedes:
superseded-by:
---

# 0019. Expose capabilities as a tenant-filtered MCP surface

## Context

The repository has two things named "MCP" with no real seam between them.
`src/lib/mcp/projects.ts` is a client-side wrapper that calls `mcpCall` for
`drakon.listdiagrams`, `drakon.savediagram` and `drakon.savetogit` — it contains
no server logic. The actual MCP server is `getMcpTools()` plus `handleMcp` in
`cloudflare-worker/worker-mcp-drakon.js`, exposing 24 tools across the
`drakon.*`, `github.*`, `docs.*` and `architect.*` namespaces.

Every caller receives all 24 tools. `DrakonHarnessSpec.allowed_tools` already
defines a capability vocabulary (`"mcp.gitnexus.query"`), but it is consulted
only downstream inside the execution engine — and there it reads the client's
own copy of the spec.

## Decision

Adopt a three-tier exposure model:

1. **Internal services** are plain typed functions in `packages/`, not MCP tools.
2. **MCP tools** are a registry in `services/mcp-server`; each tool declares a
   capability string in the `allowed_tools` vocabulary. `tools/list` returns only
   the tools the calling tenant's server-resolved spec grants; `tools/call`
   re-checks and writes an audit entry.
3. **MCP resources and prompts** expose ADRs, specs, task graphs and run traces
   so external agents can ground themselves in the tenant's architecture memory.

`src/lib/mcp/projects.ts` is reclassified as an ordinary API client and renamed
accordingly; it is not part of the MCP surface.

## Consequences

Positive: authorization is enforced where agents actually enter the system;
resources and prompts become the packaging format for knowledge and policy packs.

Negative: existing external MCP clients configured via `.mcp.json` and `.ai/mcp/`
may lose tools they currently receive; the surface must be versioned and the
change announced.

Neutral: tool names and semantics are preserved — only visibility changes.
