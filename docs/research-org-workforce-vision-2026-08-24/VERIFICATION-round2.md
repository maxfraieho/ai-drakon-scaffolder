# GitNexus Verification of SYNTHESIS-round2.md

**Date**: 2026-08-24
**Verifier**: Claude (this session), per `notebooklm-research-pipeline` skill step 6.
**Method**: GitNexus `query()` against the freshly-reindexed repo (post `ca7a2ffd7`),
plus direct parsing of a real sample `.drakon.json` file. Not a full re-review of every
line of every file mentioned — targeted verification of the load-bearing claims.

## Verified TRUE

| Claim in synthesis | Verification | Result |
|---|---|---|
| `HarnessSpecRepository` constructor-bound `tenantId` pattern exists, usable as the model for a new `ScopedWorkItemRepository` | GitNexus: `packages/tenancy/src/repositories.ts:259` | CONFIRMED |
| `McpToolAuditRepository` exists (Slice 4.4) | GitNexus: `packages/tenancy/src/repositories.ts:327` | CONFIRMED |
| `resolveTenant()` exists as the tenant-resolution entry point | GitNexus: `packages/tenancy/src/index.ts:58-80`, `TenantContext` interface at `:21-25` | CONFIRMED |
| D1 migrations have an established convention (numbered files in `infrastructure/d1/migrations/`) — a new workforce migration would be `002-...` | Direct listing: `infrastructure/d1/migrations/001-mcp-tool-audit.sql` exists, is the only migration file | CONFIRMED |
| Real DRAKON diagrams branch (have `question`/decision nodes), not just linear action sequences — the basis for rejecting "flatten to a checklist" | Parsed `sample-pipelines/pipeline_a.drakon.json` directly: node types present = `{action, end, header, question}` | CONFIRMED |
| `POST /mcp` already sits behind the central `ROUTE_AUTH_TABLE` gate (`auth: 'owner'`) — so a new workforce MCP tool inherits this for free | Confirmed earlier this session via direct grep + diff read of `worker-mcp-drakon.js:489` during Slice 4.4 review | CONFIRMED (carried over from same-session review, not re-checked this pass) |
| `AGENT_ALLOWED_TOOLS` vocabulary (8 roles, least-privilege per role) matches what the synthesis assumes for "supervisor = static harness-spec role archetype" | Confirmed earlier this session via full diff read of `packages/harness-contract/src/index.ts` during Slice 4.4 review | CONFIRMED (carried over, not re-checked this pass) |

## Verified: no naming collisions (new proposals are actually new)

GitNexus query for `tenant_members`, `tenant_work_items`, `tenant_micro_adrs`,
`workforce`, `org_path` returned **zero matching symbols/tables** in the current
codebase — these are genuinely new proposals, not misdescribed existing things. Safe to
use as new schema/route names without collision.

## Not verified this pass (flagged, not blocking)

- Exact file paths proposed for new code (`cloudflare-worker/routes/workforce.ts`,
  `src/utils/db.ts`, `src/routes/workforce/shift.tsx`) are proposals only — the actual
  directory conventions for a new route group should be re-confirmed against the live
  `src/routes/` structure (e.g. via `route_map`) at implementation time, not assumed from
  this verification pass.
- No live check was done on whether `packages/tenancy`'s `D1Database`/`D1Result` type
  definitions (hand-rolled, no `@cloudflare/workers-types` dependency — noted earlier
  this session) will need extending for the three new tables' row shapes — likely yes,
  not scoped here.
- IndexedDB/OPFS encryption-at-rest mechanism (device-loss gap) has no existing
  precedent in this codebase to verify against — genuinely new ground, no live-code claim
  to check.

## Conclusion

SYNTHESIS-round2.md's concrete technical claims hold up against live code. No invented
mechanisms, no stale line numbers, no naming collisions. Safe to treat as verified input
for the next architect planning pass (a Slice 5.1-style plan or `specs/NNN-.../spec.md`),
per the `notebooklm-research-pipeline` skill's step 7.
