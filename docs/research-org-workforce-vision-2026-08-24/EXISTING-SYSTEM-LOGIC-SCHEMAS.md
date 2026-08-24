# Existing System Logic — Minimal Schemas

Author: Claude (this session), grounded in code verified directly during tonight's Slice
3.2–4.4 work (line-by-line diff review, not a fresh guess). Purpose: give the deep-research
pass a compact, accurate picture of how the CURRENT system actually routes a request,
before reasoning about how Q's organizational-workforce vision (ADR-0026) would extend it.

These are minimal — three flows, not an exhaustive system map. Full detail lives in the
code itself (`cloudflare-worker/worker-mcp-drakon.js`) and the ADRs referenced inline.

---

## 1. Every request: auth + tenant resolution (the central gate)

```mermaid
flowchart TD
    A[Incoming request] --> B{ROUTE_AUTH_TABLE<br/>resolveRouteAuth method+path}
    B -->|none| Z[Dispatch to handler]
    B -->|authenticated or owner| C[verifyOwnerAuth request env]
    C --> D{Credential type}
    D -->|MCP_API_KEY match| E["role: owner, sub: mcp-agent"]
    D -->|Worker JWT, role=owner| E
    D -->|Appwrite JWT, valid| F["role: user, sub, email"]
    D -->|none valid| G[401 Unauthorized]
    E --> H{requiredAuth}
    F --> H
    H -->|authenticated: any payload ok| Z
    H -->|owner: legacy owner OR resolved tenant| I{isLegacyOwner?}
    I -->|yes| Z
    I -->|no| J[resolveTenant request, appwriteConfig]
    J -->|tenant resolved| Z
    J -->|no tenant| G
```

Key invariants (ADR-0025): no global "owner" role reachable via plain Appwrite login as
of Slice 3.3 step 7 — `MCP_API_KEY`/Worker-JWT-owner are intentionally kept as
service/automation exceptions, not a user backdoor. Every D1 access downstream of `Z` goes
through a tenant-scoped repository in `packages/tenancy` (constructor-bound `tenantId`,
unscoped query unrepresentable in the type system).

---

## 2. MCP surface: tools/list + tools/call (Slice 4.4, just landed on a branch — not
   yet reviewed/merged as of this document)

```mermaid
flowchart TD
    A["POST /mcp (JSON-RPC)"] --> B[Central gate: Section 1 above]
    B --> C[resolveTenant] --> D["Resolve specId (explicit or default agent)"]
    D --> E["HarnessSpecRepository.get tenantId, specId"]
    E -->|found| F[Use stored spec.allowed_tools]
    E -->|miss| G["Self-heal: createDefaultSpec + upsert (Slice 3.4a precedent)"]
    G --> F
    F --> H{method}
    H -->|tools/list| I["Filter getMcpTools 24-tool list against allowed_tools"]
    I --> J[Return granted subset only]
    H -->|tools/call tool_name| K{tool_name in allowed_tools?}
    K -->|yes| L[Dispatch tool] --> M["McpToolAuditRepository.record specId, tool, granted=true"]
    K -->|no| N[403] --> O["McpToolAuditRepository.record specId, tool, granted=false"]
```

This is the mechanism ADR-0019 mandates ("tools/list returns only what the calling
tenant's server-resolved spec grants; tools/call re-checks and writes an audit entry").
`allowed_tools` vocabulary is per-`agent_name` (one `harness_specs` row per specialized
role) — this is the closest existing precedent to ADR-0026's "each worker role gets a
scoped agent" vision; worth the deep-research pass treating it as the seed of that model,
not a coincidence.

---

## 3. Harness spec resolution + self-heal (Slice 3.4a)

```mermaid
flowchart TD
    A["POST /v1/pipeline/execute-deterministic { specId, drakon_ir, breakpoints }"] --> B[Central gate]
    B --> C["HarnessSpecRepository tenantId .get specId"]
    C -->|found| D[validateHarnessSpec resolvedSpec]
    C -->|miss| E["createDefaultSpec specId + upsert to D1"]
    E --> D
    D -->|valid| F["Forward { drakon_ir, harness_spec: resolvedSpec, breakpoints } to Appwrite deterministic-engine Function"]
    D -->|invalid| G[400]
```

Known, deliberately-accepted side effect (see CURRENT-PLAN.md): a wrong/typo'd `specId`
now silently self-heals into a fresh default rather than erroring — cross-tenant isolation
still holds (a tenant can never resolve another tenant's actual spec, self-heal only ever
produces a fresh default scoped to the caller's own tenant), but a client-side bug in
`specId` is currently invisible rather than surfaced. Worth the deep-research pass
considering whether the organizational-workforce vision's per-role agents want the same
"always succeed with a sensible default" behavior, or whether some roles need hard-fail
instead (e.g. a worker's agent silently getting the WRONG role's default spec because of
a typo could be a real safety issue in a factory-floor context, not just an inconvenience).

---

## Where these three flows sit relative to ADR-0026's vision

- Flow 1 (auth+tenant) = the "organization" boundary already exists and is enforced.
- Flow 2 (MCP filtering) = the closest existing precedent for "each worker role is a
  scoped agent with a specific tool/capability grant" — Q6 (org hierarchy) would need
  this per-role model to nest under a parent organization, not just sit flat per tenant.
- Flow 3 (spec resolution) = the closest existing precedent for "a worker has a personal
  spec resolved server-side" — but today it's keyed by `agent_name` as a role archetype,
  not by an individual worker identity. ADR-0026's "personal knowledge base per worker"
  likely needs a finer-grained key than `agent_name` alone (role AND individual), which
  none of the current three flows provide yet — flagged as a genuine gap for the
  deep-research pass to reason about, not something already solved.
